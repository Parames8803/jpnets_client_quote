import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth'; // Assuming useAuth.ts is in hooks folder
import { useColorScheme } from '@/hooks/useColorScheme';
import { Lead, LEAD_STATUS_TYPES, LeadStatus } from '@/types/db'; // Assuming db.ts is in types folder
import { supabase } from '@/utils/supabaseClient'; // Assuming supabaseClient.ts is in utils folder
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LeadsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const user = session?.user;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');

  // Re-fetch leads when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchLeads();
      }
    }, [user, filterStatus])
  );

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id);

      if (filterStatus !== 'All') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        // Optionally, show an alert to the user
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const renderLeadCard = (lead: Lead) => (
    <TouchableOpacity
      key={lead.id}
      style={[
        styles.leadCard,
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
      ]}
      onPress={() => router.push(`/leads/${lead.id}` as any)} // Navigate to a detail page for the lead
    >
      <View style={styles.leadCardHeader}>
        <Text style={[styles.leadName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{lead.name}</Text>
        <Text style={[styles.leadStatus, { color: getStatusColor(lead.status) }]}>{lead.status}</Text>
      </View>
      <Text style={[styles.leadContact, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        Contact: {lead.contact || 'N/A'}
      </Text>
      <Text style={[styles.leadAddress, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        Address: {lead.address || 'N/A'}
      </Text>
      {lead.comment && (
        <Text style={[styles.leadComment, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Comment: {lead.comment}
        </Text>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LEAD_STATUS_TYPES.APPROVED:
        return Colors.light.tint; // Green-ish
      case LEAD_STATUS_TYPES.REJECTED:
        return Colors.light.error; // Red-ish
      case LEAD_STATUS_TYPES.PENDING:
      default:
        return Colors.light.infoText; // Orange-ish
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Leads
        </Text>
        <TouchableOpacity onPress={() => router.push('/create-lead')} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['All', LEAD_STATUS_TYPES.APPROVED, LEAD_STATUS_TYPES.REJECTED, LEAD_STATUS_TYPES.PENDING].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && { backgroundColor: Colors.light.tint },
            ]}
            onPress={() => setFilterStatus(status as LeadStatus | 'All')}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && { color: Colors.light.background },
            ]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginTop: 10 }}>Loading Leads...</Text>
        </View>
      ) : leads.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="document-outline"
            size={48}
            color={isDark ? Colors.dark.secondary : Colors.light.secondary}
          />
          <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            No leads found
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Create a new lead to get started.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
            />
          }
        >
          {leads.map(renderLeadCard)}
        </ScrollView>
      )}
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
  addButton: {
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  leadCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  leadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
  },
  leadStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  leadContact: {
    fontSize: 14,
    marginBottom: 4,
  },
  leadAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  leadComment: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
});
