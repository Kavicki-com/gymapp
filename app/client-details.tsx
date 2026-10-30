import { appAlert } from '@/src/components/AppAlert';
import { BottomSheet } from '@/src/components/BottomSheet';
import { CenterModal } from '@/src/components/CenterModal';
import { resumirCobranca } from '@/src/utils/overdue';
import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { IconeAluno, iniciaisDe } from '@/src/components/alunos/icones';
import { Icon } from '@/src/components/Icon';
import { Pill } from '@/src/components/Pill';
import {
    Container,
    Divider,
    Input,
    Label,
    SectionLabel
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
import { Dimensions, ActivityIndicator, InputAccessoryView, Keyboard, Modal, Platform, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

/* Layout do redesign (Claude Design, boards "Ficha" e "RegistrarPagamento").
   Toda a lógica — consultas, lançamento rápido, guarda de duplicata, edição e
   exclusão (soft delete) de pagamento, trancamento — é a mesma de antes; só a
   apresentação mudou. As confirmações continuam nos Alerts nativos. */

// Teclado numérico no iOS não tem tecla de confirmar: sem uma barra de
// acessório, quem toca num campo de valor fica preso — o teclado cobre os
// botões do modal e não há como fechá-lo.
const ACESSORIO_TECLADO = 'gymapp-acessorio-teclado';

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Nav = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const BotaoIcone = styled(TouchableOpacity)`
  width: ${theme.touch}px;
  height: ${theme.touch}px;
  align-items: center;
  justify-content: center;
`;

const BotaoEditar = styled(TouchableOpacity)`
  min-height: ${theme.touch}px;
  padding: 0 ${theme.spacing.md}px;
  justify-content: center;
`;

const BotaoEditarTexto = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${theme.colors.primary};
`;

const Conteudo = styled.View`
  gap: 18px;
  padding: 0 ${theme.spacing.xl}px 40px;
`;

const Foto = styled(TouchableOpacity)`
  width: 72px;
  height: 72px;
  border-radius: 36px;
  background-color: ${theme.colors.neutralPill};
  align-items: center;
  justify-content: center;
`;

const FotoImagem = styled.Image`
  width: 72px;
  height: 72px;
  border-radius: 36px;
`;

const FotoIniciais = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 24px;
  color: ${theme.colors.textStrong};
`;

const SeloCamera = styled.View`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  border-width: 3px;
  border-color: ${theme.colors.background};
  background-color: ${theme.colors.primary};
  align-items: center;
  justify-content: center;
`;

const NomeAluno = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: ${theme.fontSize.xxl}px;
  letter-spacing: -0.2px;
  color: ${theme.colors.text};
`;

const BotaoPrincipal = styled(TouchableOpacity)<{ disabled?: boolean }>`
  min-height: 56px;
  border-radius: 16px;
  background-color: ${theme.colors.primary};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm}px;
  padding: 0 ${theme.spacing.lg}px;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const BotaoPrincipalTexto = styled.Text`
  font-family: ${theme.fonts.bold};
  font-size: ${theme.fontSize.md}px;
  color: ${theme.colors.onPrimary};
`;

const LinkAjuste = styled(TouchableOpacity)`
  align-self: center;
  min-height: ${theme.touch}px;
  padding: 0 ${theme.spacing.md}px;
  justify-content: center;
`;

const LinkAjusteTexto = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${theme.colors.primary};
`;

const BotaoSecundario = styled(TouchableOpacity)`
  flex: 1;
  min-height: 48px;
  border-radius: ${theme.borderRadius.md}px;
  border-width: 1px;
  border-color: ${theme.colors.border};
  background-color: ${theme.colors.surface};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm}px;
`;

const BotaoSecundarioTexto = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${({ cor }) => cor};
`;

const Quadro = styled.View`
  flex: 1;
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.divider};
  border-radius: 16px;
  padding: ${theme.spacing.md}px 14px;
  gap: 2px;
`;

const QuadroRotulo = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

