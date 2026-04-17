// // //client/components/LocationInputAutocomplete.tsx
// // import React, { useState, useCallback } from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   TextInput,
// //   Pressable,
// //   FlatList,
// //   ActivityIndicator,
// // } from "react-native";
// // import { Feather } from "@expo/vector-icons";
// // import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// // import { ThemedText } from "@/components/ThemedText";
// // import { useTheme } from "@/hooks/useTheme";
// // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // interface PlaceSuggestion {
// //   id: string;
// //   description: string;
// //   mainText: string;
// //   secondaryText: string;
// //   distance?: string;
// // }

// // interface LocationInputAutocompleteProps {
// //   label: string;
// //   value: string;
// //   placeholder: string;
// //   onChangeText: (text: string) => void;
// //   onSelectLocation: (location: PlaceSuggestion) => void;
// //   type: "pickup" | "dropoff";
// //   autoFocus?: boolean;
// // }

// // const SAMPLE_LOCATIONS: PlaceSuggestion[] = [
// //   {
// //     id: "1",
// //     description: "Heathrow Airport, London",
// //     mainText: "Heathrow Airport",
// //     secondaryText: "London, UK",
// //     distance: "15 km",
// //   },
// //   {
// //     id: "2",
// //     description: "King's Cross Station, London",
// //     mainText: "King's Cross Station",
// //     secondaryText: "Euston Road, London",
// //     distance: "2.3 km",
// //   },
// //   {
// //     id: "3",
// //     description: "Oxford Street, London",
// //     mainText: "Oxford Street",
// //     secondaryText: "Westminster, London",
// //     distance: "1.8 km",
// //   },
// //   {
// //     id: "4",
// //     description: "Canary Wharf, London",
// //     mainText: "Canary Wharf",
// //     secondaryText: "Tower Hamlets, London",
// //     distance: "8.5 km",
// //   },
// //   {
// //     id: "5",
// //     description: "Buckingham Palace, London",
// //     mainText: "Buckingham Palace",
// //     secondaryText: "Westminster, London",
// //     distance: "3.2 km",
// //   },
// //   {
// //     id: "6",
// //     description: "Tower Bridge, London",
// //     mainText: "Tower Bridge",
// //     secondaryText: "Southwark, London",
// //     distance: "5.1 km",
// //   },
// //   {
// //     id: "7",
// //     description: "British Museum, London",
// //     mainText: "British Museum",
// //     secondaryText: "Bloomsbury, London",
// //     distance: "2.8 km",
// //   },
// //   {
// //     id: "8",
// //     description: "London Eye, South Bank",
// //     mainText: "London Eye",
// //     secondaryText: "South Bank, London",
// //     distance: "3.5 km",
// //   },
// // ];

// // export function LocationInputAutocomplete({
// //   label,
// //   value,
// //   placeholder,
// //   onChangeText,
// //   onSelectLocation,
// //   type,
// //   autoFocus = false,
// // }: LocationInputAutocompleteProps) {
// //   const { theme, isDark } = useTheme();
// //   const [isFocused, setIsFocused] = useState(false);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

// //   const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

// //   const handleTextChange = useCallback((text: string) => {
// //     onChangeText(text);
    
// //     if (text.length >= 2) {
// //       setIsLoading(true);
// //       setTimeout(() => {
// //         const filtered = SAMPLE_LOCATIONS.filter(
// //           (loc) =>
// //             loc.mainText.toLowerCase().includes(text.toLowerCase()) ||
// //             loc.secondaryText.toLowerCase().includes(text.toLowerCase())
// //         );
// //         setSuggestions(filtered.length > 0 ? filtered : SAMPLE_LOCATIONS.slice(0, 4));
// //         setIsLoading(false);
// //       }, 300);
// //     } else {
// //       setSuggestions([]);
// //     }
// //   }, [onChangeText]);

// //   const handleSelectLocation = (location: PlaceSuggestion) => {
// //     onChangeText(location.mainText);
// //     onSelectLocation(location);
// //     setSuggestions([]);
// //     setIsFocused(false);
// //   };

// //   const handleFocus = () => {
// //     setIsFocused(true);
// //     if (value.length === 0) {
// //       setSuggestions(SAMPLE_LOCATIONS.slice(0, 4));
// //     }
// //   };

// //   const handleBlur = () => {
// //     setTimeout(() => {
// //       setIsFocused(false);
// //       setSuggestions([]);
// //     }, 200);
// //   };

// //   const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
// //     <Pressable
// //       onPress={() => handleSelectLocation(item)}
// //       style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
// //     >
// //       <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
// //         <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
// //       </View>
// //       <View style={styles.suggestionText}>
// //         <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
// //           {item.mainText}
// //         </ThemedText>
// //         <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //           {item.secondaryText}
// //         </ThemedText>
// //       </View>
// //       {item.distance ? (
// //         <ThemedText style={[styles.distance, { color: isDark ? "#6B7280" : theme.textSecondary }]}>
// //           {item.distance}
// //         </ThemedText>
// //       ) : null}
// //     </Pressable>
// //   );

