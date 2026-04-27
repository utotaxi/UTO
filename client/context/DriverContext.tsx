// // // // // // // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // // // // // // import AsyncStorage from "@react-native-async-storage/async-storage";

// // // // // // // export interface DriverProfile {
// // // // // // //   vehicleType: "economy" | "premium" | "xl";
// // // // // // //   vehicleMake: string;
// // // // // // //   vehicleModel: string;
// // // // // // //   vehicleYear: number;
// // // // // // //   vehicleColor: string;
// // // // // // //   licensePlate: string;
// // // // // // //   isVerified: boolean;
// // // // // // // }

// // // // // // // export interface Trip {
// // // // // // //   id: string;
// // // // // // //   riderName: string;
// // // // // // //   pickupAddress: string;
// // // // // // //   dropoffAddress: string;
// // // // // // //   farePrice: number;
// // // // // // //   distanceKm: number;
// // // // // // //   durationMinutes: number;
// // // // // // //   completedAt: string;
// // // // // // //   rating?: number;
// // // // // // // }

// // // // // // // export interface Earnings {
// // // // // // //   today: number;
// // // // // // //   thisWeek: number;
// // // // // // //   thisMonth: number;
// // // // // // //   totalTrips: number;
// // // // // // //   averageRating: number;
// // // // // // // }

// // // // // // // interface DriverContextType {
// // // // // // //   isOnline: boolean;
// // // // // // //   setIsOnline: (online: boolean) => void;
// // // // // // //   driverProfile: DriverProfile | null;
// // // // // // //   setDriverProfile: (profile: DriverProfile) => void;
// // // // // // //   tripHistory: Trip[];
// // // // // // //   earnings: Earnings;
// // // // // // //   activeRideRequest: RideRequest | null;
// // // // // // //   acceptRide: () => void;
// // // // // // //   declineRide: () => void;
// // // // // // //   completeTrip: () => void;
// // // // // // //   isLoading: boolean;
// // // // // // // }

// // // // // // // interface RideRequest {
// // // // // // //   id: string;
// // // // // // //   riderName: string;
// // // // // // //   pickupAddress: string;
// // // // // // //   dropoffAddress: string;
// // // // // // //   estimatedFare: number;
// // // // // // //   distanceKm: number;
// // // // // // //   pickupDistance: number;
// // // // // // // }

// // // // // // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // // // // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // // // // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // // // // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // // // // // const SAMPLE_TRIPS: Trip[] = [
// // // // // // //   {
// // // // // // //     id: "trip_1",
// // // // // // //     riderName: "Alex J.",
// // // // // // //     pickupAddress: "123 Main St",
// // // // // // //     dropoffAddress: "456 Oak Ave",
// // // // // // //     farePrice: 18.50,
// // // // // // //     distanceKm: 8.2,
// // // // // // //     durationMinutes: 22,
// // // // // // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // // // // // //     rating: 5,
// // // // // // //   },
// // // // // // //   {
// // // // // // //     id: "trip_2",
// // // // // // //     riderName: "Sam K.",
// // // // // // //     pickupAddress: "789 Pine Rd",
// // // // // // //     dropoffAddress: "321 Elm St",
// // // // // // //     farePrice: 12.75,
// // // // // // //     distanceKm: 5.4,
// // // // // // //     durationMinutes: 15,
// // // // // // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // // // // // //     rating: 4,
// // // // // // //   },
// // // // // // //   {
// // // // // // //     id: "trip_3",
// // // // // // //     riderName: "Jordan M.",
// // // // // // //     pickupAddress: "555 Cedar Ln",
// // // // // // //     dropoffAddress: "888 Birch Blvd",
// // // // // // //     farePrice: 24.00,
// // // // // // //     distanceKm: 12.1,
// // // // // // //     durationMinutes: 28,
// // // // // // //     completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
// // // // // // //     rating: 5,
// // // // // // //   },
// // // // // // // ];

// // // // // // // const RIDE_REQUESTS: RideRequest[] = [
// // // // // // //   {
// // // // // // //     id: "req_1",
// // // // // // //     riderName: "Taylor S.",
// // // // // // //     pickupAddress: "100 Market St",
// // // // // // //     dropoffAddress: "200 Financial District",
// // // // // // //     estimatedFare: 15.50,
// // // // // // //     distanceKm: 6.8,
// // // // // // //     pickupDistance: 0.5,
// // // // // // //   },
// // // // // // //   {
// // // // // // //     id: "req_2",
// // // // // // //     riderName: "Casey L.",
// // // // // // //     pickupAddress: "300 University Ave",
// // // // // // //     dropoffAddress: "400 Tech Park",
// // // // // // //     estimatedFare: 22.00,
// // // // // // //     distanceKm: 9.5,
// // // // // // //     pickupDistance: 0.8,
// // // // // // //   },
// // // // // // // ];

// // // // // // // export function DriverProvider({ children }: { children: ReactNode }) {
// // // // // // //   const [isOnline, setIsOnlineState] = useState(false);
// // // // // // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // // // // // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // // // // // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // // // // // //   const [isLoading, setIsLoading] = useState(true);

// // // // // // //   useEffect(() => {
// // // // // // //     loadStoredData();
// // // // // // //   }, []);

// // // // // // //   useEffect(() => {
// // // // // // //     let interval: NodeJS.Timeout;

// // // // // // //     if (isOnline && !activeRideRequest) {
// // // // // // //       interval = setInterval(() => {
// // // // // // //         if (Math.random() > 0.7) {
// // // // // // //           const request = RIDE_REQUESTS[Math.floor(Math.random() * RIDE_REQUESTS.length)];
// // // // // // //           setActiveRideRequest({ ...request, id: `req_${Date.now()}` });
// // // // // // //         }
// // // // // // //       }, 10000);
// // // // // // //     }

// // // // // // //     return () => {
// // // // // // //       if (interval) clearInterval(interval);
// // // // // // //     };
// // // // // // //   }, [isOnline, activeRideRequest]);

// // // // // // //   const loadStoredData = async () => {
// // // // // // //     try {
// // // // // // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // // // // // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // // // // // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // // // // // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // // // // // //       ]);

// // // // // // //       if (storedProfile) {
// // // // // // //         setDriverProfileState(JSON.parse(storedProfile));
// // // // // // //       }

// // // // // // //       if (storedTrips) {
// // // // // // //         setTripHistory(JSON.parse(storedTrips));
// // // // // // //       } else {
// // // // // // //         setTripHistory(SAMPLE_TRIPS);
// // // // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // // // // // //       }

// // // // // // //       if (storedOnline === "true") {
// // // // // // //         setIsOnlineState(true);
// // // // // // //       }
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Failed to load driver data:", error);
// // // // // // //     } finally {
// // // // // // //       setIsLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const setIsOnline = async (online: boolean) => {
// // // // // // //     setIsOnlineState(online);
// // // // // // //     try {
// // // // // // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Failed to save online status:", error);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const setDriverProfile = async (profile: DriverProfile) => {
// // // // // // //     setDriverProfileState(profile);
// // // // // // //     try {
// // // // // // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // // // // // //     } catch (error) {
// // // // // // //       console.error("Failed to save driver profile:", error);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const acceptRide = () => {
// // // // // // //     if (activeRideRequest) {
// // // // // // //       setActiveRideRequest(null);

// // // // // // //       setTimeout(async () => {
// // // // // // //         const newTrip: Trip = {
// // // // // // //           id: `trip_${Date.now()}`,
// // // // // // //           riderName: activeRideRequest.riderName,
// // // // // // //           pickupAddress: activeRideRequest.pickupAddress,
// // // // // // //           dropoffAddress: activeRideRequest.dropoffAddress,
// // // // // // //           farePrice: activeRideRequest.estimatedFare,
// // // // // // //           distanceKm: activeRideRequest.distanceKm,
// // // // // // //           durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// // // // // // //           completedAt: new Date().toISOString(),
// // // // // // //           rating: Math.random() > 0.2 ? 5 : 4,
// // // // // // //         };

// // // // // // //         const newHistory = [newTrip, ...tripHistory];
// // // // // // //         setTripHistory(newHistory);
// // // // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // // // // // //       }, 3000);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const declineRide = () => {
// // // // // // //     setActiveRideRequest(null);
// // // // // // //   };

// // // // // // //   const completeTrip = () => {
// // // // // // //     setActiveRideRequest(null);
// // // // // // //   };

// // // // // // //   const calculateEarnings = (): Earnings => {
// // // // // // //     const now = new Date();
// // // // // // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // // // // // //     const weekStart = new Date(todayStart);
// // // // // // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // // // // // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // // // // // //     let today = 0;
// // // // // // //     let thisWeek = 0;
// // // // // // //     let thisMonth = 0;
// // // // // // //     let totalRating = 0;
// // // // // // //     let ratedTrips = 0;

// // // // // // //     tripHistory.forEach((trip) => {
// // // // // // //       const tripDate = new Date(trip.completedAt);

// // // // // // //       if (tripDate >= monthStart) {
// // // // // // //         thisMonth += trip.farePrice;

// // // // // // //         if (tripDate >= weekStart) {
// // // // // // //           thisWeek += trip.farePrice;

// // // // // // //           if (tripDate >= todayStart) {
// // // // // // //             today += trip.farePrice;
// // // // // // //           }
// // // // // // //         }
// // // // // // //       }

// // // // // // //       if (trip.rating) {
// // // // // // //         totalRating += trip.rating;
// // // // // // //         ratedTrips++;
// // // // // // //       }
// // // // // // //     });

// // // // // // //     return {
// // // // // // //       today: Math.round(today * 100) / 100,
// // // // // // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // // // // // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // // // // // //       totalTrips: tripHistory.length,
// // // // // // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // // // // // //     };
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <DriverContext.Provider
// // // // // // //       value={{
// // // // // // //         isOnline,
// // // // // // //         setIsOnline,
// // // // // // //         driverProfile,
// // // // // // //         setDriverProfile,
// // // // // // //         tripHistory,
// // // // // // //         earnings: calculateEarnings(),
// // // // // // //         activeRideRequest,
// // // // // // //         acceptRide,
// // // // // // //         declineRide,
// // // // // // //         completeTrip,
// // // // // // //         isLoading,
// // // // // // //       }}
// // // // // // //     >
// // // // // // //       {children}
// // // // // // //     </DriverContext.Provider>
// // // // // // //   );
// // // // // // // }

// // // // // // // export function useDriver() {
// // // // // // //   const context = useContext(DriverContext);
// // // // // // //   if (context === undefined) {
// // // // // // //     throw new Error("useDriver must be used within a DriverProvider");
// // // // // // //   }
// // // // // // //   return context;
// // // // // // // }

// // // // // // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // // // // // import AsyncStorage from "@react-native-async-storage/async-storage";

// // // // // // export interface DriverProfile {
// // // // // //   vehicleType: "economy" | "premium" | "xl";
// // // // // //   vehicleMake: string;
// // // // // //   vehicleModel: string;
// // // // // //   vehicleYear: number;
// // // // // //   vehicleColor: string;
// // // // // //   licensePlate: string;
// // // // // //   isVerified: boolean;
// // // // // // }

// // // // // // export interface Trip {
// // // // // //   id: string;
// // // // // //   riderName: string;
// // // // // //   pickupAddress: string;
// // // // // //   dropoffAddress: string;
// // // // // //   farePrice: number;
// // // // // //   distanceKm: number;
// // // // // //   durationMinutes: number;
// // // // // //   completedAt: string;
// // // // // //   rating?: number;
// // // // // // }

// // // // // // export interface Earnings {
// // // // // //   today: number;
// // // // // //   thisWeek: number;
// // // // // //   thisMonth: number;
// // // // // //   totalTrips: number;
// // // // // //   averageRating: number;
// // // // // // }

// // // // // // interface DriverContextType {
// // // // // //   isOnline: boolean;
// // // // // //   setIsOnline: (online: boolean) => void;
// // // // // //   driverProfile: DriverProfile | null;
// // // // // //   setDriverProfile: (profile: DriverProfile) => void;
// // // // // //   tripHistory: Trip[];
// // // // // //   earnings: Earnings;
// // // // // //   activeRideRequest: RideRequest | null;
// // // // // //   acceptRide: () => void;
// // // // // //   declineRide: () => void;
// // // // // //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// // // // // //   completeTrip: () => void;
// // // // // //   isLoading: boolean;
// // // // // // }

// // // // // // interface RideRequest {
// // // // // //   id: string;
// // // // // //   riderName: string;
// // // // // //   pickupAddress: string;
// // // // // //   dropoffAddress: string;
// // // // // //   estimatedFare: number;
// // // // // //   distanceKm: number;
// // // // // //   pickupDistance: number;
// // // // // // }

// // // // // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // // // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // // // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // // // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // // // // const SAMPLE_TRIPS: Trip[] = [
// // // // // //   {
// // // // // //     id: "trip_1",
// // // // // //     riderName: "Alex J.",
// // // // // //     pickupAddress: "123 Main St",
// // // // // //     dropoffAddress: "456 Oak Ave",
// // // // // //     farePrice: 18.50,
// // // // // //     distanceKm: 8.2,
// // // // // //     durationMinutes: 22,
// // // // // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // // // // //     rating: 5,
// // // // // //   },
// // // // // //   {
// // // // // //     id: "trip_2",
// // // // // //     riderName: "Sam K.",
// // // // // //     pickupAddress: "789 Pine Rd",
// // // // // //     dropoffAddress: "321 Elm St",
// // // // // //     farePrice: 12.75,
// // // // // //     distanceKm: 5.4,
// // // // // //     durationMinutes: 15,
// // // // // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // // // // //     rating: 4,
// // // // // //   },
// // // // // //   {
// // // // // //     id: "trip_3",
// // // // // //     riderName: "Jordan M.",
// // // // // //     pickupAddress: "555 Cedar Ln",
// // // // // //     dropoffAddress: "888 Birch Blvd",
// // // // // //     farePrice: 24.00,
// // // // // //     distanceKm: 12.1,
// // // // // //     durationMinutes: 28,
// // // // // //     completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
// // // // // //     rating: 5,
// // // // // //   },
// // // // // // ];

