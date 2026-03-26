import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Requests permission and registers the device for push notifications.
 * Saves the token to Supabase for the authenticated gym owner.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('[PushNotifications] Skipping registration: not a physical device');
        return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
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
