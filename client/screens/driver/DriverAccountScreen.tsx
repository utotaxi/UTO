// client/screens/driver/DriverAccountScreen.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useDriver, DriverProfile } from "@/context/DriverContext";
import { useMode } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// ── MenuItem ───────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeColor?: string;
  isDanger?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, showBadge, badgeColor, isDanger }: MenuItemProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: pressed ? theme.backgroundDefault : "transparent" },
      ]}
    >
      <View style={[
        styles.menuIconContainer,
        { backgroundColor: isDanger ? UTOColors.error + "20" : theme.backgroundDefault },
      ]}>
        <Feather name={icon} size={20} color={isDanger ? UTOColors.error : theme.text} />
      </View>
      <View style={styles.menuTextContainer}>
        <ThemedText style={[styles.menuTitle, isDanger && { color: UTOColors.error }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {showBadge ? (
        <View style={[styles.badge, { backgroundColor: badgeColor || UTOColors.driver.primary }]} />
      ) : null}
      <Feather name="chevron-right" size={20} color={isDanger ? UTOColors.error : theme.textSecondary} />
    </Pressable>
  );
}

// ── Vehicle Info Modal ─────────────────────────────────────────────────────
function VehicleInfoModal({
  visible,
  onClose,
  currentProfile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  currentProfile: DriverProfile | null;
  onSave: (profile: DriverProfile) => Promise<void>;
}) {
  const [make, setMake] = useState(currentProfile?.vehicleMake || "");
  const [model, setModel] = useState(currentProfile?.vehicleModel || "");
  const [year, setYear] = useState(currentProfile?.vehicleYear?.toString() || "");
  const [color, setColor] = useState(currentProfile?.vehicleColor || "");
  const [plate, setPlate] = useState(currentProfile?.licensePlate || "");
  const [vType, setVType] = useState<"saloon" | "minibus">(
    currentProfile?.vehicleType || "saloon"
  );
  const [saving, setSaving] = useState(false);

  const vehicleTypes: Array<{ key: "saloon" | "minibus"; label: string }> = [
    { key: "saloon", label: "Saloon" },
    { key: "minibus", label: "Minibus" },
  ];

  const handleSave = async () => {
    if (!make.trim() || !model.trim() || !plate.trim()) {
      Alert.alert("Missing Info", "Please enter vehicle make, model, and licence plate.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        vehicleMake: make.trim(),
        vehicleModel: model.trim(),
        vehicleType: vType,
        vehicleYear: parseInt(year) || new Date().getFullYear(),
        vehicleColor: color.trim(),
        licensePlate: plate.trim().toUpperCase(),
        isVerified: currentProfile?.isVerified || false,
      });
      Alert.alert("Saved ✅", "Your vehicle information has been updated.");
      onClose();
    } catch {
      Alert.alert("Error", "Could not save vehicle info. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={ms.container}>
          {/* Header */}
          <View style={ms.header}>
            <Pressable onPress={onClose} style={ms.closeBtn}>
              <Feather name="x" size={22} color="#111827" />
            </Pressable>
            <Text style={ms.title}>Vehicle Information</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
            <Text style={ms.label}>Vehicle Type</Text>
            <View style={ms.typeRow}>
              {vehicleTypes.map((t) => (
                <Pressable
                  key={t.key}
                  style={[ms.typeBtn, vType === t.key && ms.typeBtnActive]}
                  onPress={() => setVType(t.key)}
                >
                  <Text style={[ms.typeBtnText, vType === t.key && ms.typeBtnTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={ms.label}>Make <Text style={ms.req}>*</Text></Text>
            <TextInput
              style={ms.input}
              value={make}
              onChangeText={setMake}
              placeholder="e.g. Toyota"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            <Text style={ms.label}>Model <Text style={ms.req}>*</Text></Text>
            <TextInput
              style={ms.input}
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Camry"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            <View style={ms.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={ms.label}>Year</Text>
                <TextInput
                  style={ms.input}
                  value={year}
                  onChangeText={setYear}
                  placeholder={`${new Date().getFullYear()}`}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={ms.label}>Colour</Text>
                <TextInput
                  style={ms.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="e.g. Black"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Text style={ms.label}>Licence Plate <Text style={ms.req}>*</Text></Text>
            <TextInput
              style={[ms.input, { textTransform: "uppercase" }]}
              value={plate}
              onChangeText={(t) => setPlate(t.toUpperCase())}
              placeholder="e.g. AB12 CDE"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </ScrollView>

          <Pressable style={[ms.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={ms.saveBtnText}>Save Vehicle Info</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function DriverAccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { driverProfile, setDriverProfile, earnings } = useDriver();
  const { userRole } = useMode();
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try { await signOut(); } catch { Alert.alert("Error", "Failed to sign out."); }
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight > 0 ? tabBarHeight + Spacing.xl : insets.bottom + 80,
        }}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: theme.backgroundDefault }]}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Feather name="user" size={32} color={theme.textSecondary} />
            )}
          </View>
          <ThemedText style={styles.userName}>{user?.fullName || "Driver"}</ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Feather name="star" size={16} color={UTOColors.warning} />
              <ThemedText style={styles.statValue}>{earnings.averageRating.toFixed(1)}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <Feather name="navigation" size={16} color={UTOColors.driver.primary} />
              <ThemedText style={styles.statValue}>{earnings.totalTrips} trips</ThemedText>
            </View>
          </View>
          {driverProfile?.isVerified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: UTOColors.success + "20" }]}>
              <Feather name="check-circle" size={14} color={UTOColors.success} />
              <ThemedText style={[styles.verifiedText, { color: UTOColors.success }]}>
                Verified Driver
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Opportunities */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Opportunities
          </ThemedText>
          <MenuItem
            icon="shopping-bag"
            title="Marketplace"
            subtitle="View scheduled rides available to accept"
            onPress={() => navigation.navigate("Marketplace")}
            showBadge
            badgeColor={UTOColors.primary}
          />
        </View>

        {/* Vehicle */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Vehicle
          </ThemedText>
          <MenuItem
            icon="truck"
            title="Vehicle Information"
            subtitle={
              driverProfile?.vehicleMake
                ? `${driverProfile.vehicleMake} ${driverProfile.vehicleModel} · ${driverProfile.licensePlate}`
                : "Tap to add your vehicle"
            }
            onPress={() => setVehicleModalVisible(true)}
          />
          <MenuItem
            icon="file-text"
            title="Documents"
            subtitle="Licence, registration, insurance"
            onPress={() => navigation.navigate("DriverDocuments")}
          />
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Earnings
          </ThemedText>
          <MenuItem icon="dollar-sign" title="Payout Methods" subtitle="Manage how you get paid" onPress={() => { }} />
          <MenuItem icon="bar-chart-2" title="Tax Information" subtitle="View tax documents" onPress={() => navigation.navigate("TaxInformation")} />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Preferences
          </ThemedText>
          <MenuItem icon="bell" title="Notifications" subtitle="Manage ride alerts" onPress={() => navigation.navigate("DriverNotifications")} />
          {userRole === "both" ? (
            <MenuItem
              icon="repeat"
              title="Switch to Rider"
              subtitle="Request rides instead"
              onPress={() => navigation.navigate("Settings")}
              showBadge
              badgeColor={UTOColors.rider.primary}
            />
          ) : null}
        </View>

        {/* Support */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Support
          </ThemedText>
          <MenuItem 
            icon="help-circle" 
            title="Driver Support" 
            subtitle="Get help with driving" 
            onPress={() => {
              Alert.alert(
                "Support",
                "Feel free to call us at +44 07596 266 901",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Call", 
                    onPress: () => Linking.openURL("tel:+4407596266901") 
                  }
                ]
              );
            }} 
          />
          <MenuItem icon="shield" title="Safety" subtitle="Safety resources and tips" onPress={() => navigation.navigate("DriverSafety")} />
          <MenuItem
            icon="info"
            title="About UTO"
            onPress={() => navigation.navigate("About")}
          />
          <MenuItem icon="settings" title="Settings" onPress={() => navigation.navigate("Settings")} />
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <MenuItem icon="log-out" title="Sign Out" onPress={handleSignOut} isDanger />
        </View>

        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: theme.textSecondary }]}>
            UTO Driver v1.0.0
          </ThemedText>
        </View>
      </ScrollView>

      <VehicleInfoModal
        visible={vehicleModalVisible}
        onClose={() => setVehicleModalVisible(false)}
        currentProfile={driverProfile}
        onSave={setDriverProfile}
      />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  body: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 16 },
  req: { color: "#EF4444" },
  input: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#111827", backgroundColor: "#F9FAFB",
  },
  row: { flexDirection: "row" },
  typeRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#D1D5DB",
    alignItems: "center", backgroundColor: "#F9FAFB",
  },
  typeBtnActive: { borderColor: "#FFD000", backgroundColor: "#FFFBEB" },
  typeBtnText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  typeBtnTextActive: { color: "#92610A" },
  saveBtn: {
    margin: 20, backgroundColor: "#FFD000",
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "800", color: "#000" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  userName: { fontSize: 22, fontWeight: "600", marginBottom: Spacing.md },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md },
  stat: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  statValue: { fontSize: 15, fontWeight: "500" },
  statDivider: { width: 1, height: 16, marginHorizontal: Spacing.lg },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, gap: Spacing.xs,
  },
  verifiedText: { fontSize: 13, fontWeight: "600" },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing["2xl"] },
  sectionTitle: {
    fontSize: 13, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md,
  },
  menuIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "500" },
  menuSubtitle: { fontSize: 13, marginTop: 2 },
  badge: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  versionContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  versionText: { fontSize: 12 },
});