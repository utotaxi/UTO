// // // import { io, Socket } from "socket.io-client";
// // // import { getApiUrl } from "./query-client";

// // // let socket: Socket | null = null;

// // // export interface DriverLocation {
// // //   driverId: string;
// // //   latitude: number;
// // //   longitude: number;
// // //   heading?: number;
// // //   speed?: number;
// // // }

// // // export interface RideUpdate {
// // //   rideId: string;
// // //   status: string;
// // //   driverLocation?: DriverLocation;
// // // }

// // // export function getSocket(): Socket {
// // //   if (!socket) {
// // //     const apiUrl = getApiUrl();
// // //     socket = io(apiUrl, {
// // //       transports: ["websocket", "polling"],
// // //       autoConnect: true,
// // //     });

// // //     socket.on("connect", () => {
// // //       console.log("Socket connected:", socket?.id);
// // //     });

// // //     socket.on("disconnect", () => {
// // //       console.log("Socket disconnected");
// // //     });

// // //     socket.on("connect_error", (error) => {
// // //       console.error("Socket connection error:", error);
// // //     });
// // //   }

// // //   return socket;
// // // }

// // // export function connectAsDriver(driverId: string) {
// // //   const socket = getSocket();
// // //   socket.emit("driver:connect", driverId);
// // // }

// // // export function connectAsRider(riderId: string) {
// // //   const socket = getSocket();
// // //   socket.emit("rider:connect", riderId);
// // // }

// // // export function updateDriverLocation(location: DriverLocation) {
// // //   const socket = getSocket();
// // //   socket.emit("driver:location", location);
// // // }

// // // export function requestRide(rideData: any) {
// // //   const socket = getSocket();
// // //   socket.emit("ride:request", rideData);
// // // }

// // // export function acceptRide(rideId: string, driverId: string) {
// // //   const socket = getSocket();
// // //   socket.emit("ride:accept", { rideId, driverId });
// // // }

// // // export function updateRideStatus(rideId: string, status: string, driverLocation?: DriverLocation) {
// // //   const socket = getSocket();
// // //   socket.emit("ride:status", { rideId, status, driverLocation });
// // // }

// // // export function onNewRide(callback: (ride: any) => void) {
// // //   const socket = getSocket();
// // //   socket.on("ride:new", callback);
// // //   return () => socket.off("ride:new", callback);
// // // }

// // // export function onRideAccepted(callback: (data: { rideId: string; driverId: string }) => void) {
// // //   const socket = getSocket();
// // //   socket.on("ride:accepted", callback);
// // //   return () => socket.off("ride:accepted", callback);
// // // }

// // // export function onRideUpdate(callback: (update: RideUpdate) => void) {
// // //   const socket = getSocket();
// // //   socket.on("ride:update", callback);
// // //   return () => socket.off("ride:update", callback);
// // // }

// // // export function onDriverLocation(callback: (location: DriverLocation) => void) {
// // //   const socket = getSocket();
// // //   socket.on("driver:location", callback);
// // //   return () => socket.off("driver:location", callback);
// // // }

// // // export function disconnectSocket() {
// // //   if (socket) {
// // //     socket.disconnect();
// // //     socket = null;
// // //   }
// // // }

// // import { io, Socket } from "socket.io-client";
// // import { getApiUrl } from "./query-client";

// // let socket: Socket | null = null;

// // export interface DriverLocation {
// //   driverId: string;
// //   latitude: number;
// //   longitude: number;
// //   heading?: number;
// //   speed?: number;
// // }

// // export interface RideUpdate {
// //   rideId: string;
// //   status: string;
// //   driverLocation?: DriverLocation;
// // }

// // export function getSocket(): Socket {
// //   if (!socket) {
// //     const apiUrl = getApiUrl();
// //     socket = io(apiUrl, {
// //       transports: ["websocket"],
// //       autoConnect: true,
// //       reconnection: true,
// //       reconnectionAttempts: Infinity,
// //       reconnectionDelay: 1000,
// //     });

// //     socket.on("connect", () => {
// //       console.log("Socket connected:", socket?.id);
// //     });

