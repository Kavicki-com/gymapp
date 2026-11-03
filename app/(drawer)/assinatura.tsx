import { appAlert } from '@/src/components/AppAlert';
import { Icon } from '@/src/components/Icon';
import { Pill } from '@/src/components/Pill';
import { BodyText, PageTitle, Section, SectionLabel } from '@/src/components/styled';
import { URL_PRIVACIDADE, URL_TERMOS } from '@/src/config/revenuecat';
import {
    entitlementAtivo,
    gerenciarAssinatura,
    lerCliente,
    lerPlanos,
    restaurar,
    sincronizarNoServidor,
    type Planos,
} from '@/src/services/purchases';
import { supabase } from '@/src/services/supabase';
import { theme } from '@/src/styles/theme';
import { getCurrentGymId } from '@/src/utils/auth';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

/**
 * Assinatura da aba Cobranças (Claude Design: "Assinatura — pela loja",
 * "— fora da loja" e "— sem assinatura").
 *
 * Três situações, porque a loja convive com o Mercado Pago e o Pix:
 *  - pela loja: preço, renovação, gerenciar (abre a própria loja) e restaurar;
 *  - fora da loja (cartão, Pix pelo site, Pix na conta PJ ou cortesia): só o
 *    estado e a validade. Sem preço e sem link — com compra dentro do app, a
 *    Apple não aceita apontar para pagamento fora dele;
 *  - sem assinatura: leva para a tela de compra, na aba Cobranças.
 */

type Linha = {
    kind: 'recurring_card' | 'pix' | 'store';
    status: string;
    current_period_end: string | null;
    auto_renew: boolean | null;
    store: 'app_store' | 'play_store' | null;
    store_product_id: string | null;
};

type Estado =
    | { tipo: 'loja'; anual: boolean; renova: boolean; ate: string | null; loja: string }
    | { tipo: 'externa'; ate: string | null }
    | { tipo: 'sem' };

const ios = Platform.OS === 'ios';
const ONDE_GERENCIAR = ios
    ? 'nos Ajustes da sua conta da App Store'
    : 'no Google Play, em Pagamentos e assinaturas';

const dataBR = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

const Conteudo = styled.View`
    padding: 0 ${theme.spacing.xl}px 40px;
    gap: 18px;
`;

const BotaoVoltar = styled(TouchableOpacity)`
    width: ${theme.touch}px;
    height: ${theme.touch}px;
    margin-left: -10px;
    align-items: center;
    justify-content: center;
`;

const Nome = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 16px;
    color: ${theme.colors.text};
`;

const Preco = styled.Text`
    font-family: ${theme.fonts.displayHeavy};
    font-size: 32px;
    letter-spacing: -0.6px;
    color: ${theme.colors.text};
`;

const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    color: ${theme.colors.textSecondary};
`;

const Valor = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 14px;
    color: ${theme.colors.text};
    text-align: right;
    flex-shrink: 1;
`;

const Inclui = styled.View`
    gap: 10px;
    padding: ${theme.spacing.lg}px;
    border-radius: 16px;
    border-width: 1px;
    border-style: dashed;
    border-color: ${theme.colors.border};
`;

const ItemInclui = styled.Text`
    flex: 1;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 20px;
    color: ${theme.colors.text};
`;

const BotaoContorno = styled(TouchableOpacity)`
    min-height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    border-width: 1px;
    border-color: ${theme.colors.border};
    background-color: ${theme.colors.surface};
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
`;

const BotaoContornoTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.text};
`;

const BotaoPrimario = styled(TouchableOpacity)`
    min-height: 52px;
    border-radius: ${theme.borderRadius.md}px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
`;

const BotaoPrimarioTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 16px;
    color: ${theme.colors.onPrimary};
`;

const BotaoLink = styled(TouchableOpacity)`
    align-self: center;
    min-height: ${theme.touch}px;
    padding: 0 12px;
    justify-content: center;
`;

const BotaoLinkTexto = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    color: ${theme.colors.primary};
`;

const Legal = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 12px;
    line-height: 18px;
    color: ${theme.colors.textSecondary};
`;

const LinkLegal = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 13px;
    color: ${theme.colors.primary};
`;

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <Apoio>{rotulo}</Apoio>
            <Valor>{valor}</Valor>
        </View>
    );
}

