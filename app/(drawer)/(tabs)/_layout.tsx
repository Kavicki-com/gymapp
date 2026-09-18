import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DrawerActions } from "expo-router/react-navigation";
import { Tabs, useNavigation } from 'expo-router';
import React from 'react';
import { ColorValue, TouchableOpacity } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: ColorValue;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EAB308', // yellow-500
        tabBarInactiveTintColor: '#9CA3AF', // gray-400
        tabBarStyle: {
          backgroundColor: '#1F2937', // gray-800
          borderTopColor: '#374151', // gray-700
        },
        headerStyle: {
          backgroundColor: '#111827', // gray-900
        },
        headerTitleStyle: {
          color: '#F3F4F6', // gray-100
        },
        headerShown: useClientOnlyValue(false, true),
        headerRight: () => {
          const navigation = useNavigation();
          return (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={{ marginRight: 15 }}
            >
              <FontAwesome name="bars" size={24} color="#F3F4F6" />
            </TouchableOpacity>
          );
        },
        headerTitle: '',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      {/* Colaboradores saiu da barra e vive no drawer. `href: null` esconde
          da tab bar sem remover a rota. Aparelhos foi removido por inteiro:
          nenhuma academia real jamais cadastrou um. */}
      <Tabs.Screen name="employees" options={{ href: null, title: 'Colaboradores' }} />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planos',
          tabBarIcon: ({ color }) => <TabBarIcon name="money" color={color} />,
        }}
      />
    </Tabs>
  );
}
