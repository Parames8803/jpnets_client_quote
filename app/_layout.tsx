import { CustomHeader } from '@/components/ui/CustomHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { supabase } from '../utils/supabaseClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Always go to landing page initially
      if (loaded) {
        router.replace('/landing');
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          header: (props) => <CustomHeader title={props.options.title || 'App'} {...props} showLogoutButton={true} />,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(clients)" options={{ headerShown: false }} />
        <Stack.Screen name="(workers)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen name="create-room" options={{ title: 'Manage Room' }} />
        <Stack.Screen name="edit-client" options={{ title: 'Manage Client' }} />
        <Stack.Screen name="create-client" options={{ title: 'Manage Client' }} />
        <Stack.Screen name="client/[id]" options={{ title: 'Manage Client' }} />
        <Stack.Screen name="register" options={{ title: 'Manage Admin' }} />
        <Stack.Screen name="client/generate-quotation" options={{ title: 'Generate Quotation' }} />
        <Stack.Screen name="quotation/[id]" options={{ title: 'Manage Quotation' }} />
        <Stack.Screen name="quotation/preview" options={{ title: 'Manage Quotation' }} />
        <Stack.Screen name="room/[id]" options={{ title: 'Manage Room' }} />
        <Stack.Screen name="room/edit/[id]" options={{ title: 'Manage Room' }} />
        <Stack.Screen name="room/add-product/[id]" options={{ title: 'Manage Room' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
