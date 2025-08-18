import { ROOM_TYPES } from '@/types/db';
import { supabase } from '@/utils/supabaseClient';
import * as base64js from 'base64-js';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const GRID_IMAGE_WIDTH = (width - 60) / 3;

type Role = 'admin' | 'client' | 'worker' | 'viewer' | undefined;

export default function RoomGalleryScreen() {
  const { roomType: roomTypeSlug } = useLocalSearchParams<{ roomType: string }>();
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const roomType = ROOM_TYPES.find((rt) => rt.slug === roomTypeSlug);

  useEffect(() => {
    const fetchSessionAndImages = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      if (roomTypeSlug) await fetchImages();
    };
    fetchSessionAndImages();
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
      const imageData = signedUrlResults
        .map((result, i) => {
          if (result.error) {
            console.error('Error creating signed URL:', result.error);
            return null;
          }
          return { path: `${roomTypeSlug}/${files[i].name}`, url: result.data.signedUrl };
        })
        .filter(Boolean) as { path: string; url: string }[];
      setImages(imageData);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch images.');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      base64: true,
    });
    if (!result.canceled && result.assets) {
      await uploadImages(result.assets);
    }
  };

  const uploadImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!roomTypeSlug) return;
    for (const asset of assets) {
      if (asset.base64) {
        const fileName = `${roomTypeSlug}/${Date.now()}_${asset.fileName ?? 'image.jpg'}`;
        const { error } = await supabase.storage
          .from('file-storage')
          .upload(fileName, base64js.toByteArray(asset.base64), { contentType: asset.type });
        if (error) Alert.alert('Error uploading image', error.message);
      }
    }
    Alert.alert('Images uploaded successfully!');
    fetchImages();
  };

  const deleteImage = async (imagePath: string) => {
    const { error } = await supabase.storage.from('file-storage').remove([imagePath]);
    if (error) {
      Alert.alert('Error deleting image', error.message);
    } else {
      Alert.alert('Image deleted successfully!');
      fetchImages();
    }
  };

  const handleDeleteConfirmation = (imagePath: string) => {
    Alert.alert('Delete Image', 'Delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteImage(imagePath) },
    ]);
  };

  const role: Role = session?.user?.user_metadata?.role;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading gallery...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titleText}>{roomType?.name || 'Gallery'}</Text>
        <Text style={styles.subtitleText}>
          {images.length > 0 ? `Tap to preview images (${images.length})` : 'No images yet'}
        </Text>

        {/* Masonry grid */}
        <View style={styles.gridContainer}>
          {images.map((image) => (
            <View style={styles.card} key={image.path}>
              <TouchableOpacity
                style={styles.imageWrapper}
                activeOpacity={0.95}
                onPress={() => {
                  setSelectedImage(image.url);
                  setModalVisible(true);
                }}
              >
                <Image source={{ uri: image.url }} style={styles.gridImage} />
              </TouchableOpacity>
              {role === 'admin' && (
                <TouchableOpacity
                  style={styles.deleteIcon}
                  onPress={() => handleDeleteConfirmation(image.path)}
                >
                  <Text style={styles.deleteIconText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating action for upload */}
      {role === 'admin' && (
        <TouchableOpacity style={styles.fab} onPress={pickAndUploadImages}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
            {!!selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fd',
  },
  scrollContent: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fd',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontWeight: '500',
    fontSize: 16,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  card: {
    width: GRID_IMAGE_WIDTH,
    aspectRatio: 1,
    borderRadius: 14,
    margin: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255, 0.93)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'android' ? 0.09 : 0.18,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  deleteIcon: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.13)',
    borderRadius: 11,
    padding: 3,
    zIndex: 1,
  },
  deleteIconText: {
    fontSize: 17,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 32,
    backgroundColor: '#6366f1',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.21,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 30, 39, 0.91)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  closeModal: {
    position: 'absolute',
    top: 5,
    right: 10,
    zIndex: 2,
  },
  closeModalText: {
    fontSize: 24,
    color: '#555',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
