// import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// import { Alert } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getSocket, connectAsRider, onRideAccepted, onRideUpdate } from "@/lib/socket";
// import { getApiUrl } from "@/lib/query-client";
// import { useAuth } from "./AuthContext";
// import { sendLocalNotification } from "@/hooks/useNotifications";

// export type RideType = "saloon" | "people_carrier" | "minibus";
// export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

// export interface Location {
//   address: string;
//   latitude: number;
//   longitude: number;
// }

// export interface Ride {
//   id: string;
//   pickupLocation: Location;
//   dropoffLocation: Location;
//   rideType: RideType;
//   status: RideStatus;
//   farePrice: number;
//   distanceKm: number;
//   durationMinutes: number;
//   driverName?: string;
//   driverPhone?: string;
//   driverRating?: number;
//   vehicleInfo?: string;
//   licensePlate?: string;
//   otp?: string;
//   paymentMethod?: string;
//   paymentStatus?: string;
//   walletDeduction?: number;
//   expectedCollectAmount?: number;
//   driverArrivedAt?: string;
//   acceptedAt?: string;
//   createdAt: string;
//   completedAt?: string;
// }

// interface RideContextType {
//   activeRide: Ride | null;
//   rideHistory: Ride[];
//   requestRide: (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string, paymentMethod?: string, useWalletBalance?: boolean) => Promise<Ride>;
//   startRide: (rideId: string, otp: string) => Promise<boolean>;
//   cancelRide: (rideId: string, withPenalty?: boolean) => Promise<void>;
//   completeRide: (rideId: string) => Promise<void>;
//   updateRidePaymentMethod: (rideId: string, method: string) => Promise<void>;
//   calculateDynamicFare: (distanceMiles: number, durationMin: number, rideType: string) => number;
//   refreshRideHistory: () => Promise<void>;
//   pendingRating: { rideId: string; driverName: string } | null;
//   submitRiderRating: (rideId: string, rating: number, comment?: string) => void;
//   dismissRiderRating: () => void;
//   isLoading: boolean;
// }

// const RideContext = createContext<RideContextType | undefined>(undefined);

// const RIDE_HISTORY_KEY = "@uto_ride_history";
// const ACTIVE_RIDE_KEY = "@uto_active_ride";



// export function RideProvider({ children }: { children: ReactNode }) {
//   const { user, updateProfile } = useAuth();
//   const [activeRide, setActiveRide] = useState<Ride | null>(null);
//   const [rideHistory, setRideHistory] = useState<Ride[]>([]);
//   const [pricingRules, setPricingRules] = useState<any>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [pendingRating, setPendingRating] = useState<{ rideId: string; driverName: string } | null>(null);

//   // Keep a ref to the latest user so socket callbacks always see current wallet balance
//   const userRef = React.useRef(user);
//   useEffect(() => { userRef.current = user; }, [user]);

//   // Keep a ref to the latest activeRide so socket callbacks always see the current ride
//   // This prevents the race condition where the functional updater in setActiveRide
//   // finds current === null because a prior handler already cleared it
//   const activeRideRef = React.useRef(activeRide);
//   useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
//   const pendingCancelledRideRef = React.useRef<Ride | null>(null);
//   const lastDriverCancellationNoticeRef = React.useRef<string | null>(null);

//   useEffect(() => {
//     loadStoredRides();
//     loadPricingRules();
//   }, []);

//   const loadPricingRules = async () => {
//     try {
//       const { api } = await import('@/lib/api');
//       const rules = await api.pricingRules.getActive();
//       if (rules) {
//         setPricingRules(rules);
//       }
//     } catch (e) {
//       console.warn("Could not fetch pricing rules", e);
//     }
//   };

//   // Register this rider's socket as soon as we have a user ID
//   // so the server can route ride:accepted back to this socket
//   useEffect(() => {
//     if (!user?.id) return;
//     try {
//       connectAsRider(user.id);
//       console.log('🙋 RideContext: connectAsRider called for', user.id);
//     } catch (err) {
//       console.warn('⚠️ RideContext: connectAsRider failed:', err);
//     }
//   }, [user?.id]);

//   // Listen for the server's dedicated driver-assigned event.
//   useEffect(() => {
//     let cleanup: (() => void) | undefined;

//     try {
//       cleanup = onRideAccepted((data) => {
//         setActiveRide((current) => {
//           if (!current || current.id !== data.rideId) return current;

//           const updated: Ride = {
//             ...current,
//             status: "accepted",
//             acceptedAt: data.acceptedAt || new Date().toISOString(),
//           };
//           AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);
//           return updated;
//         });
//       });
//     } catch (err) {
//       console.warn("Socket not available for accepted listener:", err);
//     }

//     return () => {
//       if (cleanup) cleanup();
//     };
//   }, []);

//   // Listen for driver status updates (e.g. ride started via OTP)
//   useEffect(() => {
//     let cleanup: (() => void) | undefined;

//     try {
//       cleanup = onRideUpdate((update) => {
//         if (update.status === "completed" || update.status === "payment_collected" || update.status === "cancelled" || update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") {

//           // ✅ Handle wallet update for payment_collected BEFORE touching activeRide
//           // The server already updated the DB wallet balance; we refresh from server to stay in sync
//           if (update.status === "payment_collected" && (update as any).extraAmount) {
//             const extra = parseFloat((update as any).extraAmount);
//             if (extra > 0) {
//               // 1. Optimistic local update so UI updates immediately
//               const currentBalance = userRef.current?.walletBalance || 0;
//               updateProfile({ walletBalance: currentBalance + extra });
//               Alert.alert("Wallet Updated", `£${extra.toFixed(2)} has been added to your wallet by the driver.`);
//               console.log(`✅ [RideContext] Wallet updated (optimistic): £${currentBalance} + £${extra} = £${currentBalance + extra}`);

//               // 2. Fetch the confirmed balance from server to guarantee accuracy
//               // (runs async, doesn't block the UI)
//               (async () => {
//                 try {
//                   const userId = userRef.current?.id;
//                   if (!userId) return;
//                   const baseUrl = getApiUrl();
//                   const res = await fetch(`${baseUrl}/api/users/${userId}`);
//                   if (res.ok) {
//                     const data = await res.json();
//                     const serverBalance = data?.user?.wallet_balance ?? data?.user?.walletBalance;
//                     if (typeof serverBalance === 'number') {
//                       updateProfile({ walletBalance: serverBalance });
//                       console.log(`✅ [RideContext] Wallet synced from server: £${serverBalance}`);
//                     }
//                   }
//                 } catch (syncErr) {
//                   console.warn('⚠️ [RideContext] Could not sync wallet from server:', syncErr);
//                 }
//               })();
//             }
//           }

//           // ✅ Handle no-show cancellation — rider didn't board within 10 minutes
//           if (update.status === "cancelled_no_show") {
//             const noShowFare = Number((update as any).noShowFare || 0);
//             const chargedVia = (update as any).chargedVia || "wallet";

//             if (chargedVia === "wallet" && noShowFare > 0) {
//               const currentBalance = userRef.current?.walletBalance || 0;
//               updateProfile({ walletBalance: Math.max(0, currentBalance - noShowFare) });
//               console.log(`❌ [RideContext] No-show penalty: £${noShowFare} debited from wallet (clamped to £0 min)`);
//             }

//             // Show alert to rider about no-show policy
//             setTimeout(() => {
//               if (chargedVia === "card") {
//                 Alert.alert(
//                   "Ride Cancelled — No Show",
//                   `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been charged to your saved card as per our No Show Policy.`,
//                   [{ text: "OK" }]
//                 );
//               } else {
//                 Alert.alert(
//                   "Ride Cancelled — No Show",
//                   `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been deducted from your wallet as per our No Show Policy.`,
//                   [{ text: "OK" }]
//                 );
//               }
//             }, 300);
//             console.log(`❌ [RideContext] No-show cancellation: £${noShowFare} charged via ${chargedVia}`);

//             sendLocalNotification(
//               "❌ No Show — Fare Charged",
//               `Your driver waited at the pickup but you did not arrive. The full fare amount of £${noShowFare > 0 ? noShowFare.toFixed(2) : '0.00'} will be deducted from your account as per our No Show Policy.`,
//               { type: "no_show", rideId: update.rideId }
//             );
//           }

//           // ✅ Capture ride data from the ref BEFORE clearing activeRide.
//           // Using the ref is reliable because it always holds the latest value,
//           // unlike the functional updater capture which can find current === null
//           // when React batches updates or another handler already cleared it.
//           const capturedRide: Ride | null =
//             activeRideRef.current ||
//             (pendingCancelledRideRef.current?.id === update.rideId ? pendingCancelledRideRef.current : null);

