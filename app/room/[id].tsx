import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Measurement, Product, Room } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { FC, useCallback, useEffect, useState } from 'react';
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

// --- Custom Hook for Data Fetching and Logic ---

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
      // Single, consolidated query to fetch room and all its related data
      const { data: rawData, error: queryError } = await supabase
        .from('rooms')
        .select(`
          *,
          measurements (*),
          products (*)
        `)
        .eq('id', id_str)
        .single();

      if (queryError) throw queryError;
      if (!rawData) throw new Error('Room not found.');

      const { measurements, products, ...room } = rawData;
      
      setData({
        room: room as Room,
        measurement: measurements.length > 0 ? measurements[0] : null,
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

// --- Tab Content Components ---

const DetailsTab = ({ room, measurement, colors, refreshing, onRefresh }: { room: Room, measurement: Measurement | null, colors: any, refreshing: boolean, onRefresh: () => void }) => (
  <ScrollView contentContainerStyle={styles.tabContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}>
    <InfoSection icon="house.fill" title="Room Information" colors={colors} children={
      <>
        <InfoItem label="Description" value={room.description || 'N/A'} colors={colors} />
        <InfoItem label="Created On" value={new Date(room.created_at).toLocaleDateString()} colors={colors} />
        {room.total_sq_ft && <InfoItem label="Total Area" value={`${room.total_sq_ft} sq.ft`} colors={colors} />}
      </>
    }/>
    
    <InfoSection icon="ruler.fill" title="Dimensions" colors={colors} children={
      <>
        {measurement ? (
          <>
            <InfoItem label="Length" value={`${measurement.length_value} ${measurement.length_unit_type}`} colors={colors} />
            <InfoItem label="Width" value={`${measurement.width_value} ${measurement.width_unit_type}`} colors={colors} />
            {measurement.converted_sq_ft !== null && (
              <InfoItem label="Calculated Area" value={`${measurement.converted_sq_ft.toFixed(2)} sq.ft`} colors={colors} />
            )}
          </>
        ) : (
          <EmptyState icon="ruler" text="No measurements recorded." colors={colors} />
        )}
      </>
    }/>
  </ScrollView>
);

const ProductsTab = ({ products, colors, refreshing, onRefresh }: { products: Product[], colors: any, refreshing: boolean, onRefresh: () => void }) => (
  <ScrollView contentContainerStyle={styles.tabContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}>
    {products.length > 0 ? (
      products.map((product) => (
        <ProductCard key={product.id} product={product} colors={colors} />
      ))
    ) : (
      <EmptyState icon="cube.box" text="No products added to this room." colors={colors} />
    )}
  </ScrollView>
);

const ImagesTab = ({ imageUrls, colors, refreshing, onRefresh }: { imageUrls: string[] | null, colors: any, refreshing: boolean, onRefresh: () => void }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImage = (url: string) => {
    const publicUrl = supabase.storage.from('file-storage').getPublicUrl(url).data.publicUrl;
    setSelectedImage(publicUrl);
    setModalVisible(true);
  };
  
  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}>
      {imageUrls && imageUrls.length > 0 ? (
        <View style={styles.imageGrid}>
          {imageUrls.map((url, index) => (
            <TouchableOpacity key={index} onPress={() => openImage(url)}>
              <Image 
                source={{ uri: supabase.storage.from('file-storage').getPublicUrl(url).data.publicUrl }} 
                style={[styles.imageThumbnail, { borderColor: colors.border }]} 
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <EmptyState icon="photo.on.rectangle" text="No reference images found." colors={colors} />
      )}

      <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)} animationType="fade">
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

// --- Main Component ---
type Tab = 'details' | 'products' | 'images';

export default function RoomDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const { data, loading, error, refetch } = useRoomDetails(id);
  const { userRole } = useAuth(); // Get user role
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [refreshing, setRefreshing] = useState(false);

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
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, {backgroundColor: colors.tint}]}>
            <Text style={[styles.buttonText, {color: '#FFF'}]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { room, measurement, products } = data;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details': return <DetailsTab room={room} measurement={measurement} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />;
      case 'products': return <ProductsTab products={products} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />;
      case 'images': return <ImagesTab imageUrls={room.ref_image_urls} colors={colors} refreshing={refreshing} onRefresh={onRefresh} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{room.room_type}</Text>
          <StatusBadge status={room.status} colors={colors} />
        </View>
        {userRole !== 'client' && userRole !== 'worker' && (
          <TouchableOpacity onPress={() => router.push(`/room/edit/${room.id}`)} style={styles.headerButton}>
            <IconSymbol name="pencil" size={22} color={colors.tint} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TabButton id="details" title="Details" activeTab={activeTab} onPress={setActiveTab} colors={colors} />
        <TabButton id="products" title={`Products (${products.length})`} activeTab={activeTab} onPress={setActiveTab} colors={colors} />
        <TabButton id="images" title={`Images (${room.ref_image_urls?.length || 0})`} activeTab={activeTab} onPress={setActiveTab} colors={colors} />
      </View>
      
      {renderTabContent()}
      
      {userRole !== 'client' && userRole !== 'worker' && (
        <TouchableOpacity 
          style={[styles.fab]} 
          onPress={() => router.push(`/room/add-product/${room.id}`)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Helper UI Components ---

interface InfoSectionProps {
  icon: IconSymbolName;
  title: string;
  children: React.ReactNode;
  colors: any;
}

const InfoSection = ({ icon, title, children, colors }: InfoSectionProps) => (
    <View style={[styles.infoSection, {backgroundColor: colors.cardBackground, borderColor: colors.border}]}>
        <View style={styles.sectionHeader}>
            <IconSymbol name={icon} size={18} color={colors.tint} />
            <Text style={[styles.sectionTitle, {color: colors.text}]}>{title}</Text>
        </View>
        <View style={styles.sectionContent}>{children}</View>
    </View>
);

const InfoItem = ({ label, value, colors }: { label: string, value: string, colors: any }) => (
    <View style={[styles.infoItem, {borderBottomColor: colors.border}]}>
        <Text style={[styles.infoLabel, {color: colors.secondaryText}]}>{label}</Text>
        <Text style={[styles.infoValue, {color: colors.text}]} selectable>{value}</Text>
    </View>
);

interface ProductCardProps {
  product: Product;
  colors: any;
  key?: React.Key;
}

const ProductCard: FC<ProductCardProps> = ({ product, colors }) => (
    <View style={[styles.productCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
      <Text style={[styles.productCategory, { color: colors.secondaryText }]}>
        {product.product_category}{product.product_subcategory ? ` / ${product.product_subcategory}` : ''}
      </Text>
      <View style={styles.productMetaRow}>
        <Text style={[styles.productMeta, { color: colors.text }]}>Qty: {product.quantity} {product.unit_type}</Text>
        <Text style={[styles.productMeta, { color: colors.tint, fontWeight: 'bold' }]}>₹{product.wages?.toFixed(2)}</Text>
      </View>
    </View>
);

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

const TabButton = ({ id, title, activeTab, onPress, colors }: { id: Tab, title: string, activeTab: Tab, onPress: (id: Tab) => void, colors: any }) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity onPress={() => onPress(id)} style={[styles.tabButton, isActive && { borderBottomColor: colors.tint }]}>
        <Text style={[styles.tabButtonText, { color: isActive ? colors.tint : colors.secondaryText, fontWeight: isActive ? 'bold' : '500' }]}>{title}</Text>
      </TouchableOpacity>
    );
};
  
const EmptyState = ({ icon, text, colors }: { icon: IconSymbolName, text: string, colors: any }) => (
    <View style={styles.emptyState}>
      <IconSymbol name={icon} size={40} color={colors.border} />
      <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>{text}</Text>
    </View>
);

// --- Stylesheet (Redesigned) ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  errorText: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginTop: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginTop: 16 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  headerButton: { padding: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonText: { fontSize: 14, textTransform: 'uppercase' },
  tabContentContainer: { padding: 20, gap: 16 },
  infoSection: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  sectionContent: { padding: 16, gap: 12 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  productCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productCategory: { fontSize: 12, fontStyle: 'italic' },
  productMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  productMeta: { fontSize: 14 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageThumbnail: { width: 100, height: 100, borderRadius: 8, borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8, backgroundColor: "#0ea5e9" },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalCloseButton: { position: 'absolute', top: 60, right: 20, padding: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  fullImage: { width: '100%', height: '80%', resizeMode: 'contain' },
});
