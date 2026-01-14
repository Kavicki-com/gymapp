import { useIsFocused } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Card,
    CenteredContainer,
    FormGroup,
    HighlightText,
    Input,
    Label,
    LinkText,
    Title
} from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

const FooterLink = styled(TouchableOpacity)`
  margin-top: ${theme.spacing.lg}px;
`;

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, session, loading: authLoading } = useAuth();
    const router = useRouter();
    const isFocused = useIsFocused();

    const [isChecking, setIsChecking] = useState(false);

    React.useEffect(() => {
        if (session && isFocused) {
            checkSession();
        }
    }, [session, isFocused]);

    const checkSession = async () => {
        if (isChecking || !isFocused) return;
        setIsChecking(true);

        try {
            // 1. Verify if session is valid on server
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                // Session is stale or user deleted
                await supabase.auth.signOut();
                return;
            }

            // 2. Check if user has a profile
            const { data: profile, error } = await supabase
                .from('gym_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (profile) {
                // router.replace works, but ensure we are not already navigating
                router.replace('/(drawer)/(tabs)');
            } else {
                // Valid user but no profile (incomplete from previous attempt)
                // Only redirect if we definitely have a valid user
                Alert.alert(
                    'Perfil Incompleto',
                    'Sua conta não possui um perfil de academia associado. Se os dados foram perdidos, vá em "Cadastre-se" e preencha o formulário novamente com seu email e senha atuais para recriar o perfil.',
                    [{ text: 'OK', onPress: () => supabase.auth.signOut() }]
                );
            }
        } catch (error) {
            console.error('Session check error:', error);
            // If error, stay on login
            await supabase.auth.signOut();
        } finally {
            setIsChecking(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }
        setLoading(true);
        const { error } = await signIn(email, password);

        if (error) {
            setLoading(false);
            Alert.alert('Erro no Login', error.message);
        } else {
            // Check for profile immediately to decide navigation
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('gym_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                setLoading(false);
                if (profile) {
                    router.replace('/(drawer)/(tabs)');
                } else {
                    Alert.alert(
                        'Perfil Incompleto',
                        'Sua conta não possui um perfil de academia associado. Se os dados foram perdidos, vá em "Cadastre-se" e preencha o formulário novamente com seu email e senha atuais para recriar o perfil.',
                        [{ text: 'OK', onPress: () => supabase.auth.signOut() }]
                    );
                }
            } else {
                setLoading(false);
            }
        }
    };

    if (authLoading || session) {
        return (
            <CenteredContainer>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </CenteredContainer>
        );
    }

    return (
        <CenteredContainer>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%', justifyContent: 'center' }}
            >
                <Card>
                    <Title>Acesso do Administrador</Title>

                    <FormGroup>
                        <Label>Email</Label>
                        <Input
                            placeholder="admin@gym.com"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Senha</Label>
                        <Input
                            placeholder="admin123"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </FormGroup>

                    <Button onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#111827" />
                        ) : (
                            <ButtonText>Entrar</ButtonText>
                        )}
                    </Button>

                    <FooterLink onPress={() => router.push('/register')}>
                        <LinkText>
                            Não tem uma conta? <HighlightText>Cadastre-se</HighlightText>
                        </LinkText>
                    </FooterLink>
                </Card>
            </KeyboardAvoidingView>
        </CenteredContainer>
    );
}
