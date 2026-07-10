// import { useState, useEffect, useCallback, useRef } from "react";
// import * as Location from "expo-location";
// import { Platform } from "react-native";
// import {
//   getSocket,
//   connectAsDriver,
//   connectAsRider,
//   requestRideDriverLocation,
//   updateDriverLocation,
//   onDriverLocation,
//   onRideAccepted,
//   onRideUpdate,
//   DriverLocation,
//   RideUpdate,
// } from "@/lib/socket";
// import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from "@/lib/backgroundLocation";

// interface UseDriverTrackingOptions {
//   driverId: string;
//   isOnline: boolean;
//   updateInterval?: number;
// }

// export function useDriverTracking({ driverId, isOnline, updateInterval = 5000 }: UseDriverTrackingOptions) {
//   const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const locationSubscription = useRef<Location.LocationSubscription | null>(null);

//   useEffect(() => {
//     if (!isOnline) {
//       stopBackgroundLocationTracking();
//       if (locationSubscription.current) {
//         locationSubscription.current.remove();
//         locationSubscription.current = null;
//       }
//       return;
//     }

//     const startTracking = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           setError("Location permission denied");
//           return;
//         }

//         connectAsDriver(driverId);

//         // Start background task
//         await startBackgroundLocationTracking();

//         const location = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });
//         setCurrentLocation(location);

//         updateDriverLocation({
//           driverId,
//           latitude: location.coords.latitude,
//           longitude: location.coords.longitude,
//           heading: location.coords.heading ?? undefined,
//           speed: location.coords.speed ?? undefined,
//         });

//         locationSubscription.current = await Location.watchPositionAsync(
//           {
//             accuracy: Location.Accuracy.High,
//             timeInterval: updateInterval,
//             distanceInterval: 10,
//           },
//           (location) => {
//             setCurrentLocation(location);
//             updateDriverLocation({
//               driverId,
//               latitude: location.coords.latitude,
//               longitude: location.coords.longitude,
//               heading: location.coords.heading ?? undefined,
//               speed: location.coords.speed ?? undefined,
//             });
//           }
//         );
//       } catch (err) {
//         setError("Failed to start location tracking");
//         console.error("Location tracking error:", err);
//       }
//     };

//     startTracking();

//     return () => {
//       stopBackgroundLocationTracking();
//       if (locationSubscription.current) {
//         locationSubscription.current.remove();
//         locationSubscription.current = null;
//       }
//     };
//   }, [driverId, isOnline, updateInterval]);

//   return { currentLocation, error };
// }

// interface UseRiderTrackingOptions {
//   riderId: string;
//   rideId?: string;
// }

// export function useRiderTracking({ riderId, rideId }: UseRiderTrackingOptions) {
//   const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
//   const [rideStatus, setRideStatus] = useState<string | null>(null);

//   useEffect(() => {
//     if (!riderId) return;
//     connectAsRider(riderId);
//     if (rideId) {
//       requestRideDriverLocation(riderId, rideId);
//     }

//     const locationRefresh = rideId
//       ? setInterval(() => {
//         requestRideDriverLocation(riderId, rideId);
//       }, 5000)
//       : null;

//     const unsubLocation = onDriverLocation((location) => {
//       if (!rideId || !location.rideId || location.rideId === rideId) {
//         setDriverLocation(location);
//       }
//     });

//     const unsubAccepted = onRideAccepted((data) => {
//       if (data.rideId === rideId) {
//         setRideStatus("accepted");
//         if (data.driverLocation) {
//           setDriverLocation(data.driverLocation);
//         }
//       }
//     });

//     const unsubRide = onRideUpdate((update) => {
//       if (update.rideId === rideId) {
//         setRideStatus(update.status);
//         if (update.driverLocation) {
//           setDriverLocation(update.driverLocation);
//         }
//       }
//     });

//     return () => {
//       if (locationRefresh) clearInterval(locationRefresh);
//       if (typeof unsubLocation === 'function') unsubLocation();
//       if (typeof unsubAccepted === 'function') unsubAccepted();
//       if (typeof unsubRide === 'function') unsubRide();
//     };
//   }, [riderId, rideId]);

//   return { driverLocation, rideStatus };
// }

//client/hooks/useRealTimeTracking.ts
import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import {
  getSocket,
  connectAsDriver,
  connectAsRider,
  requestRideDriverLocation,
  updateDriverLocation,
  onDriverLocation,
  onRideAccepted,
  onRideUpdate,
  DriverLocation,
  RideUpdate,
} from "@/lib/socket";
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from "@/lib/backgroundLocation";

interface UseDriverTrackingOptions {
  driverId: string;
  isOnline: boolean;
  updateInterval?: number;
}

export function useDriverTracking({ driverId, isOnline, updateInterval = 5000 }: UseDriverTrackingOptions) {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isOnline) {
      stopBackgroundLocationTracking();
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      return;
    }

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied");
          return;
        }

        connectAsDriver(driverId);

        // Start background task (persist driverId for background API posts)
        await startBackgroundLocationTracking(driverId);

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location);

        updateDriverLocation({
          driverId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading ?? undefined,
          speed: location.coords.speed ?? undefined,
        });

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: updateInterval,
            distanceInterval: 10,
          },
          (location) => {
            setCurrentLocation(location);
            updateDriverLocation({
              driverId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              heading: location.coords.heading ?? undefined,
              speed: location.coords.speed ?? undefined,
            });
          }
        );
      } catch (err) {
        setError("Failed to start location tracking");
        console.error("Location tracking error:", err);
      }
    };

    startTracking();

    return () => {
      stopBackgroundLocationTracking();
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [driverId, isOnline, updateInterval]);

  return { currentLocation, error };
}

interface UseRiderTrackingOptions {
  riderId: string;
  rideId?: string;
}

export function useRiderTracking({ riderId, rideId }: UseRiderTrackingOptions) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const rideIdRef = useRef<string | undefined>(rideId);

  useEffect(() => {
    if (rideId) {
      rideIdRef.current = rideId;
    }
  }, [rideId]);

  useEffect(() => {
    if (!riderId) return;
    connectAsRider(riderId);

    const currentRideId = rideIdRef.current;
    if (currentRideId) {
      requestRideDriverLocation(riderId, currentRideId);
    }

    const locationRefresh = setInterval(() => {
      const activeRideId = rideIdRef.current;
      if (activeRideId) {
        requestRideDriverLocation(riderId, activeRideId);
      }
    }, 5000);

    const unsubLocation = onDriverLocation((location) => {
      const activeRideId = rideIdRef.current;
      if (!activeRideId || !location.rideId || location.rideId === activeRideId) {
        setDriverLocation(location);
      }
    });

    const unsubAccepted = onRideAccepted((data) => {
      const activeRideId = rideIdRef.current;
      if (!activeRideId || data.rideId === activeRideId) {
        setRideStatus("accepted");
        if (data.driverLocation) {
          setDriverLocation(data.driverLocation);
        }
      }
    });

    const unsubRide = onRideUpdate((update) => {
      const activeRideId = rideIdRef.current;
      if (!activeRideId || update.rideId === activeRideId) {
        setRideStatus(update.status);
        if (update.driverLocation) {
          setDriverLocation(update.driverLocation);
        }
      }
    });

    return () => {
      clearInterval(locationRefresh);
      if (typeof unsubLocation === 'function') unsubLocation();
      if (typeof unsubAccepted === 'function') unsubAccepted();
      if (typeof unsubRide === 'function') unsubRide();
    };
  }, [riderId]);

  return { driverLocation, rideStatus };
}

