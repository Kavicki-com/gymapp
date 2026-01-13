import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

export default function EquipmentScreen() {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const { data, error } = await supabase.from('equipment').select('*').order('name');
            if (error) throw error;
            if (data) setEquipment(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os aparelhos.');
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
            `Deseja realmente excluir o aparelho ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('equipment').delete().eq('id', id);
                        if (error) Alert.alert('Erro', error.message);
                        else fetchData();
                    }
                }
            ]
        );
    };

    const getMaintenanceStatus = (lastDate: string, intervalDays: number) => {
        if (!lastDate || !intervalDays) return { status: 'Unknown', color: 'text-gray-400', label: 'Indefinido' };

        const last = new Date(lastDate);
        const next = new Date(last);
        next.setDate(last.getDate() + intervalDays);
        const today = new Date();

        const diffTime = next.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'Overdue', color: 'text-red-500', label: 'Vencida' };
        if (diffDays <= 15) return { status: 'Warning', color: 'text-yellow-500', label: `Vence em ${diffDays}d` };
        return { status: 'OK', color: 'text-green-500', label: 'Em dia' };
    };

    const renderItem = ({ item }: { item: any }) => {
        const status = getMaintenanceStatus(item.last_maintenance, item.maintenance_interval_days);

        return (
            <View className="bg-gray-800 p-5 rounded-lg mb-4 shadow-sm mx-4">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                        <Text className="text-white text-lg font-bold">{item.name}</Text>
                        <Text className="text-gray-400 text-sm mt-1">Última: {item.last_maintenance}</Text>
                        <Text className={`font-bold text-sm mt-1 ${status.color}`}>{status.label}</Text>
                    </View>

                    <View className="ml-4 space-y-4">
                        <Pressable onPress={() => router.push({ pathname: '/manage-equipment', params: { id: item.id } })} className="p-2 mb-2">
                            <FontAwesome name="edit" size={24} color="#EAB308" />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(item.id, item.name)} className="p-2">
                            <FontAwesome name="trash" size={24} color="#EF4444" />
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-900">
            <View className="flex-row justify-between items-center p-4">
                <Text className="text-2xl font-bold text-white">Aparelhos</Text>
                <Pressable
                    onPress={() => router.push('/manage-equipment')}
                    className="bg-yellow-500 px-4 py-2 rounded-lg"
                >
                    <Text className="font-bold text-gray-900">+ Adicionar</Text>
                </Pressable>
            </View>

            <FlatList
                data={equipment}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <Text className="text-gray-500 text-center mt-10">Nenhum aparelho cadastrado.</Text>
                }
            />
        </View>
    );
}
