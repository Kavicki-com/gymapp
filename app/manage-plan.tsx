import { supabase } from '@/src/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

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
                        price: plan.price ? String(plan.price) : '',
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
                price: parseFloat(formData.price),
                services: formData.services,
            };

            if (isEditing) {
                const { error } = await supabase.from('plans').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('plans').insert(payload);
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
                <Text className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Plano' : 'Novo Plano'}</Text>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Nome do Plano</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.name}
                        onChangeText={t => setFormData({ ...formData, name: t })}
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Valor (R$)</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.price}
                        onChangeText={t => setFormData({ ...formData, price: t })}
                        keyboardType="numeric"
                    />
                </View>

                <View className="mb-8">
                    <Text className="text-gray-300 mb-2">Serviços Incluídos</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700 min-h-[100px]"
                        value={formData.services}
                        onChangeText={t => setFormData({ ...formData, services: t })}
                        multiline
                        textAlignVertical="top"
                    />
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
