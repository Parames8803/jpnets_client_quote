import { ProductDimensionModal } from '@/components/ProductDimensionModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Product } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';

interface ProductType {
  name: string;
  default_price: number;
  units?: string[];
  wages: number;
  sub_products?: ProductType[];
}

const ROOM_TYPES: { name: string; products: ProductType[] }[] = [
    {
    name: 'Living Room',
    products: [
      { name: 'Sofa', default_price: 500, units: ['pcs', 'm'], wages: 50 },
      { name: 'Coffee Table', default_price: 150, units: ['pcs'], wages: 20 },
      { name: 'TV Stand', default_price: 200, units: ['pcs'], wages: 25 },
    ],
  },
  {
    name: 'Kitchen',
    products: [
      { name: 'Counter Top Bottom', default_price: 100, units: ['sq.ft', 'm²'], wages: 15,sub_products: [
          {
            name: 'Front Door',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 50, wages: 10 },
              { name: 'Double Sheet', default_price: 75, wages: 15 },
            ],
          },
          {
            name: 'Inner Shelve',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 25, wages: 5 },
              { name: 'Double Sheet', default_price: 25, wages: 5 },
            ],
          },
     ] },
      { name: 'Cabinets', default_price: 300, units: ['sq.ft', 'm²'], wages: 40 },
      { name: 'Sink', default_price: 120, units: ['pcs'], wages: 30 },
    ],
  },
  {
    name: 'Bedroom',
    products: [
      { name: 'Bed Frame', default_price: 400, units: ['pcs'], wages: 60 },
      {
        name: 'Wardrobe',
        default_price: 350,
        units: ['sq.ft', 'm²', 'pcs'],
        wages: 70,
        sub_products: [
          {
            name: 'Front Door',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 50, wages: 10 },
              { name: 'Double Sheet', default_price: 75, wages: 15 },
            ],
          },
          {
            name: 'Inner Shelve',
            default_price: 0,
            wages: 0,
            sub_products: [
              { name: 'Single Sheet', default_price: 25, wages: 5 },
              { name: 'Double Sheet', default_price: 25, wages: 5 },
            ],
          },
          { name: 'Back Side Sheet', default_price: 25, wages: 5 },
          { name: 'Aluminium Drawer', default_price: 25, wages: 5 },
          { name: 'Saint Gobain Mirror', default_price: 25, wages: 5 },
        ],
      },
      { name: 'Dresser', default_price: 250, units: ['pcs'], wages: 35 },
    ],
  },
];

const UNIT_OPTIONS = ['pcs', 'm', 'sq.ft', 'm²']; // Consolidated unit options

const getThemedStyles = (isDark: boolean) => ({
  background: { backgroundColor: isDark ? '#111827' : '#f3f4f6' },
  card: { backgroundColor: isDark ? '#1f2937' : '#ffffff' },
  text: { color: isDark ? '#f9fafb' : '#111827' },
  subtext: { color: isDark ? '#9ca3af' : '#6b7280' },
  input: { 
    backgroundColor: isDark ? '#374151' : '#f3f4f6', 
    borderColor: isDark ? '#4b5563' : '#e5e7eb',
    color: isDark ? '#f9fafb' : '#111827',
  },
  primary: { color: isDark ? '#38bdf8' : '#0ea5e9' },
  border: { borderColor: isDark ? '#374151' : '#e5e7eb' },
});

