import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

const ModalOverlay = styled.View`
    flex: 1;
    background-color: rgba(0, 0, 0, 0.7);
    justify-content: center;
    align-items: center;
    padding: 20px;
`;

const ModalContent = styled.View`
    background-color: ${theme.colors.surface};
    border-radius: ${theme.borderRadius.lg}px;
    max-height: 85%;
    width: 100%;
`;

const ModalHeader = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom-width: 1px;
    border-bottom-color: ${theme.colors.border};
`;

const ModalTitle = styled.Text`
    font-size: 18px;
    font-weight: bold;
    color: ${theme.colors.text};
`;

const CloseButton = styled(TouchableOpacity)`
    padding: 4px;
`;

const ContentScroll = styled(ScrollView)`
    padding: 20px;
`;

const SectionTitle = styled.Text`
    font-size: 16px;
    font-weight: bold;
    color: ${theme.colors.primary};
    margin-top: 16px;
    margin-bottom: 8px;
`;

const Paragraph = styled.Text`
    font-size: 14px;
    color: ${theme.colors.text};
    line-height: 22px;
    margin-bottom: 12px;
`;

const SubSection = styled.Text`
    font-size: 14px;
    font-weight: 600;
    color: ${theme.colors.text};
    margin-top: 8px;
    margin-bottom: 4px;
`;

const BulletPoint = styled.Text`
    font-size: 14px;
    color: ${theme.colors.textSecondary};
    line-height: 20px;
    margin-left: 12px;
`;

const LastUpdate = styled.Text`
    font-size: 12px;
    color: ${theme.colors.textSecondary};
    font-style: italic;
    margin-bottom: 16px;
`;

interface PrivacyPolicyModalProps {
    visible: boolean;
    onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <ModalOverlay>
                <ModalContent>
                    <ModalHeader>
                        <ModalTitle>Política de Privacidade</ModalTitle>
                        <CloseButton onPress={onClose}>
                            <FontAwesome name="times" size={24} color={theme.colors.textSecondary} />
                        </CloseButton>
                    </ModalHeader>

                    <ContentScroll showsVerticalScrollIndicator={true}>
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
                        <BulletPoint>• Informações sobre Modalidades (preços e serviços)</BulletPoint>
                        <BulletPoint>• Registro de custos de manutenção</BulletPoint>

                        <SectionTitle>2. Permissões do Dispositivo</SectionTitle>
                        <Paragraph>
                            Para fornecer certas funcionalidades, o Gymapp pode solicitar acesso a recursos do seu dispositivo móvel:
                        </Paragraph>
                        <BulletPoint>• Câmera e Galeria de Fotos: Para upload de logomarca e fotos de perfil.</BulletPoint>
                        <BulletPoint>• Armazenamento Local: Para preferências e sessão ativa.</BulletPoint>

                        <SectionTitle>3. Como Usamos Suas Informações</SectionTitle>
                        <BulletPoint>• Gerenciamento do Negócio: Cadastro e controle de alunos, funcionários e Modalidades.</BulletPoint>
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

                        <View style={{ height: 20 }} />
                    </ContentScroll>
                </ModalContent>
            </ModalOverlay>
        </Modal>
    );
};
