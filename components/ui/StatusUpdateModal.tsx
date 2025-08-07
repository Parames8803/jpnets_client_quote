import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface StatusUpdateModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectStatus: (status: string) => void;
  currentStatus: string | null;
}

const { width } = Dimensions.get('window');

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isVisible,
  onClose,
  onSelectStatus,
  currentStatus,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const statuses = ['Assigned', 'In Progress', 'Completed', 'Cancelled'];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol name="xmark.circle.fill" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
          </TouchableOpacity>
          <ThemedText style={styles.modalTitle}>Update Quotation Status</ThemedText>
          {currentStatus && (
            <ThemedText style={styles.currentStatusText}>Current Status: {currentStatus}</ThemedText>
          )}
          <View style={styles.statusOptionsContainer}>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOptionButton,
                  { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground },
                  currentStatus === status && styles.selectedStatusOptionButton,
                ]}
                onPress={() => onSelectStatus(status)}
              >
                <Text style={[
                  styles.statusOptionText,
                  { color: isDark ? Colors.dark.text : Colors.light.text },
                  currentStatus === status && styles.selectedStatusOptionText,
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width * 0.8, // 80% of screen width
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  currentStatusText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOptionsContainer: {
    width: '100%',
  },
  statusOptionButton: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedStatusOptionButton: {
    borderWidth: 2,
    borderColor: Colors.light.tint, // Or a specific color for selected
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedStatusOptionText: {
    fontWeight: 'bold',
    color: Colors.light.tint, // Or a specific color for selected
  },
});
