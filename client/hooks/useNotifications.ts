import { useState, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { getApiUrl } from "@/lib/query-client";
import * as Notifications from "expo-notifications";
import { navigateFromNotification } from "@/navigation/navigationRef";
import { emitRideRequestNotification } from "@/lib/rideNotificationBridge";
import {
  claimNotification,
  notificationDedupeKey,
  wasNotificationClaimed,
} from "@/lib/notificationDedupe";

/** Updated by ModeProvider consumers so push banners respect rider vs driver mode. */
let activeAppMode: "rider" | "driver" = "rider";

export function setNotificationAppMode(mode: "rider" | "driver") {
  activeAppMode = mode;
}

function audienceAllowed(data: Record<string, any> | undefined): boolean {
  const audience = String(data?.audience || "").toLowerCase();
  if (!audience) return true;
  if (audience === "driver") return activeAppMode === "driver";
  if (audience === "rider") return activeAppMode === "rider";
  return true;
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = (notification?.request?.content?.data || {}) as Record<string, any>;

      // Only suppress cross-role banners while the app is actively open in the
      // other mode. Background / killed delivery must still show so offline
      // drivers get marketplace + assignment pushes.
      if (!audienceAllowed(data) && AppState.currentState === "active") {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }

      const key = notificationDedupeKey(data);
      // If we already alerted for this event (socket/local/push), suppress repeats.
      if (key && wasNotificationClaimed(key)) {
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
      if (key) claimNotification(key);

      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
} catch (error) {
  console.log("expo-notifications not available");
}

function isNotificationData(data: unknown): data is NotificationData {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as any).type === "string"
  );
}

export interface NotificationData {
  type:
    | "ride_requested"
    | "ride_accepted"
    | "driver_arriving"
    | "ride_started"
    | "ride_completed"
    | "ride_cancelled"
    | "payment_collected"
    | "no_show"
    | "ride_request"
    | "scheduled_marketplace_created"
    | "marketplace_reminder"
    | "scheduled_booking_reminder"
    | "scheduled_booking_drive_to_pickup"
    | "scheduled_booking_assigned"
    | "scheduled_ride_live";
  rideId?: string;
  bookingId?: string;
  sourceTable?: string;
  target?: string;
  screen?: string;
  message?: string;
  audience?: "driver" | "rider";
}

const ANDROID_CHANNELS = {
  default: "uto-general-v2",
  rideRequests: "uto-ride-requests-v2",
  scheduled: "uto-scheduled-v2",
} as const;

async function ensureAndroidChannels() {
  if (Platform.OS !== "android" || !Notifications) return;
  // New channel ids so soft settings apply (Android freezes channel config after create).
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.default, {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: "#F7C948",
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.rideRequests, {
    name: "Ride Requests",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180],
    lightColor: "#F7C948",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.scheduled, {
    name: "Scheduled Bookings",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180],
    lightColor: "#F7C948",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function channelForNotificationType(type?: string) {
  if (
    type === "scheduled_booking_assigned" ||
    type === "scheduled_marketplace_created" ||
    type === "marketplace_reminder" ||
    type === "scheduled_booking_reminder" ||
    type === "scheduled_booking_drive_to_pickup" ||
    type === "scheduled_ride_live"
  ) {
    return ANDROID_CHANNELS.scheduled;
  }
  if (type === "ride_request" || type === "ride_requested") {
    return ANDROID_CHANNELS.rideRequests;
  }
  return ANDROID_CHANNELS.default;
}

export function useNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    ensurePushTokenRegistered(userId)
      .then((token) => {
        if (!mounted || !token) return;
        setExpoPushToken(token);
      })
      .catch((err) => {
        console.error("Error during push notification setup:", err);
      });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
        const rawData = notif?.request?.content?.data;
        handleIncomingNotificationData(rawData);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const rawData = response?.notification?.request?.content?.data;
        if (isNotificationData(rawData)) {
          handleNotificationResponse(rawData);
        }
      });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const rawData = response?.notification?.request?.content?.data;
        if (isNotificationData(rawData)) {
          handleNotificationResponse(rawData);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  return {
    expoPushToken,
    notification,
  };
}

