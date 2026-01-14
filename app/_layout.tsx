import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AuthProvider } from '../src/contexts/AuthContext';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(drawer)',
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
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="confirm-email" options={{ headerShown: false }} />
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
