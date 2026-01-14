import { supabase } from '../services/supabase';

/**
 * Obtém o gym_id (profile ID) do usuário autenticado atualmente
 * @returns Promise com o gym_id
 * @throws Error se usuário não autenticado ou perfil não encontrado
 */
export async function getCurrentGymId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Usuário não autenticado');
    }

    const { data: profile } = await supabase
        .from('gym_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!profile) {
        throw new Error('Perfil não encontrado');
    }

    return profile.id;
}
