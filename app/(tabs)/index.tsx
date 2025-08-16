import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "@/utils/supabaseClient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

type AnalyticsData = {
  totalClients: number;
  totalWorkers: number;
  quotationsPending: number;
  quotationsClosed: number;
  roomsStatusCounts: Record<string, number>;
  totalRevenueClosedQuotations: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  /** ==========================
   *  Fetch Analytics
   *  ========================== */
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: clients } = await supabase.rpc("get_total_clients");
      const { data: workers } = await supabase.rpc("get_total_workers");
      const { data: quotes } = await supabase.rpc("get_quotation_status_counts");
      const { data: rooms } = await supabase.rpc("get_room_status_counts");
      const { data: revenue } = await supabase.rpc("get_total_revenue_from_closed_quotations");

      setAnalytics({
        totalClients: clients || 0,
        totalWorkers: workers || 0,
        quotationsPending: quotes?.pending || 0,
        quotationsClosed: quotes?.closed || 0,
        roomsStatusCounts: rooms || {},
        totalRevenueClosedQuotations: revenue || 0,
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /** ==========================
   *  Session / Auth
   *  ========================== */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email);
        setUserId(data.user.id);
        fetchAnalytics();
      } else {
        router.replace("/(auth)/login");
      }
    };
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) {
        router.replace("/(auth)/login");
      } else {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        fetchAnalytics();
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  useFocusEffect(useCallback(() => { if (userId) fetchAnalytics(); }, [userId]));

  /** ==========================
   *  UI Helper Components
   *  ========================== */

  const Header = () => (
    <View style={styles.header}>
      <View>
        <Text style={[styles.greeting, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Good morning
        </Text>
        <Text style={[styles.userName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {userEmail?.split("@")[0] ?? "User"}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.profileButton, { backgroundColor: isDark ? Colors.dark.buttonBackground : Colors.light.buttonBackground }]}
      >
        <IconSymbol name="person.circle.fill" size={32} color={isDark ? Colors.dark.primary : Colors.light.primary} />
      </TouchableOpacity>
    </View>
  );

  const RevenueCard = () => (
    <View style={[styles.revenueCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <IconSymbol name="dollarsign.circle.fill" size={28} color="#22C55E" />
        <Text style={[styles.revenueLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          Total Revenue
        </Text>
      </View>
      <Text style={[styles.revenueNumber, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        ${analytics?.totalRevenueClosedQuotations.toFixed(2)}
      </Text>
    </View>
  );

  const StatCard = ({ label, value, icon, color }: any) => (
    <View style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>{label}</Text>
    </View>
  );

  const RoomStatusPie = () =>
    analytics?.roomsStatusCounts && Object.keys(analytics.roomsStatusCounts).length > 0 ? (
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          Room Status Distribution
        </Text>
        <PieChart
          data={Object.entries(analytics.roomsStatusCounts).map(([status, count], i) => ({
            name: status,
            population: count,
            color: ["#EF4444", "#10B981", "#3B82F6", "#F59E0B"][i % 4],
            legendFontColor: isDark ? Colors.dark.text : Colors.light.text,
            legendFontSize: 14,
          }))}
          width={width - 48}
          height={220}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          chartConfig={{
            color: (o = 1) => `rgba(0,0,0,${o})`,
            labelColor: (o = 1) => (isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o})`),
          }}
        />
      </View>
    ) : null;

  const QuotationBar = () => (
    <View style={styles.chartSection}>
      <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Quotation Status Overview
      </Text>
      <BarChart
        data={{
          labels: ["Pending", "Closed"],
          datasets: [{ data: [analytics?.quotationsPending || 0, analytics?.quotationsClosed || 0] }],
        }}
        width={width - 48}
        height={220}
        fromZero
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          backgroundGradientTo: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground,
          color: (o = 1) => (isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o})`),
          labelColor: (o = 1) => (isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o})`),
        }}
        style={{ borderRadius: 16 }}
      />
    </View>
  );

  /** ==========================
   *  Render
   *  ========================== */
  if (!analytics) {
    return (
      <View style={[styles.loading, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text }}>
          {loading ? "Loading analytics..." : "No data available"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAnalytics} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Header />
        <View style={{ paddingHorizontal: 24 }}>
          <RevenueCard />
          <View style={styles.statsRow}>
            <StatCard label="Total Clients" value={analytics.totalClients} icon="person.3.fill" color="#3B82F6" />
            <StatCard label="Total Workers" value={analytics.totalWorkers} icon="person.fill" color="#10B981" />
            <StatCard label="Quotes Pending" value={analytics.quotationsPending} icon="pencil.and.outline" color="#F59E0B" />
            <StatCard label="Quotes Closed" value={analytics.quotationsClosed} icon="checkmark.circle.fill" color="#6366F1" />
          </View>
        </View>
        <RoomStatusPie />
        <QuotationBar />
      </ScrollView>
    </View>
  );
}

/** ==========================
 *  Styles
 *  ========================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  greeting: { fontSize: 16 },
  userName: { fontSize: 28, fontWeight: "700", marginTop: 4 },
  profileButton: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  revenueCard: { borderRadius: 20, padding: 20, marginBottom: 20, elevation: 4 },
  revenueLabel: { fontSize: 18, fontWeight: "600", marginLeft: 8 },
  revenueNumber: { fontSize: 36, fontWeight: "800", marginTop: 4 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: { width: (width - 24 * 2 - 12) / 2, borderRadius: 16, padding: 16, marginBottom: 12, ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6 } }) },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 13, fontWeight: "500" },
  chartSection: { paddingHorizontal: 24, marginVertical: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
});
