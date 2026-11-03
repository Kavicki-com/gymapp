import { appAlert } from '@/src/components/AppAlert';
import { Icon } from '@/src/components/Icon';
import { BodyText, PageTitle, Section, SectionLabel } from '@/src/components/styled';
import { URL_PRIVACIDADE, URL_TERMOS } from '@/src/config/revenuecat';
import { lerCollectionsEnabled } from '@/src/hooks/useCollectionsEnabled';
import {
    comprar,
    entitlementAtivo,
    lerCliente,
    lerPlanos,
    restaurar,
    sincronizarNoServidor,
    type Planos,
    type ResultadoCompra,
} from '@/src/services/purchases';
import { theme } from '@/src/styles/theme';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import styled from 'styled-components/native';

/**
 * Tela de compra da aba Cobranças (Claude Design, "Cobranças — sem acesso").
 *
 * Desde a 1.3.0 a assinatura é vendida pela loja (RevenueCat), e saiu o
 * "Ativar pelo WhatsApp": com compra dentro do app, a Apple não aceita
 * direcionar para pagamento fora dele. Quem já paga por cartão ou Pix pelo
 * site continua liberado pelo banco e nem chega a ver esta tela.
 *
 * Preço e período vêm da loja (priceString), nunca escritos aqui — a loja
 * converte e arredonda, e o que aparece tem que ser o que vai ser cobrado.
 *
 * Quem libera a aba é o banco: o webhook grava a assinatura e o trigger liga
 * collections_enabled. Depois da compra, esta tela espera essa flag virar
 * antes de chamar `onLiberado`.
 */

const ITENS = [
    'A lista de quem está devendo de verdade, sem cadastro antigo nem aluno que já saiu.',
    'Cobrança em sequência, um aluno por vez, com Pix copia e cola.',
    'O registro de quem você já cobrou e há quantos dias.',
    'Baixa do pagamento na própria tela, em um toque.',
    'Quantos pagaram depois de serem cobrados, e quanto voltou.',
];

/** Quanto esperar o webhook ligar o acesso antes de desistir de esperar. */
const ESPERA_MS = 40_000;

const ios = Platform.OS === 'ios';
const CONTA = ios ? 'sua conta Apple' : 'sua conta Google Play';
const ONDE_GERENCIAR = ios
    ? 'nos Ajustes da sua conta da App Store'
    : 'no Google Play, em Pagamentos e assinaturas';

const Conteudo = styled.View`
    padding: ${theme.spacing.lg}px ${theme.spacing.xl}px 40px;
    gap: 18px;
`;

const IconeCadeado = styled.View`
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background-color: ${theme.colors.primarySoft};
    align-items: center;
    justify-content: center;
`;

const TituloCartao = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 22px;
    color: ${theme.colors.text};
`;

const Item = styled.Text`
    flex: 1;
    font-family: ${theme.fonts.regular};
    font-size: 14px;
    line-height: 20px;
    color: ${theme.colors.text};
`;

const OpcaoPlano = styled(TouchableOpacity)<{ ativo: boolean }>`
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: ${theme.spacing.lg}px;
    border-radius: 16px;
    background-color: ${theme.colors.surface};
    border-width: 2px;
    border-color: ${({ ativo }) => (ativo ? theme.colors.primary : theme.colors.divider)};
`;

const Radio = styled.View<{ ativo: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 10px;
    border-width: 2px;
    border-color: ${({ ativo }) => (ativo ? theme.colors.primary : theme.colors.textMuted)};
    align-items: center;
    justify-content: center;
`;

const RadioPonto = styled.View`
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background-color: ${theme.colors.primary};
`;

const NomePlano = styled.Text`
    font-family: ${theme.fonts.semibold};
    font-size: 16px;
    color: ${theme.colors.text};
`;

const Apoio = styled.Text`
    font-family: ${theme.fonts.regular};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const Preco = styled.Text`
    font-family: ${theme.fonts.display};
    font-size: 18px;
    color: ${theme.colors.text};
`;

const Periodo = styled.Text`
    font-family: ${theme.fonts.medium};
    font-size: 13px;
    color: ${theme.colors.textSecondary};
`;

const BotaoAssinar = styled(TouchableOpacity)`
    min-height: 56px;
    border-radius: 16px;
    background-color: ${theme.colors.primary};
    align-items: center;
    justify-content: center;
`;

const BotaoAssinarTexto = styled.Text`
    font-family: ${theme.fonts.bold};
    font-size: 17px;
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

const Aviso = styled.View<{ tom: 'ok' | 'neutro' }>`
    gap: 10px;
    padding: ${theme.spacing.lg}px;
    border-radius: 16px;
    background-color: ${({ tom }) => (tom === 'ok' ? 'rgba(52,211,153,0.10)' : theme.colors.surface)};
    border-width: 1px;
    border-color: ${({ tom }) => (tom === 'ok' ? 'rgba(52,211,153,0.35)' : theme.colors.border)};
`;

