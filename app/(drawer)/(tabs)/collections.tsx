import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
    ListItem,
    ListItemSubtitle,
    ListItemTitle,
    PageContainer,
    PageHeader,
    PageTitle,
    Row,
} from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { agruparCompetencias, resumirCobranca } from '@/src/utils/overdue';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Cobranças — quem está devendo de verdade.
 *
 * "De verdade" é o ponto: a lista usa a regra de src/utils/overdue, então
 * cadastro que nunca foi usado e aluno que já saiu não aparecem. Sem isso, a
 * aba abriria mostrando 1.044 meses de atraso numa academia com 1 aluno ativo.
 */

const Resumo = styled.View`
    background-color: ${theme.colors.surface};
    padding: ${theme.spacing.md}px;
    border-radius: 10px;
    margin: 0 ${theme.spacing.lg}px ${theme.spacing.md}px;
`;

const ResumoValor = styled.Text`
    color: ${theme.colors.danger};
    font-size: 24px;
    font-weight: bold;
`;

const ResumoLabel = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 13px;
    margin-top: 2px;
`;

const AcaoLinha = styled(TouchableOpacity)<{ bg: string }>`
    background-color: ${p => p.bg};
    padding: 9px 12px;
    border-radius: 8px;
    flex-direction: row;
    align-items: center;
    gap: 7px;
`;

const AcaoTexto = styled.Text`
    color: ${theme.colors.background};
    font-weight: bold;
    font-size: 13px;
`;

const Vazio = styled.Text`
    color: ${theme.colors.textSecondary};
    text-align: center;
    margin-top: 40px;
    padding: 0 ${theme.spacing.lg}px;
    line-height: 22px;
