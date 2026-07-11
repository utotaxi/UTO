//client/lib/backgroundLocation.ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from './query-client';
import { getSocket } from './socket';

const LOCATION_TASK_NAME = 'driver-background-location-task';
const BG_DRIVER_ID_KEY = '@uto_bg_driver_id';
const BG_NOTIFIED_ASSIGNED_KEY = '@uto_bg_notified_assigned';

export async function setBackgroundDriverId(driverId: string | null) {
  try {
    if (driverId) {
      await AsyncStorage.setItem(BG_DRIVER_ID_KEY, driverId);
    } else {
      await AsyncStorage.removeItem(BG_DRIVER_ID_KEY);
    }
  } catch (err) {
    console.warn('⚠️ Failed to persist background driver id:', err);
  }
}

export async function getBackgroundDriverId(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(BG_DRIVER_ID_KEY)) || null;
  } catch {
    return null;
  }
}

async function maybeNotifyPendingAssigned(pending: any) {
  if (!pending?.id) return;
  // Only fire local alerts when the app is not in the foreground —
  // foreground already gets socket + local notifications from DriverContext.
  if (AppState.currentState === 'active') return;

  try {
    const { claimNotification } = await import('./notificationDedupe');
    const dedupeKey = `scheduled_booking_assigned:${pending.id}`;
    if (!claimNotification(dedupeKey)) return;

    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('uto-scheduled-v2', {
        name: 'Scheduled Bookings',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180],
        lightColor: '#F7C948',
        sound: 'default',
      });
    }

    const pickup = pending.pickup_address || 'pickup';
    const fare = Number(pending.driver_fare ?? pending.estimated_fare ?? 0);
    const fareLabel = fare > 0 ? ` — £${fare.toFixed(2)}` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Ride Assigned To You',
        body: `Ride ${pending.id} (${pickup})${fareLabel}. Open Upcoming to Accept or Decline.`,
        data: {
          type: 'scheduled_booking_assigned',
          bookingId: String(pending.id),
          rideId: String(pending.id),
          sourceTable: pending.source_table || null,
          audience: 'driver',
          target: 'UpcomingBookings',
          screen: 'UpcomingBookings',
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'uto-scheduled-v2' } : {}),
      },
      trigger: null,
    });

    await AsyncStorage.setItem(BG_NOTIFIED_ASSIGNED_KEY, String(pending.id));
    console.log('📢 Background local notification for assigned booking', pending.id);
  } catch (err) {
    console.warn('⚠️ Background assigned-booking notification failed:', err);
  }
}

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
      const driverId = await getBackgroundDriverId();
      if (!driverId) {
        console.warn('⚠️ Background location update skipped — no driverId stored');
        return;
      }

      const payload = {
        driverId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      try {
        // Send location via API (background-safe) so dispatch still has a fresh position
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/driver/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.warn('⚠️ Location update failed:', response.status);
        } else {
          console.log('📍 Background location sent for', driverId);
          // Belt-and-suspenders: if Expo push was missed while backgrounded,
          // surface the pending assignment from the location heartbeat response.
          try {
            const body = await response.json();
            if (body?.pendingAssignedBooking) {
              await maybeNotifyPendingAssigned(body.pendingAssignedBooking);
            }
            // Do not clear dedupe when empty — prevents re-flood if the query
            // briefly returns null between heartbeats.
          } catch {
            // Non-critical — location update already succeeded
          }
        }
      } catch (sendErr) {
        console.error('🔴 Failed to send background location:', sendErr);
      }
    }
  });
}

export async function startBackgroundLocationTracking(driverId?: string) {
  try {
    if (driverId) {
      await setBackgroundDriverId(driverId);
    }

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
        notificationTitle: 'UTO Driver — Online',
        notificationBody: 'Receiving ride requests while online',
        notificationColor: '#FFD000',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      deferredUpdatesDistance: 50,
      deferredUpdatesInterval: 5000,
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
    await setBackgroundDriverId(null);
    await AsyncStorage.removeItem(BG_NOTIFIED_ASSIGNED_KEY);
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
      console.log('✅ App active - reconnecting socket and resuming foreground tracking');

      if (!socket.connected) {
        socket.connect();
      }
    } else if (nextAppState === 'background') {
      console.log('⏻️ App backgrounded - keeping socket alive, background task running');
      // Don't disconnect - let background task handle location
    }
  };

  appStateSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange
  );

  return () => appStateSubscription?.remove();
}
