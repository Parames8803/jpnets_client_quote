import { IconSymbol, IconSymbolName } from "@/components/ui/IconSymbol";
import { StatusUpdateModal } from "@/components/ui/StatusUpdateModal";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { generateQuotationHtml } from "@/utils/quotationPdf";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Client,
  Product,
  Quotation,
  QUOTATION_STATUS_TYPES,
  QuotationStatus,
  Room,
  ROOM_STATUS_TYPES,
  RoomStatus,
} from "../../types/db";
import { supabase } from "../../utils/supabaseClient";

const { width } = Dimensions.get("window");

// --- Custom Hook for Data Fetching and Logic (Unchanged) ---
interface QuotationDetailsData {
  quotation: Quotation;
  client: Client;
  rooms: (Room & { products: Product[]; room_total_price?: number | null })[];
  allProducts: (Product & { room_type?: string })[];
}

function useQuotationDetails(quotationId: string | string[] | undefined) {
  const [data, setData] = useState<QuotationDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [quotationStatus, setQuotationStatus] =
    useState<QuotationStatus | null>(null);
  const id_str = Array.isArray(quotationId) ? quotationId[0] : quotationId;

  const fetchData = useCallback(async () => {
    if (!id_str) {
      setError(new Error("Quotation ID is missing."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: rawData, error: queryError } = await supabase
        .from("quotations")
        .select(
          `*, clients (*), quotation_rooms (room_total_price, rooms (*, products (*)))`
        )
        .eq("id", id_str)
        .single();

      if (queryError) throw queryError;
      if (!rawData) throw new Error("Quotation not found.");

      const client = rawData.clients as Client;
      if (!client) throw new Error("Client data is missing.");

      const rooms = rawData.quotation_rooms
        .map((qr: any) =>
          qr.rooms
            ? { ...qr.rooms, room_total_price: qr.room_total_price }
            : null
        )
        .filter(
          (room: any): room is Room & { products: Product[] } => room !== null
        );

      const allProducts = rooms.flatMap(
        (room: Room & { products: Product[] }) =>
          room.products
            ? room.products.map((p: Product) => ({
                ...p,
                room_type: room.room_type ?? "General",
              }))
            : []
      );

      const { clients, quotation_rooms, ...quotation } = rawData;
      setData({
        quotation: quotation as Quotation,
        client,
        rooms,
        allProducts,
      });
      setQuotationStatus(quotation.status as QuotationStatus);
    } catch (e: any) {
      console.error("Failed to fetch quotation details:", e.message);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [id_str]);

  const deleteQuotation = useCallback(async () => {
    if (!id_str) throw new Error("Cannot delete: Quotation ID is missing.");
    const { data: quotationRooms, error: fetchQrError } = await supabase
      .from("quotation_rooms")
      .select("room_id")
      .eq("quotation_id", id_str);
    if (fetchQrError) throw fetchQrError;
    const roomIdsToUpdate = quotationRooms?.map((qr) => qr.room_id) || [];
    await supabase.from("quotation_rooms").delete().eq("quotation_id", id_str);
    await supabase.from("quotations").delete().eq("id", id_str);
    if (roomIdsToUpdate.length > 0) {
      const { error: updateRoomsError } = await supabase
        .from("rooms")
        .update({ status: ROOM_STATUS_TYPES.ACTIVE })
        .in("id", roomIdsToUpdate);
      if (updateRoomsError) {
        console.error(
          "Warning: Failed to revert room statuses.",
          updateRoomsError.message
        );
        Alert.alert(
          "Warning",
          "Quotation deleted, but failed to revert room statuses."
        );
      }
    }
  }, [id_str]);

  const updateQuotationStatus = useCallback(
    async (newStatus: QuotationStatus | RoomStatus) => {
      if (!id_str) throw new Error("Cannot update: Quotation ID is missing.");
      setLoading(true);
      try {
        // Ensure newStatus is a QuotationStatus before proceeding with quotation update
        if (
          !Object.values(QUOTATION_STATUS_TYPES).includes(
            newStatus as QuotationStatus
          )
        ) {
          throw new Error("Invalid status for quotation.");
        }

        const { error: updateError } = await supabase
          .from("quotations")
          .update({ status: newStatus as QuotationStatus }) // Cast here for supabase
          .eq("id", id_str);
        if (updateError) throw updateError;

        setQuotationStatus(newStatus as QuotationStatus);

        if (newStatus === QUOTATION_STATUS_TYPES.CLOSED) {
          const { data: quotationRooms, error: fetchQrError } = await supabase
            .from("quotation_rooms")
            .select("room_id")
            .eq("quotation_id", id_str);
          if (fetchQrError) throw fetchQrError;
          const roomIdsToUpdate = quotationRooms?.map((qr) => qr.room_id) || [];
          if (roomIdsToUpdate.length > 0) {
            const { error: updateRoomsError } = await supabase
              .from("rooms")
              .update({ status: ROOM_STATUS_TYPES.READY_TO_START })
              .in("id", roomIdsToUpdate);
            if (updateRoomsError) {
              console.error(
                'Warning: Failed to update room statuses to "Ready to Start".',
                updateRoomsError.message
              );
              Alert.alert(
                "Warning",
                "Quotation status updated, but failed to update associated room statuses."
              );
            }
          }
        }
        Alert.alert("Success", "Quotation status updated successfully!");
      } catch (e: any) {
        Alert.alert("Error updating status", e.message);
      } finally {
        setLoading(false);
      }
    },
    [id_str]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    deleteQuotation,
    updateQuotationStatus,
    quotationStatus,
    refetch: fetchData,
  };
}

// --- Tab Content Components ---

const OverviewTab = ({
  data,
  colors,
}: {
  data: QuotationDetailsData;
  colors: any;
}) => (
  <ScrollView contentContainerStyle={styles.tabContentContainer}>
    <InfoSection icon="person.fill" title="Client Information" colors={colors}>
      <InfoItem
        icon="person"
        label="Name"
        value={data.client.name || "N/A"}
        colors={colors}
      />
      <InfoItem
        icon="phone"
        label="Contact"
        value={data.client.contact_number || "N/A"}
        colors={colors}
      />
      <InfoItem
        icon="location"
        label="Address"
        value={data.client.address || "N/A"}
        colors={colors}
      />
    </InfoSection>
    <InfoSection icon="doc.text.fill" title="Quotation Details" colors={colors}>
      <InfoItem
        icon="doc.text"
        label="Quotation ID"
        value={`#${data.quotation.quote_id ?? "N/A"}`}
        colors={colors}
      />
      <InfoItem
        icon="calendar"
        label="Date Created"
        value={new Date(data.quotation.created_at).toLocaleDateString()}
        colors={colors}
      />
      <InfoItem
        icon="dollarsign"
        label="Total Value"
        value={`₹${data.quotation.total_price?.toFixed(2) || "N/A"}`}
        colors={colors}
      />
    </InfoSection>
  </ScrollView>
);

const ProductsTab = ({
  products,
  colors,
}: {
  products: (Product & { room_type?: string })[];
  colors: any;
}) => (
  <ScrollView contentContainerStyle={styles.tabContentContainer}>
    {products.length > 0 ? (
      products.map((product, index) => (
        <ProductCard
          key={`${product.id}-${index}`}
          product={product}
          index={index}
          colors={colors}
        />
      ))
    ) : (
      <EmptyState icon="cube.box" text="No products found." colors={colors} />
    )}
  </ScrollView>
);

const RoomsTab = ({
  rooms,
  colors,
}: {
  rooms: (Room & { products: Product[] })[];
  colors: any;
}) => (
  <ScrollView contentContainerStyle={styles.tabContentContainer}>
    {rooms.length > 0 ? (
      rooms.map((room) => (
        <InfoSection
          key={room.id}
          icon="house.fill"
          title={room.room_type || "Uncategorized"}
          colors={colors}
        >
          {room.products.length > 0 ? (
            room.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                colors={colors}
                showRoomType={false}
              />
            ))
          ) : (
            <Text style={{ color: colors.secondaryText, padding: 10 }}>
              No products in this room.
            </Text>
          )}
        </InfoSection>
      ))
    ) : (
      <EmptyState icon="house" text="No rooms found." colors={colors} />
    )}
  </ScrollView>
);

// --- Main Component ---
type Tab = "overview" | "products" | "rooms";

export default function QuotationDetailsScreen() {
  const router = useRouter();
  const { id: quotationId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const {
    data,
    loading,
    error,
    deleteQuotation,
    updateQuotationStatus,
    quotationStatus,
  } = useQuotationDetails(quotationId);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);

  const handleDelete = () =>
    Alert.alert("Delete Quotation", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteQuotation();
            Alert.alert("Success", "Quotation deleted.");
            router.replace(
              data?.client?.id ? `/client/${data.client.id}` : "/clients"
            );
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);

  const generatePdf = async () => {
    if (!data) return Alert.alert("Error", "Data not loaded.");
    try {
      const htmlContent = generateQuotationHtml(data);
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (err: any) {
      Alert.alert("PDF Error", err.message);
    }
  };

  if (loading || isDeleting) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {isDeleting ? "Deleting..." : "Loading..."}
        </Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error?.message || "Quotation not found."}
        </Text>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab data={data} colors={colors} />;
      case "products":
        return <ProductsTab products={data.allProducts} colors={colors} />;
      case "rooms":
        return <RoomsTab rooms={data.rooms} colors={colors} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Quotation
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setIsStatusModalVisible(true)}
            style={[styles.headerButton, quotationStatus === 'Closed' && { opacity: 0.4 }]}
            disabled={quotationStatus === 'Closed'}
          >
            <IconSymbol
              size={22}
              name="pencil.circle.fill"
              color={colors.tint}
            />
          </TouchableOpacity>
          {quotationStatus !== 'Closed' && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <IconSymbol size={22} name="trash.fill" color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.summaryHeader,
          {
            backgroundColor: colors.cardBackground,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <StatItem
          label="Status"
          value={quotationStatus || "N/A"}
          colors={colors}
        />
        <StatItem
          label="Total Value"
          value={`₹${data.quotation.total_price?.toFixed(2)}`}
          colors={colors}
        />
        <StatItem
          label="Products"
          value={data.allProducts.length.toString()}
          colors={colors}
        />
        <StatItem
          label="Rooms"
          value={data.rooms.length.toString()}
          colors={colors}
        />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TabButton
          id="overview"
          title="Overview"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
        <TabButton
          id="products"
          title="Products"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
        <TabButton
          id="rooms"
          title="Rooms"
          activeTab={activeTab}
          onPress={setActiveTab}
          colors={colors}
        />
      </View>

      {renderTabContent()}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: "#3B82F6" }]}
        onPress={generatePdf}
        activeOpacity={0.8}
      >
        <IconSymbol name="doc.richtext" size={24} color="#FFF" />
      </TouchableOpacity>

      <StatusUpdateModal
        visible={isStatusModalVisible}
        onClose={() => setIsStatusModalVisible(false)}
        currentStatus={quotationStatus || ""}
        onUpdate={
          updateQuotationStatus as (
            status: QuotationStatus | RoomStatus
          ) => Promise<void>
        }
        statusOptions={Object.values(QUOTATION_STATUS_TYPES)}
        colors={colors}
      />
    </View>
  );
}

