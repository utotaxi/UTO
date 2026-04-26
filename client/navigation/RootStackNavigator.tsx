// //client/navigator/rootstacknavigator.tsx 
// import React from "react";
// import { ActivityIndicator, View, StyleSheet } from "react-native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import WelcomeScreen from "@/screens/auth/WelcomeScreen";
// import SignInScreen from "@/screens/auth/SignInScreen";
// import SignUpScreen from "@/screens/auth/SignUpScreen";
// import RiderTabNavigator from "@/navigation/RiderTabNavigator";
// import DriverTabNavigator from "@/navigation/DriverTabNavigator";
// import RideTrackingScreen from "@/screens/rider/RideTrackingScreen";
// import SettingsScreen from "@/screens/SettingsScreen";
// import { useScreenOptions } from "@/hooks/useScreenOptions";
// import { useAuth } from "@/context/AuthContext";
// import { useMode } from "@/context/ModeContext";
// import { useTheme } from "@/hooks/useTheme";
// import { UTOColors } from "@/constants/theme";

// export type RootStackParamList = {
//   Welcome: undefined;
//   SignIn: { role?: string };
//   SignUp: { role?: string };
//   Main: undefined;
//   RideTracking: undefined;
//   Settings: undefined;
// };

// const Stack = createNativeStackNavigator<RootStackParamList>();

// function MainNavigator() {
//   const { currentMode } = useMode();

//   return currentMode === "rider" ? <RiderTabNavigator /> : <DriverTabNavigator />;
// }

// export default function RootStackNavigator() {
//   const screenOptions = useScreenOptions();
//   const { isAuthenticated, isLoading: authLoading } = useAuth();
//   const { isLoading: modeLoading } = useMode();
//   const { theme } = useTheme();

//   if (authLoading || modeLoading) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: "#000000" }]}>
//         <ActivityIndicator size="large" color={UTOColors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Stack.Navigator screenOptions={screenOptions}>
//       {!isAuthenticated ? (
//         <>
//           <Stack.Screen
//             name="Welcome"
//             component={WelcomeScreen}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="SignIn"
//             component={SignInScreen}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="SignUp"
//             component={SignUpScreen}
//             options={{ headerShown: false }}
//           />
//         </>
//       ) : (
//         <>
//           <Stack.Screen
//             name="Main"
//             component={MainNavigator}
//             options={{ headerShown: false }}
//           />
//           <Stack.Screen
//             name="RideTracking"
//             component={RideTrackingScreen}
//             options={{
//               headerTitle: "Your Ride",
//               presentation: "card",
//             }}
//           />
//           <Stack.Screen
//             name="Settings"
//             component={SettingsScreen}
//             options={{
//               headerTitle: "Settings",
//               presentation: "modal",
//             }}
//           />
//         </>
//       )}
//     </Stack.Navigator>
//   );
// }

// const styles = StyleSheet.create({
//   loadingContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
// });

//client/navigation/RootStackNavigator.tsx 
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "@/screens/auth/WelcomeScreen";
import SignInScreen from "@/screens/auth/SignInScreen";
import SignUpScreen from "@/screens/auth/SignUpScreen";
import ResetPasswordScreen from "@/screens/auth/ResetPasswordScreen";
import RiderTabNavigator from "@/navigation/RiderTabNavigator";
import DriverTabNavigator from "@/navigation/DriverTabNavigator";
import RideRequestScreen from "@/screens/rider/RideRequestScreen";
import LaterRideScreen from "@/screens/rider/LaterRideScreen";
import RideTrackingScreen from "@/screens/rider/RideTrackingScreen";
import WalletScreen from "@/screens/rider/WalletScreen";
import RiderProfileScreen from "@/screens/rider/RiderProfileScreen";
import RiderNotificationsScreen from "@/screens/rider/RiderNotificationsScreen";
import RiderSafetyScreen from "@/screens/rider/RiderSafetyScreen";
import RiderSavedPlacesScreen from "@/screens/rider/RiderSavedPlacesScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { useMode } from "@/context/ModeContext";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors } from "@/constants/theme";
import TermsScreen from "@/screens/legal/TermsScreen";
import TaxInformationScreen from "@/screens/driver/TaxInformationScreen";
import TaxSettingsScreen from "@/screens/driver/TaxSettingsScreen";
import TaxInvoicesScreen from "@/screens/driver/TaxInvoicesScreen";
import TaxSummariesScreen from "@/screens/driver/TaxSummariesScreen";
import AboutScreen from "@/screens/legal/AboutScreen";
import AirportBookingScreen from "@/screens/rider/AirportBookingScreen";

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: { role?: string };
  SignUp: { role?: string };
  ResetPassword: { email?: string };
  Terms: { tab?: "passenger" | "driver" | "privacy" } | undefined;
  About: undefined;
  Main: undefined;
  RideRequest: { type?: string } | undefined;
  LaterRide: undefined;
  AirportBooking: undefined;
  RideTracking: undefined;
  Settings: undefined;
  Wallet: undefined;
  RiderProfile: undefined;
  RiderNotifications: undefined;
  RiderSafety: undefined;
  RiderSavedPlaces: undefined;
  TaxInformation: undefined;
  TaxSettings: undefined;
  TaxInvoices: undefined;
  TaxSummaries: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const { currentMode } = useMode();

  return currentMode === "rider" ? <RiderTabNavigator /> : <DriverTabNavigator />;
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: modeLoading } = useMode();
  const { theme } = useTheme();

  if (authLoading || modeLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#000000" }]}>
        <ActivityIndicator size="large" color={UTOColors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Group screenOptions={{ animation: 'fade' }}>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group screenOptions={{ animation: 'fade' }}>
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RideRequest"
            component={RideRequestScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="LaterRide"
            component={LaterRideScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="RideTracking"
            component={RideTrackingScreen}
            options={{
              headerTitle: "Your Ride",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              headerTitle: "Settings",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="RiderProfile"
            component={RiderProfileScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="RiderNotifications"
            component={RiderNotificationsScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="RiderSafety"
            component={RiderSafetyScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="RiderSavedPlaces"
            component={RiderSavedPlacesScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="AirportBooking"
            component={AirportBookingScreen}
            options={{ headerShown: false, presentation: "card" }}
          />
          <Stack.Screen
            name="TaxInformation"
            component={TaxInformationScreen}
            options={{ headerTitle: "Tax information", presentation: "card" }}
          />
          <Stack.Screen
            name="TaxSettings"
            component={TaxSettingsScreen}
            options={{ headerTitle: "Tax settings", presentation: "card" }}
          />
          <Stack.Screen
            name="TaxInvoices"
            component={TaxInvoicesScreen}
            options={{ headerTitle: "Tax invoices", presentation: "card" }}
          />
          <Stack.Screen
            name="TaxSummaries"
            component={TaxSummariesScreen}
            options={{ headerTitle: "Tax summaries", presentation: "card" }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
