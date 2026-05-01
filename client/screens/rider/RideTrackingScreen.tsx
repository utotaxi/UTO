// // // // // // // // // import React, { useState, useEffect } from "react";
// // // // // // // // // import {
// // // // // // // // //   StyleSheet,
// // // // // // // // //   View,
// // // // // // // // //   Pressable,
// // // // // // // // //   Platform,
// // // // // // // // //   Linking,
// // // // // // // // // } from "react-native";
// // // // // // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // // // // // import Animated, {
// // // // // // // // //   FadeIn,
// // // // // // // // //   useAnimatedStyle,
// // // // // // // // //   useSharedValue,
// // // // // // // // //   withSpring,
// // // // // // // // //   withRepeat,
// // // // // // // // //   withTiming,
// // // // // // // // // } from "react-native-reanimated";
// // // // // // // // // import * as Haptics from "expo-haptics";

// // // // // // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // // // // // import { MapViewWrapper, MarkerWrapper } from "@/components/MapView";
// // // // // // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // // // // // import { useRide } from "@/context/RideContext";
// // // // // // // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // // // // // // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // // // // // // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // // // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // // // // // const darkMapStyle = [
// // // // // // // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // // // // // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // // // // // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // // // // // // //   { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
// // // // // // // // //   { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
// // // // // // // // // ];

// // // // // // // // // export default function RideTrackingScreen({ navigation }: any) {
// // // // // // // // //   const insets = useSafeAreaInsets();
// // // // // // // // //   const { theme, isDark } = useTheme();
// // // // // // // // //   const { activeRide, cancelRide, completeRide } = useRide();

// // // // // // // // //   const pulseScale = useSharedValue(1);
// // // // // // // // //   const cancelScale = useSharedValue(1);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     pulseScale.value = withRepeat(
// // // // // // // // //       withTiming(1.2, { duration: 1000 }),
// // // // // // // // //       -1,
// // // // // // // // //       true
// // // // // // // // //     );

// // // // // // // // //     if (activeRide?.status === "accepted") {
// // // // // // // // //       const timer = setTimeout(() => {
// // // // // // // // //         if (activeRide) {
// // // // // // // // //           completeRide(activeRide.id);
// // // // // // // // //         }
// // // // // // // // //       }, 10000);
// // // // // // // // //       return () => clearTimeout(timer);
// // // // // // // // //     }
// // // // // // // // //   }, [activeRide?.status]);

// // // // // // // // //   useEffect(() => {
// // // // // // // // //     if (!activeRide) {
// // // // // // // // //       navigation.goBack();
// // // // // // // // //     }
// // // // // // // // //   }, [activeRide]);

// // // // // // // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // // // // // // //     transform: [{ scale: pulseScale.value }],
// // // // // // // // //     opacity: 2 - pulseScale.value,
// // // // // // // // //   }));

// // // // // // // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // // // // // // //     transform: [{ scale: cancelScale.value }],
// // // // // // // // //   }));

// // // // // // // // //   if (!activeRide) return null;

// // // // // // // // //   const handleCancel = () => {
// // // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // // // // // //     cancelRide(activeRide.id);
// // // // // // // // //   };

// // // // // // // // //   const handleCall = () => {
// // // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // // // //     Linking.openURL("tel:+1234567890");
// // // // // // // // //   };

// // // // // // // // //   const handleMessage = () => {
// // // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // // // //     Linking.openURL("sms:+1234567890");
// // // // // // // // //   };

// // // // // // // // //   const getStatusMessage = () => {
// // // // // // // // //     switch (activeRide.status) {
// // // // // // // // //       case "accepted":
// // // // // // // // //         return "Driver is on the way";
// // // // // // // // //       case "arrived":
// // // // // // // // //         return "Driver has arrived";
// // // // // // // // //       case "in_progress":
// // // // // // // // //         return "On your way";
// // // // // // // // //       default:
// // // // // // // // //         return "Finding your driver...";
// // // // // // // // //     }
// // // // // // // // //   };

// // // // // // // // //   const mapRegion = {
// // // // // // // // //     latitude: activeRide.pickupLocation.latitude,
// // // // // // // // //     longitude: activeRide.pickupLocation.longitude,
// // // // // // // // //     latitudeDelta: 0.02,
// // // // // // // // //     longitudeDelta: 0.02,
// // // // // // // // //   };

// // // // // // // // //   const driverLocation = {
// // // // // // // // //     latitude: activeRide.pickupLocation.latitude + (Math.random() * 0.01 - 0.005),
// // // // // // // // //     longitude: activeRide.pickupLocation.longitude + (Math.random() * 0.01 - 0.005),
// // // // // // // // //   };

// // // // // // // // //   return (
// // // // // // // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // // // // // // //       <MapViewWrapper
// // // // // // // // //         style={styles.map}
// // // // // // // // //         initialRegion={mapRegion}
// // // // // // // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // // // // // // //       >
// // // // // // // // //         <MarkerWrapper
// // // // // // // // //           coordinate={{
// // // // // // // // //             latitude: activeRide.pickupLocation.latitude,
// // // // // // // // //             longitude: activeRide.pickupLocation.longitude,
// // // // // // // // //           }}
// // // // // // // // //           title="Pickup"
// // // // // // // // //         >
// // // // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
// // // // // // // // //             <MaterialIcons name="navigation" size={16} color="#FFFFFF" />
// // // // // // // // //           </View>
// // // // // // // // //         </MarkerWrapper>

// // // // // // // // //         <MarkerWrapper
// // // // // // // // //           coordinate={{
// // // // // // // // //             latitude: activeRide.dropoffLocation.latitude,
// // // // // // // // //             longitude: activeRide.dropoffLocation.longitude,
// // // // // // // // //           }}
// // // // // // // // //           title="Dropoff"
// // // // // // // // //         >
// // // // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.rider.primary }]}>
// // // // // // // // //             <MaterialIcons name="place" size={16} color="#FFFFFF" />
// // // // // // // // //           </View>
// // // // // // // // //         </MarkerWrapper>

// // // // // // // // //         <MarkerWrapper coordinate={driverLocation} title="Driver">
// // // // // // // // //           <View style={styles.driverMarkerContainer}>
// // // // // // // // //             <AnimatedView style={[styles.driverPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // // // // // // // //             <View style={[styles.driverMarker, { backgroundColor: UTOColors.rider.primary }]}>
// // // // // // // // //               <MaterialIcons name="navigation" size={14} color="#FFFFFF" />
// // // // // // // // //             </View>
// // // // // // // // //           </View>
// // // // // // // // //         </MarkerWrapper>
// // // // // // // // //       </MapViewWrapper>

// // // // // // // // //       <Animated.View
// // // // // // // // //         entering={FadeIn}
// // // // // // // // //         style={[
// // // // // // // // //           styles.bottomSheet,
// // // // // // // // //           Shadows.large,
// // // // // // // // //           {
// // // // // // // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // // // // // // //             backgroundColor: theme.backgroundRoot,
// // // // // // // // //           },
// // // // // // // // //         ]}
// // // // // // // // //       >
// // // // // // // // //         <View style={styles.statusSection}>
// // // // // // // // //           <View style={styles.statusRow}>
// // // // // // // // //             <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
// // // // // // // // //             <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
// // // // // // // // //           </View>
// // // // // // // // //           <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // // // // // // //             {activeRide.durationMinutes} min away
// // // // // // // // //           </ThemedText>
// // // // // // // // //         </View>

// // // // // // // // //         <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
// // // // // // // // //           <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
// // // // // // // // //             <MaterialIcons name="person" size={24} color={theme.textSecondary} />
// // // // // // // // //           </View>
// // // // // // // // //           <View style={styles.driverInfo}>
// // // // // // // // //             <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
// // // // // // // // //             <View style={styles.vehicleRow}>
// // // // // // // // //               <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
// // // // // // // // //                 {activeRide.vehicleInfo}
// // // // // // // // //               </ThemedText>
// // // // // // // // //               <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
// // // // // // // // //                 <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // // // // // // // //                 <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // // // // // // // //                   {activeRide.driverRating?.toFixed(1)}
// // // // // // // // //                 </ThemedText>
// // // // // // // // //               </View>
// // // // // // // // //             </View>
// // // // // // // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // // // // // // //               {activeRide.licensePlate}
// // // // // // // // //             </ThemedText>
// // // // // // // // //           </View>

// // // // // // // // //           <View style={styles.contactButtons}>
// // // // // // // // //             <Pressable
// // // // // // // // //               onPress={handleCall}
// // // // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // // // //             >
// // // // // // // // //               <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // // // // // // // //             </Pressable>
// // // // // // // // //             <Pressable
// // // // // // // // //               onPress={handleMessage}
// // // // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // // // //             >
// // // // // // // // //               <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // // // // // // // //             </Pressable>
// // // // // // // // //           </View>
// // // // // // // // //         </View>

// // // // // // // // //         <View style={styles.tripDetails}>
// // // // // // // // //           <View style={styles.routeContainer}>
// // // // // // // // //             <View style={styles.routeIndicator}>
// // // // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // // // // // // // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // // // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.rider.primary }]} />
// // // // // // // // //             </View>
// // // // // // // // //             <View style={styles.addresses}>
// // // // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // // // //                 {activeRide.pickupLocation.address}
// // // // // // // // //               </ThemedText>
// // // // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // // // //                 {activeRide.dropoffLocation.address}
// // // // // // // // //               </ThemedText>
// // // // // // // // //             </View>
// // // // // // // // //             <ThemedText style={styles.farePrice}>
// // // // // // // // //               {formatPrice(activeRide.farePrice)}
// // // // // // // // //             </ThemedText>
// // // // // // // // //           </View>
// // // // // // // // //         </View>

// // // // // // // // //         <AnimatedPressable
// // // // // // // // //           onPress={handleCancel}
// // // // // // // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // // // // // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // // // // // // //           style={[
// // // // // // // // //             styles.cancelButton,
// // // // // // // // //             { backgroundColor: UTOColors.error + "15" },
// // // // // // // // //             cancelAnimatedStyle,
// // // // // // // // //           ]}
// // // // // // // // //         >
// // // // // // // // //           <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // // // // // // // //             Cancel Ride
// // // // // // // // //           </ThemedText>
// // // // // // // // //         </AnimatedPressable>
// // // // // // // // //       </Animated.View>
// // // // // // // // //     </View>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // // const styles = StyleSheet.create({
// // // // // // // // //   container: {
// // // // // // // // //     flex: 1,
// // // // // // // // //   },
// // // // // // // // //   map: {
// // // // // // // // //     flex: 1,
// // // // // // // // //   },
// // // // // // // // //   markerContainer: {
// // // // // // // // //     width: 32,
// // // // // // // // //     height: 32,
// // // // // // // // //     borderRadius: 16,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //   },
// // // // // // // // //   driverMarkerContainer: {
// // // // // // // // //     width: 40,
// // // // // // // // //     height: 40,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //   },
// // // // // // // // //   driverPulse: {
// // // // // // // // //     position: "absolute",
// // // // // // // // //     width: 40,
// // // // // // // // //     height: 40,
// // // // // // // // //     borderRadius: 20,
// // // // // // // // //   },
// // // // // // // // //   driverMarker: {
// // // // // // // // //     width: 28,
// // // // // // // // //     height: 28,
// // // // // // // // //     borderRadius: 14,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //     borderWidth: 2,
// // // // // // // // //     borderColor: "#FFFFFF",
// // // // // // // // //   },
// // // // // // // // //   bottomSheet: {
// // // // // // // // //     position: "absolute",
// // // // // // // // //     bottom: 0,
// // // // // // // // //     left: 0,
// // // // // // // // //     right: 0,
// // // // // // // // //     paddingHorizontal: Spacing.lg,
// // // // // // // // //     paddingTop: Spacing.xl,
// // // // // // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // // // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // // // // // //   },
// // // // // // // // //   statusSection: {
// // // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // // //   },
// // // // // // // // //   statusRow: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     marginBottom: 4,
// // // // // // // // //   },
// // // // // // // // //   statusDot: {
// // // // // // // // //     width: 10,
// // // // // // // // //     height: 10,
// // // // // // // // //     borderRadius: 5,
// // // // // // // // //     marginRight: Spacing.sm,
// // // // // // // // //   },
// // // // // // // // //   statusText: {
// // // // // // // // //     fontSize: 18,
// // // // // // // // //     fontWeight: "600",
// // // // // // // // //   },
// // // // // // // // //   eta: {
// // // // // // // // //     fontSize: 14,
// // // // // // // // //     marginLeft: 18,
// // // // // // // // //   },
// // // // // // // // //   driverCard: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     padding: Spacing.lg,
// // // // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // // //   },
// // // // // // // // //   driverAvatar: {
// // // // // // // // //     width: 50,
// // // // // // // // //     height: 50,
// // // // // // // // //     borderRadius: 25,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //     marginRight: Spacing.md,
// // // // // // // // //   },
// // // // // // // // //   driverInfo: {
// // // // // // // // //     flex: 1,
// // // // // // // // //   },
// // // // // // // // //   driverName: {
// // // // // // // // //     fontSize: 16,
// // // // // // // // //     fontWeight: "600",
// // // // // // // // //     marginBottom: 2,
// // // // // // // // //   },
// // // // // // // // //   vehicleRow: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     gap: Spacing.sm,
// // // // // // // // //     marginBottom: 2,
// // // // // // // // //   },
// // // // // // // // //   vehicleInfo: {
// // // // // // // // //     fontSize: 13,
// // // // // // // // //   },
// // // // // // // // //   ratingBadge: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     paddingHorizontal: 6,
// // // // // // // // //     paddingVertical: 2,
// // // // // // // // //     borderRadius: BorderRadius.full,
// // // // // // // // //     gap: 4,
// // // // // // // // //   },
// // // // // // // // //   rating: {
// // // // // // // // //     fontSize: 11,
// // // // // // // // //     fontWeight: "600",
// // // // // // // // //   },
// // // // // // // // //   licensePlate: {
// // // // // // // // //     fontSize: 14,
// // // // // // // // //     fontWeight: "700",
// // // // // // // // //     letterSpacing: 1,
// // // // // // // // //   },
// // // // // // // // //   contactButtons: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     gap: Spacing.sm,
// // // // // // // // //   },
// // // // // // // // //   contactButton: {
// // // // // // // // //     width: 40,
// // // // // // // // //     height: 40,
// // // // // // // // //     borderRadius: 20,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //   },
// // // // // // // // //   tripDetails: {
// // // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // // //   },
// // // // // // // // //   routeContainer: {
// // // // // // // // //     flexDirection: "row",
// // // // // // // // //     alignItems: "center",
// // // // // // // // //   },
// // // // // // // // //   routeIndicator: {
// // // // // // // // //     width: 20,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     marginRight: Spacing.md,
// // // // // // // // //   },
// // // // // // // // //   routeDot: {
// // // // // // // // //     width: 10,
// // // // // // // // //     height: 10,
// // // // // // // // //     borderRadius: 5,
// // // // // // // // //   },
// // // // // // // // //   routeLine: {
// // // // // // // // //     width: 2,
// // // // // // // // //     height: 24,
// // // // // // // // //     marginVertical: 4,
// // // // // // // // //   },
// // // // // // // // //   addresses: {
// // // // // // // // //     flex: 1,
// // // // // // // // //     justifyContent: "space-between",
// // // // // // // // //     height: 48,
// // // // // // // // //   },
// // // // // // // // //   address: {
// // // // // // // // //     fontSize: 14,
// // // // // // // // //   },
// // // // // // // // //   farePrice: {
// // // // // // // // //     fontSize: 20,
// // // // // // // // //     fontWeight: "700",
// // // // // // // // //     marginLeft: Spacing.md,
// // // // // // // // //   },
// // // // // // // // //   cancelButton: {
// // // // // // // // //     height: 48,
// // // // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // // // //     alignItems: "center",
// // // // // // // // //     justifyContent: "center",
// // // // // // // // //   },
// // // // // // // // //   cancelButtonText: {
// // // // // // // // //     fontSize: 15,
// // // // // // // // //     fontWeight: "600",
// // // // // // // // //   },
// // // // // // // // // });
// // // // // // // // //client/screen/rider/RideTrackingScreem.tsx

// // // // // // // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // // // // // // import {
// // // // // // // //   StyleSheet,
// // // // // // // //   View,
// // // // // // // //   Pressable,
// // // // // // // //   Platform,
// // // // // // // //   Linking,
// // // // // // // //   ActivityIndicator,
// // // // // // // // } from "react-native";
// // // // // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // // // // import Animated, {
// // // // // // // //   FadeIn,
// // // // // // // //   useAnimatedStyle,
// // // // // // // //   useSharedValue,
// // // // // // // //   withSpring,
// // // // // // // //   withRepeat,
// // // // // // // //   withTiming,
// // // // // // // // } from "react-native-reanimated";
// // // // // // // // import * as Haptics from "expo-haptics";

// // // // // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // // // // import { MapViewWrapper, MarkerWrapper, PolylineWrapper } from "@/components/MapView";
// // // // // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // // // // import { useRide } from "@/context/RideContext";
// // // // // // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // // // // // import { useAuth } from "@/context/AuthContext";
// // // // // // // // import { getApiUrl } from "@/lib/query-client";
// // // // // // // // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // // // // // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // // // // const darkMapStyle = [
// // // // // // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // // // // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // // // // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // // // // // //   { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
// // // // // // // //   { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
// // // // // // // // ];

// // // // // // // // interface RoutePoint {
// // // // // // // //   latitude: number;
// // // // // // // //   longitude: number;
// // // // // // // // }

// // // // // // // // export default function RideTrackingScreen({ navigation }: any) {
// // // // // // // //   const insets = useSafeAreaInsets();
// // // // // // // //   const { theme, isDark } = useTheme();
// // // // // // // //   const { activeRide, cancelRide, completeRide } = useRide();
// // // // // // // //   const { user } = useAuth();

// // // // // // // //   // Real-time driver tracking
// // // // // // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // // // // // //     riderId: user?.id || "",
// // // // // // // //     rideId: activeRide?.id,
// // // // // // // //   });

// // // // // // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // // // // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
// // // // // // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // // // // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // // // // // //   const hasInitialized = useRef(false);

// // // // // // // //   const pulseScale = useSharedValue(1);
// // // // // // // //   const cancelScale = useSharedValue(1);

// // // // // // // //   // Fetch route directions when ride is active
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!activeRide) return;

// // // // // // // //     const fetchRoutes = async () => {
// // // // // // // //       setIsLoadingRoute(true);
// // // // // // // //       try {
// // // // // // // //         const apiUrl = getApiUrl();

// // // // // // // //         // Fetch route from pickup to dropoff
// // // // // // // //         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // // // // // //         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // // // // // //         const routeResponse = await fetch(
// // // // // // // //           new URL(`/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`, apiUrl).toString()
// // // // // // // //         );
// // // // // // // //         const routeData = await routeResponse.json();

// // // // // // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // // // // // //           const route = routeData.routes[0];
// // // // // // // //           if (route.decodedPolyline) {
// // // // // // // //             setRouteCoordinates(route.decodedPolyline);
// // // // // // // //           }
// // // // // // // //         }
// // // // // // // //       } catch (error) {
// // // // // // // //         console.error("Failed to fetch route:", error);
// // // // // // // //       } finally {
// // // // // // // //         setIsLoadingRoute(false);
// // // // // // // //       }
// // // // // // // //     };

// // // // // // // //     fetchRoutes();
// // // // // // // //   }, [activeRide?.id]);

// // // // // // // //   // Fetch driver route to pickup when driver location updates
// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!activeRide || !driverLocation) return;

// // // // // // // //     const fetchDriverRoute = async () => {
// // // // // // // //       try {
// // // // // // // //         const apiUrl = getApiUrl();
// // // // // // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // // // // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // // // // // //         const response = await fetch(
// // // // // // // //           new URL(`/api/directions?origin=${driverPos}&destination=${pickup}`, apiUrl).toString()
// // // // // // // //         );
// // // // // // // //         const data = await response.json();

// // // // // // // //         if (data.routes && data.routes.length > 0) {
// // // // // // // //           const route = data.routes[0];
// // // // // // // //           if (route.decodedPolyline) {
// // // // // // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // // // // // //           }
// // // // // // // //           if (route.legs && route.legs[0]) {
// // // // // // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // // // // // //           }
// // // // // // // //         }
// // // // // // // //       } catch (error) {
// // // // // // // //         console.error("Failed to fetch driver route:", error);
// // // // // // // //       }
// // // // // // // //     };

// // // // // // // //     // Only fetch if driver is coming to pickup
// // // // // // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // // // // // //       fetchDriverRoute();
// // // // // // // //     }
// // // // // // // //   }, [driverLocation?.latitude, driverLocation?.longitude, activeRide?.status, rideStatus]);

// // // // // // // //   useEffect(() => {
// // // // // // // //     pulseScale.value = withRepeat(
// // // // // // // //       withTiming(1.2, { duration: 1000 }),
// // // // // // // //       -1,
// // // // // // // //       true
// // // // // // // //     );
// // // // // // // //     hasInitialized.current = true;
// // // // // // // //   }, []);

// // // // // // // //   useEffect(() => {
// // // // // // // //     if (!activeRide && hasInitialized.current) {
// // // // // // // //       const timer = setTimeout(() => {
// // // // // // // //         if (!activeRide) {
// // // // // // // //           navigation.goBack();
// // // // // // // //         }
// // // // // // // //       }, 500);
// // // // // // // //       return () => clearTimeout(timer);
// // // // // // // //     }
// // // // // // // //   }, [activeRide]);

// // // // // // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // // // // // //     transform: [{ scale: pulseScale.value }],
// // // // // // // //     opacity: 2 - pulseScale.value,
// // // // // // // //   }));

// // // // // // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // // // // // //     transform: [{ scale: cancelScale.value }],
// // // // // // // //   }));
// // // // // // // // 
// // // // // // // //   const handleChangePayment = async () => {
// // // // // // // //     if (!activeRide) return;
// // // // // // // //     const currentMethod = activeRide.paymentMethod || "cash";
// // // // // // // //     const newMethod = currentMethod === "card" ? "cash" : "card";
// // // // // // // //     
// // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
// // // // // // // //     try {
// // // // // // // //       if (updateRidePaymentMethod) {
// // // // // // // //         await updateRidePaymentMethod(activeRide.id, newMethod);
// // // // // // // //       }
// // // // // // // //     } catch (err) {
// // // // // // // //       console.error(err);
// // // // // // // //     }
// // // // // // // //   };
// // // // // // // // 
// // // // // // // //   if (!activeRide) return null;
// // // // // // // // 
// // // // // // // //   const handleCancel = () => {
// // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // // // // //     cancelRide(activeRide.id);
// // // // // // // //   };

// // // // // // // //   const handleCall = () => {
// // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // // //     Linking.openURL("tel:+1234567890");
// // // // // // // //   };

// // // // // // // //   const handleMessage = () => {
// // // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // // //     Linking.openURL("sms:+1234567890");
// // // // // // // //   };

// // // // // // // //   const getStatusMessage = () => {
// // // // // // // //     const status = rideStatus || activeRide.status;
// // // // // // // //     switch (status) {
// // // // // // // //       case "accepted":
// // // // // // // //         return "Driver is on the way";
// // // // // // // //       case "arrived":
// // // // // // // //         return "Driver has arrived";
// // // // // // // //       case "in_progress":
// // // // // // // //         return "On your way to destination";
// // // // // // // //       default:
// // // // // // // //         return "Finding your driver...";
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   // Calculate map region to fit all points
// // // // // // // //   const getMapRegion = () => {
// // // // // // // //     const points: RoutePoint[] = [
// // // // // // // //       { latitude: activeRide.pickupLocation.latitude, longitude: activeRide.pickupLocation.longitude },
// // // // // // // //       { latitude: activeRide.dropoffLocation.latitude, longitude: activeRide.dropoffLocation.longitude },
// // // // // // // //     ];

// // // // // // // //     if (driverLocation) {
// // // // // // // //       points.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
// // // // // // // //     }

// // // // // // // //     const lats = points.map(p => p.latitude);
// // // // // // // //     const lngs = points.map(p => p.longitude);

// // // // // // // //     const minLat = Math.min(...lats);
// // // // // // // //     const maxLat = Math.max(...lats);
// // // // // // // //     const minLng = Math.min(...lngs);
// // // // // // // //     const maxLng = Math.max(...lngs);

// // // // // // // //     const centerLat = (minLat + maxLat) / 2;
// // // // // // // //     const centerLng = (minLng + maxLng) / 2;

// // // // // // // //     const latDelta = Math.max((maxLat - minLat) * 1.5, 0.02);
// // // // // // // //     const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.02);

// // // // // // // //     return {
// // // // // // // //       latitude: centerLat,
// // // // // // // //       longitude: centerLng,
// // // // // // // //       latitudeDelta: latDelta,
// // // // // // // //       longitudeDelta: lngDelta,
// // // // // // // //     };
// // // // // // // //   };

// // // // // // // //   // Use real driver location or simulate one for demo
// // // // // // // //   const currentDriverLocation = driverLocation || {
// // // // // // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // // // // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // // // // // //   };

// // // // // // // //   const currentStatus = rideStatus || activeRide.status;

// // // // // // // //   return (
// // // // // // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // // // // // //       <MapViewWrapper
// // // // // // // //         style={styles.map}
// // // // // // // //         initialRegion={getMapRegion()}
// // // // // // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // // // // // //       >
// // // // // // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // // // // // //         {routeCoordinates.length > 0 ? (
// // // // // // // //           <PolylineWrapper
// // // // // // // //             coordinates={routeCoordinates}
// // // // // // // //             strokeColor="#000000"
// // // // // // // //             strokeWidth={5}
// // // // // // // //           />
// // // // // // // //         ) : null}

// // // // // // // //         {/* Route from driver to pickup (dashed yellow) */}
// // // // // // // //         {driverToPickupRoute.length > 0 && (currentStatus === "accepted" || currentStatus === "arrived") ? (
// // // // // // // //           <PolylineWrapper
// // // // // // // //             coordinates={driverToPickupRoute}
// // // // // // // //             strokeColor={UTOColors.rider.primary}
// // // // // // // //             strokeWidth={4}
// // // // // // // //             lineDashPattern={[10, 5]}
// // // // // // // //           />
// // // // // // // //         ) : null}

// // // // // // // //         {/* Pickup marker */}
// // // // // // // //         <MarkerWrapper
// // // // // // // //           coordinate={{
// // // // // // // //             latitude: activeRide.pickupLocation.latitude,
// // // // // // // //             longitude: activeRide.pickupLocation.longitude,
// // // // // // // //           }}
// // // // // // // //           title="Pickup"
// // // // // // // //         >
// // // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
// // // // // // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // // // // // //           </View>
// // // // // // // //         </MarkerWrapper>

// // // // // // // //         {/* Dropoff marker */}
// // // // // // // //         <MarkerWrapper
// // // // // // // //           coordinate={{
// // // // // // // //             latitude: activeRide.dropoffLocation.latitude,
// // // // // // // //             longitude: activeRide.dropoffLocation.longitude,
// // // // // // // //           }}
// // // // // // // //           title="Dropoff"
// // // // // // // //         >
// // // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.error }]}>
// // // // // // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // // // // // //           </View>
// // // // // // // //         </MarkerWrapper>

// // // // // // // //         {/* Driver marker with pulse animation */}
// // // // // // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // // // // // //           <View style={styles.driverMarkerContainer}>
// // // // // // // //             <AnimatedView style={[styles.driverPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // // // // // // //             <View style={[styles.driverMarker, { backgroundColor: UTOColors.rider.primary }]}>
// // // // // // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // // // // // //             </View>
// // // // // // // //           </View>
// // // // // // // //         </MarkerWrapper>
// // // // // // // //       </MapViewWrapper>

// // // // // // // //       {/* Loading indicator for route */}
// // // // // // // //       {isLoadingRoute ? (
// // // // // // // //         <View style={styles.loadingOverlay}>
// // // // // // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // // // // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // // // // // //         </View>
// // // // // // // //       ) : null}

// // // // // // // //       <Animated.View
// // // // // // // //         entering={FadeIn}
// // // // // // // //         style={[
// // // // // // // //           styles.bottomSheet,
// // // // // // // //           Shadows.large,
// // // // // // // //           {
// // // // // // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // // // // // //             backgroundColor: theme.backgroundRoot,
// // // // // // // //           },
// // // // // // // //         ]}
// // // // // // // //       >
// // // // // // // //         <View style={styles.statusSection}>
// // // // // // // //           <View style={styles.statusRow}>
// // // // // // // //             <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
// // // // // // // //             <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
// // // // // // // //           </View>
// // // // // // // //           <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // // // // // //             {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // // // // // //           </ThemedText>
// // // // // // // //         </View>

// // // // // // // //         <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
// // // // // // // //           <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
// // // // // // // //             <MaterialIcons name="person" size={24} color={theme.textSecondary} />
// // // // // // // //           </View>
// // // // // // // //           <View style={styles.driverInfo}>
// // // // // // // //             <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
// // // // // // // //             <View style={styles.vehicleRow}>
// // // // // // // //               <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
// // // // // // // //                 {activeRide.vehicleInfo}
// // // // // // // //               </ThemedText>
// // // // // // // //               <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
// // // // // // // //                 <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // // // // // // //                 <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // // // // // // //                   {activeRide.driverRating?.toFixed(1)}
// // // // // // // //                 </ThemedText>
// // // // // // // //               </View>
// // // // // // // //             </View>
// // // // // // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // // // // // //               {activeRide.licensePlate}
// // // // // // // //             </ThemedText>
// // // // // // // //           </View>

// // // // // // // //           <View style={styles.contactButtons}>
// // // // // // // //             <Pressable
// // // // // // // //               onPress={handleCall}
// // // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // // //             >
// // // // // // // //               <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // // // // // // //             </Pressable>
// // // // // // // //             <Pressable
// // // // // // // //               onPress={handleMessage}
// // // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // // //             >
// // // // // // // //               <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // // // // // // //             </Pressable>
// // // // // // // //           </View>
// // // // // // // //         </View>

