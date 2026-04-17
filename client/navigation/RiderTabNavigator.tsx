// // import React from "react";
// // import { Platform, StyleSheet } from "react-native";
// // import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// // import { createNativeStackNavigator } from "@react-navigation/native-stack";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import { BlurView } from "expo-blur";

// // import RiderHomeScreen from "@/screens/rider/RiderHomeScreen";
// // import RideRequestScreen from "@/screens/rider/RideRequestScreen";
// // import ServicesScreen from "@/screens/rider/ServicesScreen";
// // import ActivityScreen from "@/screens/rider/ActivityScreen";
// // import OffersScreen from "@/screens/rider/OffersScreen";
// // import RiderAccountScreen from "@/screens/rider/RiderAccountScreen";
// // import { useTheme } from "@/hooks/useTheme";
// // import { UTOColors } from "@/constants/theme";

// // export type RiderTabParamList = {
// //   HomeTab: undefined;
// //   ServicesTab: undefined;
// //   ActivityTab: undefined;
// //   OffersTab: undefined;
// //   AccountTab: undefined;
// // };

// // const Tab = createBottomTabNavigator<RiderTabParamList>();

// // const HomeStack = createNativeStackNavigator();
// // const ServicesStack = createNativeStackNavigator();
// // const ActivityStack = createNativeStackNavigator();
// // const OffersStack = createNativeStackNavigator();
// // const AccountStack = createNativeStackNavigator();

// // function HomeStackNavigator() {
// //   return (
// //     <HomeStack.Navigator screenOptions={{ headerShown: false }}>
// //       <HomeStack.Screen name="RiderHome" component={RiderHomeScreen} />
// //       <HomeStack.Screen name="RideRequest" component={RideRequestScreen} />
// //     </HomeStack.Navigator>
// //   );
// // }

// // function ServicesStackNavigator() {
// //   return (
// //     <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
// //       <ServicesStack.Screen name="Services" component={ServicesScreen} />
// //       <ServicesStack.Screen name="RideRequest" component={RideRequestScreen} />
// //     </ServicesStack.Navigator>
// //   );
// // }

// // function ActivityStackNavigator() {
// //   return (
// //     <ActivityStack.Navigator screenOptions={{ headerShown: false }}>
// //       <ActivityStack.Screen name="Activity" component={ActivityScreen} />
// //     </ActivityStack.Navigator>
// //   );
// // }

// // function OffersStackNavigator() {
// //   return (
// //     <OffersStack.Navigator screenOptions={{ headerShown: false }}>
// //       <OffersStack.Screen name="Offers" component={OffersScreen} />
// //     </OffersStack.Navigator>
// //   );
// // }

// // function AccountStackNavigator() {
// //   return (
// //     <AccountStack.Navigator screenOptions={{ headerShown: false }}>
// //       <AccountStack.Screen name="Account" component={RiderAccountScreen} />
// //     </AccountStack.Navigator>
// //   );
// // }

// // export default function RiderTabNavigator() {
// //   const { isDark } = useTheme();

