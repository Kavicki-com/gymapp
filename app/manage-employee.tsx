import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCPF, formatCurrency, formatCurrencyInput, formatPhone, parseCurrencyToFloat } from '@/src/utils/masks';
import { validateCPF, validateEmail, validatePhone } from '@/src/utils/validations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import {
    Button,
    ButtonText,
    Container,
    FormGroup,
    Input,
    Label,
    Row,
    Title
} from '../src/components/styled';

export default function ManageEmployeeScreen() {
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
        phone: '',
        birth_date: '',
        cpf: '',
        rg: '',
        salary: '',
        role: '',
        ctps: '',
        admission_date: '',
        payment_day: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

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
            if (isEditing) {
                const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setFormData({
                        name: data.name || '',
                        email: data.email || '',
                        phone: formatPhone(data.phone || ''),
                        birth_date: formatISODateToDisplay(data.birth_date),
                        cpf: formatCPF(data.cpf || ''),
                        rg: data.rg || '',
                        salary: formatCurrency(data.salary),
                        role: data.role || '',
                        ctps: data.ctps || '',
                        admission_date: formatISODateToDisplay(data.admission_date),
                        payment_day: data.payment_day ? String(data.payment_day) : '',
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
        if (!formData.name || !formData.email) {
            Alert.alert('Erro', 'Nome e Email são obrigatórios');
            return;
        }

        if (!validateEmail(formData.email)) {
            Alert.alert('Erro', 'Email inválido.');
            return;
        }

        if (formData.phone && !validatePhone(formData.phone)) {
            Alert.alert('Erro', 'Telefone deve ter 11 dígitos.');
            return;
        }

        if (formData.cpf && !validateCPF(formData.cpf)) {
            Alert.alert('Erro', 'CPF inválido.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                birth_date: convertDateToISO(formData.birth_date),
                cpf: formData.cpf,
                rg: formData.rg,
                salary: formData.salary ? parseCurrencyToFloat(formData.salary) : null,
                role: formData.role,
                ctps: formData.ctps,
                admission_date: convertDateToISO(formData.admission_date),
                payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('employees').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('employees').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Container>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: theme.colors.textSecondary, borderRadius: 2, opacity: 0.3 }} />
                    </View>
                    <Title>{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</Title>

                    <FormGroup>
                        <Label>Nome Completo</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Email</Label>
                        <Input
                            value={formData.email}
                            onChangeText={t => setFormData({ ...formData, email: t })}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Função</Label>
                        <Input
                            value={formData.role}
                            onChangeText={t => setFormData({ ...formData, role: t })}
                            placeholder="Ex: Recepcionista, Instrutor..."
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </FormGroup>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Telefone</Label>
                            <Input
                                value={formData.phone}
                                onChangeText={t => setFormData({ ...formData, phone: formatPhone(t) })}
                                keyboardType="phone-pad"
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Data de nascimento</Label>
                            <Input
                                value={formData.birth_date}
                                onChangeText={t => setFormData({ ...formData, birth_date: formatDate(t) })}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>
                    </Row>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>CPF</Label>
                            <Input
                                value={formData.cpf}
                                onChangeText={t => setFormData({ ...formData, cpf: formatCPF(t) })}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>RG</Label>
                            <Input
                                value={formData.rg}
                                onChangeText={t => setFormData({ ...formData, rg: t })}
                                keyboardType="numeric"
                            />
                        </View>
                    </Row>

                    <FormGroup>
                        <Label>Salário (R$)</Label>
                        <Input
                            value={formData.salary}
                            onChangeText={t => setFormData({ ...formData, salary: formatCurrencyInput(t) })}
                            keyboardType="numeric"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>CTPS</Label>
                        <Input
                            value={formData.ctps}
                            onChangeText={t => setFormData({ ...formData, ctps: t })}
                            placeholder="Número da CTPS"
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </FormGroup>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Data de Admissão</Label>
                            <Input
                                value={formData.admission_date}
                                onChangeText={t => setFormData({ ...formData, admission_date: formatDate(t) })}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Dia do Pagamento</Label>
                            <Input
                                value={formData.payment_day}
                                onChangeText={t => setFormData({ ...formData, payment_day: t.replace(/\D/g, '').slice(0, 2) })}
                                placeholder="Ex: 5"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                        </View>
                    </Row>

                    <Button onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#111827" /> : <ButtonText>Salvar</ButtonText>}
                    </Button>
                </ScrollView>
            </Container>
        </KeyboardAvoidingView>
    );
}
