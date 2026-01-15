import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type AuthContextType = {
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    isPasswordRecovery: boolean;
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    isAdmin: false,
    isPasswordRecovery: false,
    signIn: async () => ({ error: null }),
    signOut: async () => { },
    clearPasswordRecovery: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);

            // Handle PASSWORD_RECOVERY event specifically
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }

            // Clear password recovery flag on sign out
            if (event === 'SIGNED_OUT') {
                setIsPasswordRecovery(false);
            }

            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Simple admin check (mock for now, or check email)
    useEffect(() => {
        if (session?.user?.email === 'admin@gym.com') { // Replace with real role logic if needed
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
    }, [session]);

    const signIn = async (email: string, pass: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        return { error };
    };

    const signOut = async () => {
        setIsPasswordRecovery(false);
        await supabase.auth.signOut();
        setSession(null); // Limpar sessão explicitamente
    };

    const clearPasswordRecovery = () => {
        setIsPasswordRecovery(false);
    };

    return (
        <AuthContext.Provider value={{ session, loading, isAdmin, isPasswordRecovery, signIn, signOut, clearPasswordRecovery }}>
            {children}
        </AuthContext.Provider>
    );
}

