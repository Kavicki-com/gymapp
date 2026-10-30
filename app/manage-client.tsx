import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { Icon } from '@/src/components/Icon';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCPF, formatPhone } from '@/src/utils/masks';
import { validateBirthDate, validateCPF, validateDueDay, validateEmail, validatePhone, validateWeight } from '@/src/utils/validations';
import { FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import {
    Container,
    Input,
    Label,
    PickerContainer,
    Section,
    SectionLabel
} from '../src/components/styled';

/* Layout do redesign (Claude Design, board "AlunoForm"): plano primeiro,
   dados pessoais depois, Salvar fixo no rodapé. Campos, máscaras,
   validações e gravação são os mesmos de antes. */

const ErrorText = styled.Text`
  font-family: ${theme.fonts.regular};
  color: ${theme.colors.dangerText};
  font-size: 13px;
`;

const Campo = styled.View`
  gap: ${theme.spacing.sm}px;
`;

const Topo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const BotaoFechar = styled(TouchableOpacity)`
  width: ${theme.touch}px;
  height: ${theme.touch}px;
  margin-left: -10px;
  align-items: center;
  justify-content: center;
`;

const Titulo = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 22px;
  color: ${theme.colors.text};
`;

const Obrigatorio = styled.Text`
  color: ${theme.colors.danger};
`;

const Rodape = styled.View`
  padding: ${theme.spacing.md}px ${theme.spacing.xl}px 0;
  background-color: rgba(14,15,17,0.96);
  border-top-width: 1px;
  border-top-color: ${theme.colors.divider};
`;

const BotaoSalvar = styled(TouchableOpacity)<{ disabled?: boolean }>`
  min-height: 56px;
  border-radius: 16px;
  background-color: ${theme.colors.primary};
  align-items: center;
  justify-content: center;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const BotaoSalvarTexto = styled.Text`
  font-family: ${theme.fonts.bold};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.onPrimary};
`;

const comErro = (erro?: string) =>
    erro ? { borderColor: theme.colors.danger } : undefined;

export default function ManageClientScreen() {
    const { id } = useLocalSearchParams();
    const isEditing = !!id;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        birth_date: '',
        weight: '',
        plan_id: '',
        due_day: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const updateField = (field: string, value: string) => {
        clearError(field);
        setFormData(prev => ({ ...prev, [field]: value }));
    };

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
            const gymId = await getCurrentGymId();
            const { data: plansData } = await supabase
                .from('plans')
                .select('*')
                .eq('gym_id', gymId);
            if (plansData) {
                setPlans(plansData);
                if (!isEditing && plansData.length > 0) {
                    setFormData(prev => ({ ...prev, plan_id: plansData[0].id }));
                }
            }

            if (isEditing) {
                const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).single();
                if (error) throw error;
                if (client) {
                    setFormData({
                        name: client.name || '',
                        email: client.email || '',
                        cpf: client.cpf ? formatCPF(client.cpf) : '',
                        phone: formatPhone(client.phone || ''),
                        birth_date: formatISODateToDisplay(client.birth_date),
                        weight: client.weight ? String(client.weight) : '',
                        plan_id: client.plan_id || '',
                        due_day: client.due_day ? String(client.due_day) : '',
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
        const newErrors: Record<string, string> = {};

        // Required fields
        if (!formData.name) newErrors.name = 'Nome é obrigatório.';
        if (!formData.email) newErrors.email = 'Email é obrigatório.';
        else if (!validateEmail(formData.email)) newErrors.email = 'Email inválido.';

        // Optional fields with validation
        if (formData.cpf && !validateCPF(formData.cpf)) {
            newErrors.cpf = 'CPF inválido.';
        }

        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Telefone deve ter 11 dígitos (DD + número).';
        }

        if (formData.birth_date) {
            const birthResult = validateBirthDate(formData.birth_date);
            if (!birthResult.valid) newErrors.birth_date = birthResult.message;
        }

        if (formData.weight) {
            const weightResult = validateWeight(formData.weight);
            if (!weightResult.valid) newErrors.weight = weightResult.message;
        }

        if (formData.due_day) {
            const dueDayResult = validateDueDay(formData.due_day);
            if (!dueDayResult.valid) newErrors.due_day = dueDayResult.message;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                cpf: formData.cpf,
                phone: formData.phone,
                birth_date: convertDateToISO(formData.birth_date),
                weight: formData.weight ? parseFloat(formData.weight) : null,
                plan_id: formData.plan_id || null,
                due_day: formData.due_day ? parseInt(formData.due_day) : null,
            };

            if (isEditing) {
                const { error } = await supabase.from('clients').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const gymId = await getCurrentGymId();
                const { error } = await supabase.from('clients').insert({ ...payload, gym_id: gymId });
                if (error) throw error;
            }

            router.back();
        } catch (error: any) {
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o aluno. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Mesmo fechamento da ModalHandle: volta se der, senão cai no Início.
    const fechar = () => {
        if (router.canGoBack()) return router.back();
        router.replace('/(drawer)/(tabs)');
    };

    // No iOS a tela abre como folha (presentation: 'modal') e não encosta na
    // barra de status; no Android ela ocupa a tela inteira.
    const respiroTopo = Platform.OS === 'ios' ? theme.spacing.xl : insets.top + theme.spacing.md;

    if (fetching) return (
        <Container style={{ paddingTop: respiroTopo }}>
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
                    contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingTop: respiroTopo, paddingBottom: 32, gap: theme.spacing.xl }}
                >
                    <Topo>
                        <BotaoFechar onPress={fechar} accessibilityRole="button" accessibilityLabel="Fechar e voltar">
                            <Icon name="close" size={22} color={theme.colors.text} />
                        </BotaoFechar>
                        <Titulo accessibilityRole="header">{isEditing ? 'Editar aluno' : 'Novo aluno'}</Titulo>
                    </Topo>

                    <Section style={{ gap: 14 }}>
                        <SectionLabel>Plano</SectionLabel>
                        <Campo>
                            <Label style={{ marginBottom: 0 }}>Plano</Label>
                            <PickerContainer>
                                <Picker
                                    selectedValue={formData.plan_id}
                                    onValueChange={(itemValue) => setFormData({ ...formData, plan_id: itemValue })}
                                    style={{ color: theme.colors.text, backgroundColor: theme.colors.elevated }}
                                    dropdownIconColor={theme.colors.text}
                                    accessibilityLabel="Plano"
                                >
                                    <Picker.Item label="Sem plano" value="" color={theme.colors.text} />
                                    {plans.map(p => <Picker.Item key={p.id} label={`${p.name} · R$ ${p.price}`} value={p.id} color={theme.colors.text} />)}
                                </Picker>
                            </PickerContainer>
                        </Campo>
                        <Campo>
                            <Label style={{ marginBottom: 0 }}>Dia do vencimento</Label>
                            <Input
                                value={formData.due_day}
                                onChangeText={t => {
                                    // Only allow numbers and limit to 31
                                    const cleaned = t.replace(/\D/g, '');
                                    if (cleaned === '' || (parseInt(cleaned) >= 0 && parseInt(cleaned) <= 31)) {
                                        updateField('due_day', cleaned);
                                    }
                                }}
                                keyboardType="numeric"
                                placeholder="1 a 31"
                                maxLength={2}
                                accessibilityLabel="Dia do vencimento"
                                style={[{ backgroundColor: theme.colors.elevated }, comErro(errors.due_day)]}
                            />
                            {errors.due_day && <ErrorText accessibilityRole="alert">{errors.due_day}</ErrorText>}
                        </Campo>
                    </Section>

                    <View style={{ gap: 14 }}>
                        <SectionLabel>Dados pessoais</SectionLabel>

                        <Campo>
                            <Label style={{ marginBottom: 0 }}>Nome completo <Obrigatorio>*</Obrigatorio></Label>
                            <Input
                                value={formData.name}
                                onChangeText={t => updateField('name', t)}
                                placeholder="Nome do aluno"
                                accessibilityLabel="Nome completo"
                                style={comErro(errors.name)}
                            />
                            {errors.name && <ErrorText accessibilityRole="alert">{errors.name}</ErrorText>}
                        </Campo>

                        <Campo>
                            <Label style={{ marginBottom: 0 }}>
                                Telefone (<FontAwesome name="whatsapp" size={13} color={theme.colors.whatsapp} /> WhatsApp)
                            </Label>
                            <Input
                                value={formData.phone}
                                onChangeText={t => updateField('phone', formatPhone(t))}
                                keyboardType="phone-pad"
                                placeholder="(00) 00000-0000"
                                accessibilityLabel="Telefone (WhatsApp)"
                                style={comErro(errors.phone)}
                            />
                            {errors.phone && <ErrorText accessibilityRole="alert">{errors.phone}</ErrorText>}
                        </Campo>

                        <Campo>
                            <Label style={{ marginBottom: 0 }}>E-mail <Obrigatorio>*</Obrigatorio></Label>
                            <Input
                                value={formData.email}
                                onChangeText={t => updateField('email', t)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="aluno@email.com"
                                accessibilityLabel="E-mail"
                                style={comErro(errors.email)}
                            />
                            {errors.email && <ErrorText accessibilityRole="alert">{errors.email}</ErrorText>}
                        </Campo>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Campo style={{ flex: 1, minWidth: 0 }}>
                                <Label style={{ marginBottom: 0 }}>CPF</Label>
                                <Input
                                    value={formData.cpf}
                                    onChangeText={t => updateField('cpf', formatCPF(t))}
                                    keyboardType="number-pad"
                                    maxLength={14}
                                    placeholder="000.000.000-00"
                                    accessibilityLabel="CPF"
                                    style={[{ fontSize: 15, paddingHorizontal: 12 }, comErro(errors.cpf)]}
                                />
                                {errors.cpf && <ErrorText accessibilityRole="alert">{errors.cpf}</ErrorText>}
                            </Campo>
                            <Campo style={{ flex: 1, minWidth: 0 }}>
                                <Label style={{ marginBottom: 0 }}>Nascimento</Label>
                                <DateField
                                    value={formData.birth_date}
                                    onChange={v => updateField('birth_date', v)}
                                    placeholder="Selecionar"
                                    maximumDate={new Date()}
                                    accessibilityLabel="Data de nascimento"
                                />
                                {errors.birth_date && <ErrorText accessibilityRole="alert">{errors.birth_date}</ErrorText>}
                            </Campo>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Campo style={{ flex: 1, minWidth: 0 }}>
                                <Label style={{ marginBottom: 0 }}>Peso (kg)</Label>
                                <Input
                                    value={formData.weight}
                                    onChangeText={t => updateField('weight', t)}
                                    keyboardType="numeric"
                                    placeholder="Ex.: 70"
                                    accessibilityLabel="Peso em quilos"
                                    style={[{ fontSize: 15, paddingHorizontal: 12 }, comErro(errors.weight)]}
                                />
                                {errors.weight && <ErrorText accessibilityRole="alert">{errors.weight}</ErrorText>}
                            </Campo>
                            <View style={{ flex: 1 }} />
                        </View>
                    </View>
                </ScrollView>

                <Rodape style={{ paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + 12 }}>
                    <BotaoSalvar onPress={handleSave} disabled={loading} accessibilityRole="button">
                        {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : <BotaoSalvarTexto>Salvar</BotaoSalvarTexto>}
                    </BotaoSalvar>
                </Rodape>
            </Container>
        </KeyboardAvoidingView>
    );
}