//           // Clear activeRide state
//           setActiveRide(null);
//           activeRideRef.current = null;
//           if (pendingCancelledRideRef.current?.id === update.rideId) {
//             pendingCancelledRideRef.current = null;
//           }

//           // ✅ All history/storage/notifications run AFTER clearing the ride
//           if (capturedRide) {
//             const ride = capturedRide;

//             // Update farePrice if the server sent a totalFare (includes waiting charges)
//             const serverTotalFare = Number((update as any).totalFare || 0);
//             const waitingCharge = Number((update as any).waitingCharge || 0);
//             const finalFarePrice = serverTotalFare > 0 ? serverTotalFare : ride.farePrice;

//             // Persist final ride to history
//             const finalRide: Ride = {
//               ...ride,
//               farePrice: finalFarePrice,
//               status: (update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") ? "cancelled"
//                 : update.status === "payment_collected" ? "completed"
//                   : (update.status as RideStatus),
//               completedAt: new Date().toISOString(),
//             };
//             setRideHistory((prev) => {
//               const newHistory = [finalRide, ...prev];
//               AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory)).catch(console.error);
//               return newHistory;
//             });
//             AsyncStorage.removeItem(ACTIVE_RIDE_KEY).catch(console.error);
//             setActiveRide(null);

//             const cancellationFee = Number((update as any).cancellationFee || 0);
//             const chargedAmount = Number((update as any).chargedAmount || 0);
//             const chargedVia = (update as any).chargedVia;

//             // Refund wallet deduction only for free cancellations / no-driver cancellations.
//             if ((update.status === "cancelled" || update.status === "cancelled_no_drivers") && cancellationFee <= 0 && ride.walletDeduction && ride.walletDeduction > 0) {
//               const currentBalance = userRef.current?.walletBalance || 0;
//               updateProfile({ walletBalance: currentBalance + ride.walletDeduction });
//               console.log(`✅ [RideContext] Refunded £${ride.walletDeduction} for cancelled ride ${ride.id}`);
//             }

//             if (update.status === "cancelled" && cancellationFee > 0) {
//               const serverWalletBalance = (update as any).walletBalance;
//               if (chargedVia === "wallet" && typeof serverWalletBalance === "number") {
//                 updateProfile({ walletBalance: serverWalletBalance });
//               } else if (chargedVia === "wallet" && chargedAmount > 0) {
//                 const currentBalance = userRef.current?.walletBalance || 0;
//                 const newBalance = Number((currentBalance - chargedAmount).toFixed(2));
//                 updateProfile({ walletBalance: newBalance });
//               }

//               setTimeout(() => {
//                 Alert.alert(
//                   "Cancellation Fee Charged",
//                   `Your free cancellation period has ended. A cancellation fee of £${cancellationFee.toFixed(2)} has been applied.`,
//                   [{ text: "OK" }]
//                 );
//               }, 300);
//             }

//             if (update.status === "completed" || update.status === "payment_collected") {
//               // ✅ Use Number() to safely call toFixed — farePrice can be a string after AsyncStorage round-trip
//               const fareStr = `£${Number(ride.farePrice || 0).toFixed(2)}`;
//               sendLocalNotification(
//                 "✅ Trip Completed",
//                 `Your ride has been completed. Fare: ${fareStr}`,
//                 { type: "ride_completed", rideId: ride.id }
//               );
//               // Trigger rating prompt — set immediately so it's ready when
//               // RideTrackingScreen navigates to Home (1.5s delay gives us time)
//               const dName = ride.driverName || "Your Driver";
//               const rId = ride.id;
//               setPendingRating({ rideId: rId, driverName: dName });
//             } else if (update.status === "cancelled" || update.status === "cancelled_no_drivers") {
//               sendLocalNotification(
//                 "❌ Ride Cancelled",
//                 update.status === "cancelled_no_drivers"
//                   ? "No drivers available right now. Please try again later."
//                   : "Your ride has been cancelled.",
//                 { type: "ride_cancelled", rideId: ride.id }
//               );
//             }
//           } else {
//             console.warn(`⚠️ [RideContext] ride:update ${update.status} received but no active ride found in ref — possible duplicate event`);
//           }
//           return;
//         }
//         if (update.status === "pending" && (update as any).driverCancelled && lastDriverCancellationNoticeRef.current !== update.rideId) {
//           lastDriverCancellationNoticeRef.current = update.rideId;
//           Alert.alert(
//             "Driver Cancelled",
//             "Your driver cancelled this ride. We're finding another available driver for you.",
//             [{ text: "OK" }]
//           );
//         }

//         setActiveRide((current) => {
//           if (current && (current.id === update.rideId || !update.rideId)) {
//             const updated: Ride = {
//               ...current,
//               status: update.status as RideStatus,
//               ...(update.status === "pending" && (update as any).driverCancelled
//                 ? {
//                   driverName: undefined,
//                   driverPhone: undefined,
//                   driverRating: undefined,
//                   vehicleInfo: undefined,
//                   licensePlate: undefined,
//                   acceptedAt: undefined,
//                   driverArrivedAt: undefined,
//                 }
//                 : {}),
//               // If the driver sent their real info on accept, use it
//               ...(update.status === "accepted" && (update as any).driverInfo
//                 ? {
//                   driverName: (update as any).driverInfo.driverName,
//                   driverPhone: (update as any).driverInfo.driverPhone,
//                   vehicleInfo: (update as any).driverInfo.vehicleInfo,
//                   licensePlate: (update as any).driverInfo.licensePlate,
//                   driverRating: (update as any).driverInfo.driverRating,
//                 }
//                 : {}),
//               ...(update.status === "accepted"
//                 ? { acceptedAt: (update as any).acceptedAt || (update as any).accepted_at || new Date().toISOString() }
//                 : {}),
//               // Capture driverArrivedAt timestamp when status transitions to "arrived"
//               ...(update.status === "arrived" && (update as any).driverArrivedAt
//                 ? { driverArrivedAt: (update as any).driverArrivedAt }
//                 : {}),
//             };
//             AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);

//             // 🔔 Notify rider when driver accepts
//             if (update.status === "accepted") {
//               const driverName = (update as any).driverInfo?.driverName || "Your driver";
//               sendLocalNotification(
//                 "🚗 Driver Accepted!",
//                 `${driverName} is on the way to pick you up.`,
//                 { type: "ride_accepted", rideId: current.id }
//               );
//             } else if (update.status === "arrived") {
//               sendLocalNotification(
//                 "📍 Driver Has Arrived",
//                 "Your driver has arrived. Please provide your PIN to start the ride.",
//                 { type: "driver_arriving", rideId: current.id }
//               );
//             } else if (update.status === "in_progress") {
//               sendLocalNotification(
//                 "🚀 Ride Started",
//                 "Your ride is now in progress. Enjoy the trip!",
//                 { type: "ride_started", rideId: current.id }
//               );
//             }

//             return updated;
//           }
//           return current;
//         });
//       });
//     } catch (err) {
//       console.warn("Socket not available:", err);
//     }

//     return () => {
//       if (cleanup) cleanup();
//     };
//   }, []);

//   const loadStoredRides = async () => {
//     try {
//       const [storedHistory, storedActive] = await Promise.all([
//         AsyncStorage.getItem(RIDE_HISTORY_KEY),
//         AsyncStorage.getItem(ACTIVE_RIDE_KEY),
//       ]);

//       if (storedHistory) {
//         setRideHistory(JSON.parse(storedHistory));
//       }

//       if (storedActive) {
//         const localActive = JSON.parse(storedActive);
//         setActiveRide(localActive);

//         // Verify with server if ride actually completed while app was closed
//         try {
//           const { api } = await import('@/lib/api');
//           const serverRide = await api.rides.get(localActive.id);

//           if (serverRide) {
//             const serverRideAny = serverRide as any;
//             const isCompleted = serverRide.status === 'completed' || serverRide.status === 'cancelled' || serverRideAny.paymentStatus === 'paid' || serverRideAny.paymentStatus === 'completed';
//             if (isCompleted) {
//               setActiveRide(null);
//               await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);

//               const history = storedHistory ? JSON.parse(storedHistory) : [];
//               if (!history.find((r: Ride) => r.id === localActive.id)) {
//                 const finalRide = { ...localActive, status: serverRide.status as RideStatus, completedAt: new Date().toISOString() };
//                 const newHistory = [finalRide, ...history];
//                 setRideHistory(newHistory);
//                 await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
//               }

