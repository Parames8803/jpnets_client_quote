import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { RoomType } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-get-random-values';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoomTypeModal } from './components/RoomTypeModal';

export default function ManageRoomTypesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme as 'light' | 'dark' ?? 'light'];

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);

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
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingRoomType(null);
    setModalVisible(true);
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

      <TouchableOpacity onPress={openAddModal} style={[styles.fab, themedStyles.button]}>
        <IconSymbol name="plus.circle.fill" size={28} color={themedStyles.buttonText.color} />
      </TouchableOpacity>

      <RoomTypeModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        editingRoomType={editingRoomType}
        onSave={() => {
          setModalVisible(false);
          fetchRoomTypes();
        }}
        fetchRoomTypes={fetchRoomTypes}
      />
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
