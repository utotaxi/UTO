//client/lib/socket.ts

import { AppState, AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/query-client";

let socket: Socket | null = null;
let currentDriverId: string | null = null;
let currentRiderId: string | null = null;

export interface DriverLocation {
  driverId: string;
  rideId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface RideUpdate {
  rideId: string;
  status: string;
  driverLocation?: DriverLocation;
}

export function getSocket(): Socket {
  if (!socket) {
    // Keep Socket.IO on the exact same origin as the REST API so the app never
    // talks to one backend for HTTP and a different backend for realtime events.
    const serverUrl = getApiUrl();

    console.log("🔌 Connecting to socket server:", serverUrl);

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 60 * 60 * 1000, // Extended to 60 mins to handle app background
      autoConnect: true,
      // Keep connection alive even when app is in background
      // pingInterval: 10000, // Match server ping interval
      // pingTimeout: 60000,  // Match server ping timeout
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);
      if (currentDriverId) {
        socket?.emit("driver:connect", currentDriverId);
      }
      if (currentRiderId) {
        socket?.emit("rider:connect", currentRiderId);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error.message);
    });

    socket.on("reconnect_attempt", () => {
      console.log("🔄 Socket reconnect attempt...");
    });

    socket.on("reconnect", () => {
      console.log("✅ Socket reconnected after disconnect");
      if (currentDriverId) {
        socket?.emit("driver:connect", currentDriverId);
      }
      if (currentRiderId) {
        socket?.emit("rider:connect", currentRiderId);
      }
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentDriverId = null;
  currentRiderId = null;
}

// Listen for new ride requests (for drivers)
export function onNewRide(callback: (ride: any) => void): () => void {
  const socket = getSocket();

  socket.on("ride:new", callback);

  // Return cleanup function
  return () => {
    socket.off("ride:new", callback);
  };
}

// Listen for expired dispatch requests (for drivers)
export function onRideExpired(
  callback: (data: { rideId: string }) => void,
): () => void {
  const socket = getSocket();
  socket.on("ride:expired", callback);
  return () => socket.off("ride:expired", callback);
}

// Listen for ride updates (for riders)
export function onRideUpdate(callback: (update: any) => void): () => void {
  const socket = getSocket();

  socket.on("ride:update", callback);

  // Return cleanup function
  return () => {
    socket.off("ride:update", callback);
  };
}

// Listen for ride accepted (for riders)
export function onRideAccepted(callback: (data: any) => void): () => void {
  const socket = getSocket();

  socket.on("ride:accepted", callback);

  // Return cleanup function
  return () => {
    socket.off("ride:accepted", callback);
  };
}

// Listen for driver location updates (for riders)
export function onDriverLocation(
  callback: (location: any) => void,
): () => void {
  const socket = getSocket();

  socket.on("driver:location", callback);

  // Return cleanup function
  return () => {
    socket.off("driver:location", callback);
  };
}

// Connect as driver
export function connectAsDriver(driverId: string) {
  const socket = getSocket();
  currentDriverId = driverId;
  socket.emit("driver:connect", driverId);
  console.log("🚗 Connected as driver:", driverId);
}

// Explicitly go offline (driver toggled off or logged out). This is the only
// client action that takes the driver offline server-side; simply backgrounding
// the app keeps them online so they still receive ride requests via push.
export function goOffline(driverId: string) {
  const socket = getSocket();
  socket.emit("driver:go_offline", driverId);
  currentDriverId = null;
  console.log("🔴 Driver going offline:", driverId);
}

// Connect as rider
export function connectAsRider(riderId: string) {
  const socket = getSocket();
  currentRiderId = riderId;
  socket.emit("rider:connect", riderId);
  console.log("🙋 Connected as rider:", riderId);
}

export function requestRideDriverLocation(riderId: string, rideId: string) {
  const socket = getSocket();
  socket.emit("rider:request_driver_location", { riderId, rideId });
}

// Send driver location update
export function sendDriverLocation(location: {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}) {
  const socket = getSocket();
  socket.emit("driver:location", location);
}

// Accept ride (driver)
export function acceptRide(rideId: string, driverId: string) {
  const socket = getSocket();
  socket.emit("ride:accept", { rideId, driverId });
  console.log("✅ Accepting ride:", rideId);
}

// Update drive status
export function updateRideStatus(
  rideId: string,
  status: string,
  driverLocation?: any,
) {
  const socket = getSocket();
  socket.emit("ride:status", { rideId, status, driverLocation });
  console.log("📊 Updating ride status:", rideId, status);
}

// Alias for sendDriverLocation (used by useRealTimeTracking)
export function updateDriverLocation(location: DriverLocation) {
  sendDriverLocation(location);
}

export function setupAppStateListener() {
  let appStateSubscription: any = null;

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const socket = getSocket();

    console.log(`📱 App state changed to: ${nextAppState}`);

    if (nextAppState === "active") {
      // App came to foreground
      console.log(
        "✅ App active - reconnecting socket and resuming foreground tracking",
      );

      if (!socket.connected) {
        socket.connect();
      }

      // Re-register current driver/rider
      if (currentDriverId) {
        socket.emit("driver:connect", currentDriverId);
        console.log("🚗 Driver re-registered");
      }
      if (currentRiderId) {
        socket.emit("rider:connect", currentRiderId);
        console.log("🙋 Rider re-registered");
      }
    } else if (nextAppState === "background") {
      console.log(
        "⏻️ App backgrounded - keeping socket alive, background task running",
      );
      // Don't disconnect - let background task handle location
      // Socket should remain connected
    }
  };

  appStateSubscription = AppState.addEventListener(
    "change",
    handleAppStateChange,
  );

  return () => appStateSubscription?.remove();
}
