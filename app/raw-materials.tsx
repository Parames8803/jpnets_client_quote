import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabaseClient';
import { RawMaterial } from '@/types/db';
import AddRawMaterialForm from './raw-materials/components/AddRawMaterialForm';

export default function RawMaterialsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [unitTypes, setUnitTypes] = useState(['pcs', 'kg', 'm', 'sq.ft']); // Define unit types here

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Material',
      'Are you sure you want to delete this raw material?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const { error } = await supabase.from('raw_materials').delete().eq('id', id);
              if (error) throw error;
              fetchMaterials();
            } catch (err: any) {
              Alert.alert('Error', `Failed to delete material: ${err.message}`);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRawMaterials(data as RawMaterial[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rawMaterials.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** ------------ Render Item ------------ */
  const renderItem = ({ item }: { item: RawMaterial }) => (
    <View style={[
      styles.card,
      { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }
    ]}>
      {/* Left Accent */}
      <View style={[
        styles.categoryAccent,
        { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }
      ]}/>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {item.name}
        </Text>
        {item.subcategories?.length ? (
          <Text style={[styles.cardSub, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            {item.subcategories.join(', ')}
          </Text>
        ) : null}
        <Text style={[styles.cardText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Unit: {item.unit_type}
        </Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
          <Ionicons name="create-outline" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /** ------------ UI States ------------ */
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="reload-circle" size={48} color={isDark ? Colors.dark.tint : Colors.light.tint}/>
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Ionicons name="alert-circle" size={48} color="#D32F2F"/>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]} onPress={fetchMaterials}>
          <Text style={styles.retryText}>Retry</Text>
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

      {/* 🔍 Search */}
      <TextInput
        style={[
          styles.searchBar,
          {
            backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
            color: isDark ? Colors.dark.text : Colors.light.text,
          },
        ]}
        placeholder="Search raw materials..."
        placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* 📋 List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length ? styles.listContent : styles.emptyState}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={60} color={isDark ? Colors.dark.secondary : Colors.light.secondary}/>
            <Text style={[styles.emptyText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              No materials yet
            </Text>
          </View>
        )}
      />

      {/* ➕ Floating Add Button */}
      <TouchableOpacity
        onPress={() => {
          setEditingMaterial(null); // Clear editing state for new add
          setShowAddModal(true);
        }}
        style={[
          styles.fab,
          { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }
        ]}
      >
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      {/* 📝 Modal Add/Edit Form */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? Colors.dark.cardBackground : '#fff' }]}>
            <AddRawMaterialForm
              initialData={editingMaterial}
              unitTypes={unitTypes}
              onClose={() => {
                setShowAddModal(false);
                setEditingMaterial(null);
              }}
              onAdded={() => {
                fetchMaterials();
                setShowAddModal(false);
                setEditingMaterial(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** 🎨 Styles */
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  categoryAccent: {
    width: 6,
    borderRadius: 4,
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardText: { fontSize: 14, marginTop: 2 },
  cardSub: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  searchBar: {
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    padding: 16,
    borderRadius: 32,
    elevation: 4,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  errorText: { marginTop: 12, fontSize: 15, color: '#D32F2F', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 12,
    padding: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButton: {
    marginLeft: 10,
    padding: 5,
  },
});
