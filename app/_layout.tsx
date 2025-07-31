import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native'; // Import Text and TouchableOpacity
import 'react-native-reanimated';
import { supabase } from '../utils/supabaseClient';

import { useColorScheme } from '@/hooks/useColorScheme';
import { CustomHeader } from '@/components/ui/CustomHeader';

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
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen 
          name="create-room" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Create New Room" /> 
          }} 
        />
        <Stack.Screen 
          name="edit-client" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Edit Client" /> 
          }} 
        />
        <Stack.Screen 
          name="client/[id]" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Client Details" /> 
          }} 
        />
        <Stack.Screen 
          name="client/generate-quotation" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Generate Quotation" /> 
          }} 
        />
        <Stack.Screen 
          name="quotation/[id]" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Quotation Details" /> 
          }} 
        />
        <Stack.Screen 
          name="room/[id]" 
          options={{ 
            headerShown: true, 
            header: () => <CustomHeader title="Room Details" /> 
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
