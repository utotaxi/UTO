import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { MapViewWrapper, MarkerWrapper } from "@/components/MapView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICES = [
  { id: "trip", name: "Trip", icon: "directions-car", discount: null },
  { id: "reserve", name: "Reserve", icon: "event", discount: null },
  { id: "airport", name: "Airport", icon: "flight", discount: null },
];

interface NearbyDriver {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;
}

interface ServiceCardProps {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  discount: string | null;
  onPress: () => void;
  delay: number;
}

function ServiceCard({ id, name, icon, discount, onPress, delay }: ServiceCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.95))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={[styles.serviceCard, animatedStyle]}
      >
        {discount ? (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{discount}</ThemedText>
          </View>
        ) : null}
        <View style={styles.serviceIconContainer}>
          <MaterialIcons name={icon} size={28} color={UTOColors.primary} />
        </View>
        <ThemedText style={styles.serviceName}>{name}</ThemedText>
      </AnimatedPressable>
    </Animated.View>
  );
}

import { TopDownCarView } from "@/components/TopDownCarView";

interface DriverMarkerProps {
  heading?: number;
}

function DriverMarker({ heading = 0 }: DriverMarkerProps) {
  return (
    <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
      <TopDownCarView />
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function RiderHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [currentAddress, setCurrentAddress] = useState<string>("Locating...");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const mapRef = React.useRef<any>(null);



  // Fetch real nearby drivers from the API
  const fetchNearbyDrivers = async (coords: { latitude: number; longitude: number }) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/drivers/online", apiUrl).toString());
      const data = await response.json();

      const realDrivers: NearbyDriver[] = (data.drivers || []).map((driver: any) => ({
        id: driver.id,
        latitude: driver.currentLatitude || coords.latitude + (Math.random() - 0.5) * 0.01,
        longitude: driver.currentLongitude || coords.longitude + (Math.random() - 0.5) * 0.01,
        heading: Math.random() * 360,
      }));

      setNearbyDrivers(realDrivers);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      setNearbyDrivers([]);
    }
  };

  // Fetch user location and nearby drivers
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCurrentAddress("Location access denied");
          setIsLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);

        // Animate map to actual user location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 800);
        }

        // Reverse geocode for address
        const [address] = await Location.reverseGeocodeAsync(coords);

        if (address) {
          const parts = [];
          if (address.street) parts.push(address.street);
          if (address.city) parts.push(address.city);
          setCurrentAddress(parts.join(", ") || "Current Location");
        } else {
          setCurrentAddress("Current Location");
        }

        // Fetch real nearby drivers from API
        fetchNearbyDrivers(coords);
      } catch (error) {
        console.log("Location error:", error);
        setCurrentAddress("Unable to get location");
      }
      setIsLoadingLocation(false);
    })();
  }, []);

  // Animate simulated drivers slowly roaming around
  useEffect(() => {
    if (nearbyDrivers.length === 0) return;

    const interval = setInterval(() => {
      setNearbyDrivers((prevDrivers) =>
        prevDrivers.map((driver) => {
          // Generate a smooth random direction change (-15 to 15 degrees)
          const headingChange = (Math.random() - 0.5) * 30;
          let newHeading = (driver.heading || 0) + headingChange;
          if (newHeading < 0) newHeading += 360;
          if (newHeading >= 360) newHeading -= 360;

          // Convert heading to radians for movement
          const rad = (newHeading * Math.PI) / 180;

          // Speed: roughly 0.0001 deg per interval (~10 meters)
          const speed = 0.00008;

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


  const [showRideTimeModal, setShowRideTimeModal] = useState(false);
  const [selectedRideTime, setSelectedRideTime] = useState<'now' | 'later'>('now');

  const handleWhereToPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("RideRequest");
  };

  const handleServicePress = (serviceId: string) => {
    if (serviceId === "trip") {
      navigation.navigate("RideRequest");
    } else if (serviceId === "airport") {
      navigation.navigate("AirportBooking");
    } else if (serviceId === "reserve") {
      navigation.navigate("LaterRide");
    }
  };

  const handleSchedulePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRideTime('now');
    setShowRideTimeModal(true);
  };

  const handleRideTimeDone = () => {
    setShowRideTimeModal(false);
    if (selectedRideTime === 'later') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("LaterRide");
    } else {
      navigation.navigate("RideRequest");
    }
  };

  const mapRegion = userLocation
    ? {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }
    : {
      latitude: 51.5074, // Default to London
      longitude: -0.1278,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };

  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      {/* When do you need a ride? Modal */}
      <Modal
        visible={showRideTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRideTimeModal(false)}
      >
        <Pressable
          style={modalStyles.overlay}
          onPress={() => setShowRideTimeModal(false)}
        >
          <Pressable style={modalStyles.sheet} onPress={() => {}}>  
            <View style={modalStyles.handle} />
            <ThemedText style={modalStyles.title}>When do you need a ride?</ThemedText>

            {/* Now Option */}
            <Pressable
              style={modalStyles.option}
              onPress={() => setSelectedRideTime('now')}
            >
              <View style={modalStyles.optionLeft}>
                <MaterialIcons name="schedule" size={24} color="#FFFFFF" style={{ marginRight: 16 }} />
                <View>
                  <ThemedText style={modalStyles.optionTitle}>Now</ThemedText>
                  <ThemedText style={modalStyles.optionSubtitle}>Request a ride, hop-in, and go</ThemedText>
                </View>
              </View>
              <View style={[
                modalStyles.radioOuter,
                selectedRideTime === 'now' && modalStyles.radioOuterSelected
              ]}>
                {selectedRideTime === 'now' && <View style={modalStyles.radioInner} />}
              </View>
            </Pressable>

            {/* Separator */}
            <View style={modalStyles.separator} />

            {/* Later Option */}
            <Pressable
              style={modalStyles.option}
              onPress={() => setSelectedRideTime('later')}
            >
              <View style={modalStyles.optionLeft}>
                <MaterialIcons name="event" size={24} color="#FFFFFF" style={{ marginRight: 16 }} />
                <View>
                  <ThemedText style={modalStyles.optionTitle}>Later</ThemedText>
                  <ThemedText style={modalStyles.optionSubtitle}>Reserve for extra peace of mind</ThemedText>
                </View>
              </View>
              <View style={[
                modalStyles.radioOuter,
                selectedRideTime === 'later' && modalStyles.radioOuterSelected
              ]}>
                {selectedRideTime === 'later' && <View style={modalStyles.radioInner} />}
              </View>
            </Pressable>

            {/* Done Button */}
            <TouchableOpacity
              style={modalStyles.doneButton}
              onPress={handleRideTimeDone}
              activeOpacity={0.85}
            >
              <ThemedText style={modalStyles.doneButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Map showing user location and nearby drivers */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.mapContainer}>
          <MapViewWrapper
            style={styles.map}
            mapRef={mapRef}
            initialRegion={mapRegion}
            customMapStyle={isDark ? darkMapStyle : []}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* User location marker */}
            {userLocation ? (
              <MarkerWrapper
                coordinate={userLocation}
                title="You are here"
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerDot} />
                </View>
              </MarkerWrapper>
            ) : null}

            {/* Nearby drivers markers */}
            {nearbyDrivers.map((driver) => (
              <MarkerWrapper
                key={driver.id}
                coordinate={{
                  latitude: driver.latitude,
                  longitude: driver.longitude,
                }}
                title="Driver nearby"
              >
                <DriverMarker heading={driver.heading} />
              </MarkerWrapper>
            ))}
          </MapViewWrapper>


        </Animated.View>

        {/* Where to search bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Pressable onPress={handleWhereToPress} style={styles.searchBar}>
            <View style={styles.searchIconContainer}>
              <MaterialIcons name="search" size={20} color="#9CA3AF" />
            </View>
            <ThemedText style={styles.searchPlaceholder}>Where to?</ThemedText>
            <Pressable onPress={handleSchedulePress} style={styles.laterButton}>
              <MaterialIcons name="schedule" size={16} color="#FFFFFF" />
              <ThemedText style={styles.laterText}>Later</ThemedText>
            </Pressable>
          </Pressable>
        </Animated.View>

        {/* Current location card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Pressable style={styles.currentLocationCard}>
            <View style={styles.locationIconContainer}>
              <MaterialIcons name="my-location" size={18} color={UTOColors.success} />
            </View>
            <View style={styles.locationTextContainer}>
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={UTOColors.primary} />
              ) : (
                <>
                  <ThemedText style={styles.locationTitle} numberOfLines={1}>
                    {currentAddress}
                  </ThemedText>
                  <ThemedText style={styles.locationSubtitle}>Your current location</ThemedText>
                </>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* Suggestions header */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Pressable 
            style={styles.suggestionsHeader}
            onPress={() => navigation.navigate("ServicesTab")}
          >
            <ThemedText style={styles.sectionTitle}>Suggestions</ThemedText>
            <View style={styles.seeAllButton}>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </Pressable>
        </Animated.View>

        {/* Services grid */}
        <View style={styles.servicesGrid}>
          {SERVICES.map((service, index) => (
            <ServiceCard
              key={service.id}
              id={service.id}
              name={service.name}
              icon={service.icon as keyof typeof MaterialIcons.glyphMap}
              discount={service.discount}
              onPress={() => handleServicePress(service.id)}
              delay={400 + index * 50}
            />
          ))}
        </View>



      </ScrollView>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#000000',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -24,
  },
  doneButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

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
  mapContainer: {
    height: 200,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(66, 133, 244, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4285F4",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverMarkerContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  driverPulse: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UTOColors.primary,
  },
  driverMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: UTOColors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driversCountBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  driversCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.full,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    height: 52,
    marginBottom: Spacing.lg,
  },
  searchIconContainer: {
    marginRight: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 17,
    fontWeight: "500",
  },
  laterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333333",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  laterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  currentLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  locationSubtitle: {
    color: "#6B7280",
    fontSize: 14,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  seeAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  serviceCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3,
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  discountBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  serviceName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },

  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  offerSubtitle: {
    color: "#6B7280",
    fontSize: 14,
  },
  dismissButton: {
    padding: Spacing.sm,
  },
});
