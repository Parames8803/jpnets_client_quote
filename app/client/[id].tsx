import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Client, Quotation, QUOTATION_STATUS_TYPES, QuotationStatus, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

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

  // UI state
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [quotesOpen, setQuotesOpen] = useState(true);
  const [batchMode, setBatchMode] = useState<'rooms' | 'quotes' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch data
  const fetchClientData = async (clientId: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (clientError) {
        Alert.alert('Error fetching client', clientError.message);
        setClient(null);
      } else {
        setClient(clientData);
      }
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      setRooms(roomsError ? [] : roomsData || []);

      const { data: quotationsData, error: quotationsError } = await supabase
        .from('quotations')
        .select('*, quotation_rooms(room_id)') // Fetch quotation_rooms to link to rooms
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      setQuotations(quotationsError ? [] : quotationsData || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) fetchClientData(id as string);
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    if (id) fetchClientData(id as string, true);
  };

  // Actions
  const handleCreateRoom = () => router.push({ pathname: '/create-room', params: { clientId: client?.id } });
  const handleGenerateQuotation = () => router.push({ pathname: '/client/generate-quotation', params: { clientId: client?.id } });
  const handleEditClient = () => router.push({ pathname: '/edit-client', params: { id: client?.id } });

  const handleOpenMap = () => {
    if (client && client.latitude != null && client.longitude != null) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${client.latitude},${client.longitude}`;
      const url = Platform.select({
        ios: `${scheme}Client Location@${latLng}`,
        android: `${scheme}${latLng}(Client Location)`,
      });
      if (url) Linking.openURL(url);
    } else {
      Alert.alert('No Location', 'Latitude and Longitude not available.');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    Alert.alert('Delete Room', 'Are you sure you want to delete this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('rooms').delete().eq('id', roomId);
          if (error) Alert.alert('Error deleting room', error.message);
          else onRefresh(); // Auto refresh after deleting
        },
      },
    ]);
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    Alert.alert('Delete Quotation', 'Are you sure you want to delete this quotation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Fetch associated room IDs
          const { data: quotationRooms, error: fetchError } = await supabase
            .from('quotation_rooms')
            .select('room_id')
            .eq('quotation_id', quotationId);

          if (fetchError) {
            Alert.alert('Error fetching quotation rooms', fetchError.message);
            return;
          }

          // Update room statuses to 'Active'
          if (quotationRooms && quotationRooms.length > 0) {
            const roomIdsToUpdate = quotationRooms.map(qr => qr.room_id);
            const { error: updateError } = await supabase
              .from('rooms')
              .update({ status: QUOTATION_STATUS_TYPES.ACTIVE })
              .in('id', roomIdsToUpdate);

            if (updateError) {
              Alert.alert('Error updating room statuses', updateError.message);
              return;
            }
          }

          const { error } = await supabase.from('quotations').delete().eq('id', quotationId);
          if (error) Alert.alert('Error deleting quotation', error.message);
          else onRefresh(); // Auto refresh after deleting
        },
      },
    ]);
  };

  // Batch operations
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearBatch = () => {
    setBatchMode(null);
    setSelectedIds(new Set());
  };

  const performBatchDelete = async () => {
    if (!batchMode || selectedIds.size === 0) return;
    Alert.alert('Delete selected', `Delete ${selectedIds.size} ${batchMode === 'rooms' ? 'room(s)' : 'quotation(s)'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (batchMode === 'rooms') {
            const { error } = await supabase.from('rooms').delete().in('id', Array.from(selectedIds));
            if (error) Alert.alert('Error', error.message);
          } else {
            // Batch delete for quotations
            const quotationIdsToDelete = Array.from(selectedIds);

            // Fetch associated room IDs for all quotations being deleted
            const { data: quotationRooms, error: fetchError } = await supabase
              .from('quotation_rooms')
              .select('room_id')
              .in('quotation_id', quotationIdsToDelete);

            if (fetchError) {
              Alert.alert('Error fetching quotation rooms for batch delete', fetchError.message);
              return;
            }

            // Update room statuses to 'Active'
            if (quotationRooms && quotationRooms.length > 0) {
              const roomIdsToUpdate = Array.from(new Set(quotationRooms.map(qr => qr.room_id))); // Use Set to avoid duplicate room updates
              const { error: updateError } = await supabase
                .from('rooms')
                .update({ status: QUOTATION_STATUS_TYPES.ACTIVE })
                .in('id', roomIdsToUpdate);

              if (updateError) {
                Alert.alert('Error updating room statuses for batch delete', updateError.message);
                return;
              }
            }

            const { error } = await supabase.from('quotations').delete().in('id', quotationIdsToDelete);
            if (error) Alert.alert('Error', error.message);
          }
          clearBatch();
          onRefresh();
        },
      },
    ]);
  };

  // Inline status update (no modal)
  const cycleStatus = (current?: string | null): QuotationStatus => {
    const statuses = Object.values(QUOTATION_STATUS_TYPES) as QuotationStatus[];
    const idx = Math.max(0, statuses.indexOf((current as QuotationStatus) || statuses[0]));
    const next = statuses[(idx + 1) % statuses.length];
    return next;
  };

  const updateQuotationStatusInline = async (q: Quotation) => {
    const next = cycleStatus(q.status as string);
    const { error } = await supabase.from('quotations').update({ status: next }).eq('id', q.id);
    if (error) Alert.alert('Error', error.message);
    else onRefresh();
  };

  // Derived
  const totalValue = useMemo(
    () => quotations.reduce((sum, q) => sum + (q.total_price || 0), 0),
    [quotations]
  );
  const activeQuotes = useMemo(() => quotations.filter(q => q.status === 'Active').length, [quotations]);

  const roomsInClosedQuotationsIds = useMemo(() => {
    const ids = new Set<string>();
    quotations.forEach(q => {
      if (q.status === 'Closed' && q.quotation_rooms) {
        q.quotation_rooms.forEach((qr: any) => { // Cast to any for now, will refine type later if needed
          if (qr.room_id) {
            ids.add(qr.room_id);
          }
        });
      }
    });
    return ids;
  }, [quotations]);

  const selectedRoomsInClosedQuotations = useMemo(() => {
    if (batchMode !== 'rooms') return false;
    for (const roomId of selectedIds) {
      if (roomsInClosedQuotationsIds.has(roomId)) {
        return true;
      }
    }
    return false;
  }, [selectedIds, roomsInClosedQuotationsIds, batchMode]);

  const selectedQuotesAreClosed = useMemo(() => {
    if (batchMode !== 'quotes') return false;
    for (const quoteId of selectedIds) {
      const quote = quotations.find(q => q.id === quoteId);
      if (quote && quote.status === 'Closed') {
        return true;
      }
    }
    return false;
  }, [selectedIds, quotations, batchMode]);

  const statusStyle = (status: string | null | undefined) => {
    const map: Record<string, { bg: string; text: string; border: string }> = isDark
      ? {
          'Not Active': { bg: '#1F2937', text: '#9CA3AF', border: '#374151' },
          Active: { bg: '#064E3B', text: '#34D399', border: '#065F46' },
          Closed: { bg: '#3F1D1D', text: '#F87171', border: '#7F1D1D' },
          Pending: { bg: '#1E3A8A', text: '#93C5FD', border: '#1D4ED8' }, // Added Pending status for dark mode
        }
      : {
          'Not Active': { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
          Active: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
          Closed: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
          Pending: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' }, // Added Pending status for light mode
        };
    // Ensure a valid style is always returned, defaulting to 'Not Active' if status is unexpected
    return map[status || 'Not Active'] || map['Not Active'];
  };

  // Renderers
  const RoomRow = ({ item }: { item: Room }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
          selected && { borderColor: '#6366F1', borderWidth: 2 },
        ]}
        onPress={() => (batchMode === 'rooms' ? toggleSelect(item.id) : router.push({ pathname: '/room/[id]', params: { id: item.id } }))}
        onLongPress={() => {
          setBatchMode('rooms');
          toggleSelect(item.id);
        }}
        delayLongPress={220}
      >
        <View style={styles.rowLeft}>
          <IconSymbol name="building.2" size={20} color={isDark ? '#93C5FD' : '#2563EB'} />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.room_type}</Text>
            <Text style={[styles.rowSub, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]} numberOfLines={1}>
              {item.description || 'No description'}
            </Text>
          </View>
        </View>
        {batchMode !== 'rooms' ? (
          <TouchableOpacity
            onPress={() => handleDeleteRoom(item.id)}
            disabled={roomsInClosedQuotationsIds.has(item.id)}
            style={roomsInClosedQuotationsIds.has(item.id) && { opacity: 0.4 }}
          >
            <IconSymbol name="trash.fill" size={16} color={isDark ? '#FCA5A5' : '#DC2626'} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]} />
        )}
      </TouchableOpacity>
    );
  };

  const QuoteRow = ({ item }: { item: Quotation }) => {
    const selected = selectedIds.has(item.id);
    const st = statusStyle(item.status);
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
          selected && { borderColor: '#6366F1', borderWidth: 2 },
        ]}
        onPress={() => (batchMode === 'quotes' ? toggleSelect(item.id) : router.push({ pathname: '/quotation/[id]', params: { id: item.id } }))}
        onLongPress={() => {
          setBatchMode('quotes');
          toggleSelect(item.id);
        }}
        delayLongPress={220}
      >
        <View style={styles.rowLeft}>
          <IconSymbol name="doc.text" size={20} color={isDark ? '#86EFAC' : '#059669'} />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              Quote #{item.quote_id || 'N/A'}
            </Text>
            <Text style={[styles.rowSub, { color: isDark ? Colors.dark.secondaryText : Colors.light.secondaryText }]}>
              ${(item.total_price || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {batchMode !== 'quotes' ? (
          <View style={styles.rowRight}>
            <TouchableOpacity
              style={[styles.statusChip, { backgroundColor: st.bg, borderColor: st.border }]}
              // onPress={() => item.status !== 'Closed' && updateQuotationStatusInline(item)}
              // disabled={item.status === 'Closed'}
            >
              <Text style={[styles.statusChipText, { color: st.text }]}>{item.status || 'Not Active'}</Text>
            </TouchableOpacity>
            {item.status !== 'Closed' && (
              <TouchableOpacity onPress={() => handleDeleteQuotation(item.id)} hitSlop={10}>
                <IconSymbol name="trash.fill" size={16} color={isDark ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Loading client…</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>Client not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Sticky Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: isDark ? '#0B1220' : '#FFFFFF', borderColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
        <Text style={[styles.clientTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]} numberOfLines={1}>
          {client.name}
        </Text>
        <View style={styles.actionGroup}>
          <ActionBtn icon="pencil" label="Edit" onPress={handleEditClient} />
          <ActionBtn icon="plus" label="Room" onPress={handleCreateRoom} />
          <ActionBtn icon="plus" label="Quote" onPress={handleGenerateQuotation} />
          <ActionBtn icon="location" label="Map" onPress={handleOpenMap} disabled={client.latitude == null || client.longitude == null} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <SummaryCard title="Rooms" value={rooms.length.toString()} color={isDark ? '#93C5FD' : '#2563EB'} />
          <SummaryCard title="Quotes" value={quotations.length.toString()} color={isDark ? '#86EFAC' : '#059669'} />
        </View>

        {/* Rooms */}
        <CollapsibleSection
          title={`Rooms (${rooms.length})`}
          open={roomsOpen}
          onToggle={() => setRoomsOpen(v => !v)}
          batchActive={batchMode === 'rooms'}
          onBatchToggle={() => {
            setSelectedIds(new Set());
            setBatchMode(batchMode === 'rooms' ? null : 'rooms');
          }}
        >
          {rooms.length ? (
            <FlatList
              data={rooms}
              keyExtractor={i => i.id}
              renderItem={RoomRow}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <Empty label="No rooms yet" hint="Add the first room for this client." />
          )}
          {batchMode === 'rooms' && selectedIds.size > 0 && (
            <BatchBar
              count={selectedIds.size}
              onDelete={performBatchDelete}
              onCancel={clearBatch}
              disableDelete={selectedRoomsInClosedQuotations}
            />
          )}
        </CollapsibleSection>

        {/* Quotations */}
        <CollapsibleSection
          title={`Quotations (${quotations.length})`}
          open={quotesOpen}
          onToggle={() => setQuotesOpen(v => !v)}
          batchActive={batchMode === 'quotes'}
          onBatchToggle={() => {
            setSelectedIds(new Set());
            setBatchMode(batchMode === 'quotes' ? null : 'quotes');
          }}
        >
          {quotations.length ? (
            <FlatList
              data={quotations}
              keyExtractor={i => i.id}
              renderItem={QuoteRow}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <Empty label="No quotations" hint="Generate the first quote to get started." />
          )}
          {batchMode === 'quotes' && selectedIds.size > 0 && (
            <BatchBar
              count={selectedIds.size}
              onDelete={performBatchDelete}
              onCancel={clearBatch}
              disableDelete={selectedQuotesAreClosed}
            />
          )}
        </CollapsibleSection>
      </ScrollView>
    </View>
  );
}

/* ----- Reusable UI components ----- */

function ActionBtn({ icon, label, onPress, disabled }: { icon: IconSymbolName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.actionBtn, disabled && { opacity: 0.4 }]}>
      <IconSymbol name={icon} size={16} color="#6366F1" />
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderColor: color }]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{title}</Text>
    </View>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  batchActive,
  onBatchToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  batchActive?: boolean;
  onBatchToggle?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionBar}>
        <TouchableOpacity onPress={onToggle} style={styles.sectionTitleWrap}>
          <IconSymbol name={open ? 'chevron.down' : 'chevron.right'} size={14} color="#6B7280" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </TouchableOpacity>
        {onBatchToggle && (
          <TouchableOpacity onPress={onBatchToggle} style={styles.batchToggle}>
            <IconSymbol name="square.stack.3d.down.forward" size={16} color={batchActive ? '#6366F1' : '#6B7280'} />
            <Text style={[styles.batchToggleText, batchActive && { color: '#6366F1' }]}>
              {batchActive ? 'Done' : 'Select'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {open && <View style={{ marginTop: 10 }}>{children}</View>}
    </View>
  );
}

function Empty({ label, hint }: { label: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{label}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

function BatchBar({ count, onDelete, onCancel, disableDelete }: { count: number; onDelete: () => void; onCancel: () => void; disableDelete?: boolean }) {
  return (
    <View style={styles.batchBar}>
      <Text style={styles.batchText}>{count} selected</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={onDelete} style={[styles.batchBtn, { backgroundColor: '#DC2626' }, disableDelete && { opacity: 0.4 }]} disabled={disableDelete}>
          <IconSymbol name="trash.fill" size={14} color="#fff" />
          <Text style={styles.batchBtnText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={[styles.batchBtn, { backgroundColor: '#374151' }]}>
          <IconSymbol name="xmark" size={14} color="#fff" />
          <Text style={styles.batchBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ----- Styles ----- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },

  actionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  actionGroup: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: { color: '#6366F1', fontWeight: '700', fontSize: 12 },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  section: { paddingHorizontal: 12, marginTop: 18 },
  sectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  batchToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  batchToggleText: { color: '#6B7280', fontWeight: '700', fontSize: 12 },

  row: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  statusChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: { fontSize: 12, fontWeight: '800' },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
  },

  empty: { paddingVertical: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyHint: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  batchBar: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchText: { fontWeight: '800' },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  batchBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
