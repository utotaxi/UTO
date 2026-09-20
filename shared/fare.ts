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
 * The fare a driver should be shown for a scheduled booking — marketplace
 * list, upcoming list, and the job details screen all use this so they can
 * never disagree.
 *
 * Always returns the coupon-adjusted amount the rider actually pays: a £100
 * fare with a £10 coupon is £90, never £100. That matters because the two
 * booking tables disagree about what they store:
 *
 *   - later_bookings rows written by our own POST handler keep the full
 *     pre-discount fare in estimated_fare with the coupon in discount_amount;
 *   - web_booker / admin rows may already hold the discounted amount in
 *     estimated_fare alongside a separate gross column.
 *
 * Both shapes resolve to the same number here, and the discount is subtracted
 * at most once.
 */
export function resolveBookingDisplayFare(booking: any): number {
  if (!booking) return 0;
  const positive = (value: any): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const discount = Math.max(
    0,
    Number(booking.discount_amount ?? booking.discountAmount ?? 0) || 0,
  );
  const estimated = positive(booking.estimated_fare ?? booking.estimatedFare);
  const driverFare = positive(booking.driver_fare ?? booking.driverFare);
  const preDiscountTotal = positive(
    booking.full_fare ??
      booking.fullFare ??
      booking.estimated_price ??
      booking.estimatedPrice,
  );

  // A gross total larger than estimated_fare means estimated_fare has already
  // had the coupon taken off — use it as-is instead of discounting twice.
  if (
    estimated != null &&
    preDiscountTotal != null &&
    preDiscountTotal > estimated + 0.009 &&
    discount > 0
  ) {
    return getDiscountedFare(estimated, 0);
  }

  const full = preDiscountTotal ?? estimated;
  if (full != null) return getDiscountedFare(full, discount);

  // Nothing to discount against — the API sets driver_fare to the payable
  // amount, so trust it rather than subtracting the coupon a second time.
  if (driverFare != null) return Number(driverFare.toFixed(2));
  return 0;
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
