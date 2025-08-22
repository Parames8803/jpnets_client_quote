import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { LeadStatus, LEAD_STATUS_TYPES } from '@/types/db';

export default function CreateLeadScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const user = session?.user;

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<LeadStatus>(LEAD_STATUS_TYPES.PENDING);
  const [loading, setLoading] = useState(false);

  const handleCreateLead = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a lead.');
      return;
    }
    if (!name) {
      Alert.alert('Error', 'Lead name is required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          name,
          contact,
          address,
          comment,
          status,
        })
        .select();

      if (error) {
        console.error('Error creating lead:', error);
        Alert.alert('Error', 'Failed to create lead. Please try again.');
      } else {
        Alert.alert('Success', 'Lead created successfully!');
        router.back();
      }
    } catch (error) {
      console.error('Unexpected error creating lead:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Create New Lead
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={[styles.label, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Lead Name:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
              color: isDark ? Colors.dark.text : Colors.light.text,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
          placeholder="Enter lead name"
          placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Contact:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
              color: isDark ? Colors.dark.text : Colors.light.text,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
          placeholder="Enter contact number"
          placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
          value={contact}
          onChangeText={setContact}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Address:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
              color: isDark ? Colors.dark.text : Colors.light.text,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
          placeholder="Enter address"
          placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <Text style={[styles.label, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Comment:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
              color: isDark ? Colors.dark.text : Colors.light.text,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
          placeholder="Add any comments"
          placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <Text style={[styles.label, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Status:</Text>
        <View style={styles.statusContainer}>
          {Object.values(LEAD_STATUS_TYPES).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusButton,
                {
                  backgroundColor: status === s ? Colors.light.tint : (isDark ? Colors.dark.cardBackground : Colors.light.cardBackground),
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              onPress={() => setStatus(s)}
            >
              <Text style={[
                styles.statusButtonText,
                { color: status === s ? Colors.light.background : (isDark ? Colors.dark.text : Colors.light.text) },
              ]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: Colors.light.tint }]}
          onPress={handleCreateLead}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.light.background} />
          ) : (
            <Text style={styles.createButtonText}>Create Lead</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statusButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
