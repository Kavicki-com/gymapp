import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency, formatCurrencyInput, parseCurrencyToFloat } from '@/src/utils/masks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    Button,
    ButtonText,
    Container,
    FormGroup,
    Input,
    Label,
    Title
} from '../src/components/styled';

const DisclaimerText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  margin-top: ${theme.spacing.xs}px;
  font-style: italic;
`;

const BillingTypeContainer = styled.View`
  flex-direction: row;
  gap: 12px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const BillingTypeButton = styled(TouchableOpacity) <{ selected: boolean }>`
  flex: 1;
  padding: 14px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${({ selected }) => selected ? theme.colors.primary : theme.colors.surface};
  border: 1px solid ${({ selected }) => selected ? theme.colors.primary : theme.colors.border};
  align-items: center;
`;

const BillingTypeText = styled.Text<{ selected: boolean }>`
  color: ${({ selected }) => selected ? theme.colors.background : theme.colors.text};
  font-weight: ${({ selected }) => selected ? 'bold' : 'normal'};
  font-size: ${theme.fontSize.md}px;
`;

export default function ManagePlanScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        services: '',
        billing_type: 'monthly',
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
                        billing_type: plan.billing_type || 'monthly',
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
                billing_type: formData.billing_type,
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
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar a modalidade. Tente novamente.');
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
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32 }}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: theme.colors.textSecondary, borderRadius: 2, opacity: 0.3 }} />
                    </View>
                    <Title>{isEditing ? 'Editar Modalidade' : 'Nova Modalidade'}</Title>

                    <FormGroup>
                        <Label>Nome da Modalidade</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Tipo de Cobrança</Label>
                        <BillingTypeContainer>
                            <BillingTypeButton
                                selected={formData.billing_type === 'monthly'}
                                onPress={() => setFormData({ ...formData, billing_type: 'monthly' })}
                            >
                                <BillingTypeText selected={formData.billing_type === 'monthly'}>Mensal</BillingTypeText>
                            </BillingTypeButton>
                            <BillingTypeButton
                                selected={formData.billing_type === 'annual'}
                                onPress={() => setFormData({ ...formData, billing_type: 'annual' })}
                            >
                                <BillingTypeText selected={formData.billing_type === 'annual'}>Anual</BillingTypeText>
                            </BillingTypeButton>
                        </BillingTypeContainer>
                    </FormGroup>

                    <FormGroup>
                        <Label>Valor (R$) {formData.billing_type === 'annual' ? '- Cobrança Única' : '- Mensal'}</Label>
                        <Input
                            value={formData.price}
                            onChangeText={t => setFormData({ ...formData, price: formatCurrencyInput(t) })}
                            keyboardType="numeric"
                        />
                        <DisclaimerText>
                            Estes valores são apenas para controle administrativo interno da sua unidade e não geram cobranças pelo aplicativo.
                        </DisclaimerText>
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