// //   return (
// //     <Tab.Navigator
// //       initialRouteName="HomeTab"
// //       screenOptions={{
// //         tabBarActiveTintColor: UTOColors.primary,
// //         tabBarInactiveTintColor: "#6B7280",
// //         tabBarStyle: {
// //           position: "absolute",
// //           backgroundColor: Platform.select({
// //             ios: "transparent",
// //             android: "#000000",
// //           }),
// //           borderTopWidth: 0,
// //           elevation: 8,
// //           height: Platform.select({ ios: 90, android: 75 }),
// //           paddingTop: 10,
// //           paddingBottom: Platform.select({ ios: 30, android: 15 }),
// //         },
// //         tabBarLabelStyle: {
// //           fontSize: 11,
// //           fontWeight: "600",
// //           marginBottom: Platform.select({ ios: 0, android: 5 }),
// //         },
// //         tabBarBackground: () =>
// //           Platform.OS === "ios" ? (
// //             <BlurView
// //               intensity={100}
// //               tint="dark"
// //               style={StyleSheet.absoluteFill}
// //             />
// //           ) : null,
// //         headerShown: false,
// //       }}
// //     >
// //       <Tab.Screen
// //         name="HomeTab"
// //         component={HomeStackNavigator}
// //         options={{
// //           title: "Home",
// //           tabBarIcon: ({ color, size }) => (
// //             <MaterialIcons name="home" size={24} color={color} />
// //           ),
// //         }}
// //       />
// //       <Tab.Screen
// //         name="ServicesTab"
// //         component={ServicesStackNavigator}
// //         options={{
// //           title: "Services",
// //           tabBarIcon: ({ color, size }) => (
// //             <MaterialIcons name="grid-view" size={24} color={color} />
// //           ),
// //         }}
// //       />
// //       <Tab.Screen
// //         name="ActivityTab"
// //         component={ActivityStackNavigator}
// //         options={{
// //           title: "Activity",
// //           tabBarIcon: ({ color, size }) => (
// //             <MaterialIcons name="history" size={24} color={color} />
// //           ),
// //         }}
// //       />
// //       <Tab.Screen
// //         name="OffersTab"
// //         component={OffersStackNavigator}
// //         options={{
// //           title: "Offers",
// //           tabBarIcon: ({ color, size }) => (
// //             <MaterialIcons name="local-offer" size={24} color={color} />
// //           ),
// //         }}
// //       />
// //       <Tab.Screen
// //         name="AccountTab"
// //         component={AccountStackNavigator}
// //         options={{
// //           title: "Account",
// //           tabBarIcon: ({ color, size }) => (
// //             <MaterialIcons name="person" size={24} color={color} />
// //           ),
// //         }}
// //       />
// //     </Tab.Navigator>
// //   );
// // }


// //client/navigation/RiderTabNavigator.tsx
// import React from "react";
// import { Platform, StyleSheet } from "react-native";
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { Feather } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import RiderHomeScreen from "@/screens/rider/RiderHomeScreen";
// import ServicesScreen from "@/screens/rider/ServicesScreen";
// import ActivityScreen from "@/screens/rider/ActivityScreen";
// import AccountScreen from "@/screens/rider/RiderAccountScreen";
// import RideRequestScreen from "@/screens/rider/RideRequestScreen";
// import { HeaderTitle } from "@/components/HeaderTitle";
// import { ModeBadge } from "@/components/ModeBadge";
// import { useTheme } from "@/hooks/useTheme";
// import { useScreenOptions } from "@/hooks/useScreenOptions";
// import { UTOColors } from "@/constants/theme";

// export type RiderTabParamList = {
//   HomeTab: undefined;
//   ServicesTab: undefined;
//   ActivityTab: undefined;
//   AccountTab: undefined;
// };

// const Tab = createBottomTabNavigator<RiderTabParamList>();

// const HomeStack = createNativeStackNavigator();
// const ServicesStack = createNativeStackNavigator();
// const ActivityStack = createNativeStackNavigator();
// const AccountStack = createNativeStackNavigator();

// function HomeStackNavigator({ navigation }: any) {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <HomeStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <HomeStack.Screen
//         name="RiderHome"
//         component={RiderHomeScreen}
//         options={{
//           headerTitle: () => <HeaderTitle />,
//           headerRight: () => (
//             <ModeBadge onPress={() => navigation.navigate("Settings")} />
//           ),
//         }}
//       />
//       <HomeStack.Screen
//         name="RideRequest"
//         component={RideRequestScreen}
//         options={{ headerTitle: "Request a Ride" }}
//       />
//     </HomeStack.Navigator>
//   );
// }

// function ServicesStackNavigator() {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <ServicesStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <ServicesStack.Screen
//         name="Services"
//         component={ServicesScreen}
//         options={{ headerTitle: "Services" }}
//       />
//     </ServicesStack.Navigator>
//   );
// }

// function ActivityStackNavigator() {
//   const screenOptions = useScreenOptions();
//   const { isDark } = useTheme();

