import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CustomHeader } from '@/components/ui/CustomHeader';

import { Client } from '../../types/db';

const { width, height } = Dimensions.get('window');

export default function ClientsScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

    checkUserAndFetchClients();

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
        <Text style={styles.loadingText}>Loading...</Text>
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
      style={styles.clientCard}
      onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.avatarText}>
            {item.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
        </View>
        <View style={styles.clientActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => { 
              e.stopPropagation(); 
              router.push({ pathname: '/edit-client', params: { id: item.id } }); 
            }}
          >
            <IconSymbol size={18} name="pencil" color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => { 
              e.stopPropagation(); 
              handleDeleteClient(item.id); 
            }}
          >
            <IconSymbol size={18} name="trash.fill" color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.clientDetails}>
        <Text style={styles.clientPhone}>{item.contact_number}</Text>
        <Text style={styles.clientAddress} numberOfLines={2}>{item.address}</Text>
        <Text style={styles.clientDate}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.primaryAction} 
            onPress={handleCreateNewClient}
            activeOpacity={0.8}
          >
            <IconSymbol size={20} name="plus.circle.fill" color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Add Client</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryAction} 
            onPress={handleExportClients}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="square.and.arrow.up.fill" color="#374151" />
            <Text style={styles.secondaryActionText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Clients Section */}
        <View style={styles.clientsSection}>
          <Text style={styles.sectionTitle}>Your Clients</Text>
          
          {clients.length > 0 ? (
            <FlatList
              data={clients}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconSymbol size={48} name="person.crop.circle.badge.plus" color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>No clients yet</Text>
              <Text style={styles.emptyMessage}>
                Start building your client base by adding your first client
              </Text>
              <TouchableOpacity 
                style={styles.emptyAction} 
                onPress={handleCreateNewClient}
              >
                <Text style={styles.emptyActionText}>Add Your First Client</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#6B7280',
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  secondaryActionText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  clientsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    gap: 4,
  },
  clientPhone: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  clientAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  clientDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  separator: {
    height: 16,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyAction: {
    backgroundColor: '#1F2937',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});
