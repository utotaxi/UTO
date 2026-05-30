
//client/lib/backgroundLocation.ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';
import { getApiUrl } from './query-client';
import { getSocket } from './socket';

const LOCATION_TASK_NAME = 'driver-background-location-task';

export async function defineBackgroundLocationTask() {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.error('❌ Background task error:', error);
      return;
    }

    if (data) {
      const { locations } = data;
      if (!locations || locations.length === 0) return;

      const location = locations[0];
      const payload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      try {
        // Send location via API (background-safe)
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/driver/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.warn('⚠️ Location update failed:', response.status);
        } else {
          console.log('📍 Background location sent:', payload);
        }
      } catch (error) {
        console.error('🔴 Failed to send background location:', error);
      }
    }
  });
}

export async function startBackgroundLocationTracking() {
  try {
    // Request foreground permission
    const { status: fgStatus } = 
      await Location.requestForegroundPermissionsAsync();
    
    if (fgStatus !== 'granted') {
      console.warn('⚠️ Foreground location permission denied');
      return false;
    }

    // Request background permission
    const { status: bgStatus } = 
      await Location.requestBackgroundPermissionsAsync();
    
    if (bgStatus !== 'granted') {
      console.warn('⚠️ Background location permission denied');
      return false;
    }

    // Check if already running
    const isStarted = 
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    
    if (isStarted) {
      console.log('✅ Background location already tracking');
      return true;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,        // Every 5 seconds
      distanceInterval: 5,       // Or when moved 5 meters
      foregroundService: {
        notificationTitle: 'UTO - Tracking in Progress',
        notificationBody: 'Location updates in background',
        notificationColor: '#FFD000',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      deferredUpdatesDistance: 100,
      deferredUpdatesInterval: 1000,
    });

    console.log('✅ Background location tracking started');
    return true;
  } catch (error) {
    console.error('🔴 Failed to start background location:', error);
    return false;
  }
}

export async function stopBackgroundLocationTracking() {
  try {
    const isStarted = 
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('⏸️ Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

export function setupAppStateListener() {
  let appStateSubscription: any = null;
  
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const socket = getSocket();
    
    console.log(`📱 App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // App came to foreground
      console.log('✅ App active - reconnecting socket and resuming foreground tracking');
      
      if (!socket.connected) {
        socket.connect();
      }
    } else if (nextAppState === 'background') {
      console.log('⏻️ App backgrounded - keeping socket alive, background task running');
      // Don't disconnect - let background task handle location
      // Socket should remain connected
    }
  };
  
  appStateSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange
  );
  
  return () => appStateSubscription?.remove();
}