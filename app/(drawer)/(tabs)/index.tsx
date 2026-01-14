import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import styled from 'styled-components/native';

const ScrollContainer = styled.ScrollView`
  flex: 1;
  background-color: ${theme.colors.background};
  padding: ${theme.spacing.lg}px;
`;

const HeaderTitle = styled.Text`
  font-size: ${theme.fontSize.xxxl}px;
  font-weight: bold;
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.sm}px;
`;

const HeaderSubtitle = styled.Text`
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xl}px;
`;

const StatsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const CardContainer = styled.View<{ fullWidth?: boolean }>`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.lg}px;
  margin-bottom: ${theme.spacing.lg}px;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : '48%')};
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const StatValue = styled.Text`
  color: ${theme.colors.text};
  font-size: ${theme.fontSize.xxl}px;
  font-weight: bold;
`;

const StatLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
`;

const StatSubtext = styled.Text`
  color: ${theme.colors.textMuted};
  font-size: 12px;
  margin-top: ${theme.spacing.xs}px;
`;

const IconContainer = styled.View`
  margin-bottom: ${theme.spacing.sm}px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    clients: 0,
    equipment: 0,
    employees: 0,
    plans: 0,
    expiringRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { session } = useAuth();

  const fetchData = async () => {
    try {
      const gymId = await getCurrentGymId();
      const [
        clientsRes,
        equipmentRes,
        employeesRes,
        plansRes
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
        supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
        supabase.from('plans').select('*', { count: 'exact', head: true }).eq('gym_id', gymId)
      ]);

      setStats({
        clients: clientsRes.count || 0,
        equipment: equipmentRes.count || 0,
        employees: employeesRes.count || 0,
        plans: plansRes.count || 0,
        expiringRevenue: 0,
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const StatCard = ({ title, value, icon, subtext, fullWidth }: any) => (
    <CardContainer fullWidth={fullWidth}>
      <IconContainer>
        <FontAwesome name={icon} size={24} color={theme.colors.primary} />
      </IconContainer>
      <StatValue>{value}</StatValue>
      <StatLabel>{title}</StatLabel>
      {subtext && <StatSubtext>{subtext}</StatSubtext>}
    </CardContainer>
  );

  return (
    <ScrollContainer
      refreshControl={<RefreshControl refreshing={loading || refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <HeaderTitle>Dashboard</HeaderTitle>
      <HeaderSubtitle>Resumo geral da sua academia.</HeaderSubtitle>

      <StatsGrid>
        <StatCard title="Clientes Ativos" value={stats.clients} icon="users" />
        <StatCard title="Aparelhos" value={stats.equipment} icon="codepen" />
        <StatCard title="Colaboradores" value={stats.employees} icon="id-card" />
        <StatCard title="Planos" value={stats.plans} icon="money" />

        <CardContainer fullWidth>
          <Row>
            <View style={{ marginRight: 16 }}>
              <FontAwesome name="warning" size={32} color={theme.colors.primary} />
            </View>
            <View>
              <StatValue>{formatCurrency(stats.expiringRevenue)}</StatValue>
              <StatLabel>A vencer (7 dias) - (Em Desenv.)</StatLabel>
            </View>
          </Row>
        </CardContainer>
      </StatsGrid>
    </ScrollContainer>
  );
}
