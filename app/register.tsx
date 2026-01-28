import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    Input,
    Title
} from '../src/components/styled';
import { theme } from '../src/styles/theme';
import { validateEmail, validatePassword } from '../src/utils/validations';

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 12px;
  padding-top: 50px;
  margin-bottom: 24px;
`;

const BackButton = styled(TouchableOpacity)`
  padding: 8px;
  margin-right: 12px;
`;

const HeaderTitle = styled(Title)`
  flex: 1;
  text-align: center;
  margin: 0;
  padding-right: 40px;
`;

const FormArea = styled.View`
    padding-top: 32px;
    padding-bottom: 16px;
    padding-horizontal: 12px;
`;

const ButtonContainer = styled.View`
    padding: 20px 12px;
    padding-bottom: 30px;
`;

const LoadingOverlay = styled.View`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${theme.colors.background};
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const LoadingText = styled.Text`
    color: ${theme.colors.text};
    font-size: ${theme.fontSize.md}px;
    margin-top: ${theme.spacing.md}px;
`;

const TermsModal = styled(Modal)``;

const TermsOverlay = styled.TouchableOpacity`
    flex: 1;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: flex-end;
`;

const TermsContainerView = styled.View`
    background-color: ${theme.colors.background};
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    padding: 24px;
    height: 80%;
`;

const TermsTitle = styled(Title)`
    font-size: 20px;
    margin-bottom: 16px;
    text-align: center;
`;

const TermsScroll = styled.ScrollView`
    flex: 1;
`;

const TermsText = styled.Text`
    color: ${theme.colors.text};
    font-size: 14px;
    line-height: 22px;
    margin-bottom: 20px;
`;

const CloseButton = styled(TouchableOpacity)`
    background-color: ${theme.colors.surface};
    padding: 12px;
    border-radius: 8px;
    align-items: center;
    margin-top: 10px;
`;

const CloseButtonText = styled.Text`
    color: ${theme.colors.text};
    font-weight: bold;
`;

