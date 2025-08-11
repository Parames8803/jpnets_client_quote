import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Client, Quotation, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

const { width } = Dimensions.get('window');

const QUOTATION_STATUSES = ['Not Active', 'Active', 'Closed'];

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedQuotationForStatus, setSelectedQuotationForStatus] = useState<Quotation | null>(null);
  const [newQuotationStatus, setNewQuotationStatus] = useState<string>('');

  const fetchClientData = async (clientId: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (id) {
      fetchClientData(id as string, true);
    }
  };

  useEffect(() => {
    if (id) {
      fetchClientData(id as string);
    }
  }, [id]);

  const handleCreateRoom = () => {
    router.push({ pathname: '/create-room', params: { clientId: client?.id } });
  };

  const handleGenerateQuotation = () => {
    router.push({ pathname: '/client/generate-quotation', params: { clientId: client?.id } });
  };

  const handleEditClient = () => {
    router.push({ pathname: '/edit-client', params: { id: client?.id } });
  };

  const handleOpenMap = () => {
    if (client && client.latitude !== null && client.longitude !== null) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${client.latitude},${client.longitude}`;
      const label = 'Client Location';
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      if (url) {
        Linking.openURL(url).catch(err => console.error('An error occurred', err));
      }
    } else {
      Alert.alert('No Location', 'Latitude and Longitude not available.');
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('rooms').delete().eq('id', roomId);
            if (error) {
              Alert.alert('Error deleting room', error.message);
            } else {
              Alert.alert('Success', 'Room deleted successfully.');
              onRefresh();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteQuotation = (quotationId: string) => {
    Alert.alert(
      'Delete Quotation',
      'Are you sure you want to delete this quotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Simplified deletion logic for clarity
            const { error } = await supabase.from('quotations').delete().eq('id', quotationId);
            if (error) {
              Alert.alert('Error deleting quotation', error.message);
            } else {
              Alert.alert('Success', 'Quotation deleted successfully.');
              onRefresh();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateQuotationStatus = async () => {
    if (!selectedQuotationForStatus || !newQuotationStatus) return;

    const { error } = await supabase
      .from('quotations')
      .update({ status: newQuotationStatus })
      .eq('id', selectedQuotationForStatus.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Status updated.');
      setIsStatusModalVisible(false);
      onRefresh();
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: { [key: string]: any } = {
      'Not Active': {
        backgroundColor: isDark ? '#4A5568' : '#E2E8F0',
        textColor: isDark ? '#E2E8F0' : '#4A5568',
      },
      'Active': {
        backgroundColor: isDark ? '#2F855A' : '#C6F6D5',
        textColor: isDark ? '#C6F6D5' : '#2F855A',
      },
      'Closed': {
        backgroundColor: isDark ? '#C53030' : '#FED7D7',
        textColor: isDark ? '#FED7D7' : '#C53030',
      },
    };
    return styles[status] || styles['Not Active'];
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}
      onPress={() => router.push({ pathname: '/room/[id]', params: { id: item.id } })}
    >
      <View>
        <Text style={[styles.listItemTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.room_type}</Text>
        <Text style={[styles.listItemSubtitle, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
          {item.description || 'No description'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteRoom(item.id)} style={styles.deleteButton}>
        <Text style={{ color: Colors.light.red, fontSize: 18 }}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderQuotationItem = ({ item }: { item: Quotation }) => {
    const statusStyle = getStatusStyle(item.status || 'Not Active');
    return (
      <TouchableOpacity
        style={[styles.listItem, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}
        onPress={() => router.push({ pathname: '/quotation/[id]', params: { id: item.id } })}
      >
        <View>
          <Text style={[styles.listItemTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Quotation #{item.id.substring(0, 6)}</Text>
          <Text style={[styles.listItemPrice, { color: isDark ? Colors.dark.primary : Colors.light.primary }]}>
            ${item.total_price?.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}
          onPress={() => {
            setSelectedQuotationForStatus(item);
            setNewQuotationStatus(item.status || 'Not Active');
            setIsStatusModalVisible(true);
          }}
        >
          <Text style={[styles.statusText, { color: statusStyle.textColor }]}>{item.status}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading Client...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>Client not found.</Text>
      </View>
    );
  }

  const totalValue = quotations.reduce((sum, q) => sum + (q.total_price || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? Colors.dark.background : Colors.light.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientContact}>{client.email}</Text>
            <TouchableOpacity onPress={handleEditClient} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#3E4C59' : '#EBF4FF' }]}>
            <Text style={[styles.statNumber, { color: isDark ? '#BEE3F8' : '#3182CE' }]}>{rooms.length}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Rooms</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#4A5568' : '#F0FFF4' }]}>
            <Text style={[styles.statNumber, { color: isDark ? '#9AE6B4' : '#38A169' }]}>{quotations.length}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Quotes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#5A6778' : '#FFFAF0' }]}>
            <Text style={[styles.statNumber, { color: isDark ? '#F6E05E' : '#D69E2E' }]}>${totalValue.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#A0AEC0' : '#718096' }]}>Total Value</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Rooms</Text>
          {rooms.length > 0 ? (
            <FlatList data={rooms} renderItem={renderRoomItem} keyExtractor={item => item.id} scrollEnabled={false} />
          ) : (
            <Text style={styles.emptyText}>No rooms yet. Add one to get started.</Text>
          )}
          <TouchableOpacity style={styles.addButton} onPress={handleCreateRoom}>
            <Text style={styles.addButtonText}>+ Add Room</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Quotations</Text>
          {quotations.length > 0 ? (
            <FlatList data={quotations} renderItem={renderQuotationItem} keyExtractor={item => item.id} scrollEnabled={false} />
          ) : (
            <Text style={styles.emptyText}>No quotations available.</Text>
          )}
          <TouchableOpacity style={styles.addButton} onPress={handleGenerateQuotation}>
            <Text style={styles.addButtonText}>+ Generate Quotation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isStatusModalVisible && (
        <Modal
          visible={isStatusModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStatusModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#2D3748' : '#FFFFFF' }]}>
              <TouchableOpacity onPress={() => setIsStatusModalVisible(false)} style={styles.closeButton}>
                          <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                        </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Update Status</Text>
              <View style={styles.statusOptionsContainer}>
                {QUOTATION_STATUSES.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: newQuotationStatus === status ? (isDark ? Colors.dark.primary : Colors.light.primary) : 'transparent',
                        borderColor: isDark ? Colors.dark.border : Colors.light.border,
                      },
                    ]}
                    onPress={() => setNewQuotationStatus(status)}
                  >
                    <Text style={{ color: newQuotationStatus === status ? '#FFF' : (isDark ? Colors.dark.text : Colors.light.text) }}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateQuotationStatus}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#3182CE',
    padding: 20,
    paddingTop: 50,
  },
  headerContent: {
    alignItems: 'center',
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  clientContact: {
    fontSize: 16,
    color: '#EBF4FF',
    marginTop: 4,
  },
  editButton: {
    margin: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  editButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: -30,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  listItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  deleteButton: {
    padding: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#A0AEC0',
    marginTop: 20,
  },
  addButton: {
    backgroundColor: '#3182CE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#3182CE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});