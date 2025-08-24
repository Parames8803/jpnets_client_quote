import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { RoomType } from '@/types/db';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { RoomTypeModal } from '@/app/settings/components/RoomTypeModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;

export default function GalleryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomPreviews, setRoomPreviews] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null); // Will be null for adding new room types

  const fetchRoomTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('room_types').select('*');
    if (error) {
      console.error('Error fetching room types:', error);
      setLoading(false);
      return [];
    }
    setRoomTypes(data || []);
    setLoading(false);
    return data as RoomType[];
  };

  useEffect(() => {
    const fetchSessionAndPreviews = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);

      const fetchedRoomTypes = await fetchRoomTypes();
      const newPreviews: { [key: string]: string[] } = {};

      for (const roomType of fetchedRoomTypes) {
        const { data: files, error } = await supabase.storage
          .from('file-storage')
          .list(roomType.slug, { limit: 6, offset: 0, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
          console.error(`Error listing files for ${roomType.slug}:`, error);
          newPreviews[roomType.slug] = [];
          continue;
        }

        if (!files || files.length === 0) {
          newPreviews[roomType.slug] = [];
          continue;
        }

        const urls = files.map((file) => {
          const { data } = supabase.storage
            .from('file-storage')
            .getPublicUrl(`${roomType.slug}/${file.name}`);
          return data.publicUrl;
        });

        newPreviews[roomType.slug] = urls;
      }

      setRoomPreviews(newPreviews);
      setLoading(false);
    };

    fetchSessionAndPreviews();
  }, []);

  const openAddRoomTypeModal = () => {
    setEditingRoomType(null);
    setModalVisible(true);
  };

  const role: Role = session?.user?.user_metadata?.role;
  const styles = getStyles(isDark);

  const renderRoomCard = ({
    item: roomType,
    index,
  }: {
    item: RoomType;
    index: number;
  }) => {
    const previews = roomPreviews[roomType.slug] || [];
    const mainImage = previews[0];
    const isEven = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { marginRight: isEven ? 16 : 0, backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground },
        ]}
        onPress={() =>
          router.push({
            pathname: '/gallery/[roomType]',
            params: { roomType: roomType.slug },
          } as any)
        }
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {mainImage ? (
            <>
              <Image source={{ uri: mainImage }} style={styles.mainImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.gradient}
              />
            </>
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground || '#86888bff' }]}>
              <Text style={[styles.placeholderText, { color: isDark ? Colors.dark.subtext : Colors.light.subtext }]}>📷</Text>
              <Text style={[styles.placeholderSubtext, { color: isDark ? Colors.dark.subtext : Colors.light.subtext }]}>No images</Text>
            </View>
          )}

          {previews.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{previews.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text
            style={[styles.cardTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            numberOfLines={2}
          >
            {roomType.name}
          </Text>

          {previews.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.miniPreviewContainer}
            >
              {previews.slice(1, 4).map((url: string, idx: number) => (
                <Image
                  key={`${url}-${idx}`}
                  source={{ uri: url }}
                  style={styles.miniPreview}
                />
              ))}
              {previews.length > 4 && (
                <View style={styles.moreIndicator}>
                  <Text style={styles.moreText}>+{previews.length - 4}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={isDark ? Colors.dark.primary : Colors.light.primary} />
          <Text style={[styles.loadingText, { color: isDark ? Colors.dark.subtext : Colors.light.subtext }]}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Gallery</Text>
        <Text style={[styles.subtitle, { color: isDark ? Colors.dark.subtext : Colors.light.subtext }]}>Explore our collections</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={roomTypes}
        renderItem={renderRoomCard}
        keyExtractor={(item) => item.slug}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />

      <TouchableOpacity onPress={openAddRoomTypeModal} style={[styles.fab, { backgroundColor: isDark ? Colors.dark.tint : Colors.light.tint }]}>
        <IconSymbol name="plus.circle.fill" size={28} color={isDark ? Colors.dark.buttonText : Colors.light.buttonText} />
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
        hideProducts={true}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    fontWeight: '500',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 22,
  },
  miniPreviewContainer: {
    flexDirection: 'row',
  },
  miniPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 2,
    borderColor: isDark ? Colors.dark.background : Colors.light.background,
  },
  moreIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
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
