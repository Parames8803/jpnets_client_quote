import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { Client } from '../../types/db';

const { width } = Dimensions.get('window');

export default function ClientsScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading...</Text>
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
      style={[
        styles.clientCard,
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
        { borderColor: isDark ? Colors.dark.border : Colors.light.border },
      ]}
      onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.clientHeader}>
        <View style={[styles.clientAvatar, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}>
          <Text style={[styles.avatarText, { color: isDark ? "black" : Colors.light.secondary }]}>
            {item.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.name}</Text>
          <Text style={[styles.clientEmail, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{item.email}</Text>
        </View>
        <View style={styles.clientActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
            onPress={(e) => {
              e.stopPropagation();
              router.push({ pathname: '/edit-client', params: { id: item.id } });
            }}
          >
            <IconSymbol size={18} name="pencil" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteClient(item.id);
            }}
          >
            <IconSymbol size={18} name="trash.fill" color={isDark ? Colors.dark.error : Colors.light.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.clientDetails}>
        <Text style={[styles.clientPhone, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.contact_number}</Text>
        <Text style={[styles.clientAddress, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]} numberOfLines={2}>{item.address}</Text>
        <Text style={[styles.clientDate, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
            onPress={handleExportClients}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="square.and.arrow.up.fill" color={isDark ? Colors.dark.text : Colors.light.text} />
            <Text style={[styles.exportButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
            onPress={handleCreateNewClient}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="plus.circle.fill" color={isDark ? Colors.dark.text : Colors.light.text} />
            <Text style={[styles.exportButtonText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Add Client</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.clientsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Your Clients</Text>
          {clients.length > 0 ? (
            <FlatList
              data={clients}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
                <IconSymbol size={48} name="person.crop.circle.badge.plus" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>No clients yet</Text>
              <Text style={[styles.emptyMessage, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
                Start building your client base by adding your first client
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}
                onPress={handleCreateNewClient}
              >
                <Text style={[styles.emptyActionText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Add Your First Client</Text>
              </TouchableOpacity>
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
  addClientButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 10,
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  clientCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
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
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    gap: 4,
    marginTop: 8,
  },
  clientPhone: {
    fontSize: 15,
    fontWeight: '500',
  },
  clientAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  clientDate: {
    fontSize: 12,
    marginTop: 8,
  },
  separator: {
    height: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyAction: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
