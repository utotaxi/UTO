import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing } from "@/constants/theme";

export function HeaderTitle() {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/car-economy.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <ThemedText style={[styles.title, { color: isDark ? "#FFFFFF" : "#000000" }]}>
        UTO
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    width: 32,
    height: 24,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
