/** Values allowed by Supabase driver_deductions_type_check */
export const DRIVER_DEDUCTION_TYPE = {
  PENALTY: "penalty",
  COMMISSION: "commission",
} as const;

export const LEGACY_DRIVER_PENALTY_TYPES = [
  "cancel_at_pickup_penalty",
  "late_cancel_penalty",
  "cancellation_fee",
] as const;

export const LEGACY_CANCELLATION_CREDIT_TYPES = ["cancellation_credit"] as const;

export function formatLiveRideCancellationPenalty(rideId: string): string {
  return `50% cancellation penalty for ride ${rideId}`;
}

export function formatScheduledBookingCancellationPenalty(bookingId: string): string {
  return `50% cancellation penalty for scheduled booking ${bookingId}`;
}

export function isCancellationCreditDeduction(type: string, reason?: string | null): boolean {
  if (type === DRIVER_DEDUCTION_TYPE.COMMISSION) return true;
  if (LEGACY_CANCELLATION_CREDIT_TYPES.includes(type as typeof LEGACY_CANCELLATION_CREDIT_TYPES[number])) {
    return true;
  }
  return !!reason && /credit/i.test(reason);
}

export function getDriverDeductionDisplayLabel(deduction: {
  type: string;
  reason?: string | null;
}): string {
  if (deduction.reason?.trim()) return deduction.reason.trim();
  if (
    deduction.type === DRIVER_DEDUCTION_TYPE.PENALTY ||
    LEGACY_DRIVER_PENALTY_TYPES.includes(deduction.type as typeof LEGACY_DRIVER_PENALTY_TYPES[number])
  ) {
    return "Cancellation penalty";
  }
  if (isCancellationCreditDeduction(deduction.type, deduction.reason)) {
    return "Cancellation fee credit";
  }
  return deduction.type || "Deduction";
}
