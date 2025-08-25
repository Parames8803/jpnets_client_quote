import { PurchasedOrder, RawMaterial, Vendor } from '@/types/db';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { DropdownPicker } from '../../components/ui/DropdownPicker';
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
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  
  // Vendor selection state
  const [vendorSelectionMode, setVendorSelectionMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingVendor, setSelectedExistingVendor] = useState<string | null>(null);
  const [isVendorDropdownVisible, setVendorDropdownVisible] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: "",
    contact: "",
    address: ""
  });
  
  // Material selection state
  const [selectedRawMaterials, setSelectedRawMaterials] = useState<ExtendedRawMaterial[]>([]);
  const [isRawMaterialDropdownVisible, setRawMaterialDropdownVisible] = useState(false);
  const [isUnitTypePickerVisible, setUnitTypePickerVisible] = useState(false);
  const [currentMaterialForUnitType, setCurrentMaterialForUnitType] = useState<ExtendedRawMaterial | null>(null);

  const predefinedUnitTypes = ['pcs', 'kg', 'meter', 'liter', 'unit', 'sq.ft', 'm²'];

  // Computed values
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOrders = orders.filter(order => {
    const vendor = vendors.find(v => v.id === order.vendor_id);
    return vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           order.id.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const selectedVendor = vendors.find(v => v.id === selectedExistingVendor);

  // Data fetching functions
  const fetchData = useCallback(async () => {
    if (isConnected === false) {
      Alert.alert("No Internet Connection", "Please check your network and try again.");
      return;
    }

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
    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (error.message && error.message.includes("Network request failed")) {
        Alert.alert("Network Error", "Could not connect to the server. Please check your internet connection.");
      } else {
        Alert.alert("Error", "Failed to load data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

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

    if (!name.trim()) {
      Alert.alert("Validation Error", "Vendor Name cannot be empty.");
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9]{7,10}$/;
    if (!contact.trim()) {
      Alert.alert("Validation Error", "Contact information cannot be empty.");
      return null;
    }
    if (!emailRegex.test(contact.trim()) && !phoneRegex.test(contact.trim())) {
      Alert.alert("Validation Error", "Please enter a valid email or phone number for contact.");
      return null;
    }

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
        vendorIdToUse = selectedExistingVendor!;
      }

      const { data: order, error: orderError } = await supabase
        .from('purchased_orders')
        .insert([{
          vendor_id: vendorIdToUse!,
          raw_materials: selectedRawMaterials,
        }])
        .select();

      if (orderError) throw orderError;

      await shareOrderViaWhatsApp(order[0]);
      
      Alert.alert("Success", "Order created successfully!");
      fetchData();
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
  const renderVendorCard = ({ item }: { item: Vendor }) => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <View style={styles.vendorIcon}>
          <MaterialIcons name="business" size={20} color="#007bff" />
        </View>
        <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={styles.vendorInfo}>
        <View style={styles.infoRow}>
          <Feather name="phone" size={14} color="#666" />
          <Text style={styles.infoText}>{item.contact}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={14} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>{item.address}</Text>
        </View>
      </View>
    </View>
  );

  const renderOrderCard = ({ item }: { item: PurchasedOrder }) => {
    const vendor = vendors.find(v => v.id === item.vendor_id);
    const materialCount = item.raw_materials?.length || 0;
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>ORDER</Text>
            <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => shareOrderViaWhatsApp(item)} 
            style={styles.whatsappButton}
          >
            <MaterialIcons name="share" size={18} color="#25D366" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.orderContent}>
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="business" size={16} color="#666" />
            <Text style={styles.orderVendor}>{vendor?.name || 'Unknown Vendor'}</Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="inventory" size={16} color="#666" />
            <Text style={styles.orderMaterials}>{materialCount} items</Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="schedule" size={16} color="#666" />
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {item.raw_materials && item.raw_materials.length > 0 && (
          <View style={styles.materialsPreview}>
            <Text style={styles.materialsPreviewText} numberOfLines={2}>
              {item.raw_materials.map(m => `${m.name} (${m.order_quantity} ${m.order_unit_type})`).join(', ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSelectedMaterial = (material: ExtendedRawMaterial) => (
    <View key={material.id} style={styles.selectedMaterialChip}>
      <View style={styles.materialInfo}>
        <Text style={styles.materialName}>{material.name}</Text>
        <View style={styles.quantityControls}>
          <TextInput
            style={styles.quantityInput}
            value={String(material.order_quantity)}
            onChangeText={(text) => updateMaterialProperty(material.id, 'order_quantity', text)}
            keyboardType="numeric"
            selectTextOnFocus
          />
          
          <TouchableOpacity
            style={styles.unitSelector}
            onPress={() => {
              setCurrentMaterialForUnitType(material);
              setUnitTypePickerVisible(true);
            }}
          >
            <Text style={styles.unitText}>{material.order_unit_type}</Text>
            <AntDesign name="caretdown" size={10} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        onPress={() => removeMaterialFromSelection(material.id)}
        style={styles.removeChipButton}
      >
        <AntDesign name="close" size={14} color="#ff4757" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading && vendors.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerStats}>
          <Text style={styles.statText}>{orders.length} orders</Text>
          <Text style={styles.statDivider}>•</Text>
          <Text style={styles.statText}>{vendors.length} vendors</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders, vendors..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <AntDesign name="close" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Vendors Section */}
        {filteredVendors.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Vendors</Text>
              <Text style={styles.sectionCount}>{filteredVendors.length}</Text>
            </View>
            <FlatList
              data={filteredVendors.slice(0, 5)}
              renderItem={renderVendorCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vendorsList}
            />
          </>
        )}

        {/* Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Text style={styles.sectionCount}>{filteredOrders.length}</Text>
        </View>
        
        {filteredOrders.length > 0 ? (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.ordersList}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color="#ddd" />
            <Text style={styles.emptyStateTitle}>No Orders Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? "Try adjusting your search terms" : "Create your first order to get started"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Create Order Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.modalBackButton}>
              <AntDesign name="arrowleft" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Order</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Vendor Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Select Vendor</Text>
              
              {/* Toggle Buttons */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, vendorSelectionMode === 'existing' && styles.toggleBtnActive]}
                  onPress={() => setVendorSelectionMode('existing')}
                >
                  <MaterialIcons name="business" size={20} color={vendorSelectionMode === 'existing' ? '#fff' : '#007bff'} />
                  <Text style={[styles.toggleBtnText, vendorSelectionMode === 'existing' && styles.toggleBtnTextActive]}>
                    Existing
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, vendorSelectionMode === 'new' && styles.toggleBtnActive]}
                  onPress={() => setVendorSelectionMode('new')}
                >
                  <MaterialIcons name="add-business" size={20} color={vendorSelectionMode === 'new' ? '#fff' : '#007bff'} />
                  <Text style={[styles.toggleBtnText, vendorSelectionMode === 'new' && styles.toggleBtnTextActive]}>
                    New
                  </Text>
                </TouchableOpacity>
              </View>

              {vendorSelectionMode === 'existing' ? (
                <View style={styles.vendorSelection}>
                  <TouchableOpacity 
                    style={styles.selectorButton} 
                    onPress={() => setVendorDropdownVisible(true)}
                  >
                    <MaterialIcons name="business" size={20} color="#666" />
                    <Text style={[styles.selectorText, selectedVendor && styles.selectorTextSelected]}>
                      {selectedVendor ? selectedVendor.name : "Choose vendor"}
                    </Text>
                    <AntDesign name="down" size={16} color="#666" />
                  </TouchableOpacity>
                  
                  {selectedVendor && (
                    <View style={styles.selectedVendorCard}>
                      <View style={styles.selectedVendorInfo}>
                        <Text style={styles.selectedVendorName}>{selectedVendor.name}</Text>
                        <Text style={styles.selectedVendorContact}>{selectedVendor.contact}</Text>
                      </View>
                      <MaterialIcons name="check-circle" size={24} color="#28a745" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.newVendorForm}>
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="business" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Vendor name"
                      value={newVendorForm.name}
                      onChangeText={(text) => updateNewVendorForm('name', text)}
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="phone" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Contact (phone/email)"
                      value={newVendorForm.contact}
                      onChangeText={(text) => updateNewVendorForm('contact', text)}
                      keyboardType="phone-pad"
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <MaterialIcons name="location-on" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modalInput, styles.textAreaInput]}
                      placeholder="Business address"
                      value={newVendorForm.address}
                      onChangeText={(text) => updateNewVendorForm('address', text)}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Materials Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Select Materials</Text>
              
              <TouchableOpacity 
                style={styles.selectorButton} 
                onPress={() => setRawMaterialDropdownVisible(true)}
              >
                <MaterialIcons name="inventory" size={20} color="#666" />
                <Text style={[styles.selectorText, selectedRawMaterials.length > 0 && styles.selectorTextSelected]}>
                  {selectedRawMaterials.length > 0 
                    ? `${selectedRawMaterials.length} materials selected` 
                    : "Choose materials"}
                </Text>
                <AntDesign name="down" size={16} color="#666" />
              </TouchableOpacity>

              {selectedRawMaterials.length > 0 && (
                <View style={styles.selectedMaterialsSection}>
                  <Text style={styles.selectedMaterialsTitle}>
                    Selected Materials ({selectedRawMaterials.length})
                  </Text>
                  <View style={styles.selectedMaterialsGrid}>
                    {selectedRawMaterials.map(renderSelectedMaterial)}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.createOrderButton, isLoading && styles.createOrderButtonDisabled]} 
              onPress={handleSubmitOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="white" />
                  <Text style={styles.createOrderButtonText}>Create & Send Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dropdowns and Pickers */}
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
          <View style={styles.dropdownItem}>
            <View style={styles.dropdownItemInfo}>
              <Text style={styles.dropdownItemName}>{item.name}</Text>
              <Text style={styles.dropdownItemContact}>{item.contact}</Text>
            </View>
            {isSelected && <MaterialIcons name="check" size={20} color="#007bff" />}
          </View>
        )}
        title="Select Vendor"
        multiSelect={false}
      />

      <DropdownPicker
        isVisible={isRawMaterialDropdownVisible}
        onClose={() => setRawMaterialDropdownVisible(false)}
        options={rawMaterials}
        selectedValues={selectedRawMaterials.map(m => m.id)}
        onSelect={(material) => toggleRawMaterialSelection(material)}
        keyExtractor={(item) => item.id}
        renderItem={(item, isSelected) => (
          <View style={styles.dropdownItem}>
            <View style={styles.dropdownItemInfo}>
              <Text style={styles.dropdownItemName}>{item.name}</Text>
              <Text style={styles.dropdownItemContact}>Unit: {item.unit_type}</Text>
            </View>
            {isSelected && <MaterialIcons name="check" size={20} color="#007bff" />}
          </View>
        )}
        title="Select Materials"
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
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Unit Type</Text>
            <FlatList
              data={predefinedUnitTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerModalItem}
                  onPress={() => {
                    if (currentMaterialForUnitType) {
                      updateMaterialProperty(currentMaterialForUnitType.id, 'order_unit_type', item);
                    }
                    setUnitTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerModalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerModalCancel}
              onPress={() => setUnitTypePickerVisible(false)}
            >
              <Text style={styles.pickerModalCancelText}>Cancel</Text>
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
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    marginHorizontal: 8,
    color: '#cbd5e1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
  vendorsList: {
    paddingBottom: 8,
    marginBottom: 32,
  },
  vendorCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 240,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  vendorInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  ordersList: {
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  whatsappButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderContent: {
    gap: 8,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderVendor: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  orderMaterials: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  materialsPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  materialsPreviewText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#3b82f6',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  vendorSelection: {
    gap: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: '#94a3b8',
  },
  selectorTextSelected: {
    color: '#1e293b',
    fontWeight: '500',
  },
  selectedVendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedVendorInfo: {
    flex: 1,
  },
  selectedVendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  selectedVendorContact: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 2,
  },
  newVendorForm: {
    gap: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    paddingVertical: 12,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  selectedMaterialsSection: {
    marginTop: 16,
  },
  selectedMaterialsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
  },
  selectedMaterialsGrid: {
    gap: 12,
  },
  selectedMaterialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  unitText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  removeChipButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  createOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  createOrderButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  createOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  dropdownItemContact: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerModalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerModalItemText: {
    fontSize: 15,
    color: '#1e293b',
    textAlign: 'center',
  },
  pickerModalCancel: {
    marginTop: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerModalCancelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
