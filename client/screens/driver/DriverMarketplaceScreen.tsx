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
import { getApiUrl } from '@/lib/query-client';
import { useNavigation } from '@react-navigation/native';

const UTO_YELLOW = '#FFD000';

interface LaterBooking {
  id: string;
  rider_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_at: string;
  dropoff_by: string;
  status: string;
  created_at: string;
  estimated_fare?: number | null;
  driver_id?: string | null;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BookingCard({
  item,
  onAccept,
  onCancel,
  driverId,
}: {
  item: LaterBooking;
  onAccept: (id: string) => void;
  onCancel: (item: LaterBooking) => void;
  driverId?: string;
}) {
  const now = Date.now();
  const msUntilPickup = new Date(item.pickup_at).getTime() - now;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isLateCancelWindow = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
  const driverOwnsThis = item.driver_id === driverId || item.driver_id === driverId;

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.statusBadge, item.status === 'cancelled' && s.statusBadgeCancelled]}>
          <Text style={[s.statusText, item.status === 'cancelled' && s.statusTextCancelled]}>
            {item.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
        <Text style={s.cardTime}>{fmtDateTime(item.pickup_at)}</Text>
      </View>

      {/* Route */}
      <View style={s.routeRow}>
        <View style={s.routeIcons}>
          <View style={s.dotGreen} />
          <View style={s.routeLineV} />
          <View style={s.dotYellow} />
        </View>
        <View style={s.routeTexts}>
          <Text style={s.routeAddr} numberOfLines={1}>{item.pickup_address}</Text>
          <View style={{ height: 12 }} />
          <Text style={s.routeAddr} numberOfLines={1}>{item.dropoff_address}</Text>
        </View>
      </View>

      {/* Fare */}
      {item.estimated_fare ? (
        <View style={s.fareRow}>
          <Text style={s.fareLabel}>Estimated Fare</Text>
          <Text style={s.fareValue}>£{parseFloat(String(item.estimated_fare)).toFixed(2)}</Text>
        </View>
      ) : null}

      <View style={s.cardFooter}>
        <View style={s.dropoffRow}>
          <Feather name="clock" size={13} color="#6B7280" />
          <Text style={s.dropoffText}>Dropoff by {fmtDateTime(item.dropoff_by)}</Text>
        </View>
        {item.status === 'scheduled' && (
          <Pressable
            style={s.acceptBtn}
            onPress={() => onAccept(item.id)}
          >
            <Text style={s.acceptBtnText}>Accept</Text>
          </Pressable>
        )}
        {item.status === 'driver_accepted' && driverOwnsThis && (
          <Pressable
            style={[s.acceptBtn, s.cancelBtn]}
            onPress={() => onCancel(item)}
          >
            <Text style={[s.acceptBtnText, { color: '#EF4444' }]}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Late cancel warning for driver */}
      {item.status === 'driver_accepted' && driverOwnsThis && isLateCancelWindow && item.estimated_fare && (
        <View style={s.lateCancelWarning}>
          <Text style={s.lateCancelText}>
            ⚠️ Cancelling within 3 hours: you'll be charged 50% (£{(parseFloat(String(item.estimated_fare)) * 0.5).toFixed(2)})
          </Text>
        </View>
      )}
    </View>
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

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings${user?.id ? `?driverId=${user.id}` : ''}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.warn('Marketplace load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, []);

  const handleAccept = async (id: string) => {
    Alert.alert(
      'Accept Booking',
      'By accepting this booking, you agree that if you cancel within 3 hours of the scheduled pickup, you will be responsible for 50% of the journey fare as a cancellation penalty.',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Accept & Agree',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: user?.id })
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
    const fare = item.estimated_fare;
    const penalty = fare ? (parseFloat(String(fare)) * 0.5) : 0;

    const message = withinThreeHours
      ? `You are cancelling within 3 hours of the scheduled pickup. A 50% penalty of £${penalty.toFixed(2)} will be charged to your account.\n\nDo you want to proceed?`
      : 'You are cancelling this booking. No penalty applies as it is more than 3 hours before pickup.';

    Alert.alert(
      withinThreeHours ? 'Cancellation Penalty' : 'Cancel Booking',
      message,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: withinThreeHours ? 'Cancel & Accept Penalty' : 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${getApiUrl()}/api/later-bookings/${item.id}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: 'driver' }),
              });
              if (!res.ok) throw new Error('Failed to cancel');
              if (withinThreeHours && penalty > 0) {
                Alert.alert(
                  'Booking Cancelled',
                  `A penalty of £${penalty.toFixed(2)} has been recorded against your account.`,
                  [{ text: 'OK' }]
                );
              }
              loadBookings();
            } catch (err) {
              Alert.alert('Error', 'Could not cancel the booking. Please try again.');
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
          Any cancellation within 3 hours of pickup: you will be responsible for 50% of the journey fare
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
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onAccept={handleAccept}
              onCancel={handleCancel}
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

  routeRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  routeIcons: { alignItems: 'center', paddingTop: 2 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  routeLineV: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3 },
  dotYellow: { width: 10, height: 10, borderRadius: 5, backgroundColor: UTO_YELLOW },
  routeTexts: { flex: 1, justifyContent: 'space-between' },
  routeAddr: { fontSize: 14, color: '#111827', fontWeight: '500' },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginBottom: 8 },
  fareLabel: { fontSize: 13, color: '#6B7280' },
  fareValue: { fontSize: 15, fontWeight: '700', color: '#111827' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropoffRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropoffText: { fontSize: 12, color: '#6B7280' },
  acceptBtn: {
    backgroundColor: UTO_YELLOW,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtn: { backgroundColor: '#FEE2E2' },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#000000' },

  lateCancelWarning: {
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  lateCancelText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
});
