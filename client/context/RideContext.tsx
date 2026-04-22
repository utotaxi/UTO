
// // // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // // import AsyncStorage from "@react-native-async-storage/async-storage";

// // // export type RideType = "economy" | "premium" | "xl";
// // // export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

// // // export interface Location {
// // //   address: string;
// // //   latitude: number;
// // //   longitude: number;
// // // }

// // // export interface Ride {
// // //   id: string;
// // //   pickupLocation: Location;
// // //   dropoffLocation: Location;
// // //   rideType: RideType;
// // //   status: RideStatus;
// // //   farePrice: number;
// // //   distanceKm: number;
// // //   durationMinutes: number;
// // //   driverName?: string;
// // //   driverRating?: number;
// // //   vehicleInfo?: string;
// // //   licensePlate?: string;
// // //   createdAt: string;
// // //   completedAt?: string;
// // // }

// // // interface RideContextType {
// // //   activeRide: Ride | null;
// // //   rideHistory: Ride[];
// // //   requestRide: (pickup: Location, dropoff: Location, rideType: RideType) => Promise<Ride>;
// // //   cancelRide: (rideId: string) => Promise<void>;
// // //   completeRide: (rideId: string) => Promise<void>;
// // //   isLoading: boolean;
// // // }

// // // const RideContext = createContext<RideContextType | undefined>(undefined);

// // // const RIDE_HISTORY_KEY = "@uto_ride_history";
// // // const ACTIVE_RIDE_KEY = "@uto_active_ride";

// // // const VEHICLE_INFO: Record<RideType, { name: string; vehicle: string }[]> = {
// // //   economy: [
// // //     { name: "John D.", vehicle: "Toyota Prius" },
// // //     { name: "Sarah M.", vehicle: "Honda Civic" },
// // //     { name: "Mike R.", vehicle: "Kia Niro" },
// // //   ],
// // //   premium: [
// // //     { name: "James W.", vehicle: "Mercedes E-Class" },
// // //     { name: "Emily K.", vehicle: "BMW 5 Series" },
// // //     { name: "David L.", vehicle: "Audi A6" },
// // //   ],
// // //   xl: [
// // //     { name: "Robert T.", vehicle: "Toyota Sienna" },
// // //     { name: "Lisa H.", vehicle: "Honda Odyssey" },
// // //     { name: "Chris P.", vehicle: "Ford Transit" },
// // //   ],
// // // };

// // // export function RideProvider({ children }: { children: ReactNode }) {
// // //   const [activeRide, setActiveRide] = useState<Ride | null>(null);
// // //   const [rideHistory, setRideHistory] = useState<Ride[]>([]);
// // //   const [isLoading, setIsLoading] = useState(true);

// // //   useEffect(() => {
// // //     loadStoredRides();
// // //   }, []);

// // //   const loadStoredRides = async () => {
// // //     try {
// // //       const [storedHistory, storedActive] = await Promise.all([
// // //         AsyncStorage.getItem(RIDE_HISTORY_KEY),
// // //         AsyncStorage.getItem(ACTIVE_RIDE_KEY),
// // //       ]);

// // //       if (storedHistory) {
// // //         setRideHistory(JSON.parse(storedHistory));
// // //       }

