// Aplicar um pagamento Pix à assinatura da academia.
//
// Usado por dois caminhos que precisam dar o MESMO resultado:
//  - mp-webhook, quando o MP avisa do pagamento;
//  - mp-pay-pix (action "check"), quando a página consulta enquanto o QR está
//    na tela. Existe para o acesso não depender só do webhook: a aplicação no
//    MP é do tipo "Assinaturas" e não está provado que ela entrega o evento
//    "payment". Os dois leem o pagamento na API do MP, nunca do navegador.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2"

/** Soma meses sem estourar o dia: 31/01 + 1 mês = 28/02, não 03/03. */
export function addMonthsFrom(base: Date, n: number): Date {
  const d = new Date(base)
  const dia = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimo))
  return d
}

type Resultado = "ignorado" | "registrado" | "ja_aplicado" | "ativado" | "conflito"

// deno-lint-ignore no-explicit-any
export async function aplicarPagamentoPix(admin: SupabaseClient, p: any): Promise<Resultado> {
  const paymentId = String(p?.id ?? "")
  if (!paymentId) return "ignorado"

  // Só pagamentos que NÓS criamos no mp-pay-pix. O evento "payment" também
  // chega para as cobranças do cartão recorrente, e essas o caminho do
  // preapproval já trata.
  const { data: linha } = await admin
    .from("subscription_payments")
    .select("id, gym_id, plan_code, status")
    .eq("mp_payment_id", paymentId)
    .eq("kind", "pix")
    .maybeSingle()
  if (!linha) return "ignorado"

  if (p.status !== "approved") {
    await admin.from("subscription_payments")
      .update({ status: p.status, raw: p })
      .eq("id", linha.id)
      .neq("status", "approved")
    return "registrado"
  }

  // Marca como aprovado SÓ SE ainda não estava. O MP reentrega eventos e a
  // página consulta a cada poucos segundos: sem esta trava, o mesmo Pix
  // estenderia o período duas vezes.
  const { data: virou } = await admin.from("subscription_payments")
    .update({ status: "approved", raw: p })
    .eq("id", linha.id)
    .or("status.is.null,status.neq.approved")
    .select("id")
  if (!virou?.length) return "ja_aplicado"

  const { data: plano } = await admin
    .from("billing_plans")
    .select("billing_period")
    .eq("code", linha.plan_code)
    .single()
  const meses = plano?.billing_period === "yearly" ? 12 : 1

  const { data: atual } = await admin
    .from("subscriptions")
    .select("kind, status, current_period_end")
    .eq("gym_id", linha.gym_id)
    .maybeSingle()

  // Já tem cartão recorrente ativo: não sobrescrever, senão o preapproval fica
  // cobrando sem linha apontando para ele. Pago em dobro — estornar à mão.
  if (atual?.status === "active" && atual.kind === "recurring_card") {
    console.error(`[pix] pagamento ${paymentId} aprovado com cartão ativo na gym ${linha.gym_id} — estornar`)
    return "conflito"
  }

  // Renovação antes de vencer soma ao fim do período atual; quem pagar 3 dias
  // antes não perde esses 3 dias.
  const fimAtual = atual?.kind === "pix" && atual.status === "active" && atual.current_period_end
    ? new Date(atual.current_period_end)
    : null
  const base = fimAtual && fimAtual > new Date() ? fimAtual : new Date()

  // O trigger subscriptions_sync_access liga collections_enabled.
  const { error } = await admin.from("subscriptions").upsert(
    {
      gym_id: linha.gym_id,
      plan_code: linha.plan_code,
      status: "active",
      kind: "pix",
      current_period_end: addMonthsFrom(base, meses).toISOString(),
      next_payment_date: null,
      auto_renew: false,
      mp_preapproval_id: null,
      mp_payer_id: null,
      card_last4: null,
      card_brand: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "gym_id" },
  )
  if (error) {
    // Desfaz a trava para a próxima entrega do MP tentar de novo.
    await admin.from("subscription_payments").update({ status: "pending" }).eq("id", linha.id)
    console.error("[pix] upsert assinatura erro", JSON.stringify(error))
    throw error
  }

  // Liga a linha do pagamento à assinatura (o id é estável: upsert por gym_id).
  const { data: sub } = await admin.from("subscriptions").select("id").eq("gym_id", linha.gym_id).single()
  if (sub) await admin.from("subscription_payments").update({ subscription_id: sub.id }).eq("id", linha.id)

  console.log(`[pix] pagamento ${paymentId} aprovado -> gym ${linha.gym_id} (+${meses} meses)`)
  return "ativado"
}
