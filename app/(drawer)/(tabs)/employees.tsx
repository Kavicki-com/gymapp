import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SearchBar } from '@/src/components/SearchBar';
import {
    AddButton,
    AddButtonText,
    ListItem,
    ListItemSubtitle,
    ListItemTitle,
    PageContainer,
    PageHeader,
    PageTitle,
    Row
} from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

const SalaryText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
  margin-top: ${theme.spacing.xs}px;
`;

const SalaryValue = styled.Text`
  color: ${theme.colors.primary};
  font-weight: bold;
`;

const ActionButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

export default function EmployeesScreen() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('gym_id', gymId)
                .order('name');
            if (error) throw error;
            if (data) setEmployees(data);
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os colaboradores.');
            }
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

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
                        if (error) Alert.alert('Erro', 'Não foi possível excluir o colaborador. Tente novamente.');
                        else fetchData();
                    }
                }
            ]
        );
    };

    const filteredEmployees = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => router.push({ pathname: '/employee-details', params: { id: item.id } })}
            style={{ marginHorizontal: 16, marginBottom: 16 }}
        >
            <ListItem style={{ marginHorizontal: 0, marginBottom: 0 }}>
                <Row style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <ListItemTitle>{item.name}</ListItemTitle>
                        <ListItemSubtitle>{item.email}</ListItemSubtitle>
                        <SalaryText>
                            Salário: <SalaryValue>R$ {item.salary ? Number(item.salary).toFixed(2) : '0.00'}</SalaryValue>
                        </SalaryText>
                    </View>

                    <View style={{ marginLeft: 16 }}>
                        <ActionButton onPress={() => router.push({ pathname: '/manage-employee', params: { id: item.id } })}>
                            <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                        </ActionButton>
                        <ActionButton onPress={() => handleDelete(item.id, item.name)}>
                            <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                        </ActionButton>
                    </View>
                </Row>
            </ListItem>
        </TouchableOpacity>
    );

    return (
        <PageContainer>
            <PageHeader>
                <PageTitle>Colaboradores</PageTitle>
                <AddButton onPress={() => router.push('/manage-employee')}>
                    <AddButtonText>+ Adicionar</AddButtonText>
                </AddButton>
            </PageHeader>

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar colaboradores por nome ou email..."
            />

            {loading ? (
                <View style={{ padding: 16 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="list-item" />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredEmployees}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <ListItemSubtitle style={{ textAlign: 'center', marginTop: 20 }}>
                            {searchQuery ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado.'}
                        </ListItemSubtitle>
                    }
                    initialNumToRender={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}
        </PageContainer>
    );
}
