
import React from "react";
import { Platform, StyleSheet, View, Pressable, Image, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { useStripe } from "@stripe/stripe-react-native";
import { api } from "@/lib/api";
import { Alert } from "react-native";

interface MenuItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeColor?: string;
}

function MenuItem({ icon, title, subtitle, onPress, showBadge, badgeColor }: MenuItemProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: pressed ? "#1A1A1A" : "transparent" },
      ]}
    >
      <View style={styles.menuIconContainer}>
        <MaterialIcons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.menuTextContainer}>
        <ThemedText style={styles.menuTitle}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={styles.menuSubtitle}>{subtitle}</ThemedText>
        ) : null}
      </View>
      {showBadge ? (
        <View style={[styles.badge, { backgroundColor: badgeColor || UTOColors.primary }]} />
      ) : null}
      <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
    </Pressable>
  );
}

export default function RiderAccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, signOut } = useAuth();
  const { userRole } = useMode();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isAddingCard, setIsAddingCard] = React.useState(false);
  const [savedCards, setSavedCards] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetchSavedCards();
  }, [user?.id]);

  const fetchSavedCards = async () => {
    if (!user?.id) return;
    try {
      const cards = await api.payments.getSavedCards(user.id);
      setSavedCards(cards || []);
    } catch (err) {
      console.warn("Failed to fetch saved cards:", err);
    }
  };

  const handleDeleteCard = (cardId: string, last4: string) => {
    Alert.alert(
      "Remove Card",
      `Are you sure you want to remove card ending in ${last4}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.payments.deleteSavedCard(cardId);
              if (res && res.success) {
                setSavedCards(prev => prev.filter(c => c.id !== cardId));
              } else {
                Alert.alert("Error", "Failed to remove card. Please try again.");
              }
            } catch (error) {
              console.error("Delete card error:", error);
              Alert.alert("Error", "Failed to remove card.");
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const handleAddCard = async () => {
    if (isAddingCard) return;
    setIsAddingCard(true);

    try {
      // 1. We ask the server to create a Setup Intent
      if (!user?.id) throw new Error("User disconnected");
      const { clientSecret } = await api.payments.setupIntent(user.id);
      
      if (!clientSecret) throw new Error("Failed to initialize setup intent");

      // 2. Initialize the Payment Sheet for saving a card (setup mode)
      const initProps = await initPaymentSheet({
        merchantDisplayName: "UTO Rides",
        setupIntentClientSecret: clientSecret,
      });

      if (initProps.error) {
        Alert.alert("Setup Error", initProps.error.message);
        setIsAddingCard(false);
        return;
      }

      // 3. Present the sheet
      const presentProps = await presentPaymentSheet();
      if (presentProps.error) {
        if (presentProps.error.code !== "Canceled") {
          Alert.alert("Error adding card", presentProps.error.message);
        }
      } else {
        Alert.alert("Success", "Your card was successfully added for future rides!");
        fetchSavedCards(); // Refresh cards when one is successfully added
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to setup card. Please try again.");
    } finally {
      setIsAddingCard(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <ThemedText style={styles.headerTitle}>Account</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.profileSection}>
        <View style={styles.avatar}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
          ) : (
            <MaterialIcons name="person" size={32} color="#6B7280" />
          )}
        </View>
        <View style={styles.profileInfo}>
          <ThemedText style={styles.userName}>{user?.fullName || "User"}</ThemedText>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={14} color={UTOColors.primary} />
            <ThemedText style={styles.rating}>
              {user?.rating?.toFixed(1) || "5.0"} rating
            </ThemedText>
          </View>
        </View>
        <Pressable style={styles.editButton} onPress={() => navigation.navigate("RiderProfile")}>
          <MaterialIcons name="edit" size={18} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
        <ThemedText style={styles.sectionTitle}>My Rides</ThemedText>
        <View style={styles.sectionContent}>
          <MenuItem
            icon="event"
            title="Scheduled Rides"
            subtitle="View your upcoming planned rides"
            onPress={() => navigation.navigate('ScheduledRides')}
            showBadge
            badgeColor={UTOColors.primary}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>
        <View style={styles.sectionContent}>
          <MenuItem
            icon="person"
            title="Profile"
            subtitle="Edit your personal information"
            onPress={() => navigation.navigate("RiderProfile")}
          />
          <MenuItem
            icon="account-balance-wallet"
            title="Wallet"
            subtitle={`Balance: £${user?.walletBalance?.toFixed(2) || '0.00'}`}
            onPress={() => navigation.navigate("Wallet")}
            showBadge={Boolean(user?.walletBalance && user.walletBalance > 0)}
            badgeColor="#10B981"
          />
          <MenuItem
            icon="payment"
            title="Payment Methods"
            subtitle="Manage your payment options and add cards"
            onPress={handleAddCard}
          />
          {savedCards.length > 0 && (
            <View style={styles.savedCardsContainer}>
              {savedCards.map((card, idx) => (
                <View key={card.id || idx} style={styles.savedCardItem}>
                  <View style={styles.savedCardItemLeft}>
                    <MaterialIcons name="credit-card" size={20} color="#6B7280" />
                    <ThemedText style={styles.savedCardText}>
                      {card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "Card"} •••• {card.last4}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => handleDeleteCard(card.id, card.last4)} style={styles.deleteCardButton}>
                    <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <MenuItem
            icon="place"
            title="Saved Places"
            subtitle="Home, Work, and more"
            onPress={() => navigation.navigate("RiderSavedPlaces")}
          />
        </View>
      </Animated.View>


      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
        <View style={styles.sectionContent}>
          <MenuItem
            icon="notifications"
            title="Notifications"
            subtitle="Manage your alerts"
            onPress={() => navigation.navigate("RiderNotifications")}
          />
          <MenuItem
            icon="security"
            title="Safety"
            subtitle="Safety features and settings"
            onPress={() => navigation.navigate("RiderSafety")}
          />
          {userRole === "both" ? (
            <MenuItem
              icon="swap-horiz"
              title="Switch to Driver"
              subtitle="Start earning with UTO"
              onPress={() => navigation.navigate("Settings")}
              showBadge
              badgeColor={UTOColors.primary}
            />
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Support</ThemedText>
        <View style={styles.sectionContent}>
          <MenuItem
            icon="help"
            title="Help"
            subtitle="Get support for your trips"
            onPress={() => {
              Alert.alert(
                "Help & Support",
                "Need assistance? Contact our support team.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Call Support",
                    onPress: () => Linking.openURL("tel:+4407596266901"),
                  },
                ]
              );
            }}
          />

          <MenuItem
            icon="info"
            title="About UTO"
            onPress={() => navigation.navigate("About")}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.logoutSection}>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <ThemedText style={styles.logoutText}>Log out</ThemedText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rating: {
    color: "#6B7280",
    fontSize: 14,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  menuSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Platform.select({ ios: Spacing.xl, android: 100 }), // Extra bottom margin for Android
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "500",
  },
  savedCardsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  savedCardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  savedCardItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  savedCardText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteCardButton: {
    padding: Spacing.xs,
  },
});
