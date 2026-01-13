import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://mvmmxkkllufoqtnyiqwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bW14a2tsbHVmb3F0bnlpcXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzYwMTQsImV4cCI6MjA4MzkxMjAxNH0.4l51J6SJCNezmx5NS8-OdW893vic4-yOHYItx_h1rHo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
