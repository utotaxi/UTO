import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, UTOColors } from "@/constants/theme";

interface NotificationToggleProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

function NotificationToggle({ icon, title, subtitle, value, onValueChange, isLast }: NotificationToggleProps) {
  const { theme } = useTheme();

  return (
    <>
      <View style={styles.settingItem}>
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name={icon} size={20} color={theme.text} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        </View>
        <Switch
          value={value}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onValueChange(val);
          }}
          trackColor={{ false: theme.border, true: UTOColors.driver.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
      {!isLast && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
    </>
  );
}

export default function DriverNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [promosEnabled, setPromosEnabled] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            RIDE ALERTS
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
            <NotificationToggle
              icon="smartphone"
              title="Push Notifications"
              subtitle="Get real-time updates for ride requests"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />
            <NotificationToggle
              icon="message-square"
              title="SMS Alerts"
              subtitle="Receive text messages for important updates"
              value={smsEnabled}
              onValueChange={setSmsEnabled}
            />
            <NotificationToggle
              icon="mail"
              title="Email Notifications"
              subtitle="Weekly earnings and account updates"
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            MARKETING
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
            <NotificationToggle
              icon="star"
              title="Promotions & Offers"
              subtitle="Special driver incentives and bonuses"
              value={promosEnabled}
              onValueChange={setPromosEnabled}
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
});
