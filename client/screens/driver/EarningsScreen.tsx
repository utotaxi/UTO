import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useDriver, Trip } from "@/context/DriverContext";
import { Spacing, BorderRadius, formatPrice, UTOColors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Brand accent ───
const GOLD = "#F7C948";
const SUCCESS = "#10B981";

type TimeFilter = "today" | "week" | "month";

// ─── Month names ───
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { tripHistory, driverDeductions, earnings, refreshData } = useDriver();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>("week");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // ─── Dynamic colours based on theme ───
  const C = useMemo(() => ({
    bg: isDark ? "#111111" : "#FFFFFF",
    card: isDark ? "#1A1A1A" : "#F5F5F5",
    border: isDark ? "#2A2A2A" : "#E5E5E5",
    text: isDark ? "#FFFFFF" : "#1A1A1A",
    textDim: isDark ? "#6B7280" : "#9CA3AF",
    textMid: isDark ? "#9CA3AF" : "#6B7280",
    gold: GOLD,
    success: SUCCESS,
    modalBg: isDark ? "#1A1A1A" : "#FFFFFF",
    pillBg: isDark ? "#1A1A1A" : "#F0F0F0",
    pillBorder: isDark ? "#2A2A2A" : "#E0E0E0",
    barBg: isDark ? GOLD + "30" : GOLD + "50",
    barActive: GOLD,
  }), [isDark]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // ─── Available months (only up to current month in current year) ───
  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months: { month: number; year: number; label: string }[] = [];

    // Show months for 2026 only up to current month
    for (let m = 0; m <= (selectedYear === currentYear ? currentMonth : 11); m++) {
      months.push({
        month: m,
        year: selectedYear,
        label: MONTH_NAMES[m],
      });
    }
    return months;
  }, [selectedYear]);

  // ─── Compute cutoff date based on filter ───
  const cutoffDate = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedFilter) {
      case "today":
        return todayStart;
      case "week": {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        return weekStart;
      }
      case "month":
        return new Date(selectedYear, selectedMonth, 1);
    }
  }, [selectedFilter, selectedMonth, selectedYear]);

  const cutoffEnd = useMemo(() => {
    if (selectedFilter === "month") {
      return new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    }
    return new Date(); // now
  }, [selectedFilter, selectedMonth, selectedYear]);

  // ─── Filter and group trips ───
  const { filteredTrips, filteredTotal, filteredCount, sections, dailyData } =
    useMemo(() => {
      let total = 0;
      let count = 0;
      const trips = tripHistory.filter((trip) => {
        const td = new Date(trip.completedAt);
        if (td >= cutoffDate && td <= cutoffEnd) {
          total += trip.farePrice;
          count += 1;
          return true;
        }
        return false;
      });

      driverDeductions.forEach((deduction) => {
        const dd = new Date(deduction.createdAt);
        if (dd >= cutoffDate && dd <= cutoffEnd) {
          total -= deduction.amount;
        }
      });

      // Group by date for sections
      const dateGroups: Record<string, Trip[]> = {};
      trips.forEach((trip) => {
        const d = new Date(trip.completedAt);
        const key = d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        if (!dateGroups[key]) dateGroups[key] = [];
        dateGroups[key].push(trip);
      });

      const secs = Object.entries(dateGroups).map(([title, data]) => {
        // Calculate deductions for this specific day
        let dayDeductions = 0;
        const firstTripDateStr = data[0]?.completedAt;
        if (firstTripDateStr) {
          const dDate = new Date(firstTripDateStr);
          const dayStart = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);

          driverDeductions.forEach((deduction) => {
            const dd = new Date(deduction.createdAt);
            if (dd >= dayStart && dd < dayEnd) {
              dayDeductions += deduction.amount;
            }
          });
        }
        
        return {
          title,
          data,
          dayTotal: data.reduce((sum, t) => sum + t.farePrice, 0) - dayDeductions,
        };
      });

      // Build daily bar data for the last 7 days
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const daily: { label: string; amount: number; dayNum: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        let dayTotal = 0;
        tripHistory.forEach((trip) => {
          const td = new Date(trip.completedAt);
          if (td >= dayStart && td < dayEnd) {
            dayTotal += trip.farePrice;
          }
        });
        driverDeductions.forEach((deduction) => {
          const dd = new Date(deduction.createdAt);
          if (dd >= dayStart && dd < dayEnd) {
            dayTotal -= deduction.amount;
          }
        });

        const dayIdx = dayStart.getDay();
        daily.push({
          label: dayLabels[dayIdx === 0 ? 6 : dayIdx - 1],
          amount: dayTotal,
          dayNum: dayStart.getDate(),
        });
      }

      return {
        filteredTrips: trips,
        filteredTotal: Math.round(total * 100) / 100,
        filteredCount: count,
        sections: secs,
        dailyData: daily,
      };
    }, [tripHistory, driverDeductions, cutoffDate, cutoffEnd]);

  // ─── Driving time ───
  const drivingTime = useMemo(() => {
    let totalMinutes = 0;
    filteredTrips.forEach((t) => { totalMinutes += t.durationMinutes || 0; });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  }, [filteredTrips]);

  // ─── Average rating ───
  const avgRating = useMemo(() => {
    let total = 0, count = 0;
    filteredTrips.forEach((t) => { if (t.rating) { total += t.rating; count++; } });
    return count > 0 ? (total / count).toFixed(1) : "5.0";
  }, [filteredTrips]);

  const maxBarAmount = useMemo(() => Math.max(...dailyData.map((d) => d.amount), 1), [dailyData]);

  // ─── Date range label ───
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    switch (selectedFilter) {
      case "today":
        return `Today, ${fmt(now)}`;
      case "week": {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return `${fmt(start)} – ${fmt(now)}`;
      }
      case "month":
        return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
  }, [selectedFilter, selectedMonth, selectedYear]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  };

  const handleFilterPress = useCallback((filter: TimeFilter) => {
    setSelectedFilter(filter);
    if (filter === "month") {
      // Reset to current month when switching to month filter
      const now = new Date();
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
    }
  }, []);

  const handleMonthSelect = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthPicker(false);
  }, []);

  // ─── RENDER: Header ───
  const renderHeader = () => (
    <View>
      {/* Title */}
      <Text style={[styles.screenTitle, { color: C.text }]}>Earnings</Text>

      {/* Date range with dropdown */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.dateRangeBtn, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => {
          if (selectedFilter === "month") {
            setShowMonthPicker(true);
          }
        }}
      >
        <MaterialIcons name="calendar-today" size={18} color={C.gold} />
        <Text style={[styles.dateRangeText, { color: C.text }]}>{dateRangeLabel}</Text>
        {selectedFilter === "month" && (
          <MaterialIcons name="keyboard-arrow-down" size={20} color={C.textMid} />
        )}
      </TouchableOpacity>

      {/* Big earnings */}
      <View style={styles.bigEarningsContainer}>
        <Text style={[styles.bigEarnings, { color: C.text }]}>
          {formatPrice(filteredTotal)}
        </Text>
        <Text style={[styles.bigEarningsSub, { color: C.textMid }]}>
          {filteredCount} trip{filteredCount !== 1 ? "s" : ""} completed
        </Text>
      </View>

      {/* Filter pills — use TouchableOpacity for reliable touch in SectionList */}
      <View style={styles.filterRow}>
        {(["today", "week", "month"] as TimeFilter[]).map((f) => {
          const active = selectedFilter === f;
          return (
            <TouchableOpacity
              key={f}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              onPress={() => handleFilterPress(f)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? C.gold : C.pillBg,
                  borderColor: active ? C.gold : C.pillBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? "#000000" : C.textMid },
                ]}
              >
                {f === "today" ? "Today" : f === "week" ? "Week" : "Month"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bar chart (week view) */}
      {selectedFilter === "week" && (
        <View style={[styles.chartContainer, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.chartMaxLine}>
            <Text style={[styles.chartMaxLabel, { color: C.textDim }]}>
              {formatPrice(maxBarAmount)}
            </Text>
            <View style={[styles.chartDashedLine, { borderColor: C.textDim + "40" }]} />
          </View>
          <View style={styles.chartBars}>
            {dailyData.map((day, idx) => {
              const barH = maxBarAmount > 0 ? Math.max((day.amount / maxBarAmount) * 120, 4) : 4;
              const isToday = idx === dailyData.length - 1;
              return (
                <View key={idx} style={styles.chartBarColumn}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: barH, backgroundColor: isToday ? C.barActive : C.barBg },
                    ]}
                  />
                  <Text style={[styles.chartBarDayNum, { color: C.textMid }]}>{day.dayNum}</Text>
                  <Text style={[styles.chartBarLabel, { color: C.textDim }]}>{day.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { icon: "access-time" as const, label: "Driving", value: drivingTime },
          { icon: "directions-car" as const, label: "Trips", value: `${filteredCount}` },
          { icon: "star" as const, label: "Rating", value: avgRating },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}
          >
            <MaterialIcons name={stat.icon} size={18} color={C.gold} />
            <Text style={[styles.statValue, { color: C.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: C.textDim }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Period summary */}
      <View style={styles.periodRow}>
        <View style={[styles.periodCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.periodLabel, { color: C.textMid }]}>This Week</Text>
          <Text style={[styles.periodValue, { color: C.gold }]}>
            {formatPrice(earnings.thisWeek)}
          </Text>
        </View>
        <View style={[styles.periodCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.periodLabel, { color: C.textMid }]}>This Month</Text>
          <Text style={[styles.periodValue, { color: C.gold }]}>
            {formatPrice(earnings.thisMonth)}
          </Text>
        </View>
      </View>

      {/* Breakdown title */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Breakdown</Text>
    </View>
  );

  // ─── RENDER: Section header (date) ───
  const renderSectionHeader = ({ section }: { section: { title: string; dayTotal: number } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: C.bg }]}>
      <Text style={[styles.sectionHeaderText, { color: C.text }]}>{section.title}</Text>
      <Text style={[styles.sectionHeaderTotal, { color: C.gold }]}>
        {formatPrice(section.dayTotal)}
      </Text>
    </View>
  );

  // ─── RENDER: Trip card ───
  const renderTrip = ({ item: trip }: { item: Trip }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setSelectedTrip(trip)}
      style={[styles.tripCard, { backgroundColor: C.card, borderColor: C.border }]}
    >
      <View style={styles.tripLeft}>
        <Text style={[styles.tripTime, { color: C.textMid }]}>{formatTime(trip.completedAt)}</Text>
      </View>

      <View style={styles.tripCenter}>
        <View style={styles.tripRouteRow}>
          <View style={[styles.tripDot, { backgroundColor: SUCCESS }]} />
          <Text style={[styles.tripAddr, { color: C.textMid }]} numberOfLines={1}>
            {trip.pickupAddress}
          </Text>
        </View>
        <View style={styles.tripRouteRow}>
          <View style={[styles.tripDot, { backgroundColor: "#EF4444" }]} />
          <Text style={[styles.tripAddr, { color: C.textMid }]} numberOfLines={1}>
            {trip.dropoffAddress}
          </Text>
        </View>
      </View>

      <View style={styles.tripRight}>
        <Text style={[styles.tripFare, { color: C.success }]}>
          +{formatPrice(trip.farePrice)}
        </Text>
        {trip.rating ? (
          <View style={styles.tripRating}>
            <MaterialIcons name="star" size={12} color={C.gold} />
            <Text style={[styles.tripRatingText, { color: C.textMid }]}>{trip.rating}</Text>
          </View>
        ) : null}
        <MaterialIcons name="chevron-right" size={18} color={C.textDim} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: tabBarHeight > 0 ? tabBarHeight + Spacing.xl : insets.bottom + 80,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[GOLD]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: C.card, borderColor: C.border }]}>
              <MaterialIcons name="trending-up" size={36} color={C.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text }]}>No trips yet</Text>
            <Text style={[styles.emptySub, { color: C.textDim }]}>
              Complete rides to start earning
            </Text>
          </View>
        }
      />

      {/* ═══ Month Picker Modal ═══ */}
      <Modal visible={showMonthPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <View style={[styles.monthPickerCard, { backgroundColor: C.modalBg }]}>
            <Text style={[styles.monthPickerTitle, { color: C.text }]}>Select Month</Text>
            <Text style={[styles.monthPickerYear, { color: C.textMid }]}>{selectedYear}</Text>

            <ScrollView style={styles.monthList} showsVerticalScrollIndicator={false}>
              {availableMonths.map((item) => {
                const active = item.month === selectedMonth && item.year === selectedYear;
                return (
                  <TouchableOpacity
                    key={`${item.year}-${item.month}`}
                    activeOpacity={0.6}
                    onPress={() => handleMonthSelect(item.month, item.year)}
                    style={[
                      styles.monthItem,
                      {
                        backgroundColor: active ? C.gold : "transparent",
                        borderColor: active ? C.gold : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        { color: active ? "#000000" : C.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active && <MaterialIcons name="check" size={20} color="#000000" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMonthPicker(false)}
              style={[styles.monthCloseBtn, { borderColor: C.border }]}
            >
              <Text style={[styles.monthCloseBtnText, { color: C.textMid }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ═══ Trip Detail Modal ═══ */}
      <Modal visible={!!selectedTrip} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.tripDetailCard, { backgroundColor: C.modalBg }]}>
            {selectedTrip && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header */}
                <View style={styles.tripDetailHeader}>
                  <View style={[styles.tripDetailCheckCircle, { backgroundColor: SUCCESS }]}>
                    <MaterialIcons name="check" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.tripDetailTitle, { color: C.text }]}>Ride Summary</Text>
                  <Text style={[styles.tripDetailDate, { color: C.textMid }]}>
                    {new Date(selectedTrip.completedAt).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" at "}
                    {formatTime(selectedTrip.completedAt)}
                  </Text>
                </View>

                {/* Fare card */}
                <View style={[styles.tripDetailFareCard, { backgroundColor: isDark ? "#111111" : "#F9F9F9", borderColor: C.border }]}>
                  <Text style={[styles.tripDetailFareLabel, { color: C.textMid }]}>FARE EARNED</Text>
                  <Text style={[styles.tripDetailFareAmount, { color: C.gold }]}>
                    {formatPrice(selectedTrip.farePrice)}
                  </Text>
                  <View style={[styles.tripDetailFareBadge, {
                    backgroundColor: selectedTrip.paymentMethod === 'card' ? UTOColors.primary + "20" : SUCCESS + "20"
                  }]}>
                    <MaterialIcons 
                      name={selectedTrip.paymentMethod === 'card' ? "credit-card" : "payments"} 
                      size={14} 
                      color={selectedTrip.paymentMethod === 'card' ? UTOColors.primary : SUCCESS} 
                    />
                    <Text style={[styles.tripDetailFareBadgeText, { 
                      color: selectedTrip.paymentMethod === 'card' ? UTOColors.primary : SUCCESS 
                    }]}>
                      {selectedTrip.paymentMethod === 'card' ? 'Card Payment' : 'Cash Payment'}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <Text style={[styles.tripDetailSectionLabel, { color: C.text }]}>Route</Text>
                <View style={[styles.tripDetailRouteCard, { backgroundColor: isDark ? "#111111" : "#F9F9F9", borderColor: C.border }]}>
                  <View style={styles.tripDetailRouteRow}>
                    <View style={[styles.tripDetailRouteDot, { backgroundColor: SUCCESS }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripDetailRouteLabel, { color: C.textDim }]}>PICKUP</Text>
                      <Text style={[styles.tripDetailRouteAddr, { color: C.text }]}>
                        {selectedTrip.pickupAddress}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tripDetailRouteLine, { backgroundColor: C.border }]} />
                  <View style={styles.tripDetailRouteRow}>
                    <View style={[styles.tripDetailRouteDot, { backgroundColor: "#EF4444" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripDetailRouteLabel, { color: C.textDim }]}>DROPOFF</Text>
                      <Text style={[styles.tripDetailRouteAddr, { color: C.text }]}>
                        {selectedTrip.dropoffAddress}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Details grid */}
                <Text style={[styles.tripDetailSectionLabel, { color: C.text }]}>Details</Text>
                <View style={styles.tripDetailGrid}>
                  {[
                    { icon: "person" as const, label: "Rider", value: selectedTrip.riderName },
                    { icon: "straighten" as const, label: "Distance", value: `${selectedTrip.distanceMiles} mi` },
                    { icon: "schedule" as const, label: "Duration", value: `${selectedTrip.durationMinutes} min` },
                    { icon: "star" as const, label: "Rating", value: selectedTrip.rating ? `${selectedTrip.rating} ★` : "N/A" },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={[styles.tripDetailGridItem, { backgroundColor: isDark ? "#111111" : "#F9F9F9", borderColor: C.border }]}
                    >
                      <MaterialIcons name={item.icon} size={20} color={C.gold} />
                      <Text style={[styles.tripDetailGridValue, { color: C.text }]}>{item.value}</Text>
                      <Text style={[styles.tripDetailGridLabel, { color: C.textDim }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Close button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedTrip(null)}
                  style={[styles.tripDetailCloseBtn, { backgroundColor: C.gold }]}
                >
                  <Text style={styles.tripDetailCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },

  // ─── Screen title ───
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },

  // ─── Date range button ───
  dateRangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dateRangeText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // ─── Big earnings ───
  bigEarningsContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  bigEarnings: {
    fontSize: 46,
    fontWeight: "700",
    letterSpacing: -1,
  },
  bigEarningsSub: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  // ─── Filter pills ───
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterPill: {
    paddingHorizontal: Spacing["2xl"] + 4,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ─── Chart ───
  chartContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  chartMaxLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartMaxLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: Spacing.sm,
  },
  chartDashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 0.5,
    borderStyle: "dashed",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    paddingTop: 8,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: 26,
    borderRadius: 5,
    marginBottom: Spacing.sm,
    minHeight: 4,
  },
  chartBarDayNum: {
    fontSize: 13,
    fontWeight: "600",
  },
  chartBarLabel: {
    fontSize: 10,
    marginTop: 2,
  },

  // ─── Stats row ───
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  // ─── Period cards ───
  periodRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  periodCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  periodValue: {
    fontSize: 22,
    fontWeight: "700",
  },

  // ─── Section headers ───
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeaderTotal: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ─── Trip card ───
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  tripLeft: {
    width: 50,
  },
  tripTime: {
    fontSize: 12,
    fontWeight: "500",
  },
  tripCenter: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  tripRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  tripDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  tripAddr: {
    fontSize: 12,
    flex: 1,
  },
  tripRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  tripFare: {
    fontSize: 14,
    fontWeight: "700",
  },
  tripRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tripRatingText: {
    fontSize: 11,
  },

  // ─── Empty ───
  emptyContainer: {
    alignItems: "center",
    paddingTop: Spacing["3xl"],
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
  },

  // ═══ Month Picker Modal ═══
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthPickerCard: {
    width: SCREEN_WIDTH - 48,
    maxHeight: 420,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  monthPickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  monthPickerYear: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  monthList: {
    maxHeight: 260,
  },
  monthItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  monthItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  monthCloseBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  monthCloseBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // ═══ Trip Detail Modal ═══
  tripDetailCard: {
    width: SCREEN_WIDTH - 32,
    maxHeight: "85%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  tripDetailHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  tripDetailCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  tripDetailTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  tripDetailDate: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },

  tripDetailFareCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  tripDetailFareLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  tripDetailFareAmount: {
    fontSize: 38,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  tripDetailFareBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  tripDetailFareBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  tripDetailSectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  tripDetailRouteCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  tripDetailRouteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.xs,
  },
  tripDetailRouteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
    marginTop: 4,
  },
  tripDetailRouteLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  tripDetailRouteAddr: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  tripDetailRouteLine: {
    width: 1,
    height: 16,
    marginLeft: 4.5,
    marginVertical: 2,
  },

  tripDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tripDetailGridItem: {
    width: (SCREEN_WIDTH - 32 - Spacing.xl * 2 - Spacing.sm) / 2,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  tripDetailGridValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  tripDetailGridLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  tripDetailCloseBtn: {
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  tripDetailCloseBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
});
