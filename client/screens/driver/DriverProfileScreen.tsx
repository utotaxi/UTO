// client/screens/driver/DriverProfileScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

export default function DriverProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, updateProfile, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Editable fields mirror server data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileBase64, setProfileBase64] = useState("");

  // Snapshot of last-saved state so Cancel restores properly
  const savedRef = useRef({
    fullName: "",
    phone: "",
    email: "",
    profileImage: "",
  });

  useEffect(() => {
    (async () => {
      try {
        if (user?.id) {
          const serverUser = await api.users.get(user.id);
          if (serverUser) {
            setFullName(serverUser.fullName || "");
            setPhone(serverUser.phone || "");
            setEmail(serverUser.email || "");
            setProfileImage(serverUser.profileImage || "");
            savedRef.current = {
              fullName: serverUser.fullName || "",
              phone: serverUser.phone || "",
              email: serverUser.email || "",
              profileImage: serverUser.profileImage || "",
            };
          }
        }
      } catch {
        setFullName(user?.fullName || "");
        setPhone(user?.phone || "");
        setEmail(user?.email || "");
        setProfileImage(user?.profileImage || "");
        savedRef.current = {
          fullName: user?.fullName || "",
          phone: user?.phone || "",
          email: user?.email || "",
          profileImage: user?.profileImage || "",
        };
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id]);

  const processImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        setProfileBase64(result.assets[0].base64);
      }
      if (!isEditing) setIsEditing(true);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take a selfie.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
        cameraType: ImagePicker.CameraType.front,
      });
      processImageResult(result);
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Failed to open camera.");
    }
  };

  const handlePickLibrary = async () => {
    try {
      const permResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to change your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      processImageResult(result);
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to open image picker.");
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      "Profile Picture",
      "Choose an option to update your profile picture",
      [
        { text: "Take a Selfie", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handlePickLibrary },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Name Required", "Please enter your full name.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let finalProfileImage = profileImage;

      if (profileBase64 && profileImage !== savedRef.current.profileImage) {
        if (user?.id) {
          finalProfileImage = await api.users.uploadProfileImage(
            user.id,
            profileBase64,
            "image/jpeg",
          );
        }
      }

      const updates: any = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };

      if (
        finalProfileImage &&
        finalProfileImage !== savedRef.current.profileImage
      ) {
        updates.profileImage = finalProfileImage;
      }

      if (user?.id) {
        const serverUser = await api.users.update(user.id, updates);
        console.log("✅ Profile saved to server:", serverUser?.fullName);
      }

      await updateProfile(updates);

      savedRef.current = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        profileImage: finalProfileImage,
      };

      setProfileImage(finalProfileImage);
      setProfileBase64("");
      setIsEditing(false);
      Alert.alert(
        "Profile Updated",
        "Your profile has been saved successfully.",
      );
    } catch (err: any) {
      console.error("Profile save error:", err);
      Alert.alert(
        "Error",
        err?.message ||
          "Failed to save profile. Please check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(savedRef.current.fullName);
    setPhone(savedRef.current.phone);
    setEmail(savedRef.current.email);
    setProfileImage(savedRef.current.profileImage);
    setProfileBase64("");
    setIsEditing(false);
  };

  const hasChanges = () => {
    return (
      fullName.trim() !== savedRef.current.fullName ||
      phone.trim() !== savedRef.current.phone ||
      email.trim() !== savedRef.current.email ||
      profileImage !== savedRef.current.profileImage
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + 60,
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={UTOColors.primary} />
        <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
          Loading profile…
        </ThemedText>
      </View>
    );
  }

  const fields = [
    {
      label: "Full Name",
      value: fullName,
      key: "fullName",
      icon: "user" as const,
      editable: true,
      placeholder: "Enter your full name",
    },
    {
      label: "Phone Number",
      value: phone,
      key: "phone",
      icon: "phone" as const,
      editable: true,
      keyboardType: "phone-pad" as const,
      placeholder: "Enter your phone number",
    },
    {
      label: "Email",
      value: email,
      key: "email",
      icon: "mail" as const,
      editable: true,
      keyboardType: "email-address" as const,
      placeholder: "Your email address",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[
            styles.header,
            { paddingTop: insets.top + 8, borderBottomColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isEditing && hasChanges()) {
                Alert.alert("Discard Changes?", "You have unsaved changes.", [
                  { text: "Keep Editing", style: "cancel" },
                  {
                    text: "Discard",
                    style: "destructive",
                    onPress: handleCancel,
                  },
                ]);
              } else if (isEditing) {
                handleCancel();
              } else {
                navigation.goBack();
              }
            }}
            style={[
              styles.backButton,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather
              name={isEditing ? "x" : "arrow-left"}
              size={24}
              color={theme.text}
            />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Profile
          </ThemedText>
          {isEditing ? (
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !hasChanges()}
              style={[
                styles.saveButton,
                (isSaving || !hasChanges()) && { opacity: 0.5 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsEditing(true);
              }}
              style={[styles.editButton, { borderColor: theme.border }]}
            >
              <ThemedText style={styles.editButtonText}>Edit</ThemedText>
            </Pressable>
          )}
        </Animated.View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.avatarSection}
          >
            <Pressable
              onPress={isEditing ? handlePickImage : undefined}
              style={styles.avatarWrapper}
            >
              <View
                style={[styles.avatarContainer, { borderColor: theme.border }]}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Feather
                      name="user"
                      size={48}
                      color={theme.textSecondary}
                    />
                  </View>
                )}
              </View>
              {isEditing && (
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={16} color="#000000" />
                </View>
              )}
            </Pressable>
            <ThemedText style={[styles.avatarName, { color: theme.text }]}>
              {fullName || "Driver"}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color={UTOColors.primary} />
              <ThemedText
                style={[styles.ratingText, { color: theme.textSecondary }]}
              >
                {user?.rating?.toFixed(1) || "5.0"} • {user?.totalRides || 0}{" "}
                rides
              </ThemedText>
            </View>
          </Animated.View>

          {/* Fields */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.fieldsSection}
          >
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              PERSONAL INFORMATION
            </ThemedText>
            <View
              style={[
                styles.fieldsCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              {fields.map((field, index) => (
                <View
                  key={field.key}
                  style={[
                    styles.fieldRow,
                    index < fields.length - 1 && [
                      styles.fieldBorder,
                      { borderBottomColor: theme.border },
                    ],
                  ]}
                >
                  <View
                    style={[
                      styles.fieldIconContainer,
                      { backgroundColor: theme.backgroundRoot },
                    ]}
                  >
                    <Feather name={field.icon} size={20} color={theme.text} />
                  </View>
                  <View style={styles.fieldContent}>
                    <ThemedText
                      style={[
                        styles.fieldLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {field.label}
                    </ThemedText>
                    {isEditing && field.editable ? (
                      <TextInput
                        style={[
                          styles.fieldInput,
                          {
                            color: theme.text,
                            borderBottomColor: theme.border,
                          },
                        ]}
                        value={field.value}
                        onChangeText={(text) => {
                          if (field.key === "fullName") setFullName(text);
                          if (field.key === "phone") setPhone(text);
                          if (field.key === "email") setEmail(text);
                        }}
                        placeholder={field.placeholder}
                        placeholderTextColor={theme.textSecondary}
                        keyboardType={field.keyboardType || "default"}
                        autoCapitalize={
                          field.key === "fullName" ? "words" : "none"
                        }
                      />
                    ) : (
                      <ThemedText
                        style={[styles.fieldValue, { color: theme.text }]}
                      >
                        {field.value || (
                          <ThemedText
                            style={[
                              styles.fieldPlaceholder,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {field.placeholder}
                          </ThemedText>
                        )}
                      </ThemedText>
                    )}
                  </View>
                  {!field.editable && (
                    <View
                      style={[
                        styles.lockedBadge,
                        { backgroundColor: theme.backgroundRoot },
                      ]}
                    >
                      <Feather
                        name="lock"
                        size={14}
                        color={theme.textSecondary}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Account Info */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.fieldsSection}
          >
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              ACCOUNT
            </ThemedText>
            <View
              style={[
                styles.fieldsCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View
                style={[
                  styles.fieldRow,
                  styles.fieldBorder,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.fieldIconContainer,
                    { backgroundColor: theme.backgroundRoot },
                  ]}
                >
                  <Feather name="hash" size={20} color={theme.text} />
                </View>
                <View style={styles.fieldContent}>
                  <ThemedText
                    style={[styles.fieldLabel, { color: theme.textSecondary }]}
                  >
                    User ID
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.fieldValue,
                      { fontSize: 12, color: theme.textSecondary },
                    ]}
                  >
                    {user?.id || "—"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View
                  style={[
                    styles.fieldIconContainer,
                    { backgroundColor: theme.backgroundRoot },
                  ]}
                >
                  <Feather name="shield" size={20} color={theme.text} />
                </View>
                <View style={styles.fieldContent}>
                  <ThemedText
                    style={[styles.fieldLabel, { color: theme.textSecondary }]}
                  >
                    Account Type
                  </ThemedText>
                  <View style={styles.roleBadge}>
                    <ThemedText style={styles.roleBadgeText}>
                      {user?.role === "both"
                        ? "Rider & Driver"
                        : user?.role === "driver"
                          ? "Driver"
                          : "Rider"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.fieldsSection}
          >
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Are you sure you want to delete your account? This action cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          if (user?.id) {
                            await api.users.deleteAccount(user.id);
                          }
                          Alert.alert(
                            "Account Deleted",
                            "Your account has been successfully deleted.",
                            [
                              {
                                text: "OK",
                                onPress: () => signOut(),
                              },
                            ],
                          );
                        } catch (err: any) {
                          Alert.alert(
                            "Error",
                            err?.message ||
                              "Failed to delete account. Please try again.",
                          );
                        }
                      },
                    },
                  ],
                );
              }}
              style={styles.deleteButton}
            >
              <Feather name="trash-2" size={20} color="#EF4444" />
              <ThemedText style={styles.deleteButtonText}>
                Delete Account
              </ThemedText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  saveButton: {
    backgroundColor: UTOColors.driver.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  saveButtonText: { color: "#000000", fontSize: 14, fontWeight: "700" },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  editButtonText: {
    color: UTOColors.driver.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: { paddingTop: Spacing.xl },
  avatarSection: { alignItems: "center", marginBottom: Spacing["3xl"] },
  avatarWrapper: { position: "relative", marginBottom: Spacing.md },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UTOColors.driver.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#000000",
  },
  avatarName: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 14, fontWeight: "500" },
  fieldsSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  fieldsCard: { borderRadius: BorderRadius.lg, overflow: "hidden" },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  fieldBorder: { borderBottomWidth: 1 },
  fieldIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  fieldValue: { fontSize: 16, fontWeight: "500" },
  fieldPlaceholder: { fontSize: 16, fontStyle: "italic" },
  fieldInput: {
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  lockedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: UTOColors.driver.primary + "20",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  roleBadgeText: {
    color: UTOColors.driver.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  deleteButtonText: { color: "#EF4444", fontSize: 15, fontWeight: "500" },
});
