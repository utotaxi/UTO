// client/screens/rider/RiderScheduledRidesScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { useRide } from '@/context/RideContext';
import { getApiUrl } from '@/lib/query-client';

const UTO_YELLOW = '#FFD000';

// ── Types ──────────────────────────────────────────────────────────
type BookingStatus = 'scheduled' | 'driver_accepted' | 'in_progress' | 'completed' | 'cancelled';

interface ScheduledRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_at: string;
  dropoff_by: string;
  status: BookingStatus;
  created_at: string;
  estimated_fare?: number;
  distance_miles?: number;
  duration_minutes?: number;
  vehicle_type?: string;
  passengers?: number;
  luggage?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function statusLabel(status: BookingStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'scheduled':      return { label: 'Scheduled',       color: '#000', bg: UTO_YELLOW };
    case 'driver_accepted': return { label: 'Driver Assigned', color: '#fff', bg: '#10B981' };
    case 'in_progress':    return { label: 'In Progress',     color: '#fff', bg: '#3B82F6' };
    case 'completed':      return { label: 'Completed',       color: '#fff', bg: '#6B7280' };
    case 'cancelled':      return { label: 'Cancelled',       color: '#fff', bg: '#EF4444' };
    default:               return { label: status,             color: '#fff', bg: '#6B7280' };
  }
}

