import { SkeletonLoader } from '@/components/SkeletonLoader';
import { CollectionsLocked } from '@/src/components/CollectionsLocked';
import { useCollectionsEnabled } from '@/src/hooks/useCollectionsEnabled';
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
import { Input } from '@/src/components/styled';
import { agruparCompetencias, resumirCobranca } from '@/src/utils/overdue';
import { MARCADORES, MENSAGEM_PADRAO, montarMensagem } from '@/src/utils/mensagemCobranca';
import { gerarPixBrCode } from '@/src/utils/pixBrCode';
import {
    TIPOS_CHAVE_PIX,
    TipoChavePix,
    detectarTipo,
    mascararChave,
    normalizarChave,
    teclado,
    validarChave,
} from '@/src/utils/pixKey';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, RefreshControl, TouchableOpacity, View } from 'react-native';
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

const CartaoPix = styled.View`
    background-color: ${theme.colors.surface};
    border-radius: 12px;
    padding: ${theme.spacing.md}px;
    margin: 0 ${theme.spacing.lg}px ${theme.spacing.md}px;
`;

const PixTitulo = styled.Text`
    color: ${theme.colors.text};
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
`;

const PixTexto = styled.Text`
    color: ${theme.colors.textSecondary};
    font-size: 13px;
    line-height: 19px;
    margin-bottom: 12px;
`;

const PixCabecalho = styled.View`
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
`;

const TipoLinha = styled.View`
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
`;

const TipoChip = styled(TouchableOpacity)<{ ativo: boolean }>`
    padding: 7px 12px;
    border-radius: 16px;
    background-color: ${p => (p.ativo ? theme.colors.primary : theme.colors.inputBackground)};
    border-width: 1px;
    border-color: ${p => (p.ativo ? theme.colors.primary : theme.colors.border)};
`;

const TipoChipTexto = styled.Text<{ ativo: boolean }>`
    color: ${p => (p.ativo ? theme.colors.background : theme.colors.text)};
    font-size: 13px;
    font-weight: ${p => (p.ativo ? '700' : '400')};
`;

const MenuLinha = styled.View`
    flex-direction: row;
    gap: 8px;
    margin: 0 ${theme.spacing.lg}px ${theme.spacing.md}px;
`;

const MenuItem = styled(TouchableOpacity)<{ ativo?: boolean }>`
    flex: 1;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 12px;
    border-radius: 10px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${p => (p.ativo ? theme.colors.primary : 'transparent')};
`;

