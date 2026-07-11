import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, connectAsDriver, goOffline, onNewRide, onRideUpdate, onRideExpired } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";
import { normalizeBackendTimestamp } from "@/lib/dateTime";
import { ensurePushTokenRegistered, sendLocalNotification } from "@/hooks/useNotifications";
import { claimNotification, playSoftBeep } from "@/lib/notificationDedupe";
import { useMode } from "@/context/ModeContext";
import { onRideRequestNotification } from "@/lib/rideNotificationBridge";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/lib/backgroundLocation";
import {
  DRIVER_DEDUCTION_TYPE,
  formatLiveRideCancellationPenalty,
  isCancellationCreditDeduction,
} from "@shared/driverDeductions";
import { getDiscountedFare, getDriverCancelPenalty } from "@shared/fare";

export interface DriverProfile {
  id?: string;
  vehicleType: "saloon" | "people_carrier" | "minibus";
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  licensePlate: string;
  councilLicence?: string;
  taxSettings?: any;
  isVerified: boolean;
  documentPhvlUrl?: string | null;
  documentPhvlStatus?: string | null;
  documentLogbookUrl?: string | null;
  documentLogbookStatus?: string | null;
  documentInsuranceUrl?: string | null;
  documentInsuranceStatus?: string | null;
  documentInspectionUrl?: string | null;
  documentInspectionStatus?: string | null;
  documentDvlaLicenceUrl?: string | null;
  documentDvlaLicenceStatus?: string | null;
  documentBankStatementUrl?: string | null;
  documentBankStatementStatus?: string | null;
  documentDvlaCheckCodeUrl?: string | null;
  documentDvlaCheckCodeStatus?: string | null;
  documentNationalInsuranceUrl?: string | null;
  documentNationalInsuranceStatus?: string | null;
  documentPhdlUrl?: string | null;
  documentPhdlStatus?: string | null;
  documentProfilePhotoUrl?: string | null;
  documentProfilePhotoStatus?: string | null;
}

export interface Trip {
  id: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  farePrice: number;
  distanceMiles: number;
  durationMinutes: number;
  completedAt: string;
  rating?: number;
  paymentMethod?: string;
}

export interface DriverDeduction {
  id: string;
  driverId: string;
  amount: number;
  type: string;
  reason?: string;
  createdAt: string;
  cancelled_by?: string | null;
}

export interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalTrips: number;
  averageRating: number;
}

const getSignedDeductionAmount = (deduction: DriverDeduction): number => {
  const amount = Number(deduction.amount || 0);
  if (isCancellationCreditDeduction(deduction.type, deduction.reason)) return Math.abs(amount);
  return amount < 0 ? amount : -Math.abs(amount);
};

export interface RideRequest {
  id: string;
  riderName: string;
  riderPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  estimatedFare: number;
  distanceMiles: number;
  durationMinutes: number;
  pickupDistance: number;
  otp?: string;
  paymentMethod?: string;
  walletDeduction?: number;
  expectedCollectAmount?: number;
  discountAmount?: number;
  cancelled_by?: string | null;
}

export interface CompletedRidePayment {
  rideId: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  fareAmount: number;
  distanceMiles: number;
  durationMinutes: number;
  completedAt: string;
  paymentMethod?: string;
  amountToCollect?: number;
}

export type DriverRideState = "none" | "incoming" | "accepted" | "at_pickup" | "in_progress";

