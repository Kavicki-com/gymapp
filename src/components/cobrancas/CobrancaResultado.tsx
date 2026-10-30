import { Divider, HeroNumber, Section, SectionLabel } from '@/src/components/styled';
import { theme } from '@/src/styles/theme';
import { formatCurrency } from '@/src/utils/masks';
import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import {
    Apoio, Barra, BarraCheia, BotaoSecundario, BotaoSecundarioTexto, Efetividade, Pagante, TextoForte,
} from './comum';

/**
 * Vista "Resultado" (Claude Design, CobrancasResultado): cobrados × pagaram na
 * mesma janela. NÃO comparar com o total devido — aquilo é estoque e isto é
 * fluxo, e o valor recuperado sai do devido no mesmo instante em que entra aqui.
 */

const Linha = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: ${theme.spacing.md}px;
    padding: 14px 0;
`;

const NomeLinha = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const ValorLinha = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.success};
`;

const Tracejado = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: ${theme.spacing.md}px;
    padding: ${theme.spacing.lg}px;
    border-radius: 16px;
    border-width: 1px;
    border-style: dashed;
    border-color: ${theme.colors.border};
`;

const diaMes = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const quando = (p: Pagante) => {
    const cobrado = diaMes(p.cobradoEm);
    const pagou = diaMes(p.pagouEm);
    return cobrado === pagou
        ? `Cobrado em ${cobrado} · pagou no mesmo dia`
        : `Cobrado em ${cobrado} · pagou em ${pagou}`;
};

export function CobrancaResultado({
    efetividade, pagantes, janelaDias, prazoDias, diasParaRecobrar, onVerFila,
}: {
    efetividade: Efetividade | null;
    pagantes: Pagante[];
    janelaDias: number;
    prazoDias: number;
    diasParaRecobrar: number;
    onVerFila: () => void;
}) {
    if (!efetividade) {
        return (
            <Section style={{ padding: theme.spacing.xl, gap: 8 }}>
                <SectionLabel>Últimos {janelaDias} dias</SectionLabel>
                <Apoio style={{ fontSize: 15, lineHeight: 22 }}>
                    Nenhuma cobrança feita pelo app nos últimos {janelaDias} dias. O resultado
                    aparece aqui depois que você cobrar alguém.
                </Apoio>
            </Section>
        );
    }

    const pct = Math.round((efetividade.pagaram / efetividade.cobrados) * 100);
    const naoPagaram = efetividade.cobrados - efetividade.pagaram;

    return (
        <>
            <Section style={{ padding: theme.spacing.xl, gap: 16 }}
                accessibilityLabel={`Resultado dos últimos ${janelaDias} dias`}>
                <SectionLabel>Últimos {janelaDias} dias</SectionLabel>
                <View style={{ gap: 4 }}>
                    <HeroNumber adjustsFontSizeToFit numberOfLines={1} style={{ color: theme.colors.success }}>
                        {formatCurrency(efetividade.valor)}
                    </HeroNumber>
                    <Apoio style={{ fontSize: 14 }}>recuperados de quem foi cobrado</Apoio>
                </View>
                <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Apoio style={{ fontSize: 14, color: theme.colors.text }}>
                            {efetividade.pagaram} de {efetividade.cobrados} {efetividade.pagaram === 1 ? 'pagou' : 'pagaram'}
                        </Apoio>
                        <TextoForte style={{ fontSize: 14 }}>{pct}%</TextoForte>
                    </View>
                    <Barra alta><BarraCheia pct={pct} cor={theme.colors.success} /></Barra>
                </View>
                <Apoio>
                    Conta como pago quem registrou pagamento em até {prazoDias} dias depois da cobrança.
                </Apoio>
            </Section>

            {pagantes.length > 0 && (
                <View style={{ gap: 8 }}>
                    <SectionLabel>Pagaram depois da cobrança</SectionLabel>
                    <Section style={{ paddingVertical: 0 }}>
                        {pagantes.map((p, i) => (
                            <View key={p.chave}>
                                {i > 0 && <Divider />}
                                <Linha>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <NomeLinha numberOfLines={1}>{p.nome}</NomeLinha>
                                        <Apoio>{quando(p)}</Apoio>
                                    </View>
                                    <ValorLinha>{formatCurrency(p.valor)}</ValorLinha>
                                </Linha>
                            </View>
                        ))}
                    </Section>
                </View>
            )}

            {naoPagaram > 0 && (
                <Tracejado accessibilityLabel="Cobrados que ainda não pagaram">
                    <View style={{ flex: 1, gap: 2 }}>
                        <TextoForte>
                            {naoPagaram} {naoPagaram === 1 ? 'cobrança ainda sem pagamento' : 'cobranças ainda sem pagamento'}
                        </TextoForte>
                        <Apoio>Voltam para a fila {diasParaRecobrar} dias depois da cobrança</Apoio>
                    </View>
                    <BotaoSecundario style={{ minHeight: 44, borderRadius: 12 }} onPress={onVerFila}
                        accessibilityRole="button" accessibilityLabel="Ver fila de cobrança">
                        <BotaoSecundarioTexto style={{ fontSize: 14 }}>Ver fila</BotaoSecundarioTexto>
                    </BotaoSecundario>
                </Tracejado>
            )}
        </>
    );
}
