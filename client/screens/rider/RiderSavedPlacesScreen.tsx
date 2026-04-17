// client/screens/rider/RiderSavedPlacesScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  userId?: string;
  latitude?: number;
  longitude?: number;
}

export default function RiderSavedPlacesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [editName, setEditName] = useState("");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Load places from server
  const loadPlaces = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;
    if (showRefresh) setIsRefreshing(true);

    try {
      const serverPlaces = await api.savedPlaces.getAll(user.id);
      setPlaces(serverPlaces || []);
    } catch (err) {
      console.error("Failed to load saved places:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  // Determine which places are "home" or "work" by name convention
  const getPlaceType = (name: string): "home" | "work" | "custom" => {
    const lower = name.toLowerCase();
    if (lower === "home") return "home";
    if (lower === "work") return "work";
    return "custom";
  };

  const getPlaceIcon = (name: string): keyof typeof MaterialIcons.glyphMap => {
    const type = getPlaceType(name);
    if (type === "home") return "home";
    if (type === "work") return "work";
    return "place";
  };

  const getPlaceColor = (name: string): string => {
    const type = getPlaceType(name);
    if (type === "home") return "#10B981";
    if (type === "work") return "#3B82F6";
    return UTOColors.primary;
  };

  // Edit a place
  const handleEditPlace = (place: SavedPlace) => {
    setEditingPlace(place);
    setEditAddress(place.address || "");
    setEditName(place.name || "");
  };

  const handleSaveEdit = async () => {
    if (!editingPlace) return;
    if (!editAddress.trim()) {
      Alert.alert("Address Required", "Please enter an address.");
      return;
    }

    setIsSaving(true);
    try {
      // Use the api helper - throws on failure
      await api.savedPlaces.update(editingPlace.id, {
        name: editName.trim() || editingPlace.name,
        address: editAddress.trim(),
      });

      // Update local state
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === editingPlace.id
            ? { ...p, address: editAddress.trim(), name: editName.trim() || p.name }
            : p
        )
      );
      setEditingPlace(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Failed to update saved place:", err);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a place
  const handleDeletePlace = (place: SavedPlace) => {
    Alert.alert("Remove Place", `Remove "${place.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await api.savedPlaces.delete(place.id);
            if (success) {
              setPlaces((prev) => prev.filter((p) => p.id !== place.id));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              Alert.alert("Error", "Failed to remove place.");
            }
          } catch {
            Alert.alert("Error", "Failed to remove place.");
          }
        },
      },
    ]);
  };

  // Add new place
  const handleAddPlace = async () => {
    if (!newName.trim()) {
      Alert.alert("Name Required", "Please enter a name for this place.");
      return;
    }
    if (!newAddress.trim()) {
      Alert.alert("Address Required", "Please enter an address.");
      return;
    }
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const created = await api.savedPlaces.create({
        userId: user.id,
        name: newName.trim(),
        address: newAddress.trim(),
      });

      if (created) {
        setPlaces((prev) => [...prev, created]);
        setShowAddModal(false);
        setNewName("");
        setNewAddress("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error("Failed to create");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to save place. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick add Home/Work if not present
  const hasHome = places.some((p) => p.name.toLowerCase() === "home");
  const hasWork = places.some((p) => p.name.toLowerCase() === "work");

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, alignItems: "center" }]}>
        <ActivityIndicator size="large" color={UTOColors.primary} />
        <ThemedText style={{ color: "#6B7280", marginTop: 12 }}>Loading saved places…</ThemedText>
      </View>
    );
  }

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
        <ThemedText style={styles.headerTitle}>Saved Places</ThemedText>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
        >
          <MaterialIcons name="add" size={24} color={UTOColors.primary} />
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPlaces(true)}
            tintColor={UTOColors.primary}
          />
        }
      >
        {/* Quick add Home/Work if missing */}
        {(!hasHome || !hasWork) && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.section}
          >
            <ThemedText style={styles.sectionTitle}>QUICK ADD</ThemedText>
            <View style={styles.quickAddRow}>
              {!hasHome && (
                <Pressable
                  onPress={() => {
                    setNewName("Home");
                    setNewAddress("");
                    setShowAddModal(true);
                  }}
                  style={[styles.quickAddBtn, { borderColor: "#10B98140" }]}
                >
                  <MaterialIcons name="home" size={20} color="#10B981" />
                  <ThemedText style={[styles.quickAddText, { color: "#10B981" }]}>Add Home</ThemedText>
                </Pressable>
              )}
              {!hasWork && (
                <Pressable
                  onPress={() => {
                    setNewName("Work");
                    setNewAddress("");
                    setShowAddModal(true);
                  }}
                  style={[styles.quickAddBtn, { borderColor: "#3B82F640" }]}
                >
                  <MaterialIcons name="work" size={20} color="#3B82F6" />
                  <ThemedText style={[styles.quickAddText, { color: "#3B82F6" }]}>Add Work</ThemedText>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* All Saved Places */}
        {places.length > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.section}
          >
            <ThemedText style={styles.sectionTitle}>YOUR PLACES</ThemedText>
            <View style={styles.sectionCard}>
              {places.map((place, index) => (
                <Pressable
                  key={place.id}
                  onPress={() => handleEditPlace(place)}
                  style={({ pressed }) => [
                    styles.placeItem,
                    index < places.length - 1 && styles.placeBorder,
                    { backgroundColor: pressed ? "#2A2A2A" : "transparent" },
                  ]}
                >
                  <View
                    style={[
                      styles.placeIconContainer,
                      { backgroundColor: getPlaceColor(place.name) + "20" },
                    ]}
                  >
                    <MaterialIcons
                      name={getPlaceIcon(place.name)}
                      size={22}
                      color={getPlaceColor(place.name)}
                    />
                  </View>
                  <View style={styles.placeContent}>
                    <ThemedText style={styles.placeName}>{place.name}</ThemedText>
                    <ThemedText style={styles.placeAddress}>
                      {place.address || "Tap to add address"}
                    </ThemedText>
                  </View>
                  {getPlaceType(place.name) === "custom" ? (
                    <Pressable
                      onPress={() => handleDeletePlace(place)}
                      style={styles.deletePlaceButton}
                      hitSlop={10}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                    </Pressable>
                  ) : (
                    <MaterialIcons name="edit" size={18} color="#6B7280" />
                  )}
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.emptyState}
          >
            <MaterialIcons name="place" size={48} color="#333333" />
            <ThemedText style={styles.emptyTitle}>No saved places yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Add your favourite places for faster ride booking
            </ThemedText>
          </Animated.View>
        )}

        {/* Add Place CTA */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.section}
        >
          <Pressable
            onPress={() => {
              setNewName("");
              setNewAddress("");
              setShowAddModal(true);
            }}
            style={styles.addPlaceButton}
          >
            <MaterialIcons name="add-circle-outline" size={22} color={UTOColors.primary} />
            <ThemedText style={styles.addPlaceText}>Add a New Place</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={!!editingPlace}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingPlace(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackground} onPress={() => setEditingPlace(null)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Edit {editingPlace?.name}</ThemedText>

            {getPlaceType(editingPlace?.name || "") === "custom" && (
              <>
                <ThemedText style={styles.modalLabel}>Name</ThemedText>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Place name"
                  placeholderTextColor="#555555"
                  autoCapitalize="words"
                />
              </>
            )}

            <ThemedText style={styles.modalLabel}>Address</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Enter full address"
              placeholderTextColor="#555555"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingPlace(null)} style={styles.modalCancelBtn}>
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={[styles.modalSaveBtn, isSaving && { opacity: 0.5 }]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <ThemedText style={styles.modalSaveText}>Save</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackground} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Add New Place</ThemedText>

            <ThemedText style={styles.modalLabel}>Name</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Gym, School, Mum's house"
              placeholderTextColor="#555555"
              autoCapitalize="words"
              autoFocus={!newName}
            />

            <ThemedText style={styles.modalLabel}>Address</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Enter full address"
              placeholderTextColor="#555555"
              autoFocus={!!newName}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => { setShowAddModal(false); setNewName(""); setNewAddress(""); }} style={styles.modalCancelBtn}>
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddPlace}
                style={[styles.modalSaveBtn, isSaving && { opacity: 0.5 }]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <ThemedText style={styles.modalSaveText}>Add Place</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  scrollContent: { paddingTop: Spacing.lg },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    color: "#6B7280", fontSize: 13, fontWeight: "600",
    letterSpacing: 1, marginBottom: Spacing.md,
  },
  sectionCard: {
    backgroundColor: "#1A1A1A", borderRadius: BorderRadius.lg, overflow: "hidden",
  },
  // Quick Add
  quickAddRow: { flexDirection: "row", gap: Spacing.md },
  quickAddBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1A1A1A", borderRadius: BorderRadius.lg,
    paddingVertical: 14, gap: Spacing.sm,
    borderWidth: 1, borderColor: "#333333",
  },
  quickAddText: { fontSize: 14, fontWeight: "600" },
  // Place item
  placeItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, paddingHorizontal: Spacing.md,
  },
  placeBorder: { borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  placeIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#333333", alignItems: "center", justifyContent: "center",
    marginRight: Spacing.md,
  },
  placeContent: { flex: 1 },
  placeName: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  placeAddress: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  deletePlaceButton: { padding: 8 },
  // Empty
  emptyState: {
    alignItems: "center", paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { color: "#6B7280", fontSize: 18, fontWeight: "600", marginTop: Spacing.md },
  emptySubtitle: { color: "#555555", fontSize: 14, textAlign: "center", marginTop: Spacing.sm },
  // Add place
  addPlaceButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1A1A1A", borderRadius: BorderRadius.lg,
    paddingVertical: 16, gap: Spacing.sm,
    borderWidth: 1, borderColor: UTOColors.primary + "30", borderStyle: "dashed",
  },
  addPlaceText: { color: UTOColors.primary, fontSize: 15, fontWeight: "600" },
  // Modals
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#333333", alignSelf: "center", marginBottom: Spacing.xl,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: Spacing.xl },
  modalLabel: { color: "#9CA3AF", fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: "#2A2A2A", borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    color: "#FFFFFF", fontSize: 16,
    borderWidth: 1, borderColor: "#333333",
  },
  modalActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: "#333333",
    borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: "center",
  },
  modalCancelText: { color: "#9CA3AF", fontSize: 16, fontWeight: "600" },
  modalSaveBtn: {
    flex: 1, backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: "center",
  },
  modalSaveText: { color: "#000000", fontSize: 16, fontWeight: "700" },
});
