import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/services/supabase';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

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
      const [
        clientsRes,
        equipmentRes,
        employeesRes,
        plansRes
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('equipment').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('plans').select('*')
      ]);

      const clients = clientsRes.data || [];
      const plans = plansRes.data || [];

      // Calculate expiring revenue
      const today = new Date();
      let expiringRevenue = 0;

      clients.forEach(client => {
        // Mock calculation since we don't have real expiration dates in schema strictly yet,
        // relying on 'due_day' or previously defined 'data_vencimento'.
        // Schema has 'due_day' (integer). Let's assume due_day is day of month.
        if (client.due_day) {
          // Simple logic: if due day is within next 7 days from today.day
          // This is approximate.
          // Or sticking to schema: 'due_day'.
          // Let's just count total active for now or improve logic if needed.
          // Previous web code used 'data_vencimento' (date).
          // My schema has 'due_day' INTEGER. 
          // I will assume for migration I might need to adjust or calculate.
        }
      });

      // For migration parity, let's just count totals for now.

      setStats({
        clients: clientsRes.data?.length || 0,
        equipment: equipmentRes.count || 0,
        employees: employeesRes.count || 0,
        plans: plansRes.data?.length || 0,
        expiringRevenue: 0, // Placeholder
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <View className="bg-gray-800 p-4 rounded-xl mb-4 w-[48%] shadow-md">
      <FontAwesome name={icon} size={24} color="#EAB308" style={{ marginBottom: 8 }} />
      <Text className="text-white text-2xl font-bold">{value}</Text>
      <Text className="text-gray-400 text-sm">{title}</Text>
      {subtext && <Text className="text-gray-500 text-xs mt-1">{subtext}</Text>}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-900 p-4"
      refreshControl={<RefreshControl refreshing={loading || refreshing} onRefresh={onRefresh} tintColor="#EAB308" />}
    >
      <Text className="text-3xl font-bold text-white mb-2">Dashboard</Text>
      <Text className="text-gray-400 mb-6">Resumo geral da sua academia.</Text>

      <View className="flex-row flex-wrap justify-between">
        <StatCard title="Clientes Ativos" value={stats.clients} icon="users" />
        <StatCard title="Aparelhos" value={stats.equipment} icon="codepen" />
        <StatCard title="Colaboradores" value={stats.employees} icon="id-card" />
        <StatCard title="Planos" value={stats.plans} icon="money" />

        <View className="bg-gray-800 p-4 rounded-xl mb-4 w-full shadow-md flex-row items-center">
          <View className="mr-4">
            <FontAwesome name="warning" size={32} color="#EAB308" />
          </View>
          <View>
            <Text className="text-white text-xl font-bold">R$ {stats.expiringRevenue.toFixed(2)}</Text>
            <Text className="text-gray-400 text-sm">A vencer (7 dias) - (Em Desenv.)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
