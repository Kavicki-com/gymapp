import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, corsHeadersFor, getUser, gymOf, json, mpFetch } from "../_shared/mp.ts"

// Cancelar a assinatura ou trocar o cartão.
// Cancelar é obrigação legal (CDC) e também exigência do próprio Mercado Pago:
// a assinatura precisa ser cancelável pelo mesmo caminho em que foi contratada.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) })

  try {
    const admin = adminClient()
    const user = await getUser(req, admin)
    if (!user) return json(req, { ok: false, error: "Não autenticado." }, 401)

    const gym = await gymOf(admin, user.id)
    if (!gym) return json(req, { ok: false, error: "Academia não encontrada." }, 400)

    const { action, cardToken } = await req.json()

    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, mp_preapproval_id, status")
      .eq("gym_id", gym.id)
      .maybeSingle()
    if (!sub?.mp_preapproval_id) {
      return json(req, { ok: false, error: "Nenhuma assinatura ativa." }, 404)
    }

    if (action === "cancel") {
      const mp = await mpFetch(`/preapproval/${sub.mp_preapproval_id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (!mp.ok) {
        console.error("[mp-manage] cancelar erro", mp.status, JSON.stringify(mp.data))
        return json(req, { ok: false, error: "Falha ao cancelar no Mercado Pago." }, 502)
      }
      // O trigger desliga collections_enabled — a menos que haja cortesia.
      await admin.from("subscriptions").update({
        status: "cancelled",
        auto_renew: false,
        updated_at: new Date().toISOString(),
      }).eq("id", sub.id)

      return json(req, { ok: true, status: "cancelled" })
    }

    if (action === "update_card") {
      if (!cardToken) return json(req, { ok: false, error: "cardToken é obrigatório." }, 400)
      const mp = await mpFetch(`/preapproval/${sub.mp_preapproval_id}`, {
        method: "PUT",
        body: JSON.stringify({ card_token_id: cardToken }),
      })
      if (!mp.ok) {
        console.error("[mp-manage] trocar cartão erro", mp.status, JSON.stringify(mp.data))
        return json(req, { ok: false, error: "Falha ao trocar o cartão." }, 502)
      }
      return json(req, { ok: true })
    }

    return json(req, { ok: false, error: "Ação inválida." }, 400)
  } catch (e) {
    console.error("[mp-manage] exceção", String((e as Error)?.message || e))
    return json(req, { ok: false, error: "Erro inesperado." }, 500)
  }
})
