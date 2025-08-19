import { IconSymbol } from '@/components/ui/IconSymbol';
import { ROOM_TYPES } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import * as base64js from 'base64-js';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Design tokens (kept your palette, tuned surfaces)
const design = {
  light: {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#111827',
    subtext: '#6B7280',
    primary: '#E53935',
    primaryOn: '#FFFFFF',
    border: '#E5E7EB',
    shadow: '#E0E0E0',
    muted: '#F3F4F6',
    success: '#10B981',
    error: '#EF4444',
  },
  dark: {
    bg: '#0B1220',
    surface: '#121826',
    text: '#F9FAFB',
    subtext: '#9CA3AF',
    primary: '#E53935',
    primaryOn: '#FFFFFF',
    border: '#1F2937',
    shadow: '#000000',
    muted: '#111827',
    success: '#34D399',
    error: '#F87171',
  },
  radius: { sm: 10, md: 14, lg: 18, xl: 24 },
  space: (n: number) => 4 * n,
};

// Responsive grid: 3 cols on phones, 4 on large phones
const COLS = width >= 420 ? 4 : 3;
const GAP = 10;
const H_PADDING = 16;
const CARD_SIZE = (width - H_PADDING * 2 - GAP * (COLS - 1)) / COLS;

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;
type GalleryItem = { path: string; url: string; name: string };