const MenuTexto = styled.Text`
    color: ${theme.colors.text};
    font-size: 13px;
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
    const habilitado = useCollectionsEnabled();
    const [academia, setAcademia] = useState<{
        nome: string; pixKey: string | null; pixCity: string | null; modelo: string | null;
    } | null>(null);
    const [editandoPix, setEditandoPix] = useState(false);
    const [editandoMsg, setEditandoMsg] = useState(false);
    const [modeloMsg, setModeloMsg] = useState('');
    const [salvandoMsg, setSalvandoMsg] = useState(false);
    const [pixTipo, setPixTipo] = useState<TipoChavePix>('cpf');
    const [pixChave, setPixChave] = useState('');
    const [pixCidade, setPixCidade] = useState('');
    const [salvandoPix, setSalvandoPix] = useState(false);
    const router = useRouter();

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

    const salvarPix = async () => {
        const problema = validarChave(pixTipo, pixChave);
        if (problema) {
            Alert.alert('Chave inválida', problema);
            return;
        }
        // Grava na forma canônica: é ela que entra no BR Code. CPF e CNPJ só
        // com dígitos, celular em E.164 — com máscara o banco do aluno recusa.
        const chave = normalizarChave(pixTipo, pixChave);

        setSalvandoPix(true);
        try {
            const gymId = await getCurrentGymId();
            const { error } = await supabase.from('gym_profiles')
                .update({ pix_key: chave, pix_city: pixCidade.trim() || null })
                .eq('id', gymId);
            if (error) throw error;
            setEditandoPix(false);
            carregar();
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível salvar a chave: ' + e.message);
        } finally {
            setSalvandoPix(false);
        }
    };

    const abrirEdicaoPix = () => {
        const tipo = detectarTipo(academia?.pixKey);
        setPixTipo(tipo);
        setPixChave(academia?.pixKey ? mascararChave(tipo, academia.pixKey) : '');
        setPixCidade(academia?.pixCity || '');
        setEditandoPix(true);
    };

    const salvarMensagem = async () => {
        const texto = modeloMsg.trim();
        if (!texto) {
            Alert.alert('Mensagem vazia', 'Escreva a mensagem ou volte ao padrão.');
            return;
        }
        setSalvandoMsg(true);
        try {
            const gymId = await getCurrentGymId();
            const { error } = await supabase.from('gym_profiles')
                .update({ collection_message: texto })
                .eq('id', gymId);
            if (error) throw error;
            setEditandoMsg(false);
            carregar();
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível salvar: ' + e.message);
        } finally {
            setSalvandoMsg(false);
        }
    };

    const abrirEdicaoMensagem = () => {
        setModeloMsg(academia?.modelo || MENSAGEM_PADRAO);
        setEditandoMsg(true);
    };

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
        let msg = montarMensagem(academia?.modelo, {
            nome: d.nome,
            meses,
            valor: formatCurrency(d.total),
        });

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

    // Enquanto não se sabe, mostra o esqueleto: piscar a tela travada para
    // quem tem a função seria pior que esperar meio segundo.
    if (habilitado === null) {
        return (
            <PageContainer>
                <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>
                <View style={{ padding: 16 }}>
                    <SkeletonLoader variant="card" />
                </View>
            </PageContainer>
        );
    }

    if (!habilitado) return <CollectionsLocked />;

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

    // Elemento, e não componente: uma função componente redefinida a cada
    // render remonta a subárvore inteira, e o campo de mensagem perderia o
    // foco a cada tecla.
    const cabecalho = (
        <>
                <MenuLinha>
                    <MenuItem
                        ativo={editandoPix}
                        onPress={() => (editandoPix ? setEditandoPix(false) : abrirEdicaoPix())}
                        accessibilityRole="button"
                        accessibilityLabel={academia?.pixKey ? 'Alterar a chave Pix' : 'Cadastrar a chave Pix'}
                    >
                        <MaterialCommunityIcons name="qrcode" size={17} color={theme.colors.primary} />
                        <MenuTexto numberOfLines={1}>
                            {academia?.pixKey ? 'Alterar chave Pix' : 'Cadastrar chave Pix'}
                        </MenuTexto>
                    </MenuItem>

                    <MenuItem
                        ativo={editandoMsg}
                        onPress={() => (editandoMsg ? setEditandoMsg(false) : abrirEdicaoMensagem())}
                        accessibilityRole="button"
                        accessibilityLabel="Editar a mensagem de cobrança"
                    >
                        <MaterialCommunityIcons name="message-text-outline" size={17} color={theme.colors.primary} />
                        <MenuTexto numberOfLines={1}>Mensagem</MenuTexto>
                    </MenuItem>
                </MenuLinha>

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

                {/* A chave Pix mora aqui, e não no perfil: é aqui que ela é usada,
                    e é aqui que o dono descobre que a cobrança pode sair com o
                    valor já preenchido. */}
                {(editandoPix || !academia?.pixKey) && (
                    <CartaoPix>
                        <PixCabecalho>
                            <MaterialCommunityIcons name="qrcode" size={20} color={theme.colors.primary} />
                            <PixTitulo style={{ marginBottom: 0 }}>Cobrança com Pix</PixTitulo>
                        </PixCabecalho>
                        <PixTexto>
                            Com a chave cadastrada, cada cobrança sai com um Pix copia e cola
                            e o valor já preenchido — o aluno só cola no banco. O dinheiro vai
                            direto para você; o app não recebe nada no meio.
                        </PixTexto>

                        <TipoLinha>
                            {TIPOS_CHAVE_PIX.map(t => (
                                <TipoChip
                                    key={t.valor}
                                    ativo={pixTipo === t.valor}
                                    onPress={() => { setPixTipo(t.valor); setPixChave(''); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Tipo de chave: ${t.rotulo}`}
                                >
                                    <TipoChipTexto ativo={pixTipo === t.valor}>{t.rotulo}</TipoChipTexto>
                                </TipoChip>
                            ))}
                        </TipoLinha>

                        <Input
                            placeholder={
                                pixTipo === 'cpf' ? '000.000.000-00'
                                    : pixTipo === 'cnpj' ? '00.000.000/0000-00'
                                        : pixTipo === 'celular' ? '(00)00000-0000'
                                            : pixTipo === 'email' ? 'voce@academia.com.br'
                                                : 'chave aleatória do banco'
                            }
                            value={pixChave}
                            onChangeText={t => setPixChave(mascararChave(pixTipo, t))}
                            keyboardType={teclado(pixTipo)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={{ marginBottom: 10 }}
                        />
                        <Input
                            placeholder="Cidade da conta (opcional)"
                            value={pixCidade}
                            onChangeText={setPixCidade}
                            style={{ marginBottom: 12 }}
                        />

                        <Row style={{ gap: 8 }}>
                            <AcaoLinha
                                bg={theme.colors.primary}
                                onPress={salvarPix}
                                disabled={salvandoPix}
                                accessibilityRole="button"
                                accessibilityLabel="Salvar chave Pix"
                            >
                                {salvandoPix
                                    ? <ActivityIndicator size="small" color={theme.colors.background} />
                                    : <AcaoTexto>Salvar chave</AcaoTexto>}
                            </AcaoLinha>

                            {academia?.pixKey && (
                                <TouchableOpacity
                                    onPress={() => setEditandoPix(false)}
                                    style={{ paddingHorizontal: 12, justifyContent: 'center' }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cancelar edição da chave Pix"
                                >
                                    <ListItemSubtitle>Cancelar</ListItemSubtitle>
                                </TouchableOpacity>
                            )}
                        </Row>
                    </CartaoPix>
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

            {/* Mensagem de cobrança, editável: cobrança é assunto delicado e
                cada dono fala de um jeito. O Pix é anexado fora do modelo. */}
            {editandoMsg && (
                <CartaoPix>
                    <PixCabecalho>
                        <MaterialCommunityIcons name="message-text-outline" size={20} color={theme.colors.primary} />
                        <PixTitulo style={{ marginBottom: 0 }}>Mensagem de cobrança</PixTitulo>
                    </PixCabecalho>
                    <PixTexto>
                        Use {'{nome}'}, {'{meses}'} e {'{valor}'} onde quiser que entrem os
                        dados do aluno. O código Pix é anexado no fim automaticamente.
                    </PixTexto>

                    <Input
                        value={modeloMsg}
                        onChangeText={setModeloMsg}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ marginBottom: 10, minHeight: 100 }}
                    />

                    <PixTexto style={{ marginBottom: 12 }}>
                        {MARCADORES.map(m => `${m.chave} = ${m.descricao}`).join('  ·  ')}
                    </PixTexto>

                    <Row style={{ gap: 8 }}>
                        <AcaoLinha bg={theme.colors.primary} onPress={salvarMensagem} disabled={salvandoMsg}
                            accessibilityRole="button" accessibilityLabel="Salvar mensagem de cobrança">
                            {salvandoMsg
                                ? <ActivityIndicator size="small" color={theme.colors.background} />
                                : <AcaoTexto>Salvar mensagem</AcaoTexto>}
                        </AcaoLinha>
                        <TouchableOpacity onPress={() => setModeloMsg(MENSAGEM_PADRAO)}
                            style={{ paddingHorizontal: 12, justifyContent: 'center' }}
                            accessibilityRole="button" accessibilityLabel="Voltar ao texto padrão">
                            <ListItemSubtitle>Padrão</ListItemSubtitle>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditandoMsg(false)}
                            style={{ paddingHorizontal: 12, justifyContent: 'center' }}
                            accessibilityRole="button" accessibilityLabel="Cancelar edição da mensagem">
                            <ListItemSubtitle>Cancelar</ListItemSubtitle>
                        </TouchableOpacity>
                    </Row>
                </CartaoPix>
            )}
        </>
    );

    return (
        <PageContainer>
            <PageHeader><PageTitle>Cobranças</PageTitle></PageHeader>
            <FlatList
                data={devedores}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={cabecalho}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
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