// // //       if (storedActive) {
// // //         setActiveRide(JSON.parse(storedActive));
// // //       }
// // //     } catch (error) {
// // //       console.error("Failed to load rides:", error);
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   const calculateFare = (distanceKm: number, durationMin: number, rideType: RideType): number => {
// // //     const baseFares = { economy: 2.5, premium: 5.0, xl: 4.0 };
// // //     const perKm = { economy: 1.5, premium: 2.5, xl: 2.0 };
// // //     const perMin = { economy: 0.35, premium: 0.5, xl: 0.45 };

// // //     const base = baseFares[rideType];
// // //     const distanceCost = distanceKm * perKm[rideType];
// // //     const timeCost = durationMin * perMin[rideType];

// // //     return Math.round((base + distanceCost + timeCost) * 100) / 100;
// // //   };

// // //   const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType): Promise<Ride> => {
// // //     const distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
// // //     const durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
// // //     const farePrice = calculateFare(distanceKm, durationMinutes, rideType);

// // //     const drivers = VEHICLE_INFO[rideType];
// // //     const driver = drivers[Math.floor(Math.random() * drivers.length)];

// // //     const plates = ["ABC 1234", "XYZ 5678", "DEF 9012", "GHI 3456"];

// // //     const newRide: Ride = {
// // //       id: `ride_${Date.now()}`,
// // //       pickupLocation: pickup,
// // //       dropoffLocation: dropoff,
// // //       rideType,
// // //       status: "accepted",
// // //       farePrice,
// // //       distanceKm,
// // //       durationMinutes,
// // //       driverName: driver.name,
// // //       driverRating: 4.5 + Math.random() * 0.5,
// // //       vehicleInfo: driver.vehicle,
// // //       licensePlate: plates[Math.floor(Math.random() * plates.length)],
// // //       createdAt: new Date().toISOString(),
// // //     };

// // //     setActiveRide(newRide);
// // //     await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

// // //     return newRide;
// // //   };

// // //   const cancelRide = async (rideId: string) => {
// // //     if (activeRide?.id === rideId) {
// // //       const cancelledRide = { ...activeRide, status: "cancelled" as RideStatus };
// // //       const newHistory = [cancelledRide, ...rideHistory];

// // //       setActiveRide(null);
// // //       setRideHistory(newHistory);

// // //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// // //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// // //     }
// // //   };

// // //   const completeRide = async (rideId: string) => {
// // //     if (activeRide?.id === rideId) {
// // //       const completedRide: Ride = {
// // //         ...activeRide,
// // //         status: "completed",
// // //         completedAt: new Date().toISOString(),
// // //       };
// // //       const newHistory = [completedRide, ...rideHistory];

// // //       setActiveRide(null);
// // //       setRideHistory(newHistory);

// // //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// // //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// // //     }
// // //   };

// // //   return (
// // //     <RideContext.Provider
// // //       value={{
// // //         activeRide,
// // //         rideHistory,
// // //         requestRide,
// // //         cancelRide,
// // //         completeRide,
// // //         isLoading,
// // //       }}
// // //     >
// // //       {children}
// // //     </RideContext.Provider>
// // //   );
// // // }

// // // export function useRide() {
// // //   const context = useContext(RideContext);
// // //   if (context === undefined) {
// // //     throw new Error("useRide must be used within a RideProvider");
// // //   }
// // //   return context;
// // // }


// // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // import AsyncStorage from "@react-native-async-storage/async-storage";

// // export type RideType = "economy" | "premium" | "xl";
// // export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

// // export interface Location {
// //   address: string;
// //   latitude: number;
// //   longitude: number;
// // }

// // export interface Ride {
// //   id: string;
// //   pickupLocation: Location;
// //   dropoffLocation: Location;
// //   rideType: RideType;
// //   status: RideStatus;
// //   farePrice: number;
// //   distanceKm: number;
// //   durationMinutes: number;
// //   driverName?: string;
// //   driverRating?: number;
// //   vehicleInfo?: string;
// //   licensePlate?: string;
// //   otp?: string;
// //   createdAt: string;
// //   completedAt?: string;
// // }

// // interface RideContextType {
// //   activeRide: Ride | null;
// //   rideHistory: Ride[];
// //   requestRide: (pickup: Location, dropoff: Location, rideType: RideType) => Promise<Ride>;
// //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// //   cancelRide: (rideId: string) => Promise<void>;
// //   completeRide: (rideId: string) => Promise<void>;
// //   isLoading: boolean;
// // }

// // const RideContext = createContext<RideContextType | undefined>(undefined);

// // const RIDE_HISTORY_KEY = "@uto_ride_history";
// // const ACTIVE_RIDE_KEY = "@uto_active_ride";

// // const VEHICLE_INFO: Record<RideType, { name: string; vehicle: string }[]> = {
// //   economy: [
// //     { name: "John D.", vehicle: "Toyota Prius" },
// //     { name: "Sarah M.", vehicle: "Honda Civic" },
// //     { name: "Mike R.", vehicle: "Kia Niro" },
// //   ],
// //   premium: [
// //     { name: "James W.", vehicle: "Mercedes E-Class" },
// //     { name: "Emily K.", vehicle: "BMW 5 Series" },
// //     { name: "David L.", vehicle: "Audi A6" },
// //   ],
// //   xl: [
// //     { name: "Robert T.", vehicle: "Toyota Sienna" },
// //     { name: "Lisa H.", vehicle: "Honda Odyssey" },
// //     { name: "Chris P.", vehicle: "Ford Transit" },
// //   ],
// // };

// // export function RideProvider({ children }: { children: ReactNode }) {
// //   const [activeRide, setActiveRide] = useState<Ride | null>(null);
// //   const [rideHistory, setRideHistory] = useState<Ride[]>([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   useEffect(() => {
// //     loadStoredRides();
// //   }, []);

// //   const loadStoredRides = async () => {
// //     try {
// //       const [storedHistory, storedActive] = await Promise.all([
// //         AsyncStorage.getItem(RIDE_HISTORY_KEY),
// //         AsyncStorage.getItem(ACTIVE_RIDE_KEY),
// //       ]);

// //       if (storedHistory) {
// //         setRideHistory(JSON.parse(storedHistory));
// //       }

// //       if (storedActive) {
// //         setActiveRide(JSON.parse(storedActive));
// //       }
// //     } catch (error) {
// //       console.error("Failed to load rides:", error);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const calculateFare = (distanceKm: number, durationMin: number, rideType: RideType): number => {
// //     const baseFares = { economy: 2.5, premium: 5.0, xl: 4.0 };
// //     const perKm = { economy: 1.5, premium: 2.5, xl: 2.0 };
// //     const perMin = { economy: 0.35, premium: 0.5, xl: 0.45 };

// //     const base = baseFares[rideType];
// //     const distanceCost = distanceKm * perKm[rideType];
// //     const timeCost = durationMin * perMin[rideType];

// //     return Math.round((base + distanceCost + timeCost) * 100) / 100;
// //   };

// //   const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType): Promise<Ride> => {
// //     const distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
// //     const durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
// //     const farePrice = calculateFare(distanceKm, durationMinutes, rideType);

// //     const drivers = VEHICLE_INFO[rideType];
// //     const driver = drivers[Math.floor(Math.random() * drivers.length)];

// //     const plates = ["ABC 1234", "XYZ 5678", "DEF 9012", "GHI 3456"];

// //     const newRide: Ride = {
// //       id: `ride_${Date.now()}`,
// //       pickupLocation: pickup,
// //       dropoffLocation: dropoff,
// //       rideType,
// //       status: "accepted",
// //       farePrice,
// //       distanceKm,
// //       durationMinutes,
// //       driverName: driver.name,
// //       driverRating: 4.5 + Math.random() * 0.5,
// //       vehicleInfo: driver.vehicle,
// //       licensePlate: plates[Math.floor(Math.random() * plates.length)],
// //       otp: Math.floor(1000 + Math.random() * 9000).toString(),
// //       createdAt: new Date().toISOString(),
// //     };

// //     setActiveRide(newRide);
// //     await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

// //     return newRide;
// //   };

// //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// //     if (activeRide?.id === rideId && activeRide.otp === otp) {
// //       const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
// //       setActiveRide(startedRide);
// //       await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
// //       return true;
// //     }
// //     return false;
// //   };

// //   const cancelRide = async (rideId: string) => {
// //     if (activeRide?.id === rideId) {
// //       const cancelledRide = { ...activeRide, status: "cancelled" as RideStatus };
// //       const newHistory = [cancelledRide, ...rideHistory];

// //       setActiveRide(null);
// //       setRideHistory(newHistory);

// //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// //     }
// //   };

// //   const completeRide = async (rideId: string) => {
// //     if (activeRide?.id === rideId) {
// //       const completedRide: Ride = {
// //         ...activeRide,
// //         status: "completed",
// //         completedAt: new Date().toISOString(),
// //       };
// //       const newHistory = [completedRide, ...rideHistory];

// //       setActiveRide(null);
// //       setRideHistory(newHistory);

// //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// //     }
// //   };

// //   return (
// //     <RideContext.Provider
// //       value={{
// //         activeRide,
// //         rideHistory,
// //         requestRide,
// //         startRide,
// //         cancelRide,
// //         completeRide,
// //         isLoading,
// //       }}
// //     >
// //       {children}
// //     </RideContext.Provider>
// //   );
// // }

// // export function useRide() {
// //   const context = useContext(RideContext);
// //   if (context === undefined) {
// //     throw new Error("useRide must be used within a RideProvider");
// //   }
// //   return context;
// // }
// // //client/context/RideContext.tsx


// // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // import AsyncStorage from "@react-native-async-storage/async-storage";
// // import { getSocket, onRideUpdate } from "@/lib/socket";

// // export type RideType = "economy" | "premium" | "xl";
// // export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

// // export interface Location {
// //   address: string;
// //   latitude: number;
// //   longitude: number;
// // }

// // export interface Ride {
// //   id: string;
// //   pickupLocation: Location;
// //   dropoffLocation: Location;
// //   rideType: RideType;
// //   status: RideStatus;
// //   farePrice: number;
// //   distanceKm: number;
// //   durationMinutes: number;
// //   driverName?: string;
// //   driverRating?: number;
// //   vehicleInfo?: string;
// //   licensePlate?: string;
// //   otp?: string;
// //   createdAt: string;
// //   completedAt?: string;
// // }

// // interface RideContextType {
// //   activeRide: Ride | null;
// //   rideHistory: Ride[];
// //   requestRide: (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string) => Promise<Ride>;
// //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// //   cancelRide: (rideId: string) => Promise<void>;
// //   completeRide: (rideId: string) => Promise<void>;
// //   isLoading: boolean;
// // }

// // const RideContext = createContext<RideContextType | undefined>(undefined);

// // const RIDE_HISTORY_KEY = "@uto_ride_history";
// // const ACTIVE_RIDE_KEY = "@uto_active_ride";

// // const VEHICLE_INFO: Record<RideType, { name: string; vehicle: string }[]> = {
// //   economy: [
// //     { name: "John D.", vehicle: "Toyota Prius" },
// //     { name: "Sarah M.", vehicle: "Honda Civic" },
// //     { name: "Mike R.", vehicle: "Kia Niro" },
// //   ],
// //   premium: [
// //     { name: "James W.", vehicle: "Mercedes E-Class" },
// //     { name: "Emily K.", vehicle: "BMW 5 Series" },
// //     { name: "David L.", vehicle: "Audi A6" },
// //   ],
// //   xl: [
// //     { name: "Robert T.", vehicle: "Toyota Sienna" },
// //     { name: "Lisa H.", vehicle: "Honda Odyssey" },
// //     { name: "Chris P.", vehicle: "Ford Transit" },
// //   ],
// // };

// // export function RideProvider({ children }: { children: ReactNode }) {
// //   const [activeRide, setActiveRide] = useState<Ride | null>(null);
// //   const [rideHistory, setRideHistory] = useState<Ride[]>([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   useEffect(() => {
// //     loadStoredRides();
// //   }, []);

// //   // Listen for driver status updates (e.g. ride started via OTP)
// //   useEffect(() => {
// //     let cleanup: (() => void) | undefined;

// //     try {
// //       cleanup = onRideUpdate((update) => {
// //         setActiveRide((current) => {
// //           if (current && current.id === update.rideId) {
// //             const updated = { ...current, status: update.status as RideStatus };
// //             AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);
// //             return updated;
// //           }
// //           return current;
// //         });
// //       });
// //     } catch (err) {
// //       console.warn("Socket not available:", err);
// //     }

// //     return () => {
// //       if (cleanup) cleanup();
// //     };
// //   }, []);

// //   const loadStoredRides = async () => {
// //     try {
// //       const [storedHistory, storedActive] = await Promise.all([
// //         AsyncStorage.getItem(RIDE_HISTORY_KEY),
// //         AsyncStorage.getItem(ACTIVE_RIDE_KEY),
// //       ]);

// //       if (storedHistory) {
// //         setRideHistory(JSON.parse(storedHistory));
// //       }

// //       if (storedActive) {
// //         setActiveRide(JSON.parse(storedActive));
// //       }
// //     } catch (error) {
// //       console.error("Failed to load rides:", error);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const calculateFare = (distanceKm: number, durationMin: number, rideType: RideType): number => {
// //     const baseFares = { economy: 2.5, premium: 5.0, xl: 4.0 };
// //     const perKm = { economy: 1.5, premium: 2.5, xl: 2.0 };
// //     const perMin = { economy: 0.35, premium: 0.5, xl: 0.45 };

// //     const base = baseFares[rideType];
// //     const distanceCost = distanceKm * perKm[rideType];
// //     const timeCost = durationMin * perMin[rideType];

// //     return Math.round((base + distanceCost + timeCost) * 100) / 100;
// //   };

// //   const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string): Promise<Ride> => {
// //     const distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
// //     const durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
// //     const farePrice = calculateFare(distanceKm, durationMinutes, rideType);

// //     const drivers = VEHICLE_INFO[rideType];
// //     const driver = drivers[Math.floor(Math.random() * drivers.length)];

// //     const plates = ["LB12 ABC", "XY23 DEF", "MN45 GHI", "OP67 JKL"];

// //     const otp = Math.floor(1000 + Math.random() * 9000).toString();

// //     const newRide: Ride = {
// //       id: `ride_${Date.now()}`,
// //       pickupLocation: pickup,
// //       dropoffLocation: dropoff,
// //       rideType,
// //       status: "pending",
// //       farePrice,
// //       distanceKm,
// //       durationMinutes,
// //       driverName: driver.name,
// //       driverRating: 4.5 + Math.random() * 0.5,
// //       vehicleInfo: driver.vehicle,
// //       licensePlate: plates[Math.floor(Math.random() * plates.length)],
// //       otp,
// //       createdAt: new Date().toISOString(),
// //     };

// //     setActiveRide(newRide);
// //     await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

// //     // Broadcast ride request to all connected drivers via Socket.IO
// //     try {
// //       const socket = getSocket();
// //       socket.emit("ride:request", {
// //         ...newRide,
// //         riderName: riderName || "Rider",
// //       });
// //     } catch (err) {
// //       console.warn("Socket emit failed:", err);
// //     }

// //     return newRide;
// //   };

// //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// //     if (activeRide?.id === rideId && activeRide.otp === otp) {
// //       const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
// //       setActiveRide(startedRide);
// //       await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
// //       return true;
// //     }
// //     return false;
// //   };

// //   const cancelRide = async (rideId: string) => {
// //     if (activeRide?.id === rideId) {
// //       const cancelledRide = { ...activeRide, status: "cancelled" as RideStatus };
// //       const newHistory = [cancelledRide, ...rideHistory];

// //       setActiveRide(null);
// //       setRideHistory(newHistory);

// //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// //     }
// //   };

// //   const completeRide = async (rideId: string) => {
// //     if (activeRide?.id === rideId) {
// //       const completedRide: Ride = {
// //         ...activeRide,
// //         status: "completed",
// //         completedAt: new Date().toISOString(),
// //       };
// //       const newHistory = [completedRide, ...rideHistory];

// //       setActiveRide(null);
// //       setRideHistory(newHistory);

// //       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
// //       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
// //     }
// //   };

// //   return (
// //     <RideContext.Provider
// //       value={{
// //         activeRide,
// //         rideHistory,
// //         requestRide,
// //         startRide,
// //         cancelRide,
// //         completeRide,
// //         isLoading,
// //       }}
// //     >
// //       {children}
// //     </RideContext.Provider>
// //   );
// // }

// // export function useRide() {
// //   const context = useContext(RideContext);
// //   if (context === undefined) {
// //     throw new Error("useRide must be used within a RideProvider");
// //   }
// //   return context;
// // }

// //client/context/RideContext.tsx - FIXED STATUS UPDATES

// import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getSocket, onRideUpdate } from "@/lib/socket";

// export type RideType = "saloon" | "minibus";
// export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

// export interface Location {
//   address: string;
//   latitude: number;
//   longitude: number;
// }

// export interface Ride {
//   id: string;
//   pickupLocation: Location;
//   dropoffLocation: Location;
//   rideType: RideType;
//   status: RideStatus;
//   farePrice: number;
//   distanceKm: number;
//   durationMinutes: number;
//   driverName?: string;
//   driverRating?: number;
//   vehicleInfo?: string;
//   licensePlate?: string;
//   otp?: string;
//   createdAt: string;
//   completedAt?: string;
// }

// interface RideContextType {
//   activeRide: Ride | null;
//   rideHistory: Ride[];
//   requestRide: (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string) => Promise<Ride>;
//   startRide: (rideId: string, otp: string) => Promise<boolean>;
//   cancelRide: (rideId: string) => Promise<void>;
//   completeRide: (rideId: string) => Promise<void>;
//   isLoading: boolean;
// }

// const RideContext = createContext<RideContextType | undefined>(undefined);

// const RIDE_HISTORY_KEY = "@uto_ride_history";
// const ACTIVE_RIDE_KEY = "@uto_active_ride";

// const VEHICLE_INFO: Record<RideType, { name: string; vehicle: string }[]> = {
//   economy: [
//     { name: "John D.", vehicle: "Toyota Prius" },
//     { name: "Sarah M.", vehicle: "Honda Civic" },
//     { name: "Mike R.", vehicle: "Kia Niro" },
//   ],
//   premium: [
//     { name: "James W.", vehicle: "Mercedes E-Class" },
//     { name: "Emily K.", vehicle: "BMW 5 Series" },
//     { name: "David L.", vehicle: "Audi A6" },
//   ],
//   xl: [
//     { name: "Robert T.", vehicle: "Toyota Sienna" },
//     { name: "Lisa H.", vehicle: "Honda Odyssey" },
//     { name: "Chris P.", vehicle: "Ford Transit" },
//   ],
// };

// export function RideProvider({ children }: { children: ReactNode }) {
//   const [activeRide, setActiveRide] = useState<Ride | null>(null);
//   const [rideHistory, setRideHistory] = useState<Ride[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     loadStoredRides();
//   }, []);

//   // ✅ Listen for driver status updates
//   useEffect(() => {
//     let cleanup: (() => void) | undefined;

//     try {
//       cleanup = onRideUpdate((update) => {
//         console.log('📡 Rider received ride update:', update);

//         setActiveRide((current) => {
//           if (current && current.id === update.rideId) {
//             const updated = { ...current, status: update.status as RideStatus };
//             console.log('✅ Updating ride status:', current.status, '→', update.status);

//             // Save to storage
//             AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);

//             return updated;
//           }
//           return current;
//         });
//       });
//     } catch (err) {
//       console.warn("Socket not available:", err);
//     }

//     return () => {
//       if (cleanup) cleanup();
//     };
//   }, []);

//   const loadStoredRides = async () => {
//     try {
//       const [storedHistory, storedActive] = await Promise.all([
//         AsyncStorage.getItem(RIDE_HISTORY_KEY),
//         AsyncStorage.getItem(ACTIVE_RIDE_KEY),
//       ]);

//       if (storedHistory) {
//         setRideHistory(JSON.parse(storedHistory));
//       }

//       if (storedActive) {
//         const ride = JSON.parse(storedActive);
//         console.log('📱 Loaded active ride from storage:', ride.id, 'Status:', ride.status);
//         setActiveRide(ride);
//       }
//     } catch (error) {
//       console.error("Failed to load rides:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const calculateFare = (distanceKm: number, durationMin: number, rideType: RideType): number => {
//     const baseFares = { economy: 2.5, premium: 5.0, xl: 4.0 };
//     const perKm = { economy: 1.5, premium: 2.5, xl: 2.0 };
//     const perMin = { economy: 0.35, premium: 0.5, xl: 0.45 };

//     const base = baseFares[rideType];
//     const distanceCost = distanceKm * perKm[rideType];
//     const timeCost = durationMin * perMin[rideType];

//     return Math.round((base + distanceCost + timeCost) * 100) / 100;
//   };

//   const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string): Promise<Ride> => {
//     const distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
//     const durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
//     const farePrice = calculateFare(distanceKm, durationMinutes, rideType);

//     const drivers = VEHICLE_INFO[rideType];
//     const driver = drivers[Math.floor(Math.random() * drivers.length)];

//     const plates = ["LB12 ABC", "XY23 DEF", "MN45 GHI", "OP67 JKL", "DEF 9012", "GHI 3456"];

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     const newRide: Ride = {
//       id: `ride_${Date.now()}`,
//       pickupLocation: pickup,
//       dropoffLocation: dropoff,
//       rideType,
//       status: "pending", // ✅ Start as pending
//       farePrice,
//       distanceKm,
//       durationMinutes,
//       driverName: driver.name,
//       driverRating: 4.5 + Math.random() * 0.5,
//       vehicleInfo: driver.vehicle,
//       licensePlate: plates[Math.floor(Math.random() * plates.length)],
//       otp,
//       createdAt: new Date().toISOString(),
//     };

//     console.log('🚕 Requesting new ride:', newRide.id, 'OTP:', otp);

//     setActiveRide(newRide);
//     await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

//     // Broadcast ride request to drivers
//     try {
//       const socket = getSocket();
//       socket.emit("ride:request", {
//         ...newRide,
//         riderName: riderName || "Rider",
//       });
//       console.log('📡 Broadcasted ride request to drivers');
//     } catch (err) {
//       console.warn("Socket emit failed:", err);
//     }

//     // ✅ Simulate driver accepting after 3 seconds for demo
//     setTimeout(() => {
//       setActiveRide((current) => {
//         if (current && current.id === newRide.id && current.status === "pending") {
//           const accepted = { ...current, status: "accepted" as RideStatus };
//           console.log('✅ Demo: Auto-accepting ride after 3s');
//           AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(accepted)).catch(console.error);
//           return accepted;
//         }
//         return current;
//       });
//     }, 3000);

//     return newRide;
//   };

//   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
//     if (activeRide?.id === rideId && activeRide.otp === otp) {
//       const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
//       setActiveRide(startedRide);
//       await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
//       return true;
//     }
//     return false;
//   };

//   const cancelRide = async (rideId: string) => {
//     if (activeRide?.id === rideId) {
//       const cancelledRide = { ...activeRide, status: "cancelled" as RideStatus };
//       const newHistory = [cancelledRide, ...rideHistory];

//       setActiveRide(null);
//       setRideHistory(newHistory);

//       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
//       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
//     }
//   };

//   const completeRide = async (rideId: string) => {
//     if (activeRide?.id === rideId) {
//       const completedRide: Ride = {
//         ...activeRide,
//         status: "completed",
//         completedAt: new Date().toISOString(),
//       };
//       const newHistory = [completedRide, ...rideHistory];

//       setActiveRide(null);
//       setRideHistory(newHistory);

//       await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
//       await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
//     }
//   };

//   return (
//     <RideContext.Provider
//       value={{
//         activeRide,
//         rideHistory,
//         requestRide,
//         startRide,
//         cancelRide,
//         completeRide,
//         isLoading,
//       }}
//     >
//       {children}
//     </RideContext.Provider>
//   );
// }

// export function useRide() {
//   const context = useContext(RideContext);
//   if (context === undefined) {
//     throw new Error("useRide must be used within a RideProvider");
//   }
//   return context;
// }

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, connectAsRider, onRideUpdate } from "@/lib/socket";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "./AuthContext";
import { sendLocalNotification } from "@/hooks/useNotifications";

export type RideType = "saloon" | "minibus";
export type RideStatus = "pending" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Ride {
  id: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  rideType: RideType;
  status: RideStatus;
  farePrice: number;
  distanceKm: number;
  durationMinutes: number;
  driverName?: string;
  driverRating?: number;
  vehicleInfo?: string;
  licensePlate?: string;
  otp?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  walletDeduction?: number;
  expectedCollectAmount?: number;
  driverArrivedAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface RideContextType {
  activeRide: Ride | null;
  rideHistory: Ride[];
  requestRide: (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string, paymentMethod?: string, useWalletBalance?: boolean) => Promise<Ride>;
  startRide: (rideId: string, otp: string) => Promise<boolean>;
  cancelRide: (rideId: string, withPenalty?: boolean) => Promise<void>;
  completeRide: (rideId: string) => Promise<void>;
  updateRidePaymentMethod: (rideId: string, method: string) => Promise<void>;
  calculateDynamicFare: (distanceMiles: number, durationMin: number, rideType: string) => number;
  pendingRating: { rideId: string; driverName: string } | null;
  submitRiderRating: (rideId: string, rating: number, comment?: string) => void;
  dismissRiderRating: () => void;
  isLoading: boolean;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

const RIDE_HISTORY_KEY = "@uto_ride_history";
const ACTIVE_RIDE_KEY = "@uto_active_ride";



export function RideProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [pricingRules, setPricingRules] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRating, setPendingRating] = useState<{ rideId: string; driverName: string } | null>(null);

  // Keep a ref to the latest user so socket callbacks always see current wallet balance
  const userRef = React.useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    loadStoredRides();
    loadPricingRules();
  }, []);

  const loadPricingRules = async () => {
    try {
      const { api } = await import('@/lib/api');
      const rules = await api.pricingRules.getActive();
      if (rules) {
        setPricingRules(rules);
      }
    } catch (e) {
      console.warn("Could not fetch pricing rules", e);
    }
  };

  // Register this rider's socket as soon as we have a user ID
  // so the server can route ride:accepted back to this socket
  useEffect(() => {
    if (!user?.id) return;
    try {
      connectAsRider(user.id);
      console.log('🙋 RideContext: connectAsRider called for', user.id);
    } catch (err) {
      console.warn('⚠️ RideContext: connectAsRider failed:', err);
    }
  }, [user?.id]);

  // Listen for driver status updates (e.g. ride started via OTP)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    try {
      cleanup = onRideUpdate((update) => {
        if (update.status === "completed" || update.status === "payment_collected" || update.status === "cancelled" || update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") {

          // ✅ Handle wallet update for payment_collected BEFORE touching activeRide
          // This ensures it runs even if activeRide was already cleared by a prior "completed" event
          if (update.status === "payment_collected" && (update as any).extraAmount) {
            const extra = parseFloat((update as any).extraAmount);
            if (extra > 0) {
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: currentBalance + extra });
              Alert.alert("Wallet Updated", `£${extra.toFixed(2)} has been added to your wallet by the driver.`);
              console.log(`✅ [RideContext] Wallet updated: £${currentBalance} + £${extra} = £${currentBalance + extra}`);
            }
          }

          // ✅ Handle no-show cancellation — rider didn't board within 10 minutes
          if (update.status === "cancelled_no_show") {
            const noShowFare = (update as any).noShowFare || 0;
            const chargedVia = (update as any).chargedVia || "wallet";

            // Only deduct from local wallet if charged via wallet (not card)
            if (chargedVia === "wallet" && noShowFare > 0) {
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: Math.max(0, currentBalance - noShowFare) });
              console.log(`❌ [RideContext] No-show penalty: £${noShowFare} debited from wallet (clamped to £0 min)`);
            }

            if (chargedVia === "card") {
              Alert.alert(
                "Ride Cancelled — No Show",
                `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been charged to your saved card.`,
                [{ text: "OK" }]
              );
            } else {
              Alert.alert(
                "Ride Cancelled — No Show",
                `Your driver waited 10 minutes at pickup. A cancellation fee of £${noShowFare.toFixed(2)} has been deducted from your wallet.`,
                [{ text: "OK" }]
              );
            }
            console.log(`❌ [RideContext] No-show cancellation: £${noShowFare} charged via ${chargedVia}`);
          }

          setActiveRide((current) => {
            if (!current) return null;

            const isMatch = current.id === update.rideId || !update.rideId;
            if (!isMatch) {
              console.log(`[RideContext] rideId mismatch: local=${current.id}, server=${update.rideId} – completing anyway`);
            }

            // If the dispatch queue ran out of drivers
            if (update.status === "cancelled_no_drivers") {
              Alert.alert(
                "No Drivers Available",
                "We're sorry, but there are no drivers available within range right now. Please try again later.",
                [{ text: "OK" }]
              );
            }

            // Refund wallet deduction if cancelled (but NOT for no-show — that's a penalty)
            if ((update.status === "cancelled" || update.status === "cancelled_no_drivers") && current.walletDeduction && current.walletDeduction > 0) {
              const currentBalance = userRef.current?.walletBalance || 0;
              updateProfile({ walletBalance: currentBalance + current.walletDeduction });
              console.log(`✅ [RideContext] Refunded £${current.walletDeduction} for cancelled ride ${current.id}`);
            }

            const finalRide: Ride = {
              ...current,
              // Normalize status: cancelled_no_drivers/cancelled_no_show → cancelled, payment_collected → completed
              status: (update.status === "cancelled_no_drivers" || update.status === "cancelled_no_show") ? "cancelled"
                : update.status === "payment_collected" ? "completed"
                  : (update.status as RideStatus),
              completedAt: new Date().toISOString(),
            };
            setRideHistory((prev) => {
              const newHistory = [finalRide, ...prev];
              AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory)).catch(console.error);
              return newHistory;
            });
            AsyncStorage.removeItem(ACTIVE_RIDE_KEY).catch(console.error);

            // 🔔 Notify rider + trigger rating on completion
            if (update.status === "completed" || update.status === "payment_collected") {
              sendLocalNotification(
                "✅ Trip Completed",
                `Your ride has been completed. Fare: £${current.farePrice?.toFixed(2) || '0.00'}`,
                { type: "ride_completed", rideId: current.id }
              );
              // Trigger rating prompt after a short delay
              const dName = current.driverName || "Your Driver";
              const rId = current.id;
              setTimeout(() => {
                setPendingRating({ rideId: rId, driverName: dName });
              }, 1500);
            } else if (update.status === "cancelled" || update.status === "cancelled_no_drivers") {
              sendLocalNotification(
                "❌ Ride Cancelled",
                update.status === "cancelled_no_drivers"
                  ? "No drivers available right now. Please try again later."
                  : "Your ride has been cancelled.",
                { type: "ride_cancelled", rideId: current.id }
              );
            }

            return null;
          });
          return;
        }
        setActiveRide((current) => {
          if (current && (current.id === update.rideId || !update.rideId)) {
            const updated: Ride = {
              ...current,
              status: update.status as RideStatus,
              // If the driver sent their real info on accept, use it
              ...(update.status === "accepted" && (update as any).driverInfo
                ? {
                  driverName: (update as any).driverInfo.driverName,
                  vehicleInfo: (update as any).driverInfo.vehicleInfo,
                  licensePlate: (update as any).driverInfo.licensePlate,
                  driverRating: (update as any).driverInfo.driverRating,
                }
                : {}),
              // Capture driverArrivedAt timestamp when status transitions to "arrived"
              ...(update.status === "arrived" && (update as any).driverArrivedAt
                ? { driverArrivedAt: (update as any).driverArrivedAt }
                : {}),
            };
            AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated)).catch(console.error);

            // 🔔 Notify rider when driver accepts
            if (update.status === "accepted") {
              const driverName = (update as any).driverInfo?.driverName || "Your driver";
              sendLocalNotification(
                "🚗 Driver Accepted!",
                `${driverName} is on the way to pick you up.`,
                { type: "ride_accepted", rideId: current.id }
              );
            } else if (update.status === "arrived") {
              sendLocalNotification(
                "📍 Driver Arrived",
                "Your driver has arrived at the pickup location.",
                { type: "driver_arriving", rideId: current.id }
              );
            } else if (update.status === "in_progress") {
              sendLocalNotification(
                "🚀 Ride Started",
                "Your ride is now in progress. Enjoy the trip!",
                { type: "ride_started", rideId: current.id }
              );
            }

            return updated;
          }
          return current;
        });
      });
    } catch (err) {
      console.warn("Socket not available:", err);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const loadStoredRides = async () => {
    try {
      const [storedHistory, storedActive] = await Promise.all([
        AsyncStorage.getItem(RIDE_HISTORY_KEY),
        AsyncStorage.getItem(ACTIVE_RIDE_KEY),
      ]);

      if (storedHistory) {
        setRideHistory(JSON.parse(storedHistory));
      }

      if (storedActive) {
        setActiveRide(JSON.parse(storedActive));
      }
    } catch (error) {
      console.error("Failed to load rides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDynamicFare = (distanceMiles: number, durationMin: number, rideType: string): number => {
    const formattedType = rideType.charAt(0).toUpperCase() + rideType.slice(1);
    
    // Supabase stores pricing under "vehicles" key, not "pricing"
    const vehiclePricing = pricingRules?.vehicles || pricingRules?.pricing;
    
    if (!pricingRules || !vehiclePricing || !vehiclePricing[formattedType] || !vehiclePricing[formattedType].enabled) {
      // Fallback
      const baseFares: any = { saloon: 4.0, minibus: 6.0 };
      const perKm: any = { saloon: 1.5, minibus: 2.2 };
      const perMin: any = { saloon: 0.35, minibus: 0.5 };
  
      const distanceKm = distanceMiles / 0.621371;
      const base = baseFares[rideType] || 4.0;
      const distanceCost = distanceKm * (perKm[rideType] || 1.5);
      const timeCost = durationMin * (perMin[rideType] || 0.35);
  
      return Math.round((base + distanceCost + timeCost) * 100) / 100;
    }
  
    const p = vehiclePricing[formattedType];
    const mileTiers = pricingRules.mile_tiers || [];
    
    let cost = parseFloat(p.start_price || "0");
    
    let currentMileRate = parseFloat(p.base_mile_price || "1.00");
    let milesRemaining = distanceMiles;
    let previousTierMiles = 0;
  
    const sortedTiers = [...mileTiers].map((t: any) => ({
      id: t.id,
      after_miles: parseFloat(t.after_miles || "0")
    })).sort((a, b) => a.after_miles - b.after_miles);
  
    for (const tier of sortedTiers) {
      const milesInThisTier = tier.after_miles - previousTierMiles;
      if (milesRemaining <= 0) break;
      
      if (milesRemaining > milesInThisTier) {
        cost += milesInThisTier * currentMileRate;
        milesRemaining -= milesInThisTier;
      } else {
        cost += milesRemaining * currentMileRate;
        milesRemaining = 0;
      }
      previousTierMiles = tier.after_miles;
      currentMileRate = parseFloat(p.mile_tier_prices[tier.id] || "0");
    }
  
    if (milesRemaining > 0) {
      cost += milesRemaining * currentMileRate;
    }
  
    const waitingPrice = parseFloat(p.waiting_price || "0");
    const baseMinutePrice = parseFloat(p.base_minute_price || "0");
    // Use base minute price if specified, otherwise maybe waiting price applies if it strictly refers to journey
    // The prompt requested 'aiting time etc' to be considered. We'll add base_minute_price to duration.
    const minuteRate = baseMinutePrice > 0 ? baseMinutePrice : 0; 
    const timeCost = durationMin * minuteRate;
    cost += timeCost;
  
    const minPrice = parseFloat(p.min_price || "0");
    if (cost < minPrice) {
      cost = minPrice;
    }
  
    return Math.round(cost * 100) / 100;
  };

  const requestRide = async (pickup: Location, dropoff: Location, rideType: RideType, riderName?: string, paymentMethod?: string, useWalletBalance?: boolean): Promise<Ride> => {
    let distanceKm = 0;
    let durationMinutes = 0;

    try {
      const baseUrl = getApiUrl();
      const originStr = `${pickup.latitude},${pickup.longitude}`;
      const destStr = `${dropoff.latitude},${dropoff.longitude}`;
      const url = `${baseUrl}/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;

      console.log('📍 Fetching directions for ride request:', url);
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
        const leg = data.routes[0].legs[0];
        // distance.value is always in meters from Google API, convert to miles
        const distanceMeters = leg.distance?.value || 0;
        distanceKm = distanceMeters / 1000; // keep km for fare calculation
        durationMinutes = Math.round((leg.duration?.value || 0) / 60);
        console.log(`✅ Directions API success: ${distanceMeters}m = ${distanceKm.toFixed(1)}km = ${(distanceMeters / 1609.344).toFixed(1)}mi, duration=${durationMinutes}min`);
      } else {
        console.warn('⚠️ Directions API returned non-OK status:', data.status, 'error_message:', data.error_message);
        distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
        durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
      }
    } catch (e) {
      console.warn("❌ Directions API failed, using fallback:", e);
      distanceKm = Math.round((5 + Math.random() * 15) * 10) / 10;
      durationMinutes = Math.round(distanceKm * 3 + Math.random() * 10);
    }

    // Convert km to miles for storage and display (UK app)
    const distanceMiles = Math.round(distanceKm * 0.621371 * 10) / 10;

    const farePrice = calculateDynamicFare(distanceMiles, durationMinutes, rideType);
    const walletBalance = userRef.current?.walletBalance || 0;
    const walletDeduction = (useWalletBalance && walletBalance > 0) ? Math.min(walletBalance, farePrice) : 0;
    const expectedCollectAmount = farePrice - walletDeduction;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const newRide: Ride = {
      id: `ride_${Date.now()}`,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      rideType,
      status: "pending",
      farePrice,
      distanceKm: distanceMiles, // Store as miles for the UK market
      durationMinutes,
      // Driver fields left undefined — populated when a real driver accepts via socket
      driverName: undefined,
      driverRating: undefined,
      vehicleInfo: undefined,
      licensePlate: undefined,
      otp,
      paymentMethod: paymentMethod || "cash",
      walletDeduction,
      expectedCollectAmount,
      createdAt: new Date().toISOString(),
    };

    console.log(`🚕 Ride created: distance=${distanceMiles}mi, duration=${durationMinutes}min, fare=${farePrice}`);

    setActiveRide(newRide);
    await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(newRide));

    // Deduct wallet balance immediately if used
    if (walletDeduction > 0) {
      try {
        await updateProfile({ walletBalance: walletBalance - walletDeduction });

        // Record the transaction
        if (user?.id) {
          const { api } = await import('@/lib/api');
          await api.payments.addWalletTransaction(user.id, {
            rideId: newRide.id,
            amount: walletDeduction,
            type: "debit",
            description: `Wallet deduction for ride ${newRide.id.slice(0, 12)}...`,
          });
        }
      } catch (err) {
        console.error('Failed to deduct wallet balance:', err);
      }
    }

    // Broadcast ride request to all connected drivers via Socket.IO
    try {
      const socket = getSocket();
      socket.emit("ride:request", {
        ...newRide,
        riderId: user?.id,
        riderName: riderName || user?.fullName || "Rider",
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }

    return newRide;
  };

  const startRide = async (rideId: string, otp: string): Promise<boolean> => {
    if (activeRide?.id === rideId && activeRide.otp === otp) {
      const startedRide = { ...activeRide, status: "in_progress" as RideStatus };
      setActiveRide(startedRide);
      await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(startedRide));
      return true;
    }
    return false;
  };

  const cancelRide = async (rideId: string, withPenalty: boolean = false) => {
    const rideToCancel = activeRide?.id === rideId ? activeRide : null;
    if (rideToCancel) {
      if (withPenalty) {
        const currentBalance = userRef.current?.walletBalance || 0;
        const penaltyAmount = rideToCancel.farePrice || 0;
        
        try {
          // Negative means subtracting penalty from balance
          await updateProfile({ walletBalance: Math.max(0, currentBalance - penaltyAmount) });
          console.log(`✅ [RideContext] Deducted £${penaltyAmount} penalty for auto-cancelled ride ${rideId}`);
          
          if (userRef.current?.id) {
            const { api } = await import('@/lib/api');
            await api.payments.addWalletTransaction(userRef.current.id, {
              rideId,
              amount: penaltyAmount,
              type: "debit",
              description: `Cancellation fee for ride`,
            });
          }
        } catch (err) {
          console.error('Failed to process cancellation penalty:', err);
        }
      } else {
        // Refund wallet deduction if cancelled normally
        if (rideToCancel.walletDeduction && rideToCancel.walletDeduction > 0) {
          const currentBalance = userRef.current?.walletBalance || 0;
          try {
            await updateProfile({ walletBalance: currentBalance + rideToCancel.walletDeduction });
            console.log(`✅ [RideContext] Refunded £${rideToCancel.walletDeduction} for cancelled ride ${rideId}`);
          } catch (err) {
            console.error('Failed to refund wallet balance:', err);
          }
        }
      }

      const cancelledRide = { ...rideToCancel, status: "cancelled" as RideStatus };
      const newHistory = [cancelledRide, ...rideHistory];

      setActiveRide(null);
      setRideHistory(newHistory);

      await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
      await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));

      // Notify driver via socket that rider cancelled
      try {
        const socket = getSocket();
        socket.emit("ride:status", { rideId, status: "cancelled" });
      } catch (err) {
        console.warn("Socket emit failed for cancel:", err);
      }
    }
  };

  const completeRide = async (rideId: string) => {
    try {
      if (activeRide?.id === rideId) {
        const completedRide: Ride = {
          ...activeRide,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
        const newHistory = [completedRide, ...rideHistory];

        setActiveRide(null);
        setRideHistory(newHistory);

        await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
        await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (e) {
      console.error("Failed to mark ride completed", e);
    }
  };

  const updateRidePaymentMethod = async (rideId: string, method: string) => {
    if (!activeRide || activeRide.id !== rideId) return;
    try {
      // 1. Optimistic update
      const updated = { ...activeRide, paymentMethod: method };
      setActiveRide(updated);
      await AsyncStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(updated));

      // 2. Call backend
      const { api } = await import('@/lib/api');
      await api.rides.update(rideId, { paymentMethod: method } as Partial<Ride>);

      // 3. Emit local socket update to immediately notify driver without relying solely on backend sync
      try {
        const socket = getSocket();
        socket.emit("ride:update", { rideId, paymentMethod: method });
      } catch (e) {
        console.warn("Could not emit ride:update", e);
      }
    } catch (error) {
      console.error("Failed to update payment method:", error);
      // Revert optimistic update gracefully if needed here
    }
  };

  const submitRiderRating = async (rideId: string, rating: number, comment?: string) => {
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/rides/${rideId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverRating: rating,
          driverComment: comment,
          ratedBy: "rider",
        }),
      });
      console.log(`⭐ Rider submitted rating ${rating} for ride ${rideId}`);
    } catch (err) {
      console.warn("Failed to submit rider rating:", err);
    }
    setPendingRating(null);
  };

  const dismissRiderRating = () => {
    setPendingRating(null);
  };

  return (
    <RideContext.Provider
      value={{
        activeRide,
        rideHistory,
        requestRide,
        startRide,
        cancelRide,
        completeRide,
        updateRidePaymentMethod,
        calculateDynamicFare,
        pendingRating,
        submitRiderRating,
        dismissRiderRating,
        isLoading,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error("useRide must be used within a RideProvider");
  }
  return context;
}
