// // // //client/screens/settingscreen.tsx


// // // import React from "react";
// // // import {
// // //   StyleSheet,
// // //   View,
// // //   Pressable,
// // //   ScrollView,
// // //   Dimensions,
// // // } from "react-native";
// // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
// // // import { MaterialIcons } from "@expo/vector-icons";
// // // import Animated, { FadeInDown } from "react-native-reanimated";
// // // import * as Haptics from "expo-haptics";

// // // import { ThemedText } from "@/components/ThemedText";
// // // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // // const { width } = Dimensions.get("window");

// // // const RIDE_SERVICES = [
// // //   { id: "trip", name: "Trip", icon: "directions-car", description: "Everyday rides" },
// // //   { id: "reserve", name: "Reserve", icon: "event", description: "Schedule ahead" },
// // //   { id: "intercity", name: "Intercity", icon: "map", description: "Long distance travel" },
// // //   { id: "airport", name: "Airport", icon: "flight", description: "Airport transfers" },
// // // ];

// // // const DELIVERY_SERVICES = [
// // //   { id: "package", name: "Package", icon: "inventory", description: "Send packages" },
// // //   { id: "food", name: "Food", icon: "fast-food", description: "Food delivery" },
// // // ];

// // // const OTHER_SERVICES = [
// // //   { id: "rentals", name: "Rentals", icon: "vpn-key", description: "Rent a car" },
// // //   { id: "corporate", name: "Business", icon: "business", description: "Corporate travel" },
// // // ];

// // // interface ServiceItemProps {
// // //   id: string;
// // //   name: string;
// // //   icon: keyof typeof MaterialIcons.glyphMap;
// // //   description: string;
// // //   onPress: () => void;
// // //   index: number;
// // // }

// // // function ServiceItem({ id, name, icon, description, onPress, index }: ServiceItemProps) {
// // //   return (
// // //     <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
// // //       <Pressable
// // //         onPress={() => {
// // //           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // //           onPress();
// // //         }}
// // //         style={styles.serviceItem}
// // //       >
// // //         <View style={styles.serviceIconContainer}>
// // //           <MaterialIcons name={icon} size={24} color={UTOColors.primary} />
// // //         </View>
// // //         <View style={styles.serviceInfo}>
// // //           <ThemedText style={styles.serviceName}>{name}</ThemedText>
// // //           <ThemedText style={styles.serviceDescription}>{description}</ThemedText>
// // //         </View>
// // //         <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
// // //       </Pressable>
// // //     </Animated.View>
// // //   );
// // // }

// // // export default function ServicesScreen({ navigation }: any) {
// // //   const insets = useSafeAreaInsets();
// // //   const tabBarHeight = useBottomTabBarHeight();

// // //   const handleServicePress = (serviceId: string) => {
// // //     if (serviceId === "trip" || serviceId === "airport" || serviceId === "intercity") {
// // //       navigation.navigate("RideRequest");
// // //     }
// // //   };

// // //   return (
// // //     <View style={styles.container}>
// // //       <ScrollView
// // //         style={styles.scrollView}
// // //         contentContainerStyle={[
// // //           styles.scrollContent,
// // //           { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
// // //         ]}
// // //         showsVerticalScrollIndicator={false}
// // //       >
// // //         <Animated.View entering={FadeInDown.duration(400)}>
// // //           <ThemedText style={styles.headerTitle}>Services</ThemedText>
// // //         </Animated.View>

// // //         <View style={styles.section}>
// // //           <ThemedText style={styles.sectionTitle}>Ride</ThemedText>
// // //           <View style={styles.sectionContent}>
// // //             {RIDE_SERVICES.map((service, index) => (
// // //               <ServiceItem
// // //                 key={service.id}
// // //                 {...service}
// // //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// // //                 onPress={() => handleServicePress(service.id)}
// // //                 index={index}
// // //               />
// // //             ))}
// // //           </View>
// // //         </View>

// // //         <View style={styles.section}>
// // //           <ThemedText style={styles.sectionTitle}>Delivery</ThemedText>
// // //           <View style={styles.sectionContent}>
// // //             {DELIVERY_SERVICES.map((service, index) => (
// // //               <ServiceItem
// // //                 key={service.id}
// // //                 {...service}
// // //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// // //                 onPress={() => handleServicePress(service.id)}
// // //                 index={index + RIDE_SERVICES.length}
// // //               />
// // //             ))}
// // //           </View>
// // //         </View>