// --- Helper UI Components ---
const InfoSection = ({
  icon,
  title,
  children,
  colors,
}: {
  icon: IconSymbolName;
  title: string;
  children: React.ReactNode;
  colors: any;
}) => (
  <View
    style={[
      styles.infoSection,
      { backgroundColor: colors.cardBackground, borderColor: colors.border },
    ]}
  >
    <View style={styles.sectionHeader}>
      <IconSymbol name={icon} size={18} color={colors.tint} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const InfoItem = ({
  icon,
  label,
  value,
  colors,
}: {
  icon: IconSymbolName;
  label: string;
  value: string;
  colors: any;
}) => (
  <View style={styles.infoItem}>
    <IconSymbol
      name={icon}
      size={16}
      color={colors.secondaryText}
      style={styles.infoItemIcon}
    />
    <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>
      {label}
    </Text>
    <Text style={[styles.infoValue, { color: colors.text }]} selectable>
      {value}
    </Text>
  </View>
);

const ProductCard = ({
  product,
  index,
  colors,
  showRoomType = true,
}: {
  product: Product & { room_type?: string };
  index: number;
  colors: any;
  showRoomType?: boolean;
}) => (
  <View
    style={[
      styles.productCard,
      { backgroundColor: colors.cardBackground, borderColor: colors.border },
    ]}
  >
    <Text style={[styles.productName, { color: colors.text }]}>
      {product.name}
    </Text>
    {showRoomType && (
      <Text style={[styles.productRoom, { color: colors.secondaryText }]}>
        {product.room_type}
      </Text>
    )}
    <View style={styles.productMetaRow}>
      <Text style={[styles.productMeta, { color: colors.text }]}>
        Qty: {product.quantity} {product.unit_type}
      </Text>
      <Text
        style={[styles.productMeta, { color: colors.tint, fontWeight: "bold" }]}
      >
        ₹{product.price?.toFixed(2)}
      </Text>
    </View>
  </View>
);

const StatItem = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: any;
}) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, { color: colors.tint }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>
      {label}
    </Text>
  </View>
);

