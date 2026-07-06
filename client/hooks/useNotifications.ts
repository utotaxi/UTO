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
    | "scheduled_ride_live";
  rideId?: string;
  bookingId?: string;
  sourceTable?: string;
  target?: string;
  screen?: string;
  message?: string;
}

export function useNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    registerForPushNotifications().then((token) => {
      if (!mounted || !token) return;

        setExpoPushToken(token);
        if (userId) {
          savePushToken(userId, token);
        }
    }).catch((err) => {
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

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web" || !Notifications) {
    return null;
  }

  let token: string | null = null;

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token for notifications");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    if (projectId) {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushToken.data;
    } else {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: undefined as any,
      });
      token = pushToken.data;
    }
  } catch (error) {
    console.error("Error getting push token:", error);
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F7C948",
    });
    Notifications.setNotificationChannelAsync("ride-requests", {
      name: "Ride Requests",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#F7C948",
      sound: "default",
      bypassDnd: true,
    });
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
    const rideId = data.rideId ? String(data.rideId) : "";
    if (rideId) emitRideRequestNotification(rideId);
  }
}

function handleNotificationResponse(data: NotificationData) {
  console.log("Notification response:", data);
  handleIncomingNotificationData(data);
  navigateFromNotification(data);
}

/**
 * Schedule a local notification immediately.
 * Used to notify rider/driver about ride status changes.
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
      },
      trigger: null, // Fire immediately
    });
    console.log(`📢 Local notification sent: ${title}`);
  } catch (err) {
    console.warn("Failed to send local notification:", err);
  }
}
