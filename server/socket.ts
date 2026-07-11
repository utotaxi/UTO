// //server/socket.ts

// import { Server as HTTPServer } from "http";
// import { Server, Socket } from "socket.io";  // ✅ CORRECT - Use socket.io for server
// import { supabase } from "./db";
// import { EventEmitter } from "events";
// import { chargeSavedCard } from "./stripe";

// export const serverRideEmitter = new EventEmitter();

// interface DriverLocation {
//   driverId: string;
//   latitude: number;
//   longitude: number;
//   heading?: number;
//   speed?: number;
// }

// interface RideUpdate {
//   rideId: string;
//   status: string;
//   driverId?: string;
//   driverLocation?: DriverLocation;
//   driverInfo?: any;
// }

// // ─── Haversine Distance (miles) ──────────────────────────────────────────────
// function haversineDistanceMiles(
//   lat1: number, lon1: number,
//   lat2: number, lon2: number
// ): number {
//   const R = 3958.8; // Earth radius in miles
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// // ─── Min-Heap (Priority Queue) for Nearest Driver Dispatch ───────────────────
// // Each entry: { driverId, distance, socketId }
// interface DriverHeapEntry {
//   driverId: string;
//   distance: number;
//   socketId: string;
// }

// class MinHeap {
//   private heap: DriverHeapEntry[] = [];

//   get size(): number { return this.heap.length; }

//   push(entry: DriverHeapEntry): void {
//     this.heap.push(entry);
//     this.bubbleUp(this.heap.length - 1);
//   }

//   pop(): DriverHeapEntry | undefined {
//     if (this.heap.length === 0) return undefined;
//     const min = this.heap[0];
//     const last = this.heap.pop()!;
//     if (this.heap.length > 0) {
//       this.heap[0] = last;
//       this.sinkDown(0);
//     }
//     return min;
//   }

//   private bubbleUp(i: number): void {
//     while (i > 0) {
//       const parent = Math.floor((i - 1) / 2);
//       if (this.heap[parent].distance <= this.heap[i].distance) break;
//       [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
//       i = parent;
//     }
//   }

//   private sinkDown(i: number): void {
//     const n = this.heap.length;
//     while (true) {
//       let smallest = i;
//       const left = 2 * i + 1;
//       const right = 2 * i + 2;
//       if (left < n && this.heap[left].distance < this.heap[smallest].distance) smallest = left;
//       if (right < n && this.heap[right].distance < this.heap[smallest].distance) smallest = right;
//       if (smallest === i) break;
//       [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
//       i = smallest;
//     }
//   }
// }

// const RADIUS_MILES = 5;            // 5-mile radius for driver eligibility
// const DISPATCH_TIMEOUT_MS = 15000; // 15-second timeout per driver
// const ARRIVED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes waiting for rider

// // Track active dispatch queues so we can cancel/advance them
// // rideId -> { heap, timer, rideData, riderSocketId, currentDriverId }
// interface DispatchState {
//   heap: MinHeap;
//   timer: ReturnType<typeof setTimeout> | null;
//   rideData: any;
//   riderSocketId: string;
//   currentDriverId: string | null;
//   declinedBy: Set<string>;
//   cancelled: boolean;
// }

// const dispatchQueues = new Map<string, DispatchState>();

// // Track arrived-at-pickup timers so we can auto-cancel if rider doesn't board
// // No longer tracking arrived timers server-side as the driver manually initiates No Show after 10 min

// export function setupSocketIO(httpServer: HTTPServer) {
//   const io = new Server(httpServer, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//     transports: ["websocket", "polling"],
//     // Extended timeouts so drivers switching to Google Maps don't disconnect
//     pingTimeout: 60000,
//     pingInterval: 25000,
//   });

//   const connectedDrivers = new Map<string, string>();  // driverId -> socketId
//   const connectedRiders = new Map<string, string>();    // riderId  -> socketId
//   const activeRides = new Map<string, { riderSocketId: string; riderId?: string; declinedBy: Set<string>; rideData?: any; driverSocketId?: string }>();
//   const latestDriverLocations = new Map<string, DriverLocation>(); // driverId or socketId -> location

//   const getDriverIdForSocket = (socketId?: string): string | null => {
//     if (!socketId) return null;
//     for (const [driverId, driverSocketId] of connectedDrivers.entries()) {
//       if (driverSocketId === socketId) return driverId;
//     }
//     return null;
//   };

//   const resolveDriverTableId = async (driverId?: string | null): Promise<string | null> => {
//     if (!driverId) return null;

//     const { data: directDriver } = await supabase
//       .from("drivers")
//       .select("id")
//       .eq("id", driverId)
//       .single();

//     if (directDriver?.id) return directDriver.id;

//     const { data: driverByUserId } = await supabase
//       .from("drivers")
//       .select("id")
//       .eq("user_id", driverId)
//       .single();

//     return driverByUserId?.id || null;
//   };

//   const buildRideDataFromDbRide = (ride: any) => ({
//     id: ride.id,
//     riderId: ride.rider_id,
//     rideType: ride.vehicle_type || "saloon",
//     vehicleType: ride.vehicle_type || "saloon",
//     pickupLocation: {
//       address: ride.pickup_address || "Unknown",
//       latitude: ride.pickup_latitude || 0,
//       longitude: ride.pickup_longitude || 0,
//     },
//     dropoffLocation: {
//       address: ride.dropoff_address || "Unknown",
//       latitude: ride.dropoff_latitude || 0,
//       longitude: ride.dropoff_longitude || 0,
//     },
//     farePrice: Number(ride.estimated_price || ride.final_price || 0),
//     distanceMiles: Number(ride.distance || 0),
//     durationMinutes: Number(ride.estimated_duration || 0),
//     paymentMethod: ride.payment_method || "cash",
//   });

//   const buildFallbackDriverLocation = (rideId: string, driverId?: string | null): (DriverLocation & { rideId: string }) | null => {
//     const rideInfo = activeRides.get(rideId);
//     const pickup = rideInfo?.rideData?.pickupLocation;
//     if (pickup?.latitude == null || pickup?.longitude == null) return null;

//     return {
//       driverId: driverId || getDriverIdForSocket(rideInfo?.driverSocketId) || "unknown",
//       rideId,
//       latitude: Number(pickup.latitude) - 0.012,
//       longitude: Number(pickup.longitude) - 0.012,
//     };
//   };

//   const getLatestDriverLocation = async (
//     rideId: string,
//     driverId?: string | null,
//     driverSocketId?: string
//   ): Promise<(DriverLocation & { rideId: string }) | null> => {
//     const cachedLocation =
//       (driverId ? latestDriverLocations.get(driverId) : undefined) ||
//       (driverSocketId ? latestDriverLocations.get(driverSocketId) : undefined);

//     if (cachedLocation?.latitude != null && cachedLocation?.longitude != null) {
//       return {
//         ...cachedLocation,
//         driverId: driverId || cachedLocation.driverId,
//         rideId,
//       };
//     }

//     if (!driverId) return null;

//     const { data: driverRow } = await supabase
//       .from("drivers")
//       .select("current_latitude, current_longitude")
//       .eq("id", driverId)
//       .maybeSingle();

//     if (driverRow?.current_latitude != null && driverRow?.current_longitude != null) {
//       return {
//         driverId,
//         rideId,
//         latitude: Number(driverRow.current_latitude),
//         longitude: Number(driverRow.current_longitude),
//       };
//     }

//     const { data: latestLocation } = await supabase
//       .from("driver_locations")
//       .select("latitude, longitude, heading, speed")
//       .eq("driver_id", driverId)
//       .order("created_at", { ascending: false })
//       .limit(1)
//       .maybeSingle();

//     if (latestLocation?.latitude != null && latestLocation?.longitude != null) {
//       return {
//         driverId,
//         rideId,
//         latitude: Number(latestLocation.latitude),
//         longitude: Number(latestLocation.longitude),
//         heading: latestLocation.heading,
//         speed: latestLocation.speed,
//       };
//     }

//     return null;
//   };

//   // ─── dispatchToNextDriver ──────────────────────────────────────────────
//   // Pops the nearest driver from the heap and sends the ride exclusively to them.
//   // Sets a 15-second timeout; if the driver doesn't accept, moves to the next.
//   async function dispatchToNextDriver(rideId: string) {
//     const state = dispatchQueues.get(rideId);
//     if (!state || state.cancelled) {
//       dispatchQueues.delete(rideId);
//       return;
//     }

//     // Clear any previous timeout
//     if (state.timer) clearTimeout(state.timer);

//     // Pop nearest available driver from the heap
//     let entry: DriverHeapEntry | undefined;
//     while ((entry = state.heap.pop()) !== undefined) {
//       if (state.declinedBy.has(entry.driverId)) {
//         console.log(`⏭️ Skipping driver ${entry.driverId} — already declined or cancelled for ride ${rideId}`);
//         entry = undefined;
//         continue;
//       }

//       // Verify they are still connected
//       const currentSocketId = connectedDrivers.get(entry.driverId);
//       if (currentSocketId) break;
//       console.log(`⏭️ Skipping driver ${entry.driverId} — no longer connected`);
//       entry = undefined;
//     }

//     if (!entry) {
//       // No more drivers in radius — notify rider
//       console.log(`🚫 No more drivers available within ${RADIUS_MILES} miles for ride ${rideId}`);
//       io.to(state.riderSocketId).emit("ride:update", {
//         rideId,
//         status: "cancelled_no_drivers",
//       });

//       // Also update the ride in DB to cancelled
//       try {
//         await supabase
//           .from("rides")
//           .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
//           .eq("id", rideId);
//         console.log(`✅ Ride ${rideId} marked cancelled in DB (no drivers available)`);
//       } catch (dbErr) {
//         console.error(`❌ Failed to cancel ride ${rideId} in DB:`, dbErr);
//       }
//       dispatchQueues.delete(rideId);
//       return;
//     }

//     state.currentDriverId = entry.driverId;

//     // Annotate ride data with the actual distances so the driver sees it
//     const enrichedRide = {
//       ...state.rideData,
//       pickupDistance: Math.round(entry.distance * 100) / 100,   // in miles, 2 decimals
//       _dispatchedTo: entry.driverId, // private marker
//     };

//     // Ensure rider phone is present — look up from DB if not in ride data
//     if (!enrichedRide.riderPhone && enrichedRide.riderId) {
//       try {
//         const { data: riderUser } = await supabase
//           .from("users")
//           .select("phone")
//           .eq("id", enrichedRide.riderId)
//           .single();
//         if (riderUser?.phone) {
//           enrichedRide.riderPhone = riderUser.phone;
//           console.log(`📞 Looked up rider phone for dispatch: ${riderUser.phone}`);
//         }
//       } catch (_) {
//         // Non-critical — driver can still use the app without phone
//       }
//     }

//     console.log(`📡 Dispatching ride ${rideId} to nearest driver ${entry.driverId} (${entry.distance.toFixed(2)} mi away)`);
//     io.to(`driver:${entry.driverId}`).emit("ride:new", enrichedRide);

//     // Issue 9: Send push notification for background ride delivery
//     try {
//       const { data: driverUser } = await supabase
//         .from("drivers")
//         .select("user_id")
//         .eq("id", entry.driverId)
//         .single();

//       if (driverUser?.user_id) {
//         const { data: userRow } = await supabase
//           .from("users")
//           .select("push_token")
//           .eq("id", driverUser.user_id)
//           .single();

//         if (userRow?.push_token) {
//           const pushMessage = {
//             to: userRow.push_token,
//             sound: "default",
//             title: "🚕 New Ride Request",
//             body: `New ride from ${enrichedRide.pickupLocation?.address || enrichedRide.pickupAddress || "nearby"} — £${(enrichedRide.farePrice || enrichedRide.estimatedPrice || 0).toFixed(2)}`,
//             data: { type: "ride_request", rideId },
//             priority: "high",
//           };

//           fetch("https://exp.host/--/api/v2/push/send", {
//             method: "POST",
//             headers: {
//               "Accept": "application/json",
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify(pushMessage),
//           }).catch((pushErr) => {
//             console.warn(`⚠️ Push notification failed for driver ${entry!.driverId}:`, pushErr);
//           });
//           console.log(`📲 Push notification sent to driver ${entry.driverId} (token: ${userRow.push_token.substring(0, 20)}...)`);
//         }
//       }
//     } catch (pushErr) {
//       console.warn(`⚠️ Could not send push notification to driver ${entry.driverId}:`, pushErr);
//     }

//     // Start 15-second countdown
//     state.timer = setTimeout(() => {
//       console.log(`⏱️ Driver ${entry!.driverId} did not respond within ${DISPATCH_TIMEOUT_MS / 1000}s — moving to next`);
//       // Notify the timed-out driver to clear their screen
//       io.to(`driver:${entry!.driverId}`).emit("ride:expired", { rideId });
//       dispatchToNextDriver(rideId);
//     }, DISPATCH_TIMEOUT_MS);
//   }

//   const handleRideRequest = async (rideData: any, sourceSocketId: string | null) => {
//     console.log('🚕 New ride request from:', rideData.riderId, 'Ride ID:', rideData.id);
//     console.log('🚕 Ride data keys:', Object.keys(rideData));

//     if (rideData.id) {
//       const existingRideInfo = activeRides.get(rideData.id);
//       activeRides.set(rideData.id, {
//         riderSocketId: sourceSocketId || '',
//         riderId: rideData.riderId,
//         declinedBy: existingRideInfo?.declinedBy || new Set(),
//         rideData: rideData,
//         driverSocketId: existingRideInfo?.driverSocketId,
//       });

//       // Save ride details to Supabase so it's persisted for ride history
//       if (rideData.riderId) {
//         try {
//           const insertPayload: Record<string, any> = {
//             id: rideData.id,
//             rider_id: rideData.riderId,
//             status: "pending",
//             vehicle_type: rideData.rideType || "economy",
//             pickup_address: rideData.pickupLocation?.address || "Unknown",
//             pickup_latitude: rideData.pickupLocation?.latitude || 0,
//             pickup_longitude: rideData.pickupLocation?.longitude || 0,
//             dropoff_address: rideData.dropoffLocation?.address || "Unknown",
//             dropoff_latitude: rideData.dropoffLocation?.latitude || 0,
//             dropoff_longitude: rideData.dropoffLocation?.longitude || 0,
//             estimated_price: rideData.farePrice || 0,
//             // Parse to integers to avoid "invalid input syntax for type integer" DB error
//             distance: Math.round(parseFloat(rideData.distanceKm || rideData.distanceMiles || 0)),
//             estimated_duration: Math.round(parseFloat(rideData.durationMinutes || 0)),
//             payment_method: rideData.paymentMethod || "cash",
//           };

//           console.log('🚕 Inserting ride into Supabase:', JSON.stringify(insertPayload));

//           let { data: insertedData, error: insertError } = await supabase
//             .from("rides")
//             .insert(insertPayload)
//             .select()
//             .single();

//           if (
//             insertError?.code === "PGRST204" &&
//             String(insertError.message || "").includes("payment_method")
//           ) {
//             const retryPayload = { ...insertPayload };
//             delete retryPayload.payment_method;
//             console.warn("⚠️ rides.payment_method is missing in Supabase schema cache; retrying ride insert without payment_method");

//             const retryResult = await supabase
//               .from("rides")
//               .insert(retryPayload)
//               .select()
//               .single();

//             insertedData = retryResult.data;
//             insertError = retryResult.error;
//           }

//           if (insertError) {
//             console.error("❌ Failed to save ride request to DB:", JSON.stringify(insertError));
//             // Don't proceed with dispatch if DB insert failed
//             if (sourceSocketId) {
//               io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Failed to save ride to database" });
//             }
//             return;
//           } else {
//             console.log(`✅ Saved ride ${rideData.id} to Supabase! Row:`, insertedData?.id);
//           }
//         } catch (error) {
//           console.error("❌ Exception saving ride request to DB:", error);
//           // Don't proceed with dispatch if exception occurred
//           if (sourceSocketId) {
//             io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Failed to save ride to database" });
//           }
//           return;
//         }
//       } else {
//         console.warn('⚠️ No riderId in ride request, skipping DB save');
//         // Don't proceed with dispatch if no riderId
//         if (sourceSocketId) {
//           io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Missing rider information" });
//         }
//         return;
//       }
//     }

//     // ─── DSA-based Nearest Driver Dispatch ─────────────────────────────
//     // 1. Get pickup coordinates
//     const pickupLat = rideData.pickupLocation?.latitude || rideData.pickupLatitude || 0;
//     const pickupLng = rideData.pickupLocation?.longitude || rideData.pickupLongitude || 0;

//     console.log(`📍 Pickup coordinates: (${pickupLat}, ${pickupLng})`);
//     console.log(`📊 Currently connected drivers: ${connectedDrivers.size}`);
//     for (const [dId, sId] of connectedDrivers.entries()) {
//       console.log(`   🚗 Driver ${dId} -> socket ${sId}`);
//     }

//     if (!pickupLat || !pickupLng) {
//       console.warn('⚠️ No pickup coordinates — falling back to broadcast to all connected drivers');
//       // Instead of generic broadcast, send to all connected driver sockets
//       for (const [driverId] of connectedDrivers) {
//         io.to(`driver:${driverId}`).emit("ride:new", rideData);
//       }
//       return;
//     }

//     // 2. Query all online drivers with their locations from DB
//     //    We query is_online=true only (not is_available — the driver socket connection is the real signal)
//     const { data: onlineDrivers, error: driversErr } = await supabase
//       .from("drivers")
//       .select("id, current_latitude, current_longitude, is_available, vehicle_type")
//       .eq("is_online", true);

//     console.log(`📊 DB online drivers: ${onlineDrivers?.length || 0}, error: ${driversErr?.message || 'none'}`);

//     // Issue 10: Vehicle type matching
//     // Map rider-requested ride types to compatible driver vehicle types
//     const requestedType = (rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy").toLowerCase();
//     const compatibleTypes = getCompatibleVehicleTypes(requestedType);
//     console.log(`🚗 Requested vehicle type: "${requestedType}" → compatible: [${compatibleTypes.join(', ')}]`);

//     // 3. Build Min-Heap combining DB drivers + socket-connected drivers
//     const heap = new MinHeap();
//     const addedDriverIds = new Set<string>();

//     // First pass: Add drivers with location data in the DB
//     if (onlineDrivers && onlineDrivers.length > 0) {
//       for (const driver of onlineDrivers) {
//         const driverSocketId = connectedDrivers.get(driver.id);
//         if (!driverSocketId) {
//           console.log(`   ⏭️ Skipping DB driver ${driver.id} — not socket-connected`);
//           continue;
//         }

//         // Vehicle type filtering
//         const driverVehicle = (driver.vehicle_type || 'saloon').toLowerCase();
//         if (!compatibleTypes.includes(driverVehicle)) {
//           console.log(`   ⏭️ Skipping driver ${driver.id} — vehicle "${driverVehicle}" not compatible with "${requestedType}"`);
//           continue;
//         }

//         if (driver.current_latitude != null && driver.current_longitude != null) {
//           const dist = haversineDistanceMiles(
//             pickupLat, pickupLng,
//             driver.current_latitude, driver.current_longitude
//           );
//           console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle})`);

//           if (dist <= RADIUS_MILES) {
//             heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId });
//             addedDriverIds.add(driver.id);
//           } else {
//             console.log(`   ⏭️ Driver ${driver.id} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
//           }
//         } else {
//           console.log(`   ⚠️ Driver ${driver.id} has no DB location, will try as fallback`);
//         }
//       }
//     }

//     // Second pass: Add any socket-connected drivers not yet in heap
//     // (they may not have location in DB yet but are actively connected)
//     // For these drivers, we still need vehicle type checking
//     for (const [driverId, socketId] of connectedDrivers) {
//       if (!addedDriverIds.has(driverId)) {
//         // Check vehicle type from DB for this driver
//         let vehicleOk = true;
//         try {
//           const { data: driverRow } = await supabase
//             .from("drivers")
//             .select("vehicle_type")
//             .eq("id", driverId)
//             .maybeSingle();

//           if (!driverRow) {
//             console.log(`   ⏭️ Skipping socket driver ${driverId} — no matching drivers row`);
//             continue;
//           }

//           const driverVehicle = (driverRow?.vehicle_type || 'saloon').toLowerCase();
//           if (!compatibleTypes.includes(driverVehicle)) {
//             console.log(`   ⏭️ Skipping socket driver ${driverId} — vehicle "${driverVehicle}" not compatible`);
//             vehicleOk = false;
//           }
//         } catch (_) {
//           // If we can't look up vehicle type, allow as fallback
//         }

//         if (vehicleOk) {
//           // Assign a default distance (e.g., 1 mile) since we don't know their exact location
//           // This ensures they still get ride offers
//           console.log(`   🔄 Adding socket-connected driver ${driverId} without DB location (default 1 mi distance)`);
//           heap.push({ driverId, distance: 1.0, socketId });
//           addedDriverIds.add(driverId);
//         }
//       }
//     }

//     console.log(`📊 Total eligible drivers for dispatch: ${heap.size} (radius: ${RADIUS_MILES} miles, pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)})`);

//     if (heap.size === 0) {
//       console.log('🚫 No drivers available at all — notifying rider');
//       if (sourceSocketId) {
//         io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "cancelled_no_drivers" });
//       }

//       // Also update the ride in DB to cancelled
//       if (rideData.id) {
//         try {
//           await supabase
//             .from("rides")
//             .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
//             .eq("id", rideData.id);
//           console.log(`✅ Ride ${rideData.id} marked cancelled in DB (no drivers at all)`);
//         } catch (dbErr) {
//           console.error(`❌ Failed to cancel ride ${rideData.id} in DB:`, dbErr);
//         }
//       }
//       return;
//     }

//     // 4. Start sequential dispatch — nearest first
//     const rideInfo = activeRides.get(rideData.id);
//     const dispatchState: DispatchState = {
//       heap,
//       timer: null,
//       rideData,
//       riderSocketId: sourceSocketId || '',
//       currentDriverId: null,
//       declinedBy: rideInfo?.declinedBy || new Set(),
//       cancelled: false,
//     };
//     dispatchQueues.set(rideData.id, dispatchState);
//     dispatchToNextDriver(rideData.id);
//   };

//   const getCompatibleVehicleTypes = (rideType: string): string[] => {
//     switch (rideType) {
//       case 'economy':
//       case 'standard':
//       case 'comfort':
//       case 'saloon':
//         return ['saloon', 'economy', 'standard', 'comfort'];
//       case 'people_carrier':
//       case 'people carrier':
//         return ['people_carrier', 'minibus'];
//       case 'minibus':
//         return ['minibus'];
//       default:
//         return ['saloon', 'economy', 'standard', 'comfort', 'people_carrier', 'minibus'];
//     }
//   };

//   async function buildDispatchState(rideData: any, riderSocketId: string, declinedBy: Set<string>) {
//     const pickupLat = rideData.pickupLocation?.latitude || rideData.pickupLatitude || 0;
//     const pickupLng = rideData.pickupLocation?.longitude || rideData.pickupLongitude || 0;

//     if (!pickupLat || !pickupLng) {
//       console.warn(`⚠️ Cannot build dispatch queue for ride ${rideData.id} because pickup coordinates are missing`);
//       return null;
//     }

//     const requestedType = (rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy").toLowerCase();
//     const compatibleTypes = getCompatibleVehicleTypes(requestedType);

//     const heap = new MinHeap();
//     const addedDriverIds = new Set<string>();

//     const { data: onlineDrivers, error: driversErr } = await supabase
//       .from("drivers")
//       .select("id, current_latitude, current_longitude, is_available, vehicle_type")
//       .eq("is_online", true);

//     if (driversErr) {
//       console.error(`❌ Could not load online drivers for reassignment of ride ${rideData.id}:`, driversErr);
//       return null;
//     }

//     if (onlineDrivers && onlineDrivers.length > 0) {
//       for (const driver of onlineDrivers) {
//         if (declinedBy.has(driver.id)) {
//           console.log(`   ⏭️ Skipping driver ${driver.id} — already declined or cancelled for ride ${rideData.id}`);
//           continue;
//         }

//         const driverSocketId = connectedDrivers.get(driver.id);
//         if (!driverSocketId) {
//           console.log(`   ⏭️ Skipping DB driver ${driver.id} — not socket-connected`);
//           continue;
//         }

//         const driverVehicle = (driver.vehicle_type || 'saloon').toLowerCase();
//         if (!compatibleTypes.includes(driverVehicle)) {
//           console.log(`   ⏭️ Skipping driver ${driver.id} — vehicle "${driverVehicle}" not compatible with "${requestedType}"`);
//           continue;
//         }

//         if (driver.current_latitude != null && driver.current_longitude != null) {
//           const dist = haversineDistanceMiles(
//             pickupLat, pickupLng,
//             driver.current_latitude, driver.current_longitude
//           );

//           console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle})`);

//           if (dist <= RADIUS_MILES) {
//             heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId });
//             addedDriverIds.add(driver.id);
//           } else {
//             console.log(`   ⏭️ Driver ${driver.id} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
//           }
//         } else {
//           console.log(`   ⚠️ Driver ${driver.id} has no DB location, will try as fallback`);
//         }
//       }
//     }

//     for (const [driverId, socketId] of connectedDrivers) {
//       if (addedDriverIds.has(driverId) || declinedBy.has(driverId)) continue;