/** Register/refresh Expo push token and persist it for background delivery. */
export async function ensurePushTokenRegistered(userId?: string): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (token && userId) {
    await savePushToken(userId, token);
  }
  return token;
}

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web" || !Notifications) {
    return null;
  }

  await ensureAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: true,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: true,
        allowProvisional: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for notifications");
    return null;
  }

  let token: string | null = null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const pushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = pushToken.data;
    console.log("✅ Expo push token ready:", token?.substring(0, 24) + "...");
  } catch (error) {
    console.error("Error getting push token:", error);
  }

  return token;
}

async function savePushToken(userId: string, token: string) {
  try {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/users/${userId}/push-token`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pushToken: token }),
    });
    console.log("✅ Push token saved for user", userId);
  } catch (error) {
    console.error("Failed to save push token:", error);
  }
}

function handleIncomingNotificationData(rawData: unknown) {
  if (!rawData || typeof rawData !== "object") return;
  const data = rawData as Record<string, any>;
  if (!audienceAllowed(data)) return;

  const key = notificationDedupeKey(data);
  if (key) claimNotification(key);

  const type = String(data.type || data.target || "");
  if (type === "ride_request" || type === "ride_requested") {
    // Only drivers restore the offer UI from push.
    if (activeAppMode !== "driver") return;
    const rideId = data.rideId ? String(data.rideId) : String(data.ride?.id || "");
    const ridePayload = data.ride && typeof data.ride === "object" ? data.ride : undefined;
    if (rideId || ridePayload) emitRideRequestNotification(rideId, ridePayload);
  }
}

function handleNotificationResponse(data: NotificationData) {
  console.log("Notification response:", data);
  if (!audienceAllowed(data as any)) return;
  handleIncomingNotificationData(data);
  navigateFromNotification(data);
}

export type LocalNotificationOptions = {
  /** Skip scheduling when app is already open (UI handles it). Default false. */
  skipWhenForeground?: boolean;
  /** If true, caller already claimed the dedupe key. */
  alreadyClaimed?: boolean;
  /** Skip rider/driver mode gate (caller already verified role). */
  bypassAudienceCheck?: boolean;
};

/**
 * Schedule a local notification at most once per event.
 * Returns false if suppressed (duplicate / wrong audience / foreground skip).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  options: LocalNotificationOptions = {},
): Promise<boolean> {
  if (!Notifications) {
    console.log(`📢 [Local Notification] ${title}: ${body}`);
    return true;
  }

  const payload = { ...(data || {}) };
  if (!options.bypassAudienceCheck && !audienceAllowed(payload)) {
    return false;
  }

  if (options.skipWhenForeground && AppState.currentState === "active") {
    const key = notificationDedupeKey(payload);
    if (key) claimNotification(key);
    return false;
  }

  const key = notificationDedupeKey(payload);
  if (!options.alreadyClaimed && key && !claimNotification(key)) {
    console.log(`🔇 Skipping duplicate local notification: ${key}`);
    return false;
  }

  try {
    await ensureAndroidChannels();
    const type = payload?.type ? String(payload.type) : undefined;
    // Prefer ride-requests channel for scheduled alerts too — older APKs may
    // not have uto-scheduled-v2, and Android drops unknown channels silently.
    const channelId =
      type === "ride_request" || type === "ride_requested"
        ? ANDROID_CHANNELS.rideRequests
        : type && channelForNotificationType(type) === ANDROID_CHANNELS.scheduled
          ? ANDROID_CHANNELS.rideRequests
          : channelForNotificationType(type);
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: payload,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null,
    });
    console.log(`📢 Local notification sent: ${title}`);
    return true;
  } catch (err) {
    console.warn("Failed to send local notification:", err);
    return false;
  }
}
