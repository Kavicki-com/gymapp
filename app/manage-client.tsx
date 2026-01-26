import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCPF, formatPhone } from '@/src/utils/masks';
import { validateCPF, validateEmail, validatePhone } from '@/src/utils/validations';
import { Picker } from '@react-native-picker/picker';
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
    PickerContainer,
    Row,
    Title
} from '../src/components/styled';

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
    const [plans, setPlans] = useState<any[]>([]);
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
        if (!formData.name || !formData.email) {
            Alert.alert('Erro', 'Nome e Email são obrigatórios');
            return;
        }

        if (!validateEmail(formData.email)) {
            Alert.alert('Erro', 'Email inválido.');
            return;
        }

        if (formData.cpf && !validateCPF(formData.cpf)) {
            Alert.alert('Erro', 'CPF inválido.');
            return;
        }

        if (formData.phone && !validatePhone(formData.phone)) {
            Alert.alert('Erro', 'Telefone deve ter 11 dígitos.');
            return;
        }

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
                        <Label>CPF</Label>
                        <Input
                            value={formData.cpf}
                            onChangeText={t => setFormData({ ...formData, cpf: formatCPF(t) })}
                            keyboardType="number-pad"
                            maxLength={14}
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
                            <Label>Peso (kg)</Label>
                            <Input
                                value={formData.weight}
                                onChangeText={t => setFormData({ ...formData, weight: t })}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Dia do Vencimento</Label>
                            <Input
                                value={formData.due_day}
                                onChangeText={t => setFormData({ ...formData, due_day: t })}
                                keyboardType="numeric"
                                placeholder="1-31"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
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
