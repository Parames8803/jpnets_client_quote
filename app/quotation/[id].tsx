import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Client, Measurement, Product, Quotation, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

const { width } = Dimensions.get('window');

export default function QuotationDetailsScreen() {
  const router = useRouter();
  const { id: quotationId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allProducts, setAllProducts] = useState<(Product & { room_type?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchQuotationDetails = async () => {
    if (!quotationId) {
      Alert.alert('Error', 'Quotation ID is missing.');
      setLoading(false);
      return;
    }

    const id_str = Array.isArray(quotationId) ? quotationId[0] : quotationId;

    try {
      // Fetch quotation details
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id_str)
        .single();

      if (quotationError) {
        Alert.alert('Error fetching quotation', quotationError.message);
        setQuotation(null);
        setLoading(false);
        return;
      }
      setQuotation(quotationData);

      // Fetch client details
      if (quotationData?.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', quotationData.client_id)
          .single();

        if (clientError) {
          console.error('Error fetching client for quotation:', clientError.message);
          setClient(null);
        } else {
          setClient(clientData);
        }
      }

      // Define a type for the joined data structure
      type QuotationRoomJoin = {
        room_id: string;
        room_total_price: number | null;
        rooms: (Room & { measurements: Measurement[]; products: Product[]; }) | null;
      };

      // Fetch rooms associated with this quotation, along with their measurements and products
      const { data: quotationRoomsData, error: quotationRoomsError } = await supabase
        .from('quotation_rooms')
        .select(`
          room_id,
          room_total_price,
          rooms (
            *,
            measurements (*),
            products (*)
          )
        `)
        .eq('quotation_id', id_str) as { data: QuotationRoomJoin[] | null; error: any };

      if (quotationRoomsError) {
        console.error('Error fetching quotation rooms:', quotationRoomsError.message);
        setRooms([]);
      } else {
        const fetchedRooms = quotationRoomsData?.map(qr => {
          if (qr.rooms) {
            return {
              ...qr.rooms,
              room_total_price: qr.room_total_price,
            };
          }
          return null;
        }).filter((room): room is Room & { measurements: Measurement[]; products: Product[]; room_total_price: number | null; } => room !== null) || [];
        setRooms(fetchedRooms);

        const products = fetchedRooms.flatMap(room =>
          room.products ? room.products.map(p => ({ ...p, room_type: room.room_type ?? undefined })) : []
        );
        setAllProducts(products);
      }

    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationDetails();
  }, [quotationId]);

  const handleDeleteQuotation = async () => {
    Alert.alert(
      'Delete Quotation',
      'Are you sure you want to delete this quotation? This will also revert the status of associated rooms to "Not Active". This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Get room IDs associated with this quotation
              const { data: quotationRooms, error: fetchQrError } = await supabase
                .from('quotation_rooms')
                .select('room_id')
                .eq('quotation_id', quotationId);

              if (fetchQrError) {
                console.error('Error fetching associated rooms for deletion:', fetchQrError.message);
                Alert.alert('Error', 'Failed to fetch associated rooms.');
                setLoading(false);
                return;
              }

              const roomIdsToUpdate = quotationRooms?.map(qr => qr.room_id) || [];

              // Delete entries from quotation_rooms table
              const { error: deleteQrError } = await supabase
                .from('quotation_rooms')
                .delete()
                .eq('quotation_id', quotationId);

              if (deleteQrError) {
                console.error('Error deleting quotation rooms:', deleteQrError.message);
                Alert.alert('Error', 'Failed to delete associated rooms from quotation.');
                setLoading(false);
                return;
              }

              // Delete the quotation itself
              const { error: deleteQuotationError } = await supabase
                .from('quotations')
                .delete()
                .eq('id', quotationId);

              if (deleteQuotationError) {
                console.error('Error deleting quotation:', deleteQuotationError.message);
                Alert.alert('Error', 'Failed to delete quotation.');
                setLoading(false);
                return;
              }

              // Update status of associated rooms back to 'Not Active'
              if (roomIdsToUpdate.length > 0) {
                const { error: updateRoomsError } = await supabase
                  .from('rooms')
                  .update({ status: 'Not Active' })
                  .in('id', roomIdsToUpdate);

                if (updateRoomsError) {
                  console.error('Error updating room statuses after quotation deletion:', updateRoomsError.message);
                  Alert.alert('Warning', 'Quotation deleted, but failed to revert room statuses.');
                }
              }

              Alert.alert('Success', 'Quotation and associated rooms deleted successfully!');
              if (client?.id) {
                router.replace({ pathname: '/client/[id]', params: { id: client.id } });
              } else {
                router.replace('/clients');
              }
            } catch (error: any) {
              Alert.alert('An unexpected error occurred', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading quotation details...
        </Text>
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Quotation not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Quotation Details</Text>
          <TouchableOpacity 
            onPress={handleDeleteQuotation} 
            style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            activeOpacity={0.7}
          >
            <IconSymbol size={20} name="trash.fill" color={colors.error} />
          </TouchableOpacity>
        </View>
        
        {/* Quotation ID Badge */}
        <View style={[styles.quotationBadge, { backgroundColor: colors.tint + '20' }]}>
          <IconSymbol name="doc.text" size={16} color={colors.tint} />
          <Text style={[styles.quotationIdText, { color: colors.tint }]}>
            #{quotation.id.slice(-8).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              ${quotation.total_price?.toFixed(2) || '0.00'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Amount</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{allProducts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Products</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statValue, { color: colors.tint }]}>{rooms.length}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Rooms</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="person.fill" size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <InfoItem 
              icon="person" 
              label="Name" 
              value={client?.name || 'N/A'} 
              colors={colors} 
            />
            <InfoItem 
              icon="phone" 
              label="Contact" 
              value={client?.contact_number || 'N/A'} 
              colors={colors} 
            />
            <InfoItem 
              icon="envelope" 
              label="Email" 
              value={client?.email || 'N/A'} 
              colors={colors} 
            />
            <InfoItem 
              icon="location" 
              label="Address" 
              value={client?.address || 'N/A'} 
              colors={colors} 
            />
          </View>
        </View>

        {/* Quotation Information */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="doc.text.fill" size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quotation Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <InfoItem 
              icon="calendar" 
              label="Created" 
              value={new Date(quotation.created_at).toLocaleDateString()} 
              colors={colors} 
            />
            <InfoItem 
              icon="dollarsign" 
              label="Total Price" 
              value={`$${quotation.total_price?.toFixed(2) || 'N/A'}`} 
              colors={colors} 
            />
          </View>
          
          {(quotation.pdf_url || quotation.excel_url) && (
            <View style={styles.documentsContainer}>
              {quotation.pdf_url && (
                <TouchableOpacity style={[styles.documentButton, { backgroundColor: colors.error + '20' }]}>
                  <IconSymbol name="doc.richtext" size={16} color={colors.error} />
                  <Text style={[styles.documentButtonText, { color: colors.error }]}>PDF</Text>
                </TouchableOpacity>
              )}
              {quotation.excel_url && (
                <TouchableOpacity style={[styles.documentButton, { backgroundColor: colors.success + '20' }]}>
                  <IconSymbol name="table" size={16} color={colors.success} />
                  <Text style={[styles.documentButtonText, { color: colors.success }]}>Excel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Products List */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="cube.fill" size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Products ({allProducts.length})
            </Text>
          </View>
          
          {allProducts.length > 0 ? (
            <View style={styles.productsContainer}>
              {allProducts.map((product, index) => (
                <View key={product.id} style={[styles.productCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.productHeader}>
                    <View style={[styles.productIndex, { backgroundColor: colors.tint }]}>
                      <Text style={styles.productIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.productTitleContainer}>
                      <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productRoom, { color: colors.secondaryText }]}>
                        {product.room_type || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.productDetails}>
                    <View style={styles.productMetaRow}>
                      <View style={styles.productMetaItem}>
                        <Text style={[styles.productMetaLabel, { color: colors.secondaryText }]}>Quantity</Text>
                        <Text style={[styles.productMetaValue, { color: colors.text }]}>
                          {product.quantity} {product.unit_type}
                        </Text>
                      </View>
                      <View style={styles.productMetaItem}>
                        <Text style={[styles.productMetaLabel, { color: colors.secondaryText }]}>Price</Text>
                        <Text style={[styles.productMetaValue, { color: colors.tint }]}>
                          ${product.price?.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    {product.description && (
                      <View style={[styles.productDescription, { backgroundColor: colors.secondaryBackground }]}>
                        <Text style={[styles.productDescriptionText, { color: colors.secondaryText }]}>
                          {product.description}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="cube" size={48} color={colors.secondaryText} />
              <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>
                No products associated with this quotation
              </Text>
            </View>
          )}
        </View>

        {/* Quotation Summary */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.bar.fill" size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              This quotation includes {allProducts.length} products across {rooms.length} rooms 
              with a total value of ${quotation.total_price?.toFixed(2) || '0.00'}.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)}
            activeOpacity={0.8}
          >
            <IconSymbol name="xmark" size={20} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} />
          )}
        </View>
      </Modal>
    </View>
  );
}

// Info Item Component
const InfoItem = ({ icon, label, value, colors }: { 
  icon: IconSymbolName; 
  label: string; 
  value: string; 
  colors: any; 
}) => (
  <View style={styles.infoItem}>
    <View style={styles.infoItemHeader}>
      <IconSymbol name={icon} size={14} color={colors.icon} />
      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  headerContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 10,
  },
  quotationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quotationIdText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 6,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 20,
  },
  documentsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  productsContainer: {
    gap: 16,
  },
  productCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  productIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productTitleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productRoom: {
    fontSize: 12,
    marginTop: 2,
  },
  productDetails: {
    gap: 12,
  },
  productMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  productMetaItem: {
    flex: 1,
  },
  productMetaLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  productMetaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  productDescription: {
    padding: 12,
    borderRadius: 8,
  },
  productDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width * 0.9,
    height: '80%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    zIndex: 1,
  },
});
