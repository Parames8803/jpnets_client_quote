import SplashScreen from '@/components/SplashScreen'; // Import your custom SplashScreen
import { CustomHeader } from '@/components/ui/CustomHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router'; // Removed Expo's SplashScreen
import * as ScreenCapture from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react'; // Added useCallback
import 'react-native-reanimated';
import { supabase } from '../utils/supabaseClient';

// No longer need to preventAutoHideAsync from Expo's SplashScreen

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [session, setSession] = useState<any>(null);
  const [appReady, setAppReady] = useState(false); // State to manage custom splash screen visibility
  const router = useRouter();

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const onLottieAnimationFinish = useCallback(() => {
    setAppReady(true);
  }, []);

  const handleNavigation = useCallback((currentSession: any) => {
    if (currentSession) {
      const userRole = currentSession.user?.user_metadata?.role; // Assuming role is in user_metadata
      if (userRole === 'admin') {
        router.replace('/(tabs)'); // Navigate to admin dashboard
      } else if (userRole === 'client') {
        router.replace('/(clients)'); // Navigate to client dashboard
      } else if (userRole === 'worker') {
        router.replace('/(workers)'); // Navigate to client dashboard
      } else {
        // Fallback for other roles or if role is not defined
        router.replace('/landing'); 
      }
    } else {
      router.replace('/(auth)/login'); // No session, go to login
    }
  }, [router]);

  useEffect(() => {
    if (loaded) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (appReady) {
          handleNavigation(session);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (appReady) {
          handleNavigation(session);
        }
      });

      return () => {
        authListener.subscription?.unsubscribe();
      };
    }
  }, [loaded, appReady, handleNavigation]); // Depend on appReady and handleNavigation

  if (!appReady || !loaded) { // Show custom splash screen until app is ready and fonts are loaded
    return <SplashScreen onAnimationFinish={onLottieAnimationFinish} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          header: (props) => <CustomHeader title={props.options.title || '. . .'} {...props} showLogoutButton={true} />,
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
        <Stack.Screen name="gallery" options={{ title: 'Manage Gallery' }} />
        <Stack.Screen name="gallery/[roomType]" options={{ title: 'Manage Gallery' }} />
        <Stack.Screen name="pending-works" options={{ title: 'Pending Works' }} />
        <Stack.Screen name="ongoing-works" options={{ title: 'Ongoing Works' }} />
        <Stack.Screen name="leads" options={{ title: 'Pending Measurements' }} />
        <Stack.Screen name="create-lead" options={{ title: 'Manage Leads' }} />
        <Stack.Screen name="leads/[id]" options={{ title: 'Leads' }} />
        <Stack.Screen name="orders/list" options={{ title: 'Purchased Orders' }} />
        <Stack.Screen name="raw-materials/update-stock" options={{ title: 'Update Stock' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
