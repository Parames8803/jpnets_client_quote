import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Measurement, Product, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

export default function RoomDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [room, setRoom] = useState<Room | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isDark = colorScheme === 'dark';

  const fetchRoomData = async (roomId: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);

    try {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        Alert.alert('Error fetching room', roomError.message);
        setRoom(null);
      } else {
        setRoom(roomData);
      }

      // Fetch measurement for the room
      const { data: measurementData, error: measurementError } = await supabase
        .from('measurements')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (measurementError) {
        console.error('Error fetching measurement:', measurementError.message);
        setMeasurement(null);
      } else {
        setMeasurement(measurementData);
      }

      // Fetch products for the room
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching products:', productsError.message);
        setProducts([]);
      } else {
        setProducts(productsData || []);
      }

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (id) {
      fetchRoomData(id as string, true);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRoomData(id as string);
    }
  }, [id]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { backgroundColor: isDark ? '#065f46' : '#d1fae5' };
      case 'in progress':
        return { backgroundColor: isDark ? '#92400e' : '#fef3c7' };
      case 'not active':
        return { backgroundColor: isDark ? '#374151' : '#f3f4f6' };
      case 'in quotation':
        return { backgroundColor: isDark ? '#7c2d12' : '#fecaca' };
      default:
        return { backgroundColor: isDark ? '#374151' : '#f3f4f6' };
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return isDark ? '#10b981' : '#065f46';
      case 'in progress':
        return isDark ? '#f59e0b' : '#92400e';
      case 'not active':
        return isDark ? '#9ca3af' : '#6b7280';
      case 'in quotation':
        return isDark ? '#ef4444' : '#dc2626';
      default:
        return isDark ? '#9ca3af' : '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
        <ActivityIndicator size="large" color={isDark ? '#60a5fa' : '#3b82f6'} />
        <Text style={[styles.loadingText, { color: isDark ? '#e5e7eb' : '#6b7280' }]}>
          Loading room details...
        </Text>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
        <IconSymbol size={48} name="exclamationmark.triangle" color={isDark ? '#ef4444' : '#dc2626'} />
        <Text style={[styles.errorText, { color: isDark ? '#e5e7eb' : '#6b7280' }]}>
          Room not found
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: isDark ? '#3b82f6' : '#2563eb' }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#1f2937' : '#f9fafb'} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? '#60a5fa' : '#3b82f6']}
            tintColor={isDark ? '#60a5fa' : '#3b82f6'}
          />
        }
      >
        {/* Room Details Card */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Room Details
            </Text>
            <View style={[styles.statusBadge, getStatusBadgeStyle(room.status || '')]}>
              <Text style={[styles.statusText, { color: getStatusTextColor(room.status || '') }]}>
                {room.status || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Room Type:</Text>
            <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              {room.room_type || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Description:</Text>
            <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              {room.description || 'No description available'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Created At:</Text>
            <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
              {new Date(room.created_at).toLocaleDateString()}
            </Text>
          </View>

          {room.total_sq_ft && (
            <View style={styles.detailItem}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Total Sq Ft:</Text>
              <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                {room.total_sq_ft} sq.ft
              </Text>
            </View>
          )}
        </View>

        {/* Measurements Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Room Dimensions
            </Text>
          </View>
          {measurement ? (
            <>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Length:</Text>
                <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  {measurement.length_value} {measurement.length_unit_type}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Width:</Text>
                <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  {measurement.width_value} {measurement.width_unit_type}
                </Text>
              </View>
              {measurement.converted_sq_ft !== null && (
                <View style={styles.detailItem}>
                  <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>Total Square Feet:</Text>
                  <Text style={[styles.value, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                    {measurement.converted_sq_ft.toFixed(2)} sq.ft
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              No measurements available for this room.
            </Text>
          )}
        </View>

        {/* Products Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Products
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.countText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {products.length}
              </Text>
            </View>
          </View>

          {products.length > 0 ? (
            products.map((p, index) => (
              <View key={index} style={[styles.listItem, { backgroundColor: isDark ? '#4b5563' : '#f8fafc' }]}>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                    {p.name}
                  </Text>
                  {(p.product_category || p.product_subcategory) && (
                    <Text style={[styles.listItemValue, { color: isDark ? '#d1d5db' : '#6b7280', fontStyle: 'italic', marginBottom: 4 }]}>
                      {p.product_category}{p.product_subcategory ? ` / ${p.product_subcategory}` : ''}
                    </Text>
                  )}
                  <Text style={[styles.listItemValue, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                    Quantity: {p.quantity} {p.unit_type}
                  </Text>
                  <Text style={[styles.listItemValue, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                    Price: ${p.price?.toFixed(2)} (Default: ${p.default_price?.toFixed(2) ?? 'N/A'})
                  </Text>
                  <Text style={[styles.listItemValue, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                    Wages: ${p.wages?.toFixed(2)} (Default: ${p.default_wages?.toFixed(2) ?? 'N/A'})
                  </Text>
                  {p.description && (
                    <Text style={[styles.listItemDescription, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                      {p.description}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="cube.box" color={isDark ? '#6b7280' : '#9ca3af'} />
              <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                No products added to this room.
              </Text>
            </View>
          )}
        </View>

        {/* Images Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Room Images
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.countText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {room.ref_image_urls?.length || 0}
              </Text>
            </View>
          </View>

          {room.ref_image_urls && room.ref_image_urls.length > 0 ? (
            <View style={styles.imageGrid}>
              {room.ref_image_urls.map((uri, index) => {
                const publicUrl = supabase.storage.from('file-storage').getPublicUrl(uri).data.publicUrl;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedImage(publicUrl);
                      setModalVisible(true);
                    }}
                    style={styles.imageThumbnailContainer}
                  >
                    <Image source={{ uri: publicUrl }} style={styles.imageThumbnail} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={48} name="photo" color={isDark ? '#6b7280' : '#9ca3af'} />
              <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                No reference images available.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} />
          )}
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  listItemDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageThumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
