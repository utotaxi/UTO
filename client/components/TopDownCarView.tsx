import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface TopDownCarViewProps {
    style?: StyleProp<ViewStyle>;
    color?: string; // e.g. Yellow
    windowColor?: string; // e.g. Black
}

export function TopDownCarView({
    style,
    color = "#F7C948", // UTO Yellow
    windowColor = "#1D1D1D" // Black/Dark Grey
}: TopDownCarViewProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={[styles.carBody, { backgroundColor: color }]}>
                {/* Headlights */}
                <View style={styles.headlightsContainer}>
                    <View style={styles.headlight} />
                    <View style={styles.headlight} />
                </View>

                {/* Front Windshield */}
                <View style={[styles.windshield, styles.frontWindshield, { backgroundColor: windowColor }]} />

                {/* Roof line */}
                <View style={styles.roofLine} />

                {/* Rear Windshield */}
                <View style={[styles.windshield, styles.rearWindshield, { backgroundColor: windowColor }]} />

                {/* Taillights */}
                <View style={styles.taillightsContainer}>
                    <View style={styles.taillight} />
                    <View style={styles.taillight} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 20,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    carBody: {
        width: "100%",
        height: "100%",
        borderRadius: 8,
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        overflow: "hidden",
    },
    headlightsContainer: {
        position: "absolute",
        top: 0,
        left: 2,
        right: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 1,
        paddingTop: 1,
    },
    headlight: {
        width: 4,
        height: 2,
        backgroundColor: "#FFFAe0",
        borderRadius: 1,
    },
    taillightsContainer: {
        position: "absolute",
        bottom: 0,
        left: 2,
        right: 2,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 1,
        paddingBottom: 1,
    },
    taillight: {
        width: 4,
        height: 2,
        backgroundColor: "#FF3B30",
        borderRadius: 1,
    },
    windshield: {
        width: "80%",
        alignSelf: "center",
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: 1,
        borderBottomRightRadius: 1,
    },
    frontWindshield: {
        height: 8,
        marginTop: 8,
        width: "85%", // Slightly wider at front
    },
    rearWindshield: {
        height: 6,
        position: "absolute",
        bottom: 6,
        borderTopLeftRadius: 1,
        borderTopRightRadius: 1,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
    },
    roofLine: {
        flex: 1,
        marginVertical: 2,
        width: "75%",
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 2,
    },
});
