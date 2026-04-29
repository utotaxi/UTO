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
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { LocationInputAutocomplete } from '@/components/LocationInputAutocomplete';
import { useAuth } from '@/context/AuthContext';
import { useRide } from '@/context/RideContext';
import { getApiUrl } from '@/lib/query-client';

const UTO_YELLOW = '#FFD000';

// ── Types ──────────────────────────────────────────────────────────
type LatLng = { latitude: number; longitude: number };

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
export default function AirportBookingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { calculateDynamicFare } = useRide();

  // Locations
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LatLng | null>(null);

  // Flight details
  const [flightNumber, setFlightNumber] = useState('');

  // Passengers & luggage
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(0);

  // Round trip
  const [isReturnJourney, setIsReturnJourney] = useState(false);

  // Return journey locations (manual entry)
  const [returnPickup, setReturnPickup] = useState('');
  const [returnDropoff, setReturnDropoff] = useState('');
  const [returnPickupLocation, setReturnPickupLocation] = useState<LatLng | null>(null);
  const [returnDropoffLocation, setReturnDropoffLocation] = useState<LatLng | null>(null);

  // Vehicle type — now supports 3 types
  type VehicleType = 'saloon' | 'people_carrier' | 'minibus';
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('saloon');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponDescription, setCouponDescription] = useState('');
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Vehicle eligibility based on passengers & luggage
  const isSaloonEligible = (passengers <= 3 && luggage <= 3) || (passengers <= 4 && luggage === 0);
  const isCarrierEligible = (passengers <= 5 && luggage <= 5) || (passengers <= 6 && luggage === 0);
  const isMinibusEligible = passengers <= 8 && luggage <= 8;

  // Pricing
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Schedule — openedAt & maxDate MUST be declared before anything that references them
  const openedAt = React.useRef(new Date()).current;
  const maxDate = React.useRef(new Date(openedAt.getTime() + 365 * 24 * 60 * 60 * 1000)).current;

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

  // Calendar navigation limits — MUST be declared before return journey nav limits
  const todayMonth = { year: openedAt.getFullYear(), month: openedAt.getMonth() };
  const maxMonth = { year: maxDate.getFullYear(), month: maxDate.getMonth() };
  const canNavPrev = calendarMonth.year > todayMonth.year ||
    (calendarMonth.year === todayMonth.year && calendarMonth.month > todayMonth.month);
  const canNavNext = calendarMonth.year < maxMonth.year ||
    (calendarMonth.year === maxMonth.year && calendarMonth.month < maxMonth.month);

  // Return Journey Details — placed AFTER openedAt, todayMonth, maxMonth
  const [returnSelectedVehicle, setReturnSelectedVehicle] = useState<VehicleType>('saloon');

  // Auto-select eligible vehicle when passengers/luggage change
  useEffect(() => {
    if (isSaloonEligible) { if (selectedVehicle !== 'saloon' && selectedVehicle !== 'people_carrier' && selectedVehicle !== 'minibus') setSelectedVehicle('saloon'); }
    else if (isCarrierEligible) { if (selectedVehicle === 'saloon') setSelectedVehicle('people_carrier'); }
    else if (isMinibusEligible) { setSelectedVehicle('minibus'); }
  }, [passengers, luggage]);
  const [returnFlightNumber, setReturnFlightNumber] = useState('');
  const [returnEstimatedFare, setReturnEstimatedFare] = useState<number | null>(null);

  const [returnSelectedDate, setReturnSelectedDate] = useState<Date>(() => {
    const d = new Date(openedAt);
    d.setHours(d.getHours() + 24, 0, 0, 0);
    return d;
  });
  const [returnHourVal, setReturnHourVal] = useState(() => returnSelectedDate.getHours());
  const [returnMinuteVal, setReturnMinuteVal] = useState(() => {
    const m = returnSelectedDate.getMinutes();
    return Math.round(m / 5) * 5 % 60;
  });
  const [showReturnCalendar, setShowReturnCalendar] = useState(false);
  const [returnCalendarMonth, setReturnCalendarMonth] = useState(() => ({
    year: returnSelectedDate.getFullYear(),
    month: returnSelectedDate.getMonth(),
  }));

  // Sync return hour/minute
  useEffect(() => {
    setReturnSelectedDate(prev => {
      const d = new Date(prev);
      d.setHours(returnHourVal, returnMinuteVal, 0, 0);
      return d;
    });
  }, [returnHourVal, returnMinuteVal]);

  const canReturnNavPrev = returnCalendarMonth.year > todayMonth.year ||
    (returnCalendarMonth.year === todayMonth.year && returnCalendarMonth.month > todayMonth.month);
  const canReturnNavNext = returnCalendarMonth.year < maxMonth.year ||
    (returnCalendarMonth.year === maxMonth.year && returnCalendarMonth.month < maxMonth.month);

  // ── Coupon validation ──
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch(`${getApiUrl()}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), fareAmount: estimatedFare ?? 0 }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error || 'Invalid coupon'); setIsCouponApplied(false); setCouponDiscount(0); return; }
      setCouponDiscount(data.coupon.discountAmount);
      setCouponDescription(data.coupon.description);
      setIsCouponApplied(true);
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setIsValidatingCoupon(false); }
  };

  const handleRemoveCoupon = () => { setCouponCode(''); setCouponDiscount(0); setCouponDescription(''); setIsCouponApplied(false); setCouponError(''); };

  // Map people_carrier → minibus for fare calc (pricing only has saloon/minibus tiers)
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
        let fare = calculateDynamicFare(distanceMiles, dur, fareVehicle(selectedVehicle));
        setEstimatedFare(fare);
        let rFare = calculateDynamicFare(distanceMiles, dur, fareVehicle(returnSelectedVehicle));
        setReturnEstimatedFare(rFare);
      } catch (err) {
        console.warn('Failed to calculate fare:', err);
        const fallbackMiles = 3.5;
        let fare = calculateDynamicFare(fallbackMiles, 15, fareVehicle(selectedVehicle));
        setEstimatedFare(fare);
        let rFare = calculateDynamicFare(fallbackMiles, 15, fareVehicle(returnSelectedVehicle));
        setReturnEstimatedFare(rFare);
      } finally {
        setIsCalculatingFare(false);
      }
    };

    calculateFare();
  }, [pickupLocation, dropoffLocation, selectedVehicle, returnSelectedVehicle, isReturnJourney]);

  // ── Calendar render ─────────────────────────────────────────────
  const renderReturnCalendar = () => {
    const firstDay = new Date(returnCalendarMonth.year, returnCalendarMonth.month, 1).getDay();
    const daysInMonth = new Date(returnCalendarMonth.year, returnCalendarMonth.month + 1, 0).getDate();
    const todayStart = new Date(openedAt.getFullYear(), openedAt.getMonth(), openedAt.getDate());
    const cells: React.ReactElement[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`re${i}`} style={s.calCell} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(returnCalendarMonth.year, returnCalendarMonth.month, d);
      const isSelected = cellDate.toDateString() === returnSelectedDate.toDateString();
      const isPast = cellDate < todayStart;
      const isTooFar = cellDate > maxDate;
      const disabled = isPast || isTooFar;

      cells.push(
        <Pressable
          key={d}
          style={[s.calCell, isSelected && s.calCellSelected, disabled && s.calCellDisabled]}
          onPress={() => {
            if (disabled) return;
            setReturnSelectedDate(prev => {
              const nd = new Date(cellDate);
              nd.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
              return nd;
            });
            setShowReturnCalendar(false);
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

  const renderCalendar = () => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
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

  const handleContinue = async () => {
    if (!pickup) { Alert.alert('Missing pickup', 'Please enter a pickup location.'); return; }
    if (!dropoff) { Alert.alert('Missing destination', 'Please enter a destination.'); return; }

    if (!flightNumber || flightNumber.trim() === '') {
      Alert.alert('Missing flight number', 'Please enter your flight number before booking your airport transfer.');
      return;
    }

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(hourVal, minuteVal, 0, 0);
    const rightNow = new Date();

    if (scheduledTime <= rightNow) {
      Alert.alert('Time has passed', `Scheduled time ${fmtTime(scheduledTime)} is in the past. Please select a future time.`);
      return;
    }

    const timeDiffMs = scheduledTime.getTime() - rightNow.getTime();
    if (timeDiffMs < 10 * 60 * 60 * 1000) {
      Alert.alert(
        'Airport Transfer Notice', 
        'Airport transfers must be booked at least 10 hours in advance. Thank you for your understanding.',
        [{ text: 'OK' }]
      );
      return;
    }

    let returnScheduledTime;
    if (isReturnJourney) {
      if (!returnFlightNumber || returnFlightNumber.trim() === '') {
        Alert.alert('Missing return flight number', 'Please enter your return flight number before booking your airport transfer.');
        return;
      }
      returnScheduledTime = new Date(returnSelectedDate);
      returnScheduledTime.setHours(returnHourVal, returnMinuteVal, 0, 0);
      if (returnScheduledTime <= scheduledTime) {
        Alert.alert('Invalid return time', 'Return journey time must be after the outbound journey.');
        return;
      }
      const returnTimeDiffMs = returnScheduledTime.getTime() - rightNow.getTime();
      if (returnTimeDiffMs < 10 * 60 * 60 * 1000) {
        Alert.alert(
          'Airport Transfer Notice', 
          'Return airport transfers must be booked at least 10 hours in advance. Thank you for your understanding.',
          [{ text: 'OK' }]
        );
        return;
      }
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
          pickupAt: scheduledTime.toISOString(),
          estimatedFare: finalFare,
          vehicleType: selectedVehicle,
          distanceMiles: distanceKm ? distanceKm * 0.621371 : null,
          durationMinutes: durationMin ?? null,
          flightNumber: flightNumber || null,
          isReturnJourney: isReturnJourney,
          bookingType: 'airport',
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

      if (isReturnJourney && returnScheduledTime) {
        const rPickup = returnPickup || dropoff;
        const rDropoff = returnDropoff || pickup;
        const rPickupLoc = returnPickupLocation || dropoffLocation;
        const rDropoffLoc = returnDropoffLocation || pickupLocation;
        const returnRes = await fetch(`${getApiUrl()}/api/later-bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riderId: user?.id,
            pickupAddress: rPickup,
            pickupLatitude: rPickupLoc?.latitude ?? null,
            pickupLongitude: rPickupLoc?.longitude ?? null,
            dropoffAddress: rDropoff,
            dropoffLatitude: rDropoffLoc?.latitude ?? null,
            dropoffLongitude: rDropoffLoc?.longitude ?? null,
            pickupAt: returnScheduledTime.toISOString(),
            estimatedFare: returnEstimatedFare ?? null,
            vehicleType: returnSelectedVehicle,
            distanceMiles: distanceKm ? distanceKm * 0.621371 : null,
            durationMinutes: durationMin ?? null,
            flightNumber: returnFlightNumber || null,
            isReturnJourney: true,
            bookingType: 'airport',
            passengers,
            luggage,
            returnPickupAddress: rPickup,
            returnPickupLatitude: rPickupLoc?.latitude ?? null,
            returnPickupLongitude: rPickupLoc?.longitude ?? null,
            returnDropoffAddress: rDropoff,
            returnDropoffLatitude: rDropoffLoc?.latitude ?? null,
            returnDropoffLongitude: rDropoffLoc?.longitude ?? null,
          }),
        });

        let returnResBody: any = {};
        try { returnResBody = await returnRes.json(); } catch (_) {}

        if (!returnRes.ok) {
           throw new Error(returnResBody.error || `Server error on return booking ${returnRes.status}`);
        }
      }

      const vName = selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus';
      Alert.alert(
        '✈️ Airport Transfer Booked!',
        `Your ${vName}${isReturnJourney ? ' Round Trip' : ''} airport transfer has been scheduled.\n\nDate: ${fmtDate(scheduledTime)} at ${fmtTime(scheduledTime)}${flightNumber ? `\nFlight: ${flightNumber}` : ''}\n${passengers} passenger(s), ${luggage} bag(s)${finalFare ? `\nFare: £${finalFare.toFixed(2)}${couponDiscount > 0 ? ` (£${couponDiscount.toFixed(2)} discount)` : ''}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('Airport booking error:', err);
      Alert.alert('Error', err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </Pressable>
        <Text style={s.headerTitle}>Airport Transfer</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Location inputs ── */}
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
              placeholder="Enter drop-off location"
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

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.timeBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Flight Number ── */}
        <View style={s.flightCard}>
          <View style={s.flightHeader}>
            <MaterialIcons name="flight" size={20} color={UTO_YELLOW} />
            <Text style={s.flightLabel}>Flight Number</Text>
          </View>
          <TextInput
            style={s.flightInput}
            value={flightNumber}
            onChangeText={setFlightNumber}
            placeholder="e.g. BA 1234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
        </View>

        {/* ── Passengers & Luggage (FIRST — determines vehicle options) ── */}
        <View style={s.counterSection}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Passengers & Luggage</Text>
          <View style={s.counterRow}>
            <View style={s.counterLeft}>
              <MaterialIcons name="person" size={22} color="#374151" />
              <Text style={s.counterLabel}>Passengers</Text>
            </View>
            <View style={s.counterControls}>
              <Pressable style={[s.counterBtn, passengers <= 1 && s.counterBtnDisabled]} onPress={() => { if (passengers > 1) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPassengers(p => p - 1); } }}>
                <MaterialIcons name="remove" size={20} color={passengers <= 1 ? '#D1D5DB' : '#374151'} />
              </Pressable>
              <Text style={s.counterValue}>{passengers}</Text>
              <Pressable style={[s.counterBtn, passengers >= 8 && s.counterBtnDisabled]} onPress={() => { if (passengers < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPassengers(p => p + 1); } }}>
                <MaterialIcons name="add" size={20} color={passengers >= 8 ? '#D1D5DB' : '#374151'} />
              </Pressable>
            </View>
          </View>
          <View style={s.counterDivider} />
          <View style={s.counterRow}>
            <View style={s.counterLeft}>
              <MaterialIcons name="luggage" size={22} color="#374151" />
              <Text style={s.counterLabel}>Luggage</Text>
            </View>
            <View style={s.counterControls}>
              <Pressable style={[s.counterBtn, luggage <= 0 && s.counterBtnDisabled]} onPress={() => { if (luggage > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLuggage(l => l - 1); } }}>
                <MaterialIcons name="remove" size={20} color={luggage <= 0 ? '#D1D5DB' : '#374151'} />
              </Pressable>
              <Text style={s.counterValue}>{luggage}</Text>
              <Pressable style={[s.counterBtn, luggage >= 8 && s.counterBtnDisabled]} onPress={() => { if (luggage < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLuggage(l => l + 1); } }}>
                <MaterialIcons name="add" size={20} color={luggage >= 8 ? '#D1D5DB' : '#374151'} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Vehicle Selector (filtered by passengers/luggage) ── */}
        <View style={s.vehicleSelector}>
          <Text style={s.vehicleSelectorTitle}>Vehicle Type</Text>
          <View style={{ gap: 10 }}>
            {isSaloonEligible && (
              <Pressable
                style={[s.vehicleOption, selectedVehicle === 'saloon' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('saloon'); }}
              >
                <MaterialIcons name="directions-car" size={24} color={selectedVehicle === 'saloon' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[s.vehicleOptionName, selectedVehicle === 'saloon' && s.vehicleOptionNameActive, { marginTop: 0 }]}>Saloon Car</Text>
                  <Text style={[s.vehicleOptionDesc, selectedVehicle === 'saloon' && s.vehicleOptionDescActive]}>Up to 3 pax + 3 bags, or 4 pax + hand luggage</Text>
                </View>
              </Pressable>
            )}
            {isCarrierEligible && (
              <Pressable
                style={[s.vehicleOption, selectedVehicle === 'people_carrier' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('people_carrier'); }}
              >
                <MaterialIcons name="directions-car" size={24} color={selectedVehicle === 'people_carrier' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[s.vehicleOptionName, selectedVehicle === 'people_carrier' && s.vehicleOptionNameActive, { marginTop: 0 }]}>People Carrier</Text>
                  <Text style={[s.vehicleOptionDesc, selectedVehicle === 'people_carrier' && s.vehicleOptionDescActive]}>Up to 5 pax + 5 bags, or 6 pax + hand luggage</Text>
                </View>
              </Pressable>
            )}
            {isMinibusEligible && (
              <Pressable
                style={[s.vehicleOption, selectedVehicle === 'minibus' && s.vehicleOptionActive, { flexDirection: 'row', paddingHorizontal: 16 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedVehicle('minibus'); }}
              >
                <MaterialIcons name="airport-shuttle" size={24} color={selectedVehicle === 'minibus' ? '#000000' : '#6B7280'} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[s.vehicleOptionName, selectedVehicle === 'minibus' && s.vehicleOptionNameActive, { marginTop: 0 }]}>8 Seater Minibus</Text>
                  <Text style={[s.vehicleOptionDesc, selectedVehicle === 'minibus' && s.vehicleOptionDescActive]}>Up to 8 pax + 8 bags</Text>
                </View>
              </Pressable>
            )}
            {!isSaloonEligible && !isCarrierEligible && !isMinibusEligible && (
              <Text style={{ color: '#EF4444', textAlign: 'center', padding: 16 }}>No vehicles available for this combination. Please reduce passengers or luggage.</Text>
            )}
          </View>
        </View>

        {/* ── Round Trip Toggle ── */}
        <Pressable
          style={[s.roundTripCard, isReturnJourney && s.roundTripCardActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsReturnJourney(!isReturnJourney);
          }}
        >
          <View style={s.roundTripLeft}>
            <MaterialIcons name="sync" size={22} color={isReturnJourney ? '#000000' : '#6B7280'} />
            <View>
              <Text style={[s.roundTripTitle, isReturnJourney && s.roundTripTitleActive]}>Return Journey</Text>
              <Text style={[s.roundTripSub, isReturnJourney && s.roundTripSubActive]}>Book return journey</Text>
            </View>
          </View>
          <View style={[s.roundTripToggle, isReturnJourney && s.roundTripToggleActive]}>
            <View style={[s.roundTripDot, isReturnJourney && s.roundTripDotActive]} />
          </View>
        </Pressable>

        {/* ── Schedule section ── */}
        <View style={s.timeCard}>
          <Text style={s.timeSectionTitle}>Schedule</Text>
          <TouchableOpacity style={s.dateHeader} onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.85}>
            <Text style={s.dateHeaderYear}>{selectedDate.getFullYear()}</Text>
            <Text style={s.dateHeaderDate}>{fmtDate(selectedDate)}</Text>
          </TouchableOpacity>
          {showCalendar && (
            <View style={s.calBox}>
              <View style={s.calMonthRow}>
                <Pressable onPress={() => { if (!canNavPrev) return; setCalendarMonth(p => { let m = p.month - 1, y = p.year; if (m < 0) { m = 11; y--; } return { year: y, month: m }; }); }} style={{ opacity: canNavPrev ? 1 : 0.2 }}>
                  <MaterialIcons name="chevron-left" size={28} color="#111827" />
                </Pressable>
                <Text style={s.calMonthLabel}>{new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
                <Pressable onPress={() => { if (!canNavNext) return; setCalendarMonth(p => { let m = p.month + 1, y = p.year; if (m > 11) { m = 0; y++; } return { year: y, month: m }; }); }} style={{ opacity: canNavNext ? 1 : 0.2 }}>
                  <MaterialIcons name="chevron-right" size={28} color="#111827" />
                </Pressable>
              </View>
              <View style={s.calDayNames}>{['S','M','T','W','T','F','S'].map((dn, i) => <Text key={i} style={s.calDayName}>{dn}</Text>)}</View>
              <View style={s.calGrid}>{renderCalendar()}</View>
              <View style={s.calFooter}>
                <Pressable onPress={() => setShowCalendar(false)}><Text style={s.calCancel}>CANCEL</Text></Pressable>
                <Pressable onPress={() => setShowCalendar(false)}><Text style={s.calOk}>OK</Text></Pressable>
              </View>
            </View>
          )}

          {/* Time spinner — descending only (down arrow = earlier time) */}
          <Text style={s.timeLabel}>Pickup time</Text>
          <View style={s.spinnerRow}>
            <View style={s.spinnerCol}>
              <Text style={s.spinnerVal}>{String(hourVal).padStart(2, '0')}</Text>
              <Pressable onPress={() => setHourVal(h => (h - 1 + 24) % 24)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
                <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
              </Pressable>
            </View>
            <Text style={s.spinnerColon}>:</Text>
            <View style={s.spinnerCol}>
              <Text style={s.spinnerVal}>{String(minuteVal).padStart(2, '0')}</Text>
              <Pressable onPress={() => setMinuteVal(m => ((Math.round(m / 5) * 5) - 5 + 60) % 60)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
                <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
              </Pressable>
            </View>
          </View>
        </View>
        
        {/* ── Return Journey Details ── */}
        {isReturnJourney && (
          <View style={[s.timeCard, { marginTop: -8 }]}>
            <Text style={s.timeSectionTitle}>Return Details</Text>
            
            {/* Return Locations — manual entry with autocomplete */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={[s.locationCard, { marginHorizontal: 0, marginTop: 0 }]}>
                <View style={s.locationRow}>
                  <View style={s.routeDot} />
                  <View style={{ flex: 1 }}>
                    <LocationInputAutocomplete
                      label="Return Pickup"
                      value={returnPickup || dropoff}
                      placeholder="Return pickup location"
                      onChangeText={setReturnPickup}
                      onSelectLocation={(place: PlaceSuggestion) => {
                        setReturnPickup(place.mainText);
                        if (place.latitude && place.longitude) setReturnPickupLocation({ latitude: place.latitude, longitude: place.longitude });
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
                      label="Return Drop-off"
                      value={returnDropoff || pickup}
                      placeholder="Return drop-off location"
                      onChangeText={setReturnDropoff}
                      onSelectLocation={(place: PlaceSuggestion) => {
                        setReturnDropoff(place.mainText);
                        if (place.latitude && place.longitude) setReturnDropoffLocation({ latitude: place.latitude, longitude: place.longitude });
                      }}
                      type="dropoff"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Return Flight Number */}
            <View style={[s.flightCard, { marginHorizontal: 16, marginBottom: 16, elevation: 0, borderWidth: 1, borderColor: '#F3F4F6' }]}>
              <View style={s.flightHeader}>
                <MaterialIcons name="flight-land" size={20} color={UTO_YELLOW} />
                <Text style={s.flightLabel}>Return Flight Number</Text>
              </View>
              <TextInput style={s.flightInput} value={returnFlightNumber} onChangeText={setReturnFlightNumber} placeholder="e.g. BA 5678" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
            </View>

            {/* Return Vehicle — filtered */}
            <View style={[s.vehicleSelector, { marginHorizontal: 16, marginBottom: 16 }]}>
              <Text style={s.vehicleSelectorTitle}>Return Vehicle</Text>
              <View style={{ gap: 8 }}>
                {isSaloonEligible && <Pressable style={[s.vehicleOption, returnSelectedVehicle === 'saloon' && s.vehicleOptionActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReturnSelectedVehicle('saloon'); }}><Text style={[s.vehicleOptionName, returnSelectedVehicle === 'saloon' && s.vehicleOptionNameActive]}>Saloon</Text></Pressable>}
                {isCarrierEligible && <Pressable style={[s.vehicleOption, returnSelectedVehicle === 'people_carrier' && s.vehicleOptionActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReturnSelectedVehicle('people_carrier'); }}><Text style={[s.vehicleOptionName, returnSelectedVehicle === 'people_carrier' && s.vehicleOptionNameActive]}>People Carrier</Text></Pressable>}
                {isMinibusEligible && <Pressable style={[s.vehicleOption, returnSelectedVehicle === 'minibus' && s.vehicleOptionActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReturnSelectedVehicle('minibus'); }}><Text style={[s.vehicleOptionName, returnSelectedVehicle === 'minibus' && s.vehicleOptionNameActive]}>Minibus</Text></Pressable>}
              </View>
            </View>

            {/* Return Date */}
            <TouchableOpacity style={s.dateHeader} onPress={() => setShowReturnCalendar(!showReturnCalendar)} activeOpacity={0.85}>
              <Text style={s.dateHeaderYear}>{returnSelectedDate.getFullYear()}</Text>
              <Text style={s.dateHeaderDate}>{fmtDate(returnSelectedDate)}</Text>
            </TouchableOpacity>
            {showReturnCalendar && (
              <View style={s.calBox}>
                <View style={s.calMonthRow}>
                  <Pressable onPress={() => { if (!canReturnNavPrev) return; setReturnCalendarMonth(p => { let m = p.month - 1, y = p.year; if (m < 0) { m = 11; y--; } return { year: y, month: m }; }); }} style={{ opacity: canReturnNavPrev ? 1 : 0.2 }}><MaterialIcons name="chevron-left" size={28} color="#111827" /></Pressable>
                  <Text style={s.calMonthLabel}>{new Date(returnCalendarMonth.year, returnCalendarMonth.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
                  <Pressable onPress={() => { if (!canReturnNavNext) return; setReturnCalendarMonth(p => { let m = p.month + 1, y = p.year; if (m > 11) { m = 0; y++; } return { year: y, month: m }; }); }} style={{ opacity: canReturnNavNext ? 1 : 0.2 }}><MaterialIcons name="chevron-right" size={28} color="#111827" /></Pressable>
                </View>
                <View style={s.calDayNames}>{['S','M','T','W','T','F','S'].map((dn, i) => <Text key={i} style={s.calDayName}>{dn}</Text>)}</View>
                <View style={s.calGrid}>{renderReturnCalendar()}</View>
                <View style={s.calFooter}>
                  <Pressable onPress={() => setShowReturnCalendar(false)}><Text style={s.calCancel}>CANCEL</Text></Pressable>
                  <Pressable onPress={() => setShowReturnCalendar(false)}><Text style={s.calOk}>OK</Text></Pressable>
                </View>
              </View>
            )}

            {/* Return Time — descending only */}
            <Text style={s.timeLabel}>Return Pickup Time</Text>
            <View style={s.spinnerRow}>
              <View style={s.spinnerCol}>
                <Text style={s.spinnerVal}>{String(returnHourVal).padStart(2, '0')}</Text>
                <Pressable onPress={() => setReturnHourVal(h => (h - 1 + 24) % 24)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}><MaterialIcons name="keyboard-arrow-down" size={36} color="#333" /></Pressable>
              </View>
              <Text style={s.spinnerColon}>:</Text>
              <View style={s.spinnerCol}>
                <Text style={s.spinnerVal}>{String(returnMinuteVal).padStart(2, '0')}</Text>
                <Pressable onPress={() => setReturnMinuteVal(m => ((Math.round(m / 5) * 5) - 5 + 60) % 60)} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}><MaterialIcons name="keyboard-arrow-down" size={36} color="#333" /></Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── Coupon Code Section ── */}
        <View style={[s.flightCard, { marginTop: 0 }]}>
          <View style={s.flightHeader}>
            <MaterialIcons name="local-offer" size={20} color={UTO_YELLOW} />
            <Text style={s.flightLabel}>Discount Coupon</Text>
          </View>
          {isCouponApplied ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12 }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#065F46' }}>✓ {couponCode.toUpperCase()}</Text>
                <Text style={{ fontSize: 13, color: '#059669' }}>{couponDescription} — £{couponDiscount.toFixed(2)} off</Text>
              </View>
              <Pressable onPress={handleRemoveCoupon}><Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Remove</Text></Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[s.flightInput, { flex: 1 }]}
                value={couponCode}
                onChangeText={(t) => { setCouponCode(t); setCouponError(''); }}
                placeholder="Enter coupon code"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={{ backgroundColor: UTO_YELLOW, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', opacity: isValidatingCoupon ? 0.7 : 1 }}
                onPress={handleValidateCoupon}
                disabled={isValidatingCoupon}
              >
                {isValidatingCoupon ? <ActivityIndicator size="small" color="#000" /> : <Text style={{ fontWeight: '700', color: '#000' }}>Apply</Text>}
              </TouchableOpacity>
            </View>
          )}
          {couponError ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>{couponError}</Text> : null}
        </View>
        
        {/* ── Estimated Fare Card ── */}
        {(estimatedFare !== null || isCalculatingFare) && (
          <View style={s.fareCard}>
            <View style={s.fareCardHeader}>
              <MaterialIcons name="receipt" size={20} color={UTO_YELLOW} />
              <Text style={s.fareCardTitle}>Estimated Fare</Text>
            </View>
            {isCalculatingFare ? (
              <ActivityIndicator size="small" color={UTO_YELLOW} style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={s.fareCardPrice}>£{Math.max(0, (!isReturnJourney ? estimatedFare! : (estimatedFare! + (returnEstimatedFare || 0))) - couponDiscount).toFixed(2)}</Text>
                {couponDiscount > 0 && <Text style={{ fontSize: 13, color: '#059669', marginBottom: 4 }}>Discount: -£{couponDiscount.toFixed(2)}</Text>}
                {distanceKm !== null && durationMin !== null && (
                  <Text style={s.fareCardSub}>
                    {isReturnJourney 
                      ? `Outbound: £${estimatedFare!.toFixed(2)} · Return: £${(returnEstimatedFare||0).toFixed(2)}` 
                      : `${(distanceKm * 0.621371).toFixed(1)} miles · ~${durationMin} min · ${selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus'}`}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Cancellation Policy */}
        <View style={s.policyCard}>
          <View style={s.policyHeader}>
            <MaterialIcons name="info-outline" size={16} color="#92610A" />
            <Text style={s.policyTitle}>Airport Transfer Policy</Text>
          </View>
          <Text style={s.policyText}>
            {"\u2022 Our fares include either the drop-off charge or the minimum car park fee when picking up\n\u2022 Your driver will track your flight and enter the car park no earlier than 30 minutes after landing\n\u2022 Additional parking charges and waiting time will be charged at £0.50/minute\n\u2022 Free cancellation up to 3 hours before pickup — full refund will be issued\n\u2022 Cancellations within 3 hours — full journey fare will be charged"}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.continueBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator color="#000000" />
            : <Text style={s.continueBtnText}>
                {(() => { const vn = selectedVehicle === 'saloon' ? 'Saloon' : selectedVehicle === 'people_carrier' ? 'People Carrier' : 'Minibus'; const total = estimatedFare ? Math.max(0, (!isReturnJourney ? estimatedFare : (estimatedFare + (returnEstimatedFare||0))) - couponDiscount) : null; return total ? `Book ${vn}${isReturnJourney ? ' + Return' : ''} · £${total.toFixed(2)}` : `Book ${vn}${isReturnJourney ? ' + Return' : ''} Transfer`; })()}
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

  // Flight card
  flightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  flightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  flightInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Vehicle selector
  vehicleSelector: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
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

  // Round trip card
  roundTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  roundTripCardActive: {
    borderColor: UTO_YELLOW,
    backgroundColor: UTO_YELLOW + '10',
  },
  roundTripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roundTripTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  roundTripTitleActive: {
    color: '#000000',
  },
  roundTripSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  roundTripSubActive: {
    color: '#6B7280',
  },
  roundTripToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  roundTripToggleActive: {
    backgroundColor: UTO_YELLOW,
  },
  roundTripDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  roundTripDotActive: {
    alignSelf: 'flex-end',
  },

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