// // // // // // // //         <View style={styles.tripDetails}>
// // // // // // // //           <View style={styles.routeContainer}>
// // // // // // // //             <View style={styles.routeIndicator}>
// // // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // // // // // // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// // // // // // // //             </View>
// // // // // // // //             <View style={styles.addresses}>
// // // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // // //                 {activeRide.pickupLocation.address}
// // // // // // // //               </ThemedText>
// // // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // // //                 {activeRide.dropoffLocation.address}
// // // // // // // //               </ThemedText>
// // // // // // // //             </View>
// // // // // // // //             <ThemedText style={styles.farePrice}>
// // // // // // // //               {formatPrice(activeRide.farePrice)}
// // // // // // // //             </ThemedText>
// // // // // // // //           </View>
// // // // // // // //           
// // // // // // // //           {currentStatus !== "completed" && (
// // // // // // // //             <Pressable style={styles.paymentSwitchButton} onPress={handleChangePayment}>
// // // // // // // //               <View style={styles.paymentSwitchRow}>
// // // // // // // //                 <MaterialIcons 
// // // // // // // //                   name={activeRide.paymentMethod === 'card' ? 'credit-card' : 'payments'} 
// // // // // // // //                   size={18} 
// // // // // // // //                   color={theme.textSecondary} 
// // // // // // // //                 />
// // // // // // // //                 <ThemedText style={{ color: theme.textSecondary, marginLeft: 8 }}>
// // // // // // // //                   Paying with {activeRide.paymentMethod === 'card' ? 'Card' : 'Cash'}
// // // // // // // //                 </ThemedText>
// // // // // // // //               </View>
// // // // // // // //               <ThemedText style={{ color: UTOColors.rider.primary, fontWeight: '600' }}>Change</ThemedText>
// // // // // // // //             </Pressable>
// // // // // // // //           )}
// // // // // // // //         </View>

// // // // // // // //         <AnimatedPressable
// // // // // // // //           onPress={handleCancel}
// // // // // // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // // // // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // // // // // //           style={[
// // // // // // // //             styles.cancelButton,
// // // // // // // //             { backgroundColor: UTOColors.error + "15" },
// // // // // // // //             cancelAnimatedStyle,
// // // // // // // //           ]}
// // // // // // // //         >
// // // // // // // //           <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // // // // // // //             Cancel Ride
// // // // // // // //           </ThemedText>
// // // // // // // //         </AnimatedPressable>
// // // // // // // //       </Animated.View>
// // // // // // // //     </View>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // // const styles = StyleSheet.create({
// // // // // // // //   container: {
// // // // // // // //     flex: 1,
// // // // // // // //   },
// // // // // // // //   map: {
// // // // // // // //     flex: 1,
// // // // // // // //   },
// // // // // // // //   paymentSwitchButton: {
// // // // // // // //     flexDirection: 'row',
// // // // // // // //     alignItems: 'center',
// // // // // // // //     justifyContent: 'space-between',
// // // // // // // //     marginTop: Spacing.md,
// // // // // // // //     paddingTop: Spacing.md,
// // // // // // // //     borderTopWidth: 1,
// // // // // // // //     borderTopColor: '#333',
// // // // // // // //   },
// // // // // // // //   paymentSwitchRow: {
// // // // // // // //     flexDirection: 'row',
// // // // // // // //     alignItems: 'center',
// // // // // // // //   },
// // // // // // // //   loadingOverlay: {
// // // // // // // //     position: "absolute",
// // // // // // // //     top: 60,
// // // // // // // //     alignSelf: "center",
// // // // // // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // // // // // //     paddingHorizontal: Spacing.lg,
// // // // // // // //     paddingVertical: Spacing.sm,
// // // // // // // //     borderRadius: BorderRadius.full,
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //     gap: Spacing.sm,
// // // // // // // //   },
// // // // // // // //   loadingText: {
// // // // // // // //     color: "#FFFFFF",
// // // // // // // //     fontSize: 12,
// // // // // // // //   },
// // // // // // // //   markerContainer: {
// // // // // // // //     width: 36,
// // // // // // // //     height: 36,
// // // // // // // //     borderRadius: 18,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //     borderWidth: 2,
// // // // // // // //     borderColor: "#FFFFFF",
// // // // // // // //   },
// // // // // // // //   driverMarkerContainer: {
// // // // // // // //     width: 50,
// // // // // // // //     height: 50,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //   },
// // // // // // // //   driverPulse: {
// // // // // // // //     position: "absolute",
// // // // // // // //     width: 50,
// // // // // // // //     height: 50,
// // // // // // // //     borderRadius: 25,
// // // // // // // //   },
// // // // // // // //   driverMarker: {
// // // // // // // //     width: 36,
// // // // // // // //     height: 36,
// // // // // // // //     borderRadius: 18,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //     borderWidth: 3,
// // // // // // // //     borderColor: "#FFFFFF",
// // // // // // // //   },
// // // // // // // //   bottomSheet: {
// // // // // // // //     position: "absolute",
// // // // // // // //     bottom: 0,
// // // // // // // //     left: 0,
// // // // // // // //     right: 0,
// // // // // // // //     paddingHorizontal: Spacing.lg,
// // // // // // // //     paddingTop: Spacing.xl,
// // // // // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // // // // //   },
// // // // // // // //   statusSection: {
// // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // //   },
// // // // // // // //   statusRow: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //     marginBottom: 4,
// // // // // // // //   },
// // // // // // // //   statusDot: {
// // // // // // // //     width: 10,
// // // // // // // //     height: 10,
// // // // // // // //     borderRadius: 5,
// // // // // // // //     marginRight: Spacing.sm,
// // // // // // // //   },
// // // // // // // //   statusText: {
// // // // // // // //     fontSize: 18,
// // // // // // // //     fontWeight: "600",
// // // // // // // //   },
// // // // // // // //   eta: {
// // // // // // // //     fontSize: 14,
// // // // // // // //     marginLeft: 18,
// // // // // // // //   },
// // // // // // // //   driverCard: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //     padding: Spacing.lg,
// // // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // //   },
// // // // // // // //   driverAvatar: {
// // // // // // // //     width: 50,
// // // // // // // //     height: 50,
// // // // // // // //     borderRadius: 25,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //     marginRight: Spacing.md,
// // // // // // // //   },
// // // // // // // //   driverInfo: {
// // // // // // // //     flex: 1,
// // // // // // // //   },
// // // // // // // //   driverName: {
// // // // // // // //     fontSize: 16,
// // // // // // // //     fontWeight: "600",
// // // // // // // //     marginBottom: 2,
// // // // // // // //   },
// // // // // // // //   vehicleRow: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //     gap: Spacing.sm,
// // // // // // // //     marginBottom: 2,
// // // // // // // //   },
// // // // // // // //   vehicleInfo: {
// // // // // // // //     fontSize: 13,
// // // // // // // //   },
// // // // // // // //   ratingBadge: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //     paddingHorizontal: 6,
// // // // // // // //     paddingVertical: 2,
// // // // // // // //     borderRadius: BorderRadius.full,
// // // // // // // //     gap: 4,
// // // // // // // //   },
// // // // // // // //   rating: {
// // // // // // // //     fontSize: 11,
// // // // // // // //     fontWeight: "600",
// // // // // // // //   },
// // // // // // // //   licensePlate: {
// // // // // // // //     fontSize: 14,
// // // // // // // //     fontWeight: "700",
// // // // // // // //     letterSpacing: 1,
// // // // // // // //   },
// // // // // // // //   contactButtons: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     gap: Spacing.sm,
// // // // // // // //   },
// // // // // // // //   contactButton: {
// // // // // // // //     width: 40,
// // // // // // // //     height: 40,
// // // // // // // //     borderRadius: 20,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //   },
// // // // // // // //   tripDetails: {
// // // // // // // //     marginBottom: Spacing.lg,
// // // // // // // //   },
// // // // // // // //   routeContainer: {
// // // // // // // //     flexDirection: "row",
// // // // // // // //     alignItems: "center",
// // // // // // // //   },
// // // // // // // //   routeIndicator: {
// // // // // // // //     width: 20,
// // // // // // // //     alignItems: "center",
// // // // // // // //     marginRight: Spacing.md,
// // // // // // // //   },
// // // // // // // //   routeDot: {
// // // // // // // //     width: 10,
// // // // // // // //     height: 10,
// // // // // // // //     borderRadius: 5,
// // // // // // // //   },
// // // // // // // //   routeLine: {
// // // // // // // //     width: 2,
// // // // // // // //     height: 24,
// // // // // // // //     marginVertical: 4,
// // // // // // // //   },
// // // // // // // //   addresses: {
// // // // // // // //     flex: 1,
// // // // // // // //     justifyContent: "space-between",
// // // // // // // //     height: 48,
// // // // // // // //   },
// // // // // // // //   address: {
// // // // // // // //     fontSize: 14,
// // // // // // // //   },
// // // // // // // //   farePrice: {
// // // // // // // //     fontSize: 20,
// // // // // // // //     fontWeight: "700",
// // // // // // // //     marginLeft: Spacing.md,
// // // // // // // //   },
// // // // // // // //   cancelButton: {
// // // // // // // //     height: 48,
// // // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // // //     alignItems: "center",
// // // // // // // //     justifyContent: "center",
// // // // // // // //   },
// // // // // // // //   cancelButtonText: {
// // // // // // // //     fontSize: 15,
// // // // // // // //     fontWeight: "600",
// // // // // // // //   },
// // // // // // // // });

// // // // // // // //client/screen/rider/RideTrackingScreen.tsx
// // // // // // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // // // // // import {
// // // // // // //   StyleSheet,
// // // // // // //   View,
// // // // // // //   Pressable,
// // // // // // //   Platform,
// // // // // // //   Linking,
// // // // // // //   ActivityIndicator,
// // // // // // // } from "react-native";
// // // // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // // // import Animated, {
// // // // // // //   FadeIn,
// // // // // // //   useAnimatedStyle,
// // // // // // //   useSharedValue,
// // // // // // //   withSpring,
// // // // // // //   withRepeat,
// // // // // // //   withTiming,
// // // // // // // } from "react-native-reanimated";
// // // // // // // import * as Haptics from "expo-haptics";

// // // // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // // // import { MapViewWrapper, MarkerWrapper, PolylineWrapper } from "@/components/MapView";
// // // // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // // // import { useRide } from "@/context/RideContext";
// // // // // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // // // // import { useAuth } from "@/context/AuthContext";
// // // // // // // import { getApiUrl } from "@/lib/query-client";
// // // // // // // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // // // // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // // // const darkMapStyle = [
// // // // // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // // // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // // // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // // // // //   { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
// // // // // // //   { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
// // // // // // // ];

// // // // // // // interface RoutePoint {
// // // // // // //   latitude: number;
// // // // // // //   longitude: number;
// // // // // // // }

// // // // // // // export default function RideTrackingScreen({ navigation }: any) {
// // // // // // //   const insets = useSafeAreaInsets();
// // // // // // //   const { theme, isDark } = useTheme();
// // // // // // //   const { activeRide, cancelRide, completeRide } = useRide();
// // // // // // //   const { user } = useAuth();

// // // // // // //   // Real-time driver tracking
// // // // // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // // // // //     riderId: user?.id || "",
// // // // // // //     rideId: activeRide?.id,
// // // // // // //   });

// // // // // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // // // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
// // // // // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // // // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // // // // //   const hasInitialized = useRef(false);

// // // // // // //   const pulseScale = useSharedValue(1);
// // // // // // //   const cancelScale = useSharedValue(1);

// // // // // // //   // Fetch route directions when ride is active
// // // // // // //   useEffect(() => {
// // // // // // //     if (!activeRide) return;

// // // // // // //     const fetchRoutes = async () => {
// // // // // // //       setIsLoadingRoute(true);
// // // // // // //       try {
// // // // // // //         const apiUrl = getApiUrl();

// // // // // // //         // Fetch route from pickup to dropoff
// // // // // // //         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // // // // //         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // // // // //         const routeResponse = await fetch(
// // // // // // //           new URL(`/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`, apiUrl).toString()
// // // // // // //         );
// // // // // // //         const routeData = await routeResponse.json();

// // // // // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // // // // //           const route = routeData.routes[0];
// // // // // // //           if (route.decodedPolyline) {
// // // // // // //             setRouteCoordinates(route.decodedPolyline);
// // // // // // //           }
// // // // // // //         }
// // // // // // //       } catch (error) {
// // // // // // //         console.error("Failed to fetch route:", error);
// // // // // // //       } finally {
// // // // // // //         setIsLoadingRoute(false);
// // // // // // //       }
// // // // // // //     };

// // // // // // //     fetchRoutes();
// // // // // // //   }, [activeRide?.id]);

// // // // // // //   // Fetch driver route to pickup when driver location updates
// // // // // // //   useEffect(() => {
// // // // // // //     if (!activeRide || !driverLocation) return;

// // // // // // //     const fetchDriverRoute = async () => {
// // // // // // //       try {
// // // // // // //         const apiUrl = getApiUrl();
// // // // // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // // // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // // // // //         const response = await fetch(
// // // // // // //           new URL(`/api/directions?origin=${driverPos}&destination=${pickup}`, apiUrl).toString()
// // // // // // //         );
// // // // // // //         const data = await response.json();

// // // // // // //         if (data.routes && data.routes.length > 0) {
// // // // // // //           const route = data.routes[0];
// // // // // // //           if (route.decodedPolyline) {
// // // // // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // // // // //           }
// // // // // // //           if (route.legs && route.legs[0]) {
// // // // // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // // // // //           }
// // // // // // //         }
// // // // // // //       } catch (error) {
// // // // // // //         console.error("Failed to fetch driver route:", error);
// // // // // // //       }
// // // // // // //     };

// // // // // // //     // Only fetch if driver is coming to pickup
// // // // // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // // // // //       fetchDriverRoute();
// // // // // // //     }
// // // // // // //   }, [driverLocation?.latitude, driverLocation?.longitude, activeRide?.status, rideStatus]);

// // // // // // //   useEffect(() => {
// // // // // // //     pulseScale.value = withRepeat(
// // // // // // //       withTiming(1.2, { duration: 1000 }),
// // // // // // //       -1,
// // // // // // //       true
// // // // // // //     );
// // // // // // //     hasInitialized.current = true;
// // // // // // //   }, []);

// // // // // // //   useEffect(() => {
// // // // // // //     if (!activeRide && hasInitialized.current) {
// // // // // // //       const timer = setTimeout(() => {
// // // // // // //         if (!activeRide) {
// // // // // // //           navigation.goBack();
// // // // // // //         }
// // // // // // //       }, 500);
// // // // // // //       return () => clearTimeout(timer);
// // // // // // //     }
// // // // // // //   }, [activeRide]);

// // // // // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // // // // //     transform: [{ scale: pulseScale.value }],
// // // // // // //     opacity: 2 - pulseScale.value,
// // // // // // //   }));

// // // // // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // // // // //     transform: [{ scale: cancelScale.value }],
// // // // // // //   }));

// // // // // // //   if (!activeRide) return null;

// // // // // // //   const handleCancel = () => {
// // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // // // //     cancelRide(activeRide.id);
// // // // // // //   };

// // // // // // //   const handleCall = () => {
// // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // //     Linking.openURL("tel:+1234567890");
// // // // // // //   };

// // // // // // //   const handleMessage = () => {
// // // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // // //     Linking.openURL("sms:+1234567890");
// // // // // // //   };

// // // // // // //   const getStatusMessage = () => {
// // // // // // //     const status = rideStatus || activeRide.status;
// // // // // // //     switch (status) {
// // // // // // //       case "accepted":
// // // // // // //         return "Driver is on the way";
// // // // // // //       case "arrived":
// // // // // // //         return "Driver has arrived";
// // // // // // //       case "in_progress":
// // // // // // //         return "On your way to destination";
// // // // // // //       default:
// // // // // // //         return "Finding your driver...";
// // // // // // //     }
// // // // // // //   };

// // // // // // //   // Calculate map region to fit all points
// // // // // // //   const getMapRegion = () => {
// // // // // // //     const points: RoutePoint[] = [
// // // // // // //       { latitude: activeRide.pickupLocation.latitude, longitude: activeRide.pickupLocation.longitude },
// // // // // // //       { latitude: activeRide.dropoffLocation.latitude, longitude: activeRide.dropoffLocation.longitude },
// // // // // // //     ];

// // // // // // //     if (driverLocation) {
// // // // // // //       points.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
// // // // // // //     }

// // // // // // //     const lats = points.map(p => p.latitude);
// // // // // // //     const lngs = points.map(p => p.longitude);

// // // // // // //     const minLat = Math.min(...lats);
// // // // // // //     const maxLat = Math.max(...lats);
// // // // // // //     const minLng = Math.min(...lngs);
// // // // // // //     const maxLng = Math.max(...lngs);

// // // // // // //     const centerLat = (minLat + maxLat) / 2;
// // // // // // //     const centerLng = (minLng + maxLng) / 2;

// // // // // // //     const latDelta = Math.max((maxLat - minLat) * 1.5, 0.02);
// // // // // // //     const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.02);

// // // // // // //     return {
// // // // // // //       latitude: centerLat,
// // // // // // //       longitude: centerLng,
// // // // // // //       latitudeDelta: latDelta,
// // // // // // //       longitudeDelta: lngDelta,
// // // // // // //     };
// // // // // // //   };

// // // // // // //   // Use real driver location or simulate one for demo
// // // // // // //   const currentDriverLocation = driverLocation || {
// // // // // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // // // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // // // // //   };

// // // // // // //   const currentStatus = rideStatus || activeRide.status;

// // // // // // //   return (
// // // // // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // // // // //       <MapViewWrapper
// // // // // // //         style={styles.map}
// // // // // // //         initialRegion={getMapRegion()}
// // // // // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // // // // //       >
// // // // // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // // // // //         {routeCoordinates.length > 0 ? (
// // // // // // //           <PolylineWrapper
// // // // // // //             coordinates={routeCoordinates}
// // // // // // //             strokeColor="#000000"
// // // // // // //             strokeWidth={5}
// // // // // // //           />
// // // // // // //         ) : null}

// // // // // // //         {/* Route from driver to pickup (dashed yellow) */}
// // // // // // //         {driverToPickupRoute.length > 0 && (currentStatus === "accepted" || currentStatus === "arrived") ? (
// // // // // // //           <PolylineWrapper
// // // // // // //             coordinates={driverToPickupRoute}
// // // // // // //             strokeColor={UTOColors.rider.primary}
// // // // // // //             strokeWidth={4}
// // // // // // //             lineDashPattern={[10, 5]}
// // // // // // //           />
// // // // // // //         ) : null}

// // // // // // //         {/* Pickup marker */}
// // // // // // //         <MarkerWrapper
// // // // // // //           coordinate={{
// // // // // // //             latitude: activeRide.pickupLocation.latitude,
// // // // // // //             longitude: activeRide.pickupLocation.longitude,
// // // // // // //           }}
// // // // // // //           title="Pickup"
// // // // // // //         >
// // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
// // // // // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // // // // //           </View>
// // // // // // //         </MarkerWrapper>

// // // // // // //         {/* Dropoff marker */}
// // // // // // //         <MarkerWrapper
// // // // // // //           coordinate={{
// // // // // // //             latitude: activeRide.dropoffLocation.latitude,
// // // // // // //             longitude: activeRide.dropoffLocation.longitude,
// // // // // // //           }}
// // // // // // //           title="Dropoff"
// // // // // // //         >
// // // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.error }]}>
// // // // // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // // // // //           </View>
// // // // // // //         </MarkerWrapper>

// // // // // // //         {/* Driver marker with pulse animation */}
// // // // // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // // // // //           <View style={styles.driverMarkerContainer}>
// // // // // // //             <AnimatedView style={[styles.driverPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // // // // // //             <View style={[styles.driverMarker, { backgroundColor: UTOColors.rider.primary }]}>
// // // // // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // // // // //             </View>
// // // // // // //           </View>
// // // // // // //         </MarkerWrapper>
// // // // // // //       </MapViewWrapper>

// // // // // // //       {/* Loading indicator for route */}
// // // // // // //       {isLoadingRoute ? (
// // // // // // //         <View style={styles.loadingOverlay}>
// // // // // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // // // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // // // // //         </View>
// // // // // // //       ) : null}

// // // // // // //       <Animated.View
// // // // // // //         entering={FadeIn}
// // // // // // //         style={[
// // // // // // //           styles.bottomSheet,
// // // // // // //           Shadows.large,
// // // // // // //           {
// // // // // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // // // // //             backgroundColor: theme.backgroundRoot,
// // // // // // //           },
// // // // // // //         ]}
// // // // // // //       >
// // // // // // //         <View style={styles.statusSection}>
// // // // // // //           <View style={styles.statusRow}>
// // // // // // //             <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
// // // // // // //             <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
// // // // // // //           </View>
// // // // // // //           <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // // // // //             {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // // // // //           </ThemedText>
// // // // // // //         </View>

// // // // // // //         <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
// // // // // // //           <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
// // // // // // //             <MaterialIcons name="person" size={24} color={theme.textSecondary} />
// // // // // // //           </View>
// // // // // // //           <View style={styles.driverInfo}>
// // // // // // //             <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
// // // // // // //             <View style={styles.vehicleRow}>
// // // // // // //               <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
// // // // // // //                 {activeRide.vehicleInfo}
// // // // // // //               </ThemedText>
// // // // // // //               <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
// // // // // // //                 <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // // // // // //                 <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // // // // // //                   {activeRide.driverRating?.toFixed(1)}
// // // // // // //                 </ThemedText>
// // // // // // //               </View>
// // // // // // //             </View>
// // // // // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // // // // //               {activeRide.licensePlate}
// // // // // // //             </ThemedText>
// // // // // // //           </View>

// // // // // // //           <View style={styles.contactButtons}>
// // // // // // //             <Pressable
// // // // // // //               onPress={handleCall}
// // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // //             >
// // // // // // //               <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // // // // // //             </Pressable>
// // // // // // //             <Pressable
// // // // // // //               onPress={handleMessage}
// // // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // // //             >
// // // // // // //               <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // // // // // //             </Pressable>
// // // // // // //           </View>
// // // // // // //         </View>

// // // // // // //         <View style={styles.tripDetails}>
// // // // // // //           <View style={styles.routeContainer}>
// // // // // // //             <View style={styles.routeIndicator}>
// // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // // // // // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// // // // // // //             </View>
// // // // // // //             <View style={styles.addresses}>
// // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // //                 {activeRide.pickupLocation.address}
// // // // // // //               </ThemedText>
// // // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // // //                 {activeRide.dropoffLocation.address}
// // // // // // //               </ThemedText>
// // // // // // //             </View>
// // // // // // //             <ThemedText style={styles.farePrice}>
// // // // // // //               {formatPrice(activeRide.farePrice)}
// // // // // // //             </ThemedText>
// // // // // // //           </View>
// // // // // // //         </View>

// // // // // // //         <AnimatedPressable
// // // // // // //           onPress={handleCancel}
// // // // // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // // // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // // // // //           style={[
// // // // // // //             styles.cancelButton,
// // // // // // //             { backgroundColor: UTOColors.error + "15" },
// // // // // // //             cancelAnimatedStyle,
// // // // // // //           ]}
// // // // // // //         >
// // // // // // //           <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // // // // // //             Cancel Ride
// // // // // // //           </ThemedText>
// // // // // // //         </AnimatedPressable>
// // // // // // //       </Animated.View>
// // // // // // //     </View>
// // // // // // //   );
// // // // // // // }

// // // // // // // const styles = StyleSheet.create({
// // // // // // //   container: {
// // // // // // //     flex: 1,
// // // // // // //   },
// // // // // // //   map: {
// // // // // // //     flex: 1,
// // // // // // //   },
// // // // // // //   loadingOverlay: {
// // // // // // //     position: "absolute",
// // // // // // //     top: 60,
// // // // // // //     alignSelf: "center",
// // // // // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // // // // //     paddingHorizontal: Spacing.lg,
// // // // // // //     paddingVertical: Spacing.sm,
// // // // // // //     borderRadius: BorderRadius.full,
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //     gap: Spacing.sm,
// // // // // // //   },
// // // // // // //   loadingText: {
// // // // // // //     color: "#FFFFFF",
// // // // // // //     fontSize: 12,
// // // // // // //   },
// // // // // // //   markerContainer: {
// // // // // // //     width: 36,
// // // // // // //     height: 36,
// // // // // // //     borderRadius: 18,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //     borderWidth: 2,
// // // // // // //     borderColor: "#FFFFFF",
// // // // // // //   },
// // // // // // //   driverMarkerContainer: {
// // // // // // //     width: 50,
// // // // // // //     height: 50,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //   },
// // // // // // //   driverPulse: {
// // // // // // //     position: "absolute",
// // // // // // //     width: 50,
// // // // // // //     height: 50,
// // // // // // //     borderRadius: 25,
// // // // // // //   },
// // // // // // //   driverMarker: {
// // // // // // //     width: 36,
// // // // // // //     height: 36,
// // // // // // //     borderRadius: 18,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //     borderWidth: 3,
// // // // // // //     borderColor: "#FFFFFF",
// // // // // // //   },
// // // // // // //   bottomSheet: {
// // // // // // //     position: "absolute",
// // // // // // //     bottom: 0,
// // // // // // //     left: 0,
// // // // // // //     right: 0,
// // // // // // //     paddingHorizontal: Spacing.lg,
// // // // // // //     paddingTop: Spacing.xl,
// // // // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // // // //   },
// // // // // // //   statusSection: {
// // // // // // //     marginBottom: Spacing.lg,
// // // // // // //   },
// // // // // // //   statusRow: {
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //     marginBottom: 4,
// // // // // // //   },
// // // // // // //   statusDot: {
// // // // // // //     width: 10,
// // // // // // //     height: 10,
// // // // // // //     borderRadius: 5,
// // // // // // //     marginRight: Spacing.sm,
// // // // // // //   },
// // // // // // //   statusText: {
// // // // // // //     fontSize: 18,
// // // // // // //     fontWeight: "600",
// // // // // // //   },
// // // // // // //   eta: {
// // // // // // //     fontSize: 14,
// // // // // // //     marginLeft: 18,
// // // // // // //   },
// // // // // // //   driverCard: {
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //     padding: Spacing.lg,
// // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // //     marginBottom: Spacing.lg,
// // // // // // //   },
// // // // // // //   driverAvatar: {
// // // // // // //     width: 50,
// // // // // // //     height: 50,
// // // // // // //     borderRadius: 25,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //     marginRight: Spacing.md,
// // // // // // //   },
// // // // // // //   driverInfo: {
// // // // // // //     flex: 1,
// // // // // // //   },
// // // // // // //   driverName: {
// // // // // // //     fontSize: 16,
// // // // // // //     fontWeight: "600",
// // // // // // //     marginBottom: 2,
// // // // // // //   },
// // // // // // //   vehicleRow: {
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //     gap: Spacing.sm,
// // // // // // //     marginBottom: 2,
// // // // // // //   },
// // // // // // //   vehicleInfo: {
// // // // // // //     fontSize: 13,
// // // // // // //   },
// // // // // // //   ratingBadge: {
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //     paddingHorizontal: 6,
// // // // // // //     paddingVertical: 2,
// // // // // // //     borderRadius: BorderRadius.full,
// // // // // // //     gap: 4,
// // // // // // //   },
// // // // // // //   rating: {
// // // // // // //     fontSize: 11,
// // // // // // //     fontWeight: "600",
// // // // // // //   },
// // // // // // //   licensePlate: {
// // // // // // //     fontSize: 14,
// // // // // // //     fontWeight: "700",
// // // // // // //     letterSpacing: 1,
// // // // // // //   },
// // // // // // //   contactButtons: {
// // // // // // //     flexDirection: "row",
// // // // // // //     gap: Spacing.sm,
// // // // // // //   },
// // // // // // //   contactButton: {
// // // // // // //     width: 40,
// // // // // // //     height: 40,
// // // // // // //     borderRadius: 20,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //   },
// // // // // // //   tripDetails: {
// // // // // // //     marginBottom: Spacing.lg,
// // // // // // //   },
// // // // // // //   routeContainer: {
// // // // // // //     flexDirection: "row",
// // // // // // //     alignItems: "center",
// // // // // // //   },
// // // // // // //   routeIndicator: {
// // // // // // //     width: 20,
// // // // // // //     alignItems: "center",
// // // // // // //     marginRight: Spacing.md,
// // // // // // //   },
// // // // // // //   routeDot: {
// // // // // // //     width: 10,
// // // // // // //     height: 10,
// // // // // // //     borderRadius: 5,
// // // // // // //   },
// // // // // // //   routeLine: {
// // // // // // //     width: 2,
// // // // // // //     height: 24,
// // // // // // //     marginVertical: 4,
// // // // // // //   },
// // // // // // //   addresses: {
// // // // // // //     flex: 1,
// // // // // // //     justifyContent: "space-between",
// // // // // // //     height: 48,
// // // // // // //   },
// // // // // // //   address: {
// // // // // // //     fontSize: 14,
// // // // // // //   },
// // // // // // //   farePrice: {
// // // // // // //     fontSize: 20,
// // // // // // //     fontWeight: "700",
// // // // // // //     marginLeft: Spacing.md,
// // // // // // //   },
// // // // // // //   cancelButton: {
// // // // // // //     height: 48,
// // // // // // //     borderRadius: BorderRadius.lg,
// // // // // // //     alignItems: "center",
// // // // // // //     justifyContent: "center",
// // // // // // //   },
// // // // // // //   cancelButtonText: {
// // // // // // //     fontSize: 15,
// // // // // // //     fontWeight: "600",
// // // // // // //   },
// // // // // // // });

// // // // // // //client/screens/rider/RideTrackingScreen.tsx - WITH BLACK LINE DEBUG

// // // // // // import React, { useState, useEffect, useRef } from "react";
// // // // // // import {
// // // // // //   StyleSheet,
// // // // // //   View,
// // // // // //   Pressable,
// // // // // //   Linking,
// // // // // //   ActivityIndicator,
// // // // // // } from "react-native";
// // // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // // import Animated, {
// // // // // //   FadeIn,
// // // // // //   useAnimatedStyle,
// // // // // //   useSharedValue,
// // // // // //   withSpring,
// // // // // //   withRepeat,
// // // // // //   withTiming,
// // // // // // } from "react-native-reanimated";
// // // // // // import * as Haptics from "expo-haptics";

// // // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // // import { MapViewWrapper, MarkerWrapper, PolylineWrapper } from "@/components/MapView";
// // // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // // import { useRide } from "@/context/RideContext";
// // // // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // // // import { useAuth } from "@/context/AuthContext";
// // // // // // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // // // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // // const darkMapStyle = [
// // // // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // // // //   { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
// // // // // //   { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
// // // // // // ];

// // // // // // interface RoutePoint {
// // // // // //   latitude: number;
// // // // // //   longitude: number;
// // // // // // }

// // // // // // export default function RideTrackingScreen({ navigation }: any) {
// // // // // //   const insets = useSafeAreaInsets();
// // // // // //   const { theme, isDark } = useTheme();
// // // // // //   const { activeRide, cancelRide } = useRide();
// // // // // //   const { user } = useAuth();

// // // // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // // // //     riderId: user?.id || "",
// // // // // //     rideId: activeRide?.id,
// // // // // //   });

// // // // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
// // // // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // // // //   const hasInitialized = useRef(false);

// // // // // //   const pulseScale = useSharedValue(1);
// // // // // //   const cancelScale = useSharedValue(1);

