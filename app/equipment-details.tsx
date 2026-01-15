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

const StatusText = styled.Text<{ color: string }>`
  font-weight: bold;
  font-size: ${theme.fontSize.lg}px;
  color: ${({ color }) => color};
  margin-bottom: ${theme.spacing.md}px;
`;

// Image Gallery Styled Components
const ImageGalleryContainer = styled.ScrollView`
  margin-bottom: ${theme.spacing.lg}px;
`;

const ImageThumbnail = styled.Image`
  width: 80px;
  height: 80px;
  border-radius: ${theme.borderRadius.sm}px;
  margin-right: ${theme.spacing.sm}px;
`;

const AddImageButton = styled(TouchableOpacity)`
  width: 80px;
  height: 80px;
  border-radius: ${theme.borderRadius.sm}px;
  background-color: ${theme.colors.surface};
  border: 2px dashed ${theme.colors.primary};
  justify-content: center;
  align-items: center;
  margin-right: 8px;
`;

// Modal Styled Components
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

const StyledTextArea = styled.TextInput`
    background-color: ${theme.colors.inputBackground};
    color: ${theme.colors.text};
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
    min-height: 80px;
    text-align-vertical: top;
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

export default function EquipmentDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [equipment, setEquipment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Image Gallery State
    const [images, setImages] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Maintenance Modal State
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceDate, setMaintenanceDate] = useState('');
    const [maintenanceNotes, setMaintenanceNotes] = useState('');
    const [registering, setRegistering] = useState(false);

    // Maintenance History State
    const [maintenances, setMaintenances] = useState<any[]>([]);

    useEffect(() => {
        fetchEquipmentDetails();
        fetchEquipmentImages();
        fetchMaintenanceHistory();
    }, [id]);

    const fetchEquipmentDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setEquipment(data);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes do aparelho.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const fetchEquipmentImages = async () => {
        try {
            const { data, error } = await supabase
                .from('equipment_images')
                .select('*')
                .eq('equipment_id', id)
                .order('created_at', { ascending: false });

            if (error) {
                console.log('Error fetching images (table might not exist):', error.message);
            } else {
                setImages(data || []);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const fetchMaintenanceHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('equipment_maintenances')
                .select('*')
                .eq('equipment_id', id)
                .order('maintenance_date', { ascending: false });

            if (error) {
                console.log('Error fetching maintenances (table might not exist):', error.message);
            } else {
                setMaintenances(data || []);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Confirmar Exclusão',
            'Deseja realmente excluir este aparelho?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('equipment').delete().eq('id', id);
                            if (error) throw error;
                            router.back();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir o aparelho. Tente novamente.');
                        }
                    }
                }
            ]
        );
    };

    const pickAndUploadImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setUploading(true);
                const gymId = await getCurrentGymId();
                const fileName = `${id}-${Date.now()}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('equipment-images')
                    .upload(fileName, decode(result.assets[0].base64), {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('equipment-images')
                    .getPublicUrl(fileName);

                const { error: insertError } = await supabase
                    .from('equipment_images')
                    .insert({
                        equipment_id: id,
                        gym_id: gymId,
                        image_url: publicUrl
                    });

                if (insertError) throw insertError;

                Alert.alert('Sucesso', 'Imagem adicionada!');
                fetchEquipmentImages();
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        if (cleaned.length > 4) formatted = `${formatted.slice(0, 5)}/${formatted.slice(5, 9)}`;
        return formatted;
    };

    const handleRegisterMaintenance = async () => {
        if (!maintenanceDate) {
            Alert.alert('Erro', 'Informe a data da manutenção.');
            return;
        }

        setRegistering(true);
        try {
            const gymId = await getCurrentGymId();

            // Parse date
            const parts = maintenanceDate.split('/');
            let mDate = new Date();
            if (parts.length === 3) {
                mDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            const isoDate = mDate.toISOString().split('T')[0];

            // Insert maintenance record
            const { error: insertError } = await supabase.from('equipment_maintenances').insert({
                equipment_id: id,
                gym_id: gymId,
                maintenance_date: isoDate,
                observations: maintenanceNotes || null,
            });

            if (insertError) throw insertError;

            // Update equipment last_maintenance
            const { error: updateError } = await supabase
                .from('equipment')
                .update({ last_maintenance: isoDate })
                .eq('id', id);

            if (updateError) throw updateError;

            Alert.alert('Sucesso', 'Manutenção registrada!');
            setShowMaintenanceModal(false);
            setMaintenanceDate('');
            setMaintenanceNotes('');
            fetchEquipmentDetails();
            fetchMaintenanceHistory();
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível registrar a manutenção. Tente novamente.');
        } finally {
            setRegistering(false);
        }
    };

    const getMaintenanceStatus = (lastDate: string, intervalDays: number) => {
        if (!lastDate || !intervalDays) return { color: theme.colors.textSecondary, label: 'Indefinido', isOverdue: false };

        const last = new Date(lastDate);
        const next = new Date(last);
        next.setDate(last.getDate() + intervalDays);
        const today = new Date();

        const diffTime = next.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: theme.colors.danger, label: 'Vencida', isOverdue: true };
        if (diffDays <= 15) return { color: theme.colors.primary, label: `Vence em ${diffDays}d`, isOverdue: true };
        return { color: theme.colors.success, label: 'Em dia', isOverdue: false };
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

    if (!equipment) return null;

    const status = getMaintenanceStatus(equipment.last_maintenance, equipment.maintenance_interval_days);

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <DetailHeader>
                <Row style={{ justifyContent: 'flex-start' }}>
                    <BackButton onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
                    </BackButton>
                    <DetailTitle>Detalhes do Aparelho</DetailTitle>
                </Row>
                <Row>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/manage-equipment', params: { id: equipment.id } })} style={{ marginRight: 16 }}>
                        <FontAwesome name="edit" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}>
                        <FontAwesome name="trash" size={24} color={theme.colors.danger} />
                    </TouchableOpacity>
                </Row>
            </DetailHeader>

            <ContentContainer>
                {/* Image Gallery */}
                <ImageGalleryContainer horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                    <AddImageButton onPress={pickAndUploadImage} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color={theme.colors.primary} />
                        ) : (
                            <FontAwesome name="plus" size={24} color={theme.colors.primary} />
                        )}
                    </AddImageButton>
                    {images.map((img) => (
                        <ImageThumbnail key={img.id} source={{ uri: img.image_url }} />
                    ))}
                </ImageGalleryContainer>

                <Section>
                    <DetailLabel>Nome do Aparelho</DetailLabel>
                    <DetailValue>{equipment.name}</DetailValue>

                    <DetailLabel>Marca/Modelo</DetailLabel>
                    <DetailValue>{equipment.brand || 'Não informado'}</DetailValue>

                    <DetailLabel>Número de Série</DetailLabel>
                    <DetailValue>{equipment.serial_number || 'Não informado'}</DetailValue>

                    <DetailLabel>Data de Aquisição</DetailLabel>
                    <DetailValue>{equipment.acquisition_date ? new Date(equipment.acquisition_date).toLocaleDateString('pt-BR') : 'Não informada'}</DetailValue>
                </Section>

                <Section>
                    <DetailLabel>Status de Manutenção</DetailLabel>
                    <StatusText color={status.color}>{status.label}</StatusText>

                    <DetailLabel>Última Manutenção</DetailLabel>
                    <DetailValue>{equipment.last_maintenance ? new Date(equipment.last_maintenance).toLocaleDateString('pt-BR') : 'Nunca'}</DetailValue>

                    <DetailLabel>Intervalo de Manutenção</DetailLabel>
                    <DetailValue>{equipment.maintenance_interval_days ? `${equipment.maintenance_interval_days} dias` : 'Não definido'}</DetailValue>

                    {/* Maintenance Button - visible when not "Em dia" */}
                    {status.isOverdue && (
                        <ActionButton onPress={() => setShowMaintenanceModal(true)}>
                            <FontAwesome name="wrench" size={20} color={theme.colors.background} />
                            <ActionButtonText>Realizar Manutenção</ActionButtonText>
                        </ActionButton>
                    )}
                </Section>

                {/* Maintenance History */}
                <Section>
                    <DetailTitle style={{ fontSize: 18, marginBottom: 10 }}>Histórico de Manutenções</DetailTitle>
                    {maintenances.length === 0 ? (
                        <DetailValue>Nenhuma manutenção registrada.</DetailValue>
                    ) : (
                        maintenances.map((m, index) => (
                            <View key={m.id || index} style={{
                                borderBottomWidth: index < maintenances.length - 1 ? 1 : 0,
                                borderBottomColor: theme.colors.border,
                                paddingVertical: 10
                            }}>
                                <Row>
                                    <DetailValue style={{ fontWeight: 'bold' }}>
                                        {new Date(m.maintenance_date).toLocaleDateString('pt-BR')}
                                    </DetailValue>
                                </Row>
                                {m.observations && (
                                    <DetailLabel style={{ marginTop: 4 }}>{m.observations}</DetailLabel>
                                )}
                            </View>
                        ))
                    )}
                </Section>

                {equipment.notes && (
                    <Section>
                        <DetailLabel>Observações</DetailLabel>
                        <DetailValue>{equipment.notes}</DetailValue>
                    </Section>
                )}
            </ContentContainer>

            {/* Maintenance Modal */}
            <Modal
                transparent={true}
                visible={showMaintenanceModal}
                animationType="fade"
                onRequestClose={() => setShowMaintenanceModal(false)}
            >
                <ModalOverlay>
                    <ModalContent>
                        <ModalTitle>Registrar Manutenção</ModalTitle>

                        <DetailLabel>Data (DD/MM/AAAA)</DetailLabel>
                        <StyledInput
                            value={maintenanceDate}
                            onChangeText={(t: string) => setMaintenanceDate(formatDate(t))}
                            placeholder={new Date().toLocaleDateString('pt-BR')}
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="number-pad"
                            maxLength={10}
                        />

                        <DetailLabel>Observações</DetailLabel>
                        <StyledTextArea
                            value={maintenanceNotes}
                            onChangeText={setMaintenanceNotes}
                            placeholder="Descreva a manutenção realizada..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />

                        <ModalButtons>
                            <ModalButton variant="cancel" onPress={() => setShowMaintenanceModal(false)}>
                                <ModalButtonText>Cancelar</ModalButtonText>
                            </ModalButton>
                            <ModalButton variant="primary" onPress={handleRegisterMaintenance} disabled={registering}>
                                {registering ? <ActivityIndicator color="#fff" /> : <ModalButtonText>Confirmar</ModalButtonText>}
                            </ModalButton>
                        </ModalButtons>
                    </ModalContent>
                </ModalOverlay>
            </Modal>
        </Container>
    );
}
