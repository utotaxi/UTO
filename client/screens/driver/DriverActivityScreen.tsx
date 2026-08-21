// import React, { useEffect, useState } from "react";
// import { StyleSheet, View, FlatList, RefreshControl } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
// import Animated, { FadeInDown } from "react-native-reanimated";

// import { TripCard } from "@/components/TripCard";
// import { EmptyState } from "@/components/EmptyState";
// import { ThemedText } from "@/components/ThemedText";
// import { useDriver } from "@/context/DriverContext";
// import { Spacing } from "@/constants/theme";

// export default function DriverActivityScreen({ navigation }: any) {
//     const insets = useSafeAreaInsets();
//     const tabBarHeight = useBottomTabBarHeight();
//     const { tripHistory, activeRide, refreshData } = useDriver();
//     const [refreshing, setRefreshing] = React.useState(false);

//     useEffect(() => {
//         // Fetch active rides when screen mounts
//         console.log('DriverActivityScreen mounted, fetching active rides and trip history');
//         refreshData().catch(console.warn);
//     }, []);

//     const onRefresh = async () => {
//         console.log('DriverActivityScreen refreshing data...');
//         setRefreshing(true);
//         try {
//             await refreshData();
//             console.log('DriverActivityScreen data refreshed successfully');
//         } catch (e) {
//             console.warn("Failed to refresh:", e);
//         }
//         setRefreshing(false);
//     };

//     // Log whenever activeRide or tripHistory changes
//     useEffect(() => {
//         console.log('DriverActivityScreen state updated:', {
//             activeRideId: activeRide?.id || null,
//             activeRideRider: activeRide?.riderName || null,
//             tripHistoryCount: tripHistory?.length || 0,
//             firstCompletedTrip: tripHistory?.[0]?.riderName || null,
//         });
//     }, [activeRide, tripHistory]);
//     console.log('Rendering DriverActivityScreen with activeRide:', activeRide, 'and tripHistory:', tripHistory);
//     return (
//         <View style={styles.container}>
//             {/* <Animated.View
//         entering={FadeInDown.duration(400)}
//         style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
//       >
//         <ThemedText style={styles.headerTitle}>Activity</ThemedText>
//       </Animated.View> */}

//             <FlatList
//                 data={tripHistory}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                     <TripCard
//                         trip={item}
//                         onPress={() => {
//                             // Could navigate to trip details if needed
//                         }}
//                     />
//                 )}
//                 ListHeaderComponent={activeRide ? (
//                     <View style={styles.ongoingSection}>
//                         <ThemedText style={styles.sectionTitle}>Ongoing</ThemedText>
//                         <ThemedText style={styles.sectionSubtitle}>Current active ride</ThemedText>
//                         <TripCard
//                             trip={activeRide}
//                             onPress={() => {
//                                 // Navigate to DriveTab which will show DriverHome with Phase 2 view
//                                 console.log('🔄 Driver clicked ongoing ride, navigating to home');
//                                 if (navigation) {
//                                     navigation.navigate('DriveTab', { screen: 'DriverHome' });
//                                 }
//                             }}
//                         />
//                     </View>
//                 ) : null}
//                 contentContainerStyle={[
//                     styles.listContent,
//                     { paddingBottom: tabBarHeight + Spacing.xl },
//                     tripHistory.length === 0 && !activeRide && styles.emptyListContent,
//                 ]}
//                 scrollIndicatorInsets={{ bottom: insets.bottom }}
//                 refreshControl={
//                     <RefreshControl
//                         refreshing={refreshing}
//                         onRefresh={onRefresh}
//                         tintColor="#FFFFFF"
//                     />
//                 }
//                 ListEmptyComponent={
//                     !activeRide ? (
//                         <EmptyState
//                             icon="history"
//                             title="No trips yet"
//                             description="When you complete your first trip, it will appear here"
//                         />
//                     ) : null
//                 }
//             />
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#000000",
//     },
//     header: {
//         paddingHorizontal: Spacing.lg,
//         paddingBottom: Spacing.lg,
//     },
//     headerTitle: {
//         color: "#FFFFFF",
//         fontSize: 28,
//         fontWeight: "700",
//     },
//     ongoingSection: {
//         marginBottom: Spacing.xl,
//     },
//     sectionTitle: {
//         fontSize: 20,
//         fontWeight: "700",
//         marginBottom: 4,
//         color: "#FFFFFF",
//     },
//     sectionSubtitle: {
//         fontSize: 14,
//         color: "#999999",
//         marginBottom: Spacing.md,
//     },
//     listContent: {
//         paddingHorizontal: Spacing.lg,
//     },
//     emptyListContent: {
//         flex: 1,
//     },
// });
