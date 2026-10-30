import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';
import {
    BotaoPrincipal,
    Cabecalho,
    Campo,
    Dica,
    Formulario,
    IconeAcesso,
    Rodape,
    Subtitulo,
    TelaAcesso,
    Titulo,
} from '../../src/components/acesso';
import { BlockTitle, Container, Input, SectionLabel } from '../../src/components/styled';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { theme } from '../../src/styles/theme';
import { formatCEP, formatCNPJ, formatDate } from '../../src/utils/masks';

/*
 * Layout do redesign (Claude Design, "Onboarding"). O design divide o
 * cadastro em 3 passos; aqui os três blocos ficam na mesma tela, em
 * sequência, porque os campos, a validação e o único insert no fim são os
 * mesmos de antes. Os dias passaram do seletor em modal para opções na
 * própria tela, com os mesmos valores.
 */

const TituloOnboarding = styled(Titulo)`
    font-size: 28px;
    line-height: 34px;
`;

const Bloco = styled.View`
    gap: ${theme.spacing.lg}px;
`;

const LogoQuadro = styled(TouchableOpacity)`
    width: 72px;
    height: 72px;
    border-radius: 20px;
    border-width: 1px;
    border-style: dashed;
    border-color: #3A3F45;
    background-color: ${theme.colors.surface};
    align-items: center;
    justify-content: center;
    overflow: hidden;
`;

const LogoImagem = styled.Image`
    width: 100%;
    height: 100%;
`;

const BotaoLogo = styled(TouchableOpacity)`
    min-height: ${theme.touch}px;
    padding-horizontal: ${theme.spacing.lg}px;
    border-radius: 12px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    align-items: center;
    justify-content: center;
    align-self: flex-start;
`;

const BotaoLogoTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${theme.colors.text};
`;

const OpcaoDias = styled(TouchableOpacity)<{ ativo: boolean }>`
    min-height: 52px;
    padding-horizontal: ${theme.spacing.lg}px;
    border-radius: ${theme.borderRadius.md}px;
    border-width: 1px;
    border-color: ${({ ativo }) => (ativo ? theme.colors.primary : theme.colors.border)};
    background-color: ${({ ativo }) => (ativo ? theme.colors.primarySoft : theme.colors.surface)};
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const OpcaoDiasTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const OpcaoDiasApoio = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const RotuloPequeno = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    color: ${theme.colors.textSecondary};
`;

const RotuloGrupo = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.textStrong};
`;

const Ate = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.textSecondary};
    padding-top: 22px;
`;

const Proximos = styled.View`
    gap: ${theme.spacing.md}px;
    padding: ${theme.spacing.lg}px;
    border-radius: ${theme.borderRadius.lg}px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
`;

const ProximoNumero = styled.View`
    width: 24px;
    height: 24px;
    border-radius: 12px;
    background-color: ${theme.colors.neutralPill};
    align-items: center;
    justify-content: center;
`;

const ProximoNumeroTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 12px;
    color: ${theme.colors.text};
`;

const ProximoTexto = styled.Text`
    flex: 1;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.text};
`;

