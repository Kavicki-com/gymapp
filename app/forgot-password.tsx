import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
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
import { supabase } from '../src/services/supabase';
import { theme } from '../src/styles/theme';

const BackButton = styled(TouchableOpacity)`
    margin-top: ${theme.spacing.lg}px;
`;

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Erro', 'Por favor, informe seu email.');
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
                Alert.alert('Erro', 'Não foi possível enviar o email. Verifique o email informado.');
            } else {
                Alert.alert(
                    'Email Enviado',
                    'Verifique sua caixa de entrada para redefinir sua senha.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Ocorreu um erro ao enviar o email. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CenteredContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%', justifyContent: 'center' }}
            >
                <Card>
                    <Title>Recuperar Senha</Title>

                    <FormGroup>
                        <Label>Email</Label>
                        <Input
                            placeholder="seu@email.com"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </FormGroup>

                    <Button onPress={handleResetPassword} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#111827" />
                        ) : (
                            <ButtonText>Enviar Email</ButtonText>
                        )}
                    </Button>

                    <BackButton onPress={() => router.back()}>
                        <LinkText>Voltar ao Login</LinkText>
                    </BackButton>
                </Card>
            </KeyboardAvoidingView>
        </CenteredContainer>
    );
}
