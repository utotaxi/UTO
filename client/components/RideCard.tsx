import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
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
import { Ride } from "@/context/RideContext";

interface RideCardProps {
  ride: Ride;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RideCard({ ride, onPress }: RideCardProps) {
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
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = () => {
    switch (ride.status) {
      case "completed":
        return UTOColors.success;
      case "cancelled":
        return UTOColors.error;
      case "in_progress":
        return UTOColors.primary;
      default:
        return UTOColors.warning;
    }
  };

  const getStatusText = () => {
    switch (ride.status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "in_progress":
        return "In Progress";
      case "accepted":
        return "Driver on way";
      case "arrived":
        return "Driver arrived";
      default:
        return "Pending";
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={[styles.date, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
          {formatDate(ride.createdAt)}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeIndicator}>
          <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
          <View style={[styles.line, { backgroundColor: isDark ? "#333333" : theme.border }]} />
          <View style={[styles.dot, { backgroundColor: UTOColors.primary }]} />
        </View>
        <View style={styles.addresses}>
          <ThemedText style={[styles.address, { color: isDark ? "#FFFFFF" : theme.text }]} numberOfLines={1}>
            {ride.pickupLocation.address}
          </ThemedText>
          <ThemedText style={[styles.address, { color: isDark ? "#FFFFFF" : theme.text }]} numberOfLines={1}>
            {ride.dropoffLocation.address}
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {ride.driverName ? (
            <View style={styles.driverInfo}>
              <Feather name="user" size={14} color={isDark ? "#9CA3AF" : theme.textSecondary} />
              <ThemedText style={[styles.driverName, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
                {ride.driverName}
              </ThemedText>
              {ride.driverRating ? (
                <>
                  <Feather name="star" size={12} color={UTOColors.warning} />
                  <ThemedText style={[styles.rating, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
                    {ride.driverRating.toFixed(1)}
                  </ThemedText>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
        <ThemedText style={[styles.price, { color: isDark ? "#FFFFFF" : theme.text }]}>
          {formatPrice(ride.farePrice)}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  date: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  routeContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  routeIndicator: {
    width: 20,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  addresses: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  address: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverName: {
    fontSize: 13,
  },
  rating: {
    fontSize: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
});
