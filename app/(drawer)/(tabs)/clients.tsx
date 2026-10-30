import { SkeletonLoader } from '@/components/SkeletonLoader';
import { iniciaisDe } from '@/src/components/alunos/icones';
import { Icon } from '@/src/components/Icon';
import { Pill } from '@/src/components/Pill';
import { PageContainer, PageTitle } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

/* Layout do redesign (Claude Design, board "Alunos"). A busca no banco, o
   filtro da busca e a exclusão são os mesmos de antes; só a apresentação
   mudou.

   Os filtros "Em dia" e "Em atraso" do desenho ficaram de fora: esta tela não
   carrega pagamentos, e a situação de cobrança só existe de verdade pela regra
   de src/utils/overdue (o payment_status gravado no aluno não é essa regra).
   Trancado sai direto de subscription_locked, então esse entra. */

const Topo = styled.View`
  padding: ${theme.spacing.lg}px ${theme.spacing.xl}px 0;
  gap: ${theme.spacing.lg}px;
`;

const Cabecalho = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md}px;
`;

const Apoio = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const BotaoNovo = styled(TouchableOpacity)`
  min-height: ${theme.touch}px;
  padding: 0 ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${theme.colors.primary};
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const BotaoNovoTexto = styled.Text`
  font-family: ${theme.fonts.bold};
  font-size: 15px;
  color: ${theme.colors.onPrimary};
`;

const Busca = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.border};
`;

const BuscaInput = styled.TextInput.attrs({ placeholderTextColor: theme.colors.placeholder })`
  flex: 1;
  height: 100%;
  font-family: ${theme.fonts.regular};
  font-size: 15px;
  color: ${theme.colors.text};
`;

const Filtro = styled(TouchableOpacity)<{ ativo: boolean }>`
  min-height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  border-width: 1px;
  border-color: ${({ ativo }) => (ativo ? theme.colors.text : theme.colors.border)};
  background-color: ${({ ativo }) => (ativo ? theme.colors.text : 'transparent')};
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const FiltroTexto = styled.Text<{ ativo: boolean }>`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${({ ativo }) => (ativo ? theme.colors.onPrimary : theme.colors.textStrong)};
`;

/* Cada linha desenha a sua parte do cartão (topo, meio ou fundo), para a
   lista continuar virtualizada no FlatList e ainda parecer um bloco só. */
const LinhaCartao = styled.View<{ primeira: boolean; ultima: boolean }>`
  margin: 0 ${theme.spacing.xl}px;
  flex-direction: row;
  align-items: center;
  background-color: ${theme.colors.surface};
  border-color: ${theme.colors.divider};
  border-left-width: 1px;
  border-right-width: 1px;
  border-top-width: 1px;
  border-bottom-width: ${({ ultima }) => (ultima ? 1 : 0)}px;
  border-top-left-radius: ${({ primeira }) => (primeira ? theme.borderRadius.lg : 0)}px;
  border-top-right-radius: ${({ primeira }) => (primeira ? theme.borderRadius.lg : 0)}px;
  border-bottom-left-radius: ${({ ultima }) => (ultima ? theme.borderRadius.lg : 0)}px;
  border-bottom-right-radius: ${({ ultima }) => (ultima ? theme.borderRadius.lg : 0)}px;
`;

const LinhaToque = styled(TouchableOpacity)`
  flex: 1;
  min-width: 0;
  min-height: 76px;
  flex-direction: row;
  align-items: center;
  gap: ${theme.spacing.md}px;
  padding: ${theme.spacing.md}px 4px ${theme.spacing.md}px ${theme.spacing.lg}px;
`;

const Avatar = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${theme.colors.neutralPill};
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const AvatarFoto = styled.Image`
  width: 40px;
  height: 40px;
`;

const AvatarTexto = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${theme.colors.textStrong};
`;

const Nome = styled.Text`
  flex-shrink: 1;
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${theme.colors.text};
`;

const Email = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const Etiqueta = styled.View<{ bg: string }>`
  padding: 2px 8px;
  border-radius: 6px;
  background-color: ${({ bg }) => bg};