// // // // // // const RIDE_REQUESTS: RideRequest[] = [
// // // // // //   {
// // // // // //     id: "req_1",
// // // // // //     riderName: "Taylor S.",
// // // // // //     pickupAddress: "100 Market St",
// // // // // //     dropoffAddress: "200 Financial District",
// // // // // //     estimatedFare: 15.50,
// // // // // //     distanceKm: 6.8,
// // // // // //     pickupDistance: 0.5,
// // // // // //   },
// // // // // //   {
// // // // // //     id: "req_2",
// // // // // //     riderName: "Casey L.",
// // // // // //     pickupAddress: "300 University Ave",
// // // // // //     dropoffAddress: "400 Tech Park",
// // // // // //     estimatedFare: 22.00,
// // // // // //     distanceKm: 9.5,
// // // // // //     pickupDistance: 0.8,
// // // // // //   },
// // // // // // ];

// // // // // // export function DriverProvider({ children }: { children: ReactNode }) {
// // // // // //   const [isOnline, setIsOnlineState] = useState(false);
// // // // // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // // // // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // // // // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // // // // //   const [isLoading, setIsLoading] = useState(true);

// // // // // //   useEffect(() => {
// // // // // //     loadStoredData();
// // // // // //   }, []);

// // // // // //   useEffect(() => {
// // // // // //     let interval: NodeJS.Timeout;

// // // // // //     if (isOnline && !activeRideRequest) {
// // // // // //       interval = setInterval(() => {
// // // // // //         if (Math.random() > 0.7) {
// // // // // //           const request = RIDE_REQUESTS[Math.floor(Math.random() * RIDE_REQUESTS.length)];
// // // // // //           setActiveRideRequest({ ...request, id: `req_${Date.now()}` });
// // // // // //         }
// // // // // //       }, 10000);
// // // // // //     }

// // // // // //     return () => {
// // // // // //       if (interval) clearInterval(interval);
// // // // // //     };
// // // // // //   }, [isOnline, activeRideRequest]);

// // // // // //   const loadStoredData = async () => {
// // // // // //     try {
// // // // // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // // // // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // // // // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // // // // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // // // // //       ]);

// // // // // //       if (storedProfile) {
// // // // // //         setDriverProfileState(JSON.parse(storedProfile));
// // // // // //       }

// // // // // //       if (storedTrips) {
// // // // // //         setTripHistory(JSON.parse(storedTrips));
// // // // // //       } else {
// // // // // //         setTripHistory(SAMPLE_TRIPS);
// // // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // // // // //       }

// // // // // //       if (storedOnline === "true") {
// // // // // //         setIsOnlineState(true);
// // // // // //       }
// // // // // //     } catch (error) {
// // // // // //       console.error("Failed to load driver data:", error);
// // // // // //     } finally {
// // // // // //       setIsLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const setIsOnline = async (online: boolean) => {
// // // // // //     setIsOnlineState(online);
// // // // // //     try {
// // // // // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // // // // //     } catch (error) {
// // // // // //       console.error("Failed to save online status:", error);
// // // // // //     }
// // // // // //   };

// // // // // //   const setDriverProfile = async (profile: DriverProfile) => {
// // // // // //     setDriverProfileState(profile);
// // // // // //     try {
// // // // // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // // // // //     } catch (error) {
// // // // // //       console.error("Failed to save driver profile:", error);
// // // // // //     }
// // // // // //   };

// // // // // //   const acceptRide = () => {
// // // // // //     if (activeRideRequest) {
// // // // // //       setActiveRideRequest(null);

// // // // // //       setTimeout(async () => {
// // // // // //         const newTrip: Trip = {
// // // // // //           id: `trip_${Date.now()}`,
// // // // // //           riderName: activeRideRequest.riderName,
// // // // // //           pickupAddress: activeRideRequest.pickupAddress,
// // // // // //           dropoffAddress: activeRideRequest.dropoffAddress,
// // // // // //           farePrice: activeRideRequest.estimatedFare,
// // // // // //           distanceKm: activeRideRequest.distanceKm,
// // // // // //           durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// // // // // //           completedAt: new Date().toISOString(),
// // // // // //           rating: Math.random() > 0.2 ? 5 : 4,
// // // // // //         };

// // // // // //         const newHistory = [newTrip, ...tripHistory];
// // // // // //         setTripHistory(newHistory);
// // // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // // // // //       }, 3000);
// // // // // //     }
// // // // // //   };

// // // // // //   const declineRide = () => {
// // // // // //     setActiveRideRequest(null);
// // // // // //   };

// // // // // //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// // // // // //     // In a real app, this would call the backend
// // // // // //     // For now, we'll just simulate success if the ride is the active request
// // // // // //     if (activeRideRequest && activeRideRequest.id === rideId) {
// // // // // //        // Status update logic would go here
// // // // // //        return true;
// // // // // //     }
// // // // // //     return false;
// // // // // //   };

// // // // // //   const completeTrip = () => {
// // // // // //     setActiveRideRequest(null);
// // // // // //   };

// // // // // //   const calculateEarnings = (): Earnings => {
// // // // // //     const now = new Date();
// // // // // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // // // // //     const weekStart = new Date(todayStart);
// // // // // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // // // // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // // // // //     let today = 0;
// // // // // //     let thisWeek = 0;
// // // // // //     let thisMonth = 0;
// // // // // //     let totalRating = 0;
// // // // // //     let ratedTrips = 0;

// // // // // //     tripHistory.forEach((trip) => {
// // // // // //       const tripDate = new Date(trip.completedAt);

// // // // // //       if (tripDate >= monthStart) {
// // // // // //         thisMonth += trip.farePrice;

// // // // // //         if (tripDate >= weekStart) {
// // // // // //           thisWeek += trip.farePrice;

// // // // // //           if (tripDate >= todayStart) {
// // // // // //             today += trip.farePrice;
// // // // // //           }
// // // // // //         }
// // // // // //       }

// // // // // //       if (trip.rating) {
// // // // // //         totalRating += trip.rating;
// // // // // //         ratedTrips++;
// // // // // //       }
// // // // // //     });

// // // // // //     return {
// // // // // //       today: Math.round(today * 100) / 100,
// // // // // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // // // // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // // // // //       totalTrips: tripHistory.length,
// // // // // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // // // // //     };
// // // // // //   };

// // // // // //   return (
// // // // // //     <DriverContext.Provider
// // // // // //       value={{
// // // // // //         isOnline,
// // // // // //         setIsOnline,
// // // // // //         driverProfile,
// // // // // //         setDriverProfile,
// // // // // //         tripHistory,
// // // // // //         earnings: calculateEarnings(),
// // // // // //         activeRideRequest,
// // // // // //         acceptRide,
// // // // // //         declineRide,
// // // // // //         startRide,
// // // // // //         completeTrip,
// // // // // //         isLoading,
// // // // // //       }}
// // // // // //     >
// // // // // //       {children}
// // // // // //     </DriverContext.Provider>
// // // // // //   );
// // // // // // }

// // // // // // export function useDriver() {
// // // // // //   const context = useContext(DriverContext);
// // // // // //   if (context === undefined) {
// // // // // //     throw new Error("useDriver must be used within a DriverProvider");
// // // // // //   }
// // // // // //   return context;
// // // // // // }

// // // // // import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
// // // // // import AsyncStorage from "@react-native-async-storage/async-storage";

// // // // // export interface DriverProfile {
// // // // //   vehicleType: "saloon" | "minibus";
// // // // //   vehicleMake: string;
// // // // //   vehicleModel: string;
// // // // //   vehicleYear: number;
// // // // //   vehicleColor: string;
// // // // //   licensePlate: string;
// // // // //   isVerified: boolean;
// // // // // }

// // // // // export interface Trip {
// // // // //   id: string;
// // // // //   riderName: string;
// // // // //   pickupAddress: string;
// // // // //   dropoffAddress: string;
// // // // //   farePrice: number;
// // // // //   distanceKm: number;
// // // // //   durationMinutes: number;
// // // // //   completedAt: string;
// // // // //   rating?: number;
// // // // // }

// // // // // export interface Earnings {
// // // // //   today: number;
// // // // //   thisWeek: number;
// // // // //   thisMonth: number;
// // // // //   totalTrips: number;
// // // // //   averageRating: number;
// // // // // }

// // // // // interface DriverContextType {
// // // // //   isOnline: boolean;
// // // // //   setIsOnline: (online: boolean) => void;
// // // // //   driverProfile: DriverProfile | null;
// // // // //   setDriverProfile: (profile: DriverProfile) => void;
// // // // //   tripHistory: Trip[];
// // // // //   earnings: Earnings;
// // // // //   activeRideRequest: RideRequest | null;
// // // // //   acceptRide: () => void;
// // // // //   declineRide: () => void;
// // // // //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// // // // //   completeTrip: () => void;
// // // // //   isLoading: boolean;
// // // // // }

// // // // // interface RideRequest {
// // // // //   id: string;
// // // // //   riderName: string;
// // // // //   pickupAddress: string;
// // // // //   dropoffAddress: string;
// // // // //   estimatedFare: number;
// // // // //   distanceKm: number;
// // // // //   pickupDistance: number;
// // // // //   otp?: string;
// // // // // }

// // // // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // // // const SAMPLE_TRIPS: Trip[] = [
// // // // //   {
// // // // //     id: "trip_1",
// // // // //     riderName: "Alex J.",
// // // // //     pickupAddress: "123 Main St",
// // // // //     dropoffAddress: "456 Oak Ave",
// // // // //     farePrice: 18.50,
// // // // //     distanceKm: 8.2,
// // // // //     durationMinutes: 22,
// // // // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // // // //     rating: 5,
// // // // //   },
// // // // //   {
// // // // //     id: "trip_2",
// // // // //     riderName: "Sam K.",
// // // // //     pickupAddress: "789 Pine Rd",
// // // // //     dropoffAddress: "321 Elm St",
// // // // //     farePrice: 12.75,
// // // // //     distanceKm: 5.4,
// // // // //     durationMinutes: 15,
// // // // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // // // //     rating: 4,
// // // // //   },
// // // // //   {
// // // // //     id: "trip_3",
// // // // //     riderName: "Jordan M.",
// // // // //     pickupAddress: "555 Cedar Ln",
// // // // //     dropoffAddress: "888 Birch Blvd",
// // // // //     farePrice: 24.00,
// // // // //     distanceKm: 12.1,
// // // // //     durationMinutes: 28,
// // // // //     completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
// // // // //     rating: 5,
// // // // //   },
// // // // // ];

// // // // // const RIDE_REQUESTS: RideRequest[] = [
// // // // //   {
// // // // //     id: "req_1",
// // // // //     riderName: "Taylor S.",
// // // // //     pickupAddress: "100 Market St",
// // // // //     dropoffAddress: "200 Financial District",
// // // // //     estimatedFare: 15.50,
// // // // //     distanceKm: 6.8,
// // // // //     pickupDistance: 0.5,
// // // // //   },
// // // // //   {
// // // // //     id: "req_2",
// // // // //     riderName: "Casey L.",
// // // // //     pickupAddress: "300 University Ave",
// // // // //     dropoffAddress: "400 Tech Park",
// // // // //     estimatedFare: 22.00,
// // // // //     distanceKm: 9.5,
// // // // //     pickupDistance: 0.8,
// // // // //   },
// // // // // ];

// // // // // export function DriverProvider({ children }: { children: ReactNode }) {
// // // // //   const [isOnline, setIsOnlineState] = useState(false);
// // // // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // // // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // // // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // // // //   const [isLoading, setIsLoading] = useState(true);

// // // // //   useEffect(() => {
// // // // //     loadStoredData();
// // // // //   }, []);

// // // // //   useEffect(() => {
// // // // //     const setupSocket = async () => {
// // // // //       const { socket } = await import("@/lib/socket");

// // // // //       socket.on("ride:new", (ride: any) => {
// // // // //         if (isOnline && !activeRideRequest) {
// // // // //           setActiveRideRequest({
// // // // //             id: ride.id,
// // // // //             riderName: "Rider", // In real app would be ride.riderName
// // // // //             pickupAddress: ride.pickupLocation.address,
// // // // //             dropoffAddress: ride.dropoffLocation.address,
// // // // //             estimatedFare: ride.farePrice,
// // // // //             distanceKm: ride.distanceKm,
// // // // //             pickupDistance: 0.5, // Mocked
// // // // //             otp: ride.otp,
// // // // //           });
// // // // //         }
// // // // //       });
// // // // //     };

// // // // //     setupSocket();

// // // // //     return () => {
// // // // //       // socket cleanup if needed
// // // // //     };
// // // // //   }, [isOnline, activeRideRequest]);

// // // // //   const loadStoredData = async () => {
// // // // //     try {
// // // // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // // // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // // // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // // // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // // // //       ]);

// // // // //       if (storedProfile) {
// // // // //         setDriverProfileState(JSON.parse(storedProfile));
// // // // //       }

// // // // //       if (storedTrips) {
// // // // //         setTripHistory(JSON.parse(storedTrips));
// // // // //       } else {
// // // // //         setTripHistory(SAMPLE_TRIPS);
// // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // // // //       }

// // // // //       if (storedOnline === "true") {
// // // // //         setIsOnlineState(true);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Failed to load driver data:", error);
// // // // //     } finally {
// // // // //       setIsLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const setIsOnline = async (online: boolean) => {
// // // // //     setIsOnlineState(online);
// // // // //     try {
// // // // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // // // //     } catch (error) {
// // // // //       console.error("Failed to save online status:", error);
// // // // //     }
// // // // //   };

// // // // //   const setDriverProfile = async (profile: DriverProfile) => {
// // // // //     setDriverProfileState(profile);
// // // // //     try {
// // // // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // // // //     } catch (error) {
// // // // //       console.error("Failed to save driver profile:", error);
// // // // //     }
// // // // //   };

// // // // //   const acceptRide = () => {
// // // // //     if (activeRideRequest) {
// // // // //       setActiveRideRequest(null);

// // // // //       setTimeout(async () => {
// // // // //         const newTrip: Trip = {
// // // // //           id: `trip_${Date.now()}`,
// // // // //           riderName: activeRideRequest.riderName,
// // // // //           pickupAddress: activeRideRequest.pickupAddress,
// // // // //           dropoffAddress: activeRideRequest.dropoffAddress,
// // // // //           farePrice: activeRideRequest.estimatedFare,
// // // // //           distanceKm: activeRideRequest.distanceKm,
// // // // //           durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// // // // //           completedAt: new Date().toISOString(),
// // // // //           rating: Math.random() > 0.2 ? 5 : 4,
// // // // //         };

