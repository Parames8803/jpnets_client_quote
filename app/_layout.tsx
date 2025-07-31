import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native'; // Import Text and TouchableOpacity
import 'react-native-reanimated';
import { supabase } from '../utils/supabaseClient';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {session && session.user ? (
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: true, // Show header for authenticated users
              headerTitle: 'Home', // Default title, can be overridden by nested screens
              headerLeft: () => null, // Remove back button
              headerRight: () => (
                <TouchableOpacity onPress={signOut} style={{ marginRight: 15 }}>
                  <Text style={{ color: colorScheme === 'dark' ? 'white' : 'black', fontSize: 16 }}>Logout</Text>
                </TouchableOpacity>
              ),
            }}
          />
        ) : (
          <Stack.Screen name="auth/login" options={{ headerShown: false, headerLeft: () => null }} />
        )}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
