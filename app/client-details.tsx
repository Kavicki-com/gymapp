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
import * as Linking from 'expo-linking';
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

export default function ClientDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [client, setClient] = useState<any>(null);
    const [planName, setPlanName] = useState('');
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(''); // Format: DD/MM/YYYY
    const [registeringPayment, setRegisteringPayment] = useState(false);

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
                    // Pre-fill amount for payment modal based on plan price
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
                .order('payment_date', { ascending: false });

            if (error) {
                // If table doesn't exist yet, just ignore pending user migration
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

            const { error } = await supabase.from('payments').insert({
                client_id: id,
                gym_id: gymId,
                plan_name: planName,
                amount: parseFloat(paymentAmount),
                payment_date: pDate.toISOString(),
            });

            if (error) throw error;

            // Update client status
            const { error: clientError } = await supabase.from('clients')
                .update({
                    last_payment_date: pDate.toISOString(),
                    payment_status: 'paid'
                })
                .eq('id', id);

            if (clientError) throw clientError;

            Alert.alert('Sucesso', 'Pagamento registrado!');
            setShowPaymentModal(false);
            setPaymentDate('');
            fetchClientDetails();
            fetchPayments();
        } catch (error: any) {
            Alert.alert('Erro', 'Falha ao registrar pagamento: ' + error.message);
        } finally {
            setRegisteringPayment(false);
        }
    };

    const handleWhatsApp = () => {
        if (!client.phone) {
            Alert.alert('Erro', 'Cliente sem telefone cadastrado.');
            return;
        }

        const phone = client.phone.replace(/\D/g, '');
        const message = `Olá, ${client.name}! Gostaríamos de lembrar que sua mensalidade venceu. Poderia regularizar?`;

        // Using universal link which works for WhatsApp, WhatsApp Business and Web
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

    const isOverdue = client.payment_status !== 'paid'; // Simple logic, can be improved with due_day check vs today

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
                    <DetailValue style={{ color: client.payment_status === 'paid' ? theme.colors.success : theme.colors.danger }}>
                        {client.payment_status === 'paid' ? 'Em dia' : 'Pendente'}
                    </DetailValue>

                    <DetailLabel>Último Pagamento</DetailLabel>
                    <DetailValue>{client.last_payment_date ? new Date(client.last_payment_date).toLocaleDateString('pt-BR') : 'Nunca'}</DetailValue>
                </Section>

                <Section>
                    <DetailTitle style={{ fontSize: 18, marginBottom: 10 }}>Ações</DetailTitle>
                    <ActionButton onPress={() => setShowPaymentModal(true)}>
                        <FontAwesome name="money" size={20} color={theme.colors.background} />
                        <ActionButtonText>Lançar Pagamento</ActionButtonText>
                    </ActionButton>

                    {isOverdue && (
                        <ActionButton
                            onPress={handleWhatsApp}
                            style={{ backgroundColor: '#25D366', marginTop: 10 }}
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
                                    <DetailValue style={{ fontWeight: 'bold' }}>R$ {p.amount}</DetailValue>
                                </Row>
                                <DetailLabel>{p.plan_name || 'Pagamento avulso'}</DetailLabel>
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

            <Modal
                transparent={true}
                visible={showPaymentModal}
                animationType="fade"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>Registrar Pagamento</ModalTitle>

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
