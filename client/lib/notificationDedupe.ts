/**
 * Once-only notification claims so the same ride/booking never alerts repeatedly
 * across socket, Expo push, pending-dispatch restore, and background location.
 */
const memoryClaims = new Map<string, number>();

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function prune(now: number) {
  for (const [key, at] of memoryClaims) {
    if (now - at > DEFAULT_TTL_MS) memoryClaims.delete(key);
  }
}

/** Returns true only the first time this key is claimed within the TTL. */
export function claimNotification(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): boolean {
  if (!key) return true;
  const now = Date.now();
  prune(now);
  const prev = memoryClaims.get(key);
  if (prev != null && now - prev < ttlMs) {
    return false;
  }
  memoryClaims.set(key, now);
  return true;
}

export function wasNotificationClaimed(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): boolean {
  if (!key) return false;
  const prev = memoryClaims.get(key);
  if (prev == null) return false;
  return Date.now() - prev < ttlMs;
}

export function notificationDedupeKey(
  data: Record<string, any> | null | undefined,
): string | null {
  if (!data || typeof data !== "object") return null;
  const type = String(data.type || data.target || "").trim();
  const id = String(
    data.bookingId || data.rideId || data.ride?.id || "",
  ).trim();
  const audience = String(data.audience || "")
    .trim()
    .toLowerCase();
  // Distinct reminder stages (1h / 30m / contact) must each alert once.
  const stage = String(
    data.reminderBucket || data.slotKey || data.stage || "",
  ).trim();
  if (!type && !id && !stage) return null;
  return [
    audience || "any",
    type || "notice",
    id || "general",
    stage || "once",
  ].join(":");
}

/**
 * Loud in-app ride alert for drivers.
 * Max volume, plays twice, strong vibration — used for ride requests,
 * marketplace, assignments, and scheduled start notices.
 */
export async function playSoftBeep(): Promise<void> {
  try {
    const { Audio } = await import("expo-av");
    const { Vibration, Platform } = await import("react-native");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    const playOnce = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/ride_alert.wav"),
        { shouldPlay: true, volume: 1.0, isLooping: false, rate: 1.0 },
      );
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if ("didJustFinish" in status && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            resolve();
          }
        });
        // Safety timeout if status callback never fires
        setTimeout(() => {
          sound.unloadAsync().catch(() => {});
          resolve();
        }, 2500);
      });
    };

    if (Platform.OS !== "web") {
      Vibration.vibrate(
        Platform.OS === "ios"
          ? [0, 200, 100, 200, 100, 300]
          : [0, 280, 120, 280, 120, 400],
      );
    }

    await playOnce();
    // Second blast so drivers don't miss the alert in noisy environments
    await new Promise((r) => setTimeout(r, 180));
    await playOnce();
  } catch (err) {
    console.warn("🔇 Loud ride alert failed:", err);
  }
}
