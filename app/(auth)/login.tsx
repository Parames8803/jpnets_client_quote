import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Assuming 'expo-router' and 'supabaseClient' are correctly configured in your project
import { Session } from '@supabase/supabase-js'; // Import Session type
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabaseClient'; // Adjust path if necessary

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // State for custom modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const router = useRouter();

  // Function to display custom modal messages
  const showCustomModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  // Function to hide custom modal
  const hideCustomModal = () => {
    setModalVisible(false);
    setModalTitle('');
    setModalMessage('');
  };

  // Helper function to navigate based on user role
  const navigateBasedOnRole = (session: Session | null) => {
    if (session && session.user && session.user.user_metadata) {
      const userRole = session.user.user_metadata.role;
      if (userRole === 'admin') {
        router.replace('/(tabs)'); // Navigate to admin layout
      } else if (userRole === 'client') {
        router.replace('/(clients)' as any); // Navigate to client layout
      } else if (userRole === 'worker') {
        router.replace('/(workers)' as any); // Navigate to worker layout
      } else {
        // Fallback for unknown roles or if role is missing
        showCustomModal('Navigation Error', 'Unknown user role. Please contact support.');
        router.replace('/(tabs)'); // Default fallback to admin layout
      }
    } else {
      // If session or user metadata is unexpectedly missing, keep on login or show error
      showCustomModal('Session Error', 'User session or role information not found. Please log in again.');
      // Optionally, you might want to redirect to a generic home or keep them on login
    }
  };

  useEffect(() => {
    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // If a session exists, navigate based on the user's role
        navigateBasedOnRole(session);
      }
    });

    // Cleanup the subscription on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]); // Depend on router to ensure it's available for navigation

  // Validates email and password fields
  const validateFields = () => {
    if (!email || !password) {
      showCustomModal('Validation Error', 'Email and password cannot be empty.');
      return false;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      showCustomModal('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    return true;
  };

  // Handles email and password sign-in
  async function signInWithEmail() {
    if (!validateFields()) return; // Perform validation before proceeding

    setLoading(true); // Set loading state to true
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showCustomModal('Error', error.message); // Show error message using custom modal
    } else {
      showCustomModal('Success', 'Welcome back!'); // Show success message
      // After successful login, get the current session to determine the user's role
      const { data: { session } } = await supabase.auth.getSession();
      navigateBasedOnRole(session); // Navigate based on role
    }
    setLoading(false); // Set loading state to false
  }

  return (
    <>
      {/* Status bar configuration */}
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Main container */}
      <View style={styles.container}>
        {/* Header section */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Login form */}
        <View style={styles.form}>
          {/* Email input container */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
                email && styles.inputFilled // Apply filled style if email has content
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

          {/* Password input container */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused,
                password && styles.inputFilled // Apply filled style if password has content
              ]}
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              placeholder="Enter your password"
              placeholderTextColor="#A0A0A0"
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            disabled={loading} // Disable button when loading
            onPress={signInWithEmail}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Footer section with sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Custom Modal for alerts */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideCustomModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity onPress={hideCustomModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  linkText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Styles for the custom modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContainer: {
    width: width * 0.8, // 80% of screen width
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