// ── Ride Card ────────────────────────────────────────────────────────
function RideCard({ ride, onCancel, calculateFare }: { ride: ScheduledRide; onCancel: (ride: ScheduledRide) => void; calculateFare: (dist: number, dur: number, type: string) => number }) {
  const pickup = fmtDateTime(ride.pickup_at);
  const badge = statusLabel(ride.status);
  const canCancel = ride.status === 'scheduled' || ride.status === 'driver_accepted';

  // Cancellation policy: within 3 hours = fee applies
  const now = Date.now();
  const msUntilPickup = new Date(ride.pickup_at).getTime() - now;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isLateCancelWindow = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
  
  // Calculate dynamic fare if distance & duration are available, otherwise fallback
  let displayFare = ride.estimated_fare;
  if (ride.distance_miles && ride.duration_minutes) {
    displayFare = calculateFare(ride.distance_miles, ride.duration_minutes, ride.vehicle_type || 'saloon');
  }

  return (
    <View style={cs.card}>
      {/* Status badge */}
      <View style={[cs.badge, { backgroundColor: badge.bg }]}>
        <Text style={[cs.badgeText, { color: badge.color }]}>{badge.label}</Text>
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
            <Text style={cs.addrText} numberOfLines={2}>{ride.pickup_address}</Text>
            <Text style={cs.addrTime}>{pickup.date}  ·  {pickup.time}</Text>
          </View>
          <View style={{ height: 14 }} />
          <View style={cs.addrBlock}>
            <Text style={cs.addrLabel}>DROPOFF</Text>
            <Text style={cs.addrText} numberOfLines={2}>{ride.dropoff_address}</Text>
          </View>
          {/* Passengers & Luggage */}
          {(ride.passengers || ride.luggage) ? (
            <View style={cs.infoRow}>
              <MaterialIcons name="person" size={14} color="#9CA3AF" />
              <Text style={cs.infoText}>{ride.passengers || 1} passenger(s)</Text>
              <MaterialIcons name="luggage" size={14} color="#9CA3AF" style={{ marginLeft: 10 }} />
              <Text style={cs.infoText}>{ride.luggage || 0} bag(s)</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Fare */}
      {displayFare ? (
        <View style={cs.fareRow}>
          <Text style={cs.fareLabel}>Estimated Fare</Text>
          <Text style={cs.fareValue}>£{parseFloat(displayFare as any).toFixed(2)}</Text>
        </View>
      ) : null}

      {/* Late-cancel warning */}
      {canCancel && isLateCancelWindow && (
        <View style={cs.lateCancelWarning}>
          <Text style={cs.lateCancelText}>⚠️ Cancelling now will charge the full fare</Text>
        </View>
      )}

      {/* Cancel button — only shown if still schedulable */}
      {canCancel && (
        <Pressable
          style={cs.cancelBtn}
          onPress={() => onCancel(ride)}
        >
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

  const fetchRides = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings/rider/${user.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load rides');
      // Show future rides only (pickup in the future), sorted upcoming first
      const now = Date.now();
      const upcoming = (json.bookings as ScheduledRide[])
        .filter(b => new Date(b.pickup_at).getTime() > now || b.status === 'in_progress')
        .sort((a, b) => new Date(a.pickup_at).getTime() - new Date(b.pickup_at).getTime());
      setRides(upcoming);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  const handleCancel = (ride: ScheduledRide) => {
    const now = Date.now();
    const pickupMs = new Date(ride.pickup_at).getTime();
    const msUntilPickup = pickupMs - now;
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const isLateCancel = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
    const isPastPickup = msUntilPickup < 0;
    const willCharge = isLateCancel || isPastPickup;
    const fare = (ride as any).estimated_fare;

    const title = willCharge ? 'Cancellation Fee Applies' : 'Cancel Ride';
    const message = willCharge
      ? `You are cancelling within 3 hours of your scheduled pickup. The full journey fare${fare ? ` (£${parseFloat(fare).toFixed(2)})` : ''} will be charged.\n\nDo you want to proceed?`
      : 'Free cancellation — this booking is more than 3 hours away.\n\nAre you sure you want to cancel?';

    Alert.alert(
      title,
      message,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: willCharge ? 'Cancel & Pay Fee' : 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${ride.id}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: 'rider' }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error || 'Failed to cancel');
              if (willCharge && json.cancellationFee > 0) {
                Alert.alert(
                  'Booking Cancelled',
                  `Your booking has been cancelled. A fee of £${parseFloat(json.cancellationFee).toFixed(2)} has been charged.`,
                  [{ text: 'OK' }]
                );
              }
              fetchRides(true);
            } catch {
              Alert.alert('Error', 'Could not cancel the ride. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Empty state ────
  const EmptyState = () => (
    <View style={cs.emptyBox}>
      <View style={cs.emptyIconCircle}>
        <MaterialIcons name="event" size={40} color={UTO_YELLOW} />
      </View>
      <Text style={cs.emptyTitle}>No Scheduled Rides</Text>
      <Text style={cs.emptySub}>
        You haven't scheduled any future rides yet. Tap the "Later" option on the home screen to plan a ride.
      </Text>
      <Pressable
        style={cs.emptyBtn}
        onPress={() => navigation.navigate('HomeTab')}
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
          <Pressable style={cs.retryBtn} onPress={() => fetchRides()}>
            <Text style={cs.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            cs.listContent,
            { paddingBottom: insets.bottom + 120 },
            rides.length === 0 && cs.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRides(true); }}
              tintColor={UTO_YELLOW}
              colors={[UTO_YELLOW]}
            />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <RideCard ride={item} onCancel={handleCancel} calculateFare={calculateDynamicFare} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#000000',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },

  // Loading / Error
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText: { color: '#6B7280', fontSize: 14, marginTop: 8 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: UTO_YELLOW, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#000', fontWeight: '700', fontSize: 14 },

  // List
  listContent: { padding: 16 },
  listEmpty: { flex: 1, justifyContent: 'center' },

  // Card
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  // Route
  routeRow: { flexDirection: 'row', gap: 12 },
  routeIcons: { alignItems: 'center', paddingTop: 6, width: 16 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  routeVertLine: { width: 2, flex: 1, backgroundColor: '#333333', marginVertical: 4 },
  dotYellow: { width: 10, height: 10, borderRadius: 5, backgroundColor: UTO_YELLOW },
  routeAddresses: { flex: 1 },
  addrBlock: {},
  addrLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1, marginBottom: 2 },
  addrText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 },
  addrTime: { fontSize: 13, color: '#9CA3AF', marginTop: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  infoText: { fontSize: 12, color: '#9CA3AF' },

  // Cancel button
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  // Fare row
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  fareLabel: { fontSize: 13, color: '#9CA3AF' },
  fareValue: { fontSize: 15, fontWeight: '700', color: '#FFD000' },

  // Late cancel warning
  lateCancelWarning: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  lateCancelText: { fontSize: 12, color: '#FCA5A5', fontWeight: '600' },

  // Empty state
  emptyBox: { alignItems: 'center', padding: 32, gap: 12 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, backgroundColor: UTO_YELLOW,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },
});
