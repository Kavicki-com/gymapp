import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { adminClient, env } from "../_shared/mp.ts"

// Lembretes de quem paga a assinatura por Pix (avulso, não renova sozinho).
//
// Avisa 7, 5 e 3 dias antes de current_period_end e uma vez depois que o cron
// pix-expirar desliga o acesso. Mensal e anual seguem a mesma regra: como a
// conta parte do vencimento, o anual só é avisado no fim dos 12 meses.
//
// Canais:
//  - EMAIL (Resend), com preço e link para pagar. É fora do app, então a regra
//    da Apple não se aplica. Sem RESEND_API_KEY, pula o email e segue só push.
//  - PUSH sem preço e sem link — só o aviso e "detalhes no email". Link ou
//    preço clicável no app é o caminho dos 15% da Apple.
//
// Duplicidade: cada aviso é RESERVADO em subscription_reminders antes de ser
// enviado; chamar a função duas vezes não manda duas vezes. Por isso pode
// ficar com verify_jwt false, como o check-notifications (o cron chama sem
// Authorization).
//
// Se o cron falhar um dia, o próximo manda o aviso da faixa em que está: com 4
// dias restantes vai o de 5, não os dois perdidos.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const FAIXAS = [3, 5, 7] as const
/** Não avisar desativação muito antiga (ex.: na primeira execução). */
const JANELA_AVISO_EXPIRADO_DIAS = 7

const TZ = "America/Sao_Paulo"
const diaSP = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }) // AAAA-MM-DD
const dataBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: TZ })
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
/** O nome da academia é digitado pelo dono e vai para dentro do HTML do email. */
const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
const diasEntre = (de: Date, ate: Date) =>
  Math.round((Date.parse(diaSP(ate)) - Date.parse(diaSP(de))) / 86_400_000)

type Aviso = "d7" | "d5" | "d3" | "expired"

