// client/screens/driver/DriverMarketplaceScreen.tsx
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
import { useDriver } from '@/context/DriverContext';
import { getApiUrl } from '@/lib/query-client';
import { getSocket } from '@/lib/socket';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

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
  passengers?: number;
  luggage?: number;
  booking_type?: string;
  is_round_trip?: boolean;
  vehicle_type?: string;
  flight_number?: string;
  distance_miles?: number;
  duration_minutes?: number;
  payment_method?: string | null;
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

function fmtTime(iso: string | null | undefined) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
}

function BookingCard({
  item,
  onPress,
  driverId,
}: {
  item: LaterBooking & { isUrgentScheduled?: boolean };
  onPress: (item: LaterBooking) => void;
  driverId?: string;
}) {
  const now = Date.now();
  const msUntilPickup = new Date(item.pickup_at).getTime() - now;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isLateCancelWindow = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
  const driverOwnsThis = item.driver_id === driverId || item.driver_id === driverId;

  let jobType = 'Scheduled';
  if (item.booking_type === 'airport') jobType = 'Airport';
  if (item.is_round_trip) jobType = 'Return Journey';

  const formatVehicle = (v?: string) => {
    if (!v) return 'Saloon';
    if (v === 'people_carrier') return 'People Carrier';
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

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
  const fareStr = fareValue > 0 ? `£${fareValue.toFixed(2)}` : 'N/A';

  return (
    <Pressable style={s.card} onPress={() => onPress(item)}>
      <View style={s.cardHeader}>
        <View style={[s.statusBadge, item.status === 'cancelled' && s.statusBadgeCancelled]}>
          <Text style={[s.statusText, item.status === 'cancelled' && s.statusTextCancelled]}>
            {item.isUrgentScheduled ? 'URGENT SCHEDULED RIDE' : item.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      </View>

      <View style={s.detailsContainer}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Job Type:</Text>
          <Text style={s.detailValue}>{jobType}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Rider Name:</Text>
          <Text style={s.detailValue}>{displayRiderName(item)}</Text>
        </View>
        {!!item.rider_phone && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Rider Phone:</Text>
            <Text style={s.detailValue}>{item.rider_phone}</Text>
          </View>
        )}
        {!!item.rider_email && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Rider Email:</Text>
            <Text style={s.detailValue}>{item.rider_email}</Text>
          </View>
        )}
        <View style={s.detailRowStack}>
          <Text style={s.detailLabel}>Pickup:</Text>
          <Text style={s.detailValue}>{item.pickup_address}</Text>
        </View>
        <View style={s.detailRowStack}>
          <Text style={s.detailLabel}>Drop-off:</Text>
          <Text style={s.detailValue}>{item.dropoff_address}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Pickup Date & Time:</Text>
          <Text style={s.detailValue}>{fmtDateTimeFull(item.pickup_at)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Estimated Drop-off:</Text>
          <Text style={s.detailValue}>{fmtDateTimeFull(item.dropoff_by)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Vehicle Required:</Text>
          <Text style={s.detailValue}>{formatVehicle(item.vehicle_type)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Passengers:</Text>
          <Text style={s.detailValue}>{item.passengers || 1}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Luggage:</Text>
          <Text style={s.detailValue}>{item.luggage || 0} suitcases</Text>
        </View>
        {item.flight_number && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Flight Number:</Text>
            <Text style={s.detailValue}>{item.flight_number}</Text>
          </View>
        )}
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Estimated Fare:</Text>
          <Text style={s.detailValue}>{fareStr}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Payment Method:</Text>
          <Text style={s.detailValue}>
            {String(item.payment_method || 'card').toLowerCase() === 'cash' ? 'Cash' : 'Card / App'}
          </Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Distance to pickup:</Text>
          <Text style={s.detailValue}>Calculating...</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Trip distance:</Text>
          <Text style={s.detailValue}>
            {item.distance_miles != null && Number(item.distance_miles) > 0
              ? `${Number(item.distance_miles).toFixed(1)} miles`
              : 'N/A'}
          </Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Estimated duration:</Text>
          <Text style={s.detailValue}>
            {item.duration_minutes != null && Number(item.duration_minutes) > 0
              ? `${Math.round(Number(item.duration_minutes))} minutes`
              : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={s.cancellationPolicyBox}>
        <Text style={s.deadlineText}>Accepted bookings stay assigned to you until pickup.</Text>
        <Text style={s.lateText}>If you cancel, the booking is released for another driver.</Text>
      </View>

      {/* Late cancel warning for driver */}
      {item.status === 'driver_accepted' && driverOwnsThis && isLateCancelWindow && item.estimated_fare && (
        <View style={s.lateCancelWarning}>
          <Text style={s.lateCancelText}>
            Cancelling close to pickup releases this booking for ASAP dispatch.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function DriverMarketplaceScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [bookings, setBookings] = useState<LaterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { driverProfile } = useDriver();
  const driverQueryId = driverProfile?.id || user?.id;

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(
        `${getApiUrl()}/api/later-bookings${driverQueryId ? `?driverId=${driverQueryId}` : ''}`,
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // Marketplace = open unassigned jobs only. Assigned pending offers live in Upcoming.
      const openJobs = (data.bookings || []).filter((b: LaterBooking) => {
        const status = String(b.status || '').toLowerCase();
        const assigned = !!(b.driver_id || b.assigned_driver_id);
        return (status === 'scheduled' || status === 'marketplace') && !assigned;
      });
      setBookings(openJobs);
    } catch (err) {
      console.warn('Marketplace load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverQueryId]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (payload?: any) => {
      // Instant refresh when a declined/assigned booking returns to marketplace
      if (
        !payload?.type ||
        payload.type === 'created' ||
        payload.type === 'declined' ||
        payload.type === 'released' ||
        payload.type === 'assigned'
      ) {
        loadBookings();
      }
    };
    socket.on('later-booking:update', onUpdate);
    socket.on('later-booking:marketplace', onUpdate);
    return () => {
      socket.off('later-booking:update', onUpdate);
      socket.off('later-booking:marketplace', onUpdate);
    };
  }, [loadBookings]);

  const handleAccept = async (id: string) => {
    Alert.alert(
      'Accept Booking',
      'By accepting this booking, you confirm your availability to complete the trip. If you later cancel, the booking will be released back to the marketplace or ASAP dispatch pool.',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Accept & Agree',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: driverQueryId })
              });
              if (!res.ok) throw new Error('Failed to accept');
              loadBookings();
            } catch (err) {
              Alert.alert('Error', 'Could not accept the booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCancel = (item: LaterBooking) => {
    const now = Date.now();
    const msUntilPickup = new Date(item.pickup_at).getTime() - now;
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
    const message = withinThreeHours
      ? 'You are cancelling close to pickup. The booking will be released for ASAP dispatch to nearby available drivers.'
      : 'You are cancelling this booking. It will be released back to the marketplace.';

    Alert.alert(
      withinThreeHours ? 'Release Booking' : (item.status === 'scheduled' ? 'Decline Booking' : 'Cancel Booking'),
      message,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: item.status === 'scheduled' ? 'Decline' : (withinThreeHours ? 'Release Booking' : 'Cancel Booking'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.status === 'scheduled') {
                // If it's scheduled and hasn't been accepted yet, declining just hides it or we can't really decline a global pool ride unless we store driver rejections. 
                // For now, if they click decline, we just alert them that they ignored it. Or we can just ignore it locally.
                Alert.alert("Declined", "You have declined this job.");
                return;
              }

              const res = await fetch(`${getApiUrl()}/api/later-bookings/${item.id}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: 'driver' }),
              });
              if (!res.ok) {
                let resBody: any = {};
                try { resBody = await res.json(); } catch (_) {}
                throw new Error(resBody.error || 'Failed to cancel');
              }
              Alert.alert('Booking Released', 'The booking has been released for another driver.');
              loadBookings();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel the booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </Pressable>
        <MaterialIcons name="store" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
        <Text style={s.headerTitle}>Marketplace</Text>
      </View>
      <Text style={s.headerSub}>Scheduled rides available to accept</Text>

      {/* Cancellation policy banner */}
      <View style={s.policyBanner}>
        <MaterialIcons name="info-outline" size={16} color="#92610A" style={{ marginRight: 6 }} />
        <Text style={s.policyText}>
          If you cancel an accepted booking, it will be released back to marketplace or ASAP dispatch for another driver.
        </Text>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={UTO_YELLOW} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={s.centered}>
          <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No scheduled rides yet</Text>
          <Text style={s.emptyText}>When riders book a later ride, they'll appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={bookings.filter(b => b.status !== 'driver_accepted')}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onPress={(selectedItem) => {
                (navigation as any).navigate("ScheduledJobDetails", { booking: selectedItem });
              }}
              driverId={user?.id}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#000000' },
  headerSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },

  policyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
  },
  policyText: { flex: 1, fontSize: 12, color: '#92610A', lineHeight: 17 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { backgroundColor: UTO_YELLOW + '30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#92610A', letterSpacing: 0.5 },
  statusBadgeCancelled: { backgroundColor: '#FEE2E2' },
  statusTextCancelled: { color: '#DC2626' },
  cardTime: { fontSize: 13, fontWeight: '600', color: '#374151' },

  detailsContainer: { marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailRowStack: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2, textAlign: 'right', flex: 1 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  declineBtn: { backgroundColor: '#FEE2E2' },
  declineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  acceptJobBtn: { backgroundColor: UTO_YELLOW },
  acceptJobBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },

  lateCancelWarning: {
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  lateCancelText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  
  cancellationPolicyBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#92610A',
  },
  deadlineText: { fontSize: 12, color: '#4B5563', fontWeight: '500', marginBottom: 4 },
  lateText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
});

// // client/screens/driver/DriverMarketplaceScreen.tsx
// import React, { useEffect, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   Pressable,
//   ActivityIndicator,
//   RefreshControl,
//   Alert,
// } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// import { MaterialIcons, Feather } from '@expo/vector-icons';
// import { useAuth } from '@/context/AuthContext';
// import { getApiUrl } from '@/lib/query-client';
// import { getSocket } from '@/lib/socket';
// import { useNavigation } from '@react-navigation/native';

// const UTO_YELLOW = '#FFD000';

// interface LaterBooking {
//   id: string;
//   rider_id: string;
//   pickup_address: string;
//   dropoff_address: string;
//   pickup_at: string;
//   dropoff_by: string;
//   status: string;
//   created_at: string;
//   estimated_fare?: number | null;
//   driver_id?: string | null;
//   passengers?: number;
//   luggage?: number;
//   booking_type?: string;
//   is_round_trip?: boolean;
//   vehicle_type?: string;
//   flight_number?: string;
//   distance_miles?: number;
//   duration_minutes?: number;

//   pickup_latitude?: number;
//   pickup_longitude?: number;
//   dropoff_latitude?: number;
//   dropoff_longitude?: number;
//   estimated_price?: number; //estimated_fare
//   scheduled_time: string; //pickup_at
//   pricing_type?: string;
//   payment_method?: string;
//   commission_calculation?: string;
//   commission_amount?: number;
//   driver_cut?: number;
//   booking_note?: string;
//   dispatch_mode?: string;
//   dispatch_note?: string;
//   reference?: string;
//   assigned_driver_id?: string | null; //driver_id
//   assigned_driver_name?: string | null;
//   assigned_driver_distance_km?: number | null;
// }

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

// function BookingCard({
//   item,
//   onPress,
//   driverId,
// }: {
//   item: LaterBooking & { isUrgentScheduled?: boolean };
//   onPress: (item: LaterBooking) => void;
//   driverId?: string;
// }) {
//   const now = Date.now();
//   const msUntilPickup = new Date(item.pickup_at || item.scheduled_time).getTime() - now;
//   const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//   const isLateCancelWindow = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
//   const driverOwnsThis = item.driver_id === driverId || item.driver_id === driverId;

//   let jobType = 'Scheduled';
//   if (item.booking_type === 'airport') jobType = 'Airport';
//   if (item.is_round_trip) jobType = 'Return Journey';

//   const formatVehicle = (v?: string) => {
//     if (!v) return 'Saloon';
//     if (v === 'people_carrier') return 'People Carrier';
//     return v.charAt(0).toUpperCase() + v.slice(1);
//   };

//   const fareStr = item.estimated_fare || item.estimated_price ? `£${parseFloat(String(item.estimated_fare || item.estimated_price)).toFixed(2)}` : 'N/A';

//   const deadlineDate = new Date(new Date(item.pickup_at || item.scheduled_time).getTime() - THREE_HOURS_MS);
//   const deadlineStr = fmtTime(deadlineDate.toISOString());

//   return (
//     <Pressable style={s.card} onPress={() => onPress(item)}>
//       <View style={s.cardHeader}>
//         <View style={[s.statusBadge, item.status === 'cancelled' && s.statusBadgeCancelled]}>
//           <Text style={[s.statusText, item.status === 'cancelled' && s.statusTextCancelled]}>
//             {item.isUrgentScheduled ? 'URGENT SCHEDULED RIDE' : item.status.toUpperCase().replace('_', ' ')}
//           </Text>
//         </View>
//         <Feather name="chevron-right" size={20} color="#9CA3AF" />
//       </View>

//       <View style={s.detailsContainer}>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Job Type:</Text>
//           <Text style={s.detailValue}>{jobType}</Text>
//         </View>
//         <View style={s.detailRowStack}>
//           <Text style={s.detailLabel}>Pickup:</Text>
//           <Text style={s.detailValue}>{item.pickup_address}</Text>
//         </View>
//         <View style={s.detailRowStack}>
//           <Text style={s.detailLabel}>Drop-off:</Text>
//           <Text style={s.detailValue}>{item.dropoff_address}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Pickup Date & Time:</Text>
//           <Text style={s.detailValue}>{fmtDateTimeFull(item.pickup_at || item.scheduled_time)}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Estimated Drop-off:</Text>
//           <Text style={s.detailValue}>{fmtDateTimeFull(item.dropoff_by)}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Vehicle Required:</Text>
//           <Text style={s.detailValue}>{formatVehicle(item.vehicle_type)}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Passengers:</Text>
//           <Text style={s.detailValue}>{item.passengers || 1}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Luggage:</Text>
//           <Text style={s.detailValue}>{item.luggage || 0} suitcases</Text>
//         </View>
//         {item.flight_number && (
//           <View style={s.detailRow}>
//             <Text style={s.detailLabel}>Flight Number:</Text>
//             <Text style={s.detailValue}>{item.flight_number}</Text>
//           </View>
//         )}
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Estimated Fare:</Text>
//           <Text style={s.detailValue}>{fareStr}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Payment Method:</Text>
//           <Text style={s.detailValue}>Card / App</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Distance to pickup:</Text>
//           <Text style={s.detailValue}>Calculating...</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Trip distance:</Text>
//           <Text style={s.detailValue}>{item.distance_miles ? `${item.distance_miles.toFixed(1)} miles` : 'N/A'}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Estimated duration:</Text>
//           <Text style={s.detailValue}>{item.duration_minutes ? `${item.duration_minutes} minutes` : 'N/A'}</Text>
//         </View>
//       </View>

//       <View style={s.cancellationPolicyBox}>
//         <Text style={s.deadlineText}>Free cancellation until: {deadlineStr}</Text>
//         <Text style={s.lateText}>Late cancellation fee applies after: {deadlineStr}</Text>
//       </View>

//       {/* Late cancel warning for driver */}
//       {item.status === 'driver_accepted' && driverOwnsThis && isLateCancelWindow && item.estimated_fare && (
//         <View style={s.lateCancelWarning}>
//           <Text style={s.lateCancelText}>
//             ⚠️ Cancelling within 3 hours: you'll be charged 50% (£{(parseFloat(String(item.estimated_fare)) * 0.5).toFixed(2)})
//           </Text>
//         </View>
//       )}
//     </Pressable>
//   );
// }

// export default function DriverMarketplaceScreen() {
//   const navigation = useNavigation();
//   const insets = useSafeAreaInsets();
//   const tabBarHeight = useBottomTabBarHeight();
//   const [bookings, setBookings] = useState<LaterBooking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const { user } = useAuth();

//   const loadBookings = useCallback(async () => {
//     try {
//       const res = await fetch(`${getApiUrl()}/api/later-bookings${user?.id ? `?driverId=${user.id}` : ''}`);
//       if (!res.ok) throw new Error('Failed to load');
//       const data = await res.json();
//       setBookings(data.bookings || []);
//     } catch (err) {
//       console.warn('Marketplace load error:', err);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [user?.id]);

//   useEffect(() => { loadBookings(); }, [loadBookings]);

//   useEffect(() => {
//     const socket = getSocket();
//     socket.on('later-booking:update', loadBookings);
//     return () => {
//       socket.off('later-booking:update', loadBookings);
//     };
//   }, [loadBookings]);

//   const handleAccept = async (id: string) => {
//     Alert.alert(
//       'Accept Booking',
//       'By accepting this booking, you agree that if you cancel within 3 hours of the scheduled pickup, you will be responsible for 50% of the journey fare as a cancellation penalty.',
//       [
//         { text: 'Back', style: 'cancel' },
//         {
//           text: 'Accept & Agree',
//           onPress: async () => {
//             try {
//               const res = await fetch(`${getApiUrl()}/api/later-bookings/${id}/accept`, {
//                 method: 'PUT',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ driverId: user?.id })
//               });
//               if (!res.ok) throw new Error('Failed to accept');
//               loadBookings();
//             } catch (err) {
//               Alert.alert('Error', 'Could not accept the booking. Please try again.');
//             }
//           },
//         },
//       ]
//     );
//   };

//   const handleCancel = (item: LaterBooking) => {
//     const now = Date.now();
//     const msUntilPickup = new Date(item.pickup_at).getTime() - now;
//     const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//     const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
//     const fare = item.estimated_fare;
//     const penalty = fare ? (parseFloat(String(fare)) * 0.5) : 0;

//     const message = withinThreeHours
//       ? `You are cancelling within 3 hours of the scheduled pickup. A 50% penalty of £${penalty.toFixed(2)} will be charged to your account.\n\nDo you want to proceed?`
//       : 'You are cancelling this booking. No penalty applies as it is more than 3 hours before pickup.';

//     Alert.alert(
//       withinThreeHours ? 'Cancellation Penalty' : (item.status === 'scheduled' ? 'Decline Booking' : 'Cancel Booking'),
//       message,
//       [
//         { text: 'Keep It', style: 'cancel' },
//         {
//           text: item.status === 'scheduled' ? 'Decline' : (withinThreeHours ? 'Cancel & Accept Penalty' : 'Cancel Booking'),
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               if (item.status === 'scheduled') {
//                 // If it's scheduled and hasn't been accepted yet, declining just hides it or we can't really decline a global pool ride unless we store driver rejections. 
//                 // For now, if they click decline, we just alert them that they ignored it. Or we can just ignore it locally.
//                 Alert.alert("Declined", "You have declined this job.");
//                 return;
//               }

//               const res = await fetch(`${getApiUrl()}/api/later-bookings/${item.id}/cancel`, {
//                 method: 'PUT',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ cancelledBy: 'driver' }),
//               });
//               if (!res.ok) {
//                 let resBody: any = {};
//                 try { resBody = await res.json(); } catch (_) {}
//                 throw new Error(resBody.error || 'Failed to cancel');
//               }
//               if (withinThreeHours && penalty > 0) {
//                 Alert.alert(
//                   'Booking Cancelled',
//                   `A penalty of £${penalty.toFixed(2)} has been recorded against your account.`,
//                   [{ text: 'OK' }]
//                 );
//               }
//               loadBookings();
//             } catch (err) {
//               Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel the booking. Please try again.');
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <View style={[s.root, { paddingTop: insets.top }]}>
//       {/* Header */}
//       <View style={s.header}>
//         <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
//           <Feather name="arrow-left" size={24} color="#000000" />
//         </Pressable>
//         <MaterialIcons name="store" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
//         <Text style={s.headerTitle}>Marketplace</Text>
//       </View>
//       <Text style={s.headerSub}>Scheduled rides available to accept</Text>

//       {/* Cancellation policy banner */}
//       <View style={s.policyBanner}>
//         <MaterialIcons name="info-outline" size={16} color="#92610A" style={{ marginRight: 6 }} />
//         <Text style={s.policyText}>
//           Any cancellation within 3 hours of pickup: you will be responsible for 50% of the journey fare
//         </Text>
//       </View>

//       {loading ? (
//         <View style={s.centered}>
//           <ActivityIndicator size="large" color={UTO_YELLOW} />
//         </View>
//       ) : bookings.length === 0 ? (
//         <View style={s.centered}>
//           <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
//           <Text style={s.emptyTitle}>No scheduled rides yet</Text>
//           <Text style={s.emptyText}>When riders book a later ride, they'll appear here.</Text>
//         </View>
//       ) : (
//         <FlatList
//           data={bookings.filter(b => b.status !== 'driver_accepted')}
//           keyExtractor={item => item.id}
//           renderItem={({ item }) => (
//             <BookingCard
//               item={item}
//               onPress={(selectedItem) => {
//                 (navigation as any).navigate("ScheduledJobDetails", { booking: selectedItem });
//               }}
//               driverId={user?.id}
//             />
//           )}
//           contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 16 }}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={() => { setRefreshing(true); loadBookings(); }}
//               tintColor={UTO_YELLOW}
//             />
//           }
//           ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
//         />
//       )}
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   root: { flex: 1, backgroundColor: '#F9FAFB' },
//   header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
//   headerTitle: { fontSize: 24, fontWeight: '800', color: '#000000' },
//   headerSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 8 },
//   centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
//   emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
//   emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },

//   policyBanner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FEF3C7',
//     marginHorizontal: 16,
//     marginBottom: 12,
//     padding: 12,
//     borderRadius: 10,
//   },
//   policyText: { flex: 1, fontSize: 12, color: '#92610A', lineHeight: 17 },

//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
//   statusBadge: { backgroundColor: UTO_YELLOW + '30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
//   statusText: { fontSize: 11, fontWeight: '700', color: '#92610A', letterSpacing: 0.5 },
//   statusBadgeCancelled: { backgroundColor: '#FEE2E2' },
//   statusTextCancelled: { color: '#DC2626' },
//   cardTime: { fontSize: 13, fontWeight: '600', color: '#374151' },

//   detailsContainer: { marginTop: 4 },
//   detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//   detailRowStack: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//   detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
//   detailValue: { fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2, textAlign: 'right', flex: 1 },

//   actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
//   actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
//   declineBtn: { backgroundColor: '#FEE2E2' },
//   declineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
//   acceptJobBtn: { backgroundColor: UTO_YELLOW },
//   acceptJobBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },

//   lateCancelWarning: {
//     backgroundColor: '#FFF1F2',
//     borderRadius: 8,
//     padding: 10,
//     marginTop: 10,
//     borderLeftWidth: 3,
//     borderLeftColor: '#EF4444',
//   },
//   lateCancelText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  
//   cancellationPolicyBox: {
//     backgroundColor: '#F3F4F6',
//     borderRadius: 8,
//     padding: 12,
//     marginTop: 12,
//     borderLeftWidth: 3,
//     borderLeftColor: '#92610A',
//   },
//   deadlineText: { fontSize: 12, color: '#4B5563', fontWeight: '500', marginBottom: 4 },
//   lateText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
// });

