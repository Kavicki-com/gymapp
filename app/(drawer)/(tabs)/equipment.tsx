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

const StatusText = styled.Text<{ color: string }>`
  font-weight: bold;
  font-size: ${theme.fontSize.sm}px;
  margin-top: ${theme.spacing.xs}px;
  color: ${({ color }) => color};
`;

const ActionButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

export default function EquipmentScreen() {
    const [equipment, setEquipment] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .eq('gym_id', gymId)
                .order('name');
            if (error) throw error;
            if (data) setEquipment(data);
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os aparelhos.');
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
        if (!lastDate || !intervalDays) return { color: theme.colors.textSecondary, label: 'Indefinido' };

        const last = new Date(lastDate);
        const next = new Date(last);
        next.setDate(last.getDate() + intervalDays);
        const today = new Date();

        const diffTime = next.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: theme.colors.danger, label: 'Vencida' };
        if (diffDays <= 15) return { color: theme.colors.primary, label: `Vence em ${diffDays}d` };
        return { color: theme.colors.success, label: 'Em dia' };
    };

    const renderItem = ({ item }: { item: any }) => {
        const status = getMaintenanceStatus(item.last_maintenance, item.maintenance_interval_days);

        return (
            <ListItem>
                <Row style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <ListItemTitle>{item.name}</ListItemTitle>
                        <ListItemSubtitle>Última: {item.last_maintenance}</ListItemSubtitle>
                        <StatusText color={status.color}>{status.label}</StatusText>
                    </View>

                    <View style={{ marginLeft: 16 }}>
                        <ActionButton onPress={() => router.push({ pathname: '/manage-equipment', params: { id: item.id } })}>
                            <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                        </ActionButton>
                        <ActionButton onPress={() => handleDelete(item.id, item.name)}>
                            <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                        </ActionButton>
                    </View>
                </Row>
            </ListItem>
        );
    };

    return (
        <PageContainer>
            <PageHeader>
                <PageTitle>Aparelhos</PageTitle>
                <AddButton onPress={() => router.push('/manage-equipment')}>
                    <AddButtonText>+ Adicionar</AddButtonText>
                </AddButton>
            </PageHeader>

            <FlatList
                data={equipment}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <ListItemSubtitle style={{ textAlign: 'center', marginTop: 20 }}>Nenhum aparelho cadastrado.</ListItemSubtitle>
                }
            />
        </PageContainer>
    );
}
