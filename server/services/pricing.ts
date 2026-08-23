/**
 * Server-side fare quoting from Supabase pricing tables.
 *
 * Circle / service-area rule (scheduled + ASAP share this path):
 *   1. Both pickup AND drop-off inside the circle
 *      → `pricing_rules`, route Pickup → Drop-off
 *   2. Inbound: pickup outside, drop-off inside (elsewhere → service area)
 *      → `pricing_rules`, route Pickup → Drop-off only
 *        (no base leg — downward toward the service area)
 *   3. Outbound / fully outside (drop-off outside, or both outside)
 *      → `service_area_base_pricing`, route Base → Pickup → Drop-off
 *        (circle center is treated as the base)
 *
 * Optional ADMIN_API_URL `/api/quote` is only used as a last-resort fallback
 * when local Supabase pricing cannot produce a fare.
 */

import { supabase } from "../db";
import { haversineDistanceMiles } from "./driverMatching";

const QUOTE_TIMEOUT_MS = 5000;
const METERS_PER_MILE = 1609.344;

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

type LatLng = { lat: number; lng: number };

type MileTier = Array<{ id: string; after_miles: string | number }>;

type VehicleRate = {
  enabled?: boolean;
  min_price?: number;
  start_price?: number;
  waiting_price?: number;
  base_mile_price?: number;
  mile_tier_prices?: Record<string, number>;
  base_minute_price?: number;
  minute_tier_prices?: Record<string, number>;
};

type PricingRuleRow = {
  id: string;
  vehicles?: Record<string, VehicleRate>;
  mile_tiers?: MileTier;
  minute_tiers?: MileTier;
  service_area_id?: string | null;
  rule_type?: string | null;
  apply_web_booker?: boolean | null;
  apply_dispatch_panel?: boolean | null;
  updated_at?: string | null;
};

type ServiceAreaRow = {
  id: string;
  name?: string | null;
  area_type?: string | null;
  coordinates?: any;
  radius_meters?: number | null;
  is_active?: boolean | null;
  description?: string | null;
};

function normalizeVehicleKey(value: any): string {
  if (!value) return "saloon";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^peoplecarrier$/, "people_carrier")
    .replace(/^mini_bus$/, "minibus")
    .replace(/^saloon_car$/, "saloon");
}

/** Map app vehicle ids onto pricing table keys (e.g. "Saloon"). */
function resolveVehicleRate(
  vehicles: Record<string, VehicleRate> | null | undefined,
  vehicleType: string,
): { key: string; rate: VehicleRate } | null {
  if (!vehicles || typeof vehicles !== "object") return null;
  const wanted = normalizeVehicleKey(vehicleType);
  const entries = Object.entries(vehicles);
  const match =
    entries.find(
      ([key]) => normalizeVehicleKey(key) === wanted,
    ) ||
    entries.find(([key]) => {
      const n = normalizeVehicleKey(key);
      return (
        (wanted === "saloon" && n.includes("saloon")) ||
        (wanted === "minibus" && n.includes("minibus")) ||
        (wanted === "people_carrier" &&
          (n.includes("people") || n.includes("carrier") || n.includes("mpv")))
      );
    });
  if (!match) return null;
  const [key, rate] = match;
  if (rate && rate.enabled === false) return null;
  return { key, rate: rate || {} };
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return haversineDistanceMiles(lat1, lon1, lat2, lon2) * METERS_PER_MILE;
}

