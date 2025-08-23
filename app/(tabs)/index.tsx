import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const getGreeting = () => {
    const hour = currentDateTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  /** ==========================
   *  UI Helper Components
   *  ========================== */

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.userSection}>
          <View style={styles.greetingSection}>
            <Text style={[styles.greeting, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
              {getGreeting()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.timeSection}>
        <Text style={[styles.timeText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {formattedTime}
        </Text>
        <Text style={[styles.dateText, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
          {formattedDate}
        </Text>
      </View>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        Quick Actions
      </Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: "document-text-outline", title: "Quotation list", color: "#007BFF", onPress: () => router.push('/quotation/list') },
          { icon: "images-outline", title: "Gallery update", color: "#8A2BE2", onPress: () => router.push('/gallery') },
          { icon: "people-outline", title: "Workers", color: "#FF5722", onPress: () => router.push('/workers') },
          { icon: "hourglass-outline", title: "Pending works", color: "#9C27B0", onPress: () => router.push('/pending-works') },
          { icon: "play-circle-outline", title: "Ongoing works", color: "#FF9800", onPress: () => router.push('/ongoing-works') },
          { icon: "wallet-outline", title: "Pending Amount", color: "#FFC107", onPress: () => router.push('/pending-amount') },
          { icon: "hourglass-outline", title: "Pending Measurement", color: "#4CAF50", onPress: () => router.push('/leads') },
          { icon: "receipt-outline", title: "Invoices", color: "#00BCD4", onPress: () => router.push('/quotation/list?invoiceGenerated=true') },
          { icon: "cube-outline", title: "Raw Materials", color: "#607D8B", onPress: () => router.push('/raw-materials') },
        ].map((action, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.actionCard,
              { backgroundColor: isDark ? Colors.dark.cardBackground : Colors.light.cardBackground }
            ]}
            onPress={action.onPress}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={[styles.actionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /** ==========================
   *  Render
   *  ========================== */
  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <View style={styles.content}>
          <QuickActions />
        </View>

        {/* Footer Section */}
        <View style={styles.footerContainer}>
          <Image
            source={require('../../assets/images/jp_logo.png')} // Replace with your logo path
            style={styles.logoPlaceholder}
            resizeMode="contain"
          />
          <Text style={[styles.poweredBy, { color: isDark ? Colors.dark.secondary : Colors.light.secondary }]}>
            Powered by Hynox
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** ==========================
 *  Styles
 *  ========================== */
const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === "ios" ? 60 : 40, 
    paddingBottom: 24 
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingSection: {
    flex: 1,
  },
  greeting: { 
    fontSize: 28, 
    fontWeight: "800", 
    textAlign: "center"
  },
  timeSection: {
    alignItems: "center",
    paddingVertical: 16,
  },
  timeText: { 
    fontSize: 36, 
    fontWeight: "300",
    letterSpacing: -1,
  },
  dateText: { 
    fontSize: 16, 
    fontWeight: "500",
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  quickActionsContainer: {
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: 300,
    height: 200,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 14,
    fontWeight: '500',
  },
});
