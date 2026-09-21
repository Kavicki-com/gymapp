import { PageContainer, PageHeader, PageTitle } from '@/src/components/styled';
import { PRECO_ASSINATURA_EXIBICAO, linkWhatsApp } from '@/src/config/contato';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Estado travado da aba Cobranças.
 *
 * NADA AQUI LEVA A UM CHECKOUT. O botão abre uma conversa no WhatsApp, e é do
 * atendimento que sai o endereço de contratação — fora do app, num canal que a
 * App Store não vê.
 *
 * A diferença importa. A 3.1.1 proíbe botão ou link que direcione a um
 * MECANISMO DE COMPRA; uma conversa não é mecanismo de compra. Um botão que
 * abrisse a página de assinatura seria, e sem a entitlement StoreKit External
 * Purchase Link (pedido à parte, URL no Info.plist, folha de aviso do sistema,
 * gate de storefront, relatório mensal, 15%) é rejeição provável.
 *
 * O que protege não é o destino sozinho, é a moldura — por isso, de propósito:
 *
 *   - o rótulo fala em ATIVAR, não em assinar. Ativação é liberar recurso numa
 *     conta; assinar é pagar;
 *   - o ícone é o do WhatsApp, não o de link externo;
 *   - a mensagem pré-preenchida não diz "assinar", "pagar" nem o valor. Ela
 *     aparece montada na tela do WhatsApp, então o revisor a lê sem enviar;
 *   - o preço fica no rodapé, como texto estático. Descrever preço é de graça,
 *     e é o que sustenta a leitura de serviço multiplataforma (3.1.3(b)):
 *     contratado fora, apenas refletido aqui dentro;
 *   - o endereço do checkout não aparece em lugar nenhum desta tela, nem no
 *     Alert de erro.
 *
 * Decisão do Kavicki em 21/09/2026, substituindo o botão que ia direto ao
 * checkout. Se ainda assim a Apple reclamar, a volta atrás é trocar o
 * TouchableOpacity por <Texto> com o número escrito — o resto já está conforme.
 *
 * Ver a memória gymapp-regras-apple-brasil.
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

const NotaExterna = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 13px;
    line-height: 19px;
    text-align: center;
    margin-top: 10px;
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
                            {PRECO_ASSINATURA_EXIBICAO}, por academia. Cancele quando quiser.
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

                        <NotaExterna>
                            A ativação é feita pelo nosso atendimento, fora do aplicativo.
                        </NotaExterna>

                    </Cartao>
                    <View style={{ height: 32 }} />
                </Corpo>
            </ScrollView>
        </PageContainer>
    );
}
