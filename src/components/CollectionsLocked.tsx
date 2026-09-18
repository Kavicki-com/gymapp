import { PageContainer, PageHeader, PageTitle } from '@/src/components/styled';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, View } from 'react-native';
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
                            Faz parte de um plano pago, ativado individualmente. Para liberar na
                            sua academia, fale com quem te atende.
                        </Rodape>
                    </Cartao>
                    <View style={{ height: 32 }} />
                </Corpo>
            </ScrollView>
        </PageContainer>
    );
}
