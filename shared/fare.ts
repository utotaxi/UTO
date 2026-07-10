/**
 * Shared fare helpers so rider charge, driver earnings, and UI all use
 * the same coupon-adjusted amount.
 */

export function getDiscountedFare(
  fullFare: number | null | undefined,
  discountAmount: number | null | undefined = 0,
): number {
  const fare = Number(fullFare || 0);
  const discount = Math.max(0, Number(discountAmount || 0));
  return Number(Math.max(0, fare - discount).toFixed(2));
}

/** Driver cancel-at-pickup penalty: 50% of the (discounted) fare. */
export function getDriverCancelPenalty(
  fullFare: number | null | undefined,
  discountAmount: number | null | undefined = 0,
): number {
  return Number((getDiscountedFare(fullFare, discountAmount) * 0.5).toFixed(2));
}
