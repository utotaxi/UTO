//server/socket.ts - CORRECT SERVER IMPLEMENTATION

import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";  // ✅ CORRECT - Use socket.io for server
import { supabase } from "./db";
import { EventEmitter } from "events";
import { chargeSavedCard } from "./stripe";

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

// ─── Haversine Distance (miles) ──────────────────────────────────────────────
function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

const RADIUS_MILES = 5;            // 5-mile radius for driver eligibility
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
  });

  const connectedDrivers = new Map<string, string>();  // driverId -> socketId
  const connectedRiders = new Map<string, string>();    // riderId  -> socketId
  const activeRides = new Map<string, { riderSocketId: string; riderId?: string; declinedBy: Set<string>; rideData?: any; driverSocketId?: string }>();

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

    console.log(`📡 Dispatching ride ${rideId} to nearest driver ${entry.driverId} (${entry.distance.toFixed(2)} mi away)`);
    io.to(`driver:${entry.driverId}`).emit("ride:new", enrichedRide);

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
        activeRides.set(rideData.id, { riderSocketId: sourceSocketId || '', declinedBy: new Set(), rideData: rideData });

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
              distance: rideData.distanceKm || rideData.distanceMiles || 0,
              estimated_duration: rideData.durationMinutes || 0,
              payment_method: rideData.paymentMethod || "cash",
            };

            console.log('🚕 Inserting ride into Supabase:', JSON.stringify(insertPayload));

            const { data: insertedData, error: insertError } = await supabase
              .from("rides")
              .insert(insertPayload)
              .select()
              .single();

            if (insertError) {
              console.error("❌ Failed to save ride request to DB:", JSON.stringify(insertError));
            } else {
              console.log(`✅ Saved ride ${rideData.id} to Supabase! Row:`, insertedData?.id);
            }
          } catch (error) {
            console.error("❌ Exception saving ride request to DB:", error);
          }
        } else {
          console.warn('⚠️ No riderId in ride request, skipping DB save');
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

      // 2. Query all online drivers with their locations from DB
      //    We query is_online=true only (not is_available — the driver socket connection is the real signal)
      const { data: onlineDrivers, error: driversErr } = await supabase
        .from("drivers")
        .select("id, current_latitude, current_longitude, is_available")
        .eq("is_online", true);

      console.log(`📊 DB online drivers: ${onlineDrivers?.length || 0}, error: ${driversErr?.message || 'none'}`);

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

          if (driver.current_latitude != null && driver.current_longitude != null) {
            const dist = haversineDistanceMiles(
              pickupLat, pickupLng,
              driver.current_latitude, driver.current_longitude
            );
            console.log(`   📏 Driver ${driver.id}: ${dist.toFixed(2)} mi from pickup (has DB location)`);

            if (dist <= RADIUS_MILES) {
              heap.push({ driverId: driver.id, distance: dist, socketId: driverSocketId });
              addedDriverIds.add(driver.id);
            } else {
              console.log(`   ⏭️ Driver ${driver.id} is ${dist.toFixed(2)} mi away — outside ${RADIUS_MILES} mi radius`);
            }
          } else {
            console.log(`   ⚠️ Driver ${driver.id} has no DB location, will try as fallback`);
          }
        }
      }

      // Second pass: Add any socket-connected drivers not yet in heap
      // (they may not have location in DB yet but are actively connected)
      for (const [driverId, socketId] of connectedDrivers) {
        if (!addedDriverIds.has(driverId)) {
          // Assign a default distance (e.g., 1 mile) since we don't know their exact location
          // This ensures they still get ride offers
          console.log(`   🔄 Adding socket-connected driver ${driverId} without DB location (default 1 mi distance)`);
          heap.push({ driverId, distance: 1.0, socketId });
          addedDriverIds.add(driverId);
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
      const dispatchState: DispatchState = {
        heap,
        timer: null,
        rideData,
        riderSocketId: sourceSocketId || '',
        currentDriverId: null,
        cancelled: false,
      };
      dispatchQueues.set(rideData.id, dispatchState);
      dispatchToNextDriver(rideData.id);
    };


  io.on("connection", (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on("driver:connect", async (driverId: string) => {
      connectedDrivers.set(driverId, socket.id);
      socket.join(`driver:${driverId}`);
      console.log(`🚗 Driver ${driverId} connected (socket ${socket.id})`);
      console.log(`📊 Total connected drivers: ${connectedDrivers.size}`);

      try {
        // Set driver as online AND available when they connect
        const { error } = await supabase
          .from("drivers")
          .update({ is_online: true, is_available: true })
          .eq("id", driverId);
        if (error) {
          console.error("❌ Error updating driver status on connect:", error);
        } else {
          console.log(`✅ Driver ${driverId} marked online + available in DB`);
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

    socket.on("driver:location", async (location: DriverLocation) => {
      try {
        await supabase
          .from("drivers")
          .update({
            current_latitude: location.latitude,
            current_longitude: location.longitude,
          })
          .eq("id", location.driverId);

        await supabase.from("driver_locations").insert({
          driver_id: location.driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
        });

        const { data: activeRidesData } = await supabase
          .from("rides")
          .select("*")
          .eq("driver_id", location.driverId);

        for (const ride of (activeRidesData || [])) {
          if (["accepted", "arriving", "in_progress"].includes(ride.status)) {
            io.to(`rider:${ride.rider_id}`).emit("driver:location", location);
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
        console.log(`⏭️ Driver ${data.driverId} declined — dispatching to next nearest driver`);
        dispatchToNextDriver(data.rideId);
      }
    });

    socket.on("ride:accept", async (data: { rideId: string; driverId: string }) => {
      console.log('✅ Ride accepted:', data.rideId, 'by driver:', data.driverId);

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
        // Resolve the actual driver table ID (handle case where client sends user_id instead of driver id)
        let actualDriverId = data.driverId;

        // First check if this ID exists directly in the drivers table
        const { data: directDriver } = await supabase
          .from("drivers")
          .select("id, vehicle_make, vehicle_model, license_plate, user_id")
          .eq("id", data.driverId)
          .single();

        if (!directDriver) {
          // The ID might be a user_id (auth ID), try to find the driver by user_id
          const { data: driverByUserId } = await supabase
            .from("drivers")
            .select("id, vehicle_make, vehicle_model, license_plate, user_id")
            .eq("user_id", data.driverId)
            .single();

          if (driverByUserId) {
            console.log(`🔄 ride:accept — Resolved auth user_id ${data.driverId} → driver table id ${driverByUserId.id}`);
            actualDriverId = driverByUserId.id;
          } else {
            console.warn(`⚠️ ride:accept — driver_id ${data.driverId} not found in drivers table`);
          }
        }

        const updatePayload: Record<string, any> = {
          driver_id: actualDriverId,
          status: "accepted",
          accepted_at: new Date().toISOString(),
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
          io.to(`rider:${ride.rider_id}`).emit("ride:accepted", {
            rideId: data.rideId,
            driverId: actualDriverId,
          });
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

        // Priority 5: Check if the driverId from payload is actually a user_id (auth ID) and resolve to drivers table ID
        if (resolvedDriverId) {
          try {
            // First check if this ID exists directly in the drivers table
            const { data: directDriver } = await supabase
              .from("drivers")
              .select("id")
              .eq("id", resolvedDriverId)
              .single();

            if (!directDriver) {
              // The ID might be a user_id (auth ID), try to find the driver by user_id
              const { data: driverByUserId } = await supabase
                .from("drivers")
                .select("id")
                .eq("user_id", resolvedDriverId)
                .single();

              if (driverByUserId) {
                console.log(`🔄 Resolved auth user_id ${resolvedDriverId} → driver table id ${driverByUserId.id}`);
                resolvedDriverId = driverByUserId.id;
              } else {
                console.warn(`⚠️ driver_id ${resolvedDriverId} not found in drivers table (neither as id nor user_id)`);
              }
            }
          } catch (_) {
            // Non-critical - proceed with the resolved ID as-is
          }
        }

        console.log(`🔍 Final resolved driver_id for ride ${update.rideId}: ${resolvedDriverId || 'NOT FOUND'}`);

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

            // (arrived timer clear logic removed as it's now client-side)
          }

          console.log(`📝 Updating ride ${update.rideId} in Supabase with:`, JSON.stringify(updateData));

          const { data: updatedRide, error: statusUpdateError } = await supabase
            .from("rides")
            .update(updateData)
            .eq("id", update.rideId)
            .select()
            .single();

          if (statusUpdateError) {
            console.error("❌ Failed to update ride status:", statusUpdateError);
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
          io.to(rideInfo.riderSocketId).emit("ride:update", update);
          
          // ALSO broadcast to the rider room in case they disconnected and reconnected with a new socket
          if (rideInfo.riderId) {
            io.to(`rider:${rideInfo.riderId}`).emit("ride:update", update);
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

        // Only proceed if ride is still in "arrived" status
        if (rideRow.status !== "arrived") {
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
          const collectedAmount = data.amount || rideRow?.estimated_price || 0;
          const expectedFare = rideRow?.final_price || rideRow?.estimated_price || 0;
          // Trust client-provided extraAmount (already calculated correctly) with server recalc as fallback
          const serverExtraAmount = Math.max(0, collectedAmount - expectedFare);
          const extraAmount = (typeof data.extraAmount === 'number' && data.extraAmount > 0) ? data.extraAmount : serverExtraAmount;

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
          connectedDrivers.delete(driverId);
          console.log(`📊 Driver ${driverId} disconnected. Remaining connected drivers: ${connectedDrivers.size}`);
          try {
            await supabase
              .from("drivers")
              .update({ is_online: false, is_available: false })
              .eq("id", driverId);
          } catch (error) {
            console.error("Error updating driver status on disconnect:", error);
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
