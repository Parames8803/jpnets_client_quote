import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { supabase } from '../utils/supabaseClient';

import { CustomHeader } from '@/components/ui/CustomHeader';
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {session && session.user && session.user.user_metadata && session.user.user_metadata.role == "admin" ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : session && session.user && session.user.user_metadata && session.user.user_metadata.role == "client" ? (
          <Stack.Screen name="(clients)" options={{ headerShown: false }} />
        ) : session && session.user && session.user.user_metadata && session.user.user_metadata.role == "worker" ? (
          <Stack.Screen name="(workers)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )
        }
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen 
          name="create-room" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Room" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="edit-client" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Client" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="create-client" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Client" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="client/[id]" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Client" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="client/generate-quotation" 
          options={{ 
            header: (props) => <CustomHeader title="Generate Quotation" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="quotation/[id]" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Quotation" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="quotation/preview" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Quotation" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="room/[id]" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Room" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="room/edit/[id]" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Room" {...props} showLogoutButton={true} />,
          }} 
        />
        <Stack.Screen 
          name="room/add-product/[id]" 
          options={{ 
            header: (props) => <CustomHeader title="Manage Room" {...props} showLogoutButton={true} />,
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