// // // // //         const newHistory = [newTrip, ...tripHistory];
// // // // //         setTripHistory(newHistory);
// // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // // // //       }, 3000);
// // // // //     }
// // // // //   };

// // // // //   const declineRide = () => {
// // // // //     setActiveRideRequest(null);
// // // // //   };

// // // // //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// // // // //     // In a real app, this would call the backend
// // // // //     // For now, we'll just simulate success if the ride is the active request
// // // // //     if (activeRideRequest && activeRideRequest.id === rideId) {
// // // // //        // Status update logic would go here
// // // // //        return true;
// // // // //     }
// // // // //     return false;
// // // // //   };

// // // // //   const completeTrip = () => {
// // // // //     setActiveRideRequest(null);
// // // // //   };

// // // // //   const calculateEarnings = (): Earnings => {
// // // // //     const now = new Date();
// // // // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // // // //     const weekStart = new Date(todayStart);
// // // // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // // // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // // // //     let today = 0;
// // // // //     let thisWeek = 0;
// // // // //     let thisMonth = 0;
// // // // //     let totalRating = 0;
// // // // //     let ratedTrips = 0;

// // // // //     tripHistory.forEach((trip) => {
// // // // //       const tripDate = new Date(trip.completedAt);

// // // // //       if (tripDate >= monthStart) {
// // // // //         thisMonth += trip.farePrice;

// // // // //         if (tripDate >= weekStart) {
// // // // //           thisWeek += trip.farePrice;

// // // // //           if (tripDate >= todayStart) {
// // // // //             today += trip.farePrice;
// // // // //           }
// // // // //         }
// // // // //       }

// // // // //       if (trip.rating) {
// // // // //         totalRating += trip.rating;
// // // // //         ratedTrips++;
// // // // //       }
// // // // //     });

// // // // //     return {
// // // // //       today: Math.round(today * 100) / 100,
// // // // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // // // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // // // //       totalTrips: tripHistory.length,
// // // // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // // // //     };
// // // // //   };

// // // // //   return (
// // // // //     <DriverContext.Provider
// // // // //       value={{
// // // // //         isOnline,
// // // // //         setIsOnline,
// // // // //         driverProfile,
// // // // //         setDriverProfile,
// // // // //         tripHistory,
// // // // //         earnings: calculateEarnings(),
// // // // //         activeRideRequest,
// // // // //         acceptRide,
// // // // //         declineRide,
// // // // //         startRide,
// // // // //         completeTrip,
// // // // //         isLoading,
// // // // //       }}
// // // // //     >
// // // // //       {children}
// // // // //     </DriverContext.Provider>
// // // // //   );
// // // // // }

// // // // // export function useDriver() {
// // // // //   const context = useContext(DriverContext);
// // // // //   if (context === undefined) {
// // // // //     throw new Error("useDriver must be used within a DriverProvider");
// // // // //   }
// // // // //   return context;
// // // // // }
// // // // // //client/context/DriverContext.tsx
// // // // // import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
// // // // // import AsyncStorage from "@react-native-async-storage/async-storage";
// // // // // import { getSocket, onNewRide } from "@/lib/socket";

// // // // // export interface DriverProfile {
// // // // //   vehicleType: "economy" | "premium" | "xl";
// // // // //   vehicleMake: string;
// // // // //   vehicleModel: string;
// // // // //   vehicleYear: number;
// // // // //   vehicleColor: string;
// // // // //   licensePlate: string;
// // // // //   isVerified: boolean;
// // // // // }

// // // // // export interface Trip {
// // // // //   id: string;
// // // // //   riderName: string;
// // // // //   pickupAddress: string;
// // // // //   dropoffAddress: string;
// // // // //   farePrice: number;
// // // // //   distanceKm: number;
// // // // //   durationMinutes: number;
// // // // //   completedAt: string;
// // // // //   rating?: number;
// // // // // }

// // // // // export interface Earnings {
// // // // //   today: number;
// // // // //   thisWeek: number;
// // // // //   thisMonth: number;
// // // // //   totalTrips: number;
// // // // //   averageRating: number;
// // // // // }

// // // // // interface RideRequest {
// // // // //   id: string;
// // // // //   riderName: string;
// // // // //   pickupAddress: string;
// // // // //   dropoffAddress: string;
// // // // //   estimatedFare: number;
// // // // //   distanceKm: number;
// // // // //   pickupDistance: number;
// // // // //   otp?: string;
// // // // // }

// // // // // interface DriverContextType {
// // // // //   isOnline: boolean;
// // // // //   setIsOnline: (online: boolean) => void;
// // // // //   driverProfile: DriverProfile | null;
// // // // //   setDriverProfile: (profile: DriverProfile) => void;
// // // // //   tripHistory: Trip[];
// // // // //   earnings: Earnings;
// // // // //   activeRideRequest: RideRequest | null;
// // // // //   acceptRide: () => void;
// // // // //   declineRide: () => void;
// // // // //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// // // // //   completeTrip: () => void;
// // // // //   isLoading: boolean;
// // // // // }

// // // // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // // // const SAMPLE_TRIPS: Trip[] = [
// // // // //   {
// // // // //     id: "trip_1",
// // // // //     riderName: "Alex J.",
// // // // //     pickupAddress: "123 Main St",
// // // // //     dropoffAddress: "456 Oak Ave",
// // // // //     farePrice: 18.50,
// // // // //     distanceKm: 8.2,
// // // // //     durationMinutes: 22,
// // // // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // // // //     rating: 5,
// // // // //   },
// // // // //   {
// // // // //     id: "trip_2",
// // // // //     riderName: "Sam K.",
// // // // //     pickupAddress: "789 Pine Rd",
// // // // //     dropoffAddress: "321 Elm St",
// // // // //     farePrice: 12.75,
// // // // //     distanceKm: 5.4,
// // // // //     durationMinutes: 15,
// // // // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // // // //     rating: 4,
// // // // //   },
// // // // // ];

// // // // // export function DriverProvider({ children }: { children: ReactNode }) {
// // // // //   const [isOnline, setIsOnlineState] = useState(false);
// // // // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // // // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // // // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // // // //   const [isLoading, setIsLoading] = useState(true);

// // // // //   const isOnlineRef = useRef(isOnline);
// // // // //   const activeRideRequestRef = useRef(activeRideRequest);

// // // // //   useEffect(() => {
// // // // //     isOnlineRef.current = isOnline;
// // // // //   }, [isOnline]);

// // // // //   useEffect(() => {
// // // // //     activeRideRequestRef.current = activeRideRequest;
// // // // //   }, [activeRideRequest]);

// // // // //   useEffect(() => {
// // // // //     loadStoredData();
// // // // //   }, []);

// // // // //   // Listen for real ride requests from riders via Socket.IO
// // // // //   useEffect(() => {
// // // // //     let cleanup: (() => void) | undefined;

// // // // //     try {
// // // // //       cleanup = onNewRide((ride: any) => {
// // // // //         if (isOnlineRef.current && !activeRideRequestRef.current) {
// // // // //           setActiveRideRequest({
// // // // //             id: ride.id,
// // // // //             riderName: ride.riderName || "Rider",
// // // // //             pickupAddress: ride.pickupLocation?.address || "Pickup location",
// // // // //             dropoffAddress: ride.dropoffLocation?.address || "Dropoff location",
// // // // //             estimatedFare: ride.farePrice || 0,
// // // // //             distanceKm: ride.distanceKm || 0,
// // // // //             pickupDistance: 0.5,
// // // // //             otp: ride.otp,
// // // // //           });
// // // // //         }
// // // // //       });
// // // // //     } catch (err) {
// // // // //       console.warn("Socket not available:", err);
// // // // //     }

// // // // //     return () => {
// // // // //       if (cleanup) cleanup();
// // // // //     };
// // // // //   }, []);

// // // // //   const loadStoredData = async () => {
// // // // //     try {
// // // // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // // // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // // // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // // // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // // // //       ]);

// // // // //       if (storedProfile) {
// // // // //         setDriverProfileState(JSON.parse(storedProfile));
// // // // //       }

// // // // //       if (storedTrips) {
// // // // //         setTripHistory(JSON.parse(storedTrips));
// // // // //       } else {
// // // // //         setTripHistory(SAMPLE_TRIPS);
// // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // // // //       }

// // // // //       if (storedOnline === "true") {
// // // // //         setIsOnlineState(true);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error("Failed to load driver data:", error);
// // // // //     } finally {
// // // // //       setIsLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const setIsOnline = async (online: boolean) => {
// // // // //     setIsOnlineState(online);
// // // // //     try {
// // // // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // // // //     } catch (error) {
// // // // //       console.error("Failed to save online status:", error);
// // // // //     }
// // // // //   };

// // // // //   const setDriverProfile = async (profile: DriverProfile) => {
// // // // //     setDriverProfileState(profile);
// // // // //     try {
// // // // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // // // //     } catch (error) {
// // // // //       console.error("Failed to save driver profile:", error);
// // // // //     }
// // // // //   };

// // // // //   const acceptRide = () => {
// // // // //     // Keep the request active so OTP input can use it
// // // // //     // Do not clear activeRideRequest here — driver still needs to enter OTP
// // // // //   };

// // // // //   const declineRide = () => {
// // // // //     setActiveRideRequest(null);
// // // // //   };

// // // // //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// // // // //     if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
// // // // //       // Notify server ride has started
// // // // //       try {
// // // // //         const socket = getSocket();
// // // // //         socket.emit("ride:status", { rideId, status: "in_progress" });
// // // // //       } catch (err) {
// // // // //         console.warn("Socket emit failed:", err);
// // // // //       }

// // // // //       const newTrip: Trip = {
// // // // //         id: `trip_${Date.now()}`,
// // // // //         riderName: activeRideRequest.riderName,
// // // // //         pickupAddress: activeRideRequest.pickupAddress,
// // // // //         dropoffAddress: activeRideRequest.dropoffAddress,
// // // // //         farePrice: activeRideRequest.estimatedFare,
// // // // //         distanceKm: activeRideRequest.distanceKm,
// // // // //         durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// // // // //         completedAt: new Date().toISOString(),
// // // // //         rating: 5,
// // // // //       };

// // // // //       const newHistory = [newTrip, ...tripHistory];
// // // // //       setTripHistory(newHistory);
// // // // //       setActiveRideRequest(null);
// // // // //       try {
// // // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // // // //       } catch (err) {
// // // // //         console.error("Failed to save trip:", err);
// // // // //       }
// // // // //       return true;
// // // // //     }
// // // // //     return false;
// // // // //   };

// // // // //   const completeTrip = () => {
// // // // //     setActiveRideRequest(null);
// // // // //   };

// // // // //   const calculateEarnings = (): Earnings => {
// // // // //     const now = new Date();
// // // // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // // // //     const weekStart = new Date(todayStart);
// // // // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // // // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // // // //     let today = 0;
// // // // //     let thisWeek = 0;
// // // // //     let thisMonth = 0;
// // // // //     let totalRating = 0;
// // // // //     let ratedTrips = 0;

// // // // //     tripHistory.forEach((trip) => {
// // // // //       const tripDate = new Date(trip.completedAt);

// // // // //       if (tripDate >= monthStart) {
// // // // //         thisMonth += trip.farePrice;

// // // // //         if (tripDate >= weekStart) {
// // // // //           thisWeek += trip.farePrice;

// // // // //           if (tripDate >= todayStart) {
// // // // //             today += trip.farePrice;
// // // // //           }
// // // // //         }
// // // // //       }

// // // // //       if (trip.rating) {
// // // // //         totalRating += trip.rating;
// // // // //         ratedTrips++;
// // // // //       }
// // // // //     });

// // // // //     return {
// // // // //       today: Math.round(today * 100) / 100,
// // // // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // // // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // // // //       totalTrips: tripHistory.length,
// // // // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // // // //     };
// // // // //   };

// // // // //   return (
// // // // //     <DriverContext.Provider
// // // // //       value={{
// // // // //         isOnline,
// // // // //         setIsOnline,
// // // // //         driverProfile,
// // // // //         setDriverProfile,
// // // // //         tripHistory,
// // // // //         earnings: calculateEarnings(),
// // // // //         activeRideRequest,
// // // // //         acceptRide,
// // // // //         declineRide,
// // // // //         startRide,
// // // // //         completeTrip,
// // // // //         isLoading,
// // // // //       }}
// // // // //     >
// // // // //       {children}
// // // // //     </DriverContext.Provider>
// // // // //   );
// // // // // }

// // // // // export function useDriver() {
// // // // //   const context = useContext(DriverContext);
// // // // //   if (context === undefined) {
// // // // //     throw new Error("useDriver must be used within a DriverProvider");
// // // // //   }
// // // // //   return context;
// // // // // }

// // // // //client/context/DriverContext.tsx - FIXED ACCEPT FLOW

// // // // import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
// // // // import AsyncStorage from "@react-native-async-storage/async-storage";
// // // // import { getSocket, onNewRide } from "@/lib/socket";

// // // // export interface DriverProfile {
// // // //   vehicleType: "economy" | "premium" | "xl";
// // // //   vehicleMake: string;
// // // //   vehicleModel: string;
// // // //   vehicleYear: number;
// // // //   vehicleColor: string;
// // // //   licensePlate: string;
// // // //   isVerified: boolean;
// // // // }

// // // // export interface Trip {
// // // //   id: string;
// // // //   riderName: string;
// // // //   pickupAddress: string;
// // // //   dropoffAddress: string;
// // // //   farePrice: number;
// // // //   distanceKm: number;
// // // //   durationMinutes: number;
// // // //   completedAt: string;
// // // //   rating?: number;
// // // // }

// // // // export interface Earnings {
// // // //   today: number;
// // // //   thisWeek: number;
// // // //   thisMonth: number;
// // // //   totalTrips: number;
// // // //   averageRating: number;
// // // // }

// // // // interface RideRequest {
// // // //   id: string;
// // // //   riderName: string;
// // // //   pickupAddress: string;
// // // //   dropoffAddress: string;
// // // //   estimatedFare: number;
// // // //   distanceKm: number;
// // // //   pickupDistance: number;
// // // //   otp?: string;
// // // // }

