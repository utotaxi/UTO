//client/components/LocationInputAutocomplete.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { api } from "@/lib/api";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

interface PlaceSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
  distance?: string;
  latitude?: number;
  longitude?: number;
}

interface LocationInputAutocompleteProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onSelectLocation: (location: PlaceSuggestion) => void;
  type: "pickup" | "dropoff";
  autoFocus?: boolean;
}

export function LocationInputAutocomplete({
  label,
  value,
  placeholder,
  onChangeText,
  onSelectLocation,
  type,
  autoFocus = false,
}: LocationInputAutocompleteProps) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<PlaceSuggestion[]>([]);
  const [sessionToken] = useState(() =>
    Math.random().toString(36).substring(7)
  );

  // Use a ref for the debounce timer so it persists across renders
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

  const loadSavedPlaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      const places = await api.savedPlaces.getAll(user.id);

      if (places && Array.isArray(places)) {
        const formatted: PlaceSuggestion[] = places.map((place: any) => ({
          id: place.id,
          description: place.address,
          mainText: place.name,
          secondaryText: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
        }));
        setSavedPlaces(formatted);
      }
    } catch (err) {
      console.error("Failed to load saved places:", err);
    }
  }, [user?.id]);

  // Load saved places on mount
  // useEffect(() => {
  //   if (user?.id) {
  //     loadSavedPlaces();
  //   }
  // }, [user?.id, loadSavedPlaces]);

  const fetchPlaceSuggestions = useCallback(async (input: string) => {
    try {
      setIsLoading(true);

      const baseUrl = getApiUrl();
      const url = `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(
        input
      )}&sessiontoken=${sessionToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          "Places API error:",
          response.status,
          response.statusText
        );
        setSuggestions([]);
        return;
      }

      const data = await response.json();

      if (data.predictions && data.predictions.length > 0) {
        const formattedSuggestions: PlaceSuggestion[] = data.predictions.map(
          (prediction: any) => ({
            id: prediction.place_id,
            description: prediction.description,
            mainText:
              prediction.structured_formatting?.main_text ||
              prediction.description,
            secondaryText:
              prediction.structured_formatting?.secondary_text || "",
          })
        );

        setSuggestions(formattedSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching place suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // If input is empty, show saved places only
      if (text.length === 0) {
        setSuggestions(savedPlaces);
        setIsLoading(false);
        return;
      }

      // If input has 2+ characters, fetch autocomplete suggestions
      if (text.length >= 2) {
        setIsLoading(true);
        // Debounce the API call — only fires 400ms after user stops typing
        debounceTimerRef.current = setTimeout(() => {
          fetchPlaceSuggestions(text);
        }, 400);
      } else {
        setSuggestions([]);
        setIsLoading(false);
      }
    },
    [onChangeText, fetchPlaceSuggestions, savedPlaces]
  );

  const handleSelectLocation = useCallback(async (location: PlaceSuggestion) => {
    onChangeText(location.secondaryText || location.mainText);

    // If it's a saved place, it already has coordinates
    const isSavedPlace = location.latitude && location.longitude;

    // Only fetch place details for non-saved places (Google Places API)
  if (!isSavedPlace) {
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/places/details/${location.id}`);
      const data = await response.json();

      if (data.result?.geometry?.location) {
        location.latitude = data.result.geometry.location.lat;
        location.longitude = data.result.geometry.location.lng;
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
    }

    onSelectLocation(location);
    setSuggestions([]);
    setIsFocused(false);
  }, [onChangeText, onSelectLocation]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show saved places when focused
    if (value.length === 0) {
      setSuggestions(savedPlaces);
    }
  }, [value, savedPlaces]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
    }, 250);
  }, []);

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => {
    const isSavedPlace = savedPlaces.some((p) => p.id === item.id);
    const iconName =
      isSavedPlace && item.mainText.toLowerCase() === "home"
        ? "home"
        : isSavedPlace && item.mainText.toLowerCase() === "work"
        ? "work"
        : isSavedPlace
        ? "place"
        : "map-pin";

    return (
      <Pressable
        onPress={() => handleSelectLocation(item)}
        style={[styles.suggestionItem,{ borderBottomColor: isDark ? "#333333" : theme.border },]}
      >
      <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
          {isSavedPlace ? (
            <MaterialIcons
              name={iconName as any}
              size={16}
              color={isDark ? "#9CA3AF" : theme.textSecondary}
            />
          ) : (
            <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
          )}
        </View>
        <View style={styles.suggestionText}>
          <ThemedText style={[ styles.mainText, { color: isDark ? "#FFFFFF" : theme.text } ]} >
            {item.secondaryText}
          </ThemedText>
          {item.secondaryText ? (
            <ThemedText
              style={[
                styles.secondaryText,
                { color: isDark ? "#9CA3AF" : theme.textSecondary },
              ]}
            >
              {item.mainText}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
            borderColor: isFocused
              ? UTOColors.primary
              : isDark
              ? "#333333"
              : theme.border,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.inputWrapper}>
          <ThemedText
            style={[
              styles.label,
              { color: isDark ? "#9CA3AF" : theme.textSecondary },
            ]}
          >
            {label.toUpperCase()}
          </ThemedText>
          <TextInput
            style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
            placeholder={placeholder}
            placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
            value={value}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoFocus={autoFocus}
          />
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={UTOColors.primary} />
        ) : null}
      </View>

      {isFocused && suggestions.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot,
            },
          ]}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestion}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
    margin: 0,
  },
  suggestionsContainer: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
  mainText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 13,
  },
  distance: {
    fontSize: 12,
    marginLeft: Spacing.sm,
  },
});
