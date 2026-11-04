import { theme } from '@/src/styles/theme';
import React from 'react';
import styled from 'styled-components/native';
import { FolhaInferior } from './acesso';

/*
 * Política de privacidade em folha inferior (redesign: Cadastro e Mais).
 * Mesmo texto de site-gymapp/privacy.html: mudou lá, muda aqui.
 */

const SectionTitle = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 16px;
    color: ${theme.colors.text};
    padding-top: 16px;
    margin-top: 4px;
    margin-bottom: 8px;
    border-top-width: 1px;
    border-top-color: ${theme.colors.divider};
`;

const Paragraph = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 22px;
    color: ${theme.colors.textStrong};
    margin-bottom: 12px;
`;

const BulletPoint = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${theme.colors.textSecondary};
    margin-left: 12px;
    margin-bottom: 2px;
`;

const LastUpdate = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textMuted};
    margin-bottom: 16px;
`;

interface PrivacyPolicyModalProps {
    visible: boolean;
    onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
    return (
        <FolhaInferior visible={visible} onClose={onClose} titulo="Política de Privacidade">
            <LastUpdate>Em vigor desde 4 de novembro de 2026.</LastUpdate>

            <Paragraph>
                Em resumo: o GymApp guarda no servidor os dados da sua academia, dos seus alunos e da sua equipe para que o app funcione em qualquer aparelho. Esses dados são seus. Não vendemos, não alugamos e não usamos para publicidade.
            </Paragraph>

            <SectionTitle>Quem somos</SectionTitle>
            <Paragraph>
                O GymApp é um aplicativo da Kavicki.com, CNPJ 45.625.800/0001-36. Para qualquer assunto sobre privacidade, escreva para design@kavicki.com.
            </Paragraph>

            <SectionTitle>Dados da academia e de quem cadastra</SectionTitle>
            <BulletPoint>• E-mail e senha da conta (a senha é guardada cifrada)</BulletPoint>
            <BulletPoint>• Nome, CPF e data de nascimento do responsável</BulletPoint>
            <BulletPoint>• Nome, CNPJ, endereço, horário de funcionamento e logomarca da academia</BulletPoint>
            <BulletPoint>• Chave Pix e o texto da mensagem de cobrança, se você usar a aba Cobranças</BulletPoint>

            <SectionTitle>Dados que você cadastra sobre outras pessoas</SectionTitle>
            <Paragraph>Para gerir a academia, você pode cadastrar no app:</Paragraph>
            <BulletPoint>• Alunos: nome, e-mail, telefone, data de nascimento, peso, foto, plano, dia de vencimento, pagamentos e cobranças feitas</BulletPoint>
            <BulletPoint>• Colaboradores: nome, e-mail, telefone, data de nascimento, CPF, RG, foto, função, salário e dia de pagamento</BulletPoint>
            <BulletPoint>• Planos: nome, preço e serviços inclusos</BulletPoint>
            <Paragraph>
                Nesses casos, a academia é a controladora dos dados, nos termos da LGPD (Lei 13.709/2018), e o GymApp os trata em nome dela, só para que o app funcione. Cabe à academia informar alunos e colaboradores e ter base legal para cadastrá-los.
            </Paragraph>

            <SectionTitle>Onde os dados ficam</SectionTitle>
            <Paragraph>
                Os dados ficam num banco de dados na nuvem, com backup automático, operado pela Supabase. O acesso é protegido por login, e cada academia só enxerga os próprios dados. O app também guarda no celular a sessão ativa e algumas preferências.
            </Paragraph>

            <SectionTitle>Cobrança pelo WhatsApp e Pix</SectionTitle>
            <Paragraph>
                Quando você cobra um aluno, o app abre o WhatsApp do seu celular com a mensagem pronta, incluindo um link para a página com o Pix copia e cola gerado com a sua chave. O código vai na parte do link depois do #, que não é enviada ao nosso servidor; abrir a página gera só um acesso comum ao site. O envio é feito por você, pelo WhatsApp. O pagamento vai direto da conta do aluno para a sua: o GymApp não recebe nem movimenta esse dinheiro.
            </Paragraph>

            <SectionTitle>Assinatura da aba Cobranças</SectionTitle>
            <Paragraph>
                A assinatura é feita pela App Store (Apple) ou pelo Google Play. Os dados de pagamento ficam com a loja; nós recebemos só a confirmação de que a assinatura está ativa, por meio da RevenueCat, que faz essa verificação. Para quem assinou antes pelo site, com cartão ou Pix, o pagamento é processado pelo Mercado Pago, que guarda os dados do cartão. O GymApp não guarda número de cartão.
            </Paragraph>

            <SectionTitle>Notificações e fotos</SectionTitle>
            <Paragraph>
                Se você permitir, o app recebe notificações: mensalidades que vencem nos próximos dias, cobranças em aberto e, para quem paga a assinatura por Pix, o aviso de renovação. Para isso, o aparelho gera um identificador de notificação, guardado na sua conta e enviado pelo serviço de notificações da Expo. Fotos e logomarca são escolhidas na galeria só quando você toca para adicionar uma; o app não acessa a galeria por conta própria.
            </Paragraph>

            <SectionTitle>Este site</SectionTitle>
            <Paragraph>
                O site gymapp.kavicki.com usa o Microsoft Clarity para entender como as páginas são usadas (cliques e rolagem, de forma agregada). O app não usa ferramentas de publicidade.
            </Paragraph>

            <SectionTitle>Com quem compartilhamos</SectionTitle>
            <Paragraph>
                Só com os serviços citados acima (Supabase, Apple, Google, RevenueCat, Mercado Pago e Expo), na medida necessária para o app funcionar, ou quando a lei exigir. Não vendemos nem cedemos dados para marketing.
            </Paragraph>

            <SectionTitle>Por quanto tempo e como apagar</SectionTitle>
            <Paragraph>
                Os dados ficam guardados enquanto a conta existir. Você pode apagar alunos, colaboradores e planos a qualquer momento, e excluir a conta inteira no app: na aba Mais, toque no perfil da academia e em “Excluir minha conta”. A exclusão apaga a academia e tudo o que foi cadastrado nela, e não pode ser desfeita. Se preferir, peça a exclusão por e-mail.
            </Paragraph>

            <SectionTitle>Seus direitos</SectionTitle>
            <Paragraph>
                Você pode pedir acesso, correção, cópia ou exclusão dos seus dados, e tirar dúvidas sobre como são tratados, escrevendo para design@kavicki.com. Alunos e colaboradores cadastrados por uma academia devem falar primeiro com a academia, que é quem controla esses dados; se precisarem, também podem escrever para nós.
            </Paragraph>

            <SectionTitle>Crianças</SectionTitle>
            <Paragraph>
                O app é feito para donos e gestores de academia, não para crianças. Dados de alunos menores de idade só devem ser cadastrados com autorização dos responsáveis.
            </Paragraph>

            <SectionTitle>Mudanças nesta política</SectionTitle>
            <Paragraph>
                Quando esta política mudar, a data no topo é atualizada.
            </Paragraph>
        </FolhaInferior>
    );
};
