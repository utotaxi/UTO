// services/dispatch.ts
// Helper to reassign a ride to the next nearest available driver

import { supabase } from "../db";
import { io } from "../socket";
import { getCompatibleVehicleTypes } from "../socket"; // reuse vehicle compatibility helper

const RECENT_DRIVER_SEEN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Find the nearest online driver (excluding the current driver) and assign the ride.
 * Emits a `ride:new` event to the selected driver.
 *
 * @param rideId - ID of the ride to reassign
 */
export async function reassignRide(
  rideId: string,
  excludedDriverIds: string[] = [],
): Promise<void> {
  try {
    // Fetch ride details (pickup location & current driver if any)
    const { data: ride, error: rideErr } = await supabase
      .from("rides")
      .select("id, pickup_latitude, pickup_longitude, driver_id, vehicle_type")
      .eq("id", rideId)
      .maybeSingle();
    if (rideErr) throw rideErr;
    if (!ride) return;

    const { pickup_latitude, pickup_longitude, driver_id, vehicle_type } = ride as any;

    // Build exclusion set of all driver identity IDs to skip
    const excludedSet = new Set<string>();
    if (driver_id) excludedSet.add(String(driver_id));
    for (const exId of excludedDriverIds) {
      if (exId) excludedSet.add(String(exId));
    }

    // Find online drivers (is_online true or recently seen) that are not excluded
    const recentSeenCutoff = new Date(Date.now() - RECENT_DRIVER_SEEN_MS).toISOString();
    const { data: drivers, error: driversErr } = await supabase
      .from("drivers")
      .select("id, user_id, current_latitude, current_longitude, vehicle_type, is_online, last_seen_at")
      .or(`is_online.eq.true,last_seen_at.gte."${recentSeenCutoff}"`);
    // Determine compatible vehicle types for this ride
    const compatibleTypes = getCompatibleVehicleTypes(vehicle_type);
    // Filter drivers by vehicle compatibility inside the loop
    // (will be checked per driver)

    if (!drivers || drivers.length === 0) {
      console.warn(`⚠️ No available drivers to reassign ride ${rideId}`);
      return;
    }

    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) => {
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
      // Exclude both driver.id and driver.user_id if present in the exclusion set
      if (excludedSet.has(String(d.id)) || (d.user_id && excludedSet.has(String(d.user_id)))) continue;
      // Ensure location data is available
      // Ensure driver vehicle type is compatible
      if (!compatibleTypes.includes(d.vehicle_type || "saloon")) continue;
      const dist = haversine(
        pickup_latitude,
        pickup_longitude,
        d.current_latitude,
        d.current_longitude,
      );
      if (dist < minDist) {
        minDist = dist;
        nearestDriver = d;
      }
    }

    if (!nearestDriver) {
      console.warn(
        `⚠️ No suitable driver found for reassigning ride ${rideId}`,
      );
      return;
    }

    // Keep status pending so the normal accept/dispatch claim path can run.
    // "requested" is not a dispatchable status and would block rematch offers.
    const { error: updateErr } = await supabase
      .from("rides")
      .update({ driver_id: nearestDriver.id, status: "pending" })
      .eq("id", rideId);
    if (updateErr) throw updateErr;

    // Emit new ride request to the chosen driver
    io.to(`driver:${nearestDriver.id}`).emit("ride:new", {
      rideId,
      driverId: nearestDriver.id,
    });
    console.log(`✅ Ride ${rideId} reassigned to driver ${nearestDriver.id}`);
  } catch (e) {
    console.error(`❌ Failed to reassign ride ${rideId}:`, e);
  }
}
