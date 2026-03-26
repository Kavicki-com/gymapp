import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerForPushNotificationsAsync, unregisterPushToken } from '../services/pushNotifications';
import { supabase } from '../services/supabase';

type AuthContextType = {
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    isPasswordRecovery: boolean;
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    clearPasswordRecovery: () => void;
    setRecoveryMode: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    isAdmin: false,
    isPasswordRecovery: false,
    signIn: async () => ({ error: null }),
    signOut: async () => { },
    clearPasswordRecovery: () => { },
    setRecoveryMode: () => { },
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
            console.log('AuthContext: onAuthStateChange event:', event);
            if (session) {
                console.log('AuthContext: Session user:', session.user.email);
            } else {
                console.log('AuthContext: No session');
            }

            // Handle PASSWORD_RECOVERY event specifically
            if (event === 'PASSWORD_RECOVERY') {
                console.log('AuthContext: PASSWORD_RECOVERY detected - setting flag');
                setIsPasswordRecovery(true);
            }

            // Register push token on sign in
            if (event === 'SIGNED_IN') {
                console.log('AuthContext: SIGNED_IN - registering push token');
                registerForPushNotificationsAsync().catch(console.error);
            }

            // Clear push token and recovery flag on sign out
            if (event === 'SIGNED_OUT') {
                console.log('AuthContext: SIGNED_OUT detected - clearing recovery flag');
                setIsPasswordRecovery(false);
                unregisterPushToken().catch(console.error);
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

    const setRecoveryMode = (value: boolean) => {
        setIsPasswordRecovery(value);
    };

    return (
        <AuthContext.Provider value={{ session, loading, isAdmin, isPasswordRecovery, signIn, signOut, clearPasswordRecovery, setRecoveryMode }}>
            {children}
        </AuthContext.Provider>
    );
}

