//server/services/driverMatching.ts
export const DEFAULT_DRIVER_RADIUS_MILES = 5;

export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isDriverWithinRadiusMiles(
  pickupLat: number,
  pickupLng: number,
  driverLat: number,
  driverLng: number,
  radiusMiles = DEFAULT_DRIVER_RADIUS_MILES
): boolean {
  return haversineDistanceMiles(pickupLat, pickupLng, driverLat, driverLng) <= radiusMiles;
}
