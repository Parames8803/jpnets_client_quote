import * as base64js from 'base64-js'; // Import base64-js
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values'; // Required for uuid v4
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabaseClient';

const SUPABASE_IMAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_IMAGE_BUCKET || 'file-storage';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Measurement, Product } from '../types/db';

export default function CreateRoomScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { clientId } = useLocalSearchParams();

  // State for Room details
  const [roomType, setRoomType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Not Active'); // Default status

  // State for Measurements
  const [measurements, setMeasurements] = useState<Omit<Measurement, 'id' | 'created_at' | 'room_id'>[]>([]);
  const [newMeasurementLabel, setNewMeasurementLabel] = useState('');
  const [newMeasurementValue, setNewMeasurementValue] = useState('');
  const [newMeasurementUnitType, setNewMeasurementUnitType] = useState('');

  // State for Products
  const [products, setProducts] = useState<Omit<Product, 'id' | 'created_at' | 'room_id'>[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState('');

  // State for Images
  const [images, setImages] = useState<{ uri: string, name: string, type: string }[]>([]);

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

  const addMeasurement = () => {
    if (newMeasurementLabel && newMeasurementValue) {
      setMeasurements([...measurements, {
        label: newMeasurementLabel,
        value: parseFloat(newMeasurementValue),
        unit_type: newMeasurementUnitType,
        converted_sq_ft: null, // This might be calculated later or left null
      }]);
      setNewMeasurementLabel('');
      setNewMeasurementValue('');
      setNewMeasurementUnitType('');
    } else {
      Alert.alert('Input Required', 'Please enter both label and value for the measurement.');
    }
  };

  const addProduct = () => {
    if (newProductName && newProductQuantity) {
      setProducts([...products, {
        name: newProductName,
        quantity: parseFloat(newProductQuantity),
        unit_type: newProductUnitType,
      }]);
      setNewProductName('');
      setNewProductQuantity('');
      setNewProductUnitType('');
    } else {
      Alert.alert('Input Required', 'Please enter both name and quantity for the product.');
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      setImages([...images, { uri, name: filename || `image-${uuidv4()}`, type }]);
    }
  };

  const uploadImage = async (imageUri: string, room_id: string, imageType: string) => {
    try {
      // Read the image file as a base64 string
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to a Uint8Array
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
    const client_id_str = Array.isArray(clientId) ? clientId[0] : clientId;
    if (!client_id_str) {
      Alert.alert('Error', 'Client ID is missing. Cannot create room.');
      return;
    }

    try {
      // 1. Save Room details
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          client_id: client_id_str,
          room_type: roomType,
          description: description,
          status: status,
        })
        .select()
        .single();

      if (roomError) {
        Alert.alert('Error saving room', roomError.message);
        return;
      }

      const newRoomId = roomData.id;

      // 2. Save Measurements
      for (const m of measurements) {
        const { error: measurementError } = await supabase
          .from('measurements')
          .insert({
            room_id: newRoomId,
            unit_type: m.unit_type,
            value: m.value,
            label: m.label,
            converted_sq_ft: m.converted_sq_ft,
          });
        if (measurementError) {
          console.error('Error saving measurement:', measurementError.message);
          // Optionally, alert the user but continue with other saves
        }
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
          // Optionally, alert the user but continue with other saves
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
      const { error: updateRoomError } = await supabase
        .from('rooms')
        .update({ ref_image_urls: uploadedImagePaths })
        .eq('id', newRoomId);

      if (updateRoomError) {
        console.error('Error updating room with image URLs:', updateRoomError.message);
        Alert.alert('Error', 'Room saved, but failed to save image URLs.');
        return;
      }

      Alert.alert('Success', 'Room and associated details saved successfully!');
      router.push({ pathname: '/client/[id]', params: { id: client_id_str } }); // Go back to client details
    } catch (error: any) {
      Alert.alert('An unexpected error occurred', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Room</Text>

      {/* Section 1: Basic Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Room Type (e.g., Living Room, Kitchen)"
          value={roomType}
          onChangeText={setRoomType}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        {/* Status can be a dropdown or segmented control */}
        <TextInput
          style={styles.input}
          placeholder="Status (e.g., Not Active, Active)"
          value={status}
          onChangeText={setStatus}
        />
      </View>

      {/* Section 2: Measurement Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Measurement Details</Text>
        {measurements.map((m, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemText}>{m.label}: {m.value} {m.unit_type}</Text>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Label (e.g., Length, Width)"
          value={newMeasurementLabel}
          onChangeText={setNewMeasurementLabel}
        />
        <TextInput
          style={styles.input}
          placeholder="Value"
          value={newMeasurementValue}
          onChangeText={setNewMeasurementValue}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Unit Type (e.g., ft, cm)"
          value={newMeasurementUnitType}
          onChangeText={setNewMeasurementUnitType}
        />
        <TouchableOpacity style={styles.addButton} onPress={addMeasurement}>
          <IconSymbol size={20} name="plus.circle.fill" color="#fff" />
          <Text style={styles.addButtonText}>Add Measurement</Text>
        </TouchableOpacity>
      </View>

      {/* Section 3: Product Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Details</Text>
        {products.map((p, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemText}>{p.name}: {p.quantity} {p.unit_type}</Text>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Product Name"
          value={newProductName}
          onChangeText={setNewProductName}
        />
        <TextInput
          style={styles.input}
          placeholder="Quantity"
          value={newProductQuantity}
          onChangeText={setNewProductQuantity}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Unit Type (e.g., pcs, sqft)"
          value={newProductUnitType}
          onChangeText={setNewProductUnitType}
        />
        <TouchableOpacity style={styles.addButton} onPress={addProduct}>
          <IconSymbol size={20} name="plus.circle.fill" color="#fff" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Section 4: Reference Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reference Images</Text>
        <View style={styles.imagePreviewContainer}>
          {images.map((img, index) => (
            <Image key={index} source={{ uri: img.uri }} style={styles.imagePreview} />
          ))}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <IconSymbol size={20} name="photo.fill.on.rectangle.fill" color="#fff" />
          <Text style={styles.addButtonText}>Add Image</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveRoom}>
        <IconSymbol size={22} name="checkmark.circle.fill" color="#fff" />
        <Text style={styles.saveButtonText}>Save Room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f0f4f7',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fdfdfd',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 15,
    color: '#333',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 5,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