// //   return (
// //     <View style={styles.container}>
// //       <View
// //         style={[
// //           styles.inputContainer,
// //           {
// //             backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
// //             borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
// //           },
// //         ]}
// //       >
// //         <View style={[styles.dot, { backgroundColor: dotColor }]} />
// //         <View style={styles.inputWrapper}>
// //           <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //             {label.toUpperCase()}
// //           </ThemedText>
// //           <TextInput
// //             style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
// //             placeholder={placeholder}
// //             placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
// //             value={value}
// //             onChangeText={handleTextChange}
// //             onFocus={handleFocus}
// //             onBlur={handleBlur}
// //             autoFocus={autoFocus}
// //           />
// //         </View>
// //         {isLoading ? (
// //           <ActivityIndicator size="small" color={UTOColors.primary} />
// //         ) : null}
// //       </View>

// //       {isFocused && suggestions.length > 0 ? (
// //         <Animated.View
// //           entering={FadeIn.duration(200)}
// //           exiting={FadeOut.duration(150)}
// //           style={[
// //             styles.suggestionsContainer,
// //             { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
// //           ]}
// //         >
// //           <FlatList
// //             data={suggestions}
// //             keyExtractor={(item) => item.id}
// //             renderItem={renderSuggestion}
// //             keyboardShouldPersistTaps="handled"
// //             scrollEnabled={false}
// //           />
// //         </Animated.View>
// //       ) : null}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     marginBottom: Spacing.sm,
// //   },
// //   inputContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     paddingHorizontal: Spacing.lg,
// //     paddingVertical: Spacing.md,
// //     borderRadius: BorderRadius.md,
// //     borderWidth: 1,
// //   },
// //   dot: {
// //     width: 12,
// //     height: 12,
// //     borderRadius: 6,
// //     marginRight: Spacing.md,
// //   },
// //   inputWrapper: {
// //     flex: 1,
// //   },
// //   label: {
// //     fontSize: 10,
// //     fontWeight: "600",
// //     letterSpacing: 0.5,
// //     marginBottom: 2,
// //   },
// //   input: {
// //     fontSize: 16,
// //     fontWeight: "500",
// //     padding: 0,
// //     margin: 0,
// //   },
// //   suggestionsContainer: {
// //     marginTop: Spacing.xs,
// //     borderRadius: BorderRadius.md,
// //     overflow: "hidden",
// //     maxHeight: 280,
// //   },
// //   suggestionItem: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     padding: Spacing.md,
// //     borderBottomWidth: 1,
// //   },
// //   suggestionIcon: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginRight: Spacing.md,
// //   },
// //   suggestionText: {
// //     flex: 1,
// //   },
// //   mainText: {
// //     fontSize: 15,
// //     fontWeight: "500",
// //     marginBottom: 2,
// //   },
// //   secondaryText: {
// //     fontSize: 13,
// //   },
// //   distance: {
// //     fontSize: 12,
// //     marginLeft: Spacing.sm,
// //   },
// // });

// // //client/components/LocationInputAutocomplete.tsx
// // import React, { useState, useCallback } from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   TextInput,
// //   Pressable,
// //   FlatList,
// //   ActivityIndicator,
// // } from "react-native";
// // import { Feather } from "@expo/vector-icons";
// // import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// // import { ThemedText } from "@/components/ThemedText";
// // import { useTheme } from "@/hooks/useTheme";
// // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // interface PlaceSuggestion {
// //   id: string;
// //   description: string;
// //   mainText: string;
// //   secondaryText: string;
// //   distance?: string;
// // }

// // interface LocationInputAutocompleteProps {
// //   label: string;
// //   value: string;
// //   placeholder: string;
// //   onChangeText: (text: string) => void;
// //   onSelectLocation: (location: PlaceSuggestion) => void;
// //   type: "pickup" | "dropoff";
// //   autoFocus?: boolean;
// // }

// // export function LocationInputAutocomplete({
// //   label,
// //   value,
// //   placeholder,
// //   onChangeText,
// //   onSelectLocation,
// //   type,
// //   autoFocus = false,
// // }: LocationInputAutocompleteProps) {
// //   const { theme, isDark } = useTheme();
// //   const [isFocused, setIsFocused] = useState(false);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
// //   const [sessionToken] = useState(() => Math.random().toString(36).substring(7));

// //   const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

// //   const fetchPlaceSuggestions = async (input: string) => {
// //     try {
// //       setIsLoading(true);
      
// //       // Call your backend API endpoint
// //       const response = await fetch(
// //         `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${sessionToken}`
// //       );
      
