import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { Button, ButtonText, Container, Title } from '../src/components/styled';
import { useAuth } from '../src/contexts/AuthContext';
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
        <Container>
            <Content>
                <IconContainer>
                    <FontAwesome name="check" size={50} color={theme.colors.success} />
                </IconContainer>

                <Title>Senha Alterada!</Title>

                <Message>
                    Sua senha foi alterada com sucesso.{'\n'}
                    Você será redirecionado para o painel em:
                </Message>

                <CountdownText>{countdown}s</CountdownText>

                <View style={{ width: '100%', maxWidth: 300 }}>
                    <Button onPress={handleContinue}>
                        <ButtonText>Entrar Agora</ButtonText>
                    </Button>
                </View>
            </Content>
        </Container>
    );
}
