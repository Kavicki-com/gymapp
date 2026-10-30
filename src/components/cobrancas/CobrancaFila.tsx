import { Icon } from '@/src/components/Icon';
import { Section, SectionLabel } from '@/src/components/styled';
import { theme } from '@/src/styles/theme';
import { formatCurrency } from '@/src/utils/masks';
import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import {
    Apoio, BALAO, Barra, BarraCheia, BotaoPrincipal, BotaoPrincipalTexto, BotaoSecundario,
    BotaoSecundarioTexto, BotaoTexto, BotaoTextoRotulo, Devedor, Efetividade, IconeCopiar,
    IconeWhatsApp, Miudo, iniciaisDe, mesesRotulo, rotuloUltimaCobranca,
} from './comum';

/**
 * Vista "Fila" (Claude Design, Cobrancas): um aluno por vez, com a prévia da
 * mensagem que vai sair. A fila é a foto tirada ao entrar (quem tem telefone e
 * não foi cobrado nos últimos dias) — a tela só percorre essa foto.
 */

const Avatar = styled.View`
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background-color: ${theme.colors.neutralPill};
    align-items: center;
    justify-content: center;
`;

const AvatarTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 16px;
    color: ${theme.colors.textStrong};
`;

const Nome = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 18px;
    color: ${theme.colors.text};
`;

const CaixaDivida = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    gap: ${theme.spacing.md}px;
    padding: 14px;
    border-radius: 14px;
    background-color: ${theme.colors.dangerSoft};
`;

const Valor = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: 26px;
    color: ${theme.colors.danger};
`;

const Balao = styled.View`
    background-color: ${BALAO.fundo};
    border-radius: 16px;
    border-bottom-left-radius: 4px;
    padding: 14px;
    gap: 10px;
`;

const BalaoTexto = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${BALAO.texto};
`;

const Anexo = styled.View`
    flex-direction: row;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    padding: 10px 12px;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.25);
`;

const AnexoTexto = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${BALAO.anexo};
`;

const Faixa = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    padding: 14px;
    border-radius: 16px;
    border-width: 1px;
    border-style: dashed;
    border-color: ${theme.colors.border};
`;

const FaixaNumero = styled.Text<{ cor?: string }>`
    font-family: ${theme.fonts.display};
    text-align: center;
    font-size: 18px;
    color: ${({ cor }) => cor || theme.colors.text};
`;

const IconeRedondo = styled.View`
    width: 56px;
    height: 56px;
    border-radius: 28px;
    background-color: ${theme.colors.successSoft};
    align-items: center;
    justify-content: center;
`;

const TituloConcluida = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.text};
    text-align: center;
`;

/** Resultado da janela, em uma linha, embaixo da fila. Tudo abaixo de
    "Sair da fila" vai centralizado e espalhado por igual (space-between),
    com o grupo no meio da faixa (pedido do dono). */
