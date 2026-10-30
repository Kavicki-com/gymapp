import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/src/components/Icon';
import { theme } from '@/src/styles/theme';

const icone = (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} color={color as string} />;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // O redesign não tem barra de topo: cada tela abre com o próprio
        // título. O recuo da área segura sai daqui, num lugar só.
        headerShown: false,
        sceneStyle: { paddingTop: insets.top, backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: { fontFamily: theme.fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home') }} />
      <Tabs.Screen name="clients" options={{ title: 'Alunos', tabBarIcon: icone('users') }} />
      <Tabs.Screen
        name="collections"
        options={{
          // A aba aparece sempre. Quem não tem acesso vê o paywall.
          title: 'Cobranças',
          tabBarIcon: icone('cash'),
        }}
      />
      <Tabs.Screen name="plans" options={{ title: 'Planos', tabBarIcon: icone('layers') }} />
      <Tabs.Screen name="more" options={{ title: 'Mais', tabBarIcon: icone('dots') }} />
      {/* Colaboradores sai da barra e abre a partir de Mais. `href: null`
          esconde a aba sem remover a rota. */}
      <Tabs.Screen name="employees" options={{ href: null, title: 'Colaboradores' }} />
    </Tabs>
  );
}
