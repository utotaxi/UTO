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

export async function upsertDriverPenaltyDeduction(
  supabase: { from: (table: string) => any },
  params: {
    driverId: string;
    amount: number;
    type: string;
    reason: string;
    createdAt?: string;
  },
): Promise<void> {
  const { driverId, amount, type, reason, createdAt } = params;
  const { data: existing, error: lookupError } = await supabase
    .from("driver_deductions")
    .select("id")
    .eq("driver_id", driverId)
    .eq("reason", reason)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const driverUserId = await resolveDriverUserId(supabase, driverId);
  const payload: Record<string, any> = {
    driver_id: driverId,
    amount,
    type,
    reason,
    created_at: createdAt || new Date().toISOString(),
  };
  if (driverUserId) {
    payload.user_id = driverUserId;
  }

  if (existing?.id) {
    await updateDeductionWithFallback(supabase, existing.id, payload);
    return;
  }

  await insertDeductionWithFallback(supabase, payload);
}