// //       const data = await response.json();
      
// //       if (data.predictions) {
// //         const formattedSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
// //           id: prediction.place_id,
// //           description: prediction.description,
// //           mainText: prediction.structured_formatting?.main_text || prediction.description,
// //           secondaryText: prediction.structured_formatting?.secondary_text || "",
// //         }));
        
// //         setSuggestions(formattedSuggestions);
// //       } else {
// //         setSuggestions([]);
// //       }
// //     } catch (error) {
// //       console.error("Error fetching place suggestions:", error);
// //       setSuggestions([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleTextChange = useCallback((text: string) => {
// //     onChangeText(text);
    
// //     if (text.length >= 2) {
// //       // Debounce the API call
// //       const timeoutId = setTimeout(() => {
// //         fetchPlaceSuggestions(text);
// //       }, 300);
      
// //       return () => clearTimeout(timeoutId);
// //     } else {
// //       setSuggestions([]);
// //       setIsLoading(false);
// //     }
// //   }, [onChangeText]);

// //   const handleSelectLocation = async (location: PlaceSuggestion) => {
// //     onChangeText(location.mainText);
// //     onSelectLocation(location);
// //     setSuggestions([]);
// //     setIsFocused(false);
    
// //     // Optionally fetch place details here if you need coordinates
// //     // const details = await fetchPlaceDetails(location.id);
// //   };

// //   const handleFocus = () => {
// //     setIsFocused(true);
// //     // Don't show suggestions immediately on focus
// //   };

// //   const handleBlur = () => {
// //     setTimeout(() => {
// //       setIsFocused(false);
// //       setSuggestions([]);
// //     }, 200);
// //   };

// //   const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
// //     <Pressable
// //       onPress={() => handleSelectLocation(item)}
// //       style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
// //     >
// //       <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
// //         <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
// //       </View>
// //       <View style={styles.suggestionText}>
// //         <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
// //           {item.mainText}
// //         </ThemedText>
// //         <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //           {item.secondaryText}
// //         </ThemedText>
// //       </View>
// //     </Pressable>
// //   );

// //   return (
// //     <View style={styles.container}>
// //       <View
// //         style={[
// //           styles.inputContainer,
// //           {
// //             backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
// //             borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
// //           },
// //         ]}
// //       >
// //         <View style={[styles.dot, { backgroundColor: dotColor }]} />
// //         <View style={styles.inputWrapper}>
// //           <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //             {label.toUpperCase()}
// //           </ThemedText>
// //           <TextInput
// //             style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
// //             placeholder={placeholder}
// //             placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
// //             value={value}
// //             onChangeText={handleTextChange}
// //             onFocus={handleFocus}
// //             onBlur={handleBlur}
// //             autoFocus={autoFocus}
// //           />
// //         </View>
// //         {isLoading ? (
// //           <ActivityIndicator size="small" color={UTOColors.primary} />
// //         ) : null}
// //       </View>

// //       {isFocused && suggestions.length > 0 ? (
// //         <Animated.View
// //           entering={FadeIn.duration(200)}
// //           exiting={FadeOut.duration(150)}
// //           style={[
// //             styles.suggestionsContainer,
// //             { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
// //           ]}
// //         >
// //           <FlatList
// //             data={suggestions}
// //             keyExtractor={(item) => item.id}
// //             renderItem={renderSuggestion}
// //             keyboardShouldPersistTaps="handled"
// //             scrollEnabled={true}
// //             nestedScrollEnabled={true}
// //           />
// //         </Animated.View>
// //       ) : null}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     marginBottom: Spacing.sm,
// //     zIndex: 1000,
// //   },
// //   inputContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     paddingHorizontal: Spacing.lg,
// //     paddingVertical: Spacing.md,
// //     borderRadius: BorderRadius.md,
// //     borderWidth: 1,
// //   },
// //   dot: {
// //     width: 12,
// //     height: 12,
// //     borderRadius: 6,
// //     marginRight: Spacing.md,
// //   },
// //   inputWrapper: {
// //     flex: 1,
// //   },
// //   label: {
// //     fontSize: 10,
// //     fontWeight: "600",
// //     letterSpacing: 0.5,
// //     marginBottom: 2,
// //   },
// //   input: {
// //     fontSize: 16,
// //     fontWeight: "500",
// //     padding: 0,
// //     margin: 0,
// //   },
// //   suggestionsContainer: {
// //     marginTop: Spacing.xs,
// //     borderRadius: BorderRadius.md,
// //     overflow: "hidden",
// //     maxHeight: 280,
// //     shadowColor: "#000",
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.25,
// //     shadowRadius: 8,
// //     elevation: 5,
// //   },
// //   suggestionItem: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     padding: Spacing.md,
// //     borderBottomWidth: 1,
// //   },
// //   suggestionIcon: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginRight: Spacing.md,
// //   },
// //   suggestionText: {
// //     flex: 1,
// //   },
// //   mainText: {
// //     fontSize: 15,
// //     fontWeight: "500",
// //     marginBottom: 2,
// //   },
// //   secondaryText: {
// //     fontSize: 13,
// //   },
// //   distance: {
// //     fontSize: 12,
// //     marginLeft: Spacing.sm,
// //   },
// // });

