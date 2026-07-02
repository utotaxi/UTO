import dotenv from "dotenv";
import path from "path";
import {
  DRIVER_DEDUCTION_TYPE,
  formatLiveRideCancellationPenalty,
  formatScheduledBookingCancellationPenalty,
  LEGACY_CANCELLATION_CREDIT_TYPES,
  LEGACY_DRIVER_PENALTY_TYPES,
} from "../shared/driverDeductions";
import { upsertDriverPenaltyDeduction } from "../server/services/driverDeductions";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function resolvePenaltyDetails(id: string, type: string, reason?: string | null): {
  type: string;
  reason: string;
} | null {
  const liveRideMatch = id.match(/^ride_(.+?)_(?:cancel_at_pickup|cancellation)$/);
  if (liveRideMatch?.[1]) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: formatLiveRideCancellationPenalty(liveRideMatch[1]),
    };
  }

  const scheduledMatch = id.match(/^later_(.+?)_driver_late_cancel$/);
  if (scheduledMatch?.[1]) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: formatScheduledBookingCancellationPenalty(scheduledMatch[1]),
    };
  }

  const rideFromReason = reason?.match(/ride (ride_[^\s]+)/i)?.[1];
  if (rideFromReason) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: formatLiveRideCancellationPenalty(rideFromReason),
    };
  }

  const bookingFromReason = reason?.match(/scheduled booking ([^\s]+)/i)?.[1];
  if (bookingFromReason) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: formatScheduledBookingCancellationPenalty(bookingFromReason),
    };
  }

  if (type.startsWith("50% cancellation penalty for ride ")) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: type,
    };
  }

  if (type.startsWith("50% cancellation penalty for scheduled booking ")) {
    return {
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: type,
    };
  }

  return null;
}

function isCreditRow(type: string): boolean {
  return (
    type === DRIVER_DEDUCTION_TYPE.COMMISSION ||
    LEGACY_CANCELLATION_CREDIT_TYPES.includes(type as typeof LEGACY_CANCELLATION_CREDIT_TYPES[number])
  );
}

async function normalizeDriverDeductionSigns() {
  const { supabase } = await import("../server/db");

  const manualRideId = getArg("ride-id");
  const manualDriverId = getArg("driver-id");
  const manualAmount = Number(getArg("amount") || 0);

  if (manualRideId || manualDriverId || manualAmount) {
    if (!manualRideId || !manualDriverId || manualAmount <= 0) {
      throw new Error("Manual repair requires --ride-id, --driver-id and positive --amount");
    }

    const penaltyLabel = formatLiveRideCancellationPenalty(manualRideId);
    await upsertDriverPenaltyDeduction(supabase, {
      driverId: manualDriverId,
      amount: -Math.abs(Number(manualAmount.toFixed(2))),
      type: DRIVER_DEDUCTION_TYPE.PENALTY,
      reason: penaltyLabel,
    });

    console.log(`Upserted manual driver deduction for ${manualRideId}.`);
  }

  const { data, error } = await supabase
    .from("driver_deductions")
    .select("id, amount, type, reason");

  if (error) {
    throw new Error(`Failed to fetch driver deductions: ${error.message}`);
  }

  let updatedAmounts = 0;
  let updatedLabels = 0;
  let inserted = 0;

  for (const row of data || []) {
    const amount = Number(row.amount || 0);
    const nextAmount = isCreditRow(row.type) ? Math.abs(amount) : -Math.abs(amount);
    const nextDetails = resolvePenaltyDetails(row.id, row.type, row.reason);
    const shouldFixAmount = !Object.is(amount, nextAmount);
    const shouldFixLabel =
      !!nextDetails &&
      !isCreditRow(row.type) &&
      (LEGACY_DRIVER_PENALTY_TYPES.includes(row.type as typeof LEGACY_DRIVER_PENALTY_TYPES[number]) ||
        row.type !== nextDetails.type ||
        row.reason !== nextDetails.reason);

    if (!shouldFixAmount && !shouldFixLabel) continue;

    const updatePayload: Record<string, string | number> = {};
    if (shouldFixAmount) updatePayload.amount = nextAmount;
    if (shouldFixLabel && nextDetails) {
      updatePayload.type = nextDetails.type;
      updatePayload.reason = nextDetails.reason;
    }

    const { error: updateError } = await supabase
      .from("driver_deductions")
      .update(updatePayload)
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`Failed to update deduction ${row.id}: ${updateError.message}`);
    }

    if (shouldFixAmount) updatedAmounts += 1;
    if (shouldFixLabel) updatedLabels += 1;
  }

  const existingReasons = new Set(
    (data || [])
      .map((row) => row.reason)
      .filter(Boolean),
  );

  const { data: driverCancelledRides, error: ridesError } = await supabase
    .from("rides")
    .select("id, driver_id, estimated_price, cancelled_at")
    .eq("status", "cancelled")
    .not("driver_id", "is", null);

  if (ridesError) {
    console.warn(`Could not backfill ride deductions: ${ridesError.message}`);
  } else {
    for (const ride of driverCancelledRides || []) {
      const penaltyLabel = formatLiveRideCancellationPenalty(ride.id);
      if (existingReasons.has(penaltyLabel)) continue;

      const fee = Number(Number(ride.estimated_price || 0) * 0.5);
      if (!ride.driver_id || fee <= 0) continue;

      await upsertDriverPenaltyDeduction(supabase, {
        driverId: ride.driver_id,
        amount: -Math.abs(Number(fee.toFixed(2))),
        type: DRIVER_DEDUCTION_TYPE.PENALTY,
        reason: penaltyLabel,
        createdAt: ride.cancelled_at || new Date().toISOString(),
      });

      existingReasons.add(penaltyLabel);
      inserted += 1;
    }
  }

  const { data: driverCancelledBookings, error: bookingsError } = await supabase
    .from("later_bookings")
    .select("id, driver_id, estimated_fare, driver_cancelled_at")
    .not("driver_id", "is", null);

  if (bookingsError) {
    console.warn(`Could not backfill scheduled booking deductions: ${bookingsError.message}`);
  } else {
    for (const booking of driverCancelledBookings || []) {
      const penaltyLabel = formatScheduledBookingCancellationPenalty(booking.id);
      if (existingReasons.has(penaltyLabel)) continue;

      const fee = Number(Number(booking.estimated_fare || 0) * 0.5);
      if (!booking.driver_id || fee <= 0) continue;

      await upsertDriverPenaltyDeduction(supabase, {
        driverId: booking.driver_id,
        amount: -Math.abs(Number(fee.toFixed(2))),
        type: DRIVER_DEDUCTION_TYPE.PENALTY,
        reason: penaltyLabel,
        createdAt: booking.driver_cancelled_at || new Date().toISOString(),
      });

      existingReasons.add(penaltyLabel);
      inserted += 1;
    }
  }

  console.log(
    `Normalized ${updatedAmounts} amount(s), updated ${updatedLabels} label(s), and backfilled ${inserted} driver deduction row(s).`,
  );
}

normalizeDriverDeductionSigns().catch((error) => {
  console.error(error);
  process.exit(1);
});
