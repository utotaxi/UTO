import {
  DRIVER_DEDUCTION_TYPE,
  formatLiveRideCancellationPenalty,
  formatScheduledBookingCancellationPenalty,
} from "../../shared/driverDeductions";

export { formatLiveRideCancellationPenalty, formatScheduledBookingCancellationPenalty };

function getMissingSchemaColumn(error: any): string | null {
  const message = String(error?.message || "");
  const quotedMatch = message.match(/Could not find the '([^']+)' column/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const sqlMatch = message.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  return sqlMatch?.[1] || null;
}

async function resolveDriverUserId(
  supabase: { from: (table: string) => any },
  driverId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("drivers")
      .select("user_id")
      .eq("id", driverId)
      .maybeSingle();
    if (error) {
      console.warn(`⚠️ Could not resolve user_id for driver ${driverId}:`, error);
      return null;
    }
    return data?.user_id || null;
  } catch (error) {
    console.warn(`⚠️ Driver user lookup failed for ${driverId}:`, error);
    return null;
  }
}

async function updateDeductionWithFallback(
  supabase: { from: (table: string) => any },
  deductionId: string,
  payload: Record<string, any>,
): Promise<void> {
  const nextPayload: Record<string, any> = { ...payload };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase
      .from("driver_deductions")
      .update(nextPayload)
      .eq("id", deductionId);
    if (!error) return;

    const missingColumn = getMissingSchemaColumn(error);
    if (missingColumn && missingColumn in nextPayload) {
      delete nextPayload[missingColumn];
      continue;
    }
    throw error;
  }
}

async function insertDeductionWithFallback(
  supabase: { from: (table: string) => any },
  payload: Record<string, any>,
): Promise<void> {
  const nextPayload: Record<string, any> = { ...payload };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase
      .from("driver_deductions")
      .insert(nextPayload);
    if (!error) return;

    const missingColumn = getMissingSchemaColumn(error);
    if (missingColumn && missingColumn in nextPayload) {
      delete nextPayload[missingColumn];
      continue;
    }
    throw error;
  }
}

export async function findExistingDriverPenaltyDeduction(
  supabase: { from: (table: string) => any },
  params: { driverId: string; reason: string; rideId?: string },
): Promise<{ id: string } | null> {
  const { driverId, reason, rideId } = params;

  const { data: byReason, error: reasonErr } = await supabase
    .from("driver_deductions")
    .select("id")
    .eq("driver_id", driverId)
    .eq("reason", reason)
    .limit(1)
    .maybeSingle();
  if (reasonErr) throw reasonErr;
  if (byReason?.id) return { id: byReason.id };

  // Fallback: any prior row whose reason mentions this ride id (covers label drift).
  if (rideId) {
    const { data: byRide, error: rideErr } = await supabase
      .from("driver_deductions")
      .select("id, reason")
      .eq("driver_id", driverId)
      .ilike("reason", `%${rideId}%`)
      .limit(5);
    if (rideErr) throw rideErr;
    const match = (byRide || []).find((row: any) => String(row?.reason || "").includes(rideId));
    if (match?.id) return { id: match.id };
  }

  return null;
}

/**
 * Insert-or-update a driver penalty. Returns created=true only on first insert
 * so callers can deduct earnings exactly once per ride.
 */
export async function upsertDriverPenaltyDeduction(
  supabase: { from: (table: string) => any },
  params: {
    driverId: string;
    amount: number;
    type: string;
    reason: string;
    createdAt?: string;
    rideId?: string;
  },
): Promise<{ created: boolean; id?: string }> {
  const { driverId, amount, type, reason, createdAt, rideId } = params;
  const existing = await findExistingDriverPenaltyDeduction(supabase, {
    driverId,
    reason,
    rideId,
  });

  const driverUserId = await resolveDriverUserId(supabase, driverId);
  const payload: Record<string, any> = {
    driver_id: driverId,
    amount,
    type,
    reason,
  };
  if (driverUserId) {
    payload.user_id = driverUserId;
  }

  if (existing?.id) {
    // Do not bump created_at on updates — keeps the original charge time.
    await updateDeductionWithFallback(supabase, existing.id, {
      driver_id: payload.driver_id,
      amount: payload.amount,
      type: payload.type,
      reason: payload.reason,
      ...(payload.user_id ? { user_id: payload.user_id } : {}),
    });
    return { created: false, id: existing.id };
  }

  payload.created_at = createdAt || new Date().toISOString();
  await insertDeductionWithFallback(supabase, payload);
  return { created: true };
}
