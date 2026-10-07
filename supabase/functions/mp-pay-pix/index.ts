import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, corsHeadersFor, env, getUser, gymOf, json, mpFetch } from "../_shared/mp.ts"
import { aplicarPagamentoPix } from "../_shared/pix.ts"

// Pagamento AVULSO por Pix: libera 1 mês (cobrancas_mensal) ou 12
// (cobrancas_anual) e não renova sozinho. O pix-lembretes avisa antes de
// vencer e o cron pix-expirar desliga depois.
//
// Portado de reforma-ai/mp-pay-once, com mudanças:
//  - só Pix (sem boleto);
//  - a chave de idempotência é aleatória: a do original era fixa por usuário e
//    plano, então o MP devolveria o MESMO pagamento na renovação do mês seguinte;
//  - o QR expira em 30 minutos, para encurtar a janela em que um Pix velho
//    ainda pode ser pago depois de a academia ter assinado no cartão;
//  - action "check": a página consulta o pagamento enquanto o QR está na tela,
//    sem depender do webhook (ver _shared/pix.ts).
const VALIDADE_QR_MIN = 30

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) })

  try {
    const admin = adminClient()
    const user = await getUser(req, admin)
    if (!user) return json(req, { ok: false, error: "Não autenticado." }, 401)

    const gym = await gymOf(admin, user.id)
    if (!gym) return json(req, { ok: false, error: "Academia não encontrada para este usuário." }, 400)

    const { action = "create", planCode, payerEmail, paymentId } = await req.json()

    // --- Consulta: o QR está na tela e a página quer saber se já pagou ---
    if (action === "check") {
      if (!paymentId) return json(req, { ok: false, error: "paymentId é obrigatório." }, 400)
      // Só pagamento desta academia: sem isto, qualquer logado consultaria
      // (e aplicaria) o Pix de outra.
      const { data: meu } = await admin.from("subscription_payments")
        .select("id").eq("mp_payment_id", String(paymentId)).eq("gym_id", gym.id).eq("kind", "pix")
        .maybeSingle()
      if (!meu) return json(req, { ok: false, error: "Pagamento não encontrado." }, 404)

      const mp = await mpFetch(`/v1/payments/${paymentId}`)
      if (!mp.ok) return json(req, { ok: false, error: "Falha ao consultar o Mercado Pago." }, 502)
      const resultado = await aplicarPagamentoPix(admin, mp.data)
      return json(req, { ok: true, status: mp.data?.status, resultado })
    }

    if (!planCode) return json(req, { ok: false, error: "planCode é obrigatório." }, 400)

    // Preço e periodicidade vêm do nosso banco, nunca do cliente.
    const { data: plan, error: planErr } = await admin
      .from("billing_plans")
      .select("code, name, billing_period, amount, active")
      .eq("code", planCode)
      .eq("active", true)
      .single()
    if (planErr || !plan) return json(req, { ok: false, error: "Assinatura inválida." }, 400)

    const { data: atual } = await admin
      .from("subscriptions")
      .select("id, kind, status, mp_preapproval_id")
      .eq("gym_id", gym.id)
      .maybeSingle()

    if (atual?.status === "active" && atual.kind === "recurring_card") {
      return json(req, {
        ok: false,
        error: "Esta academia já tem assinatura ativa no cartão. Cancele-a antes de pagar por Pix.",
      }, 409)
    }

    // Link de cartão abandonado: cancela no MP, senão ele ainda pode ser pago
    // depois que esta linha virar Pix — e o webhook do cartão não acharia mais
    // a linha (filtra por mp_preapproval_id).
    if (atual?.status === "pending" && atual.mp_preapproval_id) {
      const velho = await mpFetch(`/preapproval/${atual.mp_preapproval_id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (!velho.ok) console.error("[mp-pay-pix] cancelar pendente", velho.status, JSON.stringify(velho.data))
    }

    const expira = new Date(Date.now() + VALIDADE_QR_MIN * 60_000)
    const mp = await mpFetch("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: Number(plan.amount),
        description: `${plan.name} — ${gym.gym_name}`,
        payment_method_id: "pix",
        external_reference: gym.id,
        date_of_expiration: expira.toISOString().replace("Z", "-00:00"),
        // Webhook por pagamento, além do configurado no painel: a aplicação é
        // do tipo "Assinaturas" e pode não oferecer o evento "payment" lá.
        notification_url: `${env("SUPABASE_URL")}/functions/v1/mp-webhook`,
        payer: { email: payerEmail || user.email },
      }),
    })
    if (!mp.ok) {
      console.error("[mp-pay-pix] MP erro", mp.status, JSON.stringify(mp.data))
      return json(req, { ok: false, error: mp.data?.message || "Falha ao gerar o Pix." }, 502)
    }
    const p = mp.data

    // A linha do pagamento é o que faz o webhook reconhecer este Pix como nosso.
    const { error: payErr } = await admin.from("subscription_payments").insert({
      gym_id: gym.id,
      subscription_id: atual?.id ?? null,
      mp_payment_id: String(p.id),
      kind: "pix",
      plan_code: plan.code,
      status: p.status,
      amount: Number(plan.amount),
      method: "pix",
      raw: p,
    })
    if (payErr) {
      // Sem a linha, um Pix pago não liberaria nada. Nada foi pago ainda: aborta.
      console.error("[mp-pay-pix] insert pagamento erro", JSON.stringify(payErr))
      return json(req, { ok: false, error: "Falha ao preparar o Pix. Tente de novo." }, 500)
    }

    // Quem ainda não tem acesso passa a "pendente". Quem está renovando um Pix
    // ativo continua ativo até o pagamento cair — gerar o QR não tira nada.
    if (!(atual?.status === "active" && atual.kind === "pix")) {
      const { error: upErr } = await admin.from("subscriptions").upsert(
        {
          gym_id: gym.id,
          plan_code: plan.code,
          status: "pending",
          kind: "pix",
          mp_preapproval_id: null,
          mp_payer_id: null,
          auto_renew: false,
          next_payment_date: null,
          card_last4: null,
          card_brand: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "gym_id" },
      )
      if (upErr) console.error("[mp-pay-pix] upsert assinatura erro", JSON.stringify(upErr))
    }

    const tx = p?.point_of_interaction?.transaction_data
    return json(req, {
      ok: true,
      paymentId: p.id,
      status: p.status,
      expiraEm: expira.toISOString(),
      pix: tx ? { qrCode: tx.qr_code, qrCodeBase64: tx.qr_code_base64 } : null,
    })
  } catch (e) {
    console.error("[mp-pay-pix] exceção", String((e as Error)?.message || e))
    return json(req, { ok: false, error: "Erro inesperado." }, 500)
  }
})
