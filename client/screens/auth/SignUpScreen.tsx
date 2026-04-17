import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { useMode, UserRole } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Checkbox component ───────────────────────────────────────────────────────
interface CheckboxRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  linkLabel: string;
  onLinkPress: () => void;
  testID?: string;
}

function CheckboxRow({ checked, onToggle, label, linkLabel, onLinkPress, testID }: CheckboxRowProps) {
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow} testID={testID}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <MaterialIcons name="check" size={14} color="#000000" />}
      </View>
      <ThemedText style={styles.checkboxLabel}>
        {label}{" "}
        <ThemedText style={styles.checkboxLink} onPress={onLinkPress}>
          {linkLabel}
        </ThemedText>
      </ThemedText>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SignUpScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { setUserRole } = useMode();

  const selectedRole = (route.params?.role as UserRole) || "rider";
  const isDriver = selectedRole === "driver";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Role-specific consent checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const canSubmit = acceptedTerms && acceptedPrivacy;

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      setError("Please fill in all core fields");
      return;
    }

    if (isDriver && (!vehicleType || !vehicleMake || !vehicleModel || !licensePlate)) {
      setError("Please fill in all vehicle details");
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError("Please accept the Terms & Conditions and Privacy Policy to continue");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      const driverDetails = isDriver
        ? { vehicleType, vehicleMake, vehicleModel, licensePlate }
        : undefined;

      await signUp(fullName, email, password, selectedRole, driverDetails);
      setUserRole(isDriver ? "driver" : "rider");
    } catch (err: any) {
      // Extract server error message if available (e.g. "User already exists")
      const message =
        err?.message?.includes("409") || err?.message?.toLowerCase().includes("already exists")
          ? "An account with this email already exists. Please sign in."
          : err?.message
          ? err.message.replace(/^\d+:\s*/, "") // strip leading HTTP status codes like "409: "
          : "Sign up failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openTerms = () => {
    navigation.navigate("Terms", {
      tab: isDriver ? "driver" : "passenger",
    });
  };

  const openPrivacy = () => {
    navigation.navigate("Terms", { tab: "privacy" });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#000000", "#1A1A1A", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>

          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.logoContainer}
          >
            <Image
              source={require("../../../assets/images/uto-logo.jpg")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.headerSection}
          >
            <ThemedText style={styles.title}>
              Create {isDriver ? "Driver" : "Rider"} Account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your details to get started
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.form}
          >
            {/* Name */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#6B7280"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  testID="input-name"
                />
              </View>
            </View>

            {/* Email */}
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
                  autoComplete="email"
                  testID="input-email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="input-password"
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

            {/* Vehicle Details (Drivers Only) */}
            {isDriver && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ gap: Spacing.lg }}>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Vehicle Make</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather name="truck" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Toyota"
                      placeholderTextColor="#6B7280"
                      value={vehicleMake}
                      onChangeText={setVehicleMake}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Vehicle Model</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather name="disc" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Prius"
                      placeholderTextColor="#6B7280"
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Vehicle Type</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather name="box" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Economy, XL"
                      placeholderTextColor="#6B7280"
                      value={vehicleType}
                      onChangeText={setVehicleType}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>License Plate</ThemedText>
                  <View style={styles.inputWrapper}>
                    <Feather name="hash" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. XXX-123"
                      placeholderTextColor="#6B7280"
                      value={licensePlate}
                      onChangeText={setLicensePlate}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── T&C Consent (role-specific) ── */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.consentBox}>
              <View style={styles.consentHeader}>
                <MaterialIcons name="gavel" size={16} color={UTOColors.primary} />
                <ThemedText style={styles.consentTitle}>
                  {isDriver ? "Driver Agreement" : "Passenger Agreement"}
                </ThemedText>
              </View>

              <CheckboxRow
                checked={acceptedTerms}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAcceptedTerms((v) => !v);
                }}
                label={`I have read and agree to the`}
                linkLabel={isDriver ? "Driver Terms & Conditions" : "Passenger Terms & Conditions"}
                onLinkPress={openTerms}
                testID="checkbox-terms"
              />

              <CheckboxRow
                checked={acceptedPrivacy}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAcceptedPrivacy((v) => !v);
                }}
                label="I have read and agree to the"
                linkLabel="Privacy Policy"
                onLinkPress={openPrivacy}
                testID="checkbox-privacy"
              />

              {!canSubmit && (
                <View style={styles.consentWarning}>
                  <MaterialIcons name="info-outline" size={14} color="#9CA3AF" />
                  <ThemedText style={styles.consentWarningText}>
                    You must accept both to create an account
                  </ThemedText>
                </View>
              )}
            </Animated.View>

            {error ? (
              <Animated.View entering={FadeIn}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </Animated.View>
            ) : null}

            <AnimatedPressable
              onPress={handleSignUp}
              onPressIn={() => canSubmit && (buttonScale.value = withSpring(0.98))}
              onPressOut={() => (buttonScale.value = withSpring(1))}
              disabled={isLoading || !canSubmit}
              style={[
                styles.signUpButton,
                buttonAnimatedStyle,
                !canSubmit && styles.signUpButtonDisabled,
              ]}
              testID="btn-create-account"
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <ThemedText style={[styles.signUpButtonText, !canSubmit && styles.signUpButtonTextDisabled]}>
                  Create Account
                </ThemedText>
              )}
            </AnimatedPressable>

            <Pressable
              onPress={() => navigation.navigate("SignIn", { role: selectedRole })}
              style={styles.signInLink}
            >
              <ThemedText style={styles.signInText}>
                Already have an account?{" "}
                <ThemedText style={styles.signInLinkText}>Sign in</ThemedText>
              </ThemedText>
            </Pressable>
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logo: {
    width: 200,
    height: 80,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 24,
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
  // ── Consent box ──
  consentBox: {
    backgroundColor: "#111111",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  consentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: UTOColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#444444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: UTOColors.primary,
    borderColor: UTOColors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  checkboxLink: {
    color: UTOColors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  consentWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#1F1F1F",
  },
  consentWarningText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: UTOColors.error,
    textAlign: "center",
  },
  signUpButton: {
    height: 56,
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  signUpButtonDisabled: {
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#333333",
  },
  signUpButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  signUpButtonTextDisabled: {
    color: "#555555",
  },
  signInLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  signInText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  signInLinkText: {
    color: UTOColors.primary,
    fontWeight: "600",
  },
});
