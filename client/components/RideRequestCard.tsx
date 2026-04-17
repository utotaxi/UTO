import React, { useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UTOColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface RideRequestCardProps {
  riderName: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  pickupDistance: number;
  onAccept: () => void;
  onDecline: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RideRequestCard({
  riderName,
  pickupAddress,
  dropoffAddress,
  estimatedFare,
  pickupDistance,
  onAccept,
  onDecline,
}: RideRequestCardProps) {
  const { theme } = useTheme();
  const pulseScale = useSharedValue(1);
  const acceptScale = useSharedValue(1);
  const declineScale = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    pulseScale.value = withRepeat(
      withTiming(1.02, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const acceptAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: acceptScale.value }],
  }));

  const declineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: declineScale.value }],
  }));

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAccept();
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDecline();
  };

  return (
    <AnimatedView
      style={[
        styles.container,
        Shadows.large,
        { backgroundColor: theme.backgroundDefault },
        containerStyle,
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>New Ride Request</ThemedText>
        <ThemedText style={[styles.fare, { color: UTOColors.driver.primary }]}>
          £{estimatedFare.toFixed(2)}
        </ThemedText>
      </View>

      <View style={styles.riderSection}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="user" size={20} color={theme.textSecondary} />
        </View>
        <View style={styles.riderInfo}>
          <ThemedText style={styles.riderName}>{riderName}</ThemedText>
          <ThemedText style={[styles.pickupDistance, { color: theme.textSecondary }]}>
            {pickupDistance} mi away
          </ThemedText>
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
          <ThemedText style={styles.address} numberOfLines={1}>
            {pickupAddress}
          </ThemedText>
        </View>
        <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: UTOColors.driver.primary }]} />
          <ThemedText style={styles.address} numberOfLines={1}>
            {dropoffAddress}
          </ThemedText>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={handleDecline}
          onPressIn={() => (declineScale.value = withSpring(0.95))}
          onPressOut={() => (declineScale.value = withSpring(1))}
          style={[
            styles.button,
            styles.declineButton,
            { backgroundColor: theme.backgroundSecondary },
            declineAnimatedStyle,
          ]}
        >
          <Feather name="x" size={24} color={UTOColors.error} />
          <ThemedText style={[styles.buttonText, { color: UTOColors.error }]}>
            Decline
          </ThemedText>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleAccept}
          onPressIn={() => (acceptScale.value = withSpring(0.95))}
          onPressOut={() => (acceptScale.value = withSpring(1))}
          style={[
            styles.button,
            styles.acceptButton,
            { backgroundColor: UTOColors.driver.primary },
            acceptAnimatedStyle,
          ]}
        >
          <Feather name="check" size={24} color="#FFFFFF" />
          <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>
            Accept
          </ThemedText>
        </AnimatedPressable>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  fare: {
    fontSize: 22,
    fontWeight: "700",
  },
  riderSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  pickupDistance: {
    fontSize: 13,
  },
  routeSection: {
    marginBottom: Spacing.xl,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  routeLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: 4,
  },
  address: {
    fontSize: 14,
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  declineButton: {},
  acceptButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

// import React, { useEffect } from "react";
// import { StyleSheet, View, Pressable } from "react-native";
// import { Feather } from "@expo/vector-icons";
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withRepeat,
//   withTiming,
//   Easing,
// } from "react-native-reanimated";
// import * as Haptics from "expo-haptics";

// import { ThemedText } from "@/components/ThemedText";
// import { useTheme } from "@/hooks/useTheme";
// import { UTOColors, Spacing, BorderRadius, Shadows, formatPrice } from "@/constants/theme";

// interface RideRequestCardProps {
//   riderName: string;
//   pickupAddress: string;
//   dropoffAddress: string;
//   estimatedFare: number;
//   pickupDistance: number;
//   onAccept: () => void;
//   onDecline: () => void;
// }

// const AnimatedView = Animated.createAnimatedComponent(View);
// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// export function RideRequestCard({
//   riderName,
//   pickupAddress,
//   dropoffAddress,
//   estimatedFare,
//   pickupDistance,
//   onAccept,
//   onDecline,
// }: RideRequestCardProps) {
//   const { theme } = useTheme();
//   const pulseScale = useSharedValue(1);
//   const acceptScale = useSharedValue(1);
//   const declineScale = useSharedValue(1);

//   useEffect(() => {
//     Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
//     pulseScale.value = withRepeat(
//       withTiming(1.02, { duration: 500, easing: Easing.inOut(Easing.ease) }),
//       -1,
//       true
//     );
//   }, []);

//   const containerStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: pulseScale.value }],
//   }));

//   const acceptAnimatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: acceptScale.value }],
//   }));

//   const declineAnimatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: declineScale.value }],
//   }));

//   const handleAccept = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//     onAccept();
//   };

//   const handleDecline = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     onDecline();
//   };

//   return (
//     <AnimatedView
//       style={[
//         styles.container,
//         Shadows.large,
//         { backgroundColor: theme.backgroundDefault },
//         containerStyle,
//       ]}
//     >
//       <View style={styles.header}>
//         <ThemedText style={styles.title}>New Ride Request</ThemedText>
//         <ThemedText style={[styles.fare, { color: UTOColors.driver.primary }]}>
//           {formatPrice(estimatedFare)}
//         </ThemedText>
//       </View>

//       <View style={styles.riderSection}>
//         <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
//           <Feather name="user" size={20} color={theme.textSecondary} />
//         </View>
//         <View style={styles.riderInfo}>
//           <ThemedText style={styles.riderName}>{riderName}</ThemedText>
//           <ThemedText style={[styles.pickupDistance, { color: theme.textSecondary }]}>
//             {pickupDistance} km away
//           </ThemedText>
//         </View>
//       </View>

//       <View style={styles.routeSection}>
//         <View style={styles.routeRow}>
//           <View style={[styles.dot, { backgroundColor: UTOColors.success }]} />
//           <ThemedText style={styles.address} numberOfLines={1}>
//             {pickupAddress}
//           </ThemedText>
//         </View>
//         <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
//         <View style={styles.routeRow}>
//           <View style={[styles.dot, { backgroundColor: UTOColors.driver.primary }]} />
//           <ThemedText style={styles.address} numberOfLines={1}>
//             {dropoffAddress}
//           </ThemedText>
//         </View>
//       </View>

//       <View style={styles.buttonRow}>
//         <AnimatedPressable
//           onPress={handleDecline}
//           onPressIn={() => (declineScale.value = withSpring(0.95))}
//           onPressOut={() => (declineScale.value = withSpring(1))}
//           style={[
//             styles.button,
//             styles.declineButton,
//             { backgroundColor: theme.backgroundSecondary },
//             declineAnimatedStyle,
//           ]}
//         >
//           <Feather name="x" size={24} color={UTOColors.error} />
//           <ThemedText style={[styles.buttonText, { color: UTOColors.error }]}>
//             Decline
//           </ThemedText>
//         </AnimatedPressable>

//         <AnimatedPressable
//           onPress={handleAccept}
//           onPressIn={() => (acceptScale.value = withSpring(0.95))}
//           onPressOut={() => (acceptScale.value = withSpring(1))}
//           style={[
//             styles.button,
//             styles.acceptButton,
//             { backgroundColor: UTOColors.driver.primary },
//             acceptAnimatedStyle,
//           ]}
//         >
//           <Feather name="check" size={24} color="#FFFFFF" />
//           <ThemedText style={[styles.buttonText, { color: "#FFFFFF" }]}>
//             Accept
//           </ThemedText>
//         </AnimatedPressable>
//       </View>
//     </AnimatedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: Spacing.xl,
//     borderRadius: BorderRadius.xl,
//     marginHorizontal: Spacing.lg,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: Spacing.lg,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: "700",
//   },
//   fare: {
//     fontSize: 22,
//     fontWeight: "700",
//   },
//   riderSection: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: Spacing.lg,
//   },
//   avatar: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: Spacing.md,
//   },
//   riderInfo: {
//     flex: 1,
//   },
//   riderName: {
//     fontSize: 16,
//     fontWeight: "600",
//     marginBottom: 2,
//   },
//   pickupDistance: {
//     fontSize: 13,
//   },
//   routeSection: {
//     marginBottom: Spacing.xl,
//   },
//   routeRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   dot: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     marginRight: Spacing.md,
//   },
//   routeLine: {
//     width: 2,
//     height: 20,
//     marginLeft: 5,
//     marginVertical: 4,
//   },
//   address: {
//     fontSize: 14,
//     flex: 1,
//   },
//   buttonRow: {
//     flexDirection: "row",
//     gap: Spacing.md,
//   },
//   button: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: Spacing.lg,
//     borderRadius: BorderRadius.lg,
//     gap: Spacing.sm,
//   },
//   declineButton: {},
//   acceptButton: {},
//   buttonText: {
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