// // // // interface DriverContextType {
// // // //   isOnline: boolean;
// // // //   setIsOnline: (online: boolean) => void;
// // // //   driverProfile: DriverProfile | null;
// // // //   setDriverProfile: (profile: DriverProfile) => void;
// // // //   tripHistory: Trip[];
// // // //   earnings: Earnings;
// // // //   activeRideRequest: RideRequest | null;
// // // //   acceptedRide: RideRequest | null; // ✅ NEW: Track accepted ride
// // // //   acceptRide: () => void;
// // // //   declineRide: () => void;
// // // //   arrivedAtPickup: () => void; // ✅ NEW: Driver arrived at pickup
// // // //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// // // //   completeTrip: () => void;
// // // //   isLoading: boolean;
// // // // }

// // // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // // const SAMPLE_TRIPS: Trip[] = [
// // // //   {
// // // //     id: "trip_1",
// // // //     riderName: "Alex J.",
// // // //     pickupAddress: "123 Main St",
// // // //     dropoffAddress: "456 Oak Ave",
// // // //     farePrice: 18.50,
// // // //     distanceKm: 8.2,
// // // //     durationMinutes: 22,
// // // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // // //     rating: 5,
// // // //   },
// // // //   {
// // // //     id: "trip_2",
// // // //     riderName: "Sam K.",
// // // //     pickupAddress: "789 Pine Rd",
// // // //     dropoffAddress: "321 Elm St",
// // // //     farePrice: 12.75,
// // // //     distanceKm: 5.4,
// // // //     durationMinutes: 15,
// // // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // // //     rating: 4,
// // // //   },
// // // // ];

// // // // export function DriverProvider({ children }: { children: ReactNode }) {
// // // //   const [isOnline, setIsOnlineState] = useState(false);
// // // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // // //   const [acceptedRide, setAcceptedRide] = useState<RideRequest | null>(null); // ✅ NEW
// // // //   const [isLoading, setIsLoading] = useState(true);

// // // //   const isOnlineRef = useRef(isOnline);
// // // //   const activeRideRequestRef = useRef(activeRideRequest);

// // // //   useEffect(() => {
// // // //     isOnlineRef.current = isOnline;
// // // //   }, [isOnline]);

// // // //   useEffect(() => {
// // // //     activeRideRequestRef.current = activeRideRequest;
// // // //   }, [activeRideRequest]);

// // // //   useEffect(() => {
// // // //     loadStoredData();
// // // //   }, []);

// // // //   useEffect(() => {
// // // //     let cleanup: (() => void) | undefined;

// // // //     try {
// // // //       cleanup = onNewRide((ride: any) => {
// // // //         console.log('🚗 New ride request received:', ride.id);

// // // //         if (isOnlineRef.current && !activeRideRequestRef.current) {
// // // //           setActiveRideRequest({
// // // //             id: ride.id,
// // // //             riderName: ride.riderName || "Rider",
// // // //             pickupAddress: ride.pickupLocation?.address || "Pickup location",
// // // //             dropoffAddress: ride.dropoffLocation?.address || "Dropoff location",
// // // //             estimatedFare: ride.farePrice || 0,
// // // //             distanceKm: ride.distanceKm || 0,
// // // //             pickupDistance: 0.5,
// // // //             otp: ride.otp,
// // // //           });
// // // //         }
// // // //       });
// // // //     } catch (err) {
// // // //       console.warn("Socket not available:", err);
// // // //     }

// // // //     return () => {
// // // //       if (cleanup) cleanup();
// // // //     };
// // // //   }, []);

// // // //   const loadStoredData = async () => {
// // // //     try {
// // // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // // //       ]);

// // // //       if (storedProfile) {
// // // //         setDriverProfileState(JSON.parse(storedProfile));
// // // //       }

// // // //       if (storedTrips) {
// // // //         setTripHistory(JSON.parse(storedTrips));
// // // //       } else {
// // // //         setTripHistory(SAMPLE_TRIPS);
// // // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // // //       }

// // // //       if (storedOnline === "true") {
// // // //         setIsOnlineState(true);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Failed to load driver data:", error);
// // // //     } finally {
// // // //       setIsLoading(false);
// // // //     }
// // // //   };

// // // //   const setIsOnline = async (online: boolean) => {
// // // //     setIsOnlineState(online);
// // // //     try {
// // // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // // //     } catch (error) {
// // // //       console.error("Failed to save online status:", error);
// // // //     }
// // // //   };

// // // //   const setDriverProfile = async (profile: DriverProfile) => {
// // // //     setDriverProfileState(profile);
// // // //     try {
// // // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // // //     } catch (error) {
// // // //       console.error("Failed to save driver profile:", error);
// // // //     }
// // // //   };

// // // //   // ✅ FIX: Accept ride WITHOUT OTP - just change status
// // // //   const acceptRide = () => {
// // // //     if (!activeRideRequest) return;

// // // //     console.log('✅ Driver accepting ride:', activeRideRequest.id);

// // // //     // Move from request to accepted
// // // //     setAcceptedRide(activeRideRequest);
// // // //     setActiveRideRequest(null);

// // // //     // Notify server that ride is accepted
// // // //     try {
// // // //       const socket = getSocket();
// // // //       socket.emit("ride:status", { 
// // // //         rideId: activeRideRequest.id, 
// // // //         status: "accepted" 
// // // //       });
// // // //       console.log('📡 Sent ride:status = accepted to server');
// // // //     } catch (err) {
// // // //       console.warn("Socket emit failed:", err);
// // // //     }
// // // //   };

// // // //   const declineRide = () => {
// // // //     console.log('❌ Driver declining ride');
// // // //     setActiveRideRequest(null);
// // // //   };

// // // //   // ✅ NEW: Driver arrived at pickup - ready for OTP
// // // //   const arrivedAtPickup = () => {
// // // //     console.log('📍 Driver arrived at pickup');

// // // //     try {
// // // //       const socket = getSocket();
// // // //       if (acceptedRide) {
// // // //         socket.emit("ride:status", { 
// // // //           rideId: acceptedRide.id, 
// // // //           status: "arrived" 
// // // //         });
// // // //       }
// // // //     } catch (err) {
// // // //       console.warn("Socket emit failed:", err);
// // // //     }
// // // //   };

// // // //   // ✅ Start ride with OTP verification
// // // //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// // // //     if (!acceptedRide || acceptedRide.otp !== otp) {
// // // //       console.log('❌ Invalid OTP');
// // // //       return false;
// // // //     }

// // // //     console.log('✅ OTP verified, starting ride');

// // // //     // Notify server ride has started
// // // //     try {
// // // //       const socket = getSocket();
// // // //       socket.emit("ride:status", { rideId, status: "in_progress" });
// // // //     } catch (err) {
// // // //       console.warn("Socket emit failed:", err);
// // // //     }

// // // //     // Add to trip history
// // // //     const newTrip: Trip = {
// // // //       id: `trip_${Date.now()}`,
// // // //       riderName: acceptedRide.riderName,
// // // //       pickupAddress: acceptedRide.pickupAddress,
// // // //       dropoffAddress: acceptedRide.dropoffAddress,
// // // //       farePrice: acceptedRide.estimatedFare,
// // // //       distanceKm: acceptedRide.distanceKm,
// // // //       durationMinutes: Math.round(acceptedRide.distanceKm * 3),
// // // //       completedAt: new Date().toISOString(),
// // // //       rating: 5,
// // // //     };

// // // //     const newHistory = [newTrip, ...tripHistory];
// // // //     setTripHistory(newHistory);
// // // //     setAcceptedRide(null);

// // // //     try {
// // // //       await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // // //     } catch (err) {
// // // //       console.error("Failed to save trip:", err);
// // // //     }

// // // //     return true;
// // // //   };

// // // //   const completeTrip = () => {
// // // //     setAcceptedRide(null);
// // // //   };

// // // //   const calculateEarnings = (): Earnings => {
// // // //     const now = new Date();
// // // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // // //     const weekStart = new Date(todayStart);
// // // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // // //     let today = 0;
// // // //     let thisWeek = 0;
// // // //     let thisMonth = 0;
// // // //     let totalRating = 0;
// // // //     let ratedTrips = 0;

// // // //     tripHistory.forEach((trip) => {
// // // //       const tripDate = new Date(trip.completedAt);

// // // //       if (tripDate >= monthStart) {
// // // //         thisMonth += trip.farePrice;

// // // //         if (tripDate >= weekStart) {
// // // //           thisWeek += trip.farePrice;

// // // //           if (tripDate >= todayStart) {
// // // //             today += trip.farePrice;
// // // //           }
// // // //         }
// // // //       }

// // // //       if (trip.rating) {
// // // //         totalRating += trip.rating;
// // // //         ratedTrips++;
// // // //       }
// // // //     });

// // // //     return {
// // // //       today: Math.round(today * 100) / 100,
// // // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // // //       totalTrips: tripHistory.length,
// // // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // // //     };
// // // //   };

// // // //   return (
// // // //     <DriverContext.Provider
// // // //       value={{
// // // //         isOnline,
// // // //         setIsOnline,
// // // //         driverProfile,
// // // //         setDriverProfile,
// // // //         tripHistory,
// // // //         earnings: calculateEarnings(),
// // // //         activeRideRequest,
// // // //         acceptedRide, // ✅ NEW
// // // //         acceptRide,
// // // //         declineRide,
// // // //         arrivedAtPickup, // ✅ NEW
// // // //         startRide,
// // // //         completeTrip,
// // // //         isLoading,
// // // //       }}
// // // //     >
// // // //       {children}
// // // //     </DriverContext.Provider>
// // // //   );
// // // // }

// // // // export function useDriver() {
// // // //   const context = useContext(DriverContext);
// // // //   if (context === undefined) {
// // // //     throw new Error("useDriver must be used within a DriverProvider");
// // // //   }
// // // //   return context;
// // // // }
// // // import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
// // // import AsyncStorage from "@react-native-async-storage/async-storage";
// // // import { getSocket, onNewRide } from "@/lib/socket";

// // // export interface DriverProfile {
// // //   vehicleType: "economy" | "premium" | "xl";
// // //   vehicleMake: string;
// // //   vehicleModel: string;
// // //   vehicleYear: number;
// // //   vehicleColor: string;
// // //   licensePlate: string;
// // //   isVerified: boolean;
// // // }

// // // export interface Trip {
// // //   id: string;
// // //   riderName: string;
// // //   pickupAddress: string;
// // //   dropoffAddress: string;
// // //   farePrice: number;
// // //   distanceKm: number;
// // //   durationMinutes: number;
// // //   completedAt: string;
// // //   rating?: number;
// // // }

// // // export interface Earnings {
// // //   today: number;
// // //   thisWeek: number;
// // //   thisMonth: number;
// // //   totalTrips: number;
// // //   averageRating: number;
// // // }

// // // export interface RideRequest {
// // //   id: string;
// // //   riderName: string;
// // //   pickupAddress: string;
// // //   dropoffAddress: string;
// // //   estimatedFare: number;
// // //   distanceKm: number;
// // //   pickupDistance: number;
// // //   otp?: string;
// // // }

// // // export type DriverRideState = "none" | "incoming" | "accepted" | "at_pickup" | "in_progress";

// // // interface DriverContextType {
// // //   isOnline: boolean;
// // //   setIsOnline: (online: boolean) => void;
// // //   driverProfile: DriverProfile | null;
// // //   setDriverProfile: (profile: DriverProfile) => void;
// // //   tripHistory: Trip[];
// // //   earnings: Earnings;
// // //   activeRideRequest: RideRequest | null;
// // //   rideState: DriverRideState;
// // //   acceptRide: () => void;
// // //   declineRide: () => void;
// // //   arrivedAtPickup: () => void;
// // //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// // //   completeTrip: () => void;
// // //   isLoading: boolean;
// // // }

// // // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // // const ONLINE_STATUS_KEY = "@uto_online_status";

// // // const SAMPLE_TRIPS: Trip[] = [
// // //   {
// // //     id: "trip_1",
// // //     riderName: "Alex J.",
// // //     pickupAddress: "123 Main St",
// // //     dropoffAddress: "456 Oak Ave",
// // //     farePrice: 18.50,
// // //     distanceKm: 8.2,
// // //     durationMinutes: 22,
// // //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// // //     rating: 5,
// // //   },
// // //   {
// // //     id: "trip_2",
// // //     riderName: "Sam K.",
// // //     pickupAddress: "789 Pine Rd",
// // //     dropoffAddress: "321 Elm St",
// // //     farePrice: 12.75,
// // //     distanceKm: 5.4,
// // //     durationMinutes: 15,
// // //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// // //     rating: 4,
// // //   },
// // // ];

// // // export function DriverProvider({ children }: { children: ReactNode }) {
// // //   const [isOnline, setIsOnlineState] = useState(false);
// // //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// // //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// // //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// // //   const [rideState, setRideState] = useState<DriverRideState>("none");
// // //   const [isLoading, setIsLoading] = useState(true);

// // //   const isOnlineRef = useRef(isOnline);
// // //   const activeRideRequestRef = useRef(activeRideRequest);

// // //   useEffect(() => {
// // //     isOnlineRef.current = isOnline;
// // //   }, [isOnline]);

// // //   useEffect(() => {
// // //     activeRideRequestRef.current = activeRideRequest;
// // //   }, [activeRideRequest]);

// // //   useEffect(() => {
// // //     loadStoredData();
// // //   }, []);

// // //   useEffect(() => {
// // //     let cleanup: (() => void) | undefined;

// // //     try {
// // //       cleanup = onNewRide((ride: any) => {
// // //         if (isOnlineRef.current && !activeRideRequestRef.current) {
// // //           setActiveRideRequest({
// // //             id: ride.id,
// // //             riderName: ride.riderName || "Rider",
// // //             pickupAddress: ride.pickupLocation?.address || "Pickup location",
// // //             dropoffAddress: ride.dropoffLocation?.address || "Dropoff location",
// // //             estimatedFare: ride.farePrice || 0,
// // //             distanceKm: ride.distanceKm || 0,
// // //             pickupDistance: 0.5,
// // //             otp: ride.otp,
// // //           });
// // //           setRideState("incoming");
// // //         }
// // //       });
// // //     } catch (err) {
// // //       console.warn("Socket not available:", err);
// // //     }

// // //     return () => {
// // //       if (cleanup) cleanup();
// // //     };
// // //   }, []);

// // //   const loadStoredData = async () => {
// // //     try {
// // //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// // //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// // //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// // //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// // //       ]);

// // //       if (storedProfile) {
// // //         setDriverProfileState(JSON.parse(storedProfile));
// // //       }

