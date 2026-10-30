import { CenterModal } from '@/src/components/CenterModal';
import { theme } from '@/src/styles/theme';
import { formatCurrency } from '@/src/utils/masks';
import React from 'react';
import { View } from 'react-native';
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

// O cartão (fundo, borda, raio) vem do CenterModal; aqui só o recheio.
const Conteudo = styled.View`
    padding: 22px ${theme.spacing.xl}px 20px;
    gap: 10px;
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
    const meses = devedor?.mesesAbertos || [];
    const varios = meses.length > 1;

    return (
        <CenterModal visible={!!devedor} onClose={onFechar}>
                {devedor && (
                    <Conteudo accessibilityLabel="Registrar pagamento">
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
                    </Conteudo>
                )}
            
        </CenterModal>
    );
}