// // //client/components/LocationInputAutocomplete.tsx
// // import React, { useState, useCallback } from "react";
// // import {
// //   StyleSheet,
// //   View,
// //   TextInput,
// //   Pressable,
// //   FlatList,
// //   ActivityIndicator,
// // } from "react-native";
// // import { Feather } from "@expo/vector-icons";
// // import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// // import { ThemedText } from "@/components/ThemedText";
// // import { useTheme } from "@/hooks/useTheme";
// // import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// // interface PlaceSuggestion {
// //   id: string;
// //   description: string;
// //   mainText: string;
// //   secondaryText: string;
// //   distance?: string;
// // }

// // interface LocationInputAutocompleteProps {
// //   label: string;
// //   value: string;
// //   placeholder: string;
// //   onChangeText: (text: string) => void;
// //   onSelectLocation: (location: PlaceSuggestion) => void;
// //   type: "pickup" | "dropoff";
// //   autoFocus?: boolean;
// // }

// // export function LocationInputAutocomplete({
// //   label,
// //   value,
// //   placeholder,
// //   onChangeText,
// //   onSelectLocation,
// //   type,
// //   autoFocus = false,
// // }: LocationInputAutocompleteProps) {
// //   const { theme, isDark } = useTheme();
// //   const [isFocused, setIsFocused] = useState(false);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
// //   const [sessionToken] = useState(() => Math.random().toString(36).substring(7));

// //   const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

// //   const fetchPlaceSuggestions = async (input: string) => {
// //     try {
// //       setIsLoading(true);
      
// //       // Get the API base URL
// //       const baseUrl = process.env.EXPO_PUBLIC_DOMAIN || '192.168.1.3:8081';
      
// //       // Call your backend API endpoint
// //       const response = await fetch(
// //         `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${sessionToken}`
// //       );
      
// //       const data = await response.json();
      
// //       if (data.predictions) {
// //         const formattedSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
// //           id: prediction.place_id,
// //           description: prediction.description,
// //           mainText: prediction.structured_formatting?.main_text || prediction.description,
// //           secondaryText: prediction.structured_formatting?.secondary_text || "",
// //         }));
        
// //         setSuggestions(formattedSuggestions);
// //       } else {
// //         setSuggestions([]);
// //       }
// //     } catch (error) {
// //       console.error("Error fetching place suggestions:", error);
// //       setSuggestions([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleTextChange = useCallback((text: string) => {
// //     onChangeText(text);
    
// //     if (text.length >= 2) {
// //       // Debounce the API call
// //       const timeoutId = setTimeout(() => {
// //         fetchPlaceSuggestions(text);
// //       }, 300);
      
// //       return () => clearTimeout(timeoutId);
// //     } else {
// //       setSuggestions([]);
// //       setIsLoading(false);
// //     }
// //   }, [onChangeText]);

// //   const handleSelectLocation = async (location: PlaceSuggestion) => {
// //     onChangeText(location.mainText);
// //     onSelectLocation(location);
// //     setSuggestions([]);
// //     setIsFocused(false);
    
// //     // Optionally fetch place details here if you need coordinates
// //     // const details = await fetchPlaceDetails(location.id);
// //   };

// //   const handleFocus = () => {
// //     setIsFocused(true);
// //     // Don't show suggestions immediately on focus
// //   };

// //   const handleBlur = () => {
// //     setTimeout(() => {
// //       setIsFocused(false);
// //       setSuggestions([]);
// //     }, 200);
// //   };

// //   const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
// //     <Pressable
// //       onPress={() => handleSelectLocation(item)}
// //       style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
// //     >
// //       <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
// //         <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
// //       </View>
// //       <View style={styles.suggestionText}>
// //         <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
// //           {item.mainText}
// //         </ThemedText>
// //         <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //           {item.secondaryText}
// //         </ThemedText>
// //       </View>
// //     </Pressable>
// //   );

// //   return (
// //     <View style={styles.container}>
// //       <View
// //         style={[
// //           styles.inputContainer,
// //           {
// //             backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
// //             borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
// //           },
// //         ]}
// //       >
// //         <View style={[styles.dot, { backgroundColor: dotColor }]} />
// //         <View style={styles.inputWrapper}>
// //           <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
// //             {label.toUpperCase()}
// //           </ThemedText>
// //           <TextInput
// //             style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
// //             placeholder={placeholder}
// //             placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
// //             value={value}
// //             onChangeText={handleTextChange}
// //             onFocus={handleFocus}
// //             onBlur={handleBlur}
// //             autoFocus={autoFocus}
// //           />
// //         </View>
// //         {isLoading ? (
// //           <ActivityIndicator size="small" color={UTOColors.primary} />
// //         ) : null}
// //       </View>

