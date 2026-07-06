type RideRequestListener = (rideId: string) => void;

const listeners = new Set<RideRequestListener>();

export function onRideRequestNotification(listener: RideRequestListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRideRequestNotification(rideId: string) {
  if (!rideId) return;
  listeners.forEach((listener) => {
    try {
      listener(rideId);
    } catch (err) {
      console.warn("rideNotificationBridge listener error:", err);
    }
  });
}