`;

type Devedor = {
    id: string;
    nome: string;
    telefone: string;
    meses: number;
    mesesAbertos: string[];
    valorPlano: number;
    total: number;
};

export default function CollectionsScreen() {
    const [devedores, setDevedores] = useState<Devedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lancando, setLancando] = useState<string | null>(null);
    const router = useRouter();

    const carregar = async () => {
        try {
            const gymId = await getCurrentGymId();
            if (!gymId) return;

            const [clientsRes, plansRes, paymentsRes] = await Promise.all([
                supabase.from('clients').select('*').eq('gym_id', gymId),
                supabase.from('plans').select('*').eq('gym_id', gymId),
                supabase.from('payments').select('client_id, reference_month')
                    .eq('gym_id', gymId).is('deleted_at', null),
            ]);

            const clients = clientsRes.data || [];
            const plans = plansRes.data || [];
            const porCliente = agruparCompetencias(paymentsRes.data || []);

            const lista: Devedor[] = [];
            clients.forEach(c => {
                const resumo = resumirCobranca(c, porCliente[c.id] || new Set<string>());
                if (resumo.coorte !== 'ativo' || resumo.mesesEmAtraso === 0) return;

                const plano = plans.find(p => p.id === c.plan_id);
                const valorPlano = plano?.price || 0;
                lista.push({
                    id: c.id,
                    nome: c.name,
                    telefone: c.phone || '',
                    meses: resumo.mesesEmAtraso,
                    mesesAbertos: resumo.mesesAbertos,
                    valorPlano,
                    total: valorPlano * resumo.mesesEmAtraso,
                });
            });

            // Mais grave primeiro; empate desempata pelo valor.
            lista.sort((a, b) => b.meses - a.meses || b.total - a.total);
            setDevedores(lista);
        } catch (e) {
            console.log('Cobranças:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { carregar(); }, []));

    const cobrar = (d: Devedor) => {
        if (!d.telefone) {
            Alert.alert('Sem telefone', `${d.nome} não tem telefone cadastrado.`);
            return;
        }
        const fone = d.telefone.replace(/\D/g, '');
        const meses = d.mesesAbertos.join(', ');
        const msg = d.meses === 1
            ? `Olá, ${d.nome}! Passando para lembrar da mensalidade de ${meses}. Poderia regularizar?`
            : `Olá, ${d.nome}! Passando para lembrar das mensalidades de ${meses}. Poderia regularizar?`;

        Linking.openURL(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`)
            .catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'));
    };

    const darBaixa = (d: Devedor) => {
        const mes = d.mesesAbertos[0];
        if (!mes) return;

        Alert.alert(
            'Registrar pagamento',
            `${d.nome}\n${formatCurrency(d.valorPlano)} · ref. ${mes} · hoje`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Registrar',
                    onPress: async () => {
                        setLancando(d.id);
                        try {
                            const gymId = await getCurrentGymId();
                            const agora = new Date().toISOString();
                            const { error } = await supabase.from('payments').insert({
                                client_id: d.id,
                                gym_id: gymId,
                                amount: d.valorPlano,
                                discount: 0,
                                reference_month: mes,
                                is_advance: false,
                                payment_date: agora,
                            });
                            if (error) throw error;

                            await supabase.from('clients')
                                .update({ last_payment_date: agora, payment_status: 'paid' })
                                .eq('id', d.id);

                            carregar();
                        } catch (e: any) {
                            Alert.alert('Erro', 'Falha ao registrar: ' + e.message);
                        } finally {
                            setLancando(null);
                        }
                    },
                },
            ]
        );
    };

    const totalDevido = devedores.reduce((s, d) => s + d.total, 0);

    if (loading) {
        return (
            <PageContainer>
                <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>
                <View style={{ padding: 16 }}>
                    <SkeletonLoader variant="card" />
                    <View style={{ height: 12 }} />
                    <SkeletonLoader variant="text" />
                    <SkeletonLoader variant="text" />
                </View>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>

            {devedores.length > 0 && (
                <Resumo>
                    <ResumoValor>{formatCurrency(totalDevido)}</ResumoValor>
                    <ResumoLabel>
                        {devedores.length === 1
                            ? '1 aluno em atraso'
                            : `${devedores.length} alunos em atraso`}
                    </ResumoLabel>
                </Resumo>
            )}

            <FlatList
                data={devedores}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); carregar(); }}
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <Vazio>
                        Ninguém em atraso.{'\n\n'}
                        Alunos sem cobrança e desligados não entram nesta lista.
                    </Vazio>
                }
                renderItem={({ item }) => (
                    <ListItem>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/client-details', params: { id: item.id } })}
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir ficha de ${item.nome}`}
                        >
                            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <ListItemTitle>{item.nome}</ListItemTitle>
                                    <ListItemSubtitle>
                                        {item.meses === 1 ? '1 mês' : `${item.meses} meses`} · {item.mesesAbertos.join(', ')}
                                    </ListItemSubtitle>
                                </View>
                                <ListItemTitle style={{ color: theme.colors.danger }}>
                                    {formatCurrency(item.total)}
                                </ListItemTitle>
                            </Row>
                        </TouchableOpacity>

                        <Row style={{ gap: 8, marginTop: 10 }}>
                            <AcaoLinha
                                bg="#25D366"
                                onPress={() => cobrar(item)}
                                accessibilityRole="button"
                                accessibilityLabel={`Cobrar ${item.nome} pelo WhatsApp`}
                            >
                                <FontAwesome name="whatsapp" size={15} color={theme.colors.background} />
                                <AcaoTexto>Cobrar</AcaoTexto>
                            </AcaoLinha>

                            <AcaoLinha
                                bg={theme.colors.primary}
                                onPress={() => darBaixa(item)}
                                disabled={lancando === item.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Registrar pagamento de ${item.nome}`}
                            >
                                {lancando === item.id ? (
                                    <ActivityIndicator size="small" color={theme.colors.background} />
                                ) : (
                                    <>
                                        <FontAwesome name="check" size={14} color={theme.colors.background} />
                                        <AcaoTexto>Registrar {formatCurrency(item.valorPlano)}</AcaoTexto>
                                    </>
                                )}
                            </AcaoLinha>
                        </Row>
                    </ListItem>
                )}
            />
        </PageContainer>
    );
}
