import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

import { Client, Room } from '../../types/db';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clientProfile, setClientProfile] = useState<Client | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchRooms(userId);
    }
    setRefreshing(false);
  }, [userId]);

  const fetchRooms = async (currentUserId: string) => {
    try {
      setLoading(true);
      
      const { data: clientDataArray, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', currentUserId);

      if (clientError) {
        Alert.alert('Info', 'Failed to fetch client data: ' + clientError.message);
        setClientProfile(null);
        return;
      }

      if (!clientDataArray || clientDataArray.length === 0) {
        Alert.alert('Info', 'No client data found for this user.');
        setClientProfile(null);
        return;
      }

      if (clientDataArray.length > 1) {
        Alert.alert('Error', 'Multiple client records found for this user. Please contact support.');
        setClientProfile(null);
        return;
      }

      const clientData = clientDataArray[0];
      setClientProfile(clientData);

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to fetch rooms: ' + error.message);
      } else {
        setRooms(data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred while fetching rooms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUserAndFetchRooms = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserId(user.id);
        fetchRooms(user.id);
      } else {
        router.replace('/(auth)/login');
      }
    };

    checkUserAndFetchRooms();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
      } else if (session.user) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        fetchRooms(session.user.id);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchRooms(userId);
      }
    }, [userId])
  );

  if (userEmail === undefined || userId === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <ActivityIndicator size="large" color={isDark ? '#FFF' : '#000'} />
        <Text style={[styles.loadingText, { color: isDark ? '#FFF' : '#000' }]}>
          Loading...
        </Text>
      </View>
    );
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return isDark ? '#00FF88' : '#00CC6A';
      case 'Completed': return isDark ? '#88AAFF' : '#5577FF';
      case 'Not Active':
      default: return isDark ? '#FFAA44' : '#FF8800';
    }
  };

  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
      {/* Main Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => router.replace('/landing')} style={styles.logoButton}>
          <Image
            source={require('../../assets/images/jp_logo.png')}
            style={styles.logo}
          />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: isDark ? '#CCC' : '#666' }]}>
            {getTimeBasedGreeting()}
          </Text>
          <Text style={[styles.userName, { color: isDark ? '#FFF' : '#000' }]}>
            {clientProfile?.name || userEmail?.split('@')[0] || 'User'}
          </Text>
        </View>
        
        <TouchableOpacity style={[styles.avatarButton, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
          <Text style={[styles.avatarText, { color: isDark ? '#FFF' : '#000' }]}>
            {(clientProfile?.name || userEmail || 'U').charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={[styles.statsContainer, { backgroundColor: isDark ? '#111' : '#F8F8F8' }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? '#FFF' : '#000' }]}>
            {rooms.length}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#CCC' : '#666' }]}>
            Total
          </Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: isDark ? '#FFF' : '#000' }]}>
            {rooms.filter(r => r.status === 'Active').length}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? '#CCC' : '#666' }]}>
            Active
          </Text>
        </View>
      </View>

      {/* Client Info - Compact */}
      {clientProfile && (
        <View style={[styles.clientCard, { backgroundColor: isDark ? '#111' : '#F8F8F8' }]}>
          <View style={styles.clientHeader}>
            <IconSymbol name="person" size={16} color={isDark ? '#CCC' : '#666'} />
            <Text style={[styles.clientTitle, { color: isDark ? '#FFF' : '#000' }]}>
              Contact Information
            </Text>
          </View>
          
          <View style={styles.clientDetails}>
            {clientProfile.contact_number && (
              <View style={styles.clientDetailRow}>
                <IconSymbol name="phone" size={14} color={isDark ? '#888' : '#999'} />
                <Text style={[styles.clientDetailText, { color: isDark ? '#CCC' : '#666' }]}>
                  {clientProfile.contact_number}
                </Text>
              </View>
            )}
            
            {clientProfile.email && (
              <View style={styles.clientDetailRow}>
                <IconSymbol name="envelope" size={14} color={isDark ? '#888' : '#999'} />
                <Text style={[styles.clientDetailText, { color: isDark ? '#CCC' : '#666' }]}>
                  {clientProfile.email}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>
          Your Rooms
        </Text>
        <Text style={[styles.roomCount, { color: isDark ? '#CCC' : '#666' }]}>
          {rooms.length} room{rooms.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  const renderRoomItem = ({ item }: { item: Room }) => {
    const statusColor = getStatusColor(item.status || 'Not Active');
    
    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          { 
            backgroundColor: isDark ? '#111' : '#FFF',
            borderColor: isDark ? '#222' : '#EEE'
          }
        ]}
        onPress={() => router.push(`/room/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.roomContent}>
          <View style={styles.roomHeader}>
            <Text style={[styles.roomTitle, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>
              {item.room_type || 'Unnamed Room'}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          
          <Text style={[styles.roomDescription, { color: isDark ? '#CCC' : '#666' }]} numberOfLines={2}>
            {item.description || 'No description available'}
          </Text>
          
          <View style={styles.roomFooter}>
            <Text style={[styles.roomSize, { color: isDark ? '#888' : '#999' }]}>
              {item.total_sq_ft ? `${item.total_sq_ft} sq ft` : 'No size data'}
            </Text>
            <Text style={[styles.roomStatus, { color: statusColor }]}>
              {item.status || 'Not Active'}
            </Text>
          </View>
        </View>
        
        <IconSymbol name="chevron.right" size={16} color={isDark ? '#444' : '#CCC'} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#222' : '#F5F5F5' }]}>
        <IconSymbol name="house" size={32} color={isDark ? '#666' : '#CCC'} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? '#FFF' : '#000' }]}>
        No rooms yet
      </Text>
      <Text style={[styles.emptyMessage, { color: isDark ? '#CCC' : '#666' }]}>
        Your rooms will appear here once they are created
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#000' : '#FFF'}
      />
      
      <FlatList
        data={rooms}
        renderItem={renderRoomItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={rooms.length === 0 && !loading ? renderEmptyState : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#FFF' : '#000'}
            colors={[isDark ? '#FFF' : '#000']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  clientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  clientDetails: {
    gap: 8,
  },
  clientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientDetailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  roomCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  roomContent: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  roomDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
    lineHeight: 18,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomSize: {
    fontSize: 12,
    fontWeight: '500',
  },
  roomStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoButton: {
    marginRight: 10,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});
