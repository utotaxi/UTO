//client/components/RideCard.tsx
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
import {
  UTOColors,
  Spacing,
  BorderRadius,
  formatPrice,
} from "@/constants/theme";
import { Ride } from "@/context/RideContext";

interface RideCardProps {
  ride: Ride;
  onPress?: () => void;
  onRebook?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Server reasons that are internal codes get a rider-friendly wording;
 * anything else (rider/driver free text) is already readable and shown as-is. */
const CANCELLATION_REASON_LABELS: Record<string, string> = {
  no_drivers_available: "No drivers were available nearby",
  driver_cancelled_no_replacement: "Driver cancelled — no replacement found",
  stale_pending_auto_cancelled: "Request expired before a driver accepted",
};

const describeCancellationReason = (reason?: string): string | null => {
  const raw = (reason || "").trim();
  if (!raw) return null;
  return CANCELLATION_REASON_LABELS[raw] ?? raw;
};

export function RideCard({ ride, onPress, onRebook }: RideCardProps) {
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
      timeZone: "Europe/London",
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
        if (ride.cancelledBy === "driver") return "Cancelled by driver";
        if (ride.cancelledBy === "rider") return "Cancelled by rider";
        if (ride.cancelledBy === "system") return "Cancelled automatically";
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

  const cancellationLabel = describeCancellationReason(
    ride.cancellationReason,
  );
  const cancellationFee = Number(ride.cancellationFee || 0);

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
        <ThemedText
          style={[
            styles.date,
            { color: isDark ? "#9CA3AF" : theme.textSecondary },
          ]}
        >
          {formatDate(ride.createdAt)}
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor() + "20" },
          ]}
        >
          <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </ThemedText>
        </View>
      </View>

      {/* Why the ride ended — who cancelled comes from the status badge. */}
      {ride.status === "cancelled" && (cancellationLabel || cancellationFee > 0) && (
        <View style={styles.cancelDetail}>
          {cancellationLabel ? (
            <ThemedText
              style={[
                styles.cancelReason,
                { color: isDark ? "#9CA3AF" : theme.textSecondary },
              ]}
            >
              {cancellationLabel}
            </ThemedText>
          ) : null}
          {cancellationFee > 0 ? (
            <View style={styles.cancelFeeRow}>
              <Feather
                name="alert-circle"
                size={13}
                color={UTOColors.error}
              />
              <ThemedText style={[styles.cancelFee, { color: UTOColors.error }]}>
                {`Fee charged: £${cancellationFee.toFixed(2)}`}
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.routeContainer}>
        <View style={styles.routeIndicator}>
          <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
          <View
            style={[
              styles.line,
              { backgroundColor: isDark ? "#333333" : theme.border },
            ]}
          />
          <View style={[styles.dot, { backgroundColor: UTOColors.primary }]} />
        </View>
        <View style={styles.addresses}>
          <ThemedText
            style={[styles.address, { color: isDark ? "#FFFFFF" : theme.text }]}
            numberOfLines={1}
          >
            {ride.pickupLocation?.address}
          </ThemedText>
          <ThemedText
            style={[styles.address, { color: isDark ? "#FFFFFF" : theme.text }]}
            numberOfLines={1}
          >
            {ride.dropoffLocation?.address}
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {ride.driverName ? (
            <View style={styles.driverInfo}>
              <Feather
                name="user"
                size={14}
                color={isDark ? "#9CA3AF" : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.driverName,
                  { color: isDark ? "#9CA3AF" : theme.textSecondary },
                ]}
              >
                {ride.driverName}
              </ThemedText>
              {ride.driverRating ? (
                <>
                  <Feather name="star" size={12} color={UTOColors.warning} />
                  <ThemedText
                    style={[
                      styles.rating,
                      { color: isDark ? "#9CA3AF" : theme.textSecondary },
                    ]}
                  >
                    {ride.driverRating.toFixed(1)}
                  </ThemedText>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {onRebook &&
            (ride.status === "completed" || ride.status === "cancelled") && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onRebook();
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: UTOColors.primary + "20",
                  borderRadius: 12,
                }}
              >
                <ThemedText
                  style={{
                    color: UTOColors.primary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Rebook
                </ThemedText>
              </Pressable>
            )}
          <ThemedText
            style={[styles.price, { color: isDark ? "#FFFFFF" : theme.text }]}
          >
            {formatPrice(Number(ride.discountedFare ?? ride.farePrice ?? 0))}
          </ThemedText>
        </View>
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
  cancelDetail: {
    marginBottom: Spacing.md,
    gap: 4,
  },
  cancelReason: {
    fontSize: 13,
  },
  cancelFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cancelFee: {
    fontSize: 13,
    fontWeight: "600",
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