export default function RoomGalleryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? design.dark : design.light;

  const { roomType: roomTypeSlug } = useLocalSearchParams<{ roomType: string }>();
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const roomType = ROOM_TYPES.find((rt) => rt.slug === roomTypeSlug);
  const role: Role = session?.user?.user_metadata?.role;

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      if (roomTypeSlug) await fetchImages();
    };
    init();
  }, [roomTypeSlug]);

  const fetchImages = async () => {
    if (!roomTypeSlug) return;
    setLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('file-storage')
        .list(roomTypeSlug, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw error;
      if (!files || files.length === 0) {
        setImages([]);
        return;
      }

      const signedUrlPromises = files.map((file) =>
        supabase.storage.from('file-storage').createSignedUrl(`${roomTypeSlug}/${file.name}`, 3600)
      );
      const signedUrlResults = await Promise.all(signedUrlPromises);

      const items: GalleryItem[] = signedUrlResults
        .map((res, i) => {
          if (res.error) {
            console.error('Error creating signed URL:', res.error);
            return null;
          }
          const name = files[i].name;
          return { path: `${roomTypeSlug}/${name}`, url: res.data.signedUrl, name };
        })
        .filter(Boolean) as GalleryItem[];

      setImages(items);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch images.');
    } finally {
      setLoading(false);
      setSelectedPaths(new Set()); // reset selection on refresh
      setSelectMode(false);
    }
  };

  const pickAndUploadImages = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.92,
        base64: true,
      });
      if (!result.canceled && result.assets) {
        await uploadImages(result.assets);
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!roomTypeSlug) return;
    for (const asset of assets) {
      if (asset.base64) {
        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const filename = `${roomTypeSlug}/${Date.now()}_${asset.fileName ?? `image.${ext}`}`;
        const { error } = await supabase.storage
          .from('file-storage')
          .upload(filename, base64js.toByteArray(asset.base64), { contentType: asset.type || `image/${ext}` });
        if (error) {
          Alert.alert('Error uploading image', error.message);
          return;
        }
      }
    }
    Alert.alert('Success', 'Images uploaded successfully!');
    fetchImages();
  };

  const deleteImage = async (imagePath: string) => {
    const { error } = await supabase.storage.from('file-storage').remove([imagePath]);
    if (error) {
      Alert.alert('Error deleting image', error.message);
    } else {
      fetchImages();
    }
  };

  const deleteSelected = () => {
    if (selectedPaths.size === 0) return;
    Alert.alert('Delete images', `Delete ${selectedPaths.size} selected image(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.storage
            .from('file-storage')
            .remove(Array.from(selectedPaths));
          if (error) {
            Alert.alert('Error deleting images', error.message);
          } else {
            fetchImages();
          }
        },
      },
    ]);
  };

  const handleDeleteConfirmation = (imagePath: string) => {
    Alert.alert('Delete Image', 'Delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteImage(imagePath) },
    ]);
  };

  const toggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const enterSelectMode = (path?: string) => {
    if (!selectMode) setSelectMode(true);
    if (path) toggleSelect(path);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedPaths(new Set());
  };

  const headerTitle = roomType?.name || 'Gallery';
  const subtitle = images.length > 0 ? `Tap to preview • ${images.length}` : 'No images yet';

  // ----- Renderers -----
  const renderItem = ({ item }: { item: GalleryItem }) => {
    const isSelected = selectedPaths.has(item.path);
    return (
      <Pressable
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.path);
          } else {
            setSelectedImage(item);
            setModalVisible(true);
          }
        }}
        onLongPress={() => {
          if (role === 'admin') enterSelectMode(item.path);
        }}
        style={[
          styles.card,
          {
            width: CARD_SIZE,
            height: CARD_SIZE,
            backgroundColor: colors.surface,
            shadowColor: colors.shadow,
          },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        <Image source={{ uri: item.url }} style={styles.gridImage} />
        {role === 'admin' && !selectMode && (
          <TouchableOpacity
            style={[styles.deleteIcon, { backgroundColor: 'rgba(0, 0, 0, 0.28)' }]}
            onPress={() => handleDeleteConfirmation(item.path)}
            hitSlop={8}
          >
            <IconSymbol name="trash.fill" size={16} color={isDark ? '#FCA5A5' : '#DC2626'} />
          </TouchableOpacity>
        )}
        {selectMode && (
          <View style={[styles.checkbox, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            {isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading gallery…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Sticky Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>{headerTitle}</Text>
          <Text style={[styles.subtitleText, { color: colors.subtext }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        {role === 'admin' && (
          <View style={styles.headerActions}>
            {selectMode ? (
              <>
                <HeaderBtn label="Delete" onPress={deleteSelected} color={colors.primary} textColor="#FFF" />
                <HeaderBtn label="Cancel" onPress={exitSelectMode} color={colors.muted} textColor={colors.text} />
              </>
            ) : (
              <>
                <HeaderBtn label={uploading ? 'Uploading…' : 'Upload'} onPress={pickAndUploadImages} color={colors.primary} textColor="#FFF" disabled={uploading} />
                <HeaderBtn label="Select" onPress={() => setSelectMode(true)} color={colors.muted} textColor={colors.text} />
              </>
            )}
          </View>
        )}
      </View>

      {/* Grid */}
      {images.length > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(it) => it.path}
          renderItem={renderItem}
          numColumns={COLS}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PADDING }}
          contentContainerStyle={{ gap: GAP, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.emptyWrap, { paddingHorizontal: 24 }]}>
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No images yet</Text>
            <Text style={[styles.emptyHint, { color: colors.subtext }]}>
              Upload reference images to build your {headerTitle.toLowerCase()} gallery.
            </Text>
            {role === 'admin' && (
              <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.primary }]} onPress={pickAndUploadImages}>
                <Text style={[styles.ctaText, { color: colors.primaryOn }]}>Upload Images</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Preview Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalTopBar]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
              <Text style={styles.modalTopBtn}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTopTitle} numberOfLines={1}>
              {selectedImage?.name || ''}
            </Text>
            {role === 'admin' && selectedImage ? (
              <TouchableOpacity onPress={() => handleDeleteConfirmation(selectedImage.path)} hitSlop={10}>
                <Text style={[styles.modalTopBtn, { color: '#FCA5A5' }]}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 52 }} />
            )}
          </View>
          <View style={styles.modalBody}>
            {!!selectedImage && (
              <Image source={{ uri: selectedImage.url }} style={styles.modalImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* FAB (admin only, mirrors other screens) */}
      {role === 'admin' && !selectMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={pickAndUploadImages}
          activeOpacity={0.9}
        >
          <Text style={[styles.fabText, { color: colors.primaryOn }]}>＋</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

/* ---------- Small UI components ---------- */

function HeaderBtn({ label, onPress, color, textColor, disabled }: {
  label: string; onPress: () => void; color: string; textColor: string; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.headerBtn, { backgroundColor: color, opacity: disabled ? 0.6 : 1 }]}
      activeOpacity={0.85}
    >
      <Text style={[styles.headerBtnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontWeight: '600', fontSize: 16 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLeft: { flex: 1 },
  titleText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  subtitleText: { fontSize: 12, fontWeight: '600' },

  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  headerBtnText: { fontSize: 12, fontWeight: '800' },

  // Grid
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  gridImage: { width: '100%', height: '100%' },

  deleteIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  deleteIconText: { fontSize: 16 },

  checkbox: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxTick: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  // Empty state
  emptyWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyHint: { fontSize: 14, textAlign: 'center' },
  ctaBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  ctaText: { fontSize: 14, fontWeight: '800' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    paddingTop: 56,
  },
  modalTopBar: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTopBtn: { color: '#E5E7EB', fontWeight: '800' },
  modalTopTitle: { color: '#E5E7EB', fontWeight: '800', flex: 1, textAlign: 'center' },
  modalBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 },
  modalImage: { width: '100%', height: '100%' },

  // FAB
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontSize: 32, fontWeight: '900' },
});
