// //client/components/MapView.native.tsx

// import React from "react";
// import { Platform, StyleSheet } from "react-native";
// import RNMapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

// export function MapViewWrapper({
//   style,
//   initialRegion,
//   showsUserLocation,
//   showsMyLocationButton,
//   customMapStyle,
//   children,
// }: MapViewWrapperProps) {
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
//   return (
//     <Marker coordinate={coordinate} title={title}>
//       {children}
//     </Marker>
//   );
// }


//client/components/MapView.native.tsx - COMPLETE WITH POLYLINE

import React from "react";
import { Platform } from "react-native";
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

interface MapViewWrapperProps {
  style?: any;
  mapRef?: React.RefObject<any>;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  region?: {
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
  description?: string;
  children?: React.ReactNode;
}

interface PolylineWrapperProps {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
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

export function MarkerWrapper({ 
  coordinate, 
  title, 
  description,
  children 
}: MarkerWrapperProps) {
  return (
    <Marker 
      coordinate={coordinate} 
      title={title}
      description={description}
    >
      {children}
    </Marker>
  );
}

// ✅ ADD THIS - THE MISSING POLYLINE COMPONENT!
export function PolylineWrapper({ 
  coordinates, 
  strokeColor = "#000000", 
  strokeWidth = 5,
  lineDashPattern,
}: PolylineWrapperProps) {
  if (!coordinates || coordinates.length < 2) {
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