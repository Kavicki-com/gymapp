import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { theme } from '../styles/theme';

/**
 * Alça do modal com botão de fechar (B2).
 *
 * Sem o botão, no Android só o botão físico de voltar sai destas telas — e no
 * iOS o gesto de arrastar não é descoberto por todo mundo.
 */
export const ModalHandle = ({ onClose }: { onClose?: () => void }) => {
    const router = useRouter();

    const close = () => {
        if (onClose) return onClose();
        if (router.canGoBack()) return router.back();
        router.replace('/(drawer)/(tabs)');
    };

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <View style={{ width: 40, height: 4, backgroundColor: theme.colors.textSecondary, borderRadius: 2, opacity: 0.3 }} />
            <TouchableOpacity
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ position: 'absolute', right: 0, top: -10, padding: 8 }}
            >
                <FontAwesome name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );
};
