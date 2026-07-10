import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

const navigateToDriverAccountScreen = (screen: string, params?: Record<string, any>) => {
  if (!navigationRef.isReady()) return false;

  navigationRef.navigate("Main", {
    screen: "AccountTab",
    params: {
      screen,
      params,
    },
  });
  return true;
};

export const navigateFromNotification = (rawData: unknown) => {
  if (!rawData || typeof rawData !== "object" || !navigationRef.isReady()) return false;

  const data = rawData as Record<string, any>;
  const type = String(data.type || data.target || data.screen || "");

  if (type === "scheduled_marketplace_created" || type === "marketplace_reminder" || data.target === "Marketplace") {
    return navigateToDriverAccountScreen("Marketplace");
  }

  if (type === "scheduled_booking_reminder" || type === "scheduled_booking_drive_to_pickup" || data.target === "ScheduledJobDetails") {
    return navigateToDriverAccountScreen("ScheduledJobDetails", {
      bookingId: data.bookingId ? String(data.bookingId) : undefined,
      openDriveToPickup: true,
    });
  }

  if (type === "scheduled_ride_live" || type === "ride_request" || type === "ride_requested") {
    navigationRef.navigate("Main", { screen: "DriveTab" });
    return true;
  }

  return false;
};
