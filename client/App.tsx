import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";
import { defineBackgroundLocationTask, setupAppStateListener } from '@/lib/backgroundLocation';

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { StripeProvider } from "@stripe/stripe-react-native";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { navigationRef } from "@/navigation/navigationRef";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ModeProvider, useMode } from "@/context/ModeContext";
import { RideProvider } from "@/context/RideContext";
import { DriverProvider } from "@/context/DriverContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useNotifications, setNotificationAppMode } from "@/hooks/useNotifications";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function loadIcons() {
      try {
        console.log("Starting icon loading...");
        await Font.loadAsync(MaterialIcons.font);
        console.log("Icons loaded successfully");
        setIconsLoaded(true);
      } catch (e) {
        console.error("Failed to load icon font:", e);
        setIconsLoaded(true);
      }
    }
    loadIcons();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && iconsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, iconsLoaded]);

  useEffect(() => {
    // Initialize background location task
    defineBackgroundLocationTask();
    
    // Setup app state listener
    const unsubscribeAppState = setupAppStateListener();
    
    return () => {
      unsubscribeAppState();
    };
  }, []);

  // Guard conditions AFTER all hooks are defined
  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!iconsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <ThemeProvider>
                <AuthProvider>
                  <ModeProvider>
                    <RideProvider>
                      <DriverProvider>
                        {/* AppShell reads isAuthenticated and passes it as resetKey to ErrorBoundary
                            so any transient error during auth transitions is auto-cleared */}
                        <AppShell />
                      </DriverProvider>
                    </RideProvider>
                  </ModeProvider>
                </AuthProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}

/**
 * Sits inside AuthProvider so it can read isAuthenticated and pass it
 * as resetKey to ErrorBoundary. This ensures the boundary auto-resets
 * whenever the user logs in or out, preventing a transient nav-teardown
 * error from permanently blocking the UI.
 */
function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const { currentMode } = useMode();

  // Single push registration + listeners for the whole app (not per screen).
  useNotifications(user?.id);

  useEffect(() => {
    setNotificationAppMode(currentMode === "driver" ? "driver" : "rider");
  }, [currentMode]);

  return (
    <ErrorBoundary resetKey={isAuthenticated}>
      <NavigationContainer ref={navigationRef}>
        <RootStackNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