// // // // // //   // Fetch route directions when ride is active
// // // // // //   useEffect(() => {
// // // // // //     if (!activeRide) {
// // // // // //       console.log('❌ No active ride');
// // // // // //       return;
// // // // // //     }

// // // // // //     const fetchRoutes = async () => {
// // // // // //       console.log('🚀 Starting route fetch...');
// // // // // //       setIsLoadingRoute(true);

// // // // // //       try {
// // // // // //         // Use direct domain instead of getApiUrl()
// // // // // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // // // // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // // // // //           baseUrl = `http://${baseUrl}`;
// // // // // //         }

// // // // // //         console.log('🌐 Base URL:', baseUrl);

// // // // // //         const pickupCoords = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // // // //         const dropoffCoords = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // // // //         console.log('📍 Pickup:', pickupCoords);
// // // // // //         console.log('📍 Dropoff:', dropoffCoords);

// // // // // //         const url = `${baseUrl}/api/directions?origin=${encodeURIComponent(pickupCoords)}&destination=${encodeURIComponent(dropoffCoords)}`;
// // // // // //         console.log('🔗 Fetching from:', url);

// // // // // //         const routeResponse = await fetch(url);
// // // // // //         console.log('📊 Response status:', routeResponse.status);

// // // // // //         const routeData = await routeResponse.json();
// // // // // //         console.log('📦 Response data:', JSON.stringify(routeData).substring(0, 200));

// // // // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // // // //           const route = routeData.routes[0];
// // // // // //           console.log('✅ Route found');

// // // // // //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// // // // // //             console.log('🛣️ Decoded polyline has', route.decodedPolyline.length, 'points');
// // // // // //             console.log('📍 First point:', route.decodedPolyline[0]);
// // // // // //             console.log('📍 Last point:', route.decodedPolyline[route.decodedPolyline.length - 1]);

// // // // // //             setRouteCoordinates(route.decodedPolyline);
// // // // // //             console.log('✅ Route coordinates SET!');
// // // // // //           } else {
// // // // // //             console.log('❌ No decodedPolyline in response');
// // // // // //           }
// // // // // //         } else {
// // // // // //           console.log('❌ No routes in response');
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         console.error("❌ Failed to fetch route:", error);
// // // // // //       } finally {
// // // // // //         setIsLoadingRoute(false);
// // // // // //         console.log('🏁 Route fetch complete');
// // // // // //       }
// // // // // //     };

// // // // // //     fetchRoutes();
// // // // // //   }, [activeRide?.id]);

// // // // // //   // Fetch driver route to pickup
// // // // // //   useEffect(() => {
// // // // // //     if (!activeRide || !driverLocation) return;

// // // // // //     const fetchDriverRoute = async () => {
// // // // // //       try {
// // // // // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // // // // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // // // // //           baseUrl = `http://${baseUrl}`;
// // // // // //         }

// // // // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // // // //         const response = await fetch(
// // // // // //           `${baseUrl}/api/directions?origin=${encodeURIComponent(driverPos)}&destination=${encodeURIComponent(pickup)}`
// // // // // //         );
// // // // // //         const data = await response.json();

// // // // // //         if (data.routes && data.routes.length > 0) {
// // // // // //           const route = data.routes[0];
// // // // // //           if (route.decodedPolyline) {
// // // // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // // // //           }
// // // // // //           if (route.legs && route.legs[0]) {
// // // // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // // // //           }
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         console.error("Failed to fetch driver route:", error);
// // // // // //       }
// // // // // //     };

// // // // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // // // //       fetchDriverRoute();
// // // // // //     }
// // // // // //   }, [driverLocation?.latitude, driverLocation?.longitude, activeRide?.status, rideStatus]);

// // // // // //   useEffect(() => {
// // // // // //     pulseScale.value = withRepeat(
// // // // // //       withTiming(1.2, { duration: 1000 }),
// // // // // //       -1,
// // // // // //       true
// // // // // //     );
// // // // // //     hasInitialized.current = true;
// // // // // //   }, []);

// // // // // //   useEffect(() => {
// // // // // //     if (!activeRide && hasInitialized.current) {
// // // // // //       const timer = setTimeout(() => {
// // // // // //         if (!activeRide) {
// // // // // //           navigation.goBack();
// // // // // //         }
// // // // // //       }, 500);
// // // // // //       return () => clearTimeout(timer);
// // // // // //     }
// // // // // //   }, [activeRide]);

// // // // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // // // //     transform: [{ scale: pulseScale.value }],
// // // // // //     opacity: 2 - pulseScale.value,
// // // // // //   }));

// // // // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // // // //     transform: [{ scale: cancelScale.value }],
// // // // // //   }));

// // // // // //   if (!activeRide) return null;

// // // // // //   const handleCancel = () => {
// // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // // //     cancelRide(activeRide.id);
// // // // // //   };

// // // // // //   const handleCall = () => {
// // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // //     Linking.openURL("tel:+1234567890");
// // // // // //   };

// // // // // //   const handleMessage = () => {
// // // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // // //     Linking.openURL("sms:+1234567890");
// // // // // //   };

// // // // // //   const getStatusMessage = () => {
// // // // // //     const status = rideStatus || activeRide.status;
// // // // // //     switch (status) {
// // // // // //       case "accepted":
// // // // // //         return "Driver is on the way";
// // // // // //       case "arrived":
// // // // // //         return "Driver has arrived";
// // // // // //       case "in_progress":
// // // // // //         return "On your way to destination";
// // // // // //       default:
// // // // // //         return "Finding your driver...";
// // // // // //     }
// // // // // //   };

// // // // // //   const getMapRegion = () => {
// // // // // //     const points: RoutePoint[] = [
// // // // // //       { latitude: activeRide.pickupLocation.latitude, longitude: activeRide.pickupLocation.longitude },
// // // // // //       { latitude: activeRide.dropoffLocation.latitude, longitude: activeRide.dropoffLocation.longitude },
// // // // // //     ];

// // // // // //     if (driverLocation) {
// // // // // //       points.push({ latitude: driverLocation.latitude, longitude: driverLocation.longitude });
// // // // // //     }

// // // // // //     const lats = points.map(p => p.latitude);
// // // // // //     const lngs = points.map(p => p.longitude);

// // // // // //     const minLat = Math.min(...lats);
// // // // // //     const maxLat = Math.max(...lats);
// // // // // //     const minLng = Math.min(...lngs);
// // // // // //     const maxLng = Math.max(...lngs);

// // // // // //     const centerLat = (minLat + maxLat) / 2;
// // // // // //     const centerLng = (minLng + maxLng) / 2;

// // // // // //     const latDelta = Math.max((maxLat - minLat) * 1.5, 0.02);
// // // // // //     const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.02);

// // // // // //     return {
// // // // // //       latitude: centerLat,
// // // // // //       longitude: centerLng,
// // // // // //       latitudeDelta: latDelta,
// // // // // //       longitudeDelta: lngDelta,
// // // // // //     };
// // // // // //   };

// // // // // //   const currentDriverLocation = driverLocation || {
// // // // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // // // //   };

// // // // // //   const currentStatus = rideStatus || activeRide.status;

// // // // // //   // DEBUG: Log route coordinates state
// // // // // //   console.log('🎨 Rendering with', routeCoordinates.length, 'route points');

// // // // // //   return (
// // // // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // // // //       <MapViewWrapper
// // // // // //         style={styles.map}
// // // // // //         initialRegion={getMapRegion()}
// // // // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // // // //       >
// // // // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // // // //         {console.log('🖍️ Checking if should render polyline:', routeCoordinates.length > 0)}
// // // // // //         {routeCoordinates.length > 0 && (
// // // // // //           <>
// // // // // //             {console.log('✏️ RENDERING POLYLINE with', routeCoordinates.length, 'points')}
// // // // // //             <PolylineWrapper
// // // // // //               coordinates={routeCoordinates}
// // // // // //               strokeColor="#000000"
// // // // // //               strokeWidth={5}
// // // // // //             />
// // // // // //           </>
// // // // // //         )}

// // // // // //         {/* Route from driver to pickup (dashed yellow) */}
// // // // // //         {driverToPickupRoute.length > 0 && (currentStatus === "accepted" || currentStatus === "arrived") && (
// // // // // //           <PolylineWrapper
// // // // // //             coordinates={driverToPickupRoute}
// // // // // //             strokeColor={UTOColors.rider.primary}
// // // // // //             strokeWidth={4}
// // // // // //             lineDashPattern={[10, 5]}
// // // // // //           />
// // // // // //         )}

// // // // // //         {/* Pickup marker */}
// // // // // //         <MarkerWrapper
// // // // // //           coordinate={{
// // // // // //             latitude: activeRide.pickupLocation.latitude,
// // // // // //             longitude: activeRide.pickupLocation.longitude,
// // // // // //           }}
// // // // // //           title="Pickup"
// // // // // //         >
// // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
// // // // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // // // //           </View>
// // // // // //         </MarkerWrapper>

// // // // // //         {/* Dropoff marker */}
// // // // // //         <MarkerWrapper
// // // // // //           coordinate={{
// // // // // //             latitude: activeRide.dropoffLocation.latitude,
// // // // // //             longitude: activeRide.dropoffLocation.longitude,
// // // // // //           }}
// // // // // //           title="Dropoff"
// // // // // //         >
// // // // // //           <View style={[styles.markerContainer, { backgroundColor: UTOColors.error }]}>
// // // // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // // // //           </View>
// // // // // //         </MarkerWrapper>

// // // // // //         {/* Driver marker with pulse animation */}
// // // // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // // // //           <View style={styles.driverMarkerContainer}>
// // // // // //             <AnimatedView style={[styles.driverPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // // // // //             <View style={[styles.driverMarker, { backgroundColor: UTOColors.rider.primary }]}>
// // // // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // // // //             </View>
// // // // // //           </View>
// // // // // //         </MarkerWrapper>
// // // // // //       </MapViewWrapper>

// // // // // //       {/* Loading indicator for route */}
// // // // // //       {isLoadingRoute && (
// // // // // //         <View style={styles.loadingOverlay}>
// // // // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // // // //         </View>
// // // // // //       )}

// // // // // //       <Animated.View
// // // // // //         entering={FadeIn}
// // // // // //         style={[
// // // // // //           styles.bottomSheet,
// // // // // //           Shadows.large,
// // // // // //           {
// // // // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // // // //             backgroundColor: theme.backgroundRoot,
// // // // // //           },
// // // // // //         ]}
// // // // // //       >
// // // // // //         <View style={styles.statusSection}>
// // // // // //           <View style={styles.statusRow}>
// // // // // //             <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
// // // // // //             <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
// // // // // //           </View>
// // // // // //           <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // // // //             {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // // // //           </ThemedText>
// // // // // //         </View>

// // // // // //         <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
// // // // // //           <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
// // // // // //             <MaterialIcons name="person" size={24} color={theme.textSecondary} />
// // // // // //           </View>
// // // // // //           <View style={styles.driverInfo}>
// // // // // //             <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
// // // // // //             <View style={styles.vehicleRow}>
// // // // // //               <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
// // // // // //                 {activeRide.vehicleInfo}
// // // // // //               </ThemedText>
// // // // // //               <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
// // // // // //                 <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // // // // //                 <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // // // // //                   {activeRide.driverRating?.toFixed(1)}
// // // // // //                 </ThemedText>
// // // // // //               </View>
// // // // // //             </View>
// // // // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // // // //               {activeRide.licensePlate}
// // // // // //             </ThemedText>
// // // // // //           </View>

// // // // // //           <View style={styles.contactButtons}>
// // // // // //             <Pressable
// // // // // //               onPress={handleCall}
// // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // //             >
// // // // // //               <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // // // // //             </Pressable>
// // // // // //             <Pressable
// // // // // //               onPress={handleMessage}
// // // // // //               style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // // // //             >
// // // // // //               <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // // // // //             </Pressable>
// // // // // //           </View>
// // // // // //         </View>

// // // // // //         <View style={styles.tripDetails}>
// // // // // //           <View style={styles.routeContainer}>
// // // // // //             <View style={styles.routeIndicator}>
// // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // // // // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // // // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// // // // // //             </View>
// // // // // //             <View style={styles.addresses}>
// // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // //                 {activeRide.pickupLocation.address}
// // // // // //               </ThemedText>
// // // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // // //                 {activeRide.dropoffLocation.address}
// // // // // //               </ThemedText>
// // // // // //             </View>
// // // // // //             <ThemedText style={styles.farePrice}>
// // // // // //               {formatPrice(activeRide.farePrice)}
// // // // // //             </ThemedText>
// // // // // //           </View>
// // // // // //         </View>

// // // // // //         <AnimatedPressable
// // // // // //           onPress={handleCancel}
// // // // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // // // //           style={[
// // // // // //             styles.cancelButton,
// // // // // //             { backgroundColor: UTOColors.error + "15" },
// // // // // //             cancelAnimatedStyle,
// // // // // //           ]}
// // // // // //         >
// // // // // //           <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // // // // //             Cancel Ride
// // // // // //           </ThemedText>
// // // // // //         </AnimatedPressable>
// // // // // //       </Animated.View>
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // const styles = StyleSheet.create({
// // // // // //   container: {
// // // // // //     flex: 1,
// // // // // //   },
// // // // // //   map: {
// // // // // //     flex: 1,
// // // // // //   },
// // // // // //   loadingOverlay: {
// // // // // //     position: "absolute",
// // // // // //     top: 60,
// // // // // //     alignSelf: "center",
// // // // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // // // //     paddingHorizontal: Spacing.lg,
// // // // // //     paddingVertical: Spacing.sm,
// // // // // //     borderRadius: BorderRadius.full,
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //     gap: Spacing.sm,
// // // // // //   },
// // // // // //   loadingText: {
// // // // // //     color: "#FFFFFF",
// // // // // //     fontSize: 12,
// // // // // //   },
// // // // // //   debugInfo: {
// // // // // //     position: "absolute",
// // // // // //     top: 100,
// // // // // //     alignSelf: "center",
// // // // // //     backgroundColor: "rgba(255,0,0,0.8)",
// // // // // //     paddingHorizontal: Spacing.md,
// // // // // //     paddingVertical: Spacing.xs,
// // // // // //     borderRadius: BorderRadius.sm,
// // // // // //   },
// // // // // //   debugText: {
// // // // // //     color: "#FFFFFF",
// // // // // //     fontSize: 10,
// // // // // //     fontWeight: "bold",
// // // // // //   },
// // // // // //   markerContainer: {
// // // // // //     width: 36,
// // // // // //     height: 36,
// // // // // //     borderRadius: 18,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //     borderWidth: 2,
// // // // // //     borderColor: "#FFFFFF",
// // // // // //   },
// // // // // //   driverMarkerContainer: {
// // // // // //     width: 50,
// // // // // //     height: 50,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //   },
// // // // // //   driverPulse: {
// // // // // //     position: "absolute",
// // // // // //     width: 50,
// // // // // //     height: 50,
// // // // // //     borderRadius: 25,
// // // // // //   },
// // // // // //   driverMarker: {
// // // // // //     width: 36,
// // // // // //     height: 36,
// // // // // //     borderRadius: 18,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //     borderWidth: 3,
// // // // // //     borderColor: "#FFFFFF",
// // // // // //   },
// // // // // //   bottomSheet: {
// // // // // //     position: "absolute",
// // // // // //     bottom: 0,
// // // // // //     left: 0,
// // // // // //     right: 0,
// // // // // //     paddingHorizontal: Spacing.lg,
// // // // // //     paddingTop: Spacing.xl,
// // // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // // //   },
// // // // // //   statusSection: {
// // // // // //     marginBottom: Spacing.lg,
// // // // // //   },
// // // // // //   statusRow: {
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //     marginBottom: 4,
// // // // // //   },
// // // // // //   statusDot: {
// // // // // //     width: 10,
// // // // // //     height: 10,
// // // // // //     borderRadius: 5,
// // // // // //     marginRight: Spacing.sm,
// // // // // //   },
// // // // // //   statusText: {
// // // // // //     fontSize: 18,
// // // // // //     fontWeight: "600",
// // // // // //   },
// // // // // //   eta: {
// // // // // //     fontSize: 14,
// // // // // //     marginLeft: 18,
// // // // // //   },
// // // // // //   driverCard: {
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //     padding: Spacing.lg,
// // // // // //     borderRadius: BorderRadius.lg,
// // // // // //     marginBottom: Spacing.lg,
// // // // // //   },
// // // // // //   driverAvatar: {
// // // // // //     width: 50,
// // // // // //     height: 50,
// // // // // //     borderRadius: 25,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //     marginRight: Spacing.md,
// // // // // //   },
// // // // // //   driverInfo: {
// // // // // //     flex: 1,
// // // // // //   },
// // // // // //   driverName: {
// // // // // //     fontSize: 16,
// // // // // //     fontWeight: "600",
// // // // // //     marginBottom: 2,
// // // // // //   },
// // // // // //   vehicleRow: {
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //     gap: Spacing.sm,
// // // // // //     marginBottom: 2,
// // // // // //   },
// // // // // //   vehicleInfo: {
// // // // // //     fontSize: 13,
// // // // // //   },
// // // // // //   ratingBadge: {
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //     paddingHorizontal: 6,
// // // // // //     paddingVertical: 2,
// // // // // //     borderRadius: BorderRadius.full,
// // // // // //     gap: 4,
// // // // // //   },
// // // // // //   rating: {
// // // // // //     fontSize: 11,
// // // // // //     fontWeight: "600",
// // // // // //   },
// // // // // //   licensePlate: {
// // // // // //     fontSize: 14,
// // // // // //     fontWeight: "700",
// // // // // //     letterSpacing: 1,
// // // // // //   },
// // // // // //   contactButtons: {
// // // // // //     flexDirection: "row",
// // // // // //     gap: Spacing.sm,
// // // // // //   },
// // // // // //   contactButton: {
// // // // // //     width: 40,
// // // // // //     height: 40,
// // // // // //     borderRadius: 20,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //   },
// // // // // //   tripDetails: {
// // // // // //     marginBottom: Spacing.lg,
// // // // // //   },
// // // // // //   routeContainer: {
// // // // // //     flexDirection: "row",
// // // // // //     alignItems: "center",
// // // // // //   },
// // // // // //   routeIndicator: {
// // // // // //     width: 20,
// // // // // //     alignItems: "center",
// // // // // //     marginRight: Spacing.md,
// // // // // //   },
// // // // // //   routeDot: {
// // // // // //     width: 10,
// // // // // //     height: 10,
// // // // // //     borderRadius: 5,
// // // // // //   },
// // // // // //   routeLine: {
// // // // // //     width: 2,
// // // // // //     height: 24,
// // // // // //     marginVertical: 4,
// // // // // //   },
// // // // // //   addresses: {
// // // // // //     flex: 1,
// // // // // //     justifyContent: "space-between",
// // // // // //     height: 48,
// // // // // //   },
// // // // // //   address: {
// // // // // //     fontSize: 14,
// // // // // //   },
// // // // // //   farePrice: {
// // // // // //     fontSize: 20,
// // // // // //     fontWeight: "700",
// // // // // //     marginLeft: Spacing.md,
// // // // // //   },
// // // // // //   cancelButton: {
// // // // // //     height: 48,
// // // // // //     borderRadius: BorderRadius.lg,
// // // // // //     alignItems: "center",
// // // // // //     justifyContent: "center",
// // // // // //   },
// // // // // //   cancelButtonText: {
// // // // // //     fontSize: 15,
// // // // // //     fontWeight: "600",
// // // // // //   },
// // // // // // });
// // // // // //client/screen/rider/RideTrackingScreen.tsx

// // // // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // // // import {
// // // // //   StyleSheet,
// // // // //   View,
// // // // //   Pressable,
// // // // //   Platform,
// // // // //   Linking,
// // // // //   ActivityIndicator,
// // // // // } from "react-native";
// // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // import Animated, {
// // // // //   FadeIn,
// // // // //   useAnimatedStyle,
// // // // //   useSharedValue,
// // // // //   withSpring,
// // // // //   withRepeat,
// // // // //   withTiming,
// // // // // } from "react-native-reanimated";
// // // // // import * as Haptics from "expo-haptics";

// // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // import {
// // // // //   MapViewWrapper,
// // // // //   MarkerWrapper,
// // // // //   PolylineWrapper,
// // // // // } from "@/components/MapView";
// // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // import { useRide } from "@/context/RideContext";
// // // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // // import { useAuth } from "@/context/AuthContext";
// // // // // import { getApiUrl } from "@/lib/query-client";
// // // // // import {
// // // // //   UTOColors,
// // // // //   Spacing,
// // // // //   BorderRadius,
// // // // //   Shadows,
// // // // //   formatPrice,
// // // // // } from "@/constants/theme";

// // // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // const darkMapStyle = [
// // // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // // //   {
// // // // //     featureType: "road",
// // // // //     elementType: "geometry",
// // // // //     stylers: [{ color: "#38414e" }],
// // // // //   },
// // // // //   {
// // // // //     featureType: "water",
// // // // //     elementType: "geometry",
// // // // //     stylers: [{ color: "#17263c" }],
// // // // //   },
// // // // // ];

// // // // // interface RoutePoint {
// // // // //   latitude: number;
// // // // //   longitude: number;
// // // // // }

// // // // // export default function RideTrackingScreen({ navigation }: any) {
// // // // //   const insets = useSafeAreaInsets();
// // // // //   const { theme, isDark } = useTheme();
// // // // //   const { activeRide, cancelRide, completeRide } = useRide();
// // // // //   const { user } = useAuth();

// // // // //   // Real-time driver tracking
// // // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // // //     riderId: user?.id || "",
// // // // //     rideId: activeRide?.id,
// // // // //   });

// // // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>(
// // // // //     [],
// // // // //   );
// // // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // // //   const hasInitialized = useRef(false);

// // // // //   const pulseScale = useSharedValue(1);
// // // // //   const cancelScale = useSharedValue(1);

// // // // //   // Fetch route directions when ride is active
// // // // //   useEffect(() => {
// // // // //     if (!activeRide) return;

// // // // //     const fetchRoutes = async () => {
// // // // //       setIsLoadingRoute(true);
// // // // //       try {
// // // // //         const apiUrl = getApiUrl();

// // // // //         // Fetch route from pickup to dropoff
// // // // //         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // // //         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // // //         const routeResponse = await fetch(
// // // // //           new URL(
// // // // //             `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`,
// // // // //             apiUrl,
// // // // //           ).toString(),
// // // // //         );
// // // // //         const routeData = await routeResponse.json();

// // // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // // //           const route = routeData.routes[0];
// // // // //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// // // // //             setRouteCoordinates(route.decodedPolyline);
// // // // //           }
// // // // //         }
// // // // //       } catch (error) {
// // // // //         console.error("Failed to fetch route:", error);
// // // // //       } finally {
// // // // //         setIsLoadingRoute(false);
// // // // //       }
// // // // //     };

// // // // //     fetchRoutes();
// // // // //   }, [activeRide?.id]);

// // // // //   // Fetch driver route to pickup when driver location updates
// // // // //   useEffect(() => {
// // // // //     if (!activeRide || !driverLocation) return;

// // // // //     const fetchDriverRoute = async () => {
// // // // //       try {
// // // // //         const apiUrl = getApiUrl();
// // // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // // //         const response = await fetch(
// // // // //           new URL(
// // // // //             `/api/directions?origin=${driverPos}&destination=${pickup}`,
// // // // //             apiUrl,
// // // // //           ).toString(),
// // // // //         );
// // // // //         const data = await response.json();

// // // // //         if (data.routes && data.routes.length > 0) {
// // // // //           const route = data.routes[0];
// // // // //           if (route.decodedPolyline) {
// // // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // // //           }
// // // // //           if (route.legs && route.legs[0]) {
// // // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // // //           }
// // // // //         }
// // // // //       } catch (error) {
// // // // //         console.error("Failed to fetch driver route:", error);
// // // // //       }
// // // // //     };

// // // // //     // Only fetch if driver is coming to pickup
// // // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // // //       fetchDriverRoute();
// // // // //     }
// // // // //   }, [
// // // // //     driverLocation?.latitude,
// // // // //     driverLocation?.longitude,
// // // // //     activeRide?.status,
// // // // //     rideStatus,
// // // // //   ]);

// // // // //   useEffect(() => {
// // // // //     pulseScale.value = withRepeat(
// // // // //       withTiming(1.2, { duration: 1000 }),
// // // // //       -1,
// // // // //       true,
// // // // //     );
// // // // //     hasInitialized.current = true;
// // // // //   }, []);

// // // // //   useEffect(() => {
// // // // //     if (!activeRide && hasInitialized.current) {
// // // // //       const timer = setTimeout(() => {
// // // // //         if (!activeRide) {
// // // // //           navigation.goBack();
// // // // //         }
// // // // //       }, 500);
// // // // //       return () => clearTimeout(timer);
// // // // //     }
// // // // //   }, [activeRide]);

// // // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // // //     transform: [{ scale: pulseScale.value }],
// // // // //     opacity: 2 - pulseScale.value,
// // // // //   }));

// // // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // // //     transform: [{ scale: cancelScale.value }],
// // // // //   }));

// // // // //   if (!activeRide) return null;

// // // // //   const handleCancel = () => {
// // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // //     cancelRide(activeRide.id);
// // // // //   };

// // // // //   const handleCall = () => {
// // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // //     Linking.openURL("tel:+1234567890");
// // // // //   };

// // // // //   const handleMessage = () => {
// // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // // //     Linking.openURL("sms:+1234567890");
// // // // //   };

// // // // //   const getStatusMessage = () => {
// // // // //     const status = rideStatus || activeRide.status;
// // // // //     switch (status) {
// // // // //       case "accepted":
// // // // //         return "Driver is on the way";
// // // // //       case "arrived":
// // // // //         return "Driver has arrived";
// // // // //       case "in_progress":
// // // // //         return "On your way to destination";
// // // // //       default:
// // // // //         return "Finding your driver...";
// // // // //     }
// // // // //   };

// // // // //   // Calculate map region to fit all points
// // // // //   const getMapRegion = () => {
// // // // //     const points: RoutePoint[] = [
// // // // //       {
// // // // //         latitude: activeRide.pickupLocation.latitude,
// // // // //         longitude: activeRide.pickupLocation.longitude,
// // // // //       },
// // // // //       {
// // // // //         latitude: activeRide.dropoffLocation.latitude,
// // // // //         longitude: activeRide.dropoffLocation.longitude,
// // // // //       },
// // // // //     ];

// // // // //     if (driverLocation) {
// // // // //       points.push({
// // // // //         latitude: driverLocation.latitude,
// // // // //         longitude: driverLocation.longitude,
// // // // //       });
// // // // //     }

// // // // //     const lats = points.map((p) => p.latitude);
// // // // //     const lngs = points.map((p) => p.longitude);

// // // // //     const minLat = Math.min(...lats);
// // // // //     const maxLat = Math.max(...lats);
// // // // //     const minLng = Math.min(...lngs);
// // // // //     const maxLng = Math.max(...lngs);

// // // // //     const centerLat = (minLat + maxLat) / 2;
// // // // //     const centerLng = (minLng + maxLng) / 2;

// // // // //     const latDelta = Math.max((maxLat - minLat) * 2, 0.01);
// // // // //     const lngDelta = Math.max((maxLng - minLng) * 2, 0.01);

// // // // //     return {
// // // // //       latitude: centerLat,
// // // // //       longitude: centerLng,
// // // // //       latitudeDelta: latDelta,
// // // // //       longitudeDelta: lngDelta,
// // // // //     };
// // // // //   };

// // // // //   // Helper to calculate distance for the UI
// // // // //   const getDistanceString = () => {
// // // // //     if (!driverLocation || !activeRide) return null;

// // // // //     // Simple Haversine-ish distance for the UI
// // // // //     const R = 6371; // km
// // // // //     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
// // // // //     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
// // // // //     const a = 
// // // // //       Math.sin(dLat/2) * Math.sin(dLat/2) +
// // // // //       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) * 
// // // // //       Math.sin(dLon/2) * Math.sin(dLon/2);
// // // // //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// // // // //     const d = R * c;

// // // // //     // Convert to miles (Uber style)
// // // // //     const miles = d * 0.621371;
// // // // //     if (miles < 0.1) return "Nearby";
// // // // //     return `${miles.toFixed(1)} miles`;
// // // // //   };

// // // // //   // Use real driver location or simulate one for demo
// // // // //   const currentDriverLocation = driverLocation || {
// // // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // // //   };

// // // // //   const currentStatus = rideStatus || activeRide.status;

// // // // //   return (
// // // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // // //       <MapViewWrapper
// // // // //         style={styles.map}
// // // // //         initialRegion={getMapRegion()}
// // // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // // //       >
// // // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // // //         {routeCoordinates.length > 0 ? (
// // // // //           <PolylineWrapper
// // // // //             coordinates={routeCoordinates}
// // // // //             strokeColor="#000000"
// // // // //             strokeWidth={5}
// // // // //           />
// // // // //         ) : null}

// // // // //         {/* Route from driver to pickup (dashed yellow) */}
// // // // //         {driverToPickupRoute.length > 0 &&
// // // // //         (currentStatus === "accepted" || currentStatus === "arrived") ? (
// // // // //           <PolylineWrapper
// // // // //             coordinates={driverToPickupRoute}
// // // // //             strokeColor={UTOColors.rider.primary}
// // // // //             strokeWidth={4}
// // // // //             lineDashPattern={[10, 5]}
// // // // //           />
// // // // //         ) : null}

// // // // //         {/* Pickup marker */}
// // // // //         <MarkerWrapper
// // // // //           coordinate={{
// // // // //             latitude: activeRide.pickupLocation.latitude,
// // // // //             longitude: activeRide.pickupLocation.longitude,
// // // // //           }}
// // // // //           title="Pickup"
// // // // //         >
// // // // //           <View
// // // // //             style={[
// // // // //               styles.markerContainer,
// // // // //               { backgroundColor: UTOColors.success },
// // // // //             ]}
// // // // //           >
// // // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // // //           </View>
// // // // //         </MarkerWrapper>

// // // // //         {/* Dropoff marker */}
// // // // //         <MarkerWrapper
// // // // //           coordinate={{
// // // // //             latitude: activeRide.dropoffLocation.latitude,
// // // // //             longitude: activeRide.dropoffLocation.longitude,
// // // // //           }}
// // // // //           title="Dropoff"
// // // // //         >
// // // // //           <View
// // // // //             style={[
// // // // //               styles.markerContainer,
// // // // //               { backgroundColor: UTOColors.error },
// // // // //             ]}
// // // // //           >
// // // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // // //           </View>
// // // // //         </MarkerWrapper>

