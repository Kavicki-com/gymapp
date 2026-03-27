import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DeepLinkHandler />
          <NotificationHandler />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="confirm-email" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="password-changed" options={{ headerShown: false }} />
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="manage-client" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="manage-plan" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="manage-equipment" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="manage-employee" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="client-details" options={{ headerShown: false }} />
            <Stack.Screen name="employee-details" options={{ headerShown: false }} />
            <Stack.Screen name="equipment-details" options={{ headerShown: false }} />
          </Stack>
        </GestureHandlerRootView>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Handles incoming notifications and user taps in foreground and background
function NotificationHandler() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    // Fired when a notification is received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notification] Received in foreground:', notification.request.content.title);
    });

    // Fired when the user taps a notification (background or closed app)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      console.log('[Notification] User tapped:', data?.type);

      if (data?.type === 'maintenance' && data?.equipmentId) {
        router.push({ pathname: '/equipment-details', params: { id: data.equipmentId } });
      } else if (data?.type === 'client_payment' && data?.clientId) {
        router.push({ pathname: '/client-details', params: { id: data.clientId } });
      } else if (data?.type === 'employee_payment' && data?.employeeId) {
        router.push({ pathname: '/employee-details', params: { id: data.employeeId } });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return null;
}

// Component to handle deep links and auth state changes at root level
function DeepLinkHandler() {
  const router = useRouter();
  const segments = useSegments();
  const { isPasswordRecovery, setRecoveryMode } = useAuth();
  const hasHandledRecovery = useRef(false);
  const lastProcessedUrl = useRef<string | null>(null);

  useEffect(() => {
    // Handle PASSWORD_RECOVERY from AuthContext
    if (isPasswordRecovery && !hasHandledRecovery.current) {
      console.log('DeepLinkHandler: PASSWORD_RECOVERY detected, navigating to reset-password');
      hasHandledRecovery.current = true;
      router.replace('/reset-password');
    }
  }, [isPasswordRecovery]);

  useEffect(() => {
    // Handle deep links with recovery codes or tokens
    const handleUrl = async (url: string) => {
      // Prevent processing the same URL twice in a short period
      if (lastProcessedUrl.current === url) {
        console.log('DeepLinkHandler: URL already processed, skipping:', url);
        return;
      }
      
      console.log('DeepLinkHandler: Processing URL:', url);
      lastProcessedUrl.current = url;

      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      const path = parsed.path;

      console.log('DeepLinkHandler: Parsed path:', path, 'code:', code ? 'yes' : 'no');

      // Also check for hash fragment (implicit flow with tokens)
      let hashParams: Record<string, string> = {};
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hashString = url.substring(hashIndex + 1);
        const searchParams = new URLSearchParams(hashString);
        searchParams.forEach((value, key) => {
          hashParams[key] = value;
        });
        console.log('DeepLinkHandler: Hash params found:', Object.keys(hashParams).join(', '));
      }

      const accessToken = hashParams.access_token;
      const refreshToken = hashParams.refresh_token;
      const type = hashParams.type;

      console.log('DeepLinkHandler: Found metadata - type:', type, 'token:', accessToken ? 'present' : 'absent');

      // Handle implicit flow (tokens in hash)
      if (accessToken && refreshToken) {
        console.log('DeepLinkHandler: Found tokens in hash, setting session...');
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('DeepLinkHandler: setSession ERROR:', error.message);
          } else {
            console.log('DeepLinkHandler: setSession SUCCESS');
            // Force orientation to recovery if type is recovery
            if (type === 'recovery' || path?.includes('reset-password')) {
              console.log('DeepLinkHandler: Recovery flow detected - setting recovery mode');
              setRecoveryMode(true);
              console.log('DeepLinkHandler: Navigating to reset-password');
              router.replace('/reset-password');
            } else if (type === 'signup' || path?.includes('confirm-email')) {
              console.log('DeepLinkHandler: Signup confirmation flow, navigating to confirm-email');
              router.replace('/confirm-email');
            }
          }
        } catch (e) {
          console.error('DeepLinkHandler: Exception during setSession:', e);
        }
        return;
      }

      // Handle PKCE flow (code in query params)
      if (code) {
        console.log('DeepLinkHandler: Found recovery code, exchanging...');
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('DeepLinkHandler: Code exchange error:', error);
          } else {
            console.log('DeepLinkHandler: Code exchange successful');
            // The onAuthStateChange in AuthContext will set isPasswordRecovery
            // which will trigger navigation above
          }
        } catch (e) {
          console.error('DeepLinkHandler: Exception during code exchange:', e);
        }
        return;
      }

      console.log('DeepLinkHandler: No tokens or code in URL, ignoring');
    };

    // Listen for incoming URLs
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('DeepLinkHandler: Incoming URL event:', event.url);
      handleUrl(event.url);
    });

    // Handle initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('DeepLinkHandler: Initial URL detected:', url);
        handleUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

