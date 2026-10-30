import { CHART_COLORS, DonutChart } from '@/components/DonutChart';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Icon, IconName } from '@/src/components/Icon';
import { Pill, PillTone } from '@/src/components/Pill';
import { BlockTitle, Divider, HeroNumber, Section, SectionLabel } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { agruparCompetencias, resumirCobranca } from '@/src/utils/overdue';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/* Prévia, não lista: o dashboard mostra quem está devendo para dar o empurrão
   até Cobranças, que é onde a cobrança acontece. Passando disto vira a segunda
   cópia da mesma tela — que foi justamente o que o commit 64a040c removeu. */
const PREVIA_ATRASO = 3;

/* Layout do redesign (Claude Design, board "Início"). A coleta de dados e as
   contas são as mesmas de antes; só a apresentação mudou. */

const Conteudo = styled.View`
  padding: ${theme.spacing.lg}px ${theme.spacing.xl}px 40px;
  gap: ${theme.spacing.xl}px;
`;

const Topo = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md}px;
`;

const Data = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const NomeAcademia = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.xxl}px;
  color: ${theme.colors.text};
`;

const Avatar = styled(TouchableOpacity)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  border-width: 1px;
  border-color: ${theme.colors.border};
  background-color: ${theme.colors.surface};
  align-items: center;
  justify-content: center;
`;

const AvatarTexto = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${theme.colors.text};
`;

const Apoio = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const Barra = styled.View`
  height: 8px;
  border-radius: 4px;
  background-color: ${theme.colors.border};
  overflow: hidden;
`;

const BarraCheia = styled.View<{ pct: number }>`
  height: 100%;
  width: ${({ pct }) => pct}%;
  border-radius: 4px;
  background-color: ${theme.colors.primary};
`;

const MiniCartao = styled.View`
  flex: 1;
  background-color: ${theme.colors.elevated};
  border-radius: ${theme.borderRadius.md}px;
  padding: ${theme.spacing.md}px 14px;
  gap: 4px;
`;

const MiniValor = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.lg}px;
  color: ${({ cor }) => cor};
`;

const IconeQuadrado = styled.View<{ bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: ${({ bg }) => bg};
  align-items: center;
  justify-content: center;
`;

const TituloLinha = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.text};
`;

const Nome = styled.Text`
  font-family: ${theme.fonts.medium};
  font-size: 14px;
  color: ${theme.colors.text};
`;

const Valor = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${theme.colors.text};
`;

const ValorDestaque = styled.Text<{ cor?: string }>`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.lg}px;
  color: ${({ cor }) => cor || theme.colors.text};
`;

const LinhaLista = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.md}px;
  min-height: 52px;
  border-top-width: 1px;
  border-top-color: ${theme.colors.divider};
`;

const BotaoPrincipal = styled(TouchableOpacity)`
  min-height: 52px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${theme.colors.primary};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm}px;
`;

const BotaoPrincipalTexto = styled.Text`
  font-family: ${theme.fonts.bold};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.onPrimary};
`;

const LinhaSaude = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
`;

const Rotulo = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const AtalhoCartao = styled(TouchableOpacity)`
  flex: 1;
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.divider};
  border-radius: 16px;
  padding: 14px;
  gap: 2px;
`;

const AtalhoNumero = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 22px;
  color: ${theme.colors.text};
