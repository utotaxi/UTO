// // import { useState, useEffect, useRef } from "react";
// // import { Platform } from "react-native";
// // import Constants from "expo-constants";
// // import { getApiUrl } from "@/lib/query-client";

// // let Notifications: typeof import("expo-notifications") | null = null;

// // try {
// //   Notifications = require("expo-notifications");
  
// //   Notifications.setNotificationHandler({
// //     handleNotification: async () => ({
// //       shouldShowAlert: true,
// //       shouldPlaySound: true,
// //       shouldSetBadge: true,
// //     }),
// //   });
// // } catch (error) {
// //   console.log("expo-notifications not available");
// // }

// // export interface NotificationData {
// //   type: "ride_accepted" | "driver_arriving" | "ride_started" | "ride_completed" | "ride_cancelled";
// //   rideId?: string;
// //   message?: string;
// // }

// // export function useNotifications(userId?: string) {
// //   const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
// //   const [notification, setNotification] = useState<any>(null);
// //   const notificationListener = useRef<any>();
// //   const responseListener = useRef<any>();
// // }

// import { useState, useEffect, useRef } from "react";
// import { Platform } from "react-native";
// import Constants from "expo-constants";
// import { getApiUrl } from "@/lib/query-client";

// let Notifications: typeof import("expo-notifications") | null = null;

// try {
//   Notifications = require("expo-notifications");
  
//   Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//       shouldShowAlert: true,
//       shouldPlaySound: true,
//       shouldSetBadge: true,
//     }),
//   });
// } catch (error) {
//   console.log("expo-notifications not available");
// }

// export interface NotificationData {
//   type: "ride_accepted" | "driver_arriving" | "ride_started" | "ride_completed" | "ride_cancelled";
//   rideId?: string;
//   message?: string;
// }

// export function useNotifications(userId?: string) {
//   const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
//   const [notification, setNotification] = useState<any>(null);
//   const notificationListener = useRef<any>();
//   const responseListener = useRef<any>();

//   useEffect(() => {
//     if (!Notifications) return;

//     registerForPushNotifications().then((token) => {
//       if (token) {
//         setExpoPushToken(token);
//         if (userId) {
//           savePushToken(userId, token);
//         }
//       }
//     });

//     notificationListener.current = Notifications.addNotificationReceivedListener((notif: any) => {
//       setNotification(notif);
//     });

//     responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
//       const data = response.notification.request.content.data as NotificationData;
//       handleNotificationResponse(data);
//     });

//     return () => {
//       if (!Notifications) return;
//       if (notificationListener.current) {
//         Notifications.removeNotificationSubscription(notificationListener.current);
//       }
//       if (responseListener.current) {
//         Notifications.removeNotificationSubscription(responseListener.current);
//       }
//     };
//   }, [userId]);

//   return { expoPushToken, notification };
// }

// async function registerForPushNotifications(): Promise<string | null> {
//   if (Platform.OS === "web" || !Notifications) {
//     return null;
//   }

//   let token: string | null = null;

//   const { status: existingStatus } = await Notifications.getPermissionsAsync();
//   let finalStatus = existingStatus;

//   if (existingStatus !== "granted") {
//     const { status } = await Notifications.requestPermissionsAsync();
//     finalStatus = status;
//   }

//   if (finalStatus !== "granted") {
//     console.log("Failed to get push token for notifications");
//     return null;
//   }

//   try {
//     const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    
//     if (projectId) {
//       const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
//       token = pushToken.data;
//     } else {
//       const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: undefined as any });
//       token = pushToken.data;
//     }
//   } catch (error) {
//     console.error("Error getting push token:", error);
//   }

//   if (Platform.OS === "android") {
//     Notifications.setNotificationChannelAsync("default", {
//       name: "default",
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: "#F7C948",
//     });
//   }

//   return token;
// }

// async function savePushToken(userId: string, token: string) {
//   try {
//     const apiUrl = getApiUrl();
//     await fetch(`${apiUrl}/api/users/${userId}/push-token`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ pushToken: token }),
//     });
//   } catch (error) {
//     console.error("Failed to save push token:", error);
//   }
// }

// function handleNotificationResponse(data: NotificationData) {
//   console.log("Notification response:", data);
// }

// export async function sendLocalNotification(title: string, body: string, data?: NotificationData) {
//   if (!Notifications) return;
  
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title,
//       body,
//       data,
//     },
//     trigger: null,
//   });
// }