`;

const EtiquetaTexto = styled.Text<{ fg: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 12px;
  color: ${({ fg }) => fg};
`;

const Miudo = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

const BotaoMenu = styled(TouchableOpacity)`
  width: ${theme.touch}px;
  height: ${theme.touch}px;
  margin-right: 6px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
`;

const Vazio = styled.Text`
  margin-top: ${theme.spacing.xl}px;
  text-align: center;
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const Rodape = styled.Text`
  margin-top: ${theme.spacing.lg}px;
  text-align: center;
  font-family: ${theme.fonts.regular};
  font-size: 12px;
  color: ${theme.colors.textMuted};
`;

/* Folha de ações da linha. */
const Folha = styled.View`
  background-color: ${theme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${theme.colors.border};
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: ${theme.spacing.md}px ${theme.spacing.xl}px;
  gap: ${theme.spacing.sm}px;
`;

const Alca = styled.View`
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: #3A3F45;
  margin-bottom: ${theme.spacing.sm}px;
`;

const FolhaNome = styled.Text`
  margin-bottom: 4px;
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${theme.colors.textSecondary};
`;

const FolhaTitulo = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 20px;
  color: ${theme.colors.text};
`;

const FolhaTexto = styled.Text`
  margin-bottom: ${theme.spacing.sm}px;
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  line-height: 21px;
  color: ${theme.colors.textSecondary};
`;

const OpcaoFolha = styled(TouchableOpacity)<{ perigo?: boolean }>`
  min-height: 52px;
  padding: 0 ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  background-color: ${({ perigo }) => (perigo ? 'rgba(248,113,113,0.12)' : theme.colors.elevated)};
  justify-content: center;
`;

const OpcaoFolhaTexto = styled.Text<{ perigo?: boolean }>`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${({ perigo }) => (perigo ? theme.colors.danger : theme.colors.text)};
`;

const BotaoFolha = styled(TouchableOpacity)<{ tipo: 'perigo' | 'contorno' }>`
  min-height: 52px;
  border-radius: ${theme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ tipo }) => (tipo === 'perigo' ? theme.colors.danger : 'transparent')};
  border-width: ${({ tipo }) => (tipo === 'contorno' ? 1 : 0)}px;
  border-color: ${theme.colors.border};
`;

const BotaoFolhaTexto = styled.Text<{ tipo: 'perigo' | 'contorno' }>`
  font-family: ${({ tipo }) => (tipo === 'perigo' ? theme.fonts.bold : theme.fonts.semibold)};
  font-size: 15px;
  color: ${({ tipo }) => (tipo === 'perigo' ? theme.colors.onPrimary : theme.colors.text)};
`;

type FiltroId = 'todos' | 'trancados';

export default function ClientsScreen() {
    const [clients, setClients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<FiltroId>('todos');
    // Aluno com a folha de ações aberta; `confirmando` troca as opções pela
    // confirmação de exclusão, dentro da mesma folha.
    const [menu, setMenu] = useState<{ id: string; name: string } | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    const [excluindo, setExcluindo] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('*')
                .eq('gym_id', gymId);
            const { data: plansData, error: plansError } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId);

            if (clientsError) throw clientsError;
            if (plansData) setPlans(plansData);

            if (clientsData) {
                const mappedClients = clientsData.map(c => ({
                    ...c,
                    plano_nome: plansData?.find(p => p.id === c.plan_id)?.name || 'N/A'
                }));
                setClients(mappedClients);
            }
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os alunos.');
            }
        } finally {
            setRefreshing(false);
            setLoading(false);
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

    const fecharMenu = () => {
        setMenu(null);
        setConfirmando(false);
    };

    // Mesma exclusão de antes; a confirmação mudou do Alert para a folha.
    const handleDelete = async (id: string) => {
        setExcluindo(true);
        const { error } = await supabase.from('clients').delete().eq('id', id);
        setExcluindo(false);
        fecharMenu();
        if (error) Alert.alert('Erro', 'Não foi possível excluir o aluno. Tente novamente.');
        else fetchData();
    };

    // Cor do badge por hash estável do nome do plano (C7).
    //
    // A regra anterior casava a string: um plano chamado "Básico" saía
    // vermelho — a mesma cor que o app usa para inadimplência — e qualquer
    // outro nome caía no verde de "em dia". A cor passava um julgamento que
    // ninguém pediu. Vermelho e verde ficam de fora da paleta justamente por
    // já terem significado em outras telas.
    const BADGE_PALETTE = [
        { bg: '#1E3A8A', text: '#93C5FD' }, // blue
        { bg: '#4C1D95', text: '#C4B5FD' }, // violet
        { bg: '#134E4A', text: '#5EEAD4' }, // teal
        { bg: '#713F12', text: '#FDE047' }, // amber
        { bg: '#831843', text: '#F9A8D4' }, // pink
        { bg: '#374151', text: '#D1D5DB' }, // gray
    ];

    const getBadgeColor = (planName: string) => {
        const name = (planName || '').trim();
        if (!name) return BADGE_PALETTE[BADGE_PALETTE.length - 1];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 31 + name.charCodeAt(i)) | 0;
        }
        return BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length];
    };

    const trancados = clients.filter(c => c.subscription_locked).length;

    // Sem trancados os chips somem; o filtro não pode ficar preso em "Trancados".
    const filtroEfetivo: FiltroId = trancados > 0 ? filtro : 'todos';

    const filteredClients = clients
        .filter(client => filtroEfetivo === 'todos' || client.subscription_locked)
        .filter(client =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.plano_nome.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const badgeColors = getBadgeColor(item.plano_nome);
        return (
            <LinhaCartao primeira={index === 0} ultima={index === filteredClients.length - 1}>
                <LinhaToque
                    onPress={() => router.push({ pathname: '/client-details', params: { id: item.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ficha de ${item.name}`}
                >
                    <Avatar>
                        {item.photo_url
                            ? <AvatarFoto source={{ uri: item.photo_url }} />
                            : <AvatarTexto>{iniciaisDe(item.name)}</AvatarTexto>}
                    </Avatar>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <Nome numberOfLines={1}>{item.name}</Nome>
                            {item.subscription_locked ? <Pill tone="neutral" label="Trancado" small /> : null}
                        </View>
                        <Email numberOfLines={1}>{item.email}</Email>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Etiqueta bg={badgeColors.bg} style={{ flexShrink: 1 }}>
                                <EtiquetaTexto fg={badgeColors.text} numberOfLines={1}>{item.plano_nome}</EtiquetaTexto>
                            </Etiqueta>
                            <Miudo>{item.due_day ? `Vence dia ${item.due_day}` : 'Sem vencimento'}</Miudo>
                        </View>
                    </View>
                </LinhaToque>
                <BotaoMenu
                    onPress={() => { setConfirmando(false); setMenu({ id: item.id, name: item.name }); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Ações para ${item.name}`}
                >
                    <Icon name="dots" size={20} color={theme.colors.textSecondary} />
                </BotaoMenu>
            </LinhaCartao>
        );
    };

    const filtros: { id: FiltroId; rotulo: string; contagem: number }[] = [
        { id: 'todos', rotulo: 'Todos', contagem: clients.length },
        { id: 'trancados', rotulo: 'Trancados', contagem: trancados },
    ];

    const resumo = loading
        ? ''
        : `${clients.length} ${clients.length === 1 ? 'aluno' : 'alunos'}` +
          (trancados > 0 ? ` · ${trancados} ${trancados === 1 ? 'trancado' : 'trancados'}` : '');

    return (
        <PageContainer>
            <Topo>
                <Cabecalho>
                    <View style={{ gap: 2, flex: 1 }}>
                        <PageTitle>Alunos</PageTitle>
                        {resumo ? <Apoio>{resumo}</Apoio> : null}
                    </View>
                    <BotaoNovo onPress={() => router.push('/manage-client')} accessibilityRole="button" accessibilityLabel="Novo aluno">
                        <Icon name="plus" size={18} color={theme.colors.onPrimary} strokeWidth={2.4} />
                        <BotaoNovoTexto>Novo</BotaoNovoTexto>
                    </BotaoNovo>
                </Cabecalho>

                <Busca>
                    <Icon name="search" size={18} color={theme.colors.textMuted} />
                    <BuscaInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Nome, e-mail ou plano"
                        accessibilityLabel="Buscar aluno"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            accessibilityRole="button"
                            accessibilityLabel="Limpar busca"
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Icon name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </Busca>

                {/* Só há o que filtrar quando existe aluno trancado. */}
                {!loading && trancados > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
                        {filtros.map(f => {
                            const ativo = filtroEfetivo === f.id;
                            return (
                                <Filtro
                                    key={f.id}
                                    ativo={ativo}
                                    onPress={() => setFiltro(f.id)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: ativo }}
                                    hitSlop={{ top: 4, bottom: 4 }}
                                >
                                    <FiltroTexto ativo={ativo}>{f.rotulo}</FiltroTexto>
                                    <FiltroTexto ativo={ativo} style={{ opacity: 0.7 }}>{f.contagem}</FiltroTexto>
                                </Filtro>
                            );
                        })}
                    </View>
                )}
            </Topo>

            {loading ? (
                <View style={{ padding: theme.spacing.xl }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="list-item" />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredClients}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ paddingTop: theme.spacing.lg, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Vazio>{searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</Vazio>
                    }
                    ListFooterComponent={filteredClients.length > 0 ? <Rodape>Puxe para baixo para atualizar</Rodape> : null}
                    initialNumToRender={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}

            <Modal transparent visible={!!menu} animationType="fade" onRequestClose={fecharMenu}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <Pressable style={{ flex: 1 }} onPress={fecharMenu} accessibilityRole="button" accessibilityLabel="Fechar" />
                    <Folha style={{ paddingBottom: insets.bottom + 24 }}>
                        <Alca />
                        {menu && confirmando ? (
                            <>
                                <FolhaTitulo>Excluir aluno?</FolhaTitulo>
                                <FolhaTexto>Deseja realmente excluir {menu.name}? O cadastro e o histórico somem do app.</FolhaTexto>
                                <BotaoFolha tipo="perigo" onPress={() => handleDelete(menu.id)} disabled={excluindo} accessibilityRole="button">
                                    {excluindo
                                        ? <ActivityIndicator color={theme.colors.onPrimary} />
                                        : <BotaoFolhaTexto tipo="perigo">Excluir</BotaoFolhaTexto>}
                                </BotaoFolha>
                                <BotaoFolha tipo="contorno" onPress={fecharMenu} disabled={excluindo} accessibilityRole="button">
                                    <BotaoFolhaTexto tipo="contorno">Cancelar</BotaoFolhaTexto>
                                </BotaoFolha>
                            </>
                        ) : menu ? (
                            <>
                                <FolhaNome numberOfLines={1}>{menu.name}</FolhaNome>
                                <OpcaoFolha accessibilityRole="button" onPress={() => {
                                    const id = menu.id;
                                    fecharMenu();
                                    router.push({ pathname: '/client-details', params: { id } });
                                }}>
                                    <OpcaoFolhaTexto>Ver ficha</OpcaoFolhaTexto>
                                </OpcaoFolha>
                                <OpcaoFolha accessibilityRole="button" onPress={() => {
                                    const id = menu.id;
                                    fecharMenu();
                                    router.push({ pathname: '/manage-client', params: { id } });
                                }}>
                                    <OpcaoFolhaTexto>Editar cadastro</OpcaoFolhaTexto>
                                </OpcaoFolha>
                                <OpcaoFolha perigo accessibilityRole="button" onPress={() => setConfirmando(true)}>
                                    <OpcaoFolhaTexto perigo>Excluir aluno</OpcaoFolhaTexto>
                                </OpcaoFolha>
                            </>
                        ) : null}
                    </Folha>
                </View>
            </Modal>
        </PageContainer>
    );
}
