import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Client as DBClient } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
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
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, contact_number, email, pending_amount')
        .order('name', { ascending: true });

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
        { 
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border
        }
      ]}
      onPress={() => {
        setSelectedClient(item);
        setNewPendingAmount(item.pending_amount?.toString() || '');
      }}
    >
      <View style={styles.clientInfo}>
        <Ionicons 
          name="person-circle-outline" 
          size={28} 
          color={isDark ? Colors.dark.text : Colors.light.text} 
        />
        <View style={styles.clientDetails}>
          <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.clientContact, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {item.email || item.contact_number || 'No contact info'}
          </Text>
        </View>
      </View>
      <View style={styles.pendingAmountContainer}>
        <Text style={[
          styles.pendingAmount, 
          { 
            color: item.pending_amount ? '#F57C00' : (isDark ? Colors.dark.secondary : Colors.light.secondary)
          }
        ]}>
          {item.pending_amount !== null ? `$${item.pending_amount.toFixed(2)}` : 'No Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Loading clients...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#D32F2F" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          onPress={fetchClientsWithPendingAmount} 
          style={[styles.retryButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Pending Amounts',
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
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {selectedClient && (
        <View style={[
          styles.updateForm, 
          { 
            backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
            borderColor: isDark ? Colors.dark.border : Colors.light.border
          }
        ]}>
          <Text style={[styles.updateFormTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Update Pending Amount for {selectedClient.name}
          </Text>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              Amount ($)
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                { 
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                }
              ]}
              placeholder="Enter amount (e.g., 100.00)"
              placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
              keyboardType="decimal-pad"
              value={newPendingAmount}
              onChangeText={setNewPendingAmount}
            />
          </View>
          <View style={styles.formButtons}>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
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
              <Text style={[styles.cancelButtonText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
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
              size={60} 
              color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
            />
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              No Clients Found
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Add a new client to get started'}
            </Text>
            <TouchableOpacity 
              style={[styles.createButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
              onPress={() => router.push('/create-client')}
            >
              <Text style={styles.createButtonText}>Add New Client</Text>
            </TouchableOpacity>
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
    padding: 16,
  },
  clientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientDetails: {
    gap: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  clientContact: {
    fontSize: 14,
    fontWeight: '400',
  },
  pendingAmountContainer: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '600',
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
  updateForm: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  updateFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});