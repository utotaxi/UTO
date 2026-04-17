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
import { Trip } from "@/context/DriverContext";

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TripCard({ trip, onPress }: TripCardProps) {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
    });
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
      <View style={styles.leftSection}>
        <ThemedText style={[styles.time, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
          {formatTime(trip.completedAt)}
        </ThemedText>
        <ThemedText style={[styles.riderName, { color: isDark ? "#FFFFFF" : theme.text }]}>
          {trip.riderName}
        </ThemedText>
      </View>

      <View style={styles.middleSection}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
          <ThemedText style={[styles.address, { color: isDark ? "#9CA3AF" : theme.textSecondary }]} numberOfLines={1}>
            {trip.pickupAddress}
          </ThemedText>
        </View>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: UTOColors.primary }]} />
          <ThemedText style={[styles.address, { color: isDark ? "#9CA3AF" : theme.textSecondary }]} numberOfLines={1}>
            {trip.dropoffAddress}
          </ThemedText>
        </View>
      </View>

      <View style={styles.rightSection}>
        <ThemedText style={[styles.fare, { color: UTOColors.primary }]}>
          +{formatPrice(trip.farePrice)}
        </ThemedText>
        {trip.rating ? (
          <View style={styles.ratingContainer}>
            <Feather name="star" size={12} color={UTOColors.warning} />
            <ThemedText style={[styles.rating, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
              {trip.rating}
            </ThemedText>
          </View>
        ) : null}
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
  leftSection: {
    width: 70,
  },
  time: {
    fontSize: 12,
    marginBottom: 2,
  },
  riderName: {
    fontSize: 14,
    fontWeight: "600",
  },
  middleSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  address: {
    fontSize: 12,
    flex: 1,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  fare: {
    fontSize: 16,
    fontWeight: "700",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
  },
});
