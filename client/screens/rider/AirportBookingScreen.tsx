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

  // Round trip
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  // Vehicle type
  const [selectedVehicle, setSelectedVehicle] = useState<'saloon' | 'minibus'>('saloon');

  // Pricing
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Schedule
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

  // Calendar navigation limits
  const todayMonth = { year: openedAt.getFullYear(), month: openedAt.getMonth() };
  const maxMonth = { year: maxDate.getFullYear(), month: maxDate.getMonth() };
  const canNavPrev = calendarMonth.year > todayMonth.year ||
    (calendarMonth.year === todayMonth.year && calendarMonth.month > todayMonth.month);
  const canNavNext = calendarMonth.year < maxMonth.year ||
    (calendarMonth.year === maxMonth.year && calendarMonth.month < maxMonth.month);

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
        let fare = calculateDynamicFare(distanceMiles, dur, selectedVehicle);
        // Double fare for round trip
        if (isRoundTrip) fare = fare * 2;
        setEstimatedFare(fare);
      } catch (err) {
        console.warn('Failed to calculate fare:', err);
        const fallbackMiles = 3.5;
        let fare = calculateDynamicFare(fallbackMiles, 15, selectedVehicle);
        if (isRoundTrip) fare = fare * 2;
        setEstimatedFare(fare);
      } finally {
        setIsCalculatingFare(false);
      }
    };

    calculateFare();
  }, [pickupLocation, dropoffLocation, selectedVehicle, isRoundTrip]);

  // ── Calendar render ─────────────────────────────────────────────
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

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(hourVal, minuteVal, 0, 0);
    const rightNow = new Date();

    if (scheduledTime <= rightNow) {
      Alert.alert('Time has passed', `Scheduled time ${fmtTime(scheduledTime)} is in the past. Please select a future time.`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
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
          dropoffBy: new Date(scheduledTime.getTime() + 60 * 60 * 1000).toISOString(),
          estimatedFare: estimatedFare ?? null,
          vehicleType: selectedVehicle,
          distanceMiles: distanceKm ? distanceKm * 0.621371 : null,
          durationMinutes: durationMin ?? null,
          flightNumber: flightNumber || null,
          isRoundTrip: isRoundTrip,
          bookingType: 'airport',
        }),
      });

      let resBody: any = {};
      try { resBody = await res.json(); } catch (_) {}

      if (!res.ok) {
        throw new Error(resBody.error || `Server error ${res.status}`);
      }

      Alert.alert(
        '✈️ Airport Transfer Booked!',
        `Your ${selectedVehicle === 'saloon' ? 'Saloon' : 'Minibus'}${isRoundTrip ? ' Round Trip' : ''} airport transfer has been scheduled.\n\nDate: ${fmtDate(scheduledTime)} at ${fmtTime(scheduledTime)}${flightNumber ? `\nFlight: ${flightNumber}` : ''}${estimatedFare ? `\nEstimated Fare: £${estimatedFare.toFixed(2)}` : ''}`,
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

        {/* ── Vehicle Selector ── */}
        <View style={s.vehicleSelector}>
          <Text style={s.vehicleSelectorTitle}>Vehicle Type</Text>
          <View style={s.vehicleOptions}>
            <Pressable
              style={[s.vehicleOption, selectedVehicle === 'saloon' && s.vehicleOptionActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedVehicle('saloon');
              }}
            >
              <MaterialIcons
                name="directions-car"
                size={24}
                color={selectedVehicle === 'saloon' ? '#000000' : '#6B7280'}
              />
              <Text style={[s.vehicleOptionName, selectedVehicle === 'saloon' && s.vehicleOptionNameActive]}>
                Saloon
              </Text>
              <Text style={[s.vehicleOptionDesc, selectedVehicle === 'saloon' && s.vehicleOptionDescActive]}>
                Up to 4 passengers
              </Text>
            </Pressable>
            <Pressable
              style={[s.vehicleOption, selectedVehicle === 'minibus' && s.vehicleOptionActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedVehicle('minibus');
              }}
            >
              <MaterialIcons
                name="airport-shuttle"
                size={24}
                color={selectedVehicle === 'minibus' ? '#000000' : '#6B7280'}
              />
              <Text style={[s.vehicleOptionName, selectedVehicle === 'minibus' && s.vehicleOptionNameActive]}>
                Minibus
              </Text>
              <Text style={[s.vehicleOptionDesc, selectedVehicle === 'minibus' && s.vehicleOptionDescActive]}>
                Up to 8 passengers
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Round Trip Toggle ── */}
        <Pressable
          style={[s.roundTripCard, isRoundTrip && s.roundTripCardActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsRoundTrip(!isRoundTrip);
          }}
        >
          <View style={s.roundTripLeft}>
            <MaterialIcons
              name="sync"
              size={22}
              color={isRoundTrip ? '#000000' : '#6B7280'}
            />
            <View>
              <Text style={[s.roundTripTitle, isRoundTrip && s.roundTripTitleActive]}>
                Round Trip
              </Text>
              <Text style={[s.roundTripSub, isRoundTrip && s.roundTripSubActive]}>
                Book return journey
              </Text>
            </View>
          </View>
          <View style={[s.roundTripToggle, isRoundTrip && s.roundTripToggleActive]}>
            <View style={[s.roundTripDot, isRoundTrip && s.roundTripDotActive]} />
          </View>
        </Pressable>

        {/* ── Schedule section ── */}
        <View style={s.timeCard}>
          <Text style={s.timeSectionTitle}>Schedule</Text>

          {/* Dark date header — tap to open calendar */}
          <TouchableOpacity style={s.dateHeader} onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.85}>
            <Text style={s.dateHeaderYear}>{selectedDate.getFullYear()}</Text>
            <Text style={s.dateHeaderDate}>{fmtDate(selectedDate)}</Text>
          </TouchableOpacity>

          {/* Calendar */}
          {showCalendar && (
            <View style={s.calBox}>
              <View style={s.calMonthRow}>
                <Pressable
                  onPress={() => {
                    if (!canNavPrev) return;
                    setCalendarMonth(p => {
                      let m = p.month - 1, y = p.year;
                      if (m < 0) { m = 11; y--; }
                      return { year: y, month: m };
                    });
                  }}
                  style={{ opacity: canNavPrev ? 1 : 0.2 }}
                >
                  <MaterialIcons name="chevron-left" size={28} color="#111827" />
                </Pressable>
                <Text style={s.calMonthLabel}>
                  {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable
                  onPress={() => {
                    if (!canNavNext) return;
                    setCalendarMonth(p => {
                      let m = p.month + 1, y = p.year;
                      if (m > 11) { m = 0; y++; }
                      return { year: y, month: m };
                    });
                  }}
                  style={{ opacity: canNavNext ? 1 : 0.2 }}
                >
                  <MaterialIcons name="chevron-right" size={28} color="#111827" />
                </Pressable>
              </View>
              <View style={s.calDayNames}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dn, i) => (
                  <Text key={i} style={s.calDayName}>{dn}</Text>
                ))}
              </View>
              <View style={s.calGrid}>{renderCalendar()}</View>
              <View style={s.calFooter}>
                <Pressable onPress={() => setShowCalendar(false)}>
                  <Text style={s.calCancel}>CANCEL</Text>
                </Pressable>
                <Pressable onPress={() => setShowCalendar(false)}>
                  <Text style={s.calOk}>OK</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Time spinner */}
          <Text style={s.timeLabel}>Pickup time</Text>
          <View style={s.spinnerRow}>
            {/* Hour */}
            <View style={s.spinnerCol}>
              <Pressable
                onPress={() => setHourVal(h => (h - 1 + 24) % 24)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <MaterialIcons name="keyboard-arrow-up" size={36} color="#333" />
              </Pressable>
              <Text style={s.spinnerVal}>{String(hourVal).padStart(2, '0')}</Text>
              <Pressable
                onPress={() => setHourVal(h => (h + 1) % 24)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
              </Pressable>
            </View>
            <Text style={s.spinnerColon}>:</Text>
            {/* Minute */}
            <View style={s.spinnerCol}>
              <Pressable
                onPress={() => setMinuteVal(m => ((Math.round(m / 5) * 5) - 5 + 60) % 60)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <MaterialIcons name="keyboard-arrow-up" size={36} color="#333" />
              </Pressable>
              <Text style={s.spinnerVal}>{String(minuteVal).padStart(2, '0')}</Text>
              <Pressable
                onPress={() => setMinuteVal(m => (Math.round(m / 5) * 5 + 5) % 60)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Estimated Fare Card ── */}
        {(estimatedFare !== null || isCalculatingFare) && (
          <View style={s.fareCard}>
            <View style={s.fareCardHeader}>
              <MaterialIcons name="receipt" size={20} color={UTO_YELLOW} />
              <Text style={s.fareCardTitle}>Estimated Fare{isRoundTrip ? ' (Round Trip)' : ''}</Text>
            </View>
            {isCalculatingFare ? (
              <ActivityIndicator size="small" color={UTO_YELLOW} style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={s.fareCardPrice}>£{estimatedFare!.toFixed(2)}</Text>
                {distanceKm !== null && durationMin !== null && (
                  <Text style={s.fareCardSub}>
                    {(distanceKm * 0.621371).toFixed(1)} miles · ~{durationMin} min · {selectedVehicle === 'saloon' ? 'Saloon' : 'Minibus'}
                    {isRoundTrip ? ' · Return' : ''}
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
                {estimatedFare
                  ? `Book ${selectedVehicle === 'saloon' ? 'Saloon' : 'Minibus'}${isRoundTrip ? ' Return' : ''} · £${estimatedFare.toFixed(2)}`
                  : `Book ${selectedVehicle === 'saloon' ? 'Saloon' : 'Minibus'}${isRoundTrip ? ' Return' : ''} Transfer`}
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
});
