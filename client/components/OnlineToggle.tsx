import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface OnlineToggleProps {
  isOnline: boolean;
  onToggle: (online: boolean) => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function OnlineToggle({ isOnline, onToggle }: OnlineToggleProps) {
  const { theme } = useTheme();
  const toggleProgress = useSharedValue(isOnline ? 1 : 0);

  React.useEffect(() => {
    toggleProgress.value = withSpring(isOnline ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isOnline]);

  const toggleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      [theme.backgroundSecondary, UTOColors.driver.primary]
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(toggleProgress.value * 28, {
          damping: 15,
          stiffness: 150,
        }),
      },
    ],
  }));

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(!isOnline);
  };

  return (
    <View style={[styles.container, Shadows.large, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.content}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? UTOColors.success : theme.textSecondary },
            ]}
          />
          <ThemedText style={styles.statusText}>
            {isOnline ? "You're Online" : "You're Offline"}
          </ThemedText>
        </View>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isOnline ? "Accepting ride requests" : "Go online to start earning"}
        </ThemedText>
      </View>

      <Pressable onPress={handleToggle}>
        <AnimatedView style={[styles.toggle, toggleStyle]}>
          <AnimatedView style={[styles.knob, knobStyle]} />
        </AnimatedView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginLeft: 18,
  },
  toggle: {
    width: 56,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
});
