import { appAlert } from '@/src/components/AppAlert';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { CollectionsLocked } from '@/src/components/CollectionsLocked';
import { CobrancaConfig } from '@/src/components/cobrancas/CobrancaConfig';
import { CobrancaFila } from '@/src/components/cobrancas/CobrancaFila';
import { CobrancaResultado } from '@/src/components/cobrancas/CobrancaResultado';
import {
    Apoio, Barra, BarraCheia, BotaoPrincipal, BotaoPrincipalTexto, BotaoSecundario, BotaoSecundarioTexto,
    Cabecalho, Devedor, Efetividade, IconeQr, IconeWhatsApp, Miudo, Modo, Pagante, TopoCobrancas,
} from '@/src/components/cobrancas/comum';
import { LinhaDevedor } from '@/src/components/cobrancas/LinhaDevedor';
import { RegistrarPagamentoSheet } from '@/src/components/cobrancas/RegistrarPagamentoSheet';
import { useCollectionsEnabled } from '@/src/hooks/useCollectionsEnabled';
import { PageContainer, Section } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { agruparCompetencias, resumirCobranca } from '@/src/utils/overdue';
import { MENSAGEM_PADRAO, montarMensagem } from '@/src/utils/mensagemCobranca';
import { gerarPixBrCode } from '@/src/utils/pixBrCode';
import {
    TipoChavePix,
    detectarTipo,
    mascararChave,
    normalizarChave,
    validarChave,
} from '@/src/utils/pixKey';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
 *
 * Layout do redesign (Claude Design: Cobrancas, CobrancasLista,
 * CobrancasResultado, CobrancaConfig). As vistas Fila · Lista · Resultado e a
 * sub-vista "Mensagem e Pix" estão em src/components/cobrancas/ e só desenham;
 * as consultas, as contas e as gravações continuam todas aqui.
 *
 * Abrir direto em "Mensagem e Pix" (ex.: pela aba Mais):
 *   router.push({ pathname: '/collections', params: { config: '1' } })
 */

const DIAS_PARA_RECOBRAR = 3;
const JANELA_RESULTADO_DIAS = 30;
const PRAZO_PAGAMENTO_DIAS = 5;

const Conteudo = styled.View`
    padding: ${theme.spacing.lg}px ${theme.spacing.xl}px 40px;
    gap: ${theme.spacing.lg}px;
`;

const Total = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: 22px;
    color: ${theme.colors.danger};
`;

const Vazio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 15px;
    line-height: 24px;
    color: ${theme.colors.textSecondary};
    text-align: center;
    margin-top: ${theme.spacing.xl}px;
`;