interface DriverContextType {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  driverProfile: DriverProfile | null;
  setDriverProfile: (profile: DriverProfile) => Promise<void>;
  tripHistory: Trip[];
  driverDeductions: DriverDeduction[];
  earnings: Earnings;
  totalEarnings: number;
  activeRideRequest: RideRequest | null;
  activeRide: Trip | null;
  rideState: DriverRideState;
  rideCancelledByRider: boolean;
  dismissRiderCancellation: () => void;
  completedRidePayment: CompletedRidePayment | null;
  dismissPaymentCollection: (collectedAmount?: number, extraAmount?: number) => void;
  pendingRating: { rideId: string; riderName: string } | null;
  submitDriverRating: (rideId: string, rating: number, comment?: string) => void;
  dismissDriverRating: () => void;
  acceptRide: () => void;
  declineRide: (isAtPickup?: boolean) => void;
  arrivedAtPickup: () => void;
  startRide: (rideId: string, otp: string) => Promise<boolean>;
  completeTrip: (earlyCompletionReason?: string) => void;
  noShowRide: () => void;
  agreeToWait: () => void;
  paidWaitingStartedAt: string | null;
  waitingChargePerMin: number;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

const DRIVER_PROFILE_KEY = "@uto_driver_profile";
const TRIP_HISTORY_KEY = "@uto_trip_history";
const ONLINE_STATUS_KEY = "@uto_online_status";
const ACTIVE_RIDE_KEY = "@uto_active_ride";

function mapRidePayload(ride: any): RideRequest {
  const discountAmount = Math.max(0, Number(ride.discountAmount ?? ride.discount_amount ?? 0));
  // Prefer full pre-discount amount from estimatedPrice when present; farePrice may already be payable.
  const fullFare = Number(
    ride.estimatedPrice ?? ride.estimated_price ?? ride.farePrice ?? ride.fare_price ?? 0
  );
  const payableFare = getDiscountedFare(fullFare, discountAmount);
  return {
    id: ride.id,
    riderName: ride.riderName || ride.rider_name || "Rider",
    riderPhone: ride.riderPhone || ride.rider_phone || ride.phone || "",
    pickupAddress: ride.pickupAddress || ride.pickup_address || ride.pickupLocation?.address || "Pickup location",
    dropoffAddress: ride.dropoffAddress || ride.dropoff_address || ride.dropoffLocation?.address || "Dropoff location",
    pickupLatitude: ride.pickupLatitude || ride.pickup_latitude || ride.pickupLocation?.latitude || 0,
    pickupLongitude: ride.pickupLongitude || ride.pickup_longitude || ride.pickupLocation?.longitude || 0,
    dropoffLatitude: ride.dropoffLatitude || ride.dropoff_latitude || ride.dropoffLocation?.latitude || 0,
    dropoffLongitude: ride.dropoffLongitude || ride.dropoff_longitude || ride.dropoffLocation?.longitude || 0,
    estimatedFare: payableFare,
    distanceMiles: ride.distance || ride.distanceMiles || ride.distance_miles || ride.distanceKm || ride.distance_km || 0,
    durationMinutes: ride.estimatedDuration || ride.estimated_duration || ride.durationMinutes || ride.duration_minutes || 0,
    pickupDistance: ride.pickupDistance || 0,
    otp: ride.otp,
    paymentMethod: "card",
    walletDeduction: ride.walletDeduction || 0,
    expectedCollectAmount:
      ride.expectedCollectAmount !== undefined
        ? ride.expectedCollectAmount
        : payableFare,
    discountAmount,
  };
}

// Trip history is always loaded from AsyncStorage cache + refreshed from Supabase

// Single pleasant beep for ride / booking alerts (no looping flood).
const playRideAlert = () => playSoftBeep();

export function DriverProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { currentMode } = useMode();
  const [isOnline, setIsOnlineState] = useState(false);
  const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);
  const [driverDeductions, setDriverDeductions] = useState<DriverDeduction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
  const [activeRide, setActiveRide] = useState<Trip | null>(null);
  const [rideState, setRideState] = useState<DriverRideState>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [rideCancelledByRider, setRideCancelledByRider] = useState(false);
  const [completedRidePayment, setCompletedRidePayment] = useState<CompletedRidePayment | null>(null);
  const [paidWaitingStartedAt, setPaidWaitingStartedAt] = useState<string | null>(null);
  const [waitingChargePerMin, setWaitingChargePerMin] = useState(0.50); // default £0.50/min
  const [pendingRating, setPendingRating] = useState<{ rideId: string; riderName: string } | null>(null);

  const isOnlineRef = useRef(isOnline);
  const activeRideRequestRef = useRef(activeRideRequest);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    activeRideRequestRef.current = activeRideRequest;
  }, [activeRideRequest]);

  useEffect(() => {
    if (user) {
      loadStoredData();
    } else if (!authLoading) {
      // Only clear state on a real sign-out — i.e. auth has finished loading and
      // there is definitively no user. During a cold app launch, `user` is briefly
      // null while AuthContext restores the session from storage; clearing here
      // would wipe the persisted online status / active ride and make the driver
      // always appear offline after reopening the app.
      //
      // BUT keep TRIP_HISTORY_KEY in AsyncStorage as cache so earnings
      // display immediately on next login while Supabase fetch is in-flight
      setDriverProfileState(null);
      setTripHistory([]);
      setDriverDeductions([]);
      setIsOnlineState(false);
      setActiveRide(null);
      setActiveRideRequest(null);
      setRideState("none");
      AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
      AsyncStorage.removeItem(ONLINE_STATUS_KEY);
      AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
      // NOTE: We intentionally do NOT remove TRIP_HISTORY_KEY here.
      // Trip history is cached locally so earnings show instantly on re-login
      // before the Supabase refresh completes.
    }
  }, [user, authLoading]);

  // ─── Connect to socket & register as driver ───────────────────────────────
  // This runs once on mount and whenever driver id changes.
  // Without connectAsDriver, the server never adds this driver to connectedDrivers
  // so ride requests are never dispatched here.
  useEffect(() => {
    const driverId = driverProfile?.id || user?.id;
    if (!driverId) return;
    try {
      connectAsDriver(driverId);
      console.log('🚗 DriverContext: connectAsDriver called for', driverId);
    } catch (err) {
      console.warn('⚠️ DriverContext: connectAsDriver failed:', err);
    }
  }, [driverProfile?.id, user?.id]);

  // Re-announce driver connection when they go online
  useEffect(() => {
    if (!isOnline) return;
    const driverId = driverProfile?.id || user?.id;
    if (!driverId) return;
    try {
      connectAsDriver(driverId);
      console.log('✅ DriverContext: driver re-announced online:', driverId);
    } catch (err) {
      console.warn('⚠️ DriverContext: reconnect on online toggle failed:', err);
    }
  }, [isOnline]);

  // Assigned later-booking offers → local notification + sound (driver mode only, once)
  useEffect(() => {
    if (currentMode !== "driver") return;
    const driverIds = [driverProfile?.id, user?.id].filter(Boolean).map(String);
    if (driverIds.length === 0) return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onAssigned = (payload: any) => {
      const booking = payload?.booking || payload;
      if (!booking?.id) return;
      const assignedIds = [booking.assigned_driver_id, booking.driver_id]
        .filter(Boolean)
        .map(String);
      // Only notify the assigned driver
      if (assignedIds.length > 0 && !assignedIds.some((id) => driverIds.includes(id))) return;

      const dedupeKey = `driver:scheduled_booking_assigned:${booking.id}:once`;
      if (!claimNotification(dedupeKey)) return;

      playRideAlert();
      sendLocalNotification(
        "📋 Ride Assigned To You",
        `Ride ${booking.id} has been assigned to you. Open Upcoming to Accept or Decline.`,
        {
          type: "scheduled_booking_assigned",
          bookingId: String(booking.id),
          rideId: String(booking.id),
          audience: "driver",
          target: "UpcomingBookings",
          screen: "UpcomingBookings",
        },
        { alreadyClaimed: true, skipWhenForeground: false },
      );
    };

    socket.on("later-booking:assigned", onAssigned);
    return () => {
      socket.off("later-booking:assigned", onAssigned);
    };
  }, [currentMode, driverProfile?.id, user?.id]);

  // New marketplace bookings → local notification for drivers only (once)
  useEffect(() => {
    if (currentMode !== "driver") return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onMarketplace = (payload: any) => {
      const booking = payload?.booking || payload;
      if (!booking?.id) return;
      if (payload?.type && payload.type !== "created") return;
      const assigned = booking.assigned_driver_id || booking.driver_id;
      if (assigned) return;

      const dedupeKey = `driver:scheduled_marketplace_created:${booking.id}:once`;
      if (!claimNotification(dedupeKey)) return;

      const fare = Number(booking.driver_fare || booking.estimated_fare || 0);
      const fareLabel = fare > 0 ? ` — £${fare.toFixed(2)}` : "";
      playRideAlert();
      sendLocalNotification(
        "🗓 New Scheduled Ride",
        `A booking has been scheduled${fareLabel}. Open Marketplace to pick up ride ${booking.id}.`,
        {
          type: "scheduled_marketplace_created",
          bookingId: String(booking.id),
          rideId: String(booking.id),
          audience: "driver",
          target: "Marketplace",
          screen: "Marketplace",
        },
        { alreadyClaimed: true },
      );
    };

    // Prefer dedicated marketplace event — do NOT also listen to later-booking:update
    // (that was double-firing the same "created" notice).
    socket.on("later-booking:marketplace", onMarketplace);
    return () => {
      socket.off("later-booking:marketplace", onMarketplace);
    };
  }, [currentMode]);

  const handleRidePayload = useCallback((ride: any) => {
    const mappedRequest = mapRidePayload(ride);

    if (ride.scheduledPreAccepted) {
      if (activeRideRequestRef.current && activeRideRequestRef.current.id !== ride.id) {
        console.warn("⚠️ Scheduled ride went live but driver is busy with another ride:", activeRideRequestRef.current.id);
        return;
      }

      setActiveRideRequest(mappedRequest);
      setRideState("accepted");

      const scheduledTrip: Trip = {
        id: mappedRequest.id,
        riderName: mappedRequest.riderName,
        pickupAddress: mappedRequest.pickupAddress,
        dropoffAddress: mappedRequest.dropoffAddress,
        farePrice: mappedRequest.estimatedFare,
        distanceMiles: mappedRequest.distanceMiles,
        durationMinutes: mappedRequest.durationMinutes,
        completedAt: "",
        paymentMethod: "card",
      };
      setActiveRide(scheduledTrip);
      AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(scheduledTrip)).catch((err) =>
        console.warn("⚠️ Failed to persist scheduled active ride:", err)
      );
      const liveKey = `driver:scheduled_ride_live:${ride.id}:once`;
      if (claimNotification(liveKey)) {
        playRideAlert();
        sendLocalNotification(
          "🗓 Scheduled Ride Starting",
          `Your scheduled pickup for ${mappedRequest.riderName} at ${mappedRequest.pickupAddress} starts soon. Head to the pickup now.`,
          { type: "scheduled_ride_live", rideId: ride.id, audience: "driver" },
          { alreadyClaimed: true },
        );
      }
      return;
    }

    if (!isOnlineRef.current || activeRideRequestRef.current) return;

    const isNewOffer = !activeRideRequestRef.current || activeRideRequestRef.current.id !== mappedRequest.id;
    setActiveRideRequest(mappedRequest);
    setRideState("incoming");

    // Alert at most once per ride — opening the app / pending-dispatch must not re-flood.
    const requestKey = `driver:ride_request:${mappedRequest.id}:once`;
    if (isNewOffer && claimNotification(requestKey)) {
      playRideAlert();
      sendLocalNotification(
        "🚕 New Ride Request",
        `${ride.riderName || "A rider"} needs a ride from ${ride.pickupAddress || ride.pickup_address || "nearby"}`,
        { type: "ride_request", rideId: ride.id, audience: "driver" },
        { alreadyClaimed: true },
      );
    }
  }, []);

  const fetchPendingDispatch = useCallback(async () => {
    const driverId = driverProfile?.id || user?.id;
    if (!driverId || !isOnlineRef.current || activeRideRequestRef.current) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/drivers/${driverId}/pending-dispatch`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ride?.id) {
        console.log("📲 Restored pending ride dispatch from server:", data.ride.id);
        handleRidePayload(data.ride);
      }
    } catch (err) {
      console.warn("⚠️ Failed to fetch pending dispatch:", err);
    }
  }, [driverProfile?.id, user?.id, handleRidePayload]);

  // Push token + listeners live in AppShell (once). Driver go-online refreshes token.

  useEffect(() => {
    if (currentMode !== "driver") return;
    let cleanup: (() => void) | undefined;

    try {
      cleanup = onNewRide((ride: any) => {
        console.log("🚕 Driver received new ride request via socket payload:", JSON.stringify(ride, null, 2));
        handleRidePayload(ride);
      });
    } catch (err) {
      console.warn("Socket not available:", err);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentMode, handleRidePayload]);

  useEffect(() => {
    if (currentMode !== "driver") return;
    const unsubscribe = onRideRequestNotification((rideId, ride) => {
      console.log("📲 Ride request push received:", rideId);
      if (ride && (ride.id || rideId)) {
        handleRidePayload({ ...ride, id: ride.id || rideId });
      }
      fetchPendingDispatch().catch((err) => console.warn("⚠️ Pending dispatch refresh failed:", err));
    });
    return unsubscribe;
  }, [currentMode, fetchPendingDispatch, handleRidePayload]);

  useEffect(() => {
    if (currentMode !== "driver") return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchPendingDispatch().catch((err) => console.warn("⚠️ Pending dispatch refresh failed:", err));
      }
    });
    return () => subscription.remove();
  }, [currentMode, fetchPendingDispatch]);

  useEffect(() => {
    if (currentMode !== "driver") return;
    if (isOnline) {
      fetchPendingDispatch().catch((err) => console.warn("⚠️ Pending dispatch refresh failed:", err));
    }
  }, [currentMode, isOnline, fetchPendingDispatch]);

  // When online status is restored (or toggled), keep background tracking alive.
  useEffect(() => {
    if (currentMode !== "driver") return;
    const driverId = driverProfile?.id || user?.id;
    if (!isOnline || !driverId) return;
    startBackgroundLocationTracking(driverId).catch((err) =>
      console.warn("⚠️ Failed to ensure background location while online:", err)
    );
  }, [currentMode, isOnline, driverProfile?.id, user?.id]);

  // Listen for expired ride requests (driver missed the dispatch window)
  useEffect(() => {
    let cleanupExpired: (() => void) | undefined;
    try {
      cleanupExpired = onRideExpired((data) => {
        const currentRide = activeRideRequestRef.current;
        if (currentRide && currentRide.id === data.rideId) {
          console.log(`⏱️ Ride ${data.rideId} expired because to no response. Clearing screen.`);
          setActiveRideRequest(null);
          setRideState("none");
        }
      });
    } catch (err) {
      console.warn("Socket not available for expired listener:", err);
    }
    return () => {
      if (cleanupExpired) cleanupExpired();
    };
  }, []);

  // Listen for rider-initiated cancellations AND server-side no-show cancellations
  useEffect(() => {
    let cleanupCancel: (() => void) | undefined;
    try {
      cleanupCancel = onRideUpdate((update: any) => {
        if (update.status === "cancelled" || update.status === "cancelled_no_show") {
          const currentRide = activeRideRequestRef.current;
          const matchesActive =
            currentRide && (currentRide.id === update.rideId || !update.rideId);

          // Only handle if this cancellation is for OUR active ride
          if (matchesActive) {
            console.log('🚫 Ride cancelled:', update.rideId, 'reason:', update.status);

            // ─── Handle no-show from server ────────────────────
            if (update.status === "cancelled_no_show") {
              // noShowRide() already handled the immediate feedback (cleared ride, added earnings, showed alert).
              // We just need to clear state here and refresh data — no duplicate earnings or alerts.
              console.log('ℹ️ Server confirmed no-show for ride', update.rideId, '— refreshing data');
              setActiveRideRequest(null);
              setActiveRide(null);
              saveActiveRide(null).catch((err) => console.warn("⚠️ Failed to clear active ride:", err));
              setRideState("none");
              // Refresh data from Supabase to sync server-confirmed earnings
              setTimeout(() => {
                refreshData().catch((err: any) => console.warn("⚠️ Post no-show refreshData failed:", err));
              }, 2000);
            } else {
              // Normal rider-initiated cancellation — show popup then clear UI
              setRideCancelledByRider(true);

              // 🔔 Notify driver of cancellation
              sendLocalNotification(
                "❌ Ride Cancelled",
                `${currentRide?.riderName || "The rider"} has cancelled the ride.`,
                { type: "ride_cancelled", rideId: update.rideId, audience: "driver" }
              );

              setActiveRideRequest(null);
              setActiveRide(null);
              saveActiveRide(null).catch((err) => console.warn("⚠️ Failed to clear active ride:", err));
              setRideState("none");
            }
          } else if (!currentRide && update.status === "cancelled_no_show") {
            // Ride already cleared by noShowRide() — just log and refresh
            console.log('ℹ️ No-show server confirmation received but ride already cleared locally');
            setTimeout(() => {
              refreshData().catch((err: any) => console.warn("⚠️ Post no-show refreshData failed:", err));
            }, 2000);
          } else if (update.status === "cancelled" && update.rideId) {
            // Even if we somehow lost local active-ride state, still surface the popup
            // so the driver is not stuck on a cancelled ride screen.
            setRideCancelledByRider(true);
            setActiveRideRequest(null);
            setActiveRide(null);
            saveActiveRide(null).catch(() => {});
            setRideState("none");
          }
        }
      });
    } catch (err) {
      console.warn("Socket not available for cancel listener:", err);
    }
    return () => {
      if (cleanupCancel) cleanupCancel();
    };
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedProfile, storedTrips, storedOnline, storedActiveRide] = await Promise.all([
        AsyncStorage.getItem(DRIVER_PROFILE_KEY),
        AsyncStorage.getItem(TRIP_HISTORY_KEY),
        AsyncStorage.getItem(ONLINE_STATUS_KEY),
        AsyncStorage.getItem(ACTIVE_RIDE_KEY),
      ]);

      if (storedProfile) {
        setDriverProfileState(JSON.parse(storedProfile));
      }

      if (storedTrips) {
        const parsed = JSON.parse(storedTrips);
        if (parsed.length > 0) {
          const normalizedCachedTrips = parsed.map((trip: any) => ({
            ...trip,
            completedAt: normalizeBackendTimestamp(trip.completedAt || new Date().toISOString()),
          }));
          setTripHistory(normalizedCachedTrips);
          console.log('✅ Loaded', parsed.length, 'cached trips from AsyncStorage');
        }
      }

      if (storedActiveRide) {
        try {
          const activeRideData = JSON.parse(storedActiveRide);
          setActiveRide(activeRideData);
          setIsOnlineState(true); // Assume driver was online if they had an active ride
        } catch (err) {
          console.warn('⚠️ Failed to parse active ride from AsyncStorage:', err);
        }
      }

      if (storedOnline === "true") {
        setIsOnlineState(true);
      }
    } catch (error) {
      console.error("Failed to load driver data:", error);
    } finally {
      setIsLoading(false);
    }

    // Always refresh from Supabase (source of truth) after loading cache
    // This ensures earnings are always accurate even if local cache is stale
    try {
      await refreshData();
    } catch (err) {
      console.warn('⚠️ Post-load refreshData failed:', err);
    }
  };

  const refreshData = async () => {
    if (!user?.id) return;
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/drivers/user/${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const driver = data.driver;
      if (!driver) return;
      const profile: DriverProfile = {
        id: driver.id,
        vehicleType: (driver.vehicleType as DriverProfile["vehicleType"]) || "saloon",
        vehicleMake: driver.vehicleMake || "",
        vehicleModel: driver.vehicleModel || "",
        vehicleYear: driver.vehicleYear || new Date().getFullYear(),
        vehicleColor: driver.vehicleColor || "",
        licensePlate: driver.licensePlate || "",
        isVerified: driver.isVerified || false,
        documentPhvlUrl: driver.documentPhvlUrl,
        documentPhvlStatus: driver.documentPhvlStatus,
        documentLogbookUrl: driver.documentLogbookUrl,
        documentLogbookStatus: driver.documentLogbookStatus,
        documentInsuranceUrl: driver.documentInsuranceUrl,
        documentInsuranceStatus: driver.documentInsuranceStatus,
        documentInspectionUrl: driver.documentInspectionUrl,
        documentInspectionStatus: driver.documentInspectionStatus,
        documentDvlaLicenceUrl: driver.documentDvlaLicenceUrl,
        documentDvlaLicenceStatus: driver.documentDvlaLicenceStatus,
        documentBankStatementUrl: driver.documentBankStatementUrl,
        documentBankStatementStatus: driver.documentBankStatementStatus,
        documentDvlaCheckCodeUrl: driver.documentDvlaCheckCodeUrl,
        documentDvlaCheckCodeStatus: driver.documentDvlaCheckCodeStatus,
        documentNationalInsuranceUrl: driver.documentNationalInsuranceUrl,
        documentNationalInsuranceStatus: driver.documentNationalInsuranceStatus,
        documentPhdlUrl: driver.documentPhdlUrl,
        documentPhdlStatus: driver.documentPhdlStatus,
        documentProfilePhotoUrl: driver.documentProfilePhotoUrl,
        documentProfilePhotoStatus: driver.documentProfilePhotoStatus,
      };
      setDriverProfileState(profile);
      setTotalEarnings(driver.totalEarnings || 0);
      await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
      console.log("✅ Driver profile synced from Supabase:", profile.vehicleMake, profile.vehicleModel);

      // ── FETCH TRIPS FROM SUPABASE ──
      try {
        const rides = await api.rides.getByDriver(driver.id);
        if (rides && rides.length > 0) {
          const completedRides = rides.filter((r: any) =>
            r.status === 'completed' ||
            (r.status === 'cancelled' && (r.paymentStatus === 'no_show_card_charged' || r.paymentStatus === 'no_show_wallet_charged' || r.paymentStatus === 'no_show_fee')) ||
            r.status === 'payment_collected'
          );
          const serverTrips: Trip[] = completedRides.map((r: any) => {
            const discount = Math.max(0, Number(r.discountAmount || 0));
            const payable = typeof r.finalPrice === "number" && r.finalPrice > 0
              ? r.finalPrice
              : getDiscountedFare(r.estimatedPrice || 0, discount);
            return {
            id: r.id,
            riderName: r.riderName || "Rider",
            pickupAddress: r.pickupAddress,
            dropoffAddress: r.dropoffAddress,
            farePrice: payable,
            distanceMiles: r.distance || 0,
            durationMinutes: r.estimatedDuration || 0,
            completedAt: normalizeBackendTimestamp(r.completedAt || r.requestedAt || new Date().toISOString()),
            rating: r.driverRating || undefined,
          };
          });
          setTripHistory(serverTrips);
          await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(serverTrips));
          console.log("✅ Driver trips synced from Supabase count:", serverTrips.length);
        }
      } catch (tripErr) {
        console.warn("⚠️ Could not sync trips from Supabase:", tripErr);
      }

      // ── FETCH DEDUCTIONS FROM SUPABASE ──
      try {
        const d = await api.drivers.getDeductions(driver.id);
        const normalizedServerDeductions = (d || []).map((entry: any) => ({
          ...entry,
          createdAt: normalizeBackendTimestamp(entry.createdAt || entry.created_at || new Date().toISOString()),
        }));

        // ── Also add cancelled rides with fees as deduction entries ──
        let allDeductions = [...normalizedServerDeductions];
        try {
          const rides = await api.rides.getByDriver(driver.id);
          if (rides && rides.length > 0) {
            // Include ALL cancelled rides and check for fees
            const cancelledRides = rides.filter((r: any) => r.status === 'cancelled');

            cancelledRides.forEach((ride: any) => {
              // Use stored cancellation_fee if available, otherwise calculate from estimated price
              let feeAmount = 0;

              if (ride.cancellation_fee && ride.cancellation_fee > 0) {
                // Use the fee stored in the database
                feeAmount = Number(ride.cancellation_fee);
              } else if (ride.paymentStatus && ride.paymentStatus.includes('cancellation')) {
                // If it's a cancellation payment status, calculate fee (50% of discounted fare)
                if (ride.paymentStatus === 'cancellation_fee_wallet_charged') {
                  feeAmount = getDiscountedFare(ride.estimatedPrice || 0, ride.discountAmount || 0);
                } else {
                  feeAmount = getDriverCancelPenalty(ride.estimatedPrice || 0, ride.discountAmount || 0);
                }
              }

              if (feeAmount > 0) {
                // Check if this deduction already exists (avoid duplicates)
                const driverPenaltyLabel = formatLiveRideCancellationPenalty(ride.id);
                const deductionExists = allDeductions.some((d: any) =>
                  d.reason === driverPenaltyLabel || d.type === driverPenaltyLabel
                );
                if (!deductionExists) {
                  const cancelledByRider = ride.paymentStatus === 'cancellation_fee_wallet_charged';
                  allDeductions.push({
                    id: `ride_${ride.id}_cancellation`,
                    driverId: driver.id,
                    amount: cancelledByRider ? Math.abs(feeAmount) : -Math.abs(feeAmount),
                    type: cancelledByRider
                      ? DRIVER_DEDUCTION_TYPE.COMMISSION
                      : DRIVER_DEDUCTION_TYPE.PENALTY,
                    reason: cancelledByRider
                      ? `Cancellation Fee Credit - Passenger Cancelled - ${ride.pickupAddress || 'Trip'}`
                      : driverPenaltyLabel,
                    createdAt: normalizeBackendTimestamp(ride.cancelledAt || ride.updatedAt || new Date().toISOString()),
                  });
                }
              }
            });
          }
        } catch (ridesErr) {
          console.warn("⚠️ Could not fetch cancelled rides for deductions:", ridesErr);
        }

        // Merge with existing local deductions (optimistic updates)
        // Keep local deductions that match the ride ID pattern, only replace from server data
        setDriverDeductions((prevDeductions) => {
          const serverDeductionIds = new Set(allDeductions.map((d: any) => d.id));
          const localOnly = prevDeductions.filter((d: any) => !serverDeductionIds.has(d.id) && d.id.startsWith("local_"));
          const merged = [...allDeductions, ...localOnly];
          return merged;
        });

      } catch (deductionErr) {
        console.warn("⚠️ Could not sync deductions from Supabase:", deductionErr);
      }

      // ── FETCH ACTIVE RIDES FROM SERVER ──
      await fetchActiveRides();

    } catch (err) {
      console.warn("⚠️ Could not sync driver profile from Supabase:", err);
    }
  };

  // ──── ACTIVE RIDE PERSISTENCE ────
  // Save active ride to AsyncStorage when ride status changes
  const saveActiveRide = async (ride: Trip | null) => {
    try {
      if (ride) {
        await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(ride));
      } else {
        await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
      }
    } catch (err) {
      console.warn('⚠️ Failed to persist active ride:', err);
    }
  };

  // Fetch active rides from server (rides in accepted, arrived, or in_progress status)
  const fetchActiveRides = async () => {
    if (!user?.id || !driverProfile?.id) return;
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/drivers/${driverProfile.id}/active-rides`);
      if (!res.ok) return;
      const data = await res.json();
      const activeRides = data.rides || [];

      if (activeRides.length > 0) {
        const activeRideData = activeRides[0]; // Get the first active ride
        const payableFare = getDiscountedFare(
          activeRideData.finalPrice || activeRideData.estimatedPrice || 0,
          activeRideData.finalPrice ? 0 : (activeRideData.discountAmount || 0),
        );
        const rideTrip: Trip = {
          id: activeRideData.id,
          riderName: activeRideData.riderName || "Rider",
          pickupAddress: activeRideData.pickupAddress || "Pickup",
          dropoffAddress: activeRideData.dropoffAddress || "Dropoff",
          farePrice: payableFare,
          distanceMiles: activeRideData.distance || 0,
          durationMinutes: activeRideData.estimatedDuration || 0,
          completedAt: "", // Active rides don't have completion time
          paymentMethod: "card",
        };
        setActiveRide(rideTrip);
        await saveActiveRide(rideTrip);

        // ───── CONVERT ACTIVE RIDE TO RIDE REQUEST FOR UI DISPLAY ─────
        // This ensures Phase 2 UI displays even when app is reopened
        if (!activeRideRequest) {
          const rideRequest: RideRequest = {
            id: activeRideData.id,
            riderName: activeRideData.riderName || "Rider",
            riderPhone: activeRideData.riderPhone || "",
            pickupAddress: activeRideData.pickupAddress || "Pickup",
            dropoffAddress: activeRideData.dropoffAddress || "Dropoff",
            pickupLatitude: activeRideData.pickupLatitude || 0,
            pickupLongitude: activeRideData.pickupLongitude || 0,
            dropoffLatitude: activeRideData.dropoffLatitude || 0,
            dropoffLongitude: activeRideData.dropoffLongitude || 0,
            estimatedFare: payableFare,
            distanceMiles: activeRideData.distance || 0,
            durationMinutes: activeRideData.estimatedDuration || 0,
            pickupDistance: 0,
            otp: activeRideData.otp,
            paymentMethod: "card",
            walletDeduction: activeRideData.walletDeduction || 0,
            expectedCollectAmount:
              activeRideData.expectedCollectAmount !== undefined
                ? activeRideData.expectedCollectAmount
                : payableFare,
            discountAmount: Number(activeRideData.discountAmount || 0),
          };
          setActiveRideRequest(rideRequest);
          // Infer rideState from the server's ride status
          const serverStatus = activeRideData.status || 'accepted';
          let inferredState: DriverRideState = 'accepted';
          if (serverStatus === 'at_pickup' || serverStatus === 'arrived') inferredState = 'at_pickup';
          else if (serverStatus === 'in_progress') inferredState = 'in_progress';
          setRideState(inferredState);
        }
      } else {
        setActiveRide(null);
        await saveActiveRide(null);
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch active rides from server:', err);
    }
  };

  // Note: refreshData() is now called inside loadStoredData() after loading cache,
  // so we don't need a separate effect here. This avoids the race condition where
  // refreshData would run before loadStoredData finished.
  // The loadStoredData effect (triggered by user change) handles both.

  // ───── AUTO-RESTORE ACTIVE RIDE REQUEST FROM SERVER ─────
  // When activeRide is loaded from AsyncStorage but activeRideRequest is null,
  // fetch the full ride details from server and restore the UI state
  useEffect(() => {
    if (activeRide && !activeRideRequest && !isLoading) {
      // We have a cached activeRide but no activeRideRequest — fetch full details from server
      const restoreActiveRideRequest = async () => {
        try {
          const baseUrl = getApiUrl();
          const res = await fetch(`${baseUrl}/api/rides/${activeRide.id}`);
          if (!res.ok) {
            console.warn(`⚠️ Could not fetch ride details for ${activeRide.id}, server returned ${res.status}`);
            return;
          }
          const data = await res.json();
          const ride = data.ride;
          const payableFare = getDiscountedFare(
            ride.finalPrice || ride.estimatedPrice || activeRide.farePrice || 0,
            ride.finalPrice ? 0 : (ride.discountAmount || 0),
          );

          const rideRequest: RideRequest = {
            id: ride.id,
            riderName: ride.riderName || activeRide.riderName || "Rider",
            riderPhone: ride.riderPhone || ride.rider_phone || "",
            pickupAddress: ride.pickupAddress || activeRide.pickupAddress || "Pickup",
            dropoffAddress: ride.dropoffAddress || activeRide.dropoffAddress || "Dropoff",
            pickupLatitude: ride.pickupLatitude || ride.pickup_latitude || 0,
            pickupLongitude: ride.pickupLongitude || ride.pickup_longitude || 0,
            dropoffLatitude: ride.dropoffLatitude || ride.dropoff_latitude || 0,
            dropoffLongitude: ride.dropoffLongitude || ride.dropoff_longitude || 0,
            estimatedFare: payableFare,
            distanceMiles: ride.distance || activeRide.distanceMiles || 0,
            durationMinutes: ride.estimatedDuration || activeRide.durationMinutes || 0,
            pickupDistance: 0,
            otp: ride.otp,
            paymentMethod: "card",
            walletDeduction: ride.walletDeduction || 0,
            expectedCollectAmount:
              ride.expectedCollectAmount !== undefined
                ? ride.expectedCollectAmount
                : payableFare,
            discountAmount: Number(ride.discountAmount || 0),
          };

          setActiveRideRequest(rideRequest);

          // Infer rideState from the server's ride status
          const serverStatus = ride.status || 'accepted';
          let inferredState: DriverRideState = 'accepted';
          if (serverStatus === 'at_pickup' || serverStatus === 'arrived') inferredState = 'at_pickup';
          else if (serverStatus === 'in_progress') inferredState = 'in_progress';

          setRideState(inferredState);
        } catch (err) {
          console.warn(`⚠️ Failed to restore activeRideRequest for ride ${activeRide.id}:`, err);
        }
      };

      restoreActiveRideRequest();
    }
  }, [activeRide, activeRideRequest, isLoading]);

  const setIsOnline = async (online: boolean) => {
    setIsOnlineState(online);
    try {
      await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
    } catch (error) {
      console.error("Failed to save online status:", error);
    }

    // Sync online state to the server. Going online (re)registers the driver
    // socket so they receive ride requests; going offline explicitly tells the
    // server to stop dispatching. Backgrounding the app does NOT go offline.
    const driverId = driverProfile?.id || user?.id;
    if (!driverId) return;
    try {
      if (online) {
        connectAsDriver(driverId);
        // Refresh Expo push token every time the driver goes online so
        // background/killed delivery keeps working even if the token rotated.
        if (user?.id) {
          ensurePushTokenRegistered(user.id).catch((err) =>
            console.warn("⚠️ Failed to refresh push token on go-online:", err)
          );
        }
        // Keep location + push delivery alive when the driver leaves the app.
        startBackgroundLocationTracking(driverId).catch((err) =>
          console.warn("⚠️ Failed to start background location:", err)
        );
      } else {
        goOffline(driverId);
        stopBackgroundLocationTracking().catch((err) =>
          console.warn("⚠️ Failed to stop background location:", err)
        );
      }
    } catch (err) {
      console.warn("⚠️ Failed to sync online status to server:", err);
    }
  };

  const setDriverProfile = async (profile: DriverProfile) => {
    setDriverProfileState(profile);
    try {
      // Save to local AsyncStorage
      await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));

      // Also persist to Supabase via API
      if (user?.id) {
        try {
          const baseUrl = getApiUrl();
          // First get the driver record id from Supabase
          const res = await fetch(`${baseUrl}/api/drivers/user/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            const driverId = data.driver?.id;
            if (driverId) {
              // Update vehicle details in Supabase
              await fetch(`${baseUrl}/api/drivers/${driverId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vehicleMake: profile.vehicleMake,
                  vehicleModel: profile.vehicleModel,
                  vehicleType: profile.vehicleType,
                  licensePlate: profile.licensePlate,
                  vehicleYear: profile.vehicleYear,
                  vehicleColor: profile.vehicleColor,
                  documentPhvlUrl: profile.documentPhvlUrl,
                  documentPhvlStatus: profile.documentPhvlStatus,
                  documentLogbookUrl: profile.documentLogbookUrl,
                  documentLogbookStatus: profile.documentLogbookStatus,
                  documentInsuranceUrl: profile.documentInsuranceUrl,
                  documentInsuranceStatus: profile.documentInsuranceStatus,
                  documentInspectionUrl: profile.documentInspectionUrl,
                  documentInspectionStatus: profile.documentInspectionStatus,
                  documentDvlaLicenceUrl: profile.documentDvlaLicenceUrl,
                  documentDvlaLicenceStatus: profile.documentDvlaLicenceStatus,
                  documentBankStatementUrl: profile.documentBankStatementUrl,
                  documentBankStatementStatus: profile.documentBankStatementStatus,
                  documentDvlaCheckCodeUrl: profile.documentDvlaCheckCodeUrl,
                  documentDvlaCheckCodeStatus: profile.documentDvlaCheckCodeStatus,
                  documentNationalInsuranceUrl: profile.documentNationalInsuranceUrl,
                  documentNationalInsuranceStatus: profile.documentNationalInsuranceStatus,
                  documentPhdlUrl: profile.documentPhdlUrl,
                  documentPhdlStatus: profile.documentPhdlStatus,
                  documentProfilePhotoUrl: profile.documentProfilePhotoUrl,
                  documentProfilePhotoStatus: profile.documentProfilePhotoStatus,
                }),
              });
              console.log('✅ Driver profile saved to Supabase');
            }
          } else {
            console.warn('⚠️ Could not fetch driver record from Supabase to update vehicle info');
          }
        } catch (apiErr) {
          console.warn('⚠️ Failed to sync driver profile to Supabase:', apiErr);
        }
      }
    } catch (error) {
      console.error("Failed to save driver profile:", error);
    }
  };

  const acceptRide = async () => {
    if (!activeRideRequest) return;
    setRideState("accepted");

    const driverId = driverProfile?.id || user?.id || "";

    try {
      // 🚗 Convert RideRequest to Trip and save as active ride
      const newActiveRide: Trip = {
        id: activeRideRequest.id,
        riderName: activeRideRequest.riderName,
        pickupAddress: activeRideRequest.pickupAddress,
        dropoffAddress: activeRideRequest.dropoffAddress,
        farePrice: activeRideRequest.estimatedFare,
        distanceMiles: activeRideRequest.distanceMiles,
        durationMinutes: activeRideRequest.durationMinutes,
        completedAt: "", // Will be set when trip completes
        paymentMethod: "card",
      };

      setActiveRide(newActiveRide);
      await saveActiveRide(newActiveRide);

      const socket = getSocket();
      // Build the driver's vehicle string from their stored profile
      const vehicleInfo = driverProfile
        ? `${driverProfile.vehicleMake} ${driverProfile.vehicleModel}`.trim()
        : "Unknown Vehicle";
      const licensePlate = driverProfile?.licensePlate || "";
      const driverName = user?.fullName || "Driver";
      const driverRating = user?.rating || 4.8;

      // Emit ride:accept first — this is the reliable path that explicitly includes driverId
      socket.emit("ride:accept", {
        rideId: activeRideRequest.id,
        driverId,
      });

      // Also emit ride:status with driverId included for real-time UI updates
      socket.emit("ride:status", {
        rideId: activeRideRequest.id,
        status: "accepted",
        driverId,
        driverInfo: {
          driverName,
          vehicleInfo,
          licensePlate,
          driverRating,
          driverPhone: user?.phone || "",
        },
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }
  };

  const declineRide = (isAtPickup = false) => {
    if (activeRideRequest) {
      if (rideState === "accepted" || rideState === "at_pickup") {
        try {
          const socket = getSocket();
          socket.emit("ride:driver_cancel_at_pickup", {
            rideId: activeRideRequest.id,
            driverId: driverProfile?.id || user?.id || undefined,
            applyPenalty: isAtPickup,
            cancelledFrom: rideState,
            cancelledBy: "driver",
          });
        } catch (e) {
          console.warn("Failed to emit cancel:", e);
        }

        if (isAtPickup && activeRideRequest.estimatedFare > 0) {
          const penaltyAmount = getDriverCancelPenalty(
            activeRideRequest.estimatedFare,
            0, // estimatedFare is already the discounted payable amount
          );
          const penaltyLabel = formatLiveRideCancellationPenalty(activeRideRequest.id);
          const localDeduction: DriverDeduction = {
            id: `local_cancel_${activeRideRequest.id}`,
            driverId: driverProfile?.id || user?.id || "",
            amount: -Math.abs(penaltyAmount),
            type: DRIVER_DEDUCTION_TYPE.PENALTY,
            reason: penaltyLabel,
            createdAt: new Date().toISOString(),
            cancelled_by: activeRideRequest.cancelled_by,
          };
          setDriverDeductions((prev) => [localDeduction, ...prev.filter((d) => d.id !== localDeduction.id)]);
          setTimeout(() => {
            refreshData().catch((err: any) => console.warn("⚠️ Post-cancel refreshData failed:", err));
          }, 2000);
        }
      } else if (rideState === "incoming") {
        try {
          const socket = getSocket();
          socket.emit("ride:declined", {
            rideId: activeRideRequest.id,
            rideData: activeRideRequest,
            driverId: driverProfile?.id || user?.id || undefined,
          });
        } catch (e) {
          console.warn("Failed to emit declined:", e);
        }
      }
    }
    setActiveRideRequest(null);
    setActiveRide(null);
    saveActiveRide(null).catch((err) => console.warn("⚠️ Failed to clear active ride:", err));
    setRideState("none");
  };

  const arrivedAtPickup = () => {
    if (!activeRideRequest) return;
    setRideState("at_pickup");
    setPaidWaitingStartedAt(null); // Reset paid waiting

    try {
      const socket = getSocket();
      socket.emit("ride:status", { rideId: activeRideRequest.id, status: "arrived", driverId: driverProfile?.id || user?.id || undefined });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }

    // Fetch waiting charge rate from pricing rules
    (async () => {
      try {
        const { api } = await import('@/lib/api');
        const rules = await api.pricingRules.getActive();
        const vehiclePricing = rules?.vehicles || rules?.pricing;
        const rideType = (activeRideRequest as any)?.rideType || 'saloon';
        const normalizedRideType = String(rideType).toLowerCase().replace(/[\s-]+/g, "_");
        const matchingVehicleKey = Object.keys(vehiclePricing || {}).find(
          (key) => String(key).toLowerCase().replace(/[\s-]+/g, "_") === normalizedRideType
        );
        const waitPrice = parseFloat(
          (matchingVehicleKey ? vehiclePricing?.[matchingVehicleKey]?.waiting_price : undefined) || '0.50'
        );
        setWaitingChargePerMin(waitPrice > 0 ? waitPrice : 0.50);
        console.log(`⏱️ Waiting charge rate: £${waitPrice}/min`);
      } catch (e) {
        console.warn('Could not fetch waiting price, using default £0.50/min');
        setWaitingChargePerMin(0.50);
      }
    })();
  };

  // Driver-initiated No Show (after 10 min free waiting)
  const noShowRide = () => {
    if (!activeRideRequest) return;
    const rideId = activeRideRequest.id;
    const riderName = activeRideRequest.riderName || "Rider";
    const fare = activeRideRequest.estimatedFare || 0;
    console.log('🚫 Driver initiated No Show for ride:', rideId);

    try {
      const socket = getSocket();
      socket.emit("ride:no_show", {
        rideId,
        driverId: driverProfile?.id || user?.id || undefined,
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }

    // Immediately clear the ride and show feedback — don't wait for server roundtrip
    setActiveRideRequest(null);
    setActiveRide(null);
    saveActiveRide(null).catch((err) => console.warn("⚠️ Failed to clear active ride:", err));
    setRideState("none");
    setPaidWaitingStartedAt(null);

    // Add a no-show trip to earnings immediately for instant feedback
    if (fare > 0) {
      const noShowTrip: Trip = {
        id: `noshow_${rideId}`,
        riderName,
        pickupAddress: activeRideRequest.pickupAddress || "Pickup",
        dropoffAddress: activeRideRequest.dropoffAddress || "Dropoff",
        farePrice: fare,
        distanceMiles: activeRideRequest.distanceMiles || 0,
        durationMinutes: activeRideRequest.durationMinutes || 0,
        completedAt: new Date().toISOString(),
      };

      setTripHistory((prev) => {
        const updated = [noShowTrip, ...prev];
        AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    }

    // Show immediate alert to the driver
    setTimeout(() => {
      Alert.alert(
        "Ride Cancelled — No Show",
        `The rider did not show up within 10 minutes. A no-show fee of £${fare > 0 ? fare.toFixed(2) : '0.00'} has been charged and added to your earnings.`,
        [{ text: "OK" }]
      );
    }, 300);

    // Refresh data from Supabase to sync earnings after server processes
    setTimeout(() => {
      refreshData().catch((err: any) => console.warn("⚠️ Post no-show refreshData failed:", err));
    }, 3000);
  };

  // Driver agrees to continue waiting (paid waiting starts)
  const agreeToWait = () => {
    if (!activeRideRequest) return;
    const now = new Date().toISOString();
    setPaidWaitingStartedAt(now);
    console.log(`⏱️💰 Paid waiting started at ${now} for ride ${activeRideRequest.id}`);

    try {
      const socket = getSocket();
      socket.emit("ride:agree_to_wait", {
        rideId: activeRideRequest.id,
        driverId: driverProfile?.id || user?.id || undefined,
        paidWaitingStartedAt: now,
        waitingChargePerMin,
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }
  };

  const startRide = async (rideId: string, otp: string): Promise<boolean> => {
    if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
      try {
        const socket = getSocket();
        socket.emit("ride:status", { rideId, status: "in_progress", driverId: driverProfile?.id || user?.id || undefined });
      } catch (err) {
        console.warn("Socket emit failed:", err);
      }

      setRideState("in_progress");
      return true;
    }
    return false;
  };

  const completeTrip = async (earlyCompletionReason?: string) => {
    if (activeRideRequest) {
      const completedAt = new Date().toISOString();

      // Calculate waiting charge if paid waiting was active
      let waitingCharge = 0;
      if (paidWaitingStartedAt) {
        const paidWaitingMs = Date.now() - new Date(paidWaitingStartedAt).getTime();
        const paidWaitingMin = Math.max(0, Math.floor(paidWaitingMs / 60000));
        waitingCharge = Math.round(paidWaitingMin * waitingChargePerMin * 100) / 100;
        console.log(`⏱️💰 Paid waiting: ${paidWaitingMin} mins × £${waitingChargePerMin} = £${waitingCharge}`);
      }

      const totalFare = Math.round((activeRideRequest.estimatedFare + waitingCharge) * 100) / 100;

      const newTrip: Trip = {
        id: `trip_${Date.now()}`,
        riderName: activeRideRequest.riderName,
        pickupAddress: activeRideRequest.pickupAddress,
        dropoffAddress: activeRideRequest.dropoffAddress,
        farePrice: totalFare,
        distanceMiles: activeRideRequest.distanceMiles,
        durationMinutes: activeRideRequest.durationMinutes,
        completedAt,
        rating: 5,
      };

      const newHistory = [newTrip, ...tripHistory];
      setTripHistory(newHistory);
      try {
        await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
      } catch (err) {
        console.error("Failed to save trip:", err);
      }

      try {
        const socket = getSocket();
        socket.emit("ride:status", {
          rideId: activeRideRequest.id,
          status: "completed",
          driverId: driverProfile?.id || user?.id || undefined,
          waitingCharge,
          totalFare,
          ...(earlyCompletionReason && earlyCompletionReason.trim()
            ? { earlyCompletionReason: earlyCompletionReason.trim() }
            : {}),
        });
      } catch (err) {
        console.warn("Socket emit failed:", err);
      }

      setCompletedRidePayment(null);
      setTimeout(() => {
        setPendingRating({ rideId: activeRideRequest.id, riderName: activeRideRequest.riderName });
      }, 800);
      setTimeout(() => {
        refreshData().catch((err) => console.warn("⚠️ Post-completion refreshData failed:", err));
      }, 1500);

      // 🔔 Notify driver of ride completion
      sendLocalNotification(
        "✅ Trip Completed",
        `Trip with ${activeRideRequest.riderName} completed. Fare: £${totalFare.toFixed(2)}${waitingCharge > 0 ? ` (incl. £${waitingCharge.toFixed(2)} waiting)` : ''}`,
        { type: "ride_completed", rideId: activeRideRequest.id, audience: "driver" }
      );
    }
    setPaidWaitingStartedAt(null);
    setActiveRideRequest(null);
    setActiveRide(null);
    await saveActiveRide(null);
    setRideState("none");
  };

  const dismissPaymentCollection = (collectedAmount?: number, extraAmount?: number) => {
    console.log('💳 Card-only payment completion dismissed.');
    setCompletedRidePayment(null);

    // Trigger rating prompt after payment is collected
    // Use a short delay to allow the payment modal to fully dismiss
    const rideId = completedRidePayment?.rideId;
    const riderName = completedRidePayment?.riderName;
    if (rideId && riderName) {
      setTimeout(() => {
        setPendingRating({ rideId, riderName });
      }, 800);
    }

    // Refresh trip data from Supabase so earnings display updates
    setTimeout(() => {
      console.log('💰 Triggering post-payment refreshData (2s)...');
      refreshData().catch((err) => console.warn("⚠️ Post-payment refreshData failed:", err));
    }, 2000); // First refresh after 2s
    // Second refresh after 5s to catch any slow DB writes
    setTimeout(() => {
      console.log('💰 Triggering post-payment refreshData (5s follow-up)...');
      refreshData().catch((err) => console.warn("⚠️ Post-payment refreshData follow-up failed:", err));
    }, 5000);
  };

  const calculateEarnings = (): Earnings => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let totalRating = 0;
    let ratedTrips = 0;

    tripHistory.forEach((trip) => {
      const tripDate = new Date(trip.completedAt);

      if (tripDate >= monthStart) {
        thisMonth += trip.farePrice;

        if (tripDate >= weekStart) {
          thisWeek += trip.farePrice;

          if (tripDate >= todayStart) {
            today += trip.farePrice;
          }
        }
      }

      if (trip.rating) {
        totalRating += trip.rating;
        ratedTrips++;
      }
    });

    driverDeductions.forEach((deduction) => {
      const deductionDate = new Date(deduction.createdAt);
      const amount = getSignedDeductionAmount(deduction);

      if (deductionDate >= monthStart) {
        thisMonth += amount;

        if (deductionDate >= weekStart) {
          thisWeek += amount;

          if (deductionDate >= todayStart) {
            today += amount;
          }
        }
      }
    });

    return {
      today: Math.round(today * 100) / 100,
      thisWeek: Math.round(thisWeek * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      totalTrips: tripHistory.length,
      averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 0.0,
    };
  };

  const submitDriverRating = async (rideId: string, rating: number, comment?: string) => {
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/rides/${rideId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderRating: rating,
          riderComment: comment,
          ratedBy: "driver",
        }),
      });
      console.log(`⭐ Driver submitted rating ${rating} for ride ${rideId}`);
    } catch (err) {
      console.warn("Failed to submit driver rating:", err);
    }
    setPendingRating(null);
  };

  const dismissDriverRating = () => {
    setPendingRating(null);
  };

  return (
    <DriverContext.Provider
      value={{
        isOnline,
        setIsOnline,
        driverProfile,
        setDriverProfile,
        tripHistory,
        driverDeductions,
        earnings: calculateEarnings(),
        totalEarnings,
        activeRideRequest,
        activeRide,
        rideState,
        rideCancelledByRider,
        dismissRiderCancellation: () => setRideCancelledByRider(false),
        completedRidePayment,
        dismissPaymentCollection,
        pendingRating,
        submitDriverRating,
        dismissDriverRating,
        acceptRide,
        declineRide,
        arrivedAtPickup,
        startRide,
        completeTrip,
        noShowRide,
        agreeToWait,
        paidWaitingStartedAt,
        waitingChargePerMin,
        refreshData,
        isLoading,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error("useDriver must be used within a DriverProvider");
  }
  return context;
}
