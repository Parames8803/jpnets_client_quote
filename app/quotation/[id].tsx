import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Client, Measurement, Product, Quotation, Room } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

export default function QuotationDetailsScreen() {
  const router = useRouter();
  const { id: quotationId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
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
                router.replace({ pathname: '/client/[id]', params: { id: client.id } }); // Navigate back to client details
              } else {
                router.replace('/clients'); // Navigate to generic clients list if client ID is not available
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <Text style={styles.loadingText}>Loading quotation details...</Text>
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Quotation not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quotation Details</Text>
          <TouchableOpacity onPress={handleDeleteQuotation} style={styles.deleteButton}>
            <IconSymbol size={24} name="trash.fill" color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <Text style={styles.label}>Name: <Text style={styles.text}>{client?.name || 'N/A'}</Text></Text>
          <Text style={styles.label}>Contact: <Text style={styles.text}>{client?.contact_number || 'N/A'}</Text></Text>
          <Text style={styles.label}>Email: <Text style={styles.text}>{client?.email || 'N/A'}</Text></Text>
          <Text style={styles.label}>Address: <Text style={styles.text}>{client?.address || 'N/A'}</Text></Text>
        </View>

        {/* Quotation Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quotation Information</Text>
          <Text style={styles.label}>Quotation ID: <Text style={styles.text}>{quotation.id}</Text></Text>
          <Text style={styles.label}>Total Price: <Text style={styles.text}>${quotation.total_price?.toFixed(2) || 'N/A'}</Text></Text>
          <Text style={styles.label}>Created At: <Text style={styles.text}>{new Date(quotation.created_at).toLocaleDateString()}</Text></Text>
          {quotation.pdf_url && <Text style={styles.label}>PDF: <Text style={styles.linkText}>{quotation.pdf_url}</Text></Text>}
          {quotation.excel_url && <Text style={styles.label}>Excel: <Text style={styles.linkText}>{quotation.excel_url}</Text></Text>}
        </View>

        {/* Products List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products ({allProducts.length})</Text>
          {allProducts.length > 0 ? (
            allProducts.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productInfoContainer}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDetailsText}>
                    Room: {product.room_type || 'N/A'}
                  </Text>
                  <Text style={styles.productDetailsText}>
                    Quantity: {product.quantity} {product.unit_type}
                  </Text>
                  <Text style={styles.productDetailsText}>
                    Price: ${product.price?.toFixed(2)} | Wages: ${product.wages?.toFixed(2)}
                  </Text>
                  {product.description && (
                    <Text style={styles.productDescription}>
                      Description: {product.description}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No products associated with this quotation.</Text>
          )}
        </View>

        {/* Quotation Summary (Placeholder) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quotation Summary</Text>
          <Text style={styles.text}>
            This section will contain a summary of the quotation, including total calculated costs,
            discounts, and final payable amount.
          </Text>
        {/* Add more summary details here */}
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
    backgroundColor: '#f0f4f7',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
    color: '#555',
  },
  text: {
    fontSize: 16,
    color: '#777',
  },
  linkText: {
    fontSize: 16,
    color: Colors.light.tint,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  roomItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  roomItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 5,
  },
  roomItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  roomItemInfo: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  subSection: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 2,
  },
  subTextBold: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  productItem: {
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productInfoContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#444',
  },
  productDetailsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  productDescription: {
    fontSize: 13,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 5,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  referenceImage: {
    width: '100%',
    height: 200, // Or a suitable height
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  imageThumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
});
