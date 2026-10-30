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

/**
 * Folha inferior com o movimento de folha: o fundo escurece aos poucos e a
 * folha sobe de baixo para cima (e desce ao fechar).
 *
 * Com `<Modal animationType="fade">` a folha inteira só aparecia no lugar, e
 * com `"slide"` o fundo escuro subia junto com ela. Aqui o Modal não anima e
 * as duas partes se movem separadas.
 *
 * `children` é a folha em si (o cartão com a alça). Tocar fora chama
 * `onBackdropPress`, que por padrão é `onClose`; nas folhas com formulário
 * passe `Keyboard.dismiss` para tocar fora só fechar o teclado, como antes.
 */
export function BottomSheet({ visible, onClose, onBackdropPress, avoidKeyboard, children }: {
    visible: boolean;
    onClose: () => void;
    onBackdropPress?: () => void;
    avoidKeyboard?: boolean;
    children: React.ReactNode;
}) {
    // Continua montado durante a animação de saída; o Modal some no fim dela.
    const [montado, setMontado] = useState(visible);
    const progresso = useRef(new Animated.Value(0)).current;
    const altura = Dimensions.get('window').height;

    useEffect(() => {
        if (visible) {
            setMontado(true);
            Animated.timing(progresso, {
                toValue: 1,
                duration: 280,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (montado) {
            Animated.timing(progresso, {
                toValue: 0,
                duration: 220,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => finished && setMontado(false));
        }
    }, [visible]);

    if (!montado) return null;

    const translateY = progresso.interpolate({ inputRange: [0, 1], outputRange: [altura, 0] });

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
                <Animated.View style={{ transform: [{ translateY }] }}>
                    {children}
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fundo: { backgroundColor: 'rgba(0,0,0,0.6)' },
    base: { flex: 1, justifyContent: 'flex-end' },
});
