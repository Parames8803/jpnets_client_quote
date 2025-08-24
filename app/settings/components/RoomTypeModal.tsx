import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ProductType, RoomType } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RoomTypeModalProps {
  isVisible: boolean;
  onClose: () => void;
  editingRoomType: RoomType | null;
  onSave: () => void;
  fetchRoomTypes: () => void;
  hideProducts?: boolean; // New prop to hide product fields
}

export const RoomTypeModal: React.FC<RoomTypeModalProps> = ({
  isVisible,
  onClose,
  editingRoomType,
  onSave,
  fetchRoomTypes,
  hideProducts = false, // Default to false
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as 'light' | 'dark' ?? 'light'];

  const [newRoomTypeName, setNewRoomTypeName] = useState('');
  const [newRoomTypeSlug, setNewRoomTypeSlug] = useState('');
  const [newProducts, setNewProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableUnitTypes, setAvailableUnitTypes] = useState<string[]>(['sq.ft', 'running ft', 'nos']); // Example unit types

  useEffect(() => {
    if (editingRoomType) {
      setNewRoomTypeName(editingRoomType.name);
      setNewRoomTypeSlug(editingRoomType.slug);
      setNewProducts(editingRoomType.products || []);
    } else {
      resetForm();
    }
  }, [editingRoomType, isVisible]);

  const resetForm = () => {
    setNewRoomTypeName('');
    setNewRoomTypeSlug('');
    setNewProducts([]);
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
      onSave();
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
      onSave();
      fetchRoomTypes();
    }
    setLoading(false);
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
    card: { backgroundColor: colors.cardBackground },
    text: { color: colors.text },
    subtext: { color: colors.tabIconDefault },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      color: colors.text,
    },
    button: { backgroundColor: colors.tint },
    buttonText: { color: '#fff' },
    danger: { backgroundColor: colors.red },
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, themedStyles.card]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
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

            {!hideProducts && (
              <>
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
              </>
            )}

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
  );
};

const styles = StyleSheet.create({
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