//               // Trigger rating prompt if it was successfully completed and not yet rated
//               const isSuccessfulComplete = serverRide.status === 'completed' || serverRideAny.paymentStatus === 'paid' || serverRideAny.paymentStatus === 'completed';
//               if (isSuccessfulComplete && serverRideAny.driverRating === null) {
//                 const dName = serverRideAny.driverName || localActive.driverName || "Your Driver";
//                 const rId = serverRide.id;
//                 setTimeout(() => {
//                   setPendingRating({ rideId: rId, driverName: dName });
//                 }, 1500);
//               }
//             } else {
//               setActiveRide({
//                 ...localActive,
//                 status: serverRide.status as RideStatus,
//                 acceptedAt: serverRideAny.acceptedAt || serverRideAny.accepted_at || localActive.acceptedAt,
//                 driverName: serverRideAny.driverName || localActive.driverName,
//                 driverPhone: serverRideAny.driverPhone || localActive.driverPhone,
//                 vehicleInfo: serverRideAny.vehicleInfo || localActive.vehicleInfo,
//                 licensePlate: serverRideAny.licensePlate || localActive.licensePlate,
//                 driverRating: serverRideAny.driverRating || localActive.driverRating,
//               });
//             }
//           }
//         } catch (syncErr) {
//           console.warn("Failed to sync active ride on load:", syncErr);
//         }
//       }
//     } catch (error) {
//       console.error("Failed to load rides:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ─── Fetch ride history from server and merge with local ───────────────
//   const refreshRideHistory = async () => {
//     if (!user?.id) return;
//     try {
//       const { api } = await import('@/lib/api');
//       const serverRides = await api.rides.getByRider(user.id);
//       console.log(`📋 [RideContext] Fetched ${serverRides.length} rides from server for rider ${user.id}`);

//       // Convert server rides (camelCase API format) into our local Ride shape
//       const serverHistory: Ride[] = serverRides
//         .filter((r: any) => r.status === 'completed' || r.status === 'cancelled')
//         .map((r: any) => ({
//           id: r.id,
//           pickupLocation: {
//             address: r.pickupAddress || 'Unknown pickup',
//             latitude: r.pickupLatitude || 0,
//             longitude: r.pickupLongitude || 0,
//           },
//           dropoffLocation: {
//             address: r.dropoffAddress || 'Unknown dropoff',
//             latitude: r.dropoffLatitude || 0,
//             longitude: r.dropoffLongitude || 0,
//           },
//           rideType: (r.vehicleType || 'saloon') as RideType,
//           status: r.status as RideStatus,
//           farePrice: r.finalPrice || r.estimatedPrice || 0,
//           distanceKm: r.distance || 0,
//           durationMinutes: r.estimatedDuration || 0,
//           driverName: r.driverName || undefined,
//           driverPhone: r.driverPhone || undefined,
//           driverRating: r.driverRating || undefined,
//           paymentMethod: r.paymentMethod || undefined,
//           paymentStatus: r.paymentStatus || undefined,
//           createdAt: r.requestedAt || new Date().toISOString(),
//           completedAt: r.completedAt || r.cancelledAt || new Date().toISOString(),
//         }));

//       // Merge: server rides take priority (they have ground-truth status)
//       setRideHistory((prevLocal) => {
//         const localMap = new Map(prevLocal.map(r => [r.id, r]));
//         const serverMap = new Map(serverHistory.map(r => [r.id, r]));

//         // Start with server rides, then add any local-only rides
//         const merged = new Map<string, Ride>();
//         for (const [id, ride] of serverMap) {
//           // Preserve local enrichment (driverName etc) if server doesn't have it
//           const local = localMap.get(id);
//           merged.set(id, local ? {
//             ...local,
//             ...ride,
//             driverName: ride.driverName || local.driverName,
//             driverPhone: ride.driverPhone || local.driverPhone,
//           } : ride);
//         }
//         // Add local-only entries (e.g. rides from a different device session)
//         for (const [id, ride] of localMap) {
//           if (!merged.has(id)) {
//             merged.set(id, ride);
//           }
//         }

//         const mergedArray = Array.from(merged.values())
//           .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

//         // Persist merged history
//         AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(mergedArray)).catch(console.error);
//         console.log(`✅ [RideContext] Merged ride history: ${mergedArray.length} rides (${serverHistory.length} from server, ${prevLocal.length} local)`);
//         return mergedArray;
//       });
//     } catch (err) {
//       console.warn('⚠️ [RideContext] Failed to refresh ride history from server:', err);
//     }
//   };

//   // Auto-sync ride history from server when user becomes available
//   useEffect(() => {
//     if (user?.id) {
//       refreshRideHistory();
//     }
//   }, [user?.id]);

//   const calculateDynamicFare = (distanceMiles: number, durationMin: number, rideType: string): number => {
//     const formattedType = rideType.charAt(0).toUpperCase() + rideType.slice(1);

//     // Supabase stores pricing under "vehicles" key, not "pricing"
//     const vehiclePricing = pricingRules?.vehicles || pricingRules?.pricing;

//     if (!pricingRules || !vehiclePricing || !vehiclePricing[formattedType] || !vehiclePricing[formattedType].enabled) {
//       // Fallback
//       const baseFares: any = { saloon: 4.0, people_carrier: 5.0, minibus: 6.0 };
//       const perKm: any = { saloon: 1.5, people_carrier: 1.85, minibus: 2.2 };
//       const perMin: any = { saloon: 0.35, people_carrier: 0.42, minibus: 0.5 };

//       const distanceKm = distanceMiles / 0.621371;
//       const base = baseFares[rideType] || 4.0;
//       const distanceCost = distanceKm * (perKm[rideType] || 1.5);
//       const timeCost = durationMin * (perMin[rideType] || 0.35);

//       return Math.round((base + distanceCost + timeCost) * 100) / 100;
//     }

//     const p = vehiclePricing[formattedType];
//     const mileTiers = pricingRules.mile_tiers || [];

//     let cost = parseFloat(p.start_price || "0");

//     let currentMileRate = parseFloat(p.base_mile_price || "1.00");
//     let milesRemaining = distanceMiles;
//     let previousTierMiles = 0;

//     const sortedTiers = [...mileTiers].map((t: any) => ({
//       id: t.id,
//       after_miles: parseFloat(t.after_miles || "0")
//     })).sort((a, b) => a.after_miles - b.after_miles);

//     for (const tier of sortedTiers) {
//       const milesInThisTier = tier.after_miles - previousTierMiles;
//       if (milesRemaining <= 0) break;

//       if (milesRemaining > milesInThisTier) {
//         cost += milesInThisTier * currentMileRate;
//         milesRemaining -= milesInThisTier;
//       } else {
//         cost += milesRemaining * currentMileRate;
//         milesRemaining = 0;
//       }
//       previousTierMiles = tier.after_miles;
//       currentMileRate = parseFloat(p.mile_tier_prices[tier.id] || "0");
//     }

//     if (milesRemaining > 0) {
//       cost += milesRemaining * currentMileRate;
//     }

//     const waitingPrice = parseFloat(p.waiting_price || "0");
//     const baseMinutePrice = parseFloat(p.base_minute_price || "0");
//     // Use base minute price if specified, otherwise maybe waiting price applies if it strictly refers to journey
//     // The prompt requested 'aiting time etc' to be considered. We'll add base_minute_price to duration.
//     const minuteRate = baseMinutePrice > 0 ? baseMinutePrice : 0;
//     const timeCost = durationMin * minuteRate;
//     cost += timeCost;

//     const minPrice = parseFloat(p.min_price || "0");
//     if (cost < minPrice) {
//       cost = minPrice;
//     }

//     return Math.round(cost * 100) / 100;
//   };

//   const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string, paymentMethod?: string, useWalletBalance?: boolean): Promise<Ride> => {
//     let distanceKm = 0;
//     let durationMinutes = 0;

//     try {
//       const baseUrl = getApiUrl();
//       const originStr = `${pickup.latitude},${pickup.longitude}`;
//       const destStr = `${dropoff.latitude},${dropoff.longitude}`;
//       const url = `${baseUrl}/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;

//       console.log('📍 Fetching directions for ride request:', url);
//       const res = await fetch(url);
//       const data = await res.json();

