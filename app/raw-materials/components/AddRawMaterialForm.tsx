import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabaseClient';
import { RawMaterial } from '@/types/db'; // Import RawMaterial type

interface AddRawMaterialFormProps {
  initialData?: RawMaterial | null;
  unitTypes: string[];
  onClose: () => void;
  onAdded: () => void;
}

function AddRawMaterialForm({
  initialData,
  unitTypes,
  onClose,
  onAdded,
}: AddRawMaterialFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [materialName, setMaterialName] = useState('');
  const [subcategories, setSubcategories] = useState<string[]>(['']);
  const [unitType, setUnitType] = useState('');

  useEffect(() => {
    if (initialData) {
      setMaterialName(initialData.name);
      setSubcategories(initialData.subcategories && initialData.subcategories.length > 0 ? initialData.subcategories : ['']);
      setUnitType(initialData.unit_type);
    } else {
      setMaterialName('');
      setSubcategories(['']);
      setUnitType('');
    }
  }, [initialData]);

  const handleSubmit = useCallback(async () => {
    if (!materialName || !unitType) {
      Alert.alert('Error', 'Material Name and Unit Type are required.');
      return;
    }

    const filteredSubcategories = subcategories.filter((sub: string) => sub.trim() !== '');

    try {
      if (initialData) {
        // Update existing material
        const { error } = await supabase
          .from('raw_materials')
          .update({
            name: materialName,
            subcategories: filteredSubcategories,
            unit_type: unitType,
          })
          .eq('id', initialData.id);

        if (error) throw error;
        Alert.alert('Success', 'Raw material updated!');
      } else {
        // Add new material
        const { error } = await supabase
          .from('raw_materials')
          .insert({
            name: materialName,
            subcategories: filteredSubcategories,
            unit_type: unitType,
          });

        if (error) throw error;
        Alert.alert('Success', 'Raw material added!');
      }

      onAdded();
    } catch (e: any) {
      Alert.alert('Error', `Failed to ${initialData ? 'update' : 'add'} raw material: ${e.message}`);
    }
  }, [materialName, subcategories, unitType, initialData, onAdded]);

  const handleAddSubcategoryInput = useCallback(() => {
    if (subcategories.length < 3) { // Limit to 3 subcategories
      setSubcategories(prev => [...prev, '']);
    }
  }, [subcategories]);

  const handleSubcategoryChange = useCallback((text: string, index: number) => {
    setSubcategories(prev => {
      const updatedSubcategories = [...prev];
      updatedSubcategories[index] = text;
      return updatedSubcategories;
    });
  }, []);

  const handleRemoveSubcategoryInput = useCallback((index: number) => {
    setSubcategories(prev => {
      const updatedSubcategories = [...prev];
      updatedSubcategories.splice(index, 1);
      return updatedSubcategories.length === 0 ? [''] : updatedSubcategories; // Ensure at least one empty input remains
    });
  }, []);

  const isEditing = !!initialData;

  return (
    <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.dark.cardBackground : '#fff' }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close-circle" size={28} color={isDark ? Colors.dark.text : Colors.light.text} />
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {isEditing ? 'Edit Raw Material' : 'Add New Raw Material'}
      </Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
          color: isDark ? Colors.dark.text : Colors.light.text,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        }]}
        placeholder="Raw Material Name"
        placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
        value={materialName}
        onChangeText={setMaterialName}
      />

      <Text style={[styles.subTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Subcategories
      </Text>
      {subcategories.map((sub, index) => (
        <View key={index} style={styles.subcategoryInputContainer}>
          <TextInput
            style={[styles.input, styles.subcategoryInput, {
              backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
              color: isDark ? Colors.dark.text : Colors.light.text,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            }]}
            placeholder={`Subcategory ${index + 1}`}
            placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
            value={sub}
            onChangeText={(text) => handleSubcategoryChange(text, index)}
          />
          {subcategories.length > 1 && ( // Allow removing if more than one subcategory
            <TouchableOpacity onPress={() => handleRemoveSubcategoryInput(index)} style={styles.removeSubcategoryButton}>
              <Ionicons name="remove-circle-outline" size={24} color="#D32F2F" />
            </TouchableOpacity>
          )}
          {index === subcategories.length - 1 && subcategories.length < 3 && ( // Only show add button on last field, up to 3
            <TouchableOpacity onPress={handleAddSubcategoryInput} style={styles.addSubcategoryButton}>
              <Ionicons name="add-circle-outline" size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={[styles.pickerContainer, {
        backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
        borderColor: isDark ? Colors.dark.border : Colors.light.border,
      }]}>
        <Picker
          selectedValue={unitType}
          onValueChange={(itemValue) => setUnitType(itemValue)}
          style={[styles.picker, { color: isDark ? Colors.dark.text : Colors.light.text }]}
        >
          <Picker.Item label="Select Unit Type" value="" />
          {unitTypes.map((unit, index) => (
            <Picker.Item key={index} label={unit} value={unit} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}
        onPress={handleSubmit}
      >
        <Text style={styles.addButtonText}>{isEditing ? 'Save Changes' : 'Add Raw Material'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    borderRadius: 12,
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  subcategoryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subcategoryInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  addSubcategoryButton: {
    padding: 8,
  },
  removeSubcategoryButton: {
    padding: 8,
    marginLeft: -5, // Adjust to align with add button
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default memo(AddRawMaterialForm);
