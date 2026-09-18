import { PageContainer, PageHeader, PageTitle } from '@/src/components/styled';
import { linkWhatsApp } from '@/src/config/contato';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Estado travado da aba Cobranças.
 *
 * TUDO AQUI É TEXTO ESTÁTICO, DE PROPÓSITO. Nenhum botão, nenhum link, nada
 * tocável que leve a pagamento.
 *
 * Desde 2026 a App Store do Brasil permite direcionar para pagamento fora do
 * app, e texto estático sem link clicável tem comissão ZERO. Um botão ou link
 * cairia em 15% e passaria a exigir a entitlement StoreKit External Purchases,
 * folha de aviso, relatório mensal — e apresentar o IAP da Apple com igual
 * destaque, o que obrigaria a construir o IAP junto.
 *
 * Ou seja: descrever aqui é de graça; qualquer coisa tocável fica cara.
 * Ver a memória gymapp-regras-apple-brasil.
 *
 * RESSALVA, a pedido do Kavicki em 18/09/2026: o botão de WhatsApp abaixo É
 * tocável e diz "para ativar". Isso é uma chamada para compra, e portanto sai
 * da faixa de 0%. Foi decisão consciente dele, ciente do risco de rejeição na
 * revisão. Se a Apple reclamar, a volta atrás é trocar o TouchableOpacity por
 * <Texto> com o número escrito — o resto da tela já está conforme.
 */

const Corpo = styled.View`
    padding: 0 ${theme.spacing.lg}px;
`;

const Cartao = styled.View`
    background-color: ${theme.colors.surface};
    border-radius: 14px;
    padding: ${theme.spacing.lg}px;
`;

const Titulo = styled.Text`
    color: ${theme.colors.text};
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 6px;
`;

const Texto = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 15px;
    line-height: 22px;
`;

const ItemLinha = styled.View`
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    margin-top: 14px;
`;

const ItemTexto = styled.Text`
    color: ${theme.colors.text};
    font-size: 15px;
    line-height: 21px;
    flex: 1;
`;

const BotaoContato = styled(TouchableOpacity)`
    background-color: #25D366;
    border-radius: 10px;
    padding: 13px;
    margin-top: ${theme.spacing.md}px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
`;

const BotaoContatoTexto = styled.Text`
    color: ${theme.colors.background};
    font-weight: bold;
    font-size: 15px;
`;

const Rodape = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 14px;
    line-height: 21px;
    margin-top: ${theme.spacing.lg}px;
    padding-top: ${theme.spacing.md}px;
    border-top-width: 1px;
    border-top-color: ${theme.colors.border};
`;

const itens = [
    'A lista de quem está devendo de verdade — sem contar cadastro antigo que nunca foi usado nem aluno que já saiu.',
    'Cobrança por WhatsApp em sequência: um aluno por vez, sem procurar na lista.',
    'O registro de quem você já cobrou e há quantos dias.',
    'Baixa do pagamento na própria tela, em um toque.',
    'Quantos pagaram depois de serem cobrados, e quanto isso recuperou.',
];

export function CollectionsLocked() {
    return (
        <PageContainer>
            <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>
            <ScrollView>
                <Corpo>
                    <Cartao>
                        <Titulo>Ainda não está ativo na sua conta</Titulo>
                        <Texto>
                            Cobranças é a ferramenta para receber de quem está atrasado, sem
                            planilha e sem perder quem você já lembrou.
                        </Texto>

                        {itens.map(t => (
                            <ItemLinha key={t}>
                                <FontAwesome
                                    name="check"
                                    size={14}
                                    color={theme.colors.primary}
                                    style={{ marginTop: 4 }}
                                />
                                <ItemTexto>{t}</ItemTexto>
                            </ItemLinha>
                        ))}

                        <Rodape>
                            Faz parte de um plano pago, ativado individualmente na sua academia.
                        </Rodape>

                        <BotaoContato
                            onPress={() => {
                                Linking.openURL(linkWhatsApp(
                                    'Olá! Quero ativar a Cobranças na minha academia.'
                                )).catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'));
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Falar no WhatsApp para ativar a Cobranças"
                        >
                            <FontAwesome name="whatsapp" size={18} color={theme.colors.background} />
                            <BotaoContatoTexto>Ativar pelo WhatsApp</BotaoContatoTexto>
                        </BotaoContato>

                    </Cartao>
                    <View style={{ height: 32 }} />
                </Corpo>
            </ScrollView>
        </PageContainer>
    );
}
