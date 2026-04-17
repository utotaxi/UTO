//client/screen/rider/ServicesScreen.tsx

import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");

const RIDE_SERVICES = [
  { id: "trip", name: "Trip", icon: "directions-car", description: "Everyday rides" },
  { id: "reserve", name: "Reserve", icon: "event", description: "Schedule ahead" },
  { id: "airport", name: "Airport", icon: "flight", description: "Airport transfers" },
];

interface ServiceItemProps {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
  onPress: () => void;
  index: number;
}

function ServiceItem({ id, name, icon, description, onPress, index }: ServiceItemProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={styles.serviceItem}
      >
        <View style={styles.serviceIconContainer}>
          <MaterialIcons name={icon} size={24} color={UTOColors.primary} />
        </View>
        <View style={styles.serviceInfo}>
          <ThemedText style={styles.serviceName}>{name}</ThemedText>
          <ThemedText style={styles.serviceDescription}>{description}</ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
      </Pressable>
    </Animated.View>
  );
}

export default function ServicesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const handleServicePress = (serviceId: string) => {
    if (serviceId === "trip" || serviceId === "intercity") {
      navigation.navigate("RideRequest");
    } else if (serviceId === "airport") {
      navigation.navigate("AirportBooking");
    } else if (serviceId === "reserve") {
      navigation.navigate("LaterRide");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <ThemedText style={styles.headerTitle}>Services</ThemedText>
        </Animated.View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Ride</ThemedText>
          <View style={styles.sectionContent}>
            {RIDE_SERVICES.map((service, index) => (
              <ServiceItem
                key={service.id}
                {...service}
                icon={service.icon as keyof typeof MaterialIcons.glyphMap}
                onPress={() => handleServicePress(service.id)}
                index={index}
              />
            ))}
          </View>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  serviceDescription: {
    color: "#6B7280",
    fontSize: 14,
  },
});