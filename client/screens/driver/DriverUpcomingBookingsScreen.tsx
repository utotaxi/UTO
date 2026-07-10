// client/screens/driver/DriverUpcomingBookingsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import { getSocket } from '@/lib/socket';
import { useNavigation } from '@react-navigation/native';

const UTO_YELLOW = '#FFD000';

interface LaterBooking {
  id: string;
  rider_id: string;
  rider_name?: string | null;
  rider_email?: string | null;
  rider_phone?: string | null;
  customer_name?: string | null;
  passenger_name?: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_at: string;
  dropoff_by: string;
  status: string;
  created_at: string;
  estimated_fare?: number | null;
  discount_amount?: number | null;
  driver_fare?: number | null;
  driver_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  assignment_pending?: boolean;
  passengers?: number;
  luggage?: number;
  booking_type?: string;
  is_round_trip?: boolean;
  vehicle_type?: string;
  flight_number?: string;
  distance_miles?: number;
  duration_minutes?: number;
}

function displayRiderName(item: LaterBooking) {
  return item.rider_name || item.customer_name || item.passenger_name || 'Rider';
}

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

function formatVehicle(v?: string) {
  if (!v) return 'Saloon';
  if (v === 'people_carrier') return 'People Carrier';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function isPendingAssignment(item: LaterBooking) {
  if (item.assignment_pending) return true;
  const status = String(item.status || '').toLowerCase();
  const assigned = !!(item.assigned_driver_id || item.driver_id);
  return assigned && (status === 'scheduled' || status === 'marketplace' || status === 'assigned');
}

function UpcomingBookingCard({
  item,
  onPress,
  onAccept,
  onDecline,
  busyId,
}: {
  item: LaterBooking;
  onPress: (item: LaterBooking) => void;
  onAccept: (item: LaterBooking) => void;
  onDecline: (item: LaterBooking) => void;
  busyId: string | null;
}) {
  const fareValue = (() => {
    const discount = Math.max(0, Number(item.discount_amount || 0));
    const driverFare = Number(item.driver_fare);
    const estimated = Number(item.estimated_fare);
    if (Number.isFinite(driverFare) && driverFare > 0) return driverFare;
    if (Number.isFinite(estimated) && estimated > 0) return estimated;
    const full = Number((item as any).full_fare || (item as any).fare || 0);
    if (Number.isFinite(full) && full > 0) return Math.max(0, full - discount);
    return 0;
  })();
  const fareStr = fareValue > 0
    ? `£${fareValue.toFixed(2)}`
    : 'N/A';

  let jobType = 'Scheduled';
  if (item.booking_type === 'airport') jobType = 'Airport';
  if (item.is_round_trip) jobType = 'Return Journey';

  const now = Date.now();
  const msUntilPickup = new Date(item.pickup_at).getTime() - now;
  const isUpcoming = msUntilPickup > 0;
  const isExpired = msUntilPickup <= 0;
  const hoursLeft = Math.floor(msUntilPickup / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msUntilPickup % (1000 * 60 * 60)) / (1000 * 60));
  const pending = isPendingAssignment(item);
  const isBusy = busyId === item.id;

  return (
    <Pressable style={s.card} onPress={() => onPress(item)}>
      <View style={s.cardHeader}>
        <View style={[
          s.statusBadge,
          {
            backgroundColor: pending
              ? '#FEF3C720'
              : isExpired
                ? '#FEE2E220'
                : '#10B98120',
          },
        ]}>
          <Text style={[
            s.statusText,
            {
              color: pending
                ? '#B45309'
                : isExpired
                  ? '#DC2626'
                  : '#059669',
            },
          ]}>
            {pending ? 'ASSIGNED — ACTION NEEDED' : isExpired ? 'EXPIRED' : 'ACCEPTED'}
          </Text>
        </View>
        {isUpcoming ? (
          <Text style={s.countdownText}>
            {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`} until pickup
          </Text>
        ) : (
          <Text style={[s.countdownText, { color: '#DC2626' }]}>Pickup time passed</Text>
        )}
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      </View>

      <View style={s.detailsContainer}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Ride ID:</Text>
          <Text style={[s.detailValue, { fontSize: 12 }]} numberOfLines={1}>{item.id}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Job Type:</Text>
          <Text style={s.detailValue}>{jobType}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Rider:</Text>
          <Text style={s.detailValue}>{displayRiderName(item)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Pickup:</Text>
          <Text style={s.detailValue} numberOfLines={2}>{item.pickup_address}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Dropoff:</Text>
          <Text style={s.detailValue} numberOfLines={2}>{item.dropoff_address}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>When:</Text>
          <Text style={s.detailValue}>{fmtDateTimeFull(item.pickup_at)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Vehicle:</Text>
          <Text style={s.detailValue}>{formatVehicle(item.vehicle_type)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Fare:</Text>
          <Text style={[s.detailValue, { fontWeight: '800', color: '#059669' }]}>{fareStr}</Text>
        </View>
      </View>

      {pending ? (
        <View style={s.actionRow}>
          <Pressable
            style={[s.declineBtn, isBusy && { opacity: 0.6 }]}
            disabled={!!isBusy}
            onPress={(e) => {
              e.stopPropagation?.();
              onDecline(item);
            }}
          >
            <Text style={s.declineBtnText}>{isBusy ? '...' : 'Decline'}</Text>
          </Pressable>
          <Pressable
            style={[s.acceptBtn, isBusy && { opacity: 0.6 }]}
            disabled={!!isBusy}
            onPress={(e) => {
              e.stopPropagation?.();
              onAccept(item);
            }}
          >
            <Text style={s.acceptBtnText}>{isBusy ? '...' : 'Accept'}</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DriverUpcomingBookingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try { tabBarHeight = useBottomTabBarHeight(); } catch (_) {}

  const [bookings, setBookings] = useState<LaterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { user } = useAuth();

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings${user?.id ? `?driverId=${user.id}` : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // Upcoming = accepted by this driver OR pending assignment offers for this driver
      const mine = (data.bookings || []).filter((b: LaterBooking) => {
        const status = String(b.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'completed') return false;
        if (status === 'driver_accepted') return true;
        return isPendingAssignment(b);
      });
      mine.sort((a: LaterBooking, b: LaterBooking) => {
        const aPending = isPendingAssignment(a) ? 0 : 1;
        const bPending = isPendingAssignment(b) ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        const aTs = new Date(a.pickup_at).getTime();
        const bTs = new Date(b.pickup_at).getTime();
        const nowTs = Date.now();
        const aUpcoming = aTs >= nowTs;
        const bUpcoming = bTs >= nowTs;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? aTs - bTs : bTs - aTs;
      });
      setBookings(mine);
    } catch (err) {
      console.warn('Upcoming bookings load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  useEffect(() => {
    const socket = getSocket();
    const onUpdate = () => loadBookings();
    socket.on('later-booking:update', onUpdate);
    return () => {
      socket.off('later-booking:update', onUpdate);
    };
  }, [loadBookings]);

  const handleAccept = (item: LaterBooking) => {
    Alert.alert(
      'Accept Assigned Ride',
      `Accept ride ${item.id}? It will stay in your Upcoming bookings with full details.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setBusyId(item.id);
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${item.id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: user?.id }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to accept');
              }
              await loadBookings();
              Alert.alert('Accepted', 'This ride is now in your Upcoming bookings.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not accept the booking.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleDecline = (item: LaterBooking) => {
    Alert.alert(
      'Decline Assigned Ride',
      `Decline ride ${item.id}? It will return to the marketplace for other drivers.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            // Optimistic remove so the UI feels instant
            setBookings((prev) => prev.filter((b) => b.id !== item.id));
            setBusyId(item.id);
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${item.id}/decline`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: user?.id, reason: 'declined_assignment' }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to decline');
              }
              // Soft refresh in background — booking already removed
              loadBookings().catch(() => {});
            } catch (err: any) {
              await loadBookings();
              Alert.alert('Error', err?.message || 'Could not decline the booking.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </Pressable>
        <MaterialIcons name="event-available" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
        <Text style={s.headerTitle}>Upcoming Bookings</Text>
      </View>
      <Text style={s.headerSub}>
        Assigned offers (Accept / Decline) and rides you have accepted
      </Text>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={UTO_YELLOW} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={s.centered}>
          <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No upcoming bookings</Text>
          <Text style={s.emptyText}>
            When a ride is assigned to you, it appears here with Accept and Decline. Accepted rides stay here with full details.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <UpcomingBookingCard
              item={item}
              busyId={busyId}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onPress={(selectedItem) => {
                (navigation as any).navigate("ScheduledJobDetails", { booking: selectedItem });
              }}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadBookings(); }}
              tintColor={UTO_YELLOW}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#000000' },
  headerSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  countdownText: { flex: 1, fontSize: 12, color: '#6B7280', fontWeight: '600' },
  detailsContainer: { gap: 6 },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailLabel: { width: 72, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  acceptBtn: {
    flex: 1,
    backgroundColor: UTO_YELLOW,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#000000', fontWeight: '800', fontSize: 15 },
});
