import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"
import { adminClient, env } from "../_shared/mp.ts"

// Webhook do RevenueCat: assinatura da aba Cobranças pela App Store e pela
// Google Play. Como o mp-webhook, é o que liga e desliga o acesso — grava em
// `subscriptions` (kind = 'store') e o trigger subscriptions_sync_access
// recalcula gym_profiles.collections_enabled.
//
// Não confia no estado que vem no evento. Eventos chegam fora de ordem e
// repetidos; a cada um, relemos o assinante na API do RevenueCat e gravamos o
// que ela diz agora. Assim reprocessar é inofensivo.
//
// Convivência com Mercado Pago e Pix (decisão de 30/10/2026): subscriptions
// tem UNIQUE(gym_id). Uma assinatura ATIVA de cartão ou Pix nunca é
// sobrescrita pela loja — só fica no log, para estorno/ajuste à mão.
//
// Secrets: REVENUECAT_WEBHOOK_SECRET (o mesmo valor do campo Authorization
// configurado no painel do RevenueCat), REVENUECAT_API_KEY (chave secreta
// sk_… do projeto, para a API REST) e, opcional, REVENUECAT_ENTITLEMENT
// (padrão gymapp_cobrancas).

const RC_API = "https://api.revenuecat.com/v1"

const ok = (msg = "ok") => new Response(msg, { status: 200 })

/** Compara o cabeçalho com o secret em tempo constante. Aceita com ou sem "Bearer ". */
function autorizado(req: Request): boolean {
  const secret = env("REVENUECAT_WEBHOOK_SECRET")
  if (!secret) return false
  const recebido = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  if (recebido.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i++) diff |= recebido.charCodeAt(i) ^ secret.charCodeAt(i)
  return diff === 0
}

/** O app faz Purchases.logIn(auth.users.id): só esses IDs são nossos. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Entitlement = {
  expires_date: string | null
  product_identifier: string
  purchase_date: string
}
type SubscriptionRC = {
  store: string
  unsubscribe_detected_at: string | null
  billing_issues_detected_at: string | null
  is_sandbox: boolean
  period_type: string
}
type Subscriber = {
  entitlements: Record<string, Entitlement>
  subscriptions: Record<string, SubscriptionRC>
}

async function lerAssinante(appUserId: string): Promise<Subscriber | null> {
  const resp = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${env("REVENUECAT_API_KEY")}` },
  })
  if (!resp.ok) {
    console.error("[revenuecat-webhook] API", resp.status, await resp.text())
    return null
  }
  return (await resp.json())?.subscriber ?? null
}

/**
 * Período pelo ID do produto. Os produtos das lojas seguem o padrão
 * gymapp_cobrancas_mensal / gymapp_cobrancas_anual (no Android o RevenueCat
 * junta assinatura e plano base: "gymapp_cobrancas:anual").
 */
const anual = (productId: string) => /anual|annual|year/i.test(productId)

const lojaDe = (store: string | undefined) =>
  store === "APP_STORE" || store === "MAC_APP_STORE" ? "app_store"
    : store === "PLAY_STORE" ? "play_store"
    : null

