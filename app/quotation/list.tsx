import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { QuotationStatus } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface QuotationListItem {
  id: string;
  created_at: string;
  total_price: number | null;
  status: QuotationStatus | null;
  clients: { name: string | null } | null;
}

export default function QuotationListPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    // Filter quotations based on search query and status
    let filtered = quotations;
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    setFilteredQuotations(filtered);
  }, [searchQuery, filterStatus, quotations]);

  const fetchQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, created_at, total_price, status, clients(name)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setQuotations(data as any as QuotationListItem[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: QuotationListItem }) => (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border
        }
      ]}
      onPress={() => router.push(`/quotation/${item.id}`)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {item.clients?.name || 'Unknown Client'}
          </Text>
          <View style={[
            styles.statusBadge,
            { 
              backgroundColor: 
                item.status === 'Active' ? '#E6F3E6' : 
                item.status === 'Closed' ? '#FFE6E6' : '#FFF5E6'
            }
          ]}>
            <Text style={[
              styles.statusText,
              { 
                color: 
                  item.status === 'Active' ? '#2E7D32' : 
                  item.status === 'Closed' ? '#D32F2F' : '#F57C00'
              }
            ]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <Text style={[styles.amount, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            ${item.total_price?.toFixed(2) || '0.00'}
          </Text>
          <Text style={[styles.date, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="refresh-circle-outline" size={40} color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Loading quotations...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#D32F2F" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchQuotations} style={[styles.retryButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Quotations',
          headerStyle: { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
          headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
        }} 
      />
      <View style={styles.header}>
        <View style={[styles.searchContainer, { 
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border
        }]}>
          <Ionicons 
            name="search-outline" 
            size={20} 
            color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            placeholder="Search by client name..."
            placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterContainer}>
          {['All', 'Active', 'Closed', 'Pending'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === (status === 'All' ? null : status) && {
                  backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint
                }
              ]}
              onPress={() => setFilterStatus(status === 'All' ? null : status)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === (status === 'All' ? null : status) && {
                  color: isDark ? Colors.dark.background : Colors.light.background
                }
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={filteredQuotations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons 
              name="document-text-outline" 
              size={60} 
              color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            />
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              No Quotations Found
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              {searchQuery || filterStatus 
                ? 'Try adjusting your search or filter criteria'
                : 'Create a new quotation to get started'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  card: {
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
  cardContent: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
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
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    fontWeight: '400',
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
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});