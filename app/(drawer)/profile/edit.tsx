import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInputProps, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { Container, Input, SectionLabel } from '../../../src/components/styled';
import { formatCNPJ, formatCPF, formatPhone } from '../../../src/utils/masks';

/*
 * Layout do redesign (Claude Design, "Perfil"). Carregamento, máscaras,
 * upload da logo, gravação e exclusão de conta são os mesmos de antes; só a
 * apresentação mudou. O topo continua sendo o header nativo da pilha (seta
 * de voltar), por isso o título fica no corpo, ao lado da logo.
 */

const Conteudo = styled.View`
    padding: ${theme.spacing.sm}px ${theme.spacing.xl}px 0;
    gap: ${theme.spacing.lg}px;
`;

const LogoQuadro = styled(TouchableOpacity)`
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background-color: ${theme.colors.neutralPill};
    align-items: center;
    justify-content: center;
    overflow: hidden;
`;

const LogoImagem = styled.Image`
    width: 100%;
    height: 100%;
`;

const Iniciais = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.primary};
`;

const TituloTela = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.text};
`;

const LinkLogo = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    justify-content: center;
    align-self: flex-start;
`;

const LinkLogoTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${theme.colors.primary};
`;

const Bloco = styled.View`
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: ${theme.borderRadius.lg}px;
    padding: ${theme.spacing.lg}px;
    gap: ${theme.spacing.md}px;
`;

const Rotulo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

/** Campo dentro do bloco: um tom abaixo da superfície, como no design. */
const CampoBloco = styled(Input)`
    min-height: 46px;
    border-radius: 12px;
    padding-horizontal: 12px;
    padding-vertical: 10px;
    background-color: ${theme.colors.background};
    font-size: 15px;
`;

const Dica = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textMuted};
`;

const Chip = styled(TouchableOpacity)<{ ativo: boolean }>`
    min-height: ${theme.touch}px;
    padding-horizontal: ${theme.spacing.md}px;
    border-radius: 22px;
    border-width: 1px;
    border-color: ${({ ativo }) => (ativo ? theme.colors.text : theme.colors.border)};
    background-color: ${({ ativo }) => (ativo ? theme.colors.text : 'transparent')};
    align-items: center;
    justify-content: center;
`;

const ChipTexto = styled.Text<{ ativo: boolean }>`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${({ ativo }) => (ativo ? theme.colors.onPrimary : theme.colors.textStrong)};
`;

const Ate = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
    padding-bottom: 14px;
`;

const BotaoSalvar = styled(TouchableOpacity)<{ inativo?: boolean }>`
    min-height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
    opacity: ${({ inativo }) => (inativo ? 0.6 : 1)};
`;

const BotaoSalvarTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 16px;
    color: ${theme.colors.onPrimary};
`;

const BotaoExcluir = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    align-items: center;
    justify-content: center;
`;

const BotaoExcluirTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${theme.colors.danger};
`;

const iniciaisDe = (nome: string) =>
    nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

/** Rótulo em cima, campo embaixo, dica opcional. `flex` para as linhas de 2. */
function CampoRotulado({ rotulo, dica, flex, ...props }: TextInputProps & {
    rotulo: string;
    dica?: string;
    flex?: boolean;
}) {
    return (
        <View style={[{ gap: 6 }, flex ? { flex: 1, minWidth: 0 } : null]}>
            <Rotulo>{rotulo}</Rotulo>
            <CampoBloco accessibilityLabel={rotulo} {...props} />
            {dica ? <Dica>{dica}</Dica> : null}
        </View>
    );
}

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

    const daysOptions = [
        { label: 'Segunda à sexta', value: 'seg_sex' },
        { label: 'Segunda à sábado', value: 'seg_sab' },
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
            'Tem certeza que deseja excluir sua conta? Esta ação irá apagar TODOS os seus dados (clientes, colaboradores, planos, equipamentos, pagamentos) e NÃO poderá ser desfeita.',
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

    const insets = useSafeAreaInsets();

    if (fetching) return (
        <Container>
            <SkeletonLoader variant="profile" />
        </Container>
    );

    const ocupado = loading || deleting;

    return (
        <Container>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            >
                <Conteudo>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <LogoQuadro onPress={pickImage} accessibilityRole="button" accessibilityLabel="Alterar logo">
                            {formData.logo_uri ? (
                                <LogoImagem source={{ uri: formData.logo_uri }} />
                            ) : (
                                <Iniciais>{iniciaisDe(formData.gym_name)}</Iniciais>
                            )}
                        </LogoQuadro>
                        <View style={{ flex: 1 }}>
                            <TituloTela accessibilityRole="header">Perfil da academia</TituloTela>
                            <LinkLogo onPress={pickImage} accessibilityRole="button">
                                <LinkLogoTexto>Alterar logo</LinkLogoTexto>
                            </LinkLogo>
                        </View>
                    </View>

                    <Bloco accessibilityLabel="Dados da academia">
                        <SectionLabel>Academia</SectionLabel>
                        <CampoRotulado
                            rotulo="Nome da academia"
                            placeholder="Nome da academia"
                            value={formData.gym_name} onChangeText={t => updateForm('gym_name', t)}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <CampoRotulado
                                flex
                                rotulo="CNPJ"
                                placeholder="00.000.000/0000-00"
                                value={formData.cnpj} onChangeText={t => updateForm('cnpj', t)}
                                keyboardType="numeric"
                            />
                            <CampoRotulado
                                flex
                                rotulo="Telefone"
                                placeholder="(21) 90000-0000"
                                value={formData.phone}
                                onChangeText={t => updateForm('phone', t)}
                                keyboardType="phone-pad"
                            />
                        </View>
                        <CampoRotulado
                            rotulo="Endereço"
                            placeholder="Rua, número, bairro"
                            value={formData.address} onChangeText={t => updateForm('address', t)}
                        />

                        <View style={{ gap: theme.spacing.sm }}>
                            <Rotulo>Dias de funcionamento</Rotulo>
                            <View
                                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
                                accessibilityRole="radiogroup"
                                accessibilityLabel="Dias de funcionamento"
                            >
                                {daysOptions.map(option => {
                                    const ativo = formData.working_days === option.value;
                                    return (
                                        <Chip
                                            key={option.value}
                                            ativo={ativo}
                                            onPress={() => updateForm('working_days', option.value)}
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: ativo }}
                                            accessibilityLabel={option.label}
                                        >
                                            <ChipTexto ativo={ativo}>{option.label}</ChipTexto>
                                        </Chip>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                            <CampoRotulado
                                flex
                                rotulo="Abre"
                                placeholder="HH:MM"
                                value={formData.opening_time}
                                onChangeText={t => updateForm('opening_time', t)}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                            <Ate>até</Ate>
                            <CampoRotulado
                                flex
                                rotulo="Fecha"
                                placeholder="HH:MM"
                                value={formData.closing_time}
                                onChangeText={t => updateForm('closing_time', t)}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                    </Bloco>

                    <Bloco accessibilityLabel="Seus dados">
                        <SectionLabel>Seus dados</SectionLabel>
                        <CampoRotulado
                            rotulo="Nome completo"
                            placeholder="Seu nome"
                            value={formData.name} onChangeText={t => updateForm('name', t)}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <CampoRotulado
                                flex
                                rotulo="CPF"
                                placeholder="000.000.000-00"
                                value={formData.cpf} onChangeText={t => updateForm('cpf', t)}
                                keyboardType="numeric"
                            />
                            <CampoRotulado
                                flex
                                rotulo="Nascimento"
                                placeholder="DD/MM/AAAA"
                                value={formData.birth_date} onChangeText={t => updateForm('birth_date', t)}
                            />
                        </View>
                        <CampoRotulado
                            rotulo="E-mail"
                            placeholder="E-mail"
                            value={formData.email}
                            editable={false}
                            style={{ opacity: 0.7 }}
                            dica="O e-mail de acesso não pode ser alterado aqui."
                        />
                    </Bloco>

                    <BotaoSalvar
                        onPress={handleSave}
                        disabled={ocupado}
                        inativo={ocupado}
                        accessibilityRole="button"
                        accessibilityLabel="Salvar alterações"
                        accessibilityState={{ disabled: ocupado, busy: loading }}
                    >
                        {loading
                            ? <ActivityIndicator color={theme.colors.onPrimary} />
                            : <BotaoSalvarTexto>Salvar alterações</BotaoSalvarTexto>}
                    </BotaoSalvar>

                    <BotaoExcluir
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        accessibilityRole="button"
                        accessibilityLabel="Excluir minha conta"
                    >
                        {deleting
                            ? <ActivityIndicator color={theme.colors.danger} />
                            : <BotaoExcluirTexto>Excluir minha conta</BotaoExcluirTexto>}
                    </BotaoExcluir>
                </Conteudo>
            </ScrollView>
        </Container>
    );
}
