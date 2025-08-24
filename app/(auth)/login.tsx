import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

// Color palettes for light/dark theme
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const router = useRouter();

  // Modal handlers
  const showCustomModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };
  const hideCustomModal = () => {
    setModalVisible(false);
    setModalTitle('');
    setModalMessage('');
  };

  // Route by role after auth
  const navigateBasedOnRole = (session: Session | null) => {
    if (session && session.user && session.user.user_metadata) {
      const userRole = session.user.user_metadata.role;
      if (userRole === 'admin') {
        router.replace('/(tabs)');
      } else if (userRole === 'client') {
        router.replace('/(clients)');
      } else if (userRole === 'worker') {
        router.replace('/(workers)');
      } else {
        showCustomModal('Navigation Error', 'Unknown user role. Please contact support.');
        router.replace('/(tabs)');
      }
    } else {
      showCustomModal('Session Error', 'User session or role information not found.');
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigateBasedOnRole(session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, [router]);

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

  async function signInWithEmail() {
    if (!validateFields()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showCustomModal('Login Failed', error.message);
    } else {
      showCustomModal('Success', 'Welcome back!');
      const { data: { session } } = await supabase.auth.getSession();
      navigateBasedOnRole(session);
    }
    setLoading(false);
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.light.background}
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: Colors.light.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          {/* Card wrapper */}
          <View style={[
            styles.card,
            {
              backgroundColor: Colors.light.cardBackground,
              shadowColor: Colors.light.border,
            }
          ]}>
            {/* Logo/brand icon area */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              {/* Replace below with your logo/image */}
              <View style={styles.brandWrap}>
                        <Image
                          source={require('../../assets/images/icon.png')}
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: 14,
                          }}
                        />
                      </View>
              <Text style={[styles.title, { color: Colors.light.text }]}>Sign In</Text>
              <Text style={[styles.subtitle, { color: Colors.light.text }]}>
                Welcome back. Please log in to your account.
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 8 }}>
              {/* Email */}
              <Text style={[styles.inputLabel, { color: Colors.light.text }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@email.com"
                placeholderTextColor={Colors.light.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors.light.inputBackground,
                    color: Colors.light.text,
                    borderColor: emailFocused
                      ? Colors.light.primary
                      : Colors.light.border
                  }
                ]}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                returnKeyType="next"
              />

              {/* Password */}
              <Text style={[styles.inputLabel, { color: Colors.light.text, marginTop: 14 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                placeholder="Your password"
                placeholderTextColor={Colors.light.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: Colors.light.inputBackground,
                    color: Colors.light.text,
                    borderColor: passwordFocused
                      ? Colors.light.primary
                      : Colors.light.border
                  }
                ]}
                secureTextEntry
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                returnKeyType="done"
                onSubmitEditing={signInWithEmail}
              />
            </View>

            {/* Sign In */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: loading ? Colors.light.border : Colors.light.primary,
                  shadowColor: Colors.light.border
                }
              ]}
              disabled={loading}
              onPress={signInWithEmail}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.loginButtonText,
                { color: Colors.light.redText }
              ]}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Back home */}
            <TouchableOpacity
              style={[
                styles.loginTextButton,
                { backgroundColor: Colors.light.buttonBackground }
              ]}
              disabled={loading}
              onPress={() => router.push('/landing')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.loginTextButtonText,
                { color: Colors.light.text }
              ]}>
                {loading ? 'Going Home...' : 'Back Home'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Modal */}
        <Modal
          animationType="fade"
          visible={modalVisible}
          transparent
          onRequestClose={hideCustomModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalCard,
              {
                backgroundColor: Colors.light.cardBackground,
                shadowColor: Colors.light.border
              }
            ]}>
              <Text style={[
                styles.modalTitle, { color: Colors.light.text }
              ]}>{modalTitle}</Text>
              <Text style={[
                styles.modalText, { color: Colors.light.subtext }
              ]}>{modalMessage}</Text>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: Colors.light.primary }
                ]}
                onPress={hideCustomModal}
              >
                <Text style={[
                  styles.modalButtonText, { color: Colors.light.redText }
                ]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const CARD_PADDING = 28;

const styles = StyleSheet.create({
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: { flex: 1 },
  card: {
    marginTop: height * 0.10,
    marginHorizontal: 18,
    borderRadius: 24,
    padding: CARD_PADDING,
    minHeight: height * 0.55,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 7,
  },
  title: {
    fontWeight: '700',
    fontSize: 30,
    letterSpacing: -0.6,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: -0.15,
    fontWeight: '500',
    opacity: 0.75,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 7,
    letterSpacing: -0.1,
  },
  input: {
    fontSize: 16,
    borderRadius: 11,
    borderWidth: 1.3,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    marginBottom: 3,
  },
  loginButton: {
    marginTop: 19,
    height: 53,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -.1,
  },
  loginTextButton: {
    height: 48,
    marginTop: 13,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginTextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -.1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 33, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: width * 0.80,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 7,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '700', marginBottom: 9, textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 21
  },
  modalButton: {
    alignSelf: 'center',
    borderRadius: 7,
    paddingVertical: 11,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
