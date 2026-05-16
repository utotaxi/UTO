// services/dispatch.ts
// Helper to reassign a ride to the next nearest available driver

import { supabase } from "../db";
import { io } from "../socket"; // Assuming socket instance exported from server/socket.ts

/**
 * Find the nearest online driver (excluding the current driver) and assign the ride.
 * Emits a `ride:new` event to the selected driver.
 *
 * @param rideId - ID of the ride to reassign
 */
export async function reassignRide(rideId: string): Promise<void> {
  try {
    // Fetch ride details (pickup location & current driver if any)
    const { data: ride, error: rideErr } = await supabase
      .from("rides")
      .select("id, pickup_latitude, pickup_longitude, driver_id")
      .eq("id", rideId)
      .single();
    if (rideErr) throw rideErr;
    if (!ride) return;

    const { pickup_latitude, pickup_longitude, driver_id } = ride as any;

    // Find available drivers (is_available = true) that are not the current driver
    const { data: drivers, error: driversErr } = await supabase
      .from("drivers")
      .select("id, latitude, longitude, is_available")
      .eq("is_available", true);
    if (driversErr) throw driversErr;
    if (!drivers || drivers.length === 0) {
      console.warn(`⚠️ No available drivers to reassign ride ${rideId}`);
      return;
    }

    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // metres
      const φ1 = toRadians(lat1);
      const φ2 = toRadians(lat2);
      const Δφ = toRadians(lat2 - lat1);
      const Δλ = toRadians(lon2 - lon1);
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let nearestDriver: any = null;
    let minDist = Infinity;
    for (const d of drivers) {
      if (driver_id && d.id === driver_id) continue; // exclude current driver
      if (d.latitude == null || d.longitude == null) continue;
      const dist = haversine(pickup_latitude, pickup_longitude, d.latitude, d.longitude);
      if (dist < minDist) {
        minDist = dist;
        nearestDriver = d;
      }
    }

    if (!nearestDriver) {
      console.warn(`⚠️ No suitable driver found for reassigning ride ${rideId}`);
      return;
    }

    // Update ride with new driver and set status back to requested
    const { error: updateErr } = await supabase
      .from("rides")
      .update({ driver_id: nearestDriver.id, status: "requested" })
      .eq("id", rideId);
    if (updateErr) throw updateErr;

    // Emit new ride request to the chosen driver
    io.to(`driver:${nearestDriver.id}`).emit("ride:new", { rideId, driverId: nearestDriver.id });
    console.log(`✅ Ride ${rideId} reassigned to driver ${nearestDriver.id}`);
  } catch (e) {
    console.error(`❌ Failed to reassign ride ${rideId}:`, e);
  }
}
