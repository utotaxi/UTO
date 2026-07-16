import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface RideRequestCardProps {
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  vias?: Array<{ address: string }>;
  /** Rider-requested vehicle type: saloon | people_carrier | minibus */
  rideRequestedType?: string;
  estimatedFare: number;
  pickupDistance: number;
  distanceMiles?: number;
  durationMinutes?: number;
  onAccept: () => void;
  onDecline: () => void;
}

function formatRideRequestedType(value?: string): string {
  const normalized = String(value || "saloon")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "people_carrier" || normalized === "peoplecarrier")
    return "People Carrier";
  if (normalized === "minibus" || normalized === "mini_bus") return "Minibus";
  return "Saloon";
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RideRequestCard({
  riderName,
  pickupAddress,
  dropoffAddress,
  vias = [],
  rideRequestedType,
  estimatedFare,
  pickupDistance,
  distanceMiles,
  durationMinutes,
  onAccept,
  onDecline,
}: RideRequestCardProps) {
  const { theme } = useTheme();
  const pulseScale = useSharedValue(1);
  const acceptScale = useSharedValue(1);
  const declineScale = useSharedValue(1);
  const hapticInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalDistance = (pickupDistance || 0) + (distanceMiles || 0);

  useEffect(() => {
    // Initial strong haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Repeating haptic every 2 seconds until accepted/declined
    hapticInterval.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 2000);

    pulseScale.value = withRepeat(
      withTiming(1.02, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    return () => {
      if (hapticInterval.current) {
        clearInterval(hapticInterval.current);
        hapticInterval.current = null;
      }
    };
  }, []);

  const stopHaptics = () => {
    if (hapticInterval.current) {
      clearInterval(hapticInterval.current);
      hapticInterval.current = null;
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const acceptAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: acceptScale.value }],
  }));

  const declineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: declineScale.value }],
  }));

  const handleAccept = () => {
    stopHaptics();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAccept();
  };

  const handleDecline = () => {
    stopHaptics();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDecline();
  };

  return (
    <AnimatedView
      style={[
        styles.container,
        Shadows.large,
        { backgroundColor: theme.backgroundDefault },
        containerStyle,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>New Ride Request</ThemedText>
        <ThemedText style={[styles.fare, { color: UTOColors.driver.primary }]}>
          £{estimatedFare.toFixed(2)}
        </ThemedText>
      </View>

      {/* Rider Info */}
      <View style={styles.riderSection}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="user" size={20} color={theme.textSecondary} />
        </View>
        <View style={styles.riderInfo}>
          <ThemedText style={styles.riderName}>{riderName}</ThemedText>
          <ThemedText
            style={[styles.pickupDistance, { color: theme.textSecondary }]}
          >
            Passenger
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.rideTypeRow,
          { backgroundColor: theme.backgroundSecondary || "#F8F9FA" },
        ]}
      >
        <MaterialIcons
          name="directions-car"
          size={16}
          color={UTOColors.driver.primary}
        />
        <ThemedText
          style={[styles.rideTypeLabel, { color: theme.textSecondary }]}
        >
          Ride requested type
        </ThemedText>
        <ThemedText style={styles.rideTypeValue}>
          {formatRideRequestedType(rideRequestedType)}
        </ThemedText>
      </View>

      {/* Route */}
      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
          <ThemedText style={styles.address} numberOfLines={1}>
            {pickupAddress}
          </ThemedText>
        </View>
        {vias.map((via, index) => (
          <React.Fragment key={`via-${index}-${via.address}`}>
            <View
              style={[styles.routeLine, { backgroundColor: theme.border }]}
            />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} />
              <ThemedText style={styles.address} numberOfLines={1}>
                Via {index + 1}: {via.address}
              </ThemedText>
            </View>
          </React.Fragment>
        ))}
        <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
        <View style={styles.routeRow}>
          <View
            style={[styles.dot, { backgroundColor: UTOColors.driver.primary }]}
          />
          <ThemedText style={styles.address} numberOfLines={1}>
            {dropoffAddress}
          </ThemedText>
        </View>
      </View>

      {/* Trip Distance Details */}
      <View
        style={[
          styles.distanceSection,
          { backgroundColor: theme.backgroundSecondary || "#F8F9FA" },
        ]}
      >
        <View style={styles.distanceRow}>
          <View style={styles.distanceItem}>
            <MaterialIcons
              name="my-location"
              size={14}
              color={UTOColors.success}
            />
            <ThemedText
              style={[styles.distanceLabel, { color: theme.textSecondary }]}
            >
              To pickup
            </ThemedText>
            <ThemedText style={styles.distanceValue}>
              {pickupDistance ? `${pickupDistance.toFixed(1)} mi` : "—"}
            </ThemedText>
          </View>

          <View
            style={[styles.distanceDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.distanceItem}>
            <MaterialIcons
              name="route"
              size={14}
              color={UTOColors.driver.primary}
            />
            <ThemedText
              style={[styles.distanceLabel, { color: theme.textSecondary }]}
            >
              Trip
            </ThemedText>
            <ThemedText style={styles.distanceValue}>
              {distanceMiles ? `${distanceMiles.toFixed(1)} mi` : "—"}
            </ThemedText>
          </View>

          <View
            style={[styles.distanceDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.distanceItem}>
            <MaterialIcons name="straighten" size={14} color="#6B7280" />
            <ThemedText
              style={[styles.distanceLabel, { color: theme.textSecondary }]}
            >
              Total
            </ThemedText>
            <ThemedText style={styles.distanceValue}>
              {totalDistance ? `${totalDistance.toFixed(1)} mi` : "—"}
            </ThemedText>
          </View>

          <View
            style={[styles.distanceDivider, { backgroundColor: theme.border }]}
          />

          <View style={styles.distanceItem}>
            <MaterialIcons name="schedule" size={14} color="#8B5CF6" />
            <ThemedText
              style={[styles.distanceLabel, { color: theme.textSecondary }]}
            >
              Est. time
            </ThemedText>
            <ThemedText style={styles.distanceValue}>
              {durationMinutes ? `${Math.round(durationMinutes)} min` : "—"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={handleDecline}
          onPressIn={() => (declineScale.value = withSpring(0.95))}
          onPressOut={() => (declineScale.value = withSpring(1))}
          style={[
            styles.button,
            styles.declineButton,
            { backgroundColor: theme.backgroundSecondary },
            declineAnimatedStyle,
          ]}
        >
          <Feather name="x" size={24} color={UTOColors.error} />
          <ThemedText style={[styles.buttonText, { color: UTOColors.error }]}>
            Decline
          </ThemedText>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleAccept}
          onPressIn={() => (acceptScale.value = withSpring(0.95))}
          onPressOut={() => (acceptScale.value = withSpring(1))}
          style={[
            styles.button,
            styles.acceptButton,
            { backgroundColor: UTOColors.driver.primary },
            acceptAnimatedStyle,
          ]}
        >
          <Feather name="check" size={24} color="#FFFFFF" />
          <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>
            Accept
          </ThemedText>
        </AnimatedPressable>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  fare: {
    fontSize: 22,
    fontWeight: "700",
  },
  riderSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  pickupDistance: {
    fontSize: 13,
  },
  rideTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  rideTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  rideTypeValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  routeSection: {
    marginBottom: Spacing.md,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  routeLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: 4,
  },
  address: {
    fontSize: 14,
    flex: 1,
  },
  distanceSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  distanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distanceItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  distanceDivider: {
    width: 1,
    height: 32,
  },
  distanceLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  distanceValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  declineButton: {},
  acceptButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
