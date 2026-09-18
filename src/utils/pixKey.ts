import { formatCNPJ, formatCPF, formatPhone } from '@/src/utils/masks';

/**
 * Tipos de chave Pix e como cada uma precisa ser GRAVADA.
 *
 * Isto não é detalhe cosmético: a chave vai crua dentro do BR Code, e o banco
 * do aluno recusa se o formato não for o canônico. CPF e CNPJ vão só com
 * dígitos, e celular vai em E.164 (+55DDNNNNNNNNN). Mandar "123.456.789-00"
 * ou "(21) 99999-9999" gera um código que não abre.
 */

export type TipoChavePix = 'cpf' | 'cnpj' | 'celular' | 'email' | 'aleatoria';

export const TIPOS_CHAVE_PIX: { valor: TipoChavePix; rotulo: string }[] = [
    { valor: 'cpf', rotulo: 'CPF' },
    { valor: 'cnpj', rotulo: 'CNPJ' },
    { valor: 'celular', rotulo: 'Celular' },
    { valor: 'email', rotulo: 'E-mail' },
    { valor: 'aleatoria', rotulo: 'Aleatória' },
];

/** Máscara de exibição enquanto o dono digita. */
export function mascararChave(tipo: TipoChavePix, valor: string): string {
    switch (tipo) {
        case 'cpf': return formatCPF(valor);
        case 'cnpj': return formatCNPJ(valor);
        case 'celular': return formatPhone(valor);
        default: return valor;
    }
}

/** Forma canônica, que é o que vai para o banco e para o BR Code. */
export function normalizarChave(tipo: TipoChavePix, valor: string): string {
    const digitos = valor.replace(/\D/g, '');
    switch (tipo) {
        case 'cpf':
        case 'cnpj':
            return digitos;
        case 'celular':
            // E.164. Aceita o dono digitando com ou sem o 55 na frente.
            return digitos.startsWith('55') && digitos.length > 11
                ? `+${digitos}`
                : `+55${digitos}`;
        case 'email':
            return valor.trim().toLowerCase();
        default:
            return valor.trim();
    }
}

/** Devolve null quando está válido, ou a razão da recusa. */
export function validarChave(tipo: TipoChavePix, valor: string): string | null {
    const bruto = valor.trim();
    if (!bruto) return 'Informe a chave Pix.';
    const digitos = bruto.replace(/\D/g, '');

    switch (tipo) {
        case 'cpf':
            return digitos.length === 11 ? null : 'CPF precisa ter 11 dígitos.';
        case 'cnpj':
            return digitos.length === 14 ? null : 'CNPJ precisa ter 14 dígitos.';
        case 'celular':
            return digitos.length === 10 || digitos.length === 11 || digitos.length === 13
                ? null
                : 'Celular precisa ter DDD e número.';
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto) ? null : 'E-mail inválido.';
        case 'aleatoria':
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruto)
                ? null
                : 'Chave aleatória tem o formato 8-4-4-4-12 (o banco fornece).';
    }
}

/** Reconhece o tipo de uma chave já salva, para reabrir a edição no lugar certo. */
export function detectarTipo(chave?: string | null): TipoChavePix {
    if (!chave) return 'cpf';
    const v = chave.trim();
    if (v.includes('@')) return 'email';
    if (v.startsWith('+')) return 'celular';
    if (/^[0-9a-f]{8}-/i.test(v)) return 'aleatoria';
    const d = v.replace(/\D/g, '');
    if (d.length === 14) return 'cnpj';
    return 'cpf';
}

export function teclado(tipo: TipoChavePix) {
    switch (tipo) {
        case 'cpf':
        case 'cnpj': return 'number-pad' as const;
        case 'celular': return 'phone-pad' as const;
        case 'email': return 'email-address' as const;
        default: return 'default' as const;
    }
}
