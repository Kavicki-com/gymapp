import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { ModalHandle } from '@/src/components/ModalHandle';
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
    Row,
    Title
} from '../src/components/styled';

export default function ManageEquipmentScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

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
        brand: '',
        serial_number: '',
        acquisition_date: '',
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
                        brand: data.brand || '',
                        serial_number: data.serial_number || '',
                        acquisition_date: formatISODateToDisplay(data.acquisition_date || ''),
                        cost: formatCurrency(data.cost),
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
                brand: formData.brand,
                serial_number: formData.serial_number,
                acquisition_date: convertDateToISO(formData.acquisition_date),
                cost: formData.cost ? parseCurrencyToFloat(formData.cost) : null,
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
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o aparelho. Tente novamente.');
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
                    <ModalHandle />
                    <Title>{isEditing ? 'Editar Aparelho' : 'Novo Aparelho'}</Title>

                    <FormGroup>
                        <Label>Nome do Aparelho</Label>
                        <Input
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Marca/Modelo</Label>
                        <Input
                            value={formData.brand}
                            onChangeText={t => setFormData({ ...formData, brand: t })}
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Número de Série</Label>
                        <Input
                            value={formData.serial_number}
                            onChangeText={t => setFormData({ ...formData, serial_number: t })}
                        />
                    </FormGroup>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Data de Aquisição</Label>
                            <DateField
                                value={formData.acquisition_date}
                                onChange={v => setFormData({ ...formData, acquisition_date: v })}
                                placeholder="Selecionar"
                                maximumDate={new Date()}
                                accessibilityLabel="Data de aquisição"
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Label>Custo de Aquisição (R$)</Label>
                            <Input
                                value={formData.cost}
                                onChangeText={t => setFormData({ ...formData, cost: formatCurrencyInput(t) })}
                                keyboardType="numeric"
                            />
                        </View>
                    </Row>

                    <Row style={{ marginBottom: 16 }}>
                        <View style={{ width: '48%' }}>
                            <Label>Última manutenção</Label>
                            <DateField
                                value={formData.last_maintenance}
                                onChange={v => setFormData({ ...formData, last_maintenance: v })}
                                placeholder="Selecionar"
                                maximumDate={new Date()}
                                accessibilityLabel="Data da última manutenção"
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

