import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StatusUpdateModal } from '@/components/ui/StatusUpdateModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Quotation, QUOTATION_STATUS_TYPES, ROOM_STATUS_TYPES, Room } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const StatusBadge = ({ status, isDark }: { status: string; isDark: boolean }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
      case 'in progress': return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' };
      case 'completed': return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
      case 'ready to start': return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
      default: return { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' };
    }
  };

  const colors = getStatusColor(status);
  
  return (
    <View style={[
      styles.statusBadge, 
      { 
        backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : colors.bg,
        borderColor: colors.border,
      }
    ]}>
      <Text style={[styles.statusBadgeText, { color: isDark ? colors.border : colors.text }]}>
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </Text>
    </View>
  );
};

const QuotationCard = ({ item, isDark, onStatusUpdate }: { 
  item: Quotation; 
  isDark: boolean; 
  onStatusUpdate: (quotation: Quotation, roomId: string) => void; 
}) => {
  const router = useRouter();

  const openMaps = () => {
    if (item.clients?.latitude && item.clients?.longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${item.clients.latitude},${item.clients.longitude}`,
        android: `geo:0,0?q=${item.clients.latitude},${item.clients.longitude}`,
      });
      if (url) Linking.openURL(url);
      else Alert.alert('Error', 'Could not open map application.');
    }
  };

  const navigateToRoomDetails = (roomId: string) => {
    router.push({ pathname: '/room/[id]', params: { id: roomId } });
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.quotationIdContainer}>
          <IconSymbol name="doc.text" size={20} color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <ThemedText style={styles.quotationId}>#{item.id.slice(-8)}</ThemedText>
        </View>
        <StatusBadge status={item.status || 'pending'} isDark={isDark} />
      </View>

      <View style={styles.clientSection}>
        <View style={styles.clientRow}>
          <IconSymbol name="person.circle" size={18} color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
          <ThemedText style={styles.clientName}>{item.clients?.name || 'Unknown Client'}</ThemedText>
        </View>
        {item.clients?.address && (
          <View style={styles.addressRow}>
            <IconSymbol name="location" size={16} color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
            <ThemedText style={styles.addressText}>{item.clients.address}</ThemedText>
          </View>
        )}
        {item.clients?.latitude && item.clients?.longitude && (
          <TouchableOpacity style={styles.coordinatesButton} onPress={openMaps}>
            <LinearGradient colors={isDark ? ['#1F2937', '#374151'] : ['#F3F4F6', '#E5E7EB']} style={styles.coordinatesGradient}>
              <IconSymbol name="map" size={16} color={isDark ? '#10B981' : '#059669'} />
              <Text style={[styles.coordinatesButtonText, { color: isDark ? '#10B981' : '#059669' }]}>View Location</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {item.quotation_rooms?.map((qr, index) => (
        qr.rooms && (
          <View key={index} style={[styles.roomSection, { borderTopColor: isDark ? Colors.dark.border : Colors.light.border }]}>
            <TouchableOpacity onPress={() => navigateToRoomDetails(qr.rooms!.id)}>
              <View style={styles.roomHeader}>
                <ThemedText style={styles.roomTitle}>{qr.rooms.room_type}</ThemedText>
                <StatusBadge status={qr.rooms.status || ''} isDark={isDark} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => onStatusUpdate(item, qr.rooms!.id)}>
              <IconSymbol name="arrow.triangle.2.circlepath" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Update Room Status</Text>
            </TouchableOpacity>
          </View>
        )
      ))}
    </View>
  );
};

export default function WorkerDashboardScreen() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedQuotationForStatus, setSelectedQuotationForStatus] = useState<Quotation | null>(null);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState<Room | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const getWorkerId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: workerData, error: workerError } = await supabase.from('workers').select('id').eq('user_id', user.id).single();
        if (workerError) Alert.alert('Error', workerError.message);
        else if (workerData) setWorkerId(workerData.id);
      }
    };
    getWorkerId();
  }, []);

  useEffect(() => {
    if (workerId) fetchAssignedQuotations();
  }, [workerId]);

  const fetchAssignedQuotations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotations')
      .select('*, clients(*), quotation_rooms!left(rooms!left(*, products!left(*)))')
      .eq('assigned_worker_id', workerId)
      .eq('status', QUOTATION_STATUS_TYPES.CLOSED)
      .order('created_at', { ascending: false });

    if (error) Alert.alert('Error fetching assigned quotations', error.message);
    else setQuotations(data || []);
    setLoading(false);
  };

  const updateRoomStatus = async (roomId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
      if (error) throw error;
      Alert.alert('Success', `Room status updated to ${newStatus.replace('_', ' ')}`);
      fetchAssignedQuotations();
    } catch (error: any) {
      Alert.alert('Error updating room status', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdatePress = (quotation: Quotation, roomId: string) => {
    const room = quotation.quotation_rooms?.find(qr => qr.rooms?.id === roomId)?.rooms;
    if (room) {
      setSelectedQuotationForStatus(quotation);
      setSelectedRoomForStatus(room);
      setIsStatusModalVisible(true);
    }
  };

  const handleModalStatusSelect = async (newStatus: any) => {
    if (selectedRoomForStatus) {
      await updateRoomStatus(selectedRoomForStatus.id, newStatus);
      setIsStatusModalVisible(false);
      setSelectedQuotationForStatus(null);
      setSelectedRoomForStatus(null);
    }
  };

  const renderQuotationItem = ({ item }: { item: Quotation }) => (
    <QuotationCard item={item} isDark={isDark} onStatusUpdate={handleStatusUpdatePress} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
        <IconSymbol size={48} name="doc.text" color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
      </View>
      <ThemedText style={styles.emptyTitle}>No Quotations Yet</ThemedText>
      <ThemedText style={styles.emptyMessage}>You currently have no quotations assigned to you. New assignments will appear here.</ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText style={styles.title}>My Quotations</ThemedText>
      <Text style={[styles.subtitle, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{quotations.length} {quotations.length === 1 ? 'assignment' : 'assignments'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={quotations}
        keyExtractor={(item) => item.id}
        renderItem={renderQuotationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={[styles.listContent, quotations.length === 0 && !loading && styles.emptyContent]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAssignedQuotations} tintColor={isDark ? Colors.dark.text : Colors.light.text} />}
        showsVerticalScrollIndicator={false}
      />
      {loading && quotations.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading quotations...</Text>
        </View>
      )}
      <StatusUpdateModal
        visible={isStatusModalVisible}
        onClose={() => setIsStatusModalVisible(false)}
        onUpdate={handleModalStatusSelect}
        currentStatus={selectedRoomForStatus?.status || null}
        statusOptions={[ROOM_STATUS_TYPES.READY_TO_START, ROOM_STATUS_TYPES.IN_PROGRESS, ROOM_STATUS_TYPES.COMPLETED]}
        colors={isDark ? Colors.dark : Colors.light}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContent: { flexGrow: 1 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  quotationIdContainer: { flexDirection: 'row', alignItems: 'center' },
  quotationId: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  clientSection: { marginBottom: 16 },
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clientName: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingLeft: 4 },
  addressText: { fontSize: 14, marginLeft: 8, flex: 1, lineHeight: 20 },
  coordinatesButton: { marginTop: 8, alignSelf: 'flex-start' },
  coordinatesGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  coordinatesButtonText: { fontSize: 14, fontWeight: '500', marginLeft: 6 },
  roomSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  roomTitle: { fontSize: 16, fontWeight: 'bold' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#3B82F6" },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  emptyMessage: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  loadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  loadingText: { marginTop: 16, fontSize: 16 },
});
