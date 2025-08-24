import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

import { IconSymbol } from './ui/IconSymbol';
interface ProductDimensionModalProps {
  visible: boolean;
  onClose: () => void;
  onSetDimensions: (dimensions: { length: number; width: number; lengthUnit: string; widthUnit: string; totalSqFt: number }) => void;
}

export const ProductDimensionModal: React.FC<ProductDimensionModalProps> = ({
  visible,
  onClose,
  onSetDimensions,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [productLength, setProductLength] = useState('');
  const [productWidth, setProductWidth] = useState('');

  useEffect(() => {
    // Reset dimensions when modal becomes visible
    if (visible) {
      setProductLength('');
      setProductWidth('');
    }
  }, [visible]);

  const handleSetDimensions = () => {
    const length = parseFloat(productLength);
    const width = parseFloat(productWidth);
    if (!isNaN(length) && !isNaN(width)) {
      onSetDimensions({
        length: length,
        width: width,
        lengthUnit: 'ft', // Assuming 'ft' as the unit for now based on current implementation
        widthUnit: 'ft',  // Assuming 'ft' as the unit for now based on current implementation
        totalSqFt: length * width,
      });
      onClose();
    } else {
      Alert.alert('Invalid Input', 'Please enter valid numbers for length and width.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#374151' : '#ffffff' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
            Enter Dimensions
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Length (ft)
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Length in feet"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={productLength}
              onChangeText={setProductLength}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
              Width (ft)
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#4b5563' : '#f8fafc',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  borderColor: isDark ? '#6b7280' : '#e2e8f0'
                }
              ]}
              placeholder="Width in feet"
              placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
              value={productWidth}
              onChangeText={setProductWidth}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#1F2937' }]}
            onPress={handleSetDimensions}
          >
            <Text style={styles.addButtonText}>Set Quantity</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '400',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
