import { BottomSheet } from '@/src/components/BottomSheet';
import { Icon } from '@/src/components/Icon';
import { theme } from '@/src/styles/theme';
import React from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Dimensions,
    Platform,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import styled from 'styled-components/native';

/*
 * Peças das telas de acesso (login, cadastro, senha, onboarding), no layout
 * do Claude Design. Só apresentação: nenhuma delas sabe de Supabase.
 */

/** Cor da alça da folha inferior — um tom acima da borda, como no design. */
const ALCA = '#3A3F45';

/* ─── Estrutura da tela ──────────────────────────────────────────────── */

/**
 * Casca das telas de acesso: fundo, área segura do topo e da base, teclado
 * e rolagem. `respiroTopo` é o espaço além da área segura (8 quando a tela
 * tem seta de voltar, mais quando o título abre a tela).
 */
export function TelaAcesso({ children, respiroTopo = 8, espaco = 24 }: {
    children: React.ReactNode;
    respiroTopo?: number;
    espaco?: number;
}) {
    const insets = useSafeAreaInsets();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                    width: '100%',
                    maxWidth: 480,
                    alignSelf: 'center',
                    paddingTop: insets.top + respiroTopo,
                    paddingBottom: insets.bottom + 32,
                    paddingHorizontal: 24,
                    gap: espaco,
                }}
            >
                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/** Empurra o que vem dentro para o pé da tela. */
export function Rodape({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
    return <View style={{ marginTop: 'auto', gap }}>{children}</View>;
}

export function BotaoVoltar({ onPress, rotulo = 'Voltar' }: { onPress: () => void; rotulo?: string }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            style={{ width: theme.touch, height: theme.touch, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}
        >
            <Icon name="back" size={22} strokeWidth={2.2} color={theme.colors.text} />
        </TouchableOpacity>
    );
}

/* ─── Texto ──────────────────────────────────────────────────────────── */

export const Cabecalho = styled.View`
    gap: ${theme.spacing.sm}px;
`;

export const Titulo = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: 30px;
    line-height: 36px;
    letter-spacing: -0.6px;
    color: ${theme.colors.text};
`;

export const Subtitulo = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    line-height: 22px;
    color: ${theme.colors.textSecondary};
`;

export const Destaque = styled.Text`
    font-family: ${theme.fonts.semibold};
    color: ${theme.colors.text};
`;

/** "Já tem conta? Entrar" — a parte tocável vai num HighlightText. */
export const TextoRodape = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    color: ${theme.colors.textSecondary};
    text-align: center;
`;

export const Dica = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    line-height: 17px;
    color: ${theme.colors.textSecondary};
`;

/* ─── Formulário ─────────────────────────────────────────────────────── */

export const Formulario = styled.View`
    gap: ${theme.spacing.lg}px;
`;

const Rotulo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.textStrong};
`;

const RotuloApoio = styled.Text`
    font-family: ${theme.fonts.regular};
    color: ${theme.colors.textSecondary};
`;

const RotuloObrigatorio = styled.Text`
    font-family: ${theme.fonts.semibold};
    color: ${theme.colors.danger};
`;

/** Rótulo + campo + dica, empilhados com 8 px. */
export function Campo({ rotulo, icone, opcional, obrigatorio, dica, children }: {
    rotulo: string;
    icone?: React.ReactNode;
    opcional?: boolean;
    obrigatorio?: boolean;
    dica?: string;
    children: React.ReactNode;
}) {
    return (
        <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {icone}
                <Rotulo>
                    {rotulo}
                    {opcional ? <RotuloApoio> (opcional)</RotuloApoio> : null}
                    {obrigatorio ? <RotuloObrigatorio> *</RotuloObrigatorio> : null}
                </Rotulo>
            </View>
            {children}
            {dica ? <Dica>{dica}</Dica> : null}
        </View>
    );
}

/* ─── Botões ─────────────────────────────────────────────────────────── */

const FundoPrincipal = styled(TouchableOpacity)<{ inativo?: boolean }>`
    min-height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
    padding-horizontal: ${theme.spacing.lg}px;
    opacity: ${({ inativo }) => (inativo ? 0.6 : 1)};
`;

const TextoPrincipal = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 16px;
    color: ${theme.colors.onPrimary};
`;

/** A ação amarela da tela — só uma por tela. */
export function BotaoPrincipal({ titulo, onPress, carregando, disabled }: {
    titulo: string;
    onPress: () => void;
    carregando?: boolean;
    disabled?: boolean;
}) {
    const inativo = !!(disabled || carregando);
    return (
        <FundoPrincipal
            onPress={onPress}
            disabled={inativo}
            inativo={inativo}
            accessibilityRole="button"
            accessibilityLabel={titulo}
            accessibilityState={{ disabled: inativo, busy: !!carregando }}
        >
            {carregando
                ? <ActivityIndicator color={theme.colors.onPrimary} />
                : <TextoPrincipal>{titulo}</TextoPrincipal>}
        </FundoPrincipal>
    );
}

