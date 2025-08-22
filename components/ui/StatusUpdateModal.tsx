import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuotationStatus, RoomStatus } from '@/types/db';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StatusUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (status: QuotationStatus | RoomStatus) => Promise<void>;
  currentStatus: string | null;
  statusOptions: (QuotationStatus | RoomStatus)[];
  colors: any; // Themed styles colors
}

const { width } = Dimensions.get('window');

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  visible,
  onClose,
  onUpdate,
  currentStatus,
  statusOptions,
  colors,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.cardBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol name="xmark.circle.fill" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Update Status</ThemedText>
          {currentStatus && (
            <ThemedText style={[styles.currentStatusText, { color: colors.subtext }]}>Current Status: {currentStatus}</ThemedText>
          )}
          <View style={styles.statusOptionsContainer}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOptionButton,
                  currentStatus === status && { borderColor: colors.tint, borderWidth: 2 },
                ]}
                onPress={() => onUpdate(status as QuotationStatus | RoomStatus)}
              >
                <Text style={[
                  styles.statusOptionText,
                  { color: colors.text },
                  currentStatus === status && { color: "white", fontWeight: 'bold' },
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
    backgroundColor: "#3182CE"
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
