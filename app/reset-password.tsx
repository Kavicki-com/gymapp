
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import {
    Button,
    ButtonText,
    Card,
    CenteredContainer,
    FormGroup,
    Input,
    Label,
    Title
} from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { clearPasswordRecovery, isPasswordRecovery, signOut } = useAuth();
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

    // Sign out if user navigates away without changing password (iOS swipe gesture)
    useEffect(() => {
        return () => {
            // Only sign out if we had a valid session and password wasn't changed
            if (hasValidSessionRef.current && !passwordChangedRef.current) {
                console.log('ResetPassword: Unmounting without password change, signing out');
                supabase.auth.signOut();
            }
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            console.log('ResetPassword: Starting session check...');

            // First, wait a short moment for any pending session to be set
            // This handles the case where DeepLinkHandler just called setSession
            await new Promise(resolve => setTimeout(resolve, 300));

            if (!isMounted) return;

            // Check for session
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            console.log('ResetPassword: Session check result:', currentSession ? 'yes' : 'no');
            console.log('ResetPassword: isPasswordRecovery:', isPasswordRecovery);

            // If we have a session or recovery flag, we're in a valid recovery flow
            if (currentSession || isPasswordRecovery) {
                console.log('ResetPassword: Valid recovery context found');
                if (isMounted) {
                    setHasValidSession(true);
                    hasValidSessionRef.current = true;
                    setIsVerifying(false);
                }
                return;
            }

            // No session yet - wait a bit more in case auth is still processing
            console.log('ResetPassword: No session, waiting for auth...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (!isMounted) return;

            // Final check
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
                console.log('ResetPassword: Session found on retry');
                if (isMounted) {
                    setHasValidSession(true);
                    hasValidSessionRef.current = true;
                    setIsVerifying(false);
                }
            } else {
                // No valid recovery context - redirect to login
                console.log('ResetPassword: No session after waiting - redirecting to login');
                if (isMounted) {
                    router.replace('/');
                }
            }
        };

        checkSession();

        return () => {
            isMounted = false;
        };
    }, [isPasswordRecovery]);

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

    const handleBackToLogin = () => {
        // Don't sign out if there's a link error (no session to sign out)
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
                </Card>
            </KeyboardAvoidingView>
        </CenteredContainer>
    );
}
