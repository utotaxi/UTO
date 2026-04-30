

import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { OnlineToggle } from "@/components/OnlineToggle";
import { RideRequestCard } from "@/components/RideRequestCard";
import { MapViewWrapper, MarkerWrapper, PolylineWrapper } from "@/components/MapView";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ModeBadge } from "@/components/ModeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useDriver } from "@/context/DriverContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { RatingModal } from "@/components/RatingModal";
import { UTOColors, Spacing, BorderRadius, formatPrice } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { sendDriverLocation } from "@/lib/socket";

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function DriverHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const {
    isOnline,
    setIsOnline,
    activeRideRequest,
    rideState,
    rideCancelledByRider,
    dismissRiderCancellation,
    completedRidePayment,
    dismissPaymentCollection,
    acceptRide,
    declineRide,
    arrivedAtPickup,
    startRide,
    completeTrip,
    noShowRide,
    agreeToWait,
    paidWaitingStartedAt,
    waitingChargePerMin,
    driverProfile,
    pendingRating,
    submitDriverRating,
    dismissDriverRating,
  } = useDriver();
  
  const { user } = useAuth();
  useNotifications(user?.id);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [routeDistanceText, setRouteDistanceText] = useState<string | null>(null);
  const [routeDurationText, setRouteDurationText] = useState<string | null>(null);
  const [collectedAmountStr, setCollectedAmountStr] = useState<string>("");
  const [waitingElapsedSec, setWaitingElapsedSec] = useState(0);
  const [paidWaitingElapsedSec, setPaidWaitingElapsedSec] = useState(0);

  useEffect(() => {
    if (completedRidePayment) {
      setCollectedAmountStr((completedRidePayment.amountToCollect !== undefined ? completedRidePayment.amountToCollect : (completedRidePayment.fareAmount || 0)).toString());
    }
  }, [completedRidePayment]);

  const activeRideRef = React.useRef(activeRideRequest);
  useEffect(() => {
    activeRideRef.current = activeRideRequest;
  }, [activeRideRequest]);

  useEffect(() => {
    if (!activeRideRequest || !activeRideRequest.pickupLatitude || !activeRideRequest.dropoffLatitude) {
      setRouteCoordinates([]);
      setRouteDistanceText(null);
      setRouteDurationText(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const apiUrl = getApiUrl();

        // ALWAYS use pickup→dropoff for the polyline so the same route is shown
        // consistently before and after accepting, matching the rider's view.
        // The driver uses external navigation to reach pickup/dropoff.
        const origin = `${activeRideRequest.pickupLatitude},${activeRideRequest.pickupLongitude}`;
        const destination = `${activeRideRequest.dropoffLatitude},${activeRideRequest.dropoffLongitude}`;

        const res = await fetch(
          new URL(`/api/directions?origin=${origin}&destination=${destination}`, apiUrl).toString()
        );
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          if (route.decodedPolyline) {
            setRouteCoordinates(route.decodedPolyline);
          }
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            // Distance and duration reflect the booked trip (pickup → dropoff)
            setRouteDistanceText(
              leg.distance?.text?.replace(/\bmi\b/, "miles") || null
            );
            setRouteDurationText(
              leg.duration?.text?.replace(/\bmins\b/, "min") || null
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch route for driver:", err);
      }
    };

    fetchRoute();
  }, [activeRideRequest?.id, activeRideRequest?.pickupLatitude, activeRideRequest?.dropoffLatitude, rideState]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingLocation(false);
        return;
      }

      const enforceUK = (loc: Location.LocationObject) => {
        // If outside UK bounds (roughly), default to the pickup location or Central London
        if (loc.coords.latitude < 49 || loc.coords.latitude > 61 || loc.coords.longitude < -10 || loc.coords.longitude > 2) {
          const ride = activeRideRef.current;
          if (ride && ride.pickupLatitude && ride.pickupLongitude) {
            // Spoof driver to be near the pickup (e.g., ~1 mile away)
            return {
              ...loc,
              coords: {
                ...loc.coords,
                latitude: ride.pickupLatitude - 0.012,
                longitude: ride.pickupLongitude - 0.012,
              }
            };
          }
          return {
            ...loc,
            coords: {
              ...loc.coords,
              latitude: 51.5074,
              longitude: -0.1278,
            }
          };
        }
        return loc;
      };

      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        const enforcedLoc = enforceUK(currentLocation);
        setLocation(enforcedLoc);
        setIsLoadingLocation(false);
        
        // Setup state refs for the watcher callback
        const getDriverId = () => driverProfile?.id || user?.id;

        if (isOnline && getDriverId()) {
          sendDriverLocation({
            driverId: getDriverId() as string,
            latitude: enforcedLoc.coords.latitude,
            longitude: enforcedLoc.coords.longitude,
            heading: enforcedLoc.coords.heading || undefined,
            speed: enforcedLoc.coords.speed || undefined,
          });
        }

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
          (newLocation) => {
            const updatedLoc = enforceUK(newLocation);
            setLocation(updatedLoc);
            
            // Re-check isOnlineRef (it needs to be up to date)
            // But since this effect only runs once, using isOnline from state is stale
            // We'll fix that with an effect that depends on location and isOnline below.
          }
        );
      } catch (error) {
        console.log("Location error:", error);
        setIsLoadingLocation(false);
      }
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Update backend with location when location or online status changes
  useEffect(() => {
    const driverId = driverProfile?.id || user?.id;
    if (isOnline && location && driverId) {
      sendDriverLocation({
        driverId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
      });
    }
  }, [location, isOnline, driverProfile?.id, user?.id]);

  useEffect(() => {
    if (rideState === "none") {
      setOtpValue("");
      setOtpError(false);
    }
  }, [rideState]);

  // Track elapsed waiting time when at pickup using a persistent ref
  const arrivedAtRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (rideState !== "at_pickup") {
      setWaitingElapsedSec(0);
      arrivedAtRef.current = null;
      return;
    }
    // Only set the start time ONCE when entering at_pickup
    if (!arrivedAtRef.current) {
      arrivedAtRef.current = Date.now();
    }
    const start = arrivedAtRef.current;
    // Immediately compute elapsed so there's no 1s gap
    setWaitingElapsedSec(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => {
      setWaitingElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [rideState]);

  // Track paid waiting elapsed time
  useEffect(() => {
    if (!paidWaitingStartedAt) {
      setPaidWaitingElapsedSec(0);
      return;
    }
    const start = new Date(paidWaitingStartedAt).getTime();
    const interval = setInterval(() => {
      setPaidWaitingElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [paidWaitingStartedAt]);

  const FREE_WAITING_SECONDS = 10 * 60; // 10 minutes
  const freeWaitingExpired = waitingElapsedSec >= FREE_WAITING_SECONDS;

  const handleCallRider = () => {
    const phone = activeRideRequest?.riderPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("No Phone Number", "The rider's phone number is not available.");
    }
  };

  const handleNoShow = () => {
    Alert.alert(
      "Mark as No Show?",
      "The rider will be charged the full fare amount as per the no-show policy. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm No Show",
          style: "destructive",
          onPress: () => noShowRide(),
        },
      ]
    );
  };

  const handleAgreeToWait = () => {
    Alert.alert(
      "Start Paid Waiting?",
      `Paid waiting will be charged at £${waitingChargePerMin.toFixed(2)}/minute and added to the final fare.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Paid Waiting",
          onPress: () => agreeToWait(),
        },
      ]
    );
  };

  const handleAccept = () => {
    acceptRide();
  };

  const handleDecline = () => {
    declineRide();
    setOtpValue("");
  };

  const handleArrivedAtPickup = () => {
    arrivedAtPickup();
  };

  const handleStartRide = async () => {
    if (!activeRideRequest || otpValue.length < 4) return;

    if (activeRideRequest.otp && otpValue === activeRideRequest.otp) {
      setOtpError(false);
      const success = await startRide(activeRideRequest.id, otpValue);
      if (success) {
        setOtpValue("");
      }
    } else {
      setOtpError(true);
      setOtpValue("");
    }
  };

  const hasActiveRide = activeRideRequest && rideState !== "none";

  const mapRegion = useMemo(() => {
    if (hasActiveRide && activeRideRequest.pickupLatitude && activeRideRequest.dropoffLatitude) {
      // Always frame pickup → dropoff so the map matches the rider's view
      const points = [
        { lat: activeRideRequest.pickupLatitude, lng: activeRideRequest.pickupLongitude },
        { lat: activeRideRequest.dropoffLatitude, lng: activeRideRequest.dropoffLongitude },
      ];

      const lats = points.map(p => p.lat);
      const lngs = points.map(p => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.02),
        longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.02),
      };
    }
    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [location, hasActiveRide, activeRideRequest?.pickupLatitude, activeRideRequest?.dropoffLatitude]);

  const handleOpenNavigation = () => {
    if (!activeRideRequest) return;

    let destLat, destLng;
    if (rideState === "accepted" || rideState === "at_pickup") {
      destLat = activeRideRequest.pickupLatitude;
      destLng = activeRideRequest.pickupLongitude;
    } else {
      destLat = activeRideRequest.dropoffLatitude;
      destLng = activeRideRequest.dropoffLongitude;
    }

    const url = Platform.select({
      ios: `maps://app?daddr=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ActivityIndicator size="large" color={UTOColors.driver.primary} />
          </View>
        ) : (
          <MapViewWrapper
            style={styles.map}
            initialRegion={mapRegion}
            region={hasActiveRide ? mapRegion : undefined}
            showsUserLocation
            showsMyLocationButton={false}
            customMapStyle={isDark ? darkMapStyle : []}
          >
            {routeCoordinates.length > 0 && (
              <PolylineWrapper
                coordinates={routeCoordinates}
                strokeColor="#000000"
                strokeWidth={5}
              />
            )}
            {location ? (
              <MarkerWrapper
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
              >
                <View style={styles.driverMarkerContainer}>
                  <View style={[styles.driverMarker, { backgroundColor: isOnline ? UTOColors.driver.primary : theme.textSecondary }]}>
                    <Feather name="navigation" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </MarkerWrapper>
            ) : null}

            {hasActiveRide && activeRideRequest.pickupLatitude ? (
              <MarkerWrapper
                coordinate={{
                  latitude: activeRideRequest.pickupLatitude,
                  longitude: activeRideRequest.pickupLongitude,
                }}
                title="Pickup"
              >
                <View style={[styles.rideMarker, { backgroundColor: UTOColors.success }]}>
                  <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
                </View>
              </MarkerWrapper>
            ) : null}

            {hasActiveRide && activeRideRequest.dropoffLatitude ? (
              <MarkerWrapper
                coordinate={{
                  latitude: activeRideRequest.dropoffLatitude,
                  longitude: activeRideRequest.dropoffLongitude,
                }}
                title="Dropoff"
              >
                <View style={[styles.rideMarker, { backgroundColor: UTOColors.error }]}>
                  <MaterialIcons name="place" size={18} color="#FFFFFF" />
                </View>
              </MarkerWrapper>
            ) : null}
          </MapViewWrapper>
        )}
      </View>

      {/* Custom Safe Area Header */}
      <View style={[styles.customHeader, {
        paddingTop: Math.max(insets.top, 16),
        backgroundColor: theme.backgroundRoot,
      }]}>
        <HeaderTitle />
        <ModeBadge onPress={() => navigation?.navigate("Settings")} />
      </View>

      {/* Online toggle — directly below header */}
      <View style={[styles.toggleContainer, { top: Math.max(insets.top, 16) + 48 + Spacing.sm }]}>
        <OnlineToggle isOnline={isOnline} onToggle={setIsOnline} />
      </View>

      {/* Phase 1: Incoming ride request — Accept / Decline */}
      {activeRideRequest && rideState === "incoming" ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.rideRequestContainer, { bottom: insets.bottom + Spacing.lg }]}
        >
          <RideRequestCard
            riderName={activeRideRequest.riderName}
            pickupAddress={activeRideRequest.pickupAddress}
            dropoffAddress={activeRideRequest.dropoffAddress}
            estimatedFare={activeRideRequest.estimatedFare}
            pickupDistance={activeRideRequest.pickupDistance}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        </Animated.View>
      ) : null}

      {/* Phase 2: Accepted — Navigate to pickup */}
      {activeRideRequest && rideState === "accepted" ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.rideRequestContainer, { bottom: insets.bottom + Spacing.lg }]}
        >
          <View style={[styles.acceptedCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.acceptedHeader}>
              <View style={[styles.acceptedIconCircle, { backgroundColor: UTOColors.success + "20" }]}>
                <MaterialIcons name="directions-car" size={24} color={UTOColors.success} />
              </View>
              <View style={styles.acceptedHeaderText}>
                <ThemedText style={styles.acceptedTitle}>Navigate to Pickup</ThemedText>
                <ThemedText style={[styles.acceptedSubtitle, { color: theme.textSecondary }]}>
                  Head to the rider's location
                </ThemedText>
              </View>
              <ThemedText style={[styles.acceptedFare, { color: UTOColors.driver.primary }]}>
                {formatPrice(activeRideRequest.estimatedFare)}
              </ThemedText>
            </View>

            <View style={[styles.acceptedDivider, { backgroundColor: theme.border }]} />

            <View style={styles.acceptedRider}>
              <View style={[styles.acceptedAvatar, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="user" size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.acceptedRiderName}>{activeRideRequest.riderName}</ThemedText>
                <ThemedText style={[styles.acceptedPickupLabel, { color: theme.textSecondary }]}>
                  {routeDistanceText ? `${routeDistanceText} away` : `${activeRideRequest.pickupDistance} miles away`}
                </ThemedText>
              </View>
              <Pressable
                onPress={handleOpenNavigation}
                style={[styles.circleBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <MaterialIcons name="navigation" size={20} color={UTOColors.driver.primary} />
              </Pressable>
            </View>

            <View style={styles.acceptedRoute}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
                <ThemedText style={styles.routeAddress} numberOfLines={1}>
                  {activeRideRequest.pickupAddress}
                </ThemedText>
              </View>
              <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
                <ThemedText style={styles.routeAddress} numberOfLines={1}>
                  {activeRideRequest.dropoffAddress}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={handleArrivedAtPickup}
              style={[styles.arrivedBtn, { backgroundColor: UTOColors.driver.primary }]}
            >
              <MaterialIcons name="place" size={20} color="#000" />
              <ThemedText style={styles.arrivedBtnText}>I've Arrived at Pickup</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDecline}
              style={[styles.cancelTripBtn, { backgroundColor: UTOColors.error + "15" }]}
            >
              <ThemedText style={[styles.cancelTripText, { color: UTOColors.error }]}>Cancel Trip</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Phase 3: At pickup — Enter rider's PIN to start */}
      {activeRideRequest && rideState === "at_pickup" ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.rideRequestContainer, { bottom: insets.bottom + Spacing.lg }]}
        >
          <ScrollView style={[styles.otpInputContainer, { backgroundColor: theme.backgroundDefault, maxHeight: 520 }]} showsVerticalScrollIndicator={false}>
            {/* ── Rider Contact Info ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.acceptedRiderName}>{activeRideRequest.riderName}</ThemedText>
                {activeRideRequest.riderPhone ? (
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                    📞 {activeRideRequest.riderPhone}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={handleCallRider}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: UTOColors.success + '20',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="phone" size={22} color={UTOColors.success} />
              </Pressable>
            </View>

            {/* ── Waiting Timer ── */}
            {!paidWaitingStartedAt ? (
              // FREE WAITING PHASE
              <View style={[styles.waitingBadge, {
                backgroundColor: freeWaitingExpired ? UTOColors.error + '15' : UTOColors.warning + '15',
                marginBottom: 12,
              }]}>
                <MaterialIcons
                  name={freeWaitingExpired ? "warning" : "timer"}
                  size={16}
                  color={freeWaitingExpired ? UTOColors.error : UTOColors.warning}
                />
                <ThemedText style={{
                  color: freeWaitingExpired ? UTOColors.error : UTOColors.warning,
                  fontSize: 13, fontWeight: '600', flex: 1,
                }}>
                  {freeWaitingExpired
                    ? `Free waiting expired – ${Math.floor(waitingElapsedSec / 60).toString().padStart(2, '0')}:${(waitingElapsedSec % 60).toString().padStart(2, '0')}`
                    : `Waiting for rider – free waiting time ${Math.floor((FREE_WAITING_SECONDS - waitingElapsedSec) / 60).toString().padStart(2, '0')}:${((FREE_WAITING_SECONDS - waitingElapsedSec) % 60).toString().padStart(2, '0')}`
                  }
                </ThemedText>
              </View>
            ) : (
              // PAID WAITING PHASE
              <View style={[styles.waitingBadge, { backgroundColor: UTOColors.driver.primary + '15', marginBottom: 12 }]}>
                <MaterialIcons name="attach-money" size={16} color={UTOColors.driver.primary} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ color: UTOColors.driver.primary, fontSize: 13, fontWeight: '600' }}>
                    Paid waiting: {Math.floor(paidWaitingElapsedSec / 60).toString().padStart(2, '0')}:{(paidWaitingElapsedSec % 60).toString().padStart(2, '0')}
                  </ThemedText>
                  <ThemedText style={{ color: UTOColors.driver.primary, fontSize: 12, marginTop: 2 }}>
                    Charge: £{(Math.floor(paidWaitingElapsedSec / 60) * waitingChargePerMin).toFixed(2)} (£{waitingChargePerMin.toFixed(2)}/min)
                  </ThemedText>
                </View>
              </View>
            )}

            {/* ── No Show / Agree to Wait buttons (after 10 min free waiting) ── */}
            {freeWaitingExpired && !paidWaitingStartedAt ? (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <Pressable
                  onPress={handleNoShow}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: UTOColors.error + '15',
                    paddingVertical: 14, borderRadius: 12, gap: 6,
                    borderWidth: 1, borderColor: UTOColors.error + '30',
                  }}
                >
                  <MaterialIcons name="person-off" size={18} color={UTOColors.error} />
                  <ThemedText style={{ color: UTOColors.error, fontWeight: '600', fontSize: 14 }}>No Show</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleAgreeToWait}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: UTOColors.success + '15',
                    paddingVertical: 14, borderRadius: 12, gap: 6,
                    borderWidth: 1, borderColor: UTOColors.success + '30',
                  }}
                >
                  <MaterialIcons name="timer" size={18} color={UTOColors.success} />
                  <ThemedText style={{ color: UTOColors.success, fontWeight: '600', fontSize: 14 }}>Agree to Wait</ThemedText>
                </Pressable>
              </View>
            ) : null}

            {/* ── OTP Entry (always available when rider shows up) ── */}
            <ThemedText style={styles.otpTitle}>Enter Rider PIN</ThemedText>
            <ThemedText style={[styles.otpSubtitle, { color: theme.textSecondary }]}>
              Ask the rider for their 4-digit PIN to start the ride
            </ThemedText>
            {otpError ? (
              <ThemedText style={styles.otpErrorText}>
                Wrong PIN. Please try again.
              </ThemedText>
            ) : null}
            <View style={styles.otpRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: otpValue[i] ? UTOColors.driver.primary : theme.border,
                      backgroundColor: otpValue[i] ? UTOColors.driver.primary + "15" : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText style={[styles.otpText, otpValue[i] ? { color: UTOColors.driver.primary } : { color: theme.textSecondary }]}>
                    {otpValue[i] || "\u00B7"}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.numPad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => otpValue.length < 4 && setOtpValue(prev => prev + num)}
                  style={[styles.numBtn, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <ThemedText style={styles.numBtnText}>{num}</ThemedText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setOtpValue(prev => prev.slice(0, -1))}
                style={[styles.numBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="delete" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => otpValue.length < 4 && setOtpValue(prev => prev + "0")}
                style={[styles.numBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={styles.numBtnText}>0</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => { setOtpValue(""); }}
                style={[styles.numBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="x" size={18} color={UTOColors.error} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleStartRide}
              style={[
                styles.startBtn,
                { backgroundColor: otpValue.length === 4 ? UTOColors.driver.primary : theme.backgroundSecondary },
              ]}
              disabled={otpValue.length < 4}
            >
              <ThemedText style={[styles.startBtnText, { color: otpValue.length === 4 ? "#000" : theme.textSecondary }]}>
                Start Ride
              </ThemedText>
            </Pressable>
          </ScrollView>
        </Animated.View>
      ) : null}

      {/* Phase 4: In progress — Ride is active, show full details + Complete Trip */}
      {activeRideRequest && rideState === "in_progress" ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.rideRequestContainer, { bottom: insets.bottom + Spacing.lg }]}
        >
          <View style={[styles.acceptedCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.acceptedHeader}>
              <View style={[styles.acceptedIconCircle, { backgroundColor: UTOColors.success + "20" }]}>
                <MaterialIcons name="navigation" size={24} color={UTOColors.success} />
              </View>
              <View style={styles.acceptedHeaderText}>
                <ThemedText style={styles.acceptedTitle}>Ride in Progress</ThemedText>
                <ThemedText style={[styles.acceptedSubtitle, { color: theme.textSecondary }]}>
                  Navigate to dropoff location
                </ThemedText>
              </View>
            </View>

            <View style={[styles.acceptedDivider, { backgroundColor: theme.border }]} />

            <View style={[styles.acceptedRider, { backgroundColor: theme.backgroundRoot }]}>
              <View style={[styles.acceptedAvatar, { backgroundColor: theme.border }]}>
                <Feather name="user" size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <ThemedText style={styles.acceptedRiderName}>{activeRideRequest.riderName}</ThemedText>
                <ThemedText style={[styles.acceptedPickupLabel, { color: theme.textSecondary }]}>
                  {routeDistanceText || `${activeRideRequest.distanceMiles} miles`} · ~{routeDurationText || `${activeRideRequest.durationMinutes} min`}
                </ThemedText>
              </View>
              <View style={styles.actionButtons}>
                <Pressable onPress={handleOpenNavigation} style={styles.circleBtn}>
                  <MaterialIcons name="navigation" size={18} color={UTOColors.driver.primary} />
                </Pressable>
                <Pressable onPress={() => Linking.openURL("tel:+4407596266901")} style={styles.circleBtn}>
                  <Feather name="phone" size={18} color={UTOColors.driver.primary} />
                </Pressable>
                <Pressable onPress={() => Linking.openURL("sms:+4407596266901")} style={styles.circleBtn}>
                  <Feather name="message-square" size={18} color={UTOColors.driver.primary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.acceptedRouteContainer}>
              <View style={styles.acceptedRoute}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
                  <ThemedText style={styles.routeAddress} numberOfLines={1}>
                    {activeRideRequest.pickupAddress}
                  </ThemedText>
                </View>
                <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
                  <ThemedText style={styles.routeAddress} numberOfLines={1}>
                    {activeRideRequest.dropoffAddress}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.farePriceRightContainer}>
                <ThemedText style={[styles.farePriceRight, { color: theme.text }]}>
                  {formatPrice(activeRideRequest.estimatedFare)}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={() => completeTrip()}
              style={[styles.arrivedBtn, { backgroundColor: UTOColors.success }]}
            >
              <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
              <ThemedText style={[styles.arrivedBtnText, { color: "#FFFFFF" }]}>Complete Trip</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Offline overlay */}
      {!isOnline && rideState === "none" ? (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.offlineOverlay,
            { backgroundColor: theme.backgroundRoot + "E6" },
          ]}
        >
          <View style={styles.offlineContent}>
            <View style={[styles.offlineIcon, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="power" size={32} color={theme.textSecondary} />
            </View>
            <ThemedText style={styles.offlineTitle}>
              You're Offline
            </ThemedText>
            <ThemedText style={[styles.offlineSubtitle, { color: theme.textSecondary }]}>
              Go online to start receiving ride requests
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

      {/* Rider Cancellation Alert */}
      <Modal
        visible={rideCancelledByRider}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.cancelModalOverlay}>
          <View style={[styles.cancelModalCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cancelModalIconCircle, { backgroundColor: "#FEE2E2" }]}>
              <MaterialIcons name="cancel" size={40} color="#EF4444" />
            </View>
            <ThemedText style={styles.cancelModalTitle}>Ride Cancelled</ThemedText>
            <ThemedText style={[styles.cancelModalMsg, { color: theme.textSecondary }]}>
              The rider has cancelled this ride request.
            </ThemedText>
            <Pressable
              onPress={dismissRiderCancellation}
              style={[styles.cancelModalBtn, { backgroundColor: UTOColors.driver.primary }]}
            >
              <ThemedText style={styles.cancelModalBtnText}>OK, Got It</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Payment Collection Screen — appears after completing a ride */}
      <Modal
        visible={!!completedRidePayment}
        transparent={false}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={[styles.paymentFullScreen, { backgroundColor: "#111111" }]}>
          <ScrollView
            contentContainerStyle={styles.paymentScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Top section — checkmark + title */}
            <View style={styles.paymentTopSection}>
              <View style={styles.paymentCheckCircle}>
                <MaterialIcons name="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.paymentTitle}>Trip Completed!</Text>
              <Text style={styles.paymentSubtitle}>Collect payment from the rider</Text>
            </View>

            {/* Amount card — dark card, huge white price */}
            <View style={styles.paymentAmountCard}>
              <Text style={styles.paymentAmountLabel}>AMOUNT TO COLLECT</Text>
              
              {completedRidePayment?.paymentMethod === 'cash' ? (
                <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.paymentAmountPrice}>£</Text>
                    <TextInput
                      style={[styles.paymentAmountPrice, { minWidth: 100, borderBottomWidth: 1, borderBottomColor: '#333' }]}
                      keyboardType="decimal-pad"
                      value={collectedAmountStr}
                      onChangeText={setCollectedAmountStr}
                    />
                  </View>
                  {Number(collectedAmountStr) > (completedRidePayment.amountToCollect !== undefined ? completedRidePayment.amountToCollect : (completedRidePayment.fareAmount || 0)) && (
                    <Text style={{ color: '#10B981', marginTop: 12, fontSize: 16, fontWeight: '500' }}>
                      £{(Number(collectedAmountStr) - (completedRidePayment.amountToCollect !== undefined ? completedRidePayment.amountToCollect : (completedRidePayment.fareAmount || 0))).toFixed(2)} will be added to rider's wallet
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.paymentAmountPrice}>
                  {formatPrice(completedRidePayment?.amountToCollect !== undefined ? completedRidePayment.amountToCollect : (completedRidePayment?.fareAmount || 0))}
                </Text>
              )}

              <View style={[styles.paymentCashBadge, { 
                backgroundColor: completedRidePayment?.paymentMethod === 'card' ? UTOColors.primary + "1A" : "#10B9811A"
              }]}>
                <MaterialIcons 
                  name={completedRidePayment?.paymentMethod === 'card' ? "credit-card" : "payments"} 
                  size={16} 
                  color={completedRidePayment?.paymentMethod === 'card' ? UTOColors.primary : "#10B981"} 
                />
                <Text style={[styles.paymentCashText, { 
                  color: completedRidePayment?.paymentMethod === 'card' ? UTOColors.primary : "#10B981" 
                }]}>
                  {completedRidePayment?.paymentMethod === 'card' ? 'Card Payment' : 'Cash Payment'}
                </Text>
              </View>
            </View>

            {/* Route info */}
            <View style={styles.paymentRouteCard}>
              <View style={styles.paymentRouteRow}>
                <View style={[styles.paymentRouteDot, { backgroundColor: "#10B981" }]} />
                <View style={styles.paymentRouteInfo}>
                  <Text style={styles.paymentRouteLabel}>PICKUP</Text>
                  <Text style={styles.paymentRouteAddr} numberOfLines={1}>
                    {completedRidePayment?.pickupAddress || ""}
                  </Text>
                </View>
              </View>
              <View style={styles.paymentRouteLine} />
              <View style={styles.paymentRouteRow}>
                <View style={[styles.paymentRouteDot, { backgroundColor: "#EF4444" }]} />
                <View style={styles.paymentRouteInfo}>
                  <Text style={styles.paymentRouteLabel}>DROPOFF</Text>
                  <Text style={styles.paymentRouteAddr} numberOfLines={1}>
                    {completedRidePayment?.dropoffAddress || ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.paymentStatsRow}>
              <View style={styles.paymentStatItem}>
                <Feather name="user" size={18} color="#F7C948" />
                <Text style={styles.paymentStatVal} numberOfLines={1}>
                  {completedRidePayment?.riderName || "Rider"}
                </Text>
                <Text style={styles.paymentStatLbl}>Rider</Text>
              </View>
              <View style={styles.paymentStatDivider} />
              <View style={styles.paymentStatItem}>
                <MaterialIcons name="straighten" size={18} color="#F7C948" />
                <Text style={styles.paymentStatVal}>
                  {completedRidePayment?.distanceMiles || 0} mi
                </Text>
                <Text style={styles.paymentStatLbl}>Distance</Text>
              </View>
              <View style={styles.paymentStatDivider} />
              <View style={styles.paymentStatItem}>
                <MaterialIcons name="schedule" size={18} color="#F7C948" />
                <Text style={styles.paymentStatVal}>
                  {completedRidePayment?.durationMinutes || 0} min
                </Text>
                <Text style={styles.paymentStatLbl}>Duration</Text>
              </View>
            </View>

          </ScrollView>

          {/* Sticky bottom button */}
          <View style={[styles.paymentBottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <Pressable
              onPress={() => {
                const expectedAmount = completedRidePayment?.amountToCollect !== undefined ? completedRidePayment.amountToCollect : (completedRidePayment?.fareAmount || 0);
                const collected = Number(collectedAmountStr) || expectedAmount;
                const extraAmount = Math.max(0, collected - expectedAmount);
                dismissPaymentCollection(collected, extraAmount);
              }}
              style={styles.paymentCollectBtn}
            >
              <MaterialIcons name="check-circle" size={22} color="#000000" />
              <Text style={styles.paymentCollectBtnText}>Payment Collected</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Rating Modal — rate the rider after trip */}
      <RatingModal
        visible={!!pendingRating}
        ratedRole="rider"
        ratedName={pendingRating?.riderName || "Rider"}
        rideId={pendingRating?.rideId || ""}
        onSubmit={submitDriverRating}
        onDismiss={dismissDriverRating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  customHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  toggleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  driverMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  rideMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  rideRequestContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 150,
  },
  offlineContent: {
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  offlineIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  offlineSubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  acceptedCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  acceptedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  acceptedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  acceptedHeaderText: {
    flex: 1,
  },
  acceptedTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  acceptedSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  acceptedFare: {
    fontSize: 20,
    fontWeight: "700",
  },
  acceptedDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  acceptedRider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UTOColors.driver.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  acceptedRiderName: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptedPickupLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  acceptedRouteContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  acceptedRoute: {
    flex: 1,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  routeLine: {
    width: 2,
    height: 18,
    marginLeft: 4,
    marginVertical: 3,
  },
  routeAddress: {
    fontSize: 15,
    flex: 1,
  },
  farePriceRightContainer: {
    marginLeft: Spacing.md,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  farePriceRight: {
    fontSize: 18,
    fontWeight: "700",
  },
  arrivedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  arrivedBtnText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#000",
  },
  cancelTripBtn: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cancelTripText: {
    fontWeight: "600",
    fontSize: 14,
  },
  otpInputContainer: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  otpSubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  otpBox: {
    width: 52,
    height: 60,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: {
    fontSize: 26,
    fontWeight: "700",
  },
  numPad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
  },
  numBtn: {
    width: 64,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  numBtnText: {
    fontSize: 20,
    fontWeight: "600",
  },
  startBtn: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  startBtnText: {
    fontWeight: "700",
    fontSize: 16,
  },
  otpErrorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  cancelModalCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  cancelModalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  cancelModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelModalMsg: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  cancelModalBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  cancelModalBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  // ── Payment collection full-screen styles ──
  paymentFullScreen: {
    flex: 1,
  },
  paymentScrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },
  paymentTopSection: {
    alignItems: "center" as const,
    marginBottom: Spacing["2xl"],
  },
  paymentCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10B981",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.lg,
  },
  paymentTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  paymentSubtitle: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  paymentAmountCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    alignItems: "center" as const,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  paymentAmountLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  paymentAmountPrice: {
    fontSize: 44,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  paymentCashBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#10B98120",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  paymentCashText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#10B981",
  },
  paymentRouteCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  paymentRouteRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.sm,
  },
  paymentRouteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  paymentRouteInfo: {
    flex: 1,
  },
  paymentRouteLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  paymentRouteAddr: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: "#FFFFFF",
    marginTop: 2,
  },
  paymentRouteLine: {
    width: 1,
    height: 14,
    backgroundColor: "#333333",
    marginLeft: 4,
    marginVertical: 2,
  },
  paymentStatsRow: {
    flexDirection: "row" as const,
    backgroundColor: "#1E1E1E",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  paymentStatItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 4,
  },
  paymentStatDivider: {
    width: 1,
    backgroundColor: "#333333",
    marginVertical: 4,
  },
  paymentStatVal: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  paymentStatLbl: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  paymentBottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: "#111111",
  },
  paymentCollectBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F7C948",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  paymentCollectBtnText: {
    color: "#000000",
    fontWeight: "700" as const,
    fontSize: 17,
  },
  waitingBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: "center" as const,
  },
});
