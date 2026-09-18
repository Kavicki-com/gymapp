import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Notificações diárias para o DONO da academia.
 *
 * A versão anterior mandava UMA NOTIFICAÇÃO POR ALUNO EM ATRASO, POR TOKEN,
 * DUAS VEZES POR DIA. Medido em 18/09/2026, antes desta reescrita:
 *
 *   Gym WM fitness   123 por execução  = 246 por dia   (academia que já saiu)
 *   Cactus Fit        24 por execução  =  48 por dia   (academia ATIVA)
 *
 * Isso é spam a ponto de ser motivo para desinstalar o app — e a Gym WM vinha
 * recebendo isso há meses depois de ter parado de usar, porque token de app
 * desinstalado nunca era removido.
 *
 * O que mudou:
 *  - UMA notificação agregada por academia, por assunto. Nunca uma por aluno.
 *  - Os dois disparos do cron passam a ter assuntos diferentes: de manhã o
 *    aviso PREVENTIVO (vence nos próximos dias), à noite o resumo do que está
 *    em atraso. Antes os dois mandavam a mesma coisa.
 *  - Usa a mesma regra de coorte do app (src/utils/overdue.ts): cadastro que
 *    nunca foi usado e aluno que saiu não contam como dívida.
 *  - Token morto é removido: o Expo responde DeviceNotRegistered e agora a
 *    gente apaga em vez de insistir para sempre.
 *  - Saiu o bloco de manutenção de equipamento: a funcionalidade foi removida
 *    do app.
 *
 * verify_jwt FICA FALSE: o cron (pg_cron + net.http_post) chama sem header de
 * Authorization. Ligar isso derruba as notificações inteiras — ver a pendência
 * 4 do supabase/README, que continua valendo.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Espelha src/utils/overdue.ts. Mudou lá, muda aqui. */
const TETO_MESES_ATRASO = 3;
const MESES_PARA_SEM_COBRANCA = 3;
const MESES_PARA_DESLIGADO = 4;
/** Quantos dias antes do vencimento vale avisar. */
const JANELA_PRE_VENCIMENTO = 3;

type Mensagem = { to: string; title: string; body: string; data: unknown; sound: string };

const chaveDoMes = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const dataDaChave = (c: string): Date | null => {
  const [m, a] = c.split("/");
  if (!m || !a || a.length !== 4) return null;
  const d = new Date(Number(a), Number(m) - 1, 1);
  return isNaN(d.getTime()) ? null : d;
};

const difMeses = (de: Date, ate: Date) =>
  (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());

function resumirCobranca(
  cliente: { created_at?: string | null; due_day?: number | null; subscription_locked?: boolean | null },
  pagas: Set<string>,
  agora: Date,
) {
  const diaVenc = cliente.due_day || 1;
  const cad = cliente.created_at ? new Date(cliente.created_at) : null;
  const inicio = cad && !isNaN(cad.getTime())
    ? new Date(cad.getFullYear(), cad.getMonth(), 1)
    : new Date(agora.getFullYear(), agora.getMonth() - 12, 1);

  const vencPassou = agora.getDate() >= diaVenc;
  const fim = new Date(agora.getFullYear(), vencPassou ? agora.getMonth() : agora.getMonth() - 1, 1);

  let abertos = 0;
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    if (!pagas.has(chaveDoMes(cursor))) abertos++;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  let ultima: Date | null = null;
  pagas.forEach((c) => {
    const d = dataDaChave(c);
    if (d && (!ultima || d > ultima)) ultima = d;
  });

  let coorte: string;
  if (cliente.subscription_locked) coorte = "trancado";
  else if (pagas.size === 0) {
    coorte = difMeses(inicio, agora) >= MESES_PARA_SEM_COBRANCA ? "sem_cobranca" : "ativo";
  } else if (ultima && difMeses(ultima, agora) >= MESES_PARA_DESLIGADO) coorte = "desligado";
  else coorte = "ativo";

  return {
    coorte,
    mesesEmAtraso: coorte === "ativo" ? Math.min(abertos, TETO_MESES_ATRASO) : 0,
  };
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Envia e remove os tokens que o Expo reportar como inválidos. */
async function enviar(mensagens: Mensagem[]) {
  if (mensagens.length === 0) return { enviadas: 0, removidos: 0 };
  let removidos = 0;

  for (let i = 0; i < mensagens.length; i += 100) {
    const lote = mensagens.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(lote),
      });
      const json = await res.json().catch(() => null);
      const tickets = json?.data;
      if (!Array.isArray(tickets)) continue;

      // App desinstalado: parar de insistir. Era o que mantinha a Gym WM
      // recebendo notificação meses depois de ter sumido.
      const mortos = tickets
        .map((t: { status?: string; details?: { error?: string } }, idx: number) =>
          t?.status === "error" && t?.details?.error === "DeviceNotRegistered"
            ? lote[idx].to
            : null)
        .filter((t): t is string => !!t);

      if (mortos.length > 0) {
        await supabase.from("push_tokens").delete().in("token", mortos);
        removidos += mortos.length;
      }
    } catch (e) {
      console.error("falha ao enviar lote:", e);
    }
  }
  return { enviadas: mensagens.length, removidos };
}

