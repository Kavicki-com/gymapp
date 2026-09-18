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
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Cobranças — quem está devendo, e o que já foi feito a respeito.
 *
 * A lista usa a regra de src/utils/overdue, então cadastro nunca usado e aluno
 * que já saiu não aparecem. Sem isso a aba abriria mostrando 1.044 meses de
 * atraso numa academia com 1 aluno ativo.
 *
 * O que a torna uma ferramenta em vez de um relatório são três coisas:
 * o registro do que já foi cobrado (senão, com 116 devedores, você reabre a
 * tela sem saber quem já incomodou), a fila com "próximo" (senão são 116
 * idas e voltas na lista), e o resultado (senão não dá para saber se cobrar
 * adianta — nem para justificar continuar pagando por isto).
 */

const DIAS_PARA_RECOBRAR = 3;
const JANELA_RESULTADO_DIAS = 30;
const PRAZO_PAGAMENTO_DIAS = 5;

const Resumo = styled.View`
    background-color: ${theme.colors.surface};
    padding: ${theme.spacing.md}px;
    border-radius: 10px;
    margin: 0 ${theme.spacing.lg}px ${theme.spacing.sm}px;
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

const Efetividade = styled.Text`
    color: ${theme.colors.success};
    font-size: 13px;
    margin-top: 10px;
    padding-top: 10px;
    border-top-width: 1px;
    border-top-color: ${theme.colors.border};
    line-height: 19px;
`;

const BotaoFila = styled(TouchableOpacity)`
    background-color: ${theme.colors.primary};
    margin: 0 ${theme.spacing.lg}px ${theme.spacing.md}px;
    padding: 13px;
    border-radius: 10px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
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

const Marca = styled.Text<{ recente?: boolean }>`
    color: ${p => (p.recente ? theme.colors.success : theme.colors.textSecondary)};
    font-size: 12px;
    margin-top: 3px;
`;

const Vazio = styled.Text`
    color: ${theme.colors.textSecondary};
    text-align: center;
    margin-top: 40px;
    padding: 0 ${theme.spacing.lg}px;
    line-height: 22px;
`;

/* ----- fila ----- */
const FilaFundo = styled.View`
    flex: 1;
    padding: ${theme.spacing.lg}px;
    justify-content: center;
`;

const FilaCartao = styled.View`
    background-color: ${theme.colors.surface};
    border-radius: 14px;
    padding: ${theme.spacing.lg}px;
`;

const FilaProgresso = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 13px;
    text-align: center;
    margin-bottom: ${theme.spacing.md}px;
`;

const FilaNome = styled.Text`
    color: ${theme.colors.text};
    font-size: 24px;
    font-weight: bold;
`;

const FilaDetalhe = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 15px;
    margin-top: 4px;
`;

const FilaValor = styled.Text`
    color: ${theme.colors.danger};
    font-size: 30px;
    font-weight: bold;
    margin: ${theme.spacing.md}px 0;
`;

type Devedor = {
    id: string;
    nome: string;
    telefone: string;
    meses: number;
    mesesAbertos: string[];
    valorPlano: number;
    total: number;
    diasDesdeCobranca: number | null;
};

