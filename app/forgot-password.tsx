import { appAlert } from '@/src/components/AppAlert';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
    BotaoPrincipal,
    BotaoVoltar,
    Cabecalho,
    Campo,
    Formulario,
    Rodape,
    Subtitulo,
    TelaAcesso,
    TextoRodape,
    Titulo,
} from '../src/components/acesso';
import { HighlightText, Input } from '../src/components/styled';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

/* Layout do redesign (Claude Design, "Esqueceu a senha?"). O envio do link e
   os avisos são os mesmos de antes (o "link enviado" continua no alerta, que
   já volta para o login). */

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            appAlert('Erro', 'Por favor, informe seu email.');
            return;
        }

        setLoading(true);

        try {
            const redirectUrl = Linking.createURL('/reset-password');
            console.log('Password reset redirect URL:', redirectUrl);

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) {
                appAlert('Erro', 'Não foi possível enviar o email. Verifique o email informado.');
            } else {
                appAlert(
                    'Email Enviado',
                    'Verifique sua caixa de entrada para redefinir sua senha.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error: any) {
            appAlert('Erro', 'Ocorreu um erro ao enviar o email. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TelaAcesso>
            <View style={{ flexDirection: 'row' }}>
                <BotaoVoltar onPress={() => router.back()} rotulo="Voltar para Entrar" />
            </View>

            <Cabecalho>
                <Titulo accessibilityRole="header">Esqueceu a senha?</Titulo>
                <Subtitulo>Informe o e-mail da conta. Vamos mandar um link para você criar uma senha nova.</Subtitulo>
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
                <BotaoPrincipal titulo="Enviar link" onPress={handleResetPassword} carregando={loading} />
            </Formulario>

            <Rodape>
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityRole="link"
                    style={{ minHeight: theme.touch, justifyContent: 'center' }}
                >
                    <TextoRodape>
                        Lembrou? <HighlightText>Voltar para Entrar</HighlightText>
                    </TextoRodape>
                </TouchableOpacity>
            </Rodape>
        </TelaAcesso>
    );
}
