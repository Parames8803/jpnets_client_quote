import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// @ts-ignore
let supabase: any;
async function getSupabase() {
  if (!supabase) {
    const { supabase: sb } = await import('../../utils/supabaseClient.ts');
    supabase = sb;
  }
  return supabase;
}

export default function CreateClientScreen() {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Focus states for inputs
  const [nameFocused, setNameFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
    })();
  }, []);

  const validateFields = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return false;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Validation Error', 'Contact number is required.');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return false;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Address is required.');
      return false;
    }
    return true;
  };

  const handleSaveClient = async () => {
    if (!validateFields()) return;

    setLoading(true);
    try {
      const sb = await getSupabase();
      const { data: { user } } = await (await sb).auth.getUser();

      if (!user) {
        Alert.alert('Error', 'User not found. Please login again.');
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await (await sb)
        .from('clients')
        .insert([
          {
            user_id: user.id,
            name: name.trim(),
            contact_number: contactNumber.trim(),
            email: email.trim(),
            address: address.trim(),
          },
        ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Client created successfully!');
        router.push('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLocation = async () => {
    setLocationLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      let geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode && geocode.length > 0) {
        const { street, city, region, postalCode, country } = geocode[0];
        const fullAddress = [street, city, region, postalCode, country]
          .filter(Boolean)
          .join(', ');
        setAddress(fullAddress);
      } else {
        Alert.alert('Error', 'Could not get address from location.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create New Client</Text>
            <Text style={styles.subtitle}>Add a new client to your database</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  nameFocused && styles.inputFocused,
                  name && styles.inputFilled
                ]}
                placeholder="Enter client's full name"
                placeholderTextColor="#A0A0A0"
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput
                style={[
                  styles.input,
                  contactFocused && styles.inputFocused,
                  contactNumber && styles.inputFilled
                ]}
                placeholder="Enter phone number"
                placeholderTextColor="#A0A0A0"
                value={contactNumber}
                onChangeText={setContactNumber}
                onFocus={() => setContactFocused(true)}
                onBlur={() => setContactFocused(false)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  emailFocused && styles.inputFocused,
                  email && styles.inputFilled
                ]}
                placeholder="Enter email address"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  addressFocused && styles.inputFocused,
                  address && styles.inputFilled
                ]}
                placeholder="Enter full address"
                placeholderTextColor="#A0A0A0"
                value={address}
                onChangeText={setAddress}
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setAddressFocused(false)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <TouchableOpacity 
                style={styles.locationButton} 
                onPress={handleFetchLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.locationButtonText}>
                  {locationLoading ? 'Getting location...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveClient}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Creating Client...' : 'Create Client'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  form: {
    paddingHorizontal: 24,
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
  textArea: {
    height: 88,
    paddingTop: 16,
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
  locationButton: {
    backgroundColor: '#F3F4F6',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    height: 56,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  cancelButton: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});