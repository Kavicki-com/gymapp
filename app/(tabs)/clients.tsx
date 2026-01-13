import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

export default function ClientsScreen() {
    const [clients, setClients] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
            const { data: plansData, error: plansError } = await supabase.from('plans').select('*');

            if (clientsError) throw clientsError;
            if (plansData) setPlans(plansData);

            if (clientsData) {
                // Init clients with plan name map
                const mappedClients = clientsData.map(c => ({
                    ...c,
                    plano_nome: plansData?.find(p => p.id === c.plan_id)?.name || 'N/A'
                }));
                setClients(mappedClients);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os clientes.');
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
            `Deseja realmente excluir ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('clients').delete().eq('id', id);
                        if (error) Alert.alert('Erro', error.message);
                        else fetchData();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="bg-gray-800 p-4 rounded-lg mb-3 shadow-sm mx-4">
            <View className="flex-row justify-between items-start">
                <View className="flex-1">
                    <Text className="text-white text-lg font-bold">{item.name}</Text>
                    <Text className="text-gray-400 text-sm mt-1">{item.email}</Text>
                    <View className="flex-row items-center mt-2">
                        <View className={`px-2 py-1 rounded-full mr-2 ${item.plano_nome.toLowerCase().includes('básico') ? 'bg-red-900' :
                                item.plano_nome.toLowerCase().includes('super') ? 'bg-yellow-900' : 'bg-green-900'
                            }`}>
                            <Text className={`text-xs font-bold ${item.plano_nome.toLowerCase().includes('básico') ? 'text-red-300' :
                                    item.plano_nome.toLowerCase().includes('super') ? 'text-yellow-300' : 'text-green-300'
                                }`}>{item.plano_nome}</Text>
                        </View>
                        <Text className="text-gray-500 text-xs text-yellow-500">
                            Vence dia: {item.due_day || 'N/A'}
                        </Text>
                    </View>
                </View>

                <View className="flex-row space-x-4">
                    <Pressable onPress={() => router.push({ pathname: '/manage-client', params: { id: item.id } })} className="p-2">
                        <FontAwesome name="edit" size={20} color="#EAB308" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item.id, item.name)} className="p-2">
                        <FontAwesome name="trash" size={20} color="#EF4444" />
                    </Pressable>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-900">
            <View className="flex-row justify-between items-center p-4">
                <Text className="text-2xl font-bold text-white">Clientes</Text>
                <Pressable
                    onPress={() => router.push('/manage-client')}
                    className="bg-yellow-500 px-4 py-2 rounded-lg"
                >
                    <Text className="font-bold text-gray-900">+ Adicionar</Text>
                </Pressable>
            </View>

            <FlatList
                data={clients}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <Text className="text-gray-500 text-center mt-10">Nenhum cliente cadastrado.</Text>
                }
            />
        </View>
    );
}
