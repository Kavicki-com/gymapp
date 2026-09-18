/**
 * Modelo da mensagem de cobrança, editável por academia.
 *
 * Cobrança é assunto delicado e cada dono fala de um jeito — o texto que vinha
 * no app era o meu, não o dele. O Pix copia e cola NÃO faz parte do modelo:
 * é anexado depois, para o dono não precisar saber colar marcador nenhum e
 * para não conseguir quebrar o código sem querer.
 */

export const MENSAGEM_PADRAO =
    'Olá, {nome}! Passando para lembrar do pagamento referente a {meses}, ' +
    'no total de {valor}. Poderia regularizar?';

export const MARCADORES: { chave: string; descricao: string }[] = [
    { chave: '{nome}', descricao: 'nome do aluno' },
    { chave: '{meses}', descricao: 'meses em aberto' },
    { chave: '{valor}', descricao: 'total devido' },
];

export type DadosMensagem = {
    nome: string;
    meses: string;
    valor: string;
};

export function montarMensagem(modelo: string | null | undefined, dados: DadosMensagem): string {
    const base = (modelo && modelo.trim()) || MENSAGEM_PADRAO;
    return base
        .replace(/\{nome\}/g, dados.nome)
        .replace(/\{meses\}/g, dados.meses)
        .replace(/\{valor\}/g, dados.valor);
}
