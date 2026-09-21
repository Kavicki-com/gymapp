import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, mpFetch, mpWebhookSecret } from "../_shared/mp.ts"

// Webhook do Mercado Pago. É o que efetivamente liga e desliga a aba Cobranças:
// ao gravar em `subscriptions`, o trigger subscriptions_sync_access recalcula
// gym_profiles.collections_enabled. Esta função roda com service role, que é o
// que a permite passar pelo guard_collections_enabled.
//
// Nunca confia no corpo da requisição: valida a assinatura x-signature e depois
// relê o recurso na API do MP antes de gravar qualquer coisa.

/** manifest = id:<data.id>;request-id:<x-request-id>;ts:<ts>; -> HMAC-SHA256 == v1 */
async function validSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = mpWebhookSecret()
  if (!secret) return false
  const sig = req.headers.get("x-signature") || ""
  const requestId = req.headers.get("x-request-id") || ""
  const parts = Object.fromEntries(
    sig.split(",").map((kv) => kv.split("=").map((s) => s.trim())) as [string, string][],
  )
  const ts = parts["ts"]
  const v1 = parts["v1"]
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")
  // comparação em tempo constante
  if (hex.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

const addMonths = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString()
}

const ok = () => new Response("ok", { status: 200 })

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok()

  try {
    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const type = body?.type || url.searchParams.get("type") ||
      body?.topic || url.searchParams.get("topic")
    const dataId = String(body?.data?.id || url.searchParams.get("data.id") || body?.id || "")

    if (!dataId) return ok()

    if (!(await validSignature(req, dataId))) {
      console.error("[mp-webhook] assinatura inválida", type, dataId)
      return new Response("invalid signature", { status: 401 })
    }

    const admin = adminClient()

    // --- Mudança de estado da assinatura (autorizada, pausada, cancelada) ---
    if (type === "subscription_preapproval" || type === "preapproval") {
      const mp = await mpFetch(`/preapproval/${dataId}`)
      if (!mp.ok) return ok()
      const pre = mp.data
      const gymId = pre?.external_reference
      if (!gymId) return ok()

      const map: Record<string, string> = {
        authorized: "active",
        paused: "paused",
        cancelled: "cancelled",
        pending: "pending",
      }

      // O trigger em subscriptions religa ou desliga collections_enabled.
      await admin.from("subscriptions").update({
        status: map[pre.status] || "pending",
        mp_preapproval_id: String(pre.id),
        mp_payer_id: pre.payer_id ? String(pre.payer_id) : null,
        auto_renew: pre.status === "authorized",
        next_payment_date: pre.next_payment_date ?? null,
        updated_at: new Date().toISOString(),
      }).eq("gym_id", gymId)

      return ok()
    }

    // --- Cobrança recorrente individual: registra e estende o período ---
    if (type === "subscription_authorized_payment") {
      const mp = await mpFetch(`/authorized_payments/${dataId}`)
      if (!mp.ok) return ok()
      const ap = mp.data
      const preapprovalId = ap?.preapproval_id
      if (!preapprovalId) return ok()

      const { data: sub } = await admin
        .from("subscriptions")
        .select("id, gym_id, plan_code, billing_plans(billing_period)")
        .eq("mp_preapproval_id", String(preapprovalId))
        .maybeSingle()
      if (!sub) return ok()

      await admin.from("subscription_payments").upsert(
        {
          gym_id: sub.gym_id,
          subscription_id: sub.id,
          mp_payment_id: String(ap.payment?.id ?? ap.id),
          kind: "recurring_card",
          status: ap.status,
          amount: ap.transaction_amount,
          method: "credit_card",
          raw: ap,
        },
        { onConflict: "mp_payment_id" },
      )

      if (ap.status === "processed" || ap.payment?.status === "approved") {
        const period =
          (sub as { billing_plans?: { billing_period?: string } }).billing_plans?.billing_period
        await admin.from("subscriptions").update({
          status: "active",
          current_period_end: addMonths(period === "yearly" ? 12 : 1),
          updated_at: new Date().toISOString(),
        }).eq("id", sub.id)
      }
      return ok()
    }

    return ok()
  } catch (e) {
    console.error("[mp-webhook] exceção", String((e as Error)?.message || e))
    // 200 evita reentregas infinitas por erro nosso; o log fica para inspeção.
    return ok()
  }
})
