import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

export default function ResetPasswordScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  
  // Initialize with email passed from SignInScreen, if any
  const [email, setEmail] = useState(route.params?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please provide an email address");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      await api.auth.resetPassword(email, newPassword);
      Alert.alert("Success", "Your password has been reset successfully.", [
        { text: "Log In", onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerSection}>
            <ThemedText style={styles.title}>Reset Password</ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your new password below to reset it.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Email address</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>New Password</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#6B7280"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Re-enter Password</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#6B7280"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

            <Pressable
              onPress={handleResetPassword}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                { opacity: pressed || isLoading ? 0.7 : 1 }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Reset Password</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    marginLeft: -Spacing.sm,
  },
  headerSection: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  errorText: {
    fontSize: 14,
    color: UTOColors.error,
    textAlign: "center",
  },
  submitButton: {
    height: 56,
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
});
