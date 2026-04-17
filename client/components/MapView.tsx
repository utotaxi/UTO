// //client/components/MapView.tsx

// import React from "react";
// import { Platform, View, StyleSheet } from "react-native";
// import { MaterialIcons } from "@expo/vector-icons";

// import { ThemedText } from "@/components/ThemedText";
// import { useTheme } from "@/hooks/useTheme";
// import { UTOColors, Spacing } from "@/constants/theme";

// interface MapViewWrapperProps {
//   style?: any;
//   initialRegion?: {
//     latitude: number;
//     longitude: number;
//     latitudeDelta: number;
//     longitudeDelta: number;
//   };
//   showsUserLocation?: boolean;
//   showsMyLocationButton?: boolean;
//   customMapStyle?: any[];
//   children?: React.ReactNode;
// }

// interface MarkerWrapperProps {
//   coordinate: {
//     latitude: number;
//     longitude: number;
//   };
//   title?: string;
//   children?: React.ReactNode;
// }

// let RNMapView: any = null;
// let Marker: any = null;
// let Polyline: any = null;
// let PROVIDER_GOOGLE: any = null;

// if (Platform.OS !== "web") {
//   try {
//     const maps = require("react-native-maps");
//     RNMapView = maps.default;
//     Marker = maps.Marker;
//     Polyline = maps.Polyline;
//     PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
//   } catch (e) {
//     console.log("react-native-maps not available");
//   }
// }

// interface PolylineWrapperProps {
//   coordinates: { latitude: number; longitude: number }[];
//   strokeColor?: string;
//   strokeWidth?: number;
//   lineDashPattern?: number[];
// }

// export function MapViewWrapper({
//   style,
//   initialRegion,
//   showsUserLocation,
//   showsMyLocationButton,
//   customMapStyle,
//   children,
// }: MapViewWrapperProps) {
//   const { theme, isDark } = useTheme();

//   if (Platform.OS === "web" || !RNMapView) {
//     return (
//       <View style={[styles.webMapContainer, style, { backgroundColor: isDark ? "#1a1a2e" : "#e8f4f8" }]}>
//         <View style={styles.webMapContent}>
//           <View style={[styles.webMapIcon, { backgroundColor: theme.backgroundDefault }]}>
//             <MaterialIcons name="map" size={48} color={UTOColors.rider.primary} />
//           </View>
//           <ThemedText style={styles.webMapTitle}>Map View</ThemedText>
//           <ThemedText style={[styles.webMapSubtitle, { color: theme.textSecondary }]}>
//             For the best experience, use the Expo Go app on your mobile device
//           </ThemedText>
//         </View>
//         {initialRegion ? (
//           <View style={styles.webMapCoords}>
//             <ThemedText style={[styles.coordText, { color: theme.textSecondary }]}>
//               {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
//             </ThemedText>
//           </View>
//         ) : null}
//       </View>
//     );
//   }

//   return (
//     <RNMapView
//       style={style}
//       provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
//       initialRegion={initialRegion}
//       showsUserLocation={showsUserLocation}
//       showsMyLocationButton={showsMyLocationButton}
//       customMapStyle={customMapStyle}
//     >
//       {children}
//     </RNMapView>
//   );
// }

// export function MarkerWrapper({ coordinate, title, children }: MarkerWrapperProps) {
//   if (Platform.OS === "web" || !Marker) {
//     return null;
//   }

//   return (
//     <Marker coordinate={coordinate} title={title}>
//       {children}
//     </Marker>
//   );
// }

// export function PolylineWrapper({ 
//   coordinates, 
//   strokeColor = "#4285F4", 
//   strokeWidth = 4,
//   lineDashPattern,
// }: PolylineWrapperProps) {
//   if (Platform.OS === "web" || !Polyline || coordinates.length < 2) {
//     return null;
//   }

//   return (
//     <Polyline
//       coordinates={coordinates}
//       strokeColor={strokeColor}
//       strokeWidth={strokeWidth}
//       lineDashPattern={lineDashPattern}
//     />
//   );
// }

// const styles = StyleSheet.create({
//   webMapContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     position: "relative",
//   },
//   webMapContent: {
//     alignItems: "center",
//     padding: Spacing["3xl"],
//   },
//   webMapIcon: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: Spacing.xl,
//   },
//   webMapTitle: {
//     fontSize: 20,
//     fontWeight: "600",
//     marginBottom: Spacing.sm,
//   },
//   webMapSubtitle: {
//     fontSize: 14,
//     textAlign: "center",
//     maxWidth: 280,
//   },
//   webMapCoords: {
//     position: "absolute",
//     bottom: Spacing.lg,
//     paddingHorizontal: Spacing.md,
//     paddingVertical: Spacing.xs,
//     borderRadius: 4,
//   },
//   coordText: {
//     fontSize: 12,
//   },
// });

import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing } from "@/constants/theme";

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapViewWrapperProps {
  style?: any;
  mapRef?: React.RefObject<any>;
  initialRegion?: MapRegion;
  region?: MapRegion;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  customMapStyle?: any[];
  children?: React.ReactNode;
}

interface MarkerWrapperProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  anchor?: { x: number; y: number };
  flat?: boolean;
  image?: any;
  children?: React.ReactNode;
}

let RNMapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    RNMapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log("react-native-maps not available");
  }
}

interface PolylineWrapperProps {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

export function MapViewWrapper({
  style,
  mapRef,
  initialRegion,
  region,
  showsUserLocation,
  showsMyLocationButton,
  customMapStyle,
  children,
}: MapViewWrapperProps) {
  const { theme, isDark } = useTheme();

  if (Platform.OS === "web" || !RNMapView) {
    return (
      <View style={[styles.webMapContainer, style, { backgroundColor: isDark ? "#1a1a2e" : "#e8f4f8" }]}>
        <View style={styles.webMapContent}>
          <View style={[styles.webMapIcon, { backgroundColor: theme.backgroundDefault }]}>
            <MaterialIcons name="map" size={48} color={UTOColors.rider.primary} />
          </View>
          <ThemedText style={styles.webMapTitle}>Map View</ThemedText>
          <ThemedText style={[styles.webMapSubtitle, { color: theme.textSecondary }]}>
            For the best experience, use the Expo Go app on your mobile device
          </ThemedText>
        </View>
        {initialRegion ? (
          <View style={styles.webMapCoords}>
            <ThemedText style={[styles.coordText, { color: theme.textSecondary }]}>
              {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <RNMapView
      ref={mapRef}
      style={style}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      initialRegion={initialRegion}
      region={region}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
      customMapStyle={customMapStyle}
    >
      {children}
    </RNMapView>
  );
}

export function MarkerWrapper({ coordinate, title, anchor, flat, image, children }: MarkerWrapperProps) {
  if (Platform.OS === "web" || !Marker) {
    return null;
  }

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      anchor={anchor}
      flat={flat}
      image={image}
    >
      {children}
    </Marker>
  );
}

export function PolylineWrapper({
  coordinates,
  strokeColor = "#4285F4",
  strokeWidth = 4,
  lineDashPattern,
}: PolylineWrapperProps) {
  if (Platform.OS === "web" || !Polyline || coordinates.length < 2) {
    return null;
  }

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      lineDashPattern={lineDashPattern}
    />
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  webMapContent: {
    alignItems: "center",
    padding: Spacing["3xl"],
  },
  webMapIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  webMapTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  webMapSubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
  webMapCoords: {
    position: "absolute",
    bottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  coordText: {
    fontSize: 12,
  },
});
