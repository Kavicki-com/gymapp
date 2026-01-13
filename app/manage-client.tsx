import { supabase } from '@/src/services/supabase';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function ManageClientScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
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

    const loadData = async () => {
        try {
            const { data: plansData } = await supabase.from('plans').select('*');
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
                        phone: client.phone || '',
                        birth_date: client.birth_date || '',
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

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                birth_date: formData.birth_date || null, // Ensure valid date if used, Supabase date format is YYYY-MM-DD
                weight: formData.weight ? parseFloat(formData.weight) : null,
                plan_id: formData.plan_id || null,
                due_day: formData.due_day ? parseInt(formData.due_day) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('clients').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('clients').insert(payload);
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
                <Text className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</Text>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Nome Completo</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.name}
                        onChangeText={t => setFormData({ ...formData, name: t })}
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-300 mb-2">Email</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.email}
                        onChangeText={t => setFormData({ ...formData, email: t })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View className="flex-row justify-between mb-4">
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Telefone</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.phone}
                            onChangeText={t => setFormData({ ...formData, phone: t })}
                            keyboardType="phone-pad"
                        />
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Data Nasc. (YYYY-MM-DD)</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.birth_date}
                            onChangeText={t => setFormData({ ...formData, birth_date: t })}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#6B7280"
                        />
                    </View>
                </View>

                <View className="flex-row justify-between mb-4">
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Peso (kg)</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.weight}
                            onChangeText={t => setFormData({ ...formData, weight: t })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">Dia do Vencimento</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.due_day}
                            onChangeText={t => setFormData({ ...formData, due_day: t })}
                            keyboardType="numeric"
                            placeholder="1-31"
                            placeholderTextColor="#6B7280"
                        />
                    </View>
                </View>

                <View className="mb-8">
                    <Text className="text-gray-300 mb-2">Plano</Text>
                    <View className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <Picker
                            selectedValue={formData.plan_id}
                            onValueChange={(itemValue) => setFormData({ ...formData, plan_id: itemValue })}
                            style={{ color: 'white', backgroundColor: '#1F2937' }}
                            dropdownIconColor="white"
                        >
                            <Picker.Item label="Selecione um plano" value="" />
                            {plans.map(p => <Picker.Item key={p.id} label={`${p.name} - R$ ${p.price}`} value={p.id} color={Platform.OS === 'ios' ? 'black' : 'white'} />)}
                        </Picker>
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