// // //       if (storedTrips) {
// // //         setTripHistory(JSON.parse(storedTrips));
// // //       } else {
// // //         setTripHistory(SAMPLE_TRIPS);
// // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// // //       }

// // //       if (storedOnline === "true") {
// // //         setIsOnlineState(true);
// // //       }
// // //     } catch (error) {
// // //       console.error("Failed to load driver data:", error);
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   const setIsOnline = async (online: boolean) => {
// // //     setIsOnlineState(online);
// // //     try {
// // //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// // //     } catch (error) {
// // //       console.error("Failed to save online status:", error);
// // //     }
// // //   };

// // //   const setDriverProfile = async (profile: DriverProfile) => {
// // //     setDriverProfileState(profile);
// // //     try {
// // //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// // //     } catch (error) {
// // //       console.error("Failed to save driver profile:", error);
// // //     }
// // //   };

// // //   const acceptRide = () => {
// // //     if (!activeRideRequest) return;
// // //     setRideState("accepted");

// // //     try {
// // //       const socket = getSocket();
// // //       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "accepted" });
// // //     } catch (err) {
// // //       console.warn("Socket emit failed:", err);
// // //     }
// // //   };

// // //   const declineRide = () => {
// // //     if (activeRideRequest && (rideState === "accepted" || rideState === "at_pickup")) {
// // //       try {
// // //         const socket = getSocket();
// // //         socket.emit("ride:status", { rideId: activeRideRequest.id, status: "cancelled" });
// // //       } catch (e) {
// // //         console.warn("Failed to emit cancel:", e);
// // //       }
// // //     }
// // //     setActiveRideRequest(null);
// // //     setRideState("none");
// // //   };

// // //   const arrivedAtPickup = () => {
// // //     if (!activeRideRequest) return;
// // //     setRideState("at_pickup");

// // //     try {
// // //       const socket = getSocket();
// // //       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "arrived" });
// // //     } catch (err) {
// // //       console.warn("Socket emit failed:", err);
// // //     }
// // //   };

// // //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// // //     if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
// // //       try {
// // //         const socket = getSocket();
// // //         socket.emit("ride:status", { rideId, status: "in_progress" });
// // //       } catch (err) {
// // //         console.warn("Socket emit failed:", err);
// // //       }

// // //       const newTrip: Trip = {
// // //         id: `trip_${Date.now()}`,
// // //         riderName: activeRideRequest.riderName,
// // //         pickupAddress: activeRideRequest.pickupAddress,
// // //         dropoffAddress: activeRideRequest.dropoffAddress,
// // //         farePrice: activeRideRequest.estimatedFare,
// // //         distanceKm: activeRideRequest.distanceKm,
// // //         durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// // //         completedAt: new Date().toISOString(),
// // //         rating: 5,
// // //       };

// // //       const newHistory = [newTrip, ...tripHistory];
// // //       setTripHistory(newHistory);
// // //       setActiveRideRequest(null);
// // //       setRideState("none");
// // //       try {
// // //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// // //       } catch (err) {
// // //         console.error("Failed to save trip:", err);
// // //       }
// // //       return true;
// // //     }
// // //     return false;
// // //   };

// // //   const completeTrip = () => {
// // //     setActiveRideRequest(null);
// // //     setRideState("none");
// // //   };

// // //   const calculateEarnings = (): Earnings => {
// // //     const now = new Date();
// // //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// // //     const weekStart = new Date(todayStart);
// // //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// // //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// // //     let today = 0;
// // //     let thisWeek = 0;
// // //     let thisMonth = 0;
// // //     let totalRating = 0;
// // //     let ratedTrips = 0;

// // //     tripHistory.forEach((trip) => {
// // //       const tripDate = new Date(trip.completedAt);

// // //       if (tripDate >= monthStart) {
// // //         thisMonth += trip.farePrice;

// // //         if (tripDate >= weekStart) {
// // //           thisWeek += trip.farePrice;

// // //           if (tripDate >= todayStart) {
// // //             today += trip.farePrice;
// // //           }
// // //         }
// // //       }

// // //       if (trip.rating) {
// // //         totalRating += trip.rating;
// // //         ratedTrips++;
// // //       }
// // //     });

// // //     return {
// // //       today: Math.round(today * 100) / 100,
// // //       thisWeek: Math.round(thisWeek * 100) / 100,
// // //       thisMonth: Math.round(thisMonth * 100) / 100,
// // //       totalTrips: tripHistory.length,
// // //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// // //     };
// // //   };

// // //   return (
// // //     <DriverContext.Provider
// // //       value={{
// // //         isOnline,
// // //         setIsOnline,
// // //         driverProfile,
// // //         setDriverProfile,
// // //         tripHistory,
// // //         earnings: calculateEarnings(),
// // //         activeRideRequest,
// // //         rideState,
// // //         acceptRide,
// // //         declineRide,
// // //         arrivedAtPickup,
// // //         startRide,
// // //         completeTrip,
// // //         isLoading,
// // //       }}
// // //     >
// // //       {children}
// // //     </DriverContext.Provider>
// // //   );
// // // }

// // // export function useDriver() {
// // //   const context = useContext(DriverContext);
// // //   if (context === undefined) {
// // //     throw new Error("useDriver must be used within a DriverProvider");
// // //   }
// // //   return context;
// // // }
// // import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
// // import AsyncStorage from "@react-native-async-storage/async-storage";
// // import { getSocket, onNewRide } from "@/lib/socket";

// // export interface DriverProfile {
// //   vehicleType: "economy" | "premium" | "xl";
// //   vehicleMake: string;
// //   vehicleModel: string;
// //   vehicleYear: number;
// //   vehicleColor: string;
// //   licensePlate: string;
// //   isVerified: boolean;
// // }

// // export interface Trip {
// //   id: string;
// //   riderName: string;
// //   pickupAddress: string;
// //   dropoffAddress: string;
// //   farePrice: number;
// //   distanceKm: number;
// //   durationMinutes: number;
// //   completedAt: string;
// //   rating?: number;
// // }

// // export interface Earnings {
// //   today: number;
// //   thisWeek: number;
// //   thisMonth: number;
// //   totalTrips: number;
// //   averageRating: number;
// // }

// // export interface RideRequest {
// //   id: string;
// //   riderName: string;
// //   pickupAddress: string;
// //   dropoffAddress: string;
// //   estimatedFare: number;
// //   distanceKm: number;
// //   pickupDistance: number;
// //   otp?: string;
// // }

// // export type DriverRideState = "none" | "incoming" | "accepted" | "at_pickup" | "in_progress";

// // interface DriverContextType {
// //   isOnline: boolean;
// //   setIsOnline: (online: boolean) => void;
// //   driverProfile: DriverProfile | null;
// //   setDriverProfile: (profile: DriverProfile) => void;
// //   tripHistory: Trip[];
// //   earnings: Earnings;
// //   activeRideRequest: RideRequest | null;
// //   rideState: DriverRideState;
// //   acceptRide: () => void;
// //   declineRide: () => void;
// //   arrivedAtPickup: () => void;
// //   startRide: (rideId: string, otp: string) => Promise<boolean>;
// //   completeTrip: () => void;
// //   isLoading: boolean;
// // }

// // const DriverContext = createContext<DriverContextType | undefined>(undefined);

// // const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// // const TRIP_HISTORY_KEY = "@uto_trip_history";
// // const ONLINE_STATUS_KEY = "@uto_online_status";

// // const SAMPLE_TRIPS: Trip[] = [
// //   {
// //     id: "trip_1",
// //     riderName: "Alex J.",
// //     pickupAddress: "123 Main St",
// //     dropoffAddress: "456 Oak Ave",
// //     farePrice: 18.50,
// //     distanceKm: 8.2,
// //     durationMinutes: 22,
// //     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
// //     rating: 5,
// //   },
// //   {
// //     id: "trip_2",
// //     riderName: "Sam K.",
// //     pickupAddress: "789 Pine Rd",
// //     dropoffAddress: "321 Elm St",
// //     farePrice: 12.75,
// //     distanceKm: 5.4,
// //     durationMinutes: 15,
// //     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
// //     rating: 4,
// //   },
// // ];

// // export function DriverProvider({ children }: { children: ReactNode }) {
// //   const [isOnline, setIsOnlineState] = useState(false);
// //   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
// //   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
// //   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
// //   const [rideState, setRideState] = useState<DriverRideState>("none");
// //   const [isLoading, setIsLoading] = useState(true);

// //   const isOnlineRef = useRef(isOnline);
// //   const activeRideRequestRef = useRef(activeRideRequest);

// //   useEffect(() => {
// //     isOnlineRef.current = isOnline;
// //   }, [isOnline]);

// //   useEffect(() => {
// //     activeRideRequestRef.current = activeRideRequest;
// //   }, [activeRideRequest]);

// //   useEffect(() => {
// //     loadStoredData();
// //   }, []);

// //   useEffect(() => {
// //     let cleanup: (() => void) | undefined;

// //     try {
// //       cleanup = onNewRide((ride: any) => {
// //         if (isOnlineRef.current && !activeRideRequestRef.current) {
// //           setActiveRideRequest({
// //             id: ride.id,
// //             riderName: ride.riderName || "Rider",
// //             pickupAddress: ride.pickupLocation?.address || "Pickup location",
// //             dropoffAddress: ride.dropoffLocation?.address || "Dropoff location",
// //             estimatedFare: ride.farePrice || 0,
// //             distanceKm: ride.distanceKm || 0,
// //             pickupDistance: 0.5,
// //             otp: ride.otp,
// //           });
// //           setRideState("incoming");
// //         }
// //       });
// //     } catch (err) {
// //       console.warn("Socket not available:", err);
// //     }

// //     return () => {
// //       if (cleanup) cleanup();
// //     };
// //   }, []);

// //   const loadStoredData = async () => {
// //     try {
// //       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
// //         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
// //         AsyncStorage.getItem(TRIP_HISTORY_KEY),
// //         AsyncStorage.getItem(ONLINE_STATUS_KEY),
// //       ]);

// //       if (storedProfile) {
// //         setDriverProfileState(JSON.parse(storedProfile));
// //       }

// //       if (storedTrips) {
// //         setTripHistory(JSON.parse(storedTrips));
// //       } else {
// //         setTripHistory(SAMPLE_TRIPS);
// //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
// //       }

// //       if (storedOnline === "true") {
// //         setIsOnlineState(true);
// //       }
// //     } catch (error) {
// //       console.error("Failed to load driver data:", error);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const setIsOnline = async (online: boolean) => {
// //     setIsOnlineState(online);
// //     try {
// //       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
// //     } catch (error) {
// //       console.error("Failed to save online status:", error);
// //     }
// //   };

// //   const setDriverProfile = async (profile: DriverProfile) => {
// //     setDriverProfileState(profile);
// //     try {
// //       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
// //     } catch (error) {
// //       console.error("Failed to save driver profile:", error);
// //     }
// //   };

// //   const acceptRide = () => {
// //     if (!activeRideRequest) return;
// //     setRideState("accepted");

// //     try {
// //       const socket = getSocket();
// //       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "accepted" });
// //     } catch (err) {
// //       console.warn("Socket emit failed:", err);
// //     }
// //   };

// //   const declineRide = () => {
// //     if (activeRideRequest && (rideState === "accepted" || rideState === "at_pickup")) {
// //       try {
// //         const socket = getSocket();
// //         socket.emit("ride:status", { rideId: activeRideRequest.id, status: "cancelled" });
// //       } catch (e) {
// //         console.warn("Failed to emit cancel:", e);
// //       }
// //     }
// //     setActiveRideRequest(null);
// //     setRideState("none");
// //   };

// //   const arrivedAtPickup = () => {
// //     if (!activeRideRequest) return;
// //     setRideState("at_pickup");

// //     try {
// //       const socket = getSocket();
// //       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "arrived" });
// //     } catch (err) {
// //       console.warn("Socket emit failed:", err);
// //     }
// //   };

// //   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
// //     if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
// //       try {
// //         const socket = getSocket();
// //         socket.emit("ride:status", { rideId, status: "in_progress" });
// //       } catch (err) {
// //         console.warn("Socket emit failed:", err);
// //       }

// //       setRideState("in_progress");
// //       return true;
// //     }
// //     return false;
// //   };

// //   const completeTrip = async () => {
// //     if (activeRideRequest) {
// //       const newTrip: Trip = {
// //         id: `trip_${Date.now()}`,
// //         riderName: activeRideRequest.riderName,
// //         pickupAddress: activeRideRequest.pickupAddress,
// //         dropoffAddress: activeRideRequest.dropoffAddress,
// //         farePrice: activeRideRequest.estimatedFare,
// //         distanceKm: activeRideRequest.distanceKm,
// //         durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
// //         completedAt: new Date().toISOString(),
// //         rating: 5,
// //       };

// //       const newHistory = [newTrip, ...tripHistory];
// //       setTripHistory(newHistory);
// //       try {
// //         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
// //       } catch (err) {
// //         console.error("Failed to save trip:", err);
// //       }

// //       try {
// //         const socket = getSocket();
// //         socket.emit("ride:status", { rideId: activeRideRequest.id, status: "completed" });
// //       } catch (err) {
// //         console.warn("Socket emit failed:", err);
// //       }
// //     }
// //     setActiveRideRequest(null);
// //     setRideState("none");
// //   };

// //   const calculateEarnings = (): Earnings => {
// //     const now = new Date();
// //     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// //     const weekStart = new Date(todayStart);
// //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
// //     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// //     let today = 0;
// //     let thisWeek = 0;
// //     let thisMonth = 0;
// //     let totalRating = 0;
// //     let ratedTrips = 0;

// //     tripHistory.forEach((trip) => {
// //       const tripDate = new Date(trip.completedAt);

// //       if (tripDate >= monthStart) {
// //         thisMonth += trip.farePrice;

// //         if (tripDate >= weekStart) {
// //           thisWeek += trip.farePrice;

// //           if (tripDate >= todayStart) {
// //             today += trip.farePrice;
// //           }
// //         }
// //       }

// //       if (trip.rating) {
// //         totalRating += trip.rating;
// //         ratedTrips++;
// //       }
// //     });

// //     return {
// //       today: Math.round(today * 100) / 100,
// //       thisWeek: Math.round(thisWeek * 100) / 100,
// //       thisMonth: Math.round(thisMonth * 100) / 100,
// //       totalTrips: tripHistory.length,
// //       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
// //     };
// //   };

// //   return (
// //     <DriverContext.Provider
// //       value={{
// //         isOnline,
// //         setIsOnline,
// //         driverProfile,
// //         setDriverProfile,
// //         tripHistory,
// //         earnings: calculateEarnings(),
// //         activeRideRequest,
// //         rideState,
// //         acceptRide,
// //         declineRide,
// //         arrivedAtPickup,
// //         startRide,
// //         completeTrip,
// //         isLoading,
// //       }}
// //     >
// //       {children}
// //     </DriverContext.Provider>
// //   );
// // }

// // export function useDriver() {
// //   const context = useContext(DriverContext);
// //   if (context === undefined) {
// //     throw new Error("useDriver must be used within a DriverProvider");
// //   }
// //   return context;
// // }

// import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getSocket, onNewRide } from "@/lib/socket";

// export interface DriverProfile {
//   vehicleType: "economy" | "premium" | "xl";
//   vehicleMake: string;
//   vehicleModel: string;
//   vehicleYear: number;
//   vehicleColor: string;
//   licensePlate: string;
//   isVerified: boolean;
// }

// export interface Trip {
//   id: string;
//   riderName: string;
//   pickupAddress: string;
//   dropoffAddress: string;
//   farePrice: number;
//   distanceKm: number;
//   durationMinutes: number;
//   completedAt: string;
//   rating?: number;
// }

// export interface Earnings {
//   today: number;
//   thisWeek: number;
//   thisMonth: number;
//   totalTrips: number;
//   averageRating: number;
// }

// export interface RideRequest {
//   id: string;
//   riderName: string;
//   pickupAddress: string;
//   dropoffAddress: string;
//   pickupLatitude: number;
//   pickupLongitude: number;
//   dropoffLatitude: number;
//   dropoffLongitude: number;
//   estimatedFare: number;
//   distanceKm: number;
//   durationMinutes: number;
//   pickupDistance: number;
//   otp?: string;
// }

// export type DriverRideState = "none" | "incoming" | "accepted" | "at_pickup" | "in_progress";

// interface DriverContextType {
//   isOnline: boolean;
//   setIsOnline: (online: boolean) => void;
//   driverProfile: DriverProfile | null;
//   setDriverProfile: (profile: DriverProfile) => void;
//   tripHistory: Trip[];
//   earnings: Earnings;
//   activeRideRequest: RideRequest | null;
//   rideState: DriverRideState;
//   acceptRide: () => void;
//   declineRide: () => void;
//   arrivedAtPickup: () => void;
//   startRide: (rideId: string, otp: string) => Promise<boolean>;
//   completeTrip: () => void;
//   isLoading: boolean;
// }

// const DriverContext = createContext<DriverContextType | undefined>(undefined);

// const DRIVER_PROFILE_KEY = "@uto_driver_profile";
// const TRIP_HISTORY_KEY = "@uto_trip_history";
// const ONLINE_STATUS_KEY = "@uto_online_status";

// const SAMPLE_TRIPS: Trip[] = [
//   {
//     id: "trip_1",
//     riderName: "Alex J.",
//     pickupAddress: "123 Main St",
//     dropoffAddress: "456 Oak Ave",
//     farePrice: 18.50,
//     distanceKm: 8.2,
//     durationMinutes: 22,
//     completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
//     rating: 5,
//   },
//   {
//     id: "trip_2",
//     riderName: "Sam K.",
//     pickupAddress: "789 Pine Rd",
//     dropoffAddress: "321 Elm St",
//     farePrice: 12.75,
//     distanceKm: 5.4,
//     durationMinutes: 15,
//     completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
//     rating: 4,
//   },
// ];

// export function DriverProvider({ children }: { children: ReactNode }) {
//   const [isOnline, setIsOnlineState] = useState(false);
//   const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
//   const [tripHistory, setTripHistory] = useState<Trip[]>([]);
//   const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
//   const [rideState, setRideState] = useState<DriverRideState>("none");
//   const [isLoading, setIsLoading] = useState(true);

//   const isOnlineRef = useRef(isOnline);
//   const activeRideRequestRef = useRef(activeRideRequest);

//   useEffect(() => {
//     isOnlineRef.current = isOnline;
//   }, [isOnline]);

//   useEffect(() => {
//     activeRideRequestRef.current = activeRideRequest;
//   }, [activeRideRequest]);

//   useEffect(() => {
//     loadStoredData();
//   }, []);

//   useEffect(() => {
//     let cleanup: (() => void) | undefined;

//     try {
//       cleanup = onNewRide((ride: any) => {
//         if (isOnlineRef.current && !activeRideRequestRef.current) {
//           setActiveRideRequest({
//             id: ride.id,
//             riderName: ride.riderName || "Rider",
//             pickupAddress: ride.pickupLocation?.address || "Pickup location",
//             dropoffAddress: ride.dropoffLocation?.address || "Dropoff location",
//             pickupLatitude: ride.pickupLocation?.latitude || 0,
//             pickupLongitude: ride.pickupLocation?.longitude || 0,
//             dropoffLatitude: ride.dropoffLocation?.latitude || 0,
//             dropoffLongitude: ride.dropoffLocation?.longitude || 0,
//             estimatedFare: ride.farePrice || 0,
//             distanceKm: ride.distanceKm || 0,
//             durationMinutes: ride.durationMinutes || 0,
//             pickupDistance: 0.5,
//             otp: ride.otp,
//           });
//           setRideState("incoming");
//         }
//       });
//     } catch (err) {
//       console.warn("Socket not available:", err);
//     }

//     return () => {
//       if (cleanup) cleanup();
//     };
//   }, []);

//   const loadStoredData = async () => {
//     try {
//       const [storedProfile, storedTrips, storedOnline] = await Promise.all([
//         AsyncStorage.getItem(DRIVER_PROFILE_KEY),
//         AsyncStorage.getItem(TRIP_HISTORY_KEY),
//         AsyncStorage.getItem(ONLINE_STATUS_KEY),
//       ]);

//       if (storedProfile) {
//         setDriverProfileState(JSON.parse(storedProfile));
//       }

//       if (storedTrips) {
//         setTripHistory(JSON.parse(storedTrips));
//       } else {
//         setTripHistory(SAMPLE_TRIPS);
//         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(SAMPLE_TRIPS));
//       }

//       if (storedOnline === "true") {
//         setIsOnlineState(true);
//       }
//     } catch (error) {
//       console.error("Failed to load driver data:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const setIsOnline = async (online: boolean) => {
//     setIsOnlineState(online);
//     try {
//       await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
//     } catch (error) {
//       console.error("Failed to save online status:", error);
//     }
//   };

//   const setDriverProfile = async (profile: DriverProfile) => {
//     setDriverProfileState(profile);
//     try {
//       await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
//     } catch (error) {
//       console.error("Failed to save driver profile:", error);
//     }
//   };

//   const acceptRide = () => {
//     if (!activeRideRequest) return;
//     setRideState("accepted");

//     try {
//       const socket = getSocket();
//       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "accepted" });
//     } catch (err) {
//       console.warn("Socket emit failed:", err);
//     }
//   };

//   const declineRide = () => {
//     if (activeRideRequest && (rideState === "accepted" || rideState === "at_pickup")) {
//       try {
//         const socket = getSocket();
//         socket.emit("ride:status", { rideId: activeRideRequest.id, status: "cancelled" });
//       } catch (e) {
//         console.warn("Failed to emit cancel:", e);
//       }
//     }
//     setActiveRideRequest(null);
//     setRideState("none");
//   };

//   const arrivedAtPickup = () => {
//     if (!activeRideRequest) return;
//     setRideState("at_pickup");

//     try {
//       const socket = getSocket();
//       socket.emit("ride:status", { rideId: activeRideRequest.id, status: "arrived" });
//     } catch (err) {
//       console.warn("Socket emit failed:", err);
//     }
//   };

//   const startRide = async (rideId: string, otp: string): Promise<boolean> => {
//     if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
//       try {
//         const socket = getSocket();
//         socket.emit("ride:status", { rideId, status: "in_progress" });
//       } catch (err) {
//         console.warn("Socket emit failed:", err);
//       }

//       setRideState("in_progress");
//       return true;
//     }
//     return false;
//   };

//   const completeTrip = async () => {
//     if (activeRideRequest) {
//       const newTrip: Trip = {
//         id: `trip_${Date.now()}`,
//         riderName: activeRideRequest.riderName,
//         pickupAddress: activeRideRequest.pickupAddress,
//         dropoffAddress: activeRideRequest.dropoffAddress,
//         farePrice: activeRideRequest.estimatedFare,
//         distanceKm: activeRideRequest.distanceKm,
//         durationMinutes: Math.round(activeRideRequest.distanceKm * 3),
//         completedAt: new Date().toISOString(),
//         rating: 5,
//       };

//       const newHistory = [newTrip, ...tripHistory];
//       setTripHistory(newHistory);
//       try {
//         await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
//       } catch (err) {
//         console.error("Failed to save trip:", err);
//       }

//       try {
//         const socket = getSocket();
//         socket.emit("ride:status", { rideId: activeRideRequest.id, status: "completed" });
//       } catch (err) {
//         console.warn("Socket emit failed:", err);
//       }
//     }
//     setActiveRideRequest(null);
//     setRideState("none");
//   };

//   const calculateEarnings = (): Earnings => {
//     const now = new Date();
//     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const weekStart = new Date(todayStart);
//     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

//     let today = 0;
//     let thisWeek = 0;
//     let thisMonth = 0;
//     let totalRating = 0;
//     let ratedTrips = 0;

//     tripHistory.forEach((trip) => {
//       const tripDate = new Date(trip.completedAt);

//       if (tripDate >= monthStart) {
//         thisMonth += trip.farePrice;

//         if (tripDate >= weekStart) {
//           thisWeek += trip.farePrice;

//           if (tripDate >= todayStart) {
//             today += trip.farePrice;
//           }
//         }
//       }

//       if (trip.rating) {
//         totalRating += trip.rating;
//         ratedTrips++;
//       }
//     });

//     return {
//       today: Math.round(today * 100) / 100,
//       thisWeek: Math.round(thisWeek * 100) / 100,
//       thisMonth: Math.round(thisMonth * 100) / 100,
//       totalTrips: tripHistory.length,
//       averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 5.0,
//     };
//   };

//   return (
//     <DriverContext.Provider
//       value={{
//         isOnline,
//         setIsOnline,
//         driverProfile,
//         setDriverProfile,
//         tripHistory,
//         earnings: calculateEarnings(),
//         activeRideRequest,
//         rideState,
//         acceptRide,
//         declineRide,
//         arrivedAtPickup,
//         startRide,
//         completeTrip,
//         isLoading,
//       }}
//     >
//       {children}
//     </DriverContext.Provider>
//   );
// }

// export function useDriver() {
//   const context = useContext(DriverContext);
//   if (context === undefined) {
//     throw new Error("useDriver must be used within a DriverProvider");
//   }
//   return context;
// }

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, connectAsDriver, onNewRide, onRideUpdate, onRideExpired } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getApiUrl } from "@/lib/query-client";
import { sendLocalNotification } from "@/hooks/useNotifications";

