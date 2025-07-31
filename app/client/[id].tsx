import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Client, Quotation, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = colorScheme === 'dark';

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

  const handleDeleteRoom = async (roomId: string) => {
    Alert.alert(
      'Delete Room',
      'Are you sure you want to delete this room? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);

              if (error) {
                Alert.alert('Error deleting room', error.message);
              } else {
                Alert.alert('Success', 'Room deleted successfully.');
                if (id) {
                  fetchClientData(id as string, true); // Refresh data
                }
              }
            } catch (error: any) {
              Alert.alert('An unexpected error occurred', error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        { backgroundColor: isDark ? '#374151' : '#ffffff' }
      ]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/room/[id]', params: { id: item.id } })}
    >
      <View style={styles.listItemHeader}>
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.status || '')]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(item.status || '') }]}>
            {item.status || 'N/A'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteRoom(item.id)} style={styles.deleteButton}>
          <IconSymbol size={16} name="trash.fill" color="#ef4444" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.listItemTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
        {item.room_type || 'Untitled Room'}
      </Text>
      <Text style={[styles.listItemDescription, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
        {item.description || 'No description available'}
      </Text>
      <Text style={[styles.listItemDate, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>
        Created {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <TouchableOpacity 
      style={[
        styles.listItem,
        { backgroundColor: isDark ? '#374151' : '#ffffff' }
      ]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/quotation/[id]', params: { id: item.id } })}
    >
      <View style={styles.listItemHeader}>
        <View style={[styles.priceBadge, { backgroundColor: isDark ? '#065f46' : '#d1fae5' }]}>
          <Text style={[styles.priceText, { color: isDark ? '#10b981' : '#065f46' }]}>
            ${item.total_price?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <IconSymbol 
          size={16} 
          name="chevron.right" 
          color={isDark ? '#9ca3af' : '#6b7280'} 
        />
      </View>
      <Text style={[styles.listItemTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
        Quotation #{item.id.substring(0, 8).toUpperCase()}
      </Text>
      <Text style={[styles.listItemDate, { color: isDark ? '#9ca3af' : '#9ca3af' }]}>
        Generated {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { backgroundColor: isDark ? '#065f46' : '#d1fae5' };
      case 'in progress':
        return { backgroundColor: isDark ? '#92400e' : '#fef3c7' };
      case 'not active':
        return { backgroundColor: isDark ? '#374151' : '#f3f4f6' };
      case 'in quotation':
        return { backgroundColor: isDark ? '#7c2d12' : '#fecaca' }; // New status for rooms in a quotation
      default:
        return { backgroundColor: isDark ? '#374151' : '#f3f4f6' };
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return isDark ? '#10b981' : '#065f46';
      case 'in progress':
        return isDark ? '#f59e0b' : '#92400e';
      case 'not active':
        return isDark ? '#9ca3af' : '#6b7280';
      case 'in quotation':
        return isDark ? '#ef4444' : '#dc2626'; // Text color for new status
      default:
        return isDark ? '#9ca3af' : '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
        <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
        <Text style={[styles.loadingText, { color: isDark ? '#e5e7eb' : '#6b7280' }]}>
          Loading client details...
        </Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
        <IconSymbol size={48} name="exclamationmark.triangle" color={isDark ? '#ef4444' : '#dc2626'} />
        <Text style={[styles.errorText, { color: isDark ? '#e5e7eb' : '#6b7280' }]}>
          Client not found
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#1f2937' : '#f9fafb'} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? '#60a5fa' : '#3b82f6']}
            tintColor={isDark ? '#60a5fa' : '#3b82f6'}
          />
        }
      >
        {/* Client Info Card */}
        <View style={[styles.clientCard, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.clientHeader}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.avatarText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: isDark ? '#f9fafb' : '#111827' }]}>
                {client.name}
              </Text>
              <Text style={[styles.clientId, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                ID: {client.id.substring(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.contactDetails}>
            {client.contact_number && (
              <View style={styles.contactItem}>
                <IconSymbol size={16} name="phone.fill" color={isDark ? '#60a5fa' : '#3b82f6'} />
                <Text style={[styles.contactText, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                  {client.contact_number}
                </Text>
              </View>
            )}
            
            {client.email && (
              <View style={styles.contactItem}>
                <IconSymbol size={16} name="envelope.fill" color={isDark ? '#60a5fa' : '#3b82f6'} />
                <Text style={[styles.contactText, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                  {client.email}
                </Text>
              </View>
            )}
            
            {client.address && (
              <View style={styles.contactItem}>
                <IconSymbol size={16} name="location.fill" color={isDark ? '#60a5fa' : '#3b82f6'} />
                <Text style={[styles.contactText, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                  {client.address}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }]}
            onPress={handleCreateRoom}
          >
            <IconSymbol size={20} name="plus.circle.fill" color="#ffffff" />
            <Text style={styles.primaryButtonText}>Create Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryButton, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
            onPress={handleGenerateQuotation}
          >
            <IconSymbol 
              size={20} 
              name="doc.text.fill" 
              color={isDark ? '#e5e7eb' : '#374151'} 
            />
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              Generate Quote
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
            <Text style={[styles.statNumber, { color: isDark ? '#60a5fa' : '#3b82f6' }]}>
              {rooms.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
              Rooms
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
            <Text style={[styles.statNumber, { color: isDark ? '#10b981' : '#059669' }]}>
              {quotations.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
              Quotations
            </Text>
          </View>
        </View>

        {/* Rooms Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Rooms
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.countText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {rooms.length}
              </Text>
            </View>
          </View>
          
          {rooms.length > 0 ? (
            <FlatList
              data={rooms}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="house" color={isDark ? '#6b7280' : '#9ca3af'} />
              <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                No rooms created yet
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                Create your first room to get started
              </Text>
            </View>
          )}
        </View>

        {/* Quotations Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Quotations
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.countText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {quotations.length}
              </Text>
            </View>
          </View>
          
          {quotations.length > 0 ? (
            <FlatList
              data={quotations}
              renderItem={renderQuotationItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="doc.text" color={isDark ? '#6b7280' : '#9ca3af'} />
              <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                No quotations generated yet
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                Generate your first quotation
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  clientCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  clientId: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactDetails: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  listItemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  listItemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
