import React from "react";
import { StyleSheet, View, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius, formatPrice } from "@/constants/theme";
import { RideType } from "@/context/RideContext";

interface VehicleCardProps {
  type: RideType;
  name: string;
  description: string;
  passengers: number;
  price: number;
  eta: number;
  isSelected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VEHICLE_IMAGES: Record<RideType, any> = {
  saloon: require("../../assets/images/car-economy.png"),
  minibus: require("../../assets/images/car-van.png"),
};

export function VehicleCard({
  type,
  name,
  description,
  passengers,
  price,
  eta,
  isSelected,
  onPress,
}: VehicleCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: isSelected 
            ? (isDark ? "rgba(247, 201, 72, 0.15)" : UTOColors.primaryLight + "30")
            : (isDark ? "#1A1A1A" : theme.backgroundDefault),
          borderColor: isSelected ? UTOColors.primary : (isDark ? "#333333" : theme.border),
          borderWidth: isSelected ? 2 : 1,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={VEHICLE_IMAGES[type]}
          style={styles.vehicleImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <ThemedText style={[styles.name, { color: isDark ? "#FFFFFF" : theme.text }]}>{name}</ThemedText>
          <View style={styles.etaContainer}>
            <ThemedText style={[styles.eta, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
              {eta} min
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.description, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
          {description}
        </ThemedText>
        <View style={styles.detailsRow}>
          <View style={styles.passengersContainer}>
            <Feather name="user" size={12} color={isDark ? "#9CA3AF" : theme.textSecondary} />
            <ThemedText style={[styles.passengers, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
              {passengers}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.priceContainer}>
        <ThemedText style={[styles.price, { color: isSelected ? UTOColors.primary : (isDark ? "#FFFFFF" : theme.text) }]}>
          {formatPrice(price)}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    width: 56,
    height: 40,
    marginRight: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleImage: {
    width: 56,
    height: 40,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  etaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eta: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passengersContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passengers: {
    fontSize: 12,
  },
  priceContainer: {
    marginLeft: Spacing.md,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
});
