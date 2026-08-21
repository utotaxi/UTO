/** Shared via-stop shape for ASAP rides (max 2). */
export type RideVia = {
  address: string;
  latitude: number;
  longitude: number;
  sequenceOrder?: number;
};

export const MAX_RIDE_VIAS = 2;

export function normalizeVias(raw: any): RideVia[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v: any, index: number) => {
      const address = String(v?.address || v?.description || "").trim();
      const latitude = Number(v?.latitude ?? v?.lat);
      const longitude = Number(v?.longitude ?? v?.lng);
      if (!address || !Number.isFinite(latitude) || !Number.isFinite(longitude))
        return null;
      return {
        address,
        latitude,
        longitude,
        sequenceOrder: Number(
          v?.sequenceOrder ?? v?.sequence_order ?? index + 1,
        ),
      } as RideVia;
    })
    .filter(Boolean)
    .slice(0, MAX_RIDE_VIAS) as RideVia[];
}

/** Build Google Directions waypoints query value: lat,lng|lat,lng */
export function viasToWaypointsParam(vias: RideVia[]): string | null {
  const list = normalizeVias(vias);
  if (list.length === 0) return null;
  return list.map((v) => `${v.latitude},${v.longitude}`).join("|");
}

/** Sum all legs from a Directions API response (required when vias are used). */
export function sumDirectionsLegs(route: any): {
  distanceMeters: number;
  durationSeconds: number;
} {
  const legs = Array.isArray(route?.legs) ? route.legs : [];
  let distanceMeters = 0;
  let durationSeconds = 0;
  for (const leg of legs) {
    distanceMeters += Number(leg?.distance?.value || 0);
    durationSeconds += Number(
      leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0,
    );
  }
  return { distanceMeters, durationSeconds };
}