export default function RegisterScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirm_password: '',
        phone: '',
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        if (!formData.name || !formData.email || !formData.password) {
            Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
            return false;
        }
        if (!validateEmail(formData.email)) {
            Alert.alert('Erro', 'Email inválido.');
            return false;
        }

        if (!validatePassword(formData.password)) {
            Alert.alert('Erro', 'A senha deve ter mais de 6 caracteres, incluir letras, números e um caractere especial.');
            return false;
        }

        if (formData.password !== formData.confirm_password) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            // Dynamic redirect URL: Expo Go (dev) vs Production build
            const redirectUrl = Constants.appOwnership === 'expo'
                ? Linking.createURL('confirm-email')
                : 'gymapp://confirm-email';

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        phone: formData.phone
                    },
                    emailRedirectTo: redirectUrl
                }
            });

            if (authError) {
                if (authError.message.includes("User already registered") || authError.message.includes("already registered")) {
                    Alert.alert('Conta Existente', 'Este email já possui cadastro. Tente fazer login.');
                } else {
                    throw authError;
                }
            } else {
                // Success
                router.replace('/confirm-email');
            }

        } catch (error: any) {
            Alert.alert('Erro no Cadastro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <HeaderContainer>
                        <BackButton onPress={() => router.back()}>
                            <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                        </BackButton>
                        <HeaderTitle>Criar Conta</HeaderTitle>
                    </HeaderContainer>

                    <FormArea>
                        <Text style={{ color: theme.colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                            Preencha seus dados para criar sua conta gratuita.
                        </Text>

                        <Input
                            placeholder="Nome Completo"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={formData.name} onChangeText={t => updateForm('name', t)}
                            style={{ marginBottom: 12 }}
                        />
                        <Input
                            placeholder="Email"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={formData.email} onChangeText={t => updateForm('email', t)}
                            keyboardType="email-address" autoCapitalize="none"
                            style={{ marginBottom: 12 }}
                        />
                        <Input
                            placeholder="Telefone (Opcional)"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={formData.phone} onChangeText={t => updateForm('phone', t)}
                            keyboardType="phone-pad"
                            style={{ marginBottom: 12 }}
                        />
                        <Input
                            placeholder="Senha"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={formData.password} onChangeText={t => updateForm('password', t)}
                            secureTextEntry
                            style={{ marginBottom: 12 }}
                        />
                        <Input
                            placeholder="Confirmar Senha"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={formData.confirm_password} onChangeText={t => updateForm('confirm_password', t)}
                            secureTextEntry
                            style={{ marginBottom: 12 }}
                        />
                    </FormArea>
                </ScrollView>

                <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                        Ao continuar, você concorda com nossos{' '}
                        <Text
                            style={{ color: theme.colors.primary, fontWeight: 'bold' }}
                            onPress={() => setShowTerms(true)}
                        >
                            Termos de Uso
                        </Text>.
                    </Text>
                </View>

                <ButtonContainer>
                    <Button onPress={handleRegister} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <ButtonText>Criar Conta</ButtonText>}
                    </Button>
                </ButtonContainer>
            </KeyboardAvoidingView>

            {loading && (
                <LoadingOverlay>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <LoadingText>Criando sua conta...</LoadingText>
                </LoadingOverlay>
            )}

            <TermsModal
                visible={showTerms}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTerms(false)}
            >
                <TermsOverlay activeOpacity={1} onPress={() => setShowTerms(false)}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <TermsContainerView>
                            <TermsTitle>Termos de Uso</TermsTitle>
                            <TermsScroll contentContainerStyle={{ paddingBottom: 20 }}>
                                <TermsText>
                                    Termos de Uso – gymapp{'\n'}
                                    Última atualização: 28 de Janeiro de 2026{'\n\n'}

                                    Bem-vindo ao gymapp. Ao utilizar nossa aplicação, você (usuário e/ou gestor de academia) concorda com os termos e condições abaixo descritos. O gymapp é uma plataforma de gestão administrativa para academias, desenvolvida para facilitar o controle de membros, colaboradores e infraestrutura.{'\n\n'}

                                    1. Aceitação dos Termos{'\n'}
                                    Ao realizar o cadastro e utilizar as funcionalidades do gymapp, você declara ter lido, compreendido e aceitado estes Termos de Uso. Caso não concorde com qualquer disposição, você não deve utilizar o aplicativo.{'\n\n'}

                                    2. Descrição dos Serviços{'\n'}
                                    O gymapp oferece funcionalidades de:{'\n\n'}

                                    Gestão de Perfis de Academia: Cadastro de CNPJ, endereço e horários de funcionamento.{'\n'}
                                    Gestão de Clientes: Armazenamento de dados como nome, e-mail, telefone, data de nascimento e métricas físicas (ex: peso).{'\n'}
                                    Controle de Planos: Criação e atribuição de planos de serviços e preços.{'\n'}
                                    Gestão de Funcionários: Registro de dados trabalhistas (CPF, RG, salário) e contato.{'\n'}
                                    Manutenção de Equipamentos: Controle de custos e intervalos de manutenção.{'\n\n'}

                                    3. Responsabilidades do Usuário{'\n'}
                                    Veracidade dos Dados: O usuário é o único responsável pela veracidade e precisão dos dados inseridos (de clientes, funcionários e da própria academia).{'\n'}
                                    Segurança da Conta: O acesso é realizado via autenticação segura. É de responsabilidade do usuário manter o sigilo de suas credenciais.{'\n'}
                                    Conformidade Legal: O usuário (gestor da academia) é o controlador dos dados de seus clientes e funcionários perante a LGPD (Lei Geral de Proteção de Dados), devendo garantir que possui base legal para processar tais informações.{'\n\n'}

                                    4. Propriedade Intelectual{'\n'}
                                    Todo o código-fonte, design, logotipos e marcas associadas ao gymapp (identificado como com.kavicki.com.gymapp) são de propriedade exclusiva da empresa desenvolvedora. É proibida a engenharia reversa, cópia ou distribuição não autorizada do software.{'\n\n'}

                                    5. Armazenamento de Conteúdo{'\n'}
                                    O aplicativo permite o upload de imagens (logotipos) em buckets de armazenamento específicos. O usuário declara possuir os direitos sobre qualquer imagem carregada e autoriza o gymapp a armazená-las para fins exclusivos de exibição na plataforma.{'\n\n'}

                                    6. Limitação de Responsabilidade{'\n'}
                                    Uso "Como Está": O gymapp é fornecido "como está", não garantindo que o software estará livre de erros ou interrupções.{'\n'}
                                    Decisões de Negócio: A empresa desenvolvedora não se responsabiliza por prejuízos financeiros, falhas em manutenções de equipamentos ou problemas contratuais entre a academia e seus clientes/funcionários resultantes do uso da ferramenta.{'\n'}
                                    Perda de Dados: Embora utilizemos serviços de nuvem de alta disponibilidade (Supabase), recomendamos que o usuário mantenha backups externos de suas informações críticas.{'\n\n'}

                                    7. Rescisão e Suspensão{'\n'}
                                    Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos, pratiquem atividades ilegais ou utilizem a plataforma de forma abusiva que comprometa a estabilidade do sistema.{'\n\n'}

                                    8. Alterações nos Termos{'\n'}
                                    Estes termos podem ser atualizados periodicamente para refletir novas funcionalidades ou mudanças legais. O uso continuado do aplicativo após as alterações constitui aceitação dos novos termos.{'\n\n'}

                                    9. Foro{'\n'}
                                    Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da empresa desenvolvedora para dirimir quaisquer controvérsias.
                                </TermsText>
                            </TermsScroll>
                            <CloseButton onPress={() => setShowTerms(false)}>
                                <CloseButtonText>Fechar</CloseButtonText>
                            </CloseButton>
                        </TermsContainerView>
                    </TouchableWithoutFeedback>
                </TermsOverlay>
            </TermsModal>
        </Container>
    );
}
