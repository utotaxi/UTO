import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiUrl } from "@/lib/query-client";
import * as Notifications from "expo-notifications";
import { navigateFromNotification } from "@/navigation/navigationRef";
import { emitRideRequestNotification } from "@/lib/rideNotificationBridge";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
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
}

const ANDROID_CHANNELS = {
  default: "default",
  rideRequests: "ride-requests",
  scheduled: "scheduled-bookings",
} as const;

async function ensureAndroidChannels() {
  if (Platform.OS !== "android" || !Notifications) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.default, {
    name: "General",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#F7C948",
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.rideRequests, {
    name: "Ride Requests",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: "#F7C948",
    sound: "default",
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNELS.scheduled, {
    name: "Scheduled Bookings",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: "#F7C948",
    sound: "default",
    bypassDnd: true,
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
      Notifications?.addNotificationReceivedListener((notif) => {
        setNotification(notif);
        const rawData = notif?.request?.content?.data;
        handleIncomingNotificationData(rawData);
      });

    responseListener.current =
      Notifications?.addNotificationResponseReceivedListener(
        (response) => {
          const rawData = response?.notification?.request?.content?.data;

          if (isNotificationData(rawData)) {
            handleNotificationResponse(rawData);
          }
        }
      );

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const rawData = response?.notification?.request?.content?.data;
        if (isNotificationData(rawData)) {
          handleNotificationResponse(rawData);
        }
      })
      .catch(() => {
        // Non-critical; foreground listeners still handle future taps.
      });

    return () => {
      mounted = false;

      notificationListener?.current?.remove();
      responseListener?.current?.remove();
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

  // Android channels must exist before token registration / delivery.
  await ensureAndroidChannels();

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
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
  const type = String(data.type || data.target || "");
  if (type === "ride_request" || type === "ride_requested") {
    const rideId = data.rideId ? String(data.rideId) : String(data.ride?.id || "");
    const ridePayload = data.ride && typeof data.ride === "object" ? data.ride : undefined;
    if (rideId || ridePayload) emitRideRequestNotification(rideId, ridePayload);
  }
}

function handleNotificationResponse(data: NotificationData) {
  console.log("Notification response:", data);
  handleIncomingNotificationData(data);
  navigateFromNotification(data);
}

/**
 * Schedule a local notification immediately.
 * Used when the app is awake; background delivery still relies on Expo push.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!Notifications) {
    console.log(`📢 [Local Notification] ${title}: ${body}`);
    return;
  }

  try {
    await ensureAndroidChannels();
    const type = data?.type ? String(data.type) : undefined;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === "android"
          ? { channelId: channelForNotificationType(type) }
          : {}),
      },
      trigger: null, // Fire immediately
    });
    console.log(`📢 Local notification sent: ${title}`);
  } catch (err) {
    console.warn("Failed to send local notification:", err);
  }
}
