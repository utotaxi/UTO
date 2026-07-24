// client/screens/rider/RiderScheduledRidesScreen.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useRide } from "@/context/RideContext";
import { getApiUrl } from "@/lib/query-client";
import { getSocket, connectAsRider } from "@/lib/socket";

const UTO_YELLOW = "#FFD000";

// ── Types ──────────────────────────────────────────────────────────
type BookingStatus =
  | "scheduled"
  | "driver_accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

interface ScheduledRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  vias?: { address: string; latitude?: number; longitude?: number }[];
  pickup_at: string;
  dropoff_by: string;
  status: BookingStatus;
  created_at: string;
  estimated_fare?: number;
  discount_amount?: number;
  distance_miles?: number;
  duration_minutes?: number;
  vehicle_type?: string;
  passengers?: number;
  luggage?: number;
  otp?: string | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  assigned_driver_phone?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_vehicle_make?: string | null;
  driver_vehicle_model?: string | null;
  driver_vehicle_color?: string | null;
  driver_license_plate?: string | null;
  driver_vehicle_info?: string | null;
  driver_rating?: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
  return { date, time };
}

function statusLabel(
  status: BookingStatus,
  hasDriver: boolean,
): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case "scheduled":
      return hasDriver
        ? { label: "Driver Assigned", color: "#fff", bg: "#10B981" }
        : { label: "Scheduled", color: "#000", bg: UTO_YELLOW };
    case "driver_accepted":
      return { label: "Driver Assigned", color: "#fff", bg: "#10B981" };
    case "in_progress":
      return { label: "In Progress", color: "#fff", bg: "#3B82F6" };
    case "completed":
      return { label: "Completed", color: "#fff", bg: "#6B7280" };
    case "cancelled":
      return { label: "Cancelled", color: "#fff", bg: "#EF4444" };
    default:
      return { label: status, color: "#fff", bg: "#6B7280" };
  }
}