const QuadroValor = styled.Text<{ cor?: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${({ cor }) => cor || theme.colors.text};
`;

const QuadroApoio = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`;

const Cartao = styled.View`
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.divider};
  border-radius: ${theme.borderRadius.lg}px;
`;

const TituloCartao = styled.Text`
  font-family: ${theme.fonts.semibold};
  font-size: 15px;
  color: ${theme.colors.text};
`;

const Mes = styled.View<{ bg: string; bd: string }>`
  flex: 1;
  height: 44px;
  border-radius: ${theme.borderRadius.sm}px;
  border-width: 1px;
  border-color: ${({ bd }) => bd};
  background-color: ${({ bg }) => bg};
  align-items: center;
  justify-content: center;
  gap: 2px;
`;

const MesRotulo = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 11px;
  text-transform: uppercase;
  color: ${({ cor }) => cor};
`;

const MesMarca = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.regular};
  font-size: 11px;
  color: ${({ cor }) => cor};
`;

const Legenda = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 12px;
  color: ${theme.colors.textSecondary};
`;

const Amostra = styled.View<{ bg: string; bd?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background-color: ${({ bg }) => bg};
  border-width: ${({ bd }) => (bd ? 1 : 0)}px;
  border-color: ${({ bd }) => bd || 'transparent'};
`;

const TextoForte = styled.Text<{ bold?: boolean }>`
  font-family: ${({ bold }) => (bold ? theme.fonts.bold : theme.fonts.semibold)};
  font-size: 15px;
  color: ${theme.colors.text};
`;

const TextoApoio = styled.Text<{ cor?: string; forte?: boolean }>`
  font-family: ${({ forte }) => (forte ? theme.fonts.semibold : theme.fonts.regular)};
  font-size: 13px;
  color: ${({ cor }) => cor || theme.colors.textSecondary};
`;

const AcaoLinha = styled(TouchableOpacity)`
  min-height: ${theme.touch}px;
  padding: 0 10px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const AcaoLinhaTexto = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 13px;
  color: ${({ cor }) => cor};
`;

const Vazio = styled.Text`
  padding: ${theme.spacing.lg}px;
  border-radius: 16px;
  border-width: 1px;
  border-style: dashed;
  border-color: ${theme.colors.border};
  text-align: center;
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const DadoLinha = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: ${theme.spacing.md}px;
  padding: 13px 0;
`;

const DadoRotulo = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  color: ${theme.colors.textSecondary};
`;

const DadoValor = styled.Text<{ vazio?: boolean }>`
  flex-shrink: 1;
  text-align: right;
  font-family: ${theme.fonts.medium};
  font-size: 14px;
  color: ${({ vazio }) => (vazio ? theme.colors.textSecondary : theme.colors.text)};
`;

const Observacoes = styled.Text`
  padding: 14px ${theme.spacing.lg}px;
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.divider};
  border-radius: 16px;
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  line-height: 21px;
  color: ${theme.colors.textStrong};
`;

/* ─── Folhas (registrar pagamento, trancar) ───────────────────────────── */

// Em px: o pai da folha agora é a camada animada do BottomSheet, sem
// altura própria, e porcentagem não teria referência.
const Folha = styled.View`
  max-height: ${Math.round(Dimensions.get('window').height * 0.92)}px;
  background-color: ${theme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${theme.colors.border};
  border-top-left-radius: 28px;
  border-top-right-radius: 28px;
`;

const Alca = styled.View`
  align-self: center;
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background-color: #3A3F45;
`;

const FolhaTitulo = styled.Text`
  font-family: ${theme.fonts.display};
  font-size: 22px;
  color: ${theme.colors.text};
`;

const FolhaTexto = styled.Text`
  font-family: ${theme.fonts.regular};
  font-size: 14px;
  line-height: 21px;
  color: ${theme.colors.textSecondary};
`;

const BotaoFecharFolha = styled(TouchableOpacity)`
  width: ${theme.touch}px;
  height: ${theme.touch}px;
  border-radius: 22px;
  background-color: ${theme.colors.elevated};
  align-items: center;
  justify-content: center;
`;

const ChipMes = styled(TouchableOpacity)<{ bg: string; bd: string }>`
  min-height: ${theme.touch}px;
  padding: 0 14px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ bd }) => bd};
  background-color: ${({ bg }) => bg};
  justify-content: center;
`;

const ChipMesTexto = styled.Text<{ cor: string }>`
  font-family: ${theme.fonts.semibold};
  font-size: 14px;
  color: ${({ cor }) => cor};
`;

const CaixaAdiantado = styled.View`
  padding: 14px;
  border-radius: 16px;
  background-color: ${theme.colors.elevated};
  gap: ${theme.spacing.md}px;
`;

const OpcaoMeses = styled(TouchableOpacity)<{ ativo: boolean }>`
  min-height: ${theme.touch}px;
  padding: 0 14px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({ ativo }) => (ativo ? theme.colors.primary : theme.colors.border)};
  background-color: ${({ ativo }) => (ativo ? theme.colors.primary : theme.colors.surface)};
  align-items: center;
  justify-content: center;
`;

const OpcaoMesesTexto = styled.Text<{ ativo: boolean }>`
  font-family: ${({ ativo }) => (ativo ? theme.fonts.bold : theme.fonts.medium)};
  font-size: 14px;
  color: ${({ ativo }) => (ativo ? theme.colors.onPrimary : theme.colors.text)};
