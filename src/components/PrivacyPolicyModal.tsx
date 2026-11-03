import { theme } from '@/src/styles/theme';
import React from 'react';
import styled from 'styled-components/native';
import { FolhaInferior } from './acesso';

/*
 * Política de privacidade em folha inferior (redesign: Cadastro e Mais).
 * O texto é o mesmo de antes; só a apresentação mudou.
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

const SubSection = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${theme.colors.text};
    margin-top: 8px;
    margin-bottom: 4px;
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
            <LastUpdate>Última atualização: 15 de janeiro de 2026</LastUpdate>

            <Paragraph>
                O Gymapp ("nós", "nosso" ou "aplicativo") compromete-se a proteger a sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e compartilhamos suas informações ao utilizar nosso aplicativo de gestão de academias.
            </Paragraph>

            <Paragraph>
                Ao utilizar o Gymapp, você concorda com a coleta e uso de informações de acordo com esta política.
            </Paragraph>

            <SectionTitle>1. Informações que Coletamos</SectionTitle>
            <Paragraph>
                Para o funcionamento adequado da gestão da academia, o aplicativo coleta os seguintes tipos de dados:
            </Paragraph>

            <SubSection>1.1. Dados do Proprietário e da Academia</SubSection>
            <BulletPoint>• Nome da Academia e Endereço</BulletPoint>
            <BulletPoint>• CNPJ e CPF do proprietário</BulletPoint>
            <BulletPoint>• Data de nascimento do proprietário</BulletPoint>
            <BulletPoint>• Logomarca da academia (Imagem)</BulletPoint>

            <SubSection>1.2. Dados de Clientes (Alunos)</SubSection>
            <BulletPoint>• Nome completo e Email</BulletPoint>
            <BulletPoint>• Telefone e Data de nascimento</BulletPoint>
            <BulletPoint>• Dados físicos (Peso) para acompanhamento</BulletPoint>
            <BulletPoint>• Dia de vencimento de pagamentos</BulletPoint>

            <SubSection>1.3. Dados de Funcionários</SubSection>
            <BulletPoint>• Nome completo e Email</BulletPoint>
            <BulletPoint>• Telefone e Data de nascimento</BulletPoint>
            <BulletPoint>• Documentos: CPF e RG</BulletPoint>
            <BulletPoint>• Informações financeiras: Salário</BulletPoint>

            <SubSection>1.4. Dados Financeiros e Modalides</SubSection>
            <BulletPoint>• Informações sobre Planos (preços e serviços)</BulletPoint>
            <BulletPoint>• Registro de custos de manutenção</BulletPoint>

            <SectionTitle>2. Permissões do Dispositivo</SectionTitle>
            <Paragraph>
                Para fornecer certas funcionalidades, o Gymapp pode solicitar acesso a recursos do seu dispositivo móvel:
            </Paragraph>
            <BulletPoint>• Galeria de Fotos: Para upload de logomarca e fotos de perfil.</BulletPoint>
            <BulletPoint>• Armazenamento Local: Para preferências e sessão ativa.</BulletPoint>

            <SectionTitle>3. Como Usamos Suas Informações</SectionTitle>
            <BulletPoint>• Gerenciamento do Negócio: Cadastro e controle de alunos, funcionários e Planos.</BulletPoint>
            <BulletPoint>• Identificação: Vincular dados ao usuário autenticado.</BulletPoint>
            <BulletPoint>• Personalização: Exibir informações específicas da sua academia.</BulletPoint>

            <SectionTitle>4. Armazenamento e Compartilhamento</SectionTitle>
            <Paragraph>
                O Gymapp utiliza o Supabase como plataforma de backend para autenticação, banco de dados e armazenamento de arquivos.
            </Paragraph>
            <Paragraph>
                Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.
            </Paragraph>

            <SectionTitle>5. Segurança dos Dados</SectionTitle>
            <BulletPoint>• Autenticação: Acesso protegido via autenticação de usuário.</BulletPoint>
            <BulletPoint>• Row Level Security (RLS): Usuários só acessam seus próprios dados.</BulletPoint>

            <SectionTitle>6. Exclusão de Dados e Seus Direitos</SectionTitle>
            <Paragraph>
                Você tem o direito de solicitar a exclusão de sua conta e de todos os dados associados. Para solicitar a exclusão, entre em contato conosco através do suporte.
            </Paragraph>

            <SectionTitle>7. Alterações nesta Política</SectionTitle>
            <Paragraph>
                Podemos atualizar nossa Política de Privacidade periodicamente. As alterações entram em vigor imediatamente após serem publicadas.
            </Paragraph>

            <SectionTitle>8. Contato</SectionTitle>
            <Paragraph>
                Se você tiver dúvidas sobre esta Política de Privacidade:
            </Paragraph>
            <BulletPoint>• Desenvolvedor: Kavicki.com</BulletPoint>
            <BulletPoint>• E-mail: design@kavicki.com</BulletPoint>
        </FolhaInferior>
    );
};