//       if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
//         const leg = data.routes[0].legs[0];
//         // distance.value is always in meters from Google API, convert to miles
//         const distanceMeters = leg.distance?.value || 0;
//         distanceKm = distanceMeters / 1000; // keep km for fare calculation
//         durationMinutes = Math.round((leg.duration?.value || 0) / 60);
//         console.log(`✅ Directions API success: ${distanceMeters}m = ${distanceKm.toFixed(1)}km = ${(distanceMeters / 1609.344).toFixed(1)}mi, duration=${durationMinutes}min`);
//       } else {
//         console.warn('⚠️ Directions API returned non-OK status:', data.status, 'error_message:', data.error_message);
//         distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
//         durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
//       }
//     } catch (e) {
//       console.warn("❌ Directions API failed, using fallback:", e);
//       distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
//       durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
//     }

//     // Convert km to miles for storage and display (UK app)
//     const distanceMiles = Math.round(distanceKm * 0.621371 * 10) / 10;

//     const farePrice = calculateDynamicFare(distanceMiles, durationMinutes, rideType);
//     const walletBalance = userRef.current?.walletBalance || 0;
//     const walletDeduction = (useWalletBalance && walletBalance > 0) ? Math.min(walletBalance, farePrice) : 0;
//     const expectedCollectAmount = farePrice - walletDeduction;

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     const newRide: Ride = {
//       id: `ride_${Date.now()}`,
//       pickupLocation: pickup,
//       dropoffLocation: dropoff,
//       rideType,
//       status: "pending",
//       farePrice,
//       distanceKm: distanceMiles, // Store as miles for the UK market
//       durationMinutes,
//       // Driver fields left undefined — populated when a real driver accepts via socket
//       driverName: undefined,
//       driverRating: undefined,
//       vehicleInfo: undefined,
//       licensePlate: undefined,
//       otp,
//       paymentMethod: paymentMethod || "cash",
//       walletDeduction,
//       expectedCollectAmount,
//       createdAt: new Date().toISOString(),
//     };

//     console.log(`🚕 Ride created: distance=${distanceMiles}mi, duration=${durationMinutes}min, fare=${farePrice}`);

//     setActiveRide(newRide);
//     await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

//     // Deduct wallet balance immediately if used
//     if (walletDeduction > 0) {
//       try {
//         await updateProfile({ walletBalance: walletBalance - walletDeduction });

//         // Record the transaction
//         if (user?.id) {
//           const { api } = await import('@/lib/api');
//           await api.payments.addWalletTransaction(user.id, {
//             rideId: newRide.id,
//             amount: walletDeduction,
//             type: "debit",
//             description: `Wallet deduction for ride ${newRide.id.slice(0, 12)}...`,
//           });
//         }
//       } catch (err) {
//         console.error('Failed to deduct wallet balance:', err);
//       }
//     }

//     // Broadcast ride request to all connected drivers via Socket.IO
//     try {
//       const socket = getSocket();
//       socket.emit("ride:request", {
//         ...newRide,
//         riderId: user?.id,
//         riderName: riderName || user?.fullName || "Rider",
//         riderPhone: user?.phone || "",
//       });
//     } catch (err) {
//       console.warn("Socket emit failed:", err);
//     }

//     return newRide;
//   };

//   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
//     if (activeRide?.id === rideId && activeRide.otp === otp) {
//       const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
//       setActiveRide(startedRide);
//       await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
//       return true;
//     }
//     return false;
//   };

//   const cancelRide = async (rideId: string, withPenalty: boolean = false) => {
//     const rideToCancel = activeRide?.id === rideId ? activeRide : null;
//     if (rideToCancel) {
//       let emitted = false;
//       try {
//         const socket = getSocket();
//         socket.emit("ride:status", {
//           rideId,
//           status: "cancelled",
//           cancelledBy: "rider",
//           expectsCancellationFee: withPenalty,
//         });
//         emitted = true;
//       } catch (err) {
//         console.warn("Socket emit failed for cancel:", err);
//       }

//       if (emitted) {
//         pendingCancelledRideRef.current = rideToCancel;
//         activeRideRef.current = null;
//         setActiveRide(null);
//         await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
//       }
//     }
//   };

//   const completeRide = async (rideId: string) => {
//     try {
//       if (activeRide?.id === rideId) {
//         const completedRide: Ride = {
//           ...activeRide,
//           status: "completed",
//           completedAt: new Date().toISOString(),
//         };
//         const newHistory = [completedRide, ...rideHistory];

//         setActiveRide(null);
//         setRideHistory(newHistory);

//         await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
//         await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
//       }
//     } catch (e) {
//       console.error("Failed to mark ride completed", e);
//     }
//   };

//   const updateRidePaymentMethod = async (rideId: string, method: string) => {
//     if (!activeRide || activeRide.id !== rideId) return;
//     try {
//       // 1. Optimistic update
//       const updated = { ...activeRide, paymentMethod: method };
//       setActiveRide(updated);
//       await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated));

//       // 2. Call backend
//       const { api } = await import('@/lib/api');
//       await api.rides.update(rideId, { paymentMethod: method } as Partial<Ride>);

//       // 3. Emit local socket update to immediately notify driver without relying solely on backend sync
//       try {
//         const socket = getSocket();
//         socket.emit("ride:update", { rideId, paymentMethod: method });
//       } catch (e) {
//         console.warn("Could not emit ride:update", e);
//       }
//     } catch (error) {
//       console.error("Failed to update payment method:", error);
//       // Revert optimistic update gracefully if needed here
//     }
//   };

//   const submitRiderRating = async (rideId: string, rating: number, comment?: string) => {
//     try {
//       const baseUrl = getApiUrl();
//       await fetch(`${baseUrl}/api/rides/${rideId}/rating`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           driverRating: rating,
//           driverComment: comment,
//           ratedBy: "rider",
//         }),
//       });
//       console.log(`⭐ Rider submitted rating ${rating} for ride ${rideId}`);
//     } catch (err) {
//       console.warn("Failed to submit rider rating:", err);
//     }
//     setPendingRating(null);
//   };

//   const dismissRiderRating = () => {
//     setPendingRating(null);
//   };

//   return (
//     <RideContext.Provider
//       value={{
//         activeRide,
//         rideHistory,
//         requestRide,
//         startRide,
//         cancelRide,
//         completeRide,
//         updateRidePaymentMethod,
//         calculateDynamicFare,
//         refreshRideHistory,
//         pendingRating,
//         submitRiderRating,
//         dismissRiderRating,
//         isLoading,
//       }}
//     >
//       {children}
//     </RideContext.Provider>
//   );
// }

// export function useRide() {
//   const context = useContext(RideContext);
//   if (context === undefined) {
//     throw new Error("useRide must be used within a RideProvider");
//   }
//   return context;
// }

//client/context/RideContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, connectAsRider, onRideAccepted, onRideUpdate } from "@/lib/socket";
import { getApiUrl } from "@/lib/query-client";
import { normalizeBackendTimestamp } from "@/lib/dateTime";
import { useAuth } from "./AuthContext";
import { sendLocalNotification } from "@/hooks/useNotifications";
import { normalizeVias, viasToWaypointsParam, sumDirectionsLegs, MAX_RIDE_VIAS, type RideVia } from "@shared/vias";

export type RideType = "saloon" | "people_carrier" | "minibus";
export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled" | "cancelled_no_drivers" | "cancelled_no_show";

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export type { RideVia };

export interface Ride {
  id: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  vias?: RideVia[];
  rideType: RideType;
  status: RideStatus;
  farePrice: number;
  distanceKm: number;
  durationMinutes: number;
  driverName?: string;
  driverRating?: number;
  driverPhone?: string;
  vehicleInfo?: string;
  licensePlate?: string;
  otp?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentIntentId?: string;
  walletDeduction?: number;
  expectedCollectAmount?: number;
  couponCode?: string | null;
  discountAmount?: number;
  couponDescription?: string | null;
  discountedFare?: number;
  driverArrivedAt?: string;
  acceptedAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface RideContextType {
  activeRide: Ride | null;
  rideHistory: Ride[];
  requestRide: (
    pickup: Location,
    dropoff: Location,
    rideType: RideType,
    riderName?: string,
    paymentMethod?: string,
    useWalletBalance?: boolean,
    couponCode?: string,
    discountAmount?: number,
    couponDescription?: string,
    vias?: RideVia[],
  ) => Promise<Ride>;
  startRide: (rideId: string, otp: string) => Promise<boolean>;
  cancelRide: (rideId: string, withPenalty?: boolean) => Promise<void>;
  completeRide: (rideId: string) => Promise<void>;
  updateRidePaymentMethod: (rideId: string, method: string) => Promise<void>;
  calculateDynamicFare: (distanceMiles: number, durationMin: number, rideType: string) => number;
  refreshRideHistory: () => Promise<void>;
  pendingRating: { rideId: string; driverName: string } | null;
  submitRiderRating: (rideId: string, rating: number, comment?: string) => void;
  dismissRiderRating: () => void;
  isLoading: boolean;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

const RIDE_HISTORY_KEY = "@uto_ride_history";
const ACTIVE_RIDE_KEY = "@uto_active_ride";



export function RideProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [pricingRules, setPricingRules] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRating, setPendingRating] = useState<{ rideId: string; driverName: string } | null>(null);

  // Keep a ref to the latest user so socket callbacks always see current wallet balance
  const userRef = React.useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Keep a ref to the latest activeRide so socket callbacks always see the current ride
  // This prevents the race condition where the functional updater in setActiveRide
  // finds current === null because a prior handler already cleared it
  const activeRideRef = React.useRef(activeRide);
  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
  const pendingCancelledRideRef = React.useRef<Ride | null>(null);
  const lastDriverCancellationNoticeRef = React.useRef<string | null>(null);

  useEffect(() => {
    loadStoredRides();
    loadPricingRules();
  }, []);

  const loadPricingRules = async () => {
    try {
      const { api } = await import('@/lib/api');
      const rules = await api.pricingRules.getActive();
      if (rules) {
        setPricingRules(rules);
      }
    } catch (e) {
      console.warn("Could not fetch pricing rules", e);
    }
  };

  // Register this rider's socket as soon as we have a user ID
  // so the server can route ride:accepted back to this socket
  useEffect(() => {
    if (!user?.id) return;
    try {
      connectAsRider(user.id);
      console.log('🙋 RideContext: connectAsRider called for', user.id);
    } catch (err) {
      console.warn('⚠️ RideContext: connectAsRider failed:', err);
    }
  }, [user?.id]);

  // Listen for the server's dedicated driver-assigned event.
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    try {
      cleanup = onRideAccepted((data) => {
        setActiveRide((current) => {
          if (!current || current.id !== data.rideId) return current;

          const updated: Ride = {
            ...current,
            status: "accepted",
            acceptedAt: data.acceptedAt || new Date().toISOString(),
            ...((data as any).driverInfo
              ? {
                driverName: (data as any).driverInfo.driverName,
                driverPhone: (data as any).driverInfo.driverPhone,
                vehicleInfo: (data as any).driverInfo.vehicleInfo,
                licensePlate: (data as any).driverInfo.licensePlate,
                driverRating: (data as any).driverInfo.driverRating,
              }
              : {}),
          };
          AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);
          return updated;
        });
      });
    } catch (err) {
      console.warn("Socket not available for accepted listener:", err);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // A scheduled (book-later) ride reached its 15-minute window and went live.
  // The server sends the full ride payload (including the pre-provided PIN) so
  // the rider app can treat it exactly like an immediate booking from here on.
  useEffect(() => {
    let socket: any;
    const handleScheduledActivated = (data: any) => {
      const rideData = data?.ride;
      if (!rideData?.id) return;

      const current = activeRideRef.current;
      if (current && current.id !== rideData.id && ["accepted", "arrived", "in_progress"].includes(current.status)) {
        console.warn("⚠️ Scheduled ride activated while another ride is active — keeping current ride", current.id);
        return;
      }

      const activatedRide: Ride = {
        id: rideData.id,
        pickupLocation: rideData.pickupLocation || { address: "Unknown", latitude: 0, longitude: 0 },
        dropoffLocation: rideData.dropoffLocation || { address: "Unknown", latitude: 0, longitude: 0 },
        rideType: (rideData.rideType as RideType) || "saloon",
        status: data.status === "accepted" ? "accepted" : "pending",
        farePrice: rideData.farePrice || 0,
        distanceKm: rideData.distanceMiles || 0,
        durationMinutes: rideData.durationMinutes || 0,
        otp: rideData.otp || undefined,
        paymentMethod: rideData.paymentMethod || "card",
        acceptedAt: data.acceptedAt || undefined,
        createdAt: new Date().toISOString(),
        ...(data.driverInfo
          ? {
            driverName: data.driverInfo.driverName,
            driverPhone: data.driverInfo.driverPhone,
            vehicleInfo: data.driverInfo.vehicleInfo,
            licensePlate: data.driverInfo.licensePlate,
            driverRating: data.driverInfo.driverRating,
          }
          : {}),
      };

      console.log("🗓 Scheduled ride went live:", activatedRide.id, "status:", activatedRide.status);
      setActiveRide(activatedRide);
      AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(activatedRide)).catch(console.error);

      sendLocalNotification(
        "🗓 Your Scheduled Ride Is Starting",
        data.status === "accepted"
          ? `${data.driverInfo?.driverName || "Your driver"} is getting ready for your pickup at ${activatedRide.pickupLocation.address}.`
          : `We're finding a driver for your pickup at ${activatedRide.pickupLocation.address}.`,
        { type: "scheduled_ride_live", rideId: activatedRide.id, audience: "rider" }
      );
    };

    try {
      socket = getSocket();
      socket.on("ride:scheduled_activated", handleScheduledActivated);
    } catch (err) {
      console.warn("Socket not available for scheduled activation listener:", err);
    }

    return () => {
      if (socket) socket.off("ride:scheduled_activated", handleScheduledActivated);
    };
  }, []);

  // Listen for driver status updates (e.g. ride started via OTP)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    try {
      cleanup = onRideUpdate((update) => {
        if (update.status === "completed" || update.status === "payment_collected" || update.status === "cancelled" || update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") {

          // ✅ Handle wallet update for payment_collected BEFORE touching activeRide
          // The server already updated the DB wallet balance; we refresh from server to stay in sync
          if (update.status === "payment_collected" && (update as any).extraAmount) {
            const extra = parseFloat((update as any).extraAmount);
            if (extra > 0) {
              // 1. Optimistic local update so UI updates immediately
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: currentBalance + extra });
              Alert.alert("Wallet Updated", `£${extra.toFixed(2)} has been added to your wallet by the driver.`);
              console.log(`✅ [RideContext] Wallet updated (optimistic): £${currentBalance} + £${extra} = £${currentBalance + extra}`);

              // 2. Fetch the confirmed balance from server to guarantee accuracy
              // (runs async, doesn't block the UI)
              (async () => {
                try {
                  const userId = userRef.current?.id;
                  if (!userId) return;
                  const baseUrl = getApiUrl();
                  const res = await fetch(`${baseUrl}/api/users/${userId}`);
                  if (res.ok) {
                    const data = await res.json();
                    const serverBalance = data?.user?.wallet_balance ?? data?.user?.walletBalance;
                    if (typeof serverBalance === 'number') {
                      updateProfile({ walletBalance: serverBalance });
                      console.log(`✅ [RideContext] Wallet synced from server: £${serverBalance}`);
                    }
                  }
                } catch (syncErr) {
                  console.warn('⚠️ [RideContext] Could not sync wallet from server:', syncErr);
                }
              })();
            }
          }

          // ✅ Handle no-show cancellation — rider didn't board within 10 minutes
          if (update.status === "cancelled_no_show") {
            const noShowFare = Number((update as any).noShowFare || 0);
            const chargedVia = (update as any).chargedVia || "wallet";

            if (chargedVia === "wallet" && noShowFare > 0) {
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: Math.max(0, currentBalance - noShowFare) });
              console.log(`❌ [RideContext] No-show penalty: £${noShowFare} debited from wallet (clamped to £0 min)`);
            }

            // Show alert to rider about no-show policy
            setTimeout(() => {
              if (chargedVia === "card") {
                Alert.alert(
                  "Ride Cancelled — No Show",
                  `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been charged to your saved card as per our No Show Policy.`,
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert(
                  "Ride Cancelled — No Show",
                  `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been deducted from your wallet as per our No Show Policy.`,
                  [{ text: "OK" }]
                );
              }
            }, 300);
            console.log(`❌ [RideContext] No-show cancellation: £${noShowFare} charged via ${chargedVia}`);

            sendLocalNotification(
              "❌ No Show — Fare Charged",
              `Your driver waited at the pickup but you did not arrive. The full fare amount of £${noShowFare > 0 ? noShowFare.toFixed(2) : '0.00'} will be deducted from your account as per our No Show Policy.`,
              { type: "no_show", rideId: update.rideId, audience: "rider" }
            );
          }

          // ✅ Capture ride data from the ref BEFORE clearing activeRide.
          // Using the ref is reliable because it always holds the latest value,
          // unlike the functional updater capture which can find current === null
          // when React batches updates or another handler already cleared it.
          const capturedRide: Ride | null =
            activeRideRef.current ||
            (pendingCancelledRideRef.current?.id === update.rideId ? pendingCancelledRideRef.current : null);

          // Clear activeRide state
          setActiveRide(null);
          activeRideRef.current = null;
          if (pendingCancelledRideRef.current?.id === update.rideId) {
            pendingCancelledRideRef.current = null;
          }

          // ✅ All history/storage/notifications run AFTER clearing the ride
          if (capturedRide) {
            const ride = capturedRide;

            // Update farePrice if the server sent a totalFare (includes waiting charges)
            const serverTotalFare = Number((update as any).totalFare || 0);
            const waitingCharge = Number((update as any).waitingCharge || 0);
            const discountAmt = Math.max(0, Number(ride.discountAmount || 0));
            const discountedBase = Math.max(0, Number(ride.farePrice || 0) - discountAmt);
            const finalFarePrice = serverTotalFare > 0
              ? serverTotalFare
              : Number((discountedBase + waitingCharge).toFixed(2));

            // Persist final ride to history
            const finalRide: Ride = {
              ...ride,
              farePrice: finalFarePrice,
              discountAmount: discountAmt,
              discountedFare: finalFarePrice,
              status: (update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") ? "cancelled"
                : update.status === "payment_collected" ? "completed"
                  : (update.status as RideStatus),
              completedAt: new Date().toISOString(),
            };
            setRideHistory((prev) => {
              const newHistory = [finalRide, ...prev];
              AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory)).catch(console.error);
              return newHistory;
            });
            AsyncStorage.removeItem(ACTIVE_RIDE_KEY).catch(console.error);
            setActiveRide(null);

            const cancellationFee = Number((update as any).cancellationFee || 0);
            const chargedAmount = Number((update as any).chargedAmount || 0);
            const chargedVia = (update as any).chargedVia;

            // Refund wallet deduction only for free cancellations / no-driver cancellations.
            if ((update.status === "cancelled" || update.status === "cancelled_no_drivers") && cancellationFee <= 0 && ride.walletDeduction && ride.walletDeduction > 0) {
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: currentBalance + ride.walletDeduction });
              console.log(`✅ [RideContext] Refunded £${ride.walletDeduction} for cancelled ride ${ride.id}`);
            }

            if (update.status === "cancelled" && cancellationFee > 0 && (update as any).cancelledBy !== "driver") {
              const serverWalletBalance = (update as any).walletBalance;
              if (chargedVia === "wallet" && typeof serverWalletBalance === "number") {
                updateProfile({ walletBalance: serverWalletBalance });
              } else if (chargedVia === "wallet" && chargedAmount > 0) {
                const currentBalance = userRef.current?.walletBalance || 0;
                const newBalance = Number((currentBalance - chargedAmount).toFixed(2));
                updateProfile({ walletBalance: newBalance });
              }

              setTimeout(() => {
                Alert.alert(
                  "Cancellation Fee Charged",
                  `Your free cancellation period has ended. A cancellation fee of £${cancellationFee.toFixed(2)} has been applied.`,
                  [{ text: "OK" }]
                );
              }, 300);
            }

            if (update.status === "completed" || update.status === "payment_collected") {
              // ✅ Use Number() to safely call toFixed — farePrice can be a string after AsyncStorage round-trip
              const fareStr = `£${Number(finalFarePrice || 0).toFixed(2)}`;
              sendLocalNotification(
                "✅ Trip Completed",
                `Your ride has been completed. Fare: ${fareStr}`,
                { type: "ride_completed", rideId: ride.id, audience: "rider" }
              );
              // Trigger rating prompt — set immediately so it's ready when
              // RideTrackingScreen navigates to Home (1.5s delay gives us time)
              const dName = ride.driverName || "Your Driver";
              const rId = ride.id;
              setPendingRating({ rideId: rId, driverName: dName });
            } else if (update.status === "cancelled" || update.status === "cancelled_no_drivers") {
              sendLocalNotification(
                "❌ Ride Cancelled",
                update.status === "cancelled_no_drivers"
                  ? "No drivers available right now. Please try again later."
                  : "Your ride has been cancelled.",
                { type: "ride_cancelled", rideId: ride.id, audience: "rider" }
              );
            }
          } else {
            console.warn(`⚠️ [RideContext] ride:update ${update.status} received but no active ride found in ref — possible duplicate event`);
          }
          return;
        }
        if (update.status === "pending" && (update as any).driverCancelled && lastDriverCancellationNoticeRef.current !== update.rideId) {
          lastDriverCancellationNoticeRef.current = update.rideId;
          Alert.alert(
            "Driver Cancelled",
            "Your driver cancelled this ride. We're finding another available driver for you.",
            [{ text: "OK" }]
          );
        }

        setActiveRide((current) => {
          if (current && (current.id === update.rideId || !update.rideId)) {
            const updated: Ride = {
              ...current,
              status: update.status as RideStatus,
              ...(update.status === "pending" && (update as any).driverCancelled
                ? {
                  driverName: undefined,
                  driverPhone: undefined,
                  driverRating: undefined,
                  vehicleInfo: undefined,
                  licensePlate: undefined,
                  acceptedAt: undefined,
                  driverArrivedAt: undefined,
                }
                : {}),
              // If the driver sent their real info on accept, use it
              ...(update.status === "accepted" && (update as any).driverInfo
                ? {
                  driverName: (update as any).driverInfo.driverName,
                  driverPhone: (update as any).driverInfo.driverPhone,
                  vehicleInfo: (update as any).driverInfo.vehicleInfo,
                  licensePlate: (update as any).driverInfo.licensePlate,
                  driverRating: (update as any).driverInfo.driverRating,
                }
                : {}),
              ...(update.status === "accepted"
                ? { acceptedAt: (update as any).acceptedAt || (update as any).accepted_at || new Date().toISOString() }
                : {}),
              // Capture driverArrivedAt timestamp when status transitions to "arrived"
              ...(update.status === "arrived" && (update as any).driverArrivedAt
                ? { driverArrivedAt: (update as any).driverArrivedAt }
                : {}),
            };
            AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);

            // 🔔 Notify rider when driver accepts
            if (update.status === "accepted") {
              const driverName = (update as any).driverInfo?.driverName || "Your driver";
              sendLocalNotification(
                "🚗 Driver Accepted!",
                `${driverName} is on the way to pick you up.`,
                { type: "ride_accepted", rideId: current.id, audience: "rider" }
              );
            } else if (update.status === "arrived") {
              sendLocalNotification(
                "📍 Driver Has Arrived",
                "Your driver has arrived. Please provide your PIN to start the ride.",
                { type: "driver_arriving", rideId: current.id, audience: "rider" }
              );
            } else if (update.status === "in_progress") {
              sendLocalNotification(
                "🚀 Ride Started",
                "Your ride is now in progress. Enjoy the trip!",
                { type: "ride_started", rideId: current.id, audience: "rider" }
              );
            }

            return updated;
          }
          return current;
        });
      });
    } catch (err) {
      console.warn("Socket not available:", err);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const loadStoredRides = async () => {
    try {
      const [storedHistory, storedActive] = await Promise.all([
        AsyncStorage.getItem(RIDE_HISTORY_KEY),
        AsyncStorage.getItem(ACTIVE_RIDE_KEY),
      ]);

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        const normalizedHistory = (parsedHistory as Ride[]).map((ride) => ({
          ...ride,
          createdAt: normalizeBackendTimestamp(ride.createdAt || new Date().toISOString()),
          completedAt: ride.completedAt ? normalizeBackendTimestamp(ride.completedAt) : undefined,
        }));
        setRideHistory(normalizedHistory);
      }

      if (storedActive) {
        const localActive = JSON.parse(storedActive);
        setActiveRide(localActive);

        // Verify with server if ride actually completed while app was closed
        try {
          const { api } = await import('@/lib/api');
          const serverRide = await api.rides.get(localActive.id);

          if (serverRide) {
            const serverRideAny = serverRide as any;
            const isCompleted = serverRide.status === 'completed' || serverRide.status === 'cancelled' || serverRideAny.paymentStatus === 'paid' || serverRideAny.paymentStatus === 'completed';
            if (isCompleted) {
              setActiveRide(null);
              await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);

              const history = storedHistory ? JSON.parse(storedHistory) : [];
              if (!history.find((r: Ride) => r.id === localActive.id)) {
                const finalRide = { ...localActive, status: serverRide.status as RideStatus, completedAt: new Date().toISOString() };
                const newHistory = [finalRide, ...history];
                setRideHistory(newHistory);
                await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
              }

              // Trigger rating prompt if it was successfully completed and not yet rated
              const isSuccessfulComplete = serverRide.status === 'completed' || serverRideAny.paymentStatus === 'paid' || serverRideAny.paymentStatus === 'completed';
              if (isSuccessfulComplete && serverRideAny.driverRating === null) {
                const dName = serverRideAny.driverName || localActive.driverName || "Your Driver";
                const rId = serverRide.id;
                setTimeout(() => {
                  setPendingRating({ rideId: rId, driverName: dName });
                }, 1500);
              }
            } else {
              setActiveRide({
                ...localActive,
                status: serverRide.status as RideStatus,
                acceptedAt: serverRideAny.acceptedAt || serverRideAny.accepted_at || localActive.acceptedAt,
                driverName: serverRideAny.driverName || localActive.driverName,
                driverPhone: serverRideAny.driverPhone || localActive.driverPhone,
                vehicleInfo: serverRideAny.vehicleInfo || localActive.vehicleInfo,
                licensePlate: serverRideAny.licensePlate || localActive.licensePlate,
                driverRating: serverRideAny.driverRating || localActive.driverRating,
              });
            }
          }
        } catch (syncErr) {
          console.warn("Failed to sync active ride on load:", syncErr);
        }
      }
    } catch (error) {
      console.error("Failed to load rides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch ride history from server and merge with local ───────────────
  const refreshRideHistory = async () => {
    if (!user?.id) return;
    try {
      const { api } = await import('@/lib/api');
      const serverRides = await api.rides.getByRider(user.id);
      console.log(`📋 [RideContext] Fetched ${serverRides.length} rides from server for rider ${user.id}`);

      // Convert server rides (camelCase API format) into our local Ride shape
      const serverHistory: Ride[] = serverRides
        .filter((r: any) => r.status === 'completed' || r.status === 'cancelled')
        .map((r: any) => ({
          id: r.id,
          pickupLocation: {
            address: r.pickupAddress || 'Unknown pickup',
            latitude: r.pickupLatitude || 0,
            longitude: r.pickupLongitude || 0,
          },
          dropoffLocation: {
            address: r.dropoffAddress || 'Unknown dropoff',
            latitude: r.dropoffLatitude || 0,
            longitude: r.dropoffLongitude || 0,
          },
          rideType: (r.vehicleType || 'saloon') as RideType,
          status: r.status as RideStatus,
          farePrice: typeof r.finalPrice === 'number' && r.finalPrice > 0
            ? r.finalPrice
            : Math.max(0, Number(r.estimatedPrice || 0) - Number(r.discountAmount || 0)),
          discountAmount: Number(r.discountAmount || 0),
          discountedFare: typeof r.finalPrice === 'number' && r.finalPrice > 0
            ? r.finalPrice
            : Math.max(0, Number(r.estimatedPrice || 0) - Number(r.discountAmount || 0)),
          distanceKm: r.distance || 0,
          durationMinutes: r.estimatedDuration || 0,
          driverName: r.driverName || undefined,
          driverRating: r.driverRating || undefined,
          driverPhone: r.driverPhone || undefined,
          paymentMethod: r.paymentMethod || undefined,
          paymentStatus: r.paymentStatus || undefined,
          paymentIntentId: r.paymentIntentId || undefined,
          createdAt: normalizeBackendTimestamp(r.requestedAt || new Date().toISOString()),
          completedAt: normalizeBackendTimestamp(r.completedAt || r.cancelledAt || new Date().toISOString()),
        }));

      // Merge: server rides take priority (they have ground-truth status)
      setRideHistory((prevLocal) => {
        const localMap = new Map(prevLocal.map(r => [r.id, r]));
        const serverMap = new Map(serverHistory.map(r => [r.id, r]));

        // Start with server rides, then add any local-only rides
        const merged = new Map<string, Ride>();
        for (const [id, ride] of serverMap) {
          // Preserve local enrichment (driverName etc) if server doesn't have it
          const local = localMap.get(id);
          merged.set(
            id,
            local
              ? {
                  ...local,
                  ...ride,
                  driverName: ride.driverName || local.driverName,
                  driverPhone: ride.driverPhone || local.driverPhone,
                }
              : ride
          );
        }
        // Add local-only entries (e.g. rides from a different device session)
        for (const [id, ride] of localMap) {
          if (!merged.has(id)) {
            merged.set(id, ride);
          }
        }

        const mergedArray = Array.from(merged.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Persist merged history
        AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(mergedArray)).catch(console.error);
        console.log(`✅ [RideContext] Merged ride history: ${mergedArray.length} rides (${serverHistory.length} from server, ${prevLocal.length} local)`);
        return mergedArray;
      });
    } catch (err) {
      console.warn('⚠️ [RideContext] Failed to refresh ride history from server:', err);
    }
  };

  // Auto-sync ride history from server when user becomes available
  useEffect(() => {
    if (user?.id) {
      refreshRideHistory();
    }
  }, [user?.id]);

  // Ensure active ride always has driver details after reconnect/reopen.
  useEffect(() => {
    if (!activeRide?.id) return;
    const needsDriverDetails =
      ["accepted", "arrived", "in_progress"].includes(activeRide.status) &&
      (!activeRide.driverName || !activeRide.driverPhone);
    if (!needsDriverDetails) return;

    let cancelled = false;
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const serverRide = await api.rides.get(activeRide.id);
        const serverRideAny = serverRide as any;
        if (cancelled || !serverRideAny) return;

        const hasEnrichedData =
          !!serverRideAny.driverName ||
          !!serverRideAny.driverPhone ||
          !!serverRideAny.vehicleInfo ||
          !!serverRideAny.licensePlate;
        if (!hasEnrichedData) return;

        setActiveRide((current) => {
          if (!current || current.id !== activeRide.id) return current;
          const updated: Ride = {
            ...current,
            driverName: serverRideAny.driverName || current.driverName,
            driverPhone: serverRideAny.driverPhone || current.driverPhone,
            vehicleInfo: serverRideAny.vehicleInfo || current.vehicleInfo,
            licensePlate: serverRideAny.licensePlate || current.licensePlate,
            driverRating: serverRideAny.driverRating || current.driverRating,
          };
          AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);
          return updated;
        });
      } catch (err) {
        console.warn("Failed to hydrate active ride driver info:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeRide?.id, activeRide?.status, activeRide?.driverName, activeRide?.driverPhone]);

  const calculateDynamicFare = (distanceMiles: number, durationMin: number, rideType: string): number => {
    const normalizePricingKey = (value: string) =>
      value.toLowerCase().trim().replace(/[\s-]+/g, "_");

    const resolveVehiclePricing = (pricingMap: any, requestedType: string) => {
      if (!pricingMap || typeof pricingMap !== "object") return null;

      const directCandidates = [
        requestedType,
        requestedType.replace(/_/g, " "),
        requestedType.charAt(0).toUpperCase() + requestedType.slice(1),
        requestedType
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      ];

      for (const candidate of directCandidates) {
        if (candidate && pricingMap[candidate]) return pricingMap[candidate];
      }

      const normalizedRequested = normalizePricingKey(requestedType);
      for (const [key, value] of Object.entries(pricingMap)) {
        if (normalizePricingKey(String(key)) === normalizedRequested) {
          return value as any;
        }
      }

      return null;
    };
    
    // Supabase stores pricing under "vehicles" key, not "pricing"
    const vehiclePricing = pricingRules?.vehicles || pricingRules?.pricing;
    const p = resolveVehiclePricing(vehiclePricing, rideType);
    
    if (!pricingRules || !vehiclePricing || !p || p.enabled === false) {
      // Fallback
      const baseFares: any = { saloon: 4.0, people_carrier: 5.0, minibus: 6.0 };
      const perKm: any = { saloon: 1.5, people_carrier: 1.85, minibus: 2.2 };
      const perMin: any = { saloon: 0.35, people_carrier: 0.42, minibus: 0.5 };
  
      const distanceKm = distanceMiles / 0.621371;
      const base = baseFares[rideType] || 4.0;
      const distanceCost = distanceKm * (perKm[rideType] || 1.5);
      const timeCost = durationMin * (perMin[rideType] || 0.35);
  
      return Math.round((base + distanceCost + timeCost) * 100) / 100;
    }
  
    const mileTiers = pricingRules.mile_tiers || [];
    
    let cost = parseFloat(p.start_price || "0");
    
    let currentMileRate = parseFloat(p.base_mile_price || "1.00");
    let milesRemaining = distanceMiles;
    let previousTierMiles = 0;
  
    const sortedTiers = [...mileTiers].map((t: any) => ({
      id: t.id,
      after_miles: parseFloat(t.after_miles || "0")
    })).sort((a, b) => a.after_miles - b.after_miles);
  
    for (const tier of sortedTiers) {
      const milesInThisTier = tier.after_miles - previousTierMiles;
      if (milesRemaining <= 0) break;
      
      if (milesRemaining > milesInThisTier) {
        cost += milesInThisTier * currentMileRate;
        milesRemaining -= milesInThisTier;
      } else {
        cost += milesRemaining * currentMileRate;
        milesRemaining = 0;
      }
      previousTierMiles = tier.after_miles;
      currentMileRate = parseFloat(p.mile_tier_prices?.[tier.id] || "0");
    }
  
    if (milesRemaining > 0) {
      cost += milesRemaining * currentMileRate;
    }
  
    const waitingPrice = parseFloat(p.waiting_price || "0");
    const baseMinutePrice = parseFloat(p.base_minute_price || "0");
    // Use base minute price if specified, otherwise maybe waiting price applies if it strictly refers to journey
    // The prompt requested 'aiting time etc' to be considered. We'll add base_minute_price to duration.
    const minuteRate = baseMinutePrice > 0 ? baseMinutePrice : 0; 
    const timeCost = durationMin * minuteRate;
    cost += timeCost;
  
    const minPrice = parseFloat(p.min_price || "0");
    if (cost < minPrice) {
      cost = minPrice;
    }
  
    return Math.round(cost * 100) / 100;
  };

  const requestRide = async (
    pickup: Location,
    dropoff: Location,
    rideType: RideType,
    riderName?: string,
    paymentMethod?: string,
    useWalletBalance?: boolean,
    couponCode?: string,
    discountAmount: number = 0,
    couponDescription?: string,
    viasInput: RideVia[] = [],
  ): Promise<Ride> => {
    let distanceKm = 0;
    let durationMinutes = 0;
    const vias = normalizeVias(viasInput).slice(0, MAX_RIDE_VIAS);

    try {
      const baseUrl = getApiUrl();
      const originStr = `${pickup.latitude},${pickup.longitude}`;
      const destStr = `${dropoff.latitude},${dropoff.longitude}`;
      const waypoints = viasToWaypointsParam(vias);
      let url = `${baseUrl}/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;
      if (waypoints) {
        url += `&waypoints=${encodeURIComponent(waypoints)}`;
      }

      console.log('📍 Fetching directions for ride request:', url, vias.length ? `(${vias.length} via(s))` : "");
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.routes?.[0]?.legs?.length) {
        const { distanceMeters, durationSeconds } = sumDirectionsLegs(data.routes[0]);
        distanceKm = distanceMeters / 1000;
        durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
        console.log(`✅ Directions API success (with vias): ${distanceMeters}m = ${distanceKm.toFixed(1)}km, duration=${durationMinutes}min, legs=${data.routes[0].legs.length}`);
      } else {
        console.warn('⚠️ Directions API returned non-OK status:', data.status, 'error_message:', data.error_message);
        distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
        durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
      }
    } catch (e) {
      console.warn("❌ Directions API failed, using fallback:", e);
      distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
      durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
    }

    // Convert km to miles for storage and display (UK app)
    const distanceMiles = Math.round(distanceKm * 0.621371 * 10) / 10;

    const fullFare = calculateDynamicFare(distanceMiles, durationMinutes, rideType);
    const couponDiscount = Math.max(0, discountAmount || 0);
    const discountedFare = Math.max(0, fullFare - couponDiscount);
    const walletBalance = userRef.current?.walletBalance || 0;
    const walletDeduction = (useWalletBalance && walletBalance > 0) ? Math.min(walletBalance, discountedFare) : 0;
    const expectedCollectAmount = discountedFare - walletDeduction;
    const normalizedPaymentMethod = paymentMethod || "card";

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const newRide: Ride = {
      id: `ride_${Date.now()}`,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      vias,
      rideType,
      status: "pending",
      farePrice: fullFare,
      distanceKm: distanceMiles, // Store as miles for the UK market
      durationMinutes,
      // Driver fields left undefined — populated when a real driver accepts via socket
      driverName: undefined,
      driverRating: undefined,
      vehicleInfo: undefined,
      licensePlate: undefined,
      otp,
      paymentMethod: normalizedPaymentMethod,
      walletDeduction,
      expectedCollectAmount,
      couponCode: couponCode ?? null,
      discountAmount: couponDiscount,
      couponDescription: couponDescription ?? null,
      discountedFare,
      createdAt: new Date().toISOString(),
    };

    // ASAP rides: do not authorize or charge at booking. Card is charged once
    // when the driver completes the trip (with coupon discount applied server-side).
    if (normalizedPaymentMethod === "card") {
      newRide.paymentStatus = "pending";
    }

    console.log(`🚕 Ride created: distance=${distanceMiles}mi, duration=${durationMinutes}min, fare=${fullFare}, vias=${vias.length}`);

    setActiveRide(newRide);
    await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

    // Do NOT debit wallet at booking time. Money (card capture or wallet)
    // is only taken on complete / no-show / late rider cancel.

    // Broadcast ride request to all connected drivers via Socket.IO
    try {
      const socket = getSocket();
      socket.emit("ride:request", {
        ...newRide,
        riderId: user?.id,
        riderName: riderName || user?.fullName || "Rider",
        riderPhone: user?.phone || "",
        vias,
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }

    return newRide;
  };

  const startRide = async (rideId: string, otp: string): Promise<boolean> => {
    if (activeRide?.id === rideId && activeRide.otp === otp) {
      const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
      setActiveRide(startedRide);
      await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
      return true;
    }
    return false;
  };

  const cancelRide = async (rideId: string, withPenalty: boolean = false) => {
    const rideToCancel = activeRide?.id === rideId ? activeRide : null;
    if (rideToCancel) {
      let emitted = false;
      try {
        const socket = getSocket();
        socket.emit("ride:status", {
          rideId,
          status: "cancelled",
          cancelledBy: "rider",
          expectsCancellationFee: withPenalty,
        });
        emitted = true;
      } catch (err) {
        console.warn("Socket emit failed for cancel:", err);
      }

      if (emitted) {
        pendingCancelledRideRef.current = rideToCancel;
        activeRideRef.current = null;
        setActiveRide(null);
        await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
      }
    }
  };

  const completeRide = async (rideId: string) => {
    try {
      if (activeRide?.id === rideId) {
        const completedRide: Ride = {
          ...activeRide,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
        const newHistory = [completedRide, ...rideHistory];

        setActiveRide(null);
        setRideHistory(newHistory);

        await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
        await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (e) {
      console.error("Failed to mark ride completed", e);
    }
  };

  const updateRidePaymentMethod = async (rideId: string, _method: string) => {
    if (!activeRide || activeRide.id !== rideId) return;
    const nextMethod = "card";
    try {
      // 1. Optimistic update
      const updated = { ...activeRide, paymentMethod: nextMethod };
      setActiveRide(updated);
      await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated));

      // 2. Call backend
      const { api } = await import('@/lib/api');
      await api.rides.update(rideId, { paymentMethod: nextMethod } as Partial<Ride>);

      // 3. Emit local socket update to immediately notify driver without relying solely on backend sync
      try {
        const socket = getSocket();
        socket.emit("ride:update", { rideId, paymentMethod: nextMethod });
      } catch (e) {
        console.warn("Could not emit ride:update", e);
      }
    } catch (error) {
      console.error("Failed to update payment method:", error);
      // Revert optimistic update gracefully if needed here
    }
  };

  const submitRiderRating = async (rideId: string, rating: number, comment?: string) => {
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/rides/${rideId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverRating: rating,
          driverComment: comment,
          ratedBy: "rider",
        }),
      });
      console.log(`⭐ Rider submitted rating ${rating} for ride ${rideId}`);
    } catch (err) {
      console.warn("Failed to submit rider rating:", err);
    }
    setPendingRating(null);
  };

  const dismissRiderRating = () => {
    setPendingRating(null);
  };

  return (
    <RideContext.Provider
      value={{
        activeRide,
        rideHistory,
        requestRide,
        startRide,
        cancelRide,
        completeRide,
        updateRidePaymentMethod,
        calculateDynamicFare,
        refreshRideHistory,
        pendingRating,
        submitRiderRating,
        dismissRiderRating,
        isLoading,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error("useRide must be used within a RideProvider");
  }
  return context;
}
