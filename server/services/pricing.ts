/**
 * Server-side fare quoting via the admin panel's pricing-rules endpoint.
 *
 * The app never reads the `pricing_rules` Supabase table directly (RLS is off
 * and it's keyed by the service-role key). Instead it calls the admin's
 * /api/quote endpoint, which applies the configured service-area rule:
 *   - both pickup + drop-off inside the service-area circle → pickup→drop-off
 *   - either point outside                                  → base→pickup→drop-off
 * The app does not need to know the circle or radius.
 *
 * This is the single source of truth for fares. Every booking-creation path
 * re-quotes here (never trusting a client-supplied price) and stores the
 * returned `price`. Client previews go through the app's own `POST /api/quote`
 * route, which proxies to this function so ADMIN_API_URL stays server-side.
 */

const QUOTE_TIMEOUT_MS = 5000;

const PRICING_UNAVAILABLE_MESSAGE = "Pricing unavailable — contact dispatch";

export class PricingUnavailableError extends Error {
  constructor(message: string = PRICING_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "PricingUnavailableError";
  }
}

export interface FareQuoteInput {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: string;
  minutes: number;
}

export interface FareQuote {
  price: number;
  billedMiles: number;
  routeMode: string;
  routeLabel: string;
  vehicle: string;
}

/**
 * Request an authoritative fare quote from the admin pricing service.
 *
 * @throws {PricingUnavailableError} on any failure — network error, timeout,
 *   non-2xx response, missing `success: true`, or a malformed/missing price.
 */
export async function getFareQuote(input: FareQuoteInput): Promise<FareQuote> {
  const adminApiUrl = process.env.ADMIN_API_URL;
  if (!adminApiUrl) {
    throw new PricingUnavailableError();
  }

  const url = `${adminApiUrl.replace(/\/+$/, "")}/api/quote`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_latitude: input.pickupLat,
        pickup_longitude: input.pickupLng,
        dropoff_latitude: input.dropoffLat,
        dropoff_longitude: input.dropoffLng,
        vehicle_type: input.vehicleType,
        minutes: input.minutes,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new PricingUnavailableError();
    }

    const data = await res.json();

    if (!data || data.success !== true) {
      throw new PricingUnavailableError();
    }

    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new PricingUnavailableError();
    }

    return {
      price,
      billedMiles: Number(data.billedMiles) || 0,
      routeMode: String(data.routeMode ?? ""),
      routeLabel: String(data.routeLabel ?? ""),
      vehicle: String(data.vehicle ?? input.vehicleType ?? ""),
    };
  } catch (err) {
    if (err instanceof PricingUnavailableError) {
      throw err;
    }
    // AbortError, network failure, JSON parse error, etc. — all surface as
    // "pricing unavailable" so callers never have to handle a different shape.
    throw new PricingUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}
