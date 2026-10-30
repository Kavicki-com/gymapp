import React, { useState } from 'react';
import { TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { theme } from '../styles/theme';
import { IconeAcesso } from './acesso';

type Props = TextInputProps & { containerStyle?: ViewStyle };

/**
 * Campo de senha com alternância de visibilidade (C8).
 *
 * Sem isso, quem erra a senha no teclado do celular não tem como conferir o
 * que digitou — e a regra de senha só aparece depois da falha.
 *
 * Visual do redesign: a caixa é a mesma do Input, com o olho dentro dela num
 * botão de 44 px.
 */
export const PasswordInput = ({ containerStyle, style, ...props }: Props) => {
    const [visible, setVisible] = useState(false);

    return (
        <View
            style={[
                {
                    width: '100%',
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingLeft: 16,
                    paddingRight: 4,
                    borderRadius: theme.borderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.inputBackground,
                },
                containerStyle,
            ]}
        >
            <TextInput
                placeholderTextColor={theme.colors.placeholder}
                {...props}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                    {
                        flex: 1,
                        minWidth: 0,
                        paddingVertical: theme.spacing.md,
                        fontFamily: theme.fonts.regular,
                        fontSize: theme.fontSize.md,
                        color: theme.colors.text,
                    },
                    style,
                ]}
            />
            <TouchableOpacity
                onPress={() => setVisible(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
                style={{ width: theme.touch, height: theme.touch, alignItems: 'center', justifyContent: 'center' }}
            >
                <IconeAcesso
                    nome={visible ? 'olho-fechado' : 'olho'}
                    size={20}
                    color={theme.colors.textSecondary}
                />
            </TouchableOpacity>
        </View>
    );
};

/** Texto da regra de senha, exibido antes do erro e não depois dele. */
export const PASSWORD_RULE = 'Mais de 6 caracteres, com letras, números e um caractere especial.';
