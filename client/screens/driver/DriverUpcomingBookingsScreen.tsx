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
  pickup_address: string;
  dropoff_address: string;
  pickup_at: string;
  dropoff_by: string;
  status: string;
  created_at: string;
  estimated_fare?: number | null;
  driver_id?: string | null;
  passengers?: number;
  luggage?: number;
  booking_type?: string;
  is_round_trip?: boolean;
  vehicle_type?: string;
  flight_number?: string;
  distance_miles?: number;
  duration_minutes?: number;
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

function formatVehicle(v?: string) {
  if (!v) return 'Saloon';
  if (v === 'people_carrier') return 'People Carrier';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function UpcomingBookingCard({
  item,
  onPress,
}: {
  item: LaterBooking;
  onPress: (item: LaterBooking) => void;
}) {
  const fareStr = item.estimated_fare
    ? `£${parseFloat(String(item.estimated_fare)).toFixed(2)}`
    : 'N/A';

  let jobType = 'Scheduled';
  if (item.booking_type === 'airport') jobType = 'Airport';
  if (item.is_round_trip) jobType = 'Return Journey';

  const now = Date.now();
  const msUntilPickup = new Date(item.pickup_at).getTime() - now;
  const isUpcoming = msUntilPickup > 0;
  const hoursLeft = Math.floor(msUntilPickup / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msUntilPickup % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Pressable style={s.card} onPress={() => onPress(item)}>
      {/* Status Badge */}
      <View style={s.cardHeader}>
        <View style={[s.statusBadge, { backgroundColor: '#10B98120' }]}>
          <Text style={[s.statusText, { color: '#059669' }]}>ACCEPTED</Text>
        </View>
        {isUpcoming && (
          <Text style={s.countdownText}>
            {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`} until pickup
          </Text>
        )}
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      </View>

      {/* Details */}
      <View style={s.detailsContainer}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Job Type:</Text>
          <Text style={s.detailValue}>{jobType}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Rider Name:</Text>
          <Text style={s.detailValue}>{item.rider_name || 'Rider'}</Text>
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
          <Text style={s.detailLabel}>Vehicle:</Text>
          <Text style={s.detailValue}>{formatVehicle(item.vehicle_type)}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Passengers:</Text>
          <Text style={s.detailValue}>{item.passengers || 1}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Estimated Fare:</Text>
          <Text style={[s.detailValue, { color: '#059669', fontWeight: '800' }]}>{fareStr}</Text>
        </View>
        {item.distance_miles && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Trip distance:</Text>
            <Text style={s.detailValue}>{item.distance_miles.toFixed(1)} miles</Text>
          </View>
        )}
      </View>
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
  const { user } = useAuth();

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings${user?.id ? `?driverId=${user.id}` : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // Filter to only show bookings accepted by this driver
      const accepted = (data.bookings || []).filter(
        (b: LaterBooking) => b.status === 'driver_accepted' && b.driver_id === user?.id
      );
      setBookings(accepted);
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
    socket.on('later-booking:update', loadBookings);
    return () => {
      socket.off('later-booking:update', loadBookings);
    };
  }, [loadBookings]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </Pressable>
        <MaterialIcons name="event-available" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
        <Text style={s.headerTitle}>Upcoming Bookings</Text>
      </View>
      <Text style={s.headerSub}>Rides you have accepted and are scheduled to complete</Text>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={UTO_YELLOW} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={s.centered}>
          <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No upcoming bookings</Text>
          <Text style={s.emptyText}>
            Accepted bookings will appear here. Head to the Marketplace to accept available rides.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <UpcomingBookingCard
              item={item}
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
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  countdownText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  detailsContainer: { marginTop: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowStack: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
    flex: 1,
  },
});

// // client/screens/driver/DriverUpcomingBookingsScreen.tsx
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

// function formatVehicle(v?: string) {
//   if (!v) return 'Saloon';
//   if (v === 'people_carrier') return 'People Carrier';
//   return v.charAt(0).toUpperCase() + v.slice(1);
// }

// function UpcomingBookingCard({
//   item,
//   onPress,
// }: {
//   item: LaterBooking;
//   onPress: (item: LaterBooking) => void;
// }) {
//   const fareStr = item.estimated_fare || item.estimated_price
//     ? `£${parseFloat(String(item.estimated_fare || item.estimated_price)).toFixed(2)}`
//     : 'N/A';

//   let jobType = 'Scheduled';
//   if (item.booking_type === 'airport') jobType = 'Airport';
//   if (item.is_round_trip) jobType = 'Return Journey';

//   const now = Date.now();
//   const msUntilPickup = new Date(item.pickup_at || item.scheduled_time).getTime() - now;
//   const isUpcoming = msUntilPickup > 0;
//   const hoursLeft = Math.floor(msUntilPickup / (1000 * 60 * 60));
//   const minutesLeft = Math.floor((msUntilPickup % (1000 * 60 * 60)) / (1000 * 60));

//   return (
//     <Pressable style={s.card} onPress={() => onPress(item)}>
//       {/* Status Badge */}
//       <View style={s.cardHeader}>
//         <View style={[s.statusBadge, { backgroundColor: '#10B98120' }]}>
//           <Text style={[s.statusText, { color: '#059669' }]}>ACCEPTED</Text>
//         </View>
//         {isUpcoming && (
//           <Text style={s.countdownText}>
//             {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`} until pickup
//           </Text>
//         )}
//         <Feather name="chevron-right" size={20} color="#9CA3AF" />
//       </View>

//       {/* Details */}
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
//           <Text style={s.detailLabel}>Vehicle:</Text>
//           <Text style={s.detailValue}>{formatVehicle(item.vehicle_type)}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Passengers:</Text>
//           <Text style={s.detailValue}>{item.passengers || 1}</Text>
//         </View>
//         <View style={s.detailRow}>
//           <Text style={s.detailLabel}>Estimated Fare:</Text>
//           <Text style={[s.detailValue, { color: '#059669', fontWeight: '800' }]}>{fareStr}</Text>
//         </View>
//         {item.distance_miles && (
//           <View style={s.detailRow}>
//             <Text style={s.detailLabel}>Trip distance:</Text>
//             <Text style={s.detailValue}>{item.distance_miles.toFixed(1)} miles</Text>
//           </View>
//         )}
//       </View>
//     </Pressable>
//   );
// }

// export default function DriverUpcomingBookingsScreen() {
//   const navigation = useNavigation();
//   const insets = useSafeAreaInsets();
//   let tabBarHeight = 0;
//   try { tabBarHeight = useBottomTabBarHeight(); } catch (_) {}
  
//   const [bookings, setBookings] = useState<LaterBooking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const { user } = useAuth();

//   const loadBookings = useCallback(async () => {
//     try {
//       const res = await fetch(`${getApiUrl()}/api/later-bookings${user?.id ? `?driverId=${user.id}` : ''}`);
//       if (!res.ok) throw new Error('Failed to load');
//       const data = await res.json();
//       // Filter to only show bookings accepted by this driver
//       const accepted = (data.bookings || []).filter(
//         // (b: LaterBooking) => b.status === 'driver_accepted' && b.driver_id === user?.id
//         (b: LaterBooking) => b.status === 'driver_accepted' && b.assigned_driver_id === user?.id
//       );
//       setBookings(accepted);
//     } catch (err) {
//       console.warn('Upcoming bookings load error:', err);
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

//   return (
//     <View style={[s.root, { paddingTop: insets.top }]}>
//       {/* Header */}
//       <View style={s.header}>
//         <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
//           <Feather name="arrow-left" size={24} color="#000000" />
//         </Pressable>
//         <MaterialIcons name="event-available" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
//         <Text style={s.headerTitle}>Upcoming Bookings</Text>
//       </View>
//       <Text style={s.headerSub}>Rides you have accepted and are scheduled to complete</Text>

//       {loading ? (
//         <View style={s.centered}>
//           <ActivityIndicator size="large" color={UTO_YELLOW} />
//         </View>
//       ) : bookings.length === 0 ? (
//         <View style={s.centered}>
//           <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
//           <Text style={s.emptyTitle}>No upcoming bookings</Text>
//           <Text style={s.emptyText}>
//             Accepted bookings will appear here. Head to the Marketplace to accept available rides.
//           </Text>
//         </View>
//       ) : (
//         <FlatList
//           data={bookings}
//           keyExtractor={item => item.id}
//           renderItem={({ item }) => (
//             <UpcomingBookingCard
//               item={item}
//               onPress={(selectedItem) => {
//                 (navigation as any).navigate("ScheduledJobDetails", { booking: selectedItem });
//               }}
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
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 16,
//     paddingBottom: 4,
//   },
//   headerTitle: { fontSize: 24, fontWeight: '800', color: '#000000' },
//   headerSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 8 },
//   centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
//   emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
//   emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },

//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 3,
//     borderLeftWidth: 4,
//     borderLeftColor: '#10B981',
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 14,
//   },
//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 20,
//   },
//   statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
//   countdownText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

//   detailsContainer: { marginTop: 4 },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 6,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   detailRowStack: {
//     paddingVertical: 6,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
//   detailValue: {
//     fontSize: 14,
//     color: '#111827',
//     fontWeight: '600',
//     marginTop: 2,
//     textAlign: 'right',
//     flex: 1,
//   },
// });
