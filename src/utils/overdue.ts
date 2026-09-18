/**
 * Regra única de atraso e cobrança.
 *
 * Existia em duas cópias — `(tabs)/index.tsx` e `client-details.tsx` — que já
 * tinham divergido: uma pulava aluno trancado, a outra não.
 *
 * O problema que ela resolve: o app só sabia dizer "deve" ou "pagou". Sem um
 * terceiro estado, quem cadastra 230 alunos e acompanha 85 vê os outros 145
 * acumulando dívida para sempre. Medido no banco em 18/09/2026: de ~2.040
 * meses de atraso exibidos, só 138 eram dívida de quem está ativo. O resto era
 * cadastro que nunca foi usado ou aluno que já saiu.
 *
 * A coorte é DERIVADA a cada leitura, não gravada. Nenhum dado do usuário é
 * mutado — decisão do Kavicki em 18/09: "deixa os dados do usuário lá e vamos
 * seguir a regra". O custo é que o dono não consegue corrigir a classificação;
 * isso volta quando `clients.status` existir de verdade.
 */

/** Passando disto, o app para de somar dívida: quem sumiu não é inadimplente. */
export const TETO_MESES_ATRASO = 3;

/** Sem nenhum pagamento e cadastrado há tanto tempo: cadastro que nunca foi usado. */
export const MESES_PARA_SEM_COBRANCA = 3;

/** Última competência paga tão atrás: o aluno saiu da academia. */
export const MESES_PARA_DESLIGADO = 4;

export type Coorte = 'ativo' | 'trancado' | 'sem_cobranca' | 'desligado';

export type ResumoCobranca = {
    coorte: Coorte;
    /** Meses em aberto, já com o teto aplicado. Zero quando não é 'ativo'. */
    mesesEmAtraso: number;
    /** Sem teto e sem coorte — só para diagnóstico e comparação. */
    mesesEmAtrasoBruto: number;
    /** Competências em aberto, da mais antiga para a mais nova, limitadas ao teto. */
    mesesAbertos: string[];
    ultimaCompetenciaPaga: string | null;
};

export type ClienteParaCobranca = {
    created_at?: string | null;
    due_day?: number | null;
    subscription_locked?: boolean | null;
};

const chaveDoMes = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const dataDaChave = (chave: string): Date | null => {
    const [m, a] = chave.split('/');
    if (!m || !a || a.length !== 4) return null;
    const d = new Date(Number(a), Number(m) - 1, 1);
    return isNaN(d.getTime()) ? null : d;
};

const diferencaEmMeses = (de: Date, ate: Date) =>
    (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());

export function resumirCobranca(
    cliente: ClienteParaCobranca,
    competenciasPagas: Set<string>,
    agora: Date = new Date()
): ResumoCobranca {
    const diaVencimento = cliente.due_day || 1;

    const cadastro = cliente.created_at ? new Date(cliente.created_at) : null;
    const inicio = cadastro && !isNaN(cadastro.getTime())
        ? new Date(cadastro.getFullYear(), cadastro.getMonth(), 1)
        : new Date(agora.getFullYear(), agora.getMonth() - 12, 1);

    // Se o vencimento ainda não passou neste mês, o mês corrente não conta.
    const vencimentoJaPassou = agora.getDate() >= diaVencimento;
    const fim = new Date(
        agora.getFullYear(),
        vencimentoJaPassou ? agora.getMonth() : agora.getMonth() - 1,
        1
    );

    const abertos: string[] = [];
    const cursor = new Date(inicio);
    while (cursor <= fim) {
        const chave = chaveDoMes(cursor);
        if (!competenciasPagas.has(chave)) abertos.push(chave);
        cursor.setMonth(cursor.getMonth() + 1);
    }

    // Competência mais recente efetivamente paga.
    let ultimaPaga: Date | null = null;
    let ultimaPagaChave: string | null = null;
    competenciasPagas.forEach(chave => {
        const d = dataDaChave(chave);
        if (d && (!ultimaPaga || d > ultimaPaga)) {
            ultimaPaga = d;
            ultimaPagaChave = chave;
        }
    });

    const mesesDesdeCadastro = diferencaEmMeses(inicio, agora);

    let coorte: Coorte;
    if (cliente.subscription_locked) {
        coorte = 'trancado';
    } else if (competenciasPagas.size === 0) {
        // Cadastrado há pouco ainda é 'ativo': pode simplesmente não ter vencido.
        coorte = mesesDesdeCadastro >= MESES_PARA_SEM_COBRANCA ? 'sem_cobranca' : 'ativo';
    } else if (ultimaPaga && diferencaEmMeses(ultimaPaga, agora) >= MESES_PARA_DESLIGADO) {
        coorte = 'desligado';
    } else {
        coorte = 'ativo';
    }

    const cobravel = coorte === 'ativo';
    const limitados = abertos.slice(-TETO_MESES_ATRASO);

    return {
        coorte,
        mesesEmAtraso: cobravel ? Math.min(abertos.length, TETO_MESES_ATRASO) : 0,
        mesesEmAtrasoBruto: abertos.length,
        mesesAbertos: cobravel ? limitados : [],
        ultimaCompetenciaPaga: ultimaPagaChave,
    };
}

/** Agrupa os pagamentos por cliente em Sets de competência. */
export function agruparCompetencias(
    pagamentos: { client_id: string; reference_month: string | null }[]
): Record<string, Set<string>> {
    const mapa: Record<string, Set<string>> = {};
    pagamentos.forEach(p => {
        if (!mapa[p.client_id]) mapa[p.client_id] = new Set();
        if (p.reference_month) mapa[p.client_id].add(p.reference_month);
    });
    return mapa;
}