//   return (
//     <ActivityStack.Navigator 
//       screenOptions={{
//         ...screenOptions,
//         headerStyle: {
//           backgroundColor: isDark ? "#000000" : "#FFFFFF",
//         },
//         headerTintColor: isDark ? "#FFFFFF" : "#000000",
//       }}
//     >
//       <ActivityStack.Screen
//         name="Activity"
//         component={ActivityScreen}
//         options={{ headerTitle: "Activity" }}
//       />
//     </ActivityStack.Navigator>
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
//         component={AccountScreen}
//         options={{ headerTitle: "Account" }}
//       />
//     </AccountStack.Navigator>
//   );
// }

// export default function RiderTabNavigator() {
//   const { theme, isDark } = useTheme();
//   const insets = useSafeAreaInsets();

//   return (
//     <Tab.Navigator
//       initialRouteName="HomeTab"
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
//           height: 60 + insets.bottom, // Add safe area bottom padding
//           paddingBottom: insets.bottom, // Ensure content is above nav buttons
//           paddingTop: 8,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: "500",
//           marginBottom: 4,
//         },
//         tabBarIconStyle: {
//           marginTop: 4,
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
//         name="HomeTab"
//         component={HomeStackNavigator}
//         options={{
//           title: "Home",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="home" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="ServicesTab"
//         component={ServicesStackNavigator}
//         options={{
//           title: "Services",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="grid" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="ActivityTab"
//         component={ActivityStackNavigator}
//         options={{
//           title: "Activity",
//           tabBarIcon: ({ color, size }) => (
//             <Feather name="clock" size={size} color={color} />
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

//client/navigation/RiderTabNavigator.tsx
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RiderHomeScreen from "@/screens/rider/RiderHomeScreen";
import ServicesScreen from "@/screens/rider/ServicesScreen";
import ActivityScreen from "@/screens/rider/ActivityScreen";
import AccountScreen from "@/screens/rider/RiderAccountScreen";
import RideRequestScreen from "@/screens/rider/RideRequestScreen";
import RiderScheduledRidesScreen from "@/screens/rider/RiderScheduledRidesScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ModeBadge } from "@/components/ModeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { UTOColors } from "@/constants/theme";

export type RiderTabParamList = {
  HomeTab: undefined;
  ServicesTab: undefined;
  ActivityTab: undefined;
  AccountTab: undefined;
};

export type HomeStackParamList = {
  RiderHome: undefined;
  RideRequest: { type?: string } | undefined;
};

const Tab = createBottomTabNavigator<RiderTabParamList>();

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ServicesStack = createNativeStackNavigator();
const ActivityStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

function HomeStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions();
  const { isDark } = useTheme();

  return (
    <HomeStack.Navigator 
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <HomeStack.Screen
        name="RiderHome"
        component={RiderHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerRight: () => (
            <ModeBadge onPress={() => navigation.navigate("Settings")} />
          ),
        }}
      />
      <HomeStack.Screen
        name="RideRequest"
        component={RideRequestScreen}
        options={{ 
          headerTitle: "Request a Ride",
          headerBackTitle: "Back",
        }}
      />
    </HomeStack.Navigator>
  );
}

function ServicesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isDark } = useTheme();

  return (
    <ServicesStack.Navigator 
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <ServicesStack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ headerTitle: "Services" }}
      />
    </ServicesStack.Navigator>
  );
}

function ActivityStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isDark } = useTheme();

  return (
    <ActivityStack.Navigator 
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#FFFFFF" : "#000000",
      }}
    >
      <ActivityStack.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ headerTitle: "Activity" }}
      />
    </ActivityStack.Navigator>
  );
}

function AccountStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions();
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
        component={AccountScreen}
        options={{ headerTitle: "Account" }}
      />
      <AccountStack.Screen
        name="ScheduledRides"
        component={RiderScheduledRidesScreen}
        options={{ headerShown: false }}
      />
    </AccountStack.Navigator>
  );
}

export default function RiderTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
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
          height: 60 + insets.bottom, // Add safe area bottom padding
          paddingBottom: insets.bottom, // Ensure content is above nav buttons
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
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
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStackNavigator}
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={ActivityStackNavigator}
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
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