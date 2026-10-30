import { Icon } from '@/src/components/Icon';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import styled from 'styled-components/native';

/*
 * Peças compartilhadas pelas vistas da aba Cobranças (redesign, Claude Design:
 * Cobrancas, CobrancasLista, CobrancasResultado, CobrancaConfig).
 *
 * Só apresentação. Os dados, as contas e as gravações moram em
 * app/(drawer)/(tabs)/collections.tsx.
 */

export type Devedor = {
    id: string;
    nome: string;
    telefone: string;
    meses: number;
    mesesAbertos: string[];
    valorPlano: number;
    total: number;
    diasDesdeCobranca: number | null;
    /** Só para exibir na fila ("Mensal · vence dia 10"). */
    apoio: string;
};

export type Efetividade = { cobrados: number; pagaram: number; valor: number };

/** Cobrança da janela que virou pagamento — a lista do Resultado. */
export type Pagante = {
    chave: string;
    nome: string;
    cobradoEm: string;
    pagouEm: string;
    valor: number;
};

export type Modo = 'fila' | 'lista' | 'resultado';

/* Cores do balão de WhatsApp da prévia. Ficam aqui, e não no tema, porque só
   existem nesta tela. */
export const BALAO = {
    fundo: '#1E2A24',
    texto: '#E8ECE9',
    anexo: '#A7F3D0',
};

export const mesesRotulo = (n: number) => (n === 1 ? '1 mês' : `${n} meses`);

export const rotuloUltimaCobranca = (dias: number | null) =>
    dias === null
        ? 'Nunca cobrado'
        : dias === 0
            ? 'Cobrado hoje'
            : dias === 1
                ? 'Cobrado ontem'
                : `Cobrado há ${dias} dias`;

export const iniciaisDe = (nome: string) =>
    nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

/* ─── Textos ─────────────────────────────────────────────────────────── */

export const Titulo = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSize.xxxl}px;
    letter-spacing: -0.3px;
    color: ${theme.colors.text};
`;

export const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    line-height: 19px;
    color: ${theme.colors.textSecondary};
`;

export const Miudo = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textSecondary};
`;

export const TextoForte = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

/* ─── Barra de progresso ─────────────────────────────────────────────── */

export const Barra = styled.View<{ alta?: boolean }>`
    height: ${({ alta }) => (alta ? 8 : 6)}px;
    border-radius: ${({ alta }) => (alta ? 4 : 3)}px;
    background-color: ${theme.colors.border};
    overflow: hidden;
`;

export const BarraCheia = styled.View<{ pct: number; cor: string }>`
    height: 100%;
    width: ${({ pct }) => pct}%;
    background-color: ${({ cor }) => cor};
`;

/* ─── Botões ─────────────────────────────────────────────────────────── */

export const BotaoPrincipal = styled(TouchableOpacity)<{ alto?: boolean }>`
    min-height: ${({ alto }) => (alto ? 56 : 52)}px;
    border-radius: ${({ alto }) => (alto ? 16 : 14)}px;
    background-color: ${theme.colors.primary};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.sm}px;
    padding: 0 ${theme.spacing.xl}px;
`;

export const BotaoPrincipalTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 15px;
    color: ${theme.colors.onPrimary};
`;

export const BotaoSecundario = styled(TouchableOpacity)`
    min-height: 48px;
    border-radius: 14px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.sm}px;
    padding: 0 14px;
`;

export const BotaoSecundarioTexto = styled.Text<{ cor?: string }>`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${({ cor }) => cor || theme.colors.text};
`;

export const BotaoTexto = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    align-items: center;
    justify-content: center;
    padding: 0 ${theme.spacing.md}px;
`;

export const BotaoTextoRotulo = styled.Text<{ cor?: string }>`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${({ cor }) => cor || theme.colors.textSecondary};
`;

/* ─── Ícones que o Icon.tsx não tem ──────────────────────────────────── */

export const IconeWhatsApp = ({ size = 18, color = theme.colors.whatsapp }: { size?: number; color?: string }) => (
    <FontAwesome name="whatsapp" size={size} color={color} />
);

const Traco = ({ size, color, children }: { size: number; color: string; children: React.ReactNode }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
    </Svg>
);

export const IconeCopiar = ({ size = 16, color }: { size?: number; color: string }) => (
    <Traco size={size} color={color}>
        <Rect x="8" y="8" width="12" height="12" rx="2" />
        <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Traco>
);

export const IconeQr = ({ size = 16, color }: { size?: number; color: string }) => (
    <Traco size={size} color={color}>
        <Rect x="3" y="3" width="7" height="7" rx="1" />
        <Rect x="14" y="3" width="7" height="7" rx="1" />
        <Rect x="3" y="14" width="7" height="7" rx="1" />
        <Path d="M14 14h3v3M21 21h-4M21 14v3" />
    </Traco>
);

/* ─── Cabeçalho: título + atalho para Mensagem e Pix ──────────────────── */

const Topo = styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const BotaoIcone = styled(TouchableOpacity)`
    width: ${theme.touch}px;
    height: ${theme.touch}px;
    border-radius: 14px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    align-items: center;
    justify-content: center;
`;

export function Cabecalho({ onConfig }: { onConfig?: () => void }) {
    return (
        <Topo>
            <Titulo>Cobranças</Titulo>
            {onConfig && (
                <BotaoIcone onPress={onConfig} accessibilityRole="button"
                    accessibilityLabel="Editar mensagem e chave Pix">
                    <Icon name="pencil" size={20} color={theme.colors.textStrong} />
                </BotaoIcone>
            )}
        </Topo>
    );
}

/* ─── Seletor Fila · Lista · Resultado ────────────────────────────────── */

const Trilho = styled.View`
    flex-direction: row;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
`;

const Aba = styled(TouchableOpacity)<{ ativa: boolean }>`
    flex: 1;
    min-height: 36px;
    border-radius: 10px;
    align-items: center;
    justify-content: center;
    background-color: ${({ ativa }) => (ativa ? theme.colors.border : 'transparent')};
`;

const AbaTexto = styled.Text<{ ativa: boolean }>`
    font-family: ${({ ativa }) => (ativa ? theme.fonts.semibold : theme.fonts.medium)};
    font-size: 14px;
    color: ${({ ativa }) => (ativa ? theme.colors.text : theme.colors.textSecondary)};
`;

const ABAS: { modo: Modo; rotulo: string }[] = [
    { modo: 'fila', rotulo: 'Fila' },
    { modo: 'lista', rotulo: 'Lista' },
    { modo: 'resultado', rotulo: 'Resultado' },
];

export function Segmento({ ativo, onChange }: { ativo: Modo; onChange: (m: Modo) => void }) {
    return (
        <Trilho accessibilityRole="tablist">
            {ABAS.map(a => (
                <Aba
                    key={a.modo}
                    ativa={ativo === a.modo}
                    onPress={() => ativo !== a.modo && onChange(a.modo)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: ativo === a.modo }}
                    accessibilityLabel={a.rotulo}
                    hitSlop={{ top: 4, bottom: 4 }}
                >
                    <AbaTexto ativa={ativo === a.modo}>{a.rotulo}</AbaTexto>
                </Aba>
            ))}
        </Trilho>
    );
}

/** Topo comum às três vistas: título, lápis e seletor. */
export function TopoCobrancas({ modo, onModo, onConfig }: { modo: Modo; onModo: (m: Modo) => void; onConfig: () => void }) {
    return (
        <View style={{ gap: 14 }}>
            <Cabecalho onConfig={onConfig} />
            <Segmento ativo={modo} onChange={onModo} />
        </View>
    );
}