// //       {isFocused && suggestions.length > 0 ? (
// //         <Animated.View
// //           entering={FadeIn.duration(200)}
// //           exiting={FadeOut.duration(150)}
// //           style={[
// //             styles.suggestionsContainer,
// //             { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
// //           ]}
// //         >
// //           <FlatList
// //             data={suggestions}
// //             keyExtractor={(item) => item.id}
// //             renderItem={renderSuggestion}
// //             keyboardShouldPersistTaps="handled"
// //             scrollEnabled={true}
// //             nestedScrollEnabled={true}
// //           />
// //         </Animated.View>
// //       ) : null}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     marginBottom: Spacing.sm,
// //     zIndex: 1000,
// //   },
// //   inputContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     paddingHorizontal: Spacing.lg,
// //     paddingVertical: Spacing.md,
// //     borderRadius: BorderRadius.md,
// //     borderWidth: 1,
// //   },
// //   dot: {
// //     width: 12,
// //     height: 12,
// //     borderRadius: 6,
// //     marginRight: Spacing.md,
// //   },
// //   inputWrapper: {
// //     flex: 1,
// //   },
// //   label: {
// //     fontSize: 10,
// //     fontWeight: "600",
// //     letterSpacing: 0.5,
// //     marginBottom: 2,
// //   },
// //   input: {
// //     fontSize: 16,
// //     fontWeight: "500",
// //     padding: 0,
// //     margin: 0,
// //   },
// //   suggestionsContainer: {
// //     marginTop: Spacing.xs,
// //     borderRadius: BorderRadius.md,
// //     overflow: "hidden",
// //     maxHeight: 280,
// //     shadowColor: "#000",
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.25,
// //     shadowRadius: 8,
// //     elevation: 5,
// //   },
// //   suggestionItem: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     padding: Spacing.md,
// //     borderBottomWidth: 1,
// //   },
// //   suggestionIcon: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 18,
// //     alignItems: "center",
// //     justifyContent: "center",
// //     marginRight: Spacing.md,
// //   },
// //   suggestionText: {
// //     flex: 1,
// //   },
// //   mainText: {
// //     fontSize: 15,
// //     fontWeight: "500",
// //     marginBottom: 2,
// //   },
// //   secondaryText: {
// //     fontSize: 13,
// //   },
// //   distance: {
// //     fontSize: 12,
// //     marginLeft: Spacing.sm,
// //   },
// // });

// //client/components/LocationInputAutocomplete.tsx
// import React, { useState, useCallback } from "react";
// import {
//   StyleSheet,
//   View,
//   TextInput,
//   Pressable,
//   FlatList,
//   ActivityIndicator,
// } from "react-native";
// import { Feather } from "@expo/vector-icons";
// import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// import { ThemedText } from "@/components/ThemedText";
// import { useTheme } from "@/hooks/useTheme";
// import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// interface PlaceSuggestion {
//   id: string;
//   description: string;
//   mainText: string;
//   secondaryText: string;
//   distance?: string;
// }

// interface LocationInputAutocompleteProps {
//   label: string;
//   value: string;
//   placeholder: string;
//   onChangeText: (text: string) => void;
//   onSelectLocation: (location: PlaceSuggestion) => void;
//   type: "pickup" | "dropoff";
//   autoFocus?: boolean;
// }

// export function LocationInputAutocomplete({
//   label,
//   value,
//   placeholder,
//   onChangeText,
//   onSelectLocation,
//   type,
//   autoFocus = false,
// }: LocationInputAutocompleteProps) {
//   const { theme, isDark } = useTheme();
//   const [isFocused, setIsFocused] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
//   const [sessionToken] = useState(() => Math.random().toString(36).substring(7));

//   const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

//   const fetchPlaceSuggestions = async (input: string) => {
//     try {
//       setIsLoading(true);
      
//       // Get the API base URL - make sure it has http://
//       let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://localhost:3000';
      
//       // Add http:// if missing
//       if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
//         baseUrl = `http://${baseUrl}`;
//       }
      
//       const url = `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${sessionToken}`;
//       console.log('Fetching from:', url);
      
//       // Call your backend API endpoint
//       const response = await fetch(url);
      
//       if (!response.ok) {
//         console.error('API error:', response.status, response.statusText);
//         setSuggestions([]);
//         return;
//       }
      
//       const data = await response.json();
//       console.log('API Response:', JSON.stringify(data, null, 2));
      
