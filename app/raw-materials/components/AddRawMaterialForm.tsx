import React, { memo, useState, useCallback } from 'react';
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

interface AddRawMaterialFormProps {
  categories: string[];
  unitTypes: string[];
  onClose: () => void;
  onAdded: () => void;
}

function AddRawMaterialForm({
  categories,
  unitTypes,
  onClose,
  onAdded,
}: AddRawMaterialFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialCategory, setNewMaterialCategory] = useState('');
  const [newMaterialSubcategories, setNewMaterialSubcategories] = useState<string[]>(['']);
  const [newMaterialQuantity, setNewMaterialQuantity] = useState('');
  const [newMaterialUnitType, setNewMaterialUnitType] = useState('');

  const handleAddRawMaterial = useCallback(async () => {
    if (!newMaterialName || !newMaterialCategory || !newMaterialQuantity || !newMaterialUnitType) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert({
          name: newMaterialName,
          category: newMaterialCategory,
          subcategories: newMaterialSubcategories.filter((sub: string) => sub.trim() !== ''),
          quantity: parseFloat(newMaterialQuantity),
          unit_type: newMaterialUnitType,
        })
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setNewMaterialName('');
        setNewMaterialCategory('');
        setNewMaterialSubcategories(['']);
        setNewMaterialQuantity('');
        setNewMaterialUnitType('');
        Alert.alert('Success', 'Raw material added!');
        onAdded();
      }
    } catch (e: any) {
      Alert.alert('Error', `Failed to add raw material: ${e.message}`);
    }
  }, [newMaterialName, newMaterialCategory, newMaterialSubcategories, newMaterialQuantity, newMaterialUnitType, onAdded]);

  const handleAddSubcategoryInput = useCallback(() => {
    setNewMaterialSubcategories(prev => [...prev, '']);
  }, []);

  const handleSubcategoryChange = useCallback((text: string, index: number) => {
    setNewMaterialSubcategories(prev => {
      const updatedSubcategories = [...prev];
      updatedSubcategories[index] = text;
      return updatedSubcategories;
    });
  }, []);

  return (
    <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.dark.cardBackground : '#fff' }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close-circle" size={28} color={isDark ? Colors.dark.text : Colors.light.text} />
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Add New Raw Material
      </Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
          color: isDark ? Colors.dark.text : Colors.light.text,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        }]}
        placeholder="Raw Material Name"
        placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
        value={newMaterialName}
        onChangeText={setNewMaterialName}
      />

      <View style={[styles.pickerContainer, {
        backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
        borderColor: isDark ? Colors.dark.border : Colors.light.border,
      }]}>
        <Picker
          selectedValue={newMaterialCategory}
          onValueChange={(itemValue) => setNewMaterialCategory(itemValue)}
          style={[styles.picker, { color: isDark ? Colors.dark.text : Colors.light.text }]}
        >
          <Picker.Item label="Select Category" value="" />
          {categories.map((cat, index) => (
            <Picker.Item key={index} label={cat} value={cat} />
          ))}
        </Picker>
      </View>

      <Text style={[styles.subTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Subcategories
      </Text>
      {newMaterialSubcategories.map((sub, index) => (
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
          {index === newMaterialSubcategories.length - 1 && (
            <TouchableOpacity onPress={handleAddSubcategoryInput} style={styles.addSubcategoryButton}>
              <Ionicons name="add-circle-outline" size={24} color={isDark ? Colors.dark.tint : Colors.light.tint} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TextInput
        style={[styles.input, {
          backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
          color: isDark ? Colors.dark.text : Colors.light.text,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        }]}
        placeholder="Quantity"
        placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
        value={newMaterialQuantity}
        onChangeText={setNewMaterialQuantity}
        keyboardType="numeric"
      />

      <View style={[styles.pickerContainer, {
        backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
        borderColor: isDark ? Colors.dark.border : Colors.light.border,
      }]}>
        <Picker
          selectedValue={newMaterialUnitType}
          onValueChange={(itemValue) => setNewMaterialUnitType(itemValue)}
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
        onPress={handleAddRawMaterial}
      >
        <Text style={styles.addButtonText}>Add Raw Material</Text>
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