// // //         <View style={styles.section}>
// // //           <ThemedText style={styles.sectionTitle}>More</ThemedText>
// // //           <View style={styles.sectionContent}>
// // //             {OTHER_SERVICES.map((service, index) => (
// // //               <ServiceItem
// // //                 key={service.id}
// // //                 {...service}
// // //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// // //                 onPress={() => handleServicePress(service.id)}
// // //                 index={index + RIDE_SERVICES.length + DELIVERY_SERVICES.length}
// // //               />
// // //             ))}
// // //           </View>
// // //         </View>
// // //       </ScrollView>
// // //     </View>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //     backgroundColor: "#000000",
// // //   },
// // //   scrollView: {
// // //     flex: 1,
// // //   },
// // //   scrollContent: {
// // //     paddingHorizontal: Spacing.lg,
// // //   },
// // //   headerTitle: {
// // //     color: "#FFFFFF",
// // //     fontSize: 28,
// // //     fontWeight: "700",
// // //     marginBottom: Spacing.xl,
// // //   },
// // //   section: {
// // //     marginBottom: Spacing.xl,
// // //   },
// // //   sectionTitle: {
// // //     color: "#9CA3AF",
// // //     fontSize: 14,
// // //     fontWeight: "600",
// // //     textTransform: "uppercase",
// // //     letterSpacing: 1,
// // //     marginBottom: Spacing.md,
// // //   },
// // //   sectionContent: {
// // //     backgroundColor: "#1A1A1A",
// // //     borderRadius: BorderRadius.lg,
// // //     overflow: "hidden",
// // //   },
// // //   serviceItem: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     paddingVertical: Spacing.md,
// // //     paddingHorizontal: Spacing.md,
// // //     borderBottomWidth: 1,
// // //     borderBottomColor: "#333333",
// // //   },
// // //   serviceIconContainer: {
// // //     width: 48,
// // //     height: 48,
// // //     borderRadius: BorderRadius.lg,
// // //     backgroundColor: "#333333",
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     marginRight: Spacing.md,
// // //   },
// // //   serviceInfo: {
// // //     flex: 1,
// // //   },
// // //   serviceName: {
// // //     color: "#FFFFFF",
// // //     fontSize: 16,
// // //     fontWeight: "600",
// // //     marginBottom: 2,
// // //   },
// // //   serviceDescription: {
// // //     color: "#6B7280",
// // //     fontSize: 14,
// // //   },
// // // });

// // //client/screens/settingscreen.tsx


// // import React from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   Pressable,
// //   ScrollView,
// //   Dimensions,
// // } from "react-native";
// // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import Animated, { FadeInDown } from "react-native-reanimated";
// // import * as Haptics from "expo-haptics";

// // import { ThemedText } from "@/components/ThemedText";
// // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // const { width } = Dimensions.get("window");

// // const RIDE_SERVICES = [
// //   { id: "trip", name: "Trip", icon: "directions-car", description: "Everyday rides" },
// //   { id: "reserve", name: "Reserve", icon: "event", description: "Schedule ahead" },
// //   { id: "intercity", name: "Intercity", icon: "map", description: "Long distance travel" },
// //   { id: "airport", name: "Airport", icon: "flight", description: "Airport transfers" },
// // ];

// // const DELIVERY_SERVICES = [
// //   { id: "package", name: "Package", icon: "inventory", description: "Send packages" },
// //   { id: "food", name: "Food", icon: "fast-food", description: "Food delivery" },
// // ];

// // const OTHER_SERVICES = [
// //   { id: "rentals", name: "Rentals", icon: "vpn-key", description: "Rent a car" },
// //   { id: "corporate", name: "Business", icon: "business", description: "Corporate travel" },
// // ];

// // interface ServiceItemProps {
// //   id: string;
// //   name: string;
// //   icon: keyof typeof MaterialIcons.glyphMap;
// //   description: string;
// //   onPress: () => void;
// //   index: number;
// // }

// // function ServiceItem({ id, name, icon, description, onPress, index }: ServiceItemProps) {
// //   return (
// //     <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
// //       <Pressable
// //         onPress={() => {
// //           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// //           onPress();
// //         }}
// //         style={styles.serviceItem}
// //       >
// //         <View style={styles.serviceIconContainer}>
// //           <MaterialIcons name={icon} size={24} color={UTOColors.primary} />
// //         </View>
// //         <View style={styles.serviceInfo}>
// //           <ThemedText style={styles.serviceName}>{name}</ThemedText>
// //           <ThemedText style={styles.serviceDescription}>{description}</ThemedText>
// //         </View>
// //         <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
// //       </Pressable>
// //     </Animated.View>
// //   );
// // }

// // export default function ServicesScreen({ navigation }: any) {
// //   const insets = useSafeAreaInsets();

