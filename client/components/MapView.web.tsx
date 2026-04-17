import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing } from "@/constants/theme";

interface MapViewWrapperProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
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
  children?: React.ReactNode;
}

export function MapViewWrapper({
  style,
  initialRegion,
  children,
}: MapViewWrapperProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.webMapContainer, style, { backgroundColor: isDark ? "#1a1a2e" : "#e8f4f8" }]}>
      <View style={styles.webMapContent}>
        <View style={[styles.webMapIcon, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="map" size={48} color={UTOColors.rider.primary} />
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

export function MarkerWrapper({ coordinate, title, children }: MarkerWrapperProps) {
  return null;
}

interface PolylineWrapperProps {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

export function PolylineWrapper({ coordinates, strokeColor, strokeWidth, lineDashPattern }: PolylineWrapperProps) {
  return null;
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