export interface DriverProfile {
  id?: string;
  vehicleType: "saloon" | "minibus";
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  licensePlate: string;
  isVerified: boolean;
  documentPhvlUrl?: string | null;
  documentPhvlStatus?: string | null;
  documentLogbookUrl?: string | null;
  documentLogbookStatus?: string | null;
  documentInsuranceUrl?: string | null;
  documentInsuranceStatus?: string | null;
  documentInspectionUrl?: string | null;
  documentInspectionStatus?: string | null;
  documentDvlaLicenceUrl?: string | null;
  documentDvlaLicenceStatus?: string | null;
  documentBankStatementUrl?: string | null;
  documentBankStatementStatus?: string | null;
  documentDvlaCheckCodeUrl?: string | null;
  documentDvlaCheckCodeStatus?: string | null;
  documentNationalInsuranceUrl?: string | null;
  documentNationalInsuranceStatus?: string | null;
  documentPhdlUrl?: string | null;
  documentPhdlStatus?: string | null;
  documentProfilePhotoUrl?: string | null;
  documentProfilePhotoStatus?: string | null;
}

export interface Trip {
  id: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  farePrice: number;
  distanceMiles: number;
  durationMinutes: number;
  completedAt: string;
  rating?: number;
  paymentMethod?: string;
}

export interface DriverDeduction {
  id: string;
  driverId: string;
  amount: number;
  type: string;
  reason?: string;
  createdAt: string;
}

export interface Earnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalTrips: number;
  averageRating: number;
}

export interface RideRequest {
  id: string;
  riderName: string;
  riderPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  estimatedFare: number;
  distanceMiles: number;
  durationMinutes: number;
  pickupDistance: number;
  otp?: string;
  paymentMethod?: string;
  walletDeduction?: number;
  expectedCollectAmount?: number;
}

export interface CompletedRidePayment {
  rideId: string;
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  fareAmount: number;
  distanceMiles: number;
  durationMinutes: number;
  completedAt: string;
  paymentMethod?: string;
  amountToCollect?: number;
}

export type DriverRideState = "none" | "incoming" | "accepted" | "at_pickup" | "in_progress";

