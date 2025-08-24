import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { WeatherData } from "@/types/db";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
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

// Your OpenWeatherMap API key
const WEATHER_API_KEY = "9173ed6b12c23e057eebedffea359068";

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        setWeatherLoading(false);
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Fetch weather data
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = await response.json();

      if (response.ok) {
        setWeatherData({
          temperature: Math.round(data.main.temp),
          condition: data.weather[0].main,
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          icon: data.weather[0].icon,
          location: data.name,
        });
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: string } = {
      Clear: "sunny-outline",
      Clouds: "cloudy-outline",
      Rain: "rainy-outline",
      Drizzle: "rainy-outline",
      Thunderstorm: "thunderstorm-outline",
      Snow: "snow-outline",
      Mist: "cloud-outline",
      Fog: "cloud-outline",
    };
    return iconMap[condition] || "partly-sunny-outline";
  };

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
            <Text
              style={[
                styles.greeting,
                {
                  color: isDark
                    ? Colors.dark.secondary
                    : Colors.light.secondary,
                },
              ]}
            >
              {getGreeting()}
            </Text>
          </View>
        </View>
      </View>

      {/* Time and Weather Section */}
      <View style={styles.timeWeatherContainer}>
        {/* Time Section */}
        <View style={styles.timeSection}>
          <Text
            style={[
              styles.timeText,
              { color: isDark ? Colors.dark.text : Colors.light.text },
            ]}
          >
            {formattedTime}
          </Text>
          <Text
            style={[
              styles.dateText,
              {
                color: isDark ? Colors.dark.secondary : Colors.light.secondary,
              },
            ]}
          >
            {formattedDate}
          </Text>
        </View>

        {/* Weather Section */}
        <View style={styles.weatherSection}>
          {weatherLoading ? (
            <View style={styles.weatherLoadingContainer}>
              <LottieView
                source={require("../../assets/animations/loaderWeather.json")}
                autoPlay
                loop={false}
                style={styles.animation}
              />
            </View>
          ) : weatherData ? (
            <View
              style={[
                styles.weatherCard,
                {
                  backgroundColor: isDark
                    ? Colors.dark.cardBackground
                    : Colors.light.cardBackground,
                },
              ]}
            >
              <View style={styles.weatherHeader}>
                <Ionicons
                  name={getWeatherIcon(weatherData.condition) as any}
                  size={32}
                  color={isDark ? Colors.dark.text : Colors.light.text}
                />
                <Text
                  style={[
                    styles.temperatureText,
                    { color: isDark ? Colors.dark.text : Colors.light.text },
                  ]}
                >
                  {weatherData.temperature}°C
                </Text>
              </View>
              <Text
                style={[
                  styles.weatherCondition,
                  {
                    color: isDark
                      ? Colors.dark.secondary
                      : Colors.light.secondary,
                  },
                ]}
              >
                {weatherData.description}
              </Text>
              <Text
                style={[
                  styles.weatherLocation,
                  {
                    color: isDark
                      ? Colors.dark.secondary
                      : Colors.light.secondary,
                  },
                ]}
              >
                📍 {weatherData.location}
              </Text>
              <View style={styles.weatherDetails}>
                <Text
                  style={[
                    styles.weatherDetailText,
                    {
                      color: isDark
                        ? Colors.dark.secondary
                        : Colors.light.secondary,
                    },
                  ]}
                >
                  💧 {weatherData.humidity}% • 💨 {weatherData.windSpeed} km/h
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                styles.weatherError,
                {
                  color: isDark
                    ? Colors.dark.secondary
                    : Colors.light.secondary,
                },
              ]}
            >
              Weather unavailable
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text
        style={[
          styles.sectionTitle,
          { color: isDark ? Colors.dark.text : Colors.light.text },
        ]}
      >
        Quick Actions
      </Text>
      <View style={styles.actionsGrid}>
        {[
          {
            icon: "document-text-outline",
            title: "Quotation list",
            color: "#007BFF",
            onPress: () => router.push("/quotation/list"),
          },
          {
            icon: "images-outline",
            title: "Gallery update",
            color: "#8A2BE2",
            onPress: () => router.push("/gallery"),
          },
          {
            icon: "people-outline",
            title: "Workers",
            color: "#FF5722",
            onPress: () => router.push("/workers"),
          },
          {
            icon: "hourglass-outline",
            title: "Pending works",
            color: "#9C27B0",
            onPress: () => router.push("/pending-works"),
          },
          {
            icon: "play-circle-outline",
            title: "Ongoing works",
            color: "#FF9800",
            onPress: () => router.push("/ongoing-works"),
          },
          {
            icon: "wallet-outline",
            title: "Pending Amount",
            color: "#FFC107",
            onPress: () => router.push("/pending-amount"),
          },
          {
            icon: "hourglass-outline",
            title: "Pending Measurement",
            color: "#4CAF50",
            onPress: () => router.push("/leads"),
          },
          {
            icon: "receipt-outline",
            title: "Invoices",
            color: "#00BCD4",
            onPress: () => router.push("/quotation/list?invoiceGenerated=true"),
          },
          {
            icon: "cube-outline",
            title: "Raw Materials",
            color: "#607D8B",
            onPress: () => router.push("/raw-materials"),
          },
          {
            icon: "sync-outline",
            title: "Stock Update",
            color: "#FF00FF",
            onPress: () => router.push("/raw-materials/update-stock"),
          },
          {
            icon: "cart-outline",
            title: "Purchased Orders",
            color: "#28A745",
            onPress: () => router.push("/orders/list"),
          },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionCard,
              {
                backgroundColor: isDark
                  ? Colors.dark.cardBackground
                  : Colors.light.cardBackground,
              },
            ]}
            onPress={action.onPress}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: `${action.color}20` },
              ]}
            >
              <Ionicons
                name={action.icon as any}
                size={24}
                color={action.color}
              />
            </View>
            <Text
              style={[
                styles.actionTitle,
                { color: isDark ? Colors.dark.text : Colors.light.text },
              ]}
            >
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.dark.background
            : Colors.light.background,
        },
      ]}
    >
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
            source={require("../../assets/images/jp_logo.png")}
            style={styles.logoPlaceholder}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.poweredBy,
              {
                color: isDark ? Colors.dark.secondary : Colors.light.secondary,
              },
            ]}
          >
            Powered by Hynox
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** ==========================
 *  Updated Styles
 *  ========================== */
const styles = StyleSheet.create({
  animation: {
    width: 100,
    height: 100,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 24,
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
    textAlign: "center",
  },

  // New Time and Weather Container
  timeWeatherContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  timeSection: {
    flex: 1,
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

  // Weather Styles
  weatherSection: {
    flex: 1,
    alignItems: "center",
  },
  weatherCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 160,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  temperatureText: {
    fontSize: 24,
    fontWeight: "700",
  },
  weatherCondition: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
    marginBottom: 4,
    textAlign: "center",
  },
  weatherLocation: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 8,
    textAlign: "center",
  },
  weatherDetails: {
    alignItems: "center",
  },
  weatherDetailText: {
    fontSize: 11,
    fontWeight: "400",
  },
  weatherLoadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  weatherLoadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  weatherError: {
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    padding: 16,
  },

  // Existing styles remain the same
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
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 20,
  },
  logoPlaceholder: {
    width: 300,
    height: 200,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  poweredBy: {
    fontSize: 14,
    fontWeight: "500",
  },
});
