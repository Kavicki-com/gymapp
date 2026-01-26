import { SkeletonLoader } from '@/components/SkeletonLoader';
import { SearchBar } from '@/src/components/SearchBar';
import {
    AddButton,
    AddButtonText,
    ListItem,
    ListItemSubtitle,
    PageContainer,
    PageHeader,
    PageTitle,
    Row
} from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

const PlanName = styled.Text`
  color: ${theme.colors.primary};
  font-size: ${theme.fontSize.xl}px;
  font-weight: bold;
`;

const PriceText = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.xxl}px;
  font-weight: bold;
  margin-vertical: ${theme.spacing.sm}px;
`;

const ServicesText = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
`;

const ActionButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

export default function PlansScreen() {
    const [plans, setPlans] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId)
                .order('name');
            if (error) throw error;
            if (data) setPlans(data);
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar as modalidades.');
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
            `Deseja realmente excluir a modalidade ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('plans').delete().eq('id', id);
                        if (error) Alert.alert('Erro', 'Não foi possível excluir a modalidade. Tente novamente.');
                        else fetchData();
                    }
                }
            ]
        );
    };

    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.services && plan.services.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderItem = ({ item }: { item: any }) => (
        <ListItem>
            <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <PlanName>{item.name}</PlanName>
                    <PriceText>
                        {formatCurrency(item.price || 0)}
                    </PriceText>
                    <ServicesText>{item.services}</ServicesText>
                </View>

                <View style={{ marginLeft: 16 }}>
                    <ActionButton onPress={() => router.push({ pathname: '/manage-plan', params: { id: item.id } })}>
                        <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                    </ActionButton>
                    <ActionButton onPress={() => handleDelete(item.id, item.name)}>
                        <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                    </ActionButton>
                </View>
            </Row>
        </ListItem>
    );

    return (
        <PageContainer>
            <PageHeader>
                <PageTitle>Modalidades</PageTitle>
                <AddButton onPress={() => router.push('/manage-plan')}>
                    <AddButtonText>+ Criar Modalidade</AddButtonText>
                </AddButton>
            </PageHeader>

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar modalidades..."
            />

            {loading ? (
                <View style={{ padding: 16 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="list-item" />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredPlans}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <ListItemSubtitle style={{ textAlign: 'center', marginTop: 20 }}>
                            {searchQuery ? 'Nenhuma modalidade encontrada.' : 'Nenhuma modalidade cadastrada.'}
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
