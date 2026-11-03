import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// `import type` some na compilação: não vira require.
import type * as StoreReviewModule from 'expo-store-review';

/**
 * Pedido de avaliação na loja, depois de um momento bom: uma cobrança enviada
 * ou um pagamento registrado.
 *
 * Usa o pedido nativo (SKStoreReviewController / Play In-App Review). A loja
 * decide se mostra: a Apple limita a 3 vezes por ano e não mostra para quem
 * já avaliou a versão — não existe como o app saber se a pessoa avaliou, e
 * por isso também nunca há botão "avaliar" que leve a lugar nenhum.
 *
 * Do nosso lado, para não incomodar:
 *  - só depois de MOMENTOS_MINIMOS momentos bons;
 *  - só depois de DIAS_DE_USO desde o primeiro;
 *  - no máximo uma vez a cada INTERVALO_DIAS.
 *
 * O módulo é nativo e carregado sob demanda (como o expo-notifications em
 * notificationsModule): numa build sem ele, tudo vira no-op.
 */

const MOMENTOS_MINIMOS = 3;
const DIAS_DE_USO = 2;
const INTERVALO_DIAS = 120;
const DIA = 86_400_000;

const CHAVE = 'avaliacao:v1';

type Estado = { momentos: number; primeiro: number; ultimoPedido: number | null };

let modulo: typeof StoreReviewModule | null | undefined;
function storeReview() {
    if (modulo !== undefined) return modulo;
    try {
        modulo = require('expo-store-review') as typeof StoreReviewModule;
    } catch {
        modulo = null;
    }
    return modulo;
}

async function ler(): Promise<Estado> {
    try {
        const bruto = await AsyncStorage.getItem(CHAVE);
        if (bruto) return JSON.parse(bruto);
    } catch {
        // Sem histórico: começa do zero.
    }
    return { momentos: 0, primeiro: Date.now(), ultimoPedido: null };
}

/**
 * Depois de abrir outro app (o WhatsApp da cobrança), o nosso só sai da
 * frente um instante depois. Espera essa saída — com limite, caso o outro
 * app não abra — para o pedido não sair no meio da troca e se perder.
 */
const saidaDoApp = (limiteMs: number) =>
    new Promise<void>(resolve => {
        if (AppState.currentState !== 'active') return resolve();
        const fim = setTimeout(() => { sub.remove(); resolve(); }, limiteMs);
        const sub = AppState.addEventListener('change', estado => {
            if (estado !== 'active') {
                clearTimeout(fim);
                sub.remove();
                resolve();
            }
        });
    });

/** Espera o app voltar para a frente. */
const quandoAtivo = () =>
    new Promise<void>(resolve => {
        if (AppState.currentState === 'active') return resolve();
        const sub = AppState.addEventListener('change', estado => {
            if (estado === 'active') {
                sub.remove();
                resolve();
            }
        });
    });

/**
 * Registra um momento bom e, se for a hora, pede a avaliação. Nunca lança:
 * avaliação é bônus e não pode atrapalhar o fluxo que a chamou.
 */
export async function momentoPositivo(opcoes?: { depoisDeAbrirOutroApp?: boolean }): Promise<void> {
    try {
        const estado = await ler();
        estado.momentos += 1;

        const agora = Date.now();
        const hora =
            estado.momentos >= MOMENTOS_MINIMOS &&
            agora - estado.primeiro >= DIAS_DE_USO * DIA &&
            (estado.ultimoPedido === null || agora - estado.ultimoPedido >= INTERVALO_DIAS * DIA);

        const sr = storeReview();
        if (hora && sr && (await sr.hasAction())) {
            estado.ultimoPedido = agora;
            await AsyncStorage.setItem(CHAVE, JSON.stringify(estado));
            if (opcoes?.depoisDeAbrirOutroApp) await saidaDoApp(3000);
            await quandoAtivo();
            // Um respiro para a tela assentar (volta do WhatsApp, diálogo fechando).
            await new Promise(r => setTimeout(r, 1200));
            await sr.requestReview();
            return;
        }
        await AsyncStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
        // Silencioso de propósito.
    }
}