const PROXIMOS_PASSOS = [
    'Crie seus planos',
    'Cadastre os alunos (ou peça a migração grátis)',
    'Cadastre sua chave Pix',
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);

    const [formData, setFormData] = useState({
        gym_name: '',
        cep: '',
        address: '',
        cnpj: '',
        working_days: '',
        opening_time: '',
        closing_time: '',
        logo_uri: '',
        logo_base64: '',
        owner_cpf: '',
        owner_birth_date: '',
    });

    const daysOptions = [
        { label: 'Segunda à sexta', value: 'seg_sex', hint: '5 dias' },
        { label: 'Segunda à sábado', value: 'seg_sab', hint: '6 dias' },
        { label: 'Todos os dias', value: 'todos', hint: '7 dias' },
    ];

    const formatTime = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
        }
        return formatted;
    };

    const updateForm = (key: string, value: string) => {
        if (key === 'cnpj') value = formatCNPJ(value);
        if (key === 'cep') value = formatCEP(value);
        if (key === 'owner_birth_date') value = formatDate(value);
        if (key === 'opening_time' || key === 'closing_time') {
            value = formatTime(value);
        }
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCepBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length === 8) {
            setLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();

                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData(prev => ({ ...prev, address: fullAddress }));
                } else {
                    Alert.alert('CEP não encontrado', 'Verifique o CEP digitado.');
                }
            } catch (error) {
                Alert.alert('Erro', 'Falha ao buscar CEP.');
            } finally {
                setLoadingCep(false);
            }
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setFormData(prev => ({
                ...prev,
                logo_uri: result.assets[0].uri,
                logo_base64: result.assets[0].base64 || ''
            }));
        }
    };

    const convertDateToISO = (dateStr: string) => {
        if (!dateStr || dateStr.length < 10) return null;
        const [day, month, year] = dateStr.split('/');
        // Validate valid date parts
        if (!day || !month || !year) return null;
        return `${year}-${month}-${day}`;
    };

    // D2 — dias e horários deixaram de ser obrigatórios. Sem isto, um perfil
    // sem horário gravava a string " -  às ", que é pior que vazio.
    const montarHorario = (dias: string, abre: string, fecha: string): string | null => {
        const faixa = abre && fecha ? `${abre} às ${fecha}` : (abre || fecha || '');
        const partes = [dias, faixa].filter(Boolean);
        return partes.length ? partes.join(' - ') : null;
    };

    const handleFinish = async () => {
        if (!formData.gym_name || !formData.address) {
            Alert.alert('Erro', 'Preencha Nome da Academia e Endereço.');
            return;
        }

        setLoading(true);
        try {
            const userId = session?.user.id;
            if (!userId) throw new Error('Usuário não autenticado.');

            // A5 — a logo era pedida e descartada em silêncio. Sobe antes do
            // insert, para o perfil já nascer com ela.
            let logoUrl: string | null = null;
            if (formData.logo_base64) {
                const filePath = `${userId}/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, decode(formData.logo_base64), {
                        contentType: 'image/jpeg',
                    });

                if (uploadError) {
                    // Não aborta o cadastro por causa da logo — ela é opcional.
                    console.error('Logo upload failed:', uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
                    logoUrl = publicUrl;
                }
            }

            const profileData = {
                user_id: userId,
                gym_name: formData.gym_name,
                logo_url: logoUrl,
                address: formData.address,
                opening_hours: montarHorario(formData.working_days, formData.opening_time, formData.closing_time),
                cnpj: formData.cnpj || null,
                owner_cpf: formData.owner_cpf || null,
                owner_birth_date: convertDateToISO(formData.owner_birth_date),
            };

            const { error } = await supabase
                .from('gym_profiles')
                .insert(profileData);

            if (error) throw error;

            router.replace('/(drawer)/(tabs)');

        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <Stack.Screen options={{ headerShown: false }} />
            <TelaAcesso respiroTopo={24} espaco={32}>
                <Bloco>
                    <Cabecalho>
                        <TituloOnboarding accessibilityRole="header">Sua academia</TituloOnboarding>
                        <Subtitulo>É assim que ela aparece no app e nas mensagens de cobrança.</Subtitulo>
                    </Cabecalho>

                    <Formulario>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                            <LogoQuadro
                                onPress={pickImage}
                                accessibilityRole="button"
                                accessibilityLabel={formData.logo_uri ? 'Trocar logo' : 'Adicionar logo'}
                            >
                                {formData.logo_uri ? (
                                    <LogoImagem source={{ uri: formData.logo_uri }} />
                                ) : (
                                    <IconeAcesso nome="imagem" size={26} color={theme.colors.textMuted} />
                                )}
                            </LogoQuadro>
                            <View style={{ gap: 4, flex: 1 }}>
                                <BotaoLogo onPress={pickImage} accessibilityRole="button">
                                    <BotaoLogoTexto>{formData.logo_uri ? 'Trocar logo' : 'Adicionar logo'}</BotaoLogoTexto>
                                </BotaoLogo>
                                <Dica>Opcional · dá pra fazer depois</Dica>
                            </View>
                        </View>

                        <Campo rotulo="Nome da academia" obrigatorio>
                            <Input
                                placeholder="Ex.: Academia Força Total"
                                value={formData.gym_name} onChangeText={t => updateForm('gym_name', t)}
                            />
                        </Campo>

                        <Campo rotulo="CEP" dica="Preenchemos o endereço a partir do CEP.">
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        placeholder="00000-000"
                                        value={formData.cep}
                                        onChangeText={t => updateForm('cep', t)}
                                        onBlur={handleCepBlur}
                                        keyboardType="numeric"
                                        maxLength={9}
                                    />
                                </View>
                                {loadingCep && (
                                    <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Buscando CEP" />
                                )}
                            </View>
                        </Campo>

                        <Campo rotulo="Endereço" obrigatorio>
                            <Input
                                placeholder="Rua, número e bairro"
                                value={formData.address} onChangeText={t => updateForm('address', t)}
                                multiline
                            />
                        </Campo>

                        <Campo rotulo="CNPJ" opcional>
                            <Input
                                placeholder="00.000.000/0000-00"
                                value={formData.cnpj} onChangeText={t => updateForm('cnpj', t)}
                                keyboardType="numeric"
                            />
                        </Campo>
                    </Formulario>
                </Bloco>

                <Bloco>
                    <Cabecalho>
                        <BlockTitle accessibilityRole="header" style={{ fontSize: 22 }}>Quando abre</BlockTitle>
                        <Subtitulo>Dias e horário de funcionamento. Dá para mudar quando quiser.</Subtitulo>
                    </Cabecalho>

                    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Dias de funcionamento">
                        <RotuloGrupo>Dias</RotuloGrupo>
                        {daysOptions.map(option => {
                            const ativo = formData.working_days === option.value;
                            return (
                                <OpcaoDias
                                    key={option.value}
                                    ativo={ativo}
                                    onPress={() => updateForm('working_days', option.value)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: ativo }}
                                    accessibilityLabel={option.label}
                                >
                                    <OpcaoDiasTexto>{option.label}</OpcaoDiasTexto>
                                    <OpcaoDiasApoio>{option.hint}</OpcaoDiasApoio>
                                </OpcaoDias>
                            );
                        })}
                    </View>

                    <View style={{ gap: 10 }}>
                        <RotuloGrupo>Horário</RotuloGrupo>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ flex: 1, gap: 6 }}>
                                <RotuloPequeno>Abre</RotuloPequeno>
                                <Input
                                    placeholder="HH:MM"
                                    value={formData.opening_time}
                                    onChangeText={t => updateForm('opening_time', t)}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    accessibilityLabel="Abre"
                                />
                            </View>
                            <Ate>até</Ate>
                            <View style={{ flex: 1, gap: 6 }}>
                                <RotuloPequeno>Fecha</RotuloPequeno>
                                <Input
                                    placeholder="HH:MM"
                                    value={formData.closing_time}
                                    onChangeText={t => updateForm('closing_time', t)}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    accessibilityLabel="Fecha"
                                />
                            </View>
                        </View>
                    </View>
                </Bloco>

                <Bloco>
                    <Cabecalho>
                        <BlockTitle accessibilityRole="header" style={{ fontSize: 22 }}>Responsável</BlockTitle>
                        <Subtitulo>Tudo opcional. Ajuda em contratos e na emissão de recibos.</Subtitulo>
                    </Cabecalho>

                    <Formulario>
                        <Campo rotulo="CPF do proprietário">
                            <Input
                                placeholder="000.000.000-00"
                                value={formData.owner_cpf} onChangeText={t => updateForm('owner_cpf', t)}
                                keyboardType="numeric"
                            />
                        </Campo>
                        <Campo rotulo="Data de nascimento">
                            <Input
                                placeholder="DD/MM/AAAA"
                                value={formData.owner_birth_date} onChangeText={t => updateForm('owner_birth_date', t)}
                                keyboardType="numeric"
                                maxLength={10}
                            />
                        </Campo>
                    </Formulario>

                    <Proximos accessibilityLabel="Próximos passos">
                        <SectionLabel>Depois disso</SectionLabel>
                        {PROXIMOS_PASSOS.map((passo, i) => (
                            <View key={passo} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <ProximoNumero><ProximoNumeroTexto>{i + 1}</ProximoNumeroTexto></ProximoNumero>
                                <ProximoTexto>{passo}</ProximoTexto>
                            </View>
                        ))}
                    </Proximos>
                </Bloco>

                <Rodape>
                    <BotaoPrincipal titulo="Começar a usar" onPress={handleFinish} carregando={loading} />
                </Rodape>
            </TelaAcesso>
        </Container>
    );
}
