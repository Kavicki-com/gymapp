import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

export default function PlansScreen() {
    const [plans, setPlans] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const { data, error } = await supabase.from('plans').select('*').order('name');
            if (error) throw error;
            if (data) setPlans(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os planos.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir o plano ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('plans').delete().eq('id', id);
                        if (error) Alert.alert('Erro', error.message);
                        else fetchData();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-gray-800 p-5 rounded-lg mb-4 shadow-sm mx-4">
            <View className="flex-row justify-between items-start">
                <View className="flex-1">
                    <Text className="text-yellow-500 text-xl font-bold">{item.name}</Text>
                    <Text className="text-white text-2xl font-bold my-2">
                        R$ {item.price ? Number(item.price).toFixed(2) : '0.00'}<Text className="text-sm text-gray-400 font-normal">/mês</Text>
                    </Text>
                    <Text className="text-gray-300 text-sm">{item.services}</Text>
                </View>

                <View className="ml-4 space-y-4">
                    <Pressable onPress={() => router.push({ pathname: '/manage-plan', params: { id: item.id } })} className="p-2 mb-2">
                        <FontAwesome name="edit" size={24} color="#EAB308" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item.id, item.name)} className="p-2">
                        <FontAwesome name="trash" size={24} color="#EF4444" />
                    </Pressable>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-900">
            <View className="flex-row justify-between items-center p-4">
                <Text className="text-2xl font-bold text-white">Planos</Text>
                <Pressable
                    onPress={() => router.push('/manage-plan')}
                    className="bg-yellow-500 px-4 py-2 rounded-lg"
                >
                    <Text className="font-bold text-gray-900">+ Criar Plano</Text>
                </Pressable>
            </View>

            <FlatList
                data={plans}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <Text className="text-gray-500 text-center mt-10">Nenhum plano cadastrado.</Text>
                }
            />
        </View>
    );
}
