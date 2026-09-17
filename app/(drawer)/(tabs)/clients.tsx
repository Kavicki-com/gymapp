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
                        if (error) Alert.alert('Erro', 'Não foi possível excluir o cliente. Tente novamente.');
                        else fetchData();
                    }
                }
            ]
        );
    };

    // Cor do badge por hash estável do nome do plano (C7).
    //
    // A regra anterior casava a string: um plano chamado "Básico" saía
    // vermelho — a mesma cor que o app usa para inadimplência — e qualquer
    // outro nome caía no verde de "em dia". A cor passava um julgamento que
    // ninguém pediu. Vermelho e verde ficam de fora da paleta justamente por
    // já terem significado em outras telas.
    const BADGE_PALETTE = [
        { bg: '#1E3A8A', text: '#93C5FD' }, // blue
        { bg: '#4C1D95', text: '#C4B5FD' }, // violet
        { bg: '#134E4A', text: '#5EEAD4' }, // teal
        { bg: '#713F12', text: '#FDE047' }, // amber
        { bg: '#831843', text: '#F9A8D4' }, // pink
        { bg: '#374151', text: '#D1D5DB' }, // gray
    ];

    const getBadgeColor = (planName: string) => {
        const name = (planName || '').trim();
        if (!name) return BADGE_PALETTE[BADGE_PALETTE.length - 1];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 31 + name.charCodeAt(i)) | 0;
        }
        return BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length];
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
