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
export function claimNotification(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
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

export function wasNotificationClaimed(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  if (!key) return false;
  const prev = memoryClaims.get(key);
  if (prev == null) return false;
  return Date.now() - prev < ttlMs;
}

export function notificationDedupeKey(data: Record<string, any> | null | undefined): string | null {
  if (!data || typeof data !== "object") return null;
  const type = String(data.type || data.target || "").trim();
  const id = String(data.bookingId || data.rideId || data.ride?.id || "").trim();
  const audience = String(data.audience || "").trim().toLowerCase();
  // Distinct reminder stages (1h / 30m / contact) must each alert once.
  const stage = String(data.reminderBucket || data.slotKey || data.stage || "").trim();
  if (!type && !id && !stage) return null;
  return [audience || "any", type || "notice", id || "general", stage || "once"].join(":");
}

/** Soft in-app beep (single play). Used instead of looping ride alerts for most notices. */
export async function playSoftBeep(): Promise<void> {
  try {
    const { Audio } = await import("expo-av");
    const { Vibration, Platform } = await import("react-native");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      require("../../assets/ride_alert.wav"),
      { shouldPlay: true, volume: 0.45, isLooping: false },
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if ("didJustFinish" in status && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });

    if (Platform.OS !== "web") {
      Vibration.vibrate(Platform.OS === "ios" ? 40 : 120);
    }
  } catch (err) {
    console.warn("🔇 Soft beep failed:", err);
  }
}
