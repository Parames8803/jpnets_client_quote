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
import { supabase } from '../utils/supabaseClient';

const SUPABASE_IMAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_IMAGE_BUCKET || 'file-storage';

import { ProductDimensionModal } from '@/components/ProductDimensionModal'; // Import the new component
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Product } from '../types/db';

const STATUS_OPTIONS = ['Not Active', 'Active', 'In Progress', 'Completed'];

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

export default function CreateRoomScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { clientId } = useLocalSearchParams();

  // State for Room details
  const [roomType, setRoomType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Not Active');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentUnitField, setCurrentUnitField] = useState<'length' | 'width' | null>(null);
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [showProductUnitModal, setShowProductUnitModal] = useState(false);
  const [showSubProductModal, setShowSubProductModal] = useState(false);
  const [productUnits, setProductUnits] = useState<string[]>([]);

  // State for Room Dimensions (which will be saved as a Measurement entry)
  const [length, setLength] = useState('');
  const [lengthUnit, setLengthUnit] = useState('ft');
  const [width, setWidth] = useState('');
  const [widthUnit, setWidthUnit] = useState('ft');
  const [totalSqFt, setTotalSqFt] = useState<number | null>(null);

  // State for Products
  const [products, setProducts] = useState<Omit<Product, 'id' | 'created_at' | 'room_id'>[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([]);
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');

  // State for Images
  const [images, setImages] = useState<{ uri: string, name: string, type: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const isDark = colorScheme === 'dark';

  const convertToFeet = (value: number, unit: string): number => {
    switch (unit) {
      case 'ft':
        return value;
      case 'inches':
        return value / 12;
      case 'cm':
        return value / 30.48;
      case 'm':
        return value * 3.28084;
      default:
        return value; // Default to original value if unit is unknown
    }
  };

  const calculateSqFt = () => {
    const parsedLength = parseFloat(length);
    const parsedWidth = parseFloat(width);

    if (!isNaN(parsedLength) && !isNaN(parsedWidth)) {
      const lengthInFeet = convertToFeet(parsedLength, lengthUnit);
      const widthInFeet = convertToFeet(parsedWidth, widthUnit);
      setTotalSqFt(lengthInFeet * widthInFeet);
    } else {
      setTotalSqFt(null);
    }
  };

  useEffect(() => {
    calculateSqFt();
  }, [length, lengthUnit, width, widthUnit]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  const addProduct = () => {
    if (selectedProducts.length > 0 && newProductQuantity.trim()) {
      const lastSelected = selectedProducts[selectedProducts.length - 1];
      const finalProductName = `${roomType} ${selectedProducts.map(p => p.name).join(' ')}`;

      const newProduct: Omit<Product, 'id' | 'created_at' | 'room_id'> = {
        name: finalProductName,
        product_category: selectedProducts[0].name,
        product_subcategory: selectedProducts.slice(1).map(p => p.name).join(' / ') || null,
        quantity: parseFloat(newProductQuantity),
        unit_type: newProductUnitType.trim(),
        price: lastSelected.default_price, // Set price to default
        default_price: lastSelected.default_price,
        wages: lastSelected.wages, // Set wages to default
        default_wages: lastSelected.wages,
        description: newProductDescription,
      };

      setProducts(prev => [...prev, newProduct]);
      setSelectedProducts([]);
      setNewProductQuantity('');
      setNewProductUnitType('');
      setNewProductDescription('');
      setProductUnits([]);
    } else {
      Alert.alert('Input Required', 'Please select a product and enter a quantity.');
    }
  };

  const removeProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      setImages(prev => [...prev, { uri, name: filename || `image-${uuidv4()}`, type }]);
    }
  };

  const uploadImage = async (imageUri: string, room_id: string, imageType: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const decoded = base64js.toByteArray(base64);
      const extension = imageType.split('/')[1] || 'jpg';
      const filePath = `room_images/${room_id}/${uuidv4()}.${extension}`;

      const { data, error } = await supabase.storage
        .from(SUPABASE_IMAGE_BUCKET)
        .upload(filePath, decoded, {
          contentType: imageType,
        });

      if (error) {
        console.error('Error uploading image:', error.message);
        return null;
      }
      return data?.path;
    } catch (error: any) {
      console.error('Error in uploadImage:', error.message);
      return null;
    }
  };

  const handleSaveRoom = async () => {
    if (!roomType.trim()) {
      Alert.alert('Validation Error', 'Room type is required');
      return;
    }

    const client_id_str = Array.isArray(clientId) ? clientId[0] : clientId;
    if (!client_id_str) {
      Alert.alert('Error', 'Client ID is missing. Cannot create room.');
      return;
    }

    setLoading(true);
    try {
      // 1. Save Room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          client_id: client_id_str,
          room_type: roomType.trim(),
          description: description.trim(),
          status: status,
          total_sq_ft: totalSqFt, // Add totalSqFt to the room data
        })
        .select()
        .single();

      if (roomError) {
        Alert.alert('Error saving room', roomError.message);
        return;
      }

      const newRoomId = roomData.id;

      // 2. Save Measurements (Room Dimensions)
      const { error: measurementError } = await supabase
        .from('measurements')
        .insert({
          room_id: newRoomId,
          length_unit_type: lengthUnit,
          length_value: parseFloat(length),
          width_unit_type: widthUnit,
          width_value: parseFloat(width),
          converted_sq_ft: totalSqFt,
        });
      if (measurementError) {
        console.error('Error saving measurement:', measurementError.message);
      }

      // 3. Save Products
      for (const p of products) {
        const { error: productError } = await supabase
          .from('products')
          .insert({
            room_id: newRoomId,
            name: p.name,
            product_category: p.product_category,
            product_subcategory: p.product_subcategory,
            quantity: p.quantity,
            unit_type: p.unit_type,
            price: p.price,
            default_price: p.default_price,
            wages: p.wages,
            default_wages: p.default_wages,
            description: p.description,
          });
        if (productError) {
          console.error('Error saving product:', productError.message);
        }
      }

      // 4. Upload Images
      const uploadedImagePaths = [];
      for (const img of images) {
        const path = await uploadImage(img.uri, newRoomId, img.type);
        if (path) {
          uploadedImagePaths.push(path);
        }
      }

      // Update the room with image URLs
      if (uploadedImagePaths.length > 0) {
        const { error: updateRoomError } = await supabase
          .from('rooms')
          .update({ ref_image_urls: uploadedImagePaths })
          .eq('id', newRoomId);

        if (updateRoomError) {
          console.error('Error updating room with image URLs:', updateRoomError.message);
        }
      }

      Alert.alert('Success', 'Room created successfully!', [
        {
          text: 'OK',
          onPress: () => router.push({ pathname: '/client/[id]', params: { id: client_id_str } })
        }
      ]);
    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Select Status
          </Text>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusOption,
                status === option && styles.statusOptionSelected,
                status === option && { backgroundColor: '#1F2937' }
              ]}
              onPress={() => {
                setStatus(option);
                setShowStatusModal(false);
              }}
            >
              <Text style={[
                styles.statusOptionText,
                { color: isDark ? '#e5e7eb' : '#374151' },
                status === option && { color: '#ffffff' }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const UNIT_OPTIONS = ['ft', 'inches', 'cm', 'm'];

  const UnitModal = () => (
    <Modal
      visible={showUnitModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUnitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <TouchableOpacity onPress={() => setShowUnitModal(false)} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Select Unit
          </Text>
          {UNIT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusOption, // Reusing statusOption style for consistency
                (currentUnitField === 'length' && lengthUnit === option) && styles.statusOptionSelected,
                (currentUnitField === 'width' && widthUnit === option) && styles.statusOptionSelected,
                ((currentUnitField === 'length' && lengthUnit === option) || (currentUnitField === 'width' && widthUnit === option)) && { backgroundColor: '#1F2937' }
              ]}
              onPress={() => {
                if (currentUnitField === 'length') {
                  setLengthUnit(option);
                } else if (currentUnitField === 'width') {
                  setWidthUnit(option);
                }
                setShowUnitModal(false);
              }}
            >
              <Text style={[
                styles.statusOptionText, // Reusing statusOptionText style
                { color: isDark ? '#e5e7eb' : '#374151' },
                ((currentUnitField === 'length' && lengthUnit === option) || (currentUnitField === 'width' && widthUnit === option)) && { color: '#ffffff' }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const RoomTypeModal = () => (
    <Modal
      visible={showRoomTypeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRoomTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <TouchableOpacity onPress={() => setShowRoomTypeModal(false)} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Select Room Type
          </Text>
          {ROOM_TYPES.map((option) => (
            <TouchableOpacity
              key={option.name}
              style={[
                styles.statusOption,
                roomType === option.name && styles.statusOptionSelected,
                roomType === option.name && { backgroundColor: '#1F2937' }
              ]}
              onPress={() => {
                setRoomType(option.name);
                setSelectedProducts([]);
                setShowRoomTypeModal(false);
              }}
            >
              <Text style={[
                styles.statusOptionText,
                { color: isDark ? '#e5e7eb' : '#374151' },
                roomType === option.name && { color: '#ffffff' }
              ]}>
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const ProductModal = () => {
    const availableProducts = ROOM_TYPES.find(rt => rt.name === roomType)?.products || [];

    return (
      <Modal
        visible={showProductModal}
        transparent
        animationType="fade"
      onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
            <TouchableOpacity onPress={() => setShowProductModal(false)} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Select Product
            </Text>
            {availableProducts.map((product) => (
              <TouchableOpacity
                key={product.name}
                style={[
                  styles.statusOption,
                  selectedProducts[0]?.name === product.name && styles.statusOptionSelected,
                  selectedProducts[0]?.name === product.name && { backgroundColor: '#1F2937' }
                ]}
              onPress={() => {
                  setSelectedProducts([product]);
                  setProductUnits(product.units || []);
                  setNewProductUnitType('');
                  setShowProductModal(false);
                  if (product.sub_products && product.sub_products.length > 0) {
                    setShowSubProductModal(true);
                  }
                }}
              >
                <Text style={[
                  styles.statusOptionText,
                  { color: isDark ? '#e5e7eb' : '#374151' },
                  selectedProducts[0]?.name === product.name && { color: '#ffffff' }
                ]}>
                  {product.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  const ProductUnitModal = () => (
    <Modal
      visible={showProductUnitModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowProductUnitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <TouchableOpacity onPress={() => setShowProductUnitModal(false)} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Select Unit Type
          </Text>
          {productUnits.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusOption,
                newProductUnitType === option && styles.statusOptionSelected,
                newProductUnitType === option && { backgroundColor: '#1F2937' }
              ]}
              onPress={() => {
                setNewProductUnitType(option);
                setShowProductUnitModal(false);
                if (option.toLowerCase() === 'sq.ft' || option.toLowerCase() === 'm²') {
                  setShowDimensionModal(true);
                }
              }}
            >
              <Text style={[
                styles.statusOptionText,
                { color: isDark ? '#e5e7eb' : '#374151' },
                newProductUnitType === option && { color: '#ffffff' }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const SubProductModal = ({ visible, onClose, products, onSelect }: { visible: boolean, onClose: () => void, products: ProductType[], onSelect: (product: ProductType) => void }) => {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Select Option
            </Text>
            {products.map((product) => (
              <TouchableOpacity
                key={product.name}
                style={[styles.statusOption]}
                onPress={() => onSelect(product)}
              >
                <Text style={[styles.statusOptionText, { color: isDark ? '#e5e7eb' : '#374151' }]}>
                  {product.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  const handleSetProductQuantityFromDimensions = (quantity: string) => {
    setNewProductQuantity(quantity);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#1f2937' : '#f9fafb'} 
      />

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#1f2937' : '#f9fafb' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Details Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Basic Details
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Room Type *
            </Text>
            <TouchableOpacity
              style={[
                styles.statusSelector,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              onPress={() => setShowRoomTypeModal(true)}
            >
              <Text style={[styles.statusSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                {roomType || 'Select Room Type'}
              </Text>
              <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Describe the room details..."
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Status
            </Text>
            <TouchableOpacity
              style={[
                styles.statusSelector,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={[styles.statusSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                {status}
              </Text>
              <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Measurements Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Room Dimensions
            </Text>
          </View>

          {/* Length and Width Inputs */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Length
            </Text>
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    borderColor: isDark ? '#6b7280' : '#e2e8f0'
                  }
                ]}
                placeholder="Length"
                placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                value={length}
                onChangeText={setLength}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[
                  styles.unitSelector,
                  {
                    backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                    borderColor: isDark ? '#6b7280' : '#e2e8f0'
                  }
                ]}
                onPress={() => {
                  setCurrentUnitField('length');
                  setShowUnitModal(true);
                }}
              >
                <Text style={[styles.unitSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  {lengthUnit}
                </Text>
                <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Width
            </Text>
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    borderColor: isDark ? '#6b7280' : '#e2e8f0'
                  }
                ]}
                placeholder="Width"
                placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                value={width}
                onChangeText={setWidth}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[
                  styles.unitSelector,
                  {
                    backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                    borderColor: isDark ? '#6b7280' : '#e2e8f0'
                  }
                ]}
                onPress={() => {
                  setCurrentUnitField('width');
                  setShowUnitModal(true);
                }}
              >
                <Text style={[styles.unitSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  {widthUnit}
                </Text>
                <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
            {totalSqFt !== null && (
              <Text style={[styles.totalSqFtText, { color: isDark ? '#f9fafb' : '#111827' }]}>
                Total Square Feet: {totalSqFt.toFixed(2)} sq.ft
              </Text>
            )}
          </View>
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

          {products.map((p, index) => (
            <View key={index} style={[styles.listItem, { backgroundColor: isDark ? '#4b5563' : '#f8fafc' }]}>
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemTitle, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  {p.name}
                </Text>
                <Text style={[styles.listItemValue, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                  {p.quantity} {p.unit_type} - Price: ${p.price?.toFixed(2)} - Wages: ${p.wages?.toFixed(2)}
                </Text>
                {p.description && (
                  <Text style={[styles.listItemDescription, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                    {p.description}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeProduct(index)}
              >
                <IconSymbol size={16} name="xmark" color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addForm}>
            <TouchableOpacity
              style={[
                styles.statusSelector,
                {
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0',
                  marginBottom: 16,
                }
              ]}
              onPress={() => {
                setSelectedProducts([]);
                setShowProductModal(true);
              }}
              disabled={!roomType}
            >
              <Text style={[styles.statusSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                {selectedProducts.length > 0 ? selectedProducts.map(p => p.name).join(' / ') : 'Select a Product'}
              </Text>
              <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>

            {selectedProducts.length > 0 && (
              <>
                <View style={styles.formRow}>
                  <TextInput
                    style={[
                      styles.formInput,
                      { 
                        backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        borderColor: isDark ? '#6b7280' : '#e2e8f0'
                      }
                    ]}
                    placeholder="Quantity"
                    placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                    value={newProductQuantity}
                    onChangeText={setNewProductQuantity}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={[
                      styles.formInput, // Reusing formInput style for consistency
                      { 
                        backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                        borderColor: isDark ? '#6b7280' : '#e2e8f0',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }
                    ]}
                    onPress={() => setShowProductUnitModal(true)}
                  >
                    <Text style={[styles.statusSelectorText, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                      {newProductUnitType || 'Select Unit'}
                    </Text>
                    <IconSymbol size={16} name="chevron.down" color={isDark ? '#9ca3af' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                      color: isDark ? '#f1f5f9' : '#1e293b',
                      borderColor: isDark ? '#6b7280' : '#e2e8f0',
                      marginBottom: 16,
                    }
                  ]}
                  placeholder="Product Description"
                  placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                  value={newProductDescription}
                  onChangeText={setNewProductDescription}
                />
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: '#1F2937' }]}
                  onPress={addProduct}
                >
                  <IconSymbol size={20} name="plus" color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Product</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Images Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Room Images
            </Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? '#4b5563' : '#f3f4f6' }]}>
              <Text style={[styles.countText, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {images.length}
              </Text>
            </View>
          </View>

          <View style={styles.imageGrid}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.imageRemoveButton}
                  onPress={() => removeImage(index)}
                >
                  <IconSymbol size={16} name="xmark" color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: '#1F2937' }]}
            onPress={pickImage}
          >
            <IconSymbol size={20} name="photo" color="#ffffff" />
            <Text style={styles.addButtonText}>Add Image</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[
            styles.saveButton,
            { backgroundColor: '#1F2937' },
            loading && styles.buttonDisabled
          ]}
          onPress={handleSaveRoom}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <IconSymbol size={22} name="checkmark.circle.fill" color="#ffffff" />
              <Text style={styles.saveButtonText}>Save Room</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <StatusModal />
      <UnitModal />
      <RoomTypeModal />
      <ProductModal />
      <ProductUnitModal />
      {selectedProducts.length > 0 && selectedProducts[selectedProducts.length - 1].sub_products && (
        <SubProductModal
          visible={showSubProductModal}
          onClose={() => setShowSubProductModal(false)}
          products={selectedProducts[selectedProducts.length - 1].sub_products!}
          onSelect={(product) => {
            const newSelectedProducts = [...selectedProducts, product];
            setSelectedProducts(newSelectedProducts);
            if (!product.sub_products) {
              setShowSubProductModal(false);
            }
          }}
        />
      )}
      <ProductDimensionModal
        visible={showDimensionModal}
        onClose={() => setShowDimensionModal(false)}
        onSetQuantity={handleSetProductQuantityFromDimensions}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 100,
  },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusSelectorText: {
    fontSize: 16,
    fontWeight: '400',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
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
  removeButton: {
    padding: 10,
  },
  addForm: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusOptionSelected: {
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  unitSelectorText: {
    fontSize: 15,
    fontWeight: '400',
  },
  totalSqFtText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
});
