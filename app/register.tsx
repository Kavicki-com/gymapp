import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    Input,
    Title
} from '../src/components/styled';
import { theme } from '../src/styles/theme';
import { formatCNPJ, formatCPF, formatPhone } from '../src/utils/masks';
import { validateCPF, validateEmail, validatePassword, validatePhone } from '../src/utils/validations';

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

const Label = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  font-weight: 500;
`;

const StyledImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const ProgressContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
  padding-horizontal: 20px;
`;

const ProgressStep = styled.View<{ active?: boolean }>`
  flex: 1;
  height: 8px;
  background-color: ${({ active }) => (active ? theme.colors.primary : theme.colors.surface)};
  border-radius: 4px;
  margin-horizontal: 4px;
`;

const LabelsContainer = styled.View`
  flex-direction: row;
  padding-horizontal: 20px;
  margin-bottom: 32px;
`;

const StepLabel = styled.Text<{ active?: boolean }>`
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: ${({ active }) => (active ? theme.colors.primary : theme.colors.textSecondary)};
  font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 12px;
  padding-top: 50px;
  margin-bottom: 24px;
`;

const BackButton = styled(TouchableOpacity)`
  padding: 8px;
  margin-right: 12px;
`;

const HeaderTitle = styled(Title)`
  flex: 1;
  text-align: center;
  margin: 0;
  padding-right: 40px;
`;

const steps = ['Contato', 'Dados Pessoais', 'Dados do Negócio'];

const ProgressBar = ({ currentStep }: { currentStep: number }) => (
    <View>
        <ProgressContainer>
            {steps.map((_, index) => (
                <ProgressStep key={index} active={currentStep >= index + 1} />
            ))}
        </ProgressContainer>
        <LabelsContainer>
            {steps.map((label, index) => (
                <StepLabel key={index} active={currentStep >= index + 1}>
                    {label}
                </StepLabel>
            ))}
        </LabelsContainer>
    </View>
);

const StepContent = styled.View`
    flex: 1;
`;

const FormArea = styled.View`
    padding-top: 32px;
    padding-bottom: 16px;
    padding-horizontal: 12px;
`;

const ButtonContainer = styled.View`
    padding: 20px 12px;
    padding-bottom: 30px;
`;

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

const LoadingOverlay = styled.View`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${theme.colors.background};
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const LoadingText = styled.Text`
    color: ${theme.colors.text};
    font-size: ${theme.fontSize.md}px;
    margin-top: ${theme.spacing.md}px;
