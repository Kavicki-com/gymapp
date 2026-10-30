import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/styles/theme';
import { Stack, useNavigation } from 'expo-router';
import { CommonActions, type NavigationProp } from 'expo-router/react-navigation';
import React, { useEffect } from 'react';

/**
 * O grupo ainda se chama `(drawer)` por histórico: o menu lateral virou a
 * aba Mais no redesign. Grupo não entra na URL, e renomear a pasta mexeria
 * em todo `router.replace('/(drawer)/(tabs)')` sem ganho nenhum.
 */

/**
 * O navegador que tem as rotas do app/_layout (login `index` e `(drawer)`).
 * Procurado pelo nome das rotas, não pela posição: nos builds o Expo Router
 * tem um navegador interno acima dele, e um reset mandado "para o topo" era
 * ignorado em silêncio — o Sair deslogava mas não saía da tela.
 */
function navegadorRaiz(nav: NavigationProp<any> | undefined) {
    let atual = nav;
    while (atual && !atual.getState()?.routeNames?.includes('(drawer)')) {
        atual = atual.getParent();
    }
    return atual;
}

export default function AppLayout() {
    const navigation = useNavigation();
    const { session, loading } = useAuth();

    // Sem sessão não há área logada: Sair, sessão expirada ou conta apagada
    // levam todos para o login, a partir daqui.
    useEffect(() => {
        if (loading || session) return;
        navegadorRaiz(navigation as NavigationProp<any>)?.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'index' }] }),
        );
    }, [session, loading]);

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
