import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const OFFERS = [
  {
    id: "1",
    title: "20% off your first 3 rides",
    description: "New user special offer",
    code: "NEWUTO20",
    expiresAt: "31 Dec 2026",
    type: "percentage",
  },
  {
    id: "2",
    title: "Free ride up to £10",
    description: "Refer a friend and get a free ride",
    code: "REFER10",
    expiresAt: "Ongoing",
    type: "fixed",
  },
  {
    id: "3",
    title: "15% off Airport transfers",
    description: "Valid for all UK airports",
    code: "AIRPORT15",
    expiresAt: "28 Feb 2026",
    type: "percentage",
  },
];

interface OfferCardProps {
  offer: typeof OFFERS[0];
  index: number;
}

function OfferCard({ offer, index }: OfferCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopy = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <View style={styles.offerCard}>
        <View style={styles.offerHeader}>
          <View style={styles.offerIcon}>
            <MaterialIcons
              name={offer.type === "percentage" ? "local-offer" : "card-giftcard"}
              size={24}
              color={UTOColors.primary}
            />
          </View>
          <View style={styles.offerInfo}>
            <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>
            <ThemedText style={styles.offerDescription}>{offer.description}</ThemedText>
          </View>
        </View>

        <View style={styles.offerDetails}>
          <View style={styles.codeContainer}>
            <ThemedText style={styles.codeLabel}>Code:</ThemedText>
            <ThemedText style={styles.codeValue}>{offer.code}</ThemedText>
            <Pressable onPress={handleCopy} style={styles.copyButton}>
              <MaterialIcons name="content-copy" size={16} color={UTOColors.primary} />
            </Pressable>
          </View>
          <ThemedText style={styles.expiryText}>Expires: {offer.expiresAt}</ThemedText>
        </View>

        <Pressable onPress={handlePress} style={styles.applyButton}>
          <ThemedText style={styles.applyButtonText}>Apply offer</ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <ThemedText style={styles.headerTitle}>Offers</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Apply offers at checkout for discounts
          </ThemedText>
        </Animated.View>

        <View style={styles.promoInputContainer}>
          <View style={styles.promoInput}>
            <MaterialIcons name="local-offer" size={20} color="#6B7280" />
            <ThemedText style={styles.promoPlaceholder}>Enter promo code</ThemedText>
          </View>
          <Pressable style={styles.promoApplyButton}>
            <ThemedText style={styles.promoApplyText}>Apply</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.sectionTitle}>Available offers</ThemedText>

        {OFFERS.map((offer, index) => (
          <OfferCard key={offer.id} offer={offer} index={index} />
        ))}

        <View style={styles.emptySpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: Spacing.xl,
  },
  promoInputContainer: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  promoInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  promoPlaceholder: {
    color: "#6B7280",
    fontSize: 15,
  },
  promoApplyButton: {
    backgroundColor: UTOColors.primary,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  promoApplyText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  offerCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  offerHeader: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  offerDescription: {
    color: "#6B7280",
    fontSize: 14,
  },
  offerDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  codeLabel: {
    color: "#6B7280",
    fontSize: 13,
  },
  codeValue: {
    color: UTOColors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  copyButton: {
    padding: 4,
  },
  expiryText: {
    color: "#6B7280",
    fontSize: 13,
  },
  applyButton: {
    backgroundColor: "#333333",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  emptySpace: {
    height: Spacing.xl,
  },
});