export default function AssinaturaScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [estado, setEstado] = useState<Estado | null>(null);
    const [planos, setPlanos] = useState<Planos>({ mensal: null, anual: null });
    const [restaurando, setRestaurando] = useState(false);
    const [msgRestaurar, setMsgRestaurar] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            const gymId = await getCurrentGymId();
            const [{ data: perfil }, { data: linha }, cliente, p] = await Promise.all([
                supabase.from('gym_profiles').select('collections_enabled').eq('id', gymId).maybeSingle(),
                supabase.from('subscriptions')
                    .select('kind, status, current_period_end, auto_renew, store, store_product_id')
                    .eq('gym_id', gymId).maybeSingle(),
                lerCliente(),
                lerPlanos(),
            ]);
            setPlanos(p);
            const sub = linha as Linha | null;
            const ent = entitlementAtivo(cliente);

            // A loja diz que está ativa e o banco não: sincroniza agora, para a
            // aba Cobranças abrir sem esperar o webhook.
            if (ent && !perfil?.collections_enabled) sincronizarNoServidor();

            // A loja primeiro: o RevenueCat sabe da compra antes do webhook
            // chegar ao banco, e é ele que diz se a renovação está ligada.
            if (ent || (sub?.kind === 'store' && sub.status === 'active')) {
                // No Android o plano (mensal/anual-1) vem separado do produto.
                const produto = ent
                    ? [ent.productIdentifier, ent.productPlanIdentifier].filter(Boolean).join(':')
                    : sub?.store_product_id ?? '';
                const daApple = ent ? ent.store === 'APP_STORE' : sub?.store === 'app_store';
                setEstado({
                    tipo: 'loja',
                    anual: /anual|annual|year/i.test(produto),
                    renova: ent ? ent.willRenew : !!sub?.auto_renew,
                    ate: ent?.expirationDate ?? sub?.current_period_end ?? null,
                    loja: daApple ? 'App Store' : 'Google Play',
                });
            } else if (perfil?.collections_enabled) {
                // Cartão ou Pix pelo site, Pix na PJ (registrado à mão) ou
                // cortesia: sem data quando é cortesia.
                const ate = sub && sub.kind !== 'store' && sub.status === 'active' ? sub.current_period_end : null;
                setEstado({ tipo: 'externa', ate });
            } else {
                setEstado({ tipo: 'sem' });
            }
        } catch (e) {
            console.log('Erro ao carregar a assinatura:', e);
            setEstado({ tipo: 'sem' });
        }
    }, []);

    useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

    const restaurarCompras = async () => {
        setMsgRestaurar(null);
        setRestaurando(true);
        const r = await restaurar();
        setRestaurando(false);
        if (r.status === 'ativo') {
            setMsgRestaurar('Compras verificadas. Sua assinatura está ativa.');
            await sincronizarNoServidor();
            carregar();
        } else if (r.status === 'nada-a-restaurar') {
            setMsgRestaurar('Nenhuma assinatura encontrada nesta conta.');
        } else {
            appAlert('Não foi possível restaurar', 'Verifique sua conexão e tente de novo.');
        }
    };

    const gerenciar = async () => {
        if (!(await gerenciarAssinatura())) {
            appAlert('Gerenciar assinatura', `Abra ${ONDE_GERENCIAR}.`);
        }
    };

    const abrir = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

    const voltar = () => (router.canGoBack() ? router.back() : router.replace('/(drawer)/(tabs)/more'));

    const precoLoja = (anual: boolean) => {
        const pacote = anual ? planos.anual : planos.mensal;
        return pacote ? `${pacote.product.priceString}/${anual ? 'ano' : 'mês'}` : null;
    };

    const rodapeLegal = (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <LinkLegal onPress={() => abrir(URL_TERMOS)} accessibilityRole="link">Termos de Uso</LinkLegal>
            <Apoio>·</Apoio>
            <LinkLegal onPress={() => abrir(URL_PRIVACIDADE)} accessibilityRole="link">Política de Privacidade</LinkLegal>
        </View>
    );

    const restaurarBotao = (
        <>
            <BotaoLink onPress={restaurarCompras} disabled={restaurando} accessibilityRole="button">
                {restaurando
                    ? <ActivityIndicator color={theme.colors.primary} />
                    : <BotaoLinkTexto>Restaurar compras</BotaoLinkTexto>}
            </BotaoLink>
            {msgRestaurar ? (
                <Apoio style={{ textAlign: 'center', fontSize: 13, marginTop: -10 }} accessibilityLiveRegion="polite">
                    {msgRestaurar}
                </Apoio>
            ) : null}
        </>
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={{ paddingTop: insets.top + 8 }}>
            <Conteudo>
                <View style={{ flexDirection: 'row' }}>
                    <BotaoVoltar onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar">
                        <Icon name="back" size={22} color={theme.colors.text} strokeWidth={2.2} />
                    </BotaoVoltar>
                </View>

                <PageTitle accessibilityRole="header">Assinatura</PageTitle>

                {!estado && <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 24 }} />}

                {estado?.tipo === 'loja' && (
                    <>
                        <Section style={{ padding: theme.spacing.xl, gap: 16 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Nome>Cobranças</Nome>
                                <Pill tone={estado.renova ? 'ok' : 'soon'} label={estado.renova ? 'Ativa' : 'Não renova'} />
                            </View>
                            <View style={{ gap: 4 }}>
                                {precoLoja(estado.anual) ? <Preco>{precoLoja(estado.anual)}</Preco> : null}
                                <Apoio>Plano {estado.anual ? 'anual' : 'mensal'}</Apoio>
                            </View>
                            <View style={{ gap: 10 }}>
                                {estado.ate ? (
                                    <LinhaInfo rotulo={estado.renova ? 'Renova em' : 'Ativa até'} valor={dataBR(estado.ate)!} />
                                ) : null}
                                <LinhaInfo rotulo="Assinada pela" valor={estado.loja} />
                            </View>
                        </Section>

                        <Inclui>
                            <SectionLabel>Inclui</SectionLabel>
                            {['Fila de cobrança com Pix copia e cola', 'Registro de quem já foi cobrado', 'Resultado: quantos pagaram e quanto voltou'].map(t => (
                                <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ marginTop: 2 }}>
                                        <Icon name="check" size={16} color={theme.colors.primary} strokeWidth={2.4} />
                                    </View>
                                    <ItemInclui>{t}</ItemInclui>
                                </View>
                            ))}
                        </Inclui>

                        <View style={{ gap: 10 }}>
                            <BotaoContorno onPress={gerenciar} accessibilityRole="button">
                                <BotaoContornoTexto>Gerenciar assinatura</BotaoContornoTexto>
                                <Icon name="external" size={16} color={theme.colors.text} />
                            </BotaoContorno>
                            {restaurarBotao}
                        </View>

                        <Legal>
                            A assinatura renova automaticamente pelo mesmo período e valor, a menos que a
                            renovação seja desativada pelo menos 24 horas antes do fim do período atual. Para
                            trocar de plano ou cancelar, toque em Gerenciar assinatura ou vá {ONDE_GERENCIAR}.
                            O cancelamento vale ao fim do período já pago.
                        </Legal>
                        {rodapeLegal}
                    </>
                )}

                {estado?.tipo === 'externa' && (
                    <Section style={{ padding: theme.spacing.xl, gap: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Nome>Cobranças</Nome>
                            <Pill tone="ok" label="Ativa" />
                        </View>
                        {estado.ate ? <LinhaInfo rotulo="Válida até" valor={dataBR(estado.ate)!} /> : null}
                    </Section>
                )}

                {estado?.tipo === 'sem' && (
                    <>
                        <Section style={{ padding: theme.spacing.xl, gap: 14 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Nome>Cobranças</Nome>
                                <Pill tone="neutral" label="Sem assinatura" />
                            </View>
                            <BodyText>
                                Assine para liberar a fila de cobrança, o registro de quem já foi cobrado e o
                                resultado do mês.
                            </BodyText>
                            {planos.mensal && planos.anual ? (
                                <Apoio style={{ color: theme.colors.textStrong }}>
                                    Mensal {planos.mensal.product.priceString}/mês ou anual {planos.anual.product.priceString}/ano.
                                </Apoio>
                            ) : null}
                            <BotaoPrimario onPress={() => router.push('/collections')} accessibilityRole="button">
                                <BotaoPrimarioTexto>Ver planos</BotaoPrimarioTexto>
                            </BotaoPrimario>
                        </Section>
                        {restaurarBotao}
                        {rodapeLegal}
                    </>
                )}
            </Conteudo>
        </ScrollView>
    );
}
