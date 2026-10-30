import { appAlert } from '@/src/components/AppAlert';
import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    BotaoPrincipal,
    BotaoVoltar,
    Cabecalho,
    Campo,
    Dica,
    Formulario,
    FolhaInferior,
    Rodape,
    Subtitulo,
    TelaAcesso,
    TextoRodape,
    Titulo,
} from '../src/components/acesso';
import { PASSWORD_RULE, PasswordInput } from '../src/components/PasswordInput';
import { PrivacyPolicyModal } from '../src/components/PrivacyPolicyModal';
import { Container, HighlightText, Input } from '../src/components/styled';
import { theme } from '../src/styles/theme';
import { validateEmail, validatePassword } from '../src/utils/validations';

/* Layout do redesign (Claude Design, "Criar conta"). Validação, signUp e
   navegação são os mesmos de antes; só a apresentação mudou. */

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
    font-family: ${theme.fonts.regular};
    color: ${theme.colors.textSecondary};
    font-size: 14px;
    margin-top: ${theme.spacing.md}px;
`;

const TextoAceite = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${theme.colors.textSecondary};
`;

const TermsText = styled.Text`
    font-family: ${theme.fonts.regular};
    color: ${theme.colors.textStrong};
    font-size: 14px;
    line-height: 22px;
    margin-bottom: 8px;
`;

/**
 * Força da senha para a barrinha de 4 segmentos: um por critério da mesma
 * regra de validatePassword (tamanho, letra, número, caractere especial).
 * Só indica; quem decide continua sendo validatePassword.
 */
const forcaDaSenha = (senha: string) =>
    [
        senha.length > 6,
        /[a-zA-Z]/.test(senha),
        /\d/.test(senha),
        /[!@#$%^&*(),.?":{}|<>]/.test(senha),
    ].filter(Boolean).length;

export default function RegisterScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);

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
            appAlert('Erro', 'Preencha todos os campos obrigatórios.');
            return false;
        }
        if (!validateEmail(formData.email)) {
            appAlert('Erro', 'Email inválido.');
            return false;
        }

        if (!validatePassword(formData.password)) {
            appAlert('Senha fraca', PASSWORD_RULE);
            return false;
        }

        if (formData.password !== formData.confirm_password) {
            appAlert('Erro', 'As senhas não coincidem.');
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
                    appAlert('Conta Existente', 'Este email já possui cadastro. Tente fazer login.');
                } else {
                    throw authError;
                }
            } else {
                // Success
                router.replace('/confirm-email');
            }

        } catch (error: any) {
            appAlert('Erro no Cadastro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const forca = forcaDaSenha(formData.password);

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <TelaAcesso>
                <View style={{ flexDirection: 'row' }}>
                    <BotaoVoltar onPress={() => router.back()} rotulo="Voltar para Entrar" />
                </View>

                <Cabecalho>
                    <Titulo accessibilityRole="header">Criar conta</Titulo>
                    <Subtitulo>Primeiro você. Os dados da academia vêm no próximo passo.</Subtitulo>
                </Cabecalho>

                <Formulario>
                    <Campo rotulo="Seu nome">
                        <Input
                            placeholder="Nome completo"
                            value={formData.name} onChangeText={t => updateForm('name', t)}
                            autoComplete="name"
                            textContentType="name"
                        />
                    </Campo>
                    <Campo rotulo="E-mail">
                        <Input
                            placeholder="voce@academia.com.br"
                            value={formData.email} onChangeText={t => updateForm('email', t)}
                            keyboardType="email-address" autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                        />
                    </Campo>
                    <Campo
                        rotulo="WhatsApp"
                        opcional
                        icone={<FontAwesome name="whatsapp" size={14} color={theme.colors.whatsapp} />}
                    >
                        <Input
                            placeholder="(21) 90000-0000"
                            value={formData.phone} onChangeText={t => updateForm('phone', t)}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                        />
                    </Campo>
                    <Campo rotulo="Senha">
                        <PasswordInput
                            placeholder="Crie uma senha"
                            value={formData.password} onChangeText={t => updateForm('password', t)}
                            autoComplete="new-password"
                            textContentType="newPassword"
                        />
                        <View
                            style={{ flexDirection: 'row', gap: 4 }}
                            accessible
                            accessibilityLabel={`Força da senha: ${forca} de 4`}
                        >
                            {[0, 1, 2, 3].map(i => (
                                <View
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: i < forca ? theme.colors.primary : theme.colors.border,
                                    }}
                                />
                            ))}
                        </View>
                        <Dica>{PASSWORD_RULE}</Dica>
                    </Campo>
                    <Campo rotulo="Confirmar senha">
                        <PasswordInput
                            placeholder="Repita a senha"
                            value={formData.confirm_password} onChangeText={t => updateForm('confirm_password', t)}
                            autoComplete="new-password"
                            textContentType="newPassword"
                        />
                    </Campo>

                    <TextoAceite>
                        Ao continuar, você concorda com nossos{' '}
                        <HighlightText onPress={() => setShowTerms(true)} accessibilityRole="link">
                            Termos de Uso
                        </HighlightText>
                        {' '}e a{' '}
                        <HighlightText onPress={() => setShowPolicy(true)} accessibilityRole="link">
                            Política de Privacidade
                        </HighlightText>.
                    </TextoAceite>

                    <BotaoPrincipal titulo="Criar conta" onPress={handleRegister} carregando={loading} />
                </Formulario>

                <Rodape>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        accessibilityRole="link"
                        style={{ minHeight: theme.touch, justifyContent: 'center' }}
                    >
                        <TextoRodape>
                            Já tem conta? <HighlightText>Entrar</HighlightText>
                        </TextoRodape>
                    </TouchableOpacity>
                </Rodape>
            </TelaAcesso>

            {loading && (
                <LoadingOverlay>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <LoadingText>Criando sua conta...</LoadingText>
                </LoadingOverlay>
            )}

            <FolhaInferior visible={showTerms} onClose={() => setShowTerms(false)} titulo="Termos de Uso">
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
            </FolhaInferior>

            <PrivacyPolicyModal visible={showPolicy} onClose={() => setShowPolicy(false)} />
        </Container>
    );
}
