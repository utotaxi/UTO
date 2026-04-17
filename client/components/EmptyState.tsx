import React from "react";
import { StyleSheet, View, Image, ImageSourcePropType } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

interface EmptyStateProps {
  image?: ImageSourcePropType;
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
}

export function EmptyState({ image, icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : icon ? (
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={48} color="#6B7280" />
        </View>
      ) : null}
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.description}>{description}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.sm,
    color: "#FFFFFF",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    color: "#6B7280",
  },
});
