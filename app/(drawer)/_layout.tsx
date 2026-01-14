import CustomDrawerContent from '@/src/components/CustomDrawerContent';
import { theme } from '@/src/styles/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function DrawerLayout() {
    const router = useRouter();

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.text,
                drawerStyle: { backgroundColor: theme.colors.background },
                drawerPosition: 'right',
            }}
        >
            <Drawer.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                    title: 'Início'
                }}
            />
            <Drawer.Screen
                name="profile/edit"
                options={{
                    headerShown: true,
                    title: 'Editar Perfil',
                    headerTitle: '',
                    headerStyle: { backgroundColor: theme.colors.surface },
                    headerTintColor: theme.colors.text,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
                            <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Drawer>
    );
}
