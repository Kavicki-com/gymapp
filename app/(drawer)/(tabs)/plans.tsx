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

const PerMonth = styled.Text`
  font-size: ${theme.fontSize.sm}px;
  color: ${theme.colors.textSecondary};
  font-weight: normal;
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
    const [refreshing, setRefreshing] = useState(false);
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
                Alert.alert('Erro', 'Não foi possível carregar os planos.');
            }
        } finally {
            setRefreshing(false);
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
        <ListItem>
            <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <PlanName>{item.name}</PlanName>
                    <PriceText>
                        R$ {item.price ? Number(item.price).toFixed(2) : '0.00'}<PerMonth>/mês</PerMonth>
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
                <PageTitle>Planos</PageTitle>
                <AddButton onPress={() => router.push('/manage-plan')}>
                    <AddButtonText>+ Criar Plano</AddButtonText>
                </AddButton>
            </PageHeader>

            <FlatList
                data={plans}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <ListItemSubtitle style={{ textAlign: 'center', marginTop: 20 }}>Nenhum plano cadastrado.</ListItemSubtitle>
                }
            />
        </PageContainer>
    );
}
