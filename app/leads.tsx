import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Lead, LEAD_STATUS_TYPES, LeadStatus } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LeadsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const user = session?.user;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchLeads();
      }
    }, [user])
  );

  useEffect(() => {
    filterLeads();
  }, [searchQuery, filterStatus, leads]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')

      if (filterStatus !== 'All') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
      setLeads(data || []);
    } catch (error) {
      console.error('Unexpected error fetching leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;
    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== 'All') {
      filtered = filtered.filter(lead => lead.status === filterStatus);
    }
    setFilteredLeads(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case LEAD_STATUS_TYPES.APPROVED:
        return { background: '#E6F3E6', text: '#2E7D32' }; // Green
      case LEAD_STATUS_TYPES.REJECTED:
        return { background: '#FFE6E6', text: '#D32F2F' }; // Red
      case LEAD_STATUS_TYPES.PENDING:
      default:
        return { background: '#FFF5E6', text: '#F57C00' }; // Orange
    }
  };

  const renderLeadCard = ({ item: lead }: { item: Lead }) => (
    <TouchableOpacity
      style={[
        styles.leadCard,
        { 
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border
        }
      ]}
      onPress={() => router.push(`/leads/${lead.id}` as any)}
    >
      <View style={styles.leadCardContent}>
        <View style={styles.leadCardHeader}>
          <Text style={[styles.leadName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {lead.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status).background }]}>
            <Text style={[styles.statusText, { color: getStatusColor(lead.status).text }]}>
              {lead.status}
            </Text>
          </View>
        </View>
        <View style={styles.leadDetails}>
          <Text style={[styles.leadContact, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {lead.contact || 'No contact info'}
          </Text>
          <Text style={[styles.leadAddress, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {lead.address || 'No address provided'}
          </Text>
          {lead.comment && (
            <Text style={[styles.leadComment, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              {lead.comment}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Leads
        </Text>
        <TouchableOpacity onPress={() => router.push('/create-lead')} style={styles.addButton}>
          <Ionicons 
            name="add-circle-outline" 
            size={28} 
            color={isDark ? Colors.dark.tint : Colors.light.tint} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <View style={[styles.searchContainer, { 
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border
        }]}>
          <Ionicons 
            name="search-outline" 
            size= {20} 
            color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            placeholder="Search by name, contact, or address..."
            placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          {['All', LEAD_STATUS_TYPES.APPROVED, LEAD_STATUS_TYPES.REJECTED, LEAD_STATUS_TYPES.PENDING].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && { 
                  backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint
                }
              ]}
              onPress={() => setFilterStatus(status as LeadStatus | 'All')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status && { 
                  color: isDark ? Colors.dark.background : Colors.light.background
                }
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Loading Leads...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? Colors.dark.text : Colors.light.text}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons 
                name="document-outline" 
                size={60} 
                color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
              />
              <Text style={[styles.emptyText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                No Leads Found
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
                {searchQuery || filterStatus !== 'All' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create a new lead to get started'}
              </Text>
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
                onPress={() => router.push('/create-lead')}
              >
                <Text style={styles.createButtonText}>Create New Lead</Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  leadCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leadCardContent: {
    gap: 8,
  },
  leadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leadDetails: {
    gap: 4,
  },
  leadContact: {
    fontSize: 14,
    fontWeight: '400',
  },
  leadAddress: {
    fontSize: 14,
    fontWeight: '400',
  },
  leadComment: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
  },
  createButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});