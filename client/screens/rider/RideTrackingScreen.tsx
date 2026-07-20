//client/screens/rider/RideTrackingScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import {
  MapViewWrapper,
  MarkerWrapper,
  PolylineWrapper,
} from "@/components/MapView";
import { useTheme } from "@/hooks/useTheme";
import { useRide } from "@/context/RideContext";
import { useRiderTracking } from "@/hooks/useRealTimeTracking";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { RatingModal } from "@/components/RatingModal";
import {
  UTOColors,
  Spacing,
  BorderRadius,
  Shadows,
  formatPrice,
} from "@/constants/theme";

import { TopDownCarView } from "@/components/TopDownCarView";
import { DummyCars } from "@/components/DummyCars";
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function RideTrackingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const {
    activeRide,
    cancelRide,
    completeRide,
    updateRidePaymentMethod,
    pendingRating,
    submitRiderRating,
    dismissRiderRating,
  } = useRide();
  const { user } = useAuth();

  const { driverLocation, rideStatus } = useRiderTracking({
    riderId: user?.id || "",
    rideId: activeRide?.id,
  });

  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>(
    [],
  );
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [driverDistance, setDriverDistance] = useState<string | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(
    null,
  );
  /** Seconds left in the 1-minute free-cancel window after driver accept. */
  const [freeCancelSecondsLeft, setFreeCancelSecondsLeft] = useState<
    number | null
  >(null);
  /** Cancel confirmation sheet — shows live free-cancel countdown. */
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [noDriversAvailable, setNoDriversAvailable] = useState(false);
  const hasInitialized = useRef(false);
  /** Stable anchor for the free-cancel window (avoids resetting on re-renders). */
  const freeCancelAnchorRef = useRef<number | null>(null);

  const pulseScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);
  const timerPulse = useSharedValue(1);

  // Fetch route directions
  useEffect(() => {
    if (!activeRide) return;

    const fetchRoutes = async () => {
      setIsLoadingRoute(true);
      try {
        const apiUrl = getApiUrl();
        const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
        const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;
        const viaParam = (activeRide.vias || [])
          .filter(
            (v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude),
          )
          .map((v) => `${v.latitude},${v.longitude}`)
          .join("|");

        console.log("🚀 Fetching route...");
        const routeUrl = viaParam
          ? `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}&waypoints=${encodeURIComponent(viaParam)}`
          : `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`;
        const routeResponse = await fetch(new URL(routeUrl, apiUrl).toString());
        const routeData = await routeResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          if (route.decodedPolyline && route.decodedPolyline.length > 0) {
            console.log(
              "✅ ✅ ✅ ROUTE LOADED!",
              route.decodedPolyline.length,
              "points",
            );
            console.log("First point:", route.decodedPolyline[0]);
            console.log(
              "Last point:",
              route.decodedPolyline[route.decodedPolyline.length - 1],
            );
            setRouteCoordinates(route.decodedPolyline);
          } else {
            console.log("❌ No polyline in route");
          }
        } else {
          console.log("❌ No routes found");
        }
      } catch (error) {
        console.error("❌ Route fetch error:", error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoutes();
  }, [activeRide?.id]);

  // Fetch driver route to pickup
  const fetchDriverRoute = useCallback(async () => {
    if (!activeRide || !driverLocation) return;
    const setFallbackDriverEta = () => {
      const R = 3958.8;
      const dLat =
        ((activeRide.pickupLocation.latitude - driverLocation.latitude) *
          Math.PI) /
        180;
      const dLon =
        ((activeRide.pickupLocation.longitude - driverLocation.longitude) *
          Math.PI) /
        180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((driverLocation.latitude * Math.PI) / 180) *
        Math.cos((activeRide.pickupLocation.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const miles = R * c;
      const minutes = Math.max(1, Math.round(miles * 3));

      setDriverDistance(miles < 0.1 ? "Nearby" : `${miles.toFixed(1)} mi`);
      setEstimatedArrival(`${minutes} min`);
    };

    try {
      const apiUrl = getApiUrl();
      const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
      const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

      const response = await fetch(
        new URL(
          `/api/directions?origin=${driverPos}&destination=${pickup}`,
          apiUrl,
        ).toString(),
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.decodedPolyline) {
          setDriverToPickupRoute(route.decodedPolyline);
        }
        if (route.legs && route.legs[0]) {
          const durationText = route.legs[0].duration?.text;
          const distanceText = route.legs[0].distance?.text;
          if (durationText || distanceText) {
            setEstimatedArrival(durationText || null);
            setDriverDistance(distanceText || null);
          } else {
            setFallbackDriverEta();
          }
        } else {
          setFallbackDriverEta();
        }
      } else {
        setFallbackDriverEta();
      }
    } catch (error) {
      console.error("Failed to fetch driver route:", error);
      setFallbackDriverEta();
    }
  }, [
    activeRide?.id,
    activeRide?.pickupLocation.latitude,
    activeRide?.pickupLocation.longitude,
    driverLocation?.latitude,
    driverLocation?.longitude,
  ]);

  // Fetch driver route when location changes and status is accepted/arrived
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status === "accepted" || status === "arrived") {
      fetchDriverRoute();
    }
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    activeRide?.status,
    rideStatus,
    fetchDriverRoute,
  ]);

  // Periodic driver route refresh every 15 seconds for real-time ETA
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status !== "accepted" || !driverLocation) return;

    const interval = setInterval(() => {
      fetchDriverRoute();
    }, 15000);

    return () => clearInterval(interval);
  }, [
    rideStatus,
    activeRide?.status,
    driverLocation?.latitude,
    fetchDriverRoute,
  ]);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true,
    );
    hasInitialized.current = true;
  }, []);

  // ─── 1-minute free-cancel countdown after driver is assigned ───────────
  useEffect(() => {
    const status = String(rideStatus || activeRide?.status || "").toLowerCase();
    const driverAssigned = [
      "accepted",
      "arrived",
      "at_pickup",
      "arriving",
    ].includes(status);

    if (!driverAssigned) {
      freeCancelAnchorRef.current = null;
      setFreeCancelSecondsLeft(null);
      return;
    }

    const parsedAcceptedAt = activeRide?.acceptedAt
      ? new Date(activeRide.acceptedAt).getTime()
      : NaN;
    // Prefer the real accept timestamp from the server; only fall back to "now"
    // once so the countdown does not reset on every re-render.
    if (Number.isFinite(parsedAcceptedAt) && parsedAcceptedAt > 0) {
      freeCancelAnchorRef.current = parsedAcceptedAt;
    } else if (!freeCancelAnchorRef.current) {
      freeCancelAnchorRef.current = Date.now();
    }

    const FREE_CANCEL_MS = 60_000;
    const tick = () => {
      const anchor = freeCancelAnchorRef.current || Date.now();
      const remainingMs = FREE_CANCEL_MS - (Date.now() - anchor);
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setFreeCancelSecondsLeft(remainingSec > 0 ? remainingSec : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    rideStatus,
    activeRide?.status,
    activeRide?.acceptedAt,
    activeRide?.id,
  ]);

  // ─── 10-minute countdown timer when driver arrives ────────────────────
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status !== "arrived") {
      setWaitingSecondsLeft(null);
      return;
    }

    // Calculate remaining seconds from driverArrivedAt
    const WAIT_DURATION_SECONDS = 10 * 60; // 10 minutes
    let startTime: number;

    if (activeRide?.driverArrivedAt) {
      startTime = new Date(activeRide.driverArrivedAt).getTime();
    } else {
      // Fallback: start from now (if driverArrivedAt wasn't received)
      startTime = Date.now();
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, WAIT_DURATION_SECONDS - elapsed);
      setWaitingSecondsLeft(remaining);
      return remaining;
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [rideStatus, activeRide?.status, activeRide?.driverArrivedAt]);

  // Pulse animation for urgent timer (under 60 seconds)
  useEffect(() => {
    if (
      waitingSecondsLeft !== null &&
      waitingSecondsLeft <= 60 &&
      waitingSecondsLeft > 0
    ) {
      timerPulse.value = withRepeat(
        withTiming(1.05, { duration: 500 }),
        -1,
        true,
      );
    } else {
      timerPulse.value = 1;
    }
  }, [waitingSecondsLeft !== null && waitingSecondsLeft <= 60]);

  const timerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  // Track whether we've already navigated away to prevent double-navigation
  const hasNavigatedAway = useRef(false);

  // Navigate home helper - used by both activeRide null and rideStatus triggers
  const navigateHome = useCallback(() => {
    if (!hasNavigatedAway.current) {
      hasNavigatedAway.current = true;
      console.log("🏠 Navigating rider back to home screen");
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" as any }],
      });
    }
  }, [navigation]);

  // When activeRide becomes null due to cancellation, navigate home.
  // For completions, the rideStatus effect below handles navigation with a longer
  // delay to ensure pendingRating is set before the Home screen mounts.
  useEffect(() => {
    if (!activeRide && hasInitialized.current && !hasNavigatedAway.current) {
      // If this is a completion, let the rideStatus effect handle navigation
      if (rideStatus === "completed" || rideStatus === "payment_collected") {
        return;
      }
      // For cancellations and other cases, navigate after a short delay
      const timer = setTimeout(() => {
        navigateHome();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeRide, rideStatus, navigateHome]);

  // When the driver marks the trip as complete via socket, delay navigation slightly
  // so RideContext has time to set pendingRating before the Home screen mounts.
  // pendingRating is now set synchronously in RideContext, so 800ms is plenty.
  useEffect(() => {
    if (
      (rideStatus === "completed" || rideStatus === "payment_collected") &&
      !hasNavigatedAway.current
    ) {
      // DON'T navigate yet — wait for the rating modal to be dismissed.
      // The pendingRating effect below handles navigation after rating is done.
      return;
    }
    // Show rebook screen when no drivers available
    if (rideStatus === "cancelled_no_drivers") {
      setNoDriversAvailable(true);
    }
    // Handle no-show cancellation — show alert with charge info, then navigate home
    if (rideStatus === "cancelled_no_show" && !hasNavigatedAway.current) {
      const fullFare =
        (activeRide as any)?.estimatedPrice || activeRide?.farePrice || 0;
      const discount = Math.max(0, Number(activeRide?.discountAmount || 0));
      const fareAmount = Math.max(0, Number(fullFare) - discount);
      Alert.alert(
        "No-Show – Ride Cancelled",
        fareAmount > 0
          ? `You did not show up within the required waiting time. A no-show fee of £${fareAmount.toFixed(2)} has been charged to your payment method.`
          : "You did not show up within the required waiting time. The ride has been cancelled.",
        [{ text: "OK", onPress: () => navigateHome() }],
      );
      return;
    }
  }, [rideStatus, navigateHome]);

  // Navigate home ONLY after the rider has submitted or skipped the rating
  const rideIsOver =
    rideStatus === "completed" || rideStatus === "payment_collected";
  useEffect(() => {
    if (rideIsOver && !pendingRating && !hasNavigatedAway.current) {
      // pendingRating is null → user submitted or skipped rating. Navigate home now.
      navigateHome();
    }
  }, [rideIsOver, pendingRating, navigateHome]);

  // Wrapped callbacks: navigate home first, THEN clear the rating state
  const handleRatingSubmit = useCallback(
    (rideId: string, rating: number, comment?: string) => {
      navigateHome();
      submitRiderRating(rideId, rating, comment);
    },
    [navigateHome, submitRiderRating],
  );

  const handleRatingDismiss = useCallback(() => {
    navigateHome();
    dismissRiderRating();
  }, [navigateHome, dismissRiderRating]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  const handleRebook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNoDriversAvailable(false);
    hasNavigatedAway.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" as any }],
    });
  };

  const handleCancel = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
    // Open confirmation modal so the free-cancel countdown is visible live.
    setShowCancelModal(true);
  };

  const getCancelFeeState = () => {
    // 1 free minute from the moment a driver is assigned; after that, full payable fare.
    const status = String(
      rideStatus || activeRide?.status || "",
    ).toLowerCase();
    const acceptedAtMs =
      freeCancelAnchorRef.current ||
      (activeRide?.acceptedAt
        ? new Date(activeRide.acceptedAt).getTime()
        : 0);
    const driverAssigned = [
      "accepted",
      "arriving",
      "arrived",
      "at_pickup",
      "in_progress",
    ].includes(status);
    const withinFreeMinute =
      driverAssigned &&
      freeCancelSecondsLeft != null &&
      freeCancelSecondsLeft > 0;
    const freeSecondsRemaining = withinFreeMinute
      ? freeCancelSecondsLeft
      : driverAssigned &&
          Number.isFinite(acceptedAtMs) &&
          acceptedAtMs > 0 &&
          Date.now() - acceptedAtMs < 60_000
        ? Math.max(1, Math.ceil((60_000 - (Date.now() - acceptedAtMs)) / 1000))
        : 0;
    const fullFare = Number(
      (activeRide as any)?.estimatedPrice || activeRide?.farePrice || 0,
    );
    const discount = Math.max(0, Number(activeRide?.discountAmount || 0));
    const fareAmount = Math.max(0, Number((fullFare - discount).toFixed(2)));
    // Only charge once we know the free window has ended. If the countdown
    // has not started yet (just assigned), treat cancel as free in the UI.
    const freeWindowSettled =
      freeCancelSecondsLeft != null ||
      (Number.isFinite(acceptedAtMs) && acceptedAtMs > 0);
    const cancellationFeeApplies =
      fareAmount > 0 &&
      driverAssigned &&
      freeWindowSettled &&
      freeSecondsRemaining <= 0;

    return {
      driverAssigned,
      freeSecondsRemaining,
      fareAmount,
      cancellationFeeApplies,
    };
  };

  const confirmCancelRide = () => {
    if (!activeRide) {
      setShowCancelModal(false);
      return;
    }
    const { cancellationFeeApplies } = getCancelFeeState();
    setShowCancelModal(false);
    try {
      cancelRide(activeRide.id, cancellationFeeApplies);
    } catch (e) {
      console.error("Cancel ride error:", e);
      navigateHome();
    }
  };

  const getDialablePhone = (rawPhone?: string) => {
    if (!rawPhone) return "";
    return rawPhone.replace(/[^\d+]/g, "");
  };

  const handleCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const driverPhone = getDialablePhone(activeRide?.driverPhone);
    if (!driverPhone) {
      Alert.alert("No Phone", "Driver phone not available.");
      return;
    }

    const telUrl = `tel:${driverPhone}`;
    try {
      const canCall = await Linking.canOpenURL(telUrl);
      if (canCall) {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert(
          "Call Failed",
          "Unable to open phone dialer for this number.",
        );
      }
    } catch {
      Alert.alert("Call Failed", "Unable to call the driver right now.");
    }
  };

  const handleMessage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const driverPhone = getDialablePhone(activeRide?.driverPhone);
    if (!driverPhone) {
      Alert.alert("No Phone", "Driver phone not available.");
      return;
    }

    const smsUrl = `sms:${driverPhone}`;
    try {
      const canMessage = await Linking.canOpenURL(smsUrl);
      if (canMessage) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert(
          "Message Failed",
          "Unable to open messaging for this number.",
        );
      }
    } catch {
      Alert.alert("Message Failed", "Unable to message the driver right now.");
    }
  };

  //   // If no drivers available and ride has been cancelled, show standalone rebook UI
  //   if (noDriversAvailable && !activeRide) {
  //     return (
  //       <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
  //         <View style={[styles.noDriversIcon, { backgroundColor: UTOColors.warning + '20' }]}>
  //           <MaterialIcons name="no-transfer" size={36} color={UTOColors.warning} />
  //         </View>
  //         <ThemedText style={[styles.noDriversTitle, { color: theme.text, marginTop: Spacing.lg }]}>
  //           No Drivers Available
  //         </ThemedText>
  //         <ThemedText style={[styles.noDriversMessage, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
  //           Unfortunately we don't have any available drivers at the moment. Please try again shortly.
  //         </ThemedText>
  //         <Pressable
  //           onPress={() => handleRebook()}
  //           style={[styles.rebookButton, { backgroundColor: UTOColors.rider.primary, marginTop: Spacing.xl }]}
  //         >
  //           <MaterialIcons name="refresh" size={20} color="#000" />
  //           <ThemedText style={styles.rebookButtonText}>Rebook Ride</ThemedText>
  //         </Pressable>
  //       </View>
  //     );
  //   }

  //   // When ride is complete and activeRide is cleared, show Rating Modal
  //   // instead of returning null. This ensures the modal stays visible.
  //   if (!activeRide) {
  //     if (pendingRating) {
  //       return (
  //         <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: 'center', alignItems: 'center' }]}>
  //           <RatingModal
  //             visible={true}
  //             ratedRole="driver"
  //             ratedName={pendingRating.driverName || "Driver"}
  //             rideId={pendingRating.rideId || ""}
  //             onSubmit={handleRatingSubmit}
  //             onDismiss={handleRatingDismiss}
  //           />
  //         </View>
  //       );
  //     }
  //     // Show a brief transition screen instead of null to avoid crash
  //     return (
  //       <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: 'center', alignItems: 'center' }]} />
  //     );
  //   }

  //   const getStatusMessage = () => {
  //     const status = rideStatus || activeRide.status;
  //     switch (status) {
  //       case "pending":
  //         return "Finding your driver...";
  //       case "accepted":
  //         return "Driver is on the way";
  //       case "arrived":
  //         return "Driver has arrived";
  //       case "in_progress":
  //         return "On your way to destination";
  //       default:
  //         return "Processing ride...";
  //     }
  //   };

  //   const getDropoffTime = () => {
  //     if (!activeRide) return "";
  //     const now = new Date();
  //     const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
  //     return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  //   };

  //   // ✅ ULTRA CLOSE ZOOM
  //   const getMapRegion = () => {
  //     const points: RoutePoint[] = [
  //       {
  //         latitude: activeRide.pickupLocation.latitude,
  //         longitude: activeRide.pickupLocation.longitude,
  //       },
  //       {
  //         latitude: activeRide.dropoffLocation.latitude,
  //         longitude: activeRide.dropoffLocation.longitude,
  //       },
  //     ];

  //     if (driverLocation) {
  //       points.push({
  //         latitude: driverLocation.latitude,
  //         longitude: driverLocation.longitude,
  //       });
  //     }

  //     const lats = points.map((p) => p.latitude);
  //     const lngs = points.map((p) => p.longitude);

  //     const minLat = Math.min(...lats);
  //     const maxLat = Math.max(...lats);
  //     const minLng = Math.min(...lngs);
  //     const maxLng = Math.max(...lngs);

  //     const centerLat = (minLat + maxLat) / 2;
  //     const centerLng = (minLng + maxLng) / 2;

  //     const latDelta = Math.max((maxLat - minLat) * 1.05, 0.02);
  //     const lngDelta = Math.max((maxLng - minLng) * 1.05, 0.02);

  //     return {
  //       latitude: centerLat,
  //       longitude: centerLng,
  //       latitudeDelta: latDelta,
  //       longitudeDelta: lngDelta,
  //     };
  //   };

  //   const getDistanceString = () => {
  //     if (driverDistance) return driverDistance.replace("mi", "miles");

  //     // Fallback if APIs fail
  //     if (!driverLocation || !activeRide) return null;
  //     const R = 3958.8;
  //     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
  //     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
  //     const a =
  //       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) *
  //       Math.sin(dLon / 2) * Math.sin(dLon / 2);
  //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //     const miles = R * c;

  //     if (miles < 0.1) return "Nearby";
  //     return `${miles.toFixed(1)} miles`;
  //   };

  //   const currentDriverLocation = driverLocation || {
  //     latitude: activeRide.pickupLocation.latitude + 0.005,
  //     longitude: activeRide.pickupLocation.longitude + 0.003,
  //   };

  //   const currentStatus = rideStatus || activeRide.status;

  //   return (
  //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
  //       <MapViewWrapper
  //         style={styles.map}
  //         initialRegion={getMapRegion()}
  //         region={getMapRegion()}
  //         customMapStyle={isDark ? darkMapStyle : []}
  //       >
  //         {routeCoordinates.length > 0 && (
  //           <PolylineWrapper
  //             coordinates={routeCoordinates}
  //             strokeColor="#000000"
  //             strokeWidth={5}
  //           />
  //         )}

  //         {/* Driver-to-pickup route — shows driver moving toward rider */}
  //         {driverToPickupRoute.length > 0 && (currentStatus === "accepted" || currentStatus === "arrived") && (
  //           <PolylineWrapper
  //             coordinates={driverToPickupRoute}
  //             strokeColor={UTOColors.rider.primary}
  //             strokeWidth={4}
  //             lineDashPattern={[10, 6]}
  //           />
  //         )}

  //         {/* Dummy cars show when finding a driver */}
  //         {currentStatus === "pending" && (
  //           <DummyCars location={activeRide.pickupLocation} />
  //         )}

  //         {/* Pickup marker */}
  //         <MarkerWrapper
  //           coordinate={{
  //             latitude: activeRide.pickupLocation.latitude,
  //             longitude: activeRide.pickupLocation.longitude,
  //           }}
  //           title="Pickup"
  //         >
  //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
  //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
  //           </View>
  //         </MarkerWrapper>

  //         {/* Dropoff marker */}
  //         <MarkerWrapper
  //           coordinate={{
  //             latitude: activeRide.dropoffLocation.latitude,
  //             longitude: activeRide.dropoffLocation.longitude,
  //           }}
  //           title="Dropoff"
  //         >
  //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.error }]}>
  //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
  //           </View>
  //         </MarkerWrapper>

  //         {/* Driver marker */}
  //         <MarkerWrapper
  //           coordinate={currentDriverLocation}
  //           title="Driver"
  //           anchor={{ x: 0.5, y: 0.5 }}
  //           flat
  //         >
  //           <View style={{ transform: [{ rotate: `${driverLocation?.heading || 0}deg` }] }}>
  //             <TopDownCarView />
  //           </View>
  //         </MarkerWrapper>
  //       </MapViewWrapper>

  //       {isLoadingRoute && (
  //         <View style={styles.loadingOverlay}>
  //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
  //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
  //         </View>
  //       )}

  //       <Animated.View
  //         entering={FadeIn}
  //         style={[
  //           styles.bottomSheet,
  //           Shadows.large,
  //           {
  //             paddingBottom: insets.bottom + Spacing.lg,
  //             backgroundColor: theme.backgroundRoot,
  //             maxHeight: Dimensions.get('window').height * 0.7,
  //           },
  //         ]}
  //       >
  //         <ScrollView
  //           showsVerticalScrollIndicator={false}
  //           bounces={false}
  //           contentContainerStyle={{ paddingBottom: 4 }}
  //         >
  //           <View style={styles.statusSection}>
  //             <View style={styles.statusRow}>
  //               <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
  //               <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
  //             </View>

  //             {currentStatus === "accepted" && (
  //               <View style={styles.etaRow}>
  //                 <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
  //                   {estimatedArrival ? `${estimatedArrival} away` : "Calculating ETA..."}
  //                 </ThemedText>
  //                 {getDistanceString() && (
  //                   <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
  //                     • {getDistanceString()}
  //                   </ThemedText>
  //                 )}
  //               </View>
  //             )}
  //             {currentStatus === "in_progress" && (
  //               <View style={styles.etaRow}>
  //                 <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
  //                   {`${activeRide.durationMinutes} min`} to destination
  //                 </ThemedText>
  //               </View>
  //             )}
  //             {currentStatus === "in_progress" && (
  //               <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
  //                 Estimated dropoff: {getDropoffTime()}
  //               </ThemedText>
  //             )}
  //           </View>

  //           {/* ─── Ride Stage Progress Stepper ──────────────────────────── */}
  //           {currentStatus !== "pending" && (
  //             <View style={styles.stageStepper}>
  //               {[
  //                 { key: "accepted", label: "Driver assigned", icon: "person" as const },
  //                 { key: "on_way", label: "On the way", icon: "directions-car" as const },
  //                 { key: "arrived", label: "Arrived", icon: "place" as const },
  //                 { key: "in_progress", label: "Ride started", icon: "navigation" as const },
  //               ].map((stage, index) => {
  //                 const stageOrder = ["accepted", "on_way", "arrived", "in_progress"];
  //                 const currentIdx = currentStatus === "accepted" ? 1 : stageOrder.indexOf(currentStatus);
  //                 const isActive = index <= currentIdx;
  //                 const isCurrent = (currentStatus === "accepted" && index <= 1) || (index === currentIdx);
  //                 return (
  //                   <React.Fragment key={stage.key}>
  //                     <View style={styles.stageItem}>
  //                       <View style={[
  //                         styles.stageCircle,
  //                         {
  //                           backgroundColor: isActive ? UTOColors.rider.primary : theme.backgroundSecondary,
  //                           borderColor: isActive ? UTOColors.rider.primary : theme.border
  //                         },
  //                       ]}>
  //                         <MaterialIcons name={stage.icon} size={12} color={isActive ? "#000" : theme.textSecondary} />
  //                       </View>
  //                       <ThemedText style={[
  //                         styles.stageLabel,
  //                         {
  //                           color: isActive ? theme.text : theme.textSecondary,
  //                           fontWeight: isCurrent ? "700" : "400"
  //                         },
  //                       ]}>{stage.label}</ThemedText>
  //                     </View>
  //                     {index < 3 && (
  //                       <View style={[
  //                         styles.stageLine,
  //                         { backgroundColor: index < currentIdx ? UTOColors.rider.primary : theme.border },
  //                       ]} />
  //                     )}
  //                   </React.Fragment>
  //                 );
  //               })}
  //             </View>
  //           )}

  //           {/* ─── Prominent Arrival + PIN Message ──────────────────────── */}
  //           {currentStatus === "arrived" && activeRide.otp && (
  //             <AnimatedView
  //               entering={FadeIn.duration(500)}
  //               style={[
  //                 styles.arrivalCallout,
  //                 { backgroundColor: UTOColors.rider.primary },
  //               ]}
  //             >
  //               <MaterialIcons name="check-circle" size={28} color="#000" />
  //               <ThemedText style={styles.arrivalTitle}>Your driver has arrived</ThemedText>
  //               <ThemedText style={styles.arrivalSubtitle}>Please provide your PIN to start the ride</ThemedText>
  //               <View style={styles.arrivalOtpBox}>
  //                 {activeRide.otp.split("").map((digit, i) => (
  //                   <View key={i} style={styles.arrivalOtpDigit}>
  //                     <ThemedText style={styles.arrivalOtpText}>{digit}</ThemedText>
  //                   </View>
  //                 ))}
  //               </View>
  //             </AnimatedView>
  //           )}

  //           {/* ─── Waiting Timer when driver has arrived ───────────────── */}
  //           {currentStatus === "arrived" && waitingSecondsLeft !== null && (
  //             <AnimatedView
  //               entering={FadeIn.duration(400)}
  //               style={[
  //                 styles.waitingTimerContainer,
  //                 {
  //                   backgroundColor: waitingSecondsLeft <= 120
  //                     ? (waitingSecondsLeft <= 60 ? '#EF4444' + '20' : '#F59E0B' + '20')
  //                     : theme.backgroundDefault,
  //                   borderColor: waitingSecondsLeft <= 120
  //                     ? (waitingSecondsLeft <= 60 ? '#EF4444' + '40' : '#F59E0B' + '40')
  //                     : theme.border,
  //                 },
  //                 waitingSecondsLeft <= 60 ? timerPulseStyle : {},
  //               ]}
  //             >
  //               <View style={styles.waitingTimerHeader}>
  //                 <MaterialIcons
  //                   name="timer"
  //                   size={22}
  //                   color={waitingSecondsLeft <= 120
  //                     ? (waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B')
  //                     : UTOColors.rider.primary}
  //                 />
  //                 <ThemedText style={[
  //                   styles.waitingTimerTitle,
  //                   waitingSecondsLeft <= 120 && {
  //                     color: waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B',
  //                   },
  //                 ]}>
  //                   Driver is waiting
  //                 </ThemedText>
  //               </View>
  //               <ThemedText style={[
  //                 styles.waitingTimerDigits,
  //                 {
  //                   color: waitingSecondsLeft <= 120
  //                     ? (waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B')
  //                     : theme.text,
  //                 },
  //               ]}>
  //                 {`${Math.floor(waitingSecondsLeft / 60).toString().padStart(2, '0')}:${(waitingSecondsLeft % 60).toString().padStart(2, '0')}`}
  //               </ThemedText>
  //               <ThemedText style={[styles.waitingTimerWarning, { color: theme.textSecondary }]}>
  //                 {waitingSecondsLeft <= 60
  //                   ? 'Hurry! Ride will be auto-cancelled with a fee'
  //                   : waitingSecondsLeft <= 120
  //                     ? 'Less than 2 min left — please board now'
  //                     : 'Please board within the time or ride will be cancelled with a fee'}
  //               </ThemedText>
  //             </AnimatedView>
  //           )}

  //           {currentStatus === "pending" && (
  //             <View style={styles.searchingContainer}>
  //               <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
  //                 <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
  //                   <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
  //                   <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
  //                     <MaterialIcons name="local-taxi" size={20} color="#000" />
  //                   </View>
  //                 </View>
  //               </View>
  //               <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
  //                 Matching you with a nearby driver
  //               </ThemedText>
  //             </View>
  //           )}

  //           {currentStatus !== "pending" && (
  //             <>
  //               {currentStatus === "accepted" && activeRide.otp && (
  //                 <View style={[styles.otpContainer, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]}>
  //                   <ThemedText style={[styles.otpLabel, { color: theme.text }]}>
  //                     Your ride PIN — share with driver on arrival
  //                   </ThemedText>
  //                   <View style={styles.otpBox}>
  //                     {activeRide.otp.split("").map((digit, i) => (
  //                       <View key={i} style={[styles.otpDigit, { backgroundColor: theme.backgroundSecondary }]}>
  //                         <ThemedText style={[styles.otpText, { color: theme.text }]}>{digit}</ThemedText>
  //                       </View>
  //                     ))}
  //                   </View>
  //                 </View>
  //               )}

  //               <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
  //                 <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
  //                   <MaterialIcons name="person" size={24} color={theme.textSecondary} />
  //                 </View>
  //                 <View style={styles.driverInfo}>
  //                   <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
  //                   <View style={styles.vehicleRow}>
  //                     <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
  //                       {activeRide.vehicleInfo}
  //                     </ThemedText>
  //                     <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
  //                       <MaterialIcons name="star" size={12} color={UTOColors.warning} />
  //                       <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
  //                         {activeRide.driverRating?.toFixed(1)}
  //                       </ThemedText>
  //                     </View>
  //                   </View>
  //                   <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
  //                     {activeRide.licensePlate}
  //                   </ThemedText>
  //                 </View>
  //                 <View style={styles.contactButtons}>
  //                   <Pressable
  //                     onPress={handleCall}
  //                     style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
  //                   >
  //                     <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
  //                   </Pressable>
  //                   <Pressable
  //                     onPress={handleMessage}
  //                     style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
  //                   >
  //                     <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
  //                   </Pressable>
  //                 </View>
  //               </View>
  //             </>
  //           )}

  //           <View style={styles.tripDetails}>
  //             <View style={styles.routeContainer}>
  //               <View style={styles.routeIndicator}>
  //                 <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
  //                 <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
  //                 <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
  //               </View>
  //               <View style={styles.addresses}>
  //                 <ThemedText style={styles.address} numberOfLines={1}>
  //                   {activeRide.pickupLocation.address}
  //                 </ThemedText>
  //                 <ThemedText style={styles.address} numberOfLines={1}>
  //                   {activeRide.dropoffLocation.address}
  //                 </ThemedText>
  //               </View>
  //               <ThemedText style={styles.farePrice}>
  //                 {formatPrice(activeRide.farePrice)}
  //               </ThemedText>
  //             </View>

  //             {currentStatus !== "completed" && (
  //               <Pressable style={styles.paymentSwitchButton} onPress={() => {
  //                 if (!activeRide) return;
  //                 const currentMethod = activeRide.paymentMethod || "cash";
  //                 const newMethod = currentMethod === "card" ? "cash" : "card";
  //                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //                 if (typeof updateRidePaymentMethod === 'function') {
  //                   updateRidePaymentMethod(activeRide.id, newMethod);
  //                 }
  //               }}>
  //                 <View style={styles.paymentSwitchRow}>
  //                   <MaterialIcons
  //                     name={activeRide.paymentMethod === 'card' ? 'credit-card' : 'payments'}
  //                     size={18}
  //                     color={theme.textSecondary}
  //                   />
  //                   <ThemedText style={{ color: theme.textSecondary, marginLeft: 8 }}>
  //                     Paying with {activeRide.paymentMethod === 'card' ? 'Card' : 'Cash'}
  //                   </ThemedText>
  //                 </View>
  //                 <ThemedText style={{ color: UTOColors.rider.primary, fontWeight: '600' }}>Change</ThemedText>
  //               </Pressable>
  //             )}
  //           </View>

  //           {(currentStatus === "pending" || currentStatus === "accepted" || currentStatus === "at_pickup" || currentStatus === "arrived") && !noDriversAvailable && (
  //             <AnimatedPressable
  //               onPress={handleCancel}
  //               onPressIn={() => (cancelScale.value = withSpring(0.98))}
  //               onPressOut={() => (cancelScale.value = withSpring(1))}
  //               style={[
  //                 styles.cancelButton,
  //                 { backgroundColor: UTOColors.error + "15" },
  //                 cancelAnimatedStyle,
  //               ]}
  //             >
  //               <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
  //                 Cancel Ride
  //               </ThemedText>
  //             </AnimatedPressable>
  //           )}

  //           {/* ─── No Drivers Available — Rebook ─────────────────────────── */}
  //           {noDriversAvailable && (
  //             <AnimatedView entering={FadeIn.duration(400)} style={styles.noDriversContainer}>
  //               <View style={[styles.noDriversIcon, { backgroundColor: UTOColors.warning + '20' }]}>
  //                 <MaterialIcons name="no-transfer" size={36} color={UTOColors.warning} />
  //               </View>
  //               <ThemedText style={[styles.noDriversTitle, { color: theme.text }]}>
  //                 No Drivers Available
  //               </ThemedText>
  //               <ThemedText style={[styles.noDriversMessage, { color: theme.textSecondary }]}>
  //                 Unfortunately we don't have any available drivers at the moment. Please try again shortly.
  //               </ThemedText>
  //               <Pressable
  //                 onPress={() => handleRebook()}
  //                 style={[styles.rebookButton, { backgroundColor: UTOColors.rider.primary }]}
  //               >
  //                 <MaterialIcons name="refresh" size={20} color="#000" />
  //                 <ThemedText style={styles.rebookButtonText}>Rebook Ride</ThemedText>
  //               </Pressable>
  //             </AnimatedView>
  //           )}
  //         </ScrollView>
  //       </Animated.View>
  //     </View>
  //   );
  // }

  // const styles = StyleSheet.create({
  //   container: { flex: 1 },
  //   map: { flex: 1 },
  //   loadingOverlay: {
  //     position: "absolute",
  //     top: 60,
  //     alignSelf: "center",
  //     backgroundColor: "rgba(0,0,0,0.7)",
  //     paddingHorizontal: Spacing.lg,
  //     paddingVertical: Spacing.sm,
  //     borderRadius: BorderRadius.full,
  //     flexDirection: "row",
  //     alignItems: "center",
  //     gap: Spacing.sm,
  //   },
  //   loadingText: { color: "#FFFFFF", fontSize: 12 },
  //   markerContainer: {
  //     width: 36,
  //     height: 36,
  //     borderRadius: 18,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     borderWidth: 2,
  //     borderColor: "#FFFFFF",
  //   },
  //   driverMarkerContainer: {
  //     width: 50,
  //     height: 50,
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   driverPulse: {
  //     position: "absolute",
  //     width: 50,
  //     height: 50,
  //     borderRadius: 25,
  //   },
  //   driverMarker: {
  //     width: 36,
  //     height: 36,
  //     borderRadius: 18,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     borderWidth: 3,
  //     borderColor: "#FFFFFF",
  //   },
  //   bottomSheet: {
  //     position: "absolute",
  //     bottom: 0,
  //     left: 0,
  //     right: 0,
  //     paddingHorizontal: Spacing.lg,
  //     paddingTop: Spacing.xl,
  //     borderTopLeftRadius: BorderRadius.xl,
  //     borderTopRightRadius: BorderRadius.xl,
  //   },
  //   statusSection: { marginBottom: Spacing.lg },
  //   statusRow: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     marginBottom: 4,
  //   },
  //   statusDot: {
  //     width: 10,
  //     height: 10,
  //     borderRadius: 5,
  //     marginRight: Spacing.sm,
  //   },
  //   statusText: { fontSize: 18, fontWeight: "600" },
  //   eta: { fontSize: 14 },
  //   etaRow: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     marginLeft: 18,
  //     gap: 4,
  //   },
  //   distance: { fontSize: 14 },
  //   driverCard: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     padding: Spacing.lg,
  //     borderRadius: BorderRadius.lg,
  //     marginBottom: Spacing.lg,
  //   },
  //   driverAvatar: {
  //     width: 50,
  //     height: 50,
  //     borderRadius: 25,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     marginRight: Spacing.md,
  //   },
  //   driverInfo: { flex: 1 },
  //   driverName: {
  //     fontSize: 16,
  //     fontWeight: "600",
  //     marginBottom: 2,
  //   },
  //   vehicleRow: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     gap: Spacing.sm,
  //     marginBottom: 2,
  //   },
  //   vehicleInfo: { fontSize: 13 },
  //   ratingBadge: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     paddingHorizontal: 6,
  //     paddingVertical: 2,
  //     borderRadius: BorderRadius.full,
  //     gap: 4,
  //   },
  //   rating: { fontSize: 11, fontWeight: "600" },
  //   licensePlate: {
  //     fontSize: 14,
  //     fontWeight: "700",
  //     letterSpacing: 1,
  //   },
  //   contactButtons: {
  //     flexDirection: "row",
  //     gap: Spacing.sm,
  //   },
  //   contactButton: {
  //     width: 40,
  //     height: 40,
  //     borderRadius: 20,
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   tripDetails: { marginBottom: Spacing.lg },
  //   routeContainer: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //   },
  //   routeIndicator: {
  //     width: 20,
  //     alignItems: "center",
  //     marginRight: Spacing.md,
  //   },
  //   routeDot: {
  //     width: 10,
  //     height: 10,
  //     borderRadius: 5,
  //   },
  //   routeLine: {
  //     width: 2,
  //     height: 24,
  //     marginVertical: 4,
  //   },
  //   paymentSwitchButton: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     justifyContent: 'space-between',
  //     marginTop: Spacing.md,
  //     paddingTop: Spacing.md,
  //     borderTopWidth: 1,
  //     borderTopColor: '#33333333',
  //   },
  //   paymentSwitchRow: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //   },
  //   addresses: {
  //     flex: 1,
  //     justifyContent: "space-between",
  //     height: 48,
  //   },
  //   address: { fontSize: 14 },
  //   farePrice: {
  //     fontSize: 20,
  //     fontWeight: "700",
  //     marginLeft: Spacing.md,
  //   },
  //   otpContainer: {
  //     padding: Spacing.md,
  //     borderRadius: BorderRadius.lg,
  //     marginBottom: Spacing.lg,
  //     alignItems: "center",
  //   },
  //   otpLabel: {
  //     color: "#000000",
  //     fontSize: 14,
  //     fontWeight: "600",
  //     marginBottom: Spacing.sm,
  //   },
  //   otpBox: {
  //     flexDirection: "row",
  //     gap: Spacing.sm,
  //   },
  //   otpDigit: {
  //     width: 32,
  //     height: 40,
  //     borderRadius: BorderRadius.md,
  //     backgroundColor: "#FFFFFF",
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   otpText: {
  //     fontSize: 20,
  //     fontWeight: "700",
  //     color: "#000000",
  //   },
  //   cancelButton: {
  //     width: "100%",
  //     padding: Spacing.lg,
  //     borderRadius: BorderRadius.lg,
  //     alignItems: "center",
  //   },
  //   cancelButtonText: {
  //     fontSize: 16,
  //     fontWeight: "600",
  //   },
  //   dropoffTime: {
  //     fontSize: 14,
  //     marginTop: 2,
  //   },
  //   searchingContainer: {
  //     alignItems: "center",
  //     paddingVertical: Spacing.lg,
  //     marginBottom: Spacing.md,
  //   },
  //   searchingRing: {
  //     width: 80,
  //     height: 80,
  //     borderRadius: 40,
  //     borderWidth: 2,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     marginBottom: Spacing.md,
  //   },
  //   searchingRingInner: {
  //     width: 60,
  //     height: 60,
  //     borderRadius: 30,
  //     borderWidth: 2,
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   searchingPulse: {
  //     position: "absolute",
  //     width: 44,
  //     height: 44,
  //     borderRadius: 22,
  //   },
  //   searchingDot: {
  //     width: 40,
  //     height: 40,
  //     borderRadius: 20,
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   searchingText: {
  //     fontSize: 14,
  //     textAlign: "center",
  //   },
  //   // ─── Waiting Timer Styles ─────────────────────────────
  //   waitingTimerContainer: {
  //     borderRadius: 16,
  //     borderWidth: 1,
  //     padding: 16,
  //     marginBottom: 16,
  //     alignItems: "center",
  //   },
  //   waitingTimerHeader: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     gap: 8,
  //     marginBottom: 8,
  //   },
  //   waitingTimerTitle: {
  //     fontSize: 15,
  //     fontWeight: "600",
  //   },
  //   waitingTimerDigits: {
  //     fontSize: 42,
  //     fontWeight: "800",
  //     fontVariant: ["tabular-nums"] as any,
  //     letterSpacing: 2,
  //     marginVertical: 4,
  //     lineHeight: 50,
  //     includeFontPadding: false,
  //   },
  //   waitingTimerWarning: {
  //     fontSize: 12,
  //     textAlign: "center",
  //     marginTop: 4,
  //   },
  //   // ─── Ride Stage Stepper Styles ──────────────────────────
  //   stageStepper: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     justifyContent: "center",
  //     marginBottom: Spacing.lg,
  //     paddingHorizontal: Spacing.sm,
  //   },
  //   stageItem: {
  //     alignItems: "center",
  //     gap: 4,
  //   },
  //   stageCircle: {
  //     width: 28,
  //     height: 28,
  //     borderRadius: 14,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     borderWidth: 2,
  //   },
  //   stageLabel: {
  //     fontSize: 9,
  //     textAlign: "center",
  //     maxWidth: 60,
  //   },
  //   stageLine: {
  //     height: 2,
  //     width: 20,
  //     marginHorizontal: 2,
  //     marginBottom: 16,
  //   },
  //   // ─── Arrival Callout Styles ─────────────────────────────
  //   arrivalCallout: {
  //     borderRadius: BorderRadius.lg,
  //     padding: Spacing.lg,
  //     marginBottom: Spacing.lg,
  //     alignItems: "center",
  //     gap: 6,
  //   },
  //   arrivalTitle: {
  //     fontSize: 18,
  //     fontWeight: "700",
  //     color: "#000000",
  //   },
  //   arrivalSubtitle: {
  //     fontSize: 14,
  //     color: "#000000",
  //     opacity: 0.7,
  //   },
  //   arrivalOtpBox: {
  //     flexDirection: "row",
  //     gap: Spacing.sm,
  //     marginTop: Spacing.sm,
  //   },
  //   arrivalOtpDigit: {
  //     width: 44,
  //     height: 52,
  //     borderRadius: BorderRadius.md,
  //     backgroundColor: "#FFFFFF",
  //     alignItems: "center",
  //     justifyContent: "center",
  //   },
  //   arrivalOtpText: {
  //     fontSize: 24,
  //     fontWeight: "800",
  //     color: "#000000",
  //   },
  //   // ─── No Drivers / Rebook Styles ─────────────────────────
  //   noDriversContainer: {
  //     alignItems: "center",
  //     paddingVertical: Spacing.xl,
  //     gap: Spacing.md,
  //   },
  //   noDriversIcon: {
  //     width: 72,
  //     height: 72,
  //     borderRadius: 36,
  //     alignItems: "center",
  //     justifyContent: "center",
  //     marginBottom: Spacing.sm,
  //   },
  //   noDriversTitle: {
  //     fontSize: 20,
  //     fontWeight: "700",
  //     textAlign: "center",
  //   },
  //   noDriversMessage: {
  //     fontSize: 14,
  //     textAlign: "center",
  //     paddingHorizontal: Spacing.lg,
  //     lineHeight: 20,
  //   },
  //   rebookButton: {
  //     flexDirection: "row",
  //     alignItems: "center",
  //     justifyContent: "center",
  //     gap: Spacing.sm,
  //     paddingVertical: Spacing.md,
  //     paddingHorizontal: Spacing.xl,
  //     borderRadius: BorderRadius.lg,
  //     marginTop: Spacing.md,
  //     width: "100%",
  //   },
  //   rebookButtonText: {
  //     fontSize: 16,
  //     fontWeight: "700",
  //     color: "#000000",
  //   },
  // });

  // If no drivers available and ride has been cancelled, show standalone rebook UI
  if (noDriversAvailable && !activeRide) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            alignItems: "center",
            padding: Spacing.xl,
          },
        ]}
      >
        <View
          style={[
            styles.noDriversIcon,
            { backgroundColor: UTOColors.warning + "20" },
          ]}
        >
          <MaterialIcons
            name="no-transfer"
            size={36}
            color={UTOColors.warning}
          />
        </View>
        <ThemedText
          style={[
            styles.noDriversTitle,
            { color: theme.text, marginTop: Spacing.lg },
          ]}
        >
          No Drivers Available
        </ThemedText>
        <ThemedText
          style={[
            styles.noDriversMessage,
            { color: theme.textSecondary, marginTop: Spacing.sm },
          ]}
        >
          Unfortunately we don't have any available drivers at the moment.
          Please try again shortly.
        </ThemedText>
        <Pressable
          onPress={() => handleRebook()}
          style={[
            styles.rebookButton,
            { backgroundColor: UTOColors.rider.primary, marginTop: Spacing.xl },
          ]}
        >
          <MaterialIcons name="refresh" size={20} color="#000" />
          <ThemedText style={styles.rebookButtonText}>Rebook Ride</ThemedText>
        </Pressable>
      </View>
    );
  }

  // When ride is complete and activeRide is cleared, show Rating Modal
  // instead of returning null. This ensures the modal stays visible.
  if (!activeRide) {
    if (pendingRating) {
      return (
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundRoot,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <RatingModal
            visible={true}
            ratedRole="driver"
            ratedName={pendingRating.driverName || "Driver"}
            rideId={pendingRating.rideId || ""}
            onSubmit={handleRatingSubmit}
            onDismiss={handleRatingDismiss}
          />
        </View>
      );
    }
    // Show a brief transition screen instead of null to avoid crash
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      />
    );
  }

  const getStatusMessage = () => {
    const status = rideStatus || activeRide.status;
    switch (status) {
      case "pending":
        return "Finding your driver...";
      case "accepted":
        return "Driver is on the way";
      case "arrived":
        return "Driver has arrived";
      case "in_progress":
        return "On your way to destination";
      default:
        return "Processing ride...";
    }
  };

  const getDropoffTime = () => {
    if (!activeRide) return "";
    const now = new Date();
    const dropoffTime = new Date(
      now.getTime() + activeRide.durationMinutes * 60000,
    );
    return dropoffTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });
  };

  // ✅ ULTRA CLOSE ZOOM
  const getMapRegion = () => {
    const points: RoutePoint[] = [
      {
        latitude: activeRide.pickupLocation.latitude,
        longitude: activeRide.pickupLocation.longitude,
      },
      {
        latitude: activeRide.dropoffLocation.latitude,
        longitude: activeRide.dropoffLocation.longitude,
      },
    ];

    if (driverLocation) {
      points.push({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      });
    }

    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = Math.max((maxLat - minLat) * 1.05, 0.02);
    const lngDelta = Math.max((maxLng - minLng) * 1.05, 0.02);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const getDistanceString = () => {
    if (driverDistance) return driverDistance.replace("mi", "miles");

    // Fallback if APIs fail
    if (!driverLocation || !activeRide) return null;
    const R = 3958.8;
    const dLat =
      ((activeRide.pickupLocation.latitude - driverLocation.latitude) *
        Math.PI) /
      180;
    const dLon =
      ((activeRide.pickupLocation.longitude - driverLocation.longitude) *
        Math.PI) /
      180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((driverLocation.latitude * Math.PI) / 180) *
      Math.cos((activeRide.pickupLocation.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const miles = R * c;

    if (miles < 0.1) return "Nearby";
    return `${miles.toFixed(1)} miles`;
  };

  const currentDriverLocation = driverLocation || {
    latitude: activeRide.pickupLocation.latitude + 0.005,
    longitude: activeRide.pickupLocation.longitude + 0.003,
  };

  const currentStatus = String(
    rideStatus || activeRide.status || "",
  ).toLowerCase();
  const cancelFeeState = getCancelFeeState();
  const showFreeCancelCountdown =
    ["accepted", "arrived", "at_pickup", "arriving"].includes(currentStatus) &&
    freeCancelSecondsLeft !== null &&
    freeCancelSecondsLeft > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <MapViewWrapper
        style={styles.map}
        initialRegion={getMapRegion()}
        region={getMapRegion()}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        {routeCoordinates.length > 0 && (
          <PolylineWrapper
            coordinates={routeCoordinates}
            strokeColor="#000000"
            strokeWidth={5}
          />
        )}

        {/* Driver-to-pickup route — shows driver moving toward rider */}
        {driverToPickupRoute.length > 0 &&
          (currentStatus === "accepted" || currentStatus === "arrived") && (
            <PolylineWrapper
              coordinates={driverToPickupRoute}
              strokeColor={UTOColors.rider.primary}
              strokeWidth={4}
              lineDashPattern={[10, 6]}
            />
          )}

        {/* Dummy cars show when finding a driver */}
        {currentStatus === "pending" && (
          <DummyCars location={activeRide.pickupLocation} />
        )}

        {/* Pickup marker */}
        <MarkerWrapper
          coordinate={{
            latitude: activeRide.pickupLocation.latitude,
            longitude: activeRide.pickupLocation.longitude,
          }}
          title="Pickup"
        >
          <View
            style={[
              styles.markerContainer,
              { backgroundColor: UTOColors.success },
            ]}
          >
            <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
          </View>
        </MarkerWrapper>

        {/* Dropoff marker */}
        <MarkerWrapper
          coordinate={{
            latitude: activeRide.dropoffLocation.latitude,
            longitude: activeRide.dropoffLocation.longitude,
          }}
          title="Dropoff"
        >
          <View
            style={[
              styles.markerContainer,
              { backgroundColor: UTOColors.error },
            ]}
          >
            <MaterialIcons name="place" size={18} color="#FFFFFF" />
          </View>
        </MarkerWrapper>

        {/* Driver marker */}
        <MarkerWrapper
          coordinate={currentDriverLocation}
          title="Driver"
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <View
            style={{
              transform: [{ rotate: `${driverLocation?.heading || 0}deg` }],
            }}
          >
            <TopDownCarView />
          </View>
        </MarkerWrapper>
      </MapViewWrapper>

      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={UTOColors.rider.primary} />
          <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
        </View>
      )}

      <Animated.View
        entering={FadeIn}
        style={[
          styles.bottomSheet,
          Shadows.large,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            maxHeight: Dimensions.get("window").height * 0.7,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: UTOColors.success },
                ]}
              />
              <ThemedText style={styles.statusText}>
                {getStatusMessage()}
              </ThemedText>
            </View>

            {currentStatus === "accepted" && (
              <View style={styles.etaRow}>
                <ThemedText
                  style={[styles.eta, { color: theme.textSecondary }]}
                >
                  {estimatedArrival
                    ? `${estimatedArrival} away`
                    : "Calculating ETA..."}
                </ThemedText>
                {getDistanceString() && (
                  <ThemedText
                    style={[styles.distance, { color: theme.textSecondary }]}
                  >
                    • {getDistanceString()}
                  </ThemedText>
                )}
              </View>
            )}

            {/* ─── 1-minute free cancellation countdown after assign ─── */}
            {showFreeCancelCountdown && (
                <AnimatedView
                  style={[
                    styles.waitingTimerContainer,
                    {
                      backgroundColor: UTOColors.success + "18",
                      borderColor: UTOColors.success + "40",
                      marginTop: Spacing.md,
                    },
                    freeCancelSecondsLeft !== null &&
                    freeCancelSecondsLeft <= 15
                      ? timerPulseStyle
                      : {},
                  ]}
                >
                  <View style={styles.waitingTimerHeader}>
                    <MaterialIcons
                      name="timer"
                      size={18}
                      color={UTOColors.success}
                    />
                    <ThemedText
                      style={[
                        styles.waitingTimerTitle,
                        { color: theme.text },
                      ]}
                    >
                      Free cancellation ends in
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.waitingTimerDigits,
                      {
                        color:
                          freeCancelSecondsLeft !== null &&
                          freeCancelSecondsLeft <= 15
                            ? "#EF4444"
                            : UTOColors.success,
                      },
                    ]}
                  >
                    {`0:${(freeCancelSecondsLeft ?? 0).toString().padStart(2, "0")}`}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.waitingTimerWarning,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Cancel free within this time. After that the full fare will
                    be charged.
                  </ThemedText>
                </AnimatedView>
              )}

            {currentStatus === "in_progress" && (
              <View style={styles.etaRow}>
                <ThemedText
                  style={[styles.eta, { color: theme.textSecondary }]}
                >
                  {`${activeRide.durationMinutes} min`} to destination
                </ThemedText>
              </View>
            )}
            {currentStatus === "in_progress" && (
              <ThemedText
                style={[
                  styles.dropoffTime,
                  { color: theme.textSecondary, marginLeft: 18 },
                ]}
              >
                Estimated dropoff: {getDropoffTime()}
              </ThemedText>
            )}
          </View>

          {/* ─── Ride Stage Progress Stepper ──────────────────────────── */}
          {currentStatus !== "pending" && (
            <View style={styles.stageStepper}>
              {[
                {
                  key: "accepted",
                  label: "Driver assigned",
                  icon: "person" as const,
                },
                {
                  key: "on_way",
                  label: "On the way",
                  icon: "directions-car" as const,
                },
                { key: "arrived", label: "Arrived", icon: "place" as const },
                {
                  key: "in_progress",
                  label: "Ride started",
                  icon: "navigation" as const,
                },
              ].map((stage, index) => {
                const stageOrder = [
                  "accepted",
                  "on_way",
                  "arrived",
                  "in_progress",
                ];
                const currentIdx =
                  currentStatus === "accepted"
                    ? 1
                    : stageOrder.indexOf(currentStatus);
                const isActive = index <= currentIdx;
                const isCurrent =
                  (currentStatus === "accepted" && index <= 1) ||
                  index === currentIdx;
                return (
                  <React.Fragment key={stage.key}>
                    <View style={styles.stageItem}>
                      <View
                        style={[
                          styles.stageCircle,
                          {
                            backgroundColor: isActive
                              ? UTOColors.rider.primary
                              : theme.backgroundSecondary,
                            borderColor: isActive
                              ? UTOColors.rider.primary
                              : theme.border,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={stage.icon}
                          size={12}
                          color={isActive ? "#000" : theme.textSecondary}
                        />
                      </View>
                      <ThemedText
                        style={[
                          styles.stageLabel,
                          {
                            color: isActive ? theme.text : theme.textSecondary,
                            fontWeight: isCurrent ? "700" : "400",
                          },
                        ]}
                      >
                        {stage.label}
                      </ThemedText>
                    </View>
                    {index < 3 && (
                      <View
                        style={[
                          styles.stageLine,
                          {
                            backgroundColor:
                              index < currentIdx
                                ? UTOColors.rider.primary
                                : theme.border,
                          },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* ─── Prominent Arrival + PIN Message ──────────────────────── */}
          {currentStatus === "arrived" && activeRide.otp && (
            <AnimatedView
              entering={FadeIn.duration(500)}
              style={[
                styles.arrivalCallout,
                { backgroundColor: UTOColors.rider.primary },
              ]}
            >
              <MaterialIcons name="check-circle" size={28} color="#000" />
              <ThemedText style={styles.arrivalTitle}>
                Your driver has arrived
              </ThemedText>
              <ThemedText style={styles.arrivalSubtitle}>
                Please provide your PIN to start the ride
              </ThemedText>
              <View style={styles.arrivalOtpBox}>
                {activeRide.otp.split("").map((digit, i) => (
                  <View key={i} style={styles.arrivalOtpDigit}>
                    <ThemedText style={styles.arrivalOtpText}>
                      {digit}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </AnimatedView>
          )}

          {/* ─── Waiting Timer when driver has arrived ───────────────── */}
          {currentStatus === "arrived" && waitingSecondsLeft !== null && (
            <AnimatedView
              entering={FadeIn.duration(400)}
              style={[
                styles.waitingTimerContainer,
                {
                  backgroundColor:
                    waitingSecondsLeft <= 120
                      ? waitingSecondsLeft <= 60
                        ? "#EF4444" + "20"
                        : "#F59E0B" + "20"
                      : theme.backgroundDefault,
                  borderColor:
                    waitingSecondsLeft <= 120
                      ? waitingSecondsLeft <= 60
                        ? "#EF4444" + "40"
                        : "#F59E0B" + "40"
                      : theme.border,
                },
                waitingSecondsLeft <= 60 ? timerPulseStyle : {},
              ]}
            >
              <View style={styles.waitingTimerHeader}>
                <MaterialIcons
                  name="timer"
                  size={22}
                  color={
                    waitingSecondsLeft <= 120
                      ? waitingSecondsLeft <= 60
                        ? "#EF4444"
                        : "#F59E0B"
                      : UTOColors.rider.primary
                  }
                />
                <ThemedText
                  style={[
                    styles.waitingTimerTitle,
                    waitingSecondsLeft <= 120 && {
                      color: waitingSecondsLeft <= 60 ? "#EF4444" : "#F59E0B",
                    },
                  ]}
                >
                  Driver is waiting
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.waitingTimerDigits,
                  {
                    color:
                      waitingSecondsLeft <= 120
                        ? waitingSecondsLeft <= 60
                          ? "#EF4444"
                          : "#F59E0B"
                        : theme.text,
                  },
                ]}
              >
                {`${Math.floor(waitingSecondsLeft / 60)
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}:${(waitingSecondsLeft % 60).toString().padStart(2, "0")}`}
              </ThemedText>
              <ThemedText
                style={[
                  styles.waitingTimerWarning,
                  { color: theme.textSecondary },
                ]}
              >
                {waitingSecondsLeft <= 60
                  ? "Hurry! Ride will be auto-cancelled with a fee"
                  : waitingSecondsLeft <= 120
                    ? "Less than 2 min left — please board now"
                    : "Please board within the time or ride will be cancelled with a fee"}
              </ThemedText>
            </AnimatedView>
          )}

          {currentStatus === "pending" && (
            <View style={styles.searchingContainer}>
              <View
                style={[
                  styles.searchingRing,
                  { borderColor: UTOColors.rider.primary + "30" },
                ]}
              >
                <View
                  style={[
                    styles.searchingRingInner,
                    { borderColor: UTOColors.rider.primary + "60" },
                  ]}
                >
                  <AnimatedView
                    style={[
                      styles.searchingPulse,
                      { backgroundColor: UTOColors.rider.primary },
                      pulseStyle,
                    ]}
                  />
                  <View
                    style={[
                      styles.searchingDot,
                      { backgroundColor: UTOColors.rider.primary },
                    ]}
                  >
                    <MaterialIcons name="local-taxi" size={20} color="#000" />
                  </View>
                </View>
              </View>
              <ThemedText
                style={[styles.searchingText, { color: theme.textSecondary }]}
              >
                Matching you with a nearby driver
              </ThemedText>
            </View>
          )}

          {currentStatus !== "pending" && (
            <>
              {currentStatus === "accepted" && activeRide.otp && (
                <View
                  style={[
                    styles.otpContainer,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText style={[styles.otpLabel, { color: theme.text }]}>
                    Your ride PIN — share with driver on arrival
                  </ThemedText>
                  <View style={styles.otpBox}>
                    {activeRide.otp.split("").map((digit, i) => (
                      <View
                        key={i}
                        style={[
                          styles.otpDigit,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                      >
                        <ThemedText
                          style={[styles.otpText, { color: theme.text }]}
                        >
                          {digit}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.driverCard,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View
                  style={[
                    styles.driverAvatar,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={24}
                    color={theme.textSecondary}
                  />
                </View>
                <View style={styles.driverInfo}>
                  <ThemedText style={styles.driverName}>
                    {activeRide.driverName || "Your Driver"}
                  </ThemedText>
                  <View style={styles.vehicleRow}>
                    <ThemedText
                      style={[
                        styles.vehicleInfo,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {activeRide.vehicleInfo}
                    </ThemedText>
                    <View
                      style={[
                        styles.ratingBadge,
                        { backgroundColor: UTOColors.warning + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="star"
                        size={12}
                        color={UTOColors.warning}
                      />
                      <ThemedText
                        style={[styles.rating, { color: UTOColors.warning }]}
                      >
                        {activeRide.driverRating?.toFixed(1)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    style={[styles.licensePlate, { color: theme.text }]}
                  >
                    {activeRide.licensePlate}
                  </ThemedText>
                </View>
                <View style={styles.contactButtons}>
                  <Pressable
                    onPress={handleCall}
                    style={[
                      styles.contactButton,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <MaterialIcons
                      name="phone"
                      size={18}
                      color={UTOColors.rider.primary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleMessage}
                    style={[
                      styles.contactButton,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <MaterialIcons
                      name="chat"
                      size={18}
                      color={UTOColors.rider.primary}
                    />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          <View style={styles.tripDetails}>
            <View style={[styles.routeContainer, { alignItems: "center" }]}>
              <View style={{ flex: 1 }}>

                {/* Pickup Row */}
                <View style={styles.routeRow}>
                  <View
                    style={[
                      styles.routeDot,
                      { backgroundColor: UTOColors.success, marginRight: Spacing.md },
                    ]}
                  />
                  <ThemedText style={styles.address} numberOfLines={1}>
                    {activeRide.pickupLocation.address}
                  </ThemedText>
                </View>

                {/* Vias */}
                {(activeRide.vias || []).map((via, index) => (
                  <React.Fragment key={`tracking-via-${index}`}>
                    <View
                      style={[
                        styles.routeLine,
                        { backgroundColor: theme.border, marginLeft: 4, height: 16, marginVertical: 2 },
                      ]}
                    />
                    <View style={styles.routeRow}>
                      <View
                        style={[
                          styles.routeDot,
                          { backgroundColor: "#F59E0B", marginRight: Spacing.md },
                        ]}
                      />
                      <ThemedText style={styles.address} numberOfLines={1}>
                        Via {index + 1}: {via.address}
                      </ThemedText>
                    </View>
                  </React.Fragment>
                ))}

                {/* Dropoff Row */}
                <View
                  style={[
                    styles.routeLine,
                    { backgroundColor: theme.border, marginLeft: 4, height: 16, marginVertical: 2 },
                  ]}
                />
                <View style={styles.routeRow}>
                  <View
                    style={[
                      styles.routeDot,
                      { backgroundColor: UTOColors.error, marginRight: Spacing.md },
                    ]}
                  />
                  <ThemedText style={styles.address} numberOfLines={1}>
                    {activeRide.dropoffLocation.address}
                  </ThemedText>
                </View>

              </View>

              <ThemedText style={styles.farePrice}>
                {formatPrice(
                  activeRide.farePrice - (activeRide.discountAmount || 0),
                )}
              </ThemedText>
            </View>

            {currentStatus !== "completed" && (
              <Pressable
                style={styles.paymentSwitchButton}
                onPress={() => {
                  if (!activeRide) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (typeof updateRidePaymentMethod === "function") {
                    updateRidePaymentMethod(activeRide.id, "card");
                  }
                }}
              >
                <View style={styles.paymentSwitchRow}>
                  <MaterialIcons
                    name="credit-card"
                    size={18}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    style={{ color: theme.textSecondary, marginLeft: 8 }}
                  >
                    Paying with Card
                  </ThemedText>
                </View>
                <ThemedText
                  style={{ color: UTOColors.rider.primary, fontWeight: "600" }}
                >
                  Default
                </ThemedText>
              </Pressable>
            )}
          </View>

          {(currentStatus === "pending" ||
            currentStatus === "accepted" ||
            currentStatus === "at_pickup" ||
            currentStatus === "arrived" ||
            currentStatus === "arriving") &&
            !noDriversAvailable && (
              <>
                {showFreeCancelCountdown && (
                  <View
                    style={[
                      styles.freeCancelBanner,
                      {
                        backgroundColor: UTOColors.success + "18",
                        borderColor: UTOColors.success + "40",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="timer"
                      size={18}
                      color={
                        freeCancelSecondsLeft !== null &&
                        freeCancelSecondsLeft <= 15
                          ? "#EF4444"
                          : UTOColors.success
                      }
                    />
                    <ThemedText
                      style={[styles.freeCancelBannerText, { color: theme.text }]}
                    >
                      Free cancel:{" "}
                      {`0:${(freeCancelSecondsLeft ?? 0).toString().padStart(2, "0")}`}
                    </ThemedText>
                  </View>
                )}
                <AnimatedPressable
                  onPress={handleCancel}
                  onPressIn={() => (cancelScale.value = withSpring(0.98))}
                  onPressOut={() => (cancelScale.value = withSpring(1))}
                  style={[
                    styles.cancelButton,
                    { backgroundColor: UTOColors.error + "15" },
                    cancelAnimatedStyle,
                  ]}
                >
                  <ThemedText
                    style={[styles.cancelButtonText, { color: UTOColors.error }]}
                  >
                    Cancel Ride
                  </ThemedText>
                </AnimatedPressable>
              </>
            )}

          {/* ─── No Drivers Available — Rebook ─────────────────────────── */}
          {noDriversAvailable && (
            <AnimatedView
              entering={FadeIn.duration(400)}
              style={styles.noDriversContainer}
            >
              <View
                style={[
                  styles.noDriversIcon,
                  { backgroundColor: UTOColors.warning + "20" },
                ]}
              >
                <MaterialIcons
                  name="no-transfer"
                  size={36}
                  color={UTOColors.warning}
                />
              </View>
              <ThemedText
                style={[styles.noDriversTitle, { color: theme.text }]}
              >
                No Drivers Available
              </ThemedText>
              <ThemedText
                style={[
                  styles.noDriversMessage,
                  { color: theme.textSecondary },
                ]}
              >
                Unfortunately we don't have any available drivers at the moment.
                Please try again shortly.
              </ThemedText>
              <Pressable
                onPress={() => handleRebook()}
                style={[
                  styles.rebookButton,
                  { backgroundColor: UTOColors.rider.primary },
                ]}
              >
                <MaterialIcons name="refresh" size={20} color="#000" />
                <ThemedText style={styles.rebookButtonText}>
                  Rebook Ride
                </ThemedText>
              </Pressable>
            </AnimatedView>
          )}
        </ScrollView>
      </Animated.View>

      {/* Cancel confirmation — live free-cancel countdown after driver assign */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.cancelModalOverlay}>
          <View
            style={[
              styles.cancelModalCard,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <MaterialIcons
              name={
                cancelFeeState.cancellationFeeApplies
                  ? "warning"
                  : "cancel"
              }
              size={36}
              color={
                cancelFeeState.cancellationFeeApplies
                  ? UTOColors.warning
                  : UTOColors.error
              }
            />
            <ThemedText
              style={[styles.cancelModalTitle, { color: theme.text }]}
            >
              {cancelFeeState.cancellationFeeApplies
                ? "Cancellation Fee Applies"
                : "Cancel Ride?"}
            </ThemedText>

            {showFreeCancelCountdown && (
              <View
                style={[
                  styles.cancelModalTimerBox,
                  {
                    backgroundColor: UTOColors.success + "18",
                    borderColor: UTOColors.success + "40",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.cancelModalTimerLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Free cancellation ends in
                </ThemedText>
                <ThemedText
                  style={[
                    styles.cancelModalTimerDigits,
                    {
                      color:
                        freeCancelSecondsLeft !== null &&
                        freeCancelSecondsLeft <= 15
                          ? "#EF4444"
                          : UTOColors.success,
                    },
                  ]}
                >
                  {`0:${(freeCancelSecondsLeft ?? 0).toString().padStart(2, "0")}`}
                </ThemedText>
              </View>
            )}

            <ThemedText
              style={[
                styles.cancelModalMessage,
                { color: theme.textSecondary },
              ]}
            >
              {cancelFeeState.cancellationFeeApplies
                ? `Your free 1-minute period has ended. Cancelling now will charge the full fare of £${cancelFeeState.fareAmount.toFixed(2)}.`
                : showFreeCancelCountdown
                  ? "Cancel now and no fare will be charged."
                  : cancelFeeState.driverAssigned
                    ? "Are you sure you want to cancel this ride?"
                    : "No cancellation fee will be charged before a driver is assigned."}
            </ThemedText>

            <Pressable
              onPress={confirmCancelRide}
              style={[
                styles.cancelModalConfirmBtn,
                {
                  backgroundColor: cancelFeeState.cancellationFeeApplies
                    ? UTOColors.warning
                    : UTOColors.error,
                },
              ]}
            >
              <ThemedText style={styles.cancelModalConfirmText}>
                {cancelFeeState.cancellationFeeApplies
                  ? "Cancel & Accept Charge"
                  : "Cancel Ride"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowCancelModal(false)}
              style={styles.cancelModalKeepBtn}
            >
              <ThemedText
                style={[styles.cancelModalKeepText, { color: theme.text }]}
              >
                Keep Ride
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: { color: "#FFFFFF", fontSize: 12 },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverMarkerContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  driverPulse: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  statusSection: { marginBottom: Spacing.lg },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusText: { fontSize: 18, fontWeight: "600" },
  eta: { fontSize: 14 },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 18,
    gap: 4,
  },
  distance: { fontSize: 14 },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  vehicleInfo: { fontSize: 13 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  rating: { fontSize: 11, fontWeight: "600" },
  licensePlate: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  contactButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tripDetails: { marginBottom: Spacing.lg },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeIndicator: {
    width: 20,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    marginVertical: 4,
  },
  paymentSwitchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#33333333",
  },
  paymentSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addresses: {
    flex: 1,
    justifyContent: "space-between",
    height: 48,
  },
  address: { fontSize: 14 },
  farePrice: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: Spacing.md,
  },
  otpContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  otpLabel: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  otpBox: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  otpDigit: {
    width: 32,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  cancelButton: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dropoffTime: {
    fontSize: 14,
    marginTop: 2,
  },
  searchingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  searchingRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  searchingPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  searchingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchingText: {
    fontSize: 14,
    textAlign: "center",
  },
  // ─── Waiting Timer Styles ─────────────────────────────
  waitingTimerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  waitingTimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  waitingTimerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  waitingTimerDigits: {
    fontSize: 42,
    fontWeight: "800",
    fontVariant: ["tabular-nums"] as any,
    letterSpacing: 2,
    marginVertical: 4,
    lineHeight: 50,
    includeFontPadding: false,
  },
  waitingTimerWarning: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  freeCancelBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  freeCancelBannerText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as any,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  cancelModalCard: {
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    gap: 12,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelModalTimerBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  cancelModalTimerLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  cancelModalTimerDigits: {
    fontSize: 36,
    fontWeight: "800",
    fontVariant: ["tabular-nums"] as any,
    marginTop: 4,
  },
  cancelModalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  cancelModalConfirmBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  cancelModalConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelModalKeepBtn: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelModalKeepText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // ─── Ride Stage Stepper Styles ──────────────────────────
  stageStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  stageItem: {
    alignItems: "center",
    gap: 4,
  },
  stageCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stageLabel: {
    fontSize: 9,
    textAlign: "center",
    maxWidth: 60,
  },
  stageLine: {
    height: 2,
    width: 20,
    marginHorizontal: 2,
    marginBottom: 16,
  },
  // ─── Arrival Callout Styles ─────────────────────────────
  arrivalCallout: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  arrivalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  arrivalSubtitle: {
    fontSize: 14,
    color: "#000000",
    opacity: 0.7,
  },
  arrivalOtpBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  arrivalOtpDigit: {
    width: 44,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  arrivalOtpText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },
  // ─── No Drivers / Rebook Styles ─────────────────────────
  noDriversContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noDriversIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  noDriversTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  noDriversMessage: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
  rebookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    width: "100%",
  },
  rebookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
});
