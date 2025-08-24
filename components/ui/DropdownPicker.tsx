import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface DropdownPickerProps<T> {
  isVisible: boolean;
  onClose: () => void;
  options: T[];
  selectedValues: string[]; // Array of IDs for selected items
  onSelect: (item: T) => void;
  keyExtractor: (item: T) => string;
  renderItem: (item: T, isSelected: boolean) => React.ReactElement;
  title: string;
  multiSelect?: boolean;
}

export function DropdownPicker<T extends { id: string }>(props: DropdownPickerProps<T>) {
  const {
    isVisible,
    onClose,
    options,
    selectedValues,
    onSelect,
    keyExtractor,
    renderItem,
    title,
    multiSelect = false,
  } = props;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContent}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => {
              const isSelected = selectedValues.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, isSelected && styles.selectedPickerItem]}
                  onPress={() => onSelect(item)}
                >
                  {renderItem(item, isSelected)}
                  {isSelected && <AntDesign name="checkcircle" size={20} color="#007bff" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No items available</Text>}
          />
          <TouchableOpacity
            style={styles.pickerCancelButton}
            onPress={onClose}
          >
            <Text style={styles.pickerCancelText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2c3e50',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedPickerItem: {
    backgroundColor: '#e8f4fd',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  emptyText: {
    textAlign: 'center',
    color: "#95a5a6",
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  pickerCancelButton: {
    marginTop: 16,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