//       let vehicleOk = true;
//       try {
//         const { data: driverRow } = await supabase
//           .from("drivers")
//           .select("vehicle_type")
//           .eq("id", driverId)
//           .maybeSingle();

//         if (!driverRow) {
//           console.log(`   ⏭️ Skipping socket driver ${driverId} — no matching drivers row`);
//           continue;
//         }

//         const driverVehicle = (driverRow?.vehicle_type || 'saloon').toLowerCase();
//         if (!compatibleTypes.includes(driverVehicle)) {
//           console.log(`   ⏭️ Skipping socket driver ${driverId} — vehicle "${driverVehicle}" not compatible`);
//           vehicleOk = false;
//         }
//       } catch (_) {
//         // If we can't look up vehicle type, allow as fallback
//       }
//       if (!vehicleOk) continue;

//       console.log(`   🔄 Adding socket-connected driver ${driverId} without DB location (default 1 mi distance)`);
//       heap.push({ driverId, distance: 1.0, socketId });
//       addedDriverIds.add(driverId);
//     }

//     if (heap.size === 0) {
//       return null;
//     }

//     return {
//       heap,
//       timer: null,
//       rideData,
//       riderSocketId,
//       currentDriverId: null,
//       declinedBy,
//       cancelled: false,
//     } as DispatchState;
//   }

//   io.on("connection", (socket: Socket) => {
//     console.log(`✅ Client connected: ${socket.id}`);

//     socket.on("driver:connect", async (driverId: string) => {
//       const actualDriverId = await resolveDriverTableId(driverId);
//       if (!actualDriverId) {
//         console.warn(`⚠️ driver:connect ignored — ${driverId} is not a valid drivers.id or drivers.user_id`);
//         return;
//       }
//       const connectedDriverId = actualDriverId;
//       connectedDrivers.set(connectedDriverId, socket.id);
//       socket.join(`driver:${driverId}`);
//       socket.join(`driver:${connectedDriverId}`);
//       console.log(`🚗 Driver ${connectedDriverId} connected (socket ${socket.id})`);
//       console.log(`📊 Total connected drivers: ${connectedDrivers.size}`);

//       // Re-link driver's socket to any active rides (handles reconnection after Google Maps)
//       for (const [rideId, rideInfo] of activeRides.entries()) {
//         if (rideInfo.driverSocketId && rideInfo.driverSocketId !== socket.id) {
//           // Check if this driver owns this ride via DB
//           try {
//             const { data: rideRow } = await supabase
//               .from("rides")
//               .select("driver_id, status")
//               .eq("id", rideId)
//               .single();
//             if (rideRow && rideRow.driver_id === connectedDriverId && ["accepted", "arrived", "in_progress"].includes(rideRow.status)) {
//               rideInfo.driverSocketId = socket.id;
//               console.log(`🔗 Re-linked driver ${connectedDriverId} socket to active ride ${rideId}`);
//             }
//           } catch (_) { /* non-critical */ }
//         }
//       }

//       try {
//         // Set driver as online AND available when they connect, and update last seen
//         const { error } = await supabase
//           .from("drivers")
//           .update({ is_online: true, is_available: true, last_seen_at: new Date().toISOString() })
//           .eq("id", connectedDriverId);
//         if (error) {
//           console.error("❌ Error updating driver status on connect:", error);
//         } else {
//           console.log(`✅ Driver ${connectedDriverId} marked online + available in DB`);
//         }
//       } catch (error) {
//         console.error("Error updating driver status:", error);
//       }
//     });

//     socket.on("rider:connect", (riderId: string) => {
//       connectedRiders.set(riderId, socket.id);
//       socket.join(`rider:${riderId}`);
//       console.log(`🙋 Rider ${riderId} connected`);
//     });

//     socket.on("rider:request_driver_location", async (data: { riderId: string; rideId: string }) => {
//       try {

//         const { data: ride, error: rideErr } = await supabase
//           .from("rides")
//           .select("id, rider_id, driver_id, status")
//           .eq("id", data.rideId)
//           .maybeSingle();

//         if (rideErr || !ride) {
//           const rideInfo = activeRides.get(data.rideId);
//           if (!rideInfo || rideInfo.riderId !== data.riderId) {
//             console.warn(`⚠️ Driver location request: no active in-memory ride for ${data.rideId}`);
//             return;
//           }

//           const driverId = getDriverIdForSocket(rideInfo.driverSocketId);
//           const payload = await getLatestDriverLocation(data.rideId, driverId, rideInfo.driverSocketId);

//           if (payload) {
//             io.to(socket.id).emit("driver:location", payload);
//           } else {
//             console.warn(`⚠️ Driver location request: no real driver coordinates for ride ${data.rideId}`);
//           }
//           return;
//         }

//         if (ride.rider_id !== data.riderId) {
//           return;
//         }

//         if (!ride.driver_id || !["accepted", "arriving", "arrived", "in_progress"].includes(ride.status)) {
//           const rideInfo = activeRides.get(ride.id);
//           const activeDriverId = getDriverIdForSocket(rideInfo?.driverSocketId);
//           if (activeDriverId) {
//             const payload = await getLatestDriverLocation(ride.id, activeDriverId, rideInfo?.driverSocketId);
//             if (payload) {
//               io.to(socket.id).emit("driver:location", payload);
//               return;
//             }
//           }

//           console.log(`ℹ️ Driver location request: ride ${data.rideId} has no active assigned driver. status=${ride.status}, driver_id=${ride.driver_id}`);
//           return;
//         }

//         const rideInfo = activeRides.get(ride.id);
//         const payload = await getLatestDriverLocation(ride.id, ride.driver_id, rideInfo?.driverSocketId);
//         if (payload) {
//           io.to(socket.id).emit("driver:location", payload);
//         } else {
//           console.warn(`⚠️ Driver location request: no real coordinates for driver ${ride.driver_id} on ride ${ride.id}`);
//         }
//       } catch (err) {
//         console.error("❌ Error handling rider driver-location request:", err);
//       }
//     });

//     socket.on("driver:location", async (location: DriverLocation) => {
//       try {
//         const actualDriverId = await resolveDriverTableId(location.driverId);
//         if (!actualDriverId) {
//           console.warn(`⚠️ driver:location ignored — ${location.driverId} is not a valid drivers.id or drivers.user_id`);
//           return;
//         }

//         const normalizedLocation = {
//           ...location,
//           driverId: actualDriverId,
//         };
//         latestDriverLocations.set(actualDriverId, normalizedLocation);
//         latestDriverLocations.set(socket.id, normalizedLocation);

//         await supabase
//           .from("drivers")
//           .update({
//             current_latitude: normalizedLocation.latitude,
//             current_longitude: normalizedLocation.longitude,
//             last_seen_at: new Date().toISOString()
//           })
//           .eq("id", actualDriverId);

//         await supabase.from("driver_locations").insert({
//           driver_id: actualDriverId,
//           latitude: normalizedLocation.latitude,
//           longitude: normalizedLocation.longitude,
//           heading: normalizedLocation.heading,
//           speed: normalizedLocation.speed,
//         });

//         const { data: activeRidesData } = await supabase
//           .from("rides")
//           .select("*")
//           .eq("driver_id", actualDriverId);

//         const notifiedRiders = new Set<string>();
//         for (const ride of (activeRidesData || [])) {
//           if (["accepted", "arriving", "arrived", "in_progress"].includes(ride.status)) {
//             io.to(`rider:${ride.rider_id}`).emit("driver:location", {
//               ...normalizedLocation,
//               rideId: ride.id,
//             });
//             notifiedRiders.add(ride.rider_id);
//           }
//         }

//         for (const [rideId, rideInfo] of activeRides.entries()) {
//           if (rideInfo.driverSocketId === socket.id) {
//             const payload = {
//               ...normalizedLocation,
//               rideId,
//             };
//             if (rideInfo.riderSocketId) {
//               io.to(rideInfo.riderSocketId).emit("driver:location", payload);
//             }
//             if (rideInfo.riderId && !notifiedRiders.has(rideInfo.riderId)) {
//               io.to(`rider:${rideInfo.riderId}`).emit("driver:location", payload);
//               notifiedRiders.add(rideInfo.riderId);
//             }
//           }
//         }
//       } catch (error) {
//         console.error("Error updating driver location:", error);
//       }
//     });

//     socket.on("ride:request", async (rideData: any) => {
//       await handleRideRequest(rideData, socket.id);
//     });

//     socket.on("ride:declined", async (data: { rideId: string, rideData?: any, driverId?: string }) => {
//       console.log('❌ Ride declined by driver:', data.driverId, 'for ride:', data.rideId);
//       const rideInfo = activeRides.get(data.rideId);

//       if (rideInfo && data.driverId) {
//         rideInfo.declinedBy.add(data.driverId);
//       }

//       // Advance the dispatch queue to the next nearest driver
//       const dispState = dispatchQueues.get(data.rideId);
//       if (dispState) {
//         if (dispState.timer) clearTimeout(dispState.timer);
//         if (data.driverId) {
//           dispState.declinedBy.add(data.driverId);
//         }
//         console.log(`⏭️ Driver ${data.driverId} declined — dispatching to next nearest driver`);
//         dispatchToNextDriver(data.rideId);
//       }
//     });

//     socket.on("ride:driver_cancel_at_pickup", async (data: { rideId: string, driverId?: string, applyPenalty?: boolean, cancelledFrom?: string }) => {


//       try {
//         const { data: ride, error: rideFetchErr } = await supabase
//           .from("rides")
//           .select("*")
//           .eq("id", data.rideId)
//           .single();

//         if (ride) {
//           const actualDriverId =
//             await resolveDriverTableId(data.driverId || getDriverIdForSocket(socket.id) || ride.driver_id);
//           const fare = ride.estimated_price || 0;
//           const penaltyAmount = fare * 0.5;

//           if (data.applyPenalty && penaltyAmount > 0 && actualDriverId) {
//             try {
//               // Deduct penalty from driver's total_earnings
//               const { data: driverData } = await supabase
//                 .from("drivers")
//                 .select("total_earnings")
//                 .eq("id", actualDriverId)
//                 .single();
//               const currentEarnings = Number(driverData?.total_earnings || 0);
//               const newEarnings = Number((currentEarnings - penaltyAmount).toFixed(2));
//               const { error: earningsUpdateErr } = await supabase
//                 .from("drivers")
//                 .update({ total_earnings: newEarnings })
//                 .eq("id", actualDriverId);

//               // Create deduction record
//               const deductionId = `ride_${data.rideId}_cancel_at_pickup`;
//               const deductionReason = `50% cancellation penalty for ride ${data.rideId}`;
//               const { error: deductionErr } = await supabase
//                 .from("driver_deductions")
//                 .insert({
//                   id: deductionId,
//                   driver_id: actualDriverId,
//                   amount: penaltyAmount,
//                   type: "cancel_at_pickup_penalty",
//                   reason: deductionReason,
//                   created_at: new Date().toISOString(),
//                 });
//             } catch (penaltyErr) {
//               console.error(`❌ Failed to apply cancellation penalty to driver ${actualDriverId}:`, penaltyErr);
//             }
//           }

//           const rideInfo = activeRides.get(data.rideId);
//           const declinedBy = rideInfo?.declinedBy || new Set<string>();
//           if (actualDriverId) {
//             declinedBy.add(actualDriverId);
//           }

//           // Remove the current driver assignment and reset the ride to pending
//           await supabase
//             .from("rides")
//             .update({ status: "pending", driver_id: null, accepted_at: null, arrived_at: null })
//             .eq("id", data.rideId);

//           if (ride.rider_id) {
//             const riderDriverCancelledPayload = {
//               rideId: data.rideId,
//               status: "pending",
//               driverCancelled: true,
//               driverId: null,
//             };
//             io.to(`rider:${ride.rider_id}`).emit("ride:update", riderDriverCancelledPayload);
//             if (rideInfo?.riderSocketId) {
//               io.to(rideInfo.riderSocketId).emit("ride:update", riderDriverCancelledPayload);
//             }
//           }

//           if (actualDriverId) {
//             io.to(`driver:${actualDriverId}`).emit("ride:expired", { rideId: data.rideId });
//           }

//           const existingDispatch = dispatchQueues.get(data.rideId);
//           if (existingDispatch) {
//             if (existingDispatch.timer) clearTimeout(existingDispatch.timer);
//             existingDispatch.cancelled = false;
//             existingDispatch.declinedBy = declinedBy;
//             console.log(`🔃 Reassigning ride ${data.rideId} after cancellation by driver ${actualDriverId || data.driverId}`);
//             return dispatchToNextDriver(data.rideId);
//           }

//           const riderSocketId = rideInfo?.riderSocketId || connectedRiders.get(ride.rider_id) || "";
//           const rideData = rideInfo?.rideData || buildRideDataFromDbRide(ride);
//           activeRides.set(data.rideId, {
//             riderSocketId,
//             riderId: ride.rider_id,
//             declinedBy,
//             rideData,
//           });

//           const newDispatchState = await buildDispatchState(rideData, riderSocketId, declinedBy);
//           if (newDispatchState) {
//             dispatchQueues.set(data.rideId, newDispatchState);
//             console.log(`🔃 Reassigning ride ${data.rideId} to next available driver after cancellation`);
//             return dispatchToNextDriver(data.rideId);
//           }

//           console.log(`🚫 No remaining available drivers to reassign ride ${data.rideId}`);
//           const { data: rideForNotify } = await supabase
//             .from("rides")
//             .select("rider_id")
//             .eq("id", data.rideId)
//             .single();
//           if (rideForNotify?.rider_id) {
//             io.to(`rider:${rideForNotify.rider_id}`).emit("ride:update", {
//               rideId: data.rideId,
//               status: "cancelled_no_drivers",
//             });
//           }

//           await supabase
//             .from("rides")
//             .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
//             .eq("id", data.rideId);
//           io.emit("ride:update", { rideId: data.rideId, status: "cancelled_no_drivers" });
//         }
//       } catch (err) {
//         console.error("Error processing driver cancel at pickup:", err);
//       }
//     });

//     socket.on("ride:accept", async (data: { rideId: string; driverId: string }) => {
//       console.log('✅ Ride accepted:', data.rideId, 'by driver:', data.driverId);

//       const actualDriverId = await resolveDriverTableId(data.driverId);
//       if (!actualDriverId) {
//         console.warn(`⚠️ ride:accept ignored — driver_id ${data.driverId} not found in drivers table`);
//         return;
//       }

//       if (actualDriverId !== data.driverId) {
//         console.log(`🔄 ride:accept — Resolved auth user_id ${data.driverId} → driver table id ${actualDriverId}`);
//       }

//       // Cancel the dispatch queue — ride is taken
//       const dispState = dispatchQueues.get(data.rideId);
//       if (dispState) {
//         if (dispState.timer) clearTimeout(dispState.timer);
//         dispState.cancelled = true;
//         dispatchQueues.delete(data.rideId);
//         console.log(`🛑 Dispatch queue cancelled for ride ${data.rideId} — accepted by ${data.driverId}`);
//       }

//       // Store the driver socket for this ride in the active rides map
//       const rideInfo = activeRides.get(data.rideId);
//       if (rideInfo) {
//         rideInfo.driverSocketId = socket.id;
//       }

//       try {
//         const acceptedAt = new Date().toISOString();
//         const updatePayload: Record<string, any> = {
//           driver_id: actualDriverId,
//           status: "accepted",
//           accepted_at: acceptedAt,
//         };

//         const { error: acceptUpdateError } = await supabase
//           .from("rides")
//           .update(updatePayload)
//           .eq("id", data.rideId);

//         if (acceptUpdateError) {
//           console.error("❌ Failed to update ride on accept:", acceptUpdateError);
//         } else {
//           console.log(`✅ Ride ${data.rideId} driver_id=${actualDriverId} saved to Supabase on accept`);
//         }

//         const { data: ride } = await supabase
//           .from("rides")
//           .select("*")
//           .eq("id", data.rideId)
//           .single();

//         if (ride) {
//           const driverLocation = await getLatestDriverLocation(data.rideId, actualDriverId, socket.id);
//           const acceptedPayload = {
//             rideId: data.rideId,
//             driverId: actualDriverId,
//             acceptedAt,
//             driverLocation,
//           };

//           io.to(`rider:${ride.rider_id}`).emit("ride:accepted", acceptedPayload);
//           if (rideInfo?.riderSocketId) {
//             io.to(rideInfo.riderSocketId).emit("ride:accepted", acceptedPayload);
//           }
//           if (driverLocation) {
//             io.to(`rider:${ride.rider_id}`).emit("driver:location", driverLocation);
//             if (rideInfo?.riderSocketId) {
//               io.to(rideInfo.riderSocketId).emit("driver:location", driverLocation);
//             }
//           } else {
//             console.warn(`⚠️ ride:accept — no current or last received location for driver ${actualDriverId}`);
//           }
//         }
//       } catch (error) {
//         console.error("Error accepting ride:", error);
//       }
//     });

//     socket.on("ride:status", async (update: RideUpdate) => {
//       console.log('📊 Ride status update:', update.rideId, '→', update.status, 'driverInfo:', (update as any).driverInfo ? 'present' : 'absent');

//       try {
//         // ─── Resolve driver ID from multiple sources ─────────────────────────────────────
//         // Priority 1: driverId sent directly in the payload from the client
//         let resolvedDriverId: string | null = (update as any).driverId || null;

//         // Priority 2: Look up the driver from the socket map
//         if (!resolvedDriverId) {
//           for (const [dId, sId] of connectedDrivers.entries()) {
//             if (sId === socket.id) {
//               resolvedDriverId = dId;
//               break;
//             }
//           }
//           if (resolvedDriverId) {
//             console.log(`🔍 Resolved driver_id from socket map: ${resolvedDriverId}`);
//           }
//         } else {
//           console.log(`🔍 Using driver_id from payload: ${resolvedDriverId}`);
//         }

//         // Priority 3: Look up the driver from the active rides in-memory map (set during dispatch/accept)
//         if (!resolvedDriverId) {
//           const rideInfo = activeRides.get(update.rideId);
//           if (rideInfo?.driverSocketId) {
//             for (const [dId, sId] of connectedDrivers.entries()) {
//               if (sId === rideInfo.driverSocketId) {
//                 resolvedDriverId = dId;
//                 console.log(`🔍 Resolved driver_id from activeRides driver socket: ${resolvedDriverId}`);
//                 break;
//               }
//             }
//           }
//         }

//         // Priority 4: Look up in DB ride record (already stored driver_id)
//         if (!resolvedDriverId) {
//           try {
//             const { data: existingRide } = await supabase
//               .from("rides")
//               .select("driver_id")
//               .eq("id", update.rideId)
//               .single();
//             if (existingRide?.driver_id) {
//               resolvedDriverId = existingRide.driver_id;
//               console.log(`🔍 Resolved driver_id from DB ride record: ${resolvedDriverId}`);
//             }
//           } catch (_) {
//             console.warn(`⚠️ Could not look up driver_id from DB for ride ${update.rideId}`);
//           }
//         }

//         // Priority 5: Ensure the resolved ID is a real drivers.id, resolving auth user_id if needed.
//         if (resolvedDriverId) {
//           const driverTableId = await resolveDriverTableId(resolvedDriverId);
//           if (driverTableId) {
//             if (driverTableId !== resolvedDriverId) {
//               console.log(`🔄 Resolved auth user_id ${resolvedDriverId} → driver table id ${driverTableId}`);
//             }
//             resolvedDriverId = driverTableId;
//           } else {
//             console.warn(`⚠️ driver_id ${resolvedDriverId} not found in drivers table (neither as id nor user_id)`);
//             resolvedDriverId = null;
//           }
//         }

//         console.log(`🔍 Final resolved driver_id for ride ${update.rideId}: ${resolvedDriverId || 'NOT FOUND'}`);

//         if (update.status === "accepted" && !resolvedDriverId) {
//           console.warn(`⚠️ Ignoring accepted status for ride ${update.rideId} because no valid drivers.id was resolved`);
//           return;
//         }

//         try {
//           const updateData: any = { status: update.status };

//           if (update.status === "accepted") {
//             // Save driver_id and driver details when a driver accepts
//             if (resolvedDriverId) {
//               updateData.driver_id = resolvedDriverId;
//               console.log(`✅ Saving driver_id=${resolvedDriverId} to ride ${update.rideId} on accept`);
//             } else {
//               console.warn(`⚠️ Could not resolve driver_id from socket ${socket.id} on accept`);
//             }
//             updateData.accepted_at = new Date().toISOString();
//             (update as any).acceptedAt = updateData.accepted_at;

//             if (resolvedDriverId) {
//               const driverLocation = await getLatestDriverLocation(update.rideId, resolvedDriverId, socket.id);
//               if (driverLocation) {
//                 (update as any).driverLocation = driverLocation;
//               } else {
//                 console.warn(`⚠️ Could not attach current or last received location on accept for driver ${resolvedDriverId}`);
//               }
//             }
//           }
//           else if (update.status === "arrived") {
//             // Also persist driver_id on arrived status to ensure it is saved
//             if (resolvedDriverId) updateData.driver_id = resolvedDriverId;
//             updateData.arrived_at = new Date().toISOString();
//           }
//           else if (update.status === "in_progress") {
//             updateData.started_at = new Date().toISOString();
//             // Keep driver_id set if not already saved
//             if (resolvedDriverId) updateData.driver_id = resolvedDriverId;

//             // (arrived timer clear logic removed as it's now client-side)
//           }
//           else if (update.status === "completed") {
//             updateData.completed_at = new Date().toISOString();
//             updateData.payment_status = "completed";
//             // Ensure driver_id is ALWAYS set on completion
//             if (resolvedDriverId) updateData.driver_id = resolvedDriverId;

//             // Store waiting charge and final price if sent by the driver client
//             const waitingCharge = (update as any).waitingCharge || 0;
//             const clientTotalFare = (update as any).totalFare || 0;
//             if (clientTotalFare > 0) {
//               updateData.final_price = clientTotalFare;
//               console.log(`💰 Completion includes waiting charge: £${waitingCharge}, totalFare: £${clientTotalFare}`);
//             }
//             // (arrived timer clear logic removed as it's now client-side)

//             // ─── Charge saved card if payment_method is 'card' ──────────────
//             try {
//               const { data: completedRide } = await supabase
//                 .from("rides")
//                 .select("rider_id, estimated_price, payment_method")
//                 .eq("id", update.rideId)
//                 .single();

//               if (completedRide?.payment_method === "card" && completedRide.estimated_price > 0 && completedRide.rider_id) {
//                 const { data: riderUser } = await supabase
//                   .from("users")
//                   .select("stripe_customer_id")
//                   .eq("id", completedRide.rider_id)
//                   .single();

//                 if (riderUser?.stripe_customer_id) {
//                   console.log(`💳 Charging saved card for completed ride ${update.rideId}: £${completedRide.estimated_price}`);

//                   const chargeResult = await chargeSavedCard(
//                     riderUser.stripe_customer_id,
//                     completedRide.estimated_price,
//                     update.rideId,
//                     "gbp",
//                     "ride_fare"
//                   );

//                   if (chargeResult.success) {
//                     updateData.payment_status = "card_charged";
//                     updateData.payment_intent_id = chargeResult.paymentIntentId;
//                     console.log(`✅ Card charged £${completedRide.estimated_price} for ride ${update.rideId} (PI: ${chargeResult.paymentIntentId})`);

//                     // Record payment
//                     await supabase.from("payments").insert({
//                       ride_id: update.rideId,
//                       user_id: completedRide.rider_id,
//                       amount: completedRide.estimated_price,
//                       currency: "gbp",
//                       status: "succeeded",
//                       payment_method: "card",
//                       stripe_payment_intent_id: chargeResult.paymentIntentId || null,
//                       completed_at: new Date().toISOString(),
//                     });
//                   } else {
//                     console.warn(`⚠️ Card charge failed for ride ${update.rideId}: ${chargeResult.error}`);
//                     updateData.payment_status = "card_charge_failed";
//                   }
//                 } else {
//                   console.warn(`⚠️ Rider ${completedRide.rider_id} has no Stripe customer ID — cannot charge card`);
//                 }
//               }
//             } catch (cardChargeErr) {
//               console.error(`❌ Card charge error on ride completion:`, cardChargeErr);
//             }
//           }
//           else if (update.status === "cancelled") {
//             updateData.cancelled_at = new Date().toISOString();

//             // ── Server-side cancellation fee processing ──────────────────────
//             // Rider gets one free minute after driver assignment. After that,
//             // or once the driver has arrived, a 100% cancellation fee is owed.
//             try {
//               const { data: cancelledRide, error: cancelledRideErr } = await supabase
//                 .from("rides")
//                 .select("rider_id, driver_id, status, accepted_at, estimated_price, final_price")
//                 .eq("id", update.rideId)
//                 .single();

//               const acceptedAt = cancelledRide?.accepted_at ? new Date(cancelledRide.accepted_at).getTime() : 0;
//               const acceptedElapsedMs = acceptedAt ? Date.now() - acceptedAt : 0;
//               const isAfterFreeMinute = acceptedAt > 0 && acceptedElapsedMs >= 60_000;
//               const isDriverAlreadyAtPickup = cancelledRide && ["arrived", "at_pickup", "in_progress"].includes(cancelledRide.status);
//               const shouldChargeCancellationFee = !!cancelledRide && (isDriverAlreadyAtPickup || isAfterFreeMinute);

