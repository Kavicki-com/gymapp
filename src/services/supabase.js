import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';

const supabaseUrl = 'https://mvmmxkkllufoqtnyiqwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bW14a2tsbHVmb3F0bnlpcXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzYwMTQsImV4cCI6MjA4MzkxMjAxNH0.4l51J6SJCNezmx5NS8-OdW893vic4-yOHYItx_h1rHo';

const SupabaseStorage = {
    getItem: (key) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve(null);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return Promise.resolve();
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: SupabaseStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Enable deep link detection for email confirmation
    },
});
