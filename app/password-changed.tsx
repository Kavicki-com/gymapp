import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
    BlocoEstado,
    BotaoPrincipal,
    Contagem,
    IconeEstado,
    Rodape,
    TelaAcesso,
    TextoEstado,
    TituloEstado,
} from '../src/components/acesso';
import { Icon } from '../src/components/Icon';
import { useAuth } from '../src/contexts/AuthContext';
import { theme } from '../src/styles/theme';

/* Layout do redesign (Claude Design, "Senha alterada"). Contagem e destino
   são os mesmos de antes. */

export default function PasswordChangedScreen() {
    const router = useRouter();
    const { clearPasswordRecovery } = useAuth();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Clear recovery state before navigating
            clearPasswordRecovery();
            router.replace('/(drawer)/(tabs)');
        }
    }, [countdown]);

    const handleContinue = () => {
        // Clear recovery state before navigating
        clearPasswordRecovery();
        router.replace('/(drawer)/(tabs)');
    };

    return (
        <TelaAcesso respiroTopo={48} espaco={32}>
            <BlocoEstado style={{ marginTop: 120 }}>
                <IconeEstado tom="sucesso">
                    <Icon name="check" size={44} strokeWidth={2.4} color={theme.colors.success} />
                </IconeEstado>
                <TituloEstado accessibilityRole="header">Senha alterada</TituloEstado>
                <TextoEstado>Sua senha foi alterada com sucesso. Você será levado ao painel em:</TextoEstado>
                <View accessibilityLiveRegion="polite">
                    <Contagem>{countdown}s</Contagem>
                </View>
            </BlocoEstado>
            <Rodape>
                <BotaoPrincipal titulo="Entrar agora" onPress={handleContinue} />
            </Rodape>
        </TelaAcesso>
    );
}
