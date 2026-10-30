import { BottomSheet } from '@/src/components/BottomSheet';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { iniciaisDe, proximoPagamento } from '@/src/components/colaboradores/pagamento';
import { Icon } from '@/src/components/Icon';
import {
    Apoio,
    BotaoIcone,
    BotaoNovo,
    CampoBusca,
    IconeKebab,
    TextoVazio,
    TituloTela,
} from '@/src/components/planos/pecas';
import { PageContainer } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

/* Layout do redesign (Claude Design, board "Colaboradores"). Consulta, busca
   e exclusão são as mesmas de antes; só a apresentação mudou. Colaboradores
   saiu da barra de abas e abre pela aba Mais, daí a seta de voltar. */

const Topo = styled.View`
    padding: ${theme.spacing.sm}px ${theme.spacing.xl}px 0;
    gap: ${theme.spacing.lg}px;
`;

const Barra = styled.View`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const Linha = styled.View<{ primeira: boolean; ultima: boolean }>`
    flex-direction: row;
    align-items: center;
    background-color: ${theme.colors.surface};
    border-left-width: 1px;
    border-right-width: 1px;
    border-color: ${theme.colors.divider};
    border-top-width: 1px;
    border-top-color: ${theme.colors.divider};
    border-bottom-width: ${({ ultima }) => (ultima ? 1 : 0)}px;
    border-top-left-radius: ${({ primeira }) => (primeira ? theme.borderRadius.lg : 0)}px;
    border-top-right-radius: ${({ primeira }) => (primeira ? theme.borderRadius.lg : 0)}px;
    border-bottom-left-radius: ${({ ultima }) => (ultima ? theme.borderRadius.lg : 0)}px;
    border-bottom-right-radius: ${({ ultima }) => (ultima ? theme.borderRadius.lg : 0)}px;
`;

const LinhaToque = styled(TouchableOpacity)`
    flex: 1;
    min-width: 0;
    flex-direction: row;
    align-items: center;
    gap: ${theme.spacing.md}px;
    min-height: 80px;
    padding: 14px 4px 14px ${theme.spacing.lg}px;
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
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const Detalhe = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const Salario = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 12px;
    color: ${theme.colors.text};
`;

const Quando = styled.Text<{ cor: string }>`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${({ cor }) => cor};
`;

const Folha = styled.View`
    background-color: ${theme.colors.surface};
    border-top-width: 1px;
    border-top-color: ${theme.colors.border};
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    padding: 12px ${theme.spacing.xl}px 0;
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

const FolhaTitulo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.textSecondary};
    margin-bottom: 4px;
`;

const FolhaAcao = styled(TouchableOpacity) <{ perigo?: boolean }>`
    min-height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${({ perigo }) => (perigo ? 'rgba(248,113,113,0.12)' : theme.colors.elevated)};
    justify-content: center;
    padding: 0 ${theme.spacing.lg}px;
