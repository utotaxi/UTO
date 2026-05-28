// import { io, Socket } from "socket.io-client";

// let socket: Socket | null = null;

// export interface DriverLocation {
//   driverId: string;
//   latitude: number;
//   longitude: number;
//   heading?: number;
//   speed?: number;
// }

// export interface RideUpdate {
//   rideId: string;
//   status: string;
//   driverLocation?: DriverLocation;
// }

// export function getSocket(): Socket {
//   if (!socket) {
//     // Get server URL from environment
//     const serverUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';

//     console.log('🔌 Connecting to socket server:', serverUrl);

//     socket = io(serverUrl, {
//       transports: ['websocket', 'polling'],
//       reconnection: true,
//       reconnectionAttempts: Infinity,
//       reconnectionDelay: 1000,
//       timeout: 10000,
//     });

//     socket.on('connect', () => {
//       console.log('✅ Socket connected:', socket?.id);
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('❌ Socket disconnected:', reason);
//     });

//     socket.on('connect_error', (error) => {
//       console.error('🔴 Socket connection error:', error.message);
//     });

//     socket.on('reconnect', (attemptNumber) => {
//       console.log(`🔁 Socket reconnected after ${attemptNumber} attempts`);
//     });
//   }

//   return socket;
// }

// export function disconnectSocket() {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
// }

// // Listen for new ride requests (for drivers)
// export function onNewRide(callback: (ride: any) => void): () => void {
//   const socket = getSocket();

//   socket.on('ride:new', callback);

//   // Return cleanup function
//   return () => {
//     socket.off('ride:new', callback);
//   };
// }

// // Listen for expired dispatch requests (for drivers)
// export function onRideExpired(callback: (data: { rideId: string }) => void): () => void {
//   const socket = getSocket();
//   socket.on('ride:expired', callback);
//   return () => socket.off('ride:expired', callback);
// }

// // Listen for ride updates (for riders)
// export function onRideUpdate(callback: (update: any) => void): () => void {
//   const socket = getSocket();

//   socket.on('ride:update', callback);

//   // Return cleanup function
//   return () => {
//     socket.off('ride:update', callback);
//   };
// }

// // Listen for ride accepted (for riders)
// export function onRideAccepted(callback: (data: any) => void): () => void {
//   const socket = getSocket();

//   socket.on('ride:accepted', callback);

//   // Return cleanup function
//   return () => {
//     socket.off('ride:accepted', callback);
//   };
// }

// // Listen for driver location updates (for riders)
// export function onDriverLocation(callback: (location: any) => void): () => void {
//   const socket = getSocket();

//   socket.on('driver:location', callback);

//   // Return cleanup function
//   return () => {
//     socket.off('driver:location', callback);
//   };
// }

// // Connect as driver
// export function connectAsDriver(driverId: string) {
//   const socket = getSocket();
//   socket.emit('driver:connect', driverId);
//   console.log('🚗 Connected as driver:', driverId);
// }

// // Connect as rider
// export function connectAsRider(riderId: string) {
//   const socket = getSocket();
//   socket.emit('rider:connect', riderId);
//   console.log('🙋 Connected as rider:', riderId);
// }

// // Send driver location update
// export function sendDriverLocation(location: {
//   driverId: string;
//   latitude: number;
//   longitude: number;
//   heading?: number;
//   speed?: number;
// }) {
//   const socket = getSocket();
//   socket.emit('driver:location', location);
// }

// // Accept ride (driver)
// export function acceptRide(rideId: string, driverId: string) {
//   const socket = getSocket();
//   socket.emit('ride:accept', { rideId, driverId });
//   console.log('✅ Accepting ride:', rideId);
// }

// // Update drive status
// export function updateRideStatus(rideId: string, status: string, driverLocation?: any) {
//   const socket = getSocket();
//   socket.emit('ride:status', { rideId, status, driverLocation });
//   console.log('📊 Updating ride status:', rideId, status);
// }

// // Alias for sendDriverLocation (used by useRealTimeTracking)
// export function updateDriverLocation(location: DriverLocation) {
//   sendDriverLocation(location);
// }

//client/lib/socket.ts

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

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
    // Get server URL from environment
    const serverUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';

    console.log('🔌 Connecting to socket server:', serverUrl);

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Listen for new ride requests (for drivers)
export function onNewRide(callback: (ride: any) => void): () => void {
  const socket = getSocket();

  socket.on('ride:new', callback);

  // Return cleanup function
  return () => {
    socket.off('ride:new', callback);
  };
}

// Listen for expired dispatch requests (for drivers)
export function onRideExpired(callback: (data: { rideId: string }) => void): () => void {
  const socket = getSocket();
  socket.on('ride:expired', callback);
  return () => socket.off('ride:expired', callback);
}

// Listen for ride updates (for riders)
export function onRideUpdate(callback: (update: any) => void): () => void {
  const socket = getSocket();

  socket.on('ride:update', callback);

  // Return cleanup function
  return () => {
    socket.off('ride:update', callback);
  };
}

// Listen for ride accepted (for riders)
export function onRideAccepted(callback: (data: any) => void): () => void {
  const socket = getSocket();

  socket.on('ride:accepted', callback);

  // Return cleanup function
  return () => {
    socket.off('ride:accepted', callback);
  };
}

// Listen for driver location updates (for riders)
export function onDriverLocation(callback: (location: any) => void): () => void {
  const socket = getSocket();

  socket.on('driver:location', callback);

  // Return cleanup function
  return () => {
    socket.off('driver:location', callback);
  };
}

// Connect as driver
export function connectAsDriver(driverId: string) {
  const socket = getSocket();
  socket.emit('driver:connect', driverId);
  console.log('🚗 Connected as driver:', driverId);
}

// Connect as rider
export function connectAsRider(riderId: string) {
  const socket = getSocket();
  socket.emit('rider:connect', riderId);
  console.log('🙋 Connected as rider:', riderId);
}

export function requestRideDriverLocation(riderId: string, rideId: string) {
  const socket = getSocket();
  socket.emit('rider:request_driver_location', { riderId, rideId });
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
  socket.emit('driver:location', location);
}

// Accept ride (driver)
export function acceptRide(rideId: string, driverId: string) {
  const socket = getSocket();
  socket.emit('ride:accept', { rideId, driverId });
  console.log('✅ Accepting ride:', rideId);
}

// Update drive status
export function updateRideStatus(rideId: string, status: string, driverLocation?: any) {
  const socket = getSocket();
  socket.emit('ride:status', { rideId, status, driverLocation });
  console.log('📊 Updating ride status:', rideId, status);
}

// Alias for sendDriverLocation (used by useRealTimeTracking)
export function updateDriverLocation(location: DriverLocation) {
  sendDriverLocation(location);
}