// ── Ride Card ────────────────────────────────────────────────────────
function RideCard({
  ride,
  onCancel,
  calculateFare,
}: {
  ride: ScheduledRide;
  onCancel: (ride: ScheduledRide) => void;
  calculateFare: (dist: number, dur: number, type: string) => number;
}) {
  const pickup = fmtDateTime(ride.pickup_at);
  const hasDriver = !!(ride.driver_id || ride.assigned_driver_id);
  const badge = statusLabel(ride.status, hasDriver);
  const canCancel =
    ride.status === "scheduled" || ride.status === "driver_accepted";
  const driverName =
    ride.driver_name || ride.assigned_driver_name || "Your Driver";
  const driverPhone = ride.driver_phone || ride.assigned_driver_phone || null;
  const vehicleInfo =
    ride.driver_vehicle_info ||
    [
      ride.driver_vehicle_color,
      ride.driver_vehicle_make,
      ride.driver_vehicle_model,
    ]
      .filter(Boolean)
      .join(" ") ||
    null;
  const licensePlate = ride.driver_license_plate || null;

  // Cancellation policy: within 3 hours = fee applies
  const now = Date.now();
  const msUntilPickup = new Date(ride.pickup_at).getTime() - now;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isLateCancelWindow =
    msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;

  // Rider always sees the discounted fare stored on the booking.
  // Do NOT recalculate from distance (that would wipe the coupon).
  const discount = Math.max(0, Number(ride.discount_amount || 0));
  let displayFare =
    ride.estimated_fare != null
      ? Number(ride.estimated_fare)
      : ride.distance_miles && ride.duration_minutes
        ? Math.max(
            0,
            calculateFare(
              ride.distance_miles,
              ride.duration_minutes,
              ride.vehicle_type || "saloon",
            ) - discount,
          )
        : undefined;

  return (
    <View style={cs.card}>
      {/* Status badge */}
      <View style={[cs.badge, { backgroundColor: badge.bg }]}>
        <Text style={[cs.badgeText, { color: badge.color }]}>
          {badge.label}
        </Text>
      </View>

      {/* Route */}
      <View style={cs.routeRow}>
        <View style={cs.routeIcons}>
          <View style={cs.dotGreen} />
          <View style={cs.routeVertLine} />
          <View style={cs.dotYellow} />
        </View>
        <View style={cs.routeAddresses}>
          <View style={cs.addrBlock}>
            <Text style={cs.addrLabel}>PICKUP</Text>
            <Text style={cs.addrText} numberOfLines={2}>
              {ride.pickup_address}
            </Text>
            <Text style={cs.addrTime}>
              {pickup.date} · {pickup.time}
            </Text>
          </View>
          <View style={{ height: 14 }} />
          {(ride.vias || []).map((via, index) => (
            <View style={cs.addrBlock} key={`via-${index}`}>
              <Text style={cs.addrLabel}>VIA {index + 1}</Text>
              <Text style={cs.addrText} numberOfLines={2}>
                {via.address}
              </Text>
            </View>
          ))}
          <View style={{ height: 14 }} />
          <View style={cs.addrBlock}>
            <Text style={cs.addrLabel}>DROPOFF</Text>
            <Text style={cs.addrText} numberOfLines={2}>
              {ride.dropoff_address}
            </Text>
          </View>
          {/* Passengers & Luggage */}
          {ride.passengers || ride.luggage ? (
            <View style={cs.infoRow}>
              <MaterialIcons name="person" size={14} color="#9CA3AF" />
              <Text style={cs.infoText}>
                {ride.passengers || 1} passenger(s)
              </Text>
              <MaterialIcons
                name="luggage"
                size={14}
                color="#9CA3AF"
                style={{ marginLeft: 10 }}
              />
              <Text style={cs.infoText}>{ride.luggage || 0} baggage</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Fare */}
      {displayFare ? (
        <View style={cs.fareRow}>
          <Text style={cs.fareLabel}>Estimated Fare</Text>
          <Text style={cs.fareValue}>
            £{parseFloat(displayFare as any).toFixed(2)}
          </Text>
        </View>
      ) : null}

      {/* Driver details — shown as soon as a driver is assigned or accepts */}
      {hasDriver ? (
        <View style={cs.driverBox}>
          <View style={cs.driverHeader}>
            <MaterialIcons name="person" size={18} color={UTO_YELLOW} />
            <Text style={cs.driverTitle}>Your Driver</Text>
            {ride.driver_rating != null && Number(ride.driver_rating) > 0 ? (
              <Text style={cs.driverRating}>
                ★ {Number(ride.driver_rating).toFixed(1)}
              </Text>
            ) : null}
          </View>
          <Text style={cs.driverName}>{driverName}</Text>
          {driverPhone ? (
            <View style={cs.driverMetaRow}>
              <MaterialIcons name="phone" size={14} color="#9CA3AF" />
              <Text style={cs.driverMetaText}>{driverPhone}</Text>
            </View>
          ) : null}
          {vehicleInfo ? (
            <View style={cs.driverMetaRow}>
              <MaterialIcons name="directions-car" size={14} color="#9CA3AF" />
              <Text style={cs.driverMetaText}>{vehicleInfo}</Text>
            </View>
          ) : null}
          {licensePlate ? (
            <View style={cs.plateBadge}>
              <Text style={cs.plateText}>{licensePlate}</Text>
            </View>
          ) : null}
        </View>
      ) : ride.status === "scheduled" || ride.status === "driver_accepted" ? (
        <View style={[cs.driverBox, cs.driverBoxPending]}>
          <MaterialIcons name="hourglass-empty" size={16} color="#9CA3AF" />
          <Text style={cs.driverPendingText}>
            Waiting for a driver to be assigned
          </Text>
        </View>
      ) : null}

      {/* Ride PIN — generated at booking time; share with driver at pickup */}
      {ride.otp &&
      ride.status !== "completed" &&
      ride.status !== "cancelled" ? (
        <View style={cs.pinBox}>
          <View style={{ flex: 1 }}>
            <Text style={cs.pinLabel}>YOUR RIDE PIN</Text>
            <Text style={cs.pinHint}>
              Share this PIN with your driver at pickup to start the ride
            </Text>
          </View>
          <Text style={cs.pinValue}>{ride.otp}</Text>
        </View>
      ) : ride.status === "scheduled" ||
        ride.status === "driver_accepted" ||
        ride.status === "in_progress" ? (
        <View style={[cs.pinBox, { backgroundColor: "#374151" }]}>
          <View style={{ flex: 1 }}>
            <Text style={cs.pinLabel}>RIDE PIN</Text>
            <Text style={cs.pinHint}>
              Pull to refresh — your 4-digit PIN will appear here
            </Text>
          </View>
        </View>
      ) : null}

      {/* Late-cancel warning */}
      {canCancel && isLateCancelWindow && (
        <View style={cs.lateCancelWarning}>
          <Text style={cs.lateCancelText}>
            ⚠️ Cancelling now will charge a 100% fee
          </Text>
        </View>
      )}

      {/* Cancel button — only shown if still schedulable */}
      {canCancel && (
        <Pressable style={cs.cancelBtn} onPress={() => onCancel(ride)}>
          <MaterialIcons name="cancel" size={16} color="#EF4444" />
          <Text style={cs.cancelBtnText}>Cancel Ride</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function RiderScheduledRidesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { calculateDynamicFare } = useRide();

  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${getApiUrl()}/api/later-bookings/rider/${user.id}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load rides");
        // Show future rides only (pickup in the future), sorted upcoming first
        const now = Date.now();
        const upcoming = (json.bookings as ScheduledRide[])
          .filter((b) => {
            const pickupTs = new Date(b.pickup_at).getTime();
            const status = String(b.status || "").toLowerCase();
            if (status === "in_progress" || status === "driver_accepted")
              return true;
            if (status === "cancelled" || status === "completed") return false;
            return pickupTs > now - 30 * 60 * 1000; // keep visible through start grace
          })
          .sort(
            (a, b) =>
              new Date(a.pickup_at).getTime() - new Date(b.pickup_at).getTime(),
          );
        setRides(upcoming);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  // Keep rider socket joined and refresh when a driver is assigned / accepts / cancels.
  useEffect(() => {
    if (!user?.id) return;
    try {
      connectAsRider(user.id);
    } catch {
      /* non-critical */
    }
    const socket = getSocket();
    const refresh = () => fetchRides(true);
    const onDriverChange = (payload: any) => {
      if (!payload?.bookingId) {
        refresh();
        return;
      }
      setRides((prev) => {
        const idx = prev.findIndex((r) => r.id === payload.bookingId);
        if (idx < 0) {
          refresh();
          return prev;
        }
        const next = [...prev];
        const current = next[idx];
        const driver = payload.driver;
        if (!driver) {
          next[idx] = {
            ...current,
            status:
              payload.status === "cancelled"
                ? current.status
                : (payload.status as BookingStatus) || "scheduled",
            driver_id: null,
            assigned_driver_id: null,
            assigned_driver_name: null,
            assigned_driver_phone: null,
            driver_name: null,
            driver_phone: null,
            driver_vehicle_make: null,
            driver_vehicle_model: null,
            driver_vehicle_color: null,
            driver_license_plate: null,
            driver_vehicle_info: null,
            driver_rating: null,
          };
          return next;
        }
        next[idx] = {
          ...current,
          status: (payload.status as BookingStatus) || current.status,
          driver_id: driver.id || current.driver_id,
          assigned_driver_id: driver.id || current.assigned_driver_id,
          assigned_driver_name: driver.name || null,
          assigned_driver_phone: driver.phone || null,
          driver_name: driver.name || null,
          driver_phone: driver.phone || null,
          driver_vehicle_make: driver.vehicleMake || null,
          driver_vehicle_model: driver.vehicleModel || null,
          driver_vehicle_color: driver.vehicleColor || null,
          driver_license_plate: driver.licensePlate || null,
          driver_vehicle_info: driver.vehicleInfo || null,
          driver_rating: driver.rating != null ? Number(driver.rating) : null,
        };
        return next;
      });
      // Also refresh from API shortly after so status/PIN stay in sync.
      setTimeout(refresh, 800);
    };
    const onBookingUpdate = (payload: any) => {
      if (
        payload?.type === "accepted" ||
        payload?.type === "assigned" ||
        payload?.type === "released" ||
        payload?.type === "declined" ||
        payload?.type === "cancelled"
      ) {
        refresh();
      }
    };
    socket.on("later-booking:driver", onDriverChange);
    socket.on("later-booking:update", onBookingUpdate);
    return () => {
      socket.off("later-booking:driver", onDriverChange);
      socket.off("later-booking:update", onBookingUpdate);
    };
  }, [user?.id, fetchRides]);

  // Auto-retry on error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => fetchRides(), 5000);
    return () => clearTimeout(timer);
  }, [error, fetchRides]);

  const handleCancel = (ride: ScheduledRide) => {
    const now = Date.now();
    const pickupMs = new Date(ride.pickup_at).getTime();
    const msUntilPickup = pickupMs - now;
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const isLateCancel = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
    const isPastPickup = msUntilPickup < 0;
    const willCharge = isLateCancel || isPastPickup;
    const fare = (ride as any).estimated_fare;

    const title = willCharge ? "Cancellation Fee Applies" : "Cancel Ride";
    const message = willCharge
      ? `You are cancelling within 3 hours of your scheduled pickup. A 100% cancellation fee${fare ? ` (£${(parseFloat(fare) * 1).toFixed(2)})` : ""} will be charged to your wallet.\n\nDo you want to proceed?`
      : "Are you sure you want to cancel and proceed to get the refund?";

    Alert.alert(title, message, [
      { text: "Keep It", style: "cancel" },
      {
        text: willCharge ? "Cancel & Pay Fee" : "Cancel Ride",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(
              `${getApiUrl()}/api/later-bookings/${ride.id}/cancel`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cancelledBy: "rider" }),
              },
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to cancel");
            if (willCharge && json.cancellationFee > 0) {
              Alert.alert(
                "Booking Cancelled",
                `Your booking has been cancelled. A fee of £${parseFloat(json.cancellationFee).toFixed(2)} has been charged.`,
                [{ text: "OK" }],
              );
            }
            fetchRides(true);
          } catch {
            Alert.alert(
              "Error",
              "Could not cancel the ride. Please try again.",
            );
          }
        },
      },
    ]);
  };

  // ── Empty state ────
  const EmptyState = () => (
    <View style={cs.emptyBox}>
      <View style={cs.emptyIconCircle}>
        <MaterialIcons name="event" size={40} color={UTO_YELLOW} />
      </View>
      <Text style={cs.emptyTitle}>No Scheduled Rides</Text>
      <Text style={cs.emptySub}>
        {
          'You haven\'t scheduled any future rides yet. Tap "Reserve" under Services to plan a ride.'
        }
      </Text>
      <Pressable
        style={cs.emptyBtn}
        onPress={() => navigation.navigate("HomeTab")}
      >
        <Text style={cs.emptyBtnText}>Plan a Ride</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[cs.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={cs.header}>
        <Pressable style={cs.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={cs.headerTitle}>Scheduled Rides</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={cs.centerBox}>
          <ActivityIndicator size="large" color={UTO_YELLOW} />
          <Text style={cs.loadingText}>Loading your rides…</Text>
        </View>
      ) : error ? (
        <View style={cs.centerBox}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={cs.errorText}>{error}</Text>
          <Text style={cs.loadingText}>Retrying…</Text>
          <ActivityIndicator
            size="small"
            color={UTO_YELLOW}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            cs.listContent,
            { paddingBottom: insets.bottom + 120 },
            rides.length === 0 && cs.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRides(true);
              }}
              tintColor={UTO_YELLOW}
              colors={[UTO_YELLOW]}
            />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onCancel={handleCancel}
              calculateFare={calculateDynamicFare}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
    backgroundColor: "#000000",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Loading / Error
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingText: { color: "#6B7280", fontSize: 14, marginTop: 8 },
  errorText: { color: "#EF4444", fontSize: 15, textAlign: "center" },

  // List
  listContent: { padding: 16 },
  listEmpty: { flex: 1, justifyContent: "center" },

  // Card
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  // Route
  routeRow: { flexDirection: "row", gap: 12 },
  routeIcons: { alignItems: "center", paddingTop: 6, width: 16 },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  routeVertLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#333333",
    marginVertical: 4,
  },
  dotYellow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UTO_YELLOW,
  },
  routeAddresses: { flex: 1 },
  addrBlock: {},
  addrLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    marginBottom: 2,
  },
  addrText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  addrTime: { fontSize: 13, color: "#9CA3AF", marginTop: 3 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  infoText: { fontSize: 12, color: "#9CA3AF" },

  // Cancel button
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },

  // Fare row
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  fareLabel: { fontSize: 13, color: "#9CA3AF" },
  fareValue: { fontSize: 15, fontWeight: "700", color: "#FFD000" },

  // Driver details
  driverBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#10B98155",
    gap: 6,
  },
  driverBoxPending: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#374151",
    gap: 8,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  driverTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: UTO_YELLOW,
    letterSpacing: 0.8,
  },
  driverRating: { fontSize: 12, color: UTO_YELLOW, fontWeight: "600" },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverMetaText: { fontSize: 13, color: "#D1D5DB" },
  plateBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#FFD000",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  plateText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: 1,
  },
  driverPendingText: { fontSize: 13, color: "#9CA3AF", flex: 1 },

  // Ride PIN
  pinBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: UTO_YELLOW + "55",
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: UTO_YELLOW,
    letterSpacing: 1,
  },
  pinHint: { fontSize: 11, color: "#9CA3AF", marginTop: 3, lineHeight: 15 },
  pinValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 6,
  },

  // Late cancel warning
  lateCancelWarning: {
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  lateCancelText: { fontSize: 12, color: "#FCA5A5", fontWeight: "600" },

  // Empty state
  emptyBox: { alignItems: "center", padding: 32, gap: 12 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  emptySub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: UTO_YELLOW,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: "#000000", fontSize: 15, fontWeight: "700" },
});
