import { AlertItem } from '@/components/AlertItem';
import { DashboardSection } from '@/components/DashboardSection';
import { CHART_COLORS, DonutChart } from '@/components/DonutChart';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { supabase } from '@/src/services/supabase';
import { agruparCompetencias, resumirCobranca } from '@/src/utils/overdue';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
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

/* Três lado a lado: 31% cada, com o respiro do space-between entre eles.
   O padding é menor que o do resto do dashboard porque a 31% de um celular
   sobram ~90px úteis — com o padding largo, o rótulo quebrava em três linhas. */
const CardContainer = styled.View`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.md}px ${theme.spacing.sm}px;
  border-radius: ${theme.borderRadius.lg}px;
  margin-bottom: ${theme.spacing.lg}px;
  width: 31.5%;
  align-items: center;
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

/* Rótulo do card compacto: menor e centrado, para caber em duas linhas. */
const StatCardLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.xs}px;
  text-align: center;
  margin-top: 2px;
`;

const IconContainer = styled.View`
  margin-bottom: ${theme.spacing.xs}px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ProgressContainer = styled.View`
  height: 8px;
  background-color: ${theme.colors.border};
  border-radius: 4px;
  margin-top: ${theme.spacing.sm}px;
  overflow: hidden;
`;

const ProgressBar = styled.View<{ width: number; color: string }>`
  height: 100%;
  width: ${({ width }) => width}%;
  background-color: ${({ color }) => color};
  border-radius: 4px;
`;

const HealthRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm}px;
`;

const HealthLabel = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSize.sm}px;
`;

const HealthValue = styled.Text<{ color?: string }>`
  color: ${({ color }) => color || theme.colors.text};
  font-size: ${theme.fontSize.md}px;
  font-weight: bold;
`;

const MarginValue = styled.Text<{ positive: boolean }>`
  color: ${({ positive }) => positive ? theme.colors.success : theme.colors.danger};
  font-size: ${theme.fontSize.xl}px;
  font-weight: bold;
  text-align: center;
  margin-top: ${theme.spacing.sm}px;
`;

const AvisoAtraso = styled(TouchableOpacity)`
  padding: 4px 0 8px;
  align-items: center;
`;

const AvisoValor = styled.Text`
  font-size: ${theme.fontSize.lg}px;
  font-weight: bold;
  color: ${theme.colors.danger};
`;

const AvisoDetalhe = styled.Text`
  font-size: ${theme.fontSize.sm}px;
  color: ${theme.colors.textSecondary};
  margin-top: 2px;
  margin-bottom: 10px;
`;

const ViewAllText = styled.Text`
  color: ${theme.colors.primary};
  font-weight: bold;
  font-size: ${theme.fontSize.md}px;
