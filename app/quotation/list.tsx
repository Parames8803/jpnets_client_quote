import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { QuotationStatus } from '@/types/db';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotations();
  }, []);

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
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }
      ]}
      onPress={() => { router.push(`/quotation/${item.id}`); }}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {item.clients?.name || 'N/A'}
        </Text>
        <Text style={[styles.status, { color: item.status === 'Active' ? 'green' : item.status === 'Closed' ? 'red' : 'orange' }]}>
          {item.status || 'N/A'}
        </Text>
      </View>
      <Text style={[styles.amount, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        ${item.total_price?.toFixed(2) || '0.00'}
      </Text>
      <Text style={[styles.date, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>Loading quotations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchQuotations} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Stack.Screen options={{ title: 'Quotations' }} />
      <FlatList
        data={quotations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons 
              name="document-text-outline" 
              size={48} 
              color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            />
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              No quotations found
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              Create a new quotation to see it here.
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
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: Colors.light.tint, // Assuming a tint color exists
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
