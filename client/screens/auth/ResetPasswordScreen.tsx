import React, { useCallback, useEffect, useState } from "react";
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
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

type ResetStep = "email" | "otp" | "password";

function extractParam(url: string, key: string): string | null {
  const hash = url.split("#")[1] || "";
  const query = url.split("?")[1]?.split("#")[0] || "";
  const params = new URLSearchParams(hash || query);
  return params.get(key);
}

export default function ResetPasswordScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState(route.params?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleRecoveryLink = useCallback(async (url: string) => {
    const accessToken = extractParam(url, "access_token");
    const type = extractParam(url, "type");
    if (!accessToken) return;
    if (type && type !== "recovery") return;

    setIsLoading(true);
    setError("");
    try {
      const res = await api.auth.confirmRecovery(accessToken);
      if (res.success) {
        if (res.email) setEmail(res.email);
        setStep("password");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(res.message || "Invalid or expired recovery link");
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired recovery link");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleRecoveryLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) void handleRecoveryLink(url);
    });
    return () => sub.remove();
  }, [handleRecoveryLink]);

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please provide an email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      setEmail(normalizedEmail);
      const redirectTo = Linking.createURL("auth/reset-password");
      const res = await api.auth.sendResetOtp(normalizedEmail, redirectTo);
      if (res.success) {
        setStep("otp");
      } else {
        setError(
          (res as any).error || res.message || "Failed to send verification code",
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError("Please enter the verification code");
      return;
    }
    if (otp.length < 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      const res = await api.auth.verifyResetOtp(email, otp);
      if (res.success) {
        setStep("password");
      } else {
        setError(res.message || "Invalid verification code");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
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
      const res = await api.auth.resetPassword(email, newPassword);
      if (res.success) {
        Alert.alert("Success", "Your password has been reset successfully.", [
          { text: "Log In", onPress: () => navigation.goBack() },
        ]);
      } else {
        setError("Failed to reset password");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("email");
      setError("");
    } else if (step === "password") {
      setStep("otp");
      setError("");
    } else {
      navigation.goBack();
    }
  };

  const getHeaderTitle = () => {
    switch (step) {
      case "email":
        return "Reset Password";
      case "otp":
        return "Verify Email";
      case "password":
        return "Set New Password";
    }
  };

  const getHeaderSubtitle = () => {
    switch (step) {
      case "email":
        return "Enter your email address. We'll send a verification code (or link) via Supabase Auth.";
      case "otp":
        return `Enter the 6-digit code from the email sent to ${email}. If you opened the reset link instead, you can skip ahead automatically.`;
      case "password":
        return "Choose a strong password to secure your account.";
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerSection}>
            <ThemedText style={styles.title}>{getHeaderTitle()}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {getHeaderSubtitle()}
            </ThemedText>
          </View>

          <View style={styles.form}>
            {step === "email" && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Email address</ThemedText>
                <View style={styles.inputWrapper}>
                  <Feather
                    name="mail"
                    size={20}
                    color="#6B7280"
                    style={styles.inputIcon}
                  />
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
            )}

            {step === "otp" && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>
                  Verification Code
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <Feather
                    name="shield"
                    size={20}
                    color="#6B7280"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#6B7280"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
            )}

            {step === "password" && (
              <>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                    Email address
                  </ThemedText>
                  <View style={[styles.inputWrapper, { opacity: 0.6 }]}>
                    <Feather
                      name="mail"
                      size={20}
                      color="#6B7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={email}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                    New Password
                  </ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#6B7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor="#6B7280"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                    Re-enter Password
                  </ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#6B7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor="#6B7280"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <Pressable
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={styles.eyeButton}
                    >
                      <Feather
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {error ? (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            ) : null}

            <Pressable
              onPress={
                step === "email"
                  ? handleSendOtp
                  : step === "otp"
                    ? handleVerifyOtp
                    : handleResetPassword
              }
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                { opacity: pressed || isLoading ? 0.7 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  {step === "email"
                    ? "Verify Email"
                    : step === "otp"
                      ? "Verify & Continue"
                      : "Reset Password"}
                </ThemedText>
              )}
            </Pressable>

            {step === "otp" && (
              <Pressable
                onPress={handleSendOtp}
                disabled={isLoading}
                style={styles.resendButton}
              >
                <ThemedText style={styles.resendText}>
                  Didn't receive the email?{" "}
                  <ThemedText style={styles.resendLink}>Resend Code</ThemedText>
                </ThemedText>
              </Pressable>
            )}
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
  resendButton: {
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  resendText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  resendLink: {
    color: UTOColors.primary,
    fontWeight: "600",
  },
});
