import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Client, Product, Room, ROOM_STATUS_TYPES, QUOTATION_STATUS_TYPES } from '../../types/db';
import { supabase } from '../../utils/supabaseClient';

type EditableProduct = Product & { originalId: string };
type GroupedProduct = Room & { products: EditableProduct[]; subtotal: number };
const { width } = Dimensions.get('window');

// --- Edit Product Modal Component ---
const EditProductModal = ({ visible, product, onClose, onSave, colors }: any) => {
  const defaultProduct: EditableProduct = {
    id: '',
    created_at: '',
    room_id: null,
    name: null,
    product_category: null,
    product_subcategory: null,
    quantity: null,
    unit_type: null,
    price: null,
    default_price: null,
    wages: null,
    default_wages: null,
    description: null,
    length_value: null,
    length_unit_type: null,
    width_value: null,
    width_unit_type: null,
    originalId: '',
  };
  const [editedProduct, setEditedProduct] = useState<EditableProduct>(product || defaultProduct);

  useEffect(() => {
    setEditedProduct(product || defaultProduct);
  }, [product]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card.backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.color }]}>Edit Item</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={24} color={colors.subtext.color} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.modalProductLabel, { color: colors.primary.color }]}>{editedProduct.name ?? ''}</Text>
          
          <Text style={[styles.inputLabel, { color: colors.text.color }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.separator.backgroundColor, color: colors.text.color, backgroundColor: colors.background.backgroundColor }]}
            value={editedProduct.description ?? ''}
            onChangeText={(text) => setEditedProduct({ ...editedProduct, description: text })}
            placeholder="Product description"
            placeholderTextColor={colors.subtext.color}
            multiline
          />

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text.color }]}>Price ($)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.separator.backgroundColor, color: colors.text.color, backgroundColor: colors.background.backgroundColor }]}
                value={String(editedProduct.price ?? '')}
                onChangeText={(text) => setEditedProduct({ ...editedProduct, price: parseFloat(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.text.color }]}>Wages ($)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.separator.backgroundColor, color: colors.text.color, backgroundColor: colors.background.backgroundColor }]}
                value={String(editedProduct.wages ?? '')}
                onChangeText={(text) => setEditedProduct({ ...editedProduct, wages: parseFloat(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary.color }]}
            onPress={() => onSave(editedProduct)}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- Room Card Component ---
const RoomCard = ({ group, onEdit, colors }: { group: GroupedProduct, onEdit: (product: EditableProduct) => void, colors: any }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.roomCard, colors.card]}>
      <TouchableOpacity style={styles.roomHeader} onPress={toggleExpand}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.roomName, colors.text]}>{group.room_type}</Text>
          <Text style={[styles.roomSubtotal, colors.primary]}>${group.subtotal.toFixed(2)}</Text>
        </View>
        <IconSymbol name={isExpanded ? 'chevron.up' : 'chevron.down'} size={20} color={colors.subtext.color} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.productList, { borderTopColor: colors.separator.backgroundColor }]}>
          {group.products.map(product => (
            <View key={product.id} style={[styles.productRow, { borderBottomColor: colors.separator.backgroundColor }]}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, colors.text]}>{product.name}</Text>
                <Text style={[styles.productDetails, colors.subtext]}>{product.quantity} {product.unit_type}</Text>
              </View>
              <View style={styles.productActions}>
                <Text style={[styles.productPrice, colors.text]}>${product.price?.toFixed(2)}</Text>
                <TouchableOpacity style={styles.editButton} onPress={() => onEdit(product)}>
                  <IconSymbol name="pencil" size={18} color={colors.primary.color} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};


