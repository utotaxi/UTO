// //client/navigation/DriverTabNavigator.tsx
// import React from "react";
// import { Platform, StyleSheet } from "react-native";
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { Feather } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";

// import DriverHomeScreen from "@/screens/driver/DriverHomeScreen";
// import EarningsScreen from "@/screens/driver/EarningsScreen";
// import DriverAccountScreen from "@/screens/driver/DriverAccountScreen";
// import { HeaderTitle } from "@/components/HeaderTitle";
// import { ModeBadge } from "@/components/ModeBadge";
// import { useTheme } from "@/hooks/useTheme";
// import { useScreenOptions } from "@/hooks/useScreenOptions";
// import { UTOColors } from "@/constants/theme";

// export type DriverTabParamList = {
//   DriveTab: undefined;
//   EarningsTab: undefined;
//   AccountTab: undefined;
// };

// const Tab = createBottomTabNavigator<DriverTabParamList>();

// const DriveStack = createNativeStackNavigator();
// const EarningsStack = createNativeStackNavigator();
// const AccountStack = createNativeStackNavigator();

// function DriveStackNavigator({ navigation }: any) {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <DriveStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <DriveStack.Screen
//         name="DriverHome"
//         component={DriverHomeScreen}
//         options={{
//           headerTitle: () => <HeaderTitle />,
//           headerRight: () => (
//             <ModeBadge onPress={() => navigation.navigate("Settings")} />
//           ),
//         }}
//       />
//     </DriveStack.Navigator>
//   );
// }

// function EarningsStackNavigator() {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <EarningsStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <EarningsStack.Screen
//         name="Earnings"
//         component={EarningsScreen}
//         options={{ headerTitle: "Earnings" }}
//       />
//     </EarningsStack.Navigator>
//   );
// }

// function AccountStackNavigator({ navigation }: any) {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <AccountStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <AccountStack.Screen
//         name="Account"
//         component={DriverAccountScreen}
//         options={{ headerTitle: "Account" }}
//       />
//     </AccountStack.Navigator>
//   );
// }

// export default function DriverTabNavigator() {
//   const { theme, isDark } = useTheme();

//   return (
//     <Tab.Navigator
//       initialRouteName="DriveTab"
//       screenOptions={{
//         tabBarActiveTintColor: UTOColors.primary,
//         tabBarInactiveTintColor: isDark ? "#6B7280" : theme.tabIconDefault,
//         tabBarStyle: {
//           position: "absolute",
//           backgroundColor: Platform.select({
//             ios: "transparent",
//             android: isDark ? "#000000" : theme.backgroundRoot,
//           }),
//           borderTopWidth: 0,
//           elevation: 0,
//         },
//         tabBarBackground: () =>
//           Platform.OS === "ios" ? (
//             <BlurView
//               intensity={100}
//               tint={isDark ? "dark" : "light"}
//               style={StyleSheet.absoluteFill}
//             />
//           ) : null,
//         headerShown: false,
//       }}
//     >
//       <Tab.Screen
//         name="DriveTab"
//         component={DriveStackNavigator}
//         options={{
//           title: "Drive",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="navigation" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="EarningsTab"
//         component={EarningsStackNavigator}
//         options={{
//           title: "Earnings",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="dollar-sign" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="AccountTab"
//         component={AccountStackNavigator}
//         options={{
//           title: "Account",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="user" size={size} color={color} />
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   );
// }


import React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import DriverHomeScreen from "@/screens/driver/DriverHomeScreen";
import EarningsScreen from "@/screens/driver/EarningsScreen";
import DriverAccountScreen from "@/screens/driver/DriverAccountScreen";
import DriverMarketplaceScreen from "@/screens/driver/DriverMarketplaceScreen";
import DriverDocumentsScreen from "@/screens/driver/DriverDocumentsScreen";
import DriverSafetyScreen from "@/screens/driver/DriverSafetyScreen";
import DriverNotificationsScreen from "@/screens/driver/DriverNotificationsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ModeBadge } from "@/components/ModeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { UTOColors } from "@/constants/theme";

export type DriverTabParamList = {
  DriveTab: undefined;
  EarningsTab: undefined;
  AccountTab: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

const DriveStack = createNativeStackNavigator();
const EarningsStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

function DriveStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions();
  const { isDark } = useTheme();

  return (
    <DriveStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <DriveStack.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{
          headerShown: false,
        }}
      />
    </DriveStack.Navigator>
  );
}

function EarningsStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });
  const { isDark } = useTheme();

  return (
    <EarningsStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <EarningsStack.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ headerShown: false }}
      />
    </EarningsStack.Navigator>
  );
}

function AccountStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions({ transparent: false });
  const { isDark } = useTheme();

  return (
    <AccountStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <AccountStack.Screen
        name="Account"
        component={DriverAccountScreen}
        options={{ headerTitle: "Account" }}
      />
      <AccountStack.Screen
        name="Marketplace"
        component={DriverMarketplaceScreen}
        options={{ headerShown: false }}
      />
      <AccountStack.Screen
        name="DriverDocuments"
        component={DriverDocumentsScreen}
        options={{ headerTitle: "Vehicle Documents" }}
      />
      <AccountStack.Screen
        name="DriverSafety"
        component={DriverSafetyScreen}
        options={{ headerTitle: "Safety" }}
      />
      <AccountStack.Screen
        name="DriverNotifications"
        component={DriverNotificationsScreen}
        options={{ headerTitle: "Notifications" }}
      />
    </AccountStack.Navigator>
  );
}

export default function DriverTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="DriveTab"
      screenOptions={{
        tabBarActiveTintColor: UTOColors.primary,
        tabBarInactiveTintColor: isDark ? "#6B7280" : theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: isDark ? "#000000" : theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="DriveTab"
        component={DriveStackNavigator}
        options={{
          title: "Drive",
          tabBarIcon: ({ color, size }) => (
            <Feather name="navigation" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsStackNavigator}
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, fontWeight: "700", color }}>£</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStackNavigator}
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
