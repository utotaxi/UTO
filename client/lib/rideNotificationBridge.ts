type RideRequestListener = (rideId: string, ride?: any) => void;

const listeners = new Set<RideRequestListener>();

export function onRideRequestNotification(
  listener: RideRequestListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRideRequestNotification(rideId: string, ride?: any) {
  if (!rideId && !ride) return;
  listeners.forEach((listener) => {
    try {
      listener(rideId || String(ride?.id || ""), ride);
    } catch (err) {
      console.warn("rideNotificationBridge listener error:", err);
    }
  });
}
