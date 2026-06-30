import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/context/AuthContext';
import { UTOColors } from '@/constants/theme';

const UTO_YELLOW = '#FFD000';

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

export default function ScheduledJobDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [booking, setBooking] = useState<any>((route.params as any)?.booking);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelOtherText, setCancelOtherText] = useState("");

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
  const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
  const fare = booking.estimated_fare;
  const penalty = fare ? (parseFloat(String(fare)) * 0.5) : 0;
  const driverOwnsThis = booking.driver_id === user?.id;

  const handleAccept = async () => {
    Alert.alert(
      'Accept Booking',
      'By accepting this booking, you confirm your availability to complete the trip.\n\n• Cancellations made more than 3 hours before pickup will not incur any charges.\n• Cancellations made within 3 hours of pickup may result in a charge of up to 50% of the fare.',
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
      if (withinThreeHours && penalty > 0) {
        Alert.alert(
          'Booking Cancelled',
          `A penalty of £${penalty.toFixed(2)} has been recorded against your account.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Cancelled', 'Booking cancelled successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
      setShowCancelModal(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel the booking. Please try again.');
    }
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
            <View style={[s.statusBadge, booking.status === 'cancelled' && s.statusBadgeCancelled]}>
              <Text style={[s.statusText, booking.status === 'cancelled' && s.statusTextCancelled]}>
                {booking.isUrgentScheduled ? 'URGENT SCHEDULED RIDE' : booking.status.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
            <Text style={s.fareText}>{booking.estimated_fare ? `£${parseFloat(String(booking.estimated_fare)).toFixed(2)}` : 'N/A'}</Text>
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
              <Text style={s.detailValue}>{booking.distance_miles ? `${booking.distance_miles.toFixed(1)} miles` : 'N/A'}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Duration:</Text>
              <Text style={s.detailValue}>{booking.duration_minutes ? `${booking.duration_minutes} minutes` : 'N/A'}</Text>
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
              <Text style={s.detailValue}>{booking.payment_method === 'cash' ? 'Cash' : 'Card / App'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[s.bottomBar, { paddingBottom: tabBarHeight > 0 ? tabBarHeight + 16 : Math.max(insets.bottom, 16) }]}>
        {booking.status === 'scheduled' && (
          <Pressable style={s.acceptBtn} onPress={handleAccept}>
            <Text style={s.acceptBtnText}>Accept Booking</Text>
          </Pressable>
        )}
        {booking.status === 'driver_accepted' && driverOwnsThis && (
          <Pressable style={s.cancelBtn} onPress={() => setShowCancelModal(true)}>
            <Text style={s.cancelBtnText}>Cancel Booking</Text>
          </Pressable>
        )}
      </View>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {withinThreeHours ? (
              <>
                <Text style={s.modalTitle}>Late Cancellation Warning</Text>
                <Text style={s.modalDesc}>
                  This pickup is less than 3 hours away. Cancelling now may result in a penalty of up to 50% of the journey fare (£{penalty.toFixed(2)}) and may affect your driver account.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.modalTitle}>Cancel Booking</Text>
                <Text style={s.modalDesc}>
                  Free cancellation is available until 3 hours before pickup. If you cancel within 3 hours of pickup, a fee of up to 50% of the fare may apply.
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
