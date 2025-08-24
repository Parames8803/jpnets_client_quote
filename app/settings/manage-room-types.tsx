import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ProductType, RoomType } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import 'react-native-get-random-values';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageRoomTypesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme as 'light' | 'dark' ?? 'light'];

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [newRoomTypeName, setNewRoomTypeName] = useState('');
  const [newRoomTypeSlug, setNewRoomTypeSlug] = useState('');
  const [newProducts, setNewProducts] = useState<ProductType[]>([]);
  const [availableUnitTypes, setAvailableUnitTypes] = useState<string[]>(['sq.ft', 'running ft', 'nos']); // Example unit types

  useEffect(() => {
    fetchRoomTypes();
  }, []);

  const fetchRoomTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('room_types').select('*');
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRoomTypes(data || []);
    }
    setLoading(false);
  };

  const handleAddRoomType = async () => {
    if (!newRoomTypeName.trim() || !newRoomTypeSlug.trim()) {
      Alert.alert('Validation', 'Room Type Name and Slug are required.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('room_types').insert({
      name: newRoomTypeName.trim(),
      slug: newRoomTypeSlug.trim(),
      products: newProducts,
    });

    if (error) {
      Alert.alert('Error adding room type', error.message);
    } else {
      Alert.alert('Success', 'Room type added successfully!');
      setModalVisible(false);
      resetForm();
      fetchRoomTypes();
    }
    setLoading(false);
  };

  const handleUpdateRoomType = async () => {
    if (!editingRoomType || !newRoomTypeName.trim() || !newRoomTypeSlug.trim()) {
      Alert.alert('Validation', 'Room Type Name and Slug are required.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('room_types').update({
      name: newRoomTypeName.trim(),
      slug: newRoomTypeSlug.trim(),
      products: newProducts,
    }).eq('id', editingRoomType.id);

    if (error) {
      Alert.alert('Error updating room type', error.message);
    } else {
      Alert.alert('Success', 'Room type updated successfully!');
      setModalVisible(false);
      resetForm();
      fetchRoomTypes();
    }
    setLoading(false);
  };

  const handleDeleteRoomType = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this room type? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.from('room_types').delete().eq('id', id);
            if (error) {
              Alert.alert('Error deleting room type', error.message);
            } else {
              Alert.alert('Success', 'Room type deleted successfully!');
              fetchRoomTypes();
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const openEditModal = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    setNewRoomTypeName(roomType.name);
    setNewRoomTypeSlug(roomType.slug);
    setNewProducts(roomType.products || []);
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingRoomType(null);
    resetForm();
    setModalVisible(true);
  };

  const resetForm = () => {
    setNewRoomTypeName('');
    setNewRoomTypeSlug('');
    setNewProducts([]);
  };

  const handleAddProductToRoomType = () => {
    setNewProducts(prev => [...prev, { name: '', default_price: 0, wages: 0, units: availableUnitTypes, default_unit_type: 'sq.ft' }]);
  };

  const handleProductChange = (index: number, field: keyof ProductType, value: string | number | null) => {
    const updatedProducts = [...newProducts];
    if (field === 'default_price' || field === 'wages') {
      updatedProducts[index][field] = parseFloat(value as string) || 0;
    } else {
      updatedProducts[index][field] = value as any;
    }
    setNewProducts(updatedProducts);
  };

  const handleRemoveProductFromRoomType = (index: number) => {
    setNewProducts(prev => prev.filter((_, i) => i !== index));
  };

  const themedStyles = {
    background: { backgroundColor: colors.background },
    card: { backgroundColor: colors.cardBackground },
    text: { color: colors.text },
    subtext: { color: colors.tabIconDefault },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      color: colors.text,
    },
    primary: { color: colors.tint },
    button: { backgroundColor: colors.tint },
    buttonText: { color: '#fff' },
    danger: { backgroundColor: colors.red },
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.background, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themedStyles.primary.color} />
        <Text style={[themedStyles.text, { marginTop: 10 }]}>Loading room types...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.background]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={themedStyles.text.color} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themedStyles.text]}>Manage Room Types</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <IconSymbol name="plus.circle.fill" size={28} color={themedStyles.primary.color} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={roomTypes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.roomTypeItem, themedStyles.card]}>
            <View>
              <Text style={[styles.roomTypeName, themedStyles.text]}>{item.name}</Text>
              <Text style={[styles.roomTypeSlug, themedStyles.subtext]}>Slug: {item.slug}</Text>
              {item.products && item.products.length > 0 && (
                <View style={styles.productsContainer}>
                  <Text style={[themedStyles.text, { fontWeight: '600', marginTop: 5 }]}>Products:</Text>
                  {item.products.map((product, idx) => (
                    <Text key={idx} style={[themedStyles.subtext, { marginLeft: 10 }]}>
                      - {product.name} (Price: {product.default_price}, Wages: {product.wages}, Unit: {product.default_unit_type})
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
                <IconSymbol name="pencil.circle.fill" size={24} color={themedStyles.primary.color} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteRoomType(item.id)} style={styles.actionButton}>
                <IconSymbol name="xmark.circle.fill" size={24} color={themedStyles.danger.backgroundColor} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={themedStyles.subtext}>No room types found. Add one to get started!</Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, themedStyles.card]}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <IconSymbol name="xmark.circle.fill" size={24} color={themedStyles.subtext.color} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, themedStyles.text]}>
              {editingRoomType ? 'Edit Room Type' : 'Add Room Type'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, themedStyles.input]}
                placeholder="Room Type Name"
                placeholderTextColor={themedStyles.subtext.color}
                value={newRoomTypeName}
                onChangeText={setNewRoomTypeName}
              />
              <TextInput
                style={[styles.input, themedStyles.input]}
                placeholder="Room Type Slug (e.g., living-room)"
                placeholderTextColor={themedStyles.subtext.color}
                value={newRoomTypeSlug}
                onChangeText={setNewRoomTypeSlug}
              />

              <Text style={[themedStyles.text, styles.productsSectionTitle]}>Products for this Room Type:</Text>
              {newProducts.map((product, index) => (
                <View key={index} style={styles.productInputRow}>
                  <TextInput
                    style={[styles.productInput, themedStyles.input, { flex: 2 }]}
                    placeholder="Product Name"
                    placeholderTextColor={themedStyles.subtext.color}
                    value={product.name}
                    onChangeText={(text) => handleProductChange(index, 'name', text)}
                  />
                  <TextInput
                    style={[styles.productInput, themedStyles.input, { flex: 1 }]}
                    placeholder="Price"
                    placeholderTextColor={themedStyles.subtext.color}
                    value={product.default_price?.toString()}
                    onChangeText={(text) => handleProductChange(index, 'default_price', text)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.productInput, themedStyles.input, { flex: 1 }]}
                    placeholder="Wages"
                    placeholderTextColor={themedStyles.subtext.color}
                    value={product.wages?.toString()}
                    onChangeText={(text) => handleProductChange(index, 'wages', text)}
                    keyboardType="numeric"
                  />
                  <View style={[styles.pickerContainer, themedStyles.input]}>
                    <Picker
                      selectedValue={product.default_unit_type}
                      onValueChange={(itemValue) => handleProductChange(index, 'default_unit_type', itemValue)}
                      style={[styles.picker, themedStyles.text]}
                      itemStyle={themedStyles.text}
                    >
                      {availableUnitTypes.map((unitType) => (
                        <Picker.Item key={unitType} label={unitType} value={unitType} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveProductFromRoomType(index)} style={styles.removeProductButton}>
                    <IconSymbol name="xmark.circle.fill" size={24} color={themedStyles.danger.backgroundColor} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={handleAddProductToRoomType} style={[styles.addProductButton, themedStyles.button]}>
                <Text style={themedStyles.buttonText}>Add Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, themedStyles.button]}
                onPress={editingRoomType ? handleUpdateRoomType : handleAddRoomType}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingRoomType ? 'Update Room Type' : 'Add Room Type'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  roomTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  roomTypeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  roomTypeSlug: {
    fontSize: 14,
    marginTop: 2,
  },
  productsContainer: {
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  productsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  productInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  productInput: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  pickerContainer: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    height: 44, // Adjust height to match TextInput
  },
  picker: {
    height: 44, // Adjust height to match TextInput
    width: '100%',
  },
  removeProductButton: {
    padding: 5,
  },
  addProductButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
