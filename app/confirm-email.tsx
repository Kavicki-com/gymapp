import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
    AvisoErro,
    BlocoEstado,
    BotaoPrincipal,
    Contagem,
    IconeAcesso,
    IconeEstado,
    Rodape,
    TelaAcesso,
    TextoEstado,
    TituloEstado,
} from '../src/components/acesso';
import { Icon } from '../src/components/Icon';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

/* Layout do redesign (Claude Design, "Confirmar e-mail"). A detecção do
   token/sessão, a contagem e os destinos são os mesmos de antes. */

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
            <TelaAcesso>
                <BlocoEstado style={{ marginTop: 'auto', marginBottom: 'auto' }} accessibilityRole="progressbar">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <TextoEstado style={{ color: theme.colors.textStrong, fontSize: 16 }}>Confirmando seu e-mail...</TextoEstado>
                </BlocoEstado>
            </TelaAcesso>
        );
    }

    if (error) {
        return (
            <TelaAcesso respiroTopo={48}>
                <BlocoEstado style={{ marginTop: 80 }}>
                    <IconeEstado tom="perigo">
                        <IconeAcesso nome="alerta" size={40} strokeWidth={2.4} color={theme.colors.danger} />
                    </IconeEstado>
                    <TituloEstado accessibilityRole="header">Erro na confirmação</TituloEstado>
                    <AvisoErro accessibilityRole="alert">{error}</AvisoErro>
                </BlocoEstado>
                <Rodape>
                    <BotaoPrincipal titulo="Ir para o login" onPress={handleManualLogin} />
                </Rodape>
            </TelaAcesso>
        );
    }

    return (
        <TelaAcesso respiroTopo={48}>
            <BlocoEstado style={{ marginTop: 80 }}>
                <IconeEstado tom="sucesso">
                    <Icon name="check" size={40} strokeWidth={2.4} color={theme.colors.success} />
                </IconeEstado>
                <TituloEstado accessibilityRole="header">Cadastro realizado!</TituloEstado>
                <TextoEstado>Você será levado à configuração da academia em:</TextoEstado>
                <View accessibilityLiveRegion="polite">
                    <Contagem>{countdown}s</Contagem>
                </View>
            </BlocoEstado>
            <Rodape>
                <BotaoPrincipal titulo="Entrar agora" onPress={performAutoLogin} />
            </Rodape>
        </TelaAcesso>
    );
}
