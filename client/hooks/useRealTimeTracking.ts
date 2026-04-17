import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import {
  getSocket,
  connectAsDriver,
  connectAsRider,
  updateDriverLocation,
  onDriverLocation,
  onRideUpdate,
  DriverLocation,
  RideUpdate,
} from "@/lib/socket";

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

  useEffect(() => {
    connectAsRider(riderId);

    const unsubLocation = onDriverLocation((location) => {
      setDriverLocation(location);
    });

    const unsubRide = onRideUpdate((update) => {
      if (update.rideId === rideId) {
        setRideStatus(update.status);
        if (update.driverLocation) {
          setDriverLocation(update.driverLocation);
        }
      }
    });

    return () => {
      unsubLocation();
      unsubRide();
    };
  }, [riderId, rideId]);

  return { driverLocation, rideStatus };
}
