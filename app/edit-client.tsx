import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
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
      setInitialLoading(true);
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
          setLatitude(data.latitude ?? null);
          setLongitude(data.longitude ?? null);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id]);

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

  const handleUpdateClient = async () => {
    if (!validateFields()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: name.trim(),
          contact_number: contactNumber.trim(),
          email: email.trim(),
          address: address.trim(),
          latitude: latitude,
          longitude: longitude,
        })
        .eq('id', id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Client updated successfully.');
        router.replace('/(tabs)');
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

      setLatitude(latitude);
      setLongitude(longitude);

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

  const handleOpenMap = () => {
    if (latitude !== null && longitude !== null) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${latitude},${longitude}`;
      const label = 'Client Location';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      if (url) {
        Linking.openURL(url).catch(err => console.error('An error occurred', err));
      }
    } else {
      Alert.alert('No Location', 'Latitude and Longitude not available.');
    }
  };

  if (initialLoading || !client) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Loading client data...
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDark ? Colors.dark.placeholder : Colors.light.placeholder }]}>
            Please wait while we fetch the details
          </Text>
        </View>
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
            {/* Name Field */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                  borderColor: nameFocused 
                    ? (isDark ? '#60A5FA' : '#3B82F6')
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                },
                nameFocused && styles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? Colors.dark.text : Colors.light.text }]}
                  placeholder="Enter client's full name"
                  placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Contact Field */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                  borderColor: contactFocused 
                    ? (isDark ? '#60A5FA' : '#3B82F6')
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                },
                contactFocused && styles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? Colors.dark.text : Colors.light.text }]}
                  placeholder="Enter phone number"
                  placeholderTextColor={isDark ? Colors.dark.placeholder : Colors.light.placeholder}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  onFocus={() => setContactFocused(true)}
                  onBlur={() => setContactFocused(false)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                  borderColor: emailFocused 
                    ? (isDark ? '#60A5FA' : '#3B82F6')
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                },
                emailFocused && styles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? Colors.dark.text : Colors.light.text }]}
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
            </View>

            {/* Address Field */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Address <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                {
                  backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                  borderColor: addressFocused 
                    ? (isDark ? '#60A5FA' : '#3B82F6')
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                },
                addressFocused && styles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: isDark ? Colors.dark.text : Colors.light.text }]}
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
              </View>

              {/* Location Section */}
              <View style={styles.locationSection}>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    {
                      backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                    }
                  ]}
                  onPress={handleGetLocation}
                  disabled={locationLoading}
                  activeOpacity={0.7}
                >
                  {locationLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#3B82F6'} />
                      <Text style={[styles.locationButtonText, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>
                        Getting location...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.locationButtonText, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>
                      Update Current Location
                    </Text>
                  )}
                </TouchableOpacity>

                {typeof latitude === 'number' && typeof longitude === 'number' && (
                  <TouchableOpacity 
                    style={[styles.coordinatesCard, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }]}
                    onPress={handleOpenMap} 
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.coordinatesLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                      Current Coordinates
                    </Text>
                    <Text style={[styles.coordinatesText, { color: isDark ? '#22C55E' : '#16A34A' }]}>
                      Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}
                    </Text>
                    <Text style={[styles.coordinatesHint, { color: isDark ? Colors.dark.placeholder : Colors.light.placeholder }]}>
                      Tap to open in maps
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
                    shadowColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  },
                  loading && styles.saveButtonDisabled
                ]}
                onPress={handleUpdateClient}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={isDark ? "black" : "white"} />
                    <Text style={[styles.saveButtonText, { color: isDark ? "black" : "white" }]}>
                      Updating Client...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.saveButtonText, { color: isDark ? "black" : "white" }]}>
                    Update Client
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  }
                ]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 40,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  inputWrapper: {
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperFocused: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  textAreaWrapper: {
    minHeight: 100,
  },
  input: {
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
    borderWidth: 0,
  },
  textArea: {
    height: 96,
    paddingTop: 16,
    paddingBottom: 16,
  },
  locationSection: {
    marginTop: 16,
    gap: 12,
  },
  locationButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinatesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  coordinatesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  coordinatesHint: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cancelButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});