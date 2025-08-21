import { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Appearance,
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
  useColorScheme,
  View,
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';

const { width, height } = Dimensions.get('window');

// Color palettes for light/dark theme
const palette = {
  light: {
    bg: '#F6F8FA',
    card: '#FFFFFF',
    title: '#18181B',
    text: '#374151',
    inputBG: '#F6F7FB',
    inputBorder: '#D1D5DB',
    inputBorderActive: '#3B82F6',
    inputText: '#18181B',
    placeholder: '#A0A0A0',
    buttonBG: '#3B82F6',
    buttonText: '#FFF',
    buttonAltBG: '#EEF0F3',
    buttonAltText: '#1F2937',
    modalBG: '#FFF',
    modalTitle: '#18181B',
    modalText: '#52525B',
    modalButtonBG: '#3B82F6',
    modalButtonText: '#FFF',
    shadow: '#1F2937',
  },
  dark: {
    bg: '#19191D',
    card: '#23232A',
    title: '#F6F8FA',
    text: '#C9D1D9',
    inputBG: '#23232A',
    inputBorder: '#343544',
    inputBorderActive: '#2563EB',
    inputText: '#F3F3F8',
    placeholder: '#767A8C',
    buttonBG: '#2563EB',
    buttonText: '#FFF',
    buttonAltBG: '#252532',
    buttonAltText: '#EAF1FB',
    modalBG: '#23232A',
    modalTitle: '#F6F8FA',
    modalText: '#C9D1D9',
    modalButtonBG: '#2563EB',
    modalButtonText: '#FFF',
    shadow: '#101010',
  },
};

export default function LoginScreen() {
  const colorScheme = useColorScheme() || Appearance.getColorScheme() || 'light';
  const theme = useMemo(() => palette[colorScheme] || palette.light, [colorScheme]);

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
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          {/* Card wrapper */}
          <View style={[
            styles.card,
            {
              backgroundColor: theme.card,
              shadowColor: theme.shadow,
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
              <Text style={[styles.title, { color: theme.title }]}>Sign In</Text>
              <Text style={[styles.subtitle, { color: theme.text }]}>
                Welcome back. Please log in to your account.
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 8 }}>
              {/* Email */}
              <Text style={[styles.inputLabel, { color: theme.text }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@email.com"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBG,
                    color: theme.inputText,
                    borderColor: emailFocused
                      ? theme.inputBorderActive
                      : theme.inputBorder
                  }
                ]}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                returnKeyType="next"
              />

              {/* Password */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                placeholder="Your password"
                placeholderTextColor={theme.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBG,
                    color: theme.inputText,
                    borderColor: passwordFocused
                      ? theme.inputBorderActive
                      : theme.inputBorder
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
                  backgroundColor: loading ? theme.inputBorder : theme.buttonBG, 
                  shadowColor: theme.shadow 
                }
              ]}
              disabled={loading}
              onPress={signInWithEmail}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.loginButtonText, 
                { color: theme.buttonText }
              ]}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Back home */}
            <TouchableOpacity
              style={[
                styles.loginTextButton,
                { backgroundColor: theme.buttonAltBG }
              ]}
              disabled={loading}
              onPress={() => router.push('/landing')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.loginTextButtonText,
                { color: theme.buttonAltText }
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
                backgroundColor: theme.modalBG,
                shadowColor: theme.shadow
              }
            ]}>
              <Text style={[
                styles.modalTitle, { color: theme.modalTitle }
              ]}>{modalTitle}</Text>
              <Text style={[
                styles.modalText, { color: theme.modalText }
              ]}>{modalMessage}</Text>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.modalButtonBG }
                ]}
                onPress={hideCustomModal}
              >
                <Text style={[
                  styles.modalButtonText, { color: theme.modalButtonText }
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
