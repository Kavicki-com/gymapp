/**
 * Próximo dia de pagamento de um colaborador, a partir do `payment_day` que
 * a tela já carrega. Só apresentação: não consulta nem grava nada.
 *
 * Dia maior que o último do mês (ex.: 31 em novembro) cai no último dia,
 * que é como a maioria das academias paga na prática.
 */

const DIA_MS = 86400000;

const ultimoDia = (ano: number, mes: number) => new Date(ano, mes + 1, 0).getDate();

/** Quantos dias faltam para considerar o pagamento "chegando". */
export const JANELA_PROXIMO = 7;

export function proximoPagamento(diaPagamento?: number | null, hoje = new Date()) {
    const dia = Number(diaPagamento);
    if (!dia || dia < 1) return null;

    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    let alvo = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, ultimoDia(base.getFullYear(), base.getMonth())));
    if (alvo < base) {
        const ano = base.getMonth() === 11 ? base.getFullYear() + 1 : base.getFullYear();
        const mes = (base.getMonth() + 1) % 12;
        alvo = new Date(ano, mes, Math.min(dia, ultimoDia(ano, mes)));
    }

    const dias = Math.round((alvo.getTime() - base.getTime()) / DIA_MS);
    const semana = alvo.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
    const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : semana;

    return { alvo, dias, quando, proximo: dias <= JANELA_PROXIMO };
}

/** "Carlos Menezes" → "CM". */
export const iniciaisDe = (nome?: string | null) =>
    (nome || '').trim().split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
