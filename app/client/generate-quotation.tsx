import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Client, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

export default function GenerateQuotationScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  const colorScheme = useColorScheme();

  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [assignedEmployeePhone, setAssignedEmployeePhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientAndRooms = async () => {
      if (!clientId) {
        Alert.alert('Error', 'Client ID is missing.');
        setLoading(false);
        return;
      }

      const client_id_str = Array.isArray(clientId) ? clientId[0] : clientId;

      try {
        // Fetch client details
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', client_id_str)
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
          .eq('client_id', client_id_str)
          .order('created_at', { ascending: false });

        if (roomsError) {
          Alert.alert('Error fetching rooms', roomsError.message);
          setRooms([]);
        } else {
          setRooms(roomsData || []);
        }
      } catch (error: any) {
        Alert.alert('An unexpected error occurred', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClientAndRooms();
  }, [clientId]);

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prevSelected) =>
      prevSelected.includes(roomId)
        ? prevSelected.filter((id) => id !== roomId)
        : [...prevSelected, roomId]
    );
  };

  const handleGenerateQuotation = async () => {
    if (selectedRoomIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one room to generate a quotation.');
      return;
    }
    if (!assignedEmployeePhone) {
      Alert.alert('Input Required', 'Please enter the assigned employee\'s phone number.');
      return;
    }
    if (!client) {
      Alert.alert('Error', 'Client data not loaded.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create a new quotation entry
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          client_id: client.id,
          assigned_employee_phone: assignedEmployeePhone,
          total_price: 0, // Placeholder, will be calculated or updated later
        })
        .select()
        .single();

      if (quotationError) {
        Alert.alert('Error creating quotation', quotationError.message);
        setLoading(false);
        return;
      }

      const newQuotationId = quotationData.id;

      // 2. Link selected rooms to the quotation in quotation_rooms table
      const quotationRoomsToInsert = selectedRoomIds.map((roomId) => ({
        quotation_id: newQuotationId,
        room_id: roomId,
        price_per_sq_ft: 0, // Placeholder
        room_total_price: 0, // Placeholder
      }));

      const { error: quotationRoomsError } = await supabase
        .from('quotation_rooms')
        .insert(quotationRoomsToInsert);

      if (quotationRoomsError) {
        console.error('Error linking rooms to quotation:', quotationRoomsError.message);
        Alert.alert('Error', 'Quotation created, but failed to link rooms.');
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Quotation generated successfully!');
      router.replace({ pathname: '/quotation/[id]', params: { id: newQuotationId } });

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => {
    const isSelected = selectedRoomIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.roomItem, isSelected && styles.selectedRoomItem]}
        onPress={() => toggleRoomSelection(item.id)}
      >
        <Text style={styles.roomTitle}>{item.room_type || 'N/A'}</Text>
        <Text style={styles.roomDescription}>{item.description || 'No description'}</Text>
        {isSelected && (
          <IconSymbol
            size={24}
            name="checkmark.circle.fill"
            color={Colors[colorScheme ?? 'light'].tint}
            style={styles.selectedIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Generate Quotation for {client?.name}</Text>

      {/* Section 1: Select Rooms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Rooms ({rooms.length})</Text>
        {rooms.length > 0 ? (
          <FlatList
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noDataText}>No rooms found for this client.</Text>
        )}
      </View>

      {/* Section 2: Assigned Employee & Generate Button */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quotation Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Assigned Employee Phone Number"
          value={assignedEmployeePhone}
          onChangeText={setAssignedEmployeePhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerateQuotation}>
          <IconSymbol size={22} name="doc.text.fill" color="#fff" />
          <Text style={styles.generateButtonText}>Generate Quotation</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fdfdfd',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedRoomItem: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
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
  selectedIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }], // Center vertically
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
