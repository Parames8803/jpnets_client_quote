import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Client, Room, Quotation } from '../../types/db';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async (clientId: string) => {
    setLoading(true);
    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) {
        Alert.alert('Error fetching client', clientError.message);
        setClient(null);
      } else {
        setClient(clientData);
      }

      // Fetch rooms for the client
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (roomsError) {
        Alert.alert('Error fetching rooms', roomsError.message);
        setRooms([]);
      } else {
        setRooms(roomsData || []);
      }

      // Fetch quotations for the client
      const { data: quotationsData, error: quotationsError } = await supabase
        .from('quotations')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (quotationsError) {
        Alert.alert('Error fetching quotations', quotationsError.message);
        setQuotations([]);
      } else {
        setQuotations(quotationsData || []);
      }

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchClientData(id as string);
    }
  }, [id]);

  if (loading || !client) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  const handleCreateRoom = () => {
    router.push({ pathname: '/create-room', params: { clientId: client.id } });
  };

  const handleGenerateQuotation = () => {
    router.push({ pathname: '/client/generate-quotation', params: { clientId: client.id } });
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <View style={styles.roomItem}>
      <Text style={styles.roomTitle}>{item.room_type || 'N/A'}</Text>
      <Text style={styles.roomDescription}>{item.description || 'No description'}</Text>
      <Text style={styles.roomStatus}>Status: {item.status || 'N/A'}</Text>
    </View>
  );

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <View style={styles.quotationItem}>
      <Text style={styles.quotationTitle}>Quotation ID: {item.id.substring(0, 8)}...</Text>
      <Text style={styles.quotationDetail}>Total Price: ${item.total_price?.toFixed(2) || 'N/A'}</Text>
      <Text style={styles.quotationDetail}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Client Details Section */}
      <View style={styles.section}>
        <Text style={styles.title}>{client.name}</Text>
        <Text style={styles.label}>Contact Number: <Text style={styles.text}>{client.contact_number}</Text></Text>
        <Text style={styles.label}>Email: <Text style={styles.text}>{client.email}</Text></Text>
        <Text style={styles.label}>Address: <Text style={styles.text}>{client.address}</Text></Text>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateRoom}>
          <IconSymbol size={20} name="plus.circle.fill" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.actionButtonText}>Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleGenerateQuotation}>
          <IconSymbol size={20} name="doc.text.fill" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.actionButtonText}>Generate Quotation</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Rooms Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Rooms ({rooms.length})</Text>
        {rooms.length > 0 ? (
          <FlatList
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noDataText}>No rooms saved for this client.</Text>
        )}
      </View>

      {/* Generated Quotations Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generated Quotations ({quotations.length})</Text>
        {quotations.length > 0 ? (
          <FlatList
            data={quotations}
            renderItem={renderQuotationItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noDataText}>No quotations generated for this client.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
    color: '#555',
  },
  text: {
    fontSize: 16,
    color: '#777',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  listContent: {
    paddingBottom: 10,
  },
  roomItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  roomStatus: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 5,
  },
  quotationItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  quotationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
  },
  quotationDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
