import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../utils/supabaseClient';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const { width } = Dimensions.get('window');

type AnalyticsData = {
  totalClients: number;
  totalWorkers: number;
  quotationsPending: number;
  quotationsClosed: number;
  roomsStatusCounts: { [key: string]: number };
  totalRevenueClosedQuotations: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchAnalytics();
    }
    setRefreshing(false);
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch total clients
      const { data: clientsCount, error: clientsError } = await supabase.rpc('get_total_clients');
      if (clientsError) throw clientsError;

      // Fetch total workers  
      const { data: workersCount, error: workersError } = await supabase.rpc('get_total_workers');
      if (workersError) throw workersError;

      // Fetch quotation status counts
      const { data: quotationCounts, error: quotationError } = await supabase.rpc('get_quotation_status_counts');
      if (quotationError) throw quotationError;

      // Fetch room status counts
      const { data: roomCounts, error: roomError } = await supabase.rpc('get_room_status_counts');
      if (roomError) throw roomError;

      // Fetch total revenue from closed quotations
      const { data: revenue, error: revenueError } = await supabase.rpc('get_total_revenue_from_closed_quotations');
      if (revenueError) throw revenueError;

      setAnalytics({
        totalClients: clientsCount || 0,
        totalWorkers: workersCount || 0,
        quotationsPending: quotationCounts?.pending || 0,
        quotationsClosed: quotationCounts?.closed || 0,
        roomsStatusCounts: roomCounts || {},
        totalRevenueClosedQuotations: revenue || 0,
      });

    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch analytics: ' + error.message);
      setAnalytics(null); // Clear analytics on error
    }
  };

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        setUserId(user.id);
        fetchAnalytics();
      } else {
        router.replace('/(auth)/login');
      }
    };

    checkUserAndFetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login');
      } else if (session.user) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        fetchAnalytics();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchAnalytics();
      }
    }, [userId])
  );

  if (userEmail === undefined || userId === null || analytics === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading analytics...</Text>
      </View>
    );
  }

  const analyticsCards = [
    { id: 'totalClients', label: 'Total Clients', icon: 'person.3.fill', color: '#3B82F6', value: analytics.totalClients },
    { id: 'totalWorkers', label: 'Total Workers', icon: 'person.fill', color: '#10B981', value: analytics.totalWorkers },
    { id: 'quotationsPending', label: 'Quotes Pending', icon: 'pencil.and.outline', color: '#F59E0B', value: analytics.quotationsPending },
    { id: 'quotationsClosed', label: 'Quotes Closed', icon: 'checkmark.circle.fill', color: '#6366F1', value: analytics.quotationsClosed },
    { id: 'totalRevenue', label: 'Total Revenue', icon: 'dollarsign.circle.fill', color: '#22C55E', value: analytics.totalRevenueClosedQuotations, isCurrency: true },
  ];

  const roomStatusCards = Object.entries(analytics.roomsStatusCounts).map(([status, count], index) => ({
    id: `roomStatus-${index}`,
    label: `${status} Rooms`,
    icon: 'house.fill', // You might want different icons for different statuses
    color: '#EF4444', // Example color
    value: count,
  }));

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

        {/* Analytics Grid */}
        <View style={styles.statsGrid}>
          {analyticsCards.map((stat) => (
            <View key={stat.id} style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <IconSymbol size={24} name={stat.icon as any} color={stat.color} />
              </View>
              <Text style={[styles.statNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                {stat.isCurrency ? `$${stat.value.toFixed(2)}` : stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Room Statuses */}
        {roomStatusCards.length > 0 && (
          <View style={styles.roomStatusSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Room Statuses</Text>
            <View style={styles.statsGrid}>
              {roomStatusCards.map((stat) => (
                <View key={stat.id} style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                    <IconSymbol size={24} name={stat.icon as any} color={stat.color} />
                  </View>
                  <Text style={[styles.statNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
  roomStatusSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  clientListSection: {
    paddingHorizontal: 24,
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
