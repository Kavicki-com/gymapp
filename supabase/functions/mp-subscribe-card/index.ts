import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, corsHeadersFor, env, getUser, gymOf, json, mpFetch } from "../_shared/mp.ts"

// Assinatura recorrente via cartão (Checkout Transparente do Mercado Pago).
// Recebe um card_token gerado no navegador — o cartão nunca toca este servidor.
//
// Portado de reforma-ai/mp-subscribe-card com três mudanças:
//  - a tabela de catálogo é `billing_plans`, não `plans` (que aqui são as
//    mensalidades que a academia cobra do aluno);
//  - a assinatura pertence à academia (gym_id), não ao usuário;
//  - o trial vem de billing_plans.trial_days, porque o GymApp não tem
//    trial_ends_at em lugar nenhum.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) })

  try {
    const admin = adminClient()
    const user = await getUser(req, admin)
    if (!user) return json(req, { ok: false, error: "Não autenticado." }, 401)

    const gym = await gymOf(admin, user.id)
    if (!gym) return json(req, { ok: false, error: "Academia não encontrada para este usuário." }, 400)

    const { planCode, cardToken, payerEmail, cardBrand } = await req.json()
    if (!planCode || !cardToken) {
      return json(req, { ok: false, error: "planCode e cardToken são obrigatórios." }, 400)
    }

    // Preço e periodicidade vêm do nosso banco, nunca do cliente.
    const { data: plan, error: planErr } = await admin
      .from("billing_plans")
      .select("code, name, billing_period, amount, currency, trial_days, active")
      .eq("code", planCode)
      .eq("active", true)
      .single()
    if (planErr || !plan) return json(req, { ok: false, error: "Assinatura inválida." }, 400)

    const autoRecurring: Record<string, unknown> = {
      frequency: plan.billing_period === "yearly" ? 12 : 1,
      frequency_type: "months",
      transaction_amount: Number(plan.amount),
      currency_id: plan.currency || "BRL",
    }
    if (Number(plan.trial_days) > 0) {
      autoRecurring.free_trial = { frequency: Number(plan.trial_days), frequency_type: "days" }
    }

    // Os 4 últimos dígitos não chegam do navegador: com iframe, o cardForm nunca
    // vê o número. Lemos do próprio token — e ANTES de criar o preapproval, que
    // consome o token.
    const tok = await mpFetch(`/v1/card_tokens/${cardToken}`)
    const cardLast4 = tok.ok ? (tok.data?.last_four_digits ?? null) : null

    // preapproval SEM plano associado: auto_recurring inline + status authorized.
    // external_reference é o gym_id — é por ele que o webhook reencontra a linha.
    const payload = {
      reason: `${plan.name} — ${gym.gym_name}`,
      external_reference: gym.id,
      payer_email: payerEmail || user.email,
      card_token_id: cardToken,
      auto_recurring: autoRecurring,
      // Para onde o MP devolve o assinante. APP_URL é a origem do site
      // (https://gymapp.kavicki.com); a página de assinatura é o destino útil.
      back_url: `${env("APP_URL")}/assinatura.html`,
      status: "authorized",
    }

    const mp = await mpFetch("/preapproval", { method: "POST", body: JSON.stringify(payload) })
    if (!mp.ok) {
      console.error("[mp-subscribe-card] MP erro", mp.status, JSON.stringify(mp.data))
      return json(req, {
        ok: false,
        error: mp.data?.message || "Falha ao criar a assinatura no Mercado Pago.",
      }, 502)
    }

    const status = mp.data?.status === "authorized" ? "active" : "pending"

    // O trigger subscriptions_sync_access recalcula collections_enabled sozinho.
    const { error: upErr } = await admin.from("subscriptions").upsert(
      {
        gym_id: gym.id,
        plan_code: plan.code,
        status,
        kind: "recurring_card",
        mp_preapproval_id: mp.data?.id ? String(mp.data.id) : null,
        mp_payer_id: mp.data?.payer_id ? String(mp.data.payer_id) : null,
        auto_renew: true,
        next_payment_date: mp.data?.next_payment_date ?? null,
        card_last4: cardLast4 ?? null,
        card_brand: cardBrand ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "gym_id" },
    )
    if (upErr) {
      console.error("[mp-subscribe-card] upsert erro", JSON.stringify(upErr))
      return json(req, {
        ok: false,
        error: "Assinatura criada no Mercado Pago, mas falhou ao salvar aqui. Não tente de novo — fale com o suporte.",
      }, 500)
    }

    return json(req, { ok: true, status, preapprovalId: mp.data?.id })
  } catch (e) {
    console.error("[mp-subscribe-card] exceção", String((e as Error)?.message || e))
    return json(req, { ok: false, error: "Erro inesperado." }, 500)
  }
})
