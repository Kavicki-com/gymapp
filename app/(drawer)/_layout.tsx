import { theme } from '@/src/styles/theme';
import { Stack } from 'expo-router';
import React from 'react';

/**
 * O grupo ainda se chama `(drawer)` por histórico: o menu lateral virou a
 * aba Mais no redesign. Grupo não entra na URL, e renomear a pasta mexeria
 * em todo `router.replace('/(drawer)/(tabs)')` sem ganho nenhum.
 */
export default function AppLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="profile/edit"
                options={{
                    headerShown: true,
                    headerTitle: '',
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: theme.colors.text,
                }}
            />
        </Stack>
    );
}
