import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SearchBar } from '@/src/components/SearchBar';
import {
    AddButton,
    AddButtonText,
    Badge,
    BadgeText,
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

const ActionButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
`;

export default function ClientsScreen() {
    const [clients, setClients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('*')
                .eq('gym_id', gymId);
            const { data: plansData, error: plansError } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId);

            if (clientsError) throw clientsError;
            if (plansData) setPlans(plansData);

            if (clientsData) {
                const mappedClients = clientsData.map(c => ({
                    ...c,
                    plano_nome: plansData?.find(p => p.id === c.plan_id)?.name || 'N/A'
                }));
                setClients(mappedClients);
            }
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os clientes.');
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

    const getBadgeColor = (planName: string) => {
        const lower = planName.toLowerCase();
        if (lower.includes('básico')) return { bg: '#7F1D1D', text: '#FCA5A5' }; // red-900, red-300
        if (lower.includes('super')) return { bg: '#713F12', text: '#FDE047' }; // yellow-900, yellow-300
        return { bg: '#14532D', text: '#86EFAC' }; // green-900, green-300
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.plano_nome.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => {
        const badgeColors = getBadgeColor(item.plano_nome);
        return (
            <TouchableOpacity
                onPress={() => router.push({ pathname: '/client-details', params: { id: item.id } })}
                style={{ marginHorizontal: 16, marginBottom: 16 }}
            >
                <ListItem style={{ marginHorizontal: 0, marginBottom: 0 }}>
                    <Row style={{ alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <ListItemTitle>{item.name}</ListItemTitle>
                            <ListItemSubtitle>{item.email}</ListItemSubtitle>
                            <Row style={{ marginTop: 8, justifyContent: 'flex-start' }}>
                                <Badge color={badgeColors.bg}>
                                    <BadgeText color={badgeColors.text}>{item.plano_nome}</BadgeText>
                                </Badge>
                                <ListItemSubtitle style={{ color: theme.colors.primary, fontSize: 12 }}>
                                    Vence dia: {item.due_day || 'N/A'}
                                </ListItemSubtitle>
                            </Row>
                        </View>

                        <Row>
                            <ActionButton onPress={() => router.push({ pathname: '/manage-client', params: { id: item.id } })}>
                                <FontAwesome name="edit" size={20} color={theme.colors.primary} />
                            </ActionButton>
                            <ActionButton onPress={() => handleDelete(item.id, item.name)}>
                                <FontAwesome name="trash" size={20} color={theme.colors.danger} />
                            </ActionButton>
                        </Row>
                    </Row>
                </ListItem>
            </TouchableOpacity>
        );
    };

    return (
        <PageContainer>
            <PageHeader>
                <PageTitle>Clientes</PageTitle>
                <AddButton onPress={() => router.push('/manage-client')}>
                    <AddButtonText>+ Adicionar</AddButtonText>
                </AddButton>
            </PageHeader>

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar clientes por nome, email ou plano..."
            />

            {loading ? (
                <View style={{ padding: 16 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="list-item" />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredClients}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <ListItemSubtitle style={{ textAlign: 'center', marginTop: 20 }}>
                            {searchQuery ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
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