//       if (data.predictions && data.predictions.length > 0) {
//         console.log('Found predictions:', data.predictions.length);
//         const formattedSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
//           id: prediction.place_id,
//           description: prediction.description,
//           mainText: prediction.structured_formatting?.main_text || prediction.description,
//           secondaryText: prediction.structured_formatting?.secondary_text || "",
//         }));
        
//         console.log('Formatted suggestions:', formattedSuggestions.length);
//         setSuggestions(formattedSuggestions);
//       } else {
//         console.log('No predictions in response');
//         setSuggestions([]);
//       }
//     } catch (error) {
//       console.error("Error fetching place suggestions:", error);
//       setSuggestions([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleTextChange = useCallback((text: string) => {
//     onChangeText(text);
    
//     if (text.length >= 2) {
//       // Debounce the API call
//       const timeoutId = setTimeout(() => {
//         fetchPlaceSuggestions(text);
//       }, 300);
      
//       return () => clearTimeout(timeoutId);
//     } else {
//       setSuggestions([]);
//       setIsLoading(false);
//     }
//   }, [onChangeText]);

//   const handleSelectLocation = async (location: PlaceSuggestion) => {
//     onChangeText(location.mainText);
//     onSelectLocation(location);
//     setSuggestions([]);
//     setIsFocused(false);
//   };

//   const handleFocus = () => {
//     setIsFocused(true);
//   };

//   const handleBlur = () => {
//     setTimeout(() => {
//       setIsFocused(false);
//       setSuggestions([]);
//     }, 200);
//   };

//   const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
//     <Pressable
//       onPress={() => handleSelectLocation(item)}
//       style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
//     >
//       <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
//         <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
//       </View>
//       <View style={styles.suggestionText}>
//         <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
//           {item.mainText}
//         </ThemedText>
//         <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
//           {item.secondaryText}
//         </ThemedText>
//       </View>
//     </Pressable>
//   );

//   return (
//     <View style={styles.container}>
//       <View
//         style={[
//           styles.inputContainer,
//           {
//             backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
//             borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
//           },
//         ]}
//       >
//         <View style={[styles.dot, { backgroundColor: dotColor }]} />
//         <View style={styles.inputWrapper}>
//           <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
//             {label.toUpperCase()}
//           </ThemedText>
//           <TextInput
//             style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
//             placeholder={placeholder}
//             placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
//             value={value}
//             onChangeText={handleTextChange}
//             onFocus={handleFocus}
//             onBlur={handleBlur}
//             autoFocus={autoFocus}
//           />
//         </View>
//         {isLoading ? (
//           <ActivityIndicator size="small" color={UTOColors.primary} />
//         ) : null}
//       </View>

//       {isFocused && suggestions.length > 0 ? (
//         <Animated.View
//           entering={FadeIn.duration(200)}
//           exiting={FadeOut.duration(150)}
//           style={[
//             styles.suggestionsContainer,
//             { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
//           ]}
//         >
//           <FlatList
//             data={suggestions}
//             keyExtractor={(item) => item.id}
//             renderItem={renderSuggestion}
//             keyboardShouldPersistTaps="handled"
//             scrollEnabled={true}
//             nestedScrollEnabled={true}
//           />
//         </Animated.View>
//       ) : null}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginBottom: Spacing.sm,
//     zIndex: 1000,
//   },
//   inputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: Spacing.lg,
//     paddingVertical: Spacing.md,
//     borderRadius: BorderRadius.md,
//     borderWidth: 1,
//   },
//   dot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     marginRight: Spacing.md,
//   },
//   inputWrapper: {
//     flex: 1,
//   },
//   label: {
//     fontSize: 10,
//     fontWeight: "600",
//     letterSpacing: 0.5,
//     marginBottom: 2,
//   },
//   input: {
//     fontSize: 16,
//     fontWeight: "500",
//     padding: 0,
//     margin: 0,
//   },
//   suggestionsContainer: {
//     marginTop: Spacing.xs,
//     borderRadius: BorderRadius.md,
//     overflow: "hidden",
//     maxHeight: 280,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   suggestionItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: Spacing.md,
//     borderBottomWidth: 1,
//   },
//   suggestionIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: Spacing.md,
//   },
//   suggestionText: {
//     flex: 1,
//   },
//   mainText: {
//     fontSize: 15,
//     fontWeight: "500",
//     marginBottom: 2,
//   },
//   secondaryText: {
//     fontSize: 13,
//   },
//   distance: {
//     fontSize: 12,
//     marginLeft: Spacing.sm,
//   },
// });
// //client/components/LocationInputAutocomplete.tsx
// import React, { useState, useCallback } from "react";
// import {
//   StyleSheet,
//   View,
//   TextInput,
//   Pressable,
//   FlatList,
//   ActivityIndicator,
// } from "react-native";
// import { Feather } from "@expo/vector-icons";
// import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// import { ThemedText } from "@/components/ThemedText";
// import { useTheme } from "@/hooks/useTheme";
// import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// interface PlaceSuggestion {
//   id: string;
//   description: string;
//   mainText: string;
//   secondaryText: string;
//   distance?: string;
//   latitude?: number;
//   longitude?: number;
// }

