import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { Client } from '../../types/db';

const { width } = Dimensions.get('window');

// A placeholder for client data statistics.
// In a real app, these would be fetched from the database.
const clientStats = [
  { id: '1', label: 'Total Clients', icon: 'person.fill', color: '#3B82F6', value: 0 },
  { id: '2', label: 'Active Projects', icon: 'list.clipboard.fill', color: '#10B981', value: 25 },
  { id: '3', label: 'Pending Quotes', icon: 'pencil.and.outline', color: '#F59E0B', value: 12 },
  { id: '4', label: 'Completed', icon: 'checkmark.circle.fill', color: '#6366F1', value: 100 },
];

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Update the stats with the actual total number of clients
  const updatedStats = clientStats.map(stat =>
    stat.id === '1' ? { ...stat, value: clients.length } : stat
  ) as typeof clientStats;

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

  useEffect(() => {
    const checkUserAndFetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserId(user.id);
        fetchClients(user.id);
      } else {
        router.replace('/(auth)/login');
      }
    };

    checkUserAndFetchClients();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
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

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[
        styles.clientCard,
        { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
        { borderColor: isDark ? Colors.dark.border : Colors.light.border },
      ]}
      onPress={() => router.push(`/client/${item.id}` as any)}
    >
      <View style={styles.clientDetails}>
        <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.name}</Text>
        <Text style={[styles.clientEmail, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{item.email}</Text>
      </View>
      <IconSymbol size={20} name="chevron.right" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
    </TouchableOpacity>
  );

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

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {updatedStats.map((stat) => (
            <View key={stat.id} style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <IconSymbol size={24} name={stat.icon as any} color={stat.color} />
              </View>
              <Text style={[styles.statNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{stat.label}</Text>
            </View>
          ))}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    // Add shadow for a raised, modern card effect
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
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  clientListSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  clientCard: {
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
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientEmail: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  noClientsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  noClientsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
