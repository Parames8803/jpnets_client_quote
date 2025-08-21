import { ProductDimensionModal } from '@/components/ProductDimensionModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as base64js from 'base64-js';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductType, ROOM_STATUS_TYPES, ROOM_TYPES } from '../types/db';
import { supabase } from '../utils/supabaseClient';


const SUPABASE_IMAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_IMAGE_BUCKET || 'file-storage';
const UNIT_OPTIONS = ['ft', 'inches', 'cm', 'm'];


export default function CreateRoomScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { clientId } = useLocalSearchParams();
  const isDark = colorScheme === 'dark';


  const [roomType, setRoomType] = useState('');
  const [description, setDescription] = useState('');
  
  const [length, setLength] = useState('');
  const [lengthUnit, setLengthUnit] = useState<'ft' | 'inches' | 'cm' | 'm'>('ft');
  const [width, setWidth] = useState('');
  const [widthUnit, setWidthUnit] = useState<'ft' | 'inches' | 'cm' | 'm'>('ft');
  const [totalSqFt, setTotalSqFt] = useState<number | null>(null);
  
  const [products, setProducts] = useState<Omit<Product, 'id' | 'created_at' | 'room_id'>[]>([]);
  const [images, setImages] = useState<{ uri: string, name: string, type: string }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);


  // Modal states
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<'roomType' | 'unit' | 'product' | 'subProduct' | 'productUnit' | null>(null);
  
  // Product form states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([]);
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [availableProductUnits, setAvailableProductUnits] = useState<string[]>([]);
  const [currentUnitField, setCurrentUnitField] = useState<'length' | 'width' | null>(null);
  const [isDimensionModalVisible, setDimensionModalVisible] = useState(false);
  const [productLengthValue, setProductLengthValue] = useState<number | null>(null);
  const [productLengthUnitType, setProductLengthUnitType] = useState<string | null>(null);
  const [productWidthValue, setProductWidthValue] = useState<number | null>(null);
  const [productWidthUnitType, setProductWidthUnitType] = useState<string | null>(null);



  const convertToFeet = (value: number, unit: 'ft' | 'inches' | 'cm' | 'm'): number => {
    const conversions = { ft: 1, inches: 1 / 12, cm: 1 / 30.48, m: 3.28084 };
    return value * (conversions[unit] || 1);
  };
  
  // Calculate progress and square footage
  useEffect(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const hasDimensions = !isNaN(l) && !isNaN(w);
    if (hasDimensions) {
      setTotalSqFt(convertToFeet(l, lengthUnit) * convertToFeet(w, widthUnit));
    } else {
      setTotalSqFt(null);
    }
    
    const fields = [roomType, description, hasDimensions, products.length > 0, images.length > 0];
    const completedFields = fields.filter(f => f).length;
    setProgress(completedFields / fields.length);
  }, [roomType, description, length, width, lengthUnit, widthUnit, products, images]);
  
  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);


  const openModal = (type: typeof modalContent) => {
    if (type === 'product' && !roomType.trim()) {
      Alert.alert('Validation Error', 'Please select a Room Type first.');
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
    setIsAddingProduct(false);
    setSelectedProducts([]);
    setNewProductQuantity('');
    setNewProductUnitType('');
    setNewProductDescription('');
    setAvailableProductUnits([]);
    setProductLengthValue(null);
    setProductLengthUnitType(null);
    setProductWidthValue(null);
    setProductWidthUnitType(null);
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
        length_value: productLengthValue,
        length_unit_type: productLengthUnitType,
        width_value: productWidthValue,
        width_unit_type: productWidthUnitType,
      };
      setProducts(prev => [...prev, newProduct]);
      resetProductForm();
    } else {
      Alert.alert('Input Required', 'Please select a product and enter a quantity.');
    }
  };


  const pickImage = async (source: 'camera' | 'library') => {
    const permission = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync() 
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;


    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });


    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.uri.split('/').pop() || `img-${uuidv4()}`,
        type: `image/${asset.uri.split('.').pop() || 'jpeg'}`,
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };


  const handleSaveRoom = async () => {
    if (!roomType.trim()) {
      Alert.alert('Validation Error', 'Room type is required');
      return;
    }
    const client_id_str = Array.isArray(clientId) ? clientId[0] : clientId;
    if (!client_id_str) {
      Alert.alert('Error', 'Client ID is missing.');
      return;
    }


    setLoading(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms').insert({
          client_id: client_id_str,
          room_type: roomType.trim(),
          description: description.trim(),
          status: ROOM_STATUS_TYPES.ACTIVE, // Default to Active
          total_sq_ft: totalSqFt,
        }).select().single();
      if (roomError) throw roomError;


      const newRoomId = roomData.id;


      await Promise.all([
        supabase.from('measurements').insert({
          room_id: newRoomId,
          length_unit_type: lengthUnit, length_value: parseFloat(length) || 0,
          width_unit_type: widthUnit, width_value: parseFloat(width) || 0,
          converted_sq_ft: totalSqFt,
        }),
        supabase.from('products').insert(products.map(p => ({ ...p, room_id: newRoomId }))),
        (async () => {
          const uploadedPaths = (await Promise.all(images.map(async img => {
            const base64 = await FileSystem.readAsStringAsync(img.uri, { encoding: FileSystem.EncodingType.Base64 });
            const filePath = `room_images/${newRoomId}/${img.name}`;
            const { data, error } = await supabase.storage
              .from(SUPABASE_IMAGE_BUCKET)
              .upload(filePath, base64js.toByteArray(base64), { contentType: img.type });
            return error ? null : data?.path;
          }))).filter(Boolean);
          if (uploadedPaths.length > 0) {
            await supabase.from('rooms').update({ ref_image_urls: uploadedPaths }).eq('id', newRoomId);
          }
        })()
      ]);


      Alert.alert('Success', 'Room created successfully!', [{ text: 'OK', onPress: () => router.push({ pathname: '/client/[id]', params: { id: client_id_str } }) }]);
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
        case 'roomType':
            title = 'Select Room Type';
            options = ROOM_TYPES;
            onSelect = (option) => { setRoomType(option.name); setSelectedProducts([]); setModalVisible(false); };
            break;
        case 'unit':
            title = 'Select Unit';
            options = UNIT_OPTIONS.map(name => ({ name }));
            onSelect = (option) => { if (currentUnitField === 'length') setLengthUnit(option.name); else setWidthUnit(option.name); setModalVisible(false); };
            break;
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
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>{title}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalOptionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.modalOption, 
                    { 
                      backgroundColor: isDark ? '#374151' : '#f8fafc',
                      borderColor: isDark ? '#4b5563' : '#e2e8f0',
                    }
                  ]} 
                  onPress={() => onSelect(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, { color: isDark ? '#f9fafb' : '#1e293b' }]}>
                    {option.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  const themedStyles = {
    background: { backgroundColor: isDark ? '#111827' : '#f3f4f6' },
    card: { backgroundColor: isDark ? '#1f2937' : '#ffffff' },
    text: { color: isDark ? '#f9fafb' : '#111827' },
    subtext: { color: isDark ? '#9ca3af' : '#6b7280' },
    input: { 
      backgroundColor: isDark ? '#374151' : '#f8fafc', 
      borderColor: isDark ? '#4b5563' : '#e2e8f0',
      color: isDark ? '#f9fafb' : '#111827',
    },
    primary: { color: isDark ? '#38bdf8' : '#0ea5e9' },
    border: { borderBottomColor: isDark ? '#374151' : '#e2e8f0' },
    buttonCancel: { color: isDark ? '#9ca3af' : '#64748b' },
  };


  return (
    <KeyboardAvoidingView style={[styles.container, themedStyles.background]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, themedStyles.text]}>Create New Room</Text>
        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#374151' : '#e2e8f0' }]}>
          <View style={[styles.progressBar, { backgroundColor: themedStyles.primary.color }]} />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        
        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.text]}>Room Details</Text>
          <TouchableOpacity style={[styles.selector, themedStyles.input]} onPress={() => openModal('roomType')}>
            <Text style={[themedStyles.text, !roomType && themedStyles.subtext]}>{roomType || 'Select Room Type *'}</Text>
            <IconSymbol name="chevron.down" size={16} color={themedStyles.subtext.color} />
          </TouchableOpacity>
          <TextInput style={[styles.input, themedStyles.input]} placeholder="Description" placeholderTextColor={themedStyles.subtext.color} value={description} onChangeText={setDescription} />
        </View>


        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.text]}>Dimensions</Text>
            <View style={styles.dimensionRow}>
                <View style={{ flex: 1 }}>
                    <TextInput style={[styles.input, themedStyles.input]} placeholder="Length" placeholderTextColor={themedStyles.subtext.color} value={length} onChangeText={setLength} keyboardType="numeric" />
                    <TouchableOpacity style={styles.unitButton} onPress={() => { setCurrentUnitField('length'); openModal('unit'); }}>
                        <Text style={themedStyles.subtext}>{lengthUnit}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    <TextInput style={[styles.input, themedStyles.input]} placeholder="Width" placeholderTextColor={themedStyles.subtext.color} value={width} onChangeText={setWidth} keyboardType="numeric" />
                    <TouchableOpacity style={styles.unitButton} onPress={() => { setCurrentUnitField('width'); openModal('unit'); }}>
                        <Text style={themedStyles.subtext}>{widthUnit}</Text>
                    </TouchableOpacity>
                </View>
            </View>
          {typeof totalSqFt === 'number' && !isNaN(totalSqFt) && <Text style={[styles.totalSqFt, themedStyles.primary]}>Total: {totalSqFt.toFixed(2)} sq.ft</Text>}
        </View>


        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.text]}>Products</Text>
          {products.map((p, i) => (
            <View key={i} style={[styles.productItem, themedStyles.border]}>
              <Text style={themedStyles.text}>{p.name} ({p.quantity} {p.unit_type})</Text>
              <TouchableOpacity onPress={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}>
                <IconSymbol name="xmark.circle.fill" size={20} color={themedStyles.subtext.color} />
              </TouchableOpacity>
            </View>
          ))}
          {isAddingProduct ? (
            <View style={[styles.addProductContainer, themedStyles.border]}>
                <TouchableOpacity style={[styles.selector, themedStyles.input]} onPress={() => openModal('product')}>
                    <Text style={[themedStyles.text, selectedProducts.length === 0 && themedStyles.subtext]}>
                      {selectedProducts.length > 0 ? selectedProducts.map(p => p.name).join(' > ') : 'Select Product'}
                    </Text>
                </TouchableOpacity>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput style={[styles.input, themedStyles.input, {flex: 1}]} placeholder="Qty" placeholderTextColor={themedStyles.subtext.color} value={newProductQuantity} onChangeText={setNewProductQuantity} keyboardType="numeric" />
                    <TouchableOpacity style={[styles.selector, themedStyles.input, {flex: 1}]} onPress={() => openModal('productUnit')}>
                        <Text style={[themedStyles.text, !newProductUnitType && themedStyles.subtext]}>{newProductUnitType || 'Unit'}</Text>
                    </TouchableOpacity>
                </View>
                <TextInput style={[styles.input, themedStyles.input]} placeholder="Description" placeholderTextColor={themedStyles.subtext.color} value={newProductDescription} onChangeText={setNewProductDescription} />
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10}}>
                    <TouchableOpacity onPress={resetProductForm}><Text style={themedStyles.buttonCancel}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleAddProduct}><Text style={themedStyles.primary}>Add</Text></TouchableOpacity>
                </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={() => setIsAddingProduct(true)}>
                <IconSymbol name="plus" size={16} color={themedStyles.primary.color} />
                <Text style={[styles.addButtonText, themedStyles.primary]}>Add Product</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={[styles.card, themedStyles.card]}>
            <Text style={[styles.cardTitle, themedStyles.text]}>Reference Images</Text>
            <View style={styles.imageGrid}>
                {images.map((img, i) => (
                    <View key={i} style={styles.imageContainer}>
                        <Image source={{uri: img.uri}} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                            <IconSymbol name="xmark.circle.fill" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={[styles.addImageButton, {borderColor: themedStyles.subtext.color}]} onPress={() => Alert.alert(
                  'Add Image',
                  'Choose an option to add an image:',
                  [
                    { text: 'Take Photo', onPress: () => pickImage('camera') },
                    { text: 'Choose from Library', onPress: () => pickImage('library') },
                    { text: 'Cancel', style: 'cancel' },
                  ],
                  { cancelable: true }
                )}>
                    <IconSymbol name="plus" size={24} color={themedStyles.subtext.color} />
                </TouchableOpacity>
            </View>
        </View>


        <TouchableOpacity style={[styles.saveButton]} onPress={handleSaveRoom} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create Room</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cancelButton]} onPress={() => router.back()}>
          <Text style={[styles.cancelButtonText, themedStyles.buttonCancel]}>Cancel</Text>
        </TouchableOpacity>


      </ScrollView>


      <SelectionModal />
      <ProductDimensionModal
        visible={isDimensionModalVisible}
        onClose={() => setDimensionModalVisible(false)}
        onSetDimensions={({ length, width, lengthUnit, widthUnit, totalSqFt }) => {
          setNewProductQuantity(totalSqFt.toFixed(2));
          setProductLengthValue(length);
          setProductLengthUnitType(lengthUnit);
          setProductWidthValue(width);
          setProductWidthUnitType(widthUnit);
        }}
      />
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50 },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  progressBarContainer: { height: 4, borderRadius: 2, marginTop: 10 },
  progressBar: { height: '100%', borderRadius: 2 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
  },
  cardTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  selector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10,
    borderWidth: 1,
  },
  input: { 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10, 
    borderWidth: 1, 
    fontSize: 16,
  },
  dimensionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  unitButton: { position: 'absolute', right: 15, top: 15 },
  totalSqFt: { alignSelf: 'flex-end', fontSize: 16, fontWeight: '600' },
  productItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 12, 
    borderBottomWidth: 1,
  },
  addProductContainer: { 
    paddingTop: 15, 
    marginTop: 15, 
    borderTopWidth: 1, 
    gap: 10 
  },
  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    padding: 12, 
    borderRadius: 10, 
    marginTop: 10 
  },
  addButtonText: { fontSize: 16, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageContainer: { position: 'relative' },
  imagePreview: { width: 80, height: 80, borderRadius: 10 },
  removeImageButton: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    borderRadius: 12,
    padding: 2,
  },
  addImageButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 10, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  saveButton: { 
    marginHorizontal: 20, 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    backgroundColor: "#3182CE" 
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  modalContent: { 
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    paddingTop: 10,
  },
  modalOptionsContainer: {
    maxHeight: 400,
  },
  modalOption: { 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalOptionText: { 
    fontSize: 16, 
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: { 
    marginHorizontal: 20, 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10 
  },
  cancelButtonText: { fontSize: 18, fontWeight: 'bold' },
});
