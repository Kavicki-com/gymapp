import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCPF, formatPhone } from '@/src/utils/masks';
import { validateBirthDate, validateCPF, validateDueDay, validateEmail, validatePhone, validateWeight } from '@/src/utils/validations';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    FormGroup,
    Input,
    Label,
    PickerContainer,
    Row,
    Title
} from '../src/components/styled';

const ErrorText = styled.Text`
  color: ${theme.colors.danger};
  font-size: ${theme.fontSize.xs}px;
  margin-top: 4px;
  margin-bottom: 4px;
`;

export default function ManageClientScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

    const formatDate = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        if (cleaned.length > 4) formatted = `${formatted.slice(0, 5)}/${formatted.slice(5, 9)}`;
        return formatted;
    };

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        birth_date: '',
        weight: '',
        plan_id: '',
        due_day: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const updateField = (field: string, value: string) => {
        clearError(field);
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return null;
        if (dateStr.includes('-')) return dateStr;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };

    const formatISODateToDisplay = (isoDate: string) => {
        if (!isoDate) return '';
        if (isoDate.includes('/')) return isoDate;
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const loadData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data: plansData } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId);
            if (plansData) {
                setPlans(plansData);
                if (!isEditing && plansData.length > 0) {
                    setFormData(prev => ({ ...prev, plan_id: plansData[0].id }));
                }
            }

            if (isEditing) {
                const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).single();
                if (error) throw error;
                if (client) {
                    setFormData({
                        name: client.name || '',
                        email: client.email || '',
                        cpf: client.cpf ? formatCPF(client.cpf) : '',
                        phone: formatPhone(client.phone || ''),
                        birth_date: formatISODateToDisplay(client.birth_date),
                        weight: client.weight ? String(client.weight) : '',
                        plan_id: client.plan_id || '',
                        due_day: client.due_day ? String(client.due_day) : '',
                    });
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Falha ao carregar dados.');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!formData.name) newErrors.name = 'Nome é obrigatório.';
        if (!formData.email) newErrors.email = 'Email é obrigatório.';
        else if (!validateEmail(formData.email)) newErrors.email = 'Email inválido.';

        // Optional fields with validation
        if (formData.cpf && !validateCPF(formData.cpf)) {
            newErrors.cpf = 'CPF inválido.';
        }

        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Telefone deve ter 11 dígitos (DD + número).';
        }

        if (formData.birth_date) {
            const birthResult = validateBirthDate(formData.birth_date);
            if (!birthResult.valid) newErrors.birth_date = birthResult.message;
        }

        if (formData.weight) {
            const weightResult = validateWeight(formData.weight);
            if (!weightResult.valid) newErrors.weight = weightResult.message;
        }

        if (formData.due_day) {
            const dueDayResult = validateDueDay(formData.due_day);
            if (!dueDayResult.valid) newErrors.due_day = dueDayResult.message;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                cpf: formData.cpf,
                phone: formData.phone,
                birth_date: convertDateToISO(formData.birth_date),
                weight: formData.weight ? parseFloat(formData.weight) : null,
                plan_id: formData.plan_id || null,
                due_day: formData.due_day ? parseInt(formData.due_day) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('clients').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('clients').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o cliente. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <Container>
            <SkeletonLoader variant="form" />
        </Container>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Container>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 50 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: theme.colors.textSecondary, borderRadius: 2, opacity: 0.3 }} />
                    </View>
                    <Title>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</Title>

                    <FormGroup>
                        <Label>Nome Completo</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => updateField('name', t)}
                            style={errors.name ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                        />
                        {errors.name && <ErrorText>{errors.name}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                        <Label>Email</Label>
                        <Input
                            value={formData.email}
                            onChangeText={t => updateField('email', t)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={errors.email ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                        />
                        {errors.email && <ErrorText>{errors.email}</ErrorText>}
                    </FormGroup>

                    <FormGroup>
                        <Label>CPF</Label>
                        <Input
                            value={formData.cpf}
                            onChangeText={t => updateField('cpf', formatCPF(t))}
                            keyboardType="number-pad"
                            maxLength={14}
                            style={errors.cpf ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                        />
                        {errors.cpf && <ErrorText>{errors.cpf}</ErrorText>}
                    </FormGroup>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Telefone</Label>
                            <Input
                                value={formData.phone}
                                onChangeText={t => updateField('phone', formatPhone(t))}
                                keyboardType="phone-pad"
                                style={errors.phone ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                            />
                            {errors.phone && <ErrorText>{errors.phone}</ErrorText>}
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Data de nascimento</Label>
                            <Input
                                value={formData.birth_date}
                                onChangeText={t => updateField('birth_date', formatDate(t))}
                                placeholder="DD/MM/AAAA"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                                style={errors.birth_date ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                            />
                            {errors.birth_date && <ErrorText>{errors.birth_date}</ErrorText>}
                        </View>
                    </Row>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Peso (kg)</Label>
                            <Input
                                value={formData.weight}
                                onChangeText={t => updateField('weight', t)}
                                keyboardType="numeric"
                                style={errors.weight ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                            />
                            {errors.weight && <ErrorText>{errors.weight}</ErrorText>}
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Dia do Vencimento</Label>
                            <Input
                                value={formData.due_day}
                                onChangeText={t => {
                                    // Only allow numbers and limit to 31
                                    const cleaned = t.replace(/\D/g, '');
                                    if (cleaned === '' || (parseInt(cleaned) >= 0 && parseInt(cleaned) <= 31)) {
                                        updateField('due_day', cleaned);
                                    }
                                }}
                                keyboardType="numeric"
                                placeholder="1-31"
                                placeholderTextColor={theme.colors.textSecondary}
                                maxLength={2}
                                style={errors.due_day ? { borderColor: theme.colors.danger, borderWidth: 1 } : {}}
                            />
                            {errors.due_day && <ErrorText>{errors.due_day}</ErrorText>}
                        </View>
                    </Row>

                    <FormGroup>
                        <Label>Modalidade</Label>
                        <PickerContainer>
                            <Picker
                                selectedValue={formData.plan_id}
                                onValueChange={(itemValue) => setFormData({ ...formData, plan_id: itemValue })}
                                style={{ color: 'white', backgroundColor: theme.colors.inputBackground }}
                                dropdownIconColor="white"
                            >
                                <Picker.Item label="Selecione uma modalidade" value="" color="white" />
                                {plans.map(p => <Picker.Item key={p.id} label={`${p.name} - R$ ${p.price}`} value={p.id} color="white" />)}
                            </Picker>
                        </PickerContainer>
                    </FormGroup>

                    <Button onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#111827" /> : <ButtonText>Salvar</ButtonText>}
                    </Button>
                </ScrollView>
            </Container>
        </KeyboardAvoidingView>
    );
}