/** Ação de texto (amarela por padrão), com área de toque de 44 px. */
export const BotaoTexto = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    justify-content: center;
    align-items: center;
`;

export const BotaoTextoRotulo = styled.Text<{ cor?: string }>`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${({ cor }) => cor || theme.colors.primary};
`;

/* ─── Telas de estado (sucesso, erro, espera) ────────────────────────── */

type Tom = 'sucesso' | 'perigo' | 'marca';

const fundoDoTom = (tom: Tom) =>
    tom === 'sucesso' ? theme.colors.successSoft :
        tom === 'perigo' ? theme.colors.dangerSoft :
            theme.colors.primarySoft;

export const corDoTom = (tom: Tom) =>
    tom === 'sucesso' ? theme.colors.success :
        tom === 'perigo' ? theme.colors.danger :
            theme.colors.primary;

export function IconeEstado({ tom, children }: { tom: Tom; children: React.ReactNode }) {
    return (
        <View
            style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: fundoDoTom(tom),
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </View>
    );
}

export const BlocoEstado = styled.View`
    align-items: center;
    gap: ${theme.spacing.xl}px;
`;

export const TituloEstado = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: 28px;
    line-height: 34px;
    letter-spacing: -0.5px;
    color: ${theme.colors.text};
    text-align: center;
`;

export const TextoEstado = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    line-height: 24px;
    color: ${theme.colors.textSecondary};
    text-align: center;
    max-width: 300px;
`;

export const Contagem = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: ${theme.fontSize.hero}px;
    line-height: 46px;
    color: ${theme.colors.primary};
`;

/** Faixa vermelha clara com a mensagem de erro (ex.: link inválido). */
export const AvisoErro = styled.Text`
    align-self: stretch;
    padding: ${theme.spacing.md}px 14px;
    border-radius: 12px;
    overflow: hidden;
    background-color: rgba(248, 113, 113, 0.1);
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${theme.colors.dangerText};
    text-align: center;
`;

/* ─── Ícones que o Icon.tsx compartilhado não tem ────────────────────── */

export type IconeAcessoNome = 'olho' | 'olho-fechado' | 'email' | 'alerta' | 'imagem' | 'circulo';

export function IconeAcesso({ nome, size = 20, color, strokeWidth = 2 }: {
    nome: IconeAcessoNome;
    size?: number;
    color: string;
    strokeWidth?: number;
}) {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {nome === 'olho' && (
                <>
                    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <Circle cx="12" cy="12" r="3" />
                </>
            )}
            {nome === 'olho-fechado' && (
                <>
                    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <Circle cx="12" cy="12" r="3" />
                    <Path d="M3 3l18 18" />
                </>
            )}
            {nome === 'email' && (
                <>
                    <Rect x="3" y="5" width="18" height="14" rx="2" />
                    <Path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
                </>
            )}
            {nome === 'alerta' && (
                <>
                    <Path d="M12 7v6M12 17v.01" />
                    <Circle cx="12" cy="12" r="9" />
                </>
            )}
            {nome === 'imagem' && (
                <>
                    <Rect x="3" y="5" width="18" height="14" rx="2" />
                    <Circle cx="9" cy="10" r="2" />
                    <Path d="m21 16-5-5-8 8" />
                </>
            )}
            {nome === 'circulo' && <Circle cx="12" cy="12" r="7" />}
        </Svg>
    );
}

/* ─── Folha inferior (termos e política) ─────────────────────────────── */

const Folha = styled.View`
    max-height: ${Math.round(Dimensions.get('window').height * 0.86)}px;
    background-color: ${theme.colors.surface};
    border-top-width: 1px;
    border-color: ${theme.colors.border};
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 12px 20px 0;
    gap: 14px;
`;

const TituloFolha = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.text};
`;

const BotaoFechar = styled(TouchableOpacity)`
    min-height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
`;

const BotaoFecharTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 15px;
    color: ${theme.colors.onPrimary};
`;

/**
 * Folha que sobe da base, com alça, título, conteúdo rolável e "Fechar".
 * Tocar fora dela também fecha.
 */
export function FolhaInferior({ visible, onClose, titulo, children }: {
    visible: boolean;
    onClose: () => void;
    titulo: string;
    children: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();
    return (
        <BottomSheet visible={visible} onClose={onClose}>
                <Folha style={{ paddingBottom: insets.bottom + 24 }} accessibilityViewIsModal>
                    <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: ALCA }} />
                    <TituloFolha accessibilityRole="header">{titulo}</TituloFolha>
                    <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator>
                        {children}
                    </ScrollView>
                    <BotaoFechar onPress={onClose} accessibilityRole="button">
                        <BotaoFecharTexto>Fechar</BotaoFecharTexto>
                    </BotaoFechar>
                </Folha>
        </BottomSheet>
    );
}