`;

const Total = styled.Text`
  font-family: ${theme.fonts.displayHeavy};
  font-size: 26px;
  color: ${theme.colors.text};
`;

const BotaoFolha = styled(TouchableOpacity)<{ tipo: 'primario' | 'contorno'; disabled?: boolean }>`
  min-height: 56px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ tipo }) => (tipo === 'primario' ? theme.colors.primary : 'transparent')};
  border-width: ${({ tipo }) => (tipo === 'contorno' ? 1 : 0)}px;
  border-color: ${theme.colors.border};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const BotaoFolhaTexto = styled.Text<{ tipo: 'primario' | 'contorno' }>`
  font-family: ${({ tipo }) => (tipo === 'primario' ? theme.fonts.bold : theme.fonts.semibold)};
  font-size: ${theme.fontSize.md}px;
  color: ${({ tipo }) => (tipo === 'primario' ? theme.colors.onPrimary : theme.colors.text)};
`;

const campoFolha = { backgroundColor: theme.colors.elevated };

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
    const insets = useSafeAreaInsets();
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
            appAlert('Erro', 'Não foi possível carregar a ficha do aluno.');
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

    // Regra única (src/utils/overdue). Antes havia uma cópia aqui e outra no
    // dashboard, e elas já tinham divergido: uma pulava aluno trancado, a
    // outra não.
    const computeOverdueCount = (paidPayments: any[], clientData?: any) => {
        const resolvedClient = clientData ?? client;
        if (!resolvedClient) return;

        const competencias = new Set<string>(
            paidPayments.map(p => p.reference_month).filter(Boolean)
        );
        const resumo = resumirCobranca(resolvedClient, competencias);

        setOverdueMonthsCount(resumo.mesesEmAtraso);
        setOverdueMonths(resumo.mesesAbertos);
    };

    const handleDelete = () => {
        appAlert(
            'Confirmar Exclusão',
            'Deseja realmente excluir este aluno?',
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
                            appAlert('Erro', error.message);
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
            appAlert('Erro', 'Não foi possível selecionar a imagem.');
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
            appAlert('Sucesso', 'Foto atualizada!');
        } catch (error: any) {
            console.error(error);
            appAlert('Erro', 'Falha ao fazer upload da imagem.');
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
            appAlert('Erro', 'Informe o valor do pagamento.');
            return;
        }

        if (!referenceMonth || referenceMonth.length < 7) {
            appAlert('Erro', 'Informe o mês de referência (MM/AAAA).');
            return;
        }

        if (paymentDate && !parsePaymentDate()) {
            appAlert('Erro', 'Data do pagamento inválida. Use DD/MM/AAAA.');
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
        appAlert(
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
            appAlert('Sucesso', `${months > 1 ? `${months} pagamentos registrados` : 'Pagamento registrado'}! Total: R$ ${totalPaid.toFixed(2)}`);
            closePaymentModal();
            fetchClientDetails();
            fetchPayments();
        } catch (error: any) {
            appAlert('Erro', 'Falha ao registrar pagamento: ' + error.message);
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

                appAlert('Sucesso', 'Pagamento atualizado.');
                closePaymentModal();
                fetchClientDetails();
                fetchPayments();
            } catch (error: any) {
                appAlert('Erro', 'Falha ao atualizar pagamento: ' + error.message);
            } finally {
                setRegisteringPayment(false);
            }
        };

        if (conflito) {
            appAlert(
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
        appAlert(
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
                            appAlert('Erro', 'Falha ao excluir pagamento: ' + error.message);
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
            appAlert('Erro', 'Informe a data de retorno (DD/MM/AAAA).');
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

            appAlert('Sucesso', `Mensalidade trancada até ${lockUntilDate}.`);
            setShowLockModal(false);
            setLockUntilDate('');
            fetchClientDetails();
        } catch (error: any) {
            appAlert('Erro', 'Falha ao trancar mensalidade: ' + error.message);
        } finally {
            setLocking(false);
        }
    };

    const handleUnlockSubscription = async () => {
        appAlert(
            'Destrancar Mensalidade',
            'Deseja reativar a mensalidade deste aluno?',
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
                            appAlert('Sucesso', 'Mensalidade reativada!');
                            fetchClientDetails();
                        } catch (error: any) {
                            appAlert('Erro', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleWhatsApp = () => {
        if (!client.phone) {
            appAlert('Erro', 'Aluno sem telefone cadastrado.');
            return;
        }

        const phone = client.phone.replace(/\D/g, '');
        const message = `Olá, ${client.name}! Gostaríamos de lembrar que sua mensalidade venceu. Poderia regularizar?`;

        const link = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;

        Linking.openURL(link).catch(() => {
            appAlert('Erro', 'Não foi possível abrir o WhatsApp.');
        });
    };


    if (loading) {
        return (
            <Container style={{ paddingTop: insets.top + theme.spacing.sm }}>
                <Stack.Screen options={{ headerShown: false }} />
                <Nav style={{ paddingHorizontal: 10 }}>
                    <BotaoIcone onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para Alunos">
                        <Icon name="back" size={22} color={theme.colors.text} strokeWidth={2.2} />
                    </BotaoIcone>
                </Nav>
                <View style={{ padding: theme.spacing.xl }}>
                    <SkeletonLoader variant="card" />
                    <View style={{ height: 16 }} />
                    <SkeletonLoader variant="text" />
                    <SkeletonLoader variant="text" />
                </View>
            </Container>
        );
    }

    if (!client) return null;

    const isOverdue = client.payment_status !== 'paid' && client.payment_status !== 'locked';
    const isLocked = client.subscription_locked;

    // Grade do ano corrente, derivada do que a tela já tem: competências
    // pagas (payments) e em aberto (overdueMonths, da regra de overdue.ts).
    // Mês sem nenhum dos dois não é dívida — fica neutro.
    const anoAtual = new Date().getFullYear();
    const competenciasPagas = new Set(payments.map(p => p.reference_month).filter(Boolean));
    const valorAberto = planPrice ? `R$ ${Number(planPrice).toLocaleString('pt-BR')}` : '!';
    const grade = NOMES_MESES.map((rotulo, i) => {
        const chave = `${String(i + 1).padStart(2, '0')}/${anoAtual}`;
        if (competenciasPagas.has(chave)) {
            return { rotulo, bg: theme.colors.successSoft, bd: 'transparent', cor: theme.colors.success, marca: '✓', palavra: 'pago' };
        }
        if (overdueMonths.includes(chave)) {
            return { rotulo, bg: theme.colors.dangerSoft, bd: 'transparent', cor: theme.colors.danger, marca: valorAberto, palavra: 'em aberto' };
        }
        return { rotulo, bg: 'transparent', bd: '#3A3F45', cor: theme.colors.textMuted, marca: '·', palavra: 'sem lançamento' };
    });

    const statusCor = client.payment_status === 'paid' ? theme.colors.success :
        client.payment_status === 'locked' ? theme.colors.primary :
            theme.colors.danger;
    const statusTexto = client.payment_status === 'paid' ? 'Em dia' :
        client.payment_status === 'locked' ? 'Trancado' : 'Pendente';

    // Chips do mês de referência: os em atraso e o mês corrente. Se o mês
    // corrente já é um dos atrasados, aparece uma vez só.
    const mesCorrente = getCurrentMonthYear();
    const chipsMes = overdueMonths.length > 0
        ? [
            ...overdueMonths.map(m => ({ mes: m, atrasado: true })),
            ...(overdueMonths.includes(mesCorrente) ? [] : [{ mes: mesCorrente, atrasado: false }]),
        ]
        : [];

    const dados: { rotulo: string; valor?: string | null }[] = [
        { rotulo: 'Nome completo', valor: client.name },
        { rotulo: 'E-mail', valor: client.email },
        { rotulo: 'CPF', valor: client.cpf },
        { rotulo: 'Telefone', valor: client.phone },
    ];

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={{ paddingTop: insets.top + theme.spacing.sm }}>
                <Nav style={{ paddingHorizontal: 10, marginBottom: 18 }}>
                    <BotaoIcone onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para Alunos">
                        <Icon name="back" size={22} color={theme.colors.text} strokeWidth={2.2} />
                    </BotaoIcone>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <BotaoEditar
                            onPress={() => router.push({ pathname: '/manage-client', params: { id: client.id } })}
                            accessibilityRole="button"
                            accessibilityLabel="Editar cadastro"
                        >
                            <BotaoEditarTexto>Editar</BotaoEditarTexto>
                        </BotaoEditar>
                        <BotaoIcone onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Excluir aluno">
                            <IconeAluno name="lixeira" size={22} color={theme.colors.danger} />
                        </BotaoIcone>
                    </View>
                </Nav>

                <Conteudo>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Foto
                            onPress={pickImage}
                            disabled={uploading}
                            accessibilityRole="button"
                            accessibilityLabel="Trocar foto do aluno"
                        >
                            {client.photo_url
                                ? <FotoImagem source={{ uri: client.photo_url }} />
                                : <FotoIniciais>{iniciaisDe(client.name)}</FotoIniciais>}
                            {uploading && <ActivityIndicator style={{ position: 'absolute' }} color={theme.colors.primary} />}
                            <SeloCamera>
                                <IconeAluno name="camera" size={14} color={theme.colors.onPrimary} />
                            </SeloCamera>
                        </Foto>
                        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                            <NomeAluno numberOfLines={2}>{client.name}</NomeAluno>
                            {isLocked && (
                                <Pill
                                    style={{ alignSelf: 'flex-start' }}
                                    tone="soon"
                                    label={`Mensalidade trancada até ${client.locked_until ? new Date(client.locked_until + 'T00:00:00').toLocaleDateString('pt-BR') : 'indefinido'}`}
                                />
                            )}
                            {!isLocked && overdueMonthsCount > 0 && (
                                <Pill
                                    style={{ alignSelf: 'flex-start' }}
                                    tone="late"
                                    label={overdueMonthsCount === 1
                                        ? '1 mensalidade em atraso'
                                        : `${overdueMonthsCount} mensalidades em atraso`}
                                />
                            )}
                        </View>
                    </View>

                    <View style={{ gap: 10 }}>
                        {/* C3: os dois botões antigos abriam o MESMO modal, só com
                            prefill diferente. Agora é um só, e o caso comum (C2)
                            nem abre formulário. */}
                        <BotaoPrincipal onPress={lancarRapido} disabled={registeringPayment} accessibilityRole="button">
                            {registeringPayment
                                ? <ActivityIndicator color={theme.colors.onPrimary} />
                                : <Icon name="plus" size={20} color={theme.colors.onPrimary} strokeWidth={2.4} />}
                            <BotaoPrincipalTexto>
                                {registeringPayment
                                    ? 'Registrando...'
                                    : planPrice
                                        ? `Registrar ${formatCurrency(planPrice)} · ${mesSugerido}`
                                        : 'Registrar pagamento'}
                            </BotaoPrincipalTexto>
                        </BotaoPrincipal>

                        <LinkAjuste
                            onPress={openPaymentModal}
                            accessibilityRole="button"
                            accessibilityLabel="Ajustar valor, data ou mês do pagamento"
                        >
                            <LinkAjusteTexto>Ajustar valor, data ou mês</LinkAjusteTexto>
                        </LinkAjuste>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {isOverdue && (
                                <BotaoSecundario onPress={handleWhatsApp} accessibilityRole="button" accessibilityLabel="Cobrar mensalidade no WhatsApp">
                                    <FontAwesome name="whatsapp" size={18} color={theme.colors.whatsapp} />
                                    <BotaoSecundarioTexto cor={theme.colors.success}>Cobrar</BotaoSecundarioTexto>
                                </BotaoSecundario>
                            )}
                            {isLocked ? (
                                <BotaoSecundario onPress={handleUnlockSubscription} accessibilityRole="button" accessibilityLabel="Destrancar mensalidade">
                                    <IconeAluno name="cadeado-aberto" size={18} color={theme.colors.success} />
                                    <BotaoSecundarioTexto cor={theme.colors.success}>Destrancar</BotaoSecundarioTexto>
                                </BotaoSecundario>
                            ) : (
                                <BotaoSecundario
                                    onPress={() => {
                                        setLockUntilDate('');
                                        setShowLockModal(true);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Trancar mensalidade"
                                >
                                    <Icon name="lock" size={18} color={theme.colors.textStrong} />
                                    <BotaoSecundarioTexto cor={theme.colors.textStrong}>Trancar</BotaoSecundarioTexto>
                                </BotaoSecundario>
                            )}
                        </View>
                    </View>

                    <View style={{ gap: 10 }} accessibilityLabel="Situação">
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Quadro>
                                <QuadroRotulo>Plano atual</QuadroRotulo>
                                <QuadroValor numberOfLines={2}>{planName || 'Sem plano'}</QuadroValor>
                                {planPrice ? <QuadroApoio>{formatCurrency(planPrice)}/mês</QuadroApoio> : null}
                            </Quadro>
                            <Quadro>
                                <QuadroRotulo>Vencimento</QuadroRotulo>
                                <QuadroValor>{client.due_day ? `Dia ${client.due_day}` : 'Não definido'}</QuadroValor>
                            </Quadro>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Quadro>
                                <QuadroRotulo>Status do pagamento</QuadroRotulo>
                                <QuadroValor cor={statusCor}>{statusTexto}</QuadroValor>
                            </Quadro>
                            <Quadro>
                                <QuadroRotulo>Último pagamento</QuadroRotulo>
                                <QuadroValor>{client.last_payment_date ? new Date(client.last_payment_date).toLocaleDateString('pt-BR') : 'Nunca'}</QuadroValor>
                            </Quadro>
                        </View>
                    </View>

                    <Cartao style={{ padding: theme.spacing.lg, gap: 14 }}>
                        <TituloCartao>Mensalidades em {anoAtual}</TituloCartao>
                        <View style={{ gap: 6 }}>
                            {[0, 6].map(inicio => (
                                <View key={inicio} style={{ flexDirection: 'row', gap: 6 }}>
                                    {grade.slice(inicio, inicio + 6).map(m => (
                                        <Mes
                                            key={m.rotulo}
                                            bg={m.bg}
                                            bd={m.bd}
                                            accessible
                                            accessibilityLabel={`${m.rotulo}: ${m.palavra}`}
                                        >
                                            <MesRotulo cor={m.cor}>{m.rotulo}</MesRotulo>
                                            <MesMarca cor={m.cor} numberOfLines={1} adjustsFontSizeToFit>{m.marca}</MesMarca>
                                        </Mes>
                                    ))}
                                </View>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Amostra bg={theme.colors.success} /><Legenda>Pago</Legenda>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Amostra bg={theme.colors.danger} /><Legenda>Em aberto</Legenda>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Amostra bg="transparent" bd="#3A3F45" /><Legenda>Sem lançamento</Legenda>
                            </View>
                        </View>
                    </Cartao>

                    <View style={{ gap: theme.spacing.sm }}>
                        <SectionLabel>Histórico de pagamentos</SectionLabel>
                        {payments.length === 0 ? (
                            <Vazio>Nenhum pagamento registrado.</Vazio>
                        ) : (
                            <Cartao style={{ paddingHorizontal: theme.spacing.lg }}>
                                {payments.map((p, index) => (
                                    <View key={p.id || index} style={{
                                        gap: 6,
                                        paddingTop: 14,
                                        paddingBottom: 4,
                                        borderTopWidth: index > 0 ? 1 : 0,
                                        borderTopColor: theme.colors.divider,
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <TextoForte>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</TextoForte>
                                            <TextoForte bold>{formatCurrency(p.amount || 0)}</TextoForte>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                                            <TextoApoio style={{ flexShrink: 1 }} numberOfLines={1}>{p.plan_name || 'Pagamento avulso'}</TextoApoio>
                                            {p.reference_month ? (
                                                <TextoApoio cor={theme.colors.primary} forte>Ref. {p.reference_month}</TextoApoio>
                                            ) : null}
                                        </View>
                                        {(p.discount > 0 || p.is_advance) ? (
                                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                                {p.discount > 0 ? <Pill tone="ok" label={`Desconto ${formatCurrency(p.discount || 0)}`} /> : null}
                                                {p.is_advance ? <Pill tone="soon" label="Adiantado" /> : null}
                                            </View>
                                        ) : null}

                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                                            <AcaoLinha
                                                onPress={() => openEditPaymentModal(p)}
                                                disabled={deletingPaymentId === p.id}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Editar pagamento de ${formatCurrency(p.amount || 0)}`}
                                            >
                                                <AcaoLinhaTexto cor={theme.colors.textStrong}>Editar</AcaoLinhaTexto>
                                            </AcaoLinha>
                                            <AcaoLinha
                                                onPress={() => handleDeletePayment(p)}
                                                disabled={deletingPaymentId === p.id}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Excluir pagamento de ${formatCurrency(p.amount || 0)}`}
                                            >
                                                {deletingPaymentId === p.id
                                                    ? <ActivityIndicator size="small" color={theme.colors.danger} />
                                                    : <AcaoLinhaTexto cor={theme.colors.danger}>Excluir</AcaoLinhaTexto>}
                                            </AcaoLinha>
                                        </View>
                                    </View>
                                ))}
                            </Cartao>
                        )}
                    </View>

                    <View style={{ gap: theme.spacing.sm }}>
                        <SectionLabel>Dados pessoais</SectionLabel>
                        <Cartao style={{ paddingHorizontal: theme.spacing.lg }}>
                            {dados.map((d, i) => (
                                <View key={d.rotulo}>
                                    {i > 0 && <Divider />}
                                    <DadoLinha>
                                        <DadoRotulo>{d.rotulo}</DadoRotulo>
                                        <DadoValor vazio={!d.valor}>{d.valor || 'Não informado'}</DadoValor>
                                    </DadoLinha>
                                </View>
                            ))}
                        </Cartao>
                    </View>

                    {client.notes ? (
                        <View style={{ gap: theme.spacing.sm }}>
                            <SectionLabel>Observações</SectionLabel>
                            <Observacoes>{client.notes}</Observacoes>
                        </View>
                    ) : null}
                </Conteudo>
            </ScrollView>

            {/* Payment Modal */}
            {/* Registrar pagamento é modal centralizado, não folha (pedido do
                dono). Tocar fora fecha o teclado; fecha pelo X. */}
            <CenterModal
                visible={showPaymentModal}
                onClose={closePaymentModal}
                onBackdropPress={Keyboard.dismiss}
                avoidKeyboard
            >
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                automaticallyAdjustKeyboardInsets
                                contentContainerStyle={{
                                    paddingTop: 20,
                                    paddingHorizontal: theme.spacing.xl,
                                    paddingBottom: 24,
                                    gap: 18,
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <FolhaTitulo accessibilityRole="header">{editingPayment ? 'Editar pagamento' : 'Registrar pagamento'}</FolhaTitulo>
                                        <TextoApoio numberOfLines={1}>{client.name}{planName ? ` · ${planName}` : ''}</TextoApoio>
                                    </View>
                                    <BotaoFecharFolha onPress={closePaymentModal} accessibilityRole="button" accessibilityLabel="Fechar">
                                        <Icon name="close" size={20} color={theme.colors.textStrong} />
                                    </BotaoFecharFolha>
                                </View>

                                <View style={{ gap: theme.spacing.sm }}>
                                    <Label style={{ marginBottom: 0 }}>Mês de referência</Label>
                                    {chipsMes.length > 0 && (
                                        <>
                                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                                {chipsMes.map(({ mes, atrasado }) => {
                                                    const ativo = referenceMonth === mes;
                                                    return (
                                                        <ChipMes
                                                            key={mes}
                                                            onPress={() => setReferenceMonth(mes)}
                                                            bg={ativo ? theme.colors.text : atrasado ? 'rgba(248,113,113,0.12)' : 'transparent'}
                                                            bd={ativo ? theme.colors.text : atrasado ? 'transparent' : theme.colors.border}
                                                            accessibilityRole="button"
                                                            accessibilityState={{ selected: ativo }}
                                                        >
                                                            <ChipMesTexto cor={ativo ? theme.colors.onPrimary : atrasado ? theme.colors.danger : theme.colors.textStrong}>
                                                                {mes === mesCorrente ? `${mes} · mês atual` : mes}
                                                            </ChipMesTexto>
                                                        </ChipMes>
                                                    );
                                                })}
                                            </View>
                                            <TextoApoio style={{ fontSize: 12 }}>Selecione um mês em atraso ou digite outro.</TextoApoio>
                                        </>
                                    )}
                                    <Input
                                        value={referenceMonth}
                                        onChangeText={t => setReferenceMonth(formatMonthYear(t))}
                                        placeholder="MM/AAAA"
                                        inputAccessoryViewID={Platform.OS === 'ios' ? ACESSORIO_TECLADO : undefined}
                                        keyboardType="number-pad"
                                        maxLength={7}
                                        accessibilityLabel="Mês de referência (MM/AAAA)"
                                        style={[campoFolha, { minHeight: 48 }]}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
                                        <Label style={{ marginBottom: 0 }}>Valor (R$)</Label>
                                        <Input
                                            value={paymentAmount}
                                            onChangeText={setPaymentAmount}
                                            inputAccessoryViewID={Platform.OS === 'ios' ? ACESSORIO_TECLADO : undefined}
                                            keyboardType="numeric"
                                            placeholder="0.00"
                                            accessibilityLabel="Valor em reais"
                                            style={[campoFolha, { paddingHorizontal: 12 }]}
                                        />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
                                        <Label style={{ marginBottom: 0 }}>Desconto (R$)</Label>
                                        <Input
                                            value={paymentDiscount}
                                            onChangeText={setPaymentDiscount}
                                            inputAccessoryViewID={Platform.OS === 'ios' ? ACESSORIO_TECLADO : undefined}
                                            keyboardType="numeric"
                                            placeholder="0.00"
                                            accessibilityLabel="Desconto em reais"
                                            style={[campoFolha, { paddingHorizontal: 12 }]}
                                        />
                                    </View>
                                </View>

                                <View style={{ gap: theme.spacing.sm }}>
                                    <Label style={{ marginBottom: 0 }}>Data do pagamento</Label>
                                    <DateField
                                        value={paymentDate}
                                        onChange={setPaymentDate}
                                        placeholder="Hoje"
                                        maximumDate={new Date()}
                                        accessibilityLabel="Data do pagamento"
                                    />
                                </View>

                                {!editingPayment && (
                                    <CaixaAdiantado>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 44 }}>
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <TextoForte>Pagamento adiantado</TextoForte>
                                                <TextoApoio style={{ fontSize: 12 }}>Registra vários meses de uma vez</TextoApoio>
                                            </View>
                                            <Switch
                                                value={isAdvancePayment}
                                                onValueChange={setIsAdvancePayment}
                                                trackColor={{ false: '#3A3F45', true: theme.colors.primary }}
                                                thumbColor={theme.colors.text}
                                                ios_backgroundColor="#3A3F45"
                                                accessibilityLabel="Pagamento adiantado"
                                            />
                                        </View>

                                        {isAdvancePayment && (
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderTopWidth: 1,
                                                borderTopColor: theme.colors.border,
                                                paddingTop: 12,
                                            }}>
                                                <TextoApoio style={{ fontSize: 14 }} cor={theme.colors.textStrong}>Quantos meses?</TextoApoio>
                                                <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
                                                    {[2, 3].map(num => (
                                                        <OpcaoMeses
                                                            key={num}
                                                            ativo={advanceMonths === num}
                                                            onPress={() => setAdvanceMonths(num)}
                                                            accessibilityRole="radio"
                                                            accessibilityState={{ selected: advanceMonths === num }}
                                                        >
                                                            <OpcaoMesesTexto ativo={advanceMonths === num}>{num} meses</OpcaoMesesTexto>
                                                        </OpcaoMeses>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </CaixaAdiantado>
                                )}

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <View style={{ flexShrink: 1, gap: 2 }}>
                                        <TextoApoio style={{ fontSize: 14 }}>
                                            Total{isAdvancePayment ? ` (${advanceMonths}x)` : ''}
                                        </TextoApoio>
                                        {parseFloat(paymentDiscount) > 0 ? (
                                            <TextoApoio style={{ fontSize: 12 }} cor={theme.colors.success}>desc. R$ {paymentDiscount}</TextoApoio>
                                        ) : null}
                                    </View>
                                    <Total>{formatCurrency(calculateFinalAmount())}</Total>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <BotaoFolha tipo="contorno" style={{ flex: 1 }} onPress={closePaymentModal} accessibilityRole="button">
                                        <BotaoFolhaTexto tipo="contorno">Cancelar</BotaoFolhaTexto>
                                    </BotaoFolha>
                                    <BotaoFolha tipo="primario" style={{ flex: 2 }} onPress={handleRegisterPayment} disabled={registeringPayment} accessibilityRole="button">
                                        {registeringPayment
                                            ? <ActivityIndicator color={theme.colors.onPrimary} />
                                            : <BotaoFolhaTexto tipo="primario">{editingPayment ? 'Salvar' : 'Confirmar'}</BotaoFolhaTexto>}
                                    </BotaoFolha>
                                </View>
                            </ScrollView>

                    {Platform.OS === 'ios' && (
                        <InputAccessoryView nativeID={ACESSORIO_TECLADO}>
                            <View style={{
                                backgroundColor: theme.colors.surface,
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.border,
                                alignItems: 'flex-end',
                                paddingHorizontal: 16,
                            }}>
                                <TouchableOpacity
                                    onPress={Keyboard.dismiss}
                                    accessibilityRole="button"
                                    accessibilityLabel="Fechar teclado"
                                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
                                >
                                    <BotaoEditarTexto>Concluído</BotaoEditarTexto>
                                </TouchableOpacity>
                            </View>
                        </InputAccessoryView>
                    )}
            </CenterModal>

            {/* Lock Subscription Modal */}
            <BottomSheet visible={showLockModal} onClose={() => setShowLockModal(false)}>
                    <Folha style={{ paddingTop: 12, paddingHorizontal: theme.spacing.xl, paddingBottom: insets.bottom + 28, gap: 16 }}>
                        <Alca />
                        <FolhaTitulo accessibilityRole="header">Trancar mensalidade</FolhaTitulo>
                        <FolhaTexto>O aluno não será cobrado durante o período de trancamento.</FolhaTexto>

                        <View style={{ gap: theme.spacing.sm }}>
                            <Label style={{ marginBottom: 0 }}>Data de retorno</Label>
                            <DateField
                                value={lockUntilDate}
                                onChange={setLockUntilDate}
                                placeholder="Selecionar data"
                                minimumDate={new Date()}
                                accessibilityLabel="Data de retorno"
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <BotaoFolha tipo="contorno" style={{ flex: 1 }} onPress={() => setShowLockModal(false)} accessibilityRole="button">
                                <BotaoFolhaTexto tipo="contorno">Cancelar</BotaoFolhaTexto>
                            </BotaoFolha>
                            <BotaoFolha tipo="primario" style={{ flex: 1 }} onPress={handleLockSubscription} disabled={locking} accessibilityRole="button">
                                {locking
                                    ? <ActivityIndicator color={theme.colors.onPrimary} />
                                    : <BotaoFolhaTexto tipo="primario">Trancar</BotaoFolhaTexto>}
                            </BotaoFolha>
                        </View>
                    </Folha>
            </BottomSheet>
        </Container>
    );
}
