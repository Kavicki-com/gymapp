import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
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

// Component to handle deep links and auth state changes at root level
function DeepLinkHandler() {
  const router = useRouter();
  const segments = useSegments();
  const { isPasswordRecovery } = useAuth();
  const hasHandledRecovery = useRef(false);

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
      console.log('DeepLinkHandler: Received URL:', url);

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

      console.log('DeepLinkHandler: accessToken:', accessToken ? 'yes' : 'no', 'refreshToken:', refreshToken ? 'yes' : 'no', 'type:', type);

      // Handle implicit flow (tokens in hash)
      if (accessToken && refreshToken) {
        console.log('DeepLinkHandler: Found tokens in hash, setting session...');
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('DeepLinkHandler: Set session error:', error);
          } else {
            console.log('DeepLinkHandler: Session set successfully');
            // Navigate to reset-password if this is a recovery flow
            if (type === 'recovery' || path?.includes('reset-password')) {
              console.log('DeepLinkHandler: Recovery flow, navigating to reset-password');
              router.replace('/reset-password');
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
      // If just a path without tokens/code, ignore it
      // This prevents stale deep links from causing navigation after logout
      console.log('DeepLinkHandler: No tokens or code in URL, ignoring');
    };

    // Listen for incoming URLs (only fires for fresh deep links)
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('DeepLinkHandler: Fresh URL event received');
      handleUrl(event.url);
    });

    // NOTE: We intentionally do NOT use Linking.getInitialURL() here because
    // it returns cached/stale URLs from previous app opens, causing unwanted
    // recovery attempts. We only process fresh URL events.

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