const TabButton = ({
  id,
  title,
  activeTab,
  onPress,
  colors,
}: {
  id: Tab;
  title: string;
  activeTab: Tab;
  onPress: (id: Tab) => void;
  colors: any;
}) => {
  const isActive = activeTab === id;
  return (
    <TouchableOpacity
      onPress={() => onPress(id)}
      style={[styles.tabButton, isActive && { borderBottomColor: colors.tint }]}
    >
      <Text
        style={[
          styles.tabButtonText,
          { color: isActive ? colors.tint : colors.secondaryText },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const EmptyState = ({
  icon,
  text,
  colors,
}: {
  icon: IconSymbolName;
  text: string;
  colors: any;
}) => (
  <View style={styles.emptyState}>
    <IconSymbol name={icon} size={48} color={colors.border} />
    <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>
      {text}
    </Text>
  </View>
);

// --- Stylesheet (Redesigned) ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 16, fontWeight: "500" },
  errorText: { fontSize: 16, fontWeight: "500", textAlign: "center" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  headerButtons: { flexDirection: "row", gap: 10 },
  headerButton: { padding: 5 },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 12, textTransform: "uppercase" },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonText: { fontSize: 16, fontWeight: "600" },
  tabContentContainer: { padding: 20, gap: 16 },
  infoSection: { borderRadius: 12, borderWidth: 1, padding: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  sectionContent: { gap: 10 },
  infoItem: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  infoItemIcon: { marginRight: 10 },
  infoLabel: { fontSize: 14, marginRight: 6 },
  infoValue: { fontSize: 14, fontWeight: "600", flex: 1 },
  productCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  productName: { fontSize: 16, fontWeight: "bold" },
  productRoom: { fontSize: 12, fontStyle: "italic" },
  productMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productMeta: { fontSize: 14 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  emptyStateText: { fontSize: 16, textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