// // // // //         {/* Driver marker with pulse animation */}
// // // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // // //           <View style={styles.driverMarkerContainer}>
// // // // //             <AnimatedView
// // // // //               style={[
// // // // //                 styles.driverPulse,
// // // // //                 { backgroundColor: UTOColors.rider.primary },
// // // // //                 pulseStyle,
// // // // //               ]}
// // // // //             />
// // // // //             <View
// // // // //               style={[
// // // // //                 styles.driverMarker,
// // // // //                 { backgroundColor: UTOColors.rider.primary },
// // // // //               ]}
// // // // //             >
// // // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // // //             </View>
// // // // //           </View>
// // // // //         </MarkerWrapper>
// // // // //       </MapViewWrapper>

// // // // //       {/* Loading indicator for route */}
// // // // //       {isLoadingRoute ? (
// // // // //         <View style={styles.loadingOverlay}>
// // // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // // //         </View>
// // // // //       ) : null}

// // // // //       <Animated.View
// // // // //         entering={FadeIn}
// // // // //         style={[
// // // // //           styles.bottomSheet,
// // // // //           Shadows.large,
// // // // //           {
// // // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // // //             backgroundColor: theme.backgroundRoot,
// // // // //           },
// // // // //         ]}
// // // // //       >
// // // // //         <View style={styles.statusSection}>
// // // // //           <View style={styles.statusRow}>
// // // // //             <View
// // // // //               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
// // // // //             />
// // // // //             <ThemedText style={styles.statusText}>
// // // // //               {getStatusMessage()}
// // // // //             </ThemedText>
// // // // //           </View>
// // // // //           <View style={styles.etaRow}>
// // // // //             <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // // //               {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // // //             </ThemedText>
// // // // //             {getDistanceString() && (
// // // // //               <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
// // // // //                 • {getDistanceString()}
// // // // //               </ThemedText>
// // // // //             )}
// // // // //           </View>
// // // // //         </View>

// // // // //         {activeRide.status === "accepted" && activeRide.otp && (
// // // // //           <View
// // // // //             style={[
// // // // //               styles.otpContainer,
// // // // //               { backgroundColor: UTOColors.rider.primary },
// // // // //             ]}
// // // // //           >
// // // // //             <ThemedText style={styles.otpLabel}>
// // // // //               Share PIN with driver
// // // // //             </ThemedText>
// // // // //             <View style={styles.otpBox}>
// // // // //               {activeRide.otp.split("").map((digit, i) => (
// // // // //                 <View key={i} style={styles.otpDigit}>
// // // // //                   <ThemedText style={styles.otpText}>{digit}</ThemedText>
// // // // //                 </View>
// // // // //               ))}
// // // // //             </View>
// // // // //           </View>
// // // // //         )}

// // // // //         <View
// // // // //           style={[
// // // // //             styles.driverCard,
// // // // //             { backgroundColor: theme.backgroundDefault },
// // // // //           ]}
// // // // //         >
// // // // //           <View
// // // // //             style={[
// // // // //               styles.driverAvatar,
// // // // //               { backgroundColor: theme.backgroundSecondary },
// // // // //             ]}
// // // // //           >
// // // // //             <MaterialIcons
// // // // //               name="person"
// // // // //               size={24}
// // // // //               color={theme.textSecondary}
// // // // //             />
// // // // //           </View>
// // // // //           <View style={styles.driverInfo}>
// // // // //             <ThemedText style={styles.driverName}>
// // // // //               {activeRide.driverName}
// // // // //             </ThemedText>
// // // // //             <View style={styles.vehicleRow}>
// // // // //               <ThemedText
// // // // //                 style={[styles.vehicleInfo, { color: theme.textSecondary }]}
// // // // //               >
// // // // //                 {activeRide.vehicleInfo}
// // // // //               </ThemedText>
// // // // //               <View
// // // // //                 style={[
// // // // //                   styles.ratingBadge,
// // // // //                   { backgroundColor: UTOColors.warning + "20" },
// // // // //                 ]}
// // // // //               >
// // // // //                 <MaterialIcons
// // // // //                   name="star"
// // // // //                   size={12}
// // // // //                   color={UTOColors.warning}
// // // // //                 />
// // // // //                 <ThemedText
// // // // //                   style={[styles.rating, { color: UTOColors.warning }]}
// // // // //                 >
// // // // //                   {activeRide.driverRating?.toFixed(1)}
// // // // //                 </ThemedText>
// // // // //               </View>
// // // // //             </View>
// // // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // // //               {activeRide.licensePlate}
// // // // //             </ThemedText>
// // // // //           </View>

// // // // //           <View style={styles.contactButtons}>
// // // // //             <Pressable
// // // // //               onPress={handleCall}
// // // // //               style={[
// // // // //                 styles.contactButton,
// // // // //                 { backgroundColor: theme.backgroundSecondary },
// // // // //               ]}
// // // // //             >
// // // // //               <MaterialIcons
// // // // //                 name="phone"
// // // // //                 size={18}
// // // // //                 color={UTOColors.rider.primary}
// // // // //               />
// // // // //             </Pressable>
// // // // //             <Pressable
// // // // //               onPress={handleMessage}
// // // // //               style={[
// // // // //                 styles.contactButton,
// // // // //                 { backgroundColor: theme.backgroundSecondary },
// // // // //               ]}
// // // // //             >
// // // // //               <MaterialIcons
// // // // //                 name="chat"
// // // // //                 size={18}
// // // // //                 color={UTOColors.rider.primary}
// // // // //               />
// // // // //             </Pressable>
// // // // //           </View>
// // // // //         </View>

// // // // //         <View style={styles.tripDetails}>
// // // // //           <View style={styles.routeContainer}>
// // // // //             <View style={styles.routeIndicator}>
// // // // //               <View
// // // // //                 style={[
// // // // //                   styles.routeDot,
// // // // //                   { backgroundColor: UTOColors.success },
// // // // //                 ]}
// // // // //               />
// // // // //               <View
// // // // //                 style={[styles.routeLine, { backgroundColor: theme.border }]}
// // // // //               />
// // // // //               <View
// // // // //                 style={[styles.routeDot, { backgroundColor: UTOColors.error }]}
// // // // //               />
// // // // //             </View>
// // // // //             <View style={styles.addresses}>
// // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // //                 {activeRide.pickupLocation.address}
// // // // //               </ThemedText>
// // // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // // //                 {activeRide.dropoffLocation.address}
// // // // //               </ThemedText>
// // // // //             </View>
// // // // //             <ThemedText style={styles.farePrice}>
// // // // //               {formatPrice(activeRide.farePrice)}
// // // // //             </ThemedText>
// // // // //           </View>
// // // // //         </View>

// // // // //         <AnimatedPressable
// // // // //           onPress={handleCancel}
// // // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // // //           style={[
// // // // //             styles.cancelButton,
// // // // //             { backgroundColor: UTOColors.error + "15" },
// // // // //             cancelAnimatedStyle,
// // // // //           ]}
// // // // //         >
// // // // //           <ThemedText
// // // // //             style={[styles.cancelButtonText, { color: UTOColors.error }]}
// // // // //           >
// // // // //             Cancel Ride
// // // // //           </ThemedText>
// // // // //         </AnimatedPressable>
// // // // //       </Animated.View>
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // const styles = StyleSheet.create({
// // // // //   container: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   map: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   loadingOverlay: {
// // // // //     position: "absolute",
// // // // //     top: 60,
// // // // //     alignSelf: "center",
// // // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // // //     paddingHorizontal: Spacing.lg,
// // // // //     paddingVertical: Spacing.sm,
// // // // //     borderRadius: BorderRadius.full,
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     gap: Spacing.sm,
// // // // //   },
// // // // //   loadingText: {
// // // // //     color: "#FFFFFF",
// // // // //     fontSize: 12,
// // // // //   },
// // // // //   markerContainer: {
// // // // //     width: 36,
// // // // //     height: 36,
// // // // //     borderRadius: 18,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //     borderWidth: 2,
// // // // //     borderColor: "#FFFFFF",
// // // // //   },
// // // // //   driverMarkerContainer: {
// // // // //     width: 50,
// // // // //     height: 50,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   driverPulse: {
// // // // //     position: "absolute",
// // // // //     width: 50,
// // // // //     height: 50,
// // // // //     borderRadius: 25,
// // // // //   },
// // // // //   driverMarker: {
// // // // //     width: 36,
// // // // //     height: 36,
// // // // //     borderRadius: 18,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //     borderWidth: 3,
// // // // //     borderColor: "#FFFFFF",
// // // // //   },
// // // // //   bottomSheet: {
// // // // //     position: "absolute",
// // // // //     bottom: 0,
// // // // //     left: 0,
// // // // //     right: 0,
// // // // //     paddingHorizontal: Spacing.lg,
// // // // //     paddingTop: Spacing.xl,
// // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // //   },
// // // // //   statusSection: {
// // // // //     marginBottom: Spacing.lg,
// // // // //   },
// // // // //   statusRow: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     marginBottom: 4,
// // // // //   },
// // // // //   statusDot: {
// // // // //     width: 10,
// // // // //     height: 10,
// // // // //     borderRadius: 5,
// // // // //     marginRight: Spacing.sm,
// // // // //   },
// // // // //   statusText: {
// // // // //     fontSize: 18,
// // // // //     fontWeight: "600",
// // // // //   },
// // // // //   eta: {
// // // // //     fontSize: 14,
// // // // //   },
// // // // //   etaRow: {
// // // // //     flexDirection: 'row',
// // // // //     alignItems: 'center',
// // // // //     marginLeft: 18,
// // // // //     gap: 4,
// // // // //   },
// // // // //   distance: {
// // // // //     fontSize: 14,
// // // // //   },
// // // // //   driverCard: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     padding: Spacing.lg,
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     marginBottom: Spacing.lg,
// // // // //   },
// // // // //   driverAvatar: {
// // // // //     width: 50,
// // // // //     height: 50,
// // // // //     borderRadius: 25,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //     marginRight: Spacing.md,
// // // // //   },
// // // // //   driverInfo: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   driverName: {
// // // // //     fontSize: 16,
// // // // //     fontWeight: "600",
// // // // //     marginBottom: 2,
// // // // //   },
// // // // //   vehicleRow: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     gap: Spacing.sm,
// // // // //     marginBottom: 2,
// // // // //   },
// // // // //   vehicleInfo: {
// // // // //     fontSize: 13,
// // // // //   },
// // // // //   ratingBadge: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     paddingHorizontal: 6,
// // // // //     paddingVertical: 2,
// // // // //     borderRadius: BorderRadius.full,
// // // // //     gap: 4,
// // // // //   },
// // // // //   rating: {
// // // // //     fontSize: 11,
// // // // //     fontWeight: "600",
// // // // //   },
// // // // //   licensePlate: {
// // // // //     fontSize: 14,
// // // // //     fontWeight: "700",
// // // // //     letterSpacing: 1,
// // // // //   },
// // // // //   contactButtons: {
// // // // //     flexDirection: "row",
// // // // //     gap: Spacing.sm,
// // // // //   },
// // // // //   contactButton: {
// // // // //     width: 40,
// // // // //     height: 40,
// // // // //     borderRadius: 20,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   tripDetails: {
// // // // //     marginBottom: Spacing.lg,
// // // // //   },
// // // // //   routeContainer: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //   },
// // // // //   routeIndicator: {
// // // // //     width: 20,
// // // // //     alignItems: "center",
// // // // //     marginRight: Spacing.md,
// // // // //   },
// // // // //   routeDot: {
// // // // //     width: 10,
// // // // //     height: 10,
// // // // //     borderRadius: 5,
// // // // //   },
// // // // //   routeLine: {
// // // // //     width: 2,
// // // // //     height: 24,
// // // // //     marginVertical: 4,
// // // // //   },
// // // // //   addresses: {
// // // // //     flex: 1,
// // // // //     justifyContent: "space-between",
// // // // //     height: 48,
// // // // //   },
// // // // //   address: {
// // // // //     fontSize: 14,
// // // // //   },
// // // // //   farePrice: {
// // // // //     fontSize: 20,
// // // // //     fontWeight: "700",
// // // // //     marginLeft: Spacing.md,
// // // // //   },
// // // // //   otpContainer: {
// // // // //     padding: Spacing.md,
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     marginBottom: Spacing.lg,
// // // // //     alignItems: "center",
// // // // //   },
// // // // //   otpLabel: {
// // // // //     color: "#000000",
// // // // //     fontSize: 14,
// // // // //     fontWeight: "600",
// // // // //     marginBottom: Spacing.sm,
// // // // //   },
// // // // //   otpBox: {
// // // // //     flexDirection: "row",
// // // // //     gap: Spacing.sm,
// // // // //   },
// // // // //   otpDigit: {
// // // // //     width: 32,
// // // // //     height: 40,
// // // // //     backgroundColor: "rgba(0,0,0,0.1)",
// // // // //     borderRadius: BorderRadius.sm,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   otpText: {
// // // // //     color: "#000000",
// // // // //     fontSize: 20,
// // // // //     fontWeight: "700",
// // // // //   },
// // // // //   cancelButton: {
// // // // //     height: 48,
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   cancelButtonText: {
// // // // //     fontSize: 15,
// // // // //     fontWeight: "600",
// // // // //   },
// // // // // });

// // // // //client/screens/rider/RideTrackingScreen.tsx

// // // // import React, { useState, useEffect, useRef } from "react";
// // // // import {
// // // //   StyleSheet,
// // // //   View,
// // // //   Pressable,
// // // //   Linking,
// // // //   ActivityIndicator,
// // // // } from "react-native";
// // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // import Animated, {
// // // //   FadeIn,
// // // //   useAnimatedStyle,
// // // //   useSharedValue,
// // // //   withSpring,
// // // //   withRepeat,
// // // //   withTiming,
// // // // } from "react-native-reanimated";
// // // // import * as Haptics from "expo-haptics";

// // // // import { ThemedText } from "@/components/ThemedText";
// // // // import {
// // // //   MapViewWrapper,
// // // //   MarkerWrapper,
// // // //   PolylineWrapper,
// // // // } from "@/components/MapView";
// // // // import { useTheme } from "@/hooks/useTheme";
// // // // import { useRide } from "@/context/RideContext";
// // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // import { useAuth } from "@/context/AuthContext";
// // // // import {
// // // //   UTOColors,
// // // //   Spacing,
// // // //   BorderRadius,
// // // //   Shadows,
// // // //   formatPrice,
// // // // } from "@/constants/theme";

// // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // const darkMapStyle = [
// // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // //   {
// // // //     featureType: "road",
// // // //     elementType: "geometry",
// // // //     stylers: [{ color: "#38414e" }],
// // // //   },
// // // //   {
// // // //     featureType: "water",
// // // //     elementType: "geometry",
// // // //     stylers: [{ color: "#17263c" }],
// // // //   },
// // // // ];

// // // // interface RoutePoint {
// // // //   latitude: number;
// // // //   longitude: number;
// // // // }

// // // // export default function RideTrackingScreen({ navigation }: any) {
// // // //   const insets = useSafeAreaInsets();
// // // //   const { theme, isDark } = useTheme();
// // // //   const { activeRide, cancelRide } = useRide();
// // // //   const { user } = useAuth();

// // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // //     riderId: user?.id || "",
// // // //     rideId: activeRide?.id,
// // // //   });

// // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
// // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // //   const hasInitialized = useRef(false);

// // // //   const pulseScale = useSharedValue(1);
// // // //   const cancelScale = useSharedValue(1);

// // // //   // Fetch route directions when ride is active
// // // //   useEffect(() => {
// // // //     if (!activeRide) {
// // // //       console.log('❌ No active ride');
// // // //       return;
// // // //     }

// // // //     const fetchRoutes = async () => {
// // // //       console.log('🚀 Starting route fetch for ride:', activeRide.id);
// // // //       setIsLoadingRoute(true);

// // // //       try {
// // // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // // //           baseUrl = `http://${baseUrl}`;
// // // //         }

// // // //         console.log('🌐 Base URL:', baseUrl);

// // // //         const pickupCoords = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // //         const dropoffCoords = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // //         console.log('📍 Pickup:', activeRide.pickupLocation.address);
// // // //         console.log('📍 Dropoff:', activeRide.dropoffLocation.address);
// // // //         console.log('📍 Coords:', pickupCoords, '→', dropoffCoords);

// // // //         const url = `${baseUrl}/api/directions?origin=${encodeURIComponent(pickupCoords)}&destination=${encodeURIComponent(dropoffCoords)}`;
// // // //         console.log('🔗 Fetching:', url);

// // // //         const routeResponse = await fetch(url);
// // // //         console.log('📊 Response status:', routeResponse.status);

// // // //         const routeData = await routeResponse.json();

// // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // //           const route = routeData.routes[0];
// // // //           console.log('✅ Route found');

// // // //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// // // //             console.log('🛣️ Polyline has', route.decodedPolyline.length, 'points');
// // // //             console.log('📍 First:', route.decodedPolyline[0]);
// // // //             console.log('📍 Last:', route.decodedPolyline[route.decodedPolyline.length - 1]);

// // // //             setRouteCoordinates(route.decodedPolyline);
// // // //             console.log('✅ Route coordinates SET!');
// // // //           } else {
// // // //             console.log('❌ No decodedPolyline in response');
// // // //           }
// // // //         } else {
// // // //           console.log('❌ No routes in response');
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("❌ Failed to fetch route:", error);
// // // //       } finally {
// // // //         setIsLoadingRoute(false);
// // // //         console.log('🏁 Route fetch complete');
// // // //       }
// // // //     };

// // // //     fetchRoutes();
// // // //   }, [activeRide?.id]);

// // // //   // Fetch driver route to pickup
// // // //   useEffect(() => {
// // // //     if (!activeRide || !driverLocation) return;

// // // //     const fetchDriverRoute = async () => {
// // // //       try {
// // // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // // //           baseUrl = `http://${baseUrl}`;
// // // //         }

// // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // //         const response = await fetch(
// // // //           `${baseUrl}/api/directions?origin=${encodeURIComponent(driverPos)}&destination=${encodeURIComponent(pickup)}`
// // // //         );
// // // //         const data = await response.json();

// // // //         if (data.routes && data.routes.length > 0) {
// // // //           const route = data.routes[0];
// // // //           if (route.decodedPolyline) {
// // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // //           }
// // // //           if (route.legs && route.legs[0]) {
// // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // //           }
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("Failed to fetch driver route:", error);
// // // //       }
// // // //     };

// // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // //       fetchDriverRoute();
// // // //     }
// // // //   }, [
// // // //     driverLocation?.latitude,
// // // //     driverLocation?.longitude,
// // // //     activeRide?.status,
// // // //     rideStatus,
// // // //   ]);

// // // //   useEffect(() => {
// // // //     pulseScale.value = withRepeat(
// // // //       withTiming(1.2, { duration: 1000 }),
// // // //       -1,
// // // //       true,
// // // //     );
// // // //     hasInitialized.current = true;
// // // //   }, []);

// // // //   useEffect(() => {
// // // //     if (!activeRide && hasInitialized.current) {
// // // //       const timer = setTimeout(() => {
// // // //         if (!activeRide) {
// // // //           navigation.goBack();
// // // //         }
// // // //       }, 500);
// // // //       return () => clearTimeout(timer);
// // // //     }
// // // //   }, [activeRide]);

// // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // //     transform: [{ scale: pulseScale.value }],
// // // //     opacity: 2 - pulseScale.value,
// // // //   }));

// // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // //     transform: [{ scale: cancelScale.value }],
// // // //   }));

// // // //   if (!activeRide) return null;

// // // //   const handleCancel = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // //     cancelRide(activeRide.id);
// // // //   };

// // // //   const handleCall = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // //     Linking.openURL("tel:+1234567890");
// // // //   };

// // // //   const handleMessage = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // //     Linking.openURL("sms:+1234567890");
// // // //   };

// // // //   const getStatusMessage = () => {
// // // //     const status = rideStatus || activeRide.status;
// // // //     switch (status) {
// // // //       case "accepted":
// // // //         return "Driver is on the way";
// // // //       case "arrived":
// // // //         return "Driver has arrived";
// // // //       case "in_progress":
// // // //         return "On your way to destination";
// // // //       default:
// // // //         return "Finding your driver...";
// // // //     }
// // // //   };

// // // //   // Calculate map region to fit all points with better zoom
// // // //   const getMapRegion = () => {
// // // //     const points: RoutePoint[] = [
// // // //       {
// // // //         latitude: activeRide.pickupLocation.latitude,
// // // //         longitude: activeRide.pickupLocation.longitude,
// // // //       },
// // // //       {
// // // //         latitude: activeRide.dropoffLocation.latitude,
// // // //         longitude: activeRide.dropoffLocation.longitude,
// // // //       },
// // // //     ];

// // // //     if (driverLocation) {
// // // //       points.push({
// // // //         latitude: driverLocation.latitude,
// // // //         longitude: driverLocation.longitude,
// // // //       });
// // // //     }

// // // //     const lats = points.map((p) => p.latitude);
// // // //     const lngs = points.map((p) => p.longitude);

// // // //     const minLat = Math.min(...lats);
// // // //     const maxLat = Math.max(...lats);
// // // //     const minLng = Math.min(...lngs);
// // // //     const maxLng = Math.max(...lngs);

// // // //     const centerLat = (minLat + maxLat) / 2;
// // // //     const centerLng = (minLng + maxLng) / 2;

// // // //     // Better zoom: 1.4x padding (was 2x), minimum 0.02 delta
// // // //     const latDelta = Math.max((maxLat - minLat) * 1.4, 0.02);
// // // //     const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.02);

// // // //     console.log('🗺️ Map region:', {
// // // //       center: `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`,
// // // //       delta: `${latDelta.toFixed(4)} x ${lngDelta.toFixed(4)}`
// // // //     });

// // // //     return {
// // // //       latitude: centerLat,
// // // //       longitude: centerLng,
// // // //       latitudeDelta: latDelta,
// // // //       longitudeDelta: lngDelta,
// // // //     };
// // // //   };

// // // //   const currentDriverLocation = driverLocation || {
// // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // //   };

// // // //   const currentStatus = rideStatus || activeRide.status;

// // // //   console.log('🎨 Rendering map with', routeCoordinates.length, 'route points');

// // // //   return (
// // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // //       <MapViewWrapper
// // // //         style={styles.map}
// // // //         initialRegion={getMapRegion()}
// // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // //       >
// // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // //         {routeCoordinates.length > 0 && (
// // // //           <>
// // // //             {console.log('✏️ Rendering polyline with', routeCoordinates.length, 'points')}
// // // //             <PolylineWrapper
// // // //               coordinates={routeCoordinates}
// // // //               strokeColor="#000000"
// // // //               strokeWidth={5}
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Route from driver to pickup (dashed yellow) */}
// // // //         {driverToPickupRoute.length > 0 &&
// // // //         (currentStatus === "accepted" || currentStatus === "arrived") && (
// // // //           <PolylineWrapper
// // // //             coordinates={driverToPickupRoute}
// // // //             strokeColor={UTOColors.rider.primary}
// // // //             strokeWidth={4}
// // // //             lineDashPattern={[10, 5]}
// // // //           />
// // // //         )}

// // // //         {/* Pickup marker */}
// // // //         <MarkerWrapper
// // // //           coordinate={{
// // // //             latitude: activeRide.pickupLocation.latitude,
// // // //             longitude: activeRide.pickupLocation.longitude,
// // // //           }}
// // // //           title="Pickup"
// // // //         >
// // // //           <View
// // // //             style={[
// // // //               styles.markerContainer,
// // // //               { backgroundColor: UTOColors.success },
// // // //             ]}
// // // //           >
// // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // //           </View>
// // // //         </MarkerWrapper>

// // // //         {/* Dropoff marker */}
// // // //         <MarkerWrapper
// // // //           coordinate={{
// // // //             latitude: activeRide.dropoffLocation.latitude,
// // // //             longitude: activeRide.dropoffLocation.longitude,
// // // //           }}
// // // //           title="Dropoff"
// // // //         >
// // // //           <View
// // // //             style={[
// // // //               styles.markerContainer,
// // // //               { backgroundColor: UTOColors.error },
// // // //             ]}
// // // //           >
// // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // //           </View>
// // // //         </MarkerWrapper>

// // // //         {/* Driver marker with pulse animation */}
// // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // //           <View style={styles.driverMarkerContainer}>
// // // //             <AnimatedView
// // // //               style={[
// // // //                 styles.driverPulse,
// // // //                 { backgroundColor: UTOColors.rider.primary },
// // // //                 pulseStyle,
// // // //               ]}
// // // //             />
// // // //             <View
// // // //               style={[
// // // //                 styles.driverMarker,
// // // //                 { backgroundColor: UTOColors.rider.primary },
// // // //               ]}
// // // //             >
// // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // //             </View>
// // // //           </View>
// // // //         </MarkerWrapper>
// // // //       </MapViewWrapper>

// // // //       {/* Loading indicator for route */}
// // // //       {isLoadingRoute && (
// // // //         <View style={styles.loadingOverlay}>
// // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // //         </View>
// // // //       )}

// // // //       <Animated.View
// // // //         entering={FadeIn}
// // // //         style={[
// // // //           styles.bottomSheet,
// // // //           Shadows.large,
// // // //           {
// // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // //             backgroundColor: theme.backgroundRoot,
// // // //           },
// // // //         ]}
// // // //       >
// // // //         <View style={styles.statusSection}>
// // // //           <View style={styles.statusRow}>
// // // //             <View
// // // //               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
// // // //             />
// // // //             <ThemedText style={styles.statusText}>
// // // //               {getStatusMessage()}
// // // //             </ThemedText>
// // // //           </View>
// // // //           <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // //             {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // //           </ThemedText>
// // // //         </View>

// // // //         {activeRide.status === "accepted" && activeRide.otp && (
// // // //           <View
// // // //             style={[
// // // //               styles.otpContainer,
// // // //               { backgroundColor: UTOColors.rider.primary },
// // // //             ]}
// // // //           >
// // // //             <ThemedText style={styles.otpLabel}>
// // // //               Share PIN with driver
// // // //             </ThemedText>
// // // //             <View style={styles.otpBox}>
// // // //               {activeRide.otp.split("").map((digit, i) => (
// // // //                 <View key={i} style={styles.otpDigit}>
// // // //                   <ThemedText style={styles.otpText}>{digit}</ThemedText>
// // // //                 </View>
// // // //               ))}
// // // //             </View>
// // // //           </View>
// // // //         )}

// // // //         <View
// // // //           style={[
// // // //             styles.driverCard,
// // // //             { backgroundColor: theme.backgroundDefault },
// // // //           ]}
// // // //         >
// // // //           <View
// // // //             style={[
// // // //               styles.driverAvatar,
// // // //               { backgroundColor: theme.backgroundSecondary },
// // // //             ]}
// // // //           >
// // // //             <MaterialIcons
// // // //               name="person"
// // // //               size={24}
// // // //               color={theme.textSecondary}
// // // //             />
// // // //           </View>
// // // //           <View style={styles.driverInfo}>
// // // //             <ThemedText style={styles.driverName}>
// // // //               {activeRide.driverName}
// // // //             </ThemedText>
// // // //             <View style={styles.vehicleRow}>
// // // //               <ThemedText
// // // //                 style={[styles.vehicleInfo, { color: theme.textSecondary }]}
// // // //               >
// // // //                 {activeRide.vehicleInfo}
// // // //               </ThemedText>
// // // //               <View
// // // //                 style={[
// // // //                   styles.ratingBadge,
// // // //                   { backgroundColor: UTOColors.warning + "20" },
// // // //                 ]}
// // // //               >
// // // //                 <MaterialIcons
// // // //                   name="star"
// // // //                   size={12}
// // // //                   color={UTOColors.warning}
// // // //                 />
// // // //                 <ThemedText
// // // //                   style={[styles.rating, { color: UTOColors.warning }]}
// // // //                 >
// // // //                   {activeRide.driverRating?.toFixed(1)}
// // // //                 </ThemedText>
// // // //               </View>
// // // //             </View>
// // // //             <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // //               {activeRide.licensePlate}
// // // //             </ThemedText>
// // // //           </View>

// // // //           <View style={styles.contactButtons}>
// // // //             <Pressable
// // // //               onPress={handleCall}
// // // //               style={[
// // // //                 styles.contactButton,
// // // //                 { backgroundColor: theme.backgroundSecondary },
// // // //               ]}
// // // //             >
// // // //               <MaterialIcons
// // // //                 name="phone"
// // // //                 size={18}
// // // //                 color={UTOColors.rider.primary}
// // // //               />
// // // //             </Pressable>
// // // //             <Pressable
// // // //               onPress={handleMessage}
// // // //               style={[
// // // //                 styles.contactButton,
// // // //                 { backgroundColor: theme.backgroundSecondary },
// // // //               ]}
// // // //             >
// // // //               <MaterialIcons
// // // //                 name="chat"
// // // //                 size={18}
// // // //                 color={UTOColors.rider.primary}
// // // //               />
// // // //             </Pressable>
// // // //           </View>
// // // //         </View>

// // // //         <View style={styles.tripDetails}>
// // // //           <View style={styles.routeContainer}>
// // // //             <View style={styles.routeIndicator}>
// // // //               <View
// // // //                 style={[
// // // //                   styles.routeDot,
// // // //                   { backgroundColor: UTOColors.success },
// // // //                 ]}
// // // //               />
// // // //               <View
// // // //                 style={[styles.routeLine, { backgroundColor: theme.border }]}
// // // //               />
// // // //               <View
// // // //                 style={[styles.routeDot, { backgroundColor: UTOColors.error }]}
// // // //               />
// // // //             </View>
// // // //             <View style={styles.addresses}>
// // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // //                 {activeRide.pickupLocation.address}
// // // //               </ThemedText>
// // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // //                 {activeRide.dropoffLocation.address}
// // // //               </ThemedText>
// // // //             </View>
// // // //             <ThemedText style={styles.farePrice}>
// // // //               {formatPrice(activeRide.farePrice)}
// // // //             </ThemedText>
// // // //           </View>
// // // //         </View>

// // // //         <AnimatedPressable
// // // //           onPress={handleCancel}
// // // //           onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // //           onPressOut={() => (cancelScale.value = withSpring(1))}
// // // //           style={[
// // // //             styles.cancelButton,
// // // //             { backgroundColor: UTOColors.error + "15" },
// // // //             cancelAnimatedStyle,
// // // //           ]}
// // // //         >
// // // //           <ThemedText
// // // //             style={[styles.cancelButtonText, { color: UTOColors.error }]}
// // // //           >
// // // //             Cancel Ride
// // // //           </ThemedText>
// // // //         </AnimatedPressable>
// // // //       </Animated.View>
// // // //     </View>
// // // //   );
// // // // }

