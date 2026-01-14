import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    Input,
    SubTitle
} from '../../../src/components/styled';

const LogoContainer = styled(TouchableOpacity)`
  width: 100px;
  height: 100px;
  background-color: ${theme.colors.surface};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-color: ${theme.colors.border};
  overflow: hidden;
  align-self: center;
  margin-bottom: ${theme.spacing.lg}px;
`;

const HelperText = styled.Text`
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.sm}px;
  text-align: center;
  margin-top: ${theme.spacing.xs}px;
`;

const StyledImage = styled.Image`
  width: 100%;
  height: 100%;
`;

export default function EditProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        email: '', // Read-only mostly
        phone: '',
        cpf: '',
        birth_date: '',
        gym_name: '',
        address: '',
        opening_hours: '',
        cnpj: '',
        logo_uri: '',
        logo_base64: '',
    });

    const [userAuthId, setUserAuthId] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/');
                return;
            }
            setUserAuthId(user.id);

            // Get profile
            const { data: profile, error } = await supabase
                .from('gym_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 sent when no rows returned (maybe profile missing)
                console.error(error);
            }

            if (profile) setProfileId(profile.id);

            setFormData({
                name: user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: profile?.phone || '', // Phone is stored in gym_profiles, not auth
                cpf: profile?.owner_cpf || '',
                birth_date: formatISODateToDisplay(profile?.owner_birth_date),
                gym_name: profile?.gym_name || '',
                address: profile?.address || '',
                opening_hours: profile?.opening_hours || '',
                cnpj: profile?.cnpj || '',
                logo_uri: profile?.logo_url || '',
                logo_base64: '',
            });

        } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Falha ao carregar perfil.');
        } finally {
            setFetching(false);
        }
    };

    const formatDate = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        if (cleaned.length > 4) formatted = `${formatted.slice(0, 5)}/${formatted.slice(5, 9)}`;
        return formatted;
    };

    const updateForm = (key: string, value: string) => {
        if (key === 'birth_date') {
            value = formatDate(value);
        }
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setFormData(prev => ({
                ...prev,
                logo_uri: result.assets[0].uri,
                logo_base64: result.assets[0].base64 || ''
            }));
        }
    };

    const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return null;
        // If it's already ISO, return it
        if (dateStr.includes('-')) return dateStr;

        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };

    const formatISODateToDisplay = (isoDate: string) => {
        if (!isoDate) return '';
        if (isoDate.includes('/')) return isoDate; // Already formatted
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleSave = async () => {
        if (!formData.gym_name || !formData.name) {
            Alert.alert('Erro', 'Nome e Nome da Academia são obrigatórios.');
            return;
        }
        setLoading(true);

        try {
            // 1. Update Auth Metadata (Name)
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: formData.name }
            });
            if (authError) throw authError;

            // 2. Upload Logo if changed (has base64)
            let logoUrl = formData.logo_uri;
            if (formData.logo_base64 && userAuthId) {
                const filePath = `${userAuthId}/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, decode(formData.logo_base64), {
                        contentType: 'image/jpeg',
                    });

                if (uploadError) {
                    console.error('Logo upload failed:', uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
                    logoUrl = publicUrl;
                }
            }

            // 3. Update Gym Profile
            const profilePayload = {
                user_id: userAuthId,
                gym_name: formData.gym_name,
                logo_url: logoUrl,
                address: formData.address,
                opening_hours: formData.opening_hours,
                cnpj: formData.cnpj,
                owner_cpf: formData.cpf,
                owner_birth_date: convertDateToISO(formData.birth_date),
                phone: formData.phone,
            };

            let profileError;

            if (profileId) {
                const { error } = await supabase
                    .from('gym_profiles')
                    .update(profilePayload)
                    .eq('id', profileId);
                profileError = error;
            } else {
                // Double check if profile exists (in case it was created elsewhere since load)
                const { data: existing } = await supabase
                    .from('gym_profiles')
                    .select('id')
                    .eq('user_id', userAuthId)
                    .maybeSingle();

                if (existing) {
                    const { error } = await supabase
                        .from('gym_profiles')
                        .update(profilePayload)
                        .eq('id', existing.id);
                    profileError = error;
                    setProfileId(existing.id);
                } else {
                    const { error, data } = await supabase
                        .from('gym_profiles')
                        .insert(profilePayload)
                        .select()
                        .single();
                    profileError = error;
                    if (data) setProfileId(data.id);
                }
            }

            if (profileError) throw profileError;

            Alert.alert('Sucesso', 'Perfil atualizado!');
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <Container style={{ justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></Container>;

    return (
        <Container>
            <ScrollView contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 12 }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <LogoContainer onPress={pickImage}>
                        {formData.logo_uri ? (
                            <StyledImage source={{ uri: formData.logo_uri }} />
                        ) : (
                            <FontAwesome name="camera" size={30} color={theme.colors.textSecondary} />
                        )}
                    </LogoContainer>
                    <HelperText>Alterar Logo</HelperText>
                </View>

                <SubTitle>Dados Pessoais</SubTitle>
                <Input
                    placeholder="Nome Completo"
                    value={formData.name} onChangeText={t => updateForm('name', t)}
                    style={{ marginBottom: 12 }}
                />
                <Input
                    placeholder="Email"
                    value={formData.email}
                    editable={false}
                    style={{ marginBottom: 12, opacity: 0.7 }}
                />
                <Input
                    placeholder="CPF"
                    value={formData.cpf} onChangeText={t => updateForm('cpf', t)}
                    keyboardType="numeric"
                    style={{ marginBottom: 12 }}
                />
                <Input
                    placeholder="Data Nascimento (DD/MM/YYYY)"
                    value={formData.birth_date} onChangeText={t => updateForm('birth_date', t)}
                    style={{ marginBottom: 12 }}
                />

                <SubTitle>Dados do Negócio</SubTitle>
                <Input
                    placeholder="Nome da Academia"
                    value={formData.gym_name} onChangeText={t => updateForm('gym_name', t)}
                    style={{ marginBottom: 12 }}
                />
                <Input
                    placeholder="CNPJ"
                    value={formData.cnpj} onChangeText={t => updateForm('cnpj', t)}
                    keyboardType="numeric"
                    style={{ marginBottom: 12 }}
                />
                <Input
                    placeholder="Endereço"
                    value={formData.address} onChangeText={t => updateForm('address', t)}
                    style={{ marginBottom: 12 }}
                />
                <Input
                    placeholder="Horário de Funcionamento"
                    value={formData.opening_hours} onChangeText={t => updateForm('opening_hours', t)}
                    style={{ marginBottom: 12 }}
                />

                <Button onPress={handleSave} disabled={loading} style={{ marginTop: 20 }}>
                    {loading ? <ActivityIndicator color="black" /> : <ButtonText>Salvar Alterações</ButtonText>}
                </Button>
            </ScrollView>
        </Container>
    );
}