//               if (cancelledRide && shouldChargeCancellationFee) {
//                 const fullFareAmount = Number(cancelledRide.final_price || cancelledRide.estimated_price || 0);
//                 const cancellationFeeAmount = Number((fullFareAmount * 1).toFixed(2));
//                 const riderId = cancelledRide.rider_id;
//                 const rideInfo = activeRides.get(update.rideId);
//                 const walletDeductionAlreadyTaken = Math.max(0, Number(rideInfo?.rideData?.walletDeduction || 0));
//                 const walletAdjustmentAmount = Number((cancellationFeeAmount - walletDeductionAlreadyTaken).toFixed(2));
//                 const walletDebitAmount = Math.max(0, walletAdjustmentAmount);

//                 if (riderId && cancellationFeeAmount > 0) {

//                   (update as any).cancellationFee = cancellationFeeAmount;
//                   (update as any).chargedAmount = walletDebitAmount;
//                   (update as any).walletAdjustment = walletAdjustmentAmount;
//                   (update as any).cancellationPolicy = isDriverAlreadyAtPickup ? "driver_arrived" : "after_free_minute";

//                   // Always apply cancellation fee through wallet, for card and cash rides.
//                   // Wallet balance is allowed to go negative. If wallet was already
//                   // deducted for the ride, only apply the net adjustment needed.
//                   try {
//                     const { data: userRow, error: walletFetchErr } = await supabase
//                       .from("users")
//                       .select("wallet_balance")
//                       .eq("id", riderId)
//                       .single();

//                     const currentBalance = Number(userRow?.wallet_balance || 0);
//                     const newBalance = Number((currentBalance - walletAdjustmentAmount).toFixed(2));

//                     const { error: walletUpdateErr } = await supabase
//                       .from("users")
//                       .update({ wallet_balance: newBalance })
//                       .eq("id", riderId);

//                     const { data: verifyUser, error: verifyErr } = await supabase
//                       .from("users")
//                       .select("wallet_balance")
//                       .eq("id", riderId)
//                       .single();

//                     updateData.payment_status = "cancellation_fee_wallet_charged";
//                     (update as any).chargedVia = "wallet";
//                     (update as any).walletBalance = newBalance;
//                   } catch (walletErr) {
//                     console.error("❌ Failed to adjust wallet for cancellation fee:", walletErr);
//                   }

//                   if ((update as any).chargedVia === "wallet" && walletAdjustmentAmount !== 0) {
//                     try {
//                       const { error: walletTxnErr } = await supabase
//                         .from("wallet_transactions")
//                         .insert({
//                           user_id: riderId,
//                           ride_id: update.rideId,
//                           amount: Math.abs(walletAdjustmentAmount),
//                           type: walletAdjustmentAmount > 0 ? "debit" : "credit",
//                           description: walletAdjustmentAmount > 0
//                             ? `100% Cancellation fee (£${cancellationFeeAmount.toFixed(2)})`
//                             : `Refund unused wallet deduction after 100% cancellation fee (£${cancellationFeeAmount.toFixed(2)})`,
//                         });
//                     } catch (txnErr) {
//                       console.warn("⚠️ Failed to insert cancellation fee wallet transaction:", txnErr);
//                     }
//                   }

//                   // Credit driver earnings with the 100% cancellation fee when rider cancels.
//                   if (cancelledRide.driver_id) {
//                     try {
//                       const { data: driverData } = await supabase
//                         .from("drivers")
//                         .select("total_earnings")
//                         .eq("id", cancelledRide.driver_id)
//                         .single();

//                       const currentEarnings = Number(driverData?.total_earnings || 0);
//                       const newEarnings = Number((currentEarnings + cancellationFeeAmount).toFixed(2));

//                       const { error: driverEarningsErr } = await supabase
//                         .from("drivers")
//                         .update({ total_earnings: newEarnings })
//                         .eq("id", cancelledRide.driver_id);

//                     } catch (earningsErr) {
//                       console.error("❌ Failed to update driver earnings on cancellation:", earningsErr);
//                     }
//                   }
//                 }
//               } else {
//                 (update as any).cancellationFee = 0;
//                 (update as any).chargedAmount = 0;
//                 (update as any).chargedVia = "none";
//               }
//             } catch (cancelFeeErr) {
//               console.error("❌ Error processing cancellation fee:", cancelFeeErr);
//             }
//           }

//           console.log(`📝 Updating ride ${update.rideId} in Supabase with:`, JSON.stringify(updateData));

//           const { data: updatedRide, error: statusUpdateError } = await supabase
//             .from("rides")
//             .update(updateData)
//             .eq("id", update.rideId)
//             .select()
//             .maybeSingle();

//           if (statusUpdateError) {
//             console.error("❌ Failed to update ride status:", statusUpdateError);
//           } else if (!updatedRide) {
//             console.error(`❌ Ride ${update.rideId} not found in database for update`);
//           } else {
//             console.log(`✅ Ride ${update.rideId} status updated to: ${update.status}, driver_id: ${updatedRide?.driver_id || 'null'}`);
//           }
//         } catch (dbErr) {
//           console.error('⚠️ DB update error for ride:', dbErr);
//         }

//         // Cancel dispatch queue on accept/cancel
//         if (update.status === "accepted" || update.status === "cancelled") {
//           const dispState = dispatchQueues.get(update.rideId);
//           if (dispState) {
//             if (dispState.timer) clearTimeout(dispState.timer);
//             dispState.cancelled = true;
//             dispatchQueues.delete(update.rideId);
//             console.log(`🛑 Dispatch queue cancelled for ride ${update.rideId} (status: ${update.status})`);
//           }
//         }

//         const rideInfo = activeRides.get(update.rideId);

//         // When driver accepts, store their socket so we can notify them of cancellations
//         if (update.status === "accepted" && rideInfo) {
//           rideInfo.driverSocketId = socket.id;
//           console.log(`🚗 Driver socket ${socket.id} linked to ride ${update.rideId}`);
//         }

//         // ─── Mark driver arrival time for customer countdown ────────────────
//         if (update.status === "arrived") {
//           const driverArrivedAt = new Date().toISOString();
//           console.log(`⏱️ Driver arrived for ride ${update.rideId}. Notifying rider to start 10-minute free waiting timer.`);

//           // Enrich the update with driverArrivedAt so the rider app can start the countdown
//           (update as any).driverArrivedAt = driverArrivedAt;
//         }

//         if (rideInfo) {
//           // Always notify the rider — include driverInfo if present (populated on accept)
//           // Also include totalFare and waitingCharge if this is a completion event
//           const riderPayload = { ...update };
//           if (update.status === "completed") {
//             (riderPayload as any).totalFare = (update as any).totalFare || 0;
//             (riderPayload as any).waitingCharge = (update as any).waitingCharge || 0;
//           }
//           io.to(rideInfo.riderSocketId).emit("ride:update", riderPayload);

//           // ALSO broadcast to the rider room in case they disconnected and reconnected with a new socket
//           if (rideInfo.riderId) {
//             io.to(`rider:${rideInfo.riderId}`).emit("ride:update", riderPayload);
//           }

//           if (rideInfo.driverSocketId && rideInfo.driverSocketId !== socket.id) {
//             // Driver accepted - send directly to their socket
//             io.to(rideInfo.driverSocketId).emit("ride:update", update);
//             console.log(`📢 Forwarding ride:update (${update.status}) to driver socket ${rideInfo.driverSocketId}`);
//           } else if (update.status === "cancelled") {
//             // Driver hasn't accepted yet (or pre-accept cancel) — broadcast to ALL drivers
//             // so any driver seeing the incoming request card clears it immediately
//             socket.broadcast.emit("ride:update", update);
//             console.log(`📢 Broadcasting cancellation of ride ${update.rideId} to all drivers`);
//           }
//         } else {
//           // Fallback: DB lookup for socket routing
//           try {
//             const { data: rideRow } = await supabase.from("rides").select("*").eq("id", update.rideId).single();
//             if (rideRow) {
//               io.to(`rider:${rideRow.rider_id}`).emit("ride:update", update);
//               if (rideRow.driver_id) {
//                 io.to(`driver:${rideRow.driver_id}`).emit("ride:update", update);
//               }
//             }
//           } catch (_) {
//             // Last resort: broadcast to all (only hits cancelled/completed which are low frequency)
//             io.emit("ride:update", update);
//           }
//         }

//         // ─── Ride completion processing (payment, earnings, total_rides) ──────
//         // This runs for ALL completed rides regardless of whether they are in the in-memory map
//         if (update.status === "completed") {
//           try {
//             const { data: rideData, error: rideLookupErr } = await supabase
//               .from("rides")
//               .select("*")
//               .eq("id", update.rideId)
//               .single();

//             if (rideLookupErr) {
//               console.error("❌ Error looking up completed ride:", rideLookupErr);
//             }

//             if (rideData) {
//               const fareAmount = rideData.final_price || rideData.estimated_price || 0;

//               // Set final_price if not already set
//               if (!rideData.final_price && rideData.estimated_price) {
//                 await supabase
//                   .from("rides")
//                   .update({ final_price: rideData.estimated_price })
//                   .eq("id", update.rideId);
//                 console.log(`✅ Set final_price=${rideData.estimated_price} for ride ${update.rideId}`);
//               }

//               // Update driver total_earnings AND total_rides
//               if (rideData.driver_id && fareAmount > 0) {
//                 const { data: driverData } = await supabase
//                   .from("drivers")
//                   .select("total_earnings")
//                   .eq("id", rideData.driver_id)
//                   .single();

//                 const currentEarnings = driverData?.total_earnings || 0;
//                 const newEarnings = Number((currentEarnings + fareAmount).toFixed(2));

//                 const { error: earningsErr } = await supabase
//                   .from("drivers")
//                   .update({
//                     total_earnings: newEarnings,
//                   })
//                   .eq("id", rideData.driver_id);
//                 if (earningsErr) {
//                   console.error("❌ Failed to update driver earnings:", earningsErr);
//                 } else {
//                   console.log(`✅ Driver ${rideData.driver_id} earnings updated: +£${fareAmount} (total: £${newEarnings})`);
//                 }
//               } else {
//                 console.warn(`⚠️ Ride ${update.rideId} completed but driver_id=${rideData.driver_id}, fareAmount=${fareAmount} — skipping earnings update`);
//               }
//               // Check if payment method is cash to insert payment record natively (Cards are charged and inserted earlier)
//               if (rideData.payment_method !== "card") {
//                 const { error: paymentError } = await supabase.from("payments").insert({
//                   ride_id: update.rideId,
//                   user_id: rideData.rider_id,
//                   amount: fareAmount,
//                   currency: "gbp",
//                   status: "succeeded",
//                   payment_method: "cash",
//                   completed_at: new Date().toISOString()
//                 });
//                 if (paymentError) {
//                   console.error("❌ Failed to insert completed ride payment:", paymentError);
//                 } else {
//                   console.log(`✅ Inserted payment £${fareAmount} for completed ride ${update.rideId}`);
//                 }

//                 // ✅ Also update the ride to mark it as fully paid/completed 
//                 await supabase.from("rides").update({ payment_status: "paid" }).eq("id", update.rideId);
//               }

//               // ✅ Insert wallet_transaction so the rider can see the fare in their transaction history
//               if (rideData.rider_id && fareAmount > 0) {
//                 try {
//                   const payMethod = rideData.payment_method === "card" ? "card" : "cash";
//                   const { error: walletTxnErr } = await supabase
//                     .from("wallet_transactions")
//                     .insert({
//                       user_id: rideData.rider_id,
//                       ride_id: update.rideId,
//                       amount: fareAmount,
//                       type: "debit",
//                       description: `Ride fare — paid by ${payMethod}`,
//                     });
//                   if (walletTxnErr) {
//                     console.warn("⚠️ Failed to insert ride fare wallet_transaction:", walletTxnErr.message);
//                   } else {
//                     console.log(`✅ Wallet transaction recorded: £${fareAmount} debit for rider ${rideData.rider_id}`);
//                   }
//                 } catch (txnErr) {
//                   console.warn("⚠️ Exception inserting wallet_transaction for ride fare:", txnErr);
//                 }
//               }
//             }
//           } catch (error) {
//             console.error("❌ Error in ride completion side-effects:", error);
//           }
//         }

//         if (update.status === "completed" || update.status === "cancelled") {
//           activeRides.delete(update.rideId);

//           // Set driver as available again so they can receive new ride requests
//           if (resolvedDriverId) {
//             try {
//               await supabase
//                 .from("drivers")
//                 .update({ is_available: true })
//                 .eq("id", resolvedDriverId);
//               console.log(`✅ Driver ${resolvedDriverId} is now available again after ride ${update.status}`);
//             } catch (availErr) {
//               console.error(`❌ Failed to reset driver ${resolvedDriverId} availability:`, availErr);
//             }
//           }
//         }
//       } catch (error) {
//         console.error("Error updating ride status:", error);
//       }
//     });

//     // ─── Driver-Initiated No Show ──────────────────────────────────────
//     socket.on("ride:no_show", async (data: { rideId: string, driverId: string }) => {
//       console.log(`⏱️🚫 Driver ${data.driverId} initiated No Show for ride ${data.rideId}`);

//       try {
//         // 1. Look up the ride to get fare and rider info
//         const { data: rideRow } = await supabase
//           .from("rides")
//           .select("*")
//           .eq("id", data.rideId)
//           .single();

//         if (!rideRow) {
//           console.error(`❌ No-show handler: ride ${data.rideId} not found in DB`);
//           return;
//         }

//         // Only proceed if ride is still in "arrived" or "at_pickup" status
//         if (rideRow.status !== "arrived" && rideRow.status !== "at_pickup") {
//           console.log(`ℹ️ No-show fired but ride ${data.rideId} is now ${rideRow.status} — skipping`);
//           return;
//         }

//         const fareAmount = rideRow.estimated_price || 0;
//         const ridePaymentMethod = rideRow.payment_method || "cash";

//         console.log(`💳 No-show: ride ${data.rideId} payment_method=${ridePaymentMethod}, fare=£${fareAmount}`);

//         // ─── 2. Charge the rider's saved card via Stripe ────────────────────
//         let stripeChargeSuccess = false;
//         let stripePaymentIntentId: string | undefined;
//         let stripeChargeError: string | undefined;

//         if (rideRow.rider_id && fareAmount > 0) {
//           try {
//             const { data: riderUser } = await supabase
//               .from("users")
//               .select("stripe_customer_id, wallet_balance")
//               .eq("id", rideRow.rider_id)
//               .single();

//             const stripeCustomerId = riderUser?.stripe_customer_id;

//             if (stripeCustomerId) {
//               console.log(`💳 Attempting to charge saved card for rider ${rideRow.rider_id} (Stripe customer: ${stripeCustomerId})`);
//               const chargeResult = await chargeSavedCard(
//                 stripeCustomerId,
//                 fareAmount,
//                 data.rideId,
//                 "gbp",
//                 "no_show_fee"
//               );

//               stripeChargeSuccess = chargeResult.success;
//               stripePaymentIntentId = chargeResult.paymentIntentId;
//               stripeChargeError = chargeResult.error;

//               if (stripeChargeSuccess) {
//                 console.log(`✅ No-show fee £${fareAmount} charged to saved card for ride ${data.rideId}`);
//               } else {
//                 console.warn(`⚠️ Stripe card charge failed: ${stripeChargeError} — will fall back to wallet`);
//               }
//             } else {
//               console.warn(`⚠️ Rider ${rideRow.rider_id} has no Stripe customer ID — will fall back to wallet`);
//               stripeChargeError = "No Stripe customer ID on file";
//             }
//           } catch (stripeErr) {
//             console.error("❌ Stripe charge attempt failed:", stripeErr);
//             stripeChargeError = String(stripeErr);
//           }
//         }

//         // ─── 3. Cancel the ride in DB ────────────────────────────────────────
//         const cancelPayload: Record<string, any> = {
//           status: "cancelled",
//           cancelled_at: new Date().toISOString(),
//           payment_status: stripeChargeSuccess ? "no_show_card_charged" : "no_show_wallet_charged",
//         };
//         if (stripePaymentIntentId) {
//           cancelPayload.payment_intent_id = stripePaymentIntentId;
//         }

//         await supabase
//           .from("rides")
//           .update(cancelPayload)
//           .eq("id", data.rideId);

//         console.log(`✅ Ride ${data.rideId} cancelled in DB due to no-show (charged via: ${stripeChargeSuccess ? 'card' : 'wallet'})`);

//         // ─── 4. If card charge failed, fall back to wallet deduction ─────────
//         if (!stripeChargeSuccess && rideRow.rider_id && fareAmount > 0) {
//           try {
//             const { data: userRow } = await supabase
//               .from("users")
//               .select("wallet_balance")
//               .eq("id", rideRow.rider_id)
//               .single();

//             const currentBalance = userRow?.wallet_balance || 0;
//             const newBalance = Math.max(0, currentBalance - fareAmount);

//             await supabase
//               .from("users")
//               .update({ wallet_balance: newBalance })
//               .eq("id", rideRow.rider_id);

//             console.log(`💰 No-show penalty (wallet fallback): Debited £${fareAmount} from rider ${rideRow.rider_id} wallet (${currentBalance} → ${newBalance})`);

//             await supabase
//               .from("wallet_transactions")
//               .insert({
//                 user_id: rideRow.rider_id,
//                 ride_id: data.rideId,
//                 amount: fareAmount,
//                 type: "debit",
//                 description: `No-show cancellation fee — driver waited 10 minutes (card charge failed: ${stripeChargeError || 'unknown'})`,
//               });
//           } catch (walletErr) {
//             console.error("❌ Failed to debit no-show penalty from wallet:", walletErr);
//           }
//         }

//         // ─── 5. Record payment in payments table ─────────────────────────────
//         if (rideRow.rider_id && fareAmount > 0) {
//           try {
//             await supabase.from("payments").insert({
//               ride_id: data.rideId,
//               user_id: rideRow.rider_id,
//               amount: fareAmount,
//               currency: "gbp",
//               status: "succeeded",
//               payment_method: stripeChargeSuccess ? "card" : "wallet",
//               stripe_payment_intent_id: stripePaymentIntentId || null,
//               completed_at: new Date().toISOString(),
//             });
//           } catch (paymentErr) {
//             console.error("❌ Failed to insert no-show payment record:", paymentErr);
//           }

//           if (stripeChargeSuccess) {
//             try {
//               await supabase
//                 .from("wallet_transactions")
//                 .insert({
//                   user_id: rideRow.rider_id,
//                   ride_id: data.rideId,
//                   amount: fareAmount,
//                   type: "debit",
//                   description: `No-show cancellation fee — charged to saved card`,
//                 });
//             } catch (_) { }
//           }
//         }

//         // ─── 5b. Credit driver's earnings with the no-show fee ────────────────
//         if (rideRow.driver_id && fareAmount > 0) {
//           try {
//             const { data: driverData } = await supabase
//               .from("drivers")
//               .select("total_earnings")
//               .eq("id", rideRow.driver_id)
//               .single();

//             const currentEarnings = driverData?.total_earnings || 0;
//             const newEarnings = Number((currentEarnings + fareAmount).toFixed(2));

//             await supabase
//               .from("drivers")
//               .update({ total_earnings: newEarnings })
//               .eq("id", rideRow.driver_id);

//             console.log(`✅ Driver ${rideRow.driver_id} earnings updated for no-show: +£${fareAmount} (total: £${newEarnings})`);
//           } catch (earningsErr) {
//             console.error("❌ Error updating driver earnings on no-show:", earningsErr);
//           }
//         }

//         // ─── 6. Notify the rider ─────────────────────────────────────────────
//         io.to(`rider:${rideRow.rider_id}`).emit("ride:update", {
//           rideId: data.rideId,
//           status: "cancelled_no_show",
//           noShowFare: fareAmount,
//           chargedVia: stripeChargeSuccess ? "card" : "wallet",
//         });

//         // ─── 7. Notify the driver ────────────────────────────────────────────
//         const rInfo = activeRides.get(data.rideId);
//         if (rInfo?.driverSocketId) {
//           io.to(rInfo.driverSocketId).emit("ride:update", {
//             rideId: data.rideId,
//             status: "cancelled_no_show",
//             noShowFare: fareAmount,
//             earningsAdded: fareAmount,
//           });
//         }
//         if (rideRow.driver_id) {
//           io.to(`driver:${rideRow.driver_id}`).emit("ride:update", {
//             rideId: data.rideId,
//             status: "cancelled_no_show",
//             noShowFare: fareAmount,
//             earningsAdded: fareAmount,
//           });
//         }

//         // ─── 8. Set driver available again ────────────────────────────────────────────
//         try {
//           await supabase
//             .from("drivers")
//             .update({ is_available: true })
//             .eq("id", data.driverId);
//         } catch (_) { }

//         // ─── 9. Clean up ─────────────────────────────────────────────────────
//         activeRides.delete(data.rideId);
//         console.log(`✅ No-show cancellation complete for ride ${data.rideId}`);

//       } catch (error) {
//         console.error("❌ Error in no-show auto-cancellation handler:", error);
//       }
//     });

//     // ─── Driver Agrees to Wait ──────────────────────────────────────
//     socket.on("ride:agree_to_wait", async (data: { rideId: string, driverId: string, paidWaitingStartedAt: string, waitingChargePerMin: number }) => {
//       console.log(`⏱️💰 Driver ${data.driverId} agreed to wait for ride ${data.rideId} at £${data.waitingChargePerMin}/min`);

//       // Look up the ride to notify the rider
//       try {
//         const { data: rideRow } = await supabase.from("rides").select("rider_id").eq("id", data.rideId).single();
//         if (rideRow?.rider_id) {
//           io.to(`rider:${rideRow.rider_id}`).emit("ride:paid_waiting_started", {
//             rideId: data.rideId,
//             paidWaitingStartedAt: data.paidWaitingStartedAt,
//             waitingChargePerMin: data.waitingChargePerMin
//           });
//         }
//       } catch (e) {
//         console.warn("Could not notify rider of paid waiting:", e);
//       }
//     });

//     // Handle driver confirming payment was collected
//     socket.on("ride:payment_collected", async (data: { rideId: string; amount?: number; extraAmount?: number }) => {
//       console.log('💰 ═══════════ PAYMENT COLLECTED EVENT ═══════════');
//       console.log('💰 rideId:', data.rideId, 'amount:', data.amount, 'extraAmount:', data.extraAmount);

//       // Resolve driver from socket map
//       let payingDriverId: string | null = null;
//       for (const [dId, sId] of connectedDrivers.entries()) {
//         if (sId === socket.id) { payingDriverId = dId; break; }
//       }

//       // If resolved from socket, check if it's a user_id and resolve to drivers table id
//       if (payingDriverId) {
//         try {
//           const { data: directDriver } = await supabase
//             .from("drivers")
//             .select("id")
//             .eq("id", payingDriverId)
//             .single();

//           if (!directDriver) {
//             const { data: driverByUserId } = await supabase
//               .from("drivers")
//               .select("id")
//               .eq("user_id", payingDriverId)
//               .single();

//             if (driverByUserId) {
//               console.log(`🔄 payment_collected — Resolved auth user_id ${payingDriverId} → driver table id ${driverByUserId.id}`);
//               payingDriverId = driverByUserId.id;
//             }
//           }
//         } catch (_) {
//           // Non-critical
//         }
//       }

//       // Fallback: get driver_id from the ride record itself
//       if (!payingDriverId) {
//         try {
//           const { data: existingRide } = await supabase
//             .from("rides")
//             .select("driver_id")
//             .eq("id", data.rideId)
//             .single();
//           if (existingRide?.driver_id) {
//             payingDriverId = existingRide.driver_id;
//             console.log(`🔍 payment_collected — Resolved driver_id from ride record: ${payingDriverId}`);
//           }
//         } catch (_) {
//           // Non-critical
//         }
//       }

//       console.log(`🔍 payment_collected — Final driver_id: ${payingDriverId || 'NOT FOUND'}`);

//       try {
//         const updatePayload: any = {
//           status: "completed",
//           payment_status: "completed",
//           completed_at: new Date().toISOString(),
//         };
//         // Guarantee driver_id is always filled in
//         if (payingDriverId) updatePayload.driver_id = payingDriverId;

//         const { data: rideRow, error } = await supabase
//           .from("rides")
//           .update(updatePayload)
//           .eq("id", data.rideId)
//           .select()
//           .single();

//         if (error) {
//           console.error("❌ Failed to update payment status:", error);
//         } else {
//           console.log(`✅ Ride ${data.rideId} marked as payment completed in Supabase, driver_id=${rideRow?.driver_id}`);

//           // Calculate the expected fare and any overpayment
//           const collectedAmount = Number(data.amount) || Number(rideRow?.estimated_price) || 0;
//           const expectedFare = Number(rideRow?.final_price) || Number(rideRow?.estimated_price) || 0;
//           // Trust client-provided extraAmount (already calculated correctly) with server recalc as fallback
//           const serverExtraAmount = Math.max(0, collectedAmount - expectedFare);
//           const clientExtra = Number(data.extraAmount) || 0;
//           const extraAmount = clientExtra > 0 ? clientExtra : serverExtraAmount;

