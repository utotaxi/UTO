// // // // // import React, { useState, useEffect } from "react";
// // // // // import {
// // // // //   StyleSheet,
// // // // //   View,
// // // // //   Pressable,
// // // // //   ScrollView,
// // // // //   ActivityIndicator,
// // // // //   KeyboardAvoidingView,
// // // // //   Platform,
// // // // // } from "react-native";
// // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // import * as Location from "expo-location";
// // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // import Animated, {
// // // // //   FadeInUp,
// // // // //   FadeInDown,
// // // // //   useAnimatedStyle,
// // // // //   useSharedValue,
// // // // //   withSpring,
// // // // // } from "react-native-reanimated";
// // // // // import * as Haptics from "expo-haptics";

// // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // import { LocationInputAutocomplete } from "@/components/LocationInputAutocomplete";
// // // // // import { VehicleCard } from "@/components/VehicleCard";
// // // // // import { MapViewWrapper, MarkerWrapper } from "@/components/MapView.native";
// // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // import { useRide, RideType, Location as RideLocation } from "@/context/RideContext";
// // // // // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // // // // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // // // // const VEHICLE_OPTIONS = [
// // // // //   {
// // // // //     type: "economy" as RideType,
// // // // //     name: "Economy",
// // // // //     description: "Affordable everyday rides",
// // // // //     passengers: 4,
// // // // //   },
// // // // //   {
// // // // //     type: "premium" as RideType,
// // // // //     name: "Premium",
// // // // //     description: "Luxury vehicles for comfort",
// // // // //     passengers: 4,
// // // // //   },
// // // // //   {
// // // // //     type: "xl" as RideType,
// // // // //     name: "XL",
// // // // //     description: "Larger vehicles for groups",
// // // // //     passengers: 6,
// // // // //   },
// // // // // ];

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
// // // // //     featureType: "road",
// // // // //     elementType: "geometry.stroke",
// // // // //     stylers: [{ color: "#212a37" }],
// // // // //   },
// // // // //   {
// // // // //     featureType: "water",
// // // // //     elementType: "geometry",
// // // // //     stylers: [{ color: "#17263c" }],
// // // // //   },
// // // // // ];

// // // // // export default function RideRequestScreen({ navigation, route }: any) {
// // // // //   const insets = useSafeAreaInsets();
// // // // //   const { isDark } = useTheme();
// // // // //   const { activeRide, requestRide } = useRide();

// // // // //   const [location, setLocation] = useState<Location.LocationObject | null>(null);
// // // // //   const [currentAddress, setCurrentAddress] = useState<string>("");
// // // // //   const [isLoadingLocation, setIsLoadingLocation] = useState(true);
// // // // //   const [pickup, setPickup] = useState("");
// // // // //   const [dropoff, setDropoff] = useState("");
// // // // //   const [pickupLocation, setPickupLocation] = useState<any>(null);
// // // // //   const [dropoffLocation, setDropoffLocation] = useState<any>(null);
// // // // //   const [selectedVehicle, setSelectedVehicle] = useState<RideType>("economy");
// // // // //   const [showVehicleSelector, setShowVehicleSelector] = useState(false);
// // // // //   const [isRequesting, setIsRequesting] = useState(false);

// // // // //   const buttonScale = useSharedValue(1);

// // // // //   const buttonAnimatedStyle = useAnimatedStyle(() => ({
// // // // //     transform: [{ scale: buttonScale.value }],
// // // // //   }));

// // // // //   useEffect(() => {
// // // // //     (async () => {
// // // // //       try {
// // // // //         const { status } = await Location.requestForegroundPermissionsAsync();
// // // // //         if (status !== "granted") {
// // // // //           setIsLoadingLocation(false);
// // // // //           return;
// // // // //         }

// // // // //         const currentLocation = await Location.getCurrentPositionAsync({
// // // // //           accuracy: Location.Accuracy.Balanced,
// // // // //         });
// // // // //         setLocation(currentLocation);
// // // // //         setPickupLocation({
// // // // //           latitude: currentLocation.coords.latitude,
// // // // //           longitude: currentLocation.coords.longitude,
// // // // //         });

// // // // //         const [address] = await Location.reverseGeocodeAsync({
// // // // //           latitude: currentLocation.coords.latitude,
// // // // //           longitude: currentLocation.coords.longitude,
// // // // //         });

// // // // //         if (address) {
// // // // //           const parts = [];
// // // // //           if (address.street) parts.push(address.street);
// // // // //           if (address.city) parts.push(address.city);
// // // // //           const addressString = parts.join(", ") || "Current Location";
// // // // //           setCurrentAddress(addressString);
// // // // //           setPickup(addressString);
// // // // //         } else {
// // // // //           setPickup("Current Location");
// // // // //           setCurrentAddress("Current Location");
// // // // //         }
// // // // //       } catch (error) {
// // // // //         console.log("Location error:", error);
// // // // //         setPickup("Current Location");
// // // // //       }
// // // // //       setIsLoadingLocation(false);
// // // // //     })();
// // // // //   }, []);

// // // // //   useEffect(() => {
// // // // //     if (activeRide) {
// // // // //       navigation.navigate("RideTracking");
// // // // //     }
// // // // //   }, [activeRide]);

// // // // //   useEffect(() => {
// // // // //     if (dropoff.length >= 3 && dropoffLocation) {
// // // // //       setShowVehicleSelector(true);
// // // // //     }
// // // // //   }, [dropoff, dropoffLocation]);

// // // // //   const calculatePrice = (type: RideType): number => {
// // // // //     const basePrices = { economy: 8.5, premium: 15.0, xl: 12.0 };
// // // // //     const multiplier = 1 + Math.random() * 0.3;
// // // // //     return Math.round(basePrices[type] * multiplier * 100) / 100;
// // // // //   };

// // // // //   const handlePickupSelect = (loc: any) => {
// // // // //     setPickupLocation({
// // // // //       latitude: location?.coords.latitude || 51.5074,
// // // // //       longitude: location?.coords.longitude || -0.1278,
// // // // //     });
// // // // //   };

// // // // //   const handleDropoffSelect = (loc: any) => {
// // // // //     setDropoffLocation({
// // // // //       latitude: (location?.coords.latitude || 51.5074) + (Math.random() * 0.05 - 0.025),
// // // // //       longitude: (location?.coords.longitude || -0.1278) + (Math.random() * 0.05 - 0.025),
// // // // //     });
// // // // //     setShowVehicleSelector(true);
// // // // //   };

// // // // //   const handleRequestRide = async () => {
// // // // //     if (!pickup || !dropoff) return;

// // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// // // // //     setIsRequesting(true);

// // // // //     const pickupLoc: RideLocation = {
// // // // //       address: pickup,
// // // // //       latitude: pickupLocation?.latitude || 51.5074,
// // // // //       longitude: pickupLocation?.longitude || -0.1278,
// // // // //     };

// // // // //     const dropoffLoc: RideLocation = {
// // // // //       address: dropoff,
// // // // //       latitude: dropoffLocation?.latitude || pickupLoc.latitude + 0.02,
// // // // //       longitude: dropoffLocation?.longitude || pickupLoc.longitude + 0.02,
// // // // //     };

// // // // //     try {
// // // // //       await requestRide(pickupLoc, dropoffLoc, selectedVehicle);
// // // // //     } catch (error) {
// // // // //       console.error("Failed to request ride:", error);
// // // // //     } finally {
// // // // //       setIsRequesting(false);
// // // // //     }
// // // // //   };

// // // // //   const mapRegion = location
// // // // //     ? {
// // // // //         latitude: location.coords.latitude,
// // // // //         longitude: location.coords.longitude,
// // // // //         latitudeDelta: 0.01,
// // // // //         longitudeDelta: 0.01,
// // // // //       }
// // // // //     : {
// // // // //         latitude: 51.5074,
// // // // //         longitude: -0.1278,
// // // // //         latitudeDelta: 0.05,
// // // // //         longitudeDelta: 0.05,
// // // // //       };

// // // // //   return (
// // // // //     <View style={styles.container}>
// // // // //       <View style={styles.mapContainer}>
// // // // //         {isLoadingLocation ? (
// // // // //           <View style={styles.loadingContainer}>
// // // // //             <ActivityIndicator size="large" color={UTOColors.primary} />
// // // // //           </View>
// // // // //         ) : (
// // // // //           <MapViewWrapper
// // // // //             style={styles.map}
// // // // //             initialRegion={mapRegion}
// // // // //             showsUserLocation
// // // // //             showsMyLocationButton={false}
// // // // //             customMapStyle={darkMapStyle}
// // // // //           >
// // // // //             {location ? (
// // // // //               <MarkerWrapper
// // // // //                 coordinate={{
// // // // //                   latitude: location.coords.latitude,
// // // // //                   longitude: location.coords.longitude,
// // // // //                 }}
// // // // //                 title="Your Location"
// // // // //               />
// // // // //             ) : null}
// // // // //           </MapViewWrapper>
// // // // //         )}
// // // // //       </View>

// // // // //       <KeyboardAvoidingView
// // // // //         behavior={Platform.OS === "ios" ? "padding" : "height"}
// // // // //         style={styles.overlay}
// // // // //         keyboardVerticalOffset={0}
// // // // //       >
// // // // //         <View
// // // // //           style={[
// // // // //             styles.searchContainer,
// // // // //             { paddingTop: insets.top + Spacing.md },
// // // // //           ]}
// // // // //         >
// // // // //           <View style={styles.headerRow}>
// // // // //             <Pressable
// // // // //               onPress={() => navigation.goBack()}
// // // // //               style={styles.backButton}
// // // // //             >
// // // // //               <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
// // // // //             </Pressable>
// // // // //             <ThemedText style={styles.headerTitle}>Request a ride</ThemedText>
// // // // //             <View style={styles.backButton} />
// // // // //           </View>

// // // // //           <View style={styles.routeContainer}>
// // // // //             <View style={styles.routeIndicator}>
// // // // //               <View style={[styles.routeDotGreen, { backgroundColor: UTOColors.success }]} />
// // // // //               <View style={styles.routeLine} />
// // // // //               <View style={[styles.routeDotYellow, { backgroundColor: UTOColors.primary }]} />
// // // // //             </View>
// // // // //             <View style={styles.inputsContainer}>
// // // // //               <LocationInputAutocomplete
// // // // //                 label="Pickup"
// // // // //                 value={pickup}
// // // // //                 placeholder="Enter pickup location"
// // // // //                 onChangeText={setPickup}
// // // // //                 onSelectLocation={handlePickupSelect}
// // // // //                 type="pickup"
// // // // //               />
// // // // //               <LocationInputAutocomplete
// // // // //                 label="Dropoff"
// // // // //                 value={dropoff}
// // // // //                 placeholder="Where to?"
// // // // //                 onChangeText={setDropoff}
// // // // //                 onSelectLocation={handleDropoffSelect}
// // // // //                 type="dropoff"
// // // // //               />
// // // // //             </View>
// // // // //           </View>
// // // // //         </View>

// // // // //         {showVehicleSelector && dropoff ? (
// // // // //           <Animated.View
// // // // //             entering={FadeInUp.duration(300)}
// // // // //             style={[
// // // // //               styles.bottomSheet,
// // // // //               Shadows.large,
// // // // //               { paddingBottom: insets.bottom + Spacing.lg },
// // // // //             ]}
// // // // //           >
// // // // //             <View style={styles.sheetHandle}>
// // // // //               <View style={styles.handle} />
// // // // //             </View>

// // // // //             <ThemedText style={styles.sheetTitle}>Choose a ride</ThemedText>

// // // // //             <ScrollView 
// // // // //               style={styles.vehicleList}
// // // // //               showsVerticalScrollIndicator={false}
// // // // //             >
// // // // //               {VEHICLE_OPTIONS.map((vehicle) => (
// // // // //                 <VehicleCard
// // // // //                   key={vehicle.type}
// // // // //                   type={vehicle.type}
// // // // //                   name={vehicle.name}
// // // // //                   description={vehicle.description}
// // // // //                   passengers={vehicle.passengers}
// // // // //                   price={calculatePrice(vehicle.type)}
// // // // //                   eta={3 + Math.floor(Math.random() * 5)}
// // // // //                   isSelected={selectedVehicle === vehicle.type}
// // // // //                   onPress={() => setSelectedVehicle(vehicle.type)}
// // // // //                 />
// // // // //               ))}
// // // // //             </ScrollView>