export default function AddProductScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { id: roomId } = useLocalSearchParams();
  const isDark = colorScheme === 'dark';
  const themedStyles = getThemedStyles(isDark);

  const [roomType, setRoomType] = useState(''); // This will be fetched from the room details
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Omit<Product, 'id' | 'created_at' | 'room_id'>[]>([]);

  // Product form states
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([]);
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [availableProductUnits, setAvailableProductUnits] = useState<string[]>([]);
  const [isDimensionModalVisible, setDimensionModalVisible] = useState(false);

  // Modal states
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<'product' | 'subProduct' | 'productUnit' | null>(null);

  useEffect(() => {
    const fetchRoomType = async () => {
      if (!roomId) {
        Alert.alert('Error', 'Room ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const { data: room, error } = await supabase
          .from('rooms')
          .select('room_type')
          .eq('id', roomId)
          .single();
        if (error) throw error;
        if (room) {
          setRoomType(room.room_type);
        }
      } catch (e: any) {
        Alert.alert('Error', `Failed to load room type: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchRoomType();
  }, [roomId]);

  const openModal = (type: typeof modalContent) => {
    if (type === 'product' && !roomType.trim()) {
      Alert.alert('Validation Error', 'Room type not loaded yet. Please wait.');
      return;
    }
    if (type === 'productUnit' && selectedProducts.length === 0) {
      Alert.alert('Validation Error', 'Please select a Product first.');
      return;
    }
    setModalContent(type);
    setModalVisible(true);
  };

  const resetProductForm = () => {
    setSelectedProducts([]);
    setNewProductQuantity('');
    setNewProductUnitType('');
    setNewProductDescription('');
    setAvailableProductUnits([]);
  };

  const handleAddProduct = () => {
    if (selectedProducts.length > 0 && newProductQuantity.trim()) {
      const lastSelected = selectedProducts[selectedProducts.length - 1];
      const newProduct: Omit<Product, 'id' | 'created_at' | 'room_id'> = {
        name: `${roomType} ${selectedProducts.map(p => p.name).join(' ')}`,
        product_category: selectedProducts[0].name,
        product_subcategory: selectedProducts.slice(1).map(p => p.name).join(' / ') || null,
        quantity: parseFloat(newProductQuantity),
        unit_type: newProductUnitType.trim(),
        price: lastSelected.default_price,
        default_price: lastSelected.default_price,
        wages: lastSelected.wages,
        default_wages: lastSelected.wages,
        description: newProductDescription,
      };
      setProducts(prev => [...prev, newProduct]);
      resetProductForm();
    } else {
      Alert.alert('Input Required', 'Please select a product and enter a quantity.');
    }
  };

  const handleSaveProducts = async () => {
    const room_id_str = Array.isArray(roomId) ? roomId[0] : roomId;
    if (!room_id_str) {
      Alert.alert('Error', 'Room ID is missing.');
      return;
    }
    if (products.length === 0) {
      Alert.alert('No Products', 'Please add at least one product to save.');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('products').insert(products.map(p => ({ ...p, room_id: room_id_str })));
      Alert.alert('Success', 'Products added successfully!', [{ text: 'OK', onPress: () => router.push({ pathname: '/room/[id]', params: { id: room_id_str } }) }]);
    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  const SelectionModal = () => {
    let title = '';
    let options: any[] = [];
    let onSelect: (option: any) => void = () => {};

    switch (modalContent) {
        case 'product':
            title = 'Select Product';
            options = ROOM_TYPES.find(rt => rt.name === roomType)?.products || [];
            onSelect = (product) => { setSelectedProducts([product]); setAvailableProductUnits(product.units || []); if (product.sub_products) openModal('subProduct'); else setModalVisible(false); };
            break;
        case 'subProduct':
            title = 'Select Option';
            options = selectedProducts.length > 0 ? selectedProducts[selectedProducts.length - 1].sub_products || [] : [];
            onSelect = (product) => { setSelectedProducts(prev => [...prev, product]); if (product.sub_products) {} else setModalVisible(false); };
            break;
        case 'productUnit':
            title = 'Select Unit Type';
            options = availableProductUnits.map(name => ({ name }));
            onSelect = (option) => { setNewProductUnitType(option.name); setModalVisible(false); if (option.name.toLowerCase().includes('sq')) setDimensionModalVisible(true); };
            break;
    }

    return (
      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themedStyles.card.backgroundColor }]}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <IconSymbol name="xmark.circle.fill" size={24} color={themedStyles.text.color} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, themedStyles.text]}>{title}</Text>
            {options.map((option, index) => (
              <TouchableOpacity key={index} style={[styles.modalOption, { backgroundColor: themedStyles.input.backgroundColor }]} onPress={() => onSelect(option)}>
                <Text style={[styles.modalOptionText, themedStyles.text]}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.container, themedStyles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themedStyles.primary.color} />
        <Text style={[themedStyles.text, { marginTop: 10 }]}>Loading room type...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, themedStyles.background]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, themedStyles.text]}>Add Products to {roomType}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        
        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.text]}>Products to Add</Text>
          {products.map((p, i) => (
            <View key={i} style={[styles.productItem, { borderBottomColor: themedStyles.border.borderColor }]}>
              <Text style={themedStyles.text}>{p.name} ({p.quantity} {p.unit_type})</Text>
              <TouchableOpacity onPress={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}>
                <IconSymbol name="xmark.circle.fill" size={20} color={themedStyles.subtext.color} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={[styles.addProductContainer, { borderTopColor: themedStyles.border.borderColor }]}>
              <TouchableOpacity style={[styles.selector, themedStyles.input]} onPress={() => openModal('product')}>
                  <Text style={themedStyles.text}>{selectedProducts.length > 0 ? selectedProducts.map(p => p.name).join(' > ') : 'Select Product'}</Text>
              </TouchableOpacity>
              <View style={{flexDirection: 'row', gap: 10}}>
                  <TextInput style={[styles.input, themedStyles.input, {flex: 1}]} placeholder="Qty" placeholderTextColor={themedStyles.subtext.color} value={newProductQuantity} onChangeText={setNewProductQuantity} keyboardType="numeric" />
                  <TouchableOpacity style={[styles.selector, themedStyles.input, {flex: 1}]} onPress={() => openModal('productUnit')}>
                      <Text style={themedStyles.text}>{newProductUnitType || 'Unit'}</Text>
                  </TouchableOpacity>
              </View>
              <TextInput style={[styles.input, themedStyles.input]} placeholder="Description" placeholderTextColor={themedStyles.subtext.color} value={newProductDescription} onChangeText={setNewProductDescription} />
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10}}>
                  <TouchableOpacity onPress={resetProductForm}><Text style={themedStyles.subtext}>Clear</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleAddProduct}><Text style={themedStyles.primary}>Add to List</Text></TouchableOpacity>
              </View>
          </View>
        </View>
        
        <TouchableOpacity style={[styles.saveButton, {backgroundColor: themedStyles.primary.color}]} onPress={handleSaveProducts} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Products</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cancelButton]} onPress={() => router.back()}>
          <Text style={[styles.cancelButtonText, themedStyles.subtext]}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>

      <SelectionModal />
      <ProductDimensionModal visible={isDimensionModalVisible} onClose={() => setDimensionModalVisible(false)} onSetQuantity={setNewProductQuantity} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50 },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  progressBarContainer: { height: 4, backgroundColor: '#374151', borderRadius: 2, marginTop: 10 },
  progressBar: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 2 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 15, marginBottom: 10 },
  input: { borderRadius: 10, padding: 15, marginBottom: 10, borderWidth: 1, color: 'white' },
  dimensionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  unitButton: { position: 'absolute', right: 15, top: 15 },
  totalSqFt: { alignSelf: 'flex-end', fontSize: 16, fontWeight: '500' },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#374151' },
  addProductContainer: { paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#374151', gap: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 8, marginTop: 10 },
  addButtonText: { fontSize: 16, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageContainer: { position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 10 },
  removeImageButton: { position: 'absolute', top: -5, right: -5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  addImageButton: { width: 80, height: 80, borderRadius: 10, borderStyle: 'dashed', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  saveButton: { marginHorizontal: 20, padding: 18, borderRadius: 12, alignItems: 'center', backgroundColor:"#3182CE" },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '90%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { padding: 15, borderRadius: 10, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  modalOptionText: { color: '#fff', fontSize: 18, textAlign: 'center' },
  cancelButton: { marginHorizontal: 20, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { fontSize: 18, fontWeight: 'bold' },
});