`;

const AtalhoRotulo = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

/** "quinta, 30 de outubro" → "Quinta, 30 de outubro", sem o "-feira". */
const dataDeHoje = () => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace('-feira', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const mesAtual = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });

const iniciaisDe = (nome: string) =>
  nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'GA';

const meses = (n: number) => (n === 1 ? '1 mês' : `${n} meses`);

function CabecalhoBloco({ icone, cor, fundo, titulo, apoio, direita }: {
  icone: IconName;
  cor: string;
  fundo: string;
  titulo: string;
  apoio?: string;
  direita?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 }}>
      <IconeQuadrado bg={fundo}><Icon name={icone} size={20} color={cor} /></IconeQuadrado>
      <View style={{ flex: 1, gap: 2 }}>
        <TituloLinha>{titulo}</TituloLinha>
        {apoio ? <Apoio>{apoio}</Apoio> : null}
      </View>
      {direita}
    </View>
  );
}

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

  const revenuePercentage = monthlyRevenue.expected > 0
    ? Math.min(100, Math.round((monthlyRevenue.received / monthlyRevenue.expected) * 100))
    : 0;

  const margin = monthlyRevenue.expected - totalSalaries;

  // overdueClients também carrega quem está por vencer (daysOverdue < 0); só o
  // atraso de verdade entra no aviso e na prévia.
  const emAtraso = overdueClients.filter(c => c.daysOverdue > 0);
  const overdueCount = emAtraso.length;

  // planPrice × meses, e não planPrice: é a mesma conta da aba Cobranças
  // (valorPlano * mesesEmAtraso). Somando um mês só, o dashboard mostrava um
  // total menor que o da outra tela para exatamente a mesma dívida — e agora
  // que as linhas por aluno aparecem aqui embaixo, elas não fechariam.
  const totalOverdueValue = emAtraso.reduce((sum, c) => sum + c.planPrice * c.overdueMonthsCount, 0);

  const previaAtraso = emAtraso.slice(0, PREVIA_ATRASO);


  const totalSalariosProximos = upcomingSalaries.reduce((sum, s) => sum + s.salary, 0);
  const tomDoSalario = (dias: number): PillTone => (dias <= 3 ? 'soon' : 'neutral');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollArea
          refreshControl={<RefreshControl refreshing={loading || refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          <Conteudo>
            <Topo>
              <View style={{ flex: 1, gap: 2 }}>
                <Data>{dataDeHoje()}</Data>
                <NomeAcademia numberOfLines={1}>{gymName || 'Sua academia'}</NomeAcademia>
              </View>
              <Avatar
                onPress={() => router.push('/(drawer)/(tabs)/more')}
                accessibilityRole="button"
                accessibilityLabel="Perfil e configurações"
              >
                <AvatarTexto>{iniciaisDe(gymName)}</AvatarTexto>
              </Avatar>
            </Topo>

            {loading ? (
              <>
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
              </>
            ) : (
              <>
                {/* Receita do mês */}
                <Section style={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <SectionLabel>{mesAtual()}</SectionLabel>
                    <Apoio>{revenuePercentage}% recebido</Apoio>
                  </View>
                  <View style={{ gap: 4 }}>
                    <HeroNumber adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(monthlyRevenue.received)}</HeroNumber>
                    <Rotulo>de {formatCurrency(monthlyRevenue.expected)} esperados no mês</Rotulo>
                  </View>
                  <Barra><BarraCheia pct={revenuePercentage} /></Barra>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <MiniCartao>
                      <Apoio style={{ fontSize: 12 }}>Em atraso</Apoio>
                      <MiniValor cor={theme.colors.danger}>{formatCurrency(totalOverdueValue)}</MiniValor>
                    </MiniCartao>
                    <MiniCartao>
                      <Apoio style={{ fontSize: 12 }}>Margem prevista</Apoio>
                      <MiniValor cor={margin >= 0 ? theme.colors.success : theme.colors.danger}>
                        {margin >= 0 ? '+ ' : ''}{formatCurrency(margin)}
                      </MiniValor>
                    </MiniCartao>
                  </View>
                </Section>

                <BlockTitle style={{ marginBottom: -8 }}>Pra resolver hoje</BlockTitle>

                {/* Atraso — aviso e prévia dos PREVIA_ATRASO que mais devem.
                    A lista que cobra, com a mensagem pronta, o Pix e o registro
                    do que já foi feito, vive na aba Cobranças. Aqui é só
                    reconhecer os nomes e ir para lá. Sem baixa nem atalho para
                    a ficha, de propósito: meia ação aqui deixaria o dono achando
                    que cobrou quando não cobrou. */}
                <Section style={{ gap: theme.spacing.md }}>
                  <CabecalhoBloco
                    icone="clock"
                    cor={overdueCount > 0 ? theme.colors.danger : theme.colors.success}
                    fundo={overdueCount > 0 ? theme.colors.dangerSoft : theme.colors.successSoft}
                    titulo={overdueCount === 0
                      ? 'Ninguém em atraso'
                      : overdueCount === 1 ? '1 aluno em atraso' : `${overdueCount} alunos em atraso`}
                    apoio={overdueCount === 0 ? 'Todos os pagamentos em dia.' : undefined}
                    direita={overdueCount > 0
                      ? <ValorDestaque cor={theme.colors.danger}>{formatCurrency(totalOverdueValue)}</ValorDestaque>
                      : undefined}
                  />
                  {overdueCount > 0 && (
                    <>
                      <View>
                        {previaAtraso.map(c => (
                          <LinhaLista
                            key={c.id}
                            onPress={() => router.push('/collections')}
                            accessibilityRole="button"
                            accessibilityLabel={`${c.name}, ${meses(c.overdueMonthsCount)} em atraso`}
                          >
                            <Nome style={{ flex: 1 }} numberOfLines={1}>
                              {c.name} <Apoio style={{ fontSize: 14 }}>· {meses(c.overdueMonthsCount)}</Apoio>
                            </Nome>
                            <Valor>{formatCurrency(c.planPrice * c.overdueMonthsCount)}</Valor>
                          </LinhaLista>
                        ))}
                      </View>
                      <BotaoPrincipal
                        onPress={() => router.push('/collections')}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir a aba Cobranças"
                      >
                        <BotaoPrincipalTexto>
                          {overdueCount > previaAtraso.length ? `Cobrar os ${overdueCount}` : 'Começar a cobrar'}
                        </BotaoPrincipalTexto>
                        <Icon name="chevron-right" size={18} color={theme.colors.onPrimary} strokeWidth={2.4} />
                      </BotaoPrincipal>
                    </>
                  )}
                </Section>

                {/* Salários a pagar (próximos 15 dias) */}
                <Section style={{ gap: 4 }}>
                  <CabecalhoBloco
                    icone="card"
                    cor={theme.colors.primary}
                    fundo={theme.colors.primarySoft}
                    titulo="Salários a pagar"
                    apoio={upcomingSalaries.length > 0
                      ? `Próximos 15 dias · total ${formatCurrency(totalSalariosProximos)}`
                      : 'Nenhum pagamento nos próximos 15 dias'}
                  />
                  {upcomingSalaries.map(emp => (
                    <LinhaLista
                      key={emp.id}
                      onPress={() => router.push({ pathname: '/employee-details', params: { id: emp.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`${emp.name}, dia ${emp.paymentDay}`}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Nome numberOfLines={1}>{emp.name}</Nome>
                        <Apoio style={{ fontSize: 12 }}>Dia {emp.paymentDay}</Apoio>
                      </View>
                      <Valor>{formatCurrency(emp.salary)}</Valor>
                      <Pill
                        small
                        tone={tomDoSalario(emp.daysUntil)}
                        label={emp.daysUntil === 0 ? 'Hoje' : `Em ${emp.daysUntil}d`}
                      />
                    </LinhaLista>
                  ))}
                </Section>

                {/* Aniversariantes (próximos 7 dias) */}
                {birthdays.length > 0 && (
                  <Section style={{ gap: 4 }}>
                    <CabecalhoBloco
                      icone="gift"
                      cor={theme.colors.primaryHover}
                      fundo={theme.colors.primarySoft}
                      titulo="Aniversariantes"
                      apoio="Próximos 7 dias"
                    />
                    {birthdays.map(bday => (
                      <LinhaLista
                        key={`${bday.type}-${bday.id}`}
                        onPress={() => router.push({
                          pathname: bday.type === 'client' ? '/client-details' : '/employee-details',
                          params: { id: bday.id },
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={bday.name}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Nome numberOfLines={1}>{bday.name}</Nome>
                          <Apoio style={{ fontSize: 12 }}>{bday.type === 'client' ? 'Aluno' : 'Colaborador'}</Apoio>
                        </View>
                        <Pill
                          small
                          tone={bday.daysUntil === 0 ? 'ok' : 'neutral'}
                          label={bday.daysUntil === 0 ? 'Hoje' : `Em ${bday.daysUntil}d`}
                        />
                      </LinhaLista>
                    ))}
                  </Section>
                )}

                <BlockTitle style={{ marginBottom: -8 }}>Visão geral</BlockTitle>

                {clientsByPlan.length > 0 && (
                  <Section>
                    <DonutChart data={clientsByPlan} />
                  </Section>
                )}

                <Section style={{ gap: 10 }}>
                  <TituloLinha style={{ marginBottom: 4 }}>Saúde financeira</TituloLinha>
                  <LinhaSaude>
                    <Rotulo>Receita esperada</Rotulo>
                    <Valor>{formatCurrency(monthlyRevenue.expected)}</Valor>
                  </LinhaSaude>
                  <LinhaSaude>
                    <Rotulo>Total de salários</Rotulo>
                    <Valor style={{ color: theme.colors.danger }}>− {formatCurrency(totalSalaries)}</Valor>
                  </LinhaSaude>
                  <Divider style={{ marginTop: 2 }} />
                  <LinhaSaude style={{ paddingTop: 2 }}>
                    <Rotulo>Margem</Rotulo>
                    <ValorDestaque
                      style={{ fontSize: 20 }}
                      cor={margin >= 0 ? theme.colors.success : theme.colors.danger}
                    >
                      {margin >= 0 ? '+ ' : ''}{formatCurrency(margin)}
                    </ValorDestaque>
                  </LinhaSaude>
                </Section>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AtalhoCartao onPress={() => router.push('/(drawer)/(tabs)/clients')} accessibilityRole="button">
                    <AtalhoNumero>{stats.clients}</AtalhoNumero>
                    <AtalhoRotulo>alunos</AtalhoRotulo>
                  </AtalhoCartao>
                  <AtalhoCartao onPress={() => router.push('/(drawer)/(tabs)/plans')} accessibilityRole="button">
                    <AtalhoNumero>{stats.plans}</AtalhoNumero>
                    <AtalhoRotulo>planos</AtalhoRotulo>
                  </AtalhoCartao>
                  <AtalhoCartao onPress={() => router.push('/(drawer)/(tabs)/employees')} accessibilityRole="button">
                    <AtalhoNumero>{stats.employees}</AtalhoNumero>
                    <AtalhoRotulo>colaboradores</AtalhoRotulo>
                  </AtalhoCartao>
                </View>
              </>
            )}
          </Conteudo>
        </ScrollArea>
    </View>
  );
}

const ScrollArea = styled.ScrollView`
  flex: 1;
  background-color: ${theme.colors.background};
`;