function textos(aviso: Aviso, dias: number, gym: string, fim: Date, plano: { name: string; amount: number; billing_period: string }) {
  const link = `${env("APP_URL")}/assinatura.html`
  const valor = `${brl(Number(plano.amount))}/${plano.billing_period === "yearly" ? "ano" : "mês"}`

  if (aviso === "expired") {
    return {
      assunto: "A aba Cobranças do GymApp foi desativada",
      html: `<p>Olá,</p>
<p>O período pago da assinatura da <b>${gym}</b> terminou em ${dataBR(fim)} e a aba Cobranças foi desativada.</p>
<p>Seus alunos, pagamentos e mensagens continuam salvos. Para reativar na hora, pague o Pix (${valor}):</p>
<p><a href="${link}">${link}</a></p>
<p>— GymApp</p>`,
      pushTitulo: "Aba Cobranças desativada",
      pushCorpo: "O período pago da assinatura terminou. Enviamos por email como reativar.",
    }
  }

  const quando = dias <= 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`
  return {
    assunto: `Sua assinatura do GymApp vence ${quando}`,
    html: `<p>Olá,</p>
<p>A assinatura da <b>${gym}</b> está paga até <b>${dataBR(fim)}</b>. Depois disso a aba Cobranças é desativada.</p>
<p>Para continuar sem interrupção, renove pelo Pix (${valor}). Os dias que ainda faltam não se perdem: o novo período começa quando o atual termina.</p>
<p><a href="${link}">${link}</a></p>
<p>— GymApp</p>`,
    pushTitulo: `Assinatura vence ${quando}`,
    pushCorpo: `A aba Cobranças está paga até ${dataBR(fim)}. Enviamos por email como renovar.`,
  }
}

async function enviarEmail(para: string, assunto: string, html: string): Promise<boolean> {
  const chave = env("RESEND_API_KEY")
  if (!chave) return false
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM") || "GymApp <assinatura@gymapp.kavicki.com>", to: [para], subject: assunto, html }),
  })
  if (!resp.ok) console.error("[pix-lembretes] email erro", resp.status, await resp.text())
  return resp.ok
}

// deno-lint-ignore no-explicit-any
async function enviarPush(admin: any, gymId: string, titulo: string, corpo: string): Promise<boolean> {
  const { data: tokens } = await admin.from("push_tokens").select("token").eq("gym_id", gymId)
  if (!tokens?.length) return false
  const lote = tokens.map((t: { token: string }) => ({
    to: t.token, title: titulo, body: corpo, data: { type: "subscription" }, sound: "default",
  }))
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(lote),
    })
    const tickets = (await resp.json().catch(() => null))?.data
    if (!Array.isArray(tickets)) return false
    // Mesmo tratamento do check-notifications: token de app desinstalado sai.
    const mortos = tickets
      .map((t: { status?: string; details?: { error?: string } }, i: number) =>
        t?.status === "error" && t?.details?.error === "DeviceNotRegistered" ? lote[i].to : null)
      .filter(Boolean)
    if (mortos.length) await admin.from("push_tokens").delete().in("token", mortos)
    return tickets.some((t: { status?: string }) => t?.status === "ok")
  } catch (e) {
    console.error("[pix-lembretes] push erro", String(e))
    return false
  }
}

Deno.serve(async () => {
  try {
    const admin = adminClient()
    const agora = new Date()

    const { data: subs, error } = await admin
      .from("subscriptions")
      .select("id, gym_id, status, current_period_end, billing_plans(name, amount, billing_period), gym_profiles(gym_name, user_id)")
      .eq("kind", "pix")
      .in("status", ["active", "expired"])
      .not("current_period_end", "is", null)
    if (error) throw error

    const enviados: string[] = []
    for (const s of subs || []) {
      const fim = new Date(s.current_period_end)
      const dias = diasEntre(agora, fim)

      let aviso: Aviso | null = null
      if (s.status === "expired") {
        if (-dias <= JANELA_AVISO_EXPIRADO_DIAS) aviso = "expired"
      } else if (dias >= 0) {
        const faixa = FAIXAS.find((f) => dias <= f)
        if (faixa) aviso = `d${faixa}` as Aviso
      }
      if (!aviso) continue

      // Reserva. Conflito = esse aviso deste período já saiu.
      const { data: reserva, error: resErr } = await admin.from("subscription_reminders")
        .insert({ subscription_id: s.id, period_end: s.current_period_end, kind: aviso })
        .select("id").maybeSingle()
      if (resErr || !reserva) {
        if (resErr && resErr.code !== "23505") console.error("[pix-lembretes] reserva erro", JSON.stringify(resErr))
        continue
      }

      // deno-lint-ignore no-explicit-any
      const gym = s.gym_profiles as any
      // deno-lint-ignore no-explicit-any
      const plano = s.billing_plans as any
      const t = textos(aviso, dias, esc(gym?.gym_name || "sua academia"), fim, plano)

      let email = false
      if (gym?.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(gym.user_id)
        if (u?.user?.email) email = await enviarEmail(u.user.email, t.assunto, t.html)
      }
      const push = await enviarPush(admin, s.gym_id, t.pushTitulo, t.pushCorpo)

      // Nenhum canal funcionou: libera a reserva para a próxima execução tentar.
      if (!email && !push) {
        await admin.from("subscription_reminders").delete().eq("id", reserva.id)
        console.error(`[pix-lembretes] ${aviso} gym ${s.gym_id}: nenhum canal entregou`)
        continue
      }
      enviados.push(`${s.gym_id}:${aviso}:email=${email}:push=${push}`)
    }

    console.log("[pix-lembretes]", enviados.length ? enviados.join(" ") : "nada a enviar")
    return new Response(JSON.stringify({ ok: true, enviados }), {
      headers: { "content-type": "application/json" },
    })
  } catch (e) {
    console.error("[pix-lembretes] exceção", String((e as Error)?.message || e))
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
})
