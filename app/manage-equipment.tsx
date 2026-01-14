import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
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

export default function ManageEquipmentScreen() {
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

    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        last_maintenance: '',
        maintenance_interval_days: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            if (isEditing) {
                const { data, error } = await supabase.from('equipment').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setFormData({
                        name: data.name || '',
                        cost: data.cost ? String(data.cost) : '',
                        last_maintenance: formatISODateToDisplay(data.last_maintenance || ''),
                        maintenance_interval_days: data.maintenance_interval_days ? String(data.maintenance_interval_days) : '',
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
        if (!formData.name) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                cost: formData.cost ? parseFloat(formData.cost) : null,
                last_maintenance: convertDateToISO(formData.last_maintenance),
                maintenance_interval_days: formData.maintenance_interval_days ? parseInt(formData.maintenance_interval_days) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('equipment').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('equipment').insert({ ...payload, gym_id: gymId });
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
                    <Title>{isEditing ? 'Editar Aparelho' : 'Novo Aparelho'}</Title>

                    <FormGroup>
                        <Label>Nome do Aparelho</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Custo de Aquisição (R$)</Label>
                        <Input
                            value={formData.cost}
                            onChangeText={t => setFormData({ ...formData, cost: t })}
                            keyboardType="numeric"
                        />
                    </FormGroup>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Última manutenção</Label>
                            <Input
                                value={formData.last_maintenance}
                                onChangeText={t => setFormData({ ...formData, last_maintenance: formatDate(t) })}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Intervalo (dias)</Label>
                            <Input
                                value={formData.maintenance_interval_days}
                                onChangeText={t => setFormData({ ...formData, maintenance_interval_days: t })}
                                keyboardType="numeric"
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
