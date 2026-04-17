import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useMode } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

interface ModeBadgeProps {
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ModeBadge({ onPress }: ModeBadgeProps) {
  const { currentMode, userRole } = useMode();
  const scale = useSharedValue(1);

  const isRiderMode = currentMode === "rider";
  const canSwitch = userRole === "both";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (canSwitch) {
      scale.value = withSpring(0.95);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.badge,
        { backgroundColor: UTOColors.primary },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Feather
          name={isRiderMode ? "navigation" : "truck"}
          size={12}
          color="#000000"
        />
        <ThemedText style={styles.text}>
          {isRiderMode ? "RIDER" : "DRIVER"}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  text: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
