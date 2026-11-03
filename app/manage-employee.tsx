import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
    BotaoSalvar,
    BotaoSalvarTexto,
    CabecalhoModal,
    Campo,
    Entrada,
    Linha2,
    Obrigatorio,
    Rodape,
    RotuloCampo,
    TituloSecao,
} from '@/src/components/planos/pecas';
import { Section } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCPF, formatCurrency, formatCurrencyInput, formatPhone, parseCurrencyToFloat } from '@/src/utils/masks';
import { validateCPF, validateEmail, validatePhone } from '@/src/utils/validations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Container } from '../src/components/styled';

/* Layout do redesign (Claude Design, board "ColaboradorForm"): os campos
   agrupados em Contrato, Dados pessoais e Documentos. Máscaras, validações
   e gravação são as mesmas de antes; só a apresentação e a ordem mudaram. */

export default function ManageEmployeeScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        cpf: '',
        rg: '',
        salary: '',
        role: '',
        ctps: '',
        admission_date: '',
        payment_day: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return null;
        if (dateStr.includes('-')) return dateStr;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };

    const formatISODateToDisplay = (isoDate: string) => {
        if (!isoDate) return '';
        if (isoDate.includes('/')) return isoDate;
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const loadData = async () => {
        try {
            if (isEditing) {
                const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setFormData({
                        name: data.name || '',
                        email: data.email || '',
                        phone: formatPhone(data.phone || ''),
                        birth_date: formatISODateToDisplay(data.birth_date),
                        cpf: formatCPF(data.cpf || ''),
                        rg: data.rg || '',
                        salary: formatCurrency(data.salary),
                        role: data.role || '',
                        ctps: data.ctps || '',
                        admission_date: formatISODateToDisplay(data.admission_date),
                        payment_day: data.payment_day ? String(data.payment_day) : '',
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
        if (!formData.name || !formData.email) {
            Alert.alert('Erro', 'Nome e Email são obrigatórios');
            return;
        }

        if (!validateEmail(formData.email)) {
            Alert.alert('Erro', 'Email inválido.');
            return;
        }

        if (formData.phone && !validatePhone(formData.phone)) {
            Alert.alert('Erro', 'Telefone deve ter 11 dígitos.');
            return;
        }

        if (formData.cpf && !validateCPF(formData.cpf)) {
            Alert.alert('Erro', 'CPF inválido.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                birth_date: convertDateToISO(formData.birth_date),
                cpf: formData.cpf,
                rg: formData.rg,
                salary: formData.salary ? parseCurrencyToFloat(formData.salary) : null,
                role: formData.role,
                ctps: formData.ctps,
                admission_date: convertDateToISO(formData.admission_date),
                payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('employees').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('employees').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o colaborador. Tente novamente.');
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Container>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingTop: topo, paddingBottom: 32, gap: 18 }}
                >
                    <CabecalhoModal
                        titulo={isEditing ? 'Editar colaborador' : 'Novo colaborador'}
                        onClose={fechar}
                        rotuloFechar="Fechar e voltar para Colaboradores"
                    />

                    <Section style={{ gap: theme.spacing.md }}>
                        <TituloSecao>Contrato</TituloSecao>
                        <Campo>
                            <RotuloCampo>Função</RotuloCampo>
                            <Entrada
                                elevado
                                value={formData.role}
                                onChangeText={t => setFormData({ ...formData, role: t })}
                                placeholder="Ex: Recepcionista, Instrutor..."
                                accessibilityLabel="Função"
                            />
                        </Campo>
                        <Linha2>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>Salário (R$)</RotuloCampo>
                                <Entrada
                                    elevado
                                    value={formData.salary}
                                    onChangeText={t => setFormData({ ...formData, salary: formatCurrencyInput(t) })}
                                    keyboardType="numeric"
                                    placeholder="0,00"
                                    accessibilityLabel="Salário"
                                />
                            </Campo>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>Dia do pagamento</RotuloCampo>
                                <Entrada
                                    elevado
                                    value={formData.payment_day}
                                    onChangeText={t => setFormData({ ...formData, payment_day: t.replace(/\D/g, '').slice(0, 2) })}
                                    placeholder="Ex: 5"
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    accessibilityLabel="Dia do pagamento"
                                />
                            </Campo>
                        </Linha2>
                        <Campo>
                            <RotuloCampo>Data de admissão</RotuloCampo>
                            <DateField
                                value={formData.admission_date}
                                onChange={v => setFormData({ ...formData, admission_date: v })}
                                placeholder="Selecionar"
                                maximumDate={new Date()}
                                accessibilityLabel="Data de admissão"
                            />
                        </Campo>
                    </Section>

                    <View style={{ gap: theme.spacing.md }}>
                        <TituloSecao>Dados pessoais</TituloSecao>
                        <Campo>
                            <RotuloCampo>Nome completo <Obrigatorio>*</Obrigatorio></RotuloCampo>
                            <Entrada
                                value={formData.name}
                                onChangeText={t => setFormData({ ...formData, name: t })}
                                placeholder="Nome do colaborador"
                                accessibilityLabel="Nome completo"
                            />
                        </Campo>
                        <Linha2>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>Telefone</RotuloCampo>
                                <Entrada
                                    value={formData.phone}
                                    onChangeText={t => setFormData({ ...formData, phone: formatPhone(t) })}
                                    keyboardType="phone-pad"
                                    placeholder="(00) 00000-0000"
                                    accessibilityLabel="Telefone"
                                    style={{ fontSize: 15 }}
                                />
                            </Campo>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>Nascimento</RotuloCampo>
                                <DateField
                                    value={formData.birth_date}
                                    onChange={v => setFormData({ ...formData, birth_date: v })}
                                    placeholder="Selecionar"
                                    maximumDate={new Date()}
                                    accessibilityLabel="Data de nascimento"
                                />
                            </Campo>
                        </Linha2>
                        <Campo>
                            <RotuloCampo>E-mail <Obrigatorio>*</Obrigatorio></RotuloCampo>
                            <Entrada
                                value={formData.email}
                                onChangeText={t => setFormData({ ...formData, email: t })}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="nome@email.com"
                                accessibilityLabel="E-mail"
                            />
                        </Campo>
                    </View>

                    <View style={{ gap: theme.spacing.md }}>
                        <TituloSecao>Documentos</TituloSecao>
                        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>CPF</RotuloCampo>
                                <Entrada
                                    value={formData.cpf}
                                    onChangeText={t => setFormData({ ...formData, cpf: formatCPF(t) })}
                                    keyboardType="numeric"
                                    placeholder="CPF"
                                    accessibilityLabel="CPF"
                                    style={{ fontSize: 15, paddingHorizontal: 10 }}
                                />
                            </Campo>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>RG</RotuloCampo>
                                <Entrada
                                    value={formData.rg}
                                    onChangeText={t => setFormData({ ...formData, rg: t })}
                                    keyboardType="numeric"
                                    placeholder="RG"
                                    accessibilityLabel="RG"
                                    style={{ fontSize: 15, paddingHorizontal: 10 }}
                                />
                            </Campo>
                            <Campo style={{ flex: 1 }}>
                                <RotuloCampo>CTPS</RotuloCampo>
                                <Entrada
                                    value={formData.ctps}
                                    onChangeText={t => setFormData({ ...formData, ctps: t })}
                                    placeholder="Número"
                                    accessibilityLabel="CTPS"
                                    style={{ fontSize: 15, paddingHorizontal: 10 }}
                                />
                            </Campo>
                        </View>
                    </View>
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