interface DriverContextType {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  driverProfile: DriverProfile | null;
  setDriverProfile: (profile: DriverProfile) => Promise<void>;
  tripHistory: Trip[];
  driverDeductions: DriverDeduction[];
  earnings: Earnings;
  activeRideRequest: RideRequest | null;
  rideState: DriverRideState;
  rideCancelledByRider: boolean;
  dismissRiderCancellation: () => void;
  completedRidePayment: CompletedRidePayment | null;
  dismissPaymentCollection: (collectedAmount?: number, extraAmount?: number) => void;
  pendingRating: { rideId: string; riderName: string } | null;
  submitDriverRating: (rideId: string, rating: number, comment?: string) => void;
  dismissDriverRating: () => void;
  acceptRide: () => void;
  declineRide: () => void;
  arrivedAtPickup: () => void;
  startRide: (rideId: string, otp: string) => Promise<boolean>;
  completeTrip: () => void;
  noShowRide: () => void;
  agreeToWait: () => void;
  paidWaitingStartedAt: string | null;
  waitingChargePerMin: number;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

const DRIVER_PROFILE_KEY = "@uto_driver_profile";
const TRIP_HISTORY_KEY = "@uto_trip_history";
const ONLINE_STATUS_KEY = "@uto_online_status";

// Trip history is always loaded from AsyncStorage cache + refreshed from Supabase

export function DriverProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnlineState] = useState(false);
  const [driverProfile, setDriverProfileState] = useState<DriverProfile | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);
  const [driverDeductions, setDriverDeductions] = useState<DriverDeduction[]>([]);
  const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
  const [rideState, setRideState] = useState<DriverRideState>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [rideCancelledByRider, setRideCancelledByRider] = useState(false);
  const [completedRidePayment, setCompletedRidePayment] = useState<CompletedRidePayment | null>(null);
  const [paidWaitingStartedAt, setPaidWaitingStartedAt] = useState<string | null>(null);
  const [waitingChargePerMin, setWaitingChargePerMin] = useState(0.50); // default £0.50/min
  const [pendingRating, setPendingRating] = useState<{ rideId: string; riderName: string } | null>(null);

  const isOnlineRef = useRef(isOnline);
  const activeRideRequestRef = useRef(activeRideRequest);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    activeRideRequestRef.current = activeRideRequest;
  }, [activeRideRequest]);

  useEffect(() => {
    if (user) {
      loadStoredData();
    } else {
      // Clear in-memory state when user signs out
      // BUT keep TRIP_HISTORY_KEY in AsyncStorage as cache so earnings
      // display immediately on next login while Supabase fetch is in-flight
      setDriverProfileState(null);
      setTripHistory([]);
      setDriverDeductions([]);
      setIsOnlineState(false);
      AsyncStorage.removeItem(DRIVER_PROFILE_KEY);
      AsyncStorage.removeItem(ONLINE_STATUS_KEY);
      // NOTE: We intentionally do NOT remove TRIP_HISTORY_KEY here.
      // Trip history is cached locally so earnings show instantly on re-login
      // before the Supabase refresh completes.
    }
  }, [user]);

  // ─── Connect to socket & register as driver ───────────────────────────────
  // This runs once on mount and whenever driver id changes.
  // Without connectAsDriver, the server never adds this driver to connectedDrivers
  // so ride requests are never dispatched here.
  useEffect(() => {
    const driverId = driverProfile?.id || user?.id;
    if (!driverId) return;
    try {
      connectAsDriver(driverId);
      console.log('🚗 DriverContext: connectAsDriver called for', driverId);
    } catch (err) {
      console.warn('⚠️ DriverContext: connectAsDriver failed:', err);
    }
  }, [driverProfile?.id, user?.id]);

  // Re-announce driver connection when they go online
  useEffect(() => {
    if (!isOnline) return;
    const driverId = driverProfile?.id || user?.id;
    if (!driverId) return;
    try {
      connectAsDriver(driverId);
      console.log('✅ DriverContext: driver re-announced online:', driverId);
    } catch (err) {
      console.warn('⚠️ DriverContext: reconnect on online toggle failed:', err);
    }
  }, [isOnline]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    try {
      cleanup = onNewRide((ride: any) => {
        console.log('🚕 Driver received new ride request via socket payload:', JSON.stringify(ride, null, 2));

        if (isOnlineRef.current && !activeRideRequestRef.current) {
          setActiveRideRequest({
            id: ride.id,
            riderName: ride.riderName || ride.rider_name || "Rider",
            pickupAddress: ride.pickupAddress || ride.pickup_address || ride.pickupLocation?.address || "Pickup location",
            dropoffAddress: ride.dropoffAddress || ride.dropoff_address || ride.dropoffLocation?.address || "Dropoff location",
            pickupLatitude: ride.pickupLatitude || ride.pickup_latitude || ride.pickupLocation?.latitude || 0,
            pickupLongitude: ride.pickupLongitude || ride.pickup_longitude || ride.pickupLocation?.longitude || 0,
            dropoffLatitude: ride.dropoffLatitude || ride.dropoff_latitude || ride.dropoffLocation?.latitude || 0,
            dropoffLongitude: ride.dropoffLongitude || ride.dropoff_longitude || ride.dropoffLocation?.longitude || 0,
            estimatedFare: ride.estimatedPrice || ride.estimated_price || ride.farePrice || ride.fare_price || 0,
            distanceMiles: ride.distance || ride.distanceMiles || ride.distance_miles || ride.distanceKm || ride.distance_km || 0,
            durationMinutes: ride.estimatedDuration || ride.estimated_duration || ride.durationMinutes || ride.duration_minutes || 0,
            pickupDistance: ride.pickupDistance || 0,  // Real distance from server Haversine calculation
            otp: ride.otp,
            paymentMethod: ride.paymentMethod || "cash",
            walletDeduction: ride.walletDeduction || 0,
            expectedCollectAmount: ride.expectedCollectAmount !== undefined ? ride.expectedCollectAmount : (ride.estimatedPrice || ride.farePrice || 0),
          });
          setRideState("incoming");

          // 🔔 Notify driver of new ride request
          sendLocalNotification(
            "🚕 New Ride Request",
            `${ride.riderName || "A rider"} needs a ride from ${ride.pickupAddress || ride.pickup_address || "nearby"}`,
            { type: "ride_requested", rideId: ride.id }
          );
        }
      });
    } catch (err) {
      console.warn("Socket not available:", err);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Listen for expired ride requests (driver missed the 15-second dispatch window)
  useEffect(() => {
    let cleanupExpired: (() => void) | undefined;
    try {
      cleanupExpired = onRideExpired((data) => {
        const currentRide = activeRideRequestRef.current;
        if (currentRide && currentRide.id === data.rideId) {
          console.log(`⏱️ Ride ${data.rideId} expired because to no response. Clearing screen.`);
          setActiveRideRequest(null);
          setRideState("none");
        }
      });
    } catch (err) {
      console.warn("Socket not available for expired listener:", err);
    }
    return () => {
      if (cleanupExpired) cleanupExpired();
    };
  }, []);

  // Listen for rider-initiated cancellations AND server-side no-show cancellations
  useEffect(() => {
    let cleanupCancel: (() => void) | undefined;
    try {
      cleanupCancel = onRideUpdate((update: any) => {
        if (update.status === "cancelled" || update.status === "cancelled_no_show") {
          const currentRide = activeRideRequestRef.current;
          // Only handle if this cancellation is for OUR active ride
          if (currentRide && (currentRide.id === update.rideId || !update.rideId)) {
            console.log('🚫 Ride cancelled:', update.rideId, 'reason:', update.status);

            // ─── Handle no-show: add earnings + show alert ────────────────────
            if (update.status === "cancelled_no_show") {
              const noShowFare = update.noShowFare || update.earningsAdded || currentRide.estimatedFare || 0;

              if (noShowFare > 0) {
                // Add a trip entry so it appears in earnings calculations
                const noShowTrip: Trip = {
                  id: `noshow_${update.rideId || Date.now()}`,
                  riderName: currentRide.riderName || "Rider",
                  pickupAddress: currentRide.pickupAddress || "Pickup",
                  dropoffAddress: currentRide.dropoffAddress || "Dropoff",
                  farePrice: noShowFare,
                  distanceMiles: currentRide.distanceMiles || 0,
                  durationMinutes: currentRide.durationMinutes || 0,
                  completedAt: new Date().toISOString(),
                };

                setTripHistory((prev) => {
                  const updated = [noShowTrip, ...prev];
                  AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(updated)).catch(console.error);
                  return updated;
                });

                console.log(`✅ No-show trip added to earnings: £${noShowFare}`);
              }

              // Show driver alert about the no-show earnings
              setTimeout(() => {
                Alert.alert(
                  "Ride Cancelled — No Show",
                  `The rider did not show up within 10 minutes. A no-show fee of £${noShowFare > 0 ? noShowFare.toFixed(2) : '0.00'} has been charged and added to your earnings.`,
                  [{ text: "OK" }]
                );
              }, 500);

              // Refresh data from Supabase to sync earnings
              setTimeout(() => {
                refreshData().catch((err: any) => console.warn("⚠️ Post no-show refreshData failed:", err));
              }, 3000);
            } else {
              // Normal rider-initiated cancellation
              setRideCancelledByRider(true);

              // 🔔 Notify driver of cancellation
              sendLocalNotification(
                "❌ Ride Cancelled",
                `${currentRide.riderName || "The rider"} has cancelled the ride.`,
                { type: "ride_cancelled", rideId: update.rideId }
              );
            }

            setActiveRideRequest(null);
            setRideState("none");
          }
        }
      });
    } catch (err) {
      console.warn("Socket not available for cancel listener:", err);
    }
    return () => {
      if (cleanupCancel) cleanupCancel();
    };
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedProfile, storedTrips, storedOnline] = await Promise.all([
        AsyncStorage.getItem(DRIVER_PROFILE_KEY),
        AsyncStorage.getItem(TRIP_HISTORY_KEY),
        AsyncStorage.getItem(ONLINE_STATUS_KEY),
      ]);

      if (storedProfile) {
        setDriverProfileState(JSON.parse(storedProfile));
      }

      if (storedTrips) {
        const parsed = JSON.parse(storedTrips);
        if (parsed.length > 0) {
          setTripHistory(parsed);
          console.log('✅ Loaded', parsed.length, 'cached trips from AsyncStorage');
        }
      }

      if (storedOnline === "true") {
        setIsOnlineState(true);
      }
    } catch (error) {
      console.error("Failed to load driver data:", error);
    } finally {
      setIsLoading(false);
    }

    // Always refresh from Supabase (source of truth) after loading cache
    // This ensures earnings are always accurate even if local cache is stale
    try {
      await refreshData();
    } catch (err) {
      console.warn('⚠️ Post-load refreshData failed:', err);
    }
  };

  const refreshData = async () => {
    if (!user?.id) return;
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/drivers/user/${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const driver = data.driver;
      if (!driver) return;
      const profile: DriverProfile = {
        id: driver.id,
        vehicleType: (driver.vehicleType as DriverProfile["vehicleType"]) || "saloon",
        vehicleMake: driver.vehicleMake || "",
        vehicleModel: driver.vehicleModel || "",
        vehicleYear: driver.vehicleYear || new Date().getFullYear(),
        vehicleColor: driver.vehicleColor || "",
        licensePlate: driver.licensePlate || "",
        isVerified: driver.isVerified || false,
        documentPhvlUrl: driver.documentPhvlUrl,
        documentPhvlStatus: driver.documentPhvlStatus,
        documentLogbookUrl: driver.documentLogbookUrl,
        documentLogbookStatus: driver.documentLogbookStatus,
        documentInsuranceUrl: driver.documentInsuranceUrl,
        documentInsuranceStatus: driver.documentInsuranceStatus,
        documentInspectionUrl: driver.documentInspectionUrl,
        documentInspectionStatus: driver.documentInspectionStatus,
        documentDvlaLicenceUrl: driver.documentDvlaLicenceUrl,
        documentDvlaLicenceStatus: driver.documentDvlaLicenceStatus,
        documentBankStatementUrl: driver.documentBankStatementUrl,
        documentBankStatementStatus: driver.documentBankStatementStatus,
        documentDvlaCheckCodeUrl: driver.documentDvlaCheckCodeUrl,
        documentDvlaCheckCodeStatus: driver.documentDvlaCheckCodeStatus,
        documentNationalInsuranceUrl: driver.documentNationalInsuranceUrl,
        documentNationalInsuranceStatus: driver.documentNationalInsuranceStatus,
        documentPhdlUrl: driver.documentPhdlUrl,
        documentPhdlStatus: driver.documentPhdlStatus,
        documentProfilePhotoUrl: driver.documentProfilePhotoUrl,
        documentProfilePhotoStatus: driver.documentProfilePhotoStatus,
      };
      setDriverProfileState(profile);
      await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
      console.log("✅ Driver profile synced from Supabase:", profile.vehicleMake, profile.vehicleModel);

      // ── FETCH TRIPS FROM SUPABASE ──
      try {
        const rides = await api.rides.getByDriver(driver.id);
        if (rides && rides.length > 0) {
          const completedRides = rides.filter((r: any) => 
            r.status === 'completed' || 
            (r.status === 'cancelled' && (r.paymentStatus === 'no_show_card_charged' || r.paymentStatus === 'no_show_wallet_charged' || r.paymentStatus === 'no_show_fee')) || 
            r.status === 'payment_collected'
          );
          const serverTrips: Trip[] = completedRides.map((r: any) => ({
            id: r.id,
            riderName: "Rider",
            pickupAddress: r.pickupAddress,
            dropoffAddress: r.dropoffAddress,
            farePrice: typeof r.finalPrice === 'number' && r.finalPrice > 0 ? r.finalPrice : (r.estimatedPrice || 0),
            distanceMiles: r.distance || 0,
            durationMinutes: r.estimatedDuration || 0,
            completedAt: r.completedAt || r.requestedAt || new Date().toISOString(),
            rating: r.driverRating || undefined,
          }));
          setTripHistory(serverTrips);
          await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(serverTrips));
          console.log("✅ Driver trips synced from Supabase count:", serverTrips.length);
        }
      } catch (tripErr) {
        console.warn("⚠️ Could not sync trips from Supabase:", tripErr);
      }

      // ── FETCH DEDUCTIONS FROM SUPABASE ──
      try {
        const d = await api.drivers.getDeductions(driver.id);
        setDriverDeductions(d);
        console.log("✅ Driver deductions synced from Supabase count:", d.length);
      } catch (deductionErr) {
        console.warn("⚠️ Could not sync deductions from Supabase:", deductionErr);
      }

    } catch (err) {
      console.warn("⚠️ Could not sync driver profile from Supabase:", err);
    }
  };

  // Note: refreshData() is now called inside loadStoredData() after loading cache,
  // so we don't need a separate effect here. This avoids the race condition where
  // refreshData would run before loadStoredData finished.
  // The loadStoredData effect (triggered by user change) handles both.

  const setIsOnline = async (online: boolean) => {
    setIsOnlineState(online);
    try {
      await AsyncStorage.setItem(ONLINE_STATUS_KEY, online.toString());
    } catch (error) {
      console.error("Failed to save online status:", error);
    }
  };

  const setDriverProfile = async (profile: DriverProfile) => {
    setDriverProfileState(profile);
    try {
      // Save to local AsyncStorage
      await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));

      // Also persist to Supabase via API
      if (user?.id) {
        try {
          const baseUrl = getApiUrl();
          // First get the driver record id from Supabase
          const res = await fetch(`${baseUrl}/api/drivers/user/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            const driverId = data.driver?.id;
            if (driverId) {
              // Update vehicle details in Supabase
              await fetch(`${baseUrl}/api/drivers/${driverId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vehicleMake: profile.vehicleMake,
                  vehicleModel: profile.vehicleModel,
                  vehicleType: profile.vehicleType,
                  licensePlate: profile.licensePlate,
                  vehicleYear: profile.vehicleYear,
                  vehicleColor: profile.vehicleColor,
                  documentPhvlUrl: profile.documentPhvlUrl,
                  documentPhvlStatus: profile.documentPhvlStatus,
                  documentLogbookUrl: profile.documentLogbookUrl,
                  documentLogbookStatus: profile.documentLogbookStatus,
                  documentInsuranceUrl: profile.documentInsuranceUrl,
                  documentInsuranceStatus: profile.documentInsuranceStatus,
                  documentInspectionUrl: profile.documentInspectionUrl,
                  documentInspectionStatus: profile.documentInspectionStatus,
                  documentDvlaLicenceUrl: profile.documentDvlaLicenceUrl,
                  documentDvlaLicenceStatus: profile.documentDvlaLicenceStatus,
                  documentBankStatementUrl: profile.documentBankStatementUrl,
                  documentBankStatementStatus: profile.documentBankStatementStatus,
                  documentDvlaCheckCodeUrl: profile.documentDvlaCheckCodeUrl,
                  documentDvlaCheckCodeStatus: profile.documentDvlaCheckCodeStatus,
                  documentNationalInsuranceUrl: profile.documentNationalInsuranceUrl,
                  documentNationalInsuranceStatus: profile.documentNationalInsuranceStatus,
                  documentPhdlUrl: profile.documentPhdlUrl,
                  documentPhdlStatus: profile.documentPhdlStatus,
                  documentProfilePhotoUrl: profile.documentProfilePhotoUrl,
                  documentProfilePhotoStatus: profile.documentProfilePhotoStatus,
                }),
              });
              console.log('✅ Driver profile saved to Supabase');
            }
          } else {
            console.warn('⚠️ Could not fetch driver record from Supabase to update vehicle info');
          }
        } catch (apiErr) {
          console.warn('⚠️ Failed to sync driver profile to Supabase:', apiErr);
        }
      }
    } catch (error) {
      console.error("Failed to save driver profile:", error);
    }
  };

  const acceptRide = () => {
    if (!activeRideRequest) return;
    setRideState("accepted");

    const driverId = driverProfile?.id || user?.id || "";

    try {
      const socket = getSocket();
      // Build the driver's vehicle string from their stored profile
      const vehicleInfo = driverProfile
        ? `${driverProfile.vehicleMake} ${driverProfile.vehicleModel}`.trim()
        : "Unknown Vehicle";
      const licensePlate = driverProfile?.licensePlate || "";
      const driverName = user?.fullName || "Driver";
      const driverRating = user?.rating || 4.8;

      // Emit ride:accept first — this is the reliable path that explicitly includes driverId
      socket.emit("ride:accept", {
        rideId: activeRideRequest.id,
        driverId,
      });

      // Also emit ride:status with driverId included for real-time UI updates
      socket.emit("ride:status", {
        rideId: activeRideRequest.id,
        status: "accepted",
        driverId,
        driverInfo: {
          driverName,
          vehicleInfo,
          licensePlate,
          driverRating,
        },
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }
  };

  const declineRide = () => {
    if (activeRideRequest) {
      if (rideState === "accepted" || rideState === "at_pickup") {
        try {
          const socket = getSocket();
          socket.emit("ride:status", { rideId: activeRideRequest.id, status: "cancelled", driverId: driverProfile?.id || user?.id || undefined });
        } catch (e) {
          console.warn("Failed to emit cancel:", e);
        }
      } else if (rideState === "incoming") {
        try {
          const socket = getSocket();
          socket.emit("ride:declined", {
            rideId: activeRideRequest.id,
            rideData: activeRideRequest,
            driverId: driverProfile?.id || user?.id || undefined,
          });
        } catch (e) {
          console.warn("Failed to emit declined:", e);
        }
      }
    }
    setActiveRideRequest(null);
    setRideState("none");
  };

  const arrivedAtPickup = () => {
    if (!activeRideRequest) return;
    setRideState("at_pickup");
    setPaidWaitingStartedAt(null); // Reset paid waiting

    try {
      const socket = getSocket();
      socket.emit("ride:status", { rideId: activeRideRequest.id, status: "arrived", driverId: driverProfile?.id || user?.id || undefined });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }

    // Fetch waiting charge rate from pricing rules
    (async () => {
      try {
        const { api } = await import('@/lib/api');
        const rules = await api.pricingRules.getActive();
        const vehiclePricing = rules?.vehicles || rules?.pricing;
        const rideType = (activeRideRequest as any)?.rideType || 'saloon';
        const formattedType = rideType.charAt(0).toUpperCase() + rideType.slice(1);
        const waitPrice = parseFloat(vehiclePricing?.[formattedType]?.waiting_price || '0.50');
        setWaitingChargePerMin(waitPrice > 0 ? waitPrice : 0.50);
        console.log(`⏱️ Waiting charge rate: £${waitPrice}/min`);
      } catch (e) {
        console.warn('Could not fetch waiting price, using default £0.50/min');
        setWaitingChargePerMin(0.50);
      }
    })();
  };

  // Driver-initiated No Show (after 10 min free waiting)
  const noShowRide = () => {
    if (!activeRideRequest) return;
    console.log('🚫 Driver initiated No Show for ride:', activeRideRequest.id);

    try {
      const socket = getSocket();
      socket.emit("ride:no_show", {
        rideId: activeRideRequest.id,
        driverId: driverProfile?.id || user?.id || undefined,
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }
    // The server will handle the cancellation + charging
    // and emit cancelled_no_show back which our existing listener handles
  };

  // Driver agrees to continue waiting (paid waiting starts)
  const agreeToWait = () => {
    if (!activeRideRequest) return;
    const now = new Date().toISOString();
    setPaidWaitingStartedAt(now);
    console.log(`⏱️💰 Paid waiting started at ${now} for ride ${activeRideRequest.id}`);

    try {
      const socket = getSocket();
      socket.emit("ride:agree_to_wait", {
        rideId: activeRideRequest.id,
        driverId: driverProfile?.id || user?.id || undefined,
        paidWaitingStartedAt: now,
        waitingChargePerMin,
      });
    } catch (err) {
      console.warn("Socket emit failed:", err);
    }
  };

  const startRide = async (rideId: string, otp: string): Promise<boolean> => {
    if (activeRideRequest && activeRideRequest.otp && activeRideRequest.otp === otp) {
      try {
        const socket = getSocket();
        socket.emit("ride:status", { rideId, status: "in_progress", driverId: driverProfile?.id || user?.id || undefined });
      } catch (err) {
        console.warn("Socket emit failed:", err);
      }

      setRideState("in_progress");
      return true;
    }
    return false;
  };

  const completeTrip = async () => {
    if (activeRideRequest) {
      const completedAt = new Date().toISOString();

      // Calculate waiting charge if paid waiting was active
      let waitingCharge = 0;
      if (paidWaitingStartedAt) {
        const paidWaitingMs = Date.now() - new Date(paidWaitingStartedAt).getTime();
        const paidWaitingMin = Math.max(0, Math.floor(paidWaitingMs / 60000));
        waitingCharge = Math.round(paidWaitingMin * waitingChargePerMin * 100) / 100;
        console.log(`⏱️💰 Paid waiting: ${paidWaitingMin} mins × £${waitingChargePerMin} = £${waitingCharge}`);
      }

      const totalFare = Math.round((activeRideRequest.estimatedFare + waitingCharge) * 100) / 100;

      const newTrip: Trip = {
        id: `trip_${Date.now()}`,
        riderName: activeRideRequest.riderName,
        pickupAddress: activeRideRequest.pickupAddress,
        dropoffAddress: activeRideRequest.dropoffAddress,
        farePrice: totalFare,
        distanceMiles: activeRideRequest.distanceMiles,
        durationMinutes: activeRideRequest.durationMinutes,
        completedAt,
        rating: 5,
      };

      const newHistory = [newTrip, ...tripHistory];
      setTripHistory(newHistory);
      try {
        await AsyncStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(newHistory));
      } catch (err) {
        console.error("Failed to save trip:", err);
      }

      try {
        const socket = getSocket();
        socket.emit("ride:status", {
          rideId: activeRideRequest.id,
          status: "completed",
          driverId: driverProfile?.id || user?.id || undefined,
          waitingCharge,
          totalFare,
        });
      } catch (err) {
        console.warn("Socket emit failed:", err);
      }

      // Calculate amount to collect (including waiting charge)
      const baseCollect = activeRideRequest.expectedCollectAmount !== undefined ? activeRideRequest.expectedCollectAmount : activeRideRequest.estimatedFare;
      const amountToCollect = Math.round((baseCollect + waitingCharge) * 100) / 100;

      // Show the payment collection screen to the driver
      setCompletedRidePayment({
        rideId: activeRideRequest.id,
        riderName: activeRideRequest.riderName,
        pickupAddress: activeRideRequest.pickupAddress,
        dropoffAddress: activeRideRequest.dropoffAddress,
        fareAmount: totalFare,
        distanceMiles: activeRideRequest.distanceMiles,
        durationMinutes: activeRideRequest.durationMinutes,
        completedAt,
        paymentMethod: activeRideRequest.paymentMethod || 'cash',
        amountToCollect,
      });

      // 🔔 Notify driver of ride completion
      sendLocalNotification(
        "✅ Trip Completed",
        `Trip with ${activeRideRequest.riderName} completed. Fare: £${totalFare.toFixed(2)}${waitingCharge > 0 ? ` (incl. £${waitingCharge.toFixed(2)} waiting)` : ''}`,
        { type: "ride_completed", rideId: activeRideRequest.id }
      );
    }
    setPaidWaitingStartedAt(null);
    setActiveRideRequest(null);
    setRideState("none");
  };

  const dismissPaymentCollection = (collectedAmount?: number, extraAmount?: number) => {
    // Notify server that payment has been collected
    console.log('💰 ═══════════ CLIENT: dismissPaymentCollection ═══════════');
    console.log('💰 collectedAmount:', collectedAmount, 'extraAmount:', extraAmount);
    console.log('💰 completedRidePayment:', JSON.stringify(completedRidePayment));
    
    if (completedRidePayment?.rideId) {
      try {
        const socket = getSocket();
        const payload = {
          rideId: completedRidePayment.rideId,
          amount: collectedAmount ?? completedRidePayment.fareAmount,
          extraAmount: extraAmount || 0,
        };
        console.log('💰 Emitting ride:payment_collected with payload:', JSON.stringify(payload));
        socket.emit("ride:payment_collected", payload);
        console.log('💰 ✅ Socket emit successful');
      } catch (err) {
        console.warn("Socket emit for payment collected failed:", err);
      }
    } else {
      console.warn('💰 ⚠️ No completedRidePayment.rideId — NOT emitting socket event');
    }
    setCompletedRidePayment(null);

    // Trigger rating prompt after payment is collected
    // Use a short delay to allow the payment modal to fully dismiss
    const rideId = completedRidePayment?.rideId;
    const riderName = completedRidePayment?.riderName;
    if (rideId && riderName) {
      setTimeout(() => {
        setPendingRating({ rideId, riderName });
      }, 800);
    }

    // Refresh trip data from Supabase so earnings display updates
    setTimeout(() => {
      console.log('💰 Triggering post-payment refreshData...');
      refreshData().catch((err) => console.warn("⚠️ Post-payment refreshData failed:", err));
    }, 2000); // Increased delay to 2s to let server process
  };

  const calculateEarnings = (): Earnings => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let totalRating = 0;
    let ratedTrips = 0;

    tripHistory.forEach((trip) => {
      const tripDate = new Date(trip.completedAt);

      if (tripDate >= monthStart) {
        thisMonth += trip.farePrice;

        if (tripDate >= weekStart) {
          thisWeek += trip.farePrice;

          if (tripDate >= todayStart) {
            today += trip.farePrice;
          }
        }
      }

      if (trip.rating) {
        totalRating += trip.rating;
        ratedTrips++;
      }
    });

    driverDeductions.forEach((deduction) => {
      const deductionDate = new Date(deduction.createdAt);

      if (deductionDate >= monthStart) {
        thisMonth -= deduction.amount;

        if (deductionDate >= weekStart) {
          thisWeek -= deduction.amount;

          if (deductionDate >= todayStart) {
            today -= deduction.amount;
          }
        }
      }
    });

    return {
      today: Math.round(today * 100) / 100,
      thisWeek: Math.round(thisWeek * 100) / 100,
      thisMonth: Math.round(thisMonth * 100) / 100,
      totalTrips: tripHistory.length,
      averageRating: ratedTrips > 0 ? Math.round((totalRating / ratedTrips) * 10) / 10 : 0.0,
    };
  };

  const submitDriverRating = async (rideId: string, rating: number, comment?: string) => {
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/rides/${rideId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderRating: rating,
          riderComment: comment,
          ratedBy: "driver",
        }),
      });
      console.log(`⭐ Driver submitted rating ${rating} for ride ${rideId}`);
    } catch (err) {
      console.warn("Failed to submit driver rating:", err);
    }
    setPendingRating(null);
  };

  const dismissDriverRating = () => {
    setPendingRating(null);
  };

  return (
    <DriverContext.Provider
      value={{
        isOnline,
        setIsOnline,
        driverProfile,
        setDriverProfile,
        tripHistory,
        driverDeductions,
        earnings: calculateEarnings(),
        activeRideRequest,
        rideState,
        rideCancelledByRider,
        dismissRiderCancellation: () => setRideCancelledByRider(false),
        completedRidePayment,
        dismissPaymentCollection,
        pendingRating,
        submitDriverRating,
        dismissDriverRating,
        acceptRide,
        declineRide,
        arrivedAtPickup,
        startRide,
        completeTrip,
        noShowRide,
        agreeToWait,
        paidWaitingStartedAt,
        waitingChargePerMin,
        refreshData,
        isLoading,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error("useDriver must be used within a DriverProvider");
  }
  return context;
}

