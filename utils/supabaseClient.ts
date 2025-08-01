// utils/supabaseClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage unconditionally
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native'; // Import Platform
import 'react-native-url-polyfill/auto'; // Must be at the very top

const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;

if (Platform.OS === 'web' || Platform.OS === 'android' || Platform.OS === 'ios') {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storage, // Use conditional storage
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };

