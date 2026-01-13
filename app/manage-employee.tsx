import { supabase } from '@/src/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function ManageEmployeeScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        cpf: '',
        rg: '',
        salary: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            if (isEditing) {
                const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setFormData({
                        name: data.name || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        birth_date: data.birth_date || '',
                        cpf: data.cpf || '',
                        rg: data.rg || '',
                        salary: data.salary ? String(data.salary) : '',
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
                birth_date: formData.birth_date || null,
                cpf: formData.cpf,
                rg: formData.rg,
                salary: formData.salary ? parseFloat(formData.salary) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('employees').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('employees').insert(payload);
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
                <Text className="text-2xl font-bold text-white mb-6">{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</Text>

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
                        <Text className="text-gray-300 mb-2">Nascimento (YYYY-MM-DD)</Text>
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
                        <Text className="text-gray-300 mb-2">CPF</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.cpf}
                            onChangeText={t => setFormData({ ...formData, cpf: t })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-gray-300 mb-2">RG</Text>
                        <TextInput
                            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                            value={formData.rg}
                            onChangeText={t => setFormData({ ...formData, rg: t })}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View className="mb-8">
                    <Text className="text-gray-300 mb-2">Salário (R$)</Text>
                    <TextInput
                        className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                        value={formData.salary}
                        onChangeText={t => setFormData({ ...formData, salary: t })}
                        keyboardType="numeric"
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
