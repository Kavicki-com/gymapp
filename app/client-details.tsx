import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
    Container,
    DetailHeader,
    DetailLabel,
    DetailTitle,
    DetailValue,
    PageContainer,
    Row
} from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { FontAwesome } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

const ContentContainer = styled.ScrollView`
  flex: 1;
  padding: ${theme.spacing.lg}px;
`;

const Section = styled.View`
  background-color: ${theme.colors.surface};
  padding: ${theme.spacing.lg}px;
  border-radius: ${theme.borderRadius.md}px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const BackButton = styled(TouchableOpacity)`
  padding: ${theme.spacing.sm}px;
  margin-right: ${theme.spacing.md}px;
`;

const PhotoContainer = styled.TouchableOpacity`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: ${theme.colors.background};
  justify-content: center;
  align-items: center;
  align-self: center;
  margin-bottom: ${theme.spacing.lg}px;
  overflow: hidden;
  border: 2px solid ${theme.colors.primary};
`;

const ClientPhoto = styled.Image`
  width: 100%;
  height: 100%;
`;

const ModalOverlay = styled.View`
    flex: 1;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
`;

const ModalContent = styled.View`
    width: 85%;
    background-color: ${theme.colors.surface};
    padding: 20px;
    border-radius: 10px;
    max-height: 90%;
`;

const ModalTitle = styled.Text`
    font-size: 18px;
    font-weight: bold;
    color: ${theme.colors.text};
    margin-bottom: 15px;
    text-align: center;
`;

const StyledInput = styled.TextInput`
    background-color: ${theme.colors.inputBackground};
    color: ${theme.colors.text};
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
`;

const ModalButtons = styled.View`
    flex-direction: row;
    justify-content: space-between;
`;

const ModalButton = styled.TouchableOpacity<{ variant?: 'cancel' | 'primary' | 'danger' }>`
    flex: 1;
    padding: 10px;
    background-color: ${props =>
        props.variant === 'cancel' ? theme.colors.danger :
            props.variant === 'danger' ? theme.colors.danger :
                theme.colors.primary};
    border-radius: 5px;
    margin-left: ${props => props.variant === 'primary' ? '10px' : '0'};
    align-items: center;
`;

const ModalButtonText = styled.Text`
    color: #fff;
    font-weight: bold;
`;

const ActionButton = styled.TouchableOpacity<{ bgColor?: string }>`
    background-color: ${props => props.bgColor || theme.colors.primary};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-radius: 8px;
    margin-top: 10px;
`;

const ActionButtonText = styled.Text`
    color: ${theme.colors.background};
    font-weight: bold;
    margin-left: 8px;
`;

const SwitchRow = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
`;

const SwitchLabel = styled.Text`
    color: ${theme.colors.text};
    font-size: 14px;
`;

const DiscountSummary = styled.Text`
    color: ${theme.colors.primary};
    font-size: 13px;
    text-align: center;
    margin-bottom: 10px;
    font-weight: bold;
`;

const LockedBadge = styled.View`
    background-color: ${theme.colors.primary}20;
    padding: 8px 16px;
    border-radius: 8px;
    margin-bottom: ${theme.spacing.md}px;
    flex-direction: row;
    align-items: center;
`;

const LockedBadgeText = styled.Text`
    color: ${theme.colors.primary};
    font-weight: bold;
    margin-left: 8px;
`;

const OverdueBadge = styled.View`
    background-color: ${theme.colors.danger}20;
    padding: 10px 16px;
    border-radius: 8px;
    margin-bottom: ${theme.spacing.md}px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const OverdueBadgeText = styled.Text`
    color: ${theme.colors.danger};
    font-weight: bold;
    margin-left: 8px;
    flex: 1;
`;

const OverdueCount = styled.View`
    background-color: ${theme.colors.danger};
    border-radius: 12px;
    min-width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
`;

const OverdueCountText = styled.Text`
    color: #fff;
    font-size: 12px;
    font-weight: bold;
`;

const formatMonthYear = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 6)}`;
    return formatted;
};

const getCurrentMonthYear = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
};

