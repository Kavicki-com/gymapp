import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
} from 'react-native';
import styled from 'styled-components/native';
import { theme } from '../styles/theme';
import { avisarFolhaFechando } from './AppAlert';

/**
 * Modal do app, centralizado: o fundo escurece e o cartão aparece no meio
 * com um leve crescimento. Para fluxos que pedem atenção total, como
 * registrar pagamento — as ações e listas de opções continuam no
 * BottomSheet. Mesma API do BottomSheet, para trocar um pelo outro.
 *
 * `children` é o conteúdo; o cartão (superfície, borda, raio 24) é daqui.
 */
export function CenterModal({ visible, onClose, onBackdropPress, avoidKeyboard, children }: {
    visible: boolean;
    onClose: () => void;
    onBackdropPress?: () => void;
    avoidKeyboard?: boolean;
    children: React.ReactNode;
}) {
    const [montado, setMontado] = useState(visible);
    const progresso = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setMontado(true);
            Animated.timing(progresso, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (montado) {
            // Mesmo aviso do BottomSheet: um diálogo pedido logo em seguida
            // ("Pagamento registrado") espera este sair, senão o iOS o descarta.
            avisarFolhaFechando(180 + 120);
            Animated.timing(progresso, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => finished && setMontado(false));
        }
    }, [visible]);

    if (!montado) return null;

    const scale = progresso.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

    return (
        <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <Animated.View style={[StyleSheet.absoluteFill, styles.fundo, { opacity: progresso }]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onBackdropPress ?? onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                />
            </Animated.View>
            <KeyboardAvoidingView
                pointerEvents="box-none"
                enabled={!!avoidKeyboard}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.base}
            >
                <Animated.View style={{ width: '100%', alignItems: 'center', opacity: progresso, transform: [{ scale }] }}>
                    <Cartao accessibilityViewIsModal>{children}</Cartao>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const Cartao = styled.View`
    width: 100%;
    max-width: 440px;
    max-height: ${Math.round(Dimensions.get('window').height * 0.85)}px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.border};
    border-radius: 24px;
    overflow: hidden;
`;

const styles = StyleSheet.create({
    fundo: { backgroundColor: 'rgba(0,0,0,0.6)' },
    base: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 48 },
});
