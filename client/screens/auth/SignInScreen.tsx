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
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { useMode, UserRole } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

// Dismiss any lingering browser auth sessions on mount
WebBrowser.maybeCompleteAuthSession();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SignInScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { setUserRole } = useMode();

  const selectedRole = (route.params?.role as UserRole) || "rider";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const buttonScale = useSharedValue(1);
  const googleButtonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const googleButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleButtonScale.value }],
  }));



  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");

    try {
      const success = await signIn(email, password);
      if (success) {
        setUserRole(selectedRole === "driver" ? "driver" : "rider");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGoogleLoading(true);
    setError("");

    try {
      // Build the redirect URI — explicitly pass the scheme so EAS
      // production builds always generate "uto://..." regardless of context
      const redirectUrl = makeRedirectUri({ scheme: "uto" });

      console.log("🔑 Google OAuth: starting, redirectUrl =", redirectUrl);

      // Ask Supabase to generate the Google OAuth URL (PKCE flow)
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account", // Always show Google account picker
          },
        },
      });

      if (oauthError || !data?.url) {
        console.error("🔑 Google OAuth URL error:", oauthError);
        setError("Failed to start Google sign in");
        return;
      }

      // Open the Google sign-in page in an in-app browser
      // (Chrome Custom Tabs on Android / SFSafariViewController on iOS)
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type === "success" && result.url) {
        console.log("🔑 Google OAuth: browser returned success");

        // --- Robust URL parsing ---
        // Hermes (React Native's JS engine) may not handle custom schemes
        // like "uto://" in the URL constructor, so we parse manually.
        const returnedUrlStr = result.url;

        // Check for PKCE auth code in query params
        let code: string | null = null;
        const questionIdx = returnedUrlStr.indexOf("?");
        if (questionIdx !== -1) {
          const queryStr = returnedUrlStr.substring(questionIdx + 1);
          // Strip any fragment from the query portion
          const hashInQuery = queryStr.indexOf("#");
          const cleanQuery = hashInQuery !== -1 ? queryStr.substring(0, hashInQuery) : queryStr;
          const queryParams = new URLSearchParams(cleanQuery);
          code = queryParams.get("code");
        }

        // Check for implicit-flow tokens in fragment
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        const hashIdx = returnedUrlStr.indexOf("#");
        if (hashIdx !== -1) {
          const fragmentParams = new URLSearchParams(
            returnedUrlStr.substring(hashIdx + 1),
          );
          accessToken = fragmentParams.get("access_token");
          refreshToken = fragmentParams.get("refresh_token");
        }

        let userEmail: string | undefined;
        let userFullName: string | undefined;

        if (code) {
          // Exchange the authorization code for a session (PKCE)
          console.log("🔑 Google OAuth: exchanging PKCE code for session");
          const { data: sessionData, error: sessionError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (sessionError || !sessionData?.user?.email) {
            console.error("🔑 Code exchange error:", sessionError);
            setError("Failed to verify Google account");
            return;
          }

          userEmail = sessionData.user.email;
          userFullName =
            sessionData.user.user_metadata?.full_name ||
            sessionData.user.user_metadata?.name;
        } else if (accessToken) {
          // Set session from implicit-flow tokens
          console.log("🔑 Google OAuth: setting session from access token");
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

          if (sessionError || !sessionData?.user?.email) {
            console.error("🔑 Set session error:", sessionError);
            setError("Failed to verify Google account");
            return;
          }

          userEmail = sessionData.user.email;
          userFullName =
            sessionData.user.user_metadata?.full_name ||
            sessionData.user.user_metadata?.name;
        } else {
          console.error("🔑 Google OAuth: no code or token in redirect URL:", returnedUrlStr);
          setError("No authentication credentials received");
          return;
        }

        console.log("🔑 Google OAuth: authenticated as", userEmail);

        // Use the real Google email to create / login the user in the custom
        // users table via the existing server API on Railway
        const success = await signIn(
          userEmail,
          "google",
          true,
          userFullName || userEmail.split("@")[0],
        );

        if (success) {
          setUserRole(selectedRole === "driver" ? "driver" : "rider");
        } else {
          setError("Google sign in failed");
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User closed the browser – no error to show
        console.log("🔑 Google OAuth: user cancelled");
      } else {
        setError("Google sign in was interrupted");
      }
    } catch (err) {
      console.error("🔑 Google OAuth unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp", { role: selectedRole });
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
              Sign in as {selectedRole === "driver" ? "Driver" : "Rider"}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Welcome back! Enter your details
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.form}
          >
            <AnimatedPressable
              onPress={handleGoogleSignIn}
              onPressIn={() => (googleButtonScale.value = withSpring(0.98))}
              onPressOut={() => (googleButtonScale.value = withSpring(1))}
              disabled={isGoogleLoading}
              style={[styles.googleButton, googleButtonAnimatedStyle]}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Image
                    source={{ uri: "https://www.google.com/favicon.ico" }}
                    style={styles.googleIcon}
                  />
                  <ThemedText style={styles.googleButtonText}>
                    Continue with Google
                  </ThemedText>
                </>
              )}
            </AnimatedPressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={styles.dividerLine} />
            </View>

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

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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
              <Pressable onPress={() => navigation.navigate("ResetPassword", { email })} style={{ alignSelf: "flex-end", marginTop: 4 }}>
                <ThemedText style={{ color: UTOColors.primary, fontSize: 13, fontWeight: "500" }}>Forgot password?</ThemedText>
              </Pressable>
            </View>

            {error ? (
              <Animated.View entering={FadeIn}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </Animated.View>
            ) : null}

            <AnimatedPressable
              onPress={handleSignIn}
              onPressIn={() => (buttonScale.value = withSpring(0.98))}
              onPressOut={() => (buttonScale.value = withSpring(1))}
              disabled={isLoading}
              style={[styles.signInButton, buttonAnimatedStyle]}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <ThemedText style={styles.signInButtonText}>Continue</ThemedText>
              )}
            </AnimatedPressable>

            <Pressable onPress={handleSignUp} style={styles.signUpLink}>
              <ThemedText style={styles.signUpText}>
                Don't have an account?{" "}
                <ThemedText style={styles.signUpLinkText}>Sign up</ThemedText>
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333333",
  },
  dividerText: {
    fontSize: 14,
    color: "#6B7280",
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
  signInButton: {
    height: 56,
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  signUpLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  signUpText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  signUpLinkText: {
    color: UTOColors.primary,
    fontWeight: "600",
  },
});
