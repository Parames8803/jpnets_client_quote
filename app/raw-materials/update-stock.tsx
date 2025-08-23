import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Import Picker for dropdown
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RawMaterial } from "../../types/db"; // Import the RawMaterial interface from db.ts
import { supabase } from "../../utils/supabaseClient";

const UNIT_TYPES = ["bags", "tons", "pieces", "bundles", "sq.ft", "m", "m²", "pcs", "liters", "kg"]; // Define available unit types

export default function UpdateStockScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(
    null
  );
  const [quantity, setQuantity] = useState("");
  const [unitType, setUnitType] = useState("");

  const fetchRawMaterials = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("raw_materials")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching raw materials:", error);
      Alert.alert("Error", "Failed to fetch raw materials.");
    } else {
      setRawMaterials(data as RawMaterial[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  const handleUpdateStock = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setQuantity(material.quantity.toString());
    setUnitType(material.unit_type);
    setModalVisible(true);
  };

  const saveStockUpdate = async () => {
    if (!selectedMaterial || !quantity || !unitType) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    const newQuantity = parseFloat(quantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert("Error", "Please enter a valid quantity (non-negative).");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("raw_materials")
      .update({ quantity: newQuantity, unit_type: unitType })
      .eq("id", selectedMaterial.id);

    if (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock.");
    } else {
      Alert.alert(
        "Success",
        `${selectedMaterial.name} stock updated to ${newQuantity} ${unitType}.`
      );
      fetchRawMaterials(); // Re-fetch to update the list
    }
    setModalVisible(false);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: RawMaterial }) => (
    <View
      style={[
        styles.materialCard,
        {
          backgroundColor: isDark
            ? Colors.dark.cardBackground
            : Colors.light.cardBackground,
        },
      ]}
    >
      <View>
        <Text
          style={[
            styles.materialName,
            { color: isDark ? Colors.dark.text : Colors.light.text },
          ]}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.materialStock,
            { color: isDark ? Colors.dark.secondary : Colors.light.secondary },
          ]}
        >
          Current Stock: {item.quantity} {item.unit_type}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => handleUpdateStock(item)}
      >
        <Ionicons name="pencil-outline" size={20} color="#fff" />
        <Text style={styles.updateButtonText}>Update</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.text : Colors.light.text} />
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginTop: 10 }}>Loading Raw Materials...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? Colors.dark.background : Colors.light.background },
      ]}
    >
      <FlatList
        data={rawMaterials}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View
            style={[
              styles.modalView,
              {
                backgroundColor: isDark
                  ? Colors.dark.cardBackground
                  : Colors.light.cardBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Update Stock for {selectedMaterial?.name}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark
                    ? Colors.dark.border
                    : Colors.light.border,
                },
              ]}
              placeholder="Quantity"
              placeholderTextColor={isDark ? Colors.dark.secondary : Colors.light.secondary}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            <View
              style={[
                styles.pickerContainer,
                {
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  backgroundColor: isDark ? Colors.dark.inputBackground : Colors.light.inputBackground,
                },
              ]}
            >
              <Picker
                selectedValue={unitType}
                onValueChange={(itemValue) => setUnitType(itemValue)}
                style={[styles.picker, { color: isDark ? Colors.dark.text : Colors.light.text }]}
              >
                {UNIT_TYPES.map((unit) => (
                  <Picker.Item key={unit} label={unit} value={unit} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title="Save" onPress={saveStockUpdate} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  materialCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  materialName: {
    fontSize: 18,
    fontWeight: "600",
  },
  materialStock: {
    fontSize: 14,
    marginTop: 4,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  updateButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "600",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden', // Ensures the picker's border radius is respected
  },
  picker: {
    height: 50, // Standard height for Picker
    width: '100%',
  },
});
