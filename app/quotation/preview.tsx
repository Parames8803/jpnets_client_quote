import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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

export default function QuotationPreviewScreen() {
  const router = useRouter();
  const { clientId, selectedRoomIds: selectedRoomIdsString } = useLocalSearchParams();
  const colorScheme = useColorScheme();

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
        .insert({ client_id: clientId, total_price: calculateTotal() })
        .select()
        .single();

      if (quotationError) throw quotationError;
      const newQuotationId = quotationData.id;

      // 2. Link Rooms
      const quotationRooms = selectedRoomIds.map((roomId: string) => ({
        quotation_id: newQuotationId,
        room_id: roomId,
      }));
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
    <View style={styles.productItem}>
      <Text style={styles.productIndex}>{index + 1}</Text>
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription}>{item.description}</Text>
        <Text style={styles.productInfo}>
          {item.quantity} {item.unit_type} @ ${item.price?.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setEditingProduct(item);
          setModalVisible(true);
        }}
      >
        <IconSymbol name="pencil" size={24} color={Colors.light.tint} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><Text>Loading products...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Quotation Preview</Text>
      <View style={styles.header}>
        <Text>Date: {new Date().toLocaleDateString()}</Text>
      </View>

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submittingButton]}
        onPress={handleSubmitQuotation}
        disabled={isSubmitting}
      >
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
        />
      )}
    </ScrollView>
  );
}

const EditProductModal = ({ visible, product, onClose, onSave }: any) => {
  const [editedProduct, setEditedProduct] = useState(product);

  useEffect(() => {
    setEditedProduct(product);
  }, [product]);

  const handleSave = () => {
    onSave(editedProduct);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit: {product.name}</Text>
          <TextInput
            style={styles.input}
            value={editedProduct?.description}
            onChangeText={(text) => setEditedProduct({ ...editedProduct, description: text })}
            placeholder="Description"
          />
          <TextInput
            style={styles.input}
            value={String(editedProduct?.price)}
            onChangeText={(text) => setEditedProduct({ ...editedProduct, price: Number(text) })}
            placeholder="Price"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={String(editedProduct?.wages)}
            onChangeText={(text) => setEditedProduct({ ...editedProduct, wages: Number(text) })}
            placeholder="Wages"
            keyboardType="numeric"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  header: { marginBottom: 20 },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productIndex: { marginRight: 10, fontWeight: 'bold' },
  productDetails: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productDescription: { color: '#666' },
  productInfo: { marginTop: 5 },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 18, marginLeft: 10 },
  submitButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submittingButton: { backgroundColor: '#ccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  button: { padding: 10 },
  saveButton: { backgroundColor: Colors.light.tint, borderRadius: 5, marginLeft: 10 },
  saveButtonText: { color: '#fff' },
});
