import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; // For category dropdown
import { supabase } from '@/utils/supabaseClient'; // Import supabase client
import { RawMaterial } from '@/types/db'; // Import RawMaterial interface from db.ts
import { useEffect } from 'react';

export default function RawMaterialsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialCategory, setNewMaterialCategory] = useState('');
  const [newMaterialSubcategories, setNewMaterialSubcategories] = useState<string[]>(['']);
  const [newMaterialQuantity, setNewMaterialQuantity] = useState('');
  const [newMaterialUnitType, setNewMaterialUnitType] = useState('');
  const [categories, setCategories] = useState(['Wood', 'Metal', 'Plastic', 'Fabric']); // Example categories
  const [unitTypes, setUnitTypes] = useState(['pcs', 'kg', 'm', 'sq.ft']); // Example unit types
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  const fetchRawMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setRawMaterials(data as RawMaterial[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRawMaterial = async () => {
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
          subcategories: newMaterialSubcategories.filter(sub => sub.trim() !== ''),
          quantity: parseFloat(newMaterialQuantity),
          unit_type: newMaterialUnitType,
        })
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setRawMaterials(prev => [data[0] as RawMaterial, ...prev]);
        setNewMaterialName('');
        setNewMaterialCategory('');
        setNewMaterialSubcategories(['']);
        setNewMaterialQuantity('');
        setNewMaterialUnitType('');
        Alert.alert('Success', 'Raw material added!');
      }
    } catch (e: any) {
      Alert.alert('Error', `Failed to add raw material: ${e.message}`);
    }
  };

  const handleAddSubcategoryInput = () => {
    setNewMaterialSubcategories([...newMaterialSubcategories, '']);
  };

  const handleSubcategoryChange = (text: string, index: number) => {
    const updatedSubcategories = [...newMaterialSubcategories];
    updatedSubcategories[index] = text;
    setNewMaterialSubcategories(updatedSubcategories);
  };

  const renderRawMaterialItem = ({ item }: { item: RawMaterial }) => (
    <View style={[styles.card, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
      <Text style={[styles.cardTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{item.name}</Text>
      <Text style={[styles.cardText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>Category: {item.category}</Text>
      {item.subcategories && item.subcategories.length > 0 && (
        <Text style={[styles.cardText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Subcategories: {item.subcategories.join(', ')}
        </Text>
      )}
      <Text style={[styles.cardText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
        Quantity: {item.quantity} {item.unit_type}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="refresh-circle-outline" size={40} color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <Text style={[styles.loadingText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Loading raw materials...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#D32F2F" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchRawMaterials} style={[styles.retryButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Stack.Screen
        options={{
          title: 'Raw Materials',
          headerStyle: { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
          headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
        }}
      />
      <FlatList
        data={rawMaterials}
        renderItem={renderRawMaterialItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View style={styles.addSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              Add New Raw Material
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
                color: isDark ? Colors.dark.text : Colors.light.text,
                borderColor: isDark ? Colors.dark.border : Colors.light.border,
              }]}
              placeholder="Raw Material Name"
              placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
              value={newMaterialName}
              onChangeText={setNewMaterialName}
            />

            <View style={[styles.pickerContainer, { 
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
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
                    backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
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
                    <Ionicons name="add-circle-outline" size={24} color={Colors.light.tint} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
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
              backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
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
            <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text, marginTop: 24 }]}>
              Raw Materials List
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={60} color={isDark ? Colors.dark.secondary : Colors.light.secondary} />
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              No Raw Materials Added
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addSection: {
    padding: 16,
    // Removed marginBottom as it's now part of ListHeaderComponent
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16, // Add some padding to the bottom of the list
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
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
    overflow: 'hidden', // Ensures picker content stays within bounds
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
    marginBottom: 0, // Remove bottom margin for inline inputs
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
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '400',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
