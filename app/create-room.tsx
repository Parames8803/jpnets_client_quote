import * as base64js from 'base64-js';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { 
  Alert, 
  Image, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabaseClient';

const SUPABASE_IMAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_IMAGE_BUCKET || 'file-storage';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Measurement, Product } from '../types/db';

const STATUS_OPTIONS = ['Not Active', 'Active', 'In Progress', 'Completed'];

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

  // State for Room Dimensions (which will be saved as a Measurement entry)
  const [length, setLength] = useState('');
  const [lengthUnit, setLengthUnit] = useState('ft');
  const [width, setWidth] = useState('');
  const [widthUnit, setWidthUnit] = useState('ft');
  const [totalSqFt, setTotalSqFt] = useState<number | null>(null);

  // State for Products
  const [products, setProducts] = useState<Omit<Product, 'id' | 'created_at' | 'room_id'>[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState('');

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
    if (newProductName.trim() && newProductQuantity.trim()) {
      setProducts(prev => [...prev, {
        name: newProductName.trim(),
        quantity: parseFloat(newProductQuantity),
        unit_type: newProductUnitType.trim(),
      }]);
      setNewProductName('');
      setNewProductQuantity('');
      setNewProductUnitType('');
    } else {
      Alert.alert('Input Required', 'Please enter both name and quantity for the product.');
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
            quantity: p.quantity,
            unit_type: p.unit_type,
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
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="e.g., Living Room, Kitchen, Bedroom"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={roomType}
              onChangeText={setRoomType}
            />
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
                  {p.quantity} {p.unit_type}
                </Text>
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
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Product Name"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={newProductName}
              onChangeText={setNewProductName}
            />
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
              <TextInput
                style={[
                  styles.formInput,
                  { 
                    backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#1e293b',
                    borderColor: isDark ? '#6b7280' : '#e2e8f0'
                  }
                ]}
                placeholder="Unit"
                placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
                value={newProductUnitType}
                onChangeText={setNewProductUnitType}
              />
            </View>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: '#1F2937' }]}
              onPress={addProduct}
            >
              <IconSymbol size={20} name="plus" color="#ffffff" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Images Section */}
        <View style={[styles.section, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
              Reference Images
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
