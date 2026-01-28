import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { Button, ButtonText, Container, Title } from '../src/components/styled';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

const Content = styled.View`
    flex: 1;
    justify-content: center;
    align-items: center;
    padding: ${theme.spacing.xl}px;
`;

const IconContainer = styled.View`
    margin-bottom: ${theme.spacing.xl}px;
    width: 120px;
    height: 120px;
    border-radius: 60px;
    background-color: ${theme.colors.surface};
    justify-content: center;
    align-items: center;
    border-width: 2px;
    border-color: ${theme.colors.success};
`;

const Message = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: ${theme.fontSize.md}px;
    text-align: center;
    margin-bottom: ${theme.spacing.xl}px;
    line-height: 24px;
`;

const CountdownText = styled.Text`
    color: ${theme.colors.primary};
    font-size: ${theme.fontSize.xl}px;
    font-weight: bold;
    margin-vertical: ${theme.spacing.md}px;
`;

const ErrorContainer = styled.View`
    background-color: ${theme.colors.danger}20;
    padding: ${theme.spacing.md}px;
    border-radius: 8px;
    margin-bottom: ${theme.spacing.lg}px;
`;

const ErrorText = styled.Text`
    color: ${theme.colors.danger};
    font-size: ${theme.fontSize.sm}px;
    text-align: center;
`;

export default function ConfirmEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [countdown, setCountdown] = useState(5);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        verifyEmail();
    }, []);

    useEffect(() => {
        if (confirmed && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (confirmed && countdown === 0) {
            performAutoLogin();
        }
    }, [countdown, confirmed]);

    const verifyEmail = async () => {
        try {
            setLoading(true);

            // Verificar se há tokens na URL (acesso via link de email)
            // Params do expo-router captura parâmetros da URL e fragment
            const hasTokenInUrl = params.access_token || params.token_hash || params.type === 'recovery';

            if (hasTokenInUrl) {
                // Modo: Confirmação via link de email
                // O Supabase processa automaticamente os tokens da URL quando detectSessionInUrl: true
                // Aguardar um pouco para garantir que o processamento terminou
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verificar se há uma sessão ativa após o processamento
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                if (session) {
                    // Email confirmado com sucesso - sessão ativa
                    setConfirmed(true);
                    setLoading(false);
                } else {
                    // Nenhuma sessão encontrada - pode ser token inválido ou expirado
                    throw new Error('Não foi possível confirmar o email. O link pode ter expirado ou já foi usado.');
                }
            } else {
                // Modo: Acesso direto após cadastro (sem token na URL)
                // Verificar se há uma sessão ativa (usuário acabou de se cadastrar)
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Usuário logado - mostrar tela de confirmação de conta
                    setConfirmed(true);
                    setLoading(false);
                } else {
                    // Sem sessão - redirecionar para login
                    router.replace('/');
                }
            }
        } catch (err: any) {
            console.error('Email verification error:', err);
            setError(err.message || 'Erro ao confirmar email.');
            setLoading(false);
        }
    };

    const performAutoLogin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/');
                return;
            }

            // Usuário está logado, redirecionar para onboarding (configuração da academia)
            router.replace('/onboarding');
        } catch (err) {
            console.error('Auto-login error:', err);
            router.replace('/');
        }
    };

    const handleManualLogin = () => {
        router.replace('/');
    };

    if (loading) {
        return (
            <Container>
                <Content>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Message style={{ marginTop: 20 }}>Confirmando seu email...</Message>
                </Content>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Content>
                    <IconContainer style={{ borderColor: theme.colors.danger }}>
                        <FontAwesome name="times" size={50} color={theme.colors.danger} />
                    </IconContainer>

                    <Title>Erro na Confirmação</Title>

                    <ErrorContainer>
                        <ErrorText>{error}</ErrorText>
                    </ErrorContainer>

                    <View style={{ width: '100%', maxWidth: 300 }}>
                        <Button onPress={handleManualLogin}>
                            <ButtonText>Ir para o Login</ButtonText>
                        </Button>
                    </View>
                </Content>
            </Container>
        );
    }

    return (
        <Container>
            <Content>
                <IconContainer>
                    <FontAwesome name="check" size={50} color={theme.colors.success} />
                </IconContainer>

                <Title>Cadastro Realizado!</Title>

                <Message style={{ marginTop: 24 }}>
                    Você será redirecionado para a configuração da academia em:
                </Message>

                <CountdownText>{countdown}s</CountdownText>

                <View style={{ width: '100%', maxWidth: 300 }}>
                    <Button onPress={performAutoLogin}>
                        <ButtonText>Entrar Agora</ButtonText>
                    </Button>
                </View>
            </Content>
        </Container>
    );
}