// interface LocationInputAutocompleteProps {
//   label: string;
//   value: string;
//   placeholder: string;
//   onChangeText: (text: string) => void;
//   onSelectLocation: (location: PlaceSuggestion) => void;
//   type: "pickup" | "dropoff";
//   autoFocus?: boolean;
// }

// export function LocationInputAutocomplete({
//   label,
//   value,
//   placeholder,
//   onChangeText,
//   onSelectLocation,
//   type,
//   autoFocus = false,
// }: LocationInputAutocompleteProps) {
//   const { theme, isDark } = useTheme();
//   const [isFocused, setIsFocused] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
//   const [sessionToken] = useState(() => Math.random().toString(36).substring(7));

//   const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

//   const fetchPlaceSuggestions = async (input: string) => {
//     try {
//       setIsLoading(true);
      
//       // Get the API base URL
//       let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.3:3000';
      
//       // Add http:// if missing
//       if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
//         baseUrl = `http://${baseUrl}`;
//       }
      
//       const url = `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${sessionToken}`;
      
//       // Call your backend API endpoint
//       const response = await fetch(url);
      
//       if (!response.ok) {
//         console.error('API error:', response.status, response.statusText);
//         setSuggestions([]);
//         return;
//       }
      
//       const data = await response.json();
      
//       if (data.predictions && data.predictions.length > 0) {
//         const formattedSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
//           id: prediction.place_id,
//           description: prediction.description,
//           mainText: prediction.structured_formatting?.main_text || prediction.description,
//           secondaryText: prediction.structured_formatting?.secondary_text || "",
//         }));
        
//         setSuggestions(formattedSuggestions);
//       } else {
//         setSuggestions([]);
//       }
//     } catch (error) {
//       console.error("Error fetching place suggestions:", error);
//       setSuggestions([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleTextChange = useCallback((text: string) => {
//     onChangeText(text);
    
//     if (text.length >= 2) {
//       // Debounce the API call
//       const timeoutId = setTimeout(() => {
//         fetchPlaceSuggestions(text);
//       }, 300);
      
//       return () => clearTimeout(timeoutId);
//     } else {
//       setSuggestions([]);
//       setIsLoading(false);
//     }
//   }, [onChangeText]);

//   const handleSelectLocation = async (location: PlaceSuggestion) => {
//     onChangeText(location.mainText);
    
//     // Fetch place details to get coordinates
//     try {
//       let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.3:3000';
//       if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
//         baseUrl = `http://${baseUrl}`;
//       }
      
//       const response = await fetch(`${baseUrl}/api/places/details/${location.id}`);
//       const data = await response.json();
      
//       if (data.result?.geometry?.location) {
//         location.latitude = data.result.geometry.location.lat;
//         location.longitude = data.result.geometry.location.lng;
//       }
//     } catch (error) {
//       console.error("Error fetching place details:", error);
//     }
    
//     onSelectLocation(location);
//     setSuggestions([]);
//     setIsFocused(false);
//   };

//   const handleFocus = () => {
//     setIsFocused(true);
//   };

//   const handleBlur = () => {
//     setTimeout(() => {
//       setIsFocused(false);
//       setSuggestions([]);
//     }, 200);
//   };

//   const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
//     <Pressable
//       onPress={() => handleSelectLocation(item)}
//       style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
//     >
//       <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
//         <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
//       </View>
//       <View style={styles.suggestionText}>
//         <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
//           {item.mainText}
//         </ThemedText>
//         <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
//           {item.secondaryText}
//         </ThemedText>
//       </View>
//     </Pressable>
//   );

//   return (
//     <View style={styles.container}>
//       <View
//         style={[
//           styles.inputContainer,
//           {
//             backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
//             borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
//           },
//         ]}
//       >
//         <View style={[styles.dot, { backgroundColor: dotColor }]} />
//         <View style={styles.inputWrapper}>
//           <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
//             {label.toUpperCase()}
//           </ThemedText>
//           <TextInput
//             style={[styles.input, { color: isDark ? "#FFFFFF" : theme.text }]}
//             placeholder={placeholder}
//             placeholderTextColor={isDark ? "#6B7280" : theme.textSecondary}
//             value={value}
//             onChangeText={handleTextChange}
//             onFocus={handleFocus}
//             onBlur={handleBlur}
//             autoFocus={autoFocus}
//           />
//         </View>
//         {isLoading ? (
//           <ActivityIndicator size="small" color={UTOColors.primary} />
//         ) : null}
//       </View>

