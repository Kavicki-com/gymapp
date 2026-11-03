/**
 * Link para a página que entrega o Pix copia e cola.
 *
 * Um BR Code cru dentro de uma mensagem do WhatsApp não chega ao destino: o
 * próprio WhatsApp o reconhece e a mensagem some, com dois tiques no remetente.
 * Acontece até colando o código à mão, sem o app. Por isso a cobrança leva um
 * link e o código só aparece na página, onde o aluno copia.
 *
 * O código vai no fragmento (#) em base64url: o fragmento não sai do aparelho
 * do aluno, então o servidor não vê a chave nem o valor, e a página não
 * precisa de banco. A página fica em site-gymapp/pix.html e tem de estar
 * publicada antes de qualquer build que mande este link.
 */

export const PIX_PAGINA = 'https://gymapp.kavicki.com/pix.html';

/** Espera o BR Code pronto; ele é sempre ASCII, que é o que o btoa aceita. */
export function linkDoPix(brCode: string): string {
    const b64url = btoa(brCode)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return `${PIX_PAGINA}#${b64url}`;
}
