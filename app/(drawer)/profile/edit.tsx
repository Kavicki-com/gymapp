import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    Input,
    SubTitle
} from '../../../src/components/styled';
import { formatCNPJ, formatCPF, formatPhone } from '../../../src/utils/masks';

// Copied/Adapted Styled Components from Register
const PickerContainer = styled.View`
    background-color: ${theme.colors.surface};
    border-radius: 8px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    margin-bottom: 12px;
`;

const PickerButton = styled(TouchableOpacity)`
    padding: 14px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`;

const PickerButtonText = styled.Text<{ hasValue?: boolean }>`
    color: ${({ hasValue }) => hasValue ? theme.colors.text : theme.colors.textSecondary};
    font-size: ${theme.fontSize.md}px;
`;

const PickerModal = styled(Modal)``;

const ModalOverlay = styled.TouchableOpacity`
    flex: 1;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: flex-end;
`;

const ModalContent = styled.View`
    background-color: ${theme.colors.background};
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    padding: 20px;
    max-height: 50%;
`;

const ModalTitle = styled.Text`
    font-size: ${theme.fontSize.lg}px;
    font-weight: bold;
    color: ${theme.colors.text};
    margin-bottom: 16px;
`;

const ModalOption = styled(TouchableOpacity)`
    padding: 16px;
    border-bottom-width: 1px;
    border-bottom-color: ${theme.colors.border};
`;

const ModalOptionText = styled.Text`
    font-size: ${theme.fontSize.md}px;
    color: ${theme.colors.text};
`;

const TimeRow = styled.View`
    flex-direction: row;
    gap: 12px;
    margin-bottom: 12px;
`;

const TimeInputContainer = styled.View`
    flex: 1;
`;

const FormLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  font-weight: 500;
  margin-bottom: 8px;
`;

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

const Divider = styled.View`
  height: 1px;
  background-color: ${theme.colors.border};
  margin-vertical: 30px;
`;

const DeleteButton = styled(TouchableOpacity)`
  background-color: transparent;
  border-width: 1px;
  border-color: ${theme.colors.danger};
  padding: 14px;
  border-radius: 8px;
  align-items: center;
  flex-direction: row;
  justify-content: center;
`;

const DeleteButtonText = styled.Text`
  color: ${theme.colors.danger};
  font-weight: bold;
  font-size: ${theme.fontSize.md}px;
  margin-left: 8px;