// // // // const styles = StyleSheet.create({
// // // //   container: {
// // // //     flex: 1,
// // // //   },
// // // //   map: {
// // // //     flex: 1,
// // // //   },
// // // //   loadingOverlay: {
// // // //     position: "absolute",
// // // //     top: 60,
// // // //     alignSelf: "center",
// // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // //     paddingHorizontal: Spacing.lg,
// // // //     paddingVertical: Spacing.sm,
// // // //     borderRadius: BorderRadius.full,
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   loadingText: {
// // // //     color: "#FFFFFF",
// // // //     fontSize: 12,
// // // //   },
// // // //   markerContainer: {
// // // //     width: 36,
// // // //     height: 36,
// // // //     borderRadius: 18,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     borderWidth: 2,
// // // //     borderColor: "#FFFFFF",
// // // //   },
// // // //   driverMarkerContainer: {
// // // //     width: 50,
// // // //     height: 50,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   driverPulse: {
// // // //     position: "absolute",
// // // //     width: 50,
// // // //     height: 50,
// // // //     borderRadius: 25,
// // // //   },
// // // //   driverMarker: {
// // // //     width: 36,
// // // //     height: 36,
// // // //     borderRadius: 18,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     borderWidth: 3,
// // // //     borderColor: "#FFFFFF",
// // // //   },
// // // //   bottomSheet: {
// // // //     position: "absolute",
// // // //     bottom: 0,
// // // //     left: 0,
// // // //     right: 0,
// // // //     paddingHorizontal: Spacing.lg,
// // // //     paddingTop: Spacing.xl,
// // // //     borderTopLeftRadius: BorderRadius.xl,
// // // //     borderTopRightRadius: BorderRadius.xl,
// // // //   },
// // // //   statusSection: {
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   statusRow: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     marginBottom: 4,
// // // //   },
// // // //   statusDot: {
// // // //     width: 10,
// // // //     height: 10,
// // // //     borderRadius: 5,
// // // //     marginRight: Spacing.sm,
// // // //   },
// // // //   statusText: {
// // // //     fontSize: 18,
// // // //     fontWeight: "600",
// // // //   },
// // // //   eta: {
// // // //     fontSize: 14,
// // // //     marginLeft: 18,
// // // //   },
// // // //   driverCard: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     padding: Spacing.lg,
// // // //     borderRadius: BorderRadius.lg,
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   driverAvatar: {
// // // //     width: 50,
// // // //     height: 50,
// // // //     borderRadius: 25,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     marginRight: Spacing.md,
// // // //   },
// // // //   driverInfo: {
// // // //     flex: 1,
// // // //   },
// // // //   driverName: {
// // // //     fontSize: 16,
// // // //     fontWeight: "600",
// // // //     marginBottom: 2,
// // // //   },
// // // //   vehicleRow: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     gap: Spacing.sm,
// // // //     marginBottom: 2,
// // // //   },
// // // //   vehicleInfo: {
// // // //     fontSize: 13,
// // // //   },
// // // //   ratingBadge: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     paddingHorizontal: 6,
// // // //     paddingVertical: 2,
// // // //     borderRadius: BorderRadius.full,
// // // //     gap: 4,
// // // //   },
// // // //   rating: {
// // // //     fontSize: 11,
// // // //     fontWeight: "600",
// // // //   },
// // // //   licensePlate: {
// // // //     fontSize: 14,
// // // //     fontWeight: "700",
// // // //     letterSpacing: 1,
// // // //   },
// // // //   contactButtons: {
// // // //     flexDirection: "row",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   contactButton: {
// // // //     width: 40,
// // // //     height: 40,
// // // //     borderRadius: 20,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   tripDetails: {
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   routeContainer: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //   },
// // // //   routeIndicator: {
// // // //     width: 20,
// // // //     alignItems: "center",
// // // //     marginRight: Spacing.md,
// // // //   },
// // // //   routeDot: {
// // // //     width: 10,
// // // //     height: 10,
// // // //     borderRadius: 5,
// // // //   },
// // // //   routeLine: {
// // // //     width: 2,
// // // //     height: 24,
// // // //     marginVertical: 4,
// // // //   },
// // // //   addresses: {
// // // //     flex: 1,
// // // //     justifyContent: "space-between",
// // // //     height: 48,
// // // //   },
// // // //   address: {
// // // //     fontSize: 14,
// // // //   },
// // // //   farePrice: {
// // // //     fontSize: 20,
// // // //     fontWeight: "700",
// // // //     marginLeft: Spacing.md,
// // // //   },
// // // //   otpContainer: {
// // // //     padding: Spacing.md,
// // // //     borderRadius: BorderRadius.lg,
// // // //     marginBottom: Spacing.lg,
// // // //     alignItems: "center",
// // // //   },
// // // //   otpLabel: {
// // // //     color: "#000000",
// // // //     fontSize: 14,
// // // //     fontWeight: "600",
// // // //     marginBottom: Spacing.sm,
// // // //   },
// // // //   otpBox: {
// // // //     flexDirection: "row",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   otpDigit: {
// // // //     width: 32,
// // // //     height: 40,
// // // //     backgroundColor: "rgba(0,0,0,0.1)",
// // // //     borderRadius: BorderRadius.sm,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   otpText: {
// // // //     color: "#000000",
// // // //     fontSize: 20,
// // // //     fontWeight: "700",
// // // //   },
// // // //   cancelButton: {
// // // //     height: 48,
// // // //     borderRadius: BorderRadius.lg,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   cancelButtonText: {
// // // //     fontSize: 15,
// // // //     fontWeight: "600",
// // // //   },
// // // // });

// // // //  //client/screens/rider/RideTrackingScreen.tsx

// // // // import React, { useState, useEffect, useRef, useCallback } from "react";
// // // // import {
// // // //   StyleSheet,
// // // //   View,
// // // //   Pressable,
// // // //   Platform,
// // // //   Linking,
// // // //   ActivityIndicator,
// // // // } from "react-native";
// // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // import Animated, {
// // // //   FadeIn,
// // // //   useAnimatedStyle,
// // // //   useSharedValue,
// // // //   withSpring,
// // // //   withRepeat,
// // // //   withTiming,
// // // // } from "react-native-reanimated";
// // // // import * as Haptics from "expo-haptics";

// // // // import { ThemedText } from "@/components/ThemedText";
// // // // import {
// // // //   MapViewWrapper,
// // // //   MarkerWrapper,
// // // //   PolylineWrapper,
// // // // } from "@/components/MapView";
// // // // import { useTheme } from "@/hooks/useTheme";
// // // // import { useRide } from "@/context/RideContext";
// // // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // // import { useAuth } from "@/context/AuthContext";
// // // // import { getApiUrl } from "@/lib/query-client";
// // // // import {
// // // //   UTOColors,
// // // //   Spacing,
// // // //   BorderRadius,
// // // //   Shadows,
// // // //   formatPrice,
// // // // } from "@/constants/theme";

// // // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // const darkMapStyle = [
// // // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // // //   {
// // // //     featureType: "road",
// // // //     elementType: "geometry",
// // // //     stylers: [{ color: "#38414e" }],
// // // //   },
// // // //   {
// // // //     featureType: "water",
// // // //     elementType: "geometry",
// // // //     stylers: [{ color: "#17263c" }],
// // // //   },
// // // // ];

// // // // interface RoutePoint {
// // // //   latitude: number;
// // // //   longitude: number;
// // // // }

// // // // export default function RideTrackingScreen({ navigation }: any) {
// // // //   const insets = useSafeAreaInsets();
// // // //   const { theme, isDark } = useTheme();
// // // //   const { activeRide, cancelRide, completeRide } = useRide();
// // // //   const { user } = useAuth();

// // // //   // Real-time driver tracking
// // // //   const { driverLocation, rideStatus } = useRiderTracking({
// // // //     riderId: user?.id || "",
// // // //     rideId: activeRide?.id,
// // // //   });

// // // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>(
// // // //     [],
// // // //   );
// // // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // // //   const hasInitialized = useRef(false);

// // // //   const pulseScale = useSharedValue(1);
// // // //   const cancelScale = useSharedValue(1);

// // // //   // Fetch route directions when ride is active
// // // //   useEffect(() => {
// // // //     if (!activeRide) return;

// // // //     const fetchRoutes = async () => {
// // // //       setIsLoadingRoute(true);
// // // //       try {
// // // //         const apiUrl = getApiUrl();

// // // //         // Fetch route from pickup to dropoff
// // // //         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // // //         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // // //         const routeResponse = await fetch(
// // // //           new URL(
// // // //             `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`,
// // // //             apiUrl,
// // // //           ).toString(),
// // // //         );
// // // //         const routeData = await routeResponse.json();

// // // //         if (routeData.routes && routeData.routes.length > 0) {
// // // //           const route = routeData.routes[0];
// // // //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// // // //             setRouteCoordinates(route.decodedPolyline);
// // // //           }
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("Failed to fetch route:", error);
// // // //       } finally {
// // // //         setIsLoadingRoute(false);
// // // //       }
// // // //     };

// // // //     fetchRoutes();
// // // //   }, [activeRide?.id]);

// // // //   // Fetch driver route to pickup when driver location updates
// // // //   useEffect(() => {
// // // //     if (!activeRide || !driverLocation) return;

// // // //     const fetchDriverRoute = async () => {
// // // //       try {
// // // //         const apiUrl = getApiUrl();
// // // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // // //         const response = await fetch(
// // // //           new URL(
// // // //             `/api/directions?origin=${driverPos}&destination=${pickup}`,
// // // //             apiUrl,
// // // //           ).toString(),
// // // //         );
// // // //         const data = await response.json();

// // // //         if (data.routes && data.routes.length > 0) {
// // // //           const route = data.routes[0];
// // // //           if (route.decodedPolyline) {
// // // //             setDriverToPickupRoute(route.decodedPolyline);
// // // //           }
// // // //           if (route.legs && route.legs[0]) {
// // // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // // //           }
// // // //         }
// // // //       } catch (error) {
// // // //         console.error("Failed to fetch driver route:", error);
// // // //       }
// // // //     };

// // // //     // Only fetch if driver is coming to pickup
// // // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // // //       fetchDriverRoute();
// // // //     }
// // // //   }, [
// // // //     driverLocation?.latitude,
// // // //     driverLocation?.longitude,
// // // //     activeRide?.status,
// // // //     rideStatus,
// // // //   ]);

// // // //   useEffect(() => {
// // // //     pulseScale.value = withRepeat(
// // // //       withTiming(1.2, { duration: 1000 }),
// // // //       -1,
// // // //       true,
// // // //     );
// // // //     hasInitialized.current = true;
// // // //   }, []);

// // // //   useEffect(() => {
// // // //     if (!activeRide && hasInitialized.current) {
// // // //       const timer = setTimeout(() => {
// // // //         if (!activeRide) {
// // // //           navigation.goBack();
// // // //         }
// // // //       }, 500);
// // // //       return () => clearTimeout(timer);
// // // //     }
// // // //   }, [activeRide]);

// // // //   const pulseStyle = useAnimatedStyle(() => ({
// // // //     transform: [{ scale: pulseScale.value }],
// // // //     opacity: 2 - pulseScale.value,
// // // //   }));

// // // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // // //     transform: [{ scale: cancelScale.value }],
// // // //   }));

// // // //   if (!activeRide) return null;

// // // //   const handleCancel = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // //     cancelRide(activeRide.id);
// // // //   };

// // // //   const handleCall = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // //     Linking.openURL("tel:+1234567890");
// // // //   };

// // // //   const handleMessage = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // //     Linking.openURL("sms:+1234567890");
// // // //   };

// // // //   const getStatusMessage = () => {
// // // //     const status = rideStatus || activeRide.status;
// // // //     switch (status) {
// // // //       case "pending":
// // // //         return "Finding your driver...";
// // // //       case "accepted":
// // // //         return "Driver is on the way";
// // // //       case "arrived":
// // // //         return "Driver has arrived";
// // // //       case "in_progress":
// // // //         return "On your way to destination";
// // // //       default:
// // // //         return "Processing ride...";
// // // //     }
// // // //   };

// // // //   const getDropoffTime = () => {
// // // //     if (!activeRide) return "";
// // // //     const now = new Date();
// // // //     const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
// // // //     return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// // // //   };

// // // //   // Calculate map region to fit all points
// // // //   const getMapRegion = () => {
// // // //     const points: RoutePoint[] = [
// // // //       {
// // // //         latitude: activeRide.pickupLocation.latitude,
// // // //         longitude: activeRide.pickupLocation.longitude,
// // // //       },
// // // //       {
// // // //         latitude: activeRide.dropoffLocation.latitude,
// // // //         longitude: activeRide.dropoffLocation.longitude,
// // // //       },
// // // //     ];

// // // //     if (driverLocation) {
// // // //       points.push({
// // // //         latitude: driverLocation.latitude,
// // // //         longitude: driverLocation.longitude,
// // // //       });
// // // //     }

// // // //     const lats = points.map((p) => p.latitude);
// // // //     const lngs = points.map((p) => p.longitude);

// // // //     const minLat = Math.min(...lats);
// // // //     const maxLat = Math.max(...lats);
// // // //     const minLng = Math.min(...lngs);
// // // //     const maxLng = Math.max(...lngs);

// // // //     const centerLat = (minLat + maxLat) / 2;
// // // //     const centerLng = (minLng + maxLng) / 2;

// // // //     const latDelta = Math.max((maxLat - minLat) * 2, 0.01);
// // // //     const lngDelta = Math.max((maxLng - minLng) * 2, 0.01);

// // // //     return {
// // // //       latitude: centerLat,
// // // //       longitude: centerLng,
// // // //       latitudeDelta: latDelta,
// // // //       longitudeDelta: lngDelta,
// // // //     };
// // // //   };

// // // //   // Helper to calculate distance for the UI
// // // //   const getDistanceString = () => {
// // // //     if (!driverLocation || !activeRide) return null;

// // // //     // Simple Haversine-ish distance for the UI
// // // //     const R = 6371; // km
// // // //     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
// // // //     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
// // // //     const a = 
// // // //       Math.sin(dLat/2) * Math.sin(dLat/2) +
// // // //       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) * 
// // // //       Math.sin(dLon/2) * Math.sin(dLon/2);
// // // //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// // // //     const d = R * c;

// // // //     // Convert to miles (Uber style)
// // // //     const miles = d * 0.621371;
// // // //     if (miles < 0.1) return "Nearby";
// // // //     return `${miles.toFixed(1)} miles`;
// // // //   };

// // // //   // Use real driver location or simulate one for demo
// // // //   const currentDriverLocation = driverLocation || {
// // // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // // //   };

// // // //   const currentStatus = rideStatus || activeRide.status;

// // // //   return (
// // // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // // //       <MapViewWrapper
// // // //         style={styles.map}
// // // //         initialRegion={getMapRegion()}
// // // //         customMapStyle={isDark ? darkMapStyle : []}
// // // //       >
// // // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // // //         {routeCoordinates.length > 0 ? (
// // // //           <PolylineWrapper
// // // //             coordinates={routeCoordinates}
// // // //             strokeColor="#000000"
// // // //             strokeWidth={5}
// // // //           />
// // // //         ) : null}

// // // //         {/* Pickup marker */}
// // // //         <MarkerWrapper
// // // //           coordinate={{
// // // //             latitude: activeRide.pickupLocation.latitude,
// // // //             longitude: activeRide.pickupLocation.longitude,
// // // //           }}
// // // //           title="Pickup"
// // // //         >
// // // //           <View
// // // //             style={[
// // // //               styles.markerContainer,
// // // //               { backgroundColor: UTOColors.success },
// // // //             ]}
// // // //           >
// // // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // // //           </View>
// // // //         </MarkerWrapper>

// // // //         {/* Dropoff marker */}
// // // //         <MarkerWrapper
// // // //           coordinate={{
// // // //             latitude: activeRide.dropoffLocation.latitude,
// // // //             longitude: activeRide.dropoffLocation.longitude,
// // // //           }}
// // // //           title="Dropoff"
// // // //         >
// // // //           <View
// // // //             style={[
// // // //               styles.markerContainer,
// // // //               { backgroundColor: UTOColors.error },
// // // //             ]}
// // // //           >
// // // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // // //           </View>
// // // //         </MarkerWrapper>

// // // //         {/* Driver marker with pulse animation */}
// // // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // // //           <View style={styles.driverMarkerContainer}>
// // // //             <AnimatedView
// // // //               style={[
// // // //                 styles.driverPulse,
// // // //                 { backgroundColor: UTOColors.rider.primary },
// // // //                 pulseStyle,
// // // //               ]}
// // // //             />
// // // //             <View
// // // //               style={[
// // // //                 styles.driverMarker,
// // // //                 { backgroundColor: UTOColors.rider.primary },
// // // //               ]}
// // // //             >
// // // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // // //             </View>
// // // //           </View>
// // // //         </MarkerWrapper>
// // // //       </MapViewWrapper>

// // // //       {/* Loading indicator for route */}
// // // //       {isLoadingRoute ? (
// // // //         <View style={styles.loadingOverlay}>
// // // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // // //         </View>
// // // //       ) : null}

// // // //       <Animated.View
// // // //         entering={FadeIn}
// // // //         style={[
// // // //           styles.bottomSheet,
// // // //           Shadows.large,
// // // //           {
// // // //             paddingBottom: insets.bottom + Spacing.lg,
// // // //             backgroundColor: theme.backgroundRoot,
// // // //           },
// // // //         ]}
// // // //       >
// // // //         {/* Status header */}
// // // //         <View style={styles.statusSection}>
// // // //           <View style={styles.statusRow}>
// // // //             <View
// // // //               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
// // // //             />
// // // //             <ThemedText style={styles.statusText}>
// // // //               {getStatusMessage()}
// // // //             </ThemedText>
// // // //           </View>
// // // //           {currentStatus !== "pending" && (
// // // //             <View style={styles.etaRow}>
// // // //               <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // // //                 {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // // //               </ThemedText>
// // // //               {getDistanceString() ? (
// // // //                 <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
// // // //                   • {getDistanceString()}
// // // //                 </ThemedText>
// // // //               ) : null}
// // // //             </View>
// // // //           )}
// // // //           {currentStatus === "in_progress" ? (
// // // //             <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
// // // //               Estimated dropoff: {getDropoffTime()}
// // // //             </ThemedText>
// // // //           ) : null}
// // // //         </View>

// // // //         {/* PENDING: searching animation */}
// // // //         {currentStatus === "pending" ? (
// // // //           <View style={styles.searchingContainer}>
// // // //             <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
// // // //               <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
// // // //                 <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // // //                 <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
// // // //                   <MaterialIcons name="local-taxi" size={20} color="#000" />
// // // //                 </View>
// // // //               </View>
// // // //             </View>
// // // //             <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
// // // //               Matching you with a nearby driver
// // // //             </ThemedText>
// // // //           </View>
// // // //         ) : null}

// // // //         {/* ACCEPTED / IN_PROGRESS: OTP banner then driver card */}
// // // //         {currentStatus !== "pending" ? (
// // // //           <>
// // // //             {currentStatus === "accepted" && activeRide.otp ? (
// // // //               <View
// // // //                 style={[
// // // //                   styles.otpContainer,
// // // //                   { backgroundColor: UTOColors.rider.primary },
// // // //                 ]}
// // // //               >
// // // //                 <ThemedText style={styles.otpLabel}>
// // // //                   Your ride PIN — share with driver
// // // //                 </ThemedText>
// // // //                 <View style={styles.otpBox}>
// // // //                   {activeRide.otp.split("").map((digit, i) => (
// // // //                     <View key={i} style={styles.otpDigit}>
// // // //                       <ThemedText style={styles.otpText}>{digit}</ThemedText>
// // // //                     </View>
// // // //                   ))}
// // // //                 </View>
// // // //               </View>
// // // //             ) : null}

// // // //             <View
// // // //               style={[
// // // //                 styles.driverCard,
// // // //                 { backgroundColor: theme.backgroundDefault },
// // // //               ]}
// // // //             >
// // // //               <View
// // // //                 style={[
// // // //                   styles.driverAvatar,
// // // //                   { backgroundColor: theme.backgroundSecondary },
// // // //                 ]}
// // // //               >
// // // //                 <MaterialIcons
// // // //                   name="person"
// // // //                   size={24}
// // // //                   color={theme.textSecondary}
// // // //                 />
// // // //               </View>
// // // //               <View style={styles.driverInfo}>
// // // //                 <ThemedText style={styles.driverName}>
// // // //                   {activeRide.driverName}
// // // //                 </ThemedText>
// // // //                 <View style={styles.vehicleRow}>
// // // //                   <ThemedText
// // // //                     style={[styles.vehicleInfo, { color: theme.textSecondary }]}
// // // //                   >
// // // //                     {activeRide.vehicleInfo}
// // // //                   </ThemedText>
// // // //                   <View
// // // //                     style={[
// // // //                       styles.ratingBadge,
// // // //                       { backgroundColor: UTOColors.warning + "20" },
// // // //                     ]}
// // // //                   >
// // // //                     <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // // //                     <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // // //                       {activeRide.driverRating?.toFixed(1)}
// // // //                     </ThemedText>
// // // //                   </View>
// // // //                 </View>
// // // //                 <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // // //                   {activeRide.licensePlate}
// // // //                 </ThemedText>
// // // //               </View>
// // // //               <View style={styles.contactButtons}>
// // // //                 <Pressable
// // // //                   onPress={handleCall}
// // // //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // //                 >
// // // //                   <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // // //                 </Pressable>
// // // //                 <Pressable
// // // //                   onPress={handleMessage}
// // // //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // // //                 >
// // // //                   <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // // //                 </Pressable>
// // // //               </View>
// // // //             </View>
// // // //           </>
// // // //         ) : null}

// // // //         {/* Route summary row */}
// // // //         <View style={styles.tripDetails}>
// // // //           <View style={styles.routeContainer}>
// // // //             <View style={styles.routeIndicator}>
// // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// // // //             </View>
// // // //             <View style={styles.addresses}>
// // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // //                 {activeRide.pickupLocation.address}
// // // //               </ThemedText>
// // // //               <ThemedText style={styles.address} numberOfLines={1}>
// // // //                 {activeRide.dropoffLocation.address}
// // // //               </ThemedText>
// // // //             </View>
// // // //             <ThemedText style={styles.farePrice}>
// // // //               {formatPrice(activeRide.farePrice)}
// // // //             </ThemedText>
// // // //           </View>
// // // //         </View>

// // // //         {/* Cancel button — only while pending or accepted */}
// // // //         {currentStatus === "pending" || currentStatus === "accepted" ? (
// // // //           <AnimatedPressable
// // // //             onPress={handleCancel}
// // // //             onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // // //             onPressOut={() => (cancelScale.value = withSpring(1))}
// // // //             style={[
// // // //               styles.cancelButton,
// // // //               { backgroundColor: UTOColors.error + "15" },
// // // //               cancelAnimatedStyle,
// // // //             ]}
// // // //           >
// // // //             <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // // //               Cancel Ride
// // // //             </ThemedText>
// // // //           </AnimatedPressable>
// // // //         ) : null}
// // // //       </Animated.View>
// // // //     </View>
// // // //   );
// // // // }

// // // // const styles = StyleSheet.create({
// // // //   container: {
// // // //     flex: 1,
// // // //   },
// // // //   map: {
// // // //     flex: 1,
// // // //   },
// // // //   loadingOverlay: {
// // // //     position: "absolute",
// // // //     top: 60,
// // // //     alignSelf: "center",
// // // //     backgroundColor: "rgba(0,0,0,0.7)",
// // // //     paddingHorizontal: Spacing.lg,
// // // //     paddingVertical: Spacing.sm,
// // // //     borderRadius: BorderRadius.full,
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   loadingText: {
// // // //     color: "#FFFFFF",
// // // //     fontSize: 12,
// // // //   },
// // // //   markerContainer: {
// // // //     width: 36,
// // // //     height: 36,
// // // //     borderRadius: 18,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     borderWidth: 2,
// // // //     borderColor: "#FFFFFF",
// // // //   },
// // // //   driverMarkerContainer: {
// // // //     width: 50,
// // // //     height: 50,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   driverPulse: {
// // // //     position: "absolute",
// // // //     width: 50,
// // // //     height: 50,
// // // //     borderRadius: 25,
// // // //   },
// // // //   driverMarker: {
// // // //     width: 36,
// // // //     height: 36,
// // // //     borderRadius: 18,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     borderWidth: 3,
// // // //     borderColor: "#FFFFFF",
// // // //   },
// // // //   bottomSheet: {
// // // //     position: "absolute",
// // // //     bottom: 0,
// // // //     left: 0,
// // // //     right: 0,
// // // //     paddingHorizontal: Spacing.lg,
// // // //     paddingTop: Spacing.xl,
// // // //     borderTopLeftRadius: BorderRadius.xl,
// // // //     borderTopRightRadius: BorderRadius.xl,
// // // //   },
// // // //   statusSection: {
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   statusRow: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     marginBottom: 4,
// // // //   },
// // // //   statusDot: {
// // // //     width: 10,
// // // //     height: 10,
// // // //     borderRadius: 5,
// // // //     marginRight: Spacing.sm,
// // // //   },
// // // //   statusText: {
// // // //     fontSize: 18,
// // // //     fontWeight: "600",
// // // //   },
// // // //   eta: {
// // // //     fontSize: 14,
// // // //   },
// // // //   etaRow: {
// // // //     flexDirection: 'row',
// // // //     alignItems: 'center',
// // // //     marginLeft: 18,
// // // //     gap: 4,
// // // //   },
// // // //   distance: {
// // // //     fontSize: 14,
// // // //   },
// // // //   driverCard: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     padding: Spacing.lg,
// // // //     borderRadius: BorderRadius.lg,
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   driverAvatar: {
// // // //     width: 50,
// // // //     height: 50,
// // // //     borderRadius: 25,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     marginRight: Spacing.md,
// // // //   },
// // // //   driverInfo: {
// // // //     flex: 1,
// // // //   },
// // // //   driverName: {
// // // //     fontSize: 16,
// // // //     fontWeight: "600",
// // // //     marginBottom: 2,
// // // //   },
// // // //   vehicleRow: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     gap: Spacing.sm,
// // // //     marginBottom: 2,
// // // //   },
// // // //   vehicleInfo: {
// // // //     fontSize: 13,
// // // //   },
// // // //   ratingBadge: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     paddingHorizontal: 6,
// // // //     paddingVertical: 2,
// // // //     borderRadius: BorderRadius.full,
// // // //     gap: 4,
// // // //   },
// // // //   rating: {
// // // //     fontSize: 11,
// // // //     fontWeight: "600",
// // // //   },
// // // //   licensePlate: {
// // // //     fontSize: 14,
// // // //     fontWeight: "700",
// // // //     letterSpacing: 1,
// // // //   },
// // // //   contactButtons: {
// // // //     flexDirection: "row",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   contactButton: {
// // // //     width: 40,
// // // //     height: 40,
// // // //     borderRadius: 20,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   tripDetails: {
// // // //     marginBottom: Spacing.lg,
// // // //   },
// // // //   routeContainer: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //   },
// // // //   routeIndicator: {
// // // //     width: 20,
// // // //     alignItems: "center",
// // // //     marginRight: Spacing.md,
// // // //   },
// // // //   routeDot: {
// // // //     width: 10,
// // // //     height: 10,
// // // //     borderRadius: 5,
// // // //   },
// // // //   routeLine: {
// // // //     width: 2,
// // // //     height: 24,
// // // //     marginVertical: 4,
// // // //   },
// // // //   addresses: {
// // // //     flex: 1,
// // // //     justifyContent: "space-between",
// // // //     height: 48,
// // // //   },
// // // //   address: {
// // // //     fontSize: 14,
// // // //   },
// // // //   farePrice: {
// // // //     fontSize: 20,
// // // //     fontWeight: "700",
// // // //     marginLeft: Spacing.md,
// // // //   },
// // // //   otpContainer: {
// // // //     padding: Spacing.md,
// // // //     borderRadius: BorderRadius.lg,
// // // //     marginBottom: Spacing.lg,
// // // //     alignItems: "center",
// // // //   },
// // // //   otpLabel: {
// // // //     color: "#000000",
// // // //     fontSize: 14,
// // // //     fontWeight: "600",
// // // //     marginBottom: Spacing.sm,
// // // //   },
// // // //   otpBox: {
// // // //     flexDirection: "row",
// // // //     gap: Spacing.sm,
// // // //   },
// // // //   otpDigit: {
// // // //     width: 32,
// // // //     height: 40,
// // // //     borderRadius: BorderRadius.md,
// // // //     backgroundColor: "#FFFFFF",
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   otpText: {
// // // //     fontSize: 20,
// // // //     fontWeight: "700",
// // // //     color: "#000000",
// // // //   },
// // // //   cancelButton: {
// // // //     width: "100%",
// // // //     padding: Spacing.lg,
// // // //     borderRadius: BorderRadius.lg,
// // // //     alignItems: "center",
// // // //   },
// // // //   cancelButtonText: {
// // // //     fontSize: 16,
// // // //     fontWeight: "600",
// // // //   },
// // // //   dropoffTime: {
// // // //     fontSize: 14,
// // // //     marginTop: 2,
// // // //   },
// // // //   searchingContainer: {
// // // //     alignItems: "center",
// // // //     paddingVertical: Spacing.lg,
// // // //     marginBottom: Spacing.md,
// // // //   },
// // // //   searchingRing: {
// // // //     width: 80,
// // // //     height: 80,
// // // //     borderRadius: 40,
// // // //     borderWidth: 2,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     marginBottom: Spacing.md,
// // // //   },
// // // //   searchingRingInner: {
// // // //     width: 60,
// // // //     height: 60,
// // // //     borderRadius: 30,
// // // //     borderWidth: 2,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   searchingPulse: {
// // // //     position: "absolute",
// // // //     width: 44,
// // // //     height: 44,
// // // //     borderRadius: 22,
// // // //   },
// // // //   searchingDot: {
// // // //     width: 40,
// // // //     height: 40,
// // // //     borderRadius: 20,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //   },
// // // //   searchingText: {
// // // //     fontSize: 14,
// // // //     textAlign: "center",
// // // //   },
// // // // });

// // // //client/screens/rider/RideTrackingScreen.tsx - FIXED MAP ZOOM + DEBUG LOGS

// // // import React, { useState, useEffect, useRef } from "react";
// // // import {
// // //   StyleSheet,
// // //   View,
// // //   Pressable,
// // //   Linking,
// // //   ActivityIndicator,
// // // } from "react-native";
// // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // import { MaterialIcons } from "@expo/vector-icons";
// // // import Animated, {
// // //   FadeIn,
// // //   useAnimatedStyle,
// // //   useSharedValue,
// // //   withSpring,
// // //   withRepeat,
// // //   withTiming,
// // // } from "react-native-reanimated";
// // // import * as Haptics from "expo-haptics";

// // // import { ThemedText } from "@/components/ThemedText";
// // // import {
// // //   MapViewWrapper,
// // //   MarkerWrapper,
// // //   PolylineWrapper,
// // // } from "@/components/MapView";
// // // import { useTheme } from "@/hooks/useTheme";
// // // import { useRide } from "@/context/RideContext";
// // // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // // import { useAuth } from "@/context/AuthContext";
// // // import {
// // //   UTOColors,
// // //   Spacing,
// // //   BorderRadius,
// // //   Shadows,
// // //   formatPrice,
// // // } from "@/constants/theme";

// // // const AnimatedView = Animated.createAnimatedComponent(View);
// // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // const darkMapStyle = [
// // //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// // //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// // //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// // //   {
// // //     featureType: "road",
// // //     elementType: "geometry",
// // //     stylers: [{ color: "#38414e" }],
// // //   },
// // //   {
// // //     featureType: "water",
// // //     elementType: "geometry",
// // //     stylers: [{ color: "#17263c" }],
// // //   },
// // // ];

// // // interface RoutePoint {
// // //   latitude: number;
// // //   longitude: number;
// // // }

// // // export default function RideTrackingScreen({ navigation }: any) {
// // //   const insets = useSafeAreaInsets();
// // //   const { theme, isDark } = useTheme();
// // //   const { activeRide, cancelRide } = useRide();
// // //   const { user } = useAuth();

// // //   const { driverLocation, rideStatus } = useRiderTracking({
// // //     riderId: user?.id || "",
// // //     rideId: activeRide?.id,
// // //   });

// // //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// // //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
// // //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// // //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// // //   const hasInitialized = useRef(false);

// // //   const pulseScale = useSharedValue(1);
// // //   const cancelScale = useSharedValue(1);

// // //   // Fetch route directions when ride is active
// // //   useEffect(() => {
// // //     if (!activeRide) {
// // //       console.log('❌ No active ride');
// // //       return;
// // //     }

// // //     const fetchRoutes = async () => {
// // //       console.log('🚀 Fetching route for ride:', activeRide.id);
// // //       setIsLoadingRoute(true);

// // //       try {
// // //         // Direct URL construction
// // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // //           baseUrl = `http://${baseUrl}`;
// // //         }

// // //         const pickupCoords = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// // //         const dropoffCoords = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// // //         console.log('📍 From:', activeRide.pickupLocation.address);
// // //         console.log('📍 To:', activeRide.dropoffLocation.address);

// // //         const url = `${baseUrl}/api/directions?origin=${encodeURIComponent(pickupCoords)}&destination=${encodeURIComponent(dropoffCoords)}`;
// // //         console.log('🔗 URL:', url);

// // //         const routeResponse = await fetch(url);
// // //         console.log('📊 Status:', routeResponse.status);

// // //         const routeData = await routeResponse.json();

// // //         if (routeData.routes && routeData.routes.length > 0) {
// // //           const route = routeData.routes[0];
// // //           console.log('✅ Route found!');

// // //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// // //             console.log('🛣️ Polyline:', route.decodedPolyline.length, 'points');
// // //             console.log('📍 First:', route.decodedPolyline[0]);
// // //             console.log('📍 Last:', route.decodedPolyline[route.decodedPolyline.length - 1]);

// // //             setRouteCoordinates(route.decodedPolyline);
// // //             console.log('✅ Route coordinates SET! Will render black line.');
// // //           } else {
// // //             console.log('❌ No decodedPolyline in route');
// // //           }
// // //         } else {
// // //           console.log('❌ No routes in response');
// // //         }
// // //       } catch (error) {
// // //         console.error("❌ Route fetch error:", error);
// // //       } finally {
// // //         setIsLoadingRoute(false);
// // //         console.log('🏁 Route fetch done');
// // //       }
// // //     };

// // //     fetchRoutes();
// // //   }, [activeRide?.id]);

// // //   // Fetch driver route to pickup
// // //   useEffect(() => {
// // //     if (!activeRide || !driverLocation) return;

// // //     const fetchDriverRoute = async () => {
// // //       try {
// // //         let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.7:3000';
// // //         if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
// // //           baseUrl = `http://${baseUrl}`;
// // //         }

// // //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// // //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// // //         const response = await fetch(
// // //           `${baseUrl}/api/directions?origin=${encodeURIComponent(driverPos)}&destination=${encodeURIComponent(pickup)}`
// // //         );
// // //         const data = await response.json();

// // //         if (data.routes && data.routes.length > 0) {
// // //           const route = data.routes[0];
// // //           if (route.decodedPolyline) {
// // //             setDriverToPickupRoute(route.decodedPolyline);
// // //           }
// // //           if (route.legs && route.legs[0]) {
// // //             setEstimatedArrival(route.legs[0].duration?.text || null);
// // //           }
// // //         }
// // //       } catch (error) {
// // //         console.error("Failed to fetch driver route:", error);
// // //       }
// // //     };

// // //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// // //       fetchDriverRoute();
// // //     }
// // //   }, [
// // //     driverLocation?.latitude,
// // //     driverLocation?.longitude,
// // //     activeRide?.status,
// // //     rideStatus,
// // //   ]);

// // //   useEffect(() => {
// // //     pulseScale.value = withRepeat(
// // //       withTiming(1.2, { duration: 1000 }),
// // //       -1,
// // //       true,
// // //     );
// // //     hasInitialized.current = true;
// // //   }, []);

// // //   useEffect(() => {
// // //     if (!activeRide && hasInitialized.current) {
// // //       const timer = setTimeout(() => {
// // //         if (!activeRide) {
// // //           navigation.goBack();
// // //         }
// // //       }, 500);
// // //       return () => clearTimeout(timer);
// // //     }
// // //   }, [activeRide]);

// // //   const pulseStyle = useAnimatedStyle(() => ({
// // //     transform: [{ scale: pulseScale.value }],
// // //     opacity: 2 - pulseScale.value,
// // //   }));

// // //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// // //     transform: [{ scale: cancelScale.value }],
// // //   }));

// // //   if (!activeRide) return null;

// // //   const handleCancel = () => {
// // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // //     cancelRide(activeRide.id);
// // //   };

// // //   const handleCall = () => {
// // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // //     Linking.openURL("tel:+1234567890");
// // //   };

// // //   const handleMessage = () => {
// // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // //     Linking.openURL("sms:+1234567890");
// // //   };

// // //   const getStatusMessage = () => {
// // //     const status = rideStatus || activeRide.status;
// // //     switch (status) {
// // //       case "pending":
// // //         return "Finding your driver...";
// // //       case "accepted":
// // //         return "Driver is on the way";
// // //       case "arrived":
// // //         return "Driver has arrived";
// // //       case "in_progress":
// // //         return "On your way to destination";
// // //       default:
// // //         return "Processing ride...";
// // //     }
// // //   };

// // //   const getDropoffTime = () => {
// // //     if (!activeRide) return "";
// // //     const now = new Date();
// // //     const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
// // //     return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// // //   };

// // //   // ✅ FIXED: Calculate map region with proper zoom (1.3x instead of 2x)
// // //   const getMapRegion = () => {
// // //     const points: RoutePoint[] = [
// // //       {
// // //         latitude: activeRide.pickupLocation.latitude,
// // //         longitude: activeRide.pickupLocation.longitude,
// // //       },
// // //       {
// // //         latitude: activeRide.dropoffLocation.latitude,
// // //         longitude: activeRide.dropoffLocation.longitude,
// // //       },
// // //     ];

// // //     if (driverLocation) {
// // //       points.push({
// // //         latitude: driverLocation.latitude,
// // //         longitude: driverLocation.longitude,
// // //       });
// // //     }

// // //     const lats = points.map((p) => p.latitude);
// // //     const lngs = points.map((p) => p.longitude);

// // //     const minLat = Math.min(...lats);
// // //     const maxLat = Math.max(...lats);
// // //     const minLng = Math.min(...lngs);
// // //     const maxLng = Math.max(...lngs);

// // //     const centerLat = (minLat + maxLat) / 2;
// // //     const centerLng = (minLng + maxLng) / 2;

// // //     // ✅ CRITICAL FIX: 1.3x padding (was 2x), 0.02 minimum (was 0.01)
// // //     const latDelta = Math.max((maxLat - minLat) * 1.3, 0.02);
// // //     const lngDelta = Math.max((maxLng - minLng) * 1.3, 0.02);

// // //     console.log('🗺️ Map zoom:', {
// // //       center: `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`,
// // //       delta: `${latDelta.toFixed(4)} x ${lngDelta.toFixed(4)}`
// // //     });

// // //     return {
// // //       latitude: centerLat,
// // //       longitude: centerLng,
// // //       latitudeDelta: latDelta,
// // //       longitudeDelta: lngDelta,
// // //     };
// // //   };

// // //   const getDistanceString = () => {
// // //     if (!driverLocation || !activeRide) return null;

// // //     const R = 6371;
// // //     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
// // //     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
// // //     const a = 
// // //       Math.sin(dLat/2) * Math.sin(dLat/2) +
// // //       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) * 
// // //       Math.sin(dLon/2) * Math.sin(dLon/2);
// // //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// // //     const d = R * c;

// // //     const miles = d * 0.621371;
// // //     if (miles < 0.1) return "Nearby";
// // //     return `${miles.toFixed(1)} miles`;
// // //   };

// // //   const currentDriverLocation = driverLocation || {
// // //     latitude: activeRide.pickupLocation.latitude + 0.005,
// // //     longitude: activeRide.pickupLocation.longitude + 0.003,
// // //   };

// // //   const currentStatus = rideStatus || activeRide.status;

// // //   // Debug log render
// // //   console.log('🎨 Rendering map. Route points:', routeCoordinates.length);

// // //   return (
// // //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// // //       <MapViewWrapper
// // //         style={styles.map}
// // //         initialRegion={getMapRegion()}
// // //         customMapStyle={isDark ? darkMapStyle : []}
// // //       >
// // //         {/* Route from pickup to dropoff (black Uber-style) */}
// // //         {routeCoordinates.length > 0 && (
// // //           <>
// // //             {console.log('✏️ RENDERING BLACK POLYLINE:', routeCoordinates.length, 'points')}
// // //             <PolylineWrapper
// // //               coordinates={routeCoordinates}
// // //               strokeColor="#000000"
// // //               strokeWidth={5}
// // //             />
// // //           </>
// // //         )}

// // //         {/* Pickup marker */}
// // //         <MarkerWrapper
// // //           coordinate={{
// // //             latitude: activeRide.pickupLocation.latitude,
// // //             longitude: activeRide.pickupLocation.longitude,
// // //           }}
// // //           title="Pickup"
// // //         >
// // //           <View
// // //             style={[
// // //               styles.markerContainer,
// // //               { backgroundColor: UTOColors.success },
// // //             ]}
// // //           >
// // //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// // //           </View>
// // //         </MarkerWrapper>

// // //         {/* Dropoff marker */}
// // //         <MarkerWrapper
// // //           coordinate={{
// // //             latitude: activeRide.dropoffLocation.latitude,
// // //             longitude: activeRide.dropoffLocation.longitude,
// // //           }}
// // //           title="Dropoff"
// // //         >
// // //           <View
// // //             style={[
// // //               styles.markerContainer,
// // //               { backgroundColor: UTOColors.error },
// // //             ]}
// // //           >
// // //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// // //           </View>
// // //         </MarkerWrapper>

// // //         {/* Driver marker with pulse animation */}
// // //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// // //           <View style={styles.driverMarkerContainer}>
// // //             <AnimatedView
// // //               style={[
// // //                 styles.driverPulse,
// // //                 { backgroundColor: UTOColors.rider.primary },
// // //                 pulseStyle,
// // //               ]}
// // //             />
// // //             <View
// // //               style={[
// // //                 styles.driverMarker,
// // //                 { backgroundColor: UTOColors.rider.primary },
// // //               ]}
// // //             >
// // //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// // //             </View>
// // //           </View>
// // //         </MarkerWrapper>
// // //       </MapViewWrapper>

// // //       {/* Loading indicator for route */}
// // //       {isLoadingRoute && (
// // //         <View style={styles.loadingOverlay}>
// // //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// // //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// // //         </View>
// // //       )}

// // //       <Animated.View
// // //         entering={FadeIn}
// // //         style={[
// // //           styles.bottomSheet,
// // //           Shadows.large,
// // //           {
// // //             paddingBottom: insets.bottom + Spacing.lg,
// // //             backgroundColor: theme.backgroundRoot,
// // //           },
// // //         ]}
// // //       >
// // //         <View style={styles.statusSection}>
// // //           <View style={styles.statusRow}>
// // //             <View
// // //               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
// // //             />
// // //             <ThemedText style={styles.statusText}>
// // //               {getStatusMessage()}
// // //             </ThemedText>
// // //           </View>
// // //           {currentStatus !== "pending" && (
// // //             <View style={styles.etaRow}>
// // //               <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// // //                 {estimatedArrival || `${activeRide.durationMinutes} min`} away
// // //               </ThemedText>
// // //               {getDistanceString() && (
// // //                 <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
// // //                   • {getDistanceString()}
// // //                 </ThemedText>
// // //               )}
// // //             </View>
// // //           )}
// // //           {currentStatus === "in_progress" && (
// // //             <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
// // //               Estimated dropoff: {getDropoffTime()}
// // //             </ThemedText>
// // //           )}
// // //         </View>

// // //         {currentStatus === "pending" && (
// // //           <View style={styles.searchingContainer}>
// // //             <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
// // //               <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
// // //                 <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// // //                 <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
// // //                   <MaterialIcons name="local-taxi" size={20} color="#000" />
// // //                 </View>
// // //               </View>
// // //             </View>
// // //             <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
// // //               Matching you with a nearby driver
// // //             </ThemedText>
// // //           </View>
// // //         )}

// // //         {currentStatus !== "pending" && (
// // //           <>
// // //             {currentStatus === "accepted" && activeRide.otp && (
// // //               <View
// // //                 style={[
// // //                   styles.otpContainer,
// // //                   { backgroundColor: UTOColors.rider.primary },
// // //                 ]}
// // //               >
// // //                 <ThemedText style={styles.otpLabel}>
// // //                   Your ride PIN — share with driver
// // //                 </ThemedText>
// // //                 <View style={styles.otpBox}>
// // //                   {activeRide.otp.split("").map((digit, i) => (
// // //                     <View key={i} style={styles.otpDigit}>
// // //                       <ThemedText style={styles.otpText}>{digit}</ThemedText>
// // //                     </View>
// // //                   ))}
// // //                 </View>
// // //               </View>
// // //             )}

// // //             <View
// // //               style={[
// // //                 styles.driverCard,
// // //                 { backgroundColor: theme.backgroundDefault },
// // //               ]}
// // //             >
// // //               <View
// // //                 style={[
// // //                   styles.driverAvatar,
// // //                   { backgroundColor: theme.backgroundSecondary },
// // //                 ]}
// // //               >
// // //                 <MaterialIcons
// // //                   name="person"
// // //                   size={24}
// // //                   color={theme.textSecondary}
// // //                 />
// // //               </View>
// // //               <View style={styles.driverInfo}>
// // //                 <ThemedText style={styles.driverName}>
// // //                   {activeRide.driverName}
// // //                 </ThemedText>
// // //                 <View style={styles.vehicleRow}>
// // //                   <ThemedText
// // //                     style={[styles.vehicleInfo, { color: theme.textSecondary }]}
// // //                   >
// // //                     {activeRide.vehicleInfo}
// // //                   </ThemedText>
// // //                   <View
// // //                     style={[
// // //                       styles.ratingBadge,
// // //                       { backgroundColor: UTOColors.warning + "20" },
// // //                     ]}
// // //                   >
// // //                     <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// // //                     <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// // //                       {activeRide.driverRating?.toFixed(1)}
// // //                     </ThemedText>
// // //                   </View>
// // //                 </View>
// // //                 <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// // //                   {activeRide.licensePlate}
// // //                 </ThemedText>
// // //               </View>
// // //               <View style={styles.contactButtons}>
// // //                 <Pressable
// // //                   onPress={handleCall}
// // //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // //                 >
// // //                   <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// // //                 </Pressable>
// // //                 <Pressable
// // //                   onPress={handleMessage}
// // //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// // //                 >
// // //                   <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// // //                 </Pressable>
// // //               </View>
// // //             </View>
// // //           </>
// // //         )}

// // //         <View style={styles.tripDetails}>
// // //           <View style={styles.routeContainer}>
// // //             <View style={styles.routeIndicator}>
// // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// // //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// // //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// // //             </View>
// // //             <View style={styles.addresses}>
// // //               <ThemedText style={styles.address} numberOfLines={1}>
// // //                 {activeRide.pickupLocation.address}
// // //               </ThemedText>
// // //               <ThemedText style={styles.address} numberOfLines={1}>
// // //                 {activeRide.dropoffLocation.address}
// // //               </ThemedText>
// // //             </View>
// // //             <ThemedText style={styles.farePrice}>
// // //               {formatPrice(activeRide.farePrice)}
// // //             </ThemedText>
// // //           </View>
// // //         </View>

// // //         {(currentStatus === "pending" || currentStatus === "accepted") && (
// // //           <AnimatedPressable
// // //             onPress={handleCancel}
// // //             onPressIn={() => (cancelScale.value = withSpring(0.98))}
// // //             onPressOut={() => (cancelScale.value = withSpring(1))}
// // //             style={[
// // //               styles.cancelButton,
// // //               { backgroundColor: UTOColors.error + "15" },
// // //               cancelAnimatedStyle,
// // //             ]}
// // //           >
// // //             <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// // //               Cancel Ride
// // //             </ThemedText>
// // //           </AnimatedPressable>
// // //         )}
// // //       </Animated.View>
// // //     </View>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //   },
// // //   map: {
// // //     flex: 1,
// // //   },
// // //   loadingOverlay: {
// // //     position: "absolute",
// // //     top: 60,
// // //     alignSelf: "center",
// // //     backgroundColor: "rgba(0,0,0,0.7)",
// // //     paddingHorizontal: Spacing.lg,
// // //     paddingVertical: Spacing.sm,
// // //     borderRadius: BorderRadius.full,
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     gap: Spacing.sm,
// // //   },
// // //   loadingText: {
// // //     color: "#FFFFFF",
// // //     fontSize: 12,
// // //   },
// // //   markerContainer: {
// // //     width: 36,
// // //     height: 36,
// // //     borderRadius: 18,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     borderWidth: 2,
// // //     borderColor: "#FFFFFF",
// // //   },
// // //   driverMarkerContainer: {
// // //     width: 50,
// // //     height: 50,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //   },
// // //   driverPulse: {
// // //     position: "absolute",
// // //     width: 50,
// // //     height: 50,
// // //     borderRadius: 25,
// // //   },
// // //   driverMarker: {
// // //     width: 36,
// // //     height: 36,
// // //     borderRadius: 18,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     borderWidth: 3,
// // //     borderColor: "#FFFFFF",
// // //   },
// // //   bottomSheet: {
// // //     position: "absolute",
// // //     bottom: 0,
// // //     left: 0,
// // //     right: 0,
// // //     paddingHorizontal: Spacing.lg,
// // //     paddingTop: Spacing.xl,
// // //     borderTopLeftRadius: BorderRadius.xl,
// // //     borderTopRightRadius: BorderRadius.xl,
// // //   },
// // //   statusSection: {
// // //     marginBottom: Spacing.lg,
// // //   },
// // //   statusRow: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     marginBottom: 4,
// // //   },
// // //   statusDot: {
// // //     width: 10,
// // //     height: 10,
// // //     borderRadius: 5,
// // //     marginRight: Spacing.sm,
// // //   },
// // //   statusText: {
// // //     fontSize: 18,
// // //     fontWeight: "600",
// // //   },
// // //   eta: {
// // //     fontSize: 14,
// // //   },
// // //   etaRow: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     marginLeft: 18,
// // //     gap: 4,
// // //   },
// // //   distance: {
// // //     fontSize: 14,
// // //   },
// // //   driverCard: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     padding: Spacing.lg,
// // //     borderRadius: BorderRadius.lg,
// // //     marginBottom: Spacing.lg,
// // //   },
// // //   driverAvatar: {
// // //     width: 50,
// // //     height: 50,
// // //     borderRadius: 25,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     marginRight: Spacing.md,
// // //   },
// // //   driverInfo: {
// // //     flex: 1,
// // //   },
// // //   driverName: {
// // //     fontSize: 16,
// // //     fontWeight: "600",
// // //     marginBottom: 2,
// // //   },
// // //   vehicleRow: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     gap: Spacing.sm,
// // //     marginBottom: 2,
// // //   },
// // //   vehicleInfo: {
// // //     fontSize: 13,
// // //   },
// // //   ratingBadge: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     paddingHorizontal: 6,
// // //     paddingVertical: 2,
// // //     borderRadius: BorderRadius.full,
// // //     gap: 4,
// // //   },
// // //   rating: {
// // //     fontSize: 11,
// // //     fontWeight: "600",
// // //   },
// // //   licensePlate: {
// // //     fontSize: 14,
// // //     fontWeight: "700",
// // //     letterSpacing: 1,
// // //   },
// // //   contactButtons: {
// // //     flexDirection: "row",
// // //     gap: Spacing.sm,
// // //   },
// // //   contactButton: {
// // //     width: 40,
// // //     height: 40,
// // //     borderRadius: 20,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //   },
// // //   tripDetails: {
// // //     marginBottom: Spacing.lg,
// // //   },
// // //   routeContainer: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //   },
// // //   routeIndicator: {
// // //     width: 20,
// // //     alignItems: "center",
// // //     marginRight: Spacing.md,
// // //   },
// // //   routeDot: {
// // //     width: 10,
// // //     height: 10,
// // //     borderRadius: 5,
// // //   },
// // //   routeLine: {
// // //     width: 2,
// // //     height: 24,
// // //     marginVertical: 4,
// // //   },
// // //   addresses: {
// // //     flex: 1,
// // //     justifyContent: "space-between",
// // //     height: 48,
// // //   },
// // //   address: {
// // //     fontSize: 14,
// // //   },
// // //   farePrice: {
// // //     fontSize: 20,
// // //     fontWeight: "700",
// // //     marginLeft: Spacing.md,
// // //   },
// // //   otpContainer: {
// // //     padding: Spacing.md,
// // //     borderRadius: BorderRadius.lg,
// // //     marginBottom: Spacing.lg,
// // //     alignItems: "center",
// // //   },
// // //   otpLabel: {
// // //     color: "#000000",
// // //     fontSize: 14,
// // //     fontWeight: "600",
// // //     marginBottom: Spacing.sm,
// // //   },
// // //   otpBox: {
// // //     flexDirection: "row",
// // //     gap: Spacing.sm,
// // //   },
// // //   otpDigit: {
// // //     width: 32,
// // //     height: 40,
// // //     borderRadius: BorderRadius.md,
// // //     backgroundColor: "#FFFFFF",
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //   },
// // //   otpText: {
// // //     fontSize: 20,
// // //     fontWeight: "700",
// // //     color: "#000000",
// // //   },
// // //   cancelButton: {
// // //     width: "100%",
// // //     padding: Spacing.lg,
// // //     borderRadius: BorderRadius.lg,
// // //     alignItems: "center",
// // //   },
// // //   cancelButtonText: {
// // //     fontSize: 16,
// // //     fontWeight: "600",
// // //   },
// // //   dropoffTime: {
// // //     fontSize: 14,
// // //     marginTop: 2,
// // //   },
// // //   searchingContainer: {
// // //     alignItems: "center",
// // //     paddingVertical: Spacing.lg,
// // //     marginBottom: Spacing.md,
// // //   },
// // //   searchingRing: {
// // //     width: 80,
// // //     height: 80,
// // //     borderRadius: 40,
// // //     borderWidth: 2,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     marginBottom: Spacing.md,
// // //   },
// // //   searchingRingInner: {
// // //     width: 60,
// // //     height: 60,
// // //     borderRadius: 30,
// // //     borderWidth: 2,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //   },
// // //   searchingPulse: {
// // //     position: "absolute",
// // //     width: 44,
// // //     height: 44,
// // //     borderRadius: 22,
// // //   },
// // //   searchingDot: {
// // //     width: 40,
// // //     height: 40,
// // //     borderRadius: 20,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //   },
// // //   searchingText: {
// // //     fontSize: 14,
// // //     textAlign: "center",
// // //   },
// // // });

// // //client/screens/rider/RideTrackingScreen.tsx
// // import React, { useState, useEffect, useRef, useCallback } from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   Pressable,
// //   Platform,
// //   Linking,
// //   ActivityIndicator,
// // } from "react-native";
// // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import Animated, {
// //   FadeIn,
// //   useAnimatedStyle,
// //   useSharedValue,
// //   withSpring,
// //   withRepeat,
// //   withTiming,
// // } from "react-native-reanimated";
// // import * as Haptics from "expo-haptics";

// // import { ThemedText } from "@/components/ThemedText";
// // import {
// //   MapViewWrapper,
// //   MarkerWrapper,
// //   PolylineWrapper,
// // } from "@/components/MapView";
// // import { useTheme } from "@/hooks/useTheme";
// // import { useRide } from "@/context/RideContext";
// // import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// // import { useAuth } from "@/context/AuthContext";
// // import { getApiUrl } from "@/lib/query-client";
// // import {
// //   UTOColors,
// //   Spacing,
// //   BorderRadius,
// //   Shadows,
// //   formatPrice,
// // } from "@/constants/theme";

// // const AnimatedView = Animated.createAnimatedComponent(View);
// // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // const darkMapStyle = [
// //   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
// //   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// //   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
// //   {
// //     featureType: "road",
// //     elementType: "geometry",
// //     stylers: [{ color: "#38414e" }],
// //   },
// //   {
// //     featureType: "water",
// //     elementType: "geometry",
// //     stylers: [{ color: "#17263c" }],
// //   },
// // ];

// // interface RoutePoint {
// //   latitude: number;
// //   longitude: number;
// // }

// // export default function RideTrackingScreen({ navigation }: any) {
// //   const insets = useSafeAreaInsets();
// //   const { theme, isDark } = useTheme();
// //   const { activeRide, cancelRide, completeRide } = useRide();
// //   const { user } = useAuth();

// //   // Real-time driver tracking
// //   const { driverLocation, rideStatus } = useRiderTracking({
// //     riderId: user?.id || "",
// //     rideId: activeRide?.id,
// //   });

// //   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
// //   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>(
// //     [],
// //   );
// //   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
// //   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
// //   const hasInitialized = useRef(false);

// //   const pulseScale = useSharedValue(1);
// //   const cancelScale = useSharedValue(1);

// //   // Fetch route directions when ride is active
// //   useEffect(() => {
// //     if (!activeRide) return;

// //     const fetchRoutes = async () => {
// //       setIsLoadingRoute(true);
// //       try {
// //         const apiUrl = getApiUrl();

// //         // Fetch route from pickup to dropoff
// //         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
// //         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

// //         const routeResponse = await fetch(
// //           new URL(
// //             `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`,
// //             apiUrl,
// //           ).toString(),
// //         );
// //         const routeData = await routeResponse.json();

// //         if (routeData.routes && routeData.routes.length > 0) {
// //           const route = routeData.routes[0];
// //           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
// //             setRouteCoordinates(route.decodedPolyline);
// //           }
// //         }
// //       } catch (error) {
// //         console.error("Failed to fetch route:", error);
// //       } finally {
// //         setIsLoadingRoute(false);
// //       }
// //     };

// //     fetchRoutes();
// //   }, [activeRide?.id]);

// //   // Fetch driver route to pickup when driver location updates
// //   useEffect(() => {
// //     if (!activeRide || !driverLocation) return;

// //     const fetchDriverRoute = async () => {
// //       try {
// //         const apiUrl = getApiUrl();
// //         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
// //         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

// //         const response = await fetch(
// //           new URL(
// //             `/api/directions?origin=${driverPos}&destination=${pickup}`,
// //             apiUrl,
// //           ).toString(),
// //         );
// //         const data = await response.json();

// //         if (data.routes && data.routes.length > 0) {
// //           const route = data.routes[0];
// //           if (route.decodedPolyline) {
// //             setDriverToPickupRoute(route.decodedPolyline);
// //           }
// //           if (route.legs && route.legs[0]) {
// //             setEstimatedArrival(route.legs[0].duration?.text || null);
// //           }
// //         }
// //       } catch (error) {
// //         console.error("Failed to fetch driver route:", error);
// //       }
// //     };

// //     // Only fetch if driver is coming to pickup
// //     if (activeRide.status === "accepted" || rideStatus === "accepted") {
// //       fetchDriverRoute();
// //     }
// //   }, [
// //     driverLocation?.latitude,
// //     driverLocation?.longitude,
// //     activeRide?.status,
// //     rideStatus,
// //   ]);

// //   useEffect(() => {
// //     pulseScale.value = withRepeat(
// //       withTiming(1.2, { duration: 1000 }),
// //       -1,
// //       true,
// //     );
// //     hasInitialized.current = true;
// //   }, []);

// //   useEffect(() => {
// //     if (!activeRide && hasInitialized.current) {
// //       const timer = setTimeout(() => {
// //         if (!activeRide) {
// //           navigation.goBack();
// //         }
// //       }, 500);
// //       return () => clearTimeout(timer);
// //     }
// //   }, [activeRide]);

// //   const pulseStyle = useAnimatedStyle(() => ({
// //     transform: [{ scale: pulseScale.value }],
// //     opacity: 2 - pulseScale.value,
// //   }));

// //   const cancelAnimatedStyle = useAnimatedStyle(() => ({
// //     transform: [{ scale: cancelScale.value }],
// //   }));

// //   if (!activeRide) return null;

// //   const handleCancel = () => {
// //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// //     cancelRide(activeRide.id);
// //   };

// //   const handleCall = () => {
// //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// //     Linking.openURL("tel:+1234567890");
// //   };

// //   const handleMessage = () => {
// //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// //     Linking.openURL("sms:+1234567890");
// //   };

// //   const getStatusMessage = () => {
// //     const status = rideStatus || activeRide.status;
// //     switch (status) {
// //       case "pending":
// //         return "Finding your driver...";
// //       case "accepted":
// //         return "Driver is on the way";
// //       case "arrived":
// //         return "Driver has arrived";
// //       case "in_progress":
// //         return "On your way to destination";
// //       default:
// //         return "Processing ride...";
// //     }
// //   };

// //   const getDropoffTime = () => {
// //     if (!activeRide) return "";
// //     const now = new Date();
// //     const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
// //     return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// //   };

// //   // Calculate map region to fit all points
// //   const getMapRegion = () => {
// //     const points: RoutePoint[] = [
// //       {
// //         latitude: activeRide.pickupLocation.latitude,
// //         longitude: activeRide.pickupLocation.longitude,
// //       },
// //       {
// //         latitude: activeRide.dropoffLocation.latitude,
// //         longitude: activeRide.dropoffLocation.longitude,
// //       },
// //     ];

// //     if (driverLocation) {
// //       points.push({
// //         latitude: driverLocation.latitude,
// //         longitude: driverLocation.longitude,
// //       });
// //     }

// //     const lats = points.map((p) => p.latitude);
// //     const lngs = points.map((p) => p.longitude);

// //     const minLat = Math.min(...lats);
// //     const maxLat = Math.max(...lats);
// //     const minLng = Math.min(...lngs);
// //     const maxLng = Math.max(...lngs);

// //     const centerLat = (minLat + maxLat) / 2;
// //     const centerLng = (minLng + maxLng) / 2;

// //     const latDelta = Math.max((maxLat - minLat) * 2, 0.01);
// //     const lngDelta = Math.max((maxLng - minLng) * 2, 0.01);

// //     return {
// //       latitude: centerLat,
// //       longitude: centerLng,
// //       latitudeDelta: latDelta,
// //       longitudeDelta: lngDelta,
// //     };
// //   };

// //   // Helper to calculate distance for the UI
// //   const getDistanceString = () => {
// //     if (!driverLocation || !activeRide) return null;

// //     // Simple Haversine-ish distance for the UI
// //     const R = 6371; // km
// //     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
// //     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
// //     const a = 
// //       Math.sin(dLat/2) * Math.sin(dLat/2) +
// //       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) * 
// //       Math.sin(dLon/2) * Math.sin(dLon/2);
// //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// //     const d = R * c;

// //     // Convert to miles (Uber style)
// //     const miles = d * 0.621371;
// //     if (miles < 0.1) return "Nearby";
// //     return `${miles.toFixed(1)} miles`;
// //   };

// //   // Use real driver location or simulate one for demo
// //   const currentDriverLocation = driverLocation || {
// //     latitude: activeRide.pickupLocation.latitude + 0.005,
// //     longitude: activeRide.pickupLocation.longitude + 0.003,
// //   };

// //   const currentStatus = rideStatus || activeRide.status;

// //   return (
// //     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
// //       <MapViewWrapper
// //         style={styles.map}
// //         initialRegion={getMapRegion()}
// //         customMapStyle={isDark ? darkMapStyle : []}
// //       >
// //         {/* Route from pickup to dropoff (black Uber-style) */}
// //         {routeCoordinates.length > 0 ? (
// //           <PolylineWrapper
// //             coordinates={routeCoordinates}
// //             strokeColor="#000000"
// //             strokeWidth={5}
// //           />
// //         ) : null}

// //         {/* Pickup marker */}
// //         <MarkerWrapper
// //           coordinate={{
// //             latitude: activeRide.pickupLocation.latitude,
// //             longitude: activeRide.pickupLocation.longitude,
// //           }}
// //           title="Pickup"
// //         >
// //           <View
// //             style={[
// //               styles.markerContainer,
// //               { backgroundColor: UTOColors.success },
// //             ]}
// //           >
// //             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
// //           </View>
// //         </MarkerWrapper>

// //         {/* Dropoff marker */}
// //         <MarkerWrapper
// //           coordinate={{
// //             latitude: activeRide.dropoffLocation.latitude,
// //             longitude: activeRide.dropoffLocation.longitude,
// //           }}
// //           title="Dropoff"
// //         >
// //           <View
// //             style={[
// //               styles.markerContainer,
// //               { backgroundColor: UTOColors.error },
// //             ]}
// //           >
// //             <MaterialIcons name="place" size={18} color="#FFFFFF" />
// //           </View>
// //         </MarkerWrapper>

// //         {/* Driver marker with pulse animation */}
// //         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
// //           <View style={styles.driverMarkerContainer}>
// //             <AnimatedView
// //               style={[
// //                 styles.driverPulse,
// //                 { backgroundColor: UTOColors.rider.primary },
// //                 pulseStyle,
// //               ]}
// //             />
// //             <View
// //               style={[
// //                 styles.driverMarker,
// //                 { backgroundColor: UTOColors.rider.primary },
// //               ]}
// //             >
// //               <MaterialIcons name="local-taxi" size={16} color="#000000" />
// //             </View>
// //           </View>
// //         </MarkerWrapper>
// //       </MapViewWrapper>

// //       {/* Loading indicator for route */}
// //       {isLoadingRoute ? (
// //         <View style={styles.loadingOverlay}>
// //           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
// //           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
// //         </View>
// //       ) : null}

// //       <Animated.View
// //         entering={FadeIn}
// //         style={[
// //           styles.bottomSheet,
// //           Shadows.large,
// //           {
// //             paddingBottom: insets.bottom + Spacing.lg,
// //             backgroundColor: theme.backgroundRoot,
// //           },
// //         ]}
// //       >
// //         {/* Status header */}
// //         <View style={styles.statusSection}>
// //           <View style={styles.statusRow}>
// //             <View
// //               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
// //             />
// //             <ThemedText style={styles.statusText}>
// //               {getStatusMessage()}
// //             </ThemedText>
// //           </View>
// //           {currentStatus !== "pending" && (
// //             <View style={styles.etaRow}>
// //               <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
// //                 {estimatedArrival || `${activeRide.durationMinutes} min`} away
// //               </ThemedText>
// //               {getDistanceString() ? (
// //                 <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
// //                   • {getDistanceString()}
// //                 </ThemedText>
// //               ) : null}
// //             </View>
// //           )}
// //           {currentStatus === "in_progress" ? (
// //             <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
// //               Estimated dropoff: {getDropoffTime()}
// //             </ThemedText>
// //           ) : null}
// //         </View>

// //         {/* PENDING: searching animation */}
// //         {currentStatus === "pending" ? (
// //           <View style={styles.searchingContainer}>
// //             <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
// //               <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
// //                 <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
// //                 <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
// //                   <MaterialIcons name="local-taxi" size={20} color="#000" />
// //                 </View>
// //               </View>
// //             </View>
// //             <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
// //               Matching you with a nearby driver
// //             </ThemedText>
// //           </View>
// //         ) : null}

// //         {/* ACCEPTED / IN_PROGRESS: OTP banner then driver card */}
// //         {currentStatus !== "pending" ? (
// //           <>
// //             {(currentStatus === "accepted" || currentStatus === "arrived") && activeRide.otp ? (
// //               <View
// //                 style={[
// //                   styles.otpContainer,
// //                   { backgroundColor: UTOColors.rider.primary },
// //                 ]}
// //               >
// //                 <ThemedText style={styles.otpLabel}>
// //                   {currentStatus === "arrived"
// //                     ? "Driver has arrived — share this PIN"
// //                     : "Your ride PIN — share with driver"}
// //                 </ThemedText>
// //                 <View style={styles.otpBox}>
// //                   {activeRide.otp.split("").map((digit, i) => (
// //                     <View key={i} style={styles.otpDigit}>
// //                       <ThemedText style={styles.otpText}>{digit}</ThemedText>
// //                     </View>
// //                   ))}
// //                 </View>
// //               </View>
// //             ) : null}

// //             <View
// //               style={[
// //                 styles.driverCard,
// //                 { backgroundColor: theme.backgroundDefault },
// //               ]}
// //             >
// //               <View
// //                 style={[
// //                   styles.driverAvatar,
// //                   { backgroundColor: theme.backgroundSecondary },
// //                 ]}
// //               >
// //                 <MaterialIcons
// //                   name="person"
// //                   size={24}
// //                   color={theme.textSecondary}
// //                 />
// //               </View>
// //               <View style={styles.driverInfo}>
// //                 <ThemedText style={styles.driverName}>
// //                   {activeRide.driverName}
// //                 </ThemedText>
// //                 <View style={styles.vehicleRow}>
// //                   <ThemedText
// //                     style={[styles.vehicleInfo, { color: theme.textSecondary }]}
// //                   >
// //                     {activeRide.vehicleInfo}
// //                   </ThemedText>
// //                   <View
// //                     style={[
// //                       styles.ratingBadge,
// //                       { backgroundColor: UTOColors.warning + "20" },
// //                     ]}
// //                   >
// //                     <MaterialIcons name="star" size={12} color={UTOColors.warning} />
// //                     <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
// //                       {activeRide.driverRating?.toFixed(1)}
// //                     </ThemedText>
// //                   </View>
// //                 </View>
// //                 <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
// //                   {activeRide.licensePlate}
// //                 </ThemedText>
// //               </View>
// //               <View style={styles.contactButtons}>
// //                 <Pressable
// //                   onPress={handleCall}
// //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// //                 >
// //                   <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
// //                 </Pressable>
// //                 <Pressable
// //                   onPress={handleMessage}
// //                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
// //                 >
// //                   <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
// //                 </Pressable>
// //               </View>
// //             </View>
// //           </>
// //         ) : null}

// //         {/* Route summary row */}
// //         <View style={styles.tripDetails}>
// //           <View style={styles.routeContainer}>
// //             <View style={styles.routeIndicator}>
// //               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
// //               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
// //               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
// //             </View>
// //             <View style={styles.addresses}>
// //               <ThemedText style={styles.address} numberOfLines={1}>
// //                 {activeRide.pickupLocation.address}
// //               </ThemedText>
// //               <ThemedText style={styles.address} numberOfLines={1}>
// //                 {activeRide.dropoffLocation.address}
// //               </ThemedText>
// //             </View>
// //             <ThemedText style={styles.farePrice}>
// //               {formatPrice(activeRide.farePrice)}
// //             </ThemedText>
// //           </View>
// //         </View>

// //         {/* Cancel button — only while pending or accepted */}
// //         {currentStatus === "pending" || currentStatus === "accepted" ? (
// //           <AnimatedPressable
// //             onPress={handleCancel}
// //             onPressIn={() => (cancelScale.value = withSpring(0.98))}
// //             onPressOut={() => (cancelScale.value = withSpring(1))}
// //             style={[
// //               styles.cancelButton,
// //               { backgroundColor: UTOColors.error + "15" },
// //               cancelAnimatedStyle,
// //             ]}
// //           >
// //             <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
// //               Cancel Ride
// //             </ThemedText>
// //           </AnimatedPressable>
// //         ) : null}
// //       </Animated.View>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //   },
// //   map: {
// //     flex: 1,
// //   },
// //   loadingOverlay: {
// //     position: "absolute",
// //     top: 60,
// //     alignSelf: "center",
// //     backgroundColor: "rgba(0,0,0,0.7)",
// //     paddingHorizontal: Spacing.lg,
// //     paddingVertical: Spacing.sm,
// //     borderRadius: BorderRadius.full,
// //     flexDirection: "row",
// //     alignItems: "center",
// //     gap: Spacing.sm,
// //   },
// //   loadingText: {
// //     color: "#FFFFFF",
// //     fontSize: 12,
// //   },
// //   markerContainer: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     borderWidth: 2,
// //     borderColor: "#FFFFFF",
// //   },
// //   driverMarkerContainer: {
// //     width: 50,
// //     height: 50,
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   driverPulse: {
// //     position: "absolute",
// //     width: 50,
// //     height: 50,
// //     borderRadius: 25,
// //   },
// //   driverMarker: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     borderWidth: 3,
// //     borderColor: "#FFFFFF",
// //   },
// //   bottomSheet: {
// //     position: "absolute",
// //     bottom: 0,
// //     left: 0,
// //     right: 0,
// //     paddingHorizontal: Spacing.lg,
// //     paddingTop: Spacing.xl,
// //     borderTopLeftRadius: BorderRadius.xl,
// //     borderTopRightRadius: BorderRadius.xl,
// //   },
// //   statusSection: {
// //     marginBottom: Spacing.lg,
// //   },
// //   statusRow: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     marginBottom: 4,
// //   },
// //   statusDot: {
// //     width: 10,
// //     height: 10,
// //     borderRadius: 5,
// //     marginRight: Spacing.sm,
// //   },
// //   statusText: {
// //     fontSize: 18,
// //     fontWeight: "600",
// //   },
// //   eta: {
// //     fontSize: 14,
// //   },
// //   etaRow: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     marginLeft: 18,
// //     gap: 4,
// //   },
// //   distance: {
// //     fontSize: 14,
// //   },
// //   driverCard: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     padding: Spacing.lg,
// //     borderRadius: BorderRadius.lg,
// //     marginBottom: Spacing.lg,
// //   },
// //   driverAvatar: {
// //     width: 50,
// //     height: 50,
// //     borderRadius: 25,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginRight: Spacing.md,
// //   },
// //   driverInfo: {
// //     flex: 1,
// //   },
// //   driverName: {
// //     fontSize: 16,
// //     fontWeight: "600",
// //     marginBottom: 2,
// //   },
// //   vehicleRow: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     gap: Spacing.sm,
// //     marginBottom: 2,
// //   },
// //   vehicleInfo: {
// //     fontSize: 13,
// //   },
// //   ratingBadge: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     paddingHorizontal: 6,
// //     paddingVertical: 2,
// //     borderRadius: BorderRadius.full,
// //     gap: 4,
// //   },
// //   rating: {
// //     fontSize: 11,
// //     fontWeight: "600",
// //   },
// //   licensePlate: {
// //     fontSize: 14,
// //     fontWeight: "700",
// //     letterSpacing: 1,
// //   },
// //   contactButtons: {
// //     flexDirection: "row",
// //     gap: Spacing.sm,
// //   },
// //   contactButton: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 20,
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   tripDetails: {
// //     marginBottom: Spacing.lg,
// //   },
// //   routeContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //   },
// //   routeIndicator: {
// //     width: 20,
// //     alignItems: "center",
// //     marginRight: Spacing.md,
// //   },
// //   routeDot: {
// //     width: 10,
// //     height: 10,
// //     borderRadius: 5,
// //   },
// //   routeLine: {
// //     width: 2,
// //     height: 24,
// //     marginVertical: 4,
// //   },
// //   addresses: {
// //     flex: 1,
// //     justifyContent: "space-between",
// //     height: 48,
// //   },
// //   address: {
// //     fontSize: 14,
// //   },
// //   farePrice: {
// //     fontSize: 20,
// //     fontWeight: "700",
// //     marginLeft: Spacing.md,
// //   },
// //   otpContainer: {
// //     padding: Spacing.md,
// //     borderRadius: BorderRadius.lg,
// //     marginBottom: Spacing.lg,
// //     alignItems: "center",
// //   },
// //   otpLabel: {
// //     color: "#000000",
// //     fontSize: 14,
// //     fontWeight: "600",
// //     marginBottom: Spacing.sm,
// //   },
// //   otpBox: {
// //     flexDirection: "row",
// //     gap: Spacing.sm,
// //   },
// //   otpDigit: {
// //     width: 32,
// //     height: 40,
// //     borderRadius: BorderRadius.md,
// //     backgroundColor: "#FFFFFF",
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   otpText: {
// //     fontSize: 20,
// //     fontWeight: "700",
// //     color: "#000000",
// //   },
// //   cancelButton: {
// //     width: "100%",
// //     padding: Spacing.lg,
// //     borderRadius: BorderRadius.lg,
// //     alignItems: "center",
// //   },
// //   cancelButtonText: {
// //     fontSize: 16,
// //     fontWeight: "600",
// //   },
// //   dropoffTime: {
// //     fontSize: 14,
// //     marginTop: 2,
// //   },
// //   searchingContainer: {
// //     alignItems: "center",
// //     paddingVertical: Spacing.lg,
// //     marginBottom: Spacing.md,
// //   },
// //   searchingRing: {
// //     width: 80,
// //     height: 80,
// //     borderRadius: 40,
// //     borderWidth: 2,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginBottom: Spacing.md,
// //   },
// //   searchingRingInner: {
// //     width: 60,
// //     height: 60,
// //     borderRadius: 30,
// //     borderWidth: 2,
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   searchingPulse: {
// //     position: "absolute",
// //     width: 44,
// //     height: 44,
// //     borderRadius: 22,
// //   },
// //   searchingDot: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 20,
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   searchingText: {
// //     fontSize: 14,
// //     textAlign: "center",
// //   },
// // });

// //client/screens/rider/RideTrackingScreen.tsx
// import React, { useState, useEffect, useRef, useCallback } from "react";
// import {
//   StyleSheet,
//   View,
//   Pressable,
//   Platform,
//   Linking,
//   ActivityIndicator,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { MaterialIcons } from "@expo/vector-icons";
// import Animated, {
//   FadeIn,
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withRepeat,
//   withTiming,
// } from "react-native-reanimated";
// import * as Haptics from "expo-haptics";

// import { ThemedText } from "@/components/ThemedText";
// import {
//   MapViewWrapper,
//   MarkerWrapper,
//   PolylineWrapper,
// } from "@/components/MapView";
// import { useTheme } from "@/hooks/useTheme";
// import { useRide } from "@/context/RideContext";
// import { useRiderTracking } from "@/hooks/useRealTimeTracking";
// import { useAuth } from "@/context/AuthContext";
// import { getApiUrl } from "@/lib/query-client";
// import {
//   UTOColors,
//   Spacing,
//   BorderRadius,
//   Shadows,
//   formatPrice,
// } from "@/constants/theme";

// const AnimatedView = Animated.createAnimatedComponent(View);
// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// const darkMapStyle = [
//   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
//   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
//   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
//   {
//     featureType: "road",
//     elementType: "geometry",
//     stylers: [{ color: "#38414e" }],
//   },
//   {
//     featureType: "water",
//     elementType: "geometry",
//     stylers: [{ color: "#17263c" }],
//   },
// ];

// interface RoutePoint {
//   latitude: number;
//   longitude: number;
// }

// export default function RideTrackingScreen({ navigation }: any) {
//   const insets = useSafeAreaInsets();
//   const { theme, isDark } = useTheme();
//   const { activeRide, cancelRide, completeRide } = useRide();
//   const { user } = useAuth();

//   // Real-time driver tracking
//   const { driverLocation, rideStatus } = useRiderTracking({
//     riderId: user?.id || "",
//     rideId: activeRide?.id,
//   });

//   const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
//   const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>(
//     [],
//   );
//   const [isLoadingRoute, setIsLoadingRoute] = useState(true);
//   const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
//   const hasInitialized = useRef(false);

//   const pulseScale = useSharedValue(1);
//   const cancelScale = useSharedValue(1);

//   // Fetch route directions when ride is active
//   useEffect(() => {
//     if (!activeRide) return;

//     const fetchRoutes = async () => {
//       setIsLoadingRoute(true);
//       try {
//         const apiUrl = getApiUrl();

//         // Fetch route from pickup to dropoff
//         const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
//         const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

//         const routeResponse = await fetch(
//           new URL(
//             `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`,
//             apiUrl,
//           ).toString(),
//         );
//         const routeData = await routeResponse.json();

//         if (routeData.routes && routeData.routes.length > 0) {
//           const route = routeData.routes[0];
//           if (route.decodedPolyline && route.decodedPolyline.length > 0) {
//             console.log('✅ Polyline loaded:', route.decodedPolyline.length, 'points');
//             setRouteCoordinates(route.decodedPolyline);
//           }
//         }
//       } catch (error) {
//         console.error("Failed to fetch route:", error);
//       } finally {
//         setIsLoadingRoute(false);
//       }
//     };

//     fetchRoutes();
//   }, [activeRide?.id]);

//   // Fetch driver route to pickup when driver location updates
//   useEffect(() => {
//     if (!activeRide || !driverLocation) return;

//     const fetchDriverRoute = async () => {
//       try {
//         const apiUrl = getApiUrl();
//         const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
//         const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

//         const response = await fetch(
//           new URL(
//             `/api/directions?origin=${driverPos}&destination=${pickup}`,
//             apiUrl,
//           ).toString(),
//         );
//         const data = await response.json();

//         if (data.routes && data.routes.length > 0) {
//           const route = data.routes[0];
//           if (route.decodedPolyline) {
//             setDriverToPickupRoute(route.decodedPolyline);
//           }
//           if (route.legs && route.legs[0]) {
//             setEstimatedArrival(route.legs[0].duration?.text || null);
//           }
//         }
//       } catch (error) {
//         console.error("Failed to fetch driver route:", error);
//       }
//     };

//     // Only fetch if driver is coming to pickup
//     if (activeRide.status === "accepted" || rideStatus === "accepted") {
//       fetchDriverRoute();
//     }
//   }, [
//     driverLocation?.latitude,
//     driverLocation?.longitude,
//     activeRide?.status,
//     rideStatus,
//   ]);

//   useEffect(() => {
//     pulseScale.value = withRepeat(
//       withTiming(1.2, { duration: 1000 }),
//       -1,
//       true,
//     );
//     hasInitialized.current = true;
//   }, []);

//   useEffect(() => {
//     if (!activeRide && hasInitialized.current) {
//       const timer = setTimeout(() => {
//         if (!activeRide) {
//           navigation.goBack();
//         }
//       }, 500);
//       return () => clearTimeout(timer);
//     }
//   }, [activeRide]);

//   const pulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: pulseScale.value }],
//     opacity: 2 - pulseScale.value,
//   }));

//   const cancelAnimatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: cancelScale.value }],
//   }));

//   if (!activeRide) return null;

//   const handleCancel = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//     cancelRide(activeRide.id);
//   };

//   const handleCall = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     Linking.openURL("tel:+1234567890");
//   };

//   const handleMessage = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     Linking.openURL("sms:+1234567890");
//   };

//   const getStatusMessage = () => {
//     const status = rideStatus || activeRide.status;
//     switch (status) {
//       case "pending":
//         return "Finding your driver...";
//       case "accepted":
//         return "Driver is on the way";
//       case "arrived":
//         return "Driver has arrived";
//       case "in_progress":
//         return "On your way to destination";
//       default:
//         return "Processing ride...";
//     }
//   };

//   const getDropoffTime = () => {
//     if (!activeRide) return "";
//     const now = new Date();
//     const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
//     return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   };

//   // ✅✅✅ FIXED: Calculate map region with CLOSE zoom
//   const getMapRegion = () => {
//     const points: RoutePoint[] = [
//       {
//         latitude: activeRide.pickupLocation.latitude,
//         longitude: activeRide.pickupLocation.longitude,
//       },
//       {
//         latitude: activeRide.dropoffLocation.latitude,
//         longitude: activeRide.dropoffLocation.longitude,
//       },
//     ];

//     if (driverLocation) {
//       points.push({
//         latitude: driverLocation.latitude,
//         longitude: driverLocation.longitude,
//       });
//     }

//     const lats = points.map((p) => p.latitude);
//     const lngs = points.map((p) => p.longitude);

//     const minLat = Math.min(...lats);
//     const maxLat = Math.max(...lats);
//     const minLng = Math.min(...lngs);
//     const maxLng = Math.max(...lngs);

//     const centerLat = (minLat + maxLat) / 2;
//     const centerLng = (minLng + maxLng) / 2;

//     // ✅✅✅ CRITICAL FIX: Changed from * 2 to * 1.1
//     // This zooms the map MUCH closer so the 5px black line is visible!
//     const latDelta = Math.max((maxLat - minLat) * 1.1, 0.02);
//     const lngDelta = Math.max((maxLng - minLng) * 1.1, 0.02);

//     console.log('🗺️ Map region:', { latDelta, lngDelta });

//     return {
//       latitude: centerLat,
//       longitude: centerLng,
//       latitudeDelta: latDelta,
//       longitudeDelta: lngDelta,
//     };
//   };

//   // Helper to calculate distance for the UI
//   const getDistanceString = () => {
//     if (!driverLocation || !activeRide) return null;

//     // Simple Haversine-ish distance for the UI
//     const R = 6371; // km
//     const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
//     const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     const d = R * c;

//     // Convert to miles (Uber style)
//     const miles = d * 0.621371;
//     if (miles < 0.1) return "Nearby";
//     return `${miles.toFixed(1)} miles`;
//   };

//   // Use real driver location or simulate one for demo
//   const currentDriverLocation = driverLocation || {
//     latitude: activeRide.pickupLocation.latitude + 0.005,
//     longitude: activeRide.pickupLocation.longitude + 0.003,
//   };

//   const currentStatus = rideStatus || activeRide.status;

//   console.log('🎨 Rendering. Route points:', routeCoordinates.length);

//   return (
//     <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
//       <MapViewWrapper
//         style={styles.map}
//         initialRegion={getMapRegion()}
//         customMapStyle={isDark ? darkMapStyle : []}
//       >
//         {/* Route from pickup to dropoff (black Uber-style) */}
//         {routeCoordinates.length > 0 ? (
//           <>
//             {console.log('✏️ Rendering BLACK POLYLINE')}
//             <PolylineWrapper
//               coordinates={routeCoordinates}
//               strokeColor="#000000"
//               strokeWidth={5}
//             />
//           </>
//         ) : null}

//         {/* Pickup marker */}
//         <MarkerWrapper
//           coordinate={{
//             latitude: activeRide.pickupLocation.latitude,
//             longitude: activeRide.pickupLocation.longitude,
//           }}
//           title="Pickup"
//         >
//           <View
//             style={[
//               styles.markerContainer,
//               { backgroundColor: UTOColors.success },
//             ]}
//           >
//             <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
//           </View>
//         </MarkerWrapper>

//         {/* Dropoff marker */}
//         <MarkerWrapper
//           coordinate={{
//             latitude: activeRide.dropoffLocation.latitude,
//             longitude: activeRide.dropoffLocation.longitude,
//           }}
//           title="Dropoff"
//         >
//           <View
//             style={[
//               styles.markerContainer,
//               { backgroundColor: UTOColors.error },
//             ]}
//           >
//             <MaterialIcons name="place" size={18} color="#FFFFFF" />
//           </View>
//         </MarkerWrapper>

//         {/* Driver marker with pulse animation */}
//         <MarkerWrapper coordinate={currentDriverLocation} title="Driver">
//           <View style={styles.driverMarkerContainer}>
//             <AnimatedView
//               style={[
//                 styles.driverPulse,
//                 { backgroundColor: UTOColors.rider.primary },
//                 pulseStyle,
//               ]}
//             />
//             <View
//               style={[
//                 styles.driverMarker,
//                 { backgroundColor: UTOColors.rider.primary },
//               ]}
//             >
//               <MaterialIcons name="local-taxi" size={16} color="#000000" />
//             </View>
//           </View>
//         </MarkerWrapper>
//       </MapViewWrapper>

//       {/* Loading indicator for route */}
//       {isLoadingRoute ? (
//         <View style={styles.loadingOverlay}>
//           <ActivityIndicator size="small" color={UTOColors.rider.primary} />
//           <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
//         </View>
//       ) : null}

//       <Animated.View
//         entering={FadeIn}
//         style={[
//           styles.bottomSheet,
//           Shadows.large,
//           {
//             paddingBottom: insets.bottom + Spacing.lg,
//             backgroundColor: theme.backgroundRoot,
//           },
//         ]}
//       >
//         {/* Status header */}
//         <View style={styles.statusSection}>
//           <View style={styles.statusRow}>
//             <View
//               style={[styles.statusDot, { backgroundColor: UTOColors.success }]}
//             />
//             <ThemedText style={styles.statusText}>
//               {getStatusMessage()}
//             </ThemedText>
//           </View>
//           {currentStatus !== "pending" && (
//             <View style={styles.etaRow}>
//               <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
//                 {estimatedArrival || `${activeRide.durationMinutes} min`} away
//               </ThemedText>
//               {getDistanceString() ? (
//                 <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
//                   • {getDistanceString()}
//                 </ThemedText>
//               ) : null}
//             </View>
//           )}
//           {currentStatus === "in_progress" ? (
//             <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
//               Estimated dropoff: {getDropoffTime()}
//             </ThemedText>
//           ) : null}
//         </View>

//         {/* PENDING: searching animation */}
//         {currentStatus === "pending" ? (
//           <View style={styles.searchingContainer}>
//             <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
//               <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
//                 <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
//                 <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
//                   <MaterialIcons name="local-taxi" size={20} color="#000" />
//                 </View>
//               </View>
//             </View>
//             <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
//               Matching you with a nearby driver
//             </ThemedText>
//           </View>
//         ) : null}

//         {/* ACCEPTED / IN_PROGRESS: OTP banner then driver card */}
//         {currentStatus !== "pending" ? (
//           <>
//             {(currentStatus === "accepted" || currentStatus === "arrived") && activeRide.otp ? (
//               <View
//                 style={[
//                   styles.otpContainer,
//                   { backgroundColor: UTOColors.rider.primary },
//                 ]}
//               >
//                 <ThemedText style={styles.otpLabel}>
//                   {currentStatus === "arrived"
//                     ? "Driver has arrived — share this PIN"
//                     : "Your ride PIN — share with driver"}
//                 </ThemedText>
//                 <View style={styles.otpBox}>
//                   {activeRide.otp.split("").map((digit, i) => (
//                     <View key={i} style={styles.otpDigit}>
//                       <ThemedText style={styles.otpText}>{digit}</ThemedText>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ) : null}

//             <View
//               style={[
//                 styles.driverCard,
//                 { backgroundColor: theme.backgroundDefault },
//               ]}
//             >
//               <View
//                 style={[
//                   styles.driverAvatar,
//                   { backgroundColor: theme.backgroundSecondary },
//                 ]}
//               >
//                 <MaterialIcons
//                   name="person"
//                   size={24}
//                   color={theme.textSecondary}
//                 />
//               </View>
//               <View style={styles.driverInfo}>
//                 <ThemedText style={styles.driverName}>
//                   {activeRide.driverName}
//                 </ThemedText>
//                 <View style={styles.vehicleRow}>
//                   <ThemedText
//                     style={[styles.vehicleInfo, { color: theme.textSecondary }]}
//                   >
//                     {activeRide.vehicleInfo}
//                   </ThemedText>
//                   <View
//                     style={[
//                       styles.ratingBadge,
//                       { backgroundColor: UTOColors.warning + "20" },
//                     ]}
//                   >
//                     <MaterialIcons name="star" size={12} color={UTOColors.warning} />
//                     <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
//                       {activeRide.driverRating?.toFixed(1)}
//                     </ThemedText>
//                   </View>
//                 </View>
//                 <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
//                   {activeRide.licensePlate}
//                 </ThemedText>
//               </View>
//               <View style={styles.contactButtons}>
//                 <Pressable
//                   onPress={handleCall}
//                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
//                 >
//                   <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
//                 </Pressable>
//                 <Pressable
//                   onPress={handleMessage}
//                   style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
//                 >
//                   <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
//                 </Pressable>
//               </View>
//             </View>
//           </>
//         ) : null}

//         {/* Route summary row */}
//         <View style={styles.tripDetails}>
//           <View style={styles.routeContainer}>
//             <View style={styles.routeIndicator}>
//               <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
//               <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
//               <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
//             </View>
//             <View style={styles.addresses}>
//               <ThemedText style={styles.address} numberOfLines={1}>
//                 {activeRide.pickupLocation.address}
//               </ThemedText>
//               <ThemedText style={styles.address} numberOfLines={1}>
//                 {activeRide.dropoffLocation.address}
//               </ThemedText>
//             </View>
//             <ThemedText style={styles.farePrice}>
//               {formatPrice(activeRide.farePrice)}
//             </ThemedText>
//           </View>
//         </View>

//         {/* Cancel button — only while pending or accepted */}
//         {currentStatus === "pending" || currentStatus === "accepted" ? (
//           <AnimatedPressable
//             onPress={handleCancel}
//             onPressIn={() => (cancelScale.value = withSpring(0.98))}
//             onPressOut={() => (cancelScale.value = withSpring(1))}
//             style={[
//               styles.cancelButton,
//               { backgroundColor: UTOColors.error + "15" },
//               cancelAnimatedStyle,
//             ]}
//           >
//             <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
//               Cancel Ride
//             </ThemedText>
//           </AnimatedPressable>
//         ) : null}
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   map: {
//     flex: 1,
//   },
//   loadingOverlay: {
//     position: "absolute",
//     top: 60,
//     alignSelf: "center",
//     backgroundColor: "rgba(0,0,0,0.7)",
//     paddingHorizontal: Spacing.lg,
//     paddingVertical: Spacing.sm,
//     borderRadius: BorderRadius.full,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: Spacing.sm,
//   },
//   loadingText: {
//     color: "#FFFFFF",
//     fontSize: 12,
//   },
//   markerContainer: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 2,
//     borderColor: "#FFFFFF",
//   },
//   driverMarkerContainer: {
//     width: 50,
//     height: 50,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   driverPulse: {
//     position: "absolute",
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   driverMarker: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 3,
//     borderColor: "#FFFFFF",
//   },
//   bottomSheet: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     paddingHorizontal: Spacing.lg,
//     paddingTop: Spacing.xl,
//     borderTopLeftRadius: BorderRadius.xl,
//     borderTopRightRadius: BorderRadius.xl,
//   },
//   statusSection: {
//     marginBottom: Spacing.lg,
//   },
//   statusRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 4,
//   },
//   statusDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     marginRight: Spacing.sm,
//   },
//   statusText: {
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   eta: {
//     fontSize: 14,
//   },
//   etaRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginLeft: 18,
//     gap: 4,
//   },
//   distance: {
//     fontSize: 14,
//   },
//   driverCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: Spacing.lg,
//     borderRadius: BorderRadius.lg,
//     marginBottom: Spacing.lg,
//   },
//   driverAvatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: Spacing.md,
//   },
//   driverInfo: {
//     flex: 1,
//   },
//   driverName: {
//     fontSize: 16,
//     fontWeight: "600",
//     marginBottom: 2,
//   },
//   vehicleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: Spacing.sm,
//     marginBottom: 2,
//   },
//   vehicleInfo: {
//     fontSize: 13,
//   },
//   ratingBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: BorderRadius.full,
//     gap: 4,
//   },
//   rating: {
//     fontSize: 11,
//     fontWeight: "600",
//   },
//   licensePlate: {
//     fontSize: 14,
//     fontWeight: "700",
//     letterSpacing: 1,
//   },
//   contactButtons: {
//     flexDirection: "row",
//     gap: Spacing.sm,
//   },
//   contactButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   tripDetails: {
//     marginBottom: Spacing.lg,
//   },
//   routeContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   routeIndicator: {
//     width: 20,
//     alignItems: "center",
//     marginRight: Spacing.md,
//   },
//   routeDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//   },
//   routeLine: {
//     width: 2,
//     height: 24,
//     marginVertical: 4,
//   },
//   addresses: {
//     flex: 1,
//     justifyContent: "space-between",
//     height: 48,
//   },
//   address: {
//     fontSize: 14,
//   },
//   farePrice: {
//     fontSize: 20,
//     fontWeight: "700",
//     marginLeft: Spacing.md,
//   },
//   otpContainer: {
//     padding: Spacing.md,
//     borderRadius: BorderRadius.lg,
//     marginBottom: Spacing.lg,
//     alignItems: "center",
//   },
//   otpLabel: {
//     color: "#000000",
//     fontSize: 14,
//     fontWeight: "600",
//     marginBottom: Spacing.sm,
//   },
//   otpBox: {
//     flexDirection: "row",
//     gap: Spacing.sm,
//   },
//   otpDigit: {
//     width: 32,
//     height: 40,
//     borderRadius: BorderRadius.md,
//     backgroundColor: "#FFFFFF",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   otpText: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#000000",
//   },
//   cancelButton: {
//     width: "100%",
//     padding: Spacing.lg,
//     borderRadius: BorderRadius.lg,
//     alignItems: "center",
//   },
//   cancelButtonText: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   dropoffTime: {
//     fontSize: 14,
//     marginTop: 2,
//   },
//   searchingContainer: {
//     alignItems: "center",
//     paddingVertical: Spacing.lg,
//     marginBottom: Spacing.md,
//   },
//   searchingRing: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     borderWidth: 2,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: Spacing.md,
//   },
//   searchingRingInner: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     borderWidth: 2,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   searchingPulse: {
//     position: "absolute",
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//   },
//   searchingDot: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   searchingText: {
//     fontSize: 14,
//     textAlign: "center",
//   },
// });


//client/screens/rider/RideTrackingScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import {
  MapViewWrapper,
  MarkerWrapper,
  PolylineWrapper,
} from "@/components/MapView";
import { useTheme } from "@/hooks/useTheme";
import { useRide } from "@/context/RideContext";
import { useRiderTracking } from "@/hooks/useRealTimeTracking";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import {
  UTOColors,
  Spacing,
  BorderRadius,
  Shadows,
  formatPrice,
} from "@/constants/theme";

import { TopDownCarView } from "@/components/TopDownCarView";
import { DummyCars } from "@/components/DummyCars";
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function RideTrackingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { activeRide, cancelRide, completeRide, updateRidePaymentMethod } = useRide();
  const { user } = useAuth();

  const { driverLocation, rideStatus } = useRiderTracking({
    riderId: user?.id || "",
    rideId: activeRide?.id,
  });

  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<RoutePoint[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [driverDistance, setDriverDistance] = useState<string | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(null);
  const [noDriversAvailable, setNoDriversAvailable] = useState(false);
  const hasInitialized = useRef(false);

  const pulseScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);
  const timerPulse = useSharedValue(1);

  // Fetch route directions
  useEffect(() => {
    if (!activeRide) return;

    const fetchRoutes = async () => {
      setIsLoadingRoute(true);
      try {
        const apiUrl = getApiUrl();
        const pickupToDropoff = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;
        const dropoff = `${activeRide.dropoffLocation.latitude},${activeRide.dropoffLocation.longitude}`;

        console.log('🚀 Fetching route...');
        const routeResponse = await fetch(
          new URL(
            `/api/directions?origin=${pickupToDropoff}&destination=${dropoff}`,
            apiUrl,
          ).toString(),
        );
        const routeData = await routeResponse.json();

        if (routeData.routes && routeData.routes.length > 0) {
          const route = routeData.routes[0];
          if (route.decodedPolyline && route.decodedPolyline.length > 0) {
            console.log('✅ ✅ ✅ ROUTE LOADED!', route.decodedPolyline.length, 'points');
            console.log('First point:', route.decodedPolyline[0]);
            console.log('Last point:', route.decodedPolyline[route.decodedPolyline.length - 1]);
            setRouteCoordinates(route.decodedPolyline);
          } else {
            console.log('❌ No polyline in route');
          }
        } else {
          console.log('❌ No routes found');
        }
      } catch (error) {
        console.error("❌ Route fetch error:", error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoutes();
  }, [activeRide?.id]);

  // Fetch driver route to pickup
  const fetchDriverRoute = useCallback(async () => {
    if (!activeRide || !driverLocation) return;
    try {
      const apiUrl = getApiUrl();
      const driverPos = `${driverLocation.latitude},${driverLocation.longitude}`;
      const pickup = `${activeRide.pickupLocation.latitude},${activeRide.pickupLocation.longitude}`;

      const response = await fetch(
        new URL(
          `/api/directions?origin=${driverPos}&destination=${pickup}`,
          apiUrl,
        ).toString(),
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.decodedPolyline) {
          setDriverToPickupRoute(route.decodedPolyline);
        }
        if (route.legs && route.legs[0]) {
          setEstimatedArrival(route.legs[0].duration?.text || null);
          setDriverDistance(route.legs[0].distance?.text || null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch driver route:", error);
    }
  }, [activeRide?.id, driverLocation?.latitude, driverLocation?.longitude]);

  // Fetch driver route when location changes and status is accepted/arrived
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status === "accepted" || status === "arrived") {
      fetchDriverRoute();
    }
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    activeRide?.status,
    rideStatus,
    fetchDriverRoute,
  ]);

  // Periodic driver route refresh every 15 seconds for real-time ETA
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status !== "accepted" || !driverLocation) return;

    const interval = setInterval(() => {
      fetchDriverRoute();
    }, 15000);

    return () => clearInterval(interval);
  }, [rideStatus, activeRide?.status, driverLocation?.latitude, fetchDriverRoute]);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.2, { duration: 1000 }),
      -1,
      true,
    );
    hasInitialized.current = true;
  }, []);

  // ─── 10-minute countdown timer when driver arrives ────────────────────
  useEffect(() => {
    const status = rideStatus || activeRide?.status;
    if (status !== "arrived") {
      setWaitingSecondsLeft(null);
      return;
    }

    // Calculate remaining seconds from driverArrivedAt
    const WAIT_DURATION_SECONDS = 10 * 60; // 10 minutes
    let startTime: number;

    if (activeRide?.driverArrivedAt) {
      startTime = new Date(activeRide.driverArrivedAt).getTime();
    } else {
      // Fallback: start from now (if driverArrivedAt wasn't received)
      startTime = Date.now();
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, WAIT_DURATION_SECONDS - elapsed);
      setWaitingSecondsLeft(remaining);
      return remaining;
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(() => {
      const remaining = updateTimer();
      if (remaining <= 0) {
        clearInterval(interval);
        // Add auto cancellation with penalty when timer hits 00:00
        if (activeRide?.id) {
          console.log(`⏱️ Auto-cancelling ride ${activeRide.id} due to wait timer expiration`);
          cancelRide(activeRide.id, true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rideStatus, activeRide?.status, activeRide?.driverArrivedAt]);

  // Pulse animation for urgent timer (under 60 seconds)
  useEffect(() => {
    if (waitingSecondsLeft !== null && waitingSecondsLeft <= 60 && waitingSecondsLeft > 0) {
      timerPulse.value = withRepeat(
        withTiming(1.05, { duration: 500 }),
        -1,
        true,
      );
    } else {
      timerPulse.value = 1;
    }
  }, [waitingSecondsLeft !== null && waitingSecondsLeft <= 60]);

  const timerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  // Track whether we've already navigated away to prevent double-navigation
  const hasNavigatedAway = useRef(false);

  // Navigate home helper - used by both activeRide null and rideStatus triggers
  const navigateHome = useCallback(() => {
    if (!hasNavigatedAway.current) {
      hasNavigatedAway.current = true;
      console.log('🏠 Navigating rider back to home screen');
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" as any }],
      });
    }
  }, [navigation]);

  // When activeRide becomes null (completed OR cancelled), always reset to Home.
  // Using navigation.reset() prevents landing back on any previous screen (e.g. share-PIN).
  useEffect(() => {
    if (!activeRide && hasInitialized.current && !hasNavigatedAway.current) {
      // Small delay to allow any pending state updates to settle
      const timer = setTimeout(() => {
        navigateHome();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeRide, navigateHome]);

  // When the driver marks the trip as complete via socket, also navigate immediately.
  // This fires before activeRide is cleared by RideContext, so we get the fastest response.
  useEffect(() => {
    if ((rideStatus === "completed" || rideStatus === "payment_collected") && !hasNavigatedAway.current) {
      navigateHome();
    }
    // Show rebook screen when no drivers available
    if (rideStatus === "cancelled_no_drivers") {
      setNoDriversAvailable(true);
    }
  }, [rideStatus, navigateHome]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  const handleRebook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNoDriversAvailable(false);
    hasNavigatedAway.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" as any }],
    });
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (activeRide) cancelRide(activeRide.id);
  };

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("tel:+4407596266901");
  };

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("sms:+4407596266901");
  };

  // If no drivers available and ride has been cancelled, show standalone rebook UI
  if (noDriversAvailable && !activeRide) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <View style={[styles.noDriversIcon, { backgroundColor: UTOColors.warning + '20' }]}>
          <MaterialIcons name="no-transfer" size={36} color={UTOColors.warning} />
        </View>
        <ThemedText style={[styles.noDriversTitle, { color: theme.text, marginTop: Spacing.lg }]}>
          No Drivers Available
        </ThemedText>
        <ThemedText style={[styles.noDriversMessage, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
          Unfortunately we don't have any available drivers at the moment. Please try again shortly.
        </ThemedText>
        <Pressable
          onPress={handleRebook}
          style={[styles.rebookButton, { backgroundColor: UTOColors.rider.primary, marginTop: Spacing.xl }]}
        >
          <MaterialIcons name="refresh" size={20} color="#000" />
          <ThemedText style={styles.rebookButtonText}>Rebook Ride</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!activeRide) return null;

  const getStatusMessage = () => {
    const status = rideStatus || activeRide.status;
    switch (status) {
      case "pending":
        return "Finding your driver...";
      case "accepted":
        return "Driver is on the way";
      case "arrived":
        return "Driver has arrived";
      case "in_progress":
        return "On your way to destination";
      default:
        return "Processing ride...";
    }
  };

  const getDropoffTime = () => {
    if (!activeRide) return "";
    const now = new Date();
    const dropoffTime = new Date(now.getTime() + activeRide.durationMinutes * 60000);
    return dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ✅ ULTRA CLOSE ZOOM
  const getMapRegion = () => {
    const points: RoutePoint[] = [
      {
        latitude: activeRide.pickupLocation.latitude,
        longitude: activeRide.pickupLocation.longitude,
      },
      {
        latitude: activeRide.dropoffLocation.latitude,
        longitude: activeRide.dropoffLocation.longitude,
      },
    ];

    if (driverLocation) {
      points.push({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      });
    }

    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = Math.max((maxLat - minLat) * 1.05, 0.02);
    const lngDelta = Math.max((maxLng - minLng) * 1.05, 0.02);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const getDistanceString = () => {
    if (driverDistance) return driverDistance.replace("mi", "miles");

    // Fallback if APIs fail
    if (!driverLocation || !activeRide) return null;
    const R = 3958.8;
    const dLat = (activeRide.pickupLocation.latitude - driverLocation.latitude) * Math.PI / 180;
    const dLon = (activeRide.pickupLocation.longitude - driverLocation.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(driverLocation.latitude * Math.PI / 180) * Math.cos(activeRide.pickupLocation.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const miles = R * c;

    if (miles < 0.1) return "Nearby";
    return `${miles.toFixed(1)} miles`;
  };

  const currentDriverLocation = driverLocation || {
    latitude: activeRide.pickupLocation.latitude + 0.005,
    longitude: activeRide.pickupLocation.longitude + 0.003,
  };

  const currentStatus = rideStatus || activeRide.status;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <MapViewWrapper
        style={styles.map}
        initialRegion={getMapRegion()}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        {routeCoordinates.length > 0 && (
          <PolylineWrapper
            coordinates={routeCoordinates}
            strokeColor="#000000"
            strokeWidth={5}
          />
        )}

        {/* Driver-to-pickup route — shows driver moving toward rider */}
        {driverToPickupRoute.length > 0 && (currentStatus === "accepted" || currentStatus === "arrived") && (
          <PolylineWrapper
            coordinates={driverToPickupRoute}
            strokeColor={UTOColors.rider.primary}
            strokeWidth={4}
            lineDashPattern={[10, 6]}
          />
        )}

        {/* Dummy cars show when finding a driver */}
        {currentStatus === "pending" && (
          <DummyCars location={activeRide.pickupLocation} />
        )}

        {/* Pickup marker */}
        <MarkerWrapper
          coordinate={{
            latitude: activeRide.pickupLocation.latitude,
            longitude: activeRide.pickupLocation.longitude,
          }}
          title="Pickup"
        >
          <View style={[styles.markerContainer, { backgroundColor: UTOColors.success }]}>
            <MaterialIcons name="person-pin-circle" size={18} color="#FFFFFF" />
          </View>
        </MarkerWrapper>

        {/* Dropoff marker */}
        <MarkerWrapper
          coordinate={{
            latitude: activeRide.dropoffLocation.latitude,
            longitude: activeRide.dropoffLocation.longitude,
          }}
          title="Dropoff"
        >
          <View style={[styles.markerContainer, { backgroundColor: UTOColors.error }]}>
            <MaterialIcons name="place" size={18} color="#FFFFFF" />
          </View>
        </MarkerWrapper>

        {/* Driver marker */}
        <MarkerWrapper
          coordinate={currentDriverLocation}
          title="Driver"
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <View style={{ transform: [{ rotate: `${driverLocation?.heading || 0}deg` }] }}>
            <TopDownCarView />
          </View>
        </MarkerWrapper>
      </MapViewWrapper>

      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={UTOColors.rider.primary} />
          <ThemedText style={styles.loadingText}>Loading route...</ThemedText>
        </View>
      )}

      <Animated.View
        entering={FadeIn}
        style={[
          styles.bottomSheet,
          Shadows.large,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            maxHeight: Dimensions.get('window').height * 0.7,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: UTOColors.success }]} />
            <ThemedText style={styles.statusText}>{getStatusMessage()}</ThemedText>
          </View>
          {currentStatus === "accepted" && (
            <View style={styles.etaRow}>
              <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
                {estimatedArrival ? `${estimatedArrival} away` : "Calculating ETA..."}
              </ThemedText>
              {getDistanceString() && (
                <ThemedText style={[styles.distance, { color: theme.textSecondary }]}>
                  • {getDistanceString()}
                </ThemedText>
              )}
            </View>
          )}
          {currentStatus === "in_progress" && (
            <View style={styles.etaRow}>
              <ThemedText style={[styles.eta, { color: theme.textSecondary }]}>
                {`${activeRide.durationMinutes} min`} to destination
              </ThemedText>
            </View>
          )}
          {currentStatus === "in_progress" && (
            <ThemedText style={[styles.dropoffTime, { color: theme.textSecondary, marginLeft: 18 }]}>
              Estimated dropoff: {getDropoffTime()}
            </ThemedText>
          )}
        </View>

        {/* ─── Ride Stage Progress Stepper ──────────────────────────── */}
        {currentStatus !== "pending" && (
          <View style={styles.stageStepper}>
            {[
              { key: "accepted", label: "Driver assigned", icon: "person" as const },
              { key: "on_way", label: "On the way", icon: "directions-car" as const },
              { key: "arrived", label: "Arrived", icon: "place" as const },
              { key: "in_progress", label: "Ride started", icon: "navigation" as const },
            ].map((stage, index) => {
              const stageOrder = ["accepted", "on_way", "arrived", "in_progress"];
              const currentIdx = currentStatus === "accepted" ? 1 : stageOrder.indexOf(currentStatus);
              const isActive = index <= currentIdx;
              const isCurrent = (currentStatus === "accepted" && index <= 1) || (index === currentIdx);
              return (
                <React.Fragment key={stage.key}>
                  <View style={styles.stageItem}>
                    <View style={[
                      styles.stageCircle,
                      { backgroundColor: isActive ? UTOColors.rider.primary : theme.backgroundSecondary,
                        borderColor: isActive ? UTOColors.rider.primary : theme.border },
                    ]}>
                      <MaterialIcons name={stage.icon} size={12} color={isActive ? "#000" : theme.textSecondary} />
                    </View>
                    <ThemedText style={[
                      styles.stageLabel,
                      { color: isActive ? theme.text : theme.textSecondary,
                        fontWeight: isCurrent ? "700" : "400" },
                    ]}>{stage.label}</ThemedText>
                  </View>
                  {index < 3 && (
                    <View style={[
                      styles.stageLine,
                      { backgroundColor: index < currentIdx ? UTOColors.rider.primary : theme.border },
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* ─── Prominent Arrival + PIN Message ──────────────────────── */}
        {currentStatus === "arrived" && activeRide.otp && (
          <AnimatedView
            entering={FadeIn.duration(500)}
            style={[
              styles.arrivalCallout,
              { backgroundColor: UTOColors.rider.primary },
            ]}
          >
            <MaterialIcons name="check-circle" size={28} color="#000" />
            <ThemedText style={styles.arrivalTitle}>Your driver has arrived</ThemedText>
            <ThemedText style={styles.arrivalSubtitle}>Please provide your PIN to start the ride</ThemedText>
            <View style={styles.arrivalOtpBox}>
              {activeRide.otp.split("").map((digit, i) => (
                <View key={i} style={styles.arrivalOtpDigit}>
                  <ThemedText style={styles.arrivalOtpText}>{digit}</ThemedText>
                </View>
              ))}
            </View>
          </AnimatedView>
        )}

        {/* ─── Waiting Timer when driver has arrived ───────────────── */}
        {currentStatus === "arrived" && waitingSecondsLeft !== null && (
          <AnimatedView
            entering={FadeIn.duration(400)}
            style={[
              styles.waitingTimerContainer,
              {
                backgroundColor: waitingSecondsLeft <= 120
                  ? (waitingSecondsLeft <= 60 ? '#EF4444' + '20' : '#F59E0B' + '20')
                  : theme.backgroundDefault,
                borderColor: waitingSecondsLeft <= 120
                  ? (waitingSecondsLeft <= 60 ? '#EF4444' + '40' : '#F59E0B' + '40')
                  : theme.border,
              },
              waitingSecondsLeft <= 60 ? timerPulseStyle : {},
            ]}
          >
            <View style={styles.waitingTimerHeader}>
              <MaterialIcons
                name="timer"
                size={22}
                color={waitingSecondsLeft <= 120
                  ? (waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B')
                  : UTOColors.rider.primary}
              />
              <ThemedText style={[
                styles.waitingTimerTitle,
                waitingSecondsLeft <= 120 && {
                  color: waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B',
                },
              ]}>
                Driver is waiting
              </ThemedText>
            </View>
            <ThemedText style={[
              styles.waitingTimerDigits,
              {
                color: waitingSecondsLeft <= 120
                  ? (waitingSecondsLeft <= 60 ? '#EF4444' : '#F59E0B')
                  : theme.text,
              },
            ]}>
              {`${Math.floor(waitingSecondsLeft / 60).toString().padStart(2, '0')}:${(waitingSecondsLeft % 60).toString().padStart(2, '0')}`}
            </ThemedText>
            <ThemedText style={[styles.waitingTimerWarning, { color: theme.textSecondary }]}>
              {waitingSecondsLeft <= 60
                ? 'Hurry! Ride will be auto-cancelled with a fee'
                : waitingSecondsLeft <= 120
                  ? 'Less than 2 min left — please board now'
                  : 'Please board within the time or ride will be cancelled with a fee'}
            </ThemedText>
          </AnimatedView>
        )}

        {currentStatus === "pending" && (
          <View style={styles.searchingContainer}>
            <View style={[styles.searchingRing, { borderColor: UTOColors.rider.primary + "30" }]}>
              <View style={[styles.searchingRingInner, { borderColor: UTOColors.rider.primary + "60" }]}>
                <AnimatedView style={[styles.searchingPulse, { backgroundColor: UTOColors.rider.primary }, pulseStyle]} />
                <View style={[styles.searchingDot, { backgroundColor: UTOColors.rider.primary }]}>
                  <MaterialIcons name="local-taxi" size={20} color="#000" />
                </View>
              </View>
            </View>
            <ThemedText style={[styles.searchingText, { color: theme.textSecondary }]}>
              Matching you with a nearby driver
            </ThemedText>
          </View>
        )}

        {currentStatus !== "pending" && (
          <>
            {currentStatus === "accepted" && activeRide.otp && (
              <View style={[styles.otpContainer, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]}>
                <ThemedText style={[styles.otpLabel, { color: theme.text }]}>
                  Your ride PIN — share with driver on arrival
                </ThemedText>
                <View style={styles.otpBox}>
                  {activeRide.otp.split("").map((digit, i) => (
                    <View key={i} style={[styles.otpDigit, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText style={[styles.otpText, { color: theme.text }]}>{digit}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.driverCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.backgroundSecondary }]}>
                <MaterialIcons name="person" size={24} color={theme.textSecondary} />
              </View>
              <View style={styles.driverInfo}>
                <ThemedText style={styles.driverName}>{activeRide.driverName}</ThemedText>
                <View style={styles.vehicleRow}>
                  <ThemedText style={[styles.vehicleInfo, { color: theme.textSecondary }]}>
                    {activeRide.vehicleInfo}
                  </ThemedText>
                  <View style={[styles.ratingBadge, { backgroundColor: UTOColors.warning + "20" }]}>
                    <MaterialIcons name="star" size={12} color={UTOColors.warning} />
                    <ThemedText style={[styles.rating, { color: UTOColors.warning }]}>
                      {activeRide.driverRating?.toFixed(1)}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.licensePlate, { color: theme.text }]}>
                  {activeRide.licensePlate}
                </ThemedText>
              </View>
              <View style={styles.contactButtons}>
                <Pressable
                  onPress={handleCall}
                  style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <MaterialIcons name="phone" size={18} color={UTOColors.rider.primary} />
                </Pressable>
                <Pressable
                  onPress={handleMessage}
                  style={[styles.contactButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <MaterialIcons name="chat" size={18} color={UTOColors.rider.primary} />
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={styles.tripDetails}>
          <View style={styles.routeContainer}>
            <View style={styles.routeIndicator}>
              <View style={[styles.routeDot, { backgroundColor: UTOColors.success }]} />
              <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
              <View style={[styles.routeDot, { backgroundColor: UTOColors.error }]} />
            </View>
            <View style={styles.addresses}>
              <ThemedText style={styles.address} numberOfLines={1}>
                {activeRide.pickupLocation.address}
              </ThemedText>
              <ThemedText style={styles.address} numberOfLines={1}>
                {activeRide.dropoffLocation.address}
              </ThemedText>
            </View>
            <ThemedText style={styles.farePrice}>
              {formatPrice(activeRide.farePrice)}
            </ThemedText>
          </View>
          
          {currentStatus !== "completed" && (
            <Pressable style={styles.paymentSwitchButton} onPress={() => {
              if (!activeRide) return;
              const currentMethod = activeRide.paymentMethod || "cash";
              const newMethod = currentMethod === "card" ? "cash" : "card";
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (typeof updateRidePaymentMethod === 'function') {
                updateRidePaymentMethod(activeRide.id, newMethod);
              }
            }}>
              <View style={styles.paymentSwitchRow}>
                <MaterialIcons 
                  name={activeRide.paymentMethod === 'card' ? 'credit-card' : 'payments'} 
                  size={18} 
                  color={theme.textSecondary} 
                />
                <ThemedText style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  Paying with {activeRide.paymentMethod === 'card' ? 'Card' : 'Cash'}
                </ThemedText>
              </View>
              <ThemedText style={{ color: UTOColors.rider.primary, fontWeight: '600' }}>Change</ThemedText>
            </Pressable>
          )}
        </View>

        {(currentStatus === "pending" || currentStatus === "accepted") && !noDriversAvailable && (
          <AnimatedPressable
            onPress={handleCancel}
            onPressIn={() => (cancelScale.value = withSpring(0.98))}
            onPressOut={() => (cancelScale.value = withSpring(1))}
            style={[
              styles.cancelButton,
              { backgroundColor: UTOColors.error + "15" },
              cancelAnimatedStyle,
            ]}
          >
            <ThemedText style={[styles.cancelButtonText, { color: UTOColors.error }]}>
              Cancel Ride
            </ThemedText>
          </AnimatedPressable>
        )}

        {/* ─── No Drivers Available — Rebook ─────────────────────────── */}
        {noDriversAvailable && (
          <AnimatedView entering={FadeIn.duration(400)} style={styles.noDriversContainer}>
            <View style={[styles.noDriversIcon, { backgroundColor: UTOColors.warning + '20' }]}>
              <MaterialIcons name="no-transfer" size={36} color={UTOColors.warning} />
            </View>
            <ThemedText style={[styles.noDriversTitle, { color: theme.text }]}>
              No Drivers Available
            </ThemedText>
            <ThemedText style={[styles.noDriversMessage, { color: theme.textSecondary }]}>
              Unfortunately we don't have any available drivers at the moment. Please try again shortly.
            </ThemedText>
            <Pressable
              onPress={handleRebook}
              style={[styles.rebookButton, { backgroundColor: UTOColors.rider.primary }]}
            >
              <MaterialIcons name="refresh" size={20} color="#000" />
              <ThemedText style={styles.rebookButtonText}>Rebook Ride</ThemedText>
            </Pressable>
          </AnimatedView>
        )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: { color: "#FFFFFF", fontSize: 12 },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverMarkerContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  driverPulse: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  statusSection: { marginBottom: Spacing.lg },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusText: { fontSize: 18, fontWeight: "600" },
  eta: { fontSize: 14 },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    gap: 4,
  },
  distance: { fontSize: 14 },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  vehicleInfo: { fontSize: 13 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  rating: { fontSize: 11, fontWeight: "600" },
  licensePlate: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  contactButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tripDetails: { marginBottom: Spacing.lg },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeIndicator: {
    width: 20,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    marginVertical: 4,
  },
  paymentSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#33333333',
  },
  paymentSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addresses: {
    flex: 1,
    justifyContent: "space-between",
    height: 48,
  },
  address: { fontSize: 14 },
  farePrice: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: Spacing.md,
  },
  otpContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  otpLabel: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  otpBox: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  otpDigit: {
    width: 32,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  cancelButton: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dropoffTime: {
    fontSize: 14,
    marginTop: 2,
  },
  searchingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  searchingRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  searchingPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  searchingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchingText: {
    fontSize: 14,
    textAlign: "center",
  },
  // ─── Waiting Timer Styles ─────────────────────────────
  waitingTimerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  waitingTimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  waitingTimerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  waitingTimerDigits: {
    fontSize: 42,
    fontWeight: "800",
    fontVariant: ["tabular-nums"] as any,
    letterSpacing: 2,
    marginVertical: 4,
    lineHeight: 50,
    includeFontPadding: false,
  },
  waitingTimerWarning: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  // ─── Ride Stage Stepper Styles ──────────────────────────
  stageStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  stageItem: {
    alignItems: "center",
    gap: 4,
  },
  stageCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stageLabel: {
    fontSize: 9,
    textAlign: "center",
    maxWidth: 60,
  },
  stageLine: {
    height: 2,
    width: 20,
    marginHorizontal: 2,
    marginBottom: 16,
  },
  // ─── Arrival Callout Styles ─────────────────────────────
  arrivalCallout: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  arrivalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  arrivalSubtitle: {
    fontSize: 14,
    color: "#000000",
    opacity: 0.7,
  },
  arrivalOtpBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  arrivalOtpDigit: {
    width: 44,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  arrivalOtpText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },
  // ─── No Drivers / Rebook Styles ─────────────────────────
  noDriversContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noDriversIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  noDriversTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  noDriversMessage: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
  rebookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    width: "100%",
  },
  rebookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
});