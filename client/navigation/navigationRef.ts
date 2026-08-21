import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

const navigateToDriverAccountScreen = (
  screen: string,
  params?: Record<string, any>,
) => {
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
  if (!rawData || typeof rawData !== "object" || !navigationRef.isReady())
    return false;

  const data = rawData as Record<string, any>;
  const audience = String(data.audience || "").toLowerCase();
  // Never route riders into driver-only screens from a mis-delivered push.
  if (audience === "driver") {
    // Still allow navigation when the user is in driver mode; AppShell filters
    // banners, but taps should only open driver screens for driver audience.
  }

  const type = String(data.type || data.target || data.screen || "");

  const driverOnly =
    type === "scheduled_marketplace_created" ||
    type === "marketplace_reminder" ||
    type === "scheduled_booking_assigned" ||
    type === "scheduled_booking_reminder" ||
    type === "scheduled_booking_drive_to_pickup" ||
    type === "ride_request" ||
    type === "ride_requested" ||
    data.target === "Marketplace" ||
    data.target === "UpcomingBookings" ||
    data.screen === "UpcomingBookings" ||
    data.target === "ScheduledJobDetails" ||
    data.target === "DriveTab";

  if (driverOnly && audience === "rider") {
    return false;
  }

  if (
    type === "scheduled_marketplace_created" ||
    type === "marketplace_reminder" ||
    data.target === "Marketplace"
  ) {
    return navigateToDriverAccountScreen("Marketplace");
  }

  if (
    type === "scheduled_booking_assigned" ||
    data.target === "UpcomingBookings" ||
    data.screen === "UpcomingBookings"
  ) {
    return navigateToDriverAccountScreen("UpcomingBookings");
  }

  if (
    type === "scheduled_booking_reminder" ||
    type === "scheduled_booking_drive_to_pickup" ||
    data.target === "ScheduledJobDetails"
  ) {
    return navigateToDriverAccountScreen("ScheduledJobDetails", {
      bookingId: data.bookingId ? String(data.bookingId) : undefined,
      openDriveToPickup: true,
    });
  }

  if (
    type === "scheduled_ride_live" ||
    type === "ride_request" ||
    type === "ride_requested"
  ) {
    // scheduled_ride_live can be rider or driver — route by audience.
    if (audience === "rider") {
      navigationRef.navigate("Main", { screen: "HomeTab" });
      return true;
    }
    navigationRef.navigate("Main", { screen: "DriveTab" });
    return true;
  }

  return false;
};