//       {isFocused && suggestions.length > 0 ? (
//         <Animated.View
//           entering={FadeIn.duration(200)}
//           exiting={FadeOut.duration(150)}
//           style={[
//             styles.suggestionsContainer,
//             { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
//           ]}
//         >
//           <FlatList
//             data={suggestions}
//             keyExtractor={(item) => item.id}
//             renderItem={renderSuggestion}
//             keyboardShouldPersistTaps="handled"
//             scrollEnabled={true}
//             nestedScrollEnabled={true}
//           />
//         </Animated.View>
//       ) : null}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginBottom: Spacing.sm,
//     zIndex: 1000,
//   },
//   inputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: Spacing.lg,
//     paddingVertical: Spacing.md,
//     borderRadius: BorderRadius.md,
//     borderWidth: 1,
//   },
//   dot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     marginRight: Spacing.md,
//   },
//   inputWrapper: {
//     flex: 1,
//   },
//   label: {
//     fontSize: 10,
//     fontWeight: "600",
//     letterSpacing: 0.5,
//     marginBottom: 2,
//   },
//   input: {
//     fontSize: 16,
//     fontWeight: "500",
//     padding: 0,
//     margin: 0,
//   },
//   suggestionsContainer: {
//     marginTop: Spacing.xs,
//     borderRadius: BorderRadius.md,
//     overflow: "hidden",
//     maxHeight: 280,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   suggestionItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: Spacing.md,
//     borderBottomWidth: 1,
//   },
//   suggestionIcon: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: Spacing.md,
//   },
//   suggestionText: {
//     flex: 1,
//   },
//   mainText: {
//     fontSize: 15,
//     fontWeight: "500",
//     marginBottom: 2,
//   },
//   secondaryText: {
//     fontSize: 13,
//   },
//   distance: {
//     fontSize: 12,
//     marginLeft: Spacing.sm,
//   },
// });

//client/components/LocationInputAutocomplete.tsx - UPDATED
import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
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
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [sessionToken] = useState(() => Math.random().toString(36).substring(7));

  const dotColor = type === "pickup" ? UTOColors.success : UTOColors.primary;

  const fetchPlaceSuggestions = async (input: string) => {
    try {
      setIsLoading(true);
      
      // Get the API base URL - use the IP that the server shows!
      let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.100:3000';
      
      // Add http:// if missing
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      
      const url = `${baseUrl}/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${sessionToken}`;
      
      console.log('🔍 Fetching from:', url);
      
      // Call your backend API endpoint
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ API error:', response.status, response.statusText);
        setSuggestions([]);
        return;
      }
      
      const data = await response.json();
      
      console.log('✅ API Response:', data);
      
      if (data.predictions && data.predictions.length > 0) {
        const formattedSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || "",
        }));
        
        console.log('✅ Setting', formattedSuggestions.length, 'suggestions');
        setSuggestions(formattedSuggestions);
      } else {
        console.log('⚠️ No predictions found');
        setSuggestions([]);
      }
    } catch (error) {
      console.error("❌ Error fetching place suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);
    
    if (text.length >= 2) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchPlaceSuggestions(text);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [onChangeText]);

  const handleSelectLocation = async (location: PlaceSuggestion) => {
    onChangeText(location.mainText);
    
    // Fetch place details to get coordinates
    try {
      let baseUrl = process.env.EXPO_PUBLIC_DOMAIN || 'http://192.168.1.100:3000';
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      
      const response = await fetch(`${baseUrl}/api/places/details/${location.id}`);
      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        location.latitude = data.result.geometry.location.lat;
        location.longitude = data.result.geometry.location.lng;
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
    
    onSelectLocation(location);
    setSuggestions([]);
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
    }, 200);
  };

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
    <Pressable
      onPress={() => handleSelectLocation(item)}
      style={[styles.suggestionItem, { borderBottomColor: isDark ? "#333333" : theme.border }]}
    >
      <View style={[styles.suggestionIcon, { backgroundColor: isDark ? "#333333" : theme.backgroundDefault }]}>
        <Feather name="map-pin" size={16} color={isDark ? "#9CA3AF" : theme.textSecondary} />
      </View>
      <View style={styles.suggestionText}>
        <ThemedText style={[styles.mainText, { color: isDark ? "#FFFFFF" : theme.text }]}>
          {item.mainText}
        </ThemedText>
        <ThemedText style={[styles.secondaryText, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
          {item.secondaryText}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? "#1A1A1A" : theme.backgroundDefault,
            borderColor: isFocused ? UTOColors.primary : (isDark ? "#333333" : theme.border),
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.inputWrapper}>
          <ThemedText style={[styles.label, { color: isDark ? "#9CA3AF" : theme.textSecondary }]}>
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
            { backgroundColor: isDark ? "#1A1A1A" : theme.backgroundRoot },
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