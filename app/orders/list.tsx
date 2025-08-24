import { PurchasedOrder, RawMaterial, Vendor } from '@/types/db';
import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { DropdownPicker } from '../../components/ui/DropdownPicker'; // Import the new DropdownPicker
import { supabase } from '../../utils/supabaseClient';

interface ExtendedRawMaterial extends RawMaterial {
  order_quantity: number;
  order_unit_type: string;
}

export default function OrdersScreen() {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<PurchasedOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  
  // Vendor selection state
  const [vendorSelectionMode, setVendorSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingVendor, setSelectedExistingVendor] = useState<string | null>(null);
  const [isVendorDropdownVisible, setVendorDropdownVisible] = useState(false); // New state for vendor dropdown
  const [newVendorForm, setNewVendorForm] = useState({
    name: "",
    contact: "",
    address: ""
  });
  
  // Material selection state
  const [selectedRawMaterials, setSelectedRawMaterials] = useState<ExtendedRawMaterial[]>([]);
  const [isRawMaterialDropdownVisible, setRawMaterialDropdownVisible] = useState(false); // New state for raw material dropdown
  const [isUnitTypePickerVisible, setUnitTypePickerVisible] = useState(false);
  const [currentMaterialForUnitType, setCurrentMaterialForUnitType] = useState<ExtendedRawMaterial | null>(null);

  const predefinedUnitTypes = ['pcs', 'kg', 'meter', 'liter', 'unit', 'sq.ft', 'm²'];

  // Computed values
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedVendor = vendors.find(v => v.id === selectedExistingVendor);

  // Data fetching functions
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vendorsResult, ordersResult, materialsResult] = await Promise.all([
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('purchased_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('raw_materials').select('*').order('created_at', { ascending: false })
      ]);

      if (vendorsResult.error) throw vendorsResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (materialsResult.error) throw materialsResult.error;

      setVendors(vendorsResult.data || []);
      setOrders(ordersResult.data || []);
      setRawMaterials(materialsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Modal management
  const openModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const resetForm = () => {
    setVendorSelectionMode('existing');
    setSelectedExistingVendor(null);
    setNewVendorForm({ name: "", contact: "", address: "" });
    setSelectedRawMaterials([]);
  };

  // Vendor management
  const updateNewVendorForm = (field: keyof typeof newVendorForm, value: string) => {
    setNewVendorForm(prev => ({ ...prev, [field]: value }));
  };

  const createNewVendor = async (): Promise<string | null> => {
    const { name, contact, address } = newVendorForm;

    // Basic validation for name
    if (!name.trim()) {
      Alert.alert("Validation Error", "Vendor Name cannot be empty.");
      return null;
    }

    // Basic validation for contact (email or phone number)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9]{7,10}$/; // Simple regex for 7-15 digit phone numbers, optional +
    if (!contact.trim()) {
      Alert.alert("Validation Error", "Contact information cannot be empty.");
      return null;
    }
    if (!emailRegex.test(contact.trim()) && !phoneRegex.test(contact.trim())) {
      Alert.alert("Validation Error", "Please enter a valid email or phone number for contact.");
      return null;
    }

    // Basic validation for address
    if (!address.trim()) {
      Alert.alert("Validation Error", "Address cannot be empty.");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ name: name.trim(), contact: contact.trim(), address: address.trim() }])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to retrieve new vendor ID");

      return data[0].id;
    } catch (error) {
      console.error("Error creating vendor:", error);
      Alert.alert("Error", "Failed to create new vendor.");
      return null;
    }
  };

  // Material management
  const toggleRawMaterialSelection = (material: RawMaterial) => {
    setSelectedRawMaterials(prev => {
      const exists = prev.find(m => m.id === material.id);
      if (exists) {
        return prev.filter(m => m.id !== material.id);
      } else {
        return [...prev, {
          ...material,
          order_quantity: 1,
          order_unit_type: material.unit_type || 'unit'
        }];
      }
    });
  };

  const updateMaterialProperty = (materialId: string, property: 'order_quantity' | 'order_unit_type', value: any) => {
    setSelectedRawMaterials(prev =>
      prev.map(material =>
        material.id === materialId
          ? { ...material, [property]: property === 'order_quantity' ? Number(value) || 1 : value }
          : material
      )
    );
  };

  const removeMaterialFromSelection = (materialId: string) => {
    setSelectedRawMaterials(prev => prev.filter(m => m.id !== materialId));
  };

  // Order submission
  const validateOrderForm = (): boolean => {
    if (vendorSelectionMode === 'existing' && !selectedExistingVendor) {
      Alert.alert("Validation Error", "Please select a vendor.");
      return false;
    }

    if (vendorSelectionMode === 'new') {
      const { name, contact, address } = newVendorForm;
      if (!name.trim() || !contact.trim() || !address.trim()) {
        Alert.alert("Validation Error", "Please fill all vendor details.");
        return false;
      }
    }

    if (selectedRawMaterials.length === 0) {
      Alert.alert("Validation Error", "Please select at least one raw material.");
      return false;
    }

    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateOrderForm()) return;

    setIsLoading(true);
    try {
      let vendorIdToUse: string;

      if (vendorSelectionMode === 'new') {
        const newVendorId = await createNewVendor();
        if (!newVendorId) return;
        vendorIdToUse = newVendorId;
      } else {
        // validateOrderForm ensures selectedExistingVendor is not null here
        vendorIdToUse = selectedExistingVendor!;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('purchased_orders')
        .insert([{
          vendor_id: vendorIdToUse!,
          raw_materials: selectedRawMaterials,
        }])
        .select();

      if (orderError) throw orderError;

      // The newly created order is in order[0]
      await shareOrderViaWhatsApp(order[0]);
      
      Alert.alert("Success", "Order created successfully!");
      fetchData(); // Refresh data
      closeModal();
      
    } catch (error) {
      console.error("Error submitting order:", error);
      Alert.alert("Error", "Failed to create order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shareOrderViaWhatsApp = async (order: PurchasedOrder) => {
    const vendor = vendors.find(v => v.id === order.vendor_id);
    if (!vendor || !vendor.contact) {
      Alert.alert("Error", "Vendor contact information not available for this order.");
      return;
    }

    const materialDetails = order.raw_materials
      ?.map(m => `${m.name} (${m.order_quantity} ${m.order_unit_type})`)
      .join(', ') || 'No materials listed.';
    
    const whatsappMessage = `Order Details (Order ID: ${order.id.slice(-8)}):\n\nVendor: ${vendor.name}\nMaterials: ${materialDetails}\nDate: ${new Date(order.created_at).toLocaleDateString()}`;
    const whatsappUrl = `whatsapp://send?phone=${vendor.contact}&text=${encodeURIComponent(whatsappMessage)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert("Info", "WhatsApp is not available on this device.");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      Alert.alert("Error", "Failed to open WhatsApp. Please ensure it is installed.");
    }
  };

  // Render functions
  const renderOrderItem = ({ item }: { item: PurchasedOrder }) => {
    const vendor = vendors.find(v => v.id === item.vendor_id);
    const materialCount = item.raw_materials?.length || 0;
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.itemTitle}>Order #{item.id.slice(-8)}</Text>
          <View style={styles.orderActions}>
            <Text style={styles.badge}>{materialCount} items</Text>
            <TouchableOpacity onPress={() => shareOrderViaWhatsApp(item)} style={styles.shareButton}>
              <AntDesign name="sharealt" size={20} color="#007bff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.itemSubtext}>🏢 {vendor?.name || 'Unknown Vendor'}</Text>
        <Text style={styles.itemSubtext}>
          📅 {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.raw_materials && item.raw_materials.length > 0 && (
          <Text style={styles.itemSubtext} numberOfLines={2}>
            📦 {item.raw_materials.map(m => `${m.name} (${m.order_quantity} ${m.order_unit_type})`).join(', ')}
          </Text>
        )}
      </View>
    );
  };

  const renderSelectedMaterial = (material: ExtendedRawMaterial) => (
    <View key={material.id} style={styles.selectedMaterialTag}>
      <Text style={styles.selectedMaterialName}>{material.name}</Text>
      
      <View style={styles.quantityContainer}>
        <TextInput
          style={styles.quantityInput}
          value={String(material.order_quantity)}
          onChangeText={(text) => updateMaterialProperty(material.id, 'order_quantity', text)}
          keyboardType="numeric"
          selectTextOnFocus
        />
        
        <TouchableOpacity
          style={styles.unitTypeButton}
          onPress={() => {
            setCurrentMaterialForUnitType(material);
            setUnitTypePickerVisible(true);
          }}
        >
          <Text style={styles.unitTypeText}>{material.order_unit_type}</Text>
          <AntDesign name="caretdown" size={10} color="#666" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        onPress={() => removeMaterialFromSelection(material.id)}
        style={styles.removeButton}
      >
        <AntDesign name="close" size={16} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading && vendors.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search vendors..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendors Section */}
        <Text style={styles.sectionTitle}>Vendors ({filteredVendors.length})</Text>
        <FlatList
          data={filteredVendors}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.name}</Text>
              </View>
              <Text style={styles.itemSubtext}>📞 {item.contact}</Text>
              <Text style={styles.itemSubtext} numberOfLines={2}>📍 {item.address}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vendors found</Text>
          }
        />

        {/* Orders Section */}
        <Text style={styles.sectionTitle}>Recent Orders ({orders.length})</Text>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.verticalList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No orders found</Text>
          }
        />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Order Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.backButton}>
              <AntDesign name="arrowleft" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Order</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Vendor Selection Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, vendorSelectionMode === 'existing' && styles.toggleButtonActive]}
                onPress={() => setVendorSelectionMode('existing')}
              >
                <Text style={[styles.toggleButtonText, vendorSelectionMode === 'existing' && styles.toggleButtonTextActive]}>
                  Select Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, vendorSelectionMode === 'new' && styles.toggleButtonActive]}
                onPress={() => setVendorSelectionMode('new')}
              >
                <Text style={[styles.toggleButtonText, vendorSelectionMode === 'new' && styles.toggleButtonTextActive]}>
                  Create New
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vendor Selection Content */}
            {vendorSelectionMode === 'existing' ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Vendor</Text>
                <TouchableOpacity style={styles.dropdownButton} onPress={() => setVendorDropdownVisible(true)}>
                  <Text style={styles.dropdownButtonText}>
                    {selectedVendor ? selectedVendor.name : "Choose a vendor"}
                  </Text>
                  <AntDesign name="caretdown" size={12} color="#666" />
                </TouchableOpacity>
                
                {selectedVendor && (
                  <View style={styles.selectedVendorPreview}>
                    <Text style={styles.previewTitle}>Selected Vendor:</Text>
                    <Text style={styles.previewText}>{selectedVendor.name}</Text>
                    <Text style={styles.previewSubtext}>{selectedVendor.contact}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>New Vendor Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vendor Name"
                  value={newVendorForm.name}
                  onChangeText={(text) => updateNewVendorForm('name', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contact (Phone/Email)"
                  value={newVendorForm.contact}
                  onChangeText={(text) => updateNewVendorForm('contact', text)}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Address"
                  value={newVendorForm.address}
                  onChangeText={(text) => updateNewVendorForm('address', text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {/* Raw Materials Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Materials</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setRawMaterialDropdownVisible(true)}>
                <Text style={styles.dropdownButtonText}>
                  {selectedRawMaterials.length > 0 ? `${selectedRawMaterials.length} materials selected` : "Choose raw materials"}
                </Text>
                <AntDesign name="caretdown" size={12} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Selected Materials */}
            {selectedRawMaterials.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Selected Materials ({selectedRawMaterials.length})</Text>
                <View style={styles.selectedMaterialsContainer}>
                  {selectedRawMaterials.map(renderSelectedMaterial)}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
              onPress={handleSubmitOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Create Order & Send WhatsApp</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vendor Dropdown Picker */}
      <DropdownPicker
        isVisible={isVendorDropdownVisible}
        onClose={() => setVendorDropdownVisible(false)}
        options={vendors}
        selectedValues={selectedExistingVendor ? [selectedExistingVendor] : []}
        onSelect={(vendor) => {
          setSelectedExistingVendor(vendor.id);
          setVendorDropdownVisible(false);
        }}
        keyExtractor={(item) => item.id}
        renderItem={(item, isSelected) => (
          <View style={styles.dropdownItemContent}>
            <Text style={styles.pickerItemText}>{item.name}</Text>
            {isSelected && <AntDesign name="checkcircle" size={20} color="#007bff" />}
          </View>
        )}
        title="Select Vendor"
        multiSelect={false}
      />

      {/* Raw Material Dropdown Picker */}
      <DropdownPicker
        isVisible={isRawMaterialDropdownVisible}
        onClose={() => setRawMaterialDropdownVisible(false)}
        options={rawMaterials}
        selectedValues={selectedRawMaterials.map(m => m.id)}
        onSelect={(material) => toggleRawMaterialSelection(material)}
        keyExtractor={(item) => item.id}
        renderItem={(item, isSelected) => (
          <View style={styles.dropdownItemContent}>
            <Text style={styles.pickerItemText}>{item.name} ({item.unit_type})</Text>
            {isSelected && <AntDesign name="checkcircle" size={20} color="#007bff" />}
          </View>
        )}
        title="Select Raw Materials"
        multiSelect={true}
      />

      {/* Unit Type Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isUnitTypePickerVisible}
        onRequestClose={() => setUnitTypePickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Select Unit Type</Text>
            <FlatList
              data={predefinedUnitTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    if (currentMaterialForUnitType) {
                      updateMaterialProperty(currentMaterialForUnitType.id, 'order_unit_type', item);
                    }
                    setUnitTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerCancelButton}
              onPress={() => setUnitTypePickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    height: 44,
    borderColor: "#e1e5e9",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 12,
    color: "#2c3e50",
  },
  horizontalList: {
    paddingBottom: 8,
  },
  verticalList: {
    paddingBottom: 16,
  },
  itemCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 12,
    minWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  selectedItem: {
    borderColor: "#007bff",
    borderWidth: 2,
    backgroundColor: "#f8f9ff",
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    marginLeft: 10,
    padding: 5,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
  },
  itemSubtext: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
    lineHeight: 20,
  },
  badge: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "500",
    color: "#495057",
  },
  emptyText: {
    textAlign: 'center',
    color: "#95a5a6",
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007bff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 16,
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },
  input: {
    height: 48,
    borderColor: '#e1e5e9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  vendorList: {
    paddingBottom: 8,
  },
  selectedVendorPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#155724',
  },
  previewSubtext: {
    fontSize: 14,
    color: '#155724',
    opacity: 0.8,
  },
  materialsList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingVertical: 8,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedMaterialItem: {
    backgroundColor: '#e8f4fd',
  },
  materialInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginRight: 8,
  },
  materialUnit: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedMaterialsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedMaterialTag: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedMaterialName: {
    color: 'white',
    fontWeight: '500',
    marginRight: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quantityInput: {
    backgroundColor: 'white',
    color: 'black',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    width: 50,
    textAlign: 'center',
    marginRight: 4,
    fontSize: 14,
  },
  unitTypeButton: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  unitTypeText: {
    color: 'black',
    fontSize: 12,
    marginRight: 4,
  },
  removeButton: {
    padding: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  pickerItemText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#2c3e50',
  },
  pickerCancelButton: {
    marginTop: 16,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderColor: '#e1e5e9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