// //     socket.on("disconnect", () => {
// //       console.log("Socket disconnected");
// //     });

// //     socket.on("connect_error", (error) => {
// //       console.error("Socket connection error:", error);
// //     });
// //   }

// //   return socket;
// // }

// // export function connectAsDriver(driverId: string) {
// //   const socket = getSocket();
// //   socket.emit("driver:connect", driverId);
// // }

// // export function connectAsRider(riderId: string) {
// //   const socket = getSocket();
// //   socket.emit("rider:connect", riderId);
// // }

// // export function updateDriverLocation(location: DriverLocation) {
// //   const socket = getSocket();
// //   socket.emit("driver:location", location);
// // }

// // export function requestRide(rideData: any) {
// //   const socket = getSocket();
// //   socket.emit("ride:request", rideData);
// // }

// // export function acceptRide(rideId: string, driverId: string) {
// //   const socket = getSocket();
// //   socket.emit("ride:accept", { rideId, driverId });
// // }

// // export function updateRideStatus(rideId: string, status: string, driverLocation?: DriverLocation) {
// //   const socket = getSocket();
// //   socket.emit("ride:status", { rideId, status, driverLocation });
// // }

// // export function onNewRide(callback: (ride: any) => void) {
// //   const socket = getSocket();
// //   socket.on("ride:new", callback);
// //   return () => socket.off("ride:new", callback);
// // }

// // export function onRideAccepted(callback: (data: { rideId: string; driverId: string }) => void) {
// //   const socket = getSocket();
// //   socket.on("ride:accepted", callback);
// //   return () => socket.off("ride:accepted", callback);
// // }

// // export function onRideUpdate(callback: (update: RideUpdate) => void) {
// //   const socket = getSocket();
// //   socket.on("ride:update", callback);
// //   return () => socket.off("ride:update", callback);
// // }

// // export function onDriverLocation(callback: (location: DriverLocation) => void) {
// //   const socket = getSocket();
// //   socket.on("driver:location", callback);
// //   return () => socket.off("driver:location", callback);
// // }

// // export function disconnectSocket() {
// //   if (socket) {
// //     socket.disconnect();
// //     socket = null;
// //   }
// // }

// import { Server as HTTPServer } from "http";
// import { Server, Socket } from "socket.io";
// import { db } from "../../server/db";
// import { drivers, driverLocations, rides } from "@shared/schema";
// import { eq } from "drizzle-orm";

// interface DriverLocation {
//   driverId: string;
//   latitude: number;
//   longitude: number;
//   heading?: number;
//   speed?: number;
// }

// interface RideUpdate {
//   rideId: string;
//   status: string;
//   driverLocation?: DriverLocation;
// }

// export function setupSocketIO(httpServer: HTTPServer) {
//   const io = new Server(httpServer, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//     transports: ["websocket", "polling"],
//   });

//   const connectedDrivers = new Map<string, string>();
//   const connectedRiders = new Map<string, string>();
//   // In-memory ride map: rideId -> { riderSocketId, riderId }
//   const activeRides = new Map<string, { riderSocketId: string; riderId?: string }>();

//   io.on("connection", (socket: Socket) => {
//     console.log(`Client connected: ${socket.id}`);

//     socket.on("driver:connect", async (driverId: string) => {
//       connectedDrivers.set(driverId, socket.id);
//       socket.join(`driver:${driverId}`);
//       console.log(`Driver ${driverId} connected`);

//       try {
//         await db
//           .update(drivers)
//           .set({ isOnline: true })
//           .where(eq(drivers.id, driverId));
//       } catch (error) {
//         console.error("Error updating driver status:", error);
//       }
//     });

//     socket.on("rider:connect", (riderId: string) => {
//       connectedRiders.set(riderId, socket.id);
//       socket.join(`rider:${riderId}`);
//       console.log(`Rider ${riderId} connected`);
//     });

//     socket.on("driver:location", async (location: DriverLocation) => {
//       try {
//         await db
//           .update(drivers)
//           .set({
//             currentLatitude: location.latitude,
//             currentLongitude: location.longitude,
//           })
//           .where(eq(drivers.id, location.driverId));