Deno.serve(async (_req: Request) => {
  try {
    const agora = new Date();
    // Os dois jobs do cron batem no mesmo endpoint. O da manhã (12:00 UTC)
    // manda o aviso preventivo; o da noite (21:00 UTC), o resumo do atraso.
    const preventivo = agora.getUTCHours() < 15;

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens").select("token, gym_id");
    if (tokensError) throw tokensError;
    if (!tokens?.length) {
      return new Response(JSON.stringify({ message: "Sem tokens" }), { status: 200 });
    }

    const porAcademia: Record<string, string[]> = {};
    for (const t of tokens) {
      if (!t.gym_id) continue;
      (porAcademia[t.gym_id] ??= []).push(t.token);
    }
    const gymIds = Object.keys(porAcademia);

    const [clientesRes, pagamentosRes, planosRes] = await Promise.all([
      supabase.from("clients")
        .select("id, name, gym_id, due_day, created_at, subscription_locked, plan_id")
        .in("gym_id", gymIds),
      supabase.from("payments")
        .select("client_id, reference_month")
        .in("gym_id", gymIds).is("deleted_at", null),
      supabase.from("plans").select("id, price").in("gym_id", gymIds),
    ]);

    const clientes = clientesRes.data || [];
    const planos = new Map((planosRes.data || []).map((p) => [p.id, Number(p.price) || 0]));

    const pagasPorCliente: Record<string, Set<string>> = {};
    for (const p of pagamentosRes.data || []) {
      (pagasPorCliente[p.client_id] ??= new Set());
      if (p.reference_month) pagasPorCliente[p.client_id].add(p.reference_month);
    }

    // Agrega por academia. NUNCA uma notificação por aluno.
    const resumo: Record<string, { atrasados: number; valor: number; aVencer: number }> = {};
    for (const id of gymIds) resumo[id] = { atrasados: 0, valor: 0, aVencer: 0 };

    const diaHoje = agora.getDate();
    const compAtual = chaveDoMes(agora);

    for (const c of clientes) {
      const pagas = pagasPorCliente[c.id] || new Set<string>();
      const r = resumirCobranca(c, pagas, agora);
      const preco = c.plan_id ? (planos.get(c.plan_id) || 0) : 0;

      if (r.mesesEmAtraso > 0) {
        resumo[c.gym_id].atrasados++;
        resumo[c.gym_id].valor += preco * r.mesesEmAtraso;
        continue;
      }

      // Preventivo: vence nos próximos dias e ainda não pagou o mês corrente.
      if (r.coorte === "ativo" && c.due_day) {
        const faltam = c.due_day - diaHoje;
        if (faltam >= 0 && faltam <= JANELA_PRE_VENCIMENTO && !pagas.has(compAtual)) {
          resumo[c.gym_id].aVencer++;
        }
      }
    }

    const mensagens: Mensagem[] = [];
    for (const gymId of gymIds) {
      const r = resumo[gymId];
      const destinos = porAcademia[gymId];

      if (preventivo) {
        if (r.aVencer === 0) continue;
        const corpo = r.aVencer === 1
          ? "1 mensalidade vence nos próximos dias. Que tal lembrar antes de virar atraso?"
          : `${r.aVencer} mensalidades vencem nos próximos dias. Que tal lembrar antes de virar atraso?`;
        for (const to of destinos) {
          mensagens.push({
            to, title: "📅 Vencimentos chegando", body: corpo,
            data: { type: "collections" }, sound: "default",
          });
        }
      } else {
        if (r.atrasados === 0) continue;
        const corpo = r.atrasados === 1
          ? `1 aluno em atraso · ${brl(r.valor)} a receber`
          : `${r.atrasados} alunos em atraso · ${brl(r.valor)} a receber`;
        for (const to of destinos) {
          mensagens.push({
            to, title: "💰 Cobranças em aberto", body: corpo,
            data: { type: "collections" }, sound: "default",
          });
        }
      }
    }

    const { enviadas, removidos } = await enviar(mensagens);

    return new Response(
      JSON.stringify({ success: true, modo: preventivo ? "preventivo" : "atraso", enviadas, tokensRemovidos: removidos }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("check-notifications error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
