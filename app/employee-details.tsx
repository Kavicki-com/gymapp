import { appAlert } from '@/src/components/AppAlert';
import { BottomSheet } from '@/src/components/BottomSheet';
import { DateField } from '@/src/components/DateField';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { iniciaisDe, JANELA_PROXIMO, proximoPagamento } from '@/src/components/colaboradores/pagamento';
import { Icon } from '@/src/components/Icon';
import { Pill } from '@/src/components/Pill';
import {
    BotaoIcone,
    Campo,
    Entrada,
    IconeCamera,
    IconeLixeira,
    IconeSalario,
    RotuloCampo,
    TituloSecao,
} from '@/src/components/planos/pecas';
import { Container, PageContainer } from '@/src/components/styled';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { formatCurrency } from '@/src/utils/masks';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, InputAccessoryView, Keyboard, Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

/* Layout do redesign (Claude Design, board "ColaboradorFicha"). Consultas,
   upload da foto, exclusão e registro de pagamento são os mesmos de antes;
   só a apresentação mudou. */

const Barra = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`;

const LinkEditar = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    padding: 0 4px;
    justify-content: center;
`;

const LinkEditarTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.primary};
`;

const Cabecalho = styled.View`
    flex-direction: row;
    align-items: center;
    gap: 14px;
`;

const Foto = styled(TouchableOpacity)`
    width: 64px;
    height: 64px;
    border-radius: 32px;
    background-color: ${theme.colors.neutralPill};
    align-items: center;
    justify-content: center;
`;

const FotoImagem = styled.Image`
    width: 64px;
    height: 64px;
    border-radius: 32px;
`;

const FotoIniciais = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 22px;
    color: ${theme.colors.textStrong};
`;

const FotoSelo = styled.View`
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 24px;
    height: 24px;
    border-radius: 12px;
    background-color: ${theme.colors.primary};
    border-width: 2px;
    border-color: ${theme.colors.background};
    align-items: center;
    justify-content: center;
`;

const Nome = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSize.xxl}px;
    letter-spacing: -0.2px;
    color: ${theme.colors.text};
`;

const BotaoPagar = styled(TouchableOpacity)`
    flex: 1;
    min-height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.primary};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.sm}px;
`;

const BotaoPagarTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 15px;
    color: ${theme.colors.onPrimary};
`;

const BotaoExcluir = styled(TouchableOpacity)`
    width: 52px;
    height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    align-items: center;
    justify-content: center;
`;

const Cartao = styled.View`
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: ${theme.borderRadius.lg}px;
`;

const Grade = styled(Cartao)`
    padding: ${theme.spacing.lg}px;
    flex-direction: row;
    flex-wrap: wrap;
    row-gap: 14px;
`;

const Celula = styled.View`
    width: 50%;
    gap: 2px;
    padding-right: ${theme.spacing.md}px;
`;

const RotuloMiudo = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textSecondary};
`;

const ValorGrande = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSize.xl}px;
    color: ${theme.colors.text};
`;

const ValorMedio = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const ValorLinha = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const LinhaPagamento = styled.View<{ primeira: boolean }>`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: ${theme.spacing.md}px;
    padding: 14px 0;
    border-top-width: ${({ primeira }) => (primeira ? 0 : 1)}px;
    border-top-color: ${theme.colors.divider};
`;

const LinhaDado = styled.View<{ primeira: boolean }>`
    flex-direction: row;
    min-height: 44px;
    align-items: center;
    border-top-width: ${({ primeira }) => (primeira ? 0 : 1)}px;
    border-top-color: ${theme.colors.divider};
`;

const DadoRotulo = styled.Text`
    width: 96px;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.textSecondary};
`;

const DadoValor = styled.Text`
    flex: 1;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.text};
`;

const Observacao = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 21px;
    color: ${theme.colors.text};
`;

const FolhaPagamento = styled.View`
    background-color: ${theme.colors.surface};
    border-top-width: 1px;
    border-top-color: ${theme.colors.border};
    border-top-left-radius: 28px;
    border-top-right-radius: 28px;
    padding: 10px ${theme.spacing.xl}px 0;
    gap: ${theme.spacing.lg}px;
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