//           console.log(`💰 Payment details: collected=£${collectedAmount}, expectedFare=£${expectedFare}`);
//           console.log(`💰 extraAmount: client=${data.extraAmount}, server=${serverExtraAmount}, final=${extraAmount}`);
//           console.log(`💰 rideRow: estimated_price=${rideRow?.estimated_price}, final_price=${rideRow?.final_price}, driver_id=${rideRow?.driver_id}, rider_id=${rideRow?.rider_id}`);

//           // ✅ FALLBACK: Update driver earnings if ride:status "completed" handler didn't already
//           // Check if a payment record exists for this ride — if so, earnings were already processed
//           if (payingDriverId && expectedFare > 0) {
//             try {
//               const { data: existingPayment } = await supabase
//                 .from("payments")
//                 .select("id")
//                 .eq("ride_id", data.rideId)
//                 .maybeSingle();

//               if (!existingPayment) {
//                 console.log(`⚠️ No payment record found for ride ${data.rideId} — processing earnings fallback`);

//                 // Insert the payment record
//                 const { error: paymentInsertErr } = await supabase.from("payments").insert({
//                   ride_id: data.rideId,
//                   user_id: rideRow?.rider_id,
//                   amount: expectedFare,
//                   currency: "gbp",
//                   status: "succeeded",
//                   payment_method: "cash",
//                   completed_at: new Date().toISOString(),
//                 });
//                 if (paymentInsertErr) {
//                   console.error("❌ Fallback payment insert failed:", paymentInsertErr);
//                 } else {
//                   console.log(`✅ Fallback payment record inserted: £${expectedFare} for ride ${data.rideId}`);
//                 }

//                 // Update driver total_earnings
//                 const { data: driverRecord } = await supabase
//                   .from("drivers")
//                   .select("total_earnings")
//                   .eq("id", payingDriverId)
//                   .single();

//                 if (driverRecord) {
//                   const currentEarnings = driverRecord.total_earnings || 0;
//                   const newEarnings = currentEarnings + expectedFare;
//                   const { error: earningsErr } = await supabase
//                     .from("drivers")
//                     .update({ total_earnings: newEarnings })
//                     .eq("id", payingDriverId);

//                   if (earningsErr) {
//                     console.error("❌ Fallback earnings update failed:", earningsErr);
//                   } else {
//                     console.log(`✅ Fallback earnings updated for driver ${payingDriverId}: £${currentEarnings} + £${expectedFare} = £${newEarnings}`);
//                   }
//                 }

//                 // Set final_price if not already set
//                 if (!rideRow?.final_price && rideRow?.estimated_price) {
//                   await supabase
//                     .from("rides")
//                     .update({ final_price: rideRow.estimated_price })
//                     .eq("id", data.rideId);
//                   console.log(`✅ Set final_price=${rideRow.estimated_price} for ride ${data.rideId}`);
//                 }
//               } else {
//                 console.log(`ℹ️ Payment record already exists for ride ${data.rideId} — skipping earnings fallback`);
//               }
//             } catch (fallbackErr) {
//               console.error("❌ Fallback earnings processing failed:", fallbackErr);
//             }
//           }

//           // ✅ If extra amount was paid (cash overpayment), add it to rider's wallet
//           if (extraAmount > 0 && rideRow?.rider_id) {
//             try {
//               const { data: userRow, error: userFetchErr } = await supabase
//                 .from("users")
//                 .select("wallet_balance")
//                 .eq("id", rideRow.rider_id)
//                 .single();

//               if (userFetchErr) {
//                 console.error("❌ Failed to fetch user wallet balance:", userFetchErr);
//               } else {
//                 const currentBalance = userRow?.wallet_balance || 0;
//                 const newBalance = currentBalance + extraAmount;

//                 const { error: walletUpdateErr } = await supabase
//                   .from("users")
//                   .update({ wallet_balance: newBalance })
//                   .eq("id", rideRow.rider_id);

//                 if (walletUpdateErr) {
//                   console.error("❌ Failed to update user wallet_balance:", walletUpdateErr);
//                 } else {
//                   console.log(`✅ Updated wallet for user ${rideRow.rider_id}: £${currentBalance} + £${extraAmount} = £${newBalance}`);
//                 }

//                 // Record transaction in wallet_transactions (best-effort)
//                 const { error: txnErr } = await supabase
//                   .from("wallet_transactions")
//                   .insert({
//                     user_id: rideRow.rider_id,
//                     ride_id: data.rideId,
//                     amount: extraAmount,
//                     type: 'credit',
//                     description: `Cash overpayment change (collected £${collectedAmount}, fare £${expectedFare})`
//                   });

//                 if (txnErr) {
//                   console.warn("⚠️ Failed to insert wallet_transaction (table may not exist):", txnErr.message);
//                 } else {
//                   console.log(`✅ Wallet transaction recorded for user ${rideRow.rider_id}`);
//                 }
//               }
//             } catch (walletErr) {
//               console.error("❌ Exception adding extra amount to user wallet:", walletErr);
//             }
//           } else {
//             console.log(`ℹ️ No extra amount to add to wallet (extraAmount=£${extraAmount}, rider_id=${rideRow?.rider_id || 'none'})`);
//           }

//           if (rideRow && rideRow.rider_id) {
//             // ✅ Include extraAmount in the event so rider's app can update wallet display
//             console.log(`📡 Emitting ride:update to rider:${rideRow.rider_id} with status=payment_collected, extraAmount=${extraAmount}`);
//             io.to(`rider:${rideRow.rider_id}`).emit("ride:update", {
//               rideId: data.rideId,
//               status: "payment_collected",
//               extraAmount: extraAmount,
//             });
//             // NOTE: We do NOT send a second "completed" event here.
//             // The ride:status "completed" handler already sent one earlier.
//             // Sending a duplicate causes a race condition where the "completed" event
//             // arrives after "payment_collected" and clears activeRide before the wallet
//             // update runs on the client.
//           } else {
//             console.warn(`⚠️ Cannot notify rider — rideRow.rider_id is missing. rideRow:`, rideRow);
//           }
//         }
//       } catch (err) {
//         console.error("❌ Exception updating payment status:", err);

//       }
//     });

//     socket.on("disconnect", async () => {
//       console.log(`❌ Client disconnected: ${socket.id}`);

//       for (const [driverId, socketId] of connectedDrivers.entries()) {
//         if (socketId === socket.id) {
//           // Check if driver has an active ride — if so, give a grace period
//           // to allow reconnection after switching to Google Maps
//           let hasActiveRide = false;
//           for (const [, rideInfo] of activeRides.entries()) {
//             if (rideInfo.driverSocketId === socket.id) {
//               hasActiveRide = true;
//               break;
//             }
//           }

//           if (hasActiveRide) {
//             console.log(`⏳ Driver ${driverId} disconnected during active ride — waiting 30s before marking offline`);
//             // Grace period: wait 30 seconds before marking offline
//             setTimeout(async () => {
//               // Check if driver reconnected with a NEW socket in the meantime
//               const currentSocketId = connectedDrivers.get(driverId);
//               if (currentSocketId && currentSocketId !== socket.id) {
//                 console.log(`✅ Driver ${driverId} reconnected with new socket ${currentSocketId} — keeping online`);
//                 return; // Driver reconnected, don't mark offline
//               }
//               // Driver did NOT reconnect — mark offline
//               if (!currentSocketId || currentSocketId === socket.id) {
//                 connectedDrivers.delete(driverId);
//                 console.log(`📊 Driver ${driverId} did not reconnect within 30s — marking offline. Remaining: ${connectedDrivers.size}`);
//                 try {
//                   await supabase
//                     .from("drivers")
//                     .update({ is_online: false, is_available: false })
//                     .eq("id", driverId);
//                 } catch (error) {
//                   console.error("Error updating driver status on disconnect:", error);
//                 }
//               }
//             }, 30000);
//           } else {
//             // No active ride — mark offline immediately
//             connectedDrivers.delete(driverId);
//             console.log(`📊 Driver ${driverId} disconnected (no active ride). Remaining connected drivers: ${connectedDrivers.size}`);
//             try {
//               await supabase
//                 .from("drivers")
//                 .update({ is_online: false, is_available: false })
//                 .eq("id", driverId);
//             } catch (error) {
//               console.error("Error updating driver status on disconnect:", error);
//             }
//           }
//           break;
//         }
//       }

//       for (const [riderId, socketId] of connectedRiders.entries()) {
//         if (socketId === socket.id) {
//           connectedRiders.delete(riderId);
//           break;
//         }
//       }
//     });
//   });

//   serverRideEmitter.on("dispatch", async (rideData: any) => {
//     // For dispatch triggered internally by REST APIs, we won't have a source socket.
//     // However, if the activeRides map already holds the riderSocketId (e.g. they connected
//     // via a client-side proxy), it would be nice to have. For now, empty string is fine.
//     try {
//       // Find rider socket if they are connected
//       let riderSocketId: string | null = null;
//       for (const [rId, sId] of connectedRiders.entries()) {
//         if (rId === rideData.riderId) {
//           riderSocketId = sId;
//           break;
//         }
//       }

//       await handleRideRequest(rideData, riderSocketId);
//     } catch (e) {
//       console.error("Internal dispatch failed", e);
//     }
//   });

//   return io;
// }

//server/socket.ts

import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";  // ✅ CORRECT - Use socket.io for server
import { supabase } from "./db";
import { EventEmitter } from "events";
import { capturePaymentIntent, chargeSavedCard, releaseAuthorization } from "./stripe";
import { DEFAULT_DRIVER_RADIUS_MILES, haversineDistanceMiles } from "../server/services/driverMatching";
import { DRIVER_DEDUCTION_TYPE, formatLiveRideCancellationPenalty } from "../shared/driverDeductions";
import { getDiscountedFare, getDriverCancelPenalty } from "../shared/fare";
import { upsertDriverPenaltyDeduction } from "./services/driverDeductions";

export const serverRideEmitter = new EventEmitter();
export let io: Server;

// ─── Scheduled booking → live ride bridge ─────────────────────────────────
// Populated inside setupSocketIO (needs access to the in-memory dispatch state).
// Used by the scheduled-bookings activation engine in routes.ts.
export const scheduledRideHooks: {
  // Dispatch an unassigned scheduled booking exactly like an immediate booking
  dispatchScheduledRide: ((rideData: any) => Promise<void>) | null;
  // Hand an already-accepted scheduled booking straight to its driver's home screen
  activateAcceptedScheduledRide: ((rideData: any, driverId: string) => Promise<boolean>) | null;
  // Cancel a live ride that originated from a scheduled booking (rider/driver cancelled the booking)
  cancelScheduledLiveRide: ((rideId: string, cancelledBy?: string) => Promise<void>) | null;
  // Return the ride currently dispatched to a driver (for background / push recovery)
  getPendingDispatchForDriver: ((driverId: string) => Promise<any | null>) | null;
} = {
  dispatchScheduledRide: null,
  activateAcceptedScheduledRide: null,
  cancelScheduledLiveRide: null,
  getPendingDispatchForDriver: null,
};

const SCHEDULED_RIDE_ID_PREFIX = "sched_";

export const isScheduledLiveRideId = (rideId?: string | null): boolean =>
  typeof rideId === "string" && rideId.startsWith(SCHEDULED_RIDE_ID_PREFIX);

// Keep the source later_bookings / web_booker row in sync with the live ride status
async function syncScheduledBookingForRide(rideId: string, status: string, extra?: Record<string, any>) {
  if (!isScheduledLiveRideId(rideId)) return;
  for (const table of ["later_bookings", "web_booker"] as const) {
    try {
      let { data, error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString(), ...(extra || {}) })
        .eq("live_ride_id", rideId)
        .select();

      // If an optional column is missing in this table, retry with the bare status update
      if (error && extra && /column/i.test(String(error.message || ""))) {
        const retry = await supabase
          .from(table)
          .update({ status, updated_at: new Date().toISOString() })
          .eq("live_ride_id", rideId)
          .select();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data && data.length > 0) {
        console.log(`🔄 Synced scheduled booking in ${table} (live ride ${rideId}) → ${status}`);
        try {
          io.emit("later-booking:update", { type: "live_status", booking: { ...data[0], source_table: table } });
        } catch (_) { /* non-critical */ }
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Could not sync scheduled booking status in ${table} for ride ${rideId}:`, err);
    }
  }
}

// No driver could be found for the activated booking — clear the live ride link
// so the activation engine can retry dispatching it on a later cycle.
async function releaseScheduledBookingForRetry(rideId: string) {
  if (!isScheduledLiveRideId(rideId)) return;
  for (const table of ["later_bookings", "web_booker"] as const) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update({ live_ride_id: null, updated_at: new Date().toISOString() })
        .eq("live_ride_id", rideId)
        .select();
      if (!error && data && data.length > 0) {
        console.log(`🔁 Released scheduled booking in ${table} for retry (live ride ${rideId})`);
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Could not release scheduled booking for retry in ${table} (ride ${rideId}):`, err);
    }
  }
}

