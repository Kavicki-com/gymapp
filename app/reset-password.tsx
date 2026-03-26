
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import {
    Button,
    ButtonText,
    Card,
    CenteredContainer,
    FormGroup,
    Input,
    Label,
    LinkText,
    Title
} from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { clearPasswordRecovery, isPasswordRecovery, session, signOut, setRecoveryMode } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // State for link verification
    const [isVerifying, setIsVerifying] = useState(true);
    const [linkError, setLinkError] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    // Refs to track state for cleanup without causing stale closures
    const passwordChangedRef = useRef(false);
    const hasValidSessionRef = useRef(false);

    // Prevent back navigation - sign out if user tries to leave
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            // If user presses back and we have a valid session, show warning
            if (hasValidSessionRef.current && !passwordChangedRef.current) {
                Alert.alert(
                    'Atenção',
                    'Você precisa alterar sua senha antes de sair. Deseja cancelar a recuperação?',
                    [
                        { text: 'Continuar Alterando', style: 'cancel' },
                        {
                            text: 'Cancelar Recuperação',
                            style: 'destructive',
                            onPress: async () => {
                                console.log('ResetPassword: User cancelled recovery, signing out');
                                await signOut();
                                clearPasswordRecovery();
                                router.replace('/');
                            }
                        }
                    ]
                );
                return true; // Prevent default back behavior
            }
            return false;
        });

        return () => backHandler.remove();
    }, []);

    // Handled via explicit signOut on cancel or back to login
    useEffect(() => {
        return () => {
            console.log('ResetPassword: Unmounting');
        };
    }, []);

    // Reactive session check
    useEffect(() => {
        console.log('ResetPassword: Recovery state check:', { session: !!session, isPasswordRecovery });

        if (session || isPasswordRecovery) {
            console.log('ResetPassword: Valid recovery context found (session:', !!session, 'recovery flag:', isPasswordRecovery, ')');
            setHasValidSession(true);
            hasValidSessionRef.current = true;
            setIsVerifying(false);
            setLinkError(false);
        } else if (!hasValidSession) {
            // Only start the "redirect to login" timer if we haven't found a valid session yet
            console.log('ResetPassword: No session yet, starting 10s grace period...');
            const timer = setTimeout(() => {
                if (!session && !isPasswordRecovery && !hasValidSessionRef.current) {
                    console.log('ResetPassword: No session after 10s grace period, redirecting to login');
                    router.replace('/');
                }
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [session, isPasswordRecovery]);

    const handleUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Erro', 'Preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                Alert.alert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
            } else {
                // Mark password as changed BEFORE any navigation
                passwordChangedRef.current = true;
                clearPasswordRecovery();
                router.replace('/password-changed');
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = async () => {
        // Don't sign out if there's a link error (no session to sign out)
        console.log('ResetPassword: Going back to login, signing out');
        await signOut();
        clearPasswordRecovery();
        router.replace('/');
    };

    if (isVerifying) {
        return (
            <CenteredContainer>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Title style={{ marginTop: 20, fontSize: 16 }}>Validando link...</Title>
            </CenteredContainer>
        );
    }

    if (linkError) {
        return (
            <CenteredContainer>
                <Card>
                    <Title>Link Inválido ou Expirado</Title>
                    <FormGroup>
                        <Label style={{ textAlign: 'center', marginBottom: 20 }}>
                            Não foi possível validar seu link de recuperação. Ele pode ter expirado ou já ter sido usado.
                        </Label>
                        <Button onPress={handleBackToLogin}>
                            <ButtonText>Voltar ao Login</ButtonText>
                        </Button>
                    </FormGroup>
                </Card>
            </CenteredContainer>
        );
    }

    return (
        <CenteredContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%', justifyContent: 'center' }}
            >
                <Card>
                    <Title>Nova Senha</Title>

                    <FormGroup>
                        <Label>Nova Senha</Label>
                        <Input
                            placeholder="Nova senha"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Confirmar Senha</Label>
                        <Input
                            placeholder="Confirme a nova senha"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </FormGroup>

                    <Button onPress={handleUpdatePassword} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#111827" />
                        ) : (
                            <ButtonText>Alterar Senha</ButtonText>
                        )}
                    </Button>

                    <TouchableOpacity 
                        onPress={handleBackToLogin}
                        style={{ marginTop: 24, alignSelf: 'center' }}
                    >
                        <LinkText>Cancelar e Voltar ao Login</LinkText>
                    </TouchableOpacity>
                </Card>
            </KeyboardAvoidingView>
        </CenteredContainer>
    );
}
