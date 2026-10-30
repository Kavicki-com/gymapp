/**
 * Tokens do redesign (Claude Design, "Sistema visual", 30/10/2026).
 *
 * Amarelo só na ação principal de cada tela. Vermelho é dinheiro em aberto,
 * verde é dinheiro que entrou. O resto é neutro.
 *
 * As chaves antigas (background, surface, inputBackground…) continuam
 * existindo com os valores novos, para as telas ainda não redesenhadas
 * herdarem a paleta sem mudar de código.
 */
export const theme = {
    colors: {
        background: '#0E0F11',
        surface: '#17191C',
        elevated: '#202327',
        inputBackground: '#17191C',
        border: '#2A2E33',
        divider: '#23262A',
        neutralPill: '#26292E',
        primary: '#EAB308',
        primaryHover: '#FACC15',
        onPrimary: '#111214',
        text: '#F4F4F2',
        textStrong: '#D4D7DB',
        textSecondary: '#A1A6AD',
        textMuted: '#8A9098',
        placeholder: '#8A9098',
        danger: '#F87171',
        dangerText: '#FCA5A5',
        success: '#34D399',
        successText: '#6EE7B7',
        whatsapp: '#25D366',
        /** Fundos translúcidos das pílulas e dos ícones de seção. */
        dangerSoft: 'rgba(248,113,113,0.14)',
        successSoft: 'rgba(52,211,153,0.12)',
        primarySoft: 'rgba(234,179,8,0.14)',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 32,
    },
    borderRadius: {
        sm: 10,
        md: 14,
        lg: 20,
        pill: 999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 28,
        hero: 40,
    },
    /**
     * Fonte com peso embutido no nome: no Android, fontFamily customizada
     * ignora fontWeight. Por isso nunca combinar as duas.
     */
    fonts: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
        display: 'Archivo_700Bold',
        displayHeavy: 'Archivo_800ExtraBold',
    },
    /** Altura mínima de qualquer coisa tocável. */
    touch: 44,
};
