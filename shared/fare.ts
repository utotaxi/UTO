/**
 * Shared fare helpers so rider charge, driver earnings, penalties, and UI
 * all use the same coupon-adjusted amount.
 *
 * Example: £100 fare + 50% off (£50 discount) → payable £50.
 * All rules (complete, no-show, rider cancel, driver cancel penalty) use £50.
 */

export function getDiscountedFare(
  fullFare: number | null | undefined,
  discountAmount: number | null | undefined = 0,
): number {
  const fare = Number(fullFare || 0);
  const discount = Math.max(0, Number(discountAmount || 0));
  return Number(Math.max(0, fare - discount).toFixed(2));
}

/** Driver cancel-at-pickup / late-accept penalty: 50% of the discounted fare. */
export function getDriverCancelPenalty(
  fullFare: number | null | undefined,
  discountAmount: number | null | undefined = 0,
): number {
  return Number((getDiscountedFare(fullFare, discountAmount) * 0.5).toFixed(2));
}

/**
 * Resolve the payable fare from a ride/booking-like object.
 * Prefers final_price when set (completion amount), otherwise
 * estimated/full fare minus discount_amount.
 */
export function getPayableFareFromRide(ride: any): number {
  if (!ride) return 0;
  const finalPrice = Number(ride.final_price ?? ride.finalPrice ?? 0);
  if (finalPrice > 0) {
    return Number(finalPrice.toFixed(2));
  }
  const fullFare = Number(
    ride.estimated_price ??
      ride.estimatedPrice ??
      ride.farePrice ??
      ride.fare_price ??
      ride.estimated_fare ??
      0,
  );
  const discount = Number(ride.discount_amount ?? ride.discountAmount ?? 0);
  return getDiscountedFare(fullFare, discount);
}
