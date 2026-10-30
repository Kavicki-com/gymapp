import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Icon } from '@/src/components/Icon';
import {
    Apoio,
    BotaoIcone,
    BotaoNovo,
    CampoBusca,
    IconeLixeira,
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
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import styled from 'styled-components/native';

/* Layout do redesign (Claude Design, board "Planos"). Busca, exclusão e
   consulta são as mesmas de antes; só a apresentação mudou. A contagem de
   alunos por plano do board ficou de fora: esta tela não carrega alunos. */

/* Azul só para distinguir o plano anual na lista; não é cor de dinheiro,
   por isso não está no tema. */
const ANUAL_FUNDO = 'rgba(96,165,250,0.14)';
const ANUAL_TEXTO = '#60A5FA';

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

const Cartao = styled.View`
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: ${theme.borderRadius.lg}px;
    padding: ${theme.spacing.lg}px ${theme.spacing.lg}px 4px;
    gap: 10px;
`;

const LinhaTopo = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: ${theme.spacing.md}px;
`;

const NomePlano = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: ${theme.fontSize.md}px;
    color: ${theme.colors.text};
`;

const Preco = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSize.xl}px;
    color: ${theme.colors.text};
`;

const Selo = styled.View<{ anual: boolean }>`
    align-self: flex-start;
    padding: 3px 9px;
    border-radius: ${theme.borderRadius.pill}px;
    background-color: ${({ anual }) => (anual ? ANUAL_FUNDO : theme.colors.neutralPill)};
`;

const SeloTexto = styled.Text<{ anual: boolean }>`
    font-family: ${theme.fonts.semibold};
    font-size: 12px;
    color: ${({ anual }) => (anual ? ANUAL_TEXTO : theme.colors.textStrong)};
`;

const Servicos = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    line-height: 19px;
    color: ${theme.colors.textSecondary};
`;

const Acoes = styled.View`
    flex-direction: row;
    justify-content: flex-end;
    gap: 4px;
    border-top-width: 1px;
    border-top-color: ${theme.colors.divider};
    padding-top: 2px;
`;

export default function PlansScreen() {
    const [plans, setPlans] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = async () => {
        try {
            const gymId = await getCurrentGymId();
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId)
                .order('name');
            if (error) throw error;
            if (data) setPlans(data);
        } catch (error: any) {
            if (error.message === 'Perfil não encontrado') {
                Alert.alert('Sessão Expirada', 'Por favor, faça login novamente.', [
                    { text: 'OK', onPress: () => supabase.auth.signOut() }
                ]);
            } else {
                console.error(error);
                Alert.alert('Erro', 'Não foi possível carregar os planos.');
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
            `Deseja realmente excluir o plano ${name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('plans').delete().eq('id', id);
                        if (error) Alert.alert('Erro', 'Não foi possível excluir o plano. Tente novamente.');
                        else fetchData();
                    }
                }
            ]
        );
    };

    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.services && plan.services.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderItem = ({ item }: { item: any }) => {
        const anual = item.billing_type === 'annual';
        return (
            <Cartao>
                <LinhaTopo>
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <NomePlano>{item.name}</NomePlano>
                        <Selo anual={anual}>
                            <SeloTexto anual={anual}>{anual ? 'Anual' : 'Mensal'}</SeloTexto>
                        </Selo>
                    </View>
                    <Preco>{formatCurrency(item.price || 0)}</Preco>
                </LinhaTopo>
                {item.services ? <Servicos>{item.services}</Servicos> : null}
                <Acoes>
                    <BotaoIcone
                        onPress={() => router.push({ pathname: '/manage-plan', params: { id: item.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${item.name}`}
                    >
                        <Icon name="pencil" size={18} color={theme.colors.textStrong} />
                    </BotaoIcone>
                    <BotaoIcone
                        onPress={() => handleDelete(item.id, item.name)}
                        accessibilityRole="button"
                        accessibilityLabel={`Excluir ${item.name}`}
                    >
                        <IconeLixeira size={18} color={theme.colors.danger} />
                    </BotaoIcone>
                </Acoes>
            </Cartao>
        );
    };

    const resumo = loading ? '' : `${plans.length} ${plans.length === 1 ? 'plano' : 'planos'}`;

    return (
        <PageContainer>
            <Topo>
                <Cabecalho>
                    <View style={{ gap: 2, flex: 1 }}>
                        <TituloTela accessibilityRole="header">Planos</TituloTela>
                        {resumo ? <Apoio>{resumo}</Apoio> : null}
                    </View>
                    <BotaoNovo onPress={() => router.push('/manage-plan')} accessibilityLabel="Novo plano" />
                </Cabecalho>

                <CampoBusca
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Nome ou serviço"
                    accessibilityLabel="Buscar plano"
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
                    data={filteredPlans}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.lg, gap: 10 }}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <TextoVazio>
                            {searchQuery ? 'Nenhum plano encontrado.' : 'Nenhum plano cadastrado.'}
                        </TextoVazio>
                    }
                    initialNumToRender={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                />
            )}
        </PageContainer>
    );
}
