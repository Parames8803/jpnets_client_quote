import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Lead, LEAD_STATUS_TYPES, LeadStatus } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LeadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const user = session?.user;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchLeadDetail();
    }
  }, [user, id]);

  const fetchLeadDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching lead detail:', error);
        Alert.alert('Error', 'Failed to fetch lead details.');
      } else {
        setLead(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching lead detail:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (!user || !lead) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);

      if (error) {
        console.error('Error updating lead status:', error);
        Alert.alert('Error', 'Failed to update lead status. Please try again.');
      } else {
        Alert.alert('Success', `Lead status updated to ${newStatus}!`);
        setLead((prevLead) => (prevLead ? { ...prevLead, status: newStatus } : null));
      }
    } catch (error) {
      console.error('Unexpected error updating lead status:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LEAD_STATUS_TYPES.APPROVED:
        return Colors.light.tint;
      case LEAD_STATUS_TYPES.REJECTED:
        return Colors.light.error;
      case LEAD_STATUS_TYPES.PENDING:
      default:
        return Colors.light.infoText;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginTop: 10 }}>Loading Lead...</Text>
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Lead not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: Colors.light.tint, fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <Text style={[styles.label, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Name:</Text>
          <Text style={[styles.value, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{lead.name}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Contact:</Text>
          <Text style={[styles.value, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{lead.contact || 'N/A'}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Address:</Text>
          <Text style={[styles.value, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{lead.address || 'N/A'}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Comment:</Text>
          <Text style={[styles.value, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{lead.comment || 'N/A'}</Text>

          <Text style={[styles.label, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Status:</Text>
          <Text style={[styles.value, { color: getStatusColor(lead.status) }]}>{lead.status}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Update Status</Text>
        <View style={styles.statusUpdateContainer}>
          {Object.values(LEAD_STATUS_TYPES).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusUpdateButton,
                {
                  backgroundColor: lead.status === s ? Colors.light.tint : (isDark ? Colors.dark.cardBackground : Colors.light.cardBackground),
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              onPress={() => handleUpdateStatus(s)}
              disabled={updatingStatus || lead.status === s}
            >
              {updatingStatus && lead.status !== s ? (
                <ActivityIndicator color={lead.status === s ? Colors.light.background : (isDark ? Colors.dark.text : Colors.light.text)} />
              ) : (
                <Text style={[
                  styles.statusUpdateButtonText,
                  { color: lead.status === s ? Colors.light.background : (isDark ? Colors.dark.text : Colors.light.text) },
                ]}>
                  {s}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    marginTop: 10,
  },
  statusUpdateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statusUpdateButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  statusUpdateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
});