`;

interface DashboardStats {
  clients: number;
  employees: number;
  plans: number;
}

interface ClientByPlan {
  name: string;
  count: number;
  color: string;
}

interface OverdueClient {
  id: string;
  name: string;
  phone: string;
  daysOverdue: number;
  overdueMonthsCount: number;
  planName: string;
  planPrice: number;
}

interface UpcomingSalary {
  id: string;
  name: string;
  salary: number;
  paymentDay: number;
  daysUntil: number;
}

interface Birthday {
  id: string;
  name: string;
  type: 'client' | 'employee';
  date: Date;
  daysUntil: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gymName, setGymName] = useState('');

  // Basic stats
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    employees: 0,
    plans: 0,
  });

  // Chart data
  const [clientsByPlan, setClientsByPlan] = useState<ClientByPlan[]>([]);

  // Revenue
  const [monthlyRevenue, setMonthlyRevenue] = useState({ received: 0, expected: 0 });

  // Alerts
  const [overdueClients, setOverdueClients] = useState<OverdueClient[]>([]);
  const [upcomingSalaries, setUpcomingSalaries] = useState<UpcomingSalary[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  // Financial health
  const [totalSalaries, setTotalSalaries] = useState(0);

  const fetchData = async () => {
    try {
      const gymId = await getCurrentGymId();
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Fetch gym profile name
      const { data: gymProfile } = await supabase
        .from('gym_profiles')
        .select('gym_name')
        .eq('id', gymId)
        .single();
      if (gymProfile?.gym_name) setGymName(gymProfile.gym_name);

      // Fetch basic counts
      const [clientsRes, employeesRes, plansRes] = await Promise.all([
        supabase.from('clients').select('*').eq('gym_id', gymId),
        supabase.from('employees').select('*').eq('gym_id', gymId),
        supabase.from('plans').select('*').eq('gym_id', gymId),
      ]);

      const clients = clientsRes.data || [];
      const employees = employeesRes.data || [];
      const plans = plansRes.data || [];

      setStats({
        clients: clients.length,
        employees: employees.length,
        plans: plans.length,
      });

      // Clients by Plan (for donut chart)
      const planCounts: Record<string, { name: string; count: number }> = {};
      plans.forEach(plan => {
        planCounts[plan.id] = { name: plan.name, count: 0 };
      });
      clients.forEach(client => {
        if (client.plan_id && planCounts[client.plan_id]) {
          planCounts[client.plan_id].count++;
        }
      });

      const chartData = Object.values(planCounts)
        .filter(p => p.count > 0)
        .map((p, index) => ({
          name: p.name,
          count: p.count,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));
      setClientsByPlan(chartData);

      // Monthly Revenue
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', gymId)
        .is('deleted_at', null)
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endOfMonth);

      const received = (paymentsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const expected = clients.reduce((sum, client) => {
        const plan = plans.find(p => p.id === client.plan_id);
        return sum + (plan?.price || 0);
      }, 0);

      setMonthlyRevenue({ received, expected });

      // Overdue and upcoming payments
      const { data: allPayments } = await supabase
        .from('payments')
        .select('client_id, reference_month')
        .eq('gym_id', gymId)
        .is('deleted_at', null);

      const paymentsMap = agruparCompetencias(allPayments || []);

      const overdueList: OverdueClient[] = [];

      clients.forEach(client => {
        if (client.subscription_locked) return;

        const plan = plans.find(p => p.id === client.plan_id);
        const dueDay = client.due_day || 1;
        const paidMonths = paymentsMap[client.id] || new Set<string>();

        // Regra única (src/utils/overdue). Só conta atraso de quem está ativo,
        // com teto de 3 meses — cadastro nunca usado e aluno que saiu param de
        // somar dívida em vez de acumular para sempre.
        const resumo = resumirCobranca(client, paidMonths);
        if (resumo.coorte !== 'ativo') return;
        const overdueMonthsCount = resumo.mesesEmAtraso;

        // 2. Original daysOverdue logic (for sorting and "due soon" alerts)
        let daysOverdue = 0;
        if (overdueMonthsCount > 0) {
          daysOverdue = currentDay - dueDay;
          if (daysOverdue < 0) daysOverdue += 30;
        } else {
          // Check if due soon (next 5 days)
          let daysUntilDue = dueDay - currentDay;
          if (daysUntilDue < 0) daysUntilDue += 30;

          if (daysUntilDue <= 5 && daysUntilDue >= 0) {
            daysOverdue = -daysUntilDue;
          } else {
            return; // Not relevant
          }
        }

        overdueList.push({
          id: client.id,
          name: client.name,
          phone: client.phone || '',
          daysOverdue,
          overdueMonthsCount,
          planName: plan?.name || 'N/A',
          planPrice: plan?.price || 0,
        });
      });

      // Sort: most overdue first (highest month count), then by daysOverdue
      overdueList.sort((a, b) => b.overdueMonthsCount - a.overdueMonthsCount || b.daysOverdue - a.daysOverdue);
      setOverdueClients(overdueList);

      // Employee Salaries (next 15 days)
      const salaryList: UpcomingSalary[] = [];
      let totalSalarySum = 0;

      employees.forEach(emp => {
        const payDay = emp.payment_day || 5;
        let daysUntil = payDay - currentDay;
        if (daysUntil < 0) daysUntil += 30;

        totalSalarySum += emp.salary || 0;

        if (daysUntil <= 15) {
          salaryList.push({
            id: emp.id,
            name: emp.name,
            salary: emp.salary || 0,
            paymentDay: payDay,
            daysUntil,
          });
        }
      });

      salaryList.sort((a, b) => a.daysUntil - b.daysUntil);
      setUpcomingSalaries(salaryList);
      setTotalSalaries(totalSalarySum);

      // Birthdays (next 7 days)
      const birthdayList: Birthday[] = [];

      const checkBirthday = (person: any, type: 'client' | 'employee') => {
        if (!person.birth_date) return;

        const birthDate = new Date(person.birth_date);
        const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

        // If birthday already passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(currentYear + 1);
        }

        const diffTime = thisYearBirthday.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil >= 0 && daysUntil <= 7) {
          birthdayList.push({
            id: person.id,
            name: person.name,
            type,
            date: thisYearBirthday,
            daysUntil,
          });
        }
      };

      clients.forEach(c => checkBirthday(c, 'client'));
      employees.forEach(e => checkBirthday(e, 'employee'));

      birthdayList.sort((a, b) => a.daysUntil - b.daysUntil);
      setBirthdays(birthdayList);

    } catch (error) {
      console.error('Dashboard fetch error:', error);
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

  const StatCard = ({ title, value, icon, onPress }: { title: string; value: number; icon: string; onPress?: () => void }) => (
    <CardContainer as={onPress ? TouchableOpacity : View} onPress={onPress} activeOpacity={0.7}>
      <IconContainer>
        <FontAwesome name={icon as any} size={20} color={theme.colors.primary} />
      </IconContainer>
      <StatValue>{value}</StatValue>
      <StatCardLabel numberOfLines={2}>{title}</StatCardLabel>
    </CardContainer>
  );

  const revenuePercentage = monthlyRevenue.expected > 0
    ? Math.min(100, Math.round((monthlyRevenue.received / monthlyRevenue.expected) * 100))
    : 0;

  const margin = monthlyRevenue.expected - totalSalaries;
  const overdueCount = overdueClients.filter(c => c.daysOverdue > 0).length;
  const totalOverdueValue = overdueClients
    .filter(c => c.daysOverdue > 0)
    .reduce((sum, c) => sum + c.planPrice, 0);

  return (
    <>
      <ScrollContainer
        refreshControl={<RefreshControl refreshing={loading || refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <HeaderTitle>Bem vindo, {gymName || 'Academia'}!</HeaderTitle>
        <HeaderSubtitle>Resumo geral da sua academia.</HeaderSubtitle>

        {loading ? (
          <>
            <StatsGrid>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLoader key={i} variant="card" />
              ))}
            </StatsGrid>
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </>
        ) : (
          <>
            {/* Basic Stats */}
            <StatsGrid>
              <StatCard title="Clientes" value={stats.clients} icon="users" onPress={() => router.push('/(drawer)/(tabs)/clients')} />
              <StatCard title="Colaboradores" value={stats.employees} icon="id-card" onPress={() => router.push('/(drawer)/(tabs)/employees')} />
              <StatCard title="Planos" value={stats.plans} icon="money" onPress={() => router.push('/(drawer)/(tabs)/plans')} />
            </StatsGrid>

            {/* Donut Chart - Clients by Plan */}
            {clientsByPlan.length > 0 && (
              <DashboardSection title="Clientes por Plano" icon="pie-chart">
                <DonutChart data={clientsByPlan} />
              </DashboardSection>
            )}

            {/* Vencimentos — só o aviso. A lista de quem está em atraso, com a
                mensagem pronta e o Pix, vive na aba Cobranças; repetir aqui era
                duas telas dizendo a mesma coisa, e só uma delas sabe cobrar. */}
            <DashboardSection
              title="Vencimentos"
              icon="exclamation-triangle"
              count={overdueCount}
              isEmpty={overdueCount === 0}
              emptyText="Todos os pagamentos em dia! 🎉"
            >
              <AvisoAtraso onPress={() => router.push('/collections')} activeOpacity={0.7}>
                <AvisoValor>{formatCurrency(totalOverdueValue)} em atraso</AvisoValor>
                <AvisoDetalhe>
                  {overdueCount === 1 ? '1 cliente' : `${overdueCount} clientes`}
                </AvisoDetalhe>
                <ViewAllText>Ver em Cobranças</ViewAllText>
              </AvisoAtraso>
            </DashboardSection>

            {/* Monthly Revenue */}
            <DashboardSection title="Receita do Mês" icon="bar-chart">
              <Row style={{ justifyContent: 'space-between' }}>
                <StatLabel>Recebido</StatLabel>
                <StatValue>{formatCurrency(monthlyRevenue.received)}</StatValue>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <StatLabel>Esperado</StatLabel>
                <StatLabel>{formatCurrency(monthlyRevenue.expected)}</StatLabel>
              </Row>
              <ProgressContainer>
                <ProgressBar
                  width={revenuePercentage}
                  color={revenuePercentage >= 70 ? theme.colors.success : theme.colors.primary}
                />
              </ProgressContainer>
              <StatLabel style={{ textAlign: 'center', marginTop: 8 }}>{revenuePercentage}% recebido</StatLabel>
            </DashboardSection>

            {/* Financial Health */}
            <DashboardSection title="Saúde Financeira" icon="heartbeat">
              <HealthRow>
                <HealthLabel>Receita Esperada</HealthLabel>
                <HealthValue>{formatCurrency(monthlyRevenue.expected)}</HealthValue>
              </HealthRow>
              <HealthRow>
                <HealthLabel>Total de Salários</HealthLabel>
                <HealthValue color={theme.colors.danger}>- {formatCurrency(totalSalaries)}</HealthValue>
              </HealthRow>
              <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }}>
                <HealthLabel style={{ textAlign: 'center' }}>Margem</HealthLabel>
                <MarginValue positive={margin >= 0}>
                  {margin >= 0 ? '+ ' : ''}{formatCurrency(margin)}
                </MarginValue>
              </View>
            </DashboardSection>

            {/* Employee Salaries */}
            <DashboardSection
              title="Salários a Pagar"
              icon="credit-card"
              count={upcomingSalaries.length}
              isEmpty={upcomingSalaries.length === 0}
              emptyText="Nenhum pagamento próximo"
            >
              {upcomingSalaries.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <StatLabel>
                    Total: {formatCurrency(upcomingSalaries.reduce((sum, s) => sum + s.salary, 0))}
                  </StatLabel>
                </View>
              )}
              {upcomingSalaries.map(emp => (
                <AlertItem
                  key={emp.id}
                  title={emp.name}
                  subtitle={`Dia ${emp.paymentDay}`}
                  value={formatCurrency(emp.salary)}
                  statusText={emp.daysUntil === 0 ? 'Hoje' : `Em ${emp.daysUntil}d`}
                  status={emp.daysUntil <= 3 ? 'warning' : 'info'}
                  onPress={() => router.push({ pathname: '/employee-details', params: { id: emp.id } })}
                />
              ))}
            </DashboardSection>

            {/* Birthdays */}
            {birthdays.length > 0 && (
              <DashboardSection
                title="Aniversariantes"
                icon="birthday-cake"
                count={birthdays.length}
              >
                {birthdays.map(bday => (
                  <AlertItem
                    key={`${bday.type}-${bday.id}`}
                    title={bday.name}
                    subtitle={bday.type === 'client' ? 'Cliente' : 'Colaborador'}
                    statusText={bday.daysUntil === 0 ? 'Hoje! 🎉' : `Em ${bday.daysUntil}d`}
                    status={bday.daysUntil === 0 ? 'success' : 'info'}
                    icon="birthday-cake"
                    onPress={() => router.push({
                      pathname: bday.type === 'client' ? '/client-details' : '/employee-details',
                      params: { id: bday.id }
                    })}
                  />
                ))}
              </DashboardSection>
            )}
          </>
        )}
      </ScrollContainer>
    </>
  );
}
