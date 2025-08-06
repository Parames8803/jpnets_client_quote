import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';

// @ts-ignore
let supabase: any;
async function getSupabase() {
  if (!supabase) {
    const { supabase: sb } = await import('../utils/supabaseClient.ts');
    supabase = sb;
  }
  return supabase;
}

export default function CreateClientScreen() {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Focus states for inputs
  const [nameFocused, setNameFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      const { data: { user: originalUser }, error: getUserError } = await (await sb).auth.getUser();
      if (getUserError || !originalUser) {
        Alert.alert('Error', 'User not found. Please login again.');
        router.replace('/(auth)/login');
        return;
      }

      // Get current session before creating new user
      const { data: { session: currentSession }, error: sessionError } = await (await sb).auth.getSession();
      if (sessionError || !currentSession) {
        console.error("Error getting current session or no current session:", sessionError);
        Alert.alert('Error', 'Could not retrieve current session. Please login again.');
        router.replace('/(auth)/login');
        return;
      }

             // First create the client record with a temporary user_id (we'll update it later)
       const { data: clientData, error: clientError } = await (await sb)
         .from('clients')
         .insert([
           {
             user_id: originalUser.id, // Temporary user_id, will be updated
             created_by: originalUser.id, // Admin who created this client
             name: name.trim(),
             contact_number: contactNumber.trim(),
             email: email.trim(),
             address: address.trim(),
             latitude: latitude,
             longitude: longitude,
           },
         ])
         .select()
         .single();

      if (clientError) {
        Alert.alert('Error', 'Failed to create client: ' + clientError.message);
        return;
      }

      // Create a new user in auth.users table
      const { data: signUpData, error: signUpError } = await (await sb).auth.signUp({
        email: email.trim(),
        password: contactNumber.trim(), // Using contact number as password as per requirement
        options: {
          data: {
            role: 'client', // Assign role 'client'
          },
        },
      });

      if (signUpError) {
        Alert.alert('User Creation Error', signUpError.message);
        // Delete the client record since user creation failed
        await (await sb).from('clients').delete().eq('id', clientData.id);
        return;
      }

      // Update the client record with the new auth user's ID
      if (signUpData.user) {
        const { error: updateError } = await (await sb)
          .from('clients')
          .update({ user_id: signUpData.user.id })
          .eq('id', clientData.id);

        if (updateError) {
          Alert.alert('Error', 'Failed to update client with new user ID: ' + updateError.message);
          // Clean up: delete both the client and the auth user
          await (await sb).from('clients').delete().eq('id', clientData.id);
          // Note: We can't easily delete the auth user from here, but the client is cleaned up
          return;
        }
      }

      // After successful signup, the new user is automatically logged in.
      // We need to sign out the newly created user and restore the original user's session.
      const { error: signOutError } = await (await sb).auth.signOut();
      if (signOutError) {
        console.error("Error signing out new user:", signOutError);
        Alert.alert('Sign Out Error', 'Failed to sign out newly created user.');
        // Decide how to handle this. For now, proceed to restore original session.
      }

      const { error: setSessionError } = await (await sb).auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });

      if (setSessionError) {
        console.error("Error restoring session:", setSessionError);
        Alert.alert('Session Restore Error', 'Failed to restore original user session. Please re-login.');
        router.replace('/(auth)/login');
        return;
      }

      // Verify the session is restored to the original user
      const { data: { user: restoredUser }, error: getRestoredUserError } = await (await sb).auth.getUser();
      if (getRestoredUserError || !restoredUser || restoredUser.id !== originalUser.id) {
        console.error("Session not restored to original user:", restoredUser);
        Alert.alert('Session Verification Error', 'Original user session could not be verified. Please re-login.');
        router.replace('/(auth)/login');
        return;
      }

      Alert.alert('Success', 'Client and user created successfully!');
      router.push('/(tabs)');
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
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

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

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return '👤';
      case 'phone': return '📱';
      case 'email': return '✉️';
      case 'address': return '📍';
      default: return '';
    }
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header Section */}
        {/* <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Create New Client
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? Colors.dark.placeholder : Colors.light.placeholder }]}>
            Fill in the details to add a new client
          </Text>
        </View> */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {/* Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.labelIcon}>{getFieldIcon('name')}</Text>
                <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Full Name
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
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
              <View style={styles.labelContainer}>
                <Text style={styles.labelIcon}>{getFieldIcon('phone')}</Text>
                <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Contact Number
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
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
              <View style={styles.labelContainer}>
                <Text style={styles.labelIcon}>{getFieldIcon('email')}</Text>
                <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Email Address
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
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
              <View style={styles.labelContainer}>
                <Text style={styles.labelIcon}>{getFieldIcon('address')}</Text>
                <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Address
                </Text>
                <Text style={styles.required}>*</Text>
              </View>
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
                  onPress={handleFetchLocation}
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
                      📍 Use Current Location
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
                      📌 Coordinates
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
                onPress={handleSaveClient}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={isDark ? "black" : "white"} />
                    <Text style={[styles.saveButtonText, { color: isDark ? "black" : "white" }]}>
                      Creating Client...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.saveButtonText, { color: isDark ? "black" : "white" }]}>
                    ✨ Create Client
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
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 28,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
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
