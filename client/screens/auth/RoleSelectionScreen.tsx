import React from "react";
import { StyleSheet, View, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useMode, UserRole } from "@/context/ModeContext";
import { UTOColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  image: any;
  delay: number;
  onPress: () => void;
}

function RoleCard({
  title,
  description,
  icon,
  color,
  image,
  delay,
  onPress,
}: RoleCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={[
          styles.roleCard,
          Shadows.medium,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <View style={styles.roleCardContent}>
          <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
            <Feather name={icon} size={28} color={color} />
          </View>
          <View style={styles.roleTextContent}>
            <ThemedText style={styles.roleTitle}>{title}</ThemedText>
            <ThemedText style={[styles.roleDescription, { color: theme.textSecondary }]}>
              {description}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={24} color={theme.textSecondary} />
        </View>
        <Image source={image} style={styles.roleImage} resizeMode="cover" />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RoleSelectionScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setUserRole } = useMode();

  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    navigation.replace("Main");
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <ThemedText style={styles.title}>How will you use UTO?</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            You can always change this later in settings
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <RoleCard
            title="Ride with UTO"
            description="Request rides and get to your destination safely"
            icon="navigation"
            color={UTOColors.rider.primary}
            image={require("../../../assets/images/rider-welcome.png")}
            delay={200}
            onPress={() => handleSelectRole("rider")}
          />

          <RoleCard
            title="Drive with UTO"
            description="Earn money by giving rides on your schedule"
            icon="truck"
            color={UTOColors.driver.primary}
            image={require("../../../assets/images/driver-welcome.png")}
            delay={300}
            onPress={() => handleSelectRole("driver")}
          />

          <RoleCard
            title="Both"
            description="Switch between riding and driving anytime"
            icon="repeat"
            color={UTOColors.success}
            image={require("../../../assets/images/icon.png")}
            delay={400}
            onPress={() => handleSelectRole("both")}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: Spacing["3xl"],
  },
  cardsContainer: {
    gap: Spacing.lg,
  },
  roleCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  roleCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  roleImage: {
    width: "100%",
    height: 100,
  },
});
