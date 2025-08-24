import LottieView from "lottie-react-native";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/adaptive-icon.png")} // Assuming jp_logo.png is your company logo
        style={styles.logo}
      />
      <Text style={styles.companyName}>JP Aluminium</Text>
      <Text style={styles.companyNameSecondary}>Interior Works</Text>
      <LottieView
        source={require("../assets/animations/loaderSplash.json")}
        autoPlay
        loop={false}
        onAnimationFinish={onAnimationFinish}
        style={styles.animation}
      />
      <Text style={styles.poweredBy}>Powered by Hynox</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // Or your desired background color
    paddingBottom: 50, // Add some padding to make space for "Powered by"
  },
  logo: {
    width: 150, // Adjust as needed
    height: 150, // Adjust as needed
    resizeMode: "contain",
    marginBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  companyNameSecondary: {
    fontSize: 18,
    color: "#555",
    marginBottom: 40,
  },
  animation: {
    width: 200,
    height: 200,
  },
  poweredBy: {
    position: "absolute",
    bottom: 20,
    fontSize: 16,
    color: "#888",
  },
});

export default SplashScreen;
