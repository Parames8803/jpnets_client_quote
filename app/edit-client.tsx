import { IconSymbol } from '@/components/ui/IconSymbol';
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

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchClient = async () => {
      // Request location permissions when the component mounts
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
        <Text style={[styles.loadingText, { color: isDark ? '#e2e8f0' : '#64748b' }]}>
          Loading client data...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#1a1a1a' : '#f8fafc'} 
      />
      
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Form Container */}
        <View style={[styles.formContainer, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Full Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Enter full name"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Contact Number Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Contact Number
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Enter contact number"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Email Address
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Enter email address"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Address Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Address
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Enter address or use current location"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Location Button */}
          <TouchableOpacity 
            style={[
              styles.locationButton,
              { backgroundColor: '#1F2937' }
            ]}
            onPress={handleGetLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={isDark ? '#60a5fa' : '#3b82f6'} />
            ) : (
              <IconSymbol 
                size={20} 
                name="location.fill" 
                color={isDark ? '#60a5fa' : '#3b82f6'} 
              />
            )}
            <Text style={[styles.locationButtonText, { color: isDark ? '#60a5fa' : '#3b82f6' }]}>
              {locationLoading ? 'Getting Location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Update Button */}
          <TouchableOpacity 
            style={[
              styles.updateButton,
              { backgroundColor: '#1F2937' },
              loading && styles.buttonDisabled
            ]}
            onPress={handleUpdateClient}
            disabled={loading}
          >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <IconSymbol size={20} name="checkmark.circle.fill" color="#ffffff" />
              <Text style={styles.updateButtonText}>Update Client</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 80,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
