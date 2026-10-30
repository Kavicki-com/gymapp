import { Icon } from '@/src/components/Icon';
import { theme } from '@/src/styles/theme';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import styled from 'styled-components/native';

/*
 * Peças do redesign usadas por Planos e Colaboradores (listas e formulários).
 *
 * Ficam aqui, e não no Icon.tsx / styled/index.ts compartilhados, porque só
 * estas telas as usam. Os ícones seguem o mesmo traço do Icon.tsx: viewBox
 * 24, traço 2, pontas arredondadas.
 */

type PropsIcone = { size?: number; color: string };

const tracoPadrao = {
    fill: 'none',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export function IconeLixeira({ size = 18, color }: PropsIcone) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...tracoPadrao}>
            <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </Svg>
    );
}

export function IconeCamera({ size = 14, color }: PropsIcone) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...tracoPadrao}>
            <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <Circle cx="12" cy="13" r="3.5" />
        </Svg>
    );
}

export function IconeSalario({ size = 18, color }: PropsIcone) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...tracoPadrao}>
            <Path d="M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M16 15h2" />
        </Svg>
    );
}

export function IconeKebab({ size = 20, color }: PropsIcone) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Circle cx="12" cy="5" r="1.8" />
            <Circle cx="12" cy="12" r="1.8" />
            <Circle cx="12" cy="19" r="1.8" />
        </Svg>
    );
}

/* ─── Cabeçalho de lista ─────────────────────────────────────────────── */

export const TituloTela = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSize.xxxl}px;
    letter-spacing: -0.3px;
    color: ${theme.colors.text};
`;

export const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const BotaoNovoFundo = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    padding: 0 ${theme.spacing.lg}px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.primary};
    flex-direction: row;
    align-items: center;
    gap: 6px;
`;

const BotaoNovoTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 15px;
    color: ${theme.colors.onPrimary};
`;

export function BotaoNovo({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
    return (
        <BotaoNovoFundo onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
            <Icon name="plus" size={18} color={theme.colors.onPrimary} strokeWidth={2.4} />
            <BotaoNovoTexto>Novo</BotaoNovoTexto>
        </BotaoNovoFundo>
    );
}

/** Botão só de ícone, 44×44 (voltar, fechar, editar, excluir). */
export const BotaoIcone = styled(TouchableOpacity)`
    width: ${theme.touch}px;
    height: ${theme.touch}px;
    border-radius: 12px;
    align-items: center;
    justify-content: center;
`;

/* ─── Busca ──────────────────────────────────────────────────────────── */

const BuscaCaixa = styled.View`
    flex-direction: row;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 14px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.border};
`;

const BuscaEntrada = styled.TextInput`
    flex: 1;
    min-width: 0;
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    color: ${theme.colors.text};
    padding: 0;
`;

export function CampoBusca({ value, onChangeText, placeholder, accessibilityLabel }: {
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    accessibilityLabel: string;
}) {
    return (
        <BuscaCaixa>
            <Icon name="search" size={18} color={theme.colors.textMuted} />
            <BuscaEntrada
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.placeholder}
                accessibilityLabel={accessibilityLabel}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Icon name="close" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
            )}
        </BuscaCaixa>
    );
}

export const TextoVazio = styled.Text`
    margin-top: 24px;
    text-align: center;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.textSecondary};
`;

/* ─── Formulários (modais) ───────────────────────────────────────────── */

const CabecalhoLinha = styled.View`
    flex-direction: row;
    align-items: center;
    gap: 4px;
    margin-left: -10px;
`;

const CabecalhoTitulo = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.text};
`;

/** X para fechar + título, no lugar da alça do modal. */
export function CabecalhoModal({ titulo, onClose, rotuloFechar }: {
    titulo: string;
    onClose: () => void;
    rotuloFechar: string;
}) {
    return (
        <CabecalhoLinha>
            <BotaoIcone onPress={onClose} accessibilityRole="button" accessibilityLabel={rotuloFechar}>
                <Icon name="close" size={22} color={theme.colors.text} strokeWidth={2.2} />
            </BotaoIcone>
            <CabecalhoTitulo accessibilityRole="header">{titulo}</CabecalhoTitulo>
        </CabecalhoLinha>
    );
}

export const Campo = styled.View`
    gap: 6px;
`;

export const RotuloCampo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

export const Obrigatorio = styled.Text`
    color: ${theme.colors.danger};
`;

export const Dica = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    line-height: 17px;
    color: ${theme.colors.textSecondary};
`;

/** Entrada de texto do redesign. `elevado` = dentro de um cartão. */
export const Entrada = styled.TextInput.attrs({
    placeholderTextColor: theme.colors.placeholder,
})<{ elevado?: boolean }>`
    min-height: 48px;
    padding: 0 12px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${({ elevado }) => (elevado ? theme.colors.elevated : theme.colors.surface)};
    border-width: 1px;
    border-color: ${theme.colors.border};
    font-family: ${theme.fonts.regular};
    font-size: ${theme.fontSize.md}px;
    color: ${theme.colors.text};
`;

export const Rodape = styled.View`
    padding: 12px ${theme.spacing.xl}px 0;
    background-color: ${theme.colors.background};
    border-top-width: 1px;
    border-top-color: ${theme.colors.divider};
`;

export const BotaoSalvar = styled(TouchableOpacity) <{ disabled?: boolean }>`
    min-height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
    opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

export const BotaoSalvarTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: ${theme.fontSize.md}px;
    color: ${theme.colors.onPrimary};
`;

/** Rótulo de seção do formulário (CONTRATO, DADOS PESSOAIS…). */
export const TituloSecao = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: ${theme.colors.textSecondary};
`;

export const Linha2 = styled(View)`
    flex-direction: row;
    gap: 10px;
`;
