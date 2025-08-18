import { ROOM_TYPES } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;

export default function GalleryScreen() {
  const router = useRouter();
  const [roomPreviews, setRoomPreviews] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };

    const fetchPreviews = async () => {
      await fetchSession();
      const newPreviews: { [key: string]: string[] } = {};

      for (const roomType of ROOM_TYPES) {
        const { data: files, error } = await supabase.storage
          .from('file-storage')
          .list(roomType.slug, { limit: 6, offset: 0, sortBy: { column: 'name', order: 'asc' } });

        if (error || !files || files.length === 0) {
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

    fetchPreviews();
  }, []);

  const role: Role = session?.user?.user_metadata?.role;

  const renderRoomCard = ({ item: roomType, index }: { item: typeof ROOM_TYPES[0], index: number }) => {
    const previews = roomPreviews[roomType.slug] || [];
    const mainImage = previews[0];
    const isEven = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[styles.card, { marginRight: isEven ? 16 : 0 }]}
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
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📷</Text>
              <Text style={styles.placeholderSubtext}>No images</Text>
            </View>
          )}
          
          {/* Image count badge */}
          {previews.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{previews.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {roomType.name}
          </Text>
          
          {/* Mini preview strip */}
          {previews.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.miniPreviewContainer}
            >
              {previews.slice(1, 4).map((url, idx) => (
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
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <Text style={styles.subtitle}>Explore our collections</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={ROOM_TYPES}
        renderItem={renderRoomCard}
        keyExtractor={(item) => item.slug}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
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
    backgroundColor: 'white',
    borderRadius: 20,
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
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#94a3b8',
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
    color: '#1e293b',
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
    borderColor: '#f1f5f9',
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
});