`;

const FolhaAcaoTexto = styled.Text<{ perigo?: boolean }>`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${({ perigo }) => (perigo ? theme.colors.danger : theme.colors.text)};
`;

export default function EmployeesScreen() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [menu, setMenu] = useState<any | null>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('gym_id', gymId)
                .order('name');
            if (error) throw error;
            if (data) setEmployees(data);
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os colaboradores.');
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

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir o colaborador ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('employees').delete().eq('id', id);
                        if (error) Alert.alert('Erro', 'Não foi possível excluir o colaborador. Tente novamente.');
                        else fetchData();
                    }
                }
            ]
        );
    };

    const filteredEmployees = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const voltar = () => {
        if (router.canGoBack()) return router.back();
        router.replace('/(drawer)/(tabs)/more');
    };

    const abrirFicha = (id: string) => router.push({ pathname: '/employee-details', params: { id } });
    const abrirEdicao = (id: string) => router.push({ pathname: '/manage-employee', params: { id } });

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const pagamento = proximoPagamento(item.payment_day);
        const detalhe = [item.role, item.email].filter(Boolean).join(' · ');
        return (
            <Linha primeira={index === 0} ultima={index === filteredEmployees.length - 1}>
                <LinhaToque
                    onPress={() => abrirFicha(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ficha de ${item.name}`}
                >
                    <Avatar>
                        {item.photo_url
                            ? <AvatarFoto source={{ uri: item.photo_url }} />
                            : <AvatarTexto>{iniciaisDe(item.name)}</AvatarTexto>}
                    </Avatar>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Nome numberOfLines={1}>{item.name}</Nome>
                        {detalhe ? <Detalhe numberOfLines={1}>{detalhe}</Detalhe> : null}
                        <Salario>
                            {formatCurrency(item.salary || 0)}
                            {pagamento ? (
                                <Quando cor={pagamento.proximo ? theme.colors.primary : theme.colors.textSecondary}>
                                    {` · paga dia ${item.payment_day}${pagamento.proximo ? ` · ${pagamento.quando}` : ''}`}
                                </Quando>
                            ) : null}
                        </Salario>
                    </View>
                </LinhaToque>
                <BotaoIcone
                    onPress={() => setMenu(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ações para ${item.name}`}
                    style={{ marginRight: 6 }}
                >
                    <IconeKebab size={20} color={theme.colors.textSecondary} />
                </BotaoIcone>
            </Linha>
        );
    };

    // Resumo do topo, a partir da lista que a tela já carrega.
    const folhaMensal = employees.reduce((soma, e) => soma + (Number(e.salary) || 0), 0);
    const resumo = loading ? '' :
        `${employees.length} ${employees.length === 1 ? 'pessoa' : 'pessoas'}` +
        (folhaMensal > 0 ? ` · ${formatCurrency(folhaMensal)} em salários por mês` : '');

    return (
        <PageContainer>
            <Topo>
                <Barra>
                    <BotaoIcone
                        onPress={voltar}
                        accessibilityRole="button"
                        accessibilityLabel="Voltar"
                        style={{ marginLeft: -10 }}
                    >
                        <Icon name="back" size={22} color={theme.colors.text} strokeWidth={2.2} />
                    </BotaoIcone>
                    <BotaoNovo onPress={() => router.push('/manage-employee')} accessibilityLabel="Novo colaborador" />
                </Barra>

                <View style={{ gap: 2 }}>
                    <TituloTela accessibilityRole="header">Colaboradores</TituloTela>
                    {resumo ? <Apoio>{resumo}</Apoio> : null}
                </View>

                <CampoBusca
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Nome ou e-mail"
                    accessibilityLabel="Buscar colaborador"
                />
            </Topo>

            {loading ? (
                <View style={{ padding: theme.spacing.xl }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="list-item" />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredEmployees}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.lg }}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <TextoVazio>
                            {searchQuery ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado.'}
                        </TextoVazio>
                    }
                    initialNumToRender={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}

            <BottomSheet visible={!!menu} onClose={() => setMenu(null)}>
                    <Folha style={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}>
                        <Alca />
                        <FolhaTitulo numberOfLines={1}>{menu?.name}</FolhaTitulo>
                        <FolhaAcao
                            accessibilityRole="button"
                            onPress={() => { const m = menu; setMenu(null); if (m) abrirFicha(m.id); }}
                        >
                            <FolhaAcaoTexto>Ver detalhes</FolhaAcaoTexto>
                        </FolhaAcao>
                        <FolhaAcao
                            accessibilityRole="button"
                            onPress={() => { const m = menu; setMenu(null); if (m) abrirEdicao(m.id); }}
                        >
                            <FolhaAcaoTexto>Editar</FolhaAcaoTexto>
                        </FolhaAcao>
                        <FolhaAcao
                            perigo
                            accessibilityRole="button"
                            onPress={() => {
                                const m = menu;
                                setMenu(null);
                                // Espera a folha sair: no iOS um Alert aberto
                                // durante o fechamento do Modal pode sumir.
                                if (m) setTimeout(() => handleDelete(m.id, m.name), 300);
                            }}
                        >
                            <FolhaAcaoTexto perigo>Excluir</FolhaAcaoTexto>
                        </FolhaAcao>
                    </Folha>
                
            </BottomSheet>
        </PageContainer>
    );
}
