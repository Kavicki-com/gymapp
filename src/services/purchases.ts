import { NativeModules } from 'react-native';
import Purchases, {
    LOG_LEVEL,
    PACKAGE_TYPE,
    PURCHASES_ERROR_CODE,
    type CustomerInfo,
    type PurchasesPackage,
} from 'react-native-purchases';

import { RC_API_KEY, RC_ENTITLEMENT } from '../config/revenuecat';

/**
 * Assinatura da aba Cobranças pela loja, via RevenueCat.
 *
 * Portado de churrapp/src/core/purchases, que vende um desbloqueio único sem
 * backend. Aqui é assinatura (mensal e anual) e o que libera o acesso de
 * verdade é o banco: o webhook revenuecat-webhook grava em `subscriptions` e
 * o trigger liga gym_profiles.collections_enabled. Por isso o usuário do
 * RevenueCat é o mesmo do Supabase (Purchases.logIn com auth.users.id) — é
 * assim que o webhook acha a academia.
 *
 * Sem o módulo nativo (Expo Go) ou sem chave, tudo vira no-op e a tela de
 * compra mostra "indisponível", em vez de derrubar o app.
 */

export type ResultadoCompra =
    | { status: 'ativo' }
    | { status: 'cancelado' }
    /** Google Play com pagamento lento (boleto): ativa quando a loja confirmar. */
    | { status: 'pendente' }
    | { status: 'indisponivel' }
    | { status: 'nada-a-restaurar' }
    | { status: 'erro'; detalhe?: string };

export type Planos = { mensal: PurchasesPackage | null; anual: PurchasesPackage | null };

let configurado = false;
let usuarioAtual: string | null = null;

export const comprasDisponiveis = () => NativeModules.RNPurchases != null && !!RC_API_KEY;

/** Configura o SDK já com o usuário do Supabase, ou troca de usuário. */
export async function identificarCompras(userId: string): Promise<void> {
    if (!comprasDisponiveis()) return;
    try {
        if (!configurado) {
            await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
            Purchases.configure({ apiKey: RC_API_KEY, appUserID: userId });
            configurado = true;
        } else if (usuarioAtual !== userId) {
            await Purchases.logIn(userId);
        }
        usuarioAtual = userId;
    } catch (e) {
        console.warn('[compras] identificar', e);
    }
}

/** No sair: a próxima conta no mesmo aparelho não herda a assinatura desta. */
export async function esquecerUsuarioCompras(): Promise<void> {
    if (!configurado || !usuarioAtual) return;
    try {
        await Purchases.logOut();
    } catch {
        // logOut lança se o usuário já for anônimo; não há o que desfazer.
    }
    usuarioAtual = null;
}

const pronto = () => configurado && !!usuarioAtual;

export const entitlementAtivo = (info: CustomerInfo | null | undefined) =>
    info?.entitlements.active[RC_ENTITLEMENT] ?? null;

export async function lerCliente(): Promise<CustomerInfo | null> {
    if (!pronto()) return null;
    try {
        return await Purchases.getCustomerInfo();
    } catch {
        return null;
    }
}

/** Mensal e anual da offering atual (configurada no painel do RevenueCat). */
export async function lerPlanos(): Promise<Planos> {
    const vazio = { mensal: null, anual: null };
    if (!pronto()) return vazio;
    try {
        const offering = (await Purchases.getOfferings()).current;
        if (!offering) return vazio;
        return {
            mensal: offering.monthly ?? offering.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null,
            anual: offering.annual ?? offering.availablePackages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null,
        };
    } catch {
        return vazio;
    }
}

const detalhe = (e: unknown) =>
    e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : undefined;

export async function comprar(pacote: PurchasesPackage): Promise<ResultadoCompra> {
    if (!pronto()) return { status: 'indisponivel' };
    try {
        const { customerInfo } = await Purchases.purchasePackage(pacote);
        return entitlementAtivo(customerInfo) ? { status: 'ativo' } : { status: 'erro', detalhe: 'entitlement-inativo' };
    } catch (e: any) {
        if (e?.userCancelled) return { status: 'cancelado' };
        if (e?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { status: 'pendente' };
        return { status: 'erro', detalhe: detalhe(e) };
    }
}

export async function restaurar(): Promise<ResultadoCompra> {
    if (!pronto()) return { status: 'indisponivel' };
    try {
        const info = await Purchases.restorePurchases();
        return entitlementAtivo(info) ? { status: 'ativo' } : { status: 'nada-a-restaurar' };
    } catch (e) {
        return { status: 'erro', detalhe: detalhe(e) };
    }
}

/** Abre a tela de assinaturas da própria loja (trocar de plano, cancelar). */
export async function gerenciarAssinatura(): Promise<boolean> {
    if (!pronto()) return false;
    try {
        await Purchases.showManageSubscriptions();
        return true;
    } catch {
        return false;
    }
}
