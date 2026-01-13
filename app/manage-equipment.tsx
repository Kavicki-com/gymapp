import { supabase } from '@/src/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function ManageEquipmentScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

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
                        last_maintenance: data.last_maintenance || '',
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
                last_maintenance: formData.last_maintenance || null, // Format YYYY-MM-DD
                maintenance_interval_days: formData.maintenance_interval_days ? parseInt(formData.maintenance_interval_days) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('equipment').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('equipment').insert(payload);
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <View className="flex-1 bg-gray-900 justify-center items-center"><ActivityIndicator color="#EAB308" /></View>;

    return (
        <View className="flex-1 bg-gray-900 p-4">
            <ScrollView>
                <Text className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Aparelho' : 'Novo Aparelho'}</Text>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Nome do Aparelho</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.name}
                        onChangeText={t => setFormData({ ...formData, name: t })}
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Custo de Aquisição (R$)</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.cost}
                        onChangeText={t => setFormData({ ...formData, cost: t })}
                        keyboardType="numeric"
                    />
                </View>

                <View className="flex-row justify-between mb-8">
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Última Manut. (YYYY-MM-DD)</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.last_maintenance}
                            onChangeText={t => setFormData({ ...formData, last_maintenance: t })}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#6B7280"
                        />
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Intervalo (dias)</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.maintenance_interval_days}
                            onChangeText={t => setFormData({ ...formData, maintenance_interval_days: t })}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    className={`bg-yellow-500 p-4 rounded-lg items-center ${loading ? 'opacity-50' : ''}`}
                >
                    {loading ? <ActivityIndicator color="black" /> : <Text className="font-bold text-gray-900 text-lg">Salvar</Text>}
                </Pressable>
            </ScrollView>
        </View>
    );
}
