import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { Button, ButtonText, Container, Title } from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
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
    const { session } = useAuth();
    const params = useLocalSearchParams();
    const [countdown, setCountdown] = useState(5);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    // Initial check for tokens in URL
    useEffect(() => {
        const hasTokenInUrl = params.access_token || params.token_hash || params.type === 'signup' || params.type === 'invite';
        console.log('ConfirmEmail: Initial check - params:', Object.keys(params).join(', '), 'hasToken:', hasTokenInUrl);

        if (!hasTokenInUrl) {
            // If no token, we might already have a session if user just signed up
            if (session) {
                console.log('ConfirmEmail: No token but session exists, confirming...');
                setConfirmed(true);
                setLoading(false);
            } else {
                // Wait a bit longer for session to appear on cold starts
                const timer = setTimeout(() => {
                    if (!session && !confirmed) {
                        console.log('ConfirmEmail: No token and no session after 10s wait, redirecting to login');
                        router.replace('/');
                    }
                }, 10000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    // Reactive check based on session
    useEffect(() => {
        if (session && !confirmed) {
            console.log('ConfirmEmail: Session detected, marking as confirmed');
            setConfirmed(true);
            setLoading(false);
            setError(null);
        }
    }, [session]);

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

    const performAutoLogin = async () => {
        try {
            console.log('ConfirmEmail: Performing redirect to onboarding...');
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
