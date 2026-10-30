import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
    BotaoSalvar,
    BotaoSalvarTexto,
    CabecalhoModal,
    Campo,
    Dica,
    Entrada,
    Obrigatorio,
    Rodape,
    RotuloCampo,
} from '@/src/components/planos/pecas';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency, formatCurrencyInput, parseCurrencyToFloat } from '@/src/utils/masks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { Container } from '../src/components/styled';

/* Layout do redesign (Claude Design, board "PlanoForm"). Carregamento,
   validação e gravação são os mesmos de antes; só a apresentação mudou. */

const TipoGrade = styled.View`
    flex-direction: row;
    gap: 10px;
`;

const TipoBotao = styled(TouchableOpacity) <{ selected: boolean }>`
    flex: 1;
    min-height: 72px;
    padding: 12px 14px;
    border-radius: 16px;
    justify-content: center;
    gap: 2px;
    background-color: ${({ selected }) => (selected ? 'rgba(234,179,8,0.10)' : theme.colors.surface)};
    border-width: 1.5px;
    border-color: ${({ selected }) => (selected ? theme.colors.primary : theme.colors.border)};
`;

const TipoTitulo = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const TipoDica = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textSecondary};
`;

const ValorCaixa = styled.View`
    flex-direction: row;
    align-items: center;
    gap: ${theme.spacing.sm}px;
    min-height: 60px;
    padding: 0 ${theme.spacing.lg}px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.border};
`;

const ValorPrefixo = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.textMuted};
`;

const ValorEntrada = styled.TextInput`
    flex: 1;
    min-width: 0;
    padding: 0;
    font-family: ${theme.fonts.display};
    font-size: 26px;
    color: ${theme.colors.text};
`;

/* O valor guardado no estado continua com o "R$ " da máscara (é o que o
   parseCurrencyToFloat espera); aqui só tiramos o prefixo da exibição,
   porque o board mostra o "R$" fora da caixa de digitação. */
const semPrefixo = (v: string) => v.replace(/^R\$\s?/, '');

const TIPOS = [
    { id: 'monthly', rotulo: 'Mensal', dica: 'Cobra todo mês' },
    { id: 'annual', rotulo: 'Anual', dica: 'Cobrança única' },
] as const;

export default function ManagePlanScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        services: '',
        billing_type: 'monthly',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            if (isEditing) {
                const { data: plan, error } = await supabase.from('plans').select('*').eq('id', id).single();
                if (error) throw error;
                if (plan) {
                    setFormData({
                        name: plan.name || '',
                        price: formatCurrency(plan.price),
                        services: plan.services || '',
                        billing_type: plan.billing_type || 'monthly',
                    });
                }
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Falha ao carregar dados.');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            Alert.alert('Erro', 'Nome e Preço são obrigatórios');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                price: parseCurrencyToFloat(formData.price),
                services: formData.services,
                billing_type: formData.billing_type,
            };

            if (isEditing) {
                const { error } = await supabase.from('plans').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('plans').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o plano. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Mesmo comportamento do ModalHandle que ficava no topo.
    const fechar = () => {
        if (router.canGoBack()) return router.back();
        router.replace('/(drawer)/(tabs)');
    };

    // iOS abre como folha (o sistema já afasta do topo); no Android o modal
    // ocupa a tela toda e precisa descer da barra de status.
    const topo = Platform.OS === 'ios' ? theme.spacing.xl : insets.top + theme.spacing.md;

    if (fetching) return (
        <Container style={{ paddingTop: topo }}>
            <SkeletonLoader variant="form" />
        </Container>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
            <Container>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingTop: topo, paddingBottom: 32, gap: 22 }}
                >
                    <CabecalhoModal
                        titulo={isEditing ? 'Editar plano' : 'Novo plano'}
                        onClose={fechar}
                        rotuloFechar="Fechar e voltar para Planos"
                    />

                    <Campo style={{ gap: 8 }}>
                        <RotuloCampo>Nome do plano <Obrigatorio>*</Obrigatorio></RotuloCampo>
                        <Entrada
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                            placeholder="Ex: Mensal Musculação"
                            accessibilityLabel="Nome do plano"
                            style={{ minHeight: 52, paddingHorizontal: 14 }}
                        />
                    </Campo>

                    <Campo style={{ gap: 8 }}>
                        <RotuloCampo>Tipo de cobrança</RotuloCampo>
                        <TipoGrade>
                            {TIPOS.map(t => {
                                const selected = formData.billing_type === t.id;
                                return (
                                    <TipoBotao
                                        key={t.id}
                                        selected={selected}
                                        onPress={() => setFormData({ ...formData, billing_type: t.id })}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected }}
                                        accessibilityLabel={`${t.rotulo}, ${t.dica}`}
                                    >
                                        <TipoTitulo>{t.rotulo}</TipoTitulo>
                                        <TipoDica>{t.dica}</TipoDica>
                                    </TipoBotao>
                                );
                            })}
                        </TipoGrade>
                    </Campo>

                    <Campo style={{ gap: 8 }}>
                        <RotuloCampo>
                            {formData.billing_type === 'annual' ? 'Valor da cobrança única' : 'Valor por mês'} <Obrigatorio>*</Obrigatorio>
                        </RotuloCampo>
                        <ValorCaixa>
                            <ValorPrefixo>R$</ValorPrefixo>
                            <ValorEntrada
                                value={semPrefixo(formData.price)}
                                onChangeText={t => setFormData({ ...formData, price: formatCurrencyInput(t) })}
                                keyboardType="numeric"
                                placeholder="0,00"
                                placeholderTextColor={theme.colors.placeholder}
                                accessibilityLabel={formData.billing_type === 'annual' ? 'Valor da cobrança única' : 'Valor por mês'}
                            />
                        </ValorCaixa>
                        <Dica>
                            Estes valores são apenas para controle administrativo interno da sua unidade e não geram cobranças pelo aplicativo.
                        </Dica>
                    </Campo>

                    <Campo style={{ gap: 8 }}>
                        <RotuloCampo>Serviços incluídos</RotuloCampo>
                        <Entrada
                            value={formData.services}
                            onChangeText={t => setFormData({ ...formData, services: t })}
                            multiline
                            textAlignVertical="top"
                            placeholder="Ex: Musculação livre, avaliação física trimestral"
                            accessibilityLabel="Serviços incluídos"
                            style={{ minHeight: 110, padding: 14, paddingTop: 14, fontSize: 15, lineHeight: 22 }}
                        />
                        <Dica>Aparece na lista de planos e ajuda na busca.</Dica>
                    </Campo>
                </ScrollView>

                <Rodape style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
                    <BotaoSalvar onPress={handleSave} disabled={loading} accessibilityRole="button">
                        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <BotaoSalvarTexto>Salvar</BotaoSalvarTexto>}
                    </BotaoSalvar>
                </Rodape>
            </Container>
        </KeyboardAvoidingView>
    );
}
