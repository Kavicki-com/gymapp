import { supabase } from '@/src/services/supabase';
import { useEffect, useState } from 'react';

/**
 * A aba Cobranças é liberada por academia, à mão, por quem opera o produto.
 * O dono NÃO consegue ligar sozinho — há um trigger no banco impedindo
 * (guard_collections_enabled).
 *
 * `null` enquanto não se sabe: serve para não piscar a tela travada antes da
 * resposta chegar.
 */
export function useCollectionsEnabled(): boolean | null {
    const [habilitado, setHabilitado] = useState<boolean | null>(null);

    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { if (vivo) setHabilitado(false); return; }
                const { data } = await supabase
                    .from('gym_profiles')
                    .select('collections_enabled')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (vivo) setHabilitado(!!data?.collections_enabled);
            } catch {
                if (vivo) setHabilitado(false);
            }
        })();
        return () => { vivo = false; };
    }, []);

    return habilitado;
}
