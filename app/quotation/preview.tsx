import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Product } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

type EditableProduct = Product & { originalId: string };

const { width } = Dimensions.get('window');

export default function QuotationPreviewScreen() {
  const router = useRouter();
  const { clientId, selectedRoomIds: selectedRoomIdsString } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);

  const selectedRoomIds = JSON.parse(selectedRoomIdsString as string);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedRoomIds || selectedRoomIds.length === 0) {
        Alert.alert('Error', 'No rooms selected.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('room_id', selectedRoomIds);

        if (error) {
          Alert.alert('Error fetching products', error.message);
          setProducts([]);
        } else {
          const editableProducts = data.map((p) => ({ ...p, originalId: p.id }));
          setProducts(editableProducts);
        }
      } catch (error: any) {
        Alert.alert('An unexpected error occurred', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedRoomIdsString]);

  const handleUpdateProduct = async (updatedProduct: EditableProduct) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          description: updatedProduct.description,
          price: updatedProduct.price,
          wages: updatedProduct.wages,
        })
        .eq('id', updatedProduct.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
      );
      setModalVisible(false);
      setEditingProduct(null);
    } catch (error: any) {
      Alert.alert('Error updating product', error.message);
    }
  };

  const calculateTotal = () => {
    return products.reduce((acc, p) => acc + (p.price || 0), 0);
  };

  const handleSubmitQuotation = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create Quotation
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .insert({ client_id: clientId, total_price: calculateTotal(), status: 'Not Active' }) // Set default status
        .select()
        .single();

      if (quotationError) throw quotationError;
      const newQuotationId = quotationData.id;

      // 2. Link Rooms and calculate room totals
      const quotationRooms = selectedRoomIds.map((roomId: string) => {
        const roomProducts = products.filter((p) => p.room_id === roomId);
        const roomTotalPrice = roomProducts.reduce(
          (acc, p) => acc + (p.price || 0),
          0
        );
        return {
          quotation_id: newQuotationId,
          room_id: roomId,
          room_total_price: roomTotalPrice,
        };
      });

      const { error: roomsError } = await supabase.from('quotation_rooms').insert(quotationRooms);
      if (roomsError) throw roomsError;

      // 3. Update Room Status
      const { error: updateStatusError } = await supabase
        .from('rooms')
        .update({ status: 'In Quotation' })
        .in('id', selectedRoomIds);
      if (updateStatusError) throw updateStatusError;

      Alert.alert('Success', 'Quotation submitted successfully!');
      router.replace({ pathname: '/quotation/[id]', params: { id: newQuotationId } });
    } catch (error: any) {
      Alert.alert('Submission Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProductItem = ({ item, index }: { item: EditableProduct; index: number }) => (
    <View style={[styles.productCard, { backgroundColor: colors.background }]}>
      <View style={styles.productHeader}>
        <View style={[styles.indexBadge, { backgroundColor: colors.tint }]}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditingProduct(item);
            setModalVisible(true);
          }}
        >
          <IconSymbol name="pencil" size={20} color={colors.tint} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.productContent}>
        <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.productDescription, { color: colors.text + '80' }]}>
          {item.description}
        </Text>
        <View style={styles.productMeta}>
          <View style={styles.quantityContainer}>
            <Text style={[styles.quantity, { color: colors.text }]}>
              {item.quantity} {item.unit_type}
            </Text>
          </View>
          <View style={[styles.priceContainer, { backgroundColor: colors.tint + '20' }]}>
            <Text style={[styles.price, { color: colors.tint }]}>
              ${item.price?.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading products...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Quotation Preview</Text>
        <View style={[styles.dateContainer, { backgroundColor: colors.tint + '20' }]}>
          <IconSymbol name="calendar" size={16} color={colors.tint} />
          <Text style={[styles.dateText, { color: colors.tint }]}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>
      </View>

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.totalCard, { backgroundColor: colors.background }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
          <Text style={[styles.totalAmount, { color: colors.tint }]}>
            ${calculateTotal().toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: colors.tint },
          isSubmitting && styles.submittingButton
        ]}
        onPress={handleSubmitQuotation}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
        )}
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit Quotation'}
        </Text>
      </TouchableOpacity>

      {editingProduct && (
        <EditProductModal
          visible={modalVisible}
          product={editingProduct}
          onClose={() => setModalVisible(false)}
          onSave={handleUpdateProduct}
          colors={colors}
        />
      )}
    </ScrollView>
  );
}

const EditProductModal = ({ visible, product, onClose, onSave, colors }: any) => {
  const [editedProduct, setEditedProduct] = useState(product);

  useEffect(() => {
    setEditedProduct(product);
  }, [product]);

  const handleSave = () => {
    onSave(editedProduct);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Product
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.productNameInModal, { color: colors.tint }]}>
            {product.name}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.text + '30', color: colors.text }]}
              value={editedProduct?.description}
              onChangeText={(text) => setEditedProduct({ ...editedProduct, description: text })}
              placeholder="Enter description"
              placeholderTextColor={colors.text + '60'}
              multiline
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Price ($)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.text + '30', color: colors.text }]}
                value={String(editedProduct?.price)}
                onChangeText={(text) => setEditedProduct({ ...editedProduct, price: Number(text) })}
                placeholder="0.00"
                placeholderTextColor={colors.text + '60'}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 10 }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Wages ($)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.text + '30', color: colors.text }]}
                value={String(editedProduct?.wages)}
                onChangeText={(text) => setEditedProduct({ ...editedProduct, wages: Number(text) })}
                placeholder="0.00"
                placeholderTextColor={colors.text + '60'}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: colors.text + '30' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
  },
  productContent: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flex: 1,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submittingButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  productNameInModal: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
