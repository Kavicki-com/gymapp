import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency, formatCurrencyInput, parseCurrencyToFloat } from '@/src/utils/masks';
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
    Title
} from '../src/components/styled';

export default function ManagePlanScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        services: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            if (isEditing) {
                const { data: plan, error } = await supabase.from('plans').select('*').eq('id', id).single();
                if (error) throw error;
                if (plan) {
                    setFormData({
                        name: plan.name || '',
                        price: formatCurrency(plan.price),
                        services: plan.services || '',
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
        if (!formData.name || !formData.price) {
            Alert.alert('Erro', 'Nome e Preço são obrigatórios');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                price: parseCurrencyToFloat(formData.price),
                services: formData.services,
            };

            if (isEditing) {
                const { error } = await supabase.from('plans').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('plans').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <Container style={{ justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={theme.colors.primary} /></Container>;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <Container>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: theme.colors.textSecondary, borderRadius: 2, opacity: 0.3 }} />
                    </View>
                    <Title>{isEditing ? 'Editar Plano' : 'Novo Plano'}</Title>

                    <FormGroup>
                        <Label>Nome do Plano</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Valor (R$)</Label>
                        <Input
                            value={formData.price}
                            onChangeText={t => setFormData({ ...formData, price: formatCurrencyInput(t) })}
                            keyboardType="numeric"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Serviços Incluídos</Label>
                        <Input
                            value={formData.services}
                            onChangeText={t => setFormData({ ...formData, services: t })}
                            multiline
                            textAlignVertical="top"
                            style={{ minHeight: 100 }}
                        />
                    </FormGroup>

                    <Button onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#111827" /> : <ButtonText>Salvar</ButtonText>}
                    </Button>
                </ScrollView>
            </Container>
        </KeyboardAvoidingView>
    );
}
