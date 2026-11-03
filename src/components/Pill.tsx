import { theme } from '@/src/styles/theme';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import styled from 'styled-components/native';

/**
 * Pílula de situação do redesign: Em dia, Vence sexta, 2 meses, Trancado.
 *
 * O tom carrega o significado (verde entrou, amarelo vence, vermelho em
 * aberto, neutro fora da conta), então a tela escolhe o tom, não a cor.
 */
export type PillTone = 'ok' | 'soon' | 'late' | 'neutral';

const tons: Record<PillTone, { bg: string; fg: string }> = {
    ok: { bg: theme.colors.successSoft, fg: theme.colors.success },
    soon: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
    late: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    neutral: { bg: theme.colors.neutralPill, fg: theme.colors.textSecondary },
};

// Sem align-self próprio: segue o alignItems de quem posiciona. Numa linha
// centralizada fica no meio (antes grudava no topo); numa coluna que estica,
// quem chama passa style={{ alignSelf: 'flex-start' }}.
const Fundo = styled.View<{ bg: string; small?: boolean }>`
    padding: ${({ small }) => (small ? '2px 8px' : '4px 10px')};
    border-radius: ${theme.borderRadius.pill}px;
    background-color: ${({ bg }) => bg};
`;

const Texto = styled.Text<{ fg: string; small?: boolean }>`
    font-family: ${theme.fonts.semibold};
    font-size: ${({ small }) => (small ? 11 : 12)}px;
    color: ${({ fg }) => fg};
`;

export function Pill({ tone, label, small, style }: {
    tone: PillTone;
    label: string;
    small?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const t = tons[tone];
    return (
        <Fundo bg={t.bg} small={small} style={style}>
            <Texto fg={t.fg} small={small}>{label}</Texto>
        </Fundo>
    );
}