export default function ClientDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [client, setClient] = useState<any>(null);
    const [planName, setPlanName] = useState('');
    const [planPrice, setPlanPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentDiscount, setPaymentDiscount] = useState('');
    const [referenceMonth, setReferenceMonth] = useState('');
    const [isAdvancePayment, setIsAdvancePayment] = useState(false);
    const [advanceMonths, setAdvanceMonths] = useState(1);
    const [registeringPayment, setRegisteringPayment] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
    const [overdueMonthsCount, setOverdueMonthsCount] = useState(0);
    const [overdueMonths, setOverdueMonths] = useState<string[]>([]);

    // Lock Modal State
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockUntilDate, setLockUntilDate] = useState('');
    const [locking, setLocking] = useState(false);

    useEffect(() => {
        fetchClientDetails();
        fetchPayments();
    }, [id]);

    const fetchClientDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setClient(data);

            if (data.plan_id) {
                const { data: planData } = await supabase
                    .from('plans')
                    .select('name, price')
                    .eq('id', data.plan_id)
                    .single();
                if (planData) {
                    setPlanName(planData.name);
                    setPlanPrice(planData.price || 0);
                    if (planData.price) {
                        setPaymentAmount(planData.price.toString());
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes do cliente.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('client_id', id)
                .is('deleted_at', null)
                .order('payment_date', { ascending: false });

            if (error) {
                console.log('Payments fetch error (table might be missing):', error.message);
            } else {
                setPayments(data || []);
            }
        } catch (e) {
            console.log(e);
        }
    };

    // Recalculate whenever both client and payments are loaded
    useEffect(() => {
        if (client !== null) {
            computeOverdueCount(payments, client);
        }
    }, [client, payments]);

    const computeOverdueCount = (paidPayments: any[], clientData?: any) => {
        const resolvedClient = clientData ?? client;
        if (!resolvedClient) return;

        const paidMonths = new Set(paidPayments.map(p => p.reference_month).filter(Boolean));
        const now = new Date();
        const dueDay = resolvedClient.due_day || 1;

        // Start from the month the client was created (or 12 months ago as fallback)
        const createdAt = resolvedClient.created_at
            ? new Date(resolvedClient.created_at)
            : new Date(now.getFullYear(), now.getMonth() - 12, 1);
        const start = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);

        // End: if due_day hasn't passed this month yet, don't count current month
        const dueDayPassedThisMonth = now.getDate() >= dueDay;
        const end = new Date(
            now.getFullYear(),
            dueDayPassedThisMonth ? now.getMonth() : now.getMonth() - 1,
            1
        );

        let count = 0;
        const missingMonths: string[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            const key = `${String(cursor.getMonth() + 1).padStart(2, '0')}/${cursor.getFullYear()}`;
            if (!paidMonths.has(key)) {
                count++;
                missingMonths.push(key);
            }
            cursor.setMonth(cursor.getMonth() + 1);
        }

        setOverdueMonthsCount(count);
        setOverdueMonths(missingMonths);
    };

    const handleDelete = () => {
        Alert.alert(
            'Confirmar Exclusão',
            'Deseja realmente excluir este cliente?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('clients').delete().eq('id', id);
                            if (error) throw error;
                            router.back();
                        } catch (error: any) {
                            Alert.alert('Erro', error.message);
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                uploadImage(result.assets[0].base64);
            }
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
    };

    const uploadImage = async (base64Data: string) => {
        setUploading(true);
        try {
            const fileName = `${id}-${Date.now()}.jpg`;
            const { data, error } = await supabase.storage
                .from('client-photos')
                .upload(fileName, decode(base64Data), {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('client-photos')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('clients')
                .update({ photo_url: publicUrl })
                .eq('id', id);

            if (updateError) throw updateError;

            setClient({ ...client, photo_url: publicUrl });
            Alert.alert('Sucesso', 'Foto atualizada!');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const openPaymentModal = () => {
        setEditingPayment(null);
        setPaymentAmount(planPrice ? planPrice.toString() : '');
        setPaymentDiscount('');
        setReferenceMonth(getCurrentMonthYear());
        setIsAdvancePayment(false);
        setAdvanceMonths(1);
        setPaymentDate('');
        setShowPaymentModal(true);
    };

    const getNextMonths = (startMonth: string, count: number): string[] => {
        const months: string[] = [startMonth];
        if (count <= 1) return months;

        const parts = startMonth.split('/');
        let month = parseInt(parts[0]);
        let year = parseInt(parts[1]);

        for (let i = 1; i < count; i++) {
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
            months.push(`${String(month).padStart(2, '0')}/${year}`);
        }
        return months;
    };

    const calculateFinalAmount = () => {
        const amount = parseFloat(paymentAmount) || 0;
        const discount = parseFloat(paymentDiscount) || 0;
        const totalPerMonth = Math.max(0, amount - discount);
        const months = isAdvancePayment ? advanceMonths : 1;
        return totalPerMonth * months;
    };

    // Abre o modal já preenchido com um lançamento existente.
    const openEditPaymentModal = (p: any) => {
        setEditingPayment(p);
        // `amount` é gravado já líquido (valor - desconto). O campo "Valor" do
        // formulário é o bruto, então soma o desconto de volta pra edição
        // fechar a conta em vez de descontar duas vezes.
        const desconto = Number(p.discount) || 0;
        const bruto = (Number(p.amount) || 0) + desconto;
        setPaymentAmount(String(bruto));
        setPaymentDiscount(desconto ? String(desconto) : '');
        setReferenceMonth(p.reference_month || '');
        setPaymentDate(p.payment_date ? new Date(p.payment_date).toLocaleDateString('pt-BR') : '');
        // Adiantamento só existe no ato do lançamento: editar mexe numa linha só.
        setIsAdvancePayment(false);
        setAdvanceMonths(1);
        setShowPaymentModal(true);
    };

    // Converte o campo DD/MM/AAAA em Date. Devolve null se estiver incompleto,
    // pra diferenciar "não informou" de "informou errado".
    const parsePaymentDate = (): Date | null => {
        if (!paymentDate) return null;
        const parts = paymentDate.split('/');
        if (parts.length !== 3 || parts[2].length !== 4) return null;
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        return isNaN(d.getTime()) ? null : d;
    };

    const handleRegisterPayment = async () => {
        if (!paymentAmount) {
            Alert.alert('Erro', 'Informe o valor do pagamento.');
            return;
        }

        if (!referenceMonth || referenceMonth.length < 7) {
            Alert.alert('Erro', 'Informe o mês de referência (MM/AAAA).');
            return;
        }

        if (paymentDate && !parsePaymentDate()) {
            Alert.alert('Erro', 'Data do pagamento inválida. Use DD/MM/AAAA.');
            return;
        }

        if (editingPayment) {
            updatePayment();
            return;
        }

        const months = isAdvancePayment ? advanceMonths : 1;
        const refMonths = getNextMonths(referenceMonth, months);

        comGuardaDeDuplicata(refMonths, () => insertPayment(refMonths, {
            amount: parseFloat(paymentAmount) || 0,
            discount: parseFloat(paymentDiscount) || 0,
            date: parsePaymentDate() ?? new Date(),
        }));
    };

    // Avisa ANTES de gravar, em vez de deixar o mês entrar duas vezes e virar
    // suporte manual depois. Usada pelo modal e pelo lançamento rápido.
    const comGuardaDeDuplicata = (refMonths: string[], gravar: () => void) => {
        const jaLancados = refMonths.filter(m => payments.some(p => p.reference_month === m));
        if (jaLancados.length === 0) {
            gravar();
            return;
        }
        const plural = jaLancados.length > 1;
        Alert.alert(
            plural ? 'Meses já lançados' : 'Mês já lançado',
            `${jaLancados.join(', ')} ${plural ? 'já foram lançados' : 'já foi lançado'} para este aluno. Lançar mesmo assim?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Lançar assim mesmo', style: 'destructive', onPress: gravar },
            ]
        );
    };

    // C2 — o caso comum em um toque: mês sugerido, valor do plano, hoje.
    // O mês sugerido é o atraso mais antigo, se houver, senão o mês corrente.
    // O rótulo do botão mostra qual é, então não há adivinhação.
    const mesSugerido = overdueMonths.length > 0 ? overdueMonths[0] : getCurrentMonthYear();

    const lancarRapido = () => {
        // Sem preço de plano não há o que sugerir: cai no formulário.
        if (!planPrice) {
            openPaymentModal();
            return;
        }
        comGuardaDeDuplicata([mesSugerido], () => insertPayment([mesSugerido], {
            amount: planPrice,
            discount: 0,
            date: new Date(),
        }));
    };

    type DadosPagamento = { amount: number; discount: number; date: Date };

    const insertPayment = async (refMonths: string[], dados: DadosPagamento) => {
        setRegisteringPayment(true);
        try {
            const gymId = await getCurrentGymId();
            const pDate = dados.date;

            const discount = dados.discount;
            const finalAmount = Math.max(0, dados.amount - discount);

            const paymentRecords = refMonths.map((refMonth, index) => ({
                client_id: id,
                gym_id: gymId,
                plan_name: planName,
                amount: finalAmount,
                discount: discount,
                reference_month: refMonth,
                is_advance: index > 0,
                payment_date: pDate.toISOString(),
            }));

            const { error } = await supabase.from('payments').insert(paymentRecords);
            if (error) throw error;

            const { error: clientError } = await supabase.from('clients')
                .update({
                    last_payment_date: pDate.toISOString(),
                    payment_status: 'paid'
                })
                .eq('id', id);

            if (clientError) throw clientError;

            const months = refMonths.length;
            const totalPaid = finalAmount * months;
            Alert.alert('Sucesso', `${months > 1 ? `${months} pagamentos registrados` : 'Pagamento registrado'}! Total: R$ ${totalPaid.toFixed(2)}`);
            closePaymentModal();
            fetchClientDetails();
            fetchPayments();
        } catch (error: any) {
            Alert.alert('Erro', 'Falha ao registrar pagamento: ' + error.message);
        } finally {
            setRegisteringPayment(false);
        }
    };

    const updatePayment = async () => {
        if (!editingPayment) return;

        // Mesma guarda do insert, ignorando o próprio registro que está sendo editado.
        const conflito = payments.some(p =>
            p.id !== editingPayment.id && p.reference_month === referenceMonth);

        const gravar = async () => {
            setRegisteringPayment(true);
            try {
                const amount = parseFloat(paymentAmount) || 0;
                const discount = parseFloat(paymentDiscount) || 0;
                const pDate = parsePaymentDate();

                const patch: any = {
                    amount: Math.max(0, amount - discount),
                    discount,
                    reference_month: referenceMonth,
                };
                if (pDate) patch.payment_date = pDate.toISOString();

                const { error } = await supabase.from('payments')
                    .update(patch)
                    .eq('id', editingPayment.id);
                if (error) throw error;

                Alert.alert('Sucesso', 'Pagamento atualizado.');
                closePaymentModal();
                fetchClientDetails();
                fetchPayments();
            } catch (error: any) {
                Alert.alert('Erro', 'Falha ao atualizar pagamento: ' + error.message);
            } finally {
                setRegisteringPayment(false);
            }
        };

        if (conflito) {
            Alert.alert(
                'Mês já lançado',
                `${referenceMonth} já foi lançado para este aluno. Salvar mesmo assim?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Salvar assim mesmo', style: 'destructive', onPress: gravar },
                ]
            );
            return;
        }

        gravar();
    };

    // Soft delete: o registro sai das telas e dos cálculos, mas continua no
    // banco. Nunca `delete` físico — o histórico é a prova de que existiu.
    const handleDeletePayment = (p: any) => {
        const quando = p.payment_date
            ? new Date(p.payment_date).toLocaleDateString('pt-BR')
            : 'sem data';
        Alert.alert(
            'Excluir pagamento',
            `${formatCurrency(p.amount || 0)} · ${p.reference_month ? `ref. ${p.reference_month}` : 'sem mês de referência'} · ${quando}\n\nO valor sai do histórico e das contas deste aluno.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingPaymentId(p.id);
                        try {
                            const { error } = await supabase.from('payments')
                                .update({ deleted_at: new Date().toISOString() })
                                .eq('id', p.id);
                            if (error) throw error;
                            fetchClientDetails();
                            fetchPayments();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Falha ao excluir pagamento: ' + error.message);
                        } finally {
                            setDeletingPaymentId(null);
                        }
                    },
                },
            ]
        );
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setEditingPayment(null);
        setPaymentDate('');
        setPaymentDiscount('');
        setReferenceMonth('');
        setIsAdvancePayment(false);
        setAdvanceMonths(1);
    };

    const handleLockSubscription = async () => {
        if (!lockUntilDate || lockUntilDate.length < 10) {
            Alert.alert('Erro', 'Informe a data de retorno (DD/MM/AAAA).');
            return;
        }

        setLocking(true);
        try {
            const parts = lockUntilDate.split('/');
            const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

            const { error } = await supabase.from('clients')
                .update({
                    subscription_locked: true,
                    locked_until: isoDate,
                    payment_status: 'locked'
                })
                .eq('id', id);

            if (error) throw error;

            Alert.alert('Sucesso', `Mensalidade trancada até ${lockUntilDate}.`);
            setShowLockModal(false);
            setLockUntilDate('');
            fetchClientDetails();
        } catch (error: any) {
            Alert.alert('Erro', 'Falha ao trancar mensalidade: ' + error.message);
        } finally {
            setLocking(false);
        }
    };

    const handleUnlockSubscription = async () => {
        Alert.alert(
            'Destrancar Mensalidade',
            'Deseja reativar a mensalidade deste cliente?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Destrancar',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('clients')
                                .update({
                                    subscription_locked: false,
                                    locked_until: null,
                                    payment_status: 'pending'
                                })
                                .eq('id', id);

                            if (error) throw error;
                            Alert.alert('Sucesso', 'Mensalidade reativada!');
                            fetchClientDetails();
                        } catch (error: any) {
                            Alert.alert('Erro', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleWhatsApp = () => {
        if (!client.phone) {
            Alert.alert('Erro', 'Cliente sem telefone cadastrado.');
            return;
        }

        const phone = client.phone.replace(/\D/g, '');
        const message = `Olá, ${client.name}! Gostaríamos de lembrar que sua mensalidade venceu. Poderia regularizar?`;

        const link = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;

        Linking.openURL(link).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        });
    };

    if (loading) {
        return (
            <PageContainer>
                <DetailHeader>
                    <DetailTitle>Carregando...</DetailTitle>
                </DetailHeader>
                <View style={{ padding: 16 }}>
                    <SkeletonLoader variant="card" />
                    <View style={{ height: 16 }} />
                    <SkeletonLoader variant="text" />
                    <SkeletonLoader variant="text" />
                </View>
            </PageContainer>
        );
    }

    if (!client) return null;

    const isOverdue = client.payment_status !== 'paid' && client.payment_status !== 'locked';
    const isLocked = client.subscription_locked;

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <DetailHeader>
                <Row style={{ justifyContent: 'flex-start' }}>
                    <BackButton onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <DetailTitle>Detalhes do Cliente</DetailTitle>
                </Row>
                <Row>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/manage-client', params: { id: client.id } })} style={{ marginRight: 16 }}>
                        <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                    </TouchableOpacity>
                </Row>
            </DetailHeader>

            <ContentContainer>
                <PhotoContainer onPress={pickImage} disabled={uploading}>
                    {client.photo_url ? (
                        <ClientPhoto source={{ uri: client.photo_url }} />
                    ) : (
                        <FontAwesome name="camera" size={40} color={theme.colors.textSecondary} />
                    )}
                    {uploading && <ActivityIndicator style={{ position: 'absolute' }} color={theme.colors.primary} />}
                </PhotoContainer>

                {isLocked && (
                    <LockedBadge>
                        <FontAwesome name="lock" size={16} color={theme.colors.primary} />
                        <LockedBadgeText>
                            Mensalidade trancada até {client.locked_until ? new Date(client.locked_until + 'T00:00:00').toLocaleDateString('pt-BR') : 'indefinido'}
                        </LockedBadgeText>
                    </LockedBadge>
                )}

                {!isLocked && overdueMonthsCount > 0 && (
                    <OverdueBadge>
                        <FontAwesome name="exclamation-circle" size={16} color={theme.colors.danger} />
                        <OverdueBadgeText>
                            {overdueMonthsCount === 1
                                ? '1 mensalidade em atraso'
                                : `${overdueMonthsCount} mensalidades em atraso`}
                        </OverdueBadgeText>
                        <OverdueCount>
                            <OverdueCountText>{overdueMonthsCount}</OverdueCountText>
                        </OverdueCount>
                    </OverdueBadge>
                )}

                <Section>
                    <DetailLabel>Nome Completo</DetailLabel>
                    <DetailValue>{client.name}</DetailValue>

                    <DetailLabel>Email</DetailLabel>
                    <DetailValue>{client.email || 'Não informado'}</DetailValue>

                    <DetailLabel>CPF</DetailLabel>
                    <DetailValue>{client.cpf || 'Não informado'}</DetailValue>

                    <DetailLabel>Telefone</DetailLabel>
                    <DetailValue>{client.phone || 'Não informado'}</DetailValue>
                </Section>

                <Section>
                    <DetailLabel>Plano Atual</DetailLabel>
                    <DetailValue>{planName || 'Sem plano'}</DetailValue>

                    <DetailLabel>Dia de Vencimento</DetailLabel>
                    <DetailValue>{client.due_day ? `Dia ${client.due_day}` : 'Não definido'}</DetailValue>

                    <DetailLabel>Status do Pagamento</DetailLabel>
                    <DetailValue style={{
                        color: client.payment_status === 'paid' ? theme.colors.success :
                            client.payment_status === 'locked' ? theme.colors.primary :
                                theme.colors.danger
                    }}>
                        {client.payment_status === 'paid' ? 'Em dia' :
                            client.payment_status === 'locked' ? '🔒 Trancado' : 'Pendente'}
                    </DetailValue>

                    <DetailLabel>Último Pagamento</DetailLabel>
                    <DetailValue>{client.last_payment_date ? new Date(client.last_payment_date).toLocaleDateString('pt-BR') : 'Nunca'}</DetailValue>
                </Section>

                <Section>
                    <DetailTitle style={{ fontSize: 18, marginBottom: 10 }}>Ações</DetailTitle>
                    {/* C3: os dois botões antigos abriam o MESMO modal, só com
                        prefill diferente. Agora é um só, e o caso comum (C2)
                        nem abre formulário. */}
                    <ActionButton onPress={lancarRapido} disabled={registeringPayment}>
                        <FontAwesome name="money" size={20} color={theme.colors.background} />
                        <ActionButtonText>
                            {registeringPayment
                                ? 'Registrando...'
                                : planPrice
                                    ? `Registrar ${formatCurrency(planPrice)} · ${mesSugerido}`
                                    : 'Registrar Pagamento'}
                        </ActionButtonText>
                    </ActionButton>

                    <TouchableOpacity
                        onPress={openPaymentModal}
                        accessibilityRole="button"
                        accessibilityLabel="Ajustar valor, data ou mês do pagamento"
                        style={{ alignSelf: 'center', paddingVertical: 10, marginBottom: 10 }}
                    >
                        <DetailLabel style={{ marginBottom: 0, color: theme.colors.primary }}>
                            Ajustar valor, data ou mês
                        </DetailLabel>
                    </TouchableOpacity>

                    {isLocked ? (
                        <ActionButton bgColor={theme.colors.success} onPress={handleUnlockSubscription}>
                            <FontAwesome name="unlock" size={20} color={theme.colors.background} />
                            <ActionButtonText>Destrancar Mensalidade</ActionButtonText>
                        </ActionButton>
                    ) : (
                        <ActionButton bgColor={theme.colors.textSecondary} onPress={() => {
                            setLockUntilDate('');
                            setShowLockModal(true);
                        }}>
                            <FontAwesome name="lock" size={20} color={theme.colors.background} />
                            <ActionButtonText>Trancar Mensalidade</ActionButtonText>
                        </ActionButton>
                    )}

                    {isOverdue && (
                        <ActionButton
                            onPress={handleWhatsApp}
                            bgColor="#25D366"
                        >
                            <FontAwesome name="whatsapp" size={20} color={theme.colors.background} />
                            <ActionButtonText style={{ color: theme.colors.background }}>Cobrar Mensalidade</ActionButtonText>
                        </ActionButton>
                    )}
                </Section>

                <Section>
                    <DetailTitle style={{ fontSize: 18, marginBottom: 10 }}>Histórico de Pagamentos</DetailTitle>
                    {payments.length === 0 ? (
                        <DetailValue>Nenhum pagamento registrado.</DetailValue>
                    ) : (
                        payments.map((p, index) => (
                            <View key={p.id || index} style={{
                                borderBottomWidth: index < payments.length - 1 ? 1 : 0,
                                borderBottomColor: theme.colors.border,
                                paddingVertical: 10
                            }}>
                                <Row>
                                    <DetailValue>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</DetailValue>
                                    <DetailValue style={{ fontWeight: 'bold' }}>{formatCurrency(p.amount || 0)}</DetailValue>
                                </Row>
                                <Row style={{ justifyContent: 'space-between' }}>
                                    <DetailLabel>{p.plan_name || 'Pagamento avulso'}</DetailLabel>
                                    {p.reference_month && (
                                        <DetailLabel style={{ color: theme.colors.primary }}>Ref: {p.reference_month}</DetailLabel>
                                    )}
                                </Row>
                                {p.discount > 0 && (
                                    <DetailLabel style={{ color: theme.colors.success }}>Desconto: {formatCurrency(p.discount || 0)}</DetailLabel>
                                )}
                                {p.is_advance && (
                                    <DetailLabel style={{ color: theme.colors.primary }}>⚡ Adiantado</DetailLabel>
                                )}

                                <Row style={{ justifyContent: 'flex-end', gap: 18, marginTop: 6 }}>
                                    <TouchableOpacity
                                        onPress={() => openEditPaymentModal(p)}
                                        disabled={deletingPaymentId === p.id}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Editar pagamento de ${formatCurrency(p.amount || 0)}`}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    >
                                        <FontAwesome name="pencil" size={14} color={theme.colors.textSecondary} />
                                        <DetailLabel style={{ marginBottom: 0 }}>Editar</DetailLabel>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => handleDeletePayment(p)}
                                        disabled={deletingPaymentId === p.id}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Excluir pagamento de ${formatCurrency(p.amount || 0)}`}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                    >
                                        {deletingPaymentId === p.id ? (
                                            <ActivityIndicator size="small" color={theme.colors.danger} />
                                        ) : (
                                            <>
                                                <FontAwesome name="trash-o" size={15} color={theme.colors.danger} />
                                                <DetailLabel style={{ marginBottom: 0, color: theme.colors.danger }}>Excluir</DetailLabel>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </Row>
                            </View>
                        ))
                    )}
                </Section>

                {client.notes && (
                    <Section>
                        <DetailLabel>Observações</DetailLabel>
                        <DetailValue>{client.notes}</DetailValue>
                    </Section>
                )}
            </ContentContainer>

            {/* Payment Modal */}
            <Modal
                transparent={true}
                visible={showPaymentModal}
                animationType="fade"
                onRequestClose={closePaymentModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ModalOverlay>
                        <ModalContent>
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <ModalTitle>{editingPayment ? 'Editar Pagamento' : 'Registrar Pagamento'}</ModalTitle>

                                <DetailLabel>Valor (R$)</DetailLabel>
                                <StyledInput
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <DetailLabel>Desconto (R$)</DetailLabel>
                                <StyledInput
                                    value={paymentDiscount}
                                    onChangeText={setPaymentDiscount}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <DetailLabel>Mês de Referência (MM/AAAA)</DetailLabel>
                                {overdueMonths.length > 0 && (
                                    <View style={{ marginBottom: 10 }}>
                                        <DetailLabel style={{ fontSize: 12, opacity: 0.7 }}>Selecionar mês em atraso:</DetailLabel>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 5 }}>
                                            {overdueMonths.map(month => (
                                                <TouchableOpacity
                                                    key={month}
                                                    onPress={() => setReferenceMonth(month)}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 15,
                                                        backgroundColor: referenceMonth === month ? theme.colors.danger : theme.colors.border,
                                                        marginRight: 8,
                                                        borderWidth: 1,
                                                        borderColor: referenceMonth === month ? theme.colors.danger : theme.colors.border
                                                    }}
                                                >
                                                    <DetailValue style={{
                                                        fontSize: 12,
                                                        color: referenceMonth === month ? '#fff' : theme.colors.text,
                                                        fontWeight: referenceMonth === month ? 'bold' : 'normal',
                                                        marginBottom: 0
                                                    }}>{month}</DetailValue>
                                                </TouchableOpacity>
                                            ))}
                                            <TouchableOpacity
                                                onPress={() => setReferenceMonth(getCurrentMonthYear())}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 15,
                                                    backgroundColor: referenceMonth === getCurrentMonthYear() ? theme.colors.primary : theme.colors.border,
                                                    marginRight: 8,
                                                    borderWidth: 1,
                                                    borderColor: referenceMonth === getCurrentMonthYear() ? theme.colors.primary : theme.colors.border
                                                }}
                                            >
                                                <DetailValue style={{
                                                    fontSize: 12,
                                                    color: referenceMonth === getCurrentMonthYear() ? '#fff' : theme.colors.text,
                                                    fontWeight: referenceMonth === getCurrentMonthYear() ? 'bold' : 'normal',
                                                    marginBottom: 0
                                                }}>{getCurrentMonthYear()} (Atual)</DetailValue>
                                            </TouchableOpacity>
                                        </ScrollView>
                                    </View>
                                )}
                                <StyledInput
                                    value={referenceMonth}
                                    onChangeText={t => setReferenceMonth(formatMonthYear(t))}
                                    placeholder="MM/AAAA"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    keyboardType="number-pad"
                                    maxLength={7}
                                />

                                <DetailLabel>Data do Pagamento (DD/MM/AAAA)</DetailLabel>
                                <DateField
                                    value={paymentDate}
                                    onChange={setPaymentDate}
                                    placeholder="Hoje"
                                    maximumDate={new Date()}
                                    accessibilityLabel="Data do pagamento"
                                />

                                {!editingPayment && (
                                <SwitchRow>
                                    <SwitchLabel>Pagamento adiantado?</SwitchLabel>
                                    <Switch
                                        value={isAdvancePayment}
                                        onValueChange={setIsAdvancePayment}
                                        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                                        thumbColor={isAdvancePayment ? theme.colors.primary : '#f4f3f4'}
                                    />
                                </SwitchRow>
                                )}

                                {!editingPayment && isAdvancePayment && (
                                    <View style={{ marginBottom: 15 }}>
                                        <DetailLabel>Quantos meses?</DetailLabel>
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                            {[2, 3].map(num => (
                                                <TouchableOpacity
                                                    key={num}
                                                    onPress={() => setAdvanceMonths(num)}
                                                    style={{
                                                        flex: 1,
                                                        padding: 10,
                                                        borderRadius: 8,
                                                        backgroundColor: advanceMonths === num ? theme.colors.primary : theme.colors.inputBackground,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <SwitchLabel style={{
                                                        color: advanceMonths === num ? theme.colors.background : theme.colors.text,
                                                        fontWeight: advanceMonths === num ? 'bold' : 'normal'
                                                    }}>
                                                        {num} meses
                                                    </SwitchLabel>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <DiscountSummary>
                                    Total: {formatCurrency(calculateFinalAmount())}
                                    {isAdvancePayment ? ` (${advanceMonths}x)` : ''}
                                    {parseFloat(paymentDiscount) > 0 ? ` (desc. R$ ${paymentDiscount})` : ''}
                                </DiscountSummary>

                                <ModalButtons>
                                    <ModalButton variant="cancel" onPress={closePaymentModal}>
                                        <ModalButtonText>Cancelar</ModalButtonText>
                                    </ModalButton>
                                    <ModalButton variant="primary" onPress={handleRegisterPayment} disabled={registeringPayment}>
                                        {registeringPayment
                                            ? <ActivityIndicator color="#fff" />
                                            : <ModalButtonText>{editingPayment ? 'Salvar' : 'Confirmar'}</ModalButtonText>}
                                    </ModalButton>
                                </ModalButtons>
                            </ScrollView>
                        </ModalContent>
                    </ModalOverlay>
                </KeyboardAvoidingView>
            </Modal>

            {/* Lock Subscription Modal */}
            <Modal
                transparent={true}
                visible={showLockModal}
                animationType="fade"
                onRequestClose={() => setShowLockModal(false)}
            >
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>Trancar Mensalidade</ModalTitle>
                        <DetailLabel style={{ marginBottom: 8 }}>
                            O cliente não será cobrado durante o período de trancamento.
                        </DetailLabel>

                        <DetailLabel>Data de Retorno (DD/MM/AAAA)</DetailLabel>
                        <DateField
                            value={lockUntilDate}
                            onChange={setLockUntilDate}
                            placeholder="Selecionar data"
                            minimumDate={new Date()}
                            accessibilityLabel="Data de retorno"
                        />

                        <ModalButtons>
                            <ModalButton variant="cancel" onPress={() => setShowLockModal(false)}>
                                <ModalButtonText>Cancelar</ModalButtonText>
                            </ModalButton>
                            <ModalButton variant="primary" onPress={handleLockSubscription} disabled={locking}>
                                {locking ? <ActivityIndicator color="#fff" /> : <ModalButtonText>Trancar</ModalButtonText>}
                            </ModalButton>
                        </ModalButtons>
                    </ModalContent>
                </ModalOverlay>
            </Modal>
        </Container>
    );
}
