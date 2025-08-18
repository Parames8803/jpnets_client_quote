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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { ROOM_TYPES } from '@/types/db';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const BRAND_RED = '#E53935';
const CHARCOAL_BLACK = '#212121';
const COOL_GRAY = '#9E9E9E';
const SOFT_WHITE = '#FAFAFA';

const design = {
  light: {
    bg: SOFT_WHITE,
    surface: SOFT_WHITE,
    text: CHARCOAL_BLACK,
    subtext: COOL_GRAY,
    primary: BRAND_RED,
    primaryOn: SOFT_WHITE,
    border: COOL_GRAY,
    shadow: '#E0E0E0',
  },
  dark: {
    bg: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    subtext: COOL_GRAY,
    primary: BRAND_RED,
    primaryOn: SOFT_WHITE,
    border: '#333333',
    shadow: '#000000',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  space: (n: number) => 4 * n,
};

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;

export default function GalleryScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? design.dark : design.light;
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

  const renderRoomCard = ({
    item: roomType,
    index,
  }: {
    item: typeof ROOM_TYPES[0];
    index: number;
  }) => {
    const previews = roomPreviews[roomType.slug] || [];
    const mainImage = previews[0];
    const isEven = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { marginRight: isEven ? 16 : 0, backgroundColor: colors.surface },
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
            <View style={[styles.placeholderImage, { backgroundColor: colors.surface || '#86888bff' }]}>
              <Text style={[styles.placeholderText, { color: colors.subtext }]}>📷</Text>
              <Text style={[styles.placeholderSubtext, { color: colors.subtext }]}>No images</Text>
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
            style={[styles.cardTitle, { color: colors.text }]}
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
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Gallery</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Explore our collections</Text>
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
    borderColor: SOFT_WHITE,
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