// //   const handleServicePress = (serviceId: string) => {
// //     if (serviceId === "trip" || serviceId === "airport" || serviceId === "intercity") {
// //       navigation.navigate("RideRequest");
// //     }
// //   };

// //   return (
// //     <View style={styles.container}>
// //       <ScrollView
// //         style={styles.scrollView}
// //         contentContainerStyle={[
// //           styles.scrollContent,
// //           { 
// //             paddingTop: insets.top + Spacing.lg, 
// //             paddingBottom: insets.bottom + Spacing.xl 
// //           },
// //         ]}
// //         showsVerticalScrollIndicator={false}
// //       >
// //         <Animated.View entering={FadeInDown.duration(400)}>
// //           <ThemedText style={styles.headerTitle}>Services</ThemedText>
// //         </Animated.View>

// //         <View style={styles.section}>
// //           <ThemedText style={styles.sectionTitle}>Ride</ThemedText>
// //           <View style={styles.sectionContent}>
// //             {RIDE_SERVICES.map((service, index) => (
// //               <ServiceItem
// //                 key={service.id}
// //                 {...service}
// //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// //                 onPress={() => handleServicePress(service.id)}
// //                 index={index}
// //               />
// //             ))}
// //           </View>
// //         </View>

// //         <View style={styles.section}>
// //           <ThemedText style={styles.sectionTitle}>Delivery</ThemedText>
// //           <View style={styles.sectionContent}>
// //             {DELIVERY_SERVICES.map((service, index) => (
// //               <ServiceItem
// //                 key={service.id}
// //                 {...service}
// //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// //                 onPress={() => handleServicePress(service.id)}
// //                 index={index + RIDE_SERVICES.length}
// //               />
// //             ))}
// //           </View>
// //         </View>

// //         <View style={styles.section}>
// //           <ThemedText style={styles.sectionTitle}>More</ThemedText>
// //           <View style={styles.sectionContent}>
// //             {OTHER_SERVICES.map((service, index) => (
// //               <ServiceItem
// //                 key={service.id}
// //                 {...service}
// //                 icon={service.icon as keyof typeof MaterialIcons.glyphMap}
// //                 onPress={() => handleServicePress(service.id)}
// //                 index={index + RIDE_SERVICES.length + DELIVERY_SERVICES.length}
// //               />
// //             ))}
// //           </View>
// //         </View>
// //       </ScrollView>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#000000",
// //   },
// //   scrollView: {
// //     flex: 1,
// //   },
// //   scrollContent: {
// //     paddingHorizontal: Spacing.lg,
// //   },
// //   headerTitle: {
// //     color: "#FFFFFF",
// //     fontSize: 28,
// //     fontWeight: "700",
// //     marginBottom: Spacing.xl,
// //   },
// //   section: {
// //     marginBottom: Spacing.xl,
// //   },
// //   sectionTitle: {
// //     color: "#9CA3AF",
// //     fontSize: 14,
// //     fontWeight: "600",
// //     textTransform: "uppercase",
// //     letterSpacing: 1,
// //     marginBottom: Spacing.md,
// //   },
// //   sectionContent: {
// //     backgroundColor: "#1A1A1A",
// //     borderRadius: BorderRadius.lg,
// //     overflow: "hidden",
// //   },
// //   serviceItem: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     paddingVertical: Spacing.md,
// //     paddingHorizontal: Spacing.md,
// //     borderBottomWidth: 1,
// //     borderBottomColor: "#333333",
// //   },
// //   serviceIconContainer: {
// //     width: 48,
// //     height: 48,
// //     borderRadius: BorderRadius.lg,
// //     backgroundColor: "#333333",
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginRight: Spacing.md,
// //   },
// //   serviceInfo: {
// //     flex: 1,
// //   },
// //   serviceName: {
// //     color: "#FFFFFF",
// //     fontSize: 16,
// //     fontWeight: "600",
// //     marginBottom: 2,
// //   },
// //   serviceDescription: {
// //     color: "#6B7280",
// //     fontSize: 14,
// //   },
// // });

// //client/screens/SettingsScreen.tsx

// import React from "react";
// import {
//   StyleSheet,
//   View,
//   Pressable,
//   ScrollView,
//   Alert,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { Feather, MaterialIcons } from "@expo/vector-icons";
// import Animated, { FadeInDown } from "react-native-reanimated";
// import * as Haptics from "expo-haptics";