/** Sincroniza a academia de um app_user_id com o que o RevenueCat diz agora. */
async function sincronizar(admin: SupabaseClient, appUserId: string): Promise<string> {
  if (!UUID.test(appUserId)) return `ignorado (id anônimo ${appUserId})`

  const { data: gym } = await admin
    .from("gym_profiles")
    .select("id")
    .eq("user_id", appUserId)
    .maybeSingle()
  if (!gym) return `ignorado (sem academia para ${appUserId})`

  const assinante = await lerAssinante(appUserId)
  if (!assinante) return "erro ao ler o assinante"

  const entitlementId = env("REVENUECAT_ENTITLEMENT") || "gymapp_cobrancas"
  const ent = assinante.entitlements?.[entitlementId]
  const sub = ent ? assinante.subscriptions?.[ent.product_identifier] : undefined
  const ativo = !!ent && (ent.expires_date === null || Date.parse(ent.expires_date) > Date.now())

  const { data: atual } = await admin
    .from("subscriptions")
    .select("id, kind, status")
    .eq("gym_id", gym.id)
    .maybeSingle()

  // Cartão ou Pix ativo manda. A loja não derruba nem substitui.
  if (atual && atual.kind !== "store" && atual.status === "active") {
    if (ativo) {
      console.warn(`[revenuecat-webhook] CONFLITO gym ${gym.id}: loja ativa e ${atual.kind} ativo — revisar estorno`)
    }
    return `mantido ${atual.kind} ativo`
  }

  if (!ent) {
    // Nunca assinou pela loja (ou o entitlement foi revogado): só mexe se a
    // linha atual for da loja.
    if (atual?.kind === "store" && atual.status === "active") {
      await admin.from("subscriptions").update({
        status: "expired",
        auto_renew: false,
        updated_at: new Date().toISOString(),
      }).eq("id", atual.id)
      return "loja sem entitlement -> expired"
    }
    return "nada a fazer"
  }

  const renova = ativo && !sub?.unsubscribe_detected_at
  const linha = {
    gym_id: gym.id,
    kind: "store",
    plan_code: anual(ent.product_identifier) ? "cobrancas_anual_loja" : "cobrancas_mensal_loja",
    status: ativo ? "active" : "expired",
    auto_renew: renova,
    current_period_end: ent.expires_date,
    next_payment_date: renova ? ent.expires_date : null,
    store: lojaDe(sub?.store),
    store_product_id: ent.product_identifier,
    rc_app_user_id: appUserId,
    // A linha pode ter sido de um cartão já cancelado: zera o que era do MP,
    // para um evento atrasado daquele preapproval não casar com esta linha.
    mp_preapproval_id: null,
    mp_payer_id: null,
    card_last4: null,
    card_brand: null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin.from("subscriptions").upsert(linha, { onConflict: "gym_id" })
  if (error) {
    console.error("[revenuecat-webhook] upsert", error.message)
    return "erro ao gravar"
  }
  const sandbox = sub?.is_sandbox ? " (sandbox)" : ""
  return `${linha.status} ${ent.product_identifier} até ${ent.expires_date}${sandbox}`
}

/** Compra e renovação viram linha em subscription_payments, para a conta do mês. */
// deno-lint-ignore no-explicit-any
async function registrarPagamento(admin: SupabaseClient, ev: any) {
  if (!["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE"].includes(ev.type)) return
  if (!ev.transaction_id || !UUID.test(ev.app_user_id || "")) return

  const { data: gym } = await admin.from("gym_profiles").select("id").eq("user_id", ev.app_user_id).maybeSingle()
  if (!gym) return
  const { data: sub } = await admin.from("subscriptions").select("id, kind").eq("gym_id", gym.id).maybeSingle()

  await admin.from("subscription_payments").upsert({
    gym_id: gym.id,
    subscription_id: sub?.kind === "store" ? sub.id : null,
    // mp_payment_id é a chave de idempotência da tabela; o prefixo separa
    // as transações da loja das do Mercado Pago.
    mp_payment_id: `rc:${ev.transaction_id}`,
    kind: "store",
    status: ev.environment === "SANDBOX" ? "sandbox" : "approved",
    amount: ev.price_in_purchased_currency ?? null,
    method: lojaDe(ev.store),
    plan_code: anual(ev.product_id || "") ? "cobrancas_anual_loja" : "cobrancas_mensal_loja",
    raw: ev,
  }, { onConflict: "mp_payment_id" })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok()
  if (!autorizado(req)) {
    console.error("[revenuecat-webhook] Authorization inválido")
    return new Response("unauthorized", { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const ev = body?.event
    if (!ev?.type) return ok()

    const admin = adminClient()

    // TRANSFER move a compra entre contas: sincroniza as duas pontas.
    const ids: string[] = ev.type === "TRANSFER"
      ? [...(ev.transferred_from || []), ...(ev.transferred_to || [])]
      : [ev.app_user_id, ...(ev.aliases || [])]
    const unicos = [...new Set(ids.filter(Boolean))].filter((id) => UUID.test(id))

    if (ev.type === "TEST") {
      console.log("[revenuecat-webhook] evento de teste recebido")
      return ok("test ok")
    }

    for (const id of unicos) {
      const resultado = await sincronizar(admin, id)
      console.log(`[revenuecat-webhook] ${ev.type} ${ev.environment ?? ""} ${id} -> ${resultado}`)
    }
    if (!unicos.length) console.log(`[revenuecat-webhook] ${ev.type}: nenhum app_user_id nosso`, ev.app_user_id)

    // Depois do sincronizar: na primeira compra a linha de subscriptions
    // ainda não existia, e o pagamento precisa apontar para ela.
    await registrarPagamento(admin, ev).catch((e) =>
      console.error("[revenuecat-webhook] pagamento", String(e?.message || e)))

    return ok()
  } catch (e) {
    console.error("[revenuecat-webhook] exceção", String((e as Error)?.message || e))
    // 500 aqui: o RevenueCat reenvia, e reprocessar é seguro (relê o assinante).
    return new Response("error", { status: 500 })
  }
})
