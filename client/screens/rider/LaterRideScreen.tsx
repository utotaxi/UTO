import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TextInput } from 'react-native';

import { LocationInputAutocomplete } from '@/components/LocationInputAutocomplete';
import { useAuth } from '@/context/AuthContext';
import { useRide } from '@/context/RideContext';
import { getApiUrl } from '@/lib/query-client';

const UTO_YELLOW = '#FFD000';

// ── Types ──────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };
type Tab = 'pickup' | 'dropoff';
type VehicleType = 'saloon' | 'people_carrier' | 'minibus';

interface PlaceSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
  latitude?: number;
  longitude?: number;
}

// ── Helpers ────────────────────────────────────────────────────────
function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}



// ── Main Screen ────────────────────────────────────────────────────
export default function LaterRideScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { calculateDynamicFare } = useRide();

  // Passengers & luggage
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);

  // Vehicle eligibility based on passengers & luggage
  const isSaloonEligible = (passengers <= 3 && luggage <= 3) || (passengers <= 4 && luggage === 0);
  const isCarrierEligible = (passengers <= 5 && luggage <= 5) || (passengers <= 6 && luggage === 0);
  const isMinibusEligible = passengers <= 8 && luggage <= 8;

  // Locations
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LatLng | null>(null);

  // Pricing
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('saloon');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponDescription, setCouponDescription] = useState('');
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Auto-select eligible vehicle when passengers/luggage change
  useEffect(() => {
    if (!isSaloonEligible && selectedVehicle === 'saloon') {
      setSelectedVehicle(isCarrierEligible ? 'people_carrier' : 'minibus');
    } else if (!isCarrierEligible && selectedVehicle === 'people_carrier') {
      setSelectedVehicle(isMinibusEligible ? 'minibus' : 'saloon');
    }
  }, [passengers, luggage]);

  // Schedule — ref-based so they never go stale during session
  const openedAt = React.useRef(new Date()).current;
  const maxDate = React.useRef(new Date(openedAt.getTime() + 365 * 24 * 60 * 60 * 1000)).current;

  // Default: pickup = openedAt + 1 hour (rounded to nearest 5 min)

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date(openedAt);
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [hourVal, setHourVal] = useState(() => selectedDate.getHours());
  const [minuteVal, setMinuteVal] = useState(() => {
    const m = selectedDate.getMinutes();
    return Math.round(m / 5) * 5 % 60;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
  }));
  const [isSaving, setIsSaving] = useState(false);

  // Sync hour/minute → selectedDate
  useEffect(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setHours(hourVal, minuteVal, 0, 0);
      return d;
    });
  }, [hourVal, minuteVal]);

  // Calendar navigation limits — use openedAt (stable) not new Date() (re-renders)
  const todayMonth = { year: openedAt.getFullYear(), month: openedAt.getMonth() };
  const maxMonth = { year: maxDate.getFullYear(), month: maxDate.getMonth() };
  const canNavPrev = calendarMonth.year > todayMonth.year ||
    (calendarMonth.year === todayMonth.year && calendarMonth.month > todayMonth.month);
  const canNavNext = calendarMonth.year < maxMonth.year ||
    (calendarMonth.year === maxMonth.year && calendarMonth.month < maxMonth.month);

  // ── Coupon validation ──
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true); setCouponError('');
    try {
      const res = await fetch(`${getApiUrl()}/api/coupons/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode.trim(), fareAmount: estimatedFare ?? 0 }) });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error || 'Invalid coupon'); setIsCouponApplied(false); setCouponDiscount(0); return; }
      setCouponDiscount(data.coupon.discountAmount); setCouponDescription(data.coupon.description); setIsCouponApplied(true);
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setIsValidatingCoupon(false); }
  };
  const handleRemoveCoupon = () => { setCouponCode(''); setCouponDiscount(0); setCouponDescription(''); setIsCouponApplied(false); setCouponError(''); };

  const fareVehicle = (v: VehicleType) => v === 'people_carrier' ? 'minibus' : v;

  // ── Calculate fare when both locations are set or vehicle changes ──
  useEffect(() => {
    if (!pickupLocation || !dropoffLocation) {
      setEstimatedFare(null);
      return;
    }

    const calculateFare = async () => {
      setIsCalculatingFare(true);
      try {
        const baseUrl = getApiUrl();
        const originStr = `${pickupLocation.latitude},${pickupLocation.longitude}`;
        const destStr = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
        const res = await fetch(`${baseUrl}/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`);
        const data = await res.json();

        let dist = 5.5;
        let dur = 15;

        if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]) {
          const leg = data.routes[0].legs[0];
          dist = (leg.distance?.value || 0) / 1000;
          dur = Math.round((leg.duration?.value || 0) / 60);
        }

        setDistanceKm(dist);
        setDurationMin(dur);

        const distanceMiles = dist * 0.621371;
        const fare = calculateDynamicFare(distanceMiles, dur, fareVehicle(selectedVehicle));
        setEstimatedFare(fare);
      } catch (err) {
        console.warn('Failed to calculate fare:', err);
        const fallbackMiles = 3.5;
        const fare = calculateDynamicFare(fallbackMiles, 15, fareVehicle(selectedVehicle));
        setEstimatedFare(fare);
      } finally {
        setIsCalculatingFare(false);
      }
    };

    calculateFare();
  }, [pickupLocation, dropoffLocation, selectedVehicle]);

  // Compute pickup time from spinner
  const computedPickup: Date = (() => {
    const base = new Date(selectedDate);
    base.setHours(hourVal, minuteVal, 0, 0);
    return base;
  })();

  const handleContinue = async () => {
    if (!pickup) { Alert.alert('Missing pickup', 'Please enter a pickup location.'); return; }
    if (!dropoff) { Alert.alert('Missing destination', 'Please enter a destination.'); return; }

    const finalPickup = computedPickup;
    const rightNow = new Date();

    if (finalPickup <= rightNow) {
      Alert.alert('Time has passed', `Pickup time ${fmtTime(finalPickup)} is in the past. Please select a future time.`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    const finalFare = estimatedFare ? Math.max(0, estimatedFare - couponDiscount) : null;
    try {
      const res = await fetch(`${getApiUrl()}/api/later-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: user?.id,
          pickupAddress: pickup,
          pickupLatitude: pickupLocation?.latitude ?? null,
          pickupLongitude: pickupLocation?.longitude ?? null,
          dropoffAddress: dropoff,
          dropoffLatitude: dropoffLocation?.latitude ?? null,
          dropoffLongitude: dropoffLocation?.longitude ?? null,
          pickupAt: finalPickup.toISOString(),
          estimatedFare: finalFare,
          vehicleType: selectedVehicle,
          distanceMiles: distanceKm ? distanceKm * 0.621371 : null,
          durationMinutes: durationMin ?? null,
          passengers,
          luggage,
          couponCode: isCouponApplied ? couponCode : null,
          discountAmount: isCouponApplied ? couponDiscount : 0,
        }),
      });

      let resBody: any = {};
      try { resBody = await res.json(); } catch (_) {}

      if (!res.ok) {
        throw new Error(resBody.error || `Server error ${res.status}`);
      }

      const vName = selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus';
      Alert.alert(
        '🗓 Ride Scheduled!',
        `Your ${vName} ride has been scheduled.\n\nPickup: ${fmtDate(finalPickup)} at ${fmtTime(finalPickup)}\n${passengers} passenger(s), ${luggage} bag(s)${finalFare ? `\nFare: £${finalFare.toFixed(2)}${couponDiscount > 0 ? ` (£${couponDiscount.toFixed(2)} discount)` : ''}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('Later booking error:', err);
      Alert.alert('Error', err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Calendar render ─────────────────────────────────────────────
  const renderCalendar = () => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    // compare to today's date at midnight for disabling past days
    const todayStart = new Date(openedAt.getFullYear(), openedAt.getMonth(), openedAt.getDate());
    const cells: React.ReactElement[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`e${i}`} style={s.calCell} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(calendarMonth.year, calendarMonth.month, d);
      const isSelected = cellDate.toDateString() === selectedDate.toDateString();
      const isPast = cellDate < todayStart;
      const isTooFar = cellDate > maxDate;
      const disabled = isPast || isTooFar;

      cells.push(
        <Pressable
          key={d}
          style={[s.calCell, isSelected && s.calCellSelected, disabled && s.calCellDisabled]}
          onPress={() => {
            if (disabled) return;
            setSelectedDate(prev => {
              const nd = new Date(cellDate);
              nd.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
              return nd;
            });
            setShowCalendar(false);
          }}
        >
          <Text style={[s.calCellText, isSelected && s.calCellTextSelected, disabled && s.calCellTextDisabled]}>
            {d}
          </Text>
        </Pressable>
      );
    }
    return cells;
  };

  // ── UI ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </Pressable>
        <Text style={s.headerTitle}>Plan your ride</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 
        Split layout to fix VirtualizedLists-in-ScrollView warning:
        - Location inputs (contain FlatList inside) → plain View, no ScrollView wrapper
        - Time section (no FlatList) → its own ScrollView
      */}

      {/* ── Location inputs — in plain View, NOT in ScrollView ── */}
      <View style={[s.locationCard, { marginHorizontal: 16, marginTop: 16 }]}>
        <View style={s.locationRow}>
          <View style={s.routeDot} />
          <View style={{ flex: 1 }}>
            <LocationInputAutocomplete
              label="Pickup"
              value={pickup}
              placeholder="Enter pickup location"
              onChangeText={setPickup}
              onSelectLocation={(place: PlaceSuggestion) => {
                setPickup(place.mainText);
                if (place.latitude && place.longitude) {
                  setPickupLocation({ latitude: place.latitude, longitude: place.longitude });
                }
              }}
              type="pickup"
            />
          </View>
        </View>
        <View style={s.routeLine} />
        <View style={s.locationRow}>
          <View style={[s.routeDot, { backgroundColor: UTO_YELLOW }]} />
          <View style={{ flex: 1 }}>
            <LocationInputAutocomplete
              label="Dropoff"
              value={dropoff}
              placeholder="Where to?"
              onChangeText={setDropoff}
              onSelectLocation={(place: PlaceSuggestion) => {
                setDropoff(place.mainText);
                if (place.latitude && place.longitude) {
                  setDropoffLocation({ latitude: place.latitude, longitude: place.longitude });
                }
              }}
              type="dropoff"
            />
          </View>
        </View>
      </View>

      {/* ── Time section — safe to use ScrollView here (no FlatList inside) ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.timeBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Passengers & Luggage (FIRST) ── */}
        <View style={s.counterSection}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Passengers & Luggage</Text>
          <View style={s.counterRow}>
            <View style={s.counterLeft}><MaterialIcons name="person" size={22} color="#374151" /><Text style={s.counterLabel}>Passengers</Text></View>
            <View style={s.counterControls}>
              <Pressable style={[s.counterBtn, passengers <= 1 && s.counterBtnDisabled]} onPress={() => { if (passengers > 1) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPassengers(p => p - 1); } }}><MaterialIcons name="remove" size={20} color={passengers <= 1 ? '#D1D5DB' : '#374151'} /></Pressable>
              <Text style={s.counterValue}>{passengers}</Text>
              <Pressable style={[s.counterBtn, passengers >= 8 && s.counterBtnDisabled]} onPress={() => { if (passengers < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPassengers(p => p + 1); } }}><MaterialIcons name="add" size={20} color={passengers >= 8 ? '#D1D5DB' : '#374151'} /></Pressable>
            </View>
          </View>
          <View style={s.counterDivider} />
          <View style={s.counterRow}>
            <View style={s.counterLeft}><MaterialIcons name="luggage" size={22} color="#374151" /><Text style={s.counterLabel}>Luggage</Text></View>
            <View style={s.counterControls}>
              <Pressable style={[s.counterBtn, luggage <= 0 && s.counterBtnDisabled]} onPress={() => { if (luggage > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLuggage(l => l - 1); } }}><MaterialIcons name="remove" size={20} color={luggage <= 0 ? '#D1D5DB' : '#374151'} /></Pressable>
              <Text style={s.counterValue}>{luggage}</Text>
              <Pressable style={[s.counterBtn, luggage >= 8 && s.counterBtnDisabled]} onPress={() => { if (luggage < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLuggage(l => l + 1); } }}><MaterialIcons name="add" size={20} color={luggage >= 8 ? '#D1D5DB' : '#374151'} /></Pressable>
            </View>
          </View>
        </View>

        {/* ── Vehicle Selector (filtered) ── */}
        <View style={s.vehicleSelector}>
          <Text style={s.vehicleSelectorTitle}>Vehicle Type</Text>
          <View style={{ gap: 10 }}>
            {isSaloonEligible && (
              <Pressable style={[s.vehicleOption, selectedVehicle === 'saloon' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('saloon'); }}>
                <MaterialIcons name="directions-car" size={24} color={selectedVehicle === 'saloon' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}><Text style={[s.vehicleOptionName, selectedVehicle === 'saloon' && s.vehicleOptionNameActive, { marginTop: 0 }]}>Saloon Car</Text><Text style={[s.vehicleOptionDesc, selectedVehicle === 'saloon' && s.vehicleOptionDescActive]}>Up to 3 pax + 3 bags, or 4 pax + hand luggage</Text></View>
              </Pressable>
            )}
            {isCarrierEligible && (
              <Pressable style={[s.vehicleOption, selectedVehicle === 'people_carrier' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('people_carrier'); }}>
                <MaterialIcons name="directions-car" size={24} color={selectedVehicle === 'people_carrier' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}><Text style={[s.vehicleOptionName, selectedVehicle === 'people_carrier' && s.vehicleOptionNameActive, { marginTop: 0 }]}>People Carrier</Text><Text style={[s.vehicleOptionDesc, selectedVehicle === 'people_carrier' && s.vehicleOptionDescActive]}>Up to 5 pax + 5 bags, or 6 pax + hand luggage</Text></View>
              </Pressable>
            )}
            {isMinibusEligible && (
              <Pressable style={[s.vehicleOption, selectedVehicle === 'minibus' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('minibus'); }}>
                <MaterialIcons name="airport-shuttle" size={24} color={selectedVehicle === 'minibus' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}><Text style={[s.vehicleOptionName, selectedVehicle === 'minibus' && s.vehicleOptionNameActive, { marginTop: 0 }]}>8 Seater Minibus</Text><Text style={[s.vehicleOptionDesc, selectedVehicle === 'minibus' && s.vehicleOptionDescActive]}>Up to 8 pax + 8 bags</Text></View>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Pickup time section ── */}
        <View style={s.timeCard}>
          <Text style={s.timeSectionTitle}>Pickup Time</Text>
          <TouchableOpacity style={s.dateHeader} onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.85}>
            <Text style={s.dateHeaderYear}>{selectedDate.getFullYear()}</Text>
            <Text style={s.dateHeaderDate}>{fmtDate(selectedDate)}</Text>
          </TouchableOpacity>
          {showCalendar && (
            <View style={s.calBox}>
              <View style={s.calMonthRow}>
                <Pressable onPress={() => { if (!canNavPrev) return; setCalendarMonth(p => { let m = p.month - 1, y = p.year; if (m < 0) { m = 11; y--; } return { year: y, month: m }; }); }} style={{ opacity: canNavPrev ? 1 : 0.2 }}><MaterialIcons name="chevron-left" size={28} color="#111827" /></Pressable>
                <Text style={s.calMonthLabel}>{new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
                <Pressable onPress={() => { if (!canNavNext) return; setCalendarMonth(p => { let m = p.month + 1, y = p.year; if (m > 11) { m = 0; y++; } return { year: y, month: m }; }); }} style={{ opacity: canNavNext ? 1 : 0.2 }}><MaterialIcons name="chevron-right" size={28} color="#111827" /></Pressable>
              </View>
              <View style={s.calDayNames}>{['S','M','T','W','T','F','S'].map((dn, i) => <Text key={i} style={s.calDayName}>{dn}</Text>)}</View>
              <View style={s.calGrid}>{renderCalendar()}</View>
              <View style={s.calFooter}>
                <Pressable onPress={() => setShowCalendar(false)}><Text style={s.calCancel}>CANCEL</Text></Pressable>
                <Pressable onPress={() => setShowCalendar(false)}><Text style={s.calOk}>OK</Text></Pressable>
              </View>
            </View>
          )}

          {/* Time spinner — descending only */}
          <Text style={s.timeLabel}>Pickup time</Text>
          <View style={s.spinnerRow}>
            <View style={s.spinnerCol}>
              <Text style={s.spinnerVal}>{String(hourVal).padStart(2, '0')}</Text>
              <Pressable onPress={() => setHourVal(h => (h - 1 + 24) % 24)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}><MaterialIcons name="keyboard-arrow-down" size={36} color="#333" /></Pressable>
            </View>
            <Text style={s.spinnerColon}>:</Text>
            <View style={s.spinnerCol}>
              <Text style={s.spinnerVal}>{String(minuteVal).padStart(2, '0')}</Text>
              <Pressable onPress={() => setMinuteVal(m => ((Math.round(m / 5) * 5) - 5 + 60) % 60)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}><MaterialIcons name="keyboard-arrow-down" size={36} color="#333" /></Pressable>
            </View>
          </View>
        </View>

        {/* ── Coupon Code ── */}
        <View style={s.fareCard}>
          <View style={s.fareCardHeader}><MaterialIcons name="local-offer" size={20} color={UTO_YELLOW} /><Text style={s.fareCardTitle}>Discount Coupon</Text></View>
          {isCouponApplied ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12 }}>
              <View><Text style={{ fontSize: 15, fontWeight: '700', color: '#065F46' }}>✓ {couponCode.toUpperCase()}</Text><Text style={{ fontSize: 13, color: '#059669' }}>{couponDescription} — £{couponDiscount.toFixed(2)} off</Text></View>
              <Pressable onPress={handleRemoveCoupon}><Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Remove</Text></Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' }} value={couponCode} onChangeText={(t) => { setCouponCode(t); setCouponError(''); }} placeholder="Enter coupon code" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
              <TouchableOpacity style={{ backgroundColor: UTO_YELLOW, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', opacity: isValidatingCoupon ? 0.7 : 1 }} onPress={handleValidateCoupon} disabled={isValidatingCoupon}>
                {isValidatingCoupon ? <ActivityIndicator size="small" color="#000" /> : <Text style={{ fontWeight: '700', color: '#000' }}>Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
          {couponError ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>{couponError}</Text> : null}
        </View>

        {/* ── Estimated Fare Card ── */}
        {(estimatedFare !== null || isCalculatingFare) && (
          <View style={s.fareCard}>
            <View style={s.fareCardHeader}><MaterialIcons name="receipt" size={20} color={UTO_YELLOW} /><Text style={s.fareCardTitle}>Estimated Fare</Text></View>
            {isCalculatingFare ? (
              <ActivityIndicator size="small" color={UTO_YELLOW} style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={s.fareCardPrice}>£{Math.max(0, estimatedFare! - couponDiscount).toFixed(2)}</Text>
                {couponDiscount > 0 && <Text style={{ fontSize: 13, color: '#059669', marginBottom: 4 }}>Discount: -£{couponDiscount.toFixed(2)}</Text>}
                {distanceKm !== null && durationMin !== null && (
                  <Text style={s.fareCardSub}>{(distanceKm * 0.621371).toFixed(1)} miles · ~{durationMin} min · {selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus'}</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Cancellation Policy */}
        <View style={s.policyCard}>
          <View style={s.policyHeader}><MaterialIcons name="info-outline" size={16} color="#92610A" /><Text style={s.policyTitle}>Cancellation Policy</Text></View>
          <Text style={s.policyText}>
            {"\u2022 Free cancellation up to 3 hours before pickup \u2014 full refund will be issued\n\u2022 Cancellations within 3 hours of scheduled pickup \u2014 full journey fare will be charged\n\u2022 This applies to all bookings including future and ASAP rides\n\u2022 By confirming, you agree to this cancellation policy"}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[s.continueBtn, isSaving && { opacity: 0.7 }]} onPress={handleContinue} activeOpacity={0.85} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator color="#000000" />
            : <Text style={s.continueBtnText}>
                {(() => { const vn = selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus'; const total = estimatedFare ? Math.max(0, estimatedFare - couponDiscount) : null; return total ? `Confirm ${vn} · £${total.toFixed(2)}` : `Confirm ${vn} Booking`; })()}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#000000', textAlign: 'center' },
  body: { padding: 16, gap: 16 },
  timeBody: { padding: 16, gap: 16, paddingTop: 12 },

  // Location card
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginTop: 2 },
  routeLine: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginLeft: 4, marginVertical: 4 },

  // Time card
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  timeSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: UTO_YELLOW },
  tabText: { fontSize: 15, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { fontWeight: '700', color: '#000000' },

  // Dark date header
  dateHeader: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 0,
  },
  dateHeaderYear: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '400', marginBottom: 2 },
  dateHeaderDate: { fontSize: 30, fontWeight: '700', color: '#FFFFFF' },

  // Calendar
  calBox: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  calMonthLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  calDayNames: { flexDirection: 'row', marginBottom: 4 },
  calDayName: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '500', paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSelected: { backgroundColor: UTO_YELLOW, borderRadius: 32 },
  calCellDisabled: { opacity: 0.25 },
  calCellText: { fontSize: 14, color: '#111827', fontWeight: '400' },
  calCellTextSelected: { color: '#000000', fontWeight: '800' },
  calCellTextDisabled: { color: '#9CA3AF' },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 28,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  calCancel: { fontSize: 14, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5 },
  calOk: { fontSize: 14, fontWeight: '700', color: '#000000', letterSpacing: 0.5 },

  // Time spinner
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  spinnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 },
  spinnerCol: { alignItems: 'center', width: 80 },
  spinnerVal: { fontSize: 52, fontWeight: '300', color: '#111827', textAlign: 'center', lineHeight: 64 },
  spinnerColon: { fontSize: 44, fontWeight: '300', color: '#111827', marginBottom: 4 },

  // Opposite time
  oppositeCard: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  oppositeTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  oppositeSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Cancel note
  cancelNote: { fontSize: 12, color: '#6B7280', lineHeight: 18, paddingHorizontal: 4 },

  // Cancellation policy card
  policyCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92610A',
  },
  policyText: {
    fontSize: 12,
    color: '#78590A',
    lineHeight: 20,
  },

  // Vehicle selector
  vehicleSelector: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  vehicleSelectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  vehicleOptionActive: {
    borderColor: UTO_YELLOW,
    backgroundColor: UTO_YELLOW + '15',
  },
  vehicleOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 6,
  },
  vehicleOptionNameActive: {
    color: '#000000',
  },
  vehicleOptionDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  vehicleOptionDescActive: {
    color: '#6B7280',
  },

  // Fare card
  fareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  fareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fareCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fareCardPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  fareCardSub: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Footer
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  continueBtn: {
    backgroundColor: UTO_YELLOW,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: { color: '#000000', fontSize: 17, fontWeight: '700' },

  // Passengers & Luggage counters
  counterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterBtnDisabled: {
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  counterDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
});
