import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

interface EarningsSummaryProps {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalTrips: number;
  averageRating: number;
  selectedFilter?: "today" | "week" | "month";
  filteredTotal?: number;
  filteredCount?: number;
}

export function EarningsSummary({
  today,
  thisWeek,
  thisMonth,
  totalTrips,
  averageRating,
  selectedFilter = "today",
  filteredTotal,
  filteredCount,
}: EarningsSummaryProps) {
  const { theme, isDark } = useTheme();

  // Show filtered earnings in the main card based on selected filter
  const mainEarnings =
    filteredTotal !== undefined
      ? filteredTotal
      : selectedFilter === "today"
        ? today
        : selectedFilter === "week"
          ? thisWeek
          : thisMonth;

  const mainTrips =
    filteredCount !== undefined
      ? filteredCount
      : totalTrips;

  const mainLabel =
    selectedFilter === "today"
      ? "Today's Earnings"
      : selectedFilter === "week"
        ? "This Week's Earnings"
        : "This Month's Earnings";

  // Determine which period card is active
  const weekActive = selectedFilter === "week";
  const monthActive = selectedFilter === "month";

  return (
    <View style={styles.container}>
      <View style={[styles.mainCard, Shadows.medium, { backgroundColor: UTOColors.primary }]}>
        <ThemedText style={styles.mainLabel}>{mainLabel}</ThemedText>
        <ThemedText style={styles.mainValue}>{formatPrice(mainEarnings)}</ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="navigation" size={14} color="rgba(0,0,0,0.7)" />
            <ThemedText style={styles.statValue}>{mainTrips}</ThemedText>
            <ThemedText style={styles.statLabel}>Trips</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: "rgba(0,0,0,0.15)" }]} />
          <View style={styles.stat}>
            <Feather name="star" size={14} color="rgba(0,0,0,0.7)" />
            <ThemedText style={styles.statValue}>{averageRating.toFixed(1)}</ThemedText>
            <ThemedText style={styles.statLabel}>Rating</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.periodCards}>
        <View
          style={[
            styles.periodCard,
            {
              backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
              borderWidth: weekActive ? 2 : 0,
              borderColor: weekActive ? UTOColors.primary : "transparent",
            },
          ]}
        >
          <ThemedText style={[styles.periodLabel, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
            This Week
          </ThemedText>
          <ThemedText style={[styles.periodValue, { color: isDark ? "#FFFFFF" : theme.text }]}>
            {formatPrice(thisWeek)}
          </ThemedText>
        </View>
        <View
          style={[
            styles.periodCard,
            {
              backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
              borderWidth: monthActive ? 2 : 0,
              borderColor: monthActive ? UTOColors.primary : "transparent",
            },
          ]}
        >
          <ThemedText style={[styles.periodLabel, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
            This Month
          </ThemedText>
          <ThemedText style={[styles.periodValue, { color: isDark ? "#FFFFFF" : theme.text }]}>
            {formatPrice(thisMonth)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  mainCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  mainLabel: {
    color: "rgba(0,0,0,0.7)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  mainValue: {
    color: "#000000",
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  statLabel: {
    color: "rgba(0,0,0,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
  },
  periodCards: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  periodCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  periodValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
});