// import { ThemedText } from "@/components/ThemedText";
// import { useTheme } from "@/hooks/useTheme";
// import { useAuth } from "@/context/AuthContext";
// import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// interface SettingItemProps {
//   icon: string;
//   iconFamily?: "feather" | "material";
//   title: string;
//   subtitle?: string;
//   onPress: () => void;
//   index: number;
//   isDanger?: boolean;
// }

// function SettingItem({ 
//   icon, 
//   iconFamily = "feather",
//   title, 
//   subtitle, 
//   onPress, 
//   index,
//   isDanger 
// }: SettingItemProps) {
//   const { theme } = useTheme();

//   return (
//     <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
//       <Pressable
//         onPress={() => {
//           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//           onPress();
//         }}
//         style={({ pressed }) => [
//           styles.settingItem,
//           { backgroundColor: pressed ? theme.backgroundDefault : "transparent" },
//         ]}
//       >
//         <View style={[
//           styles.iconContainer,
//           { backgroundColor: isDanger ? UTOColors.error + "15" : theme.backgroundDefault }
//         ]}>
//           {iconFamily === "feather" ? (
//             <Feather 
//               name={icon as keyof typeof Feather.glyphMap} 
//               size={20} 
//               color={isDanger ? UTOColors.error : theme.text} 
//             />
//           ) : (
//             <MaterialIcons 
//               name={icon as keyof typeof MaterialIcons.glyphMap} 
//               size={20} 
//               color={isDanger ? UTOColors.error : theme.text} 
//             />
//           )}
//         </View>
//         <View style={styles.textContainer}>
//           <ThemedText style={[
//             styles.title,
//             isDanger && { color: UTOColors.error }
//           ]}>
//             {title}
//           </ThemedText>
//           {subtitle ? (
//             <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
//               {subtitle}
//             </ThemedText>
//           ) : null}
//         </View>
//         <Feather 
//           name="chevron-right" 
//           size={20} 
//           color={isDanger ? UTOColors.error : theme.textSecondary} 
//         />
//       </Pressable>
//     </Animated.View>
//   );
// }

// export default function SettingsScreen({ navigation }: any) {
//   const insets = useSafeAreaInsets();
//   const { theme } = useTheme();
//   const { signOut } = useAuth();