const BotaoFechar = styled(TouchableOpacity)`
    width: 44px;
    height: 44px;
    border-radius: 22px;
    background-color: ${theme.colors.elevated};
    align-items: center;
    justify-content: center;
`;

const BotaoFolha = styled(TouchableOpacity) <{ primario?: boolean; disabled?: boolean }>`
    min-height: 56px;
    border-radius: 16px;
    align-items: center;
    justify-content: center;
    background-color: ${({ primario }) => (primario ? theme.colors.primary : 'transparent')};
    border-width: ${({ primario }) => (primario ? 0 : 1)}px;
    border-color: ${theme.colors.border};
    opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const BotaoFolhaTexto = styled.Text<{ primario?: boolean }>`
    font-family: ${({ primario }) => (primario ? theme.fonts.bold : theme.fonts.semibold)};
    font-size: ${theme.fontSize.md}px;
    color: ${({ primario }) => (primario ? theme.colors.onPrimary : theme.colors.text)};
`;

const ConcluidoTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: ${theme.fontSize.md}px;
    color: ${theme.colors.primary};
`;

// Ver a nota em client-details: teclado numérico no iOS não tem tecla de
// sair, e sem isto ele cobre os botões do modal.
const ACESSORIO_TECLADO = 'gymapp-acessorio-teclado-salario';

const dataBR = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : null);

