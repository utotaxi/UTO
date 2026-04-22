// //client/screen/rider/ActivityScreen.tsx
// import React from "react";
// import { StyleSheet, View, FlatList, RefreshControl } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
// import Animated, { FadeInDown } from "react-native-reanimated";

// import { RideCard } from "@/components/RideCard";
// import { EmptyState } from "@/components/EmptyState";
// import { ThemedText } from "@/components/ThemedText";
// import { useRide } from "@/context/RideContext";
// import { Spacing } from "@/constants/theme";

// export default function ActivityScreen() {
//   const insets = useSafeAreaInsets();
//   const tabBarHeight = useBottomTabBarHeight();
//   const { rideHistory } = useRide();

//   const [refreshing, setRefreshing] = React.useState(false);

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     setRefreshing(false);
//   };

//   return (
//     <View style={styles.container}>
//       <Animated.View 
//         entering={FadeInDown.duration(400)} 
//         style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
//       >
//         <ThemedText style={styles.headerTitle}>Activity</ThemedText>
//       </Animated.View>

//       <FlatList
//         data={rideHistory}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => <RideCard ride={item} />}
//         contentContainerStyle={[
//           styles.listContent,
//           { paddingBottom: tabBarHeight + Spacing.xl },
//           rideHistory.length === 0 && styles.emptyListContent,
//         ]}
//         scrollIndicatorInsets={{ bottom: insets.bottom }}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor="#FFFFFF"
//           />
//         }
//         ListEmptyComponent={
//           <EmptyState
//             icon="history"
//             title="No rides yet"
//             description="When you take your first ride, it will appear here"
//           />
//         }
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#000000",
//   },
//   header: {
//     paddingHorizontal: Spacing.lg,
//     paddingBottom: Spacing.lg,
//   },
//   headerTitle: {
//     color: "#FFFFFF",
//     fontSize: 28,
//     fontWeight: "700",
//   },
//   listContent: {
//     paddingHorizontal: Spacing.lg,
//   },
//   emptyListContent: {
//     flex: 1,
//   },
// });


import React from "react";
import { StyleSheet, View, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, { FadeInDown } from "react-native-reanimated";

import { RideCard } from "@/components/RideCard";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useRide } from "@/context/RideContext";
import { Spacing } from "@/constants/theme";

export default function ActivityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { rideHistory, activeRide } = useRide();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeInDown.duration(400)} 
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <ThemedText style={styles.headerTitle}>Activity</ThemedText>
      </Animated.View>

      <FlatList
        data={rideHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RideCard ride={item} onRebook={() => navigation.navigate("RideRequest", { prefill: { pickup: item.pickupLocation, dropoff: item.dropoffLocation } })} />}
        ListHeaderComponent={activeRide ? (
          <View style={styles.ongoingSection}>
            <ThemedText style={styles.sectionTitle}>Ongoing</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Choose an activity to track progress</ThemedText>
            <RideCard ride={activeRide} onPress={() => navigation.navigate('RideTracking')} />
          </View>
        ) : null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          rideHistory.length === 0 && styles.emptyListContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="No rides yet"
            description="When you take your first ride, it will appear here"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  ongoingSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#999999",
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
});
