import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Client, Room, ROOM_STATUS_TYPES } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

export default function GenerateQuotationScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  // const colorScheme = useColorScheme(); // Removed
  // const isDark = colorScheme === 'dark'; // Removed

  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // New state for refresh

  const fetchClientAndRooms = useCallback(async () => { // Wrapped in useCallback
    if (!clientId) {
      Alert.alert('Error', 'Client ID is missing.');
      setLoading(false);
      return;
    }

    const client_id_str = Array.isArray(clientId) ? clientId[0] : clientId;

    try {
      setRefreshing(true); // Set refreshing true at start
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client_id_str)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('client_id', client_id_str)
        .eq('status', ROOM_STATUS_TYPES.ACTIVE)
        .order('created_at', { ascending: false });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Automatic navigation if no rooms
      if (!roomsData || roomsData.length === 0) {
        Alert.alert('No Rooms', 'No active rooms found for this client. Returning to client details.', [
          { text: 'OK', onPress: () => router.replace(`/client/${client_id_str}`) }
        ]);
      }

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false); // Set refreshing false at end
    }
  }, [clientId, router]); // Added router to dependencies

  useEffect(() => {
    fetchClientAndRooms();
  }, [fetchClientAndRooms]); // Depend on fetchClientAndRooms

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleGenerateQuotation = () => {
    if (selectedRoomIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one room.');
      return;
    }
    // Refresh the current screen after navigation
    fetchClientAndRooms();
    // add some time delay to ensure the state is updated
    setTimeout(() => {}, 200);
    router.push({
      pathname: '/quotation/preview',
      params: {
        clientId: clientId as string,
        selectedRoomIds: JSON.stringify(selectedRoomIds),
      },
    });
  };

  // Removed themedStyles object

  const renderRoomItem = ({ item }: { item: Room }) => {
    const isSelected = selectedRoomIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.roomCard,
          { backgroundColor: Colors.light.cardBackground }, // Replaced themedStyles.card
          isSelected && styles.selectedRoomCard,
          isSelected && { borderColor: Colors.light.primary } // Replaced themedStyles.selectedCard
        ]}
        onPress={() => toggleRoomSelection(item.id)}
      >
        <View style={styles.roomDetails}>
          <Text style={[styles.roomTitle, { color: Colors.light.text }]}>{item.room_type || 'N/A'}</Text>
          <Text style={[styles.roomDescription, { color: Colors.light.subtext }]} numberOfLines={1}>
            {item.description || 'No description available'}
          </Text>
          <View style={styles.roomStats}>
            <Text style={[styles.roomStatText, { color: Colors.light.subtext }]}>Area: {item.total_sq_ft || 'N/A'} sq.ft</Text>
            <Text style={[styles.roomStatText, { color: Colors.light.subtext }]}>Status: {item.status}</Text>
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary }]}>
          {isSelected && <IconSymbol name="checkmark" size={14} color={Colors.light.redText} />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={[styles.loadingText, { color: Colors.light.subtext }]}>Fetching available rooms...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: Colors.light.text }]}>Generate Quotation</Text>
        <Text style={[styles.headerSubtitle, { color: Colors.light.subtext }]}>
          For client: {client?.name || '...'}
        </Text>
      </View>

      {rooms.length > 0 ? (
        <FlatList
          data={rooms}
          renderItem={renderRoomItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: Colors.light.text }]}>
              Select one or more rooms to include in the quotation.
            </Text>
          }
          refreshControl={ // Added RefreshControl
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchClientAndRooms}
              tintColor={Colors.light.primary}
            />
          }
        />
      ) : (
        <View style={[styles.centeredContainer, { flex: 1 }]}>
          <IconSymbol name="folder.badge.questionmark" size={60} color={Colors.light.subtext} style={{ marginBottom: 20 }} />
          <Text style={[styles.emptyTitle, { color: Colors.light.text }]}>No Rooms Available</Text>
          <Text style={[styles.emptyText, { color: Colors.light.subtext }]}>
            There are no rooms with "Active" status to generate a quotation for.
          </Text>
        </View>
      )}

      {rooms.length > 0 && (
        <View style={[styles.footer, { backgroundColor: Colors.light.cardBackground, borderTopColor: Colors.light.border }]}>
          <View style={styles.summary}>
            <Text style={[styles.summaryText, { color: Colors.light.text }]}>Selected: </Text>
            <Text style={[styles.summaryCount, { color: Colors.light.primary }]}>{selectedRoomIds.length} room(s)</Text>
          </View>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: Colors.light.primary, opacity: selectedRoomIds.length === 0 ? 0.5 : 1 }]}
            onPress={handleGenerateQuotation}
            disabled={selectedRoomIds.length === 0}
          >
            <Text style={styles.generateButtonText}>Preview Quotation</Text>
            <IconSymbol name="chevron.right" size={16} color={Colors.light.redText} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 150, // Space for footer
  },
  listHeader: {
    fontSize: 16,
    marginBottom: 20,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedRoomCard: {
    borderWidth: 2,
  },
  roomDetails: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  roomDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  roomStats: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 15,
  },
  roomStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30, // Safe area
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryText: {
    fontSize: 16,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
