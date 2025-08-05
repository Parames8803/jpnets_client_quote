// utils/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;

// Check if the environment is a web browser before accessing 'window'
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Use window.localStorage directly for web
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else if (Platform.OS === 'android' || Platform.OS === 'ios') {
  // Use a dynamic import to avoid bundling AsyncStorage on web
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage, // Use AsyncStorage for native platforms
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else {
  // Fallback for other environments (e.g., server-side rendering, Node.js)
  // You might want to handle this case differently, or throw an error.
  console.warn("Supabase client not initialized for this platform. Using a non-persistent client.");
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