export default function CollectionsScreen() {
    const [devedores, setDevedores] = useState<Devedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lancando, setLancando] = useState<string | null>(null);
    const [efetividade, setEfetividade] = useState<Efetividade | null>(null);
    const [pagantes, setPagantes] = useState<Pagante[]>([]);
    const [fila, setFila] = useState<Devedor[] | null>(null);
    const [filaIdx, setFilaIdx] = useState(0);
    const [contagemFila, setContagemFila] = useState({ cobrados: 0, pulados: 0, pagos: 0 });
    const [modo, setModo] = useState<Exclude<Modo, 'fila'>>('lista');
    const [baixa, setBaixa] = useState<{ devedor: Devedor; aoConcluir?: () => void } | null>(null);
    const [semTelefone, setSemTelefone] = useState<string | null>(null);
    const habilitado = useCollectionsEnabled();
    const [academia, setAcademia] = useState<{
        nome: string; pixKey: string | null; pixCity: string | null; modelo: string | null;
    } | null>(null);
    const [configAberta, setConfigAberta] = useState(false);
    const [erroConfig, setErroConfig] = useState<[string, string] | null>(null);
    const [salvandoConfig, setSalvandoConfig] = useState(false);
    const [modeloMsg, setModeloMsg] = useState('');
    const [pixTipo, setPixTipo] = useState<TipoChavePix>('cpf');
    const [pixChave, setPixChave] = useState('');
    const [pixCidade, setPixCidade] = useState('');
    const router = useRouter();
    const params = useLocalSearchParams<{ config?: string }>();

    const carregar = async () => {
        try {
            const gymId = await getCurrentGymId();
            if (!gymId) return;

            const desde = new Date();
            desde.setDate(desde.getDate() - JANELA_RESULTADO_DIAS);

            const [perfilRes, clientsRes, plansRes, paymentsRes, contatosRes] = await Promise.all([
                supabase.from('gym_profiles').select('gym_name, pix_key, pix_city, collection_message').eq('id', gymId).maybeSingle(),
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

            setAcademia({
                nome: perfilRes.data?.gym_name || 'Academia',
                pixKey: perfilRes.data?.pix_key || null,
                pixCity: perfilRes.data?.pix_city || null,
                modelo: perfilRes.data?.collection_message || null,
            });

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
                    // Só exibição (fila): nome do plano e dia de vencimento, dos
                    // dados que já vieram nesta carga.
                    apoio: [plano?.name, c.due_day ? `vence dia ${c.due_day}` : null].filter(Boolean).join(' · '),
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
            // Mesmas cobranças que viraram pagamento, uma a uma, para a lista da
            // vista Resultado. Não entra na conta acima — só a detalha.
            const detalhe: Pagante[] = [];
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
                    detalhe.push({
                        chave: `${ct.client_id}-${ct.created_at}`,
                        nome: clients.find(c => c.id === ct.client_id)?.name || 'Aluno',
                        cobradoEm: ct.created_at,
                        pagouEm: pagou.created_at as string,
                        valor: Number(pagou.amount) || 0,
                    });
                }
            });
            setEfetividade(contatos.length ? { cobrados: contatos.length, pagaram, valor } : null);
            setPagantes(detalhe);
        } catch (e) {
            console.log('Cobranças:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { carregar(); }, []));

    /* ---------------- mensagem e chave Pix ---------------- */

    const abrirConfig = () => {
        const tipo = detectarTipo(academia?.pixKey);
        setPixTipo(tipo);
        setPixChave(academia?.pixKey ? mascararChave(tipo, academia.pixKey) : '');
        setPixCidade(academia?.pixCity || '');
        setModeloMsg(academia?.modelo || MENSAGEM_PADRAO);
        setErroConfig(null);
        setConfigAberta(true);
    };

    // ?config=1 abre direto em "Mensagem e Pix". Espera a carga para os campos
    // virem preenchidos, e limpa o parâmetro para a aba não reabrir nisso.
    useEffect(() => {
        if (params.config !== '1' || loading) return;
        abrirConfig();
        router.setParams({ config: undefined });
    }, [params.config, loading]);

    // No Android, o voltar do aparelho fecha a sub-vista em vez de sair da aba.
    useEffect(() => {
        if (!configAberta) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            setConfigAberta(false);
            return true;
        });
        return () => sub.remove();
    }, [configAberta]);

    /*
     * Um "Salvar" só para as duas coisas, como no desenho. Cada parte só é
     * validada e gravada se mudou — e com a mesma validação e o mesmo update
     * de quando eram dois formulários separados.
     */
    const salvarConfig = async () => {
        setErroConfig(null);

        const texto = modeloMsg.trim();
        if (!texto) {
            setErroConfig(['Mensagem vazia.', 'Escreva a mensagem ou volte ao padrão.']);
            return;
        }
        const msgMudou = texto !== (academia?.modelo || MENSAGEM_PADRAO).trim();

        const semChave = !academia?.pixKey && !pixChave.trim();
        const pixMudou = semChave
            ? !!pixCidade.trim()
            : normalizarChave(pixTipo, pixChave) !== academia?.pixKey
                || (pixCidade.trim() || null) !== (academia?.pixCity || null);

        if (pixMudou) {
            const problema = validarChave(pixTipo, pixChave);
            if (problema) {
                setErroConfig(['Chave inválida.', problema]);
                return;
            }
        }

        setSalvandoConfig(true);
        try {
            const gymId = await getCurrentGymId();

            if (msgMudou) {
                const { error } = await supabase.from('gym_profiles')
                    .update({ collection_message: texto })
                    .eq('id', gymId);
                if (error) {
                    setErroConfig(['Erro.', 'Não foi possível salvar: ' + error.message]);
                    return;
                }
            }

            if (pixMudou) {
                // Grava na forma canônica: é ela que entra no BR Code. CPF e CNPJ só
                // com dígitos, celular em E.164 — com máscara o banco do aluno recusa.
                const chave = normalizarChave(pixTipo, pixChave);
                const { error } = await supabase.from('gym_profiles')
                    .update({ pix_key: chave, pix_city: pixCidade.trim() || null })
                    .eq('id', gymId);
                if (error) {
                    setErroConfig(['Erro.', 'Não foi possível salvar a chave: ' + error.message]);
                    if (msgMudou) carregar();
                    return;
                }
            }

            setConfigAberta(false);
            if (msgMudou || pixMudou) carregar();
        } catch (e: any) {
            setErroConfig(['Erro.', 'Não foi possível salvar: ' + e.message]);
        } finally {
            setSalvandoConfig(false);
        }
    };

    /* ---------------- cobrança ---------------- */

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

    const mensagemPara = (d: Devedor) => montarMensagem(academia?.modelo, {
        nome: d.nome,
        meses: d.mesesAbertos.join(', '),
        valor: formatCurrency(d.total),
    });

    const cobrar = async (d: Devedor) => {
        if (!d.telefone) {
            appAlert('Sem telefone', `${d.nome} não tem telefone cadastrado.`);
            return;
        }
        const fone = d.telefone.replace(/\D/g, '');
        let msg = mensagemPara(d);

        // O "copia e cola" já sai com o valor exato. Poupa o aluno de pedir a
        // chave e de digitar o valor errado — que é a fricção real da cobrança.
        // Pix estático: o dinheiro vai direto para a academia e o app não fica
        // sabendo do pagamento, então a baixa continua manual.
        if (academia?.pixKey) {
            const codigo = gerarPixBrCode({
                chave: academia.pixKey,
                nome: academia.nome,
                cidade: academia.pixCity || undefined,
                valor: d.total,
            });
            msg += `\n\nSe preferir, é só copiar o código Pix abaixo e colar no seu banco (valor já preenchido):\n\n${codigo}`;
        }

        await registrarContato(d);
        Linking.openURL(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`)
            .catch(() => appAlert('Erro', 'Não foi possível abrir o WhatsApp.'));
    };

    // Uma linha por competência, e não uma linha com a soma: a regra de atraso
    // (src/utils/overdue) casa pagamento com mês pelo `reference_month`. Uma
    // linha só de R$ 300 quitaria um mês e deixaria os outros dois em aberto —
    // e ainda jogaria os R$ 300 inteiros no faturamento daquele mês.
    const registrarPagamento = async (d: Devedor, meses: string[]): Promise<boolean> => {
        setLancando(d.id);
        try {
            const gymId = await getCurrentGymId();
            const agora = new Date().toISOString();
            const { error } = await supabase.from('payments').insert(
                meses.map(mes => ({
                    client_id: d.id, gym_id: gymId, amount: d.valorPlano,
                    discount: 0, reference_month: mes, is_advance: false,
                    payment_date: agora,
                }))
            );
            if (error) throw error;
            await supabase.from('clients')
                .update({ last_payment_date: agora, payment_status: 'paid' })
                .eq('id', d.id);
            carregar();
            return true;
        } catch (e: any) {
            appAlert('Erro', 'Falha ao registrar: ' + e.message);
            return false;
        } finally {
            setLancando(null);
        }
    };

    // Abre a folha "Registrar pagamento" (as opções estão nela). `aoConcluir`
    // roda só se o pagamento foi gravado — a fila usa para avançar.
    const darBaixa = (d: Devedor, aoConcluir?: () => void) => {
        if (!d.mesesAbertos.length) return;
        setBaixa({ devedor: d, aoConcluir });
    };

    const escolherBaixa = async (meses: string[]) => {
        const alvo = baixa;
        setBaixa(null);
        if (!alvo) return;
        const ok = await registrarPagamento(alvo.devedor, meses);
        if (ok) alvo.aoConcluir?.();
    };

    const totalDevido = devedores.reduce((s, d) => s + d.total, 0);
    const naFila = devedores.filter(d => d.telefone &&
        (d.diasDesdeCobranca === null || d.diasDesdeCobranca >= DIAS_PARA_RECOBRAR));

    const iniciarFila = () => {
        setFila(naFila);
        setFilaIdx(0);
        setContagemFila({ cobrados: 0, pulados: 0, pagos: 0 });
    };

    const sairDaFila = () => { setFila(null); setFilaIdx(0); setModo('lista'); carregar(); };

    const trocarModo = (m: Modo) => {
        if (m === 'fila') {
            iniciarFila();
            return;
        }
        if (fila) sairDaFila();
        setModo(m);
    };

    const folha = (
        <RegistrarPagamentoSheet
            devedor={baixa?.devedor ?? null}
            onEscolher={escolherBaixa}
            onFechar={() => setBaixa(null)}
        />
    );

    const esqueleto = (
        <PageContainer>
            <Conteudo>
                <Cabecalho />
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="text" />
                <SkeletonLoader variant="text" />
            </Conteudo>
        </PageContainer>
    );

    // Enquanto não se sabe, mostra o esqueleto: piscar a tela travada para
    // quem tem a função seria pior que esperar meio segundo.
    if (habilitado === null) return esqueleto;

    if (!habilitado) return <CollectionsLocked />;

    if (loading) return esqueleto;

    /* ---------------- mensagem e Pix ---------------- */
    if (configAberta) {
        return (
            <PageContainer>
                <CobrancaConfig
                    mensagem={modeloMsg}
                    onMensagem={t => { setModeloMsg(t); setErroConfig(null); }}
                    onPadrao={() => setModeloMsg(MENSAGEM_PADRAO)}
                    pixTipo={pixTipo}
                    onPixTipo={t => { setPixTipo(t); setPixChave(''); setErroConfig(null); }}
                    pixChave={pixChave}
                    onPixChave={t => { setPixChave(t); setErroConfig(null); }}
                    pixCidade={pixCidade}
                    onPixCidade={setPixCidade}
                    erro={erroConfig}
                    salvando={salvandoConfig}
                    onSalvar={salvarConfig}
                    onCancelar={() => setConfigAberta(false)}
                />
            </PageContainer>
        );
    }

    /* ---------------- fila ---------------- */
    if (fila) {
        const atual = fila[filaIdx];
        const avancar = () => setFilaIdx(i => i + 1);

        return (
            <PageContainer>
                <ScrollView style={{ flex: 1 }}>
                    <Conteudo>
                        <TopoCobrancas modo="fila" onModo={trocarModo} onConfig={abrirConfig} />
                        <CobrancaFila
                            fila={fila}
                            indice={filaIdx}
                            contagem={contagemFila}
                            mensagem={atual ? mensagemPara(atual) : ''}
                            temPix={!!academia?.pixKey}
                            diasParaRecobrar={DIAS_PARA_RECOBRAR}
                            efetividade={efetividade}
                            janelaDias={JANELA_RESULTADO_DIAS}
                            lancando={!!atual && lancando === atual.id}
                            onCobrar={async () => {
                                if (!atual) return;
                                await cobrar(atual);
                                setContagemFila(c => ({ ...c, cobrados: c.cobrados + 1 }));
                                avancar();
                            }}
                            onPular={() => {
                                setContagemFila(c => ({ ...c, pulados: c.pulados + 1 }));
                                avancar();
                            }}
                            onJaPagou={() => atual && darBaixa(atual, () => {
                                setContagemFila(c => ({ ...c, pagos: c.pagos + 1 }));
                                avancar();
                            })}
                            onSair={sairDaFila}
                            onEditarMensagem={abrirConfig}
                        />
                    </Conteudo>
                </ScrollView>
                {folha}
            </PageContainer>
        );
    }

    /* ---------------- resultado ---------------- */
    if (modo === 'resultado') {
        return (
            <PageContainer>
                <ScrollView style={{ flex: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); carregar(); }}
                            tintColor={theme.colors.primary} />
                    }>
                    <Conteudo>
                        <TopoCobrancas modo="resultado" onModo={trocarModo} onConfig={abrirConfig} />
                        <CobrancaResultado
                            efetividade={efetividade}
                            pagantes={pagantes}
                            janelaDias={JANELA_RESULTADO_DIAS}
                            prazoDias={PRAZO_PAGAMENTO_DIAS}
                            diasParaRecobrar={DIAS_PARA_RECOBRAR}
                            onVerFila={iniciarFila}
                        />
                    </Conteudo>
                </ScrollView>
            </PageContainer>
        );
    }

    /* ---------------- lista ---------------- */

    const pctEfetividade = efetividade
        ? Math.round((efetividade.pagaram / efetividade.cobrados) * 100)
        : 0;

    // Elemento, e não componente: uma função componente redefinida a cada
    // render remonta a subárvore inteira.
    const cabecalho = (
        <View style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
            <TopoCobrancas modo="lista" onModo={trocarModo} onConfig={abrirConfig} />

            {devedores.length > 0 && (
                <Section style={{ gap: 10 }} accessibilityLabel="Resumo">
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <Apoio style={{ fontSize: 14 }}>
                            {devedores.length === 1 ? '1 aluno em atraso' : `${devedores.length} alunos em atraso`}
                        </Apoio>
                        <Total adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totalDevido)}</Total>
                    </View>
                    {/* Aparece com qualquer cobrança na janela, inclusive com
                        zero pagamentos: "5 cobranças, 0 pagaram" é justamente
                        o número que diz que cobrar assim não está adiantando.
                        NÃO comparar com o total devido acima: aquilo é estoque
                        e isto é fluxo. */}
                    {efetividade && (
                        <View style={{
                            gap: 6, paddingTop: 10,
                            borderTopWidth: 1, borderTopColor: theme.colors.divider,
                        }}>
                            <Miudo>Cobrança dos últimos {JANELA_RESULTADO_DIAS} dias</Miudo>
                            <Barra><BarraCheia pct={pctEfetividade} cor={theme.colors.success} /></Barra>
                            <Apoio>
                                {efetividade.cobrados}{' '}
                                {efetividade.cobrados === 1 ? 'cobrança' : 'cobranças'} ·{' '}
                                {efetividade.pagaram}{' '}
                                {efetividade.pagaram === 1 ? 'pagou' : 'pagaram'} em até{' '}
                                {PRAZO_PAGAMENTO_DIAS} dias ({pctEfetividade}%)
                                {efetividade.valor > 0 && (
                                    <>
                                        {' · '}
                                        <Text
                                            onPress={() => setModo('resultado')}
                                            accessibilityRole="link"
                                            style={{ fontFamily: theme.fonts.semibold, color: theme.colors.success }}
                                        >
                                            {formatCurrency(efetividade.valor)} recuperados
                                        </Text>
                                    </>
                                )}
                            </Apoio>
                        </View>
                    )}
                </Section>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
                <BotaoSecundario style={{ flex: 1, minHeight: 44, borderRadius: 12 }} onPress={abrirConfig}
                    accessibilityRole="button"
                    accessibilityLabel={academia?.pixKey ? 'Alterar a chave Pix' : 'Cadastrar a chave Pix'}>
                    <IconeQr color={theme.colors.primary} />
                    <BotaoSecundarioTexto style={{ fontSize: 14 }} numberOfLines={1}>
                        {academia?.pixKey ? 'Alterar chave Pix' : 'Cadastrar chave Pix'}
                    </BotaoSecundarioTexto>
                </BotaoSecundario>
                <BotaoSecundario style={{ flex: 1, minHeight: 44, borderRadius: 12 }} onPress={abrirConfig}
                    accessibilityRole="button" accessibilityLabel="Editar a mensagem de cobrança">
                    <IconeWhatsApp size={16} color={theme.colors.primary} />
                    <BotaoSecundarioTexto style={{ fontSize: 14 }} numberOfLines={1}>Mensagem</BotaoSecundarioTexto>
                </BotaoSecundario>
            </View>

            {/* Sem chave, o aviso fica à vista: é aqui que o dono descobre que a
                cobrança pode sair com o valor já preenchido. */}
            {!academia?.pixKey && (
                <TouchableOpacity onPress={abrirConfig} accessibilityRole="button"
                    accessibilityLabel="Cadastrar a chave Pix para cobrar com Pix copia e cola">
                    <Section style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <IconeQr size={22} color={theme.colors.primary} />
                        <View style={{ flex: 1, gap: 2 }}>
                            <BotaoSecundarioTexto>Cobrança com Pix</BotaoSecundarioTexto>
                            <Apoio>
                                Cadastre a chave e cada cobrança sai com um Pix copia e cola, com o
                                valor já preenchido. O dinheiro vai direto para você.
                            </Apoio>
                        </View>
                    </Section>
                </TouchableOpacity>
            )}

            {naFila.length > 1 && (
                <BotaoPrincipal onPress={iniciarFila}
                    accessibilityRole="button"
                    accessibilityLabel={`Cobrar ${naFila.length} alunos em sequência`}>
                    <IconeWhatsApp size={18} color={theme.colors.onPrimary} />
                    <BotaoPrincipalTexto>Cobrar {naFila.length} em sequência</BotaoPrincipalTexto>
                </BotaoPrincipal>
            )}
        </View>
    );

    return (
        <PageContainer>
            <FlatList
                data={devedores}
                keyExtractor={item => item.id}
                contentContainerStyle={{
                    paddingTop: theme.spacing.lg,
                    paddingHorizontal: theme.spacing.xl,
                    paddingBottom: 40,
                }}
                ListHeaderComponent={cabecalho}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); carregar(); }}
                        tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    <Vazio>
                        Ninguém em atraso.{'\n'}
                        Alunos sem cobrança e desligados não entram nesta lista.
                    </Vazio>
                }
                ListFooterComponent={devedores.length > 0 ? (
                    <Miudo style={{
                        fontSize: 13, lineHeight: 19, color: theme.colors.textMuted,
                        textAlign: 'center', marginTop: theme.spacing.lg,
                    }}>
                        Quem foi cobrado há menos de {DIAS_PARA_RECOBRAR} dias vai para o fim da lista.
                        Puxe para baixo para atualizar.
                    </Miudo>
                ) : null}
                renderItem={({ item }) => (
                    <LinhaDevedor
                        item={item}
                        recente={item.diasDesdeCobranca !== null && item.diasDesdeCobranca < DIAS_PARA_RECOBRAR}
                        lancando={lancando === item.id}
                        semTelefone={semTelefone === item.id}
                        onAbrir={() => router.push({ pathname: '/client-details', params: { id: item.id } })}
                        onCobrar={() => {
                            // Sem telefone, o aviso aparece na própria linha.
                            if (!item.telefone) { setSemTelefone(item.id); return; }
                            setSemTelefone(null);
                            cobrar(item);
                        }}
                        onRegistrar={() => darBaixa(item)}
                    />
                )}
            />
            {folha}
        </PageContainer>
    );
}