export default function EmployeeDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [registeringPayment, setRegisteringPayment] = useState(false);

    useEffect(() => {
        fetchEmployeeDetails();
        fetchPayments();
    }, [id]);

    const fetchEmployeeDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setEmployee(data);

            // Pre-fill payment amount with salary
            if (data.salary) {
                setPaymentAmount(data.salary.toString());
            }
        } catch (error: any) {
            console.error(error);
            appAlert('Erro', 'Não foi possível carregar os detalhes do colaborador.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const { data, error } = await supabase
                .from('employee_payments')
                .select('*')
                .eq('employee_id', id)
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

    const handleDelete = () => {
        appAlert(
            'Confirmar Exclusão',
            'Deseja realmente excluir este colaborador?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('employees').delete().eq('id', id);
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
                .from('employee-photos')
                .upload(fileName, decode(base64Data), {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('employee-photos')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('employees')
                .update({ photo_url: publicUrl })
                .eq('id', id);

            if (updateError) throw updateError;

            setEmployee({ ...employee, photo_url: publicUrl });
            appAlert('Sucesso', 'Foto atualizada!');
        } catch (error: any) {
            console.error(error);
            appAlert('Erro', 'Falha ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const handleRegisterPayment = async () => {
        if (!paymentAmount) {
            appAlert('Erro', 'Informe o valor do pagamento.');
            return;
        }

        setRegisteringPayment(true);
        try {
            const gymId = await getCurrentGymId();

            // Parse date or use current
            let pDate = new Date();
            if (paymentDate) {
                const parts = paymentDate.split('/');
                if (parts.length === 3) {
                    pDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }

            const { error } = await supabase.from('employee_payments').insert({
                employee_id: id,
                gym_id: gymId,
                amount: parseFloat(paymentAmount),
                payment_date: pDate.toISOString(),
                description: paymentDescription || 'Pagamento de salário',
            });

            if (error) throw error;

            appAlert('Sucesso', 'Pagamento registrado!');
            setShowPaymentModal(false);
            setPaymentDate('');
            setPaymentDescription('');
            fetchPayments();
        } catch (error: any) {
            appAlert('Erro', 'Falha ao registrar pagamento: ' + error.message);
        } finally {
            setRegisteringPayment(false);
        }
    };

    const paddingTopo = insets.top + theme.spacing.sm;

    if (loading) {
        return (
            <PageContainer style={{ paddingTop: paddingTopo }}>
                <View style={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
                    <SkeletonLoader variant="card" />
                    <SkeletonLoader variant="text" />
                    <SkeletonLoader variant="text" />
                </View>
            </PageContainer>
        );
    }

    if (!employee) return null;

    // "Salário vence sexta": só quando o dia está perto e não há pagamento
    // registrado nos dias que antecedem o vencimento (já pago adiantado).
    const pagamento = proximoPagamento(employee.payment_day);
    const pagoNaJanela = pagamento && payments.some(p => {
        const d = new Date(p.payment_date).getTime();
        return d >= pagamento.alvo.getTime() - (JANELA_PROXIMO + 3) * 86400000;
    });
    const avisoVencimento = pagamento && pagamento.proximo && !pagoNaJanela
        ? (pagamento.dias === 0 ? 'Salário vence hoje' : `Salário vence ${pagamento.quando}`)
        : null;

    const dados: [string, string][] = [
        ['Telefone', employee.phone || 'Não informado'],
        ['E-mail', employee.email || 'Não informado'],
        ['CPF', employee.cpf || 'Não informado'],
        ['RG', employee.rg || 'Não informado'],
        ['CTPS', employee.ctps || 'Não informado'],
    ];

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: paddingTopo, paddingHorizontal: theme.spacing.xl, paddingBottom: insets.bottom + 32, gap: 18 }}
            >
                <Barra>
                    <BotaoIcone
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Voltar para Colaboradores"
                        style={{ marginLeft: -10 }}
                    >
                        <Icon name="back" size={22} color={theme.colors.text} strokeWidth={2.2} />
                    </BotaoIcone>
                    <LinkEditar
                        onPress={() => router.push({ pathname: '/manage-employee', params: { id: employee.id } })}
                        accessibilityRole="button"
                        accessibilityLabel="Editar colaborador"
                    >
                        <LinkEditarTexto>Editar</LinkEditarTexto>
                    </LinkEditar>
                </Barra>

                <Cabecalho>
                    <Foto
                        onPress={pickImage}
                        disabled={uploading}
                        accessibilityRole="button"
                        accessibilityLabel="Trocar foto do colaborador"
                    >
                        {employee.photo_url
                            ? <FotoImagem source={{ uri: employee.photo_url }} />
                            : <FotoIniciais>{iniciaisDe(employee.name)}</FotoIniciais>}
                        {uploading && <ActivityIndicator style={{ position: 'absolute' }} color={theme.colors.primary} />}
                        <FotoSelo>
                            <IconeCamera size={12} color={theme.colors.onPrimary} />
                        </FotoSelo>
                    </Foto>
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <Nome accessibilityRole="header">{employee.name}</Nome>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {employee.role ? <Pill tone="neutral" label={employee.role} /> : null}
                            {avisoVencimento ? <Pill tone="soon" label={avisoVencimento} /> : null}
                        </View>
                    </View>
                </Cabecalho>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <BotaoPagar onPress={() => setShowPaymentModal(true)} accessibilityRole="button">
                        <IconeSalario size={18} color={theme.colors.onPrimary} />
                        <BotaoPagarTexto>Pagar salário</BotaoPagarTexto>
                    </BotaoPagar>
                    <BotaoExcluir onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Excluir colaborador">
                        <IconeLixeira size={18} color={theme.colors.danger} />
                    </BotaoExcluir>
                </View>

                <Grade accessibilityLabel="Contrato">
                    <Celula>
                        <RotuloMiudo>Salário</RotuloMiudo>
                        <ValorGrande>{formatCurrency(employee.salary || 0)}</ValorGrande>
                    </Celula>
                    <Celula>
                        <RotuloMiudo>Dia do pagamento</RotuloMiudo>
                        <ValorGrande>{employee.payment_day ? String(employee.payment_day) : '—'}</ValorGrande>
                    </Celula>
                    <Celula>
                        <RotuloMiudo>Admissão</RotuloMiudo>
                        <ValorMedio>{dataBR(employee.admission_date) || 'Não informada'}</ValorMedio>
                    </Celula>
                    <Celula>
                        <RotuloMiudo>Nascimento</RotuloMiudo>
                        <ValorMedio>{dataBR(employee.birth_date) || 'Não informada'}</ValorMedio>
                    </Celula>
                </Grade>

                <View style={{ gap: theme.spacing.sm }}>
                    <TituloSecao>Histórico de pagamentos</TituloSecao>
                    <Cartao style={{ paddingHorizontal: theme.spacing.lg }}>
                        {payments.length === 0 ? (
                            <LinhaPagamento primeira>
                                <Apoio>Nenhum pagamento registrado.</Apoio>
                            </LinhaPagamento>
                        ) : (
                            payments.map((p, index) => (
                                <LinhaPagamento key={p.id || index} primeira={index === 0}>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <ValorMedio>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</ValorMedio>
                                        <Apoio>{p.description || 'Pagamento de salário'}</Apoio>
                                    </View>
                                    <ValorLinha>{formatCurrency(p.amount || 0)}</ValorLinha>
                                </LinhaPagamento>
                            ))
                        )}
                    </Cartao>
                </View>

                <View style={{ gap: theme.spacing.sm }}>
                    <TituloSecao>Documentos e contato</TituloSecao>
                    <Cartao style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: 4 }}>
                        {dados.map(([rotulo, valor], i) => (
                            <LinhaDado key={rotulo} primeira={i === 0}>
                                <DadoRotulo>{rotulo}</DadoRotulo>
                                <DadoValor selectable>{valor}</DadoValor>
                            </LinhaDado>
                        ))}
                    </Cartao>
                </View>

                {employee.notes && (
                    <Cartao style={{ padding: theme.spacing.lg, gap: 4 }}>
                        <RotuloMiudo>Observações</RotuloMiudo>
                        <Observacao>{employee.notes}</Observacao>
                    </Cartao>
                )}
            </ScrollView>

            {/* Tocar fora só fecha o teclado, como antes; fecha pelo X. */}
            <BottomSheet
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onBackdropPress={Keyboard.dismiss}
                avoidKeyboard
            >
                    <FolhaPagamento style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
                        <Alca />
                        <Barra>
                            <FolhaTitulo accessibilityRole="header">Pagar salário</FolhaTitulo>
                            <BotaoFechar
                                onPress={() => setShowPaymentModal(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Fechar"
                            >
                                <Icon name="close" size={20} color={theme.colors.textStrong} />
                            </BotaoFechar>
                        </Barra>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Campo style={{ flex: 1, gap: 8 }}>
                                <RotuloCampo>Valor (R$)</RotuloCampo>
                                <Entrada
                                    elevado
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    inputAccessoryViewID={Platform.OS === 'ios' ? ACESSORIO_TECLADO : undefined}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    accessibilityLabel="Valor do pagamento"
                                    style={{ minHeight: 52 }}
                                />
                            </Campo>
                            <Campo style={{ flex: 1, gap: 8 }}>
                                <RotuloCampo>Data</RotuloCampo>
                                <DateField
                                    value={paymentDate}
                                    onChange={setPaymentDate}
                                    placeholder="Selecionar data"
                                    maximumDate={new Date()}
                                    accessibilityLabel="Data do pagamento"
                                />
                            </Campo>
                        </View>

                        <Campo style={{ gap: 8 }}>
                            <RotuloCampo>Observação</RotuloCampo>
                            <Entrada
                                elevado
                                value={paymentDescription}
                                onChangeText={setPaymentDescription}
                                placeholder="Pagamento de salário"
                                accessibilityLabel="Observação"
                                style={{ minHeight: 52, paddingHorizontal: 14 }}
                            />
                        </Campo>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <BotaoFolha style={{ flex: 1 }} onPress={() => setShowPaymentModal(false)} accessibilityRole="button">
                                <BotaoFolhaTexto>Cancelar</BotaoFolhaTexto>
                            </BotaoFolha>
                            <BotaoFolha
                                primario
                                style={{ flex: 2 }}
                                onPress={handleRegisterPayment}
                                disabled={registeringPayment}
                                accessibilityRole="button"
                            >
                                {registeringPayment
                                    ? <ActivityIndicator color={theme.colors.onPrimary} />
                                    : <BotaoFolhaTexto primario>Confirmar</BotaoFolhaTexto>}
                            </BotaoFolha>
                        </View>
                    </FolhaPagamento>

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
                                style={{ paddingVertical: 10, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }}
                            >
                                <ConcluidoTexto>Concluído</ConcluidoTexto>
                            </TouchableOpacity>
                        </View>
                    </InputAccessoryView>
                )}
            </BottomSheet>
        </Container>
    );
}
