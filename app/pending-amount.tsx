import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Client as DBClient } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ClientDisplayInfo extends Pick<DBClient, 'id' | 'name' | 'contact_number' | 'email'> {}

interface ClientWithPendingAmount extends ClientDisplayInfo {
  pending_amount: number | null;
}

export default function PendingAmountPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [clients, setClients] = useState<ClientWithPendingAmount[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithPendingAmount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithPendingAmount | null>(null);
  const [newPendingAmount, setNewPendingAmount] = useState('');

  useEffect(() => {
    fetchClientsWithPendingAmount();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const fetchClientsWithPendingAmount = async () => {
    setLoading(true);
    setError(null);
    try {
      // For now, we'll fetch all clients and simulate a pending_amount
      // In a real scenario, this would involve complex queries or a dedicated column
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, contact_number, email, pending_amount'); // Fetch pending_amount from DB

      if (clientsError) {
        throw clientsError;
      }

      setClients(clientsData as ClientWithPendingAmount[]);
    } catch (e: any) {
      console.error('Error fetching clients:', e.message);
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (searchQuery === '') {
      setFilteredClients(clients);
    } else {
      setFilteredClients(
        clients.filter(client =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.contact_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  };

  const handleUpdatePendingAmount = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'No client selected.');
      return;
    }

    let amountToSave: number | null = null;
    if (newPendingAmount !== '') {
      const parsedAmount = parseFloat(newPendingAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        Alert.alert('Error', 'Please enter a valid non-negative number for the pending amount.');
        return;
      }
      if (parsedAmount > 0) {
        amountToSave = parsedAmount;
      }
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ pending_amount: amountToSave })
        .eq('id', selectedClient.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state after successful DB update
      const updatedClients = clients.map(client =>
        client.id === selectedClient.id ? { ...client, pending_amount: amountToSave } : client
      );
      setClients(updatedClients);
      setSelectedClient(null);
      setNewPendingAmount('');
      Alert.alert('Success', 'Pending amount updated successfully!');
    } catch (e: any) {
      console.error('Error updating pending amount:', e.message);
      Alert.alert('Error', 'Failed to update pending amount. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderClientItem = ({ item }: { item: ClientWithPendingAmount }) => (
    <TouchableOpacity 
      style={[
        styles.clientCard, 
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }
      ]}
      onPress={() => {
        setSelectedClient(item);
        setNewPendingAmount(item.pending_amount?.toString() || '');
      }}
    >
      <View style={styles.clientInfo}>
        <Ionicons name="person-circle-outline" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
        <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {item.name}
        </Text>
      </View>
      <Text style={[styles.pendingAmount, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Pending: {item.pending_amount !== null ? `$${item.pending_amount.toFixed(2)}` : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Loading clients...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchClientsWithPendingAmount} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Stack.Screen options={{ title: 'Pending Amount' }} />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={isDark ? Colors.dark.secondary : Colors.light.secondary} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            { 
              color: isDark ? Colors.dark.text : Colors.light.text,
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
            }
          ]}
          placeholder="Search clients..."
          placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedClient && (
        <View style={[styles.updateForm, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <Text style={[styles.updateFormTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Update Pending Amount for {selectedClient.name}
          </Text>
          <TextInput
            style={[
              styles.amountInput,
              { 
                color: isDark ? Colors.dark.text : Colors.light.text,
                backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
              }
            ]}
            placeholder="Enter new amount"
            placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
            keyboardType="numeric"
            value={newPendingAmount}
            onChangeText={setNewPendingAmount}
          />
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: Colors.light.tint }]}
            onPress={handleUpdatePendingAmount}
          >
            <Text style={styles.saveButtonText}>Save Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setSelectedClient(null);
              setNewPendingAmount('');
            }}
          >
            <Text style={[styles.cancelButtonText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons 
              name="people-outline" 
              size={48} 
              color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            />
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              No clients with pending amounts found.
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: 'orange',
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
  updateForm: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  updateFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