export default function CollectionsScreen() {
    const [devedores, setDevedores] = useState<Devedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lancando, setLancando] = useState<string | null>(null);
    const [efetividade, setEfetividade] = useState<{ cobrados: number; pagaram: number; valor: number } | null>(null);
    const [fila, setFila] = useState<Devedor[] | null>(null);
    const [filaIdx, setFilaIdx] = useState(0);
    const router = useRouter();

    const carregar = async () => {
        try {
            const gymId = await getCurrentGymId();
            if (!gymId) return;

            const desde = new Date();
            desde.setDate(desde.getDate() - JANELA_RESULTADO_DIAS);

            const [clientsRes, plansRes, paymentsRes, contatosRes] = await Promise.all([
                supabase.from('clients').select('*').eq('gym_id', gymId),
                supabase.from('plans').select('*').eq('gym_id', gymId),
                supabase.from('payments').select('client_id, reference_month, amount, created_at')
                    .eq('gym_id', gymId).is('deleted_at', null),
                supabase.from('collection_contacts')
                    .select('client_id, amount, created_at')
                    .eq('gym_id', gymId)
                    .gte('created_at', desde.toISOString())
                    .order('created_at', { ascending: false }),
            ]);

            const clients = clientsRes.data || [];
            const plans = plansRes.data || [];
            const pagamentos = paymentsRes.data || [];
            const contatos = contatosRes.data || [];
            const porCliente = agruparCompetencias(pagamentos);

            // Último contato por cliente (a query já vem ordenada desc).
            const ultimoContato: Record<string, string> = {};
            contatos.forEach(c => {
                if (!ultimoContato[c.client_id]) ultimoContato[c.client_id] = c.created_at;
            });

            const agora = Date.now();
            const emDias = (iso: string) => Math.floor((agora - new Date(iso).getTime()) / 86400000);

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
                    diasDesdeCobranca: ultimoContato[c.id] ? emDias(ultimoContato[c.id]) : null,
                });
            });

            // Quem acabou de ser cobrado vai para o fim: não adianta insistir
            // hoje de novo. O resto ordena por gravidade e valor.
            lista.sort((a, b) => {
                const aRecente = a.diasDesdeCobranca !== null && a.diasDesdeCobranca < DIAS_PARA_RECOBRAR;
                const bRecente = b.diasDesdeCobranca !== null && b.diasDesdeCobranca < DIAS_PARA_RECOBRAR;
                if (aRecente !== bRecente) return aRecente ? 1 : -1;
                return b.meses - a.meses || b.total - a.total;
            });
            setDevedores(lista);

            // Resultado: das cobranças da janela, quantas viraram pagamento em
            // até PRAZO_PAGAMENTO_DIAS. É o número que diz se cobrar adianta.
            let pagaram = 0;
            let valor = 0;
            contatos.forEach(ct => {
                const t = new Date(ct.created_at).getTime();
                const pagou = pagamentos.find(p => {
                    if (p.client_id !== ct.client_id || !p.created_at) return false;
                    const tp = new Date(p.created_at).getTime();
                    return tp >= t && tp <= t + PRAZO_PAGAMENTO_DIAS * 86400000;
                });
                if (pagou) {
                    pagaram++;
                    valor += Number(pagou.amount) || 0;
                }
            });
            setEfetividade(contatos.length ? { cobrados: contatos.length, pagaram, valor } : null);
        } catch (e) {
            console.log('Cobranças:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { carregar(); }, []));

    const registrarContato = async (d: Devedor) => {
        try {
            const gymId = await getCurrentGymId();
            await supabase.from('collection_contacts').insert({
                gym_id: gymId,
                client_id: d.id,
                channel: 'whatsapp',
                reference_months: d.mesesAbertos,
                amount: d.total,
            });
        } catch (e) {
            // Falhar o registro não pode impedir a cobrança de sair.
            console.log('registro de cobrança falhou:', e);
        }
    };

    const cobrar = async (d: Devedor) => {
        if (!d.telefone) {
            Alert.alert('Sem telefone', `${d.nome} não tem telefone cadastrado.`);
            return;
        }
        const fone = d.telefone.replace(/\D/g, '');
        const meses = d.mesesAbertos.join(', ');
        const msg = d.meses === 1
            ? `Olá, ${d.nome}! Passando para lembrar da mensalidade de ${meses}. Poderia regularizar?`
            : `Olá, ${d.nome}! Passando para lembrar das mensalidades de ${meses}. Poderia regularizar?`;

        await registrarContato(d);
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
                                client_id: d.id, gym_id: gymId, amount: d.valorPlano,
                                discount: 0, reference_month: mes, is_advance: false,
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
    const naFila = devedores.filter(d => d.telefone &&
        (d.diasDesdeCobranca === null || d.diasDesdeCobranca >= DIAS_PARA_RECOBRAR));

    /* ---------------- modo fila ---------------- */
    if (fila) {
        const atual = fila[filaIdx];

        if (!atual) {
            return (
                <PageContainer>
                    <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>
                    <FilaFundo>
                        <FilaCartao>
                            <FilaNome>Fila concluída</FilaNome>
                            <FilaDetalhe>{fila.length} {fila.length === 1 ? 'aluno cobrado' : 'alunos cobrados'}.</FilaDetalhe>
                            <BotaoFila style={{ marginHorizontal: 0, marginTop: 20 }}
                                onPress={() => { setFila(null); setFilaIdx(0); carregar(); }}>
                                <AcaoTexto>Voltar para a lista</AcaoTexto>
                            </BotaoFila>
                        </FilaCartao>
                    </FilaFundo>
                </PageContainer>
            );
        }

        const avancar = () => setFilaIdx(i => i + 1);

        return (
            <PageContainer>
                <PageHeader><PageTitle>Cobrando</PageTitle></PageHeader>
                <FilaFundo>
                    <FilaProgresso>{filaIdx + 1} de {fila.length}</FilaProgresso>
                    <FilaCartao>
                        <FilaNome>{atual.nome}</FilaNome>
                        <FilaDetalhe>
                            {atual.meses === 1 ? '1 mês' : `${atual.meses} meses`} · {atual.mesesAbertos.join(', ')}
                        </FilaDetalhe>
                        <FilaValor>{formatCurrency(atual.total)}</FilaValor>

                        <BotaoFila style={{ marginHorizontal: 0, backgroundColor: '#25D366' }}
                            onPress={async () => { await cobrar(atual); avancar(); }}
                            accessibilityRole="button"
                            accessibilityLabel={`Cobrar ${atual.nome} e ir para o próximo`}>
                            <FontAwesome name="whatsapp" size={18} color={theme.colors.background} />
                            <AcaoTexto>Cobrar e avançar</AcaoTexto>
                        </BotaoFila>

                        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                            <TouchableOpacity onPress={avancar} style={{ padding: 12 }}
                                accessibilityRole="button" accessibilityLabel="Pular este aluno">
                                <ListItemSubtitle>Pular</ListItemSubtitle>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setFila(null); setFilaIdx(0); carregar(); }}
                                style={{ padding: 12 }}
                                accessibilityRole="button" accessibilityLabel="Sair da fila">
                                <ListItemSubtitle>Sair da fila</ListItemSubtitle>
                            </TouchableOpacity>
                        </Row>
                    </FilaCartao>
                </FilaFundo>
            </PageContainer>
        );
    }

    /* ---------------- lista ---------------- */
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
                        {devedores.length === 1 ? '1 aluno em atraso' : `${devedores.length} alunos em atraso`}
                    </ResumoLabel>
                    {efetividade && efetividade.pagaram > 0 && (
                        <Efetividade>
                            Últimos {JANELA_RESULTADO_DIAS} dias: {efetividade.cobrados}{' '}
                            {efetividade.cobrados === 1 ? 'cobrança' : 'cobranças'},{' '}
                            {efetividade.pagaram} {efetividade.pagaram === 1 ? 'pagou' : 'pagaram'} em até{' '}
                            {PRAZO_PAGAMENTO_DIAS} dias · {formatCurrency(efetividade.valor)} recuperados
                        </Efetividade>
                    )}
                </Resumo>
            )}

            {naFila.length > 1 && (
                <BotaoFila onPress={() => { setFila(naFila); setFilaIdx(0); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Cobrar ${naFila.length} alunos em sequência`}>
                    <FontAwesome name="bolt" size={16} color={theme.colors.background} />
                    <AcaoTexto>Cobrar {naFila.length} em sequência</AcaoTexto>
                </BotaoFila>
            )}

            {/* Sem paddingHorizontal aqui: o ListItem já traz margin-horizontal,
                e somar os dois estreitaria os cards em relação às outras listas. */}
            <FlatList
                data={devedores}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); carregar(); }}
                        tintColor={theme.colors.primary} />
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
                            accessibilityLabel={`Abrir ficha de ${item.nome}`}>
                            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <ListItemTitle>{item.nome}</ListItemTitle>
                                    <ListItemSubtitle>
                                        {item.meses === 1 ? '1 mês' : `${item.meses} meses`} · {item.mesesAbertos.join(', ')}
                                    </ListItemSubtitle>
                                    <Marca recente={item.diasDesdeCobranca !== null && item.diasDesdeCobranca < DIAS_PARA_RECOBRAR}>
                                        {item.diasDesdeCobranca === null
                                            ? 'Nunca cobrado'
                                            : item.diasDesdeCobranca === 0
                                                ? 'Cobrado hoje'
                                                : item.diasDesdeCobranca === 1
                                                    ? 'Cobrado ontem'
                                                    : `Cobrado há ${item.diasDesdeCobranca} dias`}
                                    </Marca>
                                </View>
                                <ListItemTitle style={{ color: theme.colors.danger }}>
                                    {formatCurrency(item.total)}
                                </ListItemTitle>
                            </Row>
                        </TouchableOpacity>

                        <Row style={{ gap: 8, marginTop: 10 }}>
                            <AcaoLinha bg="#25D366" onPress={() => cobrar(item)}
                                accessibilityRole="button"
                                accessibilityLabel={`Cobrar ${item.nome} pelo WhatsApp`}>
                                <FontAwesome name="whatsapp" size={15} color={theme.colors.background} />
                                <AcaoTexto>Cobrar</AcaoTexto>
                            </AcaoLinha>

                            <AcaoLinha bg={theme.colors.primary} onPress={() => darBaixa(item)}
                                disabled={lancando === item.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Registrar pagamento de ${item.nome}`}>
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