`;

export default function EditProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        email: '', // Read-only mostly
        phone: '',
        cpf: '',
        birth_date: '',
        gym_name: '',
        address: '',
        // Separated fields for opening hours logic
        working_days: '',
        opening_time: '',
        closing_time: '',
        cnpj: '',
        logo_uri: '',
        logo_base64: '',
    });

    const [showDaysPicker, setShowDaysPicker] = useState(false);

    const daysOptions = [
        { label: 'Segunda à Sexta', value: 'seg_sex' },
        { label: 'Segunda à Sábado', value: 'seg_sab' },
        { label: 'Todos os dias', value: 'todos' },
    ];

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

            // Parse opening_hours string
            let wDays = '';
            let oTime = '';
            let cTime = '';

            if (profile?.opening_hours) {
                // Expected format: "seg_sex - 08:00 às 22:00"
                const parts = profile.opening_hours.split(' - ');
                if (parts.length >= 2) {
                    wDays = parts[0];
                    const times = parts[1].split(' às ');
                    if (times.length >= 2) {
                        oTime = times[0];
                        cTime = times[1];
                    }
                } else {
                    // Fallback for unexpected formats (maybe put whole string in one field or ignore)
                    // We'll leave blank to force update to new format
                }
            }

            setFormData({
                name: user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: formatPhone(profile?.phone || ''),
                cpf: formatCPF(profile?.owner_cpf || ''),
                birth_date: formatISODateToDisplay(profile?.owner_birth_date),
                gym_name: profile?.gym_name || '',
                address: profile?.address || '',
                working_days: wDays,
                opening_time: oTime,
                closing_time: cTime,
                cnpj: formatCNPJ(profile?.cnpj || ''),
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

    const formatTime = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
        }
        return formatted;
    };

    const updateForm = (key: string, value: string) => {
        if (key === 'birth_date') {
            value = formatDate(value);
        }
        if (key === 'phone') value = formatPhone(value);
        if (key === 'cpf') value = formatCPF(value);
        if (key === 'cnpj') value = formatCNPJ(value);
        if (key === 'opening_time' || key === 'closing_time') {
            value = formatTime(value);
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
                opening_hours: `${formData.working_days} - ${formData.opening_time} às ${formData.closing_time}`,
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
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o perfil. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Excluir Conta',
            'Tem certeza que deseja excluir sua conta? Esta ação irá apagar TODOS os seus dados (clientes, colaboradores, modalidades, equipamentos, pagamentos) e NÃO poderá ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sim, Excluir',
                    style: 'destructive',
                    onPress: () => confirmDeleteAccount()
                }
            ]
        );
    };

    const confirmDeleteAccount = () => {
        Alert.alert(
            'Última Confirmação',
            'Esta ação é IRREVERSÍVEL. Deseja realmente excluir sua conta e todos os dados?',
            [
                { text: 'Não, Manter Conta', style: 'cancel' },
                {
                    text: 'Excluir Permanentemente',
                    style: 'destructive',
                    onPress: () => executeDeleteAccount()
                }
            ]
        );
    };

    const executeDeleteAccount = async () => {
        if (!profileId || !userAuthId) {
            Alert.alert('Erro', 'Não foi possível identificar sua conta.');
            return;
        }

        setDeleting(true);
        try {
            // Delete all related data in order (respecting foreign keys)
            // 1. Payments
            await supabase.from('payments').delete().eq('gym_id', profileId);

            // 2. Equipment images and maintenances
            await supabase.from('equipment_images').delete().eq('gym_id', profileId);
            await supabase.from('equipment_maintenances').delete().eq('gym_id', profileId);

            // 3. Client images
            await supabase.from('client_images').delete().eq('gym_id', profileId);

            // 4. Employee payments
            await supabase.from('employee_payments').delete().eq('gym_id', profileId);

            // 5. Main entities
            await supabase.from('clients').delete().eq('gym_id', profileId);
            await supabase.from('employees').delete().eq('gym_id', profileId);
            await supabase.from('equipment').delete().eq('gym_id', profileId);
            await supabase.from('plans').delete().eq('gym_id', profileId);

            // 6. Gym profile
            await supabase.from('gym_profiles').delete().eq('id', profileId);

            // 7. Sign out and redirect
            await supabase.auth.signOut();

            Alert.alert(
                'Conta Excluída',
                'Sua conta e todos os dados foram excluídos com sucesso.',
                [{ text: 'OK', onPress: () => router.replace('/') }]
            );
        } catch (error: any) {
            console.error('Delete account error:', error);
            Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
        } finally {
            setDeleting(false);
        }
    };

    if (fetching) return (
        <Container>
            <SkeletonLoader variant="profile" />
        </Container>
    );

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
                    placeholder="Telefone"
                    value={formData.phone}
                    onChangeText={t => updateForm('phone', t)}
                    keyboardType="phone-pad"
                    style={{ marginBottom: 12 }}
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

                <SubTitle>Dados da Academia</SubTitle>
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
                <FormLabel>Dias de Funcionamento</FormLabel>
                <PickerContainer>
                    <PickerButton onPress={() => setShowDaysPicker(true)}>
                        <PickerButtonText hasValue={!!formData.working_days}>
                            {formData.working_days ? daysOptions.find(d => d.value === formData.working_days)?.label : 'Selecione os dias'}
                        </PickerButtonText>
                        <FontAwesome name="chevron-down" size={16} color={theme.colors.textSecondary} />
                    </PickerButton>
                </PickerContainer>

                <FormLabel>Horário de Funcionamento</FormLabel>
                <TimeRow>
                    <TimeInputContainer>
                        <Input
                            placeholder="HH:MM"
                            value={formData.opening_time}
                            onChangeText={t => updateForm('opening_time', t)}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                    </TimeInputContainer>
                    <Text style={{ alignSelf: 'center', color: theme.colors.text }}>até</Text>
                    <TimeInputContainer>
                        <Input
                            placeholder="HH:MM"
                            value={formData.closing_time}
                            onChangeText={t => updateForm('closing_time', t)}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                    </TimeInputContainer>
                </TimeRow>

                <Button onPress={handleSave} disabled={loading || deleting} style={{ marginTop: 20 }}>
                    {loading ? <ActivityIndicator color="black" /> : <ButtonText>Salvar Alterações</ButtonText>}
                </Button>

                <Divider />

                <DeleteButton onPress={handleDeleteAccount} disabled={deleting}>
                    {deleting ? (
                        <ActivityIndicator color={theme.colors.danger} />
                    ) : (
                        <>
                            <FontAwesome name="trash" size={18} color={theme.colors.danger} />
                            <DeleteButtonText>Excluir Minha Conta</DeleteButtonText>
                        </>
                    )}
                </DeleteButton>
            </ScrollView>

            <PickerModal
                transparent={true}
                visible={showDaysPicker}
                animationType="slide"
                onRequestClose={() => setShowDaysPicker(false)}
            >
                <ModalOverlay activeOpacity={1} onPress={() => setShowDaysPicker(false)}>
                    <ModalContent>
                        <ModalTitle>Dias de Funcionamento</ModalTitle>
                        {daysOptions.map((option) => (
                            <ModalOption
                                key={option.value}
                                onPress={() => {
                                    updateForm('working_days', option.value);
                                    setShowDaysPicker(false);
                                }}
                            >
                                <ModalOptionText>{option.label}</ModalOptionText>
                            </ModalOption>
                        ))}
                    </ModalContent>
                </ModalOverlay>
            </PickerModal>
        </Container>
    );
}
