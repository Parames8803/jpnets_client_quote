import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Client, Product, Quotation, QUOTATION_STATUS_TYPES, QuotationRoom, Room, ROOM_STATUS_TYPES, Worker } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OngoingWorkClient extends Client {
  quotations: Array<Quotation & { 
    workers?: Worker | null; 
    quotation_rooms: Array<QuotationRoom & { rooms: Room & { products?: Product[] } }> 
  }>;
}

export default function OngoingWorksScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [ongoingWorks, setOngoingWorks] = useState<OngoingWorkClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOngoingWorks();
  }, []);

  const fetchOngoingWorks = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(
          `
          id,
          name,
          quotations (
            id,
            status,
            assigned_worker_id,
            quotation_rooms (
              rooms (
                id,
                room_type,
                status,
                products (
                  wages
                )
              )
            )
          )
          `
        )
        .eq('quotations.status', QUOTATION_STATUS_TYPES.CLOSED)
        .in('quotations.quotation_rooms.rooms.status', [ROOM_STATUS_TYPES.READY_TO_START, ROOM_STATUS_TYPES.IN_PROGRESS]);

      if (error) {
        throw error;
      }

      const clientsWithFilteredQuotations: OngoingWorkClient[] = data
        .map((client: any) => {
          const clientQuotations = client.quotations.filter((quotation: any) => {
            const hasOngoingRooms = quotation.quotation_rooms.some(
              (qr: any) => qr.rooms && (qr.rooms.status === ROOM_STATUS_TYPES.READY_TO_START || qr.rooms.status === ROOM_STATUS_TYPES.IN_PROGRESS)
            );
            return quotation.status === QUOTATION_STATUS_TYPES.CLOSED && hasOngoingRooms;
          });

          if (clientQuotations.length > 0) {
            return { ...client, quotations: clientQuotations };
          }
          return null;
        })
        .filter(Boolean) as OngoingWorkClient[];

      const ongoingWorksWithWorkers = await Promise.all(
        clientsWithFilteredQuotations.map(async (client) => {
          const quotationsWithWorkers = await Promise.all(
            client.quotations.map(async (quotation) => {
              if (quotation.assigned_worker_id) {
                const { data: workerData, error: workerError } = await supabase
                  .from('workers')
                  .select('name, email')
                  .eq('id', quotation.assigned_worker_id)
                  .single();

                if (workerError) {
                  console.error('Error fetching worker:', workerError.message);
                  return { ...quotation, workers: null };
                }
                return { ...quotation, workers: workerData };
              }
              return { ...quotation, workers: null };
            })
          );
          return { ...client, quotations: quotationsWithWorkers };
        })
      );

      setOngoingWorks(ongoingWorksWithWorkers as OngoingWorkClient[]);
    } catch (err: any) {
      console.error('Error fetching ongoing works:', err.message);
      setError('Failed to load ongoing works. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchOngoingWorks(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case ROOM_STATUS_TYPES.COMPLETED:
        return '#4CAF50';
      case ROOM_STATUS_TYPES.IN_PROGRESS:
        return '#FF9800';
      case ROOM_STATUS_TYPES.READY_TO_START:
        return '#2196F3';
      default:
        return isDark ? Colors.dark.secondary : Colors.light.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case ROOM_STATUS_TYPES.COMPLETED:
        return 'checkmark-circle';
      case ROOM_STATUS_TYPES.IN_PROGRESS:
        return 'time';
      case ROOM_STATUS_TYPES.READY_TO_START:
        return 'play-circle';
      default:
        return 'help-circle';
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerStats}>
        <View style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <Text style={[styles.statNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {ongoingWorks.length}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Active Clients
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <Text style={[styles.statNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {ongoingWorks.reduce((total, client) => 
              total + client.quotations.reduce((qTotal, quotation) => 
                qTotal + quotation.quotation_rooms.filter(qr => 
                  qr.rooms && (qr.rooms.status === ROOM_STATUS_TYPES.READY_TO_START || qr.rooms.status === ROOM_STATUS_TYPES.IN_PROGRESS)
                ).length, 0
              ), 0
            )}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Ongoing Rooms
          </Text>
        </View>
      </View>
    </View>
  );

  const ClientCard = ({ client }: { client: OngoingWorkClient }) => (
    <TouchableOpacity 
      style={[styles.clientCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}
      activeOpacity={0.7}
      onPress={() => { router.push(`/client/${client.id}`); }}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Ionicons 
            name="person-circle-outline" 
            size={24} 
            color={isDark ? Colors.dark.text : Colors.light.text} 
          />
          <Text style={[styles.clientName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {client.name}
          </Text>
        </View>
        <View style={[styles.quotationBadge, { backgroundColor: '#2196F320' }]}>
          <Text style={[styles.quotationBadgeText, { color: '#2196F3' }]}>
            {client.quotations.length} Quote{client.quotations.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {client.quotations.map((quotation) => (
        <View key={quotation.id} style={styles.quotationSection}>
          <View style={styles.quotationHeader}>
            <Ionicons name="document-text-outline" size={16} color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
            <Text style={[styles.quotationTitle, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              ID: {quotation.id.substring(0, 8)}...
            </Text>
          </View>

          {quotation.workers && (
            <View style={styles.workerDetails}>
              <Ionicons name="person-outline" size={16} color={isDark ? Colors.dark.text : Colors.light.text} />
              <Text style={[styles.workerName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                Assigned: {quotation.workers.name}
              </Text>
            </View>
          )}

          <View style={styles.roomsList}>
            {quotation.quotation_rooms
              .filter(qr => qr.rooms && (qr.rooms.status === ROOM_STATUS_TYPES.READY_TO_START || qr.rooms.status === ROOM_STATUS_TYPES.IN_PROGRESS))
              .map((qr) => {
                const totalWages = qr.rooms!.products?.reduce((sum, product) => sum + (product.wages || 0), 0) || 0;
                return (
                  <View key={qr.rooms!.id} style={styles.roomItem}>
                    <View style={styles.roomInfo}>
                      <Ionicons name="cube-outline" size={16} color={isDark ? Colors.dark.text : Colors.light.text} />
                      <Text style={[styles.roomType, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                        {qr.rooms!.room_type}
                      </Text>
                    </View>
                    <View style={styles.roomDetailsRight}>
                      {totalWages > 0 && (
                        <View style={[styles.wagesBadge, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
                          <Ionicons name="cash-outline" size={12} color={isDark ? Colors.dark.text : Colors.light.text} />
                          <Text style={[styles.wagesText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                            Wages: ₹{totalWages.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(qr.rooms!.status || '')}20` }]}>
                        <Ionicons 
                          name={getStatusIcon(qr.rooms!.status || 'default') as any} 
                          size={12} 
                          color={getStatusColor(qr.rooms!.status || 'default')} 
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(qr.rooms!.status || 'default') }]}>
                          {qr.rooms!.status || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      ))}
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
        <Ionicons 
          name="checkmark-circle" 
          size={48} 
          color={isDark ? Colors.dark.secondary : Colors.light.secondary} 
        />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        No ongoing works!
      </Text>
      <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        No rooms are currently in 'Ready to Start' or 'In Progress' status.
      </Text>
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={16} color="white" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: '#FF524320' }]}>
        <Ionicons name="alert-circle" size={48} color="#FF5243" />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.emptySubtext, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        {error}
      </Text>
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: '#FF5243' }]}
        onPress={() => fetchOngoingWorks()}
      >
        <Ionicons name="refresh" size={16} color="white" />
        <Text style={styles.refreshButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Loading ongoing works...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? Colors.dark.tint : Colors.light.tint]}
            tintColor={isDark ? Colors.dark.tint : Colors.light.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Header />
        
        {error ? (
          <ErrorState />
        ) : ongoingWorks.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.clientsList}>
            {ongoingWorks.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 20,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  clientsList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  clientCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
  },
  quotationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quotationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quotationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  quotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  quotationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomsList: {
    gap: 8,
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomType: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  workerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  roomDetailsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wagesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
