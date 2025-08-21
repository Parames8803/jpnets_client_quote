import { IconSymbol, IconSymbolName } from "@/components/ui/IconSymbol";
import { StatusUpdateModal } from "@/components/ui/StatusUpdateModal";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
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
        value={`#${data.quotation.id.slice(-8).toUpperCase()}`}
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
            style={styles.headerButton}
          >
            <IconSymbol
              size={22}
              name="pencil.circle.fill"
              color={colors.tint}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <IconSymbol size={22} name="trash.fill" color={colors.error} />
          </TouchableOpacity>
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

// --- PDF Generation (Unchanged) ---
function generateQuotationHtml({
  quotation,
  client,
  allProducts,
}: {
  quotation: Quotation;
  client: Client;
  allProducts: (Product & { room_type?: string })[];
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Quotation for JP Aluminium Kitchen Cupboard interior design and works. Get high-quality kitchen solutions in Mumbai.">
  <meta name="keywords" content="kitchen cupboard, aluminium kitchen, interior design, Mumbai, quotation">
  <title>Quotation #${quotation?.id?.slice(-8)?.toUpperCase() || "QT001234"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    :root {
      --font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
      --color-dark: #222222;
      --color-medium: #555555;
      --color-light: #888888;
      --color-border: #dddddd;
      --color-bg-light: #f9f9f9;
      --color-bg-header: #f1f1f1;
      --color-accent: #007bff;
      --watermark-opacity: 0.15;
      --watermark-size: 700px;
      --watermark-rotation: 0deg;
      --watermark-url: url('https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg');
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--font-family);
      font-size: 12px;
      line-height: 1.5;
      color: var(--color-dark);
      background-color: #f0f2f5;
    }

    .page-container {
      max-width: 820px;
      margin: 40px auto;
      padding: 20px;
      background-color: #ffffff;
      box-shadow: 0 0 15px rgba(0,0,0,0.1);
      border: 1px solid var(--color-border);
      position: relative;
      z-index: 1;
    }

    /* --- Watermark --- */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
      pointer-events: none;
      opacity: var(--watermark-opacity);
      width: var(--watermark-size);
      height: var(--watermark-size);
      background-image: var(--watermark-url);
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      transform: rotate(var(--watermark-rotation)) translate(-50%, -50%);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* --- Header --- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--color-dark);
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .company-logo img {
      width: 150px;
      height: 150px;
      object-fit: contain;
    }
    .company-details { text-align: left; }
    .company-details h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-dark);
    }
    .company-details p {
      font-size: 11px;
      color: var(--color-medium);
    }
    .quote-title-section { text-align: right; }
    .quote-title-section h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--color-dark);
      text-transform: uppercase;
    }
    .quote-title-section p {
      font-size: 12px;
      color: var(--color-medium);
    }

    /* --- Details Section (Client/Quote) --- */
    .details-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--color-border);
    }
    .details-column { width: 48%; }
    .details-column h3 {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 5px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--color-border);
    }
    .detail-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .detail-line .label { font-weight: 500; color: var(--color-medium); }
    .detail-line .value { font-weight: 500; color: var(--color-dark); }

    /* --- Products Table --- */
    .products-table-container { margin-bottom: 25px; }
    .products-table { width: 100%; border-collapse: collapse; }
    .products-table thead th {
      background-color: var(--color-bg-header);
      border: 1px solid var(--color-border);
      padding: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .products-table tbody td {
      border: 1px solid var(--color-border);
      padding: 10px;
      vertical-align: top;
    }
    .products-table tbody tr:nth-child(even) { background-color: var(--color-bg-light); }

    /* --- Summary Rows in Table --- */
    .summary-row td {
      border: 1px solid var(--color-border);
      border-top: 2px solid var(--color-dark);
      font-weight: 700;
    }
    .grand-total-row td {
      background-color: var(--color-dark);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid var(--color-dark);
    }
    .align-right { text-align: right; }
    .align-center { text-align: center; }

    /* --- Terms & Signature --- */
    .terms-signature-grid {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
    }
    .terms-section { width: 65%; }
    .terms-section h4, .signature-section h4 {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .terms-section ul {
      list-style-type: none;
      font-size: 11px;
      color: var(--color-medium);
    }
    .terms-section li { margin-bottom: 5px; }
    .signature-section { width: 35%; text-align: center; }
    .signature-box {
      border-bottom: 1px solid var(--color-dark);
      height: 70px;
      margin-bottom: 5px;
    }

    /* --- Footer --- */
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid var(--color-dark);
      font-size: 10px;
      color: var(--color-light);
    }

    /* Mobile Adjustments */
    @media (max-width: 640px) {
      .page-container { margin: 10px; padding: 20px; }
      .details-grid { flex-direction: column; gap: 15px; }
      .details-column { width: 100%; }
      .header { flex-direction: column; align-items: center; text-align: center; }
      .company-logo img { width: 100px; height: 100px; }
      .quote-title-section { text-align: center; margin-top: 15px; }
      .terms-signature-grid { flex-direction: column; gap: 15px; }
      .terms-section, .signature-section { width: 100%; }
      .watermark { width: 400px; height: 400px; }
    }

    /* Print Adjustments */
    @media print {
      body { background-color: #ffffff; }
      .page-container {
        margin: 10mm;
        padding: 15mm;
        box-shadow: none;
        border: none;
      }
      .products-table th, .products-table td { border: 1px solid #000; }
      .summary-row td, .grand-total-row td { border: 1px solid #000; }
      .grand-total-row td { border: 1px solid #000; }
      .watermark {
        opacity: var(--watermark-opacity);
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="watermark" aria-hidden="true"></div>
    <header class="header">
      <div class="company-logo">
        <img src="https://curiqqrlajzvidcbcluj.supabase.co/storage/v1/object/public/file-storage/logo/JP-Aluminium-Kitchen-Cupboard-Interior-Works.jpg" alt="JP Aluminium Kitchen Cupboard Logo" onerror="this.style.display='none'">
      </div>
      <div class="company-details">
        <h1>JP Aluminium Kitchen Cupboard</h1>
        <p>Interior Works & Design Solutions</p>
        <p>Mumbai, MH 400001 | +91 98765 43210 | info@jpaluminium.com</p>
      </div>
      <div class="quote-title-section">
        <h2>Quotation</h2>
        <p>#${quotation?.id?.slice(-8)?.toUpperCase() || "QT001234"}</p>
      </div>
    </header>
    <main>
      <section class="details-grid">
        <div class="details-column">
          <h3>Bill To:</h3>
          <div class="detail-line">
            <span class="label">Client:</span>
            <span class="value">${client?.name || "N/A"}</span>
          </div>
          <div class="detail-line">
            <span class="label">Contact:</span>
            <span class="value">${client?.contact_number || "N/A"}</span>
          </div>
          <div class="detail-line">
            <span class="label">Address:</span>
            <span class="value">${client?.address || "N/A"}</span>
          </div>
        </div>
        <div class="details-column">
          <h3>Details:</h3>
          <div class="detail-line">
            <span class="label">Date of Issue:</span>
            <span class="value">${new Date(quotation?.created_at || Date.now()).toLocaleDateString("en-GB")}</span>
          </div>
          <div class="detail-line">
            <span class="label">Valid Until:</span>
            <span class="value">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}</span>
          </div>
          <div class="detail-line">
            <span class="label">Project Type:</span>
            <span class="value">Kitchen Interior</span>
          </div>
        </div>
      </section>
      <section class="products-table-container">
        <table class="products-table">
          <thead>
            <tr>
              <th class="align-center" style="width: 8%;">S.No</th>
              <th style="width: 42%;">Item Description</th>
              <th class="align-center" style="width: 15%;">Quantity</th>
              <th class="align-right" style="width: 15%;">Unit Price</th>
              <th class="align-right" style="width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              allProducts
                ?.map(
                  (product, index) => `
            <tr>
              <td class="align-center">${index + 1}</td>
              <td><strong>${product?.name || "N/A"}</strong><br><small>${product?.room_type || ""}</small></td>
              <td class="align-center">${product?.quantity || 0} ${product?.unit_type || ""}</td>
              <td class="align-right">₹${(product?.price || 0).toFixed(2)}</td>
              <td class="align-right">₹${((product?.quantity || 0) * (product?.price || 0)).toFixed(2)}</td>
            </tr>
            `
                )
                .join("") ||
              '<tr><td colspan="5" class="align-center">No items listed.</td></tr>'
            }
            <tr class="summary-row">
              <td colspan="4" class="align-right">Subtotal</td>
              <td class="align-right">₹${(quotation?.total_price || 0).toFixed(2)}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="4" class="align-right">GST (18%)</td>
              <td class="align-right">₹${((quotation?.total_price || 0) * 0.18).toFixed(2)}</td>
            </tr>
            <tr class="grand-total-row">
              <td colspan="4" class="align-right">GRAND TOTAL</td>
              <td class="align-right">₹${((quotation?.total_price || 0) * 1.18).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="terms-signature-grid">
        <div class="terms-section">
          <h4>Terms & Conditions</h4>
          <ul>
            <li><strong>Payment:</strong> 50% advance, 40% on material delivery, 10% on completion.</li>
            <li><strong>Delivery:</strong> Approx. 15-20 working days from advance payment.</li>
            <li><strong>Warranty:</strong> 1-year warranty on manufacturing defects.</li>
            <li><strong>Validity:</strong> This quotation is valid for 30 days.</li>
          </ul>
        </div>
        <div class="signature-section">
          <h4>Authorized Signature</h4>
          <div class="signature-box"></div>
          <p>For JP Aluminium Kitchen Cupboard</p>
        </div>
      </section>
    </main>
    <footer class="footer">
      <p>Thank you for considering our quotation. We look forward to working with you.</p>
      <p>JP Aluminium Kitchen Cupboard | GST: 27XXXXX1234X1ZX</p>
    </footer>
  </div>
</body>
</html>`;
}

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
