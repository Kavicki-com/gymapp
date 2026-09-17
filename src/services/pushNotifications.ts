import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getNotifications } from './notificationsModule';
import { supabase } from './supabase';

/**
 * Requests permission and registers the device for push notifications.
 * Saves the token to Supabase for the authenticated gym owner.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    const Notifications = getNotifications();
    if (!Notifications) {
        console.log('[PushNotifications] Skipping registration: módulo indisponível');
        return null;
    }

    if (!Device.isDevice) {
        console.log('[PushNotifications] Skipping registration: not a physical device');
        return null;
    }

    // Check/request permissions
    let { granted } = await Notifications.getPermissionsAsync();

    if (!granted) {
        granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) {
        console.log('[PushNotifications] Permission denied');
        return null;
    }

    // Required for Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    // Get Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f6b7a86d-4445-4d65-ae39-2d43f4aa7657',
    });
    const token = tokenData.data;
    console.log('[PushNotifications] Token:', token);

    await saveTokenToSupabase(token);
    return token;
}

/**
 * Saves the push token to Supabase, upserted per token to avoid duplicates.
 */
async function saveTokenToSupabase(token: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('gym_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return;

        const { error } = await supabase.from('push_tokens').upsert(
            {
                user_id: user.id,
                gym_id: profile.id,
                token,
                platform: Platform.OS,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'token' }
        );

        if (error) {
            console.error('[PushNotifications] Error saving token:', error.message);
        } else {
            console.log('[PushNotifications] Token saved successfully');
        }
    } catch (err) {
        console.error('[PushNotifications] Unexpected error:', err);
    }
}

/**
 * Removes the current device's push token from Supabase on logout.
 */
export async function unregisterPushToken() {
    try {
        const Notifications = getNotifications();
        if (!Notifications) return;
        if (!Device.isDevice) return;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'gymapp',
        });
        await supabase.from('push_tokens').delete().eq('token', tokenData.data);
        console.log('[PushNotifications] Token removed');
    } catch (err) {
        console.error('[PushNotifications] Error removing token:', err);
    }
}
