import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  index: number;
}

function SettingItem({ title, subtitle, onPress, index }: SettingItemProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.settingItem,
          { backgroundColor: pressed ? theme.backgroundDefault : "transparent" },
        ]}
      >
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <Feather
          name="chevron-right"
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
    </Animated.View>
  );
}

export default function TaxInformationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(headerHeight, 56) + insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.lg
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingItem
          title="Tax settings"
          subtitle="Keep your tax information up to date."
          onPress={() => navigation.navigate("TaxSettings")}
          index={0}
        />
        <SettingItem
          title="Tax invoices"
          subtitle="View or download invoices"
          onPress={() => navigation.navigate("TaxInvoices")}
          index={1}
        />
        <SettingItem
          title="Tax summaries"
          subtitle="Track your earnings, expenses and net payout."
          onPress={() => navigation.navigate("TaxSummaries")}
          index={2}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.xl,
  },
});
