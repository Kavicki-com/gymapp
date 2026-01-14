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
import { FontAwesome } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, TouchableOpacity, View } from 'react-native';
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

const EmployeePhoto = styled.Image`
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
    width: 80%;
    background-color: ${theme.colors.surface};
    padding: 20px;
    border-radius: 10px;
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

const ModalButton = styled.TouchableOpacity<{ variant?: 'cancel' | 'primary' }>`
    flex: 1;
    padding: 10px;
    background-color: ${props => props.variant === 'cancel' ? theme.colors.danger : theme.colors.primary};
    border-radius: 5px;
    margin-left: ${props => props.variant === 'primary' ? '10px' : '0'};
    align-items: center;
`;

const ModalButtonText = styled.Text`
    color: #fff;
    font-weight: bold;
`;

const ActionButton = styled.TouchableOpacity`
    background-color: ${theme.colors.primary};
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

export default function EmployeeDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
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
            Alert.alert('Erro', 'Não foi possível carregar os detalhes do colaborador.');
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
        Alert.alert(
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
            Alert.alert('Sucesso', 'Foto atualizada!');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const handleRegisterPayment = async () => {
        if (!paymentAmount) {
            Alert.alert('Erro', 'Informe o valor do pagamento.');
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

            Alert.alert('Sucesso', 'Pagamento registrado!');
            setShowPaymentModal(false);
            setPaymentDate('');
            setPaymentDescription('');
            fetchPayments();
        } catch (error: any) {
            Alert.alert('Erro', 'Falha ao registrar pagamento: ' + error.message);
        } finally {
            setRegisteringPayment(false);
        }
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

    if (!employee) return null;

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <DetailHeader>
                <Row style={{ justifyContent: 'flex-start' }}>
                    <BackButton onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <DetailTitle>Detalhes do Colaborador</DetailTitle>
                </Row>
                <Row>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/manage-employee', params: { id: employee.id } })} style={{ marginRight: 16 }}>
                        <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                    </TouchableOpacity>
                </Row>
            </DetailHeader>

            <ContentContainer>
                <PhotoContainer onPress={pickImage} disabled={uploading}>
                    {employee.photo_url ? (
                        <EmployeePhoto source={{ uri: employee.photo_url }} />
                    ) : (
                        <FontAwesome name="camera" size={40} color={theme.colors.textSecondary} />
                    )}
                    {uploading && <ActivityIndicator style={{ position: 'absolute' }} color={theme.colors.primary} />}
                </PhotoContainer>

                <Section>
                    <DetailLabel>Nome Completo</DetailLabel>
                    <DetailValue>{employee.name}</DetailValue>

                    <DetailLabel>Email</DetailLabel>
                    <DetailValue>{employee.email}</DetailValue>

                    <Row style={{ marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Função</DetailLabel>
                            <DetailValue>{employee.role || 'Não informado'}</DetailValue>
                        </View>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Telefone</DetailLabel>
                            <DetailValue>{employee.phone || 'Não informado'}</DetailValue>
                        </View>
                    </Row>
                </Section>

                <Section>
                    <Row>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>CPF</DetailLabel>
                            <DetailValue>{employee.cpf || 'Não informado'}</DetailValue>
                        </View>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Data de Nascimento</DetailLabel>
                            <DetailValue>{employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('pt-BR') : 'Não informada'}</DetailValue>
                        </View>
                    </Row>

                    <Row style={{ marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>RG</DetailLabel>
                            <DetailValue>{employee.rg || 'Não informado'}</DetailValue>
                        </View>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Salário</DetailLabel>
                            <DetailValue>R$ {employee.salary ? Number(employee.salary).toFixed(2) : '0.00'}</DetailValue>
                        </View>
                    </Row>
                </Section>

                <Section>
                    <DetailLabel>CTPS</DetailLabel>
                    <DetailValue>{employee.ctps || 'Não informado'}</DetailValue>

                    <Row style={{ marginTop: 8 }}>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Data de Admissão</DetailLabel>
                            <DetailValue>{employee.admission_date ? new Date(employee.admission_date).toLocaleDateString('pt-BR') : 'Não informada'}</DetailValue>
                        </View>
                        <View style={{ flex: 1 }}>
                            <DetailLabel>Dia do Pagamento</DetailLabel>
                            <DetailValue>{employee.payment_day ? `Dia ${employee.payment_day}` : 'Não informado'}</DetailValue>
                        </View>
                    </Row>
                </Section>

                <Section>
                    <DetailTitle style={{ fontSize: 18, marginBottom: 10 }}>Ações</DetailTitle>
                    <ActionButton onPress={() => setShowPaymentModal(true)}>
                        <FontAwesome name="money" size={20} color={theme.colors.background} />
                        <ActionButtonText>Pagar Salário</ActionButtonText>
                    </ActionButton>
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
                                    <DetailValue style={{ fontWeight: 'bold' }}>R$ {Number(p.amount).toFixed(2)}</DetailValue>
                                </Row>
                                <DetailLabel>{p.description || 'Pagamento de salário'}</DetailLabel>
                            </View>
                        ))
                    )}
                </Section>

                {employee.notes && (
                    <Section>
                        <DetailLabel>Observações</DetailLabel>
                        <DetailValue>{employee.notes}</DetailValue>
                    </Section>
                )}
            </ContentContainer>

            <Modal
                transparent={true}
                visible={showPaymentModal}
                animationType="fade"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>Registrar Pagamento de Salário</ModalTitle>

                        <DetailLabel>Valor (R$)</DetailLabel>
                        <StyledInput
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.textSecondary}
                        />

                        <DetailLabel>Data (DD/MM/AAAA)</DetailLabel>
                        <StyledInput
                            value={paymentDate}
                            onChangeText={setPaymentDate}
                            placeholder={new Date().toLocaleDateString('pt-BR')}
                            placeholderTextColor={theme.colors.textSecondary}
                        />

                        <DetailLabel>Observação</DetailLabel>
                        <StyledInput
                            value={paymentDescription}
                            onChangeText={setPaymentDescription}
                            placeholder="Pagamento de salário"
                            placeholderTextColor={theme.colors.textSecondary}
                        />

                        <ModalButtons>
                            <ModalButton variant="cancel" onPress={() => setShowPaymentModal(false)}>
                                <ModalButtonText>Cancelar</ModalButtonText>
                            </ModalButton>
                            <ModalButton variant="primary" onPress={handleRegisterPayment} disabled={registeringPayment}>
                                {registeringPayment ? <ActivityIndicator color="#fff" /> : <ModalButtonText>Confirmar</ModalButtonText>}
                            </ModalButton>
                        </ModalButtons>
                    </ModalContent>
                </ModalOverlay>
            </Modal>
        </Container>
    );
}