function FaixaResultado({ efetividade, janelaDias }: { efetividade: Efetividade | null; janelaDias: number }) {
    if (!efetividade) return null;
    return (
        <Faixa accessibilityLabel={`Resultado dos últimos ${janelaDias} dias`}>
            {/* Rótulos em duas linhas, com a quebra escolhida aqui: deixando o
                texto quebrar sozinho, no Android a coluna do valor estreitava
                e cortava o "s" de "recuperados" para a linha de baixo. */}
            <View style={{ gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                <FaixaNumero>{efetividade.cobrados}</FaixaNumero>
                <Miudo style={{ textAlign: 'center' }} numberOfLines={2}>
                    {efetividade.cobrados === 1 ? 'cobrança' : 'cobranças'}{'\n'}em {janelaDias} dias
                </Miudo>
            </View>
            <View style={{ gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                <FaixaNumero cor={theme.colors.success}>{efetividade.pagaram}</FaixaNumero>
                <Miudo style={{ textAlign: 'center' }} numberOfLines={2}>
                    {efetividade.pagaram === 1 ? 'pagou' : 'pagaram'}{'\n'}depois
                </Miudo>
            </View>
            <View style={{ gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                <FaixaNumero adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(efetividade.valor)}</FaixaNumero>
                <Miudo style={{ textAlign: 'center' }} numberOfLines={2}>valor{'\n'}recuperado</Miudo>
            </View>
        </Faixa>
    );
}

export function CobrancaFila({
    fila, indice, contagem, mensagem, temPix, diasParaRecobrar, efetividade, janelaDias, lancando,
    onCobrar, onPular, onJaPagou, onSair, onEditarMensagem,
}: {
    fila: Devedor[];
    indice: number;
    contagem: { cobrados: number; pulados: number; pagos: number };
    /** Mensagem já montada para o aluno da vez (sem o Pix, que é anexado no envio). */
    mensagem: string;
    temPix: boolean;
    diasParaRecobrar: number;
    efetividade: Efetividade | null;
    janelaDias: number;
    lancando: boolean;
    onCobrar: () => void;
    onPular: () => void;
    onJaPagou: () => void;
    onSair: () => void;
    onEditarMensagem: () => void;
}) {
    const atual = fila[indice];

    if (!atual) {
        const vazia = fila.length === 0;
        const partes = [
            `${contagem.cobrados} ${contagem.cobrados === 1 ? 'cobrado' : 'cobrados'}`,
            `${contagem.pulados} ${contagem.pulados === 1 ? 'pulado' : 'pulados'}`,
            `${contagem.pagos} já ${contagem.pagos === 1 ? 'tinha' : 'tinham'} pago`,
        ];
        return (
            <>
                <Section style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 12 }}
                    accessibilityLabel={vazia ? 'Fila vazia' : 'Fila concluída'}>
                    <IconeRedondo>
                        <Icon name="check" size={28} strokeWidth={2.4} color={theme.colors.success} />
                    </IconeRedondo>
                    <TituloConcluida>{vazia ? 'Ninguém na fila agora' : 'Fila concluída'}</TituloConcluida>
                    <Apoio style={{ textAlign: 'center', fontSize: 14, lineHeight: 21 }}>
                        {vazia
                            ? `Sem telefone e cobrados há menos de ${diasParaRecobrar} dias ficam de fora da fila.`
                            : `${partes.join(', ')}.`}
                    </Apoio>
                    <BotaoPrincipal style={{ marginTop: 8, minHeight: 48 }} onPress={onSair}
                        accessibilityRole="button" accessibilityLabel="Voltar para a lista">
                        <BotaoPrincipalTexto>Voltar para a lista</BotaoPrincipalTexto>
                    </BotaoPrincipal>
                </Section>
                <FaixaResultado efetividade={efetividade} janelaDias={janelaDias} />
            </>
        );
    }

    const pct = Math.round(((indice + 1) / fila.length) * 100);

    return (
        <>
            <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Apoio>Cobrando {indice + 1} de {fila.length}</Apoio>
                    <Apoio style={{ flex: 1, textAlign: 'right' }}>
                        Sem telefone e cobrados há menos de {diasParaRecobrar} dias ficam de fora
                    </Apoio>
                </View>
                <Barra><BarraCheia pct={pct} cor={theme.colors.primary} /></Barra>
            </View>

            <Section style={{ padding: 18, gap: 16 }} accessibilityLabel="Aluno da vez">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar><AvatarTexto>{iniciaisDe(atual.nome)}</AvatarTexto></Avatar>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Nome numberOfLines={2}>{atual.nome}</Nome>
                        {atual.apoio ? <Apoio>{atual.apoio}</Apoio> : null}
                    </View>
                </View>
                <CaixaDivida>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Miudo style={{ color: theme.colors.dangerText }}>{mesesRotulo(atual.meses)} em aberto</Miudo>
                        <Apoio style={{ color: theme.colors.textStrong }}>{atual.mesesAbertos.join(' · ')}</Apoio>
                    </View>
                    <Valor>{formatCurrency(atual.total)}</Valor>
                </CaixaDivida>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                    <Apoio>{rotuloUltimaCobranca(atual.diasDesdeCobranca)}</Apoio>
                </View>
            </Section>

            <View style={{ gap: 8 }} accessibilityLabel="Mensagem que será enviada">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <SectionLabel>Mensagem</SectionLabel>
                    <BotaoTexto onPress={onEditarMensagem} style={{ paddingHorizontal: 0 }}
                        accessibilityRole="button" accessibilityLabel="Editar a mensagem de cobrança">
                        <BotaoTextoRotulo cor={theme.colors.primary}>Editar</BotaoTextoRotulo>
                    </BotaoTexto>
                </View>
                <Balao>
                    <BalaoTexto>{mensagem}</BalaoTexto>
                    {temPix && (
                        <Anexo>
                            <IconeCopiar color={BALAO.anexo} />
                            <AnexoTexto>Pix copia e cola anexado</AnexoTexto>
                        </Anexo>
                    )}
                </Balao>
            </View>

            <View style={{ gap: 10 }}>
                <BotaoPrincipal alto onPress={onCobrar}
                    accessibilityRole="button"
                    accessibilityLabel={`Cobrar ${atual.nome} e ir para o próximo`}>
                    <IconeWhatsApp size={20} color={theme.colors.onPrimary} />
                    <BotaoPrincipalTexto style={{ fontSize: 16 }}>Cobrar e avançar</BotaoPrincipalTexto>
                </BotaoPrincipal>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <BotaoSecundario style={{ flex: 1 }} onPress={onPular}
                        accessibilityRole="button" accessibilityLabel="Pular este aluno">
                        <BotaoSecundarioTexto>Pular</BotaoSecundarioTexto>
                    </BotaoSecundario>
                    <BotaoSecundario style={{ flex: 1, opacity: lancando ? 0.6 : 1 }} onPress={onJaPagou}
                        disabled={lancando}
                        accessibilityRole="button" accessibilityLabel={`Registrar pagamento de ${atual.nome}`}>
                        <BotaoSecundarioTexto cor={theme.colors.success}>Já pagou</BotaoSecundarioTexto>
                    </BotaoSecundario>
                </View>
                <BotaoTexto onPress={onSair} accessibilityRole="button" accessibilityLabel="Sair da fila">
                    <BotaoTextoRotulo>Sair da fila</BotaoTextoRotulo>
                </BotaoTexto>
            </View>

            <FaixaResultado efetividade={efetividade} janelaDias={janelaDias} />
        </>
    );
}
