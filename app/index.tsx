import { appAlert } from '@/src/components/AppAlert';
import { useIsFocused } from "expo-router/react-navigation";
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    BotaoPrincipal,
    BotaoTexto,
    BotaoTextoRotulo,
    Cabecalho,
    Campo,
    Formulario,
    Rodape,
    TelaAcesso,
    TextoRodape,
    Titulo,
} from '../src/components/acesso';
import { Logo } from '../src/components/Logo';
import { PasswordInput } from '../src/components/PasswordInput';
import { PrivacyPolicyModal } from '../src/components/PrivacyPolicyModal';
import { CenteredContainer, HighlightText, Input } from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';
import { translateError } from '../src/utils/errorMessages';

/* Layout do redesign (Claude Design, "Entrar"). Sessão, perfil e navegação
   são os mesmos de antes; só a apresentação mudou. */

const Marca = styled.Text`
  font-family: ${theme.fonts.displayHeavy};
  font-size: 24px;
  letter-spacing: -0.2px;
  color: ${theme.colors.text};
`;

const TituloLogin = styled(Titulo)`
  font-size: 32px;
  line-height: 36px;
`;

const LinkPolitica = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textMuted};
  text-decoration-line: underline;
`;

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, session, loading: authLoading, isPasswordRecovery } = useAuth();
    const router = useRouter();
    const isFocused = useIsFocused();

    const [isChecking, setIsChecking] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

    React.useEffect(() => {
        // If we're in password recovery mode, redirect to reset-password screen
        if (isPasswordRecovery && isFocused) {
            console.log('LoginScreen: Password recovery active, forcing redirect');
            router.replace('/reset-password');
            return;
        }

        // Skip session check if we're in password recovery mode or if there's no session
        if (session && isFocused && !isPasswordRecovery) {
            console.log('LoginScreen: Valid session found, checking profile...');
            checkSession();
        }
    }, [session, isFocused, isPasswordRecovery]);

    // Falha de conexão não é sessão inválida. Deslogar por causa de wifi ruim
    // obriga o dono da academia a lembrar a senha no meio do atendimento.
    const isNetworkError = (err: any) => {
        if (!err) return false;
        if (err.name === 'AuthRetryableFetchError') return true;
        if (err.status === undefined || err.status === 0 || err.status >= 500) return true;
        return /network|fetch|timeout|offline/i.test(String(err.message || ''));
    };

    const checkSession = async () => {
        if (isChecking || !isFocused) return;
        setIsChecking(true);

        try {
            // 1. Verify if session is valid on server
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError && isNetworkError(userError)) {
                console.warn('LoginScreen: sem conexão para validar a sessão', userError);
                appAlert('Sem conexão', 'Não foi possível confirmar seu login agora. Verifique sua internet e tente de novo.');
                return;
            }

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

            // PGRST116 = nenhuma linha, ou seja, perfil realmente não existe.
            // Qualquer outro erro é falha de consulta: mandar para o onboarding
            // faria uma academia já cadastrada recomeçar o cadastro.
            if (error && error.code !== 'PGRST116') {
                console.warn('LoginScreen: falha ao buscar perfil', error);
                appAlert('Sem conexão', 'Não foi possível carregar seus dados agora. Verifique sua internet e tente de novo.');
                return;
            }

            if (profile) {
                // router.replace works, but ensure we are not already navigating
                router.replace('/(drawer)/(tabs)');
            } else {
                // Valid user but no profile (incomplete from previous attempt or new flow)
                // Redirect to Onboarding
                router.replace('/onboarding');
            }
        } catch (error) {
            console.error('Session check error:', error);
            // Só desloga se a sessão for de fato inválida; erro de rede mantém.
            if (!isNetworkError(error)) {
                await supabase.auth.signOut();
            }
        } finally {
            setIsChecking(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            appAlert('Erro', 'Preencha todos os campos');
            return;
        }
        setLoading(true);
        const { error } = await signIn(email, password);

        if (error) {
            setLoading(false);
            appAlert('Erro no Login', translateError(error));
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
                    // Redirect to Onboarding
                    router.replace('/onboarding');
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
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack.Screen options={{ headerShown: false }} />
            <TelaAcesso respiroTopo={48} espaco={40}>
                <Cabecalho style={{ gap: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Logo width={40} height={40} color={theme.colors.primary} />
                        <Marca>GymApp</Marca>
                    </View>
                    <TituloLogin accessibilityRole="header">Sua academia,{'\n'}em dia.</TituloLogin>
                </Cabecalho>

                <Formulario>
                    <Campo rotulo="E-mail">
                        <Input
                            placeholder="voce@academia.com.br"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            textContentType="emailAddress"
                        />
                    </Campo>

                    <Campo rotulo="Senha">
                        <PasswordInput
                            placeholder="Sua senha"
                            value={password}
                            onChangeText={setPassword}
                            autoComplete="current-password"
                            textContentType="password"
                        />
                    </Campo>

                    <BotaoTexto
                        onPress={() => router.push('/forgot-password')}
                        style={{ alignSelf: 'flex-end', marginTop: -8 }}
                        accessibilityRole="link"
                    >
                        <BotaoTextoRotulo>Esqueci a senha</BotaoTextoRotulo>
                    </BotaoTexto>

                    <BotaoPrincipal titulo="Entrar" onPress={handleLogin} carregando={loading} />
                </Formulario>

                <Rodape gap={4}>
                    <TouchableOpacity
                        onPress={() => router.push('/register')}
                        accessibilityRole="link"
                        style={{ minHeight: theme.touch, justifyContent: 'center' }}
                    >
                        <TextoRodape>
                            Ainda não usa o GymApp? <HighlightText>Criar conta grátis</HighlightText>
                        </TextoRodape>
                    </TouchableOpacity>
                    <BotaoTexto onPress={() => setShowPrivacyPolicy(true)} accessibilityRole="button">
                        <LinkPolitica>Política de Privacidade</LinkPolitica>
                    </BotaoTexto>
                </Rodape>
            </TelaAcesso>

            <PrivacyPolicyModal
                visible={showPrivacyPolicy}
                onClose={() => setShowPrivacyPolicy(false)}
            />
        </View>
    );
}
