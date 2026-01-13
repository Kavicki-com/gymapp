import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

export default function EmployeesScreen() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const { data, error } = await supabase.from('employees').select('*').order('name');
            if (error) throw error;
            if (data) setEmployees(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os colaboradores.');
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
            `Deseja realmente excluir o colaborador ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('employees').delete().eq('id', id);
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
                    <Text className="text-white text-lg font-bold">{item.name}</Text>
                    <Text className="text-gray-400 text-sm mt-1">{item.email}</Text>
                    <Text className="text-gray-300 text-sm mt-1">
                        Salário: <Text className="font-bold text-yellow-500">R$ {item.salary ? Number(item.salary).toFixed(2) : '0.00'}</Text>
                    </Text>
                </View>

                <View className="ml-4 space-y-4">
                    <Pressable onPress={() => router.push({ pathname: '/manage-employee', params: { id: item.id } })} className="p-2 mb-2">
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
                <Text className="text-2xl font-bold text-white">Colaboradores</Text>
                <Pressable
                    onPress={() => router.push('/manage-employee')}
                    className="bg-yellow-500 px-4 py-2 rounded-lg"
                >
                    <Text className="font-bold text-gray-900">+ Adicionar</Text>
                </Pressable>
            </View>

            <FlatList
                data={employees}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <Text className="text-gray-500 text-center mt-10">Nenhum colaborador cadastrado.</Text>
                }
            />
        </View>
    );
}
