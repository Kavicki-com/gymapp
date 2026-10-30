import { appAlert } from '@/src/components/AppAlert';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import styled from 'styled-components/native';
import {
    BlocoEstado,
    BotaoPrincipal,
    BotaoTexto,
    Cabecalho,
    Campo,
    Destaque,
    Formulario,
    IconeAcesso,
    IconeEstado,
    Rodape,
    Subtitulo,
    TelaAcesso,
    TextoEstado,
    Titulo,
    TituloEstado,
} from '../src/components/acesso';
import { Icon } from '../src/components/Icon';
import { PasswordInput } from '../src/components/PasswordInput';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

/* Layout do redesign (Claude Design, "Crie uma senha nova"). Verificação do
   link, bloqueio do voltar, regras e destinos são os mesmos de antes.

   A lista de conferência reflete exatamente as checagens de
   handleUpdatePassword (6+ caracteres e senhas iguais) — só indica, quem
   decide continua sendo o handler. */

const ItemRegra = styled.Text<{ ok: boolean }>`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${({ ok }) => (ok ? theme.colors.success : theme.colors.textSecondary)};
`;

const LinkCancelar = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.textSecondary};
`;

function Regra({ ok, texto }: { ok: boolean; texto: string }) {
    return (
        <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            accessible
            accessibilityLabel={`${texto}: ${ok ? 'ok' : 'pendente'}`}
        >
            {ok
                ? <Icon name="check" size={16} strokeWidth={2.6} color={theme.colors.success} />
                : <IconeAcesso nome="circulo" size={16} strokeWidth={2.2} color={theme.colors.textSecondary} />}
            <ItemRegra ok={ok}>{texto}</ItemRegra>
        </View>
    );
}

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
                appAlert(
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
            appAlert('Erro', 'Preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            appAlert('Erro', 'As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            appAlert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                appAlert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
            } else {
                // Mark password as changed BEFORE any navigation
                passwordChangedRef.current = true;
                clearPasswordRecovery();
                router.replace('/password-changed');
            }
        } catch (error: any) {
            appAlert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
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
            <TelaAcesso>
                <BlocoEstado style={{ marginTop: 'auto', marginBottom: 'auto' }} accessibilityRole="progressbar">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <TextoEstado style={{ color: theme.colors.textStrong, fontSize: 16 }}>Validando link...</TextoEstado>
                </BlocoEstado>
            </TelaAcesso>
        );
    }

    if (linkError) {
        return (
            <TelaAcesso respiroTopo={48}>
                <BlocoEstado style={{ marginTop: 80 }}>
                    <IconeEstado tom="perigo">
                        <IconeAcesso nome="alerta" size={40} strokeWidth={2.4} color={theme.colors.danger} />
                    </IconeEstado>
                    <TituloEstado accessibilityRole="header">Link inválido ou expirado</TituloEstado>
                    <TextoEstado>
                        Não foi possível validar seu link de recuperação. Ele pode ter expirado ou já ter sido usado.
                    </TextoEstado>
                </BlocoEstado>
                <Rodape>
                    <BotaoPrincipal titulo="Voltar ao login" onPress={handleBackToLogin} />
                </Rodape>
            </TelaAcesso>
        );
    }

    const emailDaConta = session?.user?.email;

    return (
        <TelaAcesso respiroTopo={48}>
            <Cabecalho>
                <Titulo accessibilityRole="header">Crie uma senha nova</Titulo>
                {emailDaConta ? (
                    <Subtitulo>Para a conta <Destaque>{emailDaConta}</Destaque>.</Subtitulo>
                ) : null}
            </Cabecalho>

            <Formulario>
                <Campo rotulo="Nova senha">
                    <PasswordInput
                        placeholder="Nova senha"
                        value={password}
                        onChangeText={setPassword}
                        autoComplete="new-password"
                        textContentType="newPassword"
                    />
                </Campo>

                <Campo rotulo="Confirmar nova senha">
                    <PasswordInput
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        autoComplete="new-password"
                        textContentType="newPassword"
                    />
                </Campo>

                <View style={{ gap: theme.spacing.sm }}>
                    <Regra ok={password.length >= 6} texto="Pelo menos 6 caracteres" />
                    <Regra ok={!!password && password === confirmPassword} texto="As duas senhas são iguais" />
                </View>

                <View style={{ marginTop: theme.spacing.sm }}>
                    <BotaoPrincipal titulo="Salvar nova senha" onPress={handleUpdatePassword} carregando={loading} />
                </View>
            </Formulario>

            <Rodape>
                <BotaoTexto onPress={handleBackToLogin} accessibilityRole="button">
                    <LinkCancelar>Cancelar e voltar para Entrar</LinkCancelar>
                </BotaoTexto>
            </Rodape>
        </TelaAcesso>
    );
}
