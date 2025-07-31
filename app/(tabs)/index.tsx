import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

// Assuming these are correctly configured
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { Client } from '../../types/db';

const { width } = Dimensions.get('window'); // Get screen width for responsive design

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null); // Store user ID
  const colorScheme = useColorScheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchClients(userId);
    }
    setRefreshing(false);
  }, [userId]);

  const fetchClients = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Error', 'Failed to fetch clients: ' + error.message);
      } else {
        setClients(data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', 'An unexpected error occurred while fetching clients: ' + error.message);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    Alert.alert(
      "Delete Client",
      "Are you sure you want to delete this client? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

              if (error) {
                Alert.alert('Error', 'Failed to delete client: ' + error.message);
              } else {
                setClients(clients.filter((client) => client.id !== clientId));
                Alert.alert('Success', 'Client deleted successfully.');
              }
            } catch (error: any) {
              Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  // --- User Authentication & Data Fetching Logic ---
  useEffect(() => {
    const checkUserAndFetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserId(user.id);
        fetchClients(user.id);
      } else {
        router.replace('/auth/login');
      }
    };

    checkUserAndFetchClients(); // Initial fetch

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/auth/login');
      } else if (session.user) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        fetchClients(session.user.id);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchClients(userId);
      }
    }, [userId])
  );

  if (userEmail === undefined || userId === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  const handleCreateNewClient = () => {
    router.push('/create-client');
  };

  const handleExportClients = () => {
    Alert.alert('Export Clients', 'Functionality to export client data will be implemented here.');
  };

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientItem}
      onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })} // Example: Navigate to client details
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientDetail}>📞 {item.contact_number}</Text>
        <Text style={styles.clientDetail}>📧 {item.email}</Text>
        <Text style={styles.clientAddress}>📍 {item.address}</Text>
        <Text style={styles.clientDate}>Added: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.clientActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/edit-client', params: { id: item.id } }); }}
        >
          <IconSymbol size={22} name="pencil.circle.fill" color={Colors[colorScheme ?? 'light'].primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => { e.stopPropagation(); handleDeleteClient(item.id); }}
        >
          <IconSymbol size={22} name="trash.fill" color={Colors.red} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollViewContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors[colorScheme ?? 'light'].tint} />
      }
    >
      {/* Header with Welcome and optional User Icon */}
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Welcome, {userEmail?.split('@')[0] || 'User'}!</Text>
        <IconSymbol size={30} name="person.circle.fill" color={Colors[colorScheme ?? 'light'].text} />
      </View>

      {/* Top Action Buttons as Refined Cards */}
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.actionCard} onPress={handleCreateNewClient}>
          <IconSymbol size={30} name="plus.circle.fill" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.actionCardText}>New Client</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={handleExportClients}>
          <IconSymbol size={30} name="square.and.arrow.up.fill" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.actionCardText}>Export Data</Text>
        </TouchableOpacity>
      </View>

      {/* Dashboard Stats Grid */}
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <IconSymbol size={35} name="person.3.fill" color={Colors[colorScheme ?? 'light'].cardIcon} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Total Clients</Text>
          <Text style={styles.cardValue}>{clients.length}</Text>
        </View>
        <View style={styles.dashboardCard}>
          <IconSymbol size={35} name="checklist.unchecked" color={Colors[colorScheme ?? 'light'].cardIcon} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Active Projects</Text>
          <Text style={styles.cardValue}>25</Text>
        </View>
        <View style={styles.dashboardCard}>
          <IconSymbol size={35} name="doc.text.fill" color={Colors[colorScheme ?? 'light'].cardIcon} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Pending Quotes</Text>
          <Text style={styles.cardValue}>12</Text>
        </View>
        <View style={styles.dashboardCard}>
          <IconSymbol size={35} name="checkmark.seal.fill" color={Colors[colorScheme ?? 'light'].cardIcon} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Completed Projects</Text>
          <Text style={styles.cardValue}>100</Text>
        </View>
      </View>

      {/* Clients List */}
      <Text style={styles.sectionTitle}>Your Clients</Text>
      {clients.length > 0 ? (
        <FlatList
          data={clients}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false} // Disable FlatList's own scrolling as it's inside ScrollView
          contentContainerStyle={styles.flatListContent} // Renamed for clarity
          initialNumToRender={10}
          windowSize={21}
        />
      ) : (
        <View style={styles.noClientsContainer}>
          <Text style={styles.noClientsText}>No clients found. Tap "New Client" to add one!</Text>
          <IconSymbol size={60} name="person.crop.circle.badge.plus" color={Colors[colorScheme ?? 'light'].tint} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC', // Consistent light background
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 30, // Extra padding at the bottom for better scroll experience
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 10,
  },
  welcomeTitle: {
    fontSize: 28, // Slightly larger
    fontWeight: '700', // Bolder
    color: '#2C3E50', // Darker text for more impact
    flexShrink: 1, // Allow text to shrink if icon is large
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25, // More space
    gap: 12, // Reduced gap slightly to fit better
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, // More rounded corners
    paddingVertical: 20, // More padding
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // Deeper shadow
    shadowOpacity: 0.1, // Slightly more opaque
    shadowRadius: 10, // Larger radius
    elevation: 8,
  },
  actionCardText: {
    marginTop: 10, // More space
    fontSize: 15, // Slightly larger
    fontWeight: '700', // Bolder
    color: '#34495E', // Darker text
    textAlign: 'center',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30, // More space
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    width: (width - 45) / 2, // (screen_width - padding*2 - gap) / 2
    height: (width - 45) / 2 * 0.85, // Slightly taller rectangle
    borderRadius: 18, // More rounded corners
    padding: 15,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // Deeper shadow
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative', // For icon positioning
    overflow: 'hidden', // Ensure icon doesn't spill
  },
  cardIcon: {
    position: 'absolute', // Position icon
    top: 10,
    right: 10,
    opacity: 0.2, // Subtle icon
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667788', // Softer grey
    marginBottom: 5,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 34, // Larger
    fontWeight: '800', // Even bolder
    color: Colors.light.tint,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22, // Larger
    fontWeight: '700', // Bolder
    color: '#2C3E50', // Darker text
    alignSelf: 'flex-start',
    marginBottom: 18, // More space
    paddingHorizontal: 5,
  },
  flatListContent: {
    // No specific padding, handled by scrollViewContent
  },
  clientItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15, // Slightly more rounded
    padding: 18, // More padding
    marginBottom: 15, // More space between items
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Deeper shadow
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 6, // Thicker border
    borderLeftColor: Colors.light.tint, // Accent color
  },
  clientInfo: {
    flex: 1,
    paddingRight: 15, // More space from actions
  },
  clientName: {
    fontSize: 20, // Larger
    fontWeight: '700', // Bolder
    color: '#34495E', // Darker text
    marginBottom: 6,
  },
  clientDetail: {
    fontSize: 15, // Slightly larger
    color: '#556677', // Softer grey
    lineHeight: 24, // More line height
  },
  clientAddress: {
    fontSize: 14,
    color: '#778899',
    lineHeight: 20,
    marginTop: 5,
  },
  clientDate: {
    fontSize: 12,
    color: '#99AABB',
    marginTop: 10,
    fontStyle: 'italic',
  },
  clientActions: {
    flexDirection: 'column', // Stack buttons vertically
    gap: 10, // Space between action buttons
  },
  actionButton: {
    padding: 10, // More padding
    borderRadius: 10, // More rounded for action buttons
    backgroundColor: '#F0F4F7', // Light background for individual action buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  noClientsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40, // More padding
    marginTop: 60, // More top margin
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 15, // Center the container
  },
  noClientsText: {
    fontSize: 19, // Larger
    color: '#778899', // Softer grey
    textAlign: 'center',
    marginBottom: 25, // More space
    fontWeight: '600',
  },
});