function parseCircleCenter(area: ServiceAreaRow): LatLng | null {
  const coords = area.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const first = coords[0];
  // [[lat, lng], ...] or { lat, lng } or [lat, lng]
  if (Array.isArray(first) && first.length >= 2) {
    const lat = Number(first[0]);
    const lng = Number(first[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  if (first && typeof first === "object") {
    const lat = Number((first as any).lat ?? (first as any).latitude);
    const lng = Number((first as any).lng ?? (first as any).longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  if (typeof first === "number" && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function isPointInsideCircle(
  point: LatLng,
  center: LatLng,
  radiusMeters: number,
): boolean {
  if (!(radiusMeters > 0)) return false;
  return (
    haversineDistanceMeters(center.lat, center.lng, point.lat, point.lng) <=
    radiusMeters
  );
}

/**
 * Progressive mile cost using base_mile_price up to the first tier boundary,
 * then each tier's rate for miles after that boundary.
 */
function computeMileCost(
  miles: number,
  rate: VehicleRate,
  mileTiers: MileTier | null | undefined,
): number {
  const safeMiles = Math.max(0, Number(miles) || 0);
  if (safeMiles <= 0) return 0;

  const tiers = [...(mileTiers || [])]
    .map((t) => ({
      id: String(t.id),
      after: Number(t.after_miles),
    }))
    .filter((t) => Number.isFinite(t.after) && t.after >= 0)
    .sort((a, b) => a.after - b.after);

  let cost = 0;
  let cursor = 0;
  let currentRate = Number(rate.base_mile_price || 0);

  for (const tier of tiers) {
    if (safeMiles <= cursor) break;
    const segmentEnd = Math.min(safeMiles, tier.after);
    const segmentMiles = Math.max(0, segmentEnd - cursor);
    cost += segmentMiles * currentRate;
    cursor = tier.after;
    const next = Number(rate.mile_tier_prices?.[tier.id]);
    if (Number.isFinite(next)) currentRate = next;
  }

  if (safeMiles > cursor) {
    cost += (safeMiles - cursor) * currentRate;
  }

  return cost;
}

function computeMinuteCost(minutes: number, rate: VehicleRate): number {
  const mins = Math.max(0, Number(minutes) || 0);
  return mins * Number(rate.base_minute_price || 0);
}

function computeFareFromRate(
  miles: number,
  minutes: number,
  rate: VehicleRate,
  mileTiers: MileTier | null | undefined,
): number {
  const start = Number(rate.start_price || 0);
  const minPrice = Number(rate.min_price || 0);
  const raw =
    start +
    computeMileCost(miles, rate, mileTiers) +
    computeMinuteCost(minutes, rate);
  const price = Math.max(minPrice, raw);
  return Number(price.toFixed(2));
}

async function fetchDrivingRoute(
  points: LatLng[],
): Promise<{ miles: number; minutes: number } | null> {
  if (points.length < 2) return null;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Fall back to straight-line miles when Directions is unavailable.
    let miles = 0;
    for (let i = 0; i < points.length - 1; i++) {
      miles += haversineDistanceMiles(
        points[i].lat,
        points[i].lng,
        points[i + 1].lat,
        points[i + 1].lng,
      );
    }
    const minutes = Math.max(1, Math.round(miles * 2.5));
    return { miles: Number(miles.toFixed(3)), minutes };
  }

  const origin = `${points[0].lat},${points[0].lng}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
  const via = points.slice(1, -1);
  let url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&key=${apiKey}&mode=driving&units=imperial&region=gb&departure_time=now`;
  if (via.length > 0) {
    const waypoints = via.map((p) => `${p.lat},${p.lng}`).join("|");
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    const legs = route?.legs;
    if (!Array.isArray(legs) || legs.length === 0) return null;

    let meters = 0;
    let seconds = 0;
    for (const leg of legs) {
      meters += Number(leg?.distance?.value || 0);
      seconds += Number(
        leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0,
      );
    }
    if (!(meters > 0)) return null;
    return {
      miles: Number((meters / METERS_PER_MILE).toFixed(3)),
      minutes: Math.max(1, Math.round(seconds / 60)),
    };
  } catch (err) {
    console.warn("⚠️ Directions fetch failed for fare quote:", err);
    return null;
  }
}

async function loadActiveCircleArea(
  preferredId?: string | null,
): Promise<{ area: ServiceAreaRow; center: LatLng; radiusMeters: number } | null> {
  const tryParse = (area: ServiceAreaRow | null | undefined) => {
    if (!area || area.is_active === false) return null;
    const center = parseCircleCenter(area);
    const radiusMeters = Number(area.radius_meters);
    if (!center || !(radiusMeters > 0)) return null;
    if (
      String(area.area_type || "").toLowerCase() !== "circle" &&
      !(radiusMeters > 0)
    ) {
      return null;
    }
    return { area, center, radiusMeters };
  };

  if (preferredId) {
    const { data } = await supabase
      .from("service_areas")
      .select("*")
      .eq("id", preferredId)
      .maybeSingle();
    const parsed = tryParse(data as ServiceAreaRow);
    if (parsed) return parsed;
  }

  const { data: circles, error } = await supabase
    .from("service_areas")
    .select("*")
    .eq("is_active", true)
    .or("area_type.eq.circle,radius_meters.not.is.null");

  if (error) {
    console.warn("⚠️ Could not load service_areas for pricing:", error.message);
  }

  for (const row of circles || []) {
    const parsed = tryParse(row as ServiceAreaRow);
    if (parsed) return parsed;
  }
  return null;
}

async function loadInsidePricingRule(
  serviceAreaId: string,
): Promise<PricingRuleRow | null> {
  // Prefer the Service-area rule linked to this circle (web booker / scheduled).
  const { data: linked } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("service_area_id", serviceAreaId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const linkedRows = (linked || []) as PricingRuleRow[];
  const preferred =
    linkedRows.find((r) => r.apply_web_booker !== false) || linkedRows[0];
  if (preferred) return preferred;

  // Fallback: most recently updated pricing_rules row.
  const { data: latest, error } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("⚠️ Could not load pricing_rules:", error.message);
    return null;
  }
  return (latest as PricingRuleRow) || null;
}

async function loadOutsideBasePricing(
  serviceAreaId: string,
): Promise<PricingRuleRow | null> {
  const { data, error } = await supabase
    .from("service_area_base_pricing")
    .select("*")
    .eq("service_area_id", serviceAreaId)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn(
      "⚠️ Could not load service_area_base_pricing:",
      error.message,
    );
    return null;
  }

  const rows = (data || []) as PricingRuleRow[];
  return rows.find((r) => r.apply_web_booker !== false) || rows[0] || null;
}

async function quoteFromAdminApi(input: FareQuoteInput): Promise<FareQuote> {
  const adminApiUrl = process.env.ADMIN_API_URL;
  if (!adminApiUrl || /your-admin-domain/i.test(adminApiUrl)) {
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

    if (!res.ok) throw new PricingUnavailableError();
    const data = await res.json();
    if (!data || data.success !== true) throw new PricingUnavailableError();

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
    if (err instanceof PricingUnavailableError) throw err;
    throw new PricingUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Authoritative fare quote.
 * Uses Supabase circle + pricing tables; falls back to admin API only if needed.
 */
export async function getFareQuote(input: FareQuoteInput): Promise<FareQuote> {
  const pickup = { lat: Number(input.pickupLat), lng: Number(input.pickupLng) };
  const dropoff = {
    lat: Number(input.dropoffLat),
    lng: Number(input.dropoffLng),
  };

  if (
    !Number.isFinite(pickup.lat) ||
    !Number.isFinite(pickup.lng) ||
    !Number.isFinite(dropoff.lat) ||
    !Number.isFinite(dropoff.lng)
  ) {
    throw new PricingUnavailableError();
  }

  try {
    // Prefer circle linked from base-pricing / service-area pricing rule.
    const { data: basePricingHint } = await supabase
      .from("service_area_base_pricing")
      .select("service_area_id")
      .not("service_area_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const circle = await loadActiveCircleArea(
      basePricingHint?.service_area_id || null,
    );

    if (!circle) {
      console.warn(
        "⚠️ No active service-area circle found — falling back to admin quote",
      );
      return quoteFromAdminApi(input);
    }

    const pickupInside = isPointInsideCircle(
      pickup,
      circle.center,
      circle.radiusMeters,
    );
    const dropoffInside = isPointInsideCircle(
      dropoff,
      circle.center,
      circle.radiusMeters,
    );
    // Inside the circle, OR inbound toward the service area (elsewhere → inside):
    // charge Pickup → Drop-off via pricing_rules only (no base leg).
    const inboundToServiceArea = !pickupInside && dropoffInside;
    const usePickupDropoff = (pickupInside && dropoffInside) || inboundToServiceArea;

    const pricingRow = usePickupDropoff
      ? await loadInsidePricingRule(circle.area.id)
      : await loadOutsideBasePricing(circle.area.id);

    if (!pricingRow?.vehicles) {
      console.warn(
        `⚠️ No ${usePickupDropoff ? "pricing_rules" : "service_area_base_pricing"} row for area ${circle.area.id}`,
      );
      return quoteFromAdminApi(input);
    }

    const vehicleMatch = resolveVehicleRate(
      pricingRow.vehicles,
      input.vehicleType,
    );
    if (!vehicleMatch) {
      console.warn(
        `⚠️ Vehicle "${input.vehicleType}" not enabled in pricing table`,
      );
      throw new PricingUnavailableError();
    }

    // Pickup→Drop-off (inside or inbound). Outbound/outside: Base→Pickup→Drop-off.
    const routePoints: LatLng[] = usePickupDropoff
      ? [pickup, dropoff]
      : [circle.center, pickup, dropoff];

    const route = await fetchDrivingRoute(routePoints);
    const billedMiles =
      route?.miles ??
      (usePickupDropoff
        ? haversineDistanceMiles(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
        : haversineDistanceMiles(
            circle.center.lat,
            circle.center.lng,
            pickup.lat,
            pickup.lng,
          ) +
          haversineDistanceMiles(
            pickup.lat,
            pickup.lng,
            dropoff.lat,
            dropoff.lng,
          ));

    const clientMinutes = Number(input.minutes) || 0;
    const minutes =
      clientMinutes > 0 && usePickupDropoff
        ? clientMinutes
        : route?.minutes || Math.max(1, Math.round(billedMiles * 2.5));

    const price = computeFareFromRate(
      billedMiles,
      minutes,
      vehicleMatch.rate,
      pricingRow.mile_tiers,
    );

    if (!(price > 0)) throw new PricingUnavailableError();

    const routeMode = usePickupDropoff
      ? inboundToServiceArea
        ? "inbound_pickup_dropoff"
        : "pickup_dropoff"
      : "base_pickup_dropoff";
    const routeLabel = usePickupDropoff
      ? inboundToServiceArea
        ? "Pickup → Drop-off (inbound to service area)"
        : "Pickup → Drop-off (inside service area)"
      : "Base → Pickup → Drop-off (outside service area)";

    console.log(
      `💷 Quote ${routeMode}: £${price} · ${billedMiles.toFixed(2)} mi · ${minutes} min · ${vehicleMatch.key} · circle=${circle.area.name || circle.area.id} · pickupInside=${pickupInside} dropoffInside=${dropoffInside}`,
    );

    return {
      price,
      billedMiles: Number(billedMiles.toFixed(3)),
      routeMode,
      routeLabel,
      vehicle: vehicleMatch.key,
    };
  } catch (err) {
    if (err instanceof PricingUnavailableError) throw err;
    console.error("❌ Local fare quote failed:", err);
    try {
      return await quoteFromAdminApi(input);
    } catch {
      throw new PricingUnavailableError();
    }
  }
}
