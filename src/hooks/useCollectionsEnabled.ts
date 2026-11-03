import { supabase } from '@/src/services/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Se a aba Cobranças está liberada para a academia: gym_profiles.
 * collections_enabled, que o banco deriva de cortesia OU assinatura ativa
 * (cartão, Pix ou loja). O dono NÃO consegue ligar sozinho — há um trigger
 * no banco impedindo (guard_collections_enabled).
 *
 * Relê a cada vez que a tela ganha foco: quem assina pela tela de Assinatura
 * e volta para a aba precisa ver a aba liberada sem reabrir o app.
 * `recarregar` devolve o valor lido, para a tela de compra esperar o webhook.
 *
 * `null` enquanto não se sabe: serve para não piscar a tela travada antes da
 * resposta chegar.
 */
export async function lerCollectionsEnabled(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data } = await supabase
            .from('gym_profiles')
            .select('collections_enabled')
            .eq('user_id', user.id)
            .maybeSingle();
        return !!data?.collections_enabled;
    } catch {
        return false;
    }
}

export function useCollectionsEnabled(): [boolean | null, () => Promise<boolean>] {
    const [habilitado, setHabilitado] = useState<boolean | null>(null);

    const recarregar = useCallback(async () => {
        const valor = await lerCollectionsEnabled();
        setHabilitado(valor);
        return valor;
    }, []);

    useFocusEffect(useCallback(() => {
        recarregar();
    }, [recarregar]));

    return [habilitado, recarregar];
}