//         await db.insert(driverLocations).values({
//           driverId: location.driverId,
//           latitude: location.latitude,
//           longitude: location.longitude,
//           heading: location.heading,
//           speed: location.speed,
//         });

//         const activeRides = await db
//           .select()
//           .from(rides)
//           .where(eq(rides.driverId, location.driverId));

//         for (const ride of activeRides) {
//           if (["accepted", "arriving", "in_progress"].includes(ride.status)) {
//             io.to(`rider:${ride.riderId}`).emit("driver:location", location);
//           }
//         }
//       } catch (error) {
//         console.error("Error updating driver location:", error);
//       }
//     });

//     socket.on("ride:request", async (rideData: any) => {
//       // Track the requesting socket so we can route status updates back
//       if (rideData.id) {
//         activeRides.set(rideData.id, { riderSocketId: socket.id });
//       }
//       io.emit("ride:new", rideData);
//     });

//     socket.on("ride:accept", async (data: { rideId: string; driverId: string }) => {
//       try {
//         await db
//           .update(rides)
//           .set({
//             driverId: data.driverId,
//             status: "accepted",
//             acceptedAt: new Date(),
//           })
//           .where(eq(rides.id, data.rideId));

//         const [ride] = await db
//           .select()
//           .from(rides)
//           .where(eq(rides.id, data.rideId));

//         if (ride) {
//           io.to(`rider:${ride.riderId}`).emit("ride:accepted", {
//             rideId: data.rideId,
//             driverId: data.driverId,
//           });
//         }
//       } catch (error) {
//         console.error("Error accepting ride:", error);
//       }
//     });

//     socket.on("ride:status", async (update: RideUpdate) => {
//       try {
//         // Attempt DB update (non-critical if ride is client-side only)
//         try {
//           const updateData: any = { status: update.status };
//           if (update.status === "in_progress") updateData.startedAt = new Date();
//           else if (update.status === "completed") updateData.completedAt = new Date();
//           else if (update.status === "cancelled") updateData.cancelledAt = new Date();
//           await db.update(rides).set(updateData).where(eq(rides.id, update.rideId));
//         } catch (_) {
//           // Ride may not be in DB (client-side only ride)
//         }

//         // Route update back to the rider via in-memory map
//         const rideInfo = activeRides.get(update.rideId);
//         if (rideInfo) {
//           io.to(rideInfo.riderSocketId).emit("ride:update", update);
//         } else {
//           // Fallback: try DB lookup
//           try {
//             const [ride] = await db.select().from(rides).where(eq(rides.id, update.rideId));
//             if (ride) {
//               io.to(`rider:${ride.riderId}`).emit("ride:update", update);
//               if (ride.driverId) {
//                 io.to(`driver:${ride.driverId}`).emit("ride:update", update);
//               }
//             }
//           } catch (_) {
//             // DB lookup also failed - broadcast to all as last resort
//             io.emit("ride:update", update);
//           }
//         }

//         // Clean up completed/cancelled rides from memory
//         if (update.status === "completed" || update.status === "cancelled") {
//           activeRides.delete(update.rideId);
//         }
//       } catch (error) {
//         console.error("Error updating ride status:", error);
//       }
//     });

//     socket.on("disconnect", async () => {
//       console.log(`Client disconnected: ${socket.id}`);

//       for (const [driverId, socketId] of connectedDrivers.entries()) {
//         if (socketId === socket.id) {
//           connectedDrivers.delete(driverId);
//           try {
//             await db
//               .update(drivers)
//               .set({ isOnline: false })
//               .where(eq(drivers.id, driverId));
//           } catch (error) {
//             console.error("Error updating driver status on disconnect:", error);
//           }
//           break;
//         }
//       }

//       for (const [riderId, socketId] of connectedRiders.entries()) {
//         if (socketId === socket.id) {
//           connectedRiders.delete(riderId);
//           break;
//         }
//       }
//     });
//   });

//   return io;
// }

//client/lib/socket.ts - CORRECT CLIENT IMPLEMENTATION

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export interface DriverLocation {
  driverId: string;
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
      reconnectionAttempts: 5,
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