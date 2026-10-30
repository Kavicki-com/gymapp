import { Icon } from '@/src/components/Icon';
import { theme } from '@/src/styles/theme';
import { formatCurrency } from '@/src/utils/masks';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import { Apoio, Devedor, IconeWhatsApp, mesesRotulo, rotuloUltimaCobranca } from './comum';

/** Linha da vista "Lista" (Claude Design, CobrancasLista). */

const Cartao = styled.View`
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: 18px;
    padding: 14px ${theme.spacing.lg}px;
    gap: ${theme.spacing.md}px;
`;

const Nome = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 16px;
    color: ${theme.colors.text};
`;

const Marca = styled.Text<{ cor: string }>`
    font-family: ${theme.fonts.semibold};
    font-size: 12px;
    color: ${({ cor }) => cor};
`;

const Valor = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 18px;
    color: ${theme.colors.danger};
`;

const Acao = styled(TouchableOpacity)<{ bg: string }>`
    flex: 1;
    min-height: ${theme.touch}px;
    border-radius: 12px;
    background-color: ${({ bg }) => bg};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 10px;
`;

const AcaoTexto = styled.Text<{ cor: string }>`
    font-family: ${theme.fonts.bold};
    font-size: 14px;
    color: ${({ cor }) => cor};
`;

const Alerta = styled.View`
    padding: 10px 12px;
    border-radius: 10px;
    background-color: ${theme.colors.dangerSoft};
`;

const AlertaTexto = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    line-height: 19px;
    color: ${theme.colors.dangerText};
`;

export function LinhaDevedor({
    item, recente, lancando, semTelefone, onAbrir, onCobrar, onRegistrar,
}: {
    item: Devedor;
    /** Cobrado há menos de DIAS_PARA_RECOBRAR — vai para o fim e perde destaque. */
    recente: boolean;
    lancando: boolean;
    semTelefone: boolean;
    onAbrir: () => void;
    onCobrar: () => void;
    onRegistrar: () => void;
}) {
    const corMarca = recente
        ? theme.colors.textMuted
        : item.diasDesdeCobranca === null ? theme.colors.primary : theme.colors.textSecondary;

    return (
        <Cartao>
            <TouchableOpacity onPress={onAbrir} accessibilityRole="button"
                accessibilityLabel={`Abrir ficha de ${item.nome}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, gap: 3 }}>
                    <Nome>{item.nome}</Nome>
                    <Apoio>{mesesRotulo(item.meses)} · {item.mesesAbertos.join(', ')}</Apoio>
                    <Marca cor={corMarca}>{rotuloUltimaCobranca(item.diasDesdeCobranca)}</Marca>
                </View>
                <Valor>{formatCurrency(item.total)}</Valor>
            </TouchableOpacity>

            {semTelefone && (
                <Alerta accessibilityRole="alert">
                    <AlertaTexto>
                        {item.nome} não tem telefone cadastrado.{' '}
                        <Text onPress={onAbrir} accessibilityRole="link"
                            style={{ fontFamily: theme.fonts.semibold, textDecorationLine: 'underline' }}>
                            Abrir ficha
                        </Text>
                    </AlertaTexto>
                </Alerta>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Acao bg={theme.colors.whatsapp} onPress={onCobrar}
                    accessibilityRole="button" accessibilityLabel={`Cobrar ${item.nome} pelo WhatsApp`}>
                    <IconeWhatsApp size={16} color={theme.colors.background} />
                    <AcaoTexto cor={theme.colors.background}>Cobrar</AcaoTexto>
                </Acao>
                <Acao bg={theme.colors.primary} onPress={onRegistrar} disabled={lancando}
                    accessibilityRole="button" accessibilityLabel={`Registrar pagamento de ${item.nome}`}>
                    {lancando ? (
                        <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                    ) : (
                        <>
                            <Icon name="check" size={16} strokeWidth={2.4} color={theme.colors.onPrimary} />
                            {/* Com vários meses em aberto o rótulo não pode prometer
                                um valor: o toque abre a escolha entre o mês e o total. */}
                            <AcaoTexto cor={theme.colors.onPrimary} numberOfLines={1}>
                                {item.meses === 1 ? `Registrar ${formatCurrency(item.valorPlano)}` : 'Registrar'}
                            </AcaoTexto>
                        </>
                    )}
                </Acao>
            </View>
        </Cartao>
    );
}
