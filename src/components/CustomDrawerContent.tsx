import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem, useDrawerStatus } from '@react-navigation/drawer';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import styled from 'styled-components/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

const ProfileHeader = styled.View`
  padding: 40px 20px 30px 20px;
  background-color: ${theme.colors.surface};
  align-items: center;
  justify-content: center;
  border-bottom-width: 1px;
  border-bottom-color: ${theme.colors.border};
`;

const Avatar = styled.Image`
  width: 90px;
  height: 90px;
  border-radius: 45px;
  border-width: 2px;
  border-color: ${theme.colors.primary};
  margin-bottom: 12px;
  background-color: ${theme.colors.background};
`;

const GymName = styled.Text`
  color: ${theme.colors.text};
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
`;

const SinceText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 12px;
`;

export default function CustomDrawerContent(props: any) {
    const router = useRouter();
    const navigation = useNavigation();
    const { signOut, session } = useAuth();
    const isDrawerOpen = useDrawerStatus() === 'open';

    const [profileData, setProfileData] = useState({
        gymName: '',
        logoUrl: null as string | null,
        sinceYear: '',
    });

    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [session, isDrawerOpen]);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const year = new Date(user.created_at).getFullYear();

                const { data } = await supabase
                    .from('gym_profiles')
                    .select('gym_name, logo_url')
                    .eq('user_id', user.id)
                    .single();

                setProfileData({
                    gymName: data?.gym_name || 'Bem-vindo',
                    logoUrl: data?.logo_url || null,
                    sinceYear: year.toString()
                });
            }
        } catch (error) {
            console.log('Erro ao carregar perfil no drawer:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'index' }],
                })
            );
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
        }
    };

    const handleSupport = () => {
        Linking.openURL('https://wa.me/5521966087421');
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                <ProfileHeader>
                    {profileData.logoUrl ? (
                        <Avatar
                            source={{ uri: profileData.logoUrl }}
                            onError={() => setProfileData(prev => ({ ...prev, logoUrl: null }))}
                        />
                    ) : (
                        <View style={{
                            width: 90, height: 90, borderRadius: 45, backgroundColor: theme.colors.inputBackground,
                            justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: theme.colors.primary
                        }}>
                            <FontAwesome name="user" size={40} color={theme.colors.textSecondary} />
                        </View>
                    )}

                    <GymName>{profileData.gymName}</GymName>
                    <SinceText>desde {profileData.sinceYear}</SinceText>
                </ProfileHeader>

                <DrawerItem
                    label="Início"
                    icon={({ color, size }) => <FontAwesome name="home" size={size} color={color} />}
                    labelStyle={{ color: theme.colors.text }}
                    onPress={() => router.push('/(drawer)/(tabs)')}
                />

                <DrawerItem
                    label="Editar Perfil"
                    icon={({ color, size }) => <FontAwesome name="user" size={size} color={color} />}
                    labelStyle={{ color: theme.colors.text }}
                    onPress={() => router.push('/(drawer)/profile/edit')}
                />

                <DrawerItem
                    label="Suporte"
                    icon={({ color, size }) => <FontAwesome name="whatsapp" size={size} color={color} />}
                    labelStyle={{ color: theme.colors.text }}
                    onPress={handleSupport}
                />

                <DrawerItem
                    label="Política de Privacidade"
                    icon={({ color, size }) => <FontAwesome name="shield" size={size} color={color} />}
                    labelStyle={{ color: theme.colors.text }}
                    onPress={() => setShowPrivacyPolicy(true)}
                />

                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <DrawerItem
                        label="Sair"
                        icon={({ color, size }) => <FontAwesome name="sign-out" size={size} color={color} />}
                        labelStyle={{ color: theme.colors.danger }}
                        onPress={handleLogout}
                    />
                </View>
            </DrawerContentScrollView>

            <PrivacyPolicyModal
                visible={showPrivacyPolicy}
                onClose={() => setShowPrivacyPolicy(false)}
            />
        </View>
    );
}
