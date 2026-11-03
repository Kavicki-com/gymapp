import { appAlert } from '@/src/components/AppAlert';
import { Icon, IconName } from '@/src/components/Icon';
import { Pill } from '@/src/components/Pill';
import { PrivacyPolicyModal } from '@/src/components/PrivacyPolicyModal';
import { lerCollectionsEnabled } from '@/src/hooks/useCollectionsEnabled';
import { Divider, SectionLabel } from '@/src/components/styled';
import { linkWhatsApp, WHATSAPP_SUPORTE_EXIBICAO } from '@/src/config/contato';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

/**
 * Aba Mais: o que antes era o menu lateral (redesign, Fase 2).
 *
 * "Mensagem e chave Pix" abre a aba Cobranças direto na vista de
 * configuração (param `config`). Assinatura abre a tela de assinatura, com
 * a pílula do estado (ativa por loja, cartão, Pix ou cortesia).
 */

const Conteudo = styled.View`
    padding: ${theme.spacing.xl}px;
    gap: ${theme.spacing.xl}px;
`;

const CartaoPerfil = styled(TouchableOpacity)`
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: ${theme.spacing.lg}px;
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: ${theme.borderRadius.lg}px;
`;

const Logo = styled.Image`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.neutralPill};
`;

const Iniciais = styled.View`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.neutralPill};
    align-items: center;
    justify-content: center;
`;

const IniciaisTexto = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 20px;
    color: ${theme.colors.primary};
`;

const NomeAcademia = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 20px;
    color: ${theme.colors.text};
`;

const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const Grupo = styled.View`
    background-color: ${theme.colors.surface};
    border-width: 1px;
    border-color: ${theme.colors.divider};
    border-radius: ${theme.borderRadius.lg}px;
    overflow: hidden;
`;

const Linha = styled(TouchableOpacity)`
    flex-direction: row;
    align-items: center;
    gap: ${theme.spacing.md}px;
    min-height: 56px;
    padding: 0 ${theme.spacing.lg}px;
`;

const LinhaTexto = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const Contagem = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.textSecondary};
`;

const BotaoSair = styled(TouchableOpacity)`
    min-height: 52px;
    border-radius: 16px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing.sm}px;
`;

const BotaoSairTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.danger};
`;

const iniciaisDe = (nome: string) =>
    nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

function Item({ icone, rotulo, apoio, direita, onPress, iconeNode }: {
    icone?: IconName;
    iconeNode?: React.ReactNode;
    rotulo: string;
    apoio?: string;
    direita?: React.ReactNode;
    onPress: () => void;
}) {
    return (
        <Linha onPress={onPress} accessibilityRole="button" accessibilityLabel={rotulo}>
            {iconeNode ?? (icone && <Icon name={icone} size={20} color={theme.colors.textStrong} />)}
            <View style={{ flex: 1, gap: 2 }}>
                <LinhaTexto>{rotulo}</LinhaTexto>
                {apoio ? <Apoio>{apoio}</Apoio> : null}
            </View>
            {direita}
            <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
        </Linha>
    );
}

export default function MaisScreen() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [perfil, setPerfil] = useState({ nome: '', logo: null as string | null, desde: '' });
    const [colaboradores, setColaboradores] = useState<number | null>(null);
    const [politicaAberta, setPoliticaAberta] = useState(false);
    const [assinaturaAtiva, setAssinaturaAtiva] = useState<boolean | null>(null);

    useFocusEffect(useCallback(() => {
        let vivo = true;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                lerCollectionsEnabled().then(v => vivo && setAssinaturaAtiva(v));
                const { data: gym } = await supabase
                    .from('gym_profiles')
                    .select('id, gym_name, logo_url')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (!vivo) return;
                setPerfil({
                    nome: gym?.gym_name || 'Sua academia',
                    logo: gym?.logo_url || null,
                    desde: String(new Date(user.created_at).getFullYear()),
                });
                if (gym?.id) {
                    const { count } = await supabase
                        .from('employees')
                        .select('id', { count: 'exact', head: true })
                        .eq('gym_id', gym.id);
                    if (vivo) setColaboradores(count ?? 0);
                }
            } catch (e) {
                console.log('Erro ao carregar a aba Mais:', e);
            }
        })();
        return () => { vivo = false; };
    }, []));

    // Só desloga: quem leva ao login é o (drawer)/_layout, que reage à sessão
    // sumir (vale também para sessão expirada).
    const sair = async () => {
        try {
            await signOut();
        } catch {
            appAlert('Erro', 'Não foi possível sair. Tente novamente.');
        }
    };

    const abrirPerfil = () => router.push('/(drawer)/profile/edit');

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Conteudo>
                <CartaoPerfil onPress={abrirPerfil} accessibilityRole="button" accessibilityLabel="Perfil da academia">
                    {perfil.logo ? (
                        <Logo source={{ uri: perfil.logo }} onError={() => setPerfil(p => ({ ...p, logo: null }))} />
                    ) : (
                        <Iniciais><IniciaisTexto>{iniciaisDe(perfil.nome)}</IniciaisTexto></Iniciais>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                        <NomeAcademia numberOfLines={1}>{perfil.nome}</NomeAcademia>
                        {perfil.desde ? <Apoio>desde {perfil.desde}</Apoio> : null}
                    </View>
                    <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
                </CartaoPerfil>

                <View style={{ gap: theme.spacing.sm }}>
                    <SectionLabel>Academia</SectionLabel>
                    <Grupo>
                        <Item
                            icone="id-card"
                            rotulo="Colaboradores"
                            direita={colaboradores !== null ? <Contagem>{colaboradores}</Contagem> : null}
                            onPress={() => router.push('/(drawer)/(tabs)/employees')}
                        />
                        <Divider />
                        <Item icone="building" rotulo="Perfil da academia" onPress={abrirPerfil} />
                        <Divider />
                        <Item
                            icone="card"
                            rotulo="Assinatura"
                            direita={assinaturaAtiva === null ? null : (
                                <Pill small tone={assinaturaAtiva ? 'ok' : 'neutral'}
                                    label={assinaturaAtiva ? 'Ativa' : 'Sem assinatura'} />
                            )}
                            onPress={() => router.push('/(drawer)/assinatura')}
                        />
                        <Divider />
                        <Item
                            icone="pencil"
                            rotulo="Mensagem e chave Pix"
                            onPress={() => router.push({ pathname: '/collections', params: { config: '1' } })}
                        />
                    </Grupo>
                </View>

                <View style={{ gap: theme.spacing.sm }}>
                    <SectionLabel>Ajuda</SectionLabel>
                    <Grupo>
                        <Item
                            iconeNode={<FontAwesome name="whatsapp" size={20} color={theme.colors.success} />}
                            rotulo="Suporte no WhatsApp"
                            apoio={WHATSAPP_SUPORTE_EXIBICAO}
                            onPress={() => Linking.openURL(linkWhatsApp()).catch(() =>
                                Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'))}
                        />
                        <Divider />
                        <Item icone="shield" rotulo="Política de privacidade" onPress={() => setPoliticaAberta(true)} />
                    </Grupo>
                </View>

                <BotaoSair onPress={sair} accessibilityRole="button">
                    <Icon name="logout" size={18} color={theme.colors.danger} />
                    <BotaoSairTexto>Sair</BotaoSairTexto>
                </BotaoSair>
            </Conteudo>

            <PrivacyPolicyModal visible={politicaAberta} onClose={() => setPoliticaAberta(false)} />
        </ScrollView>
    );
}
