/**
 * Utilitário para traduzir mensagens de erro técnicas para português amigável
 */

export const translateError = (error: any): string => {
    const message = error?.message?.toLowerCase() || '';

    // Erros de autenticação
    if (message.includes('invalid login credentials')) {
        return 'Email ou senha incorretos.';
    }
    if (message.includes('email not confirmed')) {
        return 'Email não confirmado. Verifique sua caixa de entrada.';
    }
    if (message.includes('user already registered')) {
        return 'Este email já está cadastrado.';
    }
    if (message.includes('password should be at least')) {
        return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
        return 'Muitas tentativas. Aguarde alguns minutos.';
    }
    if (message.includes('jwt expired') || message.includes('token expired')) {
        return 'Sua sessão expirou. Faça login novamente.';
    }

    // Erros de rede
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return 'Erro de conexão. Verifique sua internet.';
    }

    // Erros de banco de dados
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
        return 'Este registro já existe.';
    }
    if (message.includes('violates foreign key')) {
        return 'Este item está vinculado a outros registros e não pode ser alterado.';
    }
    if (message.includes('not found') || message.includes('no rows')) {
        return 'Registro não encontrado.';
    }

    // Erros de permissão
    if (message.includes('permission denied') || message.includes('rls') || message.includes('policy')) {
        return 'Você não tem permissão para realizar esta ação.';
    }

    // Fallback - mensagem genérica
    return 'Ocorreu um erro. Tente novamente.';
};

/**
 * Retorna mensagem de erro formatada, logando o erro técnico para debug
 */
export const handleError = (error: any, context?: string): string => {
    // Log técnico para debug
    console.error(`[${context || 'Error'}]:`, error?.message || error);

    // Retorna mensagem amigável
    return translateError(error);
};
