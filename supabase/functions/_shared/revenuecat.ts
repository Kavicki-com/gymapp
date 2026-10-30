import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"
import { env } from "./mp.ts"

// Sincronização da assinatura pela loja (RevenueCat) com `subscriptions`.
// Usada pelo revenuecat-webhook (a cada evento) e pelo revenuecat-sync (o
// app chama logo depois de comprar ou restaurar, sem esperar o webhook).
//
// Não confia em estado vindo de fora: relê o assinante na API do RevenueCat
// e grava o que ela diz agora. Chamar duas vezes dá no mesmo resultado.
//
// Convivência com Mercado Pago e Pix (decisão de 30/10/2026): subscriptions
// tem UNIQUE(gym_id). Uma assinatura ATIVA de cartão ou Pix nunca é
// sobrescrita pela loja — só fica no log, para estorno/ajuste à mão.

const RC_API = "https://api.revenuecat.com/v1"

/** O app faz Purchases.logIn(auth.users.id): só esses IDs são nossos. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
export const anual = (productId: string) => /anual|annual|year/i.test(productId)

export const lojaDe = (store: string | undefined) =>
  store === "APP_STORE" || store === "MAC_APP_STORE" ? "app_store"
    : store === "PLAY_STORE" ? "play_store"
    : null

/** Sincroniza a academia de um app_user_id com o que o RevenueCat diz agora. */
export async function sincronizar(admin: SupabaseClient, appUserId: string): Promise<string> {
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

