export const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCurrency = (value: number | string) => {
    if (value === '' || value === null || value === undefined) return '';
    // Converte para número se for string
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};

export const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    let v = value.replace(/\D/g, '');

    // Converte para centavos
    const num = parseFloat(v) / 100;

    if (isNaN(num)) return '';

    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};

// Helper para converter input formatado de volta para float para salvar
export const parseCurrencyToFloat = (value: string) => {
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(cleaned);
};

export const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned
        .replace(/^(\d{2})(\d)/g, '($1)$2')
        .replace(/(\d)(\d{4})$/, '$1-$2');
};
