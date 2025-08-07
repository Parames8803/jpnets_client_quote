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
import { Modal, TextInput } from 'react-native'; // Import Modal and TextInput

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

  const handleDeleteQuotation = async (quotationId: string) => {
    Alert.alert(
      'Delete Quotation',
      'Are you sure you want to delete this quotation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
                      setLoading(true);
                      try {
                        // Get room IDs associated with this quotation
                        const { data: quotationRooms, error: fetchQrError } = await supabase
                          .from('quotation_rooms')
                          .select('room_id')
                          .eq('quotation_id', quotationId);
          
                        if (fetchQrError) {
                          console.error('Error fetching associated rooms for deletion:', fetchQrError.message);
                          Alert.alert('Error', 'Failed to fetch associated rooms.');
                          setLoading(false);
                          return;
                        }
          
                        const roomIdsToUpdate = quotationRooms?.map(qr => qr.room_id) || [];
          
                        // Delete entries from quotation_rooms table
                        const { error: deleteQrError } = await supabase
                          .from('quotation_rooms')
                          .delete()
                          .eq('quotation_id', quotationId);
          
                        if (deleteQrError) {
                          console.error('Error deleting quotation rooms:', deleteQrError.message);
                          Alert.alert('Error', 'Failed to delete associated rooms from quotation.');
                          setLoading(false);
                          return;
                        }
          
                        // Delete the quotation itself
                        const { error: deleteQuotationError } = await supabase
                          .from('quotations')
                          .delete()
                          .eq('id', quotationId);
          
                        if (deleteQuotationError) {
                          console.error('Error deleting quotation:', deleteQuotationError.message);
                          Alert.alert('Error', 'Failed to delete quotation.');
                          setLoading(false);
                          return;
                        }
          
                        // Update status of associated rooms back to 'Not Active'
                        if (roomIdsToUpdate.length > 0) {
                          const { error: updateRoomsError } = await supabase
                            .from('rooms')
                            .update({ status: 'Not Active' })
                            .in('id', roomIdsToUpdate);
          
                          if (updateRoomsError) {
                            console.error('Error updating room statuses after quotation deletion:', updateRoomsError.message);
                            Alert.alert('Warning', 'Quotation deleted, but failed to revert room statuses.');
                          }
                        }
          
                        Alert.alert('Success', 'Quotation and associated rooms deleted successfully!');
                        if (client?.id) {
                          router.replace({ pathname: '/client/[id]', params: { id: client.id } }); // Navigate back to client details
                        } else {
                          router.replace('/clients'); // Navigate to generic clients list if client ID is not available
                        }
                      } catch (error: any) {
                        Alert.alert('An unexpected error occurred', error.message);
                      } finally {
                        setLoading(false);
                      }
                    },
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateQuotationStatus = async () => {
    if (!selectedQuotationForStatus || !newQuotationStatus) {
      Alert.alert('Error', 'Please select a quotation and a status.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newQuotationStatus })
        .eq('id', selectedQuotationForStatus.id);

      if (error) {
        Alert.alert('Error updating quotation status', error.message);
      } else {
        Alert.alert('Success', 'Quotation status updated successfully!');
        setIsStatusModalVisible(false);
        setSelectedQuotationForStatus(null);
        setNewQuotationStatus('');
        if (id) {
          fetchClientData(id as string, true); // Refresh data
        }
      }
    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        {
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        },
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
          <IconSymbol size={18} name="trash.fill" color={Colors[colorScheme ?? 'light'].red} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.listItemTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {item.room_type || 'Untitled Room'}
      </Text>
      <Text style={[styles.listItemDescription, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        {item.description || 'No description available'}
      </Text>
      <View style={styles.listItemFooter}>
        <Text style={[styles.listItemDate, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Created {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <IconSymbol
          size={16}
          name="chevron.right"
          color={isDark ? Colors.dark.secondary : Colors.light.secondary}
        />
      </View>
    </TouchableOpacity>
  );

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        {
          backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      ]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/quotation/[id]', params: { id: item.id } })}
    >
      <View style={styles.listItemHeader}>
      <View style={[styles.priceBadge, { backgroundColor: isDark ? Colors.dark.success : Colors.light.success }]}>
        <Text style={[styles.priceText, { color: isDark ? Colors.dark.successText : Colors.light.successText }]}>
          ${item.total_price?.toFixed(2) || '0.00'}
        </Text>
      </View>
        <View style={styles.quotationActions}>
          <TouchableOpacity 
            onPress={() => {
              setSelectedQuotationForStatus(item);
              setNewQuotationStatus(item.status || 'Not Active');
              setIsStatusModalVisible(true);
            }} 
            style={styles.editStatusButton}
          >
            <IconSymbol size={18} name="pencil" color={isDark ? Colors.dark.text : Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteQuotation(item.id)} style={styles.deleteButton}>
            <IconSymbol size={18} name="trash.fill" color={Colors[colorScheme ?? 'light'].red} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.listItemTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Quotation #{item.id.substring(0, 8).toUpperCase()}
      </Text>
      <View style={styles.listItemFooter}>
        <Text style={[styles.listItemDate, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Generated {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={[styles.quotationStatus, getStatusBadgeStyle(item.status || '')]}>
          <Text style={[styles.quotationStatusText, { color: getStatusTextColor(item.status || '') }]}>
            {item.status || 'N/A'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusBadgeStyle = (status: string) => {
    const colors = isDark ? Colors.dark : Colors.light;
    switch (status?.toLowerCase()) {
      case 'completed':
        return { backgroundColor: colors.success };
      case 'in progress':
        return { backgroundColor: colors.warning };
      case 'not active':
        return { backgroundColor: colors.secondaryBackground };
      case 'in quotation':
        return { backgroundColor: colors.info };
      default:
        return { backgroundColor: colors.secondaryBackground };
    }
  };

  const getStatusTextColor = (status: string) => {
    const colors = isDark ? Colors.dark : Colors.light;
    switch (status?.toLowerCase()) {
      case 'completed':
        return colors.successText;
      case 'in progress':
        return colors.warningText;
      case 'not active':
        return colors.secondaryText;
      case 'in quotation':
        return colors.infoText;
      default:
        return colors.secondaryText;
    }
  };

  const getQuotationStatusBadgeStyle = (status: string) => {
    const colors = isDark ? Colors.dark : Colors.light;
    switch (status?.toLowerCase()) {
      case 'active':
        return { backgroundColor: colors.success };
      case 'closed':
        return { backgroundColor: colors.red };
      case 'not active':
        return { backgroundColor: colors.secondaryBackground };
      case 'assigned':
        return { backgroundColor: colors.info };
      case 'in progress':
        return { backgroundColor: colors.warning };
      case 'completed':
        return { backgroundColor: colors.success };
      default:
        return { backgroundColor: colors.secondaryBackground };
    }
  };

  const getQuotationStatusTextColor = (status: string) => {
    const colors = isDark ? Colors.dark : Colors.light;
    switch (status?.toLowerCase()) {
      case 'active':
        return colors.successText;
      case 'closed':
        return colors.redText;
      case 'not active':
        return colors.secondaryText;
      case 'assigned':
        return colors.infoText;
      case 'in progress':
        return colors.warningText;
      case 'completed':
        return colors.successText;
      default:
        return colors.secondaryText;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Loading client details...
          </Text>
        </View>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <View style={[styles.errorCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <IconSymbol size={64} name="exclamationmark.triangle" color={Colors[colorScheme ?? 'light'].red} />
          <Text style={[styles.errorTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Client Not Found
          </Text>
          <Text style={[styles.errorText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            The client you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}
            onPress={() => router.back()}
          >
            <IconSymbol size={20} name="chevron.left" color={isDark ? Colors.dark.text : Colors.light.text} />
            <Text style={[styles.retryButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalValue = quotations.reduce((sum, q) => sum + (q.total_price || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? Colors.dark.background : Colors.light.secondaryBackground} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? Colors.dark.primary : Colors.light.primary]}
            tintColor={isDark ? Colors.dark.primary : Colors.light.primary}
          />
        }
      >
        {/* Header with gradient background */}
          {/* Client Info Card */}
          <View style={[
                  styles.clientCard,
                  { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
                  { borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}>
            <View style={styles.clientHeader}>
              <View style={[
                styles.avatarPlaceholder, 
                { 
                  backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  shadowColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }
              ]}>
                <Text style={styles.avatarText}>
                  {client.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  {client.name}
                </Text>
                <Text style={[styles.clientId, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                  ID: {client.id.substring(0, 8).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: isDark ? Colors.dark.secondaryBackground : Colors.light.buttonBackground }]}
                onPress={handleEditClient}
              >
                <IconSymbol size={18} name="pencil" color={isDark ? Colors.dark.text : Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contactDetails}>
              {client.contact_number && (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: isDark ? Colors.dark.info : Colors.light.info }]}>
                    <IconSymbol size={16} name="phone.fill" color={isDark ? Colors.dark.infoText : Colors.light.infoText} />
                  </View>
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {client.contact_number}
                  </Text>
                </View>
              )}
              
              {client.email && (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: isDark ? Colors.dark.info : Colors.light.info }]}>
                    <IconSymbol size={16} name="envelope.fill" color={isDark ? Colors.dark.infoText : Colors.light.infoText} />
                  </View>
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {client.email}
                  </Text>
                </View>
              )}
              
              {client.address && (
                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: isDark ? Colors.dark.info : Colors.light.info }]}>
                    <IconSymbol size={16} name="location.fill" color={isDark ? Colors.dark.infoText : Colors.light.infoText} />
                  </View>
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {client.address}
                  </Text>
                </View>
              )}
              
              {client.latitude != null && client.longitude != null && (
                <TouchableOpacity style={styles.contactItem} onPress={handleOpenMap} activeOpacity={0.7}>
                  <View style={[styles.contactIcon, { backgroundColor: isDark ? Colors.dark.success : Colors.light.success }]}>
                    <IconSymbol size={16} name="location.fill" color={isDark ? Colors.dark.successText : Colors.light.successText} />
                  </View>
                  <View>
                    <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                      Lat: {client.latitude.toFixed(4)}, Lon: {client.longitude.toFixed(4)}
                    </Text>
                    <Text style={[styles.coordinatesHint, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                      Tap to open in maps
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

        {/* Stats Cards with enhanced design */}
        <View style={styles.statsContainer}>
          <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
                  { borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? Colors.dark.info : Colors.light.info }]}>
              <IconSymbol size={24} name="house.fill" color={isDark ? Colors.dark.infoText : Colors.light.infoText} />
            </View>
            <Text style={[styles.statNumber, { color: isDark ? Colors.dark.infoText : Colors.light.infoText }]}>
              {rooms.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
              Rooms
            </Text>
          </View>
          
          <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
                  { borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? Colors.dark.success : Colors.light.success }]}>
              <IconSymbol size={24} name="doc.text.fill" color={isDark ? Colors.dark.successText : Colors.light.successText} />
            </View>
            <Text style={[styles.statNumber, { color: isDark ? Colors.dark.successText : Colors.light.successText }]}>
              {quotations.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
              Quotations
            </Text>
          </View>

          <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
                  { borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? Colors.dark.warning : Colors.light.warning }]}>
              <IconSymbol size={24} name="dollarsign.circle.fill" color={isDark ? Colors.dark.warningText : Colors.light.warningText} />
            </View>
            <Text style={[styles.statNumber, { color: isDark ? Colors.dark.warningText : Colors.light.warningText }]}>
              ${totalValue.toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
              Total Value
            </Text>
          </View>
        </View>

        {/* Action Buttons with enhanced styling */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}
            onPress={handleCreateRoom}
          >
            <IconSymbol size={20} name="plus.circle.fill" color={isDark ? Colors.dark.text : Colors.light.background} />
            <Text style={styles.primaryButtonText}>Create Room</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
                      style={[styles.secondaryButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
                      onPress={handleGenerateQuotation}
                      activeOpacity={0.8}
                    >
            <IconSymbol 
              size={20} 
              name="doc.text.fill"
              color={isDark ? Colors.dark.text : Colors.light.text} 
            />
            <Text style={[styles.secondaryButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              Generate Quote
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rooms Section */}
        <View style={[styles.section, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconSymbol size={20} name="house.fill" color={isDark ? Colors.dark.infoText : Colors.light.infoText} />
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Rooms
              </Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: isDark ? Colors.dark.secondaryBackground : Colors.light.buttonBackground }]}>
              <Text style={[styles.countText, { color: isDark ? Colors.dark.text : Colors.light.secondaryText }]}>
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
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? Colors.dark.secondaryBackground : Colors.light.secondaryBackground }]}>
                <IconSymbol size={32} name="house" color={isDark ? Colors.light.secondaryText : Colors.dark.secondaryText} />
              </View>
              <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                No rooms created yet
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? Colors.light.secondaryText : Colors.dark.secondaryText }]}>
                Create your first room to get started
              </Text>
            </View>
          )}
        </View>

        {/* Quotations Section */}
        <View style={[styles.section, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconSymbol size={20} name="doc.text.fill" color={isDark ? Colors.dark.successText : Colors.light.successText} />
              <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Quotations
              </Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: isDark ? Colors.dark.secondaryBackground : Colors.light.buttonBackground }]}>
              <Text style={[styles.countText, { color: isDark ? Colors.dark.text : Colors.light.secondaryText }]}>
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
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? Colors.dark.secondaryBackground : Colors.light.secondaryBackground }]}>
                <IconSymbol size={32} name="doc.text" color={isDark ? Colors.light.secondaryText : Colors.dark.secondaryText} />
              </View>
              <Text style={[styles.emptyText, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                No quotations generated yet
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? Colors.light.secondaryText : Colors.dark.secondaryText }]}>
                Generate your first quotation
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isStatusModalVisible && selectedQuotationForStatus && (
        <Modal visible={isStatusModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Update Quotation Status
                </Text>
                <TouchableOpacity onPress={() => setIsStatusModalVisible(false)} style={styles.closeButton}>
                  <IconSymbol name="xmark" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.quotationIdInModal, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Quotation ID: {selectedQuotationForStatus.id.substring(0, 8).toUpperCase()}
              </Text>
              <Text style={[styles.currentStatusInModal, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                Current Status: {selectedQuotationForStatus.status || 'N/A'}
              </Text>

              <View style={styles.statusOptionsContainer}>
                {QUOTATION_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      { borderColor: isDark ? Colors.dark.border : Colors.light.border },
                      newQuotationStatus === status && { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary },
                    ]}
                    onPress={() => setNewQuotationStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      newQuotationStatus === status ? { color: isDark ? Colors.dark.text : Colors.light.background } : { color: isDark ? Colors.dark.text : Colors.light.text },
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
                  onPress={() => setIsStatusModalVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
                  onPress={handleUpdateQuotationStatus}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingHorizontal: 20,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: width * 0.8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: width * 0.9,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSection: {
    marginBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  clientCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  clientId: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 12,
    borderRadius: 12,
  },
  contactDetails: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
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
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listItem: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
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
    marginBottom: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  listItemDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  listItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  quotationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editStatusButton: {
    padding: 8,
    borderRadius: 8,
  },
  quotationStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotationStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  quotationIdInModal: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  currentStatusInModal: {
    fontSize: 14,
    marginBottom: 20,
  },
  statusOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  coordinatesHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
