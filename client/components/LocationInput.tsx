import React from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

interface LocationInputProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  onPress?: () => void;
  type: "pickup" | "dropoff";
  editable?: boolean;
}

export function LocationInput({
  label,
  value,
  placeholder,
  onChangeText,
  onPress,
  type,
  editable = true,
}: LocationInputProps) {
  const { theme } = useTheme();

  const dotColor = type === "pickup" ? UTOColors.success : UTOColors.rider.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          editable={editable}
        />
      </View>
      {value ? (
        <Pressable onPress={() => onChangeText("")} style={styles.clearButton}>
          <Feather name="x" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
});
