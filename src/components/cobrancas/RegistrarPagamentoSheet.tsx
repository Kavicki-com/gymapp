import { BottomSheet } from '@/src/components/BottomSheet';
import { theme } from '@/src/styles/theme';
import { formatCurrency } from '@/src/utils/masks';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import {
    Apoio, BotaoPrincipal, BotaoPrincipalTexto, BotaoSecundario, BotaoSecundarioTexto, BotaoTexto,
    BotaoTextoRotulo, Devedor,
} from './comum';

/**
 * Folha "Registrar pagamento" (Claude Design, CobrancasLista). Substitui o
 * Alert de antes com as mesmas opções: com um mês só, registra aquele mês;
 * com vários, escolhe entre o primeiro mês e o total. A cobrança sai pelo
 * total, então sem a opção de quitar tudo o dono teria que dar baixa mês a mês.
 */

const Folha = styled.View`
    background-color: ${theme.colors.surface};
    border-top-width: 1px;
    border-color: ${theme.colors.border};
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 12px ${theme.spacing.xl}px;
    gap: 10px;
`;

const Alca = styled.View`
    align-self: center;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background-color: #3A3F45;
    margin-bottom: 8px;
`;

const TituloFolha = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 20px;
    color: ${theme.colors.text};
`;

export function RegistrarPagamentoSheet({ devedor, onEscolher, onFechar }: {
    devedor: Devedor | null;
    onEscolher: (meses: string[]) => void;
    onFechar: () => void;
}) {
    const insets = useSafeAreaInsets();
    const meses = devedor?.mesesAbertos || [];
    const varios = meses.length > 1;

    return (
        <BottomSheet visible={!!devedor} onClose={onFechar}>
                {devedor && (
                    <Folha style={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
                        accessibilityViewIsModal accessibilityLabel="Registrar pagamento">
                        <Alca />
                        <TituloFolha>Registrar pagamento</TituloFolha>
                        <Apoio style={{ fontSize: 14, lineHeight: 21, marginBottom: 6 }}>
                            {devedor.nome} ·{' '}
                            {varios
                                ? `${meses.length} meses em aberto · ${meses.join(', ')}`
                                : `${formatCurrency(devedor.valorPlano)} · ref. ${meses[0]} · hoje`}
                        </Apoio>

                        {varios ? (
                            <>
                                <BotaoSecundario style={{ minHeight: 52, backgroundColor: theme.colors.elevated }}
                                    onPress={() => onEscolher([meses[0]])} accessibilityRole="button"
                                    accessibilityLabel={`Registrar só ${meses[0]}, ${formatCurrency(devedor.valorPlano)}`}>
                                    <BotaoSecundarioTexto>Só {meses[0]} · {formatCurrency(devedor.valorPlano)}</BotaoSecundarioTexto>
                                </BotaoSecundario>
                                <BotaoPrincipal onPress={() => onEscolher(meses)} accessibilityRole="button"
                                    accessibilityLabel={`Registrar o total, ${formatCurrency(devedor.total)}`}>
                                    <BotaoPrincipalTexto>Total · {formatCurrency(devedor.total)}</BotaoPrincipalTexto>
                                </BotaoPrincipal>
                            </>
                        ) : (
                            <BotaoPrincipal onPress={() => onEscolher(meses)} accessibilityRole="button"
                                accessibilityLabel="Registrar">
                                <BotaoPrincipalTexto>Registrar</BotaoPrincipalTexto>
                            </BotaoPrincipal>
                        )}

                        <BotaoTexto style={{ minHeight: 48 }} onPress={onFechar} accessibilityRole="button" accessibilityLabel="Cancelar">
                            <BotaoTextoRotulo style={{ fontSize: 15 }}>Cancelar</BotaoTextoRotulo>
                        </BotaoTexto>
                    </Folha>
                )}
            
        </BottomSheet>
    );
}
