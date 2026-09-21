/**
 * Canal de contato do produto.
 *
 * Fica num lugar só porque o número aparece no drawer (Suporte) e na tela
 * travada da Cobranças — e trocar em dois lugares é como um deles fica velho.
 */

/** Só dígitos, com DDI. */
export const WHATSAPP_SUPORTE = '5521979137098';

/** Como mostrar para o usuário. */
export const WHATSAPP_SUPORTE_EXIBICAO = '+55 21 97913-7098';

export const linkWhatsApp = (mensagem?: string) =>
    `https://wa.me/${WHATSAPP_SUPORTE}` +
    (mensagem ? `?text=${encodeURIComponent(mensagem)}` : '');

/** Preço exibido. A cobrança de verdade lê billing_plans.amount no servidor. */
export const PRECO_ASSINATURA_EXIBICAO = 'R$ 9,90/mês';
