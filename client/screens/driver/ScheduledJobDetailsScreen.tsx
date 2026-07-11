import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, ActivityIndicator, Linking, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import { getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/context/AuthContext';
import { useDriver } from '@/context/DriverContext';
import { UTOColors } from '@/constants/theme';
import { getSocket } from '@/lib/socket';

const UTO_YELLOW = '#FFD000';
const ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
const DROP_OFF_COMPLETION_RADIUS_METERS = 200;

type LiveRideStatus = 'accepted' | 'arrived' | 'at_pickup' | 'arriving' | 'in_progress' | 'completed' | 'cancelled' | string;

function fmtDateTimeFull(iso: string | null | undefined) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ScheduledJobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { driverProfile } = useDriver();
  const tabBarHeight = useBottomTabBarHeight();
  
  const initialParams = (route.params as any) || {};
  const bookingIdFromParams = initialParams?.bookingId as string | undefined;
  const [booking, setBooking] = useState<any>(initialParams?.booking || null);
  const [isLoadingBooking, setIsLoadingBooking] = useState<boolean>(!initialParams?.booking && !!bookingIdFromParams);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelOtherText, setCancelOtherText] = useState("");
  const [liveRideId, setLiveRideId] = useState<string | null>(initialParams?.booking?.live_ride_id || null);
  const [liveRideStatus, setLiveRideStatus] = useState<LiveRideStatus | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isFinishingTrip, setIsFinishingTrip] = useState(false);
  const [showEarlyCompleteModal, setShowEarlyCompleteModal] = useState(false);
  const [earlyCompleteReason, setEarlyCompleteReason] = useState<string | null>(null);
  const [earlyCompleteOther, setEarlyCompleteOther] = useState("");
  const [isCheckingArrival, setIsCheckingArrival] = useState(false);

  const refreshLiveRideStatus = useCallback(async (rideId?: string | null) => {
    const targetRideId = rideId || liveRideId || booking?.live_ride_id;
    if (!targetRideId) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/rides/${targetRideId}`);
      if (!res.ok) return;
      const data = await res.json();
      const status = String(data?.ride?.status || "").toLowerCase() as LiveRideStatus;
      if (status) setLiveRideStatus(status);
      if (!liveRideId && targetRideId) setLiveRideId(targetRideId);
    } catch (err) {
      console.warn("Could not refresh live ride status:", err);
    }
  }, [booking?.live_ride_id, liveRideId]);

  useEffect(() => {
    if (booking?.live_ride_id) {
      setLiveRideId(booking.live_ride_id);
      refreshLiveRideStatus(booking.live_ride_id);
    }
  }, [booking?.live_ride_id, refreshLiveRideStatus]);

  useEffect(() => {
    if (!liveRideId) return;
    const interval = setInterval(() => {
      refreshLiveRideStatus(liveRideId);
    }, 15000);
    return () => clearInterval(interval);
  }, [liveRideId, refreshLiveRideStatus]);

  useEffect(() => {
    let cancelled = false;
    if (!bookingIdFromParams || booking) return;

    const loadBooking = async () => {
      try {
        setIsLoadingBooking(true);
        const res = await fetch(`${getApiUrl()}/api/later-bookings/${bookingIdFromParams}`);
        if (!res.ok) throw new Error("Failed to load booking");
        const data = await res.json();
        if (!cancelled) {
          setBooking(data.booking || null);
        }
      } catch (err) {
        if (!cancelled) {
          Alert.alert("Error", "Could not load booking details.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBooking(false);
        }
      }
    };

    loadBooking();
    return () => {
      cancelled = true;
    };
  }, [bookingIdFromParams, booking]);

  const handleDriveToPickup = () => {
    if (!booking?.pickup_address) return;
    const lat = Number(booking?.pickup_latitude);
    const lng = Number(booking?.pickup_longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const encodedAddress = encodeURIComponent(booking.pickup_address);
    const label = encodeURIComponent("Pickup");
    const appUrl = hasCoords
      ? Platform.select({
          ios: `maps:0,0?q=${label}@${lat},${lng}`,
          android: `google.navigation:q=${lat},${lng}`,
          default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        })
      : Platform.select({
          ios: `maps:0,0?q=${encodedAddress}`,
          android: `google.navigation:q=${encodedAddress}`,
          default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        });
    const fallbackWebUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    if (appUrl) {
      Linking.openURL(appUrl).catch(() => Linking.openURL(fallbackWebUrl).catch(() => {
        Alert.alert("Navigation unavailable", "Could not open maps on this device.");
      }));
    }
  };

  if (isLoadingBooking) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={UTOColors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Booking not found</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#DDD', borderRadius: 8 }}>
          <Text>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const now = Date.now();
  const msUntilPickup = new Date(booking.pickup_at).getTime() - now;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const START_GRACE_AFTER_MS = 30 * 60 * 1000;
  const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
  const driverOwnsThis = (() => {
    const ids = [user?.id, driverProfile?.id].filter(Boolean).map(String);
    const bookingIds = [booking.driver_id, booking.assigned_driver_id]
      .filter(Boolean)
      .map(String);
    return bookingIds.some((id) => ids.includes(id));
  })();
  const assignmentPending =
    !!booking.assignment_pending ||
    (!!driverOwnsThis &&
      ['scheduled', 'marketplace', 'assigned'].includes(String(booking.status || '').toLowerCase()) &&
      String(booking.status || '').toLowerCase() !== 'driver_accepted');
  const withinStartWindow =
    msUntilPickup <= ACTIVATION_WINDOW_MS && msUntilPickup >= -START_GRACE_AFTER_MS;
  const tripIsLive = !!liveRideId || !!booking.live_ride_id;
  const tripInProgress = liveRideStatus === "in_progress";
  const isExpiredRide =
    msUntilPickup < -START_GRACE_AFTER_MS &&
    !tripInProgress &&
    liveRideStatus !== "in_progress" &&
    booking.status !== "completed" &&
    booking.status !== "in_progress";
  const canStartTrip =
    driverOwnsThis &&
    booking.status === "driver_accepted" &&
    !tripInProgress &&
    (withinStartWindow || tripIsLive) &&
    !isExpiredRide;


  const handleAccept = async () => {
    Alert.alert(
      'Accept Booking',
      'By accepting this booking, you confirm your availability to complete the trip. If you later cancel, the booking will be released back to marketplace or ASAP dispatch for another driver.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Accept & Agree',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: user?.id })
              });
              if (!res.ok) throw new Error('Failed to accept');
              const data = await res.json();
              setBooking(data.booking);
              Alert.alert('Success', 'Booking accepted successfully!');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Could not accept the booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeclineAssignment = () => {
    Alert.alert(
      'Decline Assigned Ride',
      `Decline ride ${booking.id}? It will return to the marketplace for other drivers.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/decline`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: user?.id, reason: 'declined_assignment' }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to decline');
              }
              // Return immediately — marketplace notify runs in background on server
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not decline the booking.');
            }
          },
        },
      ],
    );
  };

  const submitCancellation = async () => {
    if (!cancelReason) {
      Alert.alert("Reason Required", "Please select a cancellation reason.");
      return;
    }
    const finalReason = cancelReason === 'Other' ? cancelOtherText : cancelReason;
    
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledBy: 'driver', reason: finalReason }),
      });
      if (!res.ok) {
        let resBody: any = {};
        try { resBody = await res.json(); } catch (_) {}
        throw new Error(resBody.error || 'Failed to cancel');
      }
      Alert.alert('Booking Released', 'The booking has been released for another driver.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      setShowCancelModal(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel the booking. Please try again.');
    }
  };

  const openNavigationToDropoff = () => {
    if (!booking?.dropoff_address) return;
    const lat = Number(booking?.dropoff_latitude);
    const lng = Number(booking?.dropoff_longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const encodedAddress = encodeURIComponent(booking.dropoff_address);
    const label = encodeURIComponent("Drop-off");
    const appUrl = hasCoords
      ? Platform.select({
          ios: `maps:0,0?q=${label}@${lat},${lng}`,
          android: `google.navigation:q=${lat},${lng}`,
          default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        })
      : Platform.select({
          ios: `maps:0,0?q=${encodedAddress}`,
          android: `google.navigation:q=${encodedAddress}`,
          default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
        });
    const fallbackWebUrl = hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    if (appUrl) {
      Linking.openURL(appUrl).catch(() => Linking.openURL(fallbackWebUrl).catch(() => {
        Alert.alert("Navigation unavailable", "Could not open maps on this device.");
      }));
    }
  };

  const handleStartTrip = async () => {
    let rideId = liveRideId || booking?.live_ride_id;
    if (!rideId) {
      try {
        const prep = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/prepare-start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId: user?.id }),
        });
        const prepData = await prep.json().catch(() => ({}));
        if (!prep.ok) {
          Alert.alert("Cannot Start Yet", prepData?.error || "This booking is not ready to start.");
          return;
        }
        rideId = prepData?.liveRideId || prepData?.booking?.live_ride_id || null;
        if (prepData?.booking) setBooking(prepData.booking);
        if (rideId) setLiveRideId(rideId);
        if (prepData?.alreadyStarted) {
          setLiveRideStatus("in_progress");
          setShowPinModal(false);
          Alert.alert("Trip Already Started", "Navigate to the drop-off and tap Finish when you arrive.");
          return;
        }
      } catch (_) {
        Alert.alert("Error", "Could not prepare this ride to start. Please try again.");
        return;
      }
    }
    if (!rideId) {
      Alert.alert("Not Yet Active", "Could not activate this booking. Please try again in a moment.");
      return;
    }
    if (pinValue.length < 4) return;
    setIsStartingTrip(true);
    setPinError(false);
    try {
      const res = await fetch(`${getApiUrl()}/api/rides/${rideId}/start-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue, driverId: user?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPinError(true);
        setPinValue("");
        Alert.alert("Invalid PIN", data?.error || "The PIN you entered is incorrect. Please ask the rider for their 4-digit PIN.");
        return;
      }
      setLiveRideStatus("in_progress");
      setBooking((prev: any) => (prev ? { ...prev, status: "in_progress", live_ride_id: rideId } : prev));
      setShowPinModal(false);
      setPinValue("");
      Alert.alert("Trip Started", "Navigate to the drop-off location. Tap Finish when you arrive.");
    } catch (err) {
      Alert.alert("Error", "Could not start the trip. Please try again.");
    } finally {
      setIsStartingTrip(false);
    }
  };

  const openStartTripPinModal = async () => {
    setPinError(false);
    setPinValue("");
    setIsStartingTrip(true);
    try {
      let rideId = liveRideId || booking?.live_ride_id;
      if (!rideId) {
        const prep = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/prepare-start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId: user?.id }),
        });
        const prepData = await prep.json().catch(() => ({}));
        if (!prep.ok) {
          Alert.alert(
            "Cannot Start Yet",
            prepData?.error || "This booking will become available to start within 60 minutes of pickup time.",
          );
          return;
        }
        rideId = prepData?.liveRideId || prepData?.booking?.live_ride_id || null;
        if (prepData?.booking) setBooking(prepData.booking);
        if (rideId) {
          setLiveRideId(rideId);
          setLiveRideStatus("accepted");
        }
        if (prepData?.alreadyStarted) {
          setLiveRideStatus("in_progress");
          Alert.alert("Trip Already Started", "Navigate to the drop-off and tap Finish when you arrive.");
          return;
        }
      }
      if (!rideId) {
        Alert.alert("Not Yet Active", "Could not activate this booking. Please try again shortly.");
        return;
      }
      setShowPinModal(true);
    } catch (err) {
      Alert.alert("Error", "Could not prepare this ride. Please try again.");
    } finally {
      setIsStartingTrip(false);
    }
  };

  const finishTrip = async (reason?: string) => {
    if (!liveRideId) return;
    setIsFinishingTrip(true);
    try {
      const socket = getSocket();
      socket.emit("ride:status", {
        rideId: liveRideId,
        status: "completed",
        driverId: user?.id,
        ...(reason?.trim() ? { earlyCompletionReason: reason.trim() } : {}),
      });
      setLiveRideStatus("completed");
      setShowEarlyCompleteModal(false);
      Alert.alert("Trip Completed", "This scheduled ride has been marked as completed. Payment was already collected.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", "Could not complete the trip. Please try again.");
    } finally {
      setIsFinishingTrip(false);
    }
  };

  const handleFinishTrip = async () => {
    const dropoffLat = Number(booking?.dropoff_latitude);
    const dropoffLng = Number(booking?.dropoff_longitude);
    const hasDropoffCoords = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);

    if (!hasDropoffCoords) {
      Alert.alert(
        "Finish Trip",
        "Drop-off coordinates are unavailable for this booking. Confirm the rider has been dropped off before finishing.",
        [
          { text: "Not Yet", style: "cancel" },
          { text: "Finish Trip", onPress: () => finishTrip() },
        ]
      );
      return;
    }

    setIsCheckingArrival(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Location Needed",
          "Please allow location access to confirm you are near the destination, or use End Early if the passenger requested an early drop-off."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const distanceMeters = haversineDistanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        dropoffLat,
        dropoffLng,
      );

      if (distanceMeters > DROP_OFF_COMPLETION_RADIUS_METERS) {
        Alert.alert(
          "Destination Not Reached",
          `You are still about ${Math.round(distanceMeters)}m from the drop-off. Use End Early only if the passenger requested to finish early.`,
          [
            { text: "Keep Driving", style: "cancel" },
            {
              text: "End Early",
              onPress: () => {
                setEarlyCompleteReason(null);
                setEarlyCompleteOther("");
                setShowEarlyCompleteModal(true);
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        "Finish Trip",
        "You are near the drop-off location. Confirm the passenger has been dropped off.",
        [
          { text: "Not Yet", style: "cancel" },
          { text: "Finish Trip", onPress: () => finishTrip() },
        ]
      );
    } catch (err) {
      Alert.alert(
        "Location Check Failed",
        "We could not confirm your location. Please try again, or use End Early only if the passenger requested to finish early."
      );
    } finally {
      setIsCheckingArrival(false);
    }
  };

  const submitEarlyCompletion = () => {
    if (!earlyCompleteReason) {
      Alert.alert("Reason Required", "Please select a reason for early completion.");
      return;
    }
    const finalReason = earlyCompleteReason === "Other" ? earlyCompleteOther : earlyCompleteReason;
    finishTrip(finalReason);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </Pressable>
        <Text style={s.headerTitle}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.statusBadge, (booking.status === 'cancelled' || isExpiredRide) && s.statusBadgeCancelled]}>
              <Text style={[s.statusText, (booking.status === 'cancelled' || isExpiredRide) && s.statusTextCancelled]}>
                {isExpiredRide
                  ? 'EXPIRED RIDE'
                  : booking.isUrgentScheduled
                    ? 'URGENT SCHEDULED RIDE'
                    : booking.status.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
            <Text style={s.fareText}>{
              (() => {
                const discount = Math.max(0, Number(booking.discount_amount || 0));
                const driverFare = Number(booking.driver_fare);
                const estimated = Number(booking.estimated_fare);
                const fareValue =
                  (Number.isFinite(driverFare) && driverFare > 0)
                    ? driverFare
                    : (Number.isFinite(estimated) && estimated > 0)
                      ? estimated
                      : Math.max(0, Number(booking.full_fare || booking.fare || 0) - discount);
                return fareValue > 0 ? `£${fareValue.toFixed(2)}` : 'N/A';
              })()
            }</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Rider Details</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Name:</Text>
              <Text style={s.detailValue}>
                {booking.rider_name || booking.customer_name || booking.passenger_name || 'Rider'}
              </Text>
            </View>
            {!!booking.rider_phone && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Phone:</Text>
                <Text style={s.detailValue}>{booking.rider_phone}</Text>
              </View>
            )}
            {!!booking.rider_email && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Email:</Text>
                <Text style={s.detailValue}>{booking.rider_email}</Text>
              </View>
            )}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Route Details</Text>
            <View style={s.detailRowStack}>
              <Text style={s.detailLabel}>Pickup:</Text>
              <Text style={s.detailValue}>{booking.pickup_address}</Text>
            </View>
            <View style={s.detailRowStack}>
              <Text style={s.detailLabel}>Drop-off:</Text>
              <Text style={s.detailValue}>{booking.dropoff_address}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Pickup Time:</Text>
              <Text style={s.detailValue}>{fmtDateTimeFull(booking.pickup_at)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Distance:</Text>
              <Text style={s.detailValue}>
                {booking.distance_miles != null && Number(booking.distance_miles) > 0
                  ? `${Number(booking.distance_miles).toFixed(1)} miles`
                  : 'N/A'}
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Duration:</Text>
              <Text style={s.detailValue}>
                {booking.duration_minutes != null && Number(booking.duration_minutes) > 0
                  ? `${Math.round(Number(booking.duration_minutes))} minutes`
                  : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Service Details</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Service Type:</Text>
              <Text style={s.detailValue}>{booking.is_round_trip ? 'Return Journey' : (booking.booking_type === 'airport' ? 'Airport' : 'Scheduled')}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Vehicle Type:</Text>
              <Text style={s.detailValue}>{booking.vehicle_type === 'people_carrier' ? 'People Carrier' : booking.vehicle_type ? booking.vehicle_type.charAt(0).toUpperCase() + booking.vehicle_type.slice(1) : 'Saloon'}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Passengers:</Text>
              <Text style={s.detailValue}>{booking.passengers || 1}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Luggage:</Text>
              <Text style={s.detailValue}>{booking.luggage || 0}</Text>
            </View>
            {booking.flight_number && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Flight Number:</Text>
                <Text style={s.detailValue}>{booking.flight_number}</Text>
              </View>
            )}
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Payment Method:</Text>
              <Text style={s.detailValue}>Card / Prepaid</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[s.bottomBar, { paddingBottom: tabBarHeight > 0 ? tabBarHeight + 16 : Math.max(insets.bottom, 16) }]}>
        {(booking.status === 'scheduled' || booking.status === 'marketplace' || booking.status === 'assigned') && !assignmentPending && (
          <Pressable style={s.acceptBtn} onPress={handleAccept}>
            <Text style={s.acceptBtnText}>Accept Booking</Text>
          </Pressable>
        )}
        {assignmentPending && driverOwnsThis && (
          <View style={{ gap: 10 }}>
            <Pressable style={s.acceptBtn} onPress={handleAccept}>
              <Text style={s.acceptBtnText}>Accept Assigned Ride</Text>
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={handleDeclineAssignment}>
              <Text style={s.cancelBtnText}>Decline — Return to Marketplace</Text>
            </Pressable>
          </View>
        )}
        {booking.status === 'driver_accepted' && driverOwnsThis && tripInProgress && (
          <>
            <Pressable style={s.driveBtn} onPress={openNavigationToDropoff}>
              <Text style={s.driveBtnText}>Navigate To Destination</Text>
            </Pressable>
            <Pressable
              style={[s.acceptBtn, { backgroundColor: '#10B981' }]}
              onPress={handleFinishTrip}
              disabled={isFinishingTrip || isCheckingArrival}
            >
              {isFinishingTrip || isCheckingArrival ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[s.acceptBtnText, { color: '#FFFFFF' }]}>Finish Trip</Text>
              )}
            </Pressable>
            <Pressable
              style={[s.cancelBtn, { marginTop: 10, backgroundColor: '#FEF3C7' }]}
              onPress={() => {
                setEarlyCompleteReason(null);
                setEarlyCompleteOther("");
                setShowEarlyCompleteModal(true);
              }}
              disabled={isFinishingTrip || isCheckingArrival}
            >
              <Text style={[s.cancelBtnText, { color: '#92400E' }]}>End Early</Text>
            </Pressable>
          </>
        )}
        {booking.status === 'driver_accepted' && driverOwnsThis && isExpiredRide && !tripInProgress && (
          <View style={s.expiredBanner}>
            <Text style={s.expiredBannerTitle}>Expired Ride</Text>
            <Text style={s.expiredBannerText}>
              This pickup time has passed. The ride can no longer be started from here.
            </Text>
          </View>
        )}
        {booking.status === 'driver_accepted' && driverOwnsThis && !tripInProgress && canStartTrip && (
          <>
            <Pressable style={s.driveBtn} onPress={handleDriveToPickup}>
              <Text style={s.driveBtnText}>Drive To Pickup Location</Text>
            </Pressable>
            <Pressable
              style={s.acceptBtn}
              onPress={openStartTripPinModal}
              disabled={isStartingTrip}
            >
              {isStartingTrip ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.acceptBtnText}>Start Trip (Enter Rider PIN)</Text>
              )}
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={() => setShowCancelModal(true)}>
              <Text style={s.cancelBtnText}>Cancel Booking</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* PIN Entry Modal */}
      <Modal visible={showPinModal} transparent animationType="slide" onRequestClose={() => setShowPinModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Enter Rider PIN</Text>
            <Text style={s.modalDesc}>
              Ask the rider for their 4-digit PIN to start this scheduled trip.
            </Text>
            {pinError ? (
              <Text style={{ color: '#DC2626', marginTop: 8, fontWeight: '600' }}>Wrong PIN. Please try again.</Text>
            ) : null}
            <TextInput
              style={s.pinInput}
              value={pinValue}
              onChangeText={(text) => setPinValue(text.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
              secureTextEntry
            />
            <View style={s.modalActions}>
              <Pressable style={s.modalBackBtn} onPress={() => { setShowPinModal(false); setPinValue(""); setPinError(false); }}>
                <Text style={s.modalBackBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalConfirmBtn, { backgroundColor: pinValue.length === 4 ? UTOColors.primary : '#D1D5DB' }]}
                onPress={handleStartTrip}
                disabled={pinValue.length < 4 || isStartingTrip}
              >
                {isStartingTrip ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={[s.modalConfirmBtnText, { color: '#000000' }]}>Start Trip</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Early Completion Modal */}
      {showEarlyCompleteModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Early Completion</Text>
            <Text style={s.modalDesc}>Please select a reason for completing before reaching the destination:</Text>
            {['Passenger request', 'Traffic restriction', 'Wrong address', 'Other'].map((reason) => (
              <Pressable
                key={reason}
                style={[s.reasonOption, earlyCompleteReason === reason && s.reasonOptionSelected]}
                onPress={() => setEarlyCompleteReason(reason)}
              >
                <View style={[s.radioOuter, earlyCompleteReason === reason && s.radioOuterSelected]}>
                  {earlyCompleteReason === reason && <View style={s.radioInner} />}
                </View>
                <Text style={s.reasonText}>{reason}</Text>
              </Pressable>
            ))}
            {earlyCompleteReason === 'Other' && (
              <TextInput
                style={s.otherInput}
                placeholder="Please describe the reason..."
                value={earlyCompleteOther}
                onChangeText={setEarlyCompleteOther}
                multiline
              />
            )}
            <View style={s.modalActions}>
              <Pressable style={s.modalBackBtn} onPress={() => setShowEarlyCompleteModal(false)}>
                <Text style={s.modalBackBtnText}>Go Back</Text>
              </Pressable>
              <Pressable style={[s.modalConfirmBtn, { backgroundColor: '#10B981' }]} onPress={submitEarlyCompletion}>
                <Text style={s.modalConfirmBtnText}>Finish Trip</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {withinThreeHours ? (
              <>
                <Text style={s.modalTitle}>Late Cancellation Warning</Text>
                <Text style={s.modalDesc}>
                  This pickup is less than 3 hours away. Cancelling now will release the booking for ASAP dispatch to nearby available drivers.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.modalTitle}>Cancel Booking</Text>
                <Text style={s.modalDesc}>
                  Cancelling will release this booking back to the marketplace for another driver.
                </Text>
              </>
            )}

            <Text style={{ marginTop: 16, marginBottom: 8, fontWeight: '600', color: '#374151' }}>Please select a reason:</Text>
            {['Vehicle issue', 'Emergency', 'Accepted by mistake', 'Too far away', 'Other'].map(reason => (
              <Pressable 
                key={reason} 
                style={[s.reasonOption, cancelReason === reason && s.reasonOptionSelected]}
                onPress={() => setCancelReason(reason)}
              >
                <View style={[s.radioOuter, cancelReason === reason && s.radioOuterSelected]}>
                  {cancelReason === reason && <View style={s.radioInner} />}
                </View>
                <Text style={s.reasonText}>{reason}</Text>
              </Pressable>
            ))}

            {cancelReason === 'Other' && (
              <TextInput
                style={s.otherInput}
                placeholder="Please describe the reason..."
                value={cancelOtherText}
                onChangeText={setCancelOtherText}
                multiline
              />
            )}

            <View style={s.modalActions}>
              <Pressable style={s.modalBackBtn} onPress={() => { setShowCancelModal(false); setCancelReason(null); }}>
                <Text style={s.modalBackBtnText}>Go Back</Text>
              </Pressable>
              <Pressable 
                style={[s.modalConfirmBtn, { backgroundColor: withinThreeHours ? '#DC2626' : '#EF4444' }]} 
                onPress={submitCancellation}
              >
                <Text style={s.modalConfirmBtnText}>{withinThreeHours ? 'Cancel Anyway' : 'Confirm Cancellation'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  statusBadge: { backgroundColor: UTOColors.primary + '30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#92610A' },
  statusBadgeCancelled: { backgroundColor: '#FEE2E2' },
  statusTextCancelled: { color: '#DC2626' },
  fareText: { fontSize: 24, fontWeight: '800', color: '#111827' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailRowStack: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 4, textAlign: 'right', flex: 1 },
  bottomBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingTop: 16 },
  acceptBtn: { backgroundColor: UTOColors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  acceptBtnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#FEE2E2', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  driveBtn: { backgroundColor: UTOColors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  driveBtnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  expiredBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  expiredBannerTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  expiredBannerText: { fontSize: 14, color: '#7F1D1D', lineHeight: 20 },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  reasonOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  reasonOptionSelected: { backgroundColor: '#F9FAFB' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOuterSelected: { borderColor: UTOColors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: UTOColors.primary },
  reasonText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  otherInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBackBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalBackBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalConfirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pinInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    fontSize: 24,
    letterSpacing: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
});

//client/screens/driver/ScheduledJobDetailsScreen.tsx

// import React, { useState } from 'react';
// import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// import { getApiUrl } from '@/lib/query-client';
// import { useAuth } from '@/context/AuthContext';
// import { UTOColors } from '@/constants/theme';

// const UTO_YELLOW = '#FFD000';

// function fmtDateTimeFull(iso: string | null | undefined) {
//   if (!iso) return 'N/A';
//   const d = new Date(iso);
//   return d.toLocaleString('en-GB', {
//     weekday: 'short',
//     day: 'numeric',
//     month: 'short',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   });
// }

// function fmtTime(iso: string | null | undefined) {
//   if (!iso) return 'N/A';
//   const d = new Date(iso);
//   return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// }

// export default function ScheduledJobDetailsScreen() {
//   const insets = useSafeAreaInsets();
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = useAuth();
//   const tabBarHeight = useBottomTabBarHeight();
  
//   const [booking, setBooking] = useState<any>((route.params as any)?.booking);
//   const [showCancelModal, setShowCancelModal] = useState(false);
//   const [cancelReason, setCancelReason] = useState<string | null>(null);
//   const [cancelOtherText, setCancelOtherText] = useState("");

//   if (!booking) {
//     return (
//       <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
//         <Text>Booking not found</Text>
//         <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 10, backgroundColor: '#DDD', borderRadius: 8 }}>
//           <Text>Go Back</Text>
//         </Pressable>
//       </View>
//     );
//   }

//   const now = Date.now();
//   const msUntilPickup = new Date(booking.pickup_at).getTime() - now;
//   const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//   const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
//   const fare = booking.estimated_fare;
//   const penalty = fare ? (parseFloat(String(fare)) * 0.5) : 0;
//   const driverOwnsThis = booking.driver_id === user?.id || booking.assigned_driver_id === user?.id;

//   const handleAccept = async () => {
//     Alert.alert(
//       'Accept Booking',
//       'By accepting this booking, you confirm your availability to complete the trip.\n\n• Cancellations made more than 3 hours before pickup will not incur any charges.\n• Cancellations made within 3 hours of pickup may result in a charge of up to 50% of the fare.',
//       [
//         { text: 'Go Back', style: 'cancel' },
//         {
//           text: 'Accept & Agree',
//           onPress: async () => {
//             try {
//               const res = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/accept`, {
//                 method: 'PUT',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ driverId: user?.id })
//               });
//               if (!res.ok) throw new Error('Failed to accept');
//               const data = await res.json();
//               setBooking(data.booking);
//               Alert.alert('Success', 'Booking accepted successfully!');
//               navigation.goBack();
//             } catch (err) {
//               Alert.alert('Error', 'Could not accept the booking. Please try again.');
//             }
//           },
//         },
//       ]
//     );
//   };

//   const submitCancellation = async () => {
//     if (!cancelReason) {
//       Alert.alert("Reason Required", "Please select a cancellation reason.");
//       return;
//     }
//     const finalReason = cancelReason === 'Other' ? cancelOtherText : cancelReason;
    
//     try {
//       const res = await fetch(`${getApiUrl()}/api/later-bookings/${booking.id}/cancel`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ cancelledBy: 'driver', reason: finalReason }),
//       });
//       if (!res.ok) {
//         let resBody: any = {};
//         try { resBody = await res.json(); } catch (_) {}
//         throw new Error(resBody.error || 'Failed to cancel');
//       }
//       if (withinThreeHours && penalty > 0) {
//         Alert.alert(
//           'Booking Cancelled',
//           `A penalty of £${penalty.toFixed(2)} has been recorded against your account.`,
//           [{ text: 'OK', onPress: () => navigation.goBack() }]
//         );
//       } else {
//         Alert.alert('Cancelled', 'Booking cancelled successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
//       }
//       setShowCancelModal(false);
//     } catch (err) {
//       Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel the booking. Please try again.');
//     }
//   };

//   return (
//     <View style={[s.root, { paddingTop: insets.top }]}>
//       {/* Header */}
//       <View style={s.header}>
//         <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
//           <Feather name="arrow-left" size={24} color="#000000" />
//         </Pressable>
//         <Text style={s.headerTitle}>Job Details</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
//         <View style={s.card}>
//           <View style={s.cardHeader}>
//             <View style={[s.statusBadge, booking.status === 'cancelled' && s.statusBadgeCancelled]}>
//               <Text style={[s.statusText, booking.status === 'cancelled' && s.statusTextCancelled]}>
//                 {booking.isUrgentScheduled ? 'URGENT SCHEDULED RIDE' : booking.status.toUpperCase().replace('_', ' ')}
//               </Text>
//             </View>
//             <Text style={s.fareText}>{booking.estimated_fare || booking.estimated_price ? `£${parseFloat(String(booking.estimated_fare || booking.estimated_price)).toFixed(2)}` : 'N/A'}</Text>
//           </View>

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>Route Details</Text>
//             <View style={s.detailRowStack}>
//               <Text style={s.detailLabel}>Pickup:</Text>
//               <Text style={s.detailValue}>{booking.pickup_address}</Text>
//             </View>
//             <View style={s.detailRowStack}>
//               <Text style={s.detailLabel}>Drop-off:</Text>
//               <Text style={s.detailValue}>{booking.dropoff_address}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Pickup Time:</Text>
//               <Text style={s.detailValue}>{fmtDateTimeFull(booking.pickup_at || booking.scheduled_time)}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Distance:</Text>
//               <Text style={s.detailValue}>{booking.distance_miles ? `${booking.distance_miles.toFixed(1)} miles` : 'N/A'}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Duration:</Text>
//               <Text style={s.detailValue}>{booking.duration_minutes ? `${booking.duration_minutes} minutes` : 'N/A'}</Text>
//             </View>
//           </View>

//           <View style={s.section}>
//             <Text style={s.sectionTitle}>Service Details</Text>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Service Type:</Text>
//               <Text style={s.detailValue}>{booking.is_round_trip ? 'Return Journey' : (booking.booking_type === 'airport' ? 'Airport' : 'Scheduled')}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Vehicle Type:</Text>
//               <Text style={s.detailValue}>{booking.vehicle_type === 'people_carrier' ? 'People Carrier' : booking.vehicle_type ? booking.vehicle_type.charAt(0).toUpperCase() + booking.vehicle_type.slice(1) : 'Saloon'}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Passengers:</Text>
//               <Text style={s.detailValue}>{booking.passengers || 1}</Text>
//             </View>
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Luggage:</Text>
//               <Text style={s.detailValue}>{booking.luggage || 0}</Text>
//             </View>
//             {booking.flight_number && (
//               <View style={s.detailRow}>
//                 <Text style={s.detailLabel}>Flight Number:</Text>
//                 <Text style={s.detailValue}>{booking.flight_number}</Text>
//               </View>
//             )}
//             <View style={s.detailRow}>
//               <Text style={s.detailLabel}>Payment Method:</Text>
//               <Text style={s.detailValue}>{booking.payment_method === 'cash' ? 'Cash' : 'Card / App'}</Text>
//             </View>
//           </View>
//         </View>
//       </ScrollView>

//       {/* Fixed Bottom Action Bar */}
//       <View style={[s.bottomBar, { paddingBottom: tabBarHeight > 0 ? tabBarHeight + 16 : Math.max(insets.bottom, 16) }]}>
//         {booking.status === 'scheduled' || booking.status === 'marketplace' && (
//           <Pressable style={s.acceptBtn} onPress={handleAccept}>
//             <Text style={s.acceptBtnText}>Accept Booking</Text>
//           </Pressable>
//         )}
//         {booking.status === 'driver_accepted' && driverOwnsThis && (
//           <Pressable style={s.cancelBtn} onPress={() => setShowCancelModal(true)}>
//             <Text style={s.cancelBtnText}>Cancel Booking</Text>
//           </Pressable>
//         )}
//       </View>

//       {/* Cancellation Modal */}
//       {showCancelModal && (
//         <View style={s.modalOverlay}>
//           <View style={s.modalContent}>
//             {withinThreeHours ? (
//               <>
//                 <Text style={s.modalTitle}>Late Cancellation Warning</Text>
//                 <Text style={s.modalDesc}>
//                   This pickup is less than 3 hours away. Cancelling now may result in a penalty of up to 50% of the journey fare (£{penalty.toFixed(2)}) and may affect your driver account.
//                 </Text>
//               </>
//             ) : (
//               <>
//                 <Text style={s.modalTitle}>Cancel Booking</Text>
//                 <Text style={s.modalDesc}>
//                   Free cancellation is available until 3 hours before pickup. If you cancel within 3 hours of pickup, a fee of up to 50% of the fare may apply.
//                 </Text>
//               </>
//             )}

//             <Text style={{ marginTop: 16, marginBottom: 8, fontWeight: '600', color: '#374151' }}>Please select a reason:</Text>
//             {['Vehicle issue', 'Emergency', 'Accepted by mistake', 'Too far away', 'Other'].map(reason => (
//               <Pressable 
//                 key={reason} 
//                 style={[s.reasonOption, cancelReason === reason && s.reasonOptionSelected]}
//                 onPress={() => setCancelReason(reason)}
//               >
//                 <View style={[s.radioOuter, cancelReason === reason && s.radioOuterSelected]}>
//                   {cancelReason === reason && <View style={s.radioInner} />}
//                 </View>
//                 <Text style={s.reasonText}>{reason}</Text>
//               </Pressable>
//             ))}

//             {cancelReason === 'Other' && (
//               <TextInput
//                 style={s.otherInput}
//                 placeholder="Please describe the reason..."
//                 value={cancelOtherText}
//                 onChangeText={setCancelOtherText}
//                 multiline
//               />
//             )}

//             <View style={s.modalActions}>
//               <Pressable style={s.modalBackBtn} onPress={() => { setShowCancelModal(false); setCancelReason(null); }}>
//                 <Text style={s.modalBackBtnText}>Go Back</Text>
//               </Pressable>
//               <Pressable 
//                 style={[s.modalConfirmBtn, { backgroundColor: withinThreeHours ? '#DC2626' : '#EF4444' }]} 
//                 onPress={submitCancellation}
//               >
//                 <Text style={s.modalConfirmBtnText}>{withinThreeHours ? 'Cancel Anyway' : 'Confirm Cancellation'}</Text>
//               </Pressable>
//             </View>
//           </View>
//         </View>
//       )}
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   root: { flex: 1, backgroundColor: '#F3F4F6' },
//   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
//   headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
//   scrollContent: { padding: 16, paddingBottom: 40 },
//   card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
//   cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
//   statusBadge: { backgroundColor: UTOColors.primary + '30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
//   statusText: { fontSize: 12, fontWeight: '700', color: '#92610A' },
//   statusBadgeCancelled: { backgroundColor: '#FEE2E2' },
//   statusTextCancelled: { color: '#DC2626' },
//   fareText: { fontSize: 24, fontWeight: '800', color: '#111827' },
//   section: { marginBottom: 24 },
//   sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
//   detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
//   detailRowStack: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
//   detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
//   detailValue: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 4, textAlign: 'right', flex: 1 },
//   bottomBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingTop: 16 },
//   acceptBtn: { backgroundColor: UTOColors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
//   acceptBtnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
//   cancelBtn: { backgroundColor: '#FEE2E2', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
//   cancelBtnText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },

//   modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
//   modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxHeight: '90%' },
//   modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
//   modalDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
//   reasonOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//   reasonOptionSelected: { backgroundColor: '#F9FAFB' },
//   radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
//   radioOuterSelected: { borderColor: UTOColors.primary },
//   radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: UTOColors.primary },
//   reasonText: { fontSize: 15, color: '#111827', fontWeight: '500' },
//   otherInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top' },
//   modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
//   modalBackBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
//   modalBackBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
//   modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
//   modalConfirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
// });
