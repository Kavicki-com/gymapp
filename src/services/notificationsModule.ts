// `import type` é apagado na compilação: não vira require, então é seguro
// mesmo em ambiente onde o módulo não pode ser carregado.
import type * as NotificationsModule from 'expo-notifications';

type Notifications = typeof NotificationsModule;

let cached: Notifications | null | undefined;

/**
 * Carrega `expo-notifications` sob demanda, devolvendo null quando o módulo
 * não pode ser carregado neste ambiente.
 *
 * Por que isso existe: a partir do SDK 55, o Expo Go no Android **lança** ao
 * carregar o módulo, em vez de só avisar como fazia até o SDK 54. Com o import
 * no topo de pushNotifications.ts, a exceção derrubava a cadeia inteira
 * (pushNotifications → AuthContext → CustomDrawerContent → (drawer)/_layout),
 * e o expo-router acabava recebendo `undefined` no lugar dos módulos de rota —
 * daí "Route is missing the required default export" em arquivos que têm
 * default export, e o fatal "Cannot read property 'ErrorBoundary' of
 * undefined".
 *
 * Deliberadamente não detecta o ambiente: `ExecutionEnvironment.StoreClient`
 * não separa Expo Go de development build, e o dev build suporta push. Tentar
 * carregar e tratar a falha acerta nos três casos — Expo Go desliga, dev build
 * e produção seguem com push.
 */
export function getNotifications(): Notifications | null {
    if (cached !== undefined) return cached;

    try {
        const mod = require('expo-notifications') as Notifications;

        // Como aparecem as notificações com o app em primeiro plano.
        // Ficava no topo do módulo; agora roda uma vez, na primeira carga.
        mod.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        cached = mod;
    } catch (err) {
        console.warn(
            '[Notifications] módulo indisponível neste ambiente — push desativado. ' +
            'No Expo Go isto é esperado: push remoto exige development build.',
            err
        );
        cached = null;
    }

    return cached;
}
