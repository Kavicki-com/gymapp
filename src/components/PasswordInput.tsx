import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { theme } from '../styles/theme';
import { Input } from './styled';

type Props = TextInputProps & { containerStyle?: ViewStyle };

/**
 * Campo de senha com alternância de visibilidade (C8).
 *
 * Sem isso, quem erra a senha no teclado do celular não tem como conferir o
 * que digitou — e a regra de senha só aparece depois da falha.
 */
export const PasswordInput = ({ containerStyle, style, ...props }: Props) => {
    const [visible, setVisible] = useState(false);

    return (
        <View style={[{ width: '100%', justifyContent: 'center' }, containerStyle]}>
            <Input
                {...props}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                style={[style, { paddingRight: 48 }]}
            />
            <TouchableOpacity
                onPress={() => setVisible(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ position: 'absolute', right: 12, padding: 4 }}
            >
                <FontAwesome
                    name={visible ? 'eye-slash' : 'eye'}
                    size={18}
                    color={theme.colors.textSecondary}
                />
            </TouchableOpacity>
        </View>
    );
};

/** Texto da regra de senha, exibido antes do erro e não depois dele. */
export const PASSWORD_RULE = 'Mais de 6 caracteres, com letras, números e um caractere especial.';