//   const handleSignOut = () => {
//     Alert.alert(
//       "Sign Out",
//       "Are you sure you want to sign out?",
//       [
//         {
//           text: "Cancel",
//           style: "cancel",
//         },
//         {
//           text: "Sign Out",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await signOut();
//             } catch (error) {
//               console.error("Sign out error:", error);
//               Alert.alert("Error", "Failed to sign out. Please try again.");
//             }
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={[
//           styles.scrollContent,
//           { 
//             paddingTop: insets.top + Spacing.lg, 
//             paddingBottom: insets.bottom + Spacing.xl 
//           },
//         ]}
//         showsVerticalScrollIndicator={false}
//       >
//         <Animated.View entering={FadeInDown.duration(400)}>
//           <ThemedText style={styles.headerTitle}>Settings</ThemedText>
//         </Animated.View>

//         {/* Preferences Section */}
//         <View style={styles.section}>
//           <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
//             PREFERENCES
//           </ThemedText>
//           <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
//             <SettingItem
//               icon="globe"
//               title="Language"
//               subtitle="English"
//               onPress={() => {}}
//               index={0}
//             />
//             <View style={[styles.divider, { backgroundColor: theme.border }]} />
//             <SettingItem
//               icon="moon"
//               title="Appearance"
//               subtitle="Dark mode"
//               onPress={() => {}}
//               index={1}
//             />
//             <View style={[styles.divider, { backgroundColor: theme.border }]} />
//             <SettingItem
//               icon="lock"
//               title="Privacy"
//               subtitle="Manage your data"
//               onPress={() => {}}
//               index={2}
//             />
//           </View>
//         </View>

//         {/* Legal Section */}
//         <View style={styles.section}>
//           <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
//             LEGAL
//           </ThemedText>
//           <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
//             <SettingItem
//               icon="file-text"
//               title="Terms of Service"
//               onPress={() => {}}
//               index={3}
//             />
//             <View style={[styles.divider, { backgroundColor: theme.border }]} />
//             <SettingItem
//               icon="shield"
//               title="Privacy Policy"
//               onPress={() => {}}
//               index={4}
//             />
//             <View style={[styles.divider, { backgroundColor: theme.border }]} />
//             <SettingItem
//               icon="info"
//               title="About UTO"
//               subtitle="Version 1.0.0"
//               onPress={() => {}}
//               index={5}
//             />
//           </View>
//         </View>

//         {/* Account Section */}
//         <View style={styles.section}>
//           <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
//             <SettingItem
//               icon="log-out"
//               title="Sign Out"
//               onPress={handleSignOut}
//               index={6}
//               isDanger
//             />
//           </View>
//         </View>

//         {/* Version Footer */}
//         <View style={styles.versionContainer}>
//           <ThemedText style={[styles.versionText, { color: theme.textSecondary }]}>
//             UTO v1.0.0
//           </ThemedText>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingHorizontal: Spacing.lg,
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: "700",
//     marginBottom: Spacing.xl,
//   },
//   section: {
//     marginBottom: Spacing.xl,
//   },
//   sectionTitle: {
//     fontSize: 13,
//     fontWeight: "600",
//     textTransform: "uppercase",
//     letterSpacing: 1,
//     marginBottom: Spacing.md,
//   },
//   sectionContent: {
//     borderRadius: BorderRadius.lg,
//     overflow: "hidden",
//   },
//   settingItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: Spacing.md,
//     paddingHorizontal: Spacing.md,
//   },
//   iconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: Spacing.md,
//   },
//   textContainer: {
//     flex: 1,
//   },
//   title: {
//     fontSize: 16,
//     fontWeight: "500",
//   },
//   subtitle: {
//     fontSize: 13,
//     marginTop: 2,
//   },
//   divider: {
//     height: 1,
//     marginLeft: 56, // Icon width + margin
//   },
//   versionContainer: {
//     alignItems: "center",
//     paddingVertical: Spacing.xl,
//   },
//   versionText: {
//     fontSize: 12,
//   },
// });

//client/screens/SettingsScreen.tsx

import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useThemeMode } from "@/context/ThemeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { useHeaderHeight } from "@react-navigation/elements";

interface SettingItemProps {
  icon: string;
  iconFamily?: "feather" | "material";
  title: string;
  subtitle?: string;
  onPress: () => void;
  index: number;
  isDanger?: boolean;
}

function SettingItem({
  icon,
  iconFamily = "feather",
  title,
  subtitle,
  onPress,
  index,
  isDanger
}: SettingItemProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.settingItem,
          { backgroundColor: pressed ? theme.backgroundDefault : "transparent" },
        ]}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: isDanger ? UTOColors.error + "15" : theme.backgroundDefault }
        ]}>
          {iconFamily === "feather" ? (
            <Feather
              name={icon as keyof typeof Feather.glyphMap}
              size={20}
              color={isDanger ? UTOColors.error : theme.text}
            />
          ) : (
            <MaterialIcons
              name={icon as keyof typeof MaterialIcons.glyphMap}
              size={20}
              color={isDanger ? UTOColors.error : theme.text}
            />
          )}
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={[
            styles.title,
            isDanger && { color: UTOColors.error }
          ]}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <Feather
          name="chevron-right"
          size={20}
          color={isDanger ? UTOColors.error : theme.textSecondary}
        />
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { signOut } = useAuth();
  const { setThemeMode } = useThemeMode();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(headerHeight, 56) + insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.lg
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Preferences Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PREFERENCES
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
            {/* Appearance with toggle */}
            <Animated.View entering={FadeInDown.delay(1 * 30).duration(300)}>
              <View style={styles.settingItem}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme.backgroundDefault }
                ]}>
                  <Feather name={isDark ? "moon" : "sun"} size={20} color={theme.text} />
                </View>
                <View style={styles.textContainer}>
                  <ThemedText style={styles.title}>Appearance</ThemedText>
                  <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {isDark ? "Dark mode" : "Light mode"}
                  </ThemedText>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemeMode(val ? "dark" : "light");
                  }}
                  trackColor={{ false: "#D1D5DB", true: UTOColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Animated.View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingItem
              icon="lock"
              title="Privacy"
              subtitle="Manage your data"
              onPress={() => { }}
              index={2}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            LEGAL
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
            <SettingItem
              icon="file-text"
              title="Terms of Service"
              onPress={() => navigation.navigate("Terms", { tab: "passenger" })}
              index={3}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingItem
              icon="shield"
              title="Privacy Policy"
              onPress={() => navigation.navigate("Terms", { tab: "privacy" })}
              index={4}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingItem
              icon="info"
              title="About UTO"
              subtitle="Version 1.0.0"
              onPress={() => { }}
              index={5}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: theme.backgroundDefault }]}>
            <SettingItem
              icon="log-out"
              title="Sign Out"
              onPress={handleSignOut}
              index={6}
              isDanger
            />
          </View>
        </View>

        {/* Version Footer */}
        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: theme.textSecondary }]}>
            UTO v1.0.0
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 56, // Icon width + margin
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  versionText: {
    fontSize: 11,
  },
});