import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../utils/supabaseClient';

import { Colors } from '@/constants/Colors';

import { Client } from '../types/db';

export default function EditClientScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<Client | null>(null);
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

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchClient = async () => {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission to access location was denied');
          return;
        }
      })();
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          setClient(data);
          setName(data.name);
          setContactNumber(data.contact_number);
          setEmail(data.email);
          setAddress(data.address);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id]);

  const handleUpdateClient = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: name.trim(),
          contact_number: contactNumber.trim(),
          email: email.trim(),
          address: address.trim(),
        })
        .eq('id', id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Client updated successfully.');
        router.push('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geocode && geocode.length > 0) {
        const { name, street, city, region, postalCode, country } = geocode[0];
        const fullAddress = [name, street, city, region, postalCode, country]
          .filter(Boolean)
          .join(', ');
        setAddress(fullAddress);
        Alert.alert('Location Fetched', 'Address updated with current location.');
      } else {
        Alert.alert('Location Error', 'Could not determine address from coordinates.');
      }
    } catch (error: any) {
      Alert.alert('Location Error', 'Failed to get current location: ' + error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  if (loading || !client) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Loading client data...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                  nameFocused && styles.inputFocused,
                ]}
                placeholder="Enter client's full name"
                placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Contact Number</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                  contactFocused && styles.inputFocused,
                ]}
                placeholder="Enter phone number"
                placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                value={contactNumber}
                onChangeText={setContactNumber}
                onFocus={() => setContactFocused(true)}
                onBlur={() => setContactFocused(false)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                  emailFocused && styles.inputFocused,
                ]}
                placeholder="Enter email address"
                placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Address</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                  addressFocused && styles.inputFocused,
                ]}
                placeholder="Enter full address"
                placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                value={address}
                onChangeText={setAddress}
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setAddressFocused(false)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
                onPress={handleGetLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.locationButtonText, { color: isDark ? Colors.dark.primary : Colors.light.primary }]}>
                  {locationLoading ? 'Getting location...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }, loading && styles.saveButtonDisabled]}
              onPress={handleUpdateClient}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: isDark ? "black" : Colors.light.text }]}>
                {loading ? 'Updating Client...' : 'Update Client'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Cancel</Text>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    height: 88,
    paddingTop: 16,
  },
  inputFocused: {
    borderColor: Colors.light.primary, // This will be adjusted by a new color from Colors
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary, // This will be adjusted by a new color from Colors
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  locationButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
