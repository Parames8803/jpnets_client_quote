import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../utils/supabaseClient';
import { Session } from '@supabase/supabase-js';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

  const validateFields = () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Email and password cannot be empty.');
      return false;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  async function signUpWithEmail() {
    if (!validateFields()) return;

    setLoading(true);
    let originalSession: Session | null = null;

    try {
      // Get current session before creating new user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting current session:", sessionError);
        Alert.alert('Error', 'Could not retrieve current session.');
        setLoading(false);
        return;
      }
      originalSession = session;

      // Sign up the new user (this will automatically sign them in)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role: 'admin', // Set default role to "admin"
          },
        },
      });

      if (signUpError) {
        Alert.alert('Error', signUpError.message);
        setLoading(false);
        return;
      }

      // If a new user was created and signed in, sign them out
      if (signUpData.user) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error("Error signing out new user:", signOutError);
          Alert.alert('Sign Out Error', 'Failed to sign out newly created user.');
        }
      }

      // Restore the original session
      if (originalSession) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        });

        if (setSessionError) {
          console.error("Error restoring session:", setSessionError);
          Alert.alert('Session Restore Error', 'Failed to restore original user session. Please re-login.');
          router.replace('/(auth)/login');
          return;
        }

        // Verify the restored session
        const { data: { user: restoredUser }, error: getRestoredUserError } = await supabase.auth.getUser();
        if (getRestoredUserError || !restoredUser || restoredUser.id !== originalSession.user.id) {
          console.error("Session not restored to original user:", restoredUser);
          Alert.alert('Session Verification Error', 'Original user session could not be verified. Please re-login.');
          router.replace('/(auth)/login');
          return;
        }

      } else {
        // If there was no original session, just go back to login
        router.replace('/(auth)/login');
        return;
      }

      Alert.alert('Success', 'Admin account created successfully!');
      setEmail('');
      setPassword('');
      router.replace('/(tabs)/settings'); // Navigate back to the Settings page explicitly

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.subtitle}>Join us today and get started</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
                email && styles.inputFilled
              ]}
              onChangeText={setEmail}
              value={email}
              placeholder="Enter your email"
              placeholderTextColor="#A0A0A0"
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused,
                password && styles.inputFilled
              ]}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              placeholder="Create a password (min 6 characters)"
              placeholderTextColor="#A0A0A0"
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Text style={styles.helperText}>Must be at least 6 characters</Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            disabled={loading}
            onPress={signUpWithEmail}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  header: {
    marginTop: height * 0.12,
    marginBottom: 48,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
    fontWeight: '400',
  },
  inputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginLeft: 4,
  },
  registerButton: {
    height: 56,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
