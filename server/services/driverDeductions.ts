import {
  DRIVER_DEDUCTION_TYPE,
  formatLiveRideCancellationPenalty,
  formatScheduledBookingCancellationPenalty,
} from "../../shared/driverDeductions";

export { formatLiveRideCancellationPenalty, formatScheduledBookingCancellationPenalty };

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

  const payload = {
    driver_id: driverId,
    amount,
    type,
    reason,
    created_at: createdAt || new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("driver_deductions")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase
    .from("driver_deductions")
    .insert(payload);
  if (insertError) throw insertError;
}
