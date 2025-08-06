import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchRooms(userId);
    }
    setRefreshing(false);
  }, [userId]);

  const fetchRooms = async (currentUserId: string) => {
    try {
      // First, fetch the client data for the current user
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
      setClientProfile(clientData); // Set the client profile state

      // Now fetch rooms using the client's ID
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
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading...</Text>
      </View>
    );
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Active':
        return { backgroundColor: '#10B981', color: '#FFFFFF' };
      case 'Completed':
        return { backgroundColor: '#6366F1', color: '#FFFFFF' };
      case 'Not Active':
      default:
        return { backgroundColor: '#F59E0B', color: '#FFFFFF' };
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => {
    const statusStyle = getStatusBadgeStyle(item.status || 'Not Active');
    return (
      <TouchableOpacity
        style={[
          styles.roomCard,
          { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
          { borderColor: isDark ? Colors.dark.border : Colors.light.border },
        ]}
        onPress={() => router.push(`/room/${item.id}` as any)}
      >
        <View style={styles.roomDetails}>
          <View style={styles.roomHeader}>
            <Text style={[styles.roomType, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              {item.room_type || 'Unnamed Room'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {item.status || 'Not Active'}
              </Text>
            </View>
          </View>
          <Text style={[styles.roomDescription, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {item.description || 'No description available'}
          </Text>
          <Text style={[styles.roomSqFt, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {item.total_sq_ft ? `${item.total_sq_ft} sq ft` : 'No measurements'}
          </Text>
        </View>
        <IconSymbol size={20} name="chevron.right" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? Colors.dark.background : Colors.light.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? Colors.dark.text : Colors.light.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Good morning</Text>
            <Text style={[styles.userName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              {userEmail?.split('@')[0] || 'User'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.profileButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}>
              <IconSymbol size={24} name="person.circle.fill" color={isDark ? Colors.dark.primary : Colors.light.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Client Profile Information */}
        {clientProfile && (
          <View style={[
            styles.clientProfileCard,
            { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
            { borderColor: isDark ? Colors.dark.border : Colors.light.border },
          ]}>
            <View style={styles.profileHeader}>
              <View style={[
                styles.avatarPlaceholder,
                { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }
              ]}>
                <Text style={styles.avatarText}>
                  {clientProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  {clientProfile.name}
                </Text>
                <Text style={[styles.profileId, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
                  ID: {clientProfile.id.substring(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.contactDetails}>
              {clientProfile.contact_number && (
                <View style={styles.contactItem}>
                  <IconSymbol size={18} name="phone.fill" color={isDark ? Colors.dark.secondaryText : Colors.light.secondaryText} />
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {clientProfile.contact_number}
                  </Text>
                </View>
              )}
              
              {clientProfile.email && (
                <View style={styles.contactItem}>
                  <IconSymbol size={18} name="envelope.fill" color={isDark ? Colors.dark.secondaryText : Colors.light.secondaryText} />
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {clientProfile.email}
                  </Text>
                </View>
              )}
              
              {clientProfile.address && (
                <View style={styles.contactItem}>
                  <IconSymbol size={18} name="location.fill" color={isDark ? Colors.dark.secondaryText : Colors.light.secondaryText} />
                  <Text style={[styles.contactText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    {clientProfile.address}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rooms List */}
        <View style={styles.roomsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Your Rooms</Text>
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <View key={room.id}>
                {renderRoomItem({ item: room })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
                <IconSymbol size={48} name="house" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>No rooms yet</Text>
              <Text style={[styles.emptyMessage, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
                Your rooms will appear here once they are created
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
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientProfileCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileHeader: {
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
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  contactDetails: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '500',
  },
  roomsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  roomDetails: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomType: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
  roomSqFt: {
    fontSize: 12,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
