import { Platform } from 'react-native';

/**
 * RevenueCat do GymApp (assinatura da aba Cobranças pela loja).
 *
 * As chaves públicas do SDK (appl_/goog_) foram feitas para ir no app — não
 * dão acesso a nada sozinhas. A chave secreta (sk_) mora só no Supabase, no
 * secret REVENUECAT_API_KEY do revenuecat-webhook.
 */
export const RC_API_KEY = Platform.select({
    ios: 'appl_pwHvwPlLDdUPtUpvtrxQjvbLEeM',
    android: 'goog_NAnVfLkHcSbUOSdGDAugXRSybAo',
    default: '',
});

/** Mesmo identificador que o webhook procura (REVENUECAT_ENTITLEMENT). */
export const RC_ENTITLEMENT = 'gymapp_cobrancas';

/** Páginas que a Apple exige acessíveis a partir da tela de assinatura. */
export const URL_TERMOS = 'https://gymapp.kavicki.com/terms.html';
export const URL_PRIVACIDADE = 'https://gymapp.kavicki.com/privacy.html';