const AvisoTexto = styled.Text<{ tom: 'ok' | 'neutro' }>`
    font-family: ${theme.fonts.semibold};
    font-size: 15px;
    line-height: 21px;
    color: ${({ tom }) => (tom === 'ok' ? theme.colors.success : theme.colors.text)};
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

const porMes = (pacote: PurchasesPackage) => {
    const { price, currencyCode } = pacote.product;
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price / 12);
    } catch {
        return null;
    }
};

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

type Etapa = 'carregando' | 'escolha' | 'indisponivel' | 'comprando' | 'liberando' | 'ativa' | 'pendente';

export function CollectionsLocked({ onLiberado }: { onLiberado?: () => void }) {
    const [planos, setPlanos] = useState<Planos>({ mensal: null, anual: null });
    const [escolhido, setEscolhido] = useState<'mensal' | 'anual'>('anual');
    const [etapa, setEtapa] = useState<Etapa>('carregando');
    const [restaurando, setRestaurando] = useState(false);
    const [msgRestaurar, setMsgRestaurar] = useState<string | null>(null);

    const carregarPlanos = useCallback(async () => {
        setEtapa('carregando');
        // Já assinou pela loja e o banco ainda não sabe (webhook atrasado ou
        // perdido): sincroniza em vez de oferecer a compra de novo.
        if (entitlementAtivo(await lerCliente())) {
            await aguardarLiberacao();
            return;
        }
        const p = await lerPlanos();
        setPlanos(p);
        if (!p.anual && p.mensal) setEscolhido('mensal');
        setEtapa(p.mensal || p.anual ? 'escolha' : 'indisponivel');
    }, []);

    useEffect(() => { carregarPlanos(); }, [carregarPlanos]);

    /** Compra feita na loja: espera o webhook ligar o acesso no banco. */
    async function aguardarLiberacao() {
        setEtapa('liberando');
        // O servidor relê o RevenueCat na hora; o webhook vira só a garantia.
        if (await sincronizarNoServidor()) {
            onLiberado?.();
            return;
        }
        const limite = Date.now() + ESPERA_MS;
        while (Date.now() < limite) {
            if (await lerCollectionsEnabled()) {
                onLiberado?.();
                return;
            }
            await espera(2000);
        }
        // A compra foi feita; só o aviso do servidor atrasou. Não é erro.
        setEtapa('ativa');
    }

    const tratar = async (r: ResultadoCompra, deRestaurar: boolean) => {
        switch (r.status) {
            case 'ativo':
                await aguardarLiberacao();
                return;
            case 'cancelado':
                setEtapa('escolha');
                return;
            case 'pendente':
                setEtapa('pendente');
                return;
            case 'nada-a-restaurar':
                setMsgRestaurar(`Nenhuma assinatura encontrada em ${CONTA}.`);
                return;
            case 'indisponivel':
                setEtapa('indisponivel');
                return;
            default:
                if (!deRestaurar) setEtapa('escolha');
                appAlert(
                    deRestaurar ? 'Não foi possível restaurar' : 'Não foi possível assinar',
                    'Nada foi cobrado. Verifique sua conexão e tente de novo.',
                );
        }
    };

    const assinar = async () => {
        const pacote = planos[escolhido];
        if (!pacote) return;
        setMsgRestaurar(null);
        setEtapa('comprando');
        await tratar(await comprar(pacote), false);
    };

    const restaurarCompras = async () => {
        setMsgRestaurar(null);
        setRestaurando(true);
        try {
            await tratar(await restaurar(), true);
        } finally {
            setRestaurando(false);
        }
    };

    const abrir = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

    const opcao = (chave: 'mensal' | 'anual') => {
        const pacote = planos[chave];
        if (!pacote) return null;
        const ativo = escolhido === chave;
        const equivalente = chave === 'anual' ? porMes(pacote) : null;
        return (
            <OpcaoPlano
                ativo={ativo}
                onPress={() => setEscolhido(chave)}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`${chave === 'anual' ? 'Anual' : 'Mensal'}, ${pacote.product.priceString}`}
            >
                <Radio ativo={ativo}>{ativo ? <RadioPonto /> : null}</Radio>
                <View style={{ flex: 1, gap: 2 }}>
                    <NomePlano>{chave === 'anual' ? 'Anual' : 'Mensal'}</NomePlano>
                    <Apoio>{chave === 'anual'
                        ? (equivalente ? `Equivale a ${equivalente}/mês` : 'Renova todo ano')
                        : 'Renova todo mês'}</Apoio>
                </View>
                <Preco>
                    {pacote.product.priceString}
                    <Periodo>{chave === 'anual' ? '/ano' : '/mês'}</Periodo>
                </Preco>
            </OpcaoPlano>
        );
    };

    const ocupado = etapa === 'comprando' || etapa === 'liberando' || restaurando;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Conteudo>
                <PageTitle accessibilityRole="header">Cobranças</PageTitle>

                <Section style={{ padding: theme.spacing.xl, gap: 16 }}>
                    <IconeCadeado><Icon name="lock" size={24} color={theme.colors.primary} /></IconeCadeado>
                    <View style={{ gap: 6 }}>
                        <TituloCartao>Receba de quem está atrasado</TituloCartao>
                        <BodyText>Assine para liberar a Cobranças na sua academia.</BodyText>
                    </View>
                    <View style={{ gap: 10 }}>
                        {ITENS.map(t => (
                            <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                                <View style={{ marginTop: 1 }}>
                                    <Icon name="check" size={18} color={theme.colors.primary} strokeWidth={2.4} />
                                </View>
                                <Item>{t}</Item>
                            </View>
                        ))}
                    </View>
                </Section>

                {etapa === 'carregando' && (
                    <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 24 }} />
                )}

                {etapa === 'indisponivel' && (
                    <Aviso tom="neutro">
                        <AvisoTexto tom="neutro">A assinatura não está disponível agora.</AvisoTexto>
                        <Apoio>Verifique sua conexão e tente de novo em instantes.</Apoio>
                        <BotaoLink onPress={carregarPlanos} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}>
                            <BotaoLinkTexto>Tentar de novo</BotaoLinkTexto>
                        </BotaoLink>
                    </Aviso>
                )}

                {(etapa === 'escolha' || etapa === 'comprando') && (
                    <>
                        <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Escolha o plano">
                            <SectionLabel style={{ marginBottom: 2 }}>Escolha o plano</SectionLabel>
                            {opcao('mensal')}
                            {opcao('anual')}
                        </View>
                        <BotaoAssinar onPress={assinar} disabled={ocupado} accessibilityRole="button" style={{ opacity: ocupado ? 0.7 : 1 }}>
                            {etapa === 'comprando'
                                ? <ActivityIndicator color={theme.colors.onPrimary} />
                                : <BotaoAssinarTexto>Assinar</BotaoAssinarTexto>}
                        </BotaoAssinar>
                    </>
                )}

                {etapa === 'liberando' && (
                    <Aviso tom="ok">
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <ActivityIndicator color={theme.colors.success} />
                            <AvisoTexto tom="ok">Assinatura confirmada. Liberando a Cobranças…</AvisoTexto>
                        </View>
                    </Aviso>
                )}

                {etapa === 'ativa' && (
                    <Aviso tom="ok">
                        <AvisoTexto tom="ok">Assinatura ativa. A Cobranças é liberada em instantes.</AvisoTexto>
                        <BotaoLink onPress={() => onLiberado?.()} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}>
                            <BotaoLinkTexto>Atualizar</BotaoLinkTexto>
                        </BotaoLink>
                    </Aviso>
                )}

                {etapa === 'pendente' && (
                    <Aviso tom="neutro">
                        <AvisoTexto tom="neutro">Pagamento em análise pela loja.</AvisoTexto>
                        <Apoio>A Cobranças é liberada assim que ele for confirmado.</Apoio>
                    </Aviso>
                )}

                {etapa !== 'liberando' && etapa !== 'ativa' && (
                    <BotaoLink onPress={restaurarCompras} disabled={ocupado} accessibilityRole="button">
                        {restaurando
                            ? <ActivityIndicator color={theme.colors.primary} />
                            : <BotaoLinkTexto>Restaurar compras</BotaoLinkTexto>}
                    </BotaoLink>
                )}
                {msgRestaurar ? (
                    <Apoio style={{ textAlign: 'center', marginTop: -10 }} accessibilityLiveRegion="polite">{msgRestaurar}</Apoio>
                ) : null}

                <Legal>
                    Assinatura com renovação automática. O valor é cobrado em {CONTA} na confirmação da
                    compra e renova automaticamente pelo mesmo período e valor, a menos que a renovação
                    automática seja desativada pelo menos 24 horas antes do fim do período atual.
                    Gerencie ou cancele {ONDE_GERENCIAR}.
                </Legal>

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                    <LinkLegal onPress={() => abrir(URL_TERMOS)} accessibilityRole="link">Termos de Uso</LinkLegal>
                    <Apoio>·</Apoio>
                    <LinkLegal onPress={() => abrir(URL_PRIVACIDADE)} accessibilityRole="link">Política de Privacidade</LinkLegal>
                </View>
            </Conteudo>
        </ScrollView>
    );
}