export default function QuotationPreviewScreen() {
  const router = useRouter();
  const { clientId, selectedRoomIds: selectedRoomIdsString } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  
  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [nextQuoteId, setNextQuoteId] = useState<string | null>(null);

  const selectedRoomIds: string[] = JSON.parse(selectedRoomIdsString as string);
  
  const isDark = colorScheme === 'dark';
  const themedStyles = {
    background: { backgroundColor: isDark ? '#111827' : '#f3f4f6' },
    card: { backgroundColor: isDark ? '#1f2937' : '#ffffff' },
    text: { color: isDark ? '#f9fafb' : '#111827' },
    subtext: { color: isDark ? '#9ca3af' : '#6b7280' },
    primary: { color: isDark ? '#38bdf8' : '#0ea5e9' },
    separator: { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
  };

  useEffect(() => {
    const fetchQuotationData = async () => {
      if (!selectedRoomIds || selectedRoomIds.length === 0 || !clientId) {
        Alert.alert('Error', 'Missing required data.');
        setLoading(false);
        return;
      }

      try {
        const [clientRes, roomsRes, productsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('rooms').select('*').in('id', selectedRoomIds),
          supabase.from('products').select('*').in('room_id', selectedRoomIds),
        ]);

        if (clientRes.error) throw clientRes.error;
        if (roomsRes.error) throw roomsRes.error;
        if (productsRes.error) throw productsRes.error;
        
        setClient(clientRes.data);
        setRooms(roomsRes.data);
        setProducts(productsRes.data.map(p => ({ ...p, originalId: p.id })));
      } catch (error: any) {
        Alert.alert('Error fetching data', error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchNextQuoteId = async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('quote_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest quote ID:', error);
        setNextQuoteId('JP001'); // Fallback to default
        return;
      }

      if (data && data.length > 0 && data[0].quote_id) {
        const latestQuoteId = data[0].quote_id;
        const num = parseInt(latestQuoteId.replace('JP', ''), 10);
        setNextQuoteId(`JP${String(num + 1).padStart(3, '0')}`);
      } else {
        setNextQuoteId('JP001');
      }
    };

    fetchQuotationData();
    fetchNextQuoteId();
  }, [clientId, selectedRoomIdsString]);

  const groupedProducts: GroupedProduct[] = useMemo(() => {
    return rooms.map(room => {
      const roomProducts = products.filter(p => p.room_id === room.id);
      const subtotal = roomProducts.reduce((sum, p) => sum + (p.price || 0), 0);
      return { ...room, products: roomProducts, subtotal };
    });
  }, [rooms, products]);

  const grandTotal = useMemo(() => groupedProducts.reduce((sum, g) => sum + g.subtotal, 0), [groupedProducts]);

  const handleUpdateProduct = async (updatedProduct: EditableProduct) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ description: updatedProduct.description, price: updatedProduct.price, wages: updatedProduct.wages })
        .eq('id', updatedProduct.id)
        .select()
        .single();

      if (error) throw error;
      setProducts(prev => prev.map(p => (p.id === data.id ? { ...p, ...data } : p)));
      setModalVisible(false);
      setEditingProduct(null);
    } catch (error: any) {
      Alert.alert('Error updating product', error.message);
    }
  };

  const handleSubmitQuotation = async () => {
    setIsSubmitting(true);
    try {
      if (!nextQuoteId) {
        Alert.alert('Error', 'Quotation ID not generated. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .insert({ client_id: clientId, total_price: grandTotal, status: QUOTATION_STATUS_TYPES.PENDING, quote_id: nextQuoteId })
        .select().single();
      if (quotationError) throw quotationError;

      const newQuotationId = quotationData.id;
      const quotationRooms = groupedProducts.map(g => ({
        quotation_id: newQuotationId, room_id: g.id, room_total_price: g.subtotal,
      }));

      await supabase.from('quotation_rooms').insert(quotationRooms);
      await supabase.from('rooms').update({ status: ROOM_STATUS_TYPES.IN_QUOTATION }).in('id', selectedRoomIds);

      Alert.alert('Success', 'Quotation submitted!', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/quotation/[id]', params: { id: newQuotationId } }) }
      ]);
    } catch (error: any) {
      Alert.alert('Submission Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centeredContainer, themedStyles.background]}>
        <ActivityIndicator size="large" color={themedStyles.primary.color} />
        <Text style={[styles.loadingText, themedStyles.subtext]}>Preparing your quotation...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, themedStyles.background]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, themedStyles.text]}>Quotation Details</Text>
        <Text style={[styles.headerSubtitle, themedStyles.subtext]}>Client: {client?.name}</Text>
        <View style={styles.statsRow}>
          <Text style={themedStyles.subtext}>{groupedProducts.length} Rooms</Text>
          <Text style={themedStyles.subtext}>•</Text>
          <Text style={themedStyles.subtext}>{products.length} Items</Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {groupedProducts.map(group => (
          <RoomCard
            key={group.id}
            group={group}
            colors={themedStyles}
            onEdit={(product) => {
              setEditingProduct(product);
              setModalVisible(true);
            }}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, themedStyles.card, { borderTopColor: themedStyles.separator.backgroundColor }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, themedStyles.text]}>Grand Total</Text>
          <Text style={[styles.totalAmount, themedStyles.primary]}>${grandTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: themedStyles.primary.color, opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmitQuotation}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Finalize & Submit</Text>
              <IconSymbol name="arrow.right" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {modalVisible && editingProduct && (
        <EditProductModal
          visible={modalVisible}
          product={editingProduct}
          onClose={() => setModalVisible(false)}
          onSave={handleUpdateProduct}
          colors={themedStyles}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16 },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 16, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 180 },
  roomCard: { borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  roomName: { fontSize: 18, fontWeight: '600' },
  roomSubtotal: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  productList: { marginTop: 10, borderTopWidth: 1 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  productInfo: { flex: 1, marginRight: 10 },
  productName: { fontSize: 16, fontWeight: '500' },
  productDetails: { fontSize: 14, marginTop: 2 },
  productActions: { flexDirection: 'row', alignItems: 'center' },
  productPrice: { fontSize: 16 },
  editButton: { padding: 8, marginLeft: 10 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 18, fontWeight: '600' },
  totalAmount: { fontSize: 24, fontWeight: 'bold' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalProductLabel: { fontSize: 16, fontWeight: '500', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 15 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
