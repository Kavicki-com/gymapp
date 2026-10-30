import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"
import { adminClient, env } from "../_shared/mp.ts"
import { anual, lojaDe, sincronizar, UUID } from "../_shared/revenuecat.ts"

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