`;

export default function RegisterScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        // Contact
        name: '',
        email: '',
        password: '',
        phone: '',

        // Personal
        cpf: '',
        birth_date: '',

        // Business
        gym_name: '',
        address: '',
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

    const formatDate = (text: string) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;

        if (cleaned.length > 2) {
            formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        if (cleaned.length > 4) {
            formatted = `${formatted.slice(0, 5)}/${formatted.slice(5, 9)}`;
        }

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
        if (key === 'cpf') value = formatCPF(value);
        if (key === 'cnpj') value = formatCNPJ(value);
        if (key === 'phone') value = formatPhone(value);
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

    const validateStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.password || !formData.phone) {
                Alert.alert('Erro', 'Preencha todos os campos.');
                return false;
            }
            if (!validateEmail(formData.email)) {
                Alert.alert('Erro', 'Email inválido.');
                return false;
            }
            if (!validatePhone(formData.phone)) {
                Alert.alert('Erro', 'Telefone deve ter 11 dígitos (DDD + número).');
                return false;
            }
            if (!validatePassword(formData.password)) {
                Alert.alert('Erro', 'A senha deve ter mais de 6 caracteres, incluir letras, números e um caractere especial.');
                return false;
            }
        } else if (step === 2) {
            if (!formData.cpf || !formData.birth_date) {
                Alert.alert('Erro', 'Preencha CPF e Data de Nascimento.');
                return false;
            }
            if (!validateCPF(formData.cpf)) {
                Alert.alert('Erro', 'CPF inválido.');
                return false;
            }
        } else if (step === 3) {
            if (!formData.gym_name || !formData.address || !formData.cnpj) {
                Alert.alert('Erro', 'Preencha Nome da Academia, Endereço e CNPJ.');
                return false;
            }
            if (!formData.working_days || !formData.opening_time || !formData.closing_time) {
                Alert.alert('Erro', 'Preencha todos os campos de dias e horários de funcionamento.');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) setStep(prev => prev + 1);
    };

    const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };

    const handleRegister = async () => {
        if (!validateStep()) return;

        setLoading(true);

        try {
            // 1. Sign Up (if not already logged in)
            let userId = null;
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                userId = user.id;
            } else {
                // Dynamic redirect URL: Expo Go (dev) vs Production build
                const redirectUrl = Constants.appOwnership === 'expo'
                    ? Linking.createURL('confirm-email')
                    : 'gymapp://confirm-email';

                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: { full_name: formData.name },
                        emailRedirectTo: redirectUrl
                    }
                });

                if (authError) {
                    // Se o usuário já existe, tentamos logar para permitir recriar o perfil
                    if (authError.message.includes("User already registered") || authError.message.includes("already registered")) {
                        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                            email: formData.email,
                            password: formData.password
                        });

                        if (signInError) {
                            Alert.alert('Conta Existente', 'Este email já possui cadastro. Se você está tentando recuperar seu perfil, certifique-se de usar a senha correta.');
                            throw new Error('Falha ao autenticar usuário existente.');
                        }

                        if (signInData.user) {
                            userId = signInData.user.id;
                        } else {
                            throw new Error('Falha ao obter ID do usuário após login.');
                        }
                    } else {
                        throw authError;
                    }
                } else {
                    if (!authData.user) throw new Error('Falha ao criar usuário.');
                    userId = authData.user.id;

                    // IMPORTANTE: Fazer login para criar sessão ativa
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: formData.email,
                        password: formData.password
                    });

                    if (signInError) {
                        console.log('Auto-login após signUp falhou:', signInError.message);
                    }
                }
            }

            // 2. Create or Update Gym Profile (NO LOGO UPLOAD)
            if (!userId) throw new Error('ID do usuário não identificado.');

            const { data: existingProfile } = await supabase
                .from('gym_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            const profileData = {
                user_id: userId,
                gym_name: formData.gym_name,
                address: formData.address,
                opening_hours: `${formData.working_days} - ${formData.opening_time} às ${formData.closing_time}`,
                cnpj: formData.cnpj,
                owner_cpf: formData.cpf,
                owner_birth_date: convertDateToISO(formData.birth_date),
                phone: formData.phone,
            };

            let profileError;
            if (existingProfile) {
                const { error } = await supabase
                    .from('gym_profiles')
                    .update(profileData)
                    .eq('user_id', userId);
                profileError = error;
            } else {
                const { error } = await supabase
                    .from('gym_profiles')
                    .insert(profileData);
                profileError = error;
            }

            if (profileError) throw profileError;

            // Redirecionar para tela de confirmação de email OU Login se for recriação
            // Se foi recriação (user existia), talvez não precise confirmar email se já estava confirmado.
            // Para simplificar, mandamos para confirm-email que vai checar sessão.
            router.replace('/confirm-email');
        } catch (error: any) {
            Alert.alert('Erro no Cadastro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <StepContent>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <HeaderContainer>
                    <BackButton onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <HeaderTitle>Cadastro</HeaderTitle>
                </HeaderContainer>
                <ProgressBar currentStep={1} />
                <FormArea>
                    <Input
                        placeholder="Nome Completo"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.name} onChangeText={t => updateForm('name', t)}
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="Email"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.email} onChangeText={t => updateForm('email', t)}
                        keyboardType="email-address" autoCapitalize="none"
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="Senha"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.password} onChangeText={t => updateForm('password', t)}
                        secureTextEntry
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="Telefone"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.phone} onChangeText={t => updateForm('phone', t)}
                        keyboardType="phone-pad"
                        style={{ marginBottom: 12 }}
                    />
                </FormArea>
            </ScrollView>
            <ButtonContainer>
                <Button onPress={handleNext}>
                    <ButtonText>Próximo</ButtonText>
                </Button>
            </ButtonContainer>
        </StepContent>
    );

    // Step 2: CPF and Birth Date
    const renderStep2 = () => (
        <StepContent>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <HeaderContainer>
                    <BackButton onPress={() => setStep(1)}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <HeaderTitle>Cadastro</HeaderTitle>
                </HeaderContainer>
                <ProgressBar currentStep={2} />
                <FormArea>
                    <Input
                        placeholder="CPF"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.cpf} onChangeText={t => updateForm('cpf', t)}
                        keyboardType="numeric"
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.birth_date} onChangeText={t => updateForm('birth_date', t)}
                        keyboardType="numeric"
                        maxLength={10}
                        style={{ marginBottom: 12 }}
                    />
                </FormArea>
            </ScrollView>
            <ButtonContainer>
                <Button onPress={handleNext}>
                    <ButtonText>Próximo</ButtonText>
                </Button>
            </ButtonContainer>
        </StepContent>
    );

    const renderStep3 = () => (
        <StepContent>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <HeaderContainer>
                    <BackButton onPress={() => setStep(2)}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <HeaderTitle>Cadastro</HeaderTitle>
                </HeaderContainer>
                <ProgressBar currentStep={3} />
                <FormArea>
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <LogoContainer onPress={pickImage}>
                            {formData.logo_uri ? (
                                <StyledImage source={{ uri: formData.logo_uri }} />
                            ) : (
                                <FontAwesome name="camera" size={30} color={theme.colors.textSecondary} />
                            )}
                        </LogoContainer>
                        <HelperText>Toque para adicionar Logo</HelperText>
                    </View>

                    <Input
                        placeholder="Nome da Academia"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.gym_name} onChangeText={t => updateForm('gym_name', t)}
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="CNPJ"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.cnpj} onChangeText={t => updateForm('cnpj', t)}
                        keyboardType="numeric"
                        style={{ marginBottom: 12 }}
                    />
                    <Input
                        placeholder="Endereço"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.address} onChangeText={t => updateForm('address', t)}
                        style={{ marginBottom: 12 }}
                    />

                    <Label style={{ marginBottom: 8 }}>Dias de Funcionamento</Label>
                    <PickerContainer>
                        <PickerButton onPress={() => setShowDaysPicker(true)}>
                            <PickerButtonText hasValue={!!formData.working_days}>
                                {formData.working_days ? daysOptions.find(d => d.value === formData.working_days)?.label : 'Selecione os dias'}
                            </PickerButtonText>
                            <FontAwesome name="chevron-down" size={16} color={theme.colors.textSecondary} />
                        </PickerButton>
                    </PickerContainer>

                    <Label style={{ marginBottom: 8 }}>Horário de Funcionamento</Label>
                    <TimeRow>
                        <TimeInputContainer>
                            <Input
                                placeholder="HH:MM"
                                placeholderTextColor={theme.colors.textSecondary}
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
                                placeholderTextColor={theme.colors.textSecondary}
                                value={formData.closing_time}
                                onChangeText={t => updateForm('closing_time', t)}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </TimeInputContainer>
                    </TimeRow>
                </FormArea>
            </ScrollView>
            <ButtonContainer>
                <Button variant="success" onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <ButtonText variant="success">Finalizar</ButtonText>}
                </Button>
            </ButtonContainer>

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
        </StepContent>
    );

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </KeyboardAvoidingView>

            {loading && (
                <LoadingOverlay>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <LoadingText>Criando sua conta...</LoadingText>
                </LoadingOverlay>
            )}
        </Container>
    );
}
