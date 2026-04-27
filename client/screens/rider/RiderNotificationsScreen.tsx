// client/screens/rider/RiderNotificationsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const NOTIF_PREFS_KEY = "@uto_rider_notification_prefs";

interface NotificationPrefs {
  pushRideUpdates: boolean;
  pushPromotions: boolean;
  pushPayments: boolean;
  pushSafety: boolean;
  smsRideUpdates: boolean;
  smsPromotions: boolean;
  emailReceipts: boolean;
  emailPromotions: boolean;
  emailNewsletter: boolean;
  emailSafety: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  pushRideUpdates: true,
  pushPromotions: false,
  pushPayments: true,
  pushSafety: true,
  smsRideUpdates: false,
  smsPromotions: false,
  emailReceipts: true,
  emailPromotions: false,
  emailNewsletter: false,
  emailSafety: true,
};

function NotificationToggle({
  icon,
  label,
  subtitle,
  value,
  onToggle,
  isLast,
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  isLast?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.toggleItem, !isLast && styles.toggleBorder]}>
      <View style={styles.toggleIconContainer}>
        <MaterialIcons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.toggleContent}>
        <ThemedText style={styles.toggleLabel}>{label}</ThemedText>
        <ThemedText style={styles.toggleSubtitle}>{subtitle}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={() => {
          if (disabled) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        trackColor={{ false: "#333333", true: UTOColors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#333333"
        disabled={disabled}
      />
    </View>
  );
}

export default function RiderNotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string>("");

  // Load prefs from AsyncStorage (per-user key)
  useEffect(() => {
    (async () => {
      try {
        const key = user?.id ? `${NOTIF_PREFS_KEY}_${user.id}` : NOTIF_PREFS_KEY;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch (err) {
        console.warn("Failed to load notification prefs:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id]);

  // Persist prefs to AsyncStorage (debounced)
  const persistPrefs = useCallback(async (updated: NotificationPrefs) => {
    try {
      const key = user?.id ? `${NOTIF_PREFS_KEY}_${user.id}` : NOTIF_PREFS_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn("Failed to save notification prefs:", err);
    }
  }, [user?.id]);

  // Toggle a single pref
  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      persistPrefs(updated);
      return updated;
    });
  };

  // Unsubscribe from non-essential
  const handleUnsubscribeAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: NotificationPrefs = {
      pushRideUpdates: true,  // Keep essential
      pushPromotions: false,
      pushPayments: true,     // Keep essential
      pushSafety: true,       // Always on
      smsRideUpdates: false,
      smsPromotions: false,
      emailReceipts: true,    // Keep essential
      emailPromotions: false,
      emailNewsletter: false,
      emailSafety: true,      // Always on
    };
    setPrefs(updated);
    persistPrefs(updated);
  };

  // Re-enable all
  const handleEnableAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: NotificationPrefs = {
      pushRideUpdates: true,
      pushPromotions: true,
      pushPayments: true,
      pushSafety: true,
      smsRideUpdates: true,
      smsPromotions: true,
      emailReceipts: true,
      emailPromotions: true,
      emailNewsletter: true,
      emailSafety: true,
    };
    setPrefs(updated);
    persistPrefs(updated);
  };

  const allEnabled = Object.values(prefs).every(Boolean);
  const essentialOnlyCount = Object.values(prefs).filter(Boolean).length;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, alignItems: "center" }]}>
        <ActivityIndicator size="large" color={UTOColors.primary} />
      </View>
    );
  }

  const sections = [
    {
      title: "PUSH NOTIFICATIONS",
      items: [
        { key: "pushRideUpdates" as const, label: "Ride Updates", subtitle: "Driver arrival, ride status, and trip progress", icon: "directions-car" as const },
        { key: "pushPayments" as const, label: "Payments & Receipts", subtitle: "Payment confirmations and wallet updates", icon: "payment" as const },
        { key: "pushPromotions" as const, label: "Promotions & Offers", subtitle: "Discounts, promo codes, and special deals", icon: "local-offer" as const },
      ],
    },
    {
      title: "SMS",
      items: [
        { key: "smsRideUpdates" as const, label: "Ride Updates via SMS", subtitle: "Text messages for ride confirmations", icon: "sms" as const },
      ],
    },
    {
      title: "EMAIL",
      items: [
        { key: "emailReceipts" as const, label: "Trip Receipts", subtitle: "Receive trip receipts via email", icon: "receipt" as const },
        { key: "emailPromotions" as const, label: "Promotions", subtitle: "Stay updated with upcoming offers", icon: "mail" as const },
      ],
    },
  ];

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.infoBanner}
        >
          <MaterialIcons name="info-outline" size={20} color={UTOColors.primary} />
          <ThemedText style={styles.infoBannerText}>
            Manage how you receive notifications to stay updated on your trips.
          </ThemedText>
        </Animated.View>

        {/* Status bar */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.statusBar}
        >
          <ThemedText style={styles.statusText}>
            {essentialOnlyCount}/10 notifications enabled
          </ThemedText>
          {lastSaved ? (
            <ThemedText style={styles.savedText}>Saved ✓</ThemedText>
          ) : null}
        </Animated.View>

        {sections.map((section, sIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(150 + sIndex * 80).duration(400)}
            style={styles.section}
          >
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <View style={styles.sectionCard}>
              {section.items.map((item, iIndex) => {
                return (
                  <NotificationToggle
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    subtitle={item.subtitle}
                    value={prefs[item.key]}
                    onToggle={() => togglePref(item.key)}
                    isLast={iIndex === section.items.length - 1}
                  />
                );
              })}
            </View>
          </Animated.View>
        ))}

        {/* Action buttons */}
        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.section}
        >
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleUnsubscribeAll}
              style={styles.unsubscribeButton}
            >
              <MaterialIcons name="notifications-off" size={18} color="#EF4444" />
              <ThemedText style={styles.unsubscribeText}>Essential only</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleEnableAll}
              style={[styles.unsubscribeButton, { borderColor: "#10B98140" }]}
            >
              <MaterialIcons name="notifications-active" size={18} color="#10B981" />
              <ThemedText style={[styles.unsubscribeText, { color: "#10B981" }]}>Enable all</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  scrollContent: { paddingTop: Spacing.lg },
  // Info banner
  infoBanner: {
    flexDirection: "row", backgroundColor: UTOColors.primary + "10",
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm,
    borderWidth: 1, borderColor: UTOColors.primary + "20",
  },
  infoBannerText: { flex: 1, color: "#9CA3AF", fontSize: 13, lineHeight: 18 },
  // Status
  statusBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xl,
  },
  statusText: { color: "#6B7280", fontSize: 13 },
  savedText: { color: "#10B981", fontSize: 12, fontWeight: "600" },
  // Section
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    color: "#6B7280", fontSize: 13, fontWeight: "600",
    letterSpacing: 1, marginBottom: Spacing.md,
  },
  sectionCard: {
    backgroundColor: "#1A1A1A", borderRadius: BorderRadius.lg, overflow: "hidden",
  },
  // Toggle
  toggleItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: Spacing.md,
  },
  toggleBorder: { borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  toggleIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#333333", alignItems: "center", justifyContent: "center",
    marginRight: Spacing.md,
  },
  toggleContent: { flex: 1, marginRight: Spacing.md },
  toggleLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
  toggleSubtitle: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  // Actions
  actionRow: { flexDirection: "row", gap: Spacing.md },
  unsubscribeButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1A1A1A", borderRadius: BorderRadius.lg,
    paddingVertical: 14, gap: Spacing.sm,
    borderWidth: 1, borderColor: "#EF444430",
  },
  unsubscribeText: { color: "#EF4444", fontSize: 14, fontWeight: "500" },
});
