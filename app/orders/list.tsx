import { PurchasedOrder, RawMaterial, Vendor } from '@/types/db';
import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from '../../utils/supabaseClient'; // Import Supabase client

export default function OrdersScreen() { // Keeping OrdersScreen name as per file path, but content is for vendors
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [vendorSelectionMode, setVendorSelectionMode] = useState<'existing' | 'new'>('existing'); // 'existing' or 'new'
  const [selectedExistingVendor, setSelectedExistingVendor] = useState<string | undefined>(undefined);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [selectedRawMaterials, setSelectedRawMaterials] = useState<Array<RawMaterial & { order_quantity: number; order_unit_type: string }>>([]);
  const [orders, setOrders] = useState<PurchasedOrder[]>([]); // State to store fetched orders
  const [vendors, setVendors] = useState<Vendor[]>([]); // State to store fetched vendors
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]); // State to store fetched raw materials
  const [isUnitTypePickerVisible, setUnitTypePickerVisible] = useState(false);
  const [currentMaterialForUnitType, setCurrentMaterialForUnitType] = useState<RawMaterial & { order_quantity: number; order_unit_type: string } | null>(null);

  const predefinedUnitTypes = ['pcs', 'kg', 'meter', 'liter', 'unit', 'sq.ft', 'm²'];

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchVendors = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching vendors:", error);
    } else {
      setVendors(data || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVendors();
    }, [fetchVendors])
  );

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchased_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const fetchRawMaterials = useCallback(async () => {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching raw materials:", error);
    } else {
      setRawMaterials(data || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRawMaterials();
    }, [fetchRawMaterials])
  );

  const openModal = () => {
    setVendorSelectionMode('existing'); // Reset to existing when opening modal
    setSelectedExistingVendor(undefined);
    setNewVendorName("");
    setNewVendorContact("");
    setNewVendorAddress("");
    setSelectedRawMaterials([]); // Reset selected raw materials
    setModalVisible(true);
  };
  const closeModal = () => setModalVisible(false);

  const toggleRawMaterialSelection = (material: RawMaterial) => {
    setSelectedRawMaterials(prev => {
      if (prev.some(m => m.id === material.id)) {
        return prev.filter(m => m.id !== material.id);
      } else {
        return [...prev, { ...material, order_quantity: 1, order_unit_type: material.unit_type || 'unit' }];
      }
    });
  };

  const updateRawMaterialDetails = (materialId: string, key: 'order_quantity' | 'order_unit_type', value: any) => {
    setSelectedRawMaterials(prev =>
      prev.map(m =>
        m.id === materialId
          ? { ...m, [key]: value }
          : m
      )
    );
  };

  const handleSubmitOrder = async () => {
    let vendorIdToUse: string | undefined = selectedExistingVendor;

    if (vendorSelectionMode === 'new') {
      if (!newVendorName || !newVendorContact || !newVendorAddress) {
        alert("Please fill all new vendor details.");
        return;
      }
      // Create new vendor in Supabase
      const { data: newVendor, error: vendorError } = await supabase
        .from('vendors')
        .insert([{
          name: newVendorName,
          contact: newVendorContact, // Use 'contact' as per types/db.ts
          address: newVendorAddress,
        }])
        .select();

      if (vendorError) {
        console.error("Error creating new vendor:", vendorError);
        alert("Failed to create new vendor.");
        return;
      }
      if (newVendor && newVendor.length > 0) {
        vendorIdToUse = newVendor[0].id;
      } else {
        alert("Failed to retrieve new vendor ID.");
        return;
      }
    }

    if (!vendorIdToUse) {
      alert("No vendor selected or created.");
      return;
    }

    if (selectedRawMaterials.length === 0) {
      alert("Please select at least one raw material.");
      return;
    }

    // Create order record in Supabase
    const { data: order, error: orderError } = await supabase
      .from('purchased_orders')
      .insert([{
        vendor_id: vendorIdToUse,
        raw_materials: selectedRawMaterials, // Store as JSON array
        // Add other order-related fields as needed
      }])
      .select();

    if (orderError) {
      console.error("Error creating order:", orderError);
      alert("Failed to create order.");
      return;
    }

    // Find the vendor details for the WhatsApp message
    const vendor = vendors.find(v => v.id === vendorIdToUse);
    if (!vendor) {
      console.error("Vendor not found for WhatsApp sharing.");
      alert("Order created successfully, but failed to find vendor for WhatsApp sharing.");
      fetchOrders();
      closeModal();
      return;
    }

    // Construct the WhatsApp message with quantities and unit types
    const materialDetails = selectedRawMaterials.map(m => `${m.name} (${m.order_quantity} ${m.order_unit_type})`).join(', ');
    const whatsappMessage = `New Order Details:\n\nVendor: ${vendor.name}\nMaterials: ${materialDetails}`;
    const whatsappUrl = `whatsapp://send?phone=${vendor.contact}&text=${encodeURIComponent(whatsappMessage)}`;

    // Open WhatsApp chat
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        alert("Order created successfully and WhatsApp chat opened!");
      } else {
        alert("Order created successfully, but WhatsApp is not installed or cannot be opened.");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      alert("Order created successfully, but an error occurred while opening WhatsApp.");
    }

    fetchOrders(); // Refresh orders list after successful creation
    closeModal();
  };

  const isRawMaterialSelected = (material: RawMaterial) => {
    return selectedRawMaterials.some(m => m.id === material.id);
  };

  const renderVendorItem = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={[styles.vendorItem, selectedExistingVendor === item.id && styles.selectedVendorItem]}
      onPress={() => setSelectedExistingVendor(item.id)}
    >
      <Text style={styles.vendorName}>{item.name}</Text>
      <Text>Contact: {item.contact}</Text>
      <Text>Address: {item.address}</Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }: { item: PurchasedOrder }) => (
    <View style={styles.orderItem}>
      <Text style={styles.orderTitle}>Order ID: {item.id}</Text>
      <Text>Vendor ID: {item.vendor_id}</Text>
      <Text>Materials: {item.raw_materials?.map(m => `${m.name} (${m.order_quantity} ${m.order_unit_type})`).join(', ') || 'N/A'}</Text>
      <Text>Created: {new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search vendors..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredVendors}
        renderItem={renderVendorItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Vendors</Text>}
      />

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text>No orders found.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <AntDesign name="plus" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vendor Selection</Text>

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, vendorSelectionMode === 'existing' && styles.toggleButtonActive]}
                onPress={() => setVendorSelectionMode('existing')}
              >
                <Text style={[styles.toggleButtonText, vendorSelectionMode === 'existing' && styles.toggleButtonTextActive]}>Select Existing Vendor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, vendorSelectionMode === 'new' && styles.toggleButtonActive]}
                onPress={() => setVendorSelectionMode('new')}
              >
                <Text style={[styles.toggleButtonText, vendorSelectionMode === 'new' && styles.toggleButtonTextActive]}>Create New Vendor</Text>
              </TouchableOpacity>
            </View>

            {vendorSelectionMode === 'existing' ? (
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Select an Existing Vendor</Text>
                <FlatList
                  data={vendors} // Use fetched vendors
                  renderItem={renderVendorItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.vendorListInModal}
                  ListEmptyComponent={<Text>No vendors available.</Text>}
                />
                {selectedExistingVendor && (
                  <View style={styles.selectedVendorDetails}>
                    <Text style={styles.selectedVendorTitle}>Selected Vendor Details:</Text>
                    <Text>Name: {vendors.find(v => v.id === selectedExistingVendor)?.name}</Text>
                    <Text>Contact: {vendors.find(v => v.id === selectedExistingVendor)?.contact}</Text>
                    <Text>Address: {vendors.find(v => v.id === selectedExistingVendor)?.address}</Text>
                  </View>
                )}
              </View>
            ) : (
              <ScrollView style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Create New Vendor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vendor Name"
                  value={newVendorName}
                  onChangeText={setNewVendorName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contact Person (Phone/Email)"
                  value={newVendorContact}
                  onChangeText={setNewVendorContact}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Address"
                  value={newVendorAddress}
                  onChangeText={setNewVendorAddress}
                  multiline
                />
              </ScrollView>
            )}

            <View style={styles.rawMaterialsSection}>
              <Text style={styles.sectionTitle}>Select Raw Materials</Text>
              <ScrollView style={styles.rawMaterialList}>
                {rawMaterials.map(material => (
                  <TouchableOpacity
                    key={material.id}
                    style={[
                      styles.rawMaterialItem,
                      isRawMaterialSelected(material) && styles.selectedRawMaterialItem,
                    ]}
                    onPress={() => toggleRawMaterialSelection(material)}
                  >
                    <Text style={styles.rawMaterialText}>{material.name} ({material.unit_type})</Text>
                    {isRawMaterialSelected(material) && (
                      <AntDesign name="checkcircle" size={20} color="#007bff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedRawMaterials.length > 0 && (
                <View style={styles.selectedRawMaterialsContainer}>
                  <Text style={styles.selectedRawMaterialsTitle}>Selected Materials:</Text>
                  {selectedRawMaterials.map(material => (
                    <View key={material.id} style={styles.selectedRawMaterialTag}>
                      <Text style={{ color: 'white' }}>{material.name}</Text>
                      <TextInput
                        style={styles.quantityInput}
                        value={String(material.order_quantity)}
                        onChangeText={(text) => updateRawMaterialDetails(material.id, 'order_quantity', Number(text))}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.unitTypeDropdown}
                        onPress={() => {
                          setCurrentMaterialForUnitType(material);
                          setUnitTypePickerVisible(true);
                        }}
                      >
                        <Text>{material.order_unit_type}</Text>
                        <AntDesign name="caretdown" size={12} color="black" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitOrder}>
              <Text style={styles.submitButtonText}>Submit Order</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unit Type Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isUnitTypePickerVisible}
        onRequestClose={() => setUnitTypePickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Unit Type</Text>
            <FlatList
              data={predefinedUnitTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    if (currentMaterialForUnitType) {
                      updateRawMaterialDetails(currentMaterialForUnitType.id, 'order_unit_type', item);
                    }
                    setUnitTypePickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setUnitTypePickerVisible(false)}
            >
              <Text style={styles.pickerCloseButtonText}>Cancel</Text>
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
    padding: 10,
    backgroundColor: "#f8f8f8",
  },
  searchBar: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingBottom: 10,
  },
  vendorItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#007bff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  formContainer: {
    width: '100%',
    maxHeight: 300, // Limit height for scrollability
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  vendorListInModal: {
    width: '100%',
    paddingBottom: 10,
  },
  selectedVendorItem: {
    borderColor: '#007bff',
    borderWidth: 2,
  },
  selectedVendorDetails: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e9f7ef',
    borderRadius: 8,
    width: '100%',
    alignSelf: 'flex-start',
  },
  selectedVendorTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  submitButton: {
    marginTop: 15,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rawMaterialsSection: {
    width: '100%',
    marginTop: 20,
  },
  rawMaterialList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 5,
    marginBottom: 10,
  },
  rawMaterialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedRawMaterialItem: {
    borderColor: '#007bff',
    backgroundColor: '#e6f2ff',
  },
  rawMaterialText: {
    fontSize: 16,
  },
  selectedRawMaterialsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e9f7ef',
    borderRadius: 8,
    width: '100%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  selectedRawMaterialsTitle: {
    fontWeight: 'bold',
    marginRight: 10,
    marginBottom: 5,
  },
  selectedRawMaterialTag: {
    backgroundColor: '#007bff',
    color: 'white',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 5,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    backgroundColor: 'white',
    color: 'black',
    marginLeft: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    width: 50,
    textAlign: 'center',
  },
  unitTypeInput: {
    backgroundColor: 'white',
    color: 'black',
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    width: 60,
    textAlign: 'center',
  },
  unitTypeDropdown: {
    backgroundColor: 'white',
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    width: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '70%',
    maxHeight: '70%',
    alignItems: 'center',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pickerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerCloseButton: {
    marginTop: 15,
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 5,
  },
  pickerCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  orderItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
});