// // // // //             <AnimatedPressable
// // // // //               onPress={handleRequestRide}
// // // // //               onPressIn={() => (buttonScale.value = withSpring(0.98))}
// // // // //               onPressOut={() => (buttonScale.value = withSpring(1))}
// // // // //               disabled={isRequesting}
// // // // //               style={[
// // // // //                 styles.requestButton,
// // // // //                 { backgroundColor: UTOColors.primary },
// // // // //                 buttonAnimatedStyle,
// // // // //               ]}
// // // // //             >
// // // // //               {isRequesting ? (
// // // // //                 <ActivityIndicator color="#000000" />
// // // // //               ) : (
// // // // //                 <>
// // // // //                   <ThemedText style={styles.requestButtonText}>
// // // // //                     Request {VEHICLE_OPTIONS.find((v) => v.type === selectedVehicle)?.name}
// // // // //                   </ThemedText>
// // // // //                   <ThemedText style={styles.requestButtonPrice}>
// // // // //                     {formatPrice(calculatePrice(selectedVehicle))}
// // // // //                   </ThemedText>
// // // // //                 </>
// // // // //               )}
// // // // //             </AnimatedPressable>
// // // // //           </Animated.View>
// // // // //         ) : null}
// // // // //       </KeyboardAvoidingView>
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // const styles = StyleSheet.create({
// // // // //   container: {
// // // // //     flex: 1,
// // // // //     backgroundColor: "#000000",
// // // // //   },
// // // // //   mapContainer: {
// // // // //     ...StyleSheet.absoluteFillObject,
// // // // //   },
// // // // //   map: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   loadingContainer: {
// // // // //     flex: 1,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //     backgroundColor: "#1A1A1A",
// // // // //   },
// // // // //   overlay: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   searchContainer: {
// // // // //     paddingHorizontal: Spacing.lg,
// // // // //     paddingBottom: Spacing.lg,
// // // // //     backgroundColor: "#000000",
// // // // //     borderBottomLeftRadius: BorderRadius.xl,
// // // // //     borderBottomRightRadius: BorderRadius.xl,
// // // // //   },
// // // // //   headerRow: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     justifyContent: "space-between",
// // // // //     marginBottom: Spacing.lg,
// // // // //   },
// // // // //   backButton: {
// // // // //     width: 40,
// // // // //     height: 40,
// // // // //     borderRadius: 20,
// // // // //     backgroundColor: "#1A1A1A",
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   headerTitle: {
// // // // //     color: "#FFFFFF",
// // // // //     fontSize: 18,
// // // // //     fontWeight: "600",
// // // // //   },
// // // // //   routeContainer: {
// // // // //     flexDirection: "row",
// // // // //   },
// // // // //   routeIndicator: {
// // // // //     width: 24,
// // // // //     alignItems: "center",
// // // // //     paddingTop: 18,
// // // // //     marginRight: Spacing.sm,
// // // // //   },
// // // // //   routeDotGreen: {
// // // // //     width: 12,
// // // // //     height: 12,
// // // // //     borderRadius: 6,
// // // // //   },
// // // // //   routeLine: {
// // // // //     width: 2,
// // // // //     height: 40,
// // // // //     marginVertical: 4,
// // // // //     backgroundColor: "#333333",
// // // // //   },
// // // // //   routeDotYellow: {
// // // // //     width: 12,
// // // // //     height: 12,
// // // // //     borderRadius: 6,
// // // // //   },
// // // // //   inputsContainer: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   bottomSheet: {
// // // // //     position: "absolute",
// // // // //     bottom: 0,
// // // // //     left: 0,
// // // // //     right: 0,
// // // // //     paddingHorizontal: Spacing.lg,
// // // // //     paddingTop: Spacing.md,
// // // // //     borderTopLeftRadius: BorderRadius.xl,
// // // // //     borderTopRightRadius: BorderRadius.xl,
// // // // //     backgroundColor: "#000000",
// // // // //     maxHeight: "50%",
// // // // //   },
// // // // //   sheetHandle: {
// // // // //     alignItems: "center",
// // // // //     paddingBottom: Spacing.md,
// // // // //   },
// // // // //   handle: {
// // // // //     width: 36,
// // // // //     height: 4,
// // // // //     borderRadius: 2,
// // // // //     backgroundColor: "#333333",
// // // // //   },
// // // // //   sheetTitle: {
// // // // //     fontSize: 18,
// // // // //     fontWeight: "600",
// // // // //     marginBottom: Spacing.lg,
// // // // //     color: "#FFFFFF",
// // // // //   },
// // // // //   vehicleList: {
// // // // //     maxHeight: 200,
// // // // //   },
// // // // //   requestButton: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     justifyContent: "space-between",
// // // // //     height: 56,
// // // // //     borderRadius: BorderRadius.full,
// // // // //     paddingHorizontal: Spacing.xl,
// // // // //     marginTop: Spacing.md,
// // // // //   },
// // // // //   requestButtonText: {
// // // // //     color: "#000000",
// // // // //     fontSize: 17,
// // // // //     fontWeight: "600",
// // // // //   },
// // // // //   requestButtonPrice: {
// // // // //     color: "#000000",
// // // // //     fontSize: 17,
// // // // //     fontWeight: "700",
// // // // //   },
// // // // // });
// // // // // //client/screens/rider/RideRequestScreen.tsx

// // // // // import React, { useState } from "react";
// // // // // import {
// // // // //   StyleSheet,
// // // // //   View,
// // // // //   Pressable,
// // // // //   ScrollView,
// // // // //   TextInput,
// // // // //   KeyboardAvoidingView,
// // // // //   Platform,
// // // // // } from "react-native";
// // // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // import Animated, { FadeInDown } from "react-native-reanimated";
// // // // // import * as Haptics from "expo-haptics";

// // // // // import { ThemedText } from "@/components/ThemedText";
// // // // // import { useTheme } from "@/hooks/useTheme";
// // // // // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // // // // export default function RideRequestScreen({ navigation, route }: any) {
// // // // //   const insets = useSafeAreaInsets();
// // // // //   const { theme } = useTheme();
// // // // //   const type = route?.params?.type || "ride";

// // // // //   const [pickup, setPickup] = useState("");
// // // // //   const [dropoff, setDropoff] = useState("");

// // // // //   const handleConfirm = () => {
// // // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
// // // // //     // Navigate to ride tracking or confirmation
// // // // //     navigation.navigate("RideTracking");
// // // // //   };

// // // // //   return (
// // // // //     <KeyboardAvoidingView
// // // // //       style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
// // // // //       behavior={Platform.OS === "ios" ? "padding" : "height"}
// // // // //     >
// // // // //       <ScrollView
// // // // //         style={styles.scrollView}
// // // // //         contentContainerStyle={[
// // // // //           styles.scrollContent,
// // // // //           { paddingBottom: insets.bottom + Spacing.xl },
// // // // //         ]}
// // // // //         showsVerticalScrollIndicator={false}
// // // // //       >
// // // // //         <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
// // // // //           <ThemedText style={styles.sectionTitle}>
// // // // //             {type === "package" ? "Send Package" : "Request a Ride"}
// // // // //           </ThemedText>

// // // // //           <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
// // // // //             <MaterialIcons name="my-location" size={20} color={UTOColors.success} />
// // // // //             <TextInput
// // // // //               style={[styles.input, { color: theme.text }]}
// // // // //               placeholder="Pickup location"
// // // // //               placeholderTextColor={theme.textSecondary}
// // // // //               value={pickup}
// // // // //               onChangeText={setPickup}
// // // // //             />
// // // // //           </View>

// // // // //           <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
// // // // //             <MaterialIcons name="place" size={20} color={UTOColors.error} />
// // // // //             <TextInput
// // // // //               style={[styles.input, { color: theme.text }]}
// // // // //               placeholder="Drop-off location"
// // // // //               placeholderTextColor={theme.textSecondary}
// // // // //               value={dropoff}
// // // // //               onChangeText={setDropoff}
// // // // //             />
// // // // //           </View>
// // // // //         </Animated.View>

// // // // //         <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
// // // // //           <ThemedText style={styles.sectionTitle}>Select Ride Type</ThemedText>

// // // // //           <Pressable
// // // // //             style={[styles.rideTypeCard, { backgroundColor: theme.backgroundDefault }]}
// // // // //             onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
// // // // //           >
// // // // //             <View style={styles.rideTypeIcon}>
// // // // //               <MaterialIcons name="directions-car" size={24} color={UTOColors.primary} />
// // // // //             </View>
// // // // //             <View style={styles.rideTypeInfo}>
// // // // //               <ThemedText style={styles.rideTypeName}>UTO Go</ThemedText>
// // // // //               <ThemedText style={[styles.rideTypeDescription, { color: theme.textSecondary }]}>
// // // // //                 Affordable rides
// // // // //               </ThemedText>
// // // // //             </View>
// // // // //             <View style={styles.rideTypePrice}>
// // // // //               <ThemedText style={styles.ridePriceAmount}>$15.50</ThemedText>
// // // // //               <ThemedText style={[styles.ridePriceTime, { color: theme.textSecondary }]}>
// // // // //                 5 min
// // // // //               </ThemedText>
// // // // //             </View>
// // // // //           </Pressable>

// // // // //           <Pressable
// // // // //             style={[styles.rideTypeCard, { backgroundColor: theme.backgroundDefault }]}
// // // // //             onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
// // // // //           >
// // // // //             <View style={styles.rideTypeIcon}>
// // // // //               <MaterialIcons name="stars" size={24} color={UTOColors.primary} />
// // // // //             </View>
// // // // //             <View style={styles.rideTypeInfo}>
// // // // //               <ThemedText style={styles.rideTypeName}>UTO Premium</ThemedText>
// // // // //               <ThemedText style={[styles.rideTypeDescription, { color: theme.textSecondary }]}>
// // // // //                 Premium vehicles
// // // // //               </ThemedText>
// // // // //             </View>
// // // // //             <View style={styles.rideTypePrice}>
// // // // //               <ThemedText style={styles.ridePriceAmount}>$22.00</ThemedText>
// // // // //               <ThemedText style={[styles.ridePriceTime, { color: theme.textSecondary }]}>
// // // // //                 3 min
// // // // //               </ThemedText>
// // // // //             </View>
// // // // //           </Pressable>
// // // // //         </Animated.View>

// // // // //         <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
// // // // //           <Pressable
// // // // //             style={[
// // // // //               styles.confirmButton,
// // // // //               { backgroundColor: UTOColors.primary },
// // // // //               (!pickup || !dropoff) && styles.confirmButtonDisabled,
// // // // //             ]}
// // // // //             onPress={handleConfirm}
// // // // //             disabled={!pickup || !dropoff}
// // // // //           >
// // // // //             <ThemedText style={styles.confirmButtonText}>Confirm Ride</ThemedText>
// // // // //           </Pressable>
// // // // //         </Animated.View>
// // // // //       </ScrollView>
// // // // //     </KeyboardAvoidingView>
// // // // //   );
// // // // // }

// // // // // const styles = StyleSheet.create({
// // // // //   container: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   scrollView: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   scrollContent: {
// // // // //     paddingHorizontal: Spacing.lg,
// // // // //     paddingTop: Spacing.lg,
// // // // //   },
// // // // //   section: {
// // // // //     marginBottom: Spacing.xl,
// // // // //   },
// // // // //   sectionTitle: {
// // // // //     fontSize: 18,
// // // // //     fontWeight: "600",
// // // // //     marginBottom: Spacing.md,
// // // // //   },
// // // // //   inputContainer: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     paddingHorizontal: Spacing.md,
// // // // //     paddingVertical: Spacing.sm,
// // // // //     marginBottom: Spacing.md,
// // // // //   },
// // // // //   input: {
// // // // //     flex: 1,
// // // // //     fontSize: 16,
// // // // //     marginLeft: Spacing.sm,
// // // // //     paddingVertical: Spacing.sm,
// // // // //   },
// // // // //   rideTypeCard: {
// // // // //     flexDirection: "row",
// // // // //     alignItems: "center",
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     padding: Spacing.md,
// // // // //     marginBottom: Spacing.md,
// // // // //   },
// // // // //   rideTypeIcon: {
// // // // //     width: 48,
// // // // //     height: 48,
// // // // //     borderRadius: 24,
// // // // //     backgroundColor: "#333333",
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //     marginRight: Spacing.md,
// // // // //   },
// // // // //   rideTypeInfo: {
// // // // //     flex: 1,
// // // // //   },
// // // // //   rideTypeName: {
// // // // //     fontSize: 16,
// // // // //     fontWeight: "600",
// // // // //     marginBottom: 2,
// // // // //   },
// // // // //   rideTypeDescription: {
// // // // //     fontSize: 13,
// // // // //   },
// // // // //   rideTypePrice: {
// // // // //     alignItems: "flex-end",
// // // // //   },
// // // // //   ridePriceAmount: {
// // // // //     fontSize: 18,
// // // // //     fontWeight: "700",
// // // // //   },
// // // // //   ridePriceTime: {
// // // // //     fontSize: 12,
// // // // //   },
// // // // //   confirmButton: {
// // // // //     borderRadius: BorderRadius.lg,
// // // // //     paddingVertical: Spacing.md,
// // // // //     alignItems: "center",
// // // // //     justifyContent: "center",
// // // // //   },
// // // // //   confirmButtonDisabled: {
// // // // //     opacity: 0.5,
// // // // //   },
// // // // //   confirmButtonText: {
// // // // //     color: "#000000",
// // // // //     fontSize: 16,
// // // // //     fontWeight: "700",
// // // // //   },
// // // // // });

// // // // //client/screens/rider/RideRequestScreen.tsx

// // // // import React, { useState, useRef } from "react";
// // // // import {
// // // //   StyleSheet,
// // // //   View,
// // // //   Pressable,
// // // //   TextInput,
// // // //   Dimensions,
// // // // } from "react-native";
// // // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // // import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
// // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
// // // // import * as Haptics from "expo-haptics";
// // // // import * as Location from "expo-location";
// // // // import { ThemedText } from "@/components/ThemedText";
// // // // import { useTheme } from "@/hooks/useTheme";
// // // // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // // // const { width, height } = Dimensions.get("window");

// // // // const INITIAL_REGION = {
// // // //   latitude: 28.6139, // Delhi coordinates
// // // //   longitude: 77.2090,
// // // //   latitudeDelta: 0.0922,
// // // //   longitudeDelta: 0.0421,
// // // // };

// // // // export default function RideRequestScreen({ navigation, route }: any) {
// // // //   const insets = useSafeAreaInsets();
// // // //   const { theme } = useTheme();
// // // //   const mapRef = useRef<MapView>(null);
// // // //   const type = route?.params?.type || "ride";

// // // //   const [pickup, setPickup] = useState("");
// // // //   const [dropoff, setDropoff] = useState("");
// // // //   const [pickupCoords, setPickupCoords] = useState(null);
// // // //   const [dropoffCoords, setDropoffCoords] = useState(null);
// // // //   const [selectedRideType, setSelectedRideType] = useState("go");

// // // //   const RIDE_TYPES = [
// // // //     { id: "go", name: "UTO Go", price: "$15.50", time: "5 min", icon: "directions-car" },
// // // //     { id: "premium", name: "UTO Premium", price: "$22.00", time: "3 min", icon: "stars" },
// // // //   ];

// // // //   const handleConfirm = () => {
// // // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
// // // //     navigation.navigate("RideTracking");
// // // //   };

// // // //   const getCurrentLocation = async () => {
// // // //     const { status } = await Location.requestForegroundPermissionsAsync();
// // // //     if (status !== "granted") return;

// // // //     const location = await Location.getCurrentPositionAsync({});
// // // //     const coords = {
// // // //       latitude: location.coords.latitude,
// // // //       longitude: location.coords.longitude,
// // // //     };

// // // //     setPickupCoords(coords);
// // // //     mapRef.current?.animateToRegion({
// // // //       ...coords,
// // // //       latitudeDelta: 0.01,
// // // //       longitudeDelta: 0.01,
// // // //     });
// // // //   };

// // // //   return (
// // // //     <View style={styles.container}>
// // // //       {/* Map */}
// // // //       <MapView
// // // //         ref={mapRef}
// // // //         provider={PROVIDER_GOOGLE}
// // // //         style={styles.map}
// // // //         initialRegion={INITIAL_REGION}
// // // //         showsUserLocation={true}
// // // //         showsMyLocationButton={true}
// // // //         followsUserLocation={true}
// // // //         rotateEnabled={true}
// // // //         zoomEnabled={true}
// // // //         toolbarEnabled={true}
// // // //       >
// // // //         {pickupCoords && (
// // // //           <Marker coordinate={pickupCoords} pinColor={UTOColors.success} />
// // // //         )}
// // // //         {dropoffCoords && (
// // // //           <Marker coordinate={dropoffCoords} pinColor={UTOColors.error} />
// // // //         )}
// // // //       </MapView>

// // // //       {/* Search Inputs Overlay */}
// // // //       <Animated.View 
// // // //         entering={FadeInDown.delay(100).duration(400)}
// // // //         style={[
// // // //           styles.searchContainer, 
// // // //           { 
// // // //             top: insets.top + 60,  // Below header
// // // //             backgroundColor: theme.backgroundRoot 
// // // //           }
// // // //         ]}
// // // //       >
// // // //         {/* Pickup Input */}
// // // //         <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
// // // //           <MaterialIcons name="my-location" size={20} color={UTOColors.success} />
// // // //           <TextInput
// // // //             style={[styles.input, { color: theme.text }]}
// // // //             placeholder="Pickup location"
// // // //             placeholderTextColor={theme.textSecondary}
// // // //             value={pickup}
// // // //             onChangeText={setPickup}
// // // //           />
// // // //           <Pressable onPress={getCurrentLocation}>
// // // //             <MaterialIcons name="gps-fixed" size={20} color={theme.textSecondary} />
// // // //           </Pressable>
// // // //         </View>

// // // //         {/* Dropoff Input */}
// // // //         <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
// // // //           <MaterialIcons name="place" size={20} color={UTOColors.error} />
// // // //           <TextInput
// // // //             style={[styles.input, { color: theme.text }]}
// // // //             placeholder="Drop-off location"
// // // //             placeholderTextColor={theme.textSecondary}
// // // //             value={dropoff}
// // // //             onChangeText={setDropoff}
// // // //           />
// // // //         </View>
// // // //       </Animated.View>

// // // //       {/* Ride Type Selection - Bottom Sheet */}
// // // //       <Animated.View 
// // // //         entering={FadeInUp.delay(200).duration(400)}
// // // //         style={[
// // // //           styles.bottomSheet, 
// // // //           { 
// // // //             paddingBottom: insets.bottom + Spacing.md,
// // // //             backgroundColor: theme.backgroundRoot 
// // // //           }
// // // //         ]}
// // // //       >
// // // //         <View style={styles.handle} />

// // // //         <ThemedText style={styles.bottomSheetTitle}>Select Ride Type</ThemedText>

// // // //         {RIDE_TYPES.map((rideType, index) => (
// // // //           <Pressable
// // // //             key={rideType.id}
// // // //             style={[
// // // //               styles.rideTypeCard,
// // // //               { backgroundColor: theme.backgroundDefault },
// // // //               selectedRideType === rideType.id && styles.rideTypeCardSelected,
// // // //             ]}
// // // //             onPress={() => {
// // // //               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // // //               setSelectedRideType(rideType.id);
// // // //             }}
// // // //           >
// // // //             <View style={[
// // // //               styles.rideTypeIcon,
// // // //               selectedRideType === rideType.id && { backgroundColor: UTOColors.primary }
// // // //             ]}>
// // // //               <MaterialIcons 
// // // //                 name={rideType.icon as any} 
// // // //                 size={24} 
// // // //                 color={selectedRideType === rideType.id ? "#000000" : UTOColors.primary} 
// // // //               />
// // // //             </View>
// // // //             <View style={styles.rideTypeInfo}>
// // // //               <ThemedText style={styles.rideTypeName}>{rideType.name}</ThemedText>
// // // //               <ThemedText style={[styles.rideTypeTime, { color: theme.textSecondary }]}>
// // // //                 {rideType.time}
// // // //               </ThemedText>
// // // //             </View>
// // // //             <ThemedText style={styles.rideTypePrice}>{rideType.price}</ThemedText>
// // // //           </Pressable>
// // // //         ))}

// // // //         <Pressable
// // // //           style={[
// // // //             styles.confirmButton,
// // // //             { backgroundColor: UTOColors.primary },
// // // //             (!pickup || !dropoff) && styles.confirmButtonDisabled,
// // // //           ]}
// // // //           onPress={handleConfirm}
// // // //           disabled={!pickup || !dropoff}
// // // //         >
// // // //           <ThemedText style={styles.confirmButtonText}>Confirm Ride</ThemedText>
// // // //         </Pressable>
// // // //       </Animated.View>
// // // //     </View>
// // // //   );
// // // // }

// // // // const styles = StyleSheet.create({
// // // //   container: {
// // // //     flex: 1,
// // // //   },
// // // //   map: {
// // // //     width: width,
// // // //     height: height,
// // // //   },
// // // //   searchContainer: {
// // // //     position: "absolute",
// // // //     left: Spacing.md,
// // // //     right: Spacing.md,
// // // //     borderRadius: BorderRadius.lg,
// // // //     padding: Spacing.md,
// // // //     shadowColor: "#000",
// // // //     shadowOffset: { width: 0, height: 2 },
// // // //     shadowOpacity: 0.25,
// // // //     shadowRadius: 8,
// // // //     elevation: 5,
// // // //   },
// // // //   inputContainer: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     borderRadius: BorderRadius.md,
// // // //     paddingHorizontal: Spacing.md,
// // // //     paddingVertical: Spacing.sm + 4,
// // // //     marginBottom: Spacing.sm,
// // // //   },
// // // //   input: {
// // // //     flex: 1,
// // // //     fontSize: 15,
// // // //     marginLeft: Spacing.sm,
// // // //     paddingVertical: Spacing.xs,
// // // //   },
// // // //   bottomSheet: {
// // // //     position: "absolute",
// // // //     bottom: 0,
// // // //     left: 0,
// // // //     right: 0,
// // // //     borderTopLeftRadius: BorderRadius["2xl"],
// // // //     borderTopRightRadius: BorderRadius["2xl"],
// // // //     padding: Spacing.lg,
// // // //     shadowColor: "#000",
// // // //     shadowOffset: { width: 0, height: -4 },
// // // //     shadowOpacity: 0.25,
// // // //     shadowRadius: 12,
// // // //     elevation: 10,
// // // //   },
// // // //   handle: {
// // // //     width: 40,
// // // //     height: 4,
// // // //     backgroundColor: "#4B5563",
// // // //     borderRadius: 2,
// // // //     alignSelf: "center",
// // // //     marginBottom: Spacing.md,
// // // //   },
// // // //   bottomSheetTitle: {
// // // //     fontSize: 18,
// // // //     fontWeight: "600",
// // // //     marginBottom: Spacing.md,
// // // //   },
// // // //   rideTypeCard: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     borderRadius: BorderRadius.lg,
// // // //     padding: Spacing.md,
// // // //     marginBottom: Spacing.sm,
// // // //     borderWidth: 2,
// // // //     borderColor: "transparent",
// // // //   },
// // // //   rideTypeCardSelected: {
// // // //     borderColor: UTOColors.primary,
// // // //   },
// // // //   rideTypeIcon: {
// // // //     width: 44,
// // // //     height: 44,
// // // //     borderRadius: 22,
// // // //     backgroundColor: "#333333",
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     marginRight: Spacing.md,
// // // //   },
// // // //   rideTypeInfo: {
// // // //     flex: 1,
// // // //   },
// // // //   rideTypeName: {
// // // //     fontSize: 16,
// // // //     fontWeight: "600",
// // // //     marginBottom: 2,
// // // //   },
// // // //   rideTypeTime: {
// // // //     fontSize: 13,
// // // //   },
// // // //   rideTypePrice: {
// // // //     fontSize: 18,
// // // //     fontWeight: "700",
// // // //   },
// // // //   confirmButton: {
// // // //     borderRadius: BorderRadius.lg,
// // // //     paddingVertical: Spacing.md,
// // // //     alignItems: "center",
// // // //     justifyContent: "center",
// // // //     marginTop: Spacing.md,
// // // //   },
// // // //   confirmButtonDisabled: {
// // // //     opacity: 0.5,
// // // //   },
// // // //   confirmButtonText: {
// // // //     color: "#000000",
// // // //     fontSize: 16,
// // // //     fontWeight: "700",
// // // //   },
// // // // });

// // // //client/screens/rider/RideRequestScreen.tsx

// // // import React, { useState, useRef, useEffect } from "react";
// // // import {
// // //   StyleSheet,
// // //   View,
// // //   Pressable,
// // //   Dimensions,
// // //   Platform,
// // // } from "react-native";
// // // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // // import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
// // // import { MaterialIcons } from "@expo/vector-icons";
// // // import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// // // import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
// // // import * as Haptics from "expo-haptics";
// // // import * as Location from "expo-location";

// // // import { ThemedText } from "@/components/ThemedText";
// // // import { useTheme } from "@/hooks/useTheme";
// // // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // // const { width, height } = Dimensions.get("window");

// // // // Get your API key from .env
// // // const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAY919Q_XkU0z-jNHg0E_1ogRW1yW5ewMI';

// // // const INITIAL_REGION: Region = {
// // //   latitude: 28.6139, // Delhi coordinates
// // //   longitude: 77.2090,
// // //   latitudeDelta: 0.0922,
// // //   longitudeDelta: 0.0421,
// // // };

// // // interface LocationCoords {
// // //   latitude: number;
// // //   longitude: number;
// // // }

// // // export default function RideRequestScreen({ navigation, route }: any) {
// // //   const insets = useSafeAreaInsets();
// // //   const { theme, isDark } = useTheme();
// // //   const mapRef = useRef<MapView>(null);
// // //   const pickupRef = useRef<any>(null);
// // //   const dropoffRef = useRef<any>(null);

// // //   const [pickupCoords, setPickupCoords] = useState<LocationCoords | null>(null);
// // //   const [dropoffCoords, setDropoffCoords] = useState<LocationCoords | null>(null);
// // //   const [selectedRideType, setSelectedRideType] = useState("go");

// // //   const RIDE_TYPES = [
// // //     { id: "go", name: "UTO Go", price: "$15.50", time: "5 min", icon: "directions-car" },
// // //     { id: "premium", name: "UTO Premium", price: "$22.00", time: "3 min", icon: "stars" },
// // //   ];

// // //   useEffect(() => {
// // //     getCurrentLocation();
// // //   }, []);

// // //   const getCurrentLocation = async () => {
// // //     try {
// // //       const { status } = await Location.requestForegroundPermissionsAsync();
// // //       if (status !== "granted") return;

// // //       const location = await Location.getCurrentPositionAsync({
// // //         accuracy: Location.Accuracy.Balanced,
// // //       });

// // //       const coords: LocationCoords = {
// // //         latitude: location.coords.latitude,
// // //         longitude: location.coords.longitude,
// // //       };

// // //       setPickupCoords(coords);

// // //       // Get address and set it in the autocomplete
// // //       const [address] = await Location.reverseGeocodeAsync(coords);
// // //       if (address && pickupRef.current) {
// // //         const locationText = [address.street, address.city].filter(Boolean).join(", ");
// // //         pickupRef.current?.setAddressText(locationText);
// // //       }

// // //       mapRef.current?.animateToRegion({
// // //         ...coords,
// // //         latitudeDelta: 0.01,
// // //         longitudeDelta: 0.01,
// // //       }, 1000);
// // //     } catch (error) {
// // //       console.error("Error getting location:", error);
// // //     }
// // //   };

// // //   const handleConfirm = () => {
// // //     if (!pickupCoords || !dropoffCoords) return;

// // //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
// // //     navigation.navigate("RideTracking");
// // //   };

// // //   return (
// // //     <View style={styles.container}>
// // //       {/* Map */}
// // //       <MapView
// // //         ref={mapRef}
// // //         provider={PROVIDER_GOOGLE}
// // //         style={styles.map}
// // //         initialRegion={INITIAL_REGION}
// // //         showsUserLocation
// // //         showsMyLocationButton={false}
// // //       >
// // //         {pickupCoords && (
// // //           <Marker 
// // //             coordinate={pickupCoords} 
// // //             pinColor={UTOColors.success}
// // //             title="Pickup"
// // //           />
// // //         )}
// // //         {dropoffCoords && (
// // //           <Marker 
// // //             coordinate={dropoffCoords} 
// // //             pinColor={UTOColors.error}
// // //             title="Drop-off"
// // //           />
// // //         )}
// // //       </MapView>

// // //       {/* Search Inputs Overlay */}
// // //       <Animated.View 
// // //         entering={FadeInDown.delay(100).duration(400)}
// // //         style={[styles.searchContainer, { top: insets.top + 60 }]}
// // //       >
// // //         {/* Pickup with autocomplete */}
// // //         <View style={styles.autocompleteContainer}>
// // //           <GooglePlacesAutocomplete
// // //             ref={pickupRef}
// // //             placeholder='Pickup location'
// // //             onPress={(data, details = null) => {
// // //               if (details) {
// // //                 const coords: LocationCoords = {
// // //                   latitude: details.geometry.location.lat,
// // //                   longitude: details.geometry.location.lng,
// // //                 };
// // //                 setPickupCoords(coords);
// // //                 mapRef.current?.animateToRegion({
// // //                   ...coords,
// // //                   latitudeDelta: 0.01,
// // //                   longitudeDelta: 0.01,
// // //                 }, 1000);
// // //               }
// // //             }}
// // //             query={{
// // //               key: GOOGLE_API_KEY,
// // //               language: 'en',
// // //               components: 'country:in',
// // //             }}
// // //             fetchDetails={true}
// // //             styles={{
// // //               container: styles.googleContainer,
// // //               textInputContainer: [
// // //                 styles.googleTextInputContainer,
// // //                 { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
// // //               ],
// // //               textInput: [
// // //                 styles.googleTextInput,
// // //                 { color: isDark ? '#FFFFFF' : '#000000', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
// // //               ],
// // //               listView: styles.googleListView,
// // //               row: { backgroundColor: isDark ? '#262626' : '#FFFFFF' },
// // //               description: { color: isDark ? '#FFFFFF' : '#000000' },
// // //             }}
// // //             renderLeftButton={() => (
// // //               <View style={styles.iconContainer}>
// // //                 <MaterialIcons name="my-location" size={20} color={UTOColors.success} />
// // //               </View>
// // //             )}
// // //             renderRightButton={() => (
// // //               <Pressable onPress={getCurrentLocation} style={styles.iconContainer}>
// // //                 <MaterialIcons name="gps-fixed" size={20} color={UTOColors.primary} />
// // //               </Pressable>
// // //             )}
// // //           />
// // //         </View>

// // //         {/* Dropoff with autocomplete */}
// // //         <View style={[styles.autocompleteContainer, { marginTop: Spacing.sm }]}>
// // //           <GooglePlacesAutocomplete
// // //             ref={dropoffRef}
// // //             placeholder='Drop-off location'
// // //             onPress={(data, details = null) => {
// // //               if (details) {
// // //                 const coords: LocationCoords = {
// // //                   latitude: details.geometry.location.lat,
// // //                   longitude: details.geometry.location.lng,
// // //                 };
// // //                 setDropoffCoords(coords);

// // //                 // Fit map to show both markers
// // //                 if (pickupCoords) {
// // //                   mapRef.current?.fitToCoordinates([pickupCoords, coords], {
// // //                     edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
// // //                     animated: true,
// // //                   });
// // //                 }
// // //               }
// // //             }}
// // //             query={{
// // //               key: GOOGLE_API_KEY,
// // //               language: 'en',
// // //               components: 'country:in',
// // //             }}
// // //             fetchDetails={true}
// // //             styles={{
// // //               container: styles.googleContainer,
// // //               textInputContainer: [
// // //                 styles.googleTextInputContainer,
// // //                 { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
// // //               ],
// // //               textInput: [
// // //                 styles.googleTextInput,
// // //                 { color: isDark ? '#FFFFFF' : '#000000', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
// // //               ],
// // //               listView: styles.googleListView,
// // //               row: { backgroundColor: isDark ? '#262626' : '#FFFFFF' },
// // //               description: { color: isDark ? '#FFFFFF' : '#000000' },
// // //             }}
// // //             renderLeftButton={() => (
// // //               <View style={styles.iconContainer}>
// // //                 <MaterialIcons name="place" size={20} color={UTOColors.error} />
// // //               </View>
// // //             )}
// // //           />
// // //         </View>
// // //       </Animated.View>

// // //       {/* Bottom Sheet */}
// // //       <Animated.View 
// // //         entering={FadeInUp.delay(200).duration(400)}
// // //         style={[
// // //           styles.bottomSheet, 
// // //           { 
// // //             paddingBottom: insets.bottom + Spacing.sm,
// // //             backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
// // //           }
// // //         ]}
// // //       >
// // //         <View style={[styles.handle, { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }]} />

// // //         <ThemedText style={styles.bottomSheetTitle}>Select Ride Type</ThemedText>

// // //         {RIDE_TYPES.map((rideType) => (
// // //           <Pressable
// // //             key={rideType.id}
// // //             style={[
// // //               styles.rideTypeCard,
// // //               { backgroundColor: isDark ? '#262626' : '#F3F4F6' },
// // //               selectedRideType === rideType.id && { 
// // //                 borderColor: UTOColors.primary,
// // //                 borderWidth: 2,
// // //               },
// // //             ]}
// // //             onPress={() => {
// // //               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// // //               setSelectedRideType(rideType.id);
// // //             }}
// // //           >
// // //             <View style={[
// // //               styles.rideTypeIcon,
// // //               { backgroundColor: isDark ? '#333333' : '#FFFFFF' },
// // //               selectedRideType === rideType.id && { backgroundColor: UTOColors.primary }
// // //             ]}>
// // //               <MaterialIcons 
// // //                 name={rideType.icon as any} 
// // //                 size={24} 
// // //                 color={selectedRideType === rideType.id ? "#000000" : UTOColors.primary} 
// // //               />
// // //             </View>
// // //             <View style={styles.rideTypeInfo}>
// // //               <ThemedText style={styles.rideTypeName}>{rideType.name}</ThemedText>
// // //               <ThemedText style={[styles.rideTypeTime, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
// // //                 {rideType.time}
// // //               </ThemedText>
// // //             </View>
// // //             <ThemedText style={styles.rideTypePrice}>{rideType.price}</ThemedText>
// // //           </Pressable>
// // //         ))}

// // //         {/* Confirm Button */}
// // //         <Pressable
// // //           style={[
// // //             styles.confirmButton,
// // //             { backgroundColor: UTOColors.primary },
// // //             (!pickupCoords || !dropoffCoords) && styles.confirmButtonDisabled,
// // //           ]}
// // //           onPress={handleConfirm}
// // //           disabled={!pickupCoords || !dropoffCoords}
// // //         >
// // //           <ThemedText style={styles.confirmButtonText}>Confirm Ride</ThemedText>
// // //         </Pressable>
// // //       </Animated.View>
// // //     </View>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //   },
// // //   map: {
// // //     width: width,
// // //     height: height,
// // //   },
// // //   searchContainer: {
// // //     position: "absolute",
// // //     left: 0,
// // //     right: 0,
// // //     paddingHorizontal: Spacing.md,
// // //     zIndex: 10,
// // //   },
// // //   autocompleteContainer: {
// // //     zIndex: 1000,
// // //   },
// // //   googleContainer: {
// // //     flex: 0,
// // //   },
// // //   googleTextInputContainer: {
// // //     borderRadius: BorderRadius.lg,
// // //     paddingHorizontal: Spacing.md,
// // //     shadowColor: "#000",
// // //     shadowOffset: { width: 0, height: 2 },
// // //     shadowOpacity: 0.15,
// // //     shadowRadius: 4,
// // //     elevation: 3,
// // //   },
// // //   googleTextInput: {
// // //     height: 52,
// // //     fontSize: 15,
// // //     borderRadius: BorderRadius.lg,
// // //   },
// // //   googleListView: {
// // //     borderRadius: BorderRadius.md,
// // //     marginTop: Spacing.xs,
// // //     shadowColor: "#000",
// // //     shadowOffset: { width: 0, height: 2 },
// // //     shadowOpacity: 0.25,
// // //     shadowRadius: 8,
// // //     elevation: 5,
// // //   },
// // //   iconContainer: {
// // //     width: 40,
// // //     height: 52,
// // //     justifyContent: 'center',
// // //     alignItems: 'center',
// // //   },
// // //   bottomSheet: {
// // //     position: "absolute",
// // //     bottom: 0,
// // //     left: 0,
// // //     right: 0,
// // //     borderTopLeftRadius: BorderRadius["2xl"],
// // //     borderTopRightRadius: BorderRadius["2xl"],
// // //     padding: Spacing.lg,
// // //     shadowColor: "#000",
// // //     shadowOffset: { width: 0, height: -4 },
// // //     shadowOpacity: 0.25,
// // //     shadowRadius: 12,
// // //     elevation: 10,
// // //   },
// // //   handle: {
// // //     width: 40,
// // //     height: 4,
// // //     borderRadius: 2,
// // //     alignSelf: "center",
// // //     marginBottom: Spacing.md,
// // //   },
// // //   bottomSheetTitle: {
// // //     fontSize: 18,
// // //     fontWeight: "600",
// // //     marginBottom: Spacing.md,
// // //   },
// // //   rideTypeCard: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     borderRadius: BorderRadius.lg,
// // //     padding: Spacing.md,
// // //     marginBottom: Spacing.sm,
// // //     borderWidth: 1,
// // //     borderColor: "transparent",
// // //   },
// // //   rideTypeIcon: {
// // //     width: 44,
// // //     height: 44,
// // //     borderRadius: 22,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     marginRight: Spacing.md,
// // //   },
// // //   rideTypeInfo: {
// // //     flex: 1,
// // //   },
// // //   rideTypeName: {
// // //     fontSize: 16,
// // //     fontWeight: "600",
// // //     marginBottom: 2,
// // //   },
// // //   rideTypeTime: {
// // //     fontSize: 13,
// // //   },
// // //   rideTypePrice: {
// // //     fontSize: 18,
// // //     fontWeight: "700",
// // //   },
// // //   confirmButton: {
// // //     borderRadius: BorderRadius.lg,
// // //     paddingVertical: Spacing.md,
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     marginTop: Spacing.md,
// // //   },
// // //   confirmButtonDisabled: {
// // //     opacity: 0.5,
// // //   },
// // //   confirmButtonText: {
// // //     color: "#000000",
// // //     fontSize: 16,
// // //     fontWeight: "700",
// // //   },
// // // });

// // //client/screens/rider/RideRequestScreen.tsx
// // import React, { useState, useEffect } from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   Pressable,
// //   ScrollView,
// //   ActivityIndicator,
// //   KeyboardAvoidingView,
// //   Platform,
// // } from "react-native";
// // import { useSafeAreaInsets } from "react-native-safe-area-context";
// // import * as Location from "expo-location";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import Animated, {
// //   FadeInUp,
// //   FadeInDown,
// //   useAnimatedStyle,
// //   useSharedValue,
// //   withSpring,
// // } from "react-native-reanimated";
// // import * as Haptics from "expo-haptics";

// // import { ThemedText } from "@/components/ThemedText";
// // import { LocationInputAutocomplete } from "@/components/LocationInputAutocomplete";
// // import { VehicleCard } from "@/components/VehicleCard";
// // import { MapViewWrapper, MarkerWrapper } from "@/components/MapView";
// // import { useTheme } from "@/hooks/useTheme";
// // import { useRide, RideType, Location as RideLocation } from "@/context/RideContext";
// // import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// // const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// // const VEHICLE_OPTIONS = [
// //   {
// //     type: "economy" as RideType,
// //     name: "Economy",
// //     description: "Affordable everyday rides",
// //     passengers: 4,
// //   },
// //   {
// //     type: "premium" as RideType,
// //     name: "Premium",
// //     description: "Luxury vehicles for comfort",
// //     passengers: 4,
// //   },
// //   {
// //     type: "xl" as RideType,
// //     name: "XL",
// //     description: "Larger vehicles for groups",
// //     passengers: 6,
// //   },
// // ];

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
// //     featureType: "road",
// //     elementType: "geometry.stroke",
// //     stylers: [{ color: "#212a37" }],
// //   },
// //   {
// //     featureType: "water",
// //     elementType: "geometry",
// //     stylers: [{ color: "#17263c" }],
// //   },
// // ];

// // export default function RideRequestScreen({ navigation, route }: any) {
// //   const insets = useSafeAreaInsets();
// //   const { isDark } = useTheme();
// //   const { activeRide, requestRide } = useRide();

// //   const [location, setLocation] = useState<Location.LocationObject | null>(null);
// //   const [currentAddress, setCurrentAddress] = useState<string>("");
// //   const [isLoadingLocation, setIsLoadingLocation] = useState(true);
// //   const [pickup, setPickup] = useState("");
// //   const [dropoff, setDropoff] = useState("");
// //   const [pickupLocation, setPickupLocation] = useState<any>(null);
// //   const [dropoffLocation, setDropoffLocation] = useState<any>(null);
// //   const [selectedVehicle, setSelectedVehicle] = useState<RideType>("economy");
// //   const [showVehicleSelector, setShowVehicleSelector] = useState(false);
// //   const [isRequesting, setIsRequesting] = useState(false);

// //   const buttonScale = useSharedValue(1);

// //   const buttonAnimatedStyle = useAnimatedStyle(() => ({
// //     transform: [{ scale: buttonScale.value }],
// //   }));

// //   useEffect(() => {
// //     (async () => {
// //       try {
// //         const { status } = await Location.requestForegroundPermissionsAsync();
// //         if (status !== "granted") {
// //           setIsLoadingLocation(false);
// //           return;
// //         }

// //         const currentLocation = await Location.getCurrentPositionAsync({
// //           accuracy: Location.Accuracy.Balanced,
// //         });
// //         setLocation(currentLocation);
// //         setPickupLocation({
// //           latitude: currentLocation.coords.latitude,
// //           longitude: currentLocation.coords.longitude,
// //         });

// //         const [address] = await Location.reverseGeocodeAsync({
// //           latitude: currentLocation.coords.latitude,
// //           longitude: currentLocation.coords.longitude,
// //         });

// //         if (address) {
// //           const parts = [];
// //           if (address.street) parts.push(address.street);
// //           if (address.city) parts.push(address.city);
// //           const addressString = parts.join(", ") || "Current Location";
// //           setCurrentAddress(addressString);
// //           setPickup(addressString);
// //         } else {
// //           setPickup("Current Location");
// //           setCurrentAddress("Current Location");
// //         }
// //       } catch (error) {
// //         console.log("Location error:", error);
// //         setPickup("Current Location");
// //       }
// //       setIsLoadingLocation(false);
// //     })();
// //   }, []);

// //   useEffect(() => {
// //     if (activeRide) {
// //       navigation.navigate("RideTracking");
// //     }
// //   }, [activeRide]);

// //   useEffect(() => {
// //     if (dropoff.length >= 3 && dropoffLocation) {
// //       setShowVehicleSelector(true);
// //     }
// //   }, [dropoff, dropoffLocation]);

// //   const calculatePrice = (type: RideType): number => {
// //     const basePrices = { economy: 8.5, premium: 15.0, xl: 12.0 };
// //     const multiplier = 1 + Math.random() * 0.3;
// //     return Math.round(basePrices[type] * multiplier * 100) / 100;
// //   };

// //   const handlePickupSelect = (loc: any) => {
// //     // Use coordinates from Google Places API if available
// //     if (loc.latitude && loc.longitude) {
// //       setPickupLocation({
// //         latitude: loc.latitude,
// //         longitude: loc.longitude,
// //       });
// //     } else {
// //       setPickupLocation({
// //         latitude: location?.coords.latitude || 51.5074,
// //         longitude: location?.coords.longitude || -0.1278,
// //       });
// //     }
// //   };

// //   const handleDropoffSelect = (loc: any) => {
// //     // Use coordinates from Google Places API if available
// //     if (loc.latitude && loc.longitude) {
// //       setDropoffLocation({
// //         latitude: loc.latitude,
// //         longitude: loc.longitude,
// //       });
// //     } else {
// //       // Fallback to random offset from current location
// //       setDropoffLocation({
// //         latitude: (location?.coords.latitude || 51.5074) + (Math.random() * 0.05 - 0.025),
// //         longitude: (location?.coords.longitude || -0.1278) + (Math.random() * 0.05 - 0.025),
// //       });
// //     }
// //     setShowVehicleSelector(true);
// //   };

// //   const handleRequestRide = async () => {
// //     if (!pickup || !dropoff) return;

// //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
// //     setIsRequesting(true);

// //     const pickupLoc: RideLocation = {
// //       address: pickup,
// //       latitude: pickupLocation?.latitude || 51.5074,
// //       longitude: pickupLocation?.longitude || -0.1278,
// //     };

// //     const dropoffLoc: RideLocation = {
// //       address: dropoff,
// //       latitude: dropoffLocation?.latitude || pickupLoc.latitude + 0.02,
// //       longitude: dropoffLocation?.longitude || pickupLoc.longitude + 0.02,
// //     };

// //     try {
// //       await requestRide(pickupLoc, dropoffLoc, selectedVehicle);
// //     } catch (error) {
// //       console.error("Failed to request ride:", error);
// //     } finally {
// //       setIsRequesting(false);
// //     }
// //   };

// //   const mapRegion = location
// //     ? {
// //         latitude: location.coords.latitude,
// //         longitude: location.coords.longitude,
// //         latitudeDelta: 0.01,
// //         longitudeDelta: 0.01,
// //       }
// //     : {
// //         latitude: 51.5074,
// //         longitude: -0.1278,
// //         latitudeDelta: 0.05,
// //         longitudeDelta: 0.05,
// //       };

// //   return (
// //     <View style={styles.container}>
// //       <View style={styles.mapContainer}>
// //         {isLoadingLocation ? (
// //           <View style={styles.loadingContainer}>
// //             <ActivityIndicator size="large" color={UTOColors.primary} />
// //           </View>
// //         ) : (
// //           <MapViewWrapper
// //             style={styles.map}
// //             initialRegion={mapRegion}
// //             showsUserLocation
// //             showsMyLocationButton={false}
// //             customMapStyle={darkMapStyle}
// //           >
// //             {location ? (
// //               <MarkerWrapper
// //                 coordinate={{
// //                   latitude: location.coords.latitude,
// //                   longitude: location.coords.longitude,
// //                 }}
// //                 title="Your Location"
// //               />
// //             ) : null}
// //           </MapViewWrapper>
// //         )}
// //       </View>

// //       <KeyboardAvoidingView
// //         behavior={Platform.OS === "ios" ? "padding" : "height"}
// //         style={styles.overlay}
// //         keyboardVerticalOffset={0}
// //       >
// //         <View
// //           style={[
// //             styles.searchContainer,
// //             { paddingTop: insets.top + Spacing.md },
// //           ]}
// //         >
// //           <View style={styles.headerRow}>
// //             <Pressable
// //               onPress={() => navigation.goBack()}
// //               style={styles.backButton}
// //             >
// //               <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
// //             </Pressable>
// //             <ThemedText style={styles.headerTitle}>Request a ride</ThemedText>
// //             <View style={styles.backButton} />
// //           </View>

// //           <View style={styles.routeContainer}>
// //             <View style={styles.routeIndicator}>
// //               <View style={[styles.routeDotGreen, { backgroundColor: UTOColors.success }]} />
// //               <View style={styles.routeLine} />
// //               <View style={[styles.routeDotYellow, { backgroundColor: UTOColors.primary }]} />
// //             </View>
// //             <View style={styles.inputsContainer}>
// //               <View style={{ zIndex: 200 }}>
// //                 <LocationInputAutocomplete
// //                   label="Pickup"
// //                   value={pickup}
// //                   placeholder="Enter pickup location"
// //                   onChangeText={setPickup}
// //                   onSelectLocation={handlePickupSelect}
// //                   type="pickup"
// //                 />
// //               </View>
// //               <View style={{ zIndex: 100 }}>
// //                 <LocationInputAutocomplete
// //                   label="Dropoff"
// //                   value={dropoff}
// //                   placeholder="Where to?"
// //                   onChangeText={setDropoff}
// //                   onSelectLocation={handleDropoffSelect}
// //                   type="dropoff"
// //                 />
// //               </View>
// //             </View>
// //           </View>
// //         </View>

// //         {showVehicleSelector && dropoff ? (
// //           <Animated.View
// //             entering={FadeInUp.duration(300)}
// //             style={[
// //               styles.bottomSheet,
// //               Shadows.large,
// //               { paddingBottom: insets.bottom + Spacing.lg },
// //             ]}
// //           >
// //             <View style={styles.sheetHandle}>
// //               <View style={styles.handle} />
// //             </View>

// //             <ThemedText style={styles.sheetTitle}>Choose a ride</ThemedText>

// //             <ScrollView 
// //               style={styles.vehicleList}
// //               showsVerticalScrollIndicator={false}
// //             >
// //               {VEHICLE_OPTIONS.map((vehicle) => (
// //                 <VehicleCard
// //                   key={vehicle.type}
// //                   type={vehicle.type}
// //                   name={vehicle.name}
// //                   description={vehicle.description}
// //                   passengers={vehicle.passengers}
// //                   price={calculatePrice(vehicle.type)}
// //                   eta={3 + Math.floor(Math.random() * 5)}
// //                   isSelected={selectedVehicle === vehicle.type}
// //                   onPress={() => setSelectedVehicle(vehicle.type)}
// //                 />
// //               ))}
// //             </ScrollView>

// //             <AnimatedPressable
// //               onPress={handleRequestRide}
// //               onPressIn={() => (buttonScale.value = withSpring(0.98))}
// //               onPressOut={() => (buttonScale.value = withSpring(1))}
// //               disabled={isRequesting}
// //               style={[
// //                 styles.requestButton,
// //                 { backgroundColor: UTOColors.primary },
// //                 buttonAnimatedStyle,
// //               ]}
// //             >
// //               {isRequesting ? (
// //                 <ActivityIndicator color="#000000" />
// //               ) : (
// //                 <>
// //                   <ThemedText style={styles.requestButtonText}>
// //                     Request {VEHICLE_OPTIONS.find((v) => v.type === selectedVehicle)?.name}
// //                   </ThemedText>
// //                   <ThemedText style={styles.requestButtonPrice}>
// //                     {formatPrice(calculatePrice(selectedVehicle))}
// //                   </ThemedText>
// //                 </>
// //               )}
// //             </AnimatedPressable>
// //           </Animated.View>
// //         ) : null}
// //       </KeyboardAvoidingView>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#000000",
// //   },
// //   mapContainer: {
// //     ...StyleSheet.absoluteFillObject,
// //   },
// //   map: {
// //     flex: 1,
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     backgroundColor: "#1A1A1A",
// //   },
// //   overlay: {
// //     flex: 1,
// //   },
// //   searchContainer: {
// //     paddingHorizontal: Spacing.lg,
// //     paddingBottom: Spacing.lg,
// //     backgroundColor: "#000000",
// //     borderBottomLeftRadius: BorderRadius.xl,
// //     borderBottomRightRadius: BorderRadius.xl,
// //   },
// //   headerRow: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     justifyContent: "space-between",
// //     marginBottom: Spacing.lg,
// //   },
// //   backButton: {
// //     width: 40,
// //     height: 40,
// //     borderRadius: 20,
// //     backgroundColor: "#1A1A1A",
// //     alignItems: "center",
// //     justifyContent: "center",
// //   },
// //   headerTitle: {
// //     color: "#FFFFFF",
// //     fontSize: 18,
// //     fontWeight: "600",
// //   },
// //   routeContainer: {
// //     flexDirection: "row",
// //   },
// //   routeIndicator: {
// //     width: 24,
// //     alignItems: "center",
// //     paddingTop: 18,
// //     marginRight: Spacing.sm,
// //   },
// //   routeDotGreen: {
// //     width: 12,
// //     height: 12,
// //     borderRadius: 6,
// //   },
// //   routeLine: {
// //     width: 2,
// //     height: 40,
// //     marginVertical: 4,
// //     backgroundColor: "#333333",
// //   },
// //   routeDotYellow: {
// //     width: 12,
// //     height: 12,
// //     borderRadius: 6,
// //   },
// //   inputsContainer: {
// //     flex: 1,
// //   },
// //   bottomSheet: {
// //     position: "absolute",
// //     bottom: 0,
// //     left: 0,
// //     right: 0,
// //     paddingHorizontal: Spacing.lg,
// //     paddingTop: Spacing.md,
// //     borderTopLeftRadius: BorderRadius.xl,
// //     borderTopRightRadius: BorderRadius.xl,
// //     backgroundColor: "#000000",
// //     maxHeight: "50%",
// //   },
// //   sheetHandle: {
// //     alignItems: "center",
// //     paddingBottom: Spacing.md,
// //   },
// //   handle: {
// //     width: 36,
// //     height: 4,
// //     borderRadius: 2,
// //     backgroundColor: "#333333",
// //   },
// //   sheetTitle: {
// //     fontSize: 18,
// //     fontWeight: "600",
// //     marginBottom: Spacing.lg,
// //     color: "#FFFFFF",
// //   },
// //   vehicleList: {
// //     maxHeight: 200,
// //   },
// //   requestButton: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     justifyContent: "space-between",
// //     height: 56,
// //     borderRadius: BorderRadius.full,
// //     paddingHorizontal: Spacing.xl,
// //     marginTop: Spacing.md,
// //   },
// //   requestButtonText: {
// //     color: "#000000",
// //     fontSize: 17,
// //     fontWeight: "600",
// //   },
// //   requestButtonPrice: {
// //     color: "#000000",
// //     fontSize: 17,
// //     fontWeight: "700",
// //   },
// // });


// //client/screens/rider/RideRequestScreen.tsx

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import {
//   StyleSheet,
//   View,
//   Pressable,
//   ScrollView,
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import * as Location from "expo-location";
// import { MaterialIcons } from "@expo/vector-icons";
// import Animated, {
//   FadeInUp,
//   FadeInDown,
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
// } from "react-native-reanimated";
// import * as Haptics from "expo-haptics";

// import { ThemedText } from "@/components/ThemedText";
// import { LocationInputAutocomplete } from "@/components/LocationInputAutocomplete";
// import { VehicleCard } from "@/components/VehicleCard";
// import { MapViewWrapper, MarkerWrapper } from "@/components/MapView";
// import { useTheme } from "@/hooks/useTheme";
// import { useRide, RideType, Location as RideLocation } from "@/context/RideContext";
// import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// const VEHICLE_OPTIONS = [
//   {
//     type: "economy" as RideType,
//     name: "Economy",
//     description: "Affordable everyday rides",
//     passengers: 4,
//   },
//   {
//     type: "premium" as RideType,
//     name: "Premium",
//     description: "Luxury vehicles for comfort",
//     passengers: 4,
//   },
//   {
//     type: "xl" as RideType,
//     name: "XL",
//     description: "Larger vehicles for groups",
//     passengers: 6,
//   },
// ];

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
//     featureType: "road",
//     elementType: "geometry.stroke",
//     stylers: [{ color: "#212a37" }],
//   },
//   {
//     featureType: "water",
//     elementType: "geometry",
//     stylers: [{ color: "#17263c" }],
//   },
// ];

// export default function RideRequestScreen({ navigation, route }: any) {
//   const insets = useSafeAreaInsets();
//   const { isDark } = useTheme();
//   const { activeRide, requestRide } = useRide();

//   const [location, setLocation] = useState<Location.LocationObject | null>(null);
//   const [currentAddress, setCurrentAddress] = useState<string>("");
//   const [isLoadingLocation, setIsLoadingLocation] = useState(true);
//   const [pickup, setPickup] = useState("");
//   const [dropoff, setDropoff] = useState("");
//   const [pickupLocation, setPickupLocation] = useState<any>(null);
//   const [dropoffLocation, setDropoffLocation] = useState<any>(null);
//   const [selectedVehicle, setSelectedVehicle] = useState<RideType>("economy");
//   const [showVehicleSelector, setShowVehicleSelector] = useState(false);
//   const [isRequesting, setIsRequesting] = useState(false);

//   const buttonScale = useSharedValue(1);

//   const buttonAnimatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: buttonScale.value }],
//   }));

//   useEffect(() => {
//     (async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           setIsLoadingLocation(false);
//           return;
//         }

//         const currentLocation = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.Balanced,
//         });
//         setLocation(currentLocation);
//         setPickupLocation({
//           latitude: currentLocation.coords.latitude,
//           longitude: currentLocation.coords.longitude,
//         });

//         const [address] = await Location.reverseGeocodeAsync({
//           latitude: currentLocation.coords.latitude,
//           longitude: currentLocation.coords.longitude,
//         });

//         if (address) {
//           const parts = [];
//           if (address.street) parts.push(address.street);
//           if (address.city) parts.push(address.city);
//           const addressString = parts.join(", ") || "Current Location";
//           setCurrentAddress(addressString);
//           setPickup(addressString);
//         } else {
//           setPickup("Current Location");
//           setCurrentAddress("Current Location");
//         }
//       } catch (error) {
//         console.log("Location error:", error);
//         setPickup("Current Location");
//       }
//       setIsLoadingLocation(false);
//     })();
//   }, []);

//   useEffect(() => {
//     if (activeRide) {
//       navigation.navigate("RideTracking");
//     }
//   }, [activeRide]);

//   useEffect(() => {
//     if (dropoff.length >= 3 && dropoffLocation) {
//       setShowVehicleSelector(true);
//     }
//   }, [dropoff, dropoffLocation]);

//   const calculatePrice = (type: RideType): number => {
//     const basePrices = { economy: 8.5, premium: 15.0, xl: 12.0 };
//     const multiplier = 1 + Math.random() * 0.3;
//     return Math.round(basePrices[type] * multiplier * 100) / 100;
//   };

//   const handlePickupSelect = (loc: any) => {
//     // Use coordinates from Google Places API if available
//     if (loc.latitude && loc.longitude) {
//       setPickupLocation({
//         latitude: loc.latitude,
//         longitude: loc.longitude,
//       });
//     } else {
//       setPickupLocation({
//         latitude: location?.coords.latitude || 51.5074,
//         longitude: location?.coords.longitude || -0.1278,
//       });
//     }
//   };

//   const handleDropoffSelect = (loc: any) => {
//     // Use coordinates from Google Places API if available
//     if (loc.latitude && loc.longitude) {
//       setDropoffLocation({
//         latitude: loc.latitude,
//         longitude: loc.longitude,
//       });
//     } else {
//       // Fallback to random offset from current location
//       setDropoffLocation({
//         latitude: (location?.coords.latitude || 51.5074) + (Math.random() * 0.05 - 0.025),
//         longitude: (location?.coords.longitude || -0.1278) + (Math.random() * 0.05 - 0.025),
//       });
//     }
//     setShowVehicleSelector(true);
//   };

//   const handleRequestRide = async () => {
//     if (!pickup || !dropoff) return;

//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//     setIsRequesting(true);

//     const pickupLoc: RideLocation = {
//       address: pickup,
//       latitude: pickupLocation?.latitude || 51.5074,
//       longitude: pickupLocation?.longitude || -0.1278,
//     };

//     const dropoffLoc: RideLocation = {
//       address: dropoff,
//       latitude: dropoffLocation?.latitude || pickupLoc.latitude + 0.02,
//       longitude: dropoffLocation?.longitude || pickupLoc.longitude + 0.02,
//     };

//     try {
//       await requestRide(pickupLoc, dropoffLoc, selectedVehicle);
//     } catch (error) {
//       console.error("Failed to request ride:", error);
//     } finally {
//       setIsRequesting(false);
//     }
//   };

//   const mapRegion = location
//     ? {
//         latitude: location.coords.latitude,
//         longitude: location.coords.longitude,
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01,
//       }
//     : {
//         latitude: 51.5074,
//         longitude: -0.1278,
//         latitudeDelta: 0.05,
//         longitudeDelta: 0.05,
//       };

//   return (
//     <View style={styles.container}>
//       <View style={styles.mapContainer}>
//         {isLoadingLocation ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color={UTOColors.primary} />
//           </View>
//         ) : (
//           <MapViewWrapper
//             style={styles.map}
//             initialRegion={mapRegion}
//             showsUserLocation
//             showsMyLocationButton={false}
//             customMapStyle={darkMapStyle}
//           >
//             {location ? (
//               <MarkerWrapper
//                 coordinate={{
//                   latitude: location.coords.latitude,
//                   longitude: location.coords.longitude,
//                 }}
//                 title="Your Location"
//               />
//             ) : null}
//           </MapViewWrapper>
//         )}
//       </View>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={styles.overlay}
//         keyboardVerticalOffset={0}
//       >
//         <View
//           style={[
//             styles.searchContainer,
//             { paddingTop: insets.top + Spacing.md },
//           ]}
//         >
//           <View style={styles.headerRow}>
//             <Pressable
//               onPress={() => navigation.goBack()}
//               style={styles.backButton}
//             >
//               <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
//             </Pressable>
//             <ThemedText style={styles.headerTitle}>Request a ride</ThemedText>
//             <View style={styles.backButton} />
//           </View>

//           <View style={styles.routeContainer}>
//             <View style={styles.routeIndicator}>
//               <View style={[styles.routeDotGreen, { backgroundColor: UTOColors.success }]} />
//               <View style={styles.routeLine} />
//               <View style={[styles.routeDotYellow, { backgroundColor: UTOColors.primary }]} />
//             </View>
//             <View style={styles.inputsContainer}>
//               <View style={{ zIndex: 200 }}>
//                 <LocationInputAutocomplete
//                   label="Pickup"
//                   value={pickup}
//                   placeholder="Enter pickup location"
//                   onChangeText={setPickup}
//                   onSelectLocation={handlePickupSelect}
//                   type="pickup"
//                 />
//               </View>
//               <View style={{ zIndex: 100 }}>
//                 <LocationInputAutocomplete
//                   label="Dropoff"
//                   value={dropoff}
//                   placeholder="Where to?"
//                   onChangeText={setDropoff}
//                   onSelectLocation={handleDropoffSelect}
//                   type="dropoff"
//                 />
//               </View>
//             </View>
//           </View>
//         </View>

//         {showVehicleSelector && dropoff ? (
//           <Animated.View
//             entering={FadeInUp.duration(300)}
//             style={[
//               styles.bottomSheet,
//               Shadows.large,
//               { paddingBottom: insets.bottom + Spacing.lg },
//             ]}
//           >
//             <View style={styles.sheetHandle}>
//               <View style={styles.handle} />
//             </View>

//             <ThemedText style={styles.sheetTitle}>Choose a ride</ThemedText>

//             <ScrollView 
//               style={styles.vehicleList}
//               showsVerticalScrollIndicator={false}
//             >
//               {VEHICLE_OPTIONS.map((vehicle) => (
//                 <VehicleCard
//                   key={vehicle.type}
//                   type={vehicle.type}
//                   name={vehicle.name}
//                   description={vehicle.description}
//                   passengers={vehicle.passengers}
//                   price={calculatePrice(vehicle.type)}
//                   eta={3 + Math.floor(Math.random() * 5)}
//                   isSelected={selectedVehicle === vehicle.type}
//                   onPress={() => setSelectedVehicle(vehicle.type)}
//                 />
//               ))}
//             </ScrollView>

//             <AnimatedPressable
//               onPress={handleRequestRide}
//               onPressIn={() => (buttonScale.value = withSpring(0.98))}
//               onPressOut={() => (buttonScale.value = withSpring(1))}
//               disabled={isRequesting}
//               style={[
//                 styles.requestButton,
//                 { backgroundColor: UTOColors.primary },
//                 buttonAnimatedStyle,
//               ]}
//             >
//               {isRequesting ? (
//                 <ActivityIndicator color="#000000" />
//               ) : (
//                 <>
//                   <ThemedText style={styles.requestButtonText}>
//                     Request {VEHICLE_OPTIONS.find((v) => v.type === selectedVehicle)?.name}
//                   </ThemedText>
//                   <ThemedText style={styles.requestButtonPrice}>
//                     {formatPrice(calculatePrice(selectedVehicle))}
//                   </ThemedText>
//                 </>
//               )}
//             </AnimatedPressable>
//           </Animated.View>
//         ) : null}
//       </KeyboardAvoidingView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#000000",
//   },
//   mapContainer: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   map: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#1A1A1A",
//   },
//   overlay: {
//     flex: 1,
//   },
//   searchContainer: {
//     paddingHorizontal: Spacing.lg,
//     paddingBottom: Spacing.lg,
//     backgroundColor: "#000000",
//     borderBottomLeftRadius: BorderRadius.xl,
//     borderBottomRightRadius: BorderRadius.xl,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: Spacing.lg,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: "#1A1A1A",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   headerTitle: {
//     color: "#FFFFFF",
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   routeContainer: {
//     flexDirection: "row",
//   },
//   routeIndicator: {
//     width: 24,
//     alignItems: "center",
//     paddingTop: 18,
//     marginRight: Spacing.sm,
//   },
//   routeDotGreen: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   routeLine: {
//     width: 2,
//     height: 40,
//     marginVertical: 4,
//     backgroundColor: "#333333",
//   },
//   routeDotYellow: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   inputsContainer: {
//     flex: 1,
//   },
//   bottomSheet: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     paddingHorizontal: Spacing.lg,
//     paddingTop: Spacing.md,
//     borderTopLeftRadius: BorderRadius.xl,
//     borderTopRightRadius: BorderRadius.xl,
//     backgroundColor: "#000000",
//     maxHeight: "50%",
//   },
//   sheetHandle: {
//     alignItems: "center",
//     paddingBottom: Spacing.md,
//   },
//   handle: {
//     width: 36,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: "#333333",
//   },
//   sheetTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     marginBottom: Spacing.lg,
//     color: "#FFFFFF",
//   },
//   vehicleList: {
//     maxHeight: 200,
//   },
//   requestButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     height: 56,
//     borderRadius: BorderRadius.full,
//     paddingHorizontal: Spacing.xl,
//     marginTop: Spacing.md,
//   },
//   requestButtonText: {
//     color: "#000000",
//     fontSize: 17,
//     fontWeight: "600",
//   },
//   requestButtonPrice: {
//     color: "#000000",
//     fontSize: 17,
//     fontWeight: "700",
//   },
// });

import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { LocationInputAutocomplete } from "@/components/LocationInputAutocomplete";
import { VehicleCard } from "@/components/VehicleCard";
import { MapViewWrapper, MarkerWrapper } from "@/components/MapView";
import { useTheme } from "@/hooks/useTheme";
import { useRide, RideType, Location as RideLocation } from "@/context/RideContext";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";
import { useStripe } from "@stripe/stripe-react-native";
import { api } from "@/lib/api";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { TopDownCarView } from "@/components/TopDownCarView";

interface NearbyDriver {
  id: string;
  latitude: number;
  longitude: number;
  heading: number;
}

const VEHICLE_OPTIONS = [
  {
    type: "saloon" as RideType,
    name: "Saloon",
    description: "Affordable everyday rides (up to 4 passengers)",
    passengers: 4,
  },
  {
    type: "minibus" as RideType,
    name: "Minibus",
    description: "Larger vehicles for groups (up to 8 passengers)",
    passengers: 8,
  },
];

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
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
];

// ── Scheduling helpers ──────────────────────────────────────────
function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatDisplayTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function RideRequestScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { activeRide, requestRide, calculateDynamicFare } = useRide();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Schedule mode (passed from home screen when user taps Later)
  const initScheduleMode = route?.params?.scheduleMode === true;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [dropoffLocation, setDropoffLocation] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<RideType>("saloon");
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [useWalletBalance, setUseWalletBalance] = useState(false);

  // ── Saved card state ──
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // ── Schedule / Later state ──
  const [isScheduleMode, setIsScheduleMode] = useState(initScheduleMode);
  const [showChooseTimeModal, setShowChooseTimeModal] = useState(initScheduleMode);

  // 'pickup' = user picks pickup time

  // Passengers & luggage for scheduled rides
  const [schedPassengers, setSchedPassengers] = useState(1);
  const [schedLuggage, setSchedLuggage] = useState(0);

  // Date state
  const now = new Date();
  const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setSeconds(0, 0);
    return d;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Time spinners for the currently-edited time
  const [hourVal, setHourVal] = useState(() => scheduledDate.getHours());
  const [minuteVal, setMinuteVal] = useState(() => {
    const m = scheduledDate.getMinutes();
    return Math.round(m / 5) * 5;
  });

  // Compute pickup time
  const pickupTime: Date = (() => {
    const base = new Date(scheduledDate);
    base.setHours(hourVal, minuteVal, 0, 0);
    return base;
  })();

  // Sync hour/minute into scheduledDate when spinners change
  useEffect(() => {
    setScheduledDate(prev => {
      const d = new Date(prev);
      d.setHours(hourVal, minuteVal, 0, 0);
      return d;
    });
  }, [hourVal, minuteVal]);

  // Clamp calendar: can't navigate before today's month or after maxDate's month
  const todayMonth = { year: now.getFullYear(), month: now.getMonth() };
  const maxMonth = { year: maxDate.getFullYear(), month: maxDate.getMonth() };
  const canNavPrev = calendarMonth.year > todayMonth.year ||
    (calendarMonth.year === todayMonth.year && calendarMonth.month > todayMonth.month);
  const canNavNext = calendarMonth.year < maxMonth.year ||
    (calendarMonth.year === maxMonth.year && calendarMonth.month < maxMonth.month);

  // ── Fetch saved cards on mount ──
  const fetchSavedCards = async () => {
    if (!user?.id) return;
    setIsLoadingCards(true);
    try {
      const cards = await api.payments.getSavedCards(user.id);
      setSavedCards(cards || []);
    } catch (err) {
      console.warn('Failed to fetch saved cards:', err);
      setSavedCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchSavedCards();
    }
  }, [user?.id]);

  // ── Save a new card via Stripe SetupIntent ──
  const handleSaveCard = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in first.');
      return;
    }
    setIsSavingCard(true);
    try {
      // 1. Create a SetupIntent on the server
      const { clientSecret } = await api.payments.setupIntent(user.id);

      // 2. Initialize the Stripe PaymentSheet in setup mode
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: 'UTO Rides',
        style: 'alwaysDark',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setIsSavingCard(false);
        return;
      }

      // 3. Present the PaymentSheet to the user
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled — not an error
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error', presentError.message);
        }
        setIsSavingCard(false);
        return;
      }

      // 4. Card saved successfully — refresh cards and switch to card payment
      await fetchSavedCards();
      setPaymentMethod('card');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Card Saved', 'Your card has been saved successfully. You can now pay with card.');
    } catch (err: any) {
      console.error('Failed to save card:', err);
      Alert.alert('Error', err.message || 'Failed to save card. Please try again.');
    } finally {
      setIsSavingCard(false);
    }
  };

  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Fetch actual drivers from API
  const fetchNearbyDrivers = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(new URL("/api/drivers/online", getApiUrl()).toString());
      const data = await response.json();

      if (data.drivers && data.drivers.length > 0) {
        setNearbyDrivers(
          data.drivers.map((driver: any, index: number) => ({
            id: driver.id,
            latitude: driver.currentLatitude || coords.latitude + (Math.random() - 0.5) * 0.01,
            longitude: driver.currentLongitude || coords.longitude + (Math.random() - 0.5) * 0.01,
            heading: Math.random() * 360,
          }))
        );
      } else {
        // Fallback simulated drivers if 0 real drivers
        const drivers: NearbyDriver[] = [];
        for (let i = 0; i < 3; i++) {
          drivers.push({
            id: `driver_${i}`,
            latitude: coords.latitude + (Math.random() * 0.006 - 0.003),
            longitude: coords.longitude + (Math.random() * 0.006 - 0.003),
            heading: Math.random() * 360,
          });
        }
        setNearbyDrivers(drivers);
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      const drivers: NearbyDriver[] = [];
      for (let i = 0; i < 3; i++) {
        drivers.push({
          id: `fallback_${i}`,
          latitude: coords.latitude + (Math.random() * 0.006 - 0.003),
          longitude: coords.longitude + (Math.random() * 0.006 - 0.003),
          heading: Math.random() * 360,
        });
      }
      setNearbyDrivers(drivers);
    }
  };

  useEffect(() => {
    if (pickupLocation) {
      fetchNearbyDrivers(pickupLocation);
    }
  }, [pickupLocation]);

  // Animate nearby drivers - slow roaming movement
  useEffect(() => {
    if (nearbyDrivers.length === 0) return;

    const interval = setInterval(() => {
      setNearbyDrivers((prevDrivers) =>
        prevDrivers.map((driver) => {
          const headingChange = (Math.random() - 0.5) * 25;
          let newHeading = (driver.heading || 0) + headingChange;
          if (newHeading < 0) newHeading += 360;
          if (newHeading >= 360) newHeading -= 360;

          const rad = (newHeading * Math.PI) / 180;
          const speed = 0.00007; // ~8 meters per step

          return {
            ...driver,
            heading: newHeading,
            latitude: driver.latitude + Math.cos(rad) * speed,
            longitude: driver.longitude + Math.sin(rad) * speed,
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [nearbyDrivers.length]);

  useEffect(() => {
    (async () => {
      if (route?.params?.prefill) {
        const { pickup: prefillPickup, dropoff: prefillDropoff } = route.params.prefill;
        setPickup(prefillPickup.address);
        setPickupLocation({ latitude: prefillPickup.latitude, longitude: prefillPickup.longitude });
        setDropoff(prefillDropoff.address);
        setDropoffLocation({ latitude: prefillDropoff.latitude, longitude: prefillDropoff.longitude });
        
        setLocation({
          coords: { latitude: prefillPickup.latitude, longitude: prefillPickup.longitude, altitude: 0, accuracy: 0, altitudeAccuracy: 0, heading: 0, speed: 0 },
          timestamp: Date.now(),
        } as any);
        setIsLoadingLocation(false);
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setIsLoadingLocation(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
        setPickupLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        const [address] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (address) {
          const parts = [];
          if (address.street) parts.push(address.street);
          if (address.city) parts.push(address.city);
          const addressString = parts.join(", ") || "Current Location";
          setCurrentAddress(addressString);
          setPickup(addressString);
        } else {
          setPickup("Current Location");
          setCurrentAddress("Current Location");
        }
      } catch (error) {
        console.log("Location error:", error);
        setPickup("Current Location");
      }
      setIsLoadingLocation(false);
    })();
  }, []);

  useEffect(() => {
    if (activeRide) {
      navigation.navigate("RideTracking");
    }
  }, [activeRide]);

  useEffect(() => {
    if (dropoff.length >= 3 && dropoffLocation) {
      setShowVehicleSelector(true);
      
      // Fetch actual distance
      (async () => {
        try {
          const baseUrl = getApiUrl();
          const originStr = `${pickupLocation?.latitude || location?.coords.latitude || 51.5074},${pickupLocation?.longitude || location?.coords.longitude || -0.1278}`;
          const destStr = `${dropoffLocation.latitude},${dropoffLocation.longitude}`;
          
          const res = await fetch(`${baseUrl}/api/directions?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`);
          const data = await res.json();
          
          if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
            const leg = data.routes[0].legs[0];
            setDistanceKm((leg.distance?.value || 0) / 1000);
            setDurationMin(Math.round((leg.duration?.value || 0) / 60));
          } else {
            setDistanceKm(5.5);
            setDurationMin(15);
          }
        } catch (err) {
          console.warn("Failed to fetch distance in UI", err);
          setDistanceKm(5.5);
          setDurationMin(15);
        }
      })();
    }
  }, [dropoff, dropoffLocation]);

  const calculatePrice = (type: RideType): number => {
    return calculateDynamicFare(distanceKm ? (distanceKm * 0.621371) : 3.5, durationMin || 15, type);
  };

  const handlePickupSelect = (loc: any) => {
    // Use coordinates from Google Places API if available
    if (loc.latitude && loc.longitude) {
      setPickupLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } else {
      setPickupLocation({
        latitude: location?.coords.latitude || 51.5074,
        longitude: location?.coords.longitude || -0.1278,
      });
    }
  };

  const handleDropoffSelect = (loc: any) => {
    // Use coordinates from Google Places API if available
    if (loc.latitude && loc.longitude) {
      setDropoffLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } else {
      // Fallback to random offset from current location
      setDropoffLocation({
        latitude: (location?.coords.latitude || 51.5074) + (Math.random() * 0.05 - 0.025),
        longitude: (location?.coords.longitude || -0.1278) + (Math.random() * 0.05 - 0.025),
      });
    }
    setShowVehicleSelector(true);
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) return;

    // ── Guard: Ensure saved card exists when paying by card ──
    if (paymentMethod === 'card' && savedCards.length === 0) {
      Alert.alert(
        'No Saved Card',
        'You need to save a card before requesting a ride with card payment.',
        [
          { text: 'Add Card', onPress: handleSaveCard },
          { text: 'Use Cash', onPress: () => setPaymentMethod('cash'), style: 'cancel' },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRequesting(true);

    const pickupLoc: RideLocation = {
      address: pickup,
      latitude: pickupLocation?.latitude || 51.5074,
      longitude: pickupLocation?.longitude || -0.1278,
    };

    const dropoffLoc: RideLocation = {
      address: dropoff,
      latitude: dropoffLocation?.latitude || pickupLoc.latitude + 0.02,
      longitude: dropoffLocation?.longitude || pickupLoc.longitude + 0.02,
    };

    try {
      // Logic for finding nearest driver
      let nearestDriverId = null;
      if (nearbyDrivers.length > 0) {
        // Simple distance calculation to find nearest
        let minDistance = Infinity;
        nearbyDrivers.forEach((driver) => {
          const d = Math.sqrt(
            Math.pow(driver.latitude - pickupLoc.latitude, 2) +
            Math.pow(driver.longitude - pickupLoc.longitude, 2)
          );
          if (d < minDistance) {
            minDistance = d;
            nearestDriverId = driver.id;
          }
        });
      }

      const riderName = user?.fullName || user?.email?.split("@")[0] || "Rider";

      await requestRide(pickupLoc, dropoffLoc, selectedVehicle, riderName, paymentMethod, useWalletBalance);
    } catch (error) {
      console.error("Failed to request ride:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const mapRegion = pickupLocation
    ? {
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }
    : {
      latitude: 51.5074,
      longitude: -0.1278,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={UTOColors.primary} />
          </View>
        ) : (
          <MapViewWrapper
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            customMapStyle={darkMapStyle}
          >
            {pickupLocation ? (
              <MarkerWrapper
                coordinate={{
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude,
                }}
                title="Pickup Point"
              >
                <View style={styles.pickupMarker}>
                  <View style={styles.pickupMarkerDot} />
                </View>
              </MarkerWrapper>
            ) : null}

            {nearbyDrivers.map((driver) => (
              <MarkerWrapper
                key={driver.id}
                coordinate={{
                  latitude: driver.latitude,
                  longitude: driver.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                flat
              >
                <View style={{ transform: [{ rotate: `${driver.heading}deg` }] }}>
                  <TopDownCarView />
                </View>
              </MarkerWrapper>
            ))}
          </MapViewWrapper>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.searchContainer,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Plan your ride</ThemedText>
            {/* Pickup Later Button */}
            <Pressable
              style={[
                styles.pickupLaterBtn,
                isScheduleMode && styles.pickupLaterBtnActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowChooseTimeModal(true);
              }}
            >
              <MaterialIcons
                name="event"
                size={15}
                color={isScheduleMode ? '#000000' : '#FFFFFF'}
              />
              <ThemedText style={[
                styles.pickupLaterText,
                isScheduleMode && { color: '#000000' },
              ]}>
                {isScheduleMode
                  ? formatDisplayTime(scheduledDate)
                  : 'Pickup later'}
              </ThemedText>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color={isScheduleMode ? '#000000' : '#FFFFFF'}
              />
            </Pressable>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeIndicator}>
              <View style={[styles.routeDotGreen, { backgroundColor: UTOColors.success }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDotYellow, { backgroundColor: UTOColors.primary }]} />
            </View>
            <View style={styles.inputsContainer}>
              <View style={{ zIndex: 200 }}>
                <LocationInputAutocomplete
                  label="Pickup"
                  value={pickup}
                  placeholder="Enter pickup location"
                  onChangeText={setPickup}
                  onSelectLocation={handlePickupSelect}
                  type="pickup"
                />
              </View>
              <View style={{ zIndex: 100 }}>
                <LocationInputAutocomplete
                  label="Dropoff"
                  value={dropoff}
                  placeholder="Where to?"
                  onChangeText={setDropoff}
                  onSelectLocation={handleDropoffSelect}
                  type="dropoff"
                />
              </View>
            </View>
          </View>
        </View>

        {showVehicleSelector && dropoff ? (
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[
              styles.bottomSheet,
              Shadows.large,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}
          >
            <View style={styles.sheetHandle}>
              <View style={styles.handle} />
            </View>

            <ThemedText style={styles.sheetTitle}>Choose a ride</ThemedText>

            {/* ── Uber-style horizontal cab slider ── */}
            <View style={styles.sliderContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sliderContent}
                decelerationRate="fast"
              >
                {VEHICLE_OPTIONS.map((vehicle) => {
                  const isActive = selectedVehicle === vehicle.type;
                  return (
                    <Pressable
                      key={vehicle.type}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedVehicle(vehicle.type);
                      }}
                      style={[
                        styles.sliderCard,
                        isActive && styles.sliderCardActive,
                      ]}
                    >
                      <Image
                        source={
                          vehicle.type === 'saloon'
                            ? require('../../../assets/images/car-economy.png')
                            : require('../../../assets/images/car-van.png')
                        }
                        style={styles.sliderCarImage}
                        resizeMode="contain"
                      />
                      <ThemedText style={[
                        styles.sliderCardName,
                        isActive && styles.sliderCardNameActive,
                      ]}>
                        {vehicle.name}
                      </ThemedText>
                      <ThemedText style={[
                        styles.sliderCardDesc,
                        isActive && styles.sliderCardDescActive,
                      ]}>
                        {durationMin ? `${durationMin} min` : `${3 + Math.floor(Math.random() * 5)} min`} · {vehicle.passengers} seats
                      </ThemedText>
                      <ThemedText style={[
                        styles.sliderCardPrice,
                        isActive && styles.sliderCardPriceActive,
                      ]}>
                        {formatPrice(calculatePrice(vehicle.type))}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Scroll indicator dots */}
              <View style={styles.sliderDots}>
                {VEHICLE_OPTIONS.map((vehicle) => (
                  <View
                    key={vehicle.type}
                    style={[
                      styles.sliderDot,
                      selectedVehicle === vehicle.type && styles.sliderDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={{ paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#333333', marginBottom: 12, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Payment Method</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setPaymentMethod('cash')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: paymentMethod === 'cash' ? UTOColors.primary : '#333333',
                    }}
                  >
                    <MaterialIcons name="money" size={16} color={paymentMethod === 'cash' ? '#000000' : '#FFFFFF'} style={{ marginRight: 4 }} />
                    <Text style={{ color: paymentMethod === 'cash' ? '#000000' : '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Cash</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (savedCards.length > 0) {
                        // Card already saved — just switch
                        setPaymentMethod('card');
                      } else {
                        // No saved card — trigger save flow
                        handleSaveCard();
                      }
                    }}
                    disabled={isSavingCard}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: paymentMethod === 'card' ? UTOColors.primary : '#333333',
                      opacity: isSavingCard ? 0.6 : 1,
                    }}
                  >
                    {isSavingCard ? (
                      <ActivityIndicator size="small" color={paymentMethod === 'card' ? '#000000' : '#FFFFFF'} style={{ marginRight: 4 }} />
                    ) : (
                      <MaterialIcons name="credit-card" size={16} color={paymentMethod === 'card' ? '#000000' : '#FFFFFF'} style={{ marginRight: 4 }} />
                    )}
                    <Text style={{ color: paymentMethod === 'card' ? '#000000' : '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                      {isSavingCard ? 'Saving...' : savedCards.length > 0 ? 'Card' : 'Add Card'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Show saved card info when card payment is active */}
              {paymentMethod === 'card' && savedCards.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingLeft: 4 }}>
                  <MaterialIcons name="check-circle" size={14} color={UTOColors.success} style={{ marginRight: 6 }} />
                  <Text style={{ color: '#A0A0A0', fontSize: 13 }}>
                    {(savedCards[0].brand || 'Card').charAt(0).toUpperCase() + (savedCards[0].brand || 'card').slice(1)} •••• {savedCards[0].last4 || '****'}
                  </Text>
                  <Pressable
                    onPress={handleSaveCard}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Text style={{ color: UTOColors.primary, fontSize: 13, fontWeight: '600' }}>Change</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {(user?.walletBalance && user.walletBalance > 0) ? (
              <Pressable 
                onPress={() => setUseWalletBalance(!useWalletBalance)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#333333', marginBottom: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Use Wallet Balance</Text>
                    <Text style={{ fontSize: 13, color: '#A0A0A0' }}>Available: £{user.walletBalance.toFixed(2)}</Text>
                  </View>
                </View>
                <MaterialIcons 
                  name={useWalletBalance ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={useWalletBalance ? UTOColors.primary : "#A0A0A0"} 
                />
              </Pressable>
            ) : null}

            <AnimatedPressable
              onPress={handleRequestRide}
              onPressIn={() => (buttonScale.value = withSpring(0.98))}
              onPressOut={() => (buttonScale.value = withSpring(1))}
              disabled={isRequesting}
              style={[
                styles.requestButton,
                { backgroundColor: UTOColors.primary },
                buttonAnimatedStyle,
              ]}
            >
              {isRequesting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <ThemedText style={styles.requestButtonText}>
                    {isScheduleMode
                      ? `Schedule ${VEHICLE_OPTIONS.find((v) => v.type === selectedVehicle)?.name}`
                      : `Request ${VEHICLE_OPTIONS.find((v) => v.type === selectedVehicle)?.name}`}
                  </ThemedText>
                  <ThemedText style={styles.requestButtonPrice}>
                    {formatPrice(calculatePrice(selectedVehicle))}
                  </ThemedText>
                </>
              )}
            </AnimatedPressable>
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>

      {/* ── Choose a Time Modal ─────────────────────────────── */}
      <Modal
        visible={showChooseTimeModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChooseTimeModal(false)}
      >
        <View style={schedStyles.container}>
          {/* Header */}
          <View style={schedStyles.header}>
            <Pressable
              style={schedStyles.backBtn}
              onPress={() => setShowChooseTimeModal(false)}
            >
              <MaterialIcons name="arrow-back" size={24} color="#000000" />
            </Pressable>
            <Text style={schedStyles.headerTitle}>Choose a time</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Pickup time header */}
          <Text style={[schedStyles.headerTitle, { paddingLeft: 8, paddingTop: 8, paddingBottom: 0, fontSize: 16, color: '#6B7280' }]}>Pickup Time</Text>

          <ScrollView contentContainerStyle={schedStyles.body} showsVerticalScrollIndicator={false}>

            {/* ── Calendar date header (dark, like reference) ── */}
            <Pressable
              style={schedStyles.calHeaderBox}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <Text style={schedStyles.calHeaderYear}>{scheduledDate.getFullYear()}</Text>
              <Text style={schedStyles.calHeaderDate}>
                {scheduledDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </Pressable>

            {showCalendar && (
              <View style={schedStyles.calendarBox}>
                {/* Month nav — clamped to today..maxDate months */}
                <View style={schedStyles.calMonthRow}>
                  <Pressable
                    onPress={() => {
                      if (!canNavPrev) return;
                      setCalendarMonth(prev => {
                        let m = prev.month - 1;
                        let y = prev.year;
                        if (m < 0) { m = 11; y--; }
                        return { year: y, month: m };
                      });
                    }}
                    style={{ opacity: canNavPrev ? 1 : 0.2 }}
                  >
                    <MaterialIcons name="chevron-left" size={28} color="#111827" />
                  </Pressable>
                  <Text style={schedStyles.calMonthLabel}>
                    {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!canNavNext) return;
                      setCalendarMonth(prev => {
                        let m = prev.month + 1;
                        let y = prev.year;
                        if (m > 11) { m = 0; y++; }
                        return { year: y, month: m };
                      });
                    }}
                    style={{ opacity: canNavNext ? 1 : 0.2 }}
                  >
                    <MaterialIcons name="chevron-right" size={28} color="#111827" />
                  </Pressable>
                </View>
                {/* Day names */}
                <View style={schedStyles.calDayNames}>
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <Text key={i} style={schedStyles.calDayName}>{d}</Text>
                  ))}
                </View>
                {/* Calendar days */}
                {(() => {
                  const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
                  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
                  const cells: React.ReactElement[] = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<View key={`e${i}`} style={schedStyles.calCell} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const cellDate = new Date(calendarMonth.year, calendarMonth.month, d);
                    const isToday = cellDate.toDateString() === now.toDateString();
                    const isSelected = cellDate.toDateString() === scheduledDate.toDateString();
                    const isPast = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isTooFar = cellDate > maxDate;
                    const disabled = isPast || isTooFar;
                    cells.push(
                      <Pressable
                        key={d}
                        style={[
                          schedStyles.calCell,
                          isSelected && schedStyles.calCellSelected,
                          disabled && schedStyles.calCellDisabled,
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          setScheduledDate(prev => {
                            const nd = new Date(cellDate);
                            nd.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                            return nd;
                          });
                          setShowCalendar(false);
                        }}
                      >
                        <Text style={[
                          schedStyles.calCellText,
                          isSelected && schedStyles.calCellTextSelected,
                          disabled && schedStyles.calCellTextDisabled,
                        ]}>{d}</Text>
                      </Pressable>
                    );
                  }
                  return (
                    <View style={schedStyles.calGrid}>
                      {cells}
                    </View>
                  );
                })()}
                <View style={schedStyles.calFooter}>
                  <Pressable onPress={() => setShowCalendar(false)}>
                    <Text style={schedStyles.calCancel}>CANCEL</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowCalendar(false)}>
                    <Text style={schedStyles.calOk}>OK</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={schedStyles.divider} />

            {/* Time label: what the user is editing */}
            <Text style={schedStyles.timeLabel}>
              Pickup time
            </Text>

            {/* Time picker: hour/minute spinners */}
            <View style={schedStyles.timePickerRow}>
              {/* Hour */}
              <View style={schedStyles.spinnerCol}>
                <Pressable
                  onPress={() => setHourVal(h => (h - 1 + 24) % 24)}
                  hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                  <MaterialIcons name="keyboard-arrow-up" size={36} color="#333" />
                </Pressable>
                <Text style={schedStyles.spinnerVal}>
                  {String(hourVal).padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setHourVal(h => (h + 1) % 24)}
                  hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
                </Pressable>
              </View>
              <Text style={schedStyles.spinnerColon}>:</Text>
              {/* Minute — steps of 5 */}
              <View style={schedStyles.spinnerCol}>
                <Pressable
                  onPress={() => setMinuteVal(m => {
                    const next = ((Math.round(m / 5) * 5) - 5 + 60) % 60;
                    return next;
                  })}
                  hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                  <MaterialIcons name="keyboard-arrow-up" size={36} color="#333" />
                </Pressable>
                <Text style={schedStyles.spinnerVal}>
                  {String(minuteVal).padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setMinuteVal(m => {
                    const next = (Math.round(m / 5) * 5 + 5) % 60;
                    return next;
                  })}
                  hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={36} color="#333" />
                </Pressable>
              </View>
            </View>

            {/* Passengers & Luggage counters */}
            <View style={schedStyles.counterSection}>
              <View style={schedStyles.counterRow}>
                <View style={schedStyles.counterLeft}>
                  <MaterialIcons name="person" size={22} color="#374151" />
                  <Text style={schedStyles.counterLabel}>Passengers</Text>
                </View>
                <View style={schedStyles.counterControls}>
                  <Pressable style={[schedStyles.counterBtn, schedPassengers <= 1 && schedStyles.counterBtnDisabled]} onPress={() => { if (schedPassengers > 1) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedPassengers(p => p - 1); } }}>
                    <MaterialIcons name="remove" size={20} color={schedPassengers <= 1 ? '#D1D5DB' : '#374151'} />
                  </Pressable>
                  <Text style={schedStyles.counterValue}>{schedPassengers}</Text>
                  <Pressable style={[schedStyles.counterBtn, schedPassengers >= 8 && schedStyles.counterBtnDisabled]} onPress={() => { if (schedPassengers < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedPassengers(p => p + 1); } }}>
                    <MaterialIcons name="add" size={20} color={schedPassengers >= 8 ? '#D1D5DB' : '#374151'} />
                  </Pressable>
                </View>
              </View>
              <View style={schedStyles.counterDivider} />
              <View style={schedStyles.counterRow}>
                <View style={schedStyles.counterLeft}>
                  <MaterialIcons name="luggage" size={22} color="#374151" />
                  <Text style={schedStyles.counterLabel}>Luggage</Text>
                </View>
                <View style={schedStyles.counterControls}>
                  <Pressable style={[schedStyles.counterBtn, schedLuggage <= 0 && schedStyles.counterBtnDisabled]} onPress={() => { if (schedLuggage > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedLuggage(l => l - 1); } }}>
                    <MaterialIcons name="remove" size={20} color={schedLuggage <= 0 ? '#D1D5DB' : '#374151'} />
                  </Pressable>
                  <Text style={schedStyles.counterValue}>{schedLuggage}</Text>
                  <Pressable style={[schedStyles.counterBtn, schedLuggage >= 8 && schedStyles.counterBtnDisabled]} onPress={() => { if (schedLuggage < 8) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSchedLuggage(l => l + 1); } }}>
                    <MaterialIcons name="add" size={20} color={schedLuggage >= 8 ? '#D1D5DB' : '#374151'} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Estimated fare in schedule modal */}
            {distanceKm !== null && (
              <View style={schedStyles.oppositeCard}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                  Estimated Fare: £{calculatePrice(selectedVehicle).toFixed(2)}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {(distanceKm * 0.621371).toFixed(1)} miles · {VEHICLE_OPTIONS.find(v => v.type === selectedVehicle)?.name}
                </Text>
              </View>
            )}

            <View style={{ minHeight: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={schedStyles.footer}>
            <Text style={schedStyles.footerNote}>
              Free cancellation up to 3 hours before pickup. Cancellations within 3 hours of the scheduled pickup time will be charged the full journey fare. By confirming, you agree to this policy.
            </Text>
            <TouchableOpacity
              style={schedStyles.continueBtn}
              activeOpacity={0.85}
              onPress={async () => {
                // The final pickup time to validate & save
                const finalPickup = pickupTime;
                const now2 = new Date();

                if (finalPickup <= now2) {
                  Alert.alert('Invalid time', 'Pickup time must be in the future.');
                  return;
                }

                setIsScheduleMode(true);
                setShowChooseTimeModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                // Save to Supabase if locations are already entered
                if (pickup && dropoff && user?.id) {
                  try {
                    const fare = calculatePrice(selectedVehicle);
                    await fetch(`${getApiUrl()}/api/later-bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        riderId: user.id,
                        pickupAddress: pickup,
                        pickupLatitude: pickupLocation?.latitude || null,
                        pickupLongitude: pickupLocation?.longitude || null,
                        dropoffAddress: dropoff,
                        dropoffLatitude: dropoffLocation?.latitude || null,
                        dropoffLongitude: dropoffLocation?.longitude || null,
                        vehicleType: selectedVehicle,
                        estimatedFare: fare,
                        pickupAt: finalPickup.toISOString(),
                        passengers: schedPassengers,
                        luggage: schedLuggage,
                      }),
                    });
                    Alert.alert(
                      '🗓 Ride Scheduled!',
                      `Your ${VEHICLE_OPTIONS.find(v => v.type === selectedVehicle)?.name} ride has been scheduled.\n\nPickup: ${formatDisplayDate(finalPickup)} at ${formatDisplayTime(finalPickup)}\nEstimated Fare: £${fare.toFixed(2)}`,
                      [{ text: 'OK' }]
                    );
                  } catch (err) {
                    console.warn('Failed to save scheduled ride', err);
                  }
                }
              }}
            >
              <Text style={schedStyles.continueBtnText}>
                {distanceKm !== null
                  ? `Confirm · £${calculatePrice(selectedVehicle).toFixed(2)}`
                  : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
  },
  overlay: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: "#000000",
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  pickupLaterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  pickupLaterBtnActive: {
    backgroundColor: UTOColors.primary,
  },
  pickupLaterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  routeContainer: {
    flexDirection: "row",
  },
  routeIndicator: {
    width: 24,
    alignItems: "center",
    paddingTop: 18,
    marginRight: Spacing.sm,
  },
  routeDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 40,
    marginVertical: 4,
    backgroundColor: "#333333",
  },
  routeDotYellow: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputsContainer: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    backgroundColor: "#000000",
  },
  sheetHandle: {
    alignItems: "center",
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333333",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    color: "#FFFFFF",
  },
  /* ── Horizontal cab slider ── */
  sliderContainer: {
    marginBottom: Spacing.sm,
  },
  sliderContent: {
    paddingRight: Spacing.md,
    gap: 10,
  },
  sliderCard: {
    width: (Dimensions.get('window').width - Spacing.lg * 2 - 10) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  sliderCardActive: {
    borderColor: UTOColors.primary,
    backgroundColor: 'rgba(247, 201, 72, 0.1)',
  },
  sliderCarImage: {
    width: 80,
    height: 48,
    marginBottom: 6,
  },
  sliderCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sliderCardNameActive: {
    color: UTOColors.primary,
  },
  sliderCardDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  sliderCardDescActive: {
    color: '#D1D5DB',
  },
  sliderCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sliderCardPriceActive: {
    color: UTOColors.primary,
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555555',
  },
  sliderDotActive: {
    backgroundColor: UTOColors.primary,
    width: 18,
  },
  vehicleList: {
    maxHeight: 200,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  requestButtonText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "600",
  },
  requestButtonPrice: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "700",
  },
  pickupMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
});

// ── Scheduled Ride / Choose Time screen styles ──────────────────
const UTO_YELLOW = '#FFD000'; // UTO primary yellow

const schedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'left',
    paddingLeft: 8,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: UTO_YELLOW,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#000000',
  },
  body: {
    paddingBottom: 24,
  },
  // Dark calendar header (like reference screenshot)
  calHeaderBox: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 0,
  },
  calHeaderYear: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  calHeaderDate: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // White calendar body
  calendarBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  calDayNames: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    paddingVertical: 4,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelected: {
    backgroundColor: UTO_YELLOW,
    borderRadius: 32,
  },
  calCellDisabled: {
    opacity: 0.25,
  },
  calCellText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '400',
  },
  calCellTextSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  calCellTextDisabled: {
    color: '#9CA3AF',
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 28,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  calCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  calOk: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  // Time section
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 0,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: -8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  spinnerCol: {
    alignItems: 'center',
    width: 80,
  },
  spinnerVal: {
    fontSize: 52,
    fontWeight: '300',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 64,
  },
  spinnerColon: {
    fontSize: 44,
    fontWeight: '300',
    color: '#111827',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  // Opposite time card
  oppositeCard: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  oppositeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  oppositeSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  footerNote: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 18,
  },
  continueBtn: {
    backgroundColor: UTO_YELLOW,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  // Passengers & Luggage counters
  counterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  counterBtnDisabled: {
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  counterDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
});