// The assigned driver cancelled the live ride and no reassignment was possible —
// release the booking back to the pool (unassigned) so other drivers can get it.
async function releaseScheduledBookingAssignment(rideId: string) {
  if (!isScheduledLiveRideId(rideId)) return;
  for (const table of ["later_bookings", "web_booker"] as const) {
    const releasedStatus = table === "web_booker" ? "marketplace" : "scheduled";
    try {
      const { data, error } = await supabase
        .from(table)
        .update({
          status: releasedStatus,
          driver_id: null,
          assigned_driver_id: null,
          live_ride_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("live_ride_id", rideId)
        .select();
      if (!error && data && data.length > 0) {
        console.log(`🔁 Released scheduled booking assignment in ${table} (live ride ${rideId})`);
        try {
          io.emit("later-booking:update", { type: "released", booking: { ...data[0], source_table: table } });
        } catch (_) { /* non-critical */ }
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Could not release scheduled booking assignment in ${table} (ride ${rideId}):`, err);
    }
  }
}

interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

interface RideUpdate {
  rideId: string;
  status: string;
  driverId?: string;
  cancelledBy?: "rider" | "driver";
  earlyCompletionReason?: string;
  driverLocation?: DriverLocation;
  driverInfo?: any;
}

// ─── Min-Heap (Priority Queue) for Nearest Driver Dispatch ───────────────────
// Each entry: { driverId, distance, socketId }
interface DriverHeapEntry {
  driverId: string;
  distance: number;
  socketId: string;
}

class MinHeap {
  private heap: DriverHeapEntry[] = [];

  get size(): number { return this.heap.length; }

  push(entry: DriverHeapEntry): void {
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): DriverHeapEntry | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].distance <= this.heap[i].distance) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].distance < this.heap[smallest].distance) smallest = left;
      if (right < n && this.heap[right].distance < this.heap[smallest].distance) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

const RADIUS_MILES = DEFAULT_DRIVER_RADIUS_MILES; // 5-mile radius for driver eligibility
const DISPATCH_TIMEOUT_MS = 60000; // 60-second timeout when driver socket is connected
const DISPATCH_TIMEOUT_BACKGROUND_MS = 120000; // 120-second timeout when driver is online but app is backgrounded
const ARRIVED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes waiting for rider

const normalizeVehicleType = (value: any): string => {
  if (!value) return "saloon";
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "peoplecarrier":
    case "people_carrier":
    case "mpv":
      return "people_carrier";
    case "mini_bus":
    case "minibus":
      return "minibus";
    case "saloon_car":
    case "salooncar":
    case "sedan":
    case "saloon":
      return "saloon";
    default:
      return normalized;
  }
};

// Track active dispatch queues so we can cancel/advance them
// rideId -> { heap, timer, rideData, riderSocketId, currentDriverId }
interface DispatchState {
  heap: MinHeap;
  timer: ReturnType<typeof setTimeout> | null;
  rideData: any;
  riderSocketId: string;
  currentDriverId: string | null;
  declinedBy: Set<string>;
  cancelled: boolean;
}

const dispatchQueues = new Map<string, DispatchState>();

// Track arrived-at-pickup timers so we can auto-cancel if rider doesn't board
// No longer tracking arrived timers server-side as the driver manually initiates No Show after 10 min

export function setupSocketIO(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    // Extended timeouts so drivers switching to Google Maps don't disconnect
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const connectedDrivers = new Map<string, string>();  // driverId -> socketId
  const connectedRiders = new Map<string, string>();    // riderId  -> socketId
  const activeRides = new Map<string, { riderSocketId: string; riderId?: string; declinedBy: Set<string>; rideData?: any; driverSocketId?: string }>();
  const latestDriverLocations = new Map<string, DriverLocation>(); // driverId or socketId -> location

  const getDriverIdForSocket = (socketId?: string): string | null => {
    if (!socketId) return null;
    for (const [driverId, driverSocketId] of connectedDrivers.entries()) {
      if (driverSocketId === socketId) return driverId;
    }
    return null;
  };

  const resolveDriverTableId = async (driverId?: string | null): Promise<string | null> => {
    if (!driverId) return null;

    const { data: directDriver } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", driverId)
      .single();

    if (directDriver?.id) return directDriver.id;

    const { data: driverByUserId } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", driverId)
      .single();

    return driverByUserId?.id || null;
  };

  const buildRideDataFromDbRide = (ride: any) => {
    const normalizedRideType = normalizeVehicleType(ride.vehicle_type || "saloon");
    return {
    id: ride.id,
    riderId: ride.rider_id,
    rideType: normalizedRideType,
    vehicleType: normalizedRideType,
    pickupLocation: {
      address: ride.pickup_address || "Unknown",
      latitude: ride.pickup_latitude || 0,
      longitude: ride.pickup_longitude || 0,
    },
    dropoffLocation: {
      address: ride.dropoff_address || "Unknown",
      latitude: ride.dropoff_latitude || 0,
      longitude: ride.dropoff_longitude || 0,
    },
    farePrice: getDiscountedFare(
      Number(ride.estimated_price || ride.final_price || 0),
      Number(ride.discount_amount || 0),
    ),
    estimatedPrice: Number(ride.estimated_price || ride.final_price || 0),
    distanceMiles: Number(ride.distance || 0),
    durationMinutes: Number(ride.estimated_duration || 0),
    couponCode: ride.coupon_code || null,
    discountAmount: Number(ride.discount_amount || 0),
    paymentMethod: ride.payment_method || "card",
    otp: ride.otp || null,
  };
  };

  const buildFallbackDriverLocation = (rideId: string, driverId?: string | null): (DriverLocation & { rideId: string }) | null => {
    const rideInfo = activeRides.get(rideId);
    const pickup = rideInfo?.rideData?.pickupLocation;
    if (pickup?.latitude == null || pickup?.longitude == null) return null;

    return {
      driverId: driverId || getDriverIdForSocket(rideInfo?.driverSocketId) || "unknown",
      rideId,
      latitude: Number(pickup.latitude) - 0.012,
      longitude: Number(pickup.longitude) - 0.012,
    };
  };

  const getLatestDriverLocation = async (
    rideId: string,
    driverId?: string | null,
    driverSocketId?: string
  ): Promise<(DriverLocation & { rideId: string }) | null> => {
    const cachedLocation =
      (driverId ? latestDriverLocations.get(driverId) : undefined) ||
      (driverSocketId ? latestDriverLocations.get(driverSocketId) : undefined);

    if (cachedLocation?.latitude != null && cachedLocation?.longitude != null) {
      return {
        ...cachedLocation,
        driverId: driverId || cachedLocation.driverId,
        rideId,
      };
    }

    if (!driverId) return null;

    const { data: driverRow } = await supabase
      .from("drivers")
      .select("current_latitude, current_longitude")
      .eq("id", driverId)
      .maybeSingle();

    if (driverRow?.current_latitude != null && driverRow?.current_longitude != null) {
      return {
        driverId,
        rideId,
        latitude: Number(driverRow.current_latitude),
        longitude: Number(driverRow.current_longitude),
      };
    }

    const { data: latestLocation } = await supabase
      .from("driver_locations")
      .select("latitude, longitude, heading, speed")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLocation?.latitude != null && latestLocation?.longitude != null) {
      return {
        driverId,
        rideId,
        latitude: Number(latestLocation.latitude),
        longitude: Number(latestLocation.longitude),
        heading: latestLocation.heading,
        speed: latestLocation.speed,
      };
    }

    return null;
  };

  // ─── dispatchToNextDriver ──────────────────────────────────────────────
  // Pops the nearest driver from the heap and sends the ride exclusively to them.
  // Sets a 15-second timeout; if the driver doesn't accept, moves to the next.
  async function dispatchToNextDriver(rideId: string) {
    const state = dispatchQueues.get(rideId);
    if (!state || state.cancelled) {
      dispatchQueues.delete(rideId);
      return;
    }

    // Clear any previous timeout
    if (state.timer) clearTimeout(state.timer);

    // Pop nearest available driver from the heap
    let entry: DriverHeapEntry | undefined;
    while ((entry = state.heap.pop()) !== undefined) {
      if (state.declinedBy.has(entry.driverId)) {
        console.log(`⏭️ Skipping driver ${entry.driverId} — already declined or cancelled for ride ${rideId}`);
        entry = undefined;
        continue;
      }
      break;
    }

    if (!entry) {
      // No more drivers in radius — notify rider
      console.log(`🚫 No more drivers available within ${RADIUS_MILES} miles for ride ${rideId}`);
      io.to(state.riderSocketId).emit("ride:update", {
        rideId,
        status: "cancelled_no_drivers",
        cancellationFee: 0,
        chargedVia: "none",
      });

      // Also update the ride in DB to cancelled — no rider fee for dispatch failure
      try {
        await supabase
          .from("rides")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_fee: 0,
            cancelled_by: "system",
          })
          .eq("id", rideId);
        console.log(`✅ Ride ${rideId} marked cancelled in DB (no drivers available)`);
      } catch (dbErr) {
        console.error(`❌ Failed to cancel ride ${rideId} in DB:`, dbErr);
      }
      dispatchQueues.delete(rideId);

      // Scheduled bookings are not lost — release them so the activation
      // engine can retry the dispatch on a later cycle.
      await releaseScheduledBookingForRetry(rideId);
      return;
    }

    state.currentDriverId = entry.driverId;

    // Annotate ride data with the actual distances so the driver sees it.
    // farePrice = coupon-adjusted payable; estimatedPrice kept as full for math.
    const fullFare = Number(state.rideData?.farePrice || state.rideData?.estimatedPrice || 0);
    const discountAmt = Math.max(0, Number(state.rideData?.discountAmount || 0));
    const payableFare = getDiscountedFare(fullFare, discountAmt);
    const enrichedRide = {
      ...state.rideData,
      farePrice: payableFare,
      estimatedPrice: fullFare,
      discountAmount: discountAmt,
      pickupDistance: Math.round(entry.distance * 100) / 100,   // in miles, 2 decimals
      _dispatchedTo: entry.driverId, // private marker
    };

    // Ensure rider phone is present — look up from DB if not in ride data
    if (!enrichedRide.riderPhone && enrichedRide.riderId) {
      try {
        const { data: riderUser } = await supabase
          .from("users")
          .select("phone")
          .eq("id", enrichedRide.riderId)
          .single();
        if (riderUser?.phone) {
          enrichedRide.riderPhone = riderUser.phone;
          console.log(`📞 Looked up rider phone for dispatch: ${riderUser.phone}`);
        }
      } catch (_) {
        // Non-critical — driver can still use the app without phone
      }
    }

    console.log(`📡 Dispatching ride ${rideId} to nearest driver ${entry.driverId} (${entry.distance.toFixed(2)} mi away)`);
    io.to(`driver:${entry.driverId}`).emit("ride:new", enrichedRide);

    // Always push as well — socket may be dead while the driver is still online
    // in another app / with the screen locked. Push wakes the device and the
    // client restores the pending offer via pending-dispatch / ride payload.
    try {
      const { data: driverUser } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", entry.driverId)
        .single();

      if (driverUser?.user_id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("push_token")
          .eq("id", driverUser.user_id)
          .single();

        if (userRow?.push_token) {
          const fareLabel = Number(enrichedRide.farePrice || 0).toFixed(2);
          const pickupLabel =
            enrichedRide.pickupLocation?.address ||
            enrichedRide.pickupAddress ||
            "nearby";
          const pushMessage = {
            to: userRow.push_token,
            sound: "default",
            title: "🚕 New Ride Request",
            body: `New ride from ${pickupLabel} — £${fareLabel}`,
            data: {
              type: "ride_request",
              rideId,
              audience: "driver",
              target: "DriveTab",
              screen: "DriveTab",
              // Embed enough ride data so a cold/background open can show the offer
              // even before the socket reconnects.
              ride: {
                id: enrichedRide.id || rideId,
                riderId: enrichedRide.riderId,
                riderName: enrichedRide.riderName,
                riderPhone: enrichedRide.riderPhone,
                pickupLocation: enrichedRide.pickupLocation,
                dropoffLocation: enrichedRide.dropoffLocation,
                pickupAddress: enrichedRide.pickupLocation?.address || enrichedRide.pickupAddress,
                dropoffAddress: enrichedRide.dropoffLocation?.address || enrichedRide.dropoffAddress,
                pickupLatitude: enrichedRide.pickupLocation?.latitude,
                pickupLongitude: enrichedRide.pickupLocation?.longitude,
                dropoffLatitude: enrichedRide.dropoffLocation?.latitude,
                dropoffLongitude: enrichedRide.dropoffLocation?.longitude,
                farePrice: enrichedRide.farePrice,
                estimatedPrice: enrichedRide.estimatedPrice,
                discountAmount: enrichedRide.discountAmount,
                distanceMiles: enrichedRide.distanceMiles || enrichedRide.distanceKm,
                durationMinutes: enrichedRide.durationMinutes,
                pickupDistance: enrichedRide.pickupDistance,
                otp: enrichedRide.otp,
                paymentMethod: enrichedRide.paymentMethod || "card",
                rideType: enrichedRide.rideType || enrichedRide.vehicleType,
              },
            },
            priority: "high",
            channelId: "uto-ride-requests-v2",
            ttl: 120,
            expiration: Math.floor(Date.now() / 1000) + 120,
            _contentAvailable: true,
            interruptionLevel: "timeSensitive",
          };

          const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(pushMessage),
          });
          const pushBody = await pushRes.json().catch(() => null);
          console.log(
            `📲 Push notification sent to driver ${entry.driverId} (token: ${userRow.push_token.substring(0, 20)}...) status=${pushRes.status}`,
            pushBody ? JSON.stringify(pushBody).slice(0, 300) : ""
          );
        } else {
          console.warn(`⚠️ Driver ${entry.driverId} has no push_token — background delivery may fail`);
        }
      }
    } catch (pushErr) {
      console.warn(`⚠️ Could not send push notification to driver ${entry.driverId}:`, pushErr);
    }

    // Prefer the longer background window unless we can prove the driver's
    // socket is currently connected and alive. A stale map entry after the OS
    // suspends the app must NOT use the short foreground timeout.
    const mappedSocketId = connectedDrivers.get(entry.driverId);
    const liveSocket = mappedSocketId ? io.sockets.sockets.get(mappedSocketId) : undefined;
    const driverSocketConnected = !!(liveSocket && (liveSocket as any).connected !== false);
    const dispatchTimeoutMs = driverSocketConnected ? DISPATCH_TIMEOUT_MS : DISPATCH_TIMEOUT_BACKGROUND_MS;
    console.log(
      `⏱️ Dispatch window for driver ${entry.driverId}: ${dispatchTimeoutMs / 1000}s (${driverSocketConnected ? "live socket" : "background/push"})`
    );
    state.timer = setTimeout(() => {
      console.log(`⏱️ Driver ${entry!.driverId} did not respond within ${dispatchTimeoutMs / 1000}s — moving to next`);
      // Notify the timed-out driver to clear their screen
      io.to(`driver:${entry!.driverId}`).emit("ride:expired", { rideId });
      dispatchToNextDriver(rideId);
    }, dispatchTimeoutMs);
  }

      const handleRideRequest = async (rideData: any, sourceSocketId: string | null) => {
      console.log('🚕 New ride request from:', rideData.riderId, 'Ride ID:', rideData.id);
      console.log('🚕 Ride data keys:', Object.keys(rideData));

      if (rideData.id) {
        const existingRideInfo = activeRides.get(rideData.id);
        activeRides.set(rideData.id, {
          riderSocketId: sourceSocketId || '',
          riderId: rideData.riderId,
          declinedBy: existingRideInfo?.declinedBy || new Set(),
          rideData: rideData,
          driverSocketId: existingRideInfo?.driverSocketId,
        });

        // Save ride details to Supabase so it's persisted for ride history
        if (rideData.riderId) {
          try {
            const normalizedRideVehicleType = normalizeVehicleType(
              rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy"
            );
            const insertPayload: Record<string, any> = {
              id: rideData.id,
              rider_id: rideData.riderId,
              status: "pending",
              vehicle_type: normalizedRideVehicleType,
              pickup_address: rideData.pickupLocation?.address || "Unknown",
              pickup_latitude: rideData.pickupLocation?.latitude || 0,
              pickup_longitude: rideData.pickupLocation?.longitude || 0,
              dropoff_address: rideData.dropoffLocation?.address || "Unknown",
              dropoff_latitude: rideData.dropoffLocation?.latitude || 0,
              dropoff_longitude: rideData.dropoffLocation?.longitude || 0,
              estimated_price: rideData.farePrice || 0,
              coupon_code: rideData.couponCode || null,
              discount_amount: rideData.discountAmount || 0,
              // Parse to integers to avoid "invalid input syntax for type integer" DB error
              distance: Math.round(parseFloat(rideData.distanceKm || rideData.distanceMiles || 0)),
              estimated_duration: Math.round(parseFloat(rideData.durationMinutes || 0)),
              payment_method: rideData.paymentMethod || "card",
              payment_intent_id: rideData.paymentIntentId || null,
              payment_status: rideData.paymentStatus || (rideData.paymentMethod === "card" ? "pending" : null),
              otp: typeof rideData.otp === "string" ? rideData.otp : null,
            };

            console.log('🚕 Inserting ride into Supabase:', JSON.stringify(insertPayload));

            const payloadToInsert = { ...insertPayload };
            let insertedData: any = null;
            let insertError: any = null;
            for (let attempt = 0; attempt < 5; attempt += 1) {
              const result = await supabase
                .from("rides")
                .insert(payloadToInsert)
                .select()
                .single();

              insertedData = result.data;
              insertError = result.error;
              if (!insertError) {
                break;
              }

              if (insertError?.code === "PGRST204") {
                const missingColumn = String(insertError.message || "").match(/'([^']+)'/)?.[1];
                if (missingColumn && Object.prototype.hasOwnProperty.call(payloadToInsert, missingColumn)) {
                  delete payloadToInsert[missingColumn];
                  console.warn(`⚠️ rides.${missingColumn} is missing in Supabase schema cache; retrying ride insert without ${missingColumn}`);
                  continue;
                }
              }
              break;
            }

            if (insertError) {
              console.error("❌ Failed to save ride request to DB:", JSON.stringify(insertError));
              // Don't proceed with dispatch if DB insert failed
              if (sourceSocketId) {
                io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Failed to save ride to database" });
              }
              return;
            } else {
              console.log(`✅ Saved ride ${rideData.id} to Supabase! Row:`, insertedData?.id);
            }
          } catch (error) {
            console.error("❌ Exception saving ride request to DB:", error);
            // Don't proceed with dispatch if exception occurred
            if (sourceSocketId) {
              io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Failed to save ride to database" });
            }
            return;
          }
        } else {
          console.warn('⚠️ No riderId in ride request, skipping DB save');
          // Don't proceed with dispatch if no riderId
          if (sourceSocketId) {
            io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "error", message: "Missing rider information" });
          }
          return;
        }
      }

      // ─── DSA-based Nearest Driver Dispatch ─────────────────────────────
      // 1. Get pickup coordinates
      const pickupLat = rideData.pickupLocation?.latitude || rideData.pickupLatitude || 0;
      const pickupLng = rideData.pickupLocation?.longitude || rideData.pickupLongitude || 0;

      console.log(`📍 Pickup coordinates: (${pickupLat}, ${pickupLng})`);
      console.log(`📊 Currently connected drivers: ${connectedDrivers.size}`);
      for (const [dId, sId] of connectedDrivers.entries()) {
        console.log(`   🚗 Driver ${dId} -> socket ${sId}`);
      }

      if (!pickupLat || !pickupLng) {
        console.warn('⚠️ No pickup coordinates — falling back to broadcast to all connected drivers');
        // Instead of generic broadcast, send to all connected driver sockets
        for (const [driverId] of connectedDrivers) {
          io.to(`driver:${driverId}`).emit("ride:new", rideData);
        }
        return;
      }
      // Ride request distance check: if the ride is too far, cancel immediately
      // const dropoffLat = rideData.dropoffLocation?.latitude || rideData.dropoffLatitude || 0;
      // const dropoffLng = rideData.dropoffLocation?.longitude || rideData.dropoffLongitude || 0;
      // const rideDistanceMiles = haversineDistanceMiles(pickupLat, pickupLng, dropoffLat, dropoffLng);

      // if (rideDistanceMiles > RADIUS_MILES) {
      //   console.log(`🚫 Ride request exceeds ${RADIUS_MILES} miles: ${rideDistanceMiles.toFixed(2)} mi`);
      //   if (sourceSocketId) {
      //     io.to(sourceSocketId).emit("ride:update", {
      //       rideId: rideData.id,
      //       status: "cancelled",
      //       message: `Ride requests are only allowed within ${RADIUS_MILES} miles. Please choose a closer destination.`,
      //     });
      //   }
      //   return;
      // }

      // 2. Query all online drivers with their locations from DB
      //    We query is_online=true only (not is_available — the driver socket connection is the real signal)
      const { data: onlineDrivers, error: driversErr } = await supabase
        .from("drivers")
        .select("id, current_latitude, current_longitude, is_available, vehicle_type")
        .eq("is_online", true);

      console.log(`📊 DB online drivers: ${onlineDrivers?.length || 0}, error: ${driversErr?.message || 'none'}`);

      // Issue 10: Vehicle type matching
      // Map rider-requested ride types to compatible driver vehicle types
      const requestedType = normalizeVehicleType(rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy");
      const compatibleTypes = getCompatibleVehicleTypes(requestedType);
      console.log(`🚗 Requested vehicle type: "${requestedType}" → compatible: [${compatibleTypes.join(', ')}]`);

      // 3. Build Min-Heap combining DB drivers + socket-connected drivers
      const heap = new MinHeap();
      const addedDriverIds = new Set<string>();

      // First pass: Add drivers with location data in the DB
      if (onlineDrivers && onlineDrivers.length > 0) {
        for (const driver of onlineDrivers) {
          const driverSocketId = connectedDrivers.get(driver.id);

          // Vehicle type filtering
          const driverVehicle = normalizeVehicleType(driver.vehicle_type || 'saloon');
          if (!compatibleTypes.includes(driverVehicle)) {
            console.log(`   ⏭️ Skipping driver ${driver.id} — vehicle "${driverVehicle}" not compatible with "${requestedType}"`);
            continue;
          }

          const driverLocation = await getLatestDriverLocation(rideData.id, driver.id, driverSocketId);
          if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
            const dist = haversineDistanceMiles(
              pickupLat, pickupLng,
              driverLocation.latitude,
              driverLocation.longitude
            );
            const withinRadius = dist <= RADIUS_MILES;
            console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle}, socket: ${driverSocketId ? "connected" : "background/offline"})`);

            if (withinRadius) {
              heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId || "" });
              addedDriverIds.add(driver.id);
            } else {
              console.log(`   ⏭️ Driver ${driver.id} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
            }
          } else {
            console.log(`   ⚠️ Driver ${driver.id} has no known location yet — skipping dispatch`);
          }
        }
      }

      // Second pass: Add any socket-connected drivers not yet in heap
      // (they may not have location in DB yet but are actively connected)
      // For these drivers, we still need vehicle type checking
      for (const [driverId, socketId] of connectedDrivers) {
        if (!addedDriverIds.has(driverId)) {
          // Check vehicle type from DB for this driver
          let vehicleOk = true;
          try {
            const { data: driverRow } = await supabase
              .from("drivers")
              .select("vehicle_type")
              .eq("id", driverId)
              .maybeSingle();

          if (!driverRow) {
            console.log(`   ⏭️ Skipping socket driver ${driverId} — no matching drivers row`);
            continue;
          }

            const driverVehicle = normalizeVehicleType(driverRow?.vehicle_type || 'saloon');
            if (!compatibleTypes.includes(driverVehicle)) {
              console.log(`   ⏭️ Skipping socket driver ${driverId} — vehicle "${driverVehicle}" not compatible`);
              vehicleOk = false;
            }
          } catch (_) {
            // If we can't look up vehicle type, allow as fallback
          }
          
          if (vehicleOk) {
            const driverLocation = await getLatestDriverLocation(rideData.id, driverId, socketId);
            if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
              const dist = haversineDistanceMiles(
                pickupLat,
                pickupLng,
                driverLocation.latitude,
                driverLocation.longitude
              );
              if (dist <= RADIUS_MILES) {
                console.log(`   📏 Socket driver ${driverId} is ${dist.toFixed(2)} mi away — eligible for dispatch`);
                heap.push({ driverId, distance: dist, socketId });
                addedDriverIds.add(driverId);
              } else {
                console.log(`   ⏭️ Socket driver ${driverId} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
              }
            } else {
              console.log(`   ⚠️ Socket driver ${driverId} has no known location yet — skipping dispatch`);
            }
          }
        }
      }

      console.log(`📊 Total eligible drivers for dispatch: ${heap.size} (radius: ${RADIUS_MILES} miles, pickup: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)})`);

      if (heap.size === 0) {
        console.log('🚫 No drivers available at all — notifying rider');
        if (sourceSocketId) {
          io.to(sourceSocketId).emit("ride:update", { rideId: rideData.id, status: "cancelled_no_drivers" });
        }

        // Also update the ride in DB to cancelled
        if (rideData.id) {
          try {
            await supabase
              .from("rides")
              .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
              .eq("id", rideData.id);
            console.log(`✅ Ride ${rideData.id} marked cancelled in DB (no drivers at all)`);
          } catch (dbErr) {
            console.error(`❌ Failed to cancel ride ${rideData.id} in DB:`, dbErr);
          }

          // Scheduled bookings are not lost — release them so the activation
          // engine can retry the dispatch on a later cycle.
          await releaseScheduledBookingForRetry(rideData.id);
        }
        return;
      }

      // 4. Start sequential dispatch — nearest first
      const rideInfo = activeRides.get(rideData.id);
      const dispatchState: DispatchState = {
        heap,
        timer: null,
        rideData,
        riderSocketId: sourceSocketId || '',
        currentDriverId: null,
        declinedBy: rideInfo?.declinedBy || new Set(),
        cancelled: false,
      };
      dispatchQueues.set(rideData.id, dispatchState);
      dispatchToNextDriver(rideData.id);
    };

  const getCompatibleVehicleTypes = (rideType: string): string[] => {
    const normalizedRideType = normalizeVehicleType(rideType);
    switch (normalizedRideType) {
      case 'economy':
      case 'standard':
      case 'comfort':
      case 'saloon':
        // Saloon requests can be fulfilled by saloon and larger classes
        return ['saloon', 'economy', 'standard', 'comfort', 'people_carrier', 'minibus'];
      case 'people_carrier':
        // People carrier requests can be fulfilled by people carrier and larger
        return ['people_carrier', 'minibus'];
      case 'minibus':
        // Minibus requests must stay minibus-only
        return ['minibus'];
      default:
        return ['saloon', 'economy', 'standard', 'comfort', 'people_carrier', 'minibus'];
    }
  };

  async function buildDispatchState(rideData: any, riderSocketId: string, declinedBy: Set<string>) {
    const pickupLat = rideData.pickupLocation?.latitude || rideData.pickupLatitude || 0;
    const pickupLng = rideData.pickupLocation?.longitude || rideData.pickupLongitude || 0;

    if (!pickupLat || !pickupLng) {
      console.warn(`⚠️ Cannot build dispatch queue for ride ${rideData.id} because pickup coordinates are missing`);
      return null;
    }

    const requestedType = normalizeVehicleType(rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy");
    const compatibleTypes = getCompatibleVehicleTypes(requestedType);

    const heap = new MinHeap();
    const addedDriverIds = new Set<string>();

    const { data: onlineDrivers, error: driversErr } = await supabase
      .from("drivers")
      .select("id, current_latitude, current_longitude, is_available, vehicle_type")
      .eq("is_online", true);

    if (driversErr) {
      console.error(`❌ Could not load online drivers for reassignment of ride ${rideData.id}:`, driversErr);
      return null;
    }

    if (onlineDrivers && onlineDrivers.length > 0) {
      for (const driver of onlineDrivers) {
        if (declinedBy.has(driver.id)) {
          console.log(`   ⏭️ Skipping driver ${driver.id} — already declined or cancelled for ride ${rideData.id}`);
          continue;
        }

        const driverSocketId = connectedDrivers.get(driver.id);

        const driverVehicle = normalizeVehicleType(driver.vehicle_type || 'saloon');
        if (!compatibleTypes.includes(driverVehicle)) {
          console.log(`   ⏭️ Skipping driver ${driver.id} — vehicle "${driverVehicle}" not compatible with "${requestedType}"`);
          continue;
        }

        const driverLocation = await getLatestDriverLocation(rideData.id, driver.id, driverSocketId);
        if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
          const dist = haversineDistanceMiles(
            pickupLat, pickupLng,
            driverLocation.latitude,
            driverLocation.longitude
          );

          console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle}, socket: ${driverSocketId ? "connected" : "background/offline"})`);

          if (dist <= RADIUS_MILES) {
            heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId || "" });
            addedDriverIds.add(driver.id);
          } else {
            console.log(`   ⏭️ Driver ${driver.id} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
          }
        } else {
          console.log(`   ⚠️ Driver ${driver.id} has no known location yet — skipping dispatch`);
        }
      }
    }

    for (const [driverId, socketId] of connectedDrivers) {
      if (addedDriverIds.has(driverId) || declinedBy.has(driverId)) continue;

      let vehicleOk = true;
      try {
        const { data: driverRow } = await supabase
          .from("drivers")
          .select("vehicle_type")
          .eq("id", driverId)
          .maybeSingle();

        if (!driverRow) {
          console.log(`   ⏭️ Skipping socket driver ${driverId} — no matching drivers row`);
          continue;
      }

        const driverVehicle = normalizeVehicleType(driverRow?.vehicle_type || 'saloon');
        if (!compatibleTypes.includes(driverVehicle)) {
          console.log(`   ⏭️ Skipping socket driver ${driverId} — vehicle "${driverVehicle}" not compatible`);
          vehicleOk = false;
        }
      } catch (_) {
        // If we can't look up vehicle type, allow as fallback
      }
      if (!vehicleOk) continue;

      const driverLocation = await getLatestDriverLocation(rideData.id, driverId, socketId);
      if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
        const dist = haversineDistanceMiles(
          pickupLat,
          pickupLng,
          driverLocation.latitude,
          driverLocation.longitude
        );
        if (dist <= RADIUS_MILES) {
          console.log(`   📏 Socket driver ${driverId} is ${dist.toFixed(2)} mi away — eligible for dispatch`);
          heap.push({ driverId, distance: dist, socketId });
          addedDriverIds.add(driverId);
        } else {
          console.log(`   ⏭️ Socket driver ${driverId} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
        }
      } else {
        console.log(`   ⚠️ Socket driver ${driverId} has no known location yet — skipping dispatch`);
      }
    }

    if (heap.size === 0) {
      return null;
    }

    return {
      heap,
      timer: null,
      rideData,
      riderSocketId,
      currentDriverId: null,
      declinedBy,
      cancelled: false,
    } as DispatchState;
  }

  // ─── Scheduled booking → live ride hooks (used by the activation engine) ──

  scheduledRideHooks.getPendingDispatchForDriver = async (rawDriverId: string) => {
    const actualDriverId = await resolveDriverTableId(rawDriverId);
    if (!actualDriverId) return null;

    for (const [, state] of dispatchQueues.entries()) {
      if (state.cancelled || state.currentDriverId !== actualDriverId) continue;
      return {
        ...state.rideData,
        pickupDistance: state.rideData?.pickupDistance || 0,
        _dispatchedTo: actualDriverId,
      };
    }
    return null;
  };

  // Unassigned scheduled booking: dispatch to nearby drivers like an ASAP ride
  scheduledRideHooks.dispatchScheduledRide = async (rideData: any) => {
    const riderSocketId = connectedRiders.get(rideData.riderId) || null;

    // Let the rider app know their scheduled ride is now live (pending a driver)
    try {
      io.to(`rider:${rideData.riderId}`).emit("ride:scheduled_activated", {
        ride: rideData,
        status: "pending",
      });
    } catch (_) { /* non-critical */ }

    await handleRideRequest(rideData, riderSocketId);
  };

  // Scheduled booking already accepted by a driver: put it straight on that
  // driver's home screen in the "accepted" phase (no need to re-accept).
  scheduledRideHooks.activateAcceptedScheduledRide = async (rideData: any, rawDriverId: string): Promise<boolean> => {
    const actualDriverId = await resolveDriverTableId(rawDriverId);
    if (!actualDriverId) {
      console.warn(`⚠️ Cannot activate scheduled ride ${rideData.id} — driver ${rawDriverId} not found`);
      return false;
    }

    const acceptedAt = new Date().toISOString();
    const insertPayload: Record<string, any> = {
      id: rideData.id,
      rider_id: rideData.riderId,
      driver_id: actualDriverId,
      status: "accepted",
      accepted_at: acceptedAt,
      vehicle_type: normalizeVehicleType(rideData.rideType || rideData.vehicleType || "saloon"),
      pickup_address: rideData.pickupLocation?.address || "Unknown",
      pickup_latitude: rideData.pickupLocation?.latitude || 0,
      pickup_longitude: rideData.pickupLocation?.longitude || 0,
      dropoff_address: rideData.dropoffLocation?.address || "Unknown",
      dropoff_latitude: rideData.dropoffLocation?.latitude || 0,
      dropoff_longitude: rideData.dropoffLocation?.longitude || 0,
      estimated_price: rideData.farePrice || rideData.estimatedPrice || 0,
      discount_amount: rideData.discountAmount || 0,
      distance: Math.round(parseFloat(rideData.distanceMiles || 0)),
      estimated_duration: Math.round(parseFloat(rideData.durationMinutes || 0)),
      payment_method: rideData.paymentMethod || "card",
      payment_status: rideData.paymentStatus || null,
      payment_intent_id: rideData.paymentIntentId || null,
      otp: typeof rideData.otp === "string" ? rideData.otp : null,
    };

    // Insert with the same missing-column retry pattern as handleRideRequest
    const payloadToInsert = { ...insertPayload };
    let insertError: any = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await supabase.from("rides").insert(payloadToInsert).select().single();
      insertError = result.error;
      if (!insertError) break;

      if (insertError?.code === "PGRST204") {
        const missingColumn = String(insertError.message || "").match(/'([^']+)'/)?.[1];
        if (missingColumn && Object.prototype.hasOwnProperty.call(payloadToInsert, missingColumn)) {
          delete payloadToInsert[missingColumn];
          console.warn(`⚠️ rides.${missingColumn} missing in schema cache; retrying scheduled ride insert without it`);
          continue;
        }
      }
      break;
    }

    if (insertError) {
      console.error(`❌ Failed to insert live ride for scheduled booking ${rideData.scheduledBookingId}:`, JSON.stringify(insertError));
      return false;
    }

    // Register in-memory state so all live status updates flow normally
    const riderSocketId = connectedRiders.get(rideData.riderId) || "";
    const driverSocketId = connectedDrivers.get(actualDriverId);
    activeRides.set(rideData.id, {
      riderSocketId,
      riderId: rideData.riderId,
      declinedBy: new Set(),
      rideData,
      driverSocketId,
    });

    // Distance from the driver's last known location to the pickup
    let pickupDistance = 0;
    try {
      const driverLocation = await getLatestDriverLocation(rideData.id, actualDriverId, driverSocketId);
      if (driverLocation && rideData.pickupLocation?.latitude && rideData.pickupLocation?.longitude) {
        pickupDistance = Math.round(
          haversineDistanceMiles(
            rideData.pickupLocation.latitude,
            rideData.pickupLocation.longitude,
            driverLocation.latitude,
            driverLocation.longitude,
          ) * 100,
        ) / 100;
      }
    } catch (_) { /* non-critical */ }

    const schedFullFare = Number(rideData.farePrice || rideData.estimatedPrice || 0);
    const schedDiscount = Math.max(0, Number(rideData.discountAmount || 0));
    const schedPayable = getDiscountedFare(schedFullFare, schedDiscount);
    const enrichedRide = {
      ...rideData,
      farePrice: schedPayable,
      estimatedPrice: schedFullFare,
      discountAmount: schedDiscount,
      pickupDistance,
      scheduledPreAccepted: true,
      acceptedAt,
      _dispatchedTo: actualDriverId,
    };

    console.log(`📡 Activating scheduled ride ${rideData.id} for its assigned driver ${actualDriverId}`);
    io.to(`driver:${actualDriverId}`).emit("ride:new", enrichedRide);
    if (rawDriverId !== actualDriverId) {
      io.to(`driver:${rawDriverId}`).emit("ride:new", enrichedRide);
    }

    // Push notification so the driver is alerted even with the app in background
    try {
      const { data: driverRow } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", actualDriverId)
        .single();

      if (driverRow?.user_id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("push_token")
          .eq("id", driverRow.user_id)
          .single();

        if (userRow?.push_token) {
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
              to: userRow.push_token,
              sound: "default",
              title: "🗓 Scheduled Ride Starting",
              body: `Your scheduled pickup from ${rideData.pickupLocation?.address || "the rider"} is in 15 minutes — head to the pickup now.`,
              data: { type: "scheduled_ride_live", rideId: rideData.id, audience: "driver" },
              priority: "high",
              channelId: "uto-scheduled-v2",
            }),
          }).catch((pushErr) => {
            console.warn(`⚠️ Push notification failed for driver ${actualDriverId}:`, pushErr);
          });
        }
      }
    } catch (pushErr) {
      console.warn(`⚠️ Could not send scheduled-ride push to driver ${actualDriverId}:`, pushErr);
    }

    // Tell the rider their scheduled ride is live, including their driver's details
    try {
      const { data: driverProfile } = await supabase
        .from("drivers")
        .select("vehicle_make, vehicle_model, license_plate, rating, user_id")
        .eq("id", actualDriverId)
        .maybeSingle();
      const { data: driverUser } = driverProfile?.user_id
        ? await supabase
          .from("users")
          .select("full_name, phone")
          .eq("id", driverProfile.user_id)
          .maybeSingle()
        : { data: null };

      io.to(`rider:${rideData.riderId}`).emit("ride:scheduled_activated", {
        ride: rideData,
        status: "accepted",
        acceptedAt,
        driverInfo: {
          driverName: driverUser?.full_name || "Your Driver",
          driverPhone: driverUser?.phone || "",
          vehicleInfo: [driverProfile?.vehicle_make, driverProfile?.vehicle_model].filter(Boolean).join(" "),
          licensePlate: driverProfile?.license_plate || "",
          driverRating: driverProfile?.rating || 5.0,
        },
      });
    } catch (riderNotifyErr) {
      console.warn(`⚠️ Could not notify rider about activated scheduled ride ${rideData.id}:`, riderNotifyErr);
    }

    return true;
  };

  // The rider or driver cancelled the scheduled booking after it went live
  scheduledRideHooks.cancelScheduledLiveRide = async (rideId: string, cancelledBy?: string) => {
    // Stop any in-flight dispatch
    const dispState = dispatchQueues.get(rideId);
    if (dispState) {
      if (dispState.timer) clearTimeout(dispState.timer);
      dispState.cancelled = true;
      dispatchQueues.delete(rideId);
      if (dispState.currentDriverId) {
        io.to(`driver:${dispState.currentDriverId}`).emit("ride:expired", { rideId });
      }
      console.log(`🛑 Dispatch queue cancelled for scheduled live ride ${rideId}`);
    }

    try {
      const { data: ride } = await supabase
        .from("rides")
        .select("*")
        .eq("id", rideId)
        .maybeSingle();

      if (ride && !["completed", "cancelled"].includes(ride.status)) {
        await supabase
          .from("rides")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: `Scheduled booking cancelled by ${cancelledBy || "rider"}`,
          })
          .eq("id", rideId);

        const cancelUpdate = { rideId, status: "cancelled", cancellationFee: 0, chargedVia: "none" };
        if (ride.driver_id) {
          io.to(`driver:${ride.driver_id}`).emit("ride:update", cancelUpdate);
        }
        const rideInfo = activeRides.get(rideId);
        if (rideInfo?.driverSocketId) {
          io.to(rideInfo.driverSocketId).emit("ride:update", cancelUpdate);
        }
        if (ride.rider_id) {
          io.to(`rider:${ride.rider_id}`).emit("ride:update", cancelUpdate);
        }
        console.log(`✅ Scheduled live ride ${rideId} cancelled (by ${cancelledBy || "rider"})`);
      }
    } catch (err) {
      console.error(`❌ Failed to cancel scheduled live ride ${rideId}:`, err);
    }

    activeRides.delete(rideId);
  };

  io.on("connection", (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on("driver:connect", async (driverId: string) => {
      // #region agent log
      fetch('http://127.0.0.1:7697/ingest/ce76089c-d795-4060-ab70-2c912a1224d2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'25c155'},body:JSON.stringify({sessionId:'25c155',runId:'pre-fix',hypothesisId:'C',location:'server/socket.ts:driver-connect',message:'Driver connect event',data:{driverId,socketId:socket.id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const actualDriverId = await resolveDriverTableId(driverId);
      if (!actualDriverId) {
        console.warn(`⚠️ driver:connect ignored — ${driverId} is not a valid drivers.id or drivers.user_id`);
        return;
      }
      const connectedDriverId = actualDriverId;
      connectedDrivers.set(connectedDriverId, socket.id);
      socket.join(`driver:${driverId}`);
      socket.join(`driver:${connectedDriverId}`);
      console.log(`🚗 Driver ${connectedDriverId} connected (socket ${socket.id})`);
      console.log(`📊 Total connected drivers: ${connectedDrivers.size}`);

      for (const [rideId, state] of dispatchQueues.entries()) {
        if (state.cancelled || state.currentDriverId !== connectedDriverId) continue;

        const reconnectFull = Number(state.rideData?.farePrice || state.rideData?.estimatedPrice || 0);
        const reconnectDiscount = Math.max(0, Number(state.rideData?.discountAmount || 0));
        const reconnectPayable = getDiscountedFare(reconnectFull, reconnectDiscount);
        const enrichedRide = {
          ...state.rideData,
          farePrice: reconnectPayable,
          estimatedPrice: reconnectFull,
          discountAmount: reconnectDiscount,
          _dispatchedTo: connectedDriverId,
        };

        io.to(socket.id).emit("ride:new", enrichedRide);
        io.to(`driver:${connectedDriverId}`).emit("ride:new", enrichedRide);
        console.log(`🔁 Replayed pending ride ${rideId} to foregrounded driver ${connectedDriverId}`);
      }

      // Re-link driver's socket to any active rides (handles reconnection after Google Maps)
      for (const [rideId, rideInfo] of activeRides.entries()) {
        if (rideInfo.driverSocketId && rideInfo.driverSocketId !== socket.id) {
          // Check if this driver owns this ride via DB
          try {
            const { data: rideRow } = await supabase
              .from("rides")
              .select("driver_id, status")
              .eq("id", rideId)
              .single();
            if (rideRow && rideRow.driver_id === connectedDriverId && ["accepted", "arrived", "in_progress"].includes(rideRow.status)) {
              rideInfo.driverSocketId = socket.id;
              console.log(`🔗 Re-linked driver ${connectedDriverId} socket to active ride ${rideId}`);
            }
          } catch (_) { /* non-critical */ }
        }
      }

      try {
        // Set driver as online AND available when they connect, and update last seen
        const { error } = await supabase
          .from("drivers")
          .update({ is_online: true, is_available: true, last_seen_at: new Date().toISOString() })
          .eq("id", connectedDriverId);
        if (error) {
          console.error("❌ Error updating driver status on connect:", error);
        } else {
          console.log(`✅ Driver ${connectedDriverId} marked online + available in DB`);
        }
      } catch (error) {
        console.error("Error updating driver status:", error);
      }
    });

    // Explicit "go offline" — the ONLY thing that takes a driver offline in the
    // DB. Triggered when the driver toggles themselves offline or logs out.
    // A dropped socket (backgrounding / switching apps) no longer does this.
    socket.on("driver:go_offline", async (driverId: string) => {
      const actualDriverId = await resolveDriverTableId(driverId);
      if (!actualDriverId) {
        console.warn(`⚠️ driver:go_offline ignored — ${driverId} is not a valid driver id`);
        return;
      }
      connectedDrivers.delete(actualDriverId);
      try {
        await supabase
          .from("drivers")
          .update({ is_online: false, is_available: false })
          .eq("id", actualDriverId);
        console.log(`🔴 Driver ${actualDriverId} went OFFLINE explicitly`);
      } catch (error) {
        console.error("Error setting driver offline:", error);
      }
      // #region agent log
      fetch('http://127.0.0.1:7697/ingest/ce76089c-d795-4060-ab70-2c912a1224d2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'25c155'},body:JSON.stringify({sessionId:'25c155',runId:'post-fix',hypothesisId:'C',location:'server/socket.ts:go_offline',message:'Driver explicitly offline',data:{driverId:actualDriverId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    });

    socket.on("rider:connect", (riderId: string) => {
      connectedRiders.set(riderId, socket.id);
      socket.join(`rider:${riderId}`);
      console.log(`🙋 Rider ${riderId} connected`);
    });

    socket.on("rider:request_driver_location", async (data: { riderId: string; rideId: string }) => {
      try {

        const { data: ride, error: rideErr } = await supabase
          .from("rides")
          .select("id, rider_id, driver_id, status")
          .eq("id", data.rideId)
          .maybeSingle();

        if (rideErr || !ride) {
          const rideInfo = activeRides.get(data.rideId);
          if (!rideInfo || rideInfo.riderId !== data.riderId) {
            console.warn(`⚠️ Driver location request: no active in-memory ride for ${data.rideId}`);
            return;
          }

          const driverId = getDriverIdForSocket(rideInfo.driverSocketId);
          const payload = await getLatestDriverLocation(data.rideId, driverId, rideInfo.driverSocketId);

          if (payload) {
            io.to(socket.id).emit("driver:location", payload);
          } else {
            console.warn(`⚠️ Driver location request: no real driver coordinates for ride ${data.rideId}`);
          }
          return;
        }

        if (ride.rider_id !== data.riderId) {
          return;
        }

        if (!ride.driver_id || !["accepted", "arriving", "arrived", "in_progress"].includes(ride.status)) {
          const rideInfo = activeRides.get(ride.id);
          const activeDriverId = getDriverIdForSocket(rideInfo?.driverSocketId);
          if (activeDriverId) {
            const payload = await getLatestDriverLocation(ride.id, activeDriverId, rideInfo?.driverSocketId);
            if (payload) {
            io.to(socket.id).emit("driver:location", payload);
            return;
          }
        }

          console.log(`ℹ️ Driver location request: ride ${data.rideId} has no active assigned driver. status=${ride.status}, driver_id=${ride.driver_id}`);
          return;
        }

        const rideInfo = activeRides.get(ride.id);
        const payload = await getLatestDriverLocation(ride.id, ride.driver_id, rideInfo?.driverSocketId);
        if (payload) {
          io.to(socket.id).emit("driver:location", payload);
        } else {
          console.warn(`⚠️ Driver location request: no real coordinates for driver ${ride.driver_id} on ride ${ride.id}`);
        }
      } catch (err) {
        console.error("❌ Error handling rider driver-location request:", err);
      }
    });

    socket.on("driver:location", async (location: DriverLocation) => {
      try {
        const actualDriverId = await resolveDriverTableId(location.driverId);
        if (!actualDriverId) {
          console.warn(`⚠️ driver:location ignored — ${location.driverId} is not a valid drivers.id or drivers.user_id`);
          return;
        }

        const normalizedLocation = {
          ...location,
          driverId: actualDriverId,
        };
        latestDriverLocations.set(actualDriverId, normalizedLocation);
        latestDriverLocations.set(socket.id, normalizedLocation);

        await supabase
          .from("drivers")
          .update({
            current_latitude: normalizedLocation.latitude,
            current_longitude: normalizedLocation.longitude,
            last_seen_at: new Date().toISOString()
          })
          .eq("id", actualDriverId);

        await supabase.from("driver_locations").insert({
          driver_id: actualDriverId,
          latitude: normalizedLocation.latitude,
          longitude: normalizedLocation.longitude,
          heading: normalizedLocation.heading,
          speed: normalizedLocation.speed,
        });

        const { data: activeRidesData } = await supabase
          .from("rides")
          .select("*")
          .eq("driver_id", actualDriverId);

        const notifiedRiders = new Set<string>();
        for (const ride of (activeRidesData || [])) {
          if (["accepted", "arriving", "arrived", "in_progress"].includes(ride.status)) {
            io.to(`rider:${ride.rider_id}`).emit("driver:location", {
              ...normalizedLocation,
              rideId: ride.id,
            });
            notifiedRiders.add(ride.rider_id);
          }
        }

        for (const [rideId, rideInfo] of activeRides.entries()) {
          if (rideInfo.driverSocketId === socket.id) {
            const payload = {
              ...normalizedLocation,
              rideId,
            };
            if (rideInfo.riderSocketId) {
              io.to(rideInfo.riderSocketId).emit("driver:location", payload);
            }
            if (rideInfo.riderId && !notifiedRiders.has(rideInfo.riderId)) {
              io.to(`rider:${rideInfo.riderId}`).emit("driver:location", payload);
              notifiedRiders.add(rideInfo.riderId);
            }
          }
        }
      } catch (error) {
        console.error("Error updating driver location:", error);
      }
    });

    socket.on("ride:request", async (rideData: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7697/ingest/ce76089c-d795-4060-ab70-2c912a1224d2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'25c155'},body:JSON.stringify({sessionId:'25c155',runId:'pre-fix',hypothesisId:'C',location:'server/socket.ts:ride-request',message:'Ride request event',data:{rideId:rideData?.id,riderId:rideData?.riderId,paymentMethod:rideData?.paymentMethod},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      await handleRideRequest(rideData, socket.id);
    });

    socket.on("ride:declined", async (data: { rideId: string, rideData?: any, driverId?: string }) => {
      console.log('❌ Ride declined by driver:', data.driverId, 'for ride:', data.rideId);
      const rideInfo = activeRides.get(data.rideId);
      const dispState = dispatchQueues.get(data.rideId);

      if (rideInfo && data.driverId) {
        rideInfo.declinedBy.add(data.driverId);
      }

      // Advance the dispatch queue to the next nearest driver
      if (dispState) {
        if (dispState.timer) clearTimeout(dispState.timer);
        if (data.driverId) {
          dispState.declinedBy.add(data.driverId);
        }
        console.log(`⏭️ Driver ${data.driverId} declined — dispatching to next nearest driver`);
        dispatchToNextDriver(data.rideId);
      }
    });

    socket.on("ride:driver_cancel_at_pickup", async (data: { rideId: string, driverId?: string, applyPenalty?: boolean, cancelledFrom?: string }) => {


      try {
        const { data: ride, error: rideFetchErr } = await supabase
          .from("rides")
          .select("*")
          .eq("id", data.rideId)
          .single();

        if (ride) {
          const actualDriverId =
            await resolveDriverTableId(data.driverId || getDriverIdForSocket(socket.id) || ride.driver_id);
          // Penalty is 50% of the discounted (payable) fare when a coupon was applied.
          // This is deducted from the DRIVER only — the rider is never charged on driver cancel.
          const penaltyAmount = getDriverCancelPenalty(
            ride.estimated_price || 0,
            (ride as any).discount_amount || 0,
          );
          const deductionAmount = -Math.abs(penaltyAmount);

          if (data.applyPenalty && penaltyAmount > 0 && actualDriverId) {
            try {
              // Deduct penalty from driver's total_earnings
              const { data: driverData } = await supabase
                .from("drivers")
                .select("total_earnings")
                .eq("id", actualDriverId)
                .single();
              const currentEarnings = Number(driverData?.total_earnings || 0);
              const newEarnings = Number((currentEarnings - penaltyAmount).toFixed(2));
              const { error: earningsUpdateErr } = await supabase
                .from("drivers")
                .update({ total_earnings: newEarnings })
                .eq("id", actualDriverId);

              // Create deduction record
              const deductionLabel = formatLiveRideCancellationPenalty(data.rideId);
              try {
                await upsertDriverPenaltyDeduction(supabase, {
                  driverId: actualDriverId,
                  amount: deductionAmount,
                  type: DRIVER_DEDUCTION_TYPE.PENALTY,
                  reason: deductionLabel,
                });
              } catch (deductionErr) {
                console.error(`❌ Failed to create driver deduction for ride ${data.rideId}:`, deductionErr);
              }
            } catch (penaltyErr) {
              console.error(`❌ Failed to apply cancellation penalty to driver ${actualDriverId}:`, penaltyErr);
            }
          }

          const rideInfo = activeRides.get(data.rideId);
          const declinedBy = rideInfo?.declinedBy || new Set<string>();
          if (actualDriverId) {
            declinedBy.add(actualDriverId);
          }

          // Remove the current driver assignment and reset the ride to pending.
          // Do NOT charge the rider — driver cancel never imposes rider fees.
          await supabase
            .from("rides")
            .update({
              status: "pending",
              driver_id: null,
              accepted_at: null,
              arrived_at: null,
              cancelled_by: null,
              cancellation_fee: 0,
            })
            .eq("id", data.rideId);

          if (ride.rider_id) {
            const riderDriverCancelledPayload = {
              rideId: data.rideId,
              status: "pending",
              driverCancelled: true,
              driverId: null,
              cancellationFee: 0,
              chargedVia: "none",
              cancelledBy: "driver",
            };
            io.to(`rider:${ride.rider_id}`).emit("ride:update", riderDriverCancelledPayload);
            if (rideInfo?.riderSocketId) {
              io.to(rideInfo.riderSocketId).emit("ride:update", riderDriverCancelledPayload);
            }
          }

          if (actualDriverId) {
            io.to(`driver:${actualDriverId}`).emit("ride:expired", { rideId: data.rideId });
          }

          const existingDispatch = dispatchQueues.get(data.rideId);
          if (existingDispatch) {
            if (existingDispatch.timer) clearTimeout(existingDispatch.timer);
            existingDispatch.cancelled = false;
            existingDispatch.declinedBy = declinedBy;
            console.log(`🔃 Reassigning ride ${data.rideId} after cancellation by driver ${actualDriverId || data.driverId}`);
            return dispatchToNextDriver(data.rideId);
          }

          const riderSocketId = rideInfo?.riderSocketId || connectedRiders.get(ride.rider_id) || "";
          const rideData = rideInfo?.rideData || buildRideDataFromDbRide(ride);
          activeRides.set(data.rideId, {
            riderSocketId,
            riderId: ride.rider_id,
            declinedBy,
            rideData,
          });

          const newDispatchState = await buildDispatchState(rideData, riderSocketId, declinedBy);
          if (newDispatchState) {
            dispatchQueues.set(data.rideId, newDispatchState);
            console.log(`🔃 Reassigning ride ${data.rideId} to next available driver after cancellation`);
            return dispatchToNextDriver(data.rideId);
          }

          console.log(`🚫 No remaining available drivers to reassign ride ${data.rideId}`);

          // Fully cancel with zero rider charge; release any leftover card hold.
          const paymentStatus = String(ride.payment_status || "").toLowerCase();
          const alreadyCaptured = new Set([
            "prepaid",
            "prepaid_retained",
            "card_charged",
            "card_captured",
            "paid",
            "succeeded",
          ]).has(paymentStatus);
          let paymentStatusUpdate = "cancelled_driver_no_rider_charge";
          if (
            ride.payment_method === "card" &&
            ride.payment_intent_id &&
            !alreadyCaptured
          ) {
            const releaseResult = await releaseAuthorization(ride.payment_intent_id);
            if (releaseResult.success) {
              paymentStatusUpdate = "authorization_released";
            }
          }

          const { data: rideForNotify } = await supabase
            .from("rides")
            .select("rider_id")
            .eq("id", data.rideId)
            .single();
          if (rideForNotify?.rider_id) {
            io.to(`rider:${rideForNotify.rider_id}`).emit("ride:update", {
              rideId: data.rideId,
              status: "cancelled_no_drivers",
              cancellationFee: 0,
              chargedVia: "none",
              cancelledBy: "driver",
            });
          }

          await supabase
            .from("rides")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              cancelled_by: "driver",
              cancellation_fee: 0,
              payment_status: paymentStatusUpdate,
            })
            .eq("id", data.rideId);
          io.emit("ride:update", {
            rideId: data.rideId,
            status: "cancelled_no_drivers",
            cancellationFee: 0,
            chargedVia: "none",
            cancelledBy: "driver",
          });

          // If this was a scheduled booking, release it back to the pool so
          // other drivers can pick it up on the next activation cycle.
          await releaseScheduledBookingAssignment(data.rideId);
        }
      } catch (err) {
        console.error("Error processing driver cancel at pickup:", err);
      }
    });

    socket.on("ride:accept", async (data: { rideId: string; driverId: string }) => {
      console.log('✅ Ride accepted:', data.rideId, 'by driver:', data.driverId);

      const actualDriverId = await resolveDriverTableId(data.driverId);
      if (!actualDriverId) {
        console.warn(`⚠️ ride:accept ignored — driver_id ${data.driverId} not found in drivers table`);
        return;
      }

      if (actualDriverId !== data.driverId) {
        console.log(`🔄 ride:accept — Resolved auth user_id ${data.driverId} → driver table id ${actualDriverId}`);
      }

      // Cancel the dispatch queue — ride is taken
      const dispState = dispatchQueues.get(data.rideId);
      if (dispState) {
        if (dispState.timer) clearTimeout(dispState.timer);
        dispState.cancelled = true;
        dispatchQueues.delete(data.rideId);
        console.log(`🛑 Dispatch queue cancelled for ride ${data.rideId} — accepted by ${data.driverId}`);
      }

      // Store the driver socket for this ride in the active rides map
      const rideInfo = activeRides.get(data.rideId);
      if (rideInfo) {
        rideInfo.driverSocketId = socket.id;
      }

      try {
        const acceptedAt = new Date().toISOString();
        const updatePayload: Record<string, any> = {
          driver_id: actualDriverId,
          status: "accepted",
          accepted_at: acceptedAt,
        };

        const { error: acceptUpdateError } = await supabase
          .from("rides")
          .update(updatePayload)
          .eq("id", data.rideId);

        if (acceptUpdateError) {
          console.error("❌ Failed to update ride on accept:", acceptUpdateError);
        } else {
          console.log(`✅ Ride ${data.rideId} driver_id=${actualDriverId} saved to Supabase on accept`);
        }

        // If this live ride came from a scheduled booking, mark the booking accepted too
        if (isScheduledLiveRideId(data.rideId)) {
          syncScheduledBookingForRide(data.rideId, "driver_accepted", {
            driver_id: actualDriverId,
            assigned_driver_id: actualDriverId,
          }).catch((syncErr) => {
            console.warn(`⚠️ Scheduled booking sync failed on accept for ride ${data.rideId}:`, syncErr);
          });
        }

        const { data: ride } = await supabase
          .from("rides")
          .select("*")
          .eq("id", data.rideId)
          .single();

        if (ride) {
          const driverLocation = await getLatestDriverLocation(data.rideId, actualDriverId, socket.id);
          const { data: driverProfile } = await supabase
            .from("drivers")
            .select("vehicle_make, vehicle_model, license_plate, rating, user_id")
            .eq("id", actualDriverId)
            .maybeSingle();
          const { data: driverUser } = driverProfile?.user_id
            ? await supabase
              .from("users")
              .select("full_name, phone")
              .eq("id", driverProfile.user_id)
              .maybeSingle()
            : { data: null };
          const driverInfo = {
            driverName: driverUser?.full_name || "Your Driver",
            driverPhone: driverUser?.phone || "",
            vehicleInfo: [driverProfile?.vehicle_make, driverProfile?.vehicle_model].filter(Boolean).join(" "),
            licensePlate: driverProfile?.license_plate || "",
            driverRating: driverProfile?.rating || 5.0,
          };
          const acceptedPayload = {
            rideId: data.rideId,
            driverId: actualDriverId,
            acceptedAt,
            driverInfo,
            driverLocation,
          };

          io.to(`rider:${ride.rider_id}`).emit("ride:accepted", acceptedPayload);
          if (rideInfo?.riderSocketId) {
            io.to(rideInfo.riderSocketId).emit("ride:accepted", acceptedPayload);
          }
          if (driverLocation) {
            io.to(`rider:${ride.rider_id}`).emit("driver:location", driverLocation);
            if (rideInfo?.riderSocketId) {
              io.to(rideInfo.riderSocketId).emit("driver:location", driverLocation);
            }
          } else {
            console.warn(`⚠️ ride:accept — no current or last received location for driver ${actualDriverId}`);
          }
        }
      } catch (error) {
        console.error("Error accepting ride:", error);
      }
    });

    socket.on("ride:status", async (update: RideUpdate) => {
      console.log('📊 Ride status update:', update.rideId, '→', update.status, 'driverInfo:', (update as any).driverInfo ? 'present' : 'absent');

      try {
        // ─── Resolve driver ID from multiple sources ─────────────────────────────────────
        // Priority 1: driverId sent directly in the payload from the client
        let resolvedDriverId: string | null = (update as any).driverId || null;

        // Priority 2: Look up the driver from the socket map
        if (!resolvedDriverId) {
          for (const [dId, sId] of connectedDrivers.entries()) {
            if (sId === socket.id) {
              resolvedDriverId = dId;
              break;
            }
          }
          if (resolvedDriverId) {
            console.log(`🔍 Resolved driver_id from socket map: ${resolvedDriverId}`);
          }
        } else {
          console.log(`🔍 Using driver_id from payload: ${resolvedDriverId}`);
        }

        // Priority 3: Look up the driver from the active rides in-memory map (set during dispatch/accept)
        if (!resolvedDriverId) {
          const rideInfo = activeRides.get(update.rideId);
          if (rideInfo?.driverSocketId) {
            for (const [dId, sId] of connectedDrivers.entries()) {
              if (sId === rideInfo.driverSocketId) {
                resolvedDriverId = dId;
                console.log(`🔍 Resolved driver_id from activeRides driver socket: ${resolvedDriverId}`);
                break;
              }
            }
          }
        }

        // Priority 4: Look up in DB ride record (already stored driver_id)
        if (!resolvedDriverId) {
          try {
            const { data: existingRide } = await supabase
              .from("rides")
              .select("driver_id")
              .eq("id", update.rideId)
              .single();
            if (existingRide?.driver_id) {
              resolvedDriverId = existingRide.driver_id;
              console.log(`🔍 Resolved driver_id from DB ride record: ${resolvedDriverId}`);
            }
          } catch (_) {
            console.warn(`⚠️ Could not look up driver_id from DB for ride ${update.rideId}`);
          }
        }

        // Priority 5: Ensure the resolved ID is a real drivers.id, resolving auth user_id if needed.
        if (resolvedDriverId) {
          const driverTableId = await resolveDriverTableId(resolvedDriverId);
          if (driverTableId) {
            if (driverTableId !== resolvedDriverId) {
              console.log(`🔄 Resolved auth user_id ${resolvedDriverId} → driver table id ${driverTableId}`);
            }
            resolvedDriverId = driverTableId;
          } else {
            console.warn(`⚠️ driver_id ${resolvedDriverId} not found in drivers table (neither as id nor user_id)`);
            resolvedDriverId = null;
          }
        }

        console.log(`🔍 Final resolved driver_id for ride ${update.rideId}: ${resolvedDriverId || 'NOT FOUND'}`);

        if (update.status === "accepted" && !resolvedDriverId) {
          console.warn(`⚠️ Ignoring accepted status for ride ${update.rideId} because no valid drivers.id was resolved`);
          return;
        }

        try {
          const updateData: any = { status: update.status };

          if (update.status === "accepted") {
            // Save driver_id and driver details when a driver accepts
            if (resolvedDriverId) {
              updateData.driver_id = resolvedDriverId;
              console.log(`✅ Saving driver_id=${resolvedDriverId} to ride ${update.rideId} on accept`);
            } else {
              console.warn(`⚠️ Could not resolve driver_id from socket ${socket.id} on accept`);
            }
            updateData.accepted_at = new Date().toISOString();
            (update as any).acceptedAt = updateData.accepted_at;

            if (resolvedDriverId) {
              const driverLocation = await getLatestDriverLocation(update.rideId, resolvedDriverId, socket.id);
              if (driverLocation) {
                (update as any).driverLocation = driverLocation;
              } else {
                console.warn(`⚠️ Could not attach current or last received location on accept for driver ${resolvedDriverId}`);
              }

              const { data: driverProfile } = await supabase
                .from("drivers")
                .select("vehicle_make, vehicle_model, license_plate, rating, user_id")
                .eq("id", resolvedDriverId)
                .maybeSingle();
              const { data: driverUser } = driverProfile?.user_id
                ? await supabase
                  .from("users")
                  .select("full_name, phone")
                  .eq("id", driverProfile.user_id)
                  .maybeSingle()
                : { data: null };

              (update as any).driverInfo = {
                ...(update as any).driverInfo,
                driverName: (update as any).driverInfo?.driverName || driverUser?.full_name || "Your Driver",
                driverPhone: (update as any).driverInfo?.driverPhone || driverUser?.phone || "",
                vehicleInfo: (update as any).driverInfo?.vehicleInfo || [driverProfile?.vehicle_make, driverProfile?.vehicle_model].filter(Boolean).join(" "),
                licensePlate: (update as any).driverInfo?.licensePlate || driverProfile?.license_plate || "",
                driverRating: (update as any).driverInfo?.driverRating || driverProfile?.rating || 5.0,
              };
            }
          }
          else if (update.status === "arrived") {
            // Also persist driver_id on arrived status to ensure it is saved
            if (resolvedDriverId) updateData.driver_id = resolvedDriverId;
            updateData.arrived_at = new Date().toISOString();
          }
          else if (update.status === "in_progress") {
            updateData.started_at = new Date().toISOString();
            // Keep driver_id set if not already saved
            if (resolvedDriverId) updateData.driver_id = resolvedDriverId;

            // (arrived timer clear logic removed as it's now client-side)
          }
          else if (update.status === "completed") {
            updateData.completed_at = new Date().toISOString();
            updateData.payment_status = "completed";
            updateData.payment_method = "card";
            // Ensure driver_id is ALWAYS set on completion
            if (resolvedDriverId) updateData.driver_id = resolvedDriverId;
            if (typeof update.earlyCompletionReason === "string" && update.earlyCompletionReason.trim()) {
              updateData.cancellation_reason = update.earlyCompletionReason.trim();
            }

            // Waiting charge from driver client; final_price is set below from discounted fare + waiting.
            const waitingCharge = (update as any).waitingCharge || 0;
            const clientTotalFare = (update as any).totalFare || 0;
            if (waitingCharge > 0 || clientTotalFare > 0) {
              console.log(`💰 Completion waiting charge: £${waitingCharge}, client totalFare: £${clientTotalFare}`);
            }
            // (arrived timer clear logic removed as it's now client-side)

            // ─── Charge rider card once on trip completion (ASAP rides) ──────────────
            try {
              const { data: completedRide } = await supabase
                .from("rides")
                .select("rider_id, estimated_price, final_price, payment_method, payment_intent_id, payment_status, discount_amount")
                .eq("id", update.rideId)
                .single();

              const fullFare = Number(completedRide?.estimated_price || 0);
              const discount = Math.max(0, Number((completedRide as any)?.discount_amount || 0));
              const waitingChargeAmt = Number(waitingCharge || 0);
              const rideInfo = activeRides.get(update.rideId);
              const walletDeduction = Math.max(0, Number(rideInfo?.rideData?.walletDeduction || 0));
              // Payable fare is always the coupon-adjusted amount (+ waiting).
              // Do not trust clientTotalFare for the base (it may already be discounted).
              const payableBase = getDiscountedFare(fullFare, discount);
              const finalPayable = Number((payableBase + waitingChargeAmt).toFixed(2));
              const completedFare = Number(Math.max(0, finalPayable - walletDeduction).toFixed(2));
              // Persist the coupon-adjusted final so history/earnings stay consistent.
              updateData.final_price = finalPayable;
              const paymentStatus = String(completedRide?.payment_status || "").toLowerCase();
              const alreadyCaptured = new Set([
                "prepaid",
                "prepaid_retained",
                "card_charged",
                "card_captured",
                "paid",
                "succeeded",
              ]).has(paymentStatus);
              const isCardRide = (completedRide?.payment_method || "card") === "card";

              if (completedRide && completedFare > 0 && completedRide.rider_id && !alreadyCaptured && isCardRide) {
                const { data: riderUser } = await supabase
                  .from("users")
                  .select("stripe_customer_id, wallet_balance")
                  .eq("id", completedRide.rider_id)
                  .single();

                // Apply wallet deduction at completion (not at booking).
                if (walletDeduction > 0 && riderUser) {
                  const currentBalance = Number(riderUser.wallet_balance || 0);
                  const newBalance = Number((currentBalance - walletDeduction).toFixed(2));
                  await supabase
                    .from("users")
                    .update({ wallet_balance: newBalance })
                    .eq("id", completedRide.rider_id);
                  try {
                    await supabase.from("wallet_transactions").insert({
                      user_id: completedRide.rider_id,
                      ride_id: update.rideId,
                      amount: walletDeduction,
                      type: "debit",
                      description: "Wallet applied to ride fare",
                    });
                  } catch (_) { /* non-critical */ }
                }

                let chargeResult: { success: boolean; paymentIntentId?: string; error?: string };
                if (completedRide.payment_intent_id) {
                  // Legacy rides that still have a booking-time authorization hold.
                  chargeResult = await capturePaymentIntent(completedRide.payment_intent_id, completedFare);
                  if (!chargeResult.success && riderUser?.stripe_customer_id) {
                    console.warn(`⚠️ Capture failed for ride ${update.rideId}: ${chargeResult.error}. Falling back to saved-card charge.`);
                    await releaseAuthorization(completedRide.payment_intent_id).catch(() => {});
                    chargeResult = await chargeSavedCard(
                      riderUser.stripe_customer_id,
                      completedFare,
                      update.rideId,
                      "gbp",
                      "ride_fare"
                    );
                  }
                } else if (riderUser?.stripe_customer_id) {
                  console.log(`💳 Charging saved card on trip completion for ride ${update.rideId}: £${completedFare}${discount > 0 ? ` (incl. £${discount.toFixed(2)} coupon discount)` : ""}`);
                  chargeResult = await chargeSavedCard(
                    riderUser.stripe_customer_id,
                    completedFare,
                    update.rideId,
                    "gbp",
                    "ride_fare"
                  );
                } else {
                  chargeResult = { success: false, error: "No saved card on file for rider" };
                }

                if (chargeResult.success) {
                  updateData.payment_status = completedRide.payment_intent_id ? "card_captured" : "card_charged";
                  updateData.payment_intent_id = chargeResult.paymentIntentId;
                  console.log(`✅ Card charged £${completedFare} for ride ${update.rideId} (PI: ${chargeResult.paymentIntentId})`);

                  await supabase.from("payments").insert({
                    ride_id: update.rideId,
                    user_id: completedRide.rider_id,
                    amount: completedFare,
                    currency: "gbp",
                    status: "succeeded",
                    payment_method: "card",
                    stripe_payment_intent_id: chargeResult.paymentIntentId || null,
                    completed_at: new Date().toISOString(),
                  });
                } else {
                  console.warn(`⚠️ Card charge failed for ride ${update.rideId}: ${chargeResult.error}`);
                  updateData.payment_status = "card_charge_failed";
                }
              } else if (alreadyCaptured) {
                updateData.payment_status = completedRide?.payment_status || "prepaid";
                console.log(`💳 Ride ${update.rideId} was already charged — skipping completion-time card charge`);
              } else if (completedRide && walletDeduction > 0 && completedFare <= 0 && !alreadyCaptured) {
                updateData.payment_status = "paid";
                console.log(`💳 Ride ${update.rideId} fully covered by wallet — no card charge needed`);
              }
            } catch (cardChargeErr) {
              console.error(`❌ Card charge error on ride completion:`, cardChargeErr);
            }
          }
          else if (update.status === "cancelled") {
            updateData.cancelled_at = new Date().toISOString();

            // ── Server-side cancellation fee processing ──────────────────────
            // Rider fee ONLY when the rider cancels after driver arrival + 1 free minute.
            // Driver-initiated cancels must NEVER charge the rider (ASAP or otherwise).
            try {
              const { data: cancelledRide, error: cancelledRideErr } = await supabase
                .from("rides")
                .select("rider_id, driver_id, status, accepted_at, arrived_at, estimated_price, final_price, payment_method, payment_intent_id, payment_status, discount_amount")
                .eq("id", update.rideId)
                .single();

              const arrivedAt = cancelledRide?.arrived_at
                ? new Date(cancelledRide.arrived_at).getTime()
                : 0;
              const arrivedElapsedMs = arrivedAt ? Date.now() - arrivedAt : 0;
              const isAfterFreeMinute = arrivedAt > 0 && arrivedElapsedMs >= 60_000;
              const isDriverAlreadyAtPickup = cancelledRide && ["arrived", "at_pickup", "in_progress"].includes(cancelledRide.status);
              const cancelledByRaw = String((update as any).cancelledBy || "").toLowerCase();
              const emitterIsDriverSocket = Array.from(connectedDrivers.values()).includes(socket.id);
              // Never trust a "rider" cancel flag that arrives from a driver socket.
              const driverInitiatedCancellation =
                cancelledByRaw === "driver" ||
                (emitterIsDriverSocket && cancelledByRaw !== "rider");
              const riderInitiatedCancellation =
                cancelledByRaw === "rider" && !driverInitiatedCancellation;
              const resolvedCancelledBy = riderInitiatedCancellation
                ? "rider"
                : driverInitiatedCancellation
                  ? "driver"
                  : (cancelledByRaw || "unknown");
              (update as any).cancelledBy = resolvedCancelledBy;
              updateData.cancelled_by = resolvedCancelledBy;
              const cancellationPaymentStatus = String(cancelledRide?.payment_status || "").toLowerCase();
              const cancellationAlreadyCaptured = new Set([
                "prepaid",
                "prepaid_retained",
                "card_charged",
                "card_captured",
                "paid",
                "succeeded",
              ]).has(cancellationPaymentStatus);
              // Product rule: free cancel until driver arrives, then 1 free minute
              // after arrival. Charge only after that window — and only for rider cancels.
              const shouldChargeCancellationFee =
                !!cancelledRide &&
                riderInitiatedCancellation &&
                !driverInitiatedCancellation &&
                isDriverAlreadyAtPickup &&
                isAfterFreeMinute;

              if (cancelledRide && shouldChargeCancellationFee) {
                // Always base rider cancel fee on the coupon-adjusted fare.
                // Prefer estimated_price (pre-discount) + discount_amount so we
                // never double-subtract if final_price was already discounted.
                const discount = Math.max(0, Number((cancelledRide as any).discount_amount || 0));
                const cancellationFeeAmount = getDiscountedFare(
                  cancelledRide.estimated_price || cancelledRide.final_price || 0,
                  discount,
                );
                const riderId = cancelledRide.rider_id;
                const rideInfo = activeRides.get(update.rideId);
                const walletDeductionAlreadyTaken = Math.max(0, Number(rideInfo?.rideData?.walletDeduction || 0));
                const walletAdjustmentAmount = Number((cancellationFeeAmount - walletDeductionAlreadyTaken).toFixed(2));
                const walletDebitAmount = Math.max(0, walletAdjustmentAmount);

                if (riderId && cancellationFeeAmount > 0) {

                  (update as any).cancellationFee = cancellationFeeAmount;
                  (update as any).chargedAmount = walletDebitAmount;
                  (update as any).walletAdjustment = walletAdjustmentAmount;
                  (update as any).cancellationPolicy = "after_free_minute";

                  let cardCaptureSuccess = false;
                  let capturedPaymentIntentId: string | undefined;

                  if (cancellationAlreadyCaptured) {
                    cardCaptureSuccess = true;
                    capturedPaymentIntentId = cancelledRide.payment_intent_id || undefined;
                    updateData.payment_status = "prepaid_retained";
                    (update as any).chargedVia = "prepaid";
                    (update as any).chargedAmount = cancellationFeeAmount;
                  } else if (cancelledRide.payment_method === "card" && cancelledRide.payment_intent_id) {
                    const captureResult = await capturePaymentIntent(cancelledRide.payment_intent_id, cancellationFeeAmount);
                    cardCaptureSuccess = captureResult.success;
                    capturedPaymentIntentId = captureResult.paymentIntentId;
                    if (cardCaptureSuccess) {
                      updateData.payment_status = "cancellation_fee_card_captured";
                      updateData.payment_intent_id = capturedPaymentIntentId;
                      (update as any).chargedVia = "card";
                      (update as any).chargedAmount = cancellationFeeAmount;
                    } else {
                      console.warn(`⚠️ Cancellation fee card capture failed for ride ${update.rideId}: ${captureResult.error}`);
                    }
                  } else if (cancelledRide.payment_method === "card" && walletDebitAmount > 0) {
                    const { data: riderUser } = await supabase
                      .from("users")
                      .select("stripe_customer_id")
                      .eq("id", riderId)
                      .single();
                    if (riderUser?.stripe_customer_id) {
                      const chargeResult = await chargeSavedCard(
                        riderUser.stripe_customer_id,
                        walletDebitAmount,
                        update.rideId,
                        "gbp",
                        "cancellation_fee"
                      );
                      cardCaptureSuccess = chargeResult.success;
                      capturedPaymentIntentId = chargeResult.paymentIntentId;
                      if (cardCaptureSuccess) {
                        updateData.payment_status = "cancellation_fee_card_charged";
                        updateData.payment_intent_id = capturedPaymentIntentId;
                        (update as any).chargedVia = "card";
                        (update as any).chargedAmount = walletDebitAmount;
                      } else {
                        console.warn(`⚠️ Cancellation fee card charge failed for ride ${update.rideId}: ${chargeResult.error}`);
                      }
                    }
                  }

                  if (!cardCaptureSuccess) {
                    try {
                      const { data: userRow } = await supabase
                        .from("users")
                        .select("wallet_balance")
                        .eq("id", riderId)
                        .single();

                      const currentBalance = Number(userRow?.wallet_balance || 0);
                      const newBalance = Number((currentBalance - walletAdjustmentAmount).toFixed(2));

                      await supabase
                        .from("users")
                        .update({ wallet_balance: newBalance })
                        .eq("id", riderId);

                      updateData.payment_status = "cancellation_fee_wallet_charged";
                      (update as any).chargedVia = "wallet";
                      (update as any).chargedAmount = walletDebitAmount;
                      (update as any).walletBalance = newBalance;
                    } catch (walletErr) {
                      console.error("❌ Failed to adjust wallet for cancellation fee:", walletErr);
                    }
                  }

                  if ((update as any).chargedVia === "wallet" && walletAdjustmentAmount !== 0) {
                    try {
                      const { error: walletTxnErr } = await supabase
                        .from("wallet_transactions")
                        .insert({
                          user_id: riderId,
                          ride_id: update.rideId,
                          amount: Math.abs(walletAdjustmentAmount),
                          type: walletAdjustmentAmount > 0 ? "debit" : "credit",
                          description: walletAdjustmentAmount > 0
                            ? `100% Cancellation fee (£${cancellationFeeAmount.toFixed(2)})`
                            : `Refund unused wallet deduction after 100% cancellation fee (£${cancellationFeeAmount.toFixed(2)})`,
                        });
                    } catch (txnErr) {
                      console.warn("⚠️ Failed to insert cancellation fee wallet transaction:", txnErr);
                    }
                  }

                  if ((update as any).chargedVia === "card") {
                    try {
                      await supabase.from("payments").insert({
                        ride_id: update.rideId,
                        user_id: riderId,
                        amount: cancellationFeeAmount,
                        currency: "gbp",
                        status: "succeeded",
                        payment_method: "card",
                        stripe_payment_intent_id: capturedPaymentIntentId || cancelledRide.payment_intent_id,
                        completed_at: new Date().toISOString(),
                      });
                    } catch (paymentErr) {
                      console.warn("⚠️ Failed to insert cancellation card payment record:", paymentErr);
                    }
                  }

                  // Credit driver earnings with the 100% cancellation fee when rider cancels.
                  if (cancelledRide.driver_id) {
                    try {
                      const { data: driverData } = await supabase
                        .from("drivers")
                        .select("total_earnings")
                        .eq("id", cancelledRide.driver_id)
                        .single();

                      const currentEarnings = Number(driverData?.total_earnings || 0);
                      const newEarnings = Number((currentEarnings + cancellationFeeAmount).toFixed(2));

                      const { error: driverEarningsErr } = await supabase
                        .from("drivers")
                        .update({ total_earnings: newEarnings })
                        .eq("id", cancelledRide.driver_id);

                    } catch (earningsErr) {
                      console.error("❌ Failed to update driver earnings on cancellation:", earningsErr);
                    }
                  }

                  updateData.cancellation_fee = cancellationFeeAmount;
                }
              } else {
                (update as any).cancellationFee = 0;
                (update as any).chargedAmount = 0;
                (update as any).chargedVia = "none";
                updateData.cancellation_fee = 0;
                if (driverInitiatedCancellation) {
                  (update as any).cancellationPolicy = "driver_cancelled_no_fee";
                  console.log(`🆓 Driver cancel for ride ${update.rideId}: no rider charge applied`);
                } else if (!riderInitiatedCancellation) {
                  (update as any).cancellationPolicy = "unspecified_actor_no_fee";
                } else if (!isDriverAlreadyAtPickup) {
                  (update as any).cancellationPolicy = "free_before_arrival";
                } else if (!isAfterFreeMinute) {
                  (update as any).cancellationPolicy = "free_minute_after_arrival";
                }

                // Free / driver cancellation → release any card authorization hold so the
                // rider is never charged.
                let authReleased = false;
                if (
                  cancelledRide &&
                  cancelledRide.payment_method === "card" &&
                  cancelledRide.payment_intent_id &&
                  !cancellationAlreadyCaptured
                ) {
                  const releaseResult = await releaseAuthorization(cancelledRide.payment_intent_id);
                  authReleased = releaseResult.success;
                  if (releaseResult.success) {
                    updateData.payment_status = "authorization_released";
                    (update as any).chargedVia = "released";
                  } else {
                    console.warn(`⚠️ Could not release card hold for ride ${update.rideId}: ${releaseResult.error}`);
                  }
                }

                console.log(
                  `🆓 Free cancel for ride ${update.rideId}: policy=${(update as any).cancellationPolicy}, authReleased=${authReleased}`,
                );
              }
            } catch (cancelFeeErr) {
              console.error("❌ Error processing cancellation fee:", cancelFeeErr);
            }
          }

          console.log(`📝 Updating ride ${update.rideId} in Supabase with:`, JSON.stringify(updateData));

          const { data: updatedRide, error: statusUpdateError } = await supabase
            .from("rides")
            .update(updateData)
            .eq("id", update.rideId)
            .select()
            .maybeSingle();

          if (statusUpdateError) {
            console.error("❌ Failed to update ride status:", statusUpdateError);
          } else if (!updatedRide) {
            console.error(`❌ Ride ${update.rideId} not found in database for update`);
          } else {
            console.log(`✅ Ride ${update.rideId} status updated to: ${update.status}, driver_id: ${updatedRide?.driver_id || 'null'}`);
          }
        } catch (dbErr) {
          console.error('⚠️ DB update error for ride:', dbErr);
        }

        // Cancel dispatch queue on accept/cancel
        if (update.status === "accepted" || update.status === "cancelled") {
          const dispState = dispatchQueues.get(update.rideId);
          if (dispState) {
            if (dispState.timer) clearTimeout(dispState.timer);
            dispState.cancelled = true;
            dispatchQueues.delete(update.rideId);
            console.log(`🛑 Dispatch queue cancelled for ride ${update.rideId} (status: ${update.status})`);
          }
        }

        // Keep the source scheduled booking in sync with its live ride
        if (isScheduledLiveRideId(update.rideId)) {
          const bookingStatus =
            update.status === "accepted" ? "driver_accepted"
            : ["in_progress", "completed", "cancelled"].includes(update.status) ? update.status
            : null;
          if (bookingStatus) {
            const extra = update.status === "accepted" && resolvedDriverId
              ? { driver_id: resolvedDriverId, assigned_driver_id: resolvedDriverId }
              : undefined;
            syncScheduledBookingForRide(update.rideId, bookingStatus, extra).catch((syncErr) => {
              console.warn(`⚠️ Scheduled booking sync failed for ride ${update.rideId}:`, syncErr);
            });
          }
        }

        const rideInfo = activeRides.get(update.rideId);

        // When driver accepts, store their socket so we can notify them of cancellations
        if (update.status === "accepted" && rideInfo) {
          rideInfo.driverSocketId = socket.id;
          console.log(`🚗 Driver socket ${socket.id} linked to ride ${update.rideId}`);
        }

        // ─── Mark driver arrival time for customer countdown ────────────────
        if (update.status === "arrived") {
          const driverArrivedAt = new Date().toISOString();
          console.log(`⏱️ Driver arrived for ride ${update.rideId}. Notifying rider to start 10-minute free waiting timer.`);

          // Enrich the update with driverArrivedAt so the rider app can start the countdown
          (update as any).driverArrivedAt = driverArrivedAt;
        }

        if (rideInfo) {
          // Always notify the rider — include driverInfo if present (populated on accept)
          // Also include totalFare and waitingCharge if this is a completion event
          const riderPayload = { ...update };
          if (update.status === "completed") {
            (riderPayload as any).totalFare = (update as any).totalFare || 0;
            (riderPayload as any).waitingCharge = (update as any).waitingCharge || 0;
          }
          io.to(rideInfo.riderSocketId).emit("ride:update", riderPayload);
          
          // ALSO broadcast to the rider room in case they disconnected and reconnected with a new socket
          if (rideInfo.riderId) {
            io.to(`rider:${rideInfo.riderId}`).emit("ride:update", riderPayload);
          }

          // Always notify the assigned driver on cancel so their active-ride UI clears
          // and the "Ride Cancelled" popup can show — even if their socket changed.
          if (update.status === "cancelled") {
            if (rideInfo.driverSocketId) {
              io.to(rideInfo.driverSocketId).emit("ride:update", update);
            }
            if (resolvedDriverId) {
              io.to(`driver:${resolvedDriverId}`).emit("ride:update", update);
            }
            // Also broadcast so any driver still showing the incoming card clears it
            socket.broadcast.emit("ride:update", update);
            console.log(`📢 Forwarding cancellation of ride ${update.rideId} to driver(s)`);
          } else if (rideInfo.driverSocketId && rideInfo.driverSocketId !== socket.id) {
            io.to(rideInfo.driverSocketId).emit("ride:update", update);
            console.log(`📢 Forwarding ride:update (${update.status}) to driver socket ${rideInfo.driverSocketId}`);
          }
        } else {
          // Fallback: DB lookup for socket routing
          try {
            const { data: rideRow } = await supabase.from("rides").select("*").eq("id", update.rideId).single();
            if (rideRow) {
              io.to(`rider:${rideRow.rider_id}`).emit("ride:update", update);
              if (rideRow.driver_id) {
                io.to(`driver:${rideRow.driver_id}`).emit("ride:update", update);
              }
              if (update.status === "cancelled") {
                socket.broadcast.emit("ride:update", update);
              }
            }
          } catch (_) {
            // Last resort: broadcast to all (only hits cancelled/completed which are low frequency)
            io.emit("ride:update", update);
          }
        }

        // ─── Ride completion processing (payment, earnings, total_rides) ──────
        // This runs for ALL completed rides regardless of whether they are in the in-memory map
        if (update.status === "completed") {
          try {
            const { data: rideData, error: rideLookupErr } = await supabase
              .from("rides")
              .select("*")
              .eq("id", update.rideId)
              .single();

            if (rideLookupErr) {
              console.error("❌ Error looking up completed ride:", rideLookupErr);
            }

            if (rideData) {
              const discount = Math.max(0, Number((rideData as any).discount_amount || 0));
              const waitingFromClient = Number((update as any).waitingCharge || 0);
              // Driver earns the coupon-adjusted fare (+ waiting). Prefer persisted final_price.
              const fareAmount = Number(
                (
                  rideData.final_price != null && Number(rideData.final_price) > 0
                    ? Number(rideData.final_price)
                    : getDiscountedFare(rideData.estimated_price || 0, discount) + waitingFromClient
                ).toFixed(2)
              );

              // Set final_price to the discounted payable amount if not already set
              if (!rideData.final_price || Number(rideData.final_price) <= 0) {
                await supabase
                  .from("rides")
                  .update({ final_price: fareAmount })
                  .eq("id", update.rideId);
                console.log(`✅ Set final_price=${fareAmount} for ride ${update.rideId}`);
              }

              // Update driver total_earnings AND total_rides
              if (rideData.driver_id && fareAmount > 0) {
                const { data: driverData } = await supabase
                  .from("drivers")
                  .select("total_earnings")
                  .eq("id", rideData.driver_id)
                  .single();

                const currentEarnings = driverData?.total_earnings || 0;
                const newEarnings = Number((currentEarnings + fareAmount).toFixed(2));

                const { error: earningsErr } = await supabase
                  .from("drivers")
                  .update({
                    total_earnings: newEarnings,
                  })
                  .eq("id", rideData.driver_id);
                if (earningsErr) {
                  console.error("❌ Failed to update driver earnings:", earningsErr);
                } else {
                  console.log(`✅ Driver ${rideData.driver_id} earnings updated: +£${fareAmount}${discount > 0 ? ` (after £${discount.toFixed(2)} coupon)` : ""} (total: £${newEarnings})`);
                }
              } else {
                console.warn(`⚠️ Ride ${update.rideId} completed but driver_id=${rideData.driver_id}, fareAmount=${fareAmount} — skipping earnings update`);
              }
              // ✅ Insert wallet_transaction so the rider can see the fare in their transaction history
              if (rideData.rider_id && fareAmount > 0) {
                try {
                  const { error: walletTxnErr } = await supabase
                    .from("wallet_transactions")
                    .insert({
                      user_id: rideData.rider_id,
                      ride_id: update.rideId,
                      amount: fareAmount,
                      type: "debit",
                      description: discount > 0
                        ? `Ride fare — paid by card (£${discount.toFixed(2)} coupon applied)`
                        : "Ride fare — paid by card",
                    });
                  if (walletTxnErr) {
                    console.warn("⚠️ Failed to insert ride fare wallet_transaction:", walletTxnErr.message);
                  } else {
                    console.log(`✅ Wallet transaction recorded: £${fareAmount} debit for rider ${rideData.rider_id}`);
                  }
                } catch (txnErr) {
                  console.warn("⚠️ Exception inserting wallet_transaction for ride fare:", txnErr);
                }
              }
            }
          } catch (error) {
            console.error("❌ Error in ride completion side-effects:", error);
          }
        }

        if (update.status === "completed" || update.status === "cancelled") {
          activeRides.delete(update.rideId);
          
          // Set driver as available again so they can receive new ride requests
          if (resolvedDriverId) {
            try {
              await supabase
                .from("drivers")
                .update({ is_available: true })
                .eq("id", resolvedDriverId);
              console.log(`✅ Driver ${resolvedDriverId} is now available again after ride ${update.status}`);
            } catch (availErr) {
              console.error(`❌ Failed to reset driver ${resolvedDriverId} availability:`, availErr);
            }
          }
        }
      } catch (error) {
        console.error("Error updating ride status:", error);
      }
    });

    // ─── Driver-Initiated No Show ──────────────────────────────────────
    socket.on("ride:no_show", async (data: { rideId: string, driverId: string }) => {
      console.log(`⏱️🚫 Driver ${data.driverId} initiated No Show for ride ${data.rideId}`);

      try {
        // 1. Look up the ride to get fare and rider info
        const { data: rideRow } = await supabase
          .from("rides")
          .select("*")
          .eq("id", data.rideId)
          .single();

        if (!rideRow) {
          console.error(`❌ No-show handler: ride ${data.rideId} not found in DB`);
          return;
        }

        // Only proceed if ride is still in "arrived" or "at_pickup" status
        if (rideRow.status !== "arrived" && rideRow.status !== "at_pickup") {
          console.log(`ℹ️ No-show fired but ride ${data.rideId} is now ${rideRow.status} — skipping`);
          return;
        }

        const fareAmount = Number(rideRow.estimated_price || 0);
        const discount = Math.max(0, Number(rideRow.discount_amount || 0));
        // Rider charge and driver earnings both use the discounted amount only.
        const riderChargeAmount = getDiscountedFare(fareAmount, discount);
        const ridePaymentMethod = rideRow.payment_method || "card";

        console.log(`💳 No-show: ride ${data.rideId} payment_method=${ridePaymentMethod}, payable=£${riderChargeAmount}${discount > 0 ? ` (after £${discount.toFixed(2)} coupon)` : ""}`);

        // ─── 2. Charge the rider's saved card via Stripe ────────────────────
        let stripeChargeSuccess = false;
        let stripePaymentIntentId: string | undefined;
        let stripeChargeError: string | undefined;

        if (rideRow.rider_id && riderChargeAmount > 0) {
          try {
            const { data: riderUser } = await supabase
              .from("users")
              .select("stripe_customer_id, wallet_balance")
              .eq("id", rideRow.rider_id)
              .single();

            const stripeCustomerId = riderUser?.stripe_customer_id;

            if (rideRow.payment_method === "card" && rideRow.payment_intent_id) {
              console.log(`💳 Capturing authorized PaymentIntent for no-show ride ${data.rideId}: £${riderChargeAmount}`);
              const chargeResult = await capturePaymentIntent(rideRow.payment_intent_id, riderChargeAmount);

              stripeChargeSuccess = chargeResult.success;
              stripePaymentIntentId = chargeResult.paymentIntentId;
              stripeChargeError = chargeResult.error;

              if (stripeChargeSuccess) {
                console.log(`✅ No-show fee £${riderChargeAmount} captured from authorized card for ride ${data.rideId}`);
              } else {
                console.warn(`⚠️ Stripe card charge failed: ${stripeChargeError} — will fall back to wallet`);
              }
            } else if (stripeCustomerId) {
              console.log(`💳 Attempting fallback saved-card charge for rider ${rideRow.rider_id} (Stripe customer: ${stripeCustomerId})`);
              const chargeResult = await chargeSavedCard(
                stripeCustomerId,
                riderChargeAmount,
                data.rideId,
                "gbp",
                "no_show_fee"
              );

              stripeChargeSuccess = chargeResult.success;
              stripePaymentIntentId = chargeResult.paymentIntentId;
              stripeChargeError = chargeResult.error;

              if (stripeChargeSuccess) {
                console.log(`✅ No-show fee £${riderChargeAmount} charged to saved card for ride ${data.rideId}`);
              } else {
                console.warn(`⚠️ Stripe card charge failed: ${stripeChargeError} — will fall back to wallet`);
              }
            } else {
              console.warn(`⚠️ Rider ${rideRow.rider_id} has no Stripe customer ID — will fall back to wallet`);
              stripeChargeError = "No Stripe customer ID on file";
            }
          } catch (stripeErr) {
            console.error("❌ Stripe charge attempt failed:", stripeErr);
            stripeChargeError = String(stripeErr);
          }
        }

        // ─── 3. Cancel the ride in DB ────────────────────────────────────────
        const cancelPayload: Record<string, any> = {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          payment_status: stripeChargeSuccess ? "no_show_card_charged" : "no_show_wallet_charged",
        };
        if (stripePaymentIntentId) {
          cancelPayload.payment_intent_id = stripePaymentIntentId;
        }

        await supabase
          .from("rides")
          .update(cancelPayload)
          .eq("id", data.rideId);

        console.log(`✅ Ride ${data.rideId} cancelled in DB due to no-show (charged via: ${stripeChargeSuccess ? 'card' : 'wallet'})`);

        // If this live ride came from a scheduled booking, mark the booking cancelled too
        if (isScheduledLiveRideId(data.rideId)) {
          syncScheduledBookingForRide(data.rideId, "cancelled").catch((syncErr) => {
            console.warn(`⚠️ Scheduled booking sync failed on no-show for ride ${data.rideId}:`, syncErr);
          });
        }

        // ─── 4. If card charge failed, fall back to wallet deduction ─────────
        if (!stripeChargeSuccess && rideRow.rider_id && riderChargeAmount > 0) {
          try {
            const { data: userRow } = await supabase
              .from("users")
              .select("wallet_balance")
              .eq("id", rideRow.rider_id)
              .single();

            const currentBalance = userRow?.wallet_balance || 0;
            const newBalance = Math.max(0, currentBalance - riderChargeAmount);

            await supabase
              .from("users")
              .update({ wallet_balance: newBalance })
              .eq("id", rideRow.rider_id);

            console.log(`💰 No-show penalty (wallet fallback): Debited £${riderChargeAmount} from rider ${rideRow.rider_id} wallet (${currentBalance} → ${newBalance})`);

            await supabase
              .from("wallet_transactions")
              .insert({
                user_id: rideRow.rider_id,
                ride_id: data.rideId,
                amount: riderChargeAmount,
                type: "debit",
                description: `No-show cancellation fee — driver waited 10 minutes (card charge failed: ${stripeChargeError || 'unknown'})`,
              });
          } catch (walletErr) {
            console.error("❌ Failed to debit no-show penalty from wallet:", walletErr);
          }
        }

        // ─── 5. Record payment in payments table ─────────────────────────────
        if (rideRow.rider_id && riderChargeAmount > 0) {
          try {
            await supabase.from("payments").insert({
              ride_id: data.rideId,
              user_id: rideRow.rider_id,
              amount: riderChargeAmount,
              currency: "gbp",
              status: "succeeded",
              payment_method: stripeChargeSuccess ? "card" : "wallet",
              stripe_payment_intent_id: stripePaymentIntentId || null,
              completed_at: new Date().toISOString(),
            });
          } catch (paymentErr) {
            console.error("❌ Failed to insert no-show payment record:", paymentErr);
          }

          if (stripeChargeSuccess) {
            try {
              await supabase
                .from("wallet_transactions")
                .insert({
                  user_id: rideRow.rider_id,
                  ride_id: data.rideId,
                  amount: riderChargeAmount,
                  type: "debit",
                  description: `No-show cancellation fee — charged to saved card`,
                });
            } catch (_) { }
          }
        }

        // ─── 5b. Credit driver's earnings with the no-show fee (discounted fare) ────────────────
        if (rideRow.driver_id && riderChargeAmount > 0) {
          try {
            const { data: driverData } = await supabase
              .from("drivers")
              .select("total_earnings")
              .eq("id", rideRow.driver_id)
              .single();

            const currentEarnings = driverData?.total_earnings || 0;
            const newEarnings = Number((currentEarnings + riderChargeAmount).toFixed(2));

            await supabase
              .from("drivers")
              .update({ total_earnings: newEarnings })
              .eq("id", rideRow.driver_id);

            console.log(`✅ Driver ${rideRow.driver_id} earnings updated for no-show: +£${riderChargeAmount} (total: £${newEarnings})`);
          } catch (earningsErr) {
            console.error("❌ Error updating driver earnings on no-show:", earningsErr);
          }
        }

        // ─── 6. Notify the rider ─────────────────────────────────────────────
        io.to(`rider:${rideRow.rider_id}`).emit("ride:update", {
          rideId: data.rideId,
          status: "cancelled_no_show",
          noShowFare: riderChargeAmount,
          chargedVia: stripeChargeSuccess ? "card" : "wallet",
        });

        // ─── 7. Notify the driver ────────────────────────────────────────────
        const rInfo = activeRides.get(data.rideId);
        if (rInfo?.driverSocketId) {
          io.to(rInfo.driverSocketId).emit("ride:update", {
            rideId: data.rideId,
            status: "cancelled_no_show",
            noShowFare: riderChargeAmount,
            earningsAdded: riderChargeAmount,
          });
        }
        if (rideRow.driver_id) {
          io.to(`driver:${rideRow.driver_id}`).emit("ride:update", {
            rideId: data.rideId,
            status: "cancelled_no_show",
            noShowFare: riderChargeAmount,
            earningsAdded: riderChargeAmount,
          });
        }

        // ─── 8. Set driver available again ────────────────────────────────────────────
        try {
          await supabase
            .from("drivers")
            .update({ is_available: true })
            .eq("id", data.driverId);
        } catch (_) {}

        // ─── 9. Clean up ─────────────────────────────────────────────────────
        activeRides.delete(data.rideId);
        console.log(`✅ No-show cancellation complete for ride ${data.rideId}`);

      } catch (error) {
        console.error("❌ Error in no-show auto-cancellation handler:", error);
      }
    });

    // ─── Driver Agrees to Wait ──────────────────────────────────────
    socket.on("ride:agree_to_wait", async (data: { rideId: string, driverId: string, paidWaitingStartedAt: string, waitingChargePerMin: number }) => {
      console.log(`⏱️💰 Driver ${data.driverId} agreed to wait for ride ${data.rideId} at £${data.waitingChargePerMin}/min`);
      
      // Look up the ride to notify the rider
      try {
        const { data: rideRow } = await supabase.from("rides").select("rider_id").eq("id", data.rideId).single();
        if (rideRow?.rider_id) {
          io.to(`rider:${rideRow.rider_id}`).emit("ride:paid_waiting_started", {
            rideId: data.rideId,
            paidWaitingStartedAt: data.paidWaitingStartedAt,
            waitingChargePerMin: data.waitingChargePerMin
          });
        }
      } catch (e) {
        console.warn("Could not notify rider of paid waiting:", e);
      }
    });

    // Handle driver confirming payment was collected
    socket.on("ride:payment_collected", async (data: { rideId: string; amount?: number; extraAmount?: number }) => {
      console.warn(`⚠️ Ignoring legacy cash payment collection event for ride ${data.rideId}; payments are card-only.`);
      return;

      console.log('💰 ═══════════ PAYMENT COLLECTED EVENT ═══════════');
      console.log('💰 rideId:', data.rideId, 'amount:', data.amount, 'extraAmount:', data.extraAmount);

      // Resolve driver from socket map
      let payingDriverId: string | null = null;
      for (const [dId, sId] of connectedDrivers.entries()) {
        if (sId === socket.id) { payingDriverId = dId; break; }
      }

      // If resolved from socket, check if it's a user_id and resolve to drivers table id
      if (payingDriverId) {
        try {
          const { data: directDriver } = await supabase
            .from("drivers")
            .select("id")
            .eq("id", payingDriverId)
            .single();

          if (!directDriver) {
            const { data: driverByUserId } = await supabase
              .from("drivers")
              .select("id")
              .eq("user_id", payingDriverId)
              .single();

            const resolvedDriverId = (driverByUserId as any)?.id;
            if (resolvedDriverId) {
              console.log(`🔄 payment_collected — Resolved auth user_id ${payingDriverId} → driver table id ${resolvedDriverId}`);
              payingDriverId = resolvedDriverId;
            }
          }
        } catch (_) {
          // Non-critical
        }
      }

      // Fallback: get driver_id from the ride record itself
      if (!payingDriverId) {
        try {
          const { data: existingRide } = await supabase
            .from("rides")
            .select("driver_id")
            .eq("id", data.rideId)
            .single();
          const existingRideDriverId = (existingRide as any)?.driver_id;
          if (existingRideDriverId) {
            payingDriverId = existingRideDriverId;
            console.log(`🔍 payment_collected — Resolved driver_id from ride record: ${payingDriverId}`);
          }
        } catch (_) {
          // Non-critical
        }
      }

      console.log(`🔍 payment_collected — Final driver_id: ${payingDriverId || 'NOT FOUND'}`);

      try {
        const updatePayload: any = {
          status: "completed",
          payment_status: "completed",
          completed_at: new Date().toISOString(),
        };
        // Guarantee driver_id is always filled in
        if (payingDriverId) updatePayload.driver_id = payingDriverId;

        const { data: rideRow, error } = await supabase
          .from("rides")
          .update(updatePayload)
          .eq("id", data.rideId)
          .select()
          .single();

        if (error) {
          console.error("❌ Failed to update payment status:", error);
        } else {
          console.log(`✅ Ride ${data.rideId} marked as payment completed in Supabase, driver_id=${rideRow?.driver_id}`);

          // Calculate the expected fare and any overpayment
          const collectedAmount = Number(data.amount) || Number(rideRow?.estimated_price) || 0;
          const expectedFare = Number(rideRow?.final_price) || Number(rideRow?.estimated_price) || 0;
          // Trust client-provided extraAmount (already calculated correctly) with server recalc as fallback
          const serverExtraAmount = Math.max(0, collectedAmount - expectedFare);
          const clientExtra = Number(data.extraAmount) || 0;
          const extraAmount = clientExtra > 0 ? clientExtra : serverExtraAmount;

          console.log(`💰 Payment details: collected=£${collectedAmount}, expectedFare=£${expectedFare}`);
          console.log(`💰 extraAmount: client=${data.extraAmount}, server=${serverExtraAmount}, final=${extraAmount}`);
          console.log(`💰 rideRow: estimated_price=${rideRow?.estimated_price}, final_price=${rideRow?.final_price}, driver_id=${rideRow?.driver_id}, rider_id=${rideRow?.rider_id}`);

          // ✅ FALLBACK: Update driver earnings if ride:status "completed" handler didn't already
          // Check if a payment record exists for this ride — if so, earnings were already processed
          if (payingDriverId && expectedFare > 0) {
            try {
              const { data: existingPayment } = await supabase
                .from("payments")
                .select("id")
                .eq("ride_id", data.rideId)
                .maybeSingle();

              if (!existingPayment) {
                console.log(`⚠️ No payment record found for ride ${data.rideId} — processing earnings fallback`);

                // Insert the payment record
                const { error: paymentInsertErr } = await supabase.from("payments").insert({
                  ride_id: data.rideId,
                  user_id: rideRow?.rider_id,
                  amount: expectedFare,
                  currency: "gbp",
                  status: "succeeded",
                  payment_method: "cash",
                  completed_at: new Date().toISOString(),
                });
                if (paymentInsertErr) {
                  console.error("❌ Fallback payment insert failed:", paymentInsertErr);
                } else {
                  console.log(`✅ Fallback payment record inserted: £${expectedFare} for ride ${data.rideId}`);
                }

                // Update driver total_earnings
                const { data: driverRecord } = await supabase
                  .from("drivers")
                  .select("total_earnings")
                  .eq("id", payingDriverId)
                  .single();

                if (driverRecord) {
                  const currentEarnings = Number(driverRecord?.total_earnings || 0);
                  const newEarnings = currentEarnings + expectedFare;
                  const { error: earningsErr } = await supabase
                    .from("drivers")
                    .update({ total_earnings: newEarnings })
                    .eq("id", payingDriverId);

                  if (earningsErr) {
                    console.error("❌ Fallback earnings update failed:", earningsErr);
                  } else {
                    console.log(`✅ Fallback earnings updated for driver ${payingDriverId}: £${currentEarnings} + £${expectedFare} = £${newEarnings}`);
                  }
                }

                // Set final_price if not already set
                if (!rideRow?.final_price && rideRow?.estimated_price) {
                  await supabase
                    .from("rides")
                    .update({ final_price: rideRow.estimated_price })
                    .eq("id", data.rideId);
                  console.log(`✅ Set final_price=${rideRow.estimated_price} for ride ${data.rideId}`);
                }
              } else {
                console.log(`ℹ️ Payment record already exists for ride ${data.rideId} — skipping earnings fallback`);
              }
            } catch (fallbackErr) {
              console.error("❌ Fallback earnings processing failed:", fallbackErr);
            }
          }

          // ✅ If extra amount was paid (cash overpayment), add it to rider's wallet
          if (extraAmount > 0 && rideRow?.rider_id) {
            try {
              const { data: userRow, error: userFetchErr } = await supabase
                .from("users")
                .select("wallet_balance")
                .eq("id", rideRow.rider_id)
                .single();

              if (userFetchErr) {
                console.error("❌ Failed to fetch user wallet balance:", userFetchErr);
              } else {
                const currentBalance = userRow?.wallet_balance || 0;
                const newBalance = currentBalance + extraAmount;

                const { error: walletUpdateErr } = await supabase
                  .from("users")
                  .update({ wallet_balance: newBalance })
                  .eq("id", rideRow.rider_id);

                if (walletUpdateErr) {
                  console.error("❌ Failed to update user wallet_balance:", walletUpdateErr);
                } else {
                  console.log(`✅ Updated wallet for user ${rideRow.rider_id}: £${currentBalance} + £${extraAmount} = £${newBalance}`);
                }

                // Record transaction in wallet_transactions (best-effort)
                const { error: txnErr } = await supabase
                  .from("wallet_transactions")
                  .insert({
                     user_id: rideRow.rider_id,
                     ride_id: data.rideId,
                     amount: extraAmount,
                     type: 'credit',
                     description: `Cash overpayment change (collected £${collectedAmount}, fare £${expectedFare})`
                  });

                if (txnErr) {
                  console.warn("⚠️ Failed to insert wallet_transaction (table may not exist):", txnErr?.message);
                } else {
                  console.log(`✅ Wallet transaction recorded for user ${rideRow.rider_id}`);
                }
              }
            } catch (walletErr) {
              console.error("❌ Exception adding extra amount to user wallet:", walletErr);
            }
          } else {
            console.log(`ℹ️ No extra amount to add to wallet (extraAmount=£${extraAmount}, rider_id=${rideRow?.rider_id || 'none'})`);
          }

          if (rideRow && rideRow.rider_id) {
            // ✅ Include extraAmount in the event so rider's app can update wallet display
            console.log(`📡 Emitting ride:update to rider:${rideRow.rider_id} with status=payment_collected, extraAmount=${extraAmount}`);
            io.to(`rider:${rideRow.rider_id}`).emit("ride:update", {
              rideId: data.rideId,
              status: "payment_collected",
              extraAmount: extraAmount,
            });
            // NOTE: We do NOT send a second "completed" event here.
            // The ride:status "completed" handler already sent one earlier.
            // Sending a duplicate causes a race condition where the "completed" event
            // arrives after "payment_collected" and clears activeRide before the wallet
            // update runs on the client.
          } else {
            console.warn(`⚠️ Cannot notify rider — rideRow.rider_id is missing. rideRow:`, rideRow);
          }
        }
      } catch (err) {
        console.error("❌ Exception updating payment status:", err);

      }
    });

    socket.on("disconnect", async () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      for (const [driverId, socketId] of connectedDrivers.entries()) {
        if (socketId === socket.id) {
          // A socket disconnect happens whenever the OS suspends the app, the
          // driver switches to another app (e.g. Google Maps), the screen
          // locks, or the network blips. It does NOT mean the driver went
          // offline. We therefore keep `is_online = true` in the DB so the
          // dispatcher keeps offering rides (delivered via Expo push even when
          // the app is backgrounded/killed). The driver only becomes offline
          // when they explicitly toggle off / log out (driver:go_offline).
          //
          // We wait a short grace period before removing the socket from the
          // in-memory map so a quick reconnect keeps foreground behaviour, but
          // we never touch the DB online flag here.
          const disconnectGraceMs = 15_000;
          console.log(`⏳ Driver ${driverId} socket dropped (backgrounded / switched app) — keeping is_online=true, delivering via push`);

          setTimeout(async () => {
              const currentSocketId = connectedDrivers.get(driverId);
              if (currentSocketId && currentSocketId !== socket.id) {
                console.log(`✅ Driver ${driverId} reconnected with new socket ${currentSocketId}`);
                return; // Driver reconnected with a fresh socket
              }
              if (!currentSocketId || currentSocketId === socket.id) {
                connectedDrivers.delete(driverId);
                console.log(`📊 Driver ${driverId} socket removed from live map (still is_online in DB). Live sockets: ${connectedDrivers.size}`);
                // Refresh last_seen so staleness tooling still has a signal,
                // but deliberately DO NOT set is_online=false here.
                try {
                  await supabase
                    .from("drivers")
                    .update({ is_available: true, last_seen_at: new Date().toISOString() })
                    .eq("id", driverId);
                } catch (error) {
                  console.error("Error refreshing driver last_seen on disconnect:", error);
                }
                // #region agent log
                fetch('http://127.0.0.1:7697/ingest/ce76089c-d795-4060-ab70-2c912a1224d2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'25c155'},body:JSON.stringify({sessionId:'25c155',runId:'post-fix',hypothesisId:'C',location:'server/socket.ts:disconnect',message:'Driver socket dropped - kept online',data:{driverId,liveSockets:connectedDrivers.size},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
              }
            }, disconnectGraceMs);
          break;
        }
      }

      for (const [riderId, socketId] of connectedRiders.entries()) {
        if (socketId === socket.id) {
          connectedRiders.delete(riderId);
          break;
        }
      }
    });
  });

  serverRideEmitter.on("dispatch", async (rideData: any) => {
    // For dispatch triggered internally by REST APIs, we won't have a source socket.
    // However, if the activeRides map already holds the riderSocketId (e.g. they connected
    // via a client-side proxy), it would be nice to have. For now, empty string is fine.
    try {
      // Find rider socket if they are connected
      let riderSocketId: string | null = null;
      for (const [rId, sId] of connectedRiders.entries()) {
        if (rId === rideData.riderId) {
          riderSocketId = sId;
          break;
        }
      }
      
      await handleRideRequest(rideData, riderSocketId);
    } catch (e) {
      console.error("Internal dispatch failed", e);
    }
  });

  return io;
}
