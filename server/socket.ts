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
import { chargeSavedCard } from "./stripe";
import { DEFAULT_DRIVER_RADIUS_MILES, haversineDistanceMiles } from "../server/services/driverMatching";

export const serverRideEmitter = new EventEmitter();

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
const DISPATCH_TIMEOUT_MS = 15000; // 15-second timeout per driver
const ARRIVED_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes waiting for rider

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
  const io = new Server(httpServer, {
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

  const buildRideDataFromDbRide = (ride: any) => ({
    id: ride.id,
    riderId: ride.rider_id,
    rideType: ride.vehicle_type || "saloon",
    vehicleType: ride.vehicle_type || "saloon",
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
    farePrice: Number(ride.estimated_price || ride.final_price || 0),
    distanceMiles: Number(ride.distance || 0),
    durationMinutes: Number(ride.estimated_duration || 0),
    couponCode: ride.coupon_code || null,
    discountAmount: Number(ride.discount_amount || 0),
    paymentMethod: ride.payment_method || "cash",
  });

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

      // Verify they are still connected
      const currentSocketId = connectedDrivers.get(entry.driverId);
      if (currentSocketId) break;
      console.log(`⏭️ Skipping driver ${entry.driverId} — no longer connected`);
      entry = undefined;
    }

    if (!entry) {
      // No more drivers in radius — notify rider
      console.log(`🚫 No more drivers available within ${RADIUS_MILES} miles for ride ${rideId}`);
      io.to(state.riderSocketId).emit("ride:update", {
        rideId,
        status: "cancelled_no_drivers",
      });

      // Also update the ride in DB to cancelled
      try {
        await supabase
          .from("rides")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", rideId);
        console.log(`✅ Ride ${rideId} marked cancelled in DB (no drivers available)`);
      } catch (dbErr) {
        console.error(`❌ Failed to cancel ride ${rideId} in DB:`, dbErr);
      }
      dispatchQueues.delete(rideId);
      return;
    }

    state.currentDriverId = entry.driverId;

    // Annotate ride data with the actual distances so the driver sees it
    const enrichedRide = {
      ...state.rideData,
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

    // Issue 9: Send push notification for background ride delivery
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
          const pushMessage = {
            to: userRow.push_token,
            sound: "default",
            title: "🚕 New Ride Request",
            body: `New ride from ${enrichedRide.pickupLocation?.address || enrichedRide.pickupAddress || "nearby"} — £${(enrichedRide.farePrice || enrichedRide.estimatedPrice || 0).toFixed(2)}`,
            data: { type: "ride_request", rideId },
            priority: "high",
          };
          
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(pushMessage),
          }).catch((pushErr) => {
            console.warn(`⚠️ Push notification failed for driver ${entry!.driverId}:`, pushErr);
          });
          console.log(`📲 Push notification sent to driver ${entry.driverId} (token: ${userRow.push_token.substring(0, 20)}...)`);
        }
      }
    } catch (pushErr) {
      console.warn(`⚠️ Could not send push notification to driver ${entry.driverId}:`, pushErr);
    }

    // Start 15-second countdown
    state.timer = setTimeout(() => {
      console.log(`⏱️ Driver ${entry!.driverId} did not respond within ${DISPATCH_TIMEOUT_MS / 1000}s — moving to next`);
      // Notify the timed-out driver to clear their screen
      io.to(`driver:${entry!.driverId}`).emit("ride:expired", { rideId });
      dispatchToNextDriver(rideId);
    }, DISPATCH_TIMEOUT_MS);
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
            const insertPayload: Record<string, any> = {
              id: rideData.id,
              rider_id: rideData.riderId,
              status: "pending",
              vehicle_type: rideData.rideType || "economy",
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
              payment_method: rideData.paymentMethod || "cash",
            };

            console.log('🚕 Inserting ride into Supabase:', JSON.stringify(insertPayload));

            let { data: insertedData, error: insertError } = await supabase
              .from("rides")
              .insert(insertPayload)
              .select()
              .single();

            if (
              insertError?.code === "PGRST204" &&
              String(insertError.message || "").includes("payment_method")
            ) {
              const retryPayload = { ...insertPayload };
              delete retryPayload.payment_method;
              console.warn("⚠️ rides.payment_method is missing in Supabase schema cache; retrying ride insert without payment_method");

              const retryResult = await supabase
                .from("rides")
                .insert(retryPayload)
                .select()
                .single();

              insertedData = retryResult.data;
              insertError = retryResult.error;
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
      const requestedType = (rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy").toLowerCase();
      const compatibleTypes = getCompatibleVehicleTypes(requestedType);
      console.log(`🚗 Requested vehicle type: "${requestedType}" → compatible: [${compatibleTypes.join(', ')}]`);

      // 3. Build Min-Heap combining DB drivers + socket-connected drivers
      const heap = new MinHeap();
      const addedDriverIds = new Set<string>();

      // First pass: Add drivers with location data in the DB
      if (onlineDrivers && onlineDrivers.length > 0) {
        for (const driver of onlineDrivers) {
          const driverSocketId = connectedDrivers.get(driver.id);
          if (!driverSocketId) {
            console.log(`   ⏭️ Skipping DB driver ${driver.id} — not socket-connected`);
            continue;
          }

          // Vehicle type filtering
          const driverVehicle = (driver.vehicle_type || 'saloon').toLowerCase();
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
            console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle})`);

            if (dist <= RADIUS_MILES) {
              heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId });
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

            const driverVehicle = (driverRow?.vehicle_type || 'saloon').toLowerCase();
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
    switch (rideType) {
      case 'economy':
      case 'standard':
      case 'comfort':
      case 'saloon':
        return ['saloon', 'economy', 'standard', 'comfort'];
      case 'people_carrier':
      case 'people carrier':
        return ['people_carrier', 'minibus'];
      case 'minibus':
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

    const requestedType = (rideData.rideType || rideData.vehicleType || rideData.vehicle_type || "economy").toLowerCase();
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
        if (!driverSocketId) {
          console.log(`   ⏭️ Skipping DB driver ${driver.id} — not socket-connected`);
          continue;
        }

        const driverVehicle = (driver.vehicle_type || 'saloon').toLowerCase();
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

          console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (vehicle: ${driverVehicle})`);

          if (dist <= RADIUS_MILES) {
            heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId });
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

        const driverVehicle = (driverRow?.vehicle_type || 'saloon').toLowerCase();
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

  io.on("connection", (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on("driver:connect", async (driverId: string) => {
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
      await handleRideRequest(rideData, socket.id);
    });

    socket.on("ride:declined", async (data: { rideId: string, rideData?: any, driverId?: string }) => {
      console.log('❌ Ride declined by driver:', data.driverId, 'for ride:', data.rideId);
      const rideInfo = activeRides.get(data.rideId);

      if (rideInfo && data.driverId) {
        rideInfo.declinedBy.add(data.driverId);
      }

      // Advance the dispatch queue to the next nearest driver
      const dispState = dispatchQueues.get(data.rideId);
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
          const fare = ride.estimated_price || 0;
          const penaltyAmount = fare * 0.5;

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
              const deductionId = `ride_${data.rideId}_cancel_at_pickup`;
              const deductionReason = `50% cancellation penalty for ride ${data.rideId}`;
              const { error: deductionErr } = await supabase
                .from("driver_deductions")
                .insert({
                  id: deductionId,
                  driver_id: actualDriverId,
                  amount: penaltyAmount,
                  type: "cancel_at_pickup_penalty",
                  reason: deductionReason,
                  created_at: new Date().toISOString(),
                });
            } catch (penaltyErr) {
              console.error(`❌ Failed to apply cancellation penalty to driver ${actualDriverId}:`, penaltyErr);
            }
          }

          const rideInfo = activeRides.get(data.rideId);
          const declinedBy = rideInfo?.declinedBy || new Set<string>();
          if (actualDriverId) {
            declinedBy.add(actualDriverId);
          }

          // Remove the current driver assignment and reset the ride to pending
          await supabase
            .from("rides")
            .update({ status: "pending", driver_id: null, accepted_at: null, arrived_at: null })
            .eq("id", data.rideId);

          if (ride.rider_id) {
            const riderDriverCancelledPayload = {
              rideId: data.rideId,
              status: "pending",
              driverCancelled: true,
              driverId: null,
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
          const { data: rideForNotify } = await supabase
            .from("rides")
            .select("rider_id")
            .eq("id", data.rideId)
            .single();
          if (rideForNotify?.rider_id) {
            io.to(`rider:${rideForNotify.rider_id}`).emit("ride:update", {
              rideId: data.rideId,
              status: "cancelled_no_drivers",
            });
          }

          await supabase
            .from("rides")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("id", data.rideId);
          io.emit("ride:update", { rideId: data.rideId, status: "cancelled_no_drivers" });
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

        const { data: ride } = await supabase
          .from("rides")
          .select("*")
          .eq("id", data.rideId)
          .single();

        if (ride) {
          const driverLocation = await getLatestDriverLocation(data.rideId, actualDriverId, socket.id);
          const acceptedPayload = {
            rideId: data.rideId,
            driverId: actualDriverId,
            acceptedAt,
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
            // Ensure driver_id is ALWAYS set on completion
            if (resolvedDriverId) updateData.driver_id = resolvedDriverId;

            // Store waiting charge and final price if sent by the driver client
            const waitingCharge = (update as any).waitingCharge || 0;
            const clientTotalFare = (update as any).totalFare || 0;
            if (clientTotalFare > 0) {
              updateData.final_price = clientTotalFare;
              console.log(`💰 Completion includes waiting charge: £${waitingCharge}, totalFare: £${clientTotalFare}`);
            }
            // (arrived timer clear logic removed as it's now client-side)

            // ─── Charge saved card if payment_method is 'card' ──────────────
            try {
              const { data: completedRide } = await supabase
                .from("rides")
                .select("rider_id, estimated_price, payment_method")
                .eq("id", update.rideId)
                .single();

              if (completedRide?.payment_method === "card" && completedRide.estimated_price > 0 && completedRide.rider_id) {
                const { data: riderUser } = await supabase
                  .from("users")
                  .select("stripe_customer_id")
                  .eq("id", completedRide.rider_id)
                  .single();

                if (riderUser?.stripe_customer_id) {
                  console.log(`💳 Charging saved card for completed ride ${update.rideId}: £${completedRide.estimated_price}`);

                  const chargeResult = await chargeSavedCard(
                    riderUser.stripe_customer_id,
                    completedRide.estimated_price,
                    update.rideId,
                    "gbp",
                    "ride_fare"
                  );

                  if (chargeResult.success) {
                    updateData.payment_status = "card_charged";
                    updateData.payment_intent_id = chargeResult.paymentIntentId;
                    console.log(`✅ Card charged £${completedRide.estimated_price} for ride ${update.rideId} (PI: ${chargeResult.paymentIntentId})`);

                    // Record payment
                    await supabase.from("payments").insert({
                      ride_id: update.rideId,
                      user_id: completedRide.rider_id,
                      amount: completedRide.estimated_price,
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
                } else {
                  console.warn(`⚠️ Rider ${completedRide.rider_id} has no Stripe customer ID — cannot charge card`);
                }
              }
            } catch (cardChargeErr) {
              console.error(`❌ Card charge error on ride completion:`, cardChargeErr);
            }
          }
          else if (update.status === "cancelled") {
            updateData.cancelled_at = new Date().toISOString();

            // ── Server-side cancellation fee processing ──────────────────────
            // Rider gets one free minute after driver assignment. After that,
            // or once the driver has arrived, a 100% cancellation fee is owed.
            try {
              const { data: cancelledRide, error: cancelledRideErr } = await supabase
                .from("rides")
                .select("rider_id, driver_id, status, accepted_at, estimated_price, final_price")
                .eq("id", update.rideId)
                .single();

              const acceptedAt = cancelledRide?.accepted_at ? new Date(cancelledRide.accepted_at).getTime() : 0;
              const acceptedElapsedMs = acceptedAt ? Date.now() - acceptedAt : 0;
              const isAfterFreeMinute = acceptedAt > 0 && acceptedElapsedMs >= 60_000;
              const isDriverAlreadyAtPickup = cancelledRide && ["arrived", "at_pickup", "in_progress"].includes(cancelledRide.status);
              const shouldChargeCancellationFee = !!cancelledRide && (isDriverAlreadyAtPickup || isAfterFreeMinute);

              if (cancelledRide && shouldChargeCancellationFee) {
                const fullFareAmount = Number(cancelledRide.final_price || cancelledRide.estimated_price || 0);
                const cancellationFeeAmount = Number((fullFareAmount * 1).toFixed(2));
                const riderId = cancelledRide.rider_id;
                const rideInfo = activeRides.get(update.rideId);
                const walletDeductionAlreadyTaken = Math.max(0, Number(rideInfo?.rideData?.walletDeduction || 0));
                const walletAdjustmentAmount = Number((cancellationFeeAmount - walletDeductionAlreadyTaken).toFixed(2));
                const walletDebitAmount = Math.max(0, walletAdjustmentAmount);

                if (riderId && cancellationFeeAmount > 0) {

                  (update as any).cancellationFee = cancellationFeeAmount;
                  (update as any).chargedAmount = walletDebitAmount;
                  (update as any).walletAdjustment = walletAdjustmentAmount;
                  (update as any).cancellationPolicy = isDriverAlreadyAtPickup ? "driver_arrived" : "after_free_minute";

                  // Always apply cancellation fee through wallet, for card and cash rides.
                  // Wallet balance is allowed to go negative. If wallet was already
                  // deducted for the ride, only apply the net adjustment needed.
                  try {
                    const { data: userRow, error: walletFetchErr } = await supabase
                      .from("users")
                      .select("wallet_balance")
                      .eq("id", riderId)
                      .single();

                    const currentBalance = Number(userRow?.wallet_balance || 0);
                    const newBalance = Number((currentBalance - walletAdjustmentAmount).toFixed(2));

                    const { error: walletUpdateErr } = await supabase
                      .from("users")
                      .update({ wallet_balance: newBalance })
                      .eq("id", riderId);

                    const { data: verifyUser, error: verifyErr } = await supabase
                      .from("users")
                      .select("wallet_balance")
                      .eq("id", riderId)
                      .single();

                    updateData.payment_status = "cancellation_fee_wallet_charged";
                    (update as any).chargedVia = "wallet";
                    (update as any).walletBalance = newBalance;
                  } catch (walletErr) {
                    console.error("❌ Failed to adjust wallet for cancellation fee:", walletErr);
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
                }
              } else {
                (update as any).cancellationFee = 0;
                (update as any).chargedAmount = 0;
                (update as any).chargedVia = "none";
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

          if (rideInfo.driverSocketId && rideInfo.driverSocketId !== socket.id) {
            // Driver accepted - send directly to their socket
            io.to(rideInfo.driverSocketId).emit("ride:update", update);
            console.log(`📢 Forwarding ride:update (${update.status}) to driver socket ${rideInfo.driverSocketId}`);
          } else if (update.status === "cancelled") {
            // Driver hasn't accepted yet (or pre-accept cancel) — broadcast to ALL drivers
            // so any driver seeing the incoming request card clears it immediately
            socket.broadcast.emit("ride:update", update);
            console.log(`📢 Broadcasting cancellation of ride ${update.rideId} to all drivers`);
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
              const fareAmount = rideData.final_price || rideData.estimated_price || 0;

              // Set final_price if not already set
              if (!rideData.final_price && rideData.estimated_price) {
                await supabase
                  .from("rides")
                  .update({ final_price: rideData.estimated_price })
                  .eq("id", update.rideId);
                console.log(`✅ Set final_price=${rideData.estimated_price} for ride ${update.rideId}`);
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
                  console.log(`✅ Driver ${rideData.driver_id} earnings updated: +£${fareAmount} (total: £${newEarnings})`);
                }
              } else {
                console.warn(`⚠️ Ride ${update.rideId} completed but driver_id=${rideData.driver_id}, fareAmount=${fareAmount} — skipping earnings update`);
              }
              // Check if payment method is cash to insert payment record natively (Cards are charged and inserted earlier)
              if (rideData.payment_method !== "card") {
                const { error: paymentError } = await supabase.from("payments").insert({
                  ride_id: update.rideId,
                  user_id: rideData.rider_id,
                  amount: fareAmount,
                  currency: "gbp",
                  status: "succeeded",
                  payment_method: "cash",
                  completed_at: new Date().toISOString()
                });
                if (paymentError) {
                  console.error("❌ Failed to insert completed ride payment:", paymentError);
                } else {
                  console.log(`✅ Inserted payment £${fareAmount} for completed ride ${update.rideId}`);
                }

                // ✅ Also update the ride to mark it as fully paid/completed 
                await supabase.from("rides").update({ payment_status: "paid" }).eq("id", update.rideId);
              }

              // ✅ Insert wallet_transaction so the rider can see the fare in their transaction history
              if (rideData.rider_id && fareAmount > 0) {
                try {
                  const payMethod = rideData.payment_method === "card" ? "card" : "cash";
                  const { error: walletTxnErr } = await supabase
                    .from("wallet_transactions")
                    .insert({
                      user_id: rideData.rider_id,
                      ride_id: update.rideId,
                      amount: fareAmount,
                      type: "debit",
                      description: `Ride fare — paid by ${payMethod}`,
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

        const fareAmount = rideRow.estimated_price || 0;
        const ridePaymentMethod = rideRow.payment_method || "cash";

        console.log(`💳 No-show: ride ${data.rideId} payment_method=${ridePaymentMethod}, fare=£${fareAmount}`);

        // ─── 2. Charge the rider's saved card via Stripe ────────────────────
        let stripeChargeSuccess = false;
        let stripePaymentIntentId: string | undefined;
        let stripeChargeError: string | undefined;

        if (rideRow.rider_id && fareAmount > 0) {
          try {
            const { data: riderUser } = await supabase
              .from("users")
              .select("stripe_customer_id, wallet_balance")
              .eq("id", rideRow.rider_id)
              .single();

            const stripeCustomerId = riderUser?.stripe_customer_id;

            if (stripeCustomerId) {
              console.log(`💳 Attempting to charge saved card for rider ${rideRow.rider_id} (Stripe customer: ${stripeCustomerId})`);
              const chargeResult = await chargeSavedCard(
                stripeCustomerId,
                fareAmount,
                data.rideId,
                "gbp",
                "no_show_fee"
              );

              stripeChargeSuccess = chargeResult.success;
              stripePaymentIntentId = chargeResult.paymentIntentId;
              stripeChargeError = chargeResult.error;

              if (stripeChargeSuccess) {
                console.log(`✅ No-show fee £${fareAmount} charged to saved card for ride ${data.rideId}`);
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

        // ─── 4. If card charge failed, fall back to wallet deduction ─────────
        if (!stripeChargeSuccess && rideRow.rider_id && fareAmount > 0) {
          try {
            const { data: userRow } = await supabase
              .from("users")
              .select("wallet_balance")
              .eq("id", rideRow.rider_id)
              .single();

            const currentBalance = userRow?.wallet_balance || 0;
            const newBalance = Math.max(0, currentBalance - fareAmount);

            await supabase
              .from("users")
              .update({ wallet_balance: newBalance })
              .eq("id", rideRow.rider_id);

            console.log(`💰 No-show penalty (wallet fallback): Debited £${fareAmount} from rider ${rideRow.rider_id} wallet (${currentBalance} → ${newBalance})`);

            await supabase
              .from("wallet_transactions")
              .insert({
                user_id: rideRow.rider_id,
                ride_id: data.rideId,
                amount: fareAmount,
                type: "debit",
                description: `No-show cancellation fee — driver waited 10 minutes (card charge failed: ${stripeChargeError || 'unknown'})`,
              });
          } catch (walletErr) {
            console.error("❌ Failed to debit no-show penalty from wallet:", walletErr);
          }
        }

        // ─── 5. Record payment in payments table ─────────────────────────────
        if (rideRow.rider_id && fareAmount > 0) {
          try {
            await supabase.from("payments").insert({
              ride_id: data.rideId,
              user_id: rideRow.rider_id,
              amount: fareAmount,
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
                  amount: fareAmount,
                  type: "debit",
                  description: `No-show cancellation fee — charged to saved card`,
                });
            } catch (_) { }
          }
        }

        // ─── 5b. Credit driver's earnings with the no-show fee ────────────────
        if (rideRow.driver_id && fareAmount > 0) {
          try {
            const { data: driverData } = await supabase
              .from("drivers")
              .select("total_earnings")
              .eq("id", rideRow.driver_id)
              .single();

            const currentEarnings = driverData?.total_earnings || 0;
            const newEarnings = Number((currentEarnings + fareAmount).toFixed(2));

            await supabase
              .from("drivers")
              .update({ total_earnings: newEarnings })
              .eq("id", rideRow.driver_id);

            console.log(`✅ Driver ${rideRow.driver_id} earnings updated for no-show: +£${fareAmount} (total: £${newEarnings})`);
          } catch (earningsErr) {
            console.error("❌ Error updating driver earnings on no-show:", earningsErr);
          }
        }

        // ─── 6. Notify the rider ─────────────────────────────────────────────
        io.to(`rider:${rideRow.rider_id}`).emit("ride:update", {
          rideId: data.rideId,
          status: "cancelled_no_show",
          noShowFare: fareAmount,
          chargedVia: stripeChargeSuccess ? "card" : "wallet",
        });

        // ─── 7. Notify the driver ────────────────────────────────────────────
        const rInfo = activeRides.get(data.rideId);
        if (rInfo?.driverSocketId) {
          io.to(rInfo.driverSocketId).emit("ride:update", {
            rideId: data.rideId,
            status: "cancelled_no_show",
            noShowFare: fareAmount,
            earningsAdded: fareAmount,
          });
        }
        if (rideRow.driver_id) {
          io.to(`driver:${rideRow.driver_id}`).emit("ride:update", {
            rideId: data.rideId,
            status: "cancelled_no_show",
            noShowFare: fareAmount,
            earningsAdded: fareAmount,
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

            if (driverByUserId) {
              console.log(`🔄 payment_collected — Resolved auth user_id ${payingDriverId} → driver table id ${driverByUserId.id}`);
              payingDriverId = driverByUserId.id;
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
          if (existingRide?.driver_id) {
            payingDriverId = existingRide.driver_id;
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
                  const currentEarnings = driverRecord.total_earnings || 0;
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
                  console.warn("⚠️ Failed to insert wallet_transaction (table may not exist):", txnErr.message);
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
          // Check if driver has an active ride — if so, give a grace period
          // to allow reconnection after switching to Google Maps
          let hasActiveRide = false;
          for (const [, rideInfo] of activeRides.entries()) {
            if (rideInfo.driverSocketId === socket.id) {
              hasActiveRide = true;
              break;
            }
          }

          if (hasActiveRide) {
            console.log(`⏳ Driver ${driverId} disconnected during active ride — waiting 30s before marking offline`);
            // Grace period: wait 30 seconds before marking offline
            setTimeout(async () => {
              // Check if driver reconnected with a NEW socket in the meantime
              const currentSocketId = connectedDrivers.get(driverId);
              if (currentSocketId && currentSocketId !== socket.id) {
                console.log(`✅ Driver ${driverId} reconnected with new socket ${currentSocketId} — keeping online`);
                return; // Driver reconnected, don't mark offline
              }
              // Driver did NOT reconnect — mark offline
              if (!currentSocketId || currentSocketId === socket.id) {
                connectedDrivers.delete(driverId);
                console.log(`📊 Driver ${driverId} did not reconnect within 30s — marking offline. Remaining: ${connectedDrivers.size}`);
                try {
                  await supabase
                    .from("drivers")
                    .update({ is_online: false, is_available: false })
                    .eq("id", driverId);
                } catch (error) {
                  console.error("Error updating driver status on disconnect:", error);
                }
              }
            }, 30000);
          } else {
            // No active ride — mark offline immediately
            connectedDrivers.delete(driverId);
            console.log(`📊 Driver ${driverId} disconnected (no active ride). Remaining connected drivers: ${connectedDrivers.size}`);
            try {
              await supabase
                .from("drivers")
                .update({ is_online: false, is_available: false })
                .eq("id", driverId);
            } catch (error) {
              console.error("Error updating driver status on disconnect:", error);
            }
          }
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
