import React from "react";
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  Dimensions,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  delay?: number;
}

function RoleCard({ title, description, icon, onPress, delay = 0 }: RoleCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={[styles.roleCard, animatedStyle]}
      >
        <View style={styles.roleIconContainer}>
          <MaterialIcons name={icon} size={28} color={UTOColors.primary} />
        </View>
        <View style={styles.roleTextContainer}>
          <ThemedText style={styles.roleTitle}>{title}</ThemedText>
          <ThemedText style={styles.roleDescription}>{description}</ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={UTOColors.primary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const handleRiderPress = () => {
    navigation.navigate("SignIn", { role: "rider" });
  };

  const handleDriverPress = () => {
    navigation.navigate("SignIn", { role: "driver" });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#000000", "#1A1A1A", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={FadeIn.duration(800)}
        style={[styles.header, { paddingTop: insets.top + Spacing["3xl"] }]}
      >
        <Image
          source={require("../../../assets/images/uto-logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.welcomeSection}
        >
          <ThemedText style={styles.welcomeTitle}>Welcome to UTO</ThemedText>
          <ThemedText style={styles.welcomeSubtitle}>
            Time to Go! Choose how you want to use UTO
          </ThemedText>
        </Animated.View>

        <View style={styles.roleCards}>
          <RoleCard
            title="Ride with UTO"
            description="Request rides and get to your destination"
            icon="directions-car"
            onPress={handleRiderPress}
            delay={400}
          />
          <RoleCard
            title="Drive with UTO"
            description="Earn money by giving rides"
            icon="currency-pound"
            onPress={handleDriverPress}
            delay={500}
          />
        </View>
      </View>

      <Animated.View
        entering={FadeIn.delay(600).duration(500)}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <ThemedText style={styles.footerText}>
          By continuing, you agree to our{" "}
          <ThemedText
            style={styles.linkText}
            onPress={() => navigation.navigate("Terms", { tab: "passenger" })}
          >
            Terms of Service
          </ThemedText>
          {" "}and{" "}
          <ThemedText
            style={styles.linkText}
            onPress={() => navigation.navigate("Terms", { tab: "privacy" })}
          >
            Privacy Policy
          </ThemedText>
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    alignItems: "center",
    paddingBottom: Spacing["2xl"],
  },
  logo: {
    width: width * 0.7,
    height: 120,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
  },
  roleCards: {
    gap: Spacing.lg,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "#333333",
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(247, 201, 72, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  linkText: {
    color: UTOColors.primary,
    fontWeight: "500",
  },
});
