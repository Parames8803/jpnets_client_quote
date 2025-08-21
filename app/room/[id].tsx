import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Measurement, Product, Room } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

/* -------------------- Data Hook (unchanged behavior) -------------------- */

interface RoomDetailsData {
  room: Room;
  measurement: Measurement | null;
  products: Product[];
}

function useRoomDetails(roomId: string | string[] | undefined) {
  const [data, setData] = useState<RoomDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const id_str = Array.isArray(roomId) ? roomId[0] : roomId;

  const fetchData = useCallback(async () => {
    if (!id_str) {
      setError(new Error('Room ID is missing.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: rawData, error: queryError } = await supabase
        .from('rooms')
        .select(`
          *,
          measurements (*),
          products (*),
          quotation_rooms(quotations(status))
        `)
        .eq('id', id_str)
        .single();

      if (queryError) throw queryError;
      if (!rawData) throw new Error('Room not found.');

      const { measurements, products, quotation_rooms, ...room } = rawData;

      const isRoomInClosedQuotation = quotation_rooms.some((qr: any) => qr.quotations?.status === 'Closed');

      setData({
        room: { ...room as Room, is_in_closed_quotation: isRoomInClosedQuotation },
        measurement: (measurements && measurements.length > 0) ? measurements[0] : null,
        products: products || [],
      });
    } catch (e: any) {
      console.error('Failed to fetch room details:', e.message);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [id_str]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/* -------------------- Tabs -------------------- */

type Tab = 'details' | 'products' | 'images';

const DetailsTab = ({ room, measurement, colors, refreshing, onRefresh }: {
  room: Room, measurement: Measurement | null, colors: any, refreshing: boolean, onRefresh: () => void
}) => {
  const hasArea = typeof room.total_sq_ft === 'number' && !isNaN(room.total_sq_ft);
  const hasCalcArea = typeof measurement?.converted_sq_ft === 'number' && !isNaN(measurement?.converted_sq_ft as number);

  return (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      showsVerticalScrollIndicator={false}
    >
      <InfoSection icon="house.fill" title="Room Information" colors={colors}>
        <InfoItem label="Description" value={room.description || 'N/A'} colors={colors} />
        <InfoItem label="Created On" value={new Date(room.created_at).toLocaleDateString()} colors={colors} />
        {hasArea && <InfoItem label="Total Area" value={`${room.total_sq_ft} sq.ft`} colors={colors} />}
      </InfoSection>

      <InfoSection icon="ruler.fill" title="Dimensions" colors={colors}>
        {measurement ? (
          <>
            <InfoItem label="Length" value={`${measurement.length_value ?? 'N/A'} ${measurement.length_unit_type ?? ''}`} colors={colors} />
            <InfoItem label="Width" value={`${measurement.width_value ?? 'N/A'} ${measurement.width_unit_type ?? ''}`} colors={colors} />
            {hasCalcArea && (
              <InfoItem label="Calculated Area" value={`${(measurement.converted_sq_ft as number).toFixed(2)} sq.ft`} colors={colors} />
            )}
          </>
        ) : (
          <EmptyState icon="ruler" text="No measurements recorded." colors={colors} />
        )}
      </InfoSection>
    </ScrollView>
  );
};

const ProductsTab = ({ products, colors, refreshing, onRefresh }: {
  products: Product[], colors: any, refreshing: boolean, onRefresh: () => void
}) => {
  const totalCost = useMemo(
    () => products.reduce((sum, p) => sum + (p.wages || 0), 0),
    [products]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      showsVerticalScrollIndicator={false}
    >
      {products.length > 0 ? (
        <>
          <View style={styles.inlineSummary}>
            <IconSymbol name="sum" size={16} color={colors.tint} />
            <Text style={[styles.inlineSummaryText, { color: colors.secondaryText }]}>
              Total Costs:
            </Text>
            <Text style={[styles.inlineSummaryValue, { color: colors.tint }]}>
              ₹{totalCost.toFixed(2)}
            </Text>
          </View>

          {products.map((product) => (
            <ProductCard key={product.id} product={product} colors={colors} />
          ))}
        </>
      ) : (
        <EmptyState icon="cube.box" text="No products added to this room." colors={colors} />
      )}
    </ScrollView>
  );
};

const ImagesTab = ({ imageUrls, colors, refreshing, onRefresh }: {
  imageUrls: string[] | null, colors: any, refreshing: boolean, onRefresh: () => void
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImage = (url: string) => {
    const publicUrl = supabase.storage.from('file-storage').getPublicUrl(url).data.publicUrl;
    setSelectedImage(publicUrl);
    setModalVisible(true);
  };

  const gridUrls = imageUrls || [];

  return (
    <ScrollView
      contentContainerStyle={styles.tabContentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      showsVerticalScrollIndicator={false}
    >
      {gridUrls.length > 0 ? (
        <View style={styles.imageGrid}>
          {gridUrls.map((url, index) => {
            const publicUrl = supabase.storage.from('file-storage').getPublicUrl(url).data.publicUrl;
            return (
              <TouchableOpacity key={index} onPress={() => openImage(url)} activeOpacity={0.8}>
                <Image
                  source={{ uri: publicUrl }}
                  style={[styles.imageThumbnail, { borderColor: colors.border }]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <EmptyState icon="photo.on.rectangle" text="No reference images found." colors={colors} />
      )}

      <Modal visible={modalVisible} transparent onRequestClose={() => setModalVisible(false)} animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
            <IconSymbol name="xmark" size={20} color="#fff" />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} />}
        </View>
      </Modal>
    </ScrollView>
  );
};

/* -------------------- Main Screen -------------------- */

export default function RoomDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data, loading, error, refetch } = useRoomDetails(id);
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [refreshing, setRefreshing] = useState(false);

  const isRoomInClosedQuotation = data?.room?.is_in_closed_quotation || false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading Room...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={40} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error?.message || 'Room could not be loaded.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.tint }]}>
          <Text style={[styles.buttonText, { color: '#FFF' }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { room, measurement, products } = data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Sticky Action Bar */}
      <View style={[styles.stickyBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.stickyLeft}>
          <Text style={[styles.stickyTitle, { color: colors.text }]} numberOfLines={1}>
            {room.room_type}
          </Text>
          <InlineMeta colors={colors} room={room} />
        </View>
        <View style={styles.stickyActions}>
          {userRole !== 'client' && userRole !== 'worker' && (
            <>
              <SmallBtn
                colors={colors}
                icon="pencil"
                label="Edit"
                onPress={() => router.push(`/room/edit/${room.id}`)}
                disabled={isRoomInClosedQuotation}
              />
              <SmallBtn
                colors={colors}
                icon="plus"
                label="Product"
                onPress={() => router.push(`/room/add-product/${room.id}`)}
                disabled={isRoomInClosedQuotation}
              />
            </>
          )}
        </View>
      </View>

      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{room.room_type}</Text>
          <StatusBadge status={room.status} colors={colors} />
        </View>
              {/* Tab Bar */}
      <View style={[styles.tabBarModern, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <PillTab id="details" title="Details" activeTab={activeTab} setActiveTab={setActiveTab} colors={colors} />
        <PillTab id="products" title={`Products (${products.length})`} activeTab={activeTab} setActiveTab={setActiveTab} colors={colors} />
        <PillTab id="images" title={`Images (${room.ref_image_urls?.length || 0})`} activeTab={activeTab} setActiveTab={setActiveTab} colors={colors} />
      </View>
        </View>

      {/* Content */}
      {activeTab === 'details' && (
        <DetailsTab room={room} measurement={measurement} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />
      )}
      {activeTab === 'products' && (
        <ProductsTab products={products} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />
      )}
      {activeTab === 'images' && (
        <ImagesTab imageUrls={room.ref_image_urls} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />
      )}
    </View>
  );
}

/* -------------------- Helper UI -------------------- */

function InlineMeta({ colors, room }: { colors: any; room: Room }) {
  return (
    <View style={styles.inlineMetaRow}>
      <IconSymbol name="calendar" size={12} color={colors.secondaryText} />
      <Text style={[styles.inlineMetaText, { color: colors.secondaryText }]}>
        {new Date(room.created_at).toLocaleDateString()}
      </Text>
      {typeof room.total_sq_ft === 'number' && !isNaN(room.total_sq_ft) && (
        <>
          <View style={styles.dot} />
          <IconSymbol name="square" size={12} color={colors.secondaryText} />
          <Text style={[styles.inlineMetaText, { color: colors.secondaryText }]}>
            {room.total_sq_ft} sq.ft
          </Text>
        </>
      )}
    </View>
  );
}

function SmallBtn({ colors, icon, label, onPress, disabled }: { colors: any; icon: IconSymbolName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.smallBtn, { backgroundColor: colors.secondaryBackground }, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <IconSymbol name={icon} size={14} color={colors.tint} />
      <Text style={[styles.smallBtnText, { color: colors.tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetaChip({ colors, icon, label }: { colors: any; icon: IconSymbolName; label: string }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.secondaryBackground }]}>
      <IconSymbol name={icon} size={12} color={colors.secondaryText} />
      <Text style={[styles.metaChipText, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );
}

interface InfoSectionProps {
  icon: IconSymbolName;
  title: string;
  children: React.ReactNode;
  colors: any;
}
const InfoSection = ({ icon, title, children, colors }: InfoSectionProps) => (
  <View style={[styles.infoSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
    <View style={styles.sectionHeader}>
      <IconSymbol name={icon} size={18} color={colors.tint} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const InfoItem = ({ label, value, colors }: { label: string, value: string, colors: any }) => (
  <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
    <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]} selectable>{value}</Text>
  </View>
);

interface ProductCardProps {
  product: Product;
  colors: any;
  key?: React.Key;
}
const ProductCard: FC<ProductCardProps> = ({ product, colors }) => (
  <View style={[styles.productCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
    <View style={styles.productTop}>
      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{product.name}</Text>
      <Text style={[styles.productPrice, { color: colors.tint }]}>₹{(product.wages || 0).toFixed(2)}</Text>
    </View>
    <Text style={[styles.productCategory, { color: colors.secondaryText }]} numberOfLines={1}>
      {product.product_category}{product.product_subcategory ? ` / ${product.product_subcategory}` : ''}
    </Text>
    <View style={styles.productMetaRow}>
      <MetaBadge colors={colors} icon="list.clipboard.fill" text={`Qty: ${product.quantity} ${product.unit_type}`} />
    </View>
  </View>
);

function MetaBadge({ colors, icon, text }: { colors: any; icon: IconSymbolName; text: string }) {
  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.secondaryBackground }]}>
      <IconSymbol name={icon} size={12} color={colors.secondaryText} />
      <Text style={[styles.metaBadgeText, { color: colors.secondaryText }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const StatusBadge = ({ status, colors }: { status: string | null, colors: any }) => {
  const statusStyles: Record<string, { bg: string, text: string }> = {
    'completed': { bg: colors.successBackground, text: colors.success },
    'in progress': { bg: colors.warningBackground, text: colors.warning },
    'in quotation': { bg: colors.errorBackground, text: colors.error },
    'not active': { bg: colors.secondaryBackground, text: colors.secondaryText },
    default: { bg: colors.secondaryBackground, text: colors.secondaryText },
  };
  const style = statusStyles[status?.toLowerCase() || 'default'] || statusStyles.default;
  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusText, { color: style.text }]}>{status || 'N/A'}</Text>
    </View>
  );
};

function PillTab({ id, title, activeTab, setActiveTab, colors }: {
  id: Tab; title: string; activeTab: Tab; setActiveTab: (t: Tab) => void; colors: any;
}) {
  const active = activeTab === id;
  return (
    <TouchableOpacity
      onPress={() => setActiveTab(id)}
      style={[
        styles.pillTab,
        { borderColor: colors.border, backgroundColor: active ? colors.tint : 'transparent' }
      ]}
      activeOpacity={0.9}
    >
      <Text style={[
        styles.pillTabText,
        { color: active ? '#fff' : colors.secondaryText, fontWeight: active ? '800' : '600' }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const EmptyState = ({ icon, text, colors }: { icon: IconSymbolName, text: string, colors: any }) => (
  <View style={styles.emptyState}>
    <IconSymbol name={icon} size={40} color={colors.border} />
    <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>{text}</Text>
  </View>
);

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Loading/Error */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  errorText: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, marginTop: 16 },
  buttonText: { fontSize: 16, fontWeight: '700' },

  /* Sticky Action Bar */
  stickyBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyLeft: { flex: 1 },
  stickyTitle: { fontSize: 16, fontWeight: '800' },
  stickyActions: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  smallBtnText: { fontSize: 12, fontWeight: '800' },
  inlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  inlineMetaText: { fontSize: 12, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.2)' },

  /* Header Card */
  headerCard: {
    marginTop: 80, // space for sticky bar
    marginHorizontal: 16,
    borderRadius: 16, borderWidth: 1, padding: 16,
    marginBottom: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  headerDescription: { fontSize: 14, lineHeight: 20 },

  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  metaChipText: { fontSize: 12, fontWeight: '700' },

  /* Status */
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },

  /* Tab Bar Modern */
  tabBarModern: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 6,
    borderWidth: 1, borderRadius: 999,
    padding: 4,
    flexDirection: 'row', gap: 6,
  },
  pillTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 999, borderWidth: 0,
  },
  pillTabText: { fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },

  /* Tabs */
  tabContentContainer: { padding: 16, gap: 14 },

  /* Info Section */
  infoSection: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionContent: { padding: 14, gap: 12 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },

  /* Products */
  productCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 10 },
  productPrice: { fontSize: 16, fontWeight: '800' },
  productCategory: { fontSize: 12, fontStyle: 'italic' },
  productMetaRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  metaBadgeText: { fontSize: 12, fontWeight: '700', maxWidth: 180 },

  inlineSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingHorizontal: 2 },
  inlineSummaryText: { fontSize: 12, fontWeight: '700' },
  inlineSummaryValue: { fontSize: 14, fontWeight: '900' },

  /* Images */
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageThumbnail: { width: '31%', aspectRatio: 1, borderRadius: 10, borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, textAlign: 'center' },

  /* Modal */
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalCloseButton: { position: 'absolute', top: 60, right: 20, padding: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  fullImage: { width: '100%', height: '80%', resizeMode: 'contain' },
});
