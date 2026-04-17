// client/screens/rider/RiderSafetyScreen.tsx
import React from "react";
import { StyleSheet, View, ScrollView, Pressable, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

const RIDER_SAFETY_SECTIONS = [
    {
        heading: "PASSENGER SAFETY GUIDELINES",
        body: `Before the Journey
• Always verify the driver details, including name, vehicle registration, and vehicle model, before entering the vehicle.
• Ensure the vehicle matches the information provided in the UTO platform.
• Do not enter a vehicle if the details do not match or if you feel unsafe.
• Share your trip details with a trusted contact when possible.

During the Journey
• Always wear a seatbelt.
• Remain respectful and follow all reasonable instructions from the driver.
• Avoid distracting the driver (e.g., loud behaviour, sudden movements).
• Do not request the driver to exceed speed limits or break traffic laws.
• Keep personal belongings secure at all times.

Personal Safety
• Do not share personal contact details unnecessarily with the driver.
• If you feel unsafe at any point, request to end the trip in a safe public location.
• In case of emergency, contact emergency services immediately (999 in the UK).

Prohibited Behaviour
Passengers must NOT:
• Consume illegal substances in the vehicle
• Carry dangerous or illegal items
• Engage in abusive, threatening, or inappropriate behaviour
• Damage or tamper with the vehicle

Failure to comply may result in:
• Immediate termination of the journey
• Additional charges
• Suspension or permanent ban from UTO platform`,
    },
    {
        heading: "REGULATORY COMPLIANCE",
        body: `UTO operates in accordance with the licensing requirements set by:
• Gloucester City Council Licensing Team
• Tewkesbury Borough Council Licensing Team

All drivers and vehicles operating on the UTO platform must comply with:
• Private Hire Vehicle (PHV) licensing conditions
• Driver licensing requirements
• Vehicle safety and inspection standards
• Safeguarding and public safety obligations

Failure to comply may result in suspension from the platform and reporting to the relevant licensing authority.`,
    },
    {
        heading: "MUTUAL SAFETY EXPECTATIONS",
        body: `Both passengers and drivers agree to:
• Treat each other with respect and professionalism
• Follow all applicable UK laws and regulations
• Prioritise safety over convenience or speed
• Report any incidents, accidents, or unsafe behaviour to UTO`,
    },
    {
        heading: "INCIDENT REPORTING",
        body: `• Any safety incident must be reported to UTO as soon as possible on email fixat4u@gmail.com or 07596266901
• Serious incidents must also be reported to emergency services (999)
• UTO reserves the right to investigate and take appropriate action, including account suspension`,
    }
];

function Section({ heading, body }: { heading: string; body: string }) {
    return (
        <View style={styles.section}>
            <ThemedText style={styles.sectionHeading}>{heading}</ThemedText>
            <ThemedText style={styles.sectionBody}>{body}</ThemedText>
        </View>
    );
}

export default function RiderSafetyScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* Content */}
            <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {RIDER_SAFETY_SECTIONS.map((sec, i) => (
                        <Section key={i} heading={sec.heading} body={sec.body} />
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A0A0A",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "#1F1F1F",
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        backgroundColor: "#1A1A1A",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        gap: Spacing.sm,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: "700",
        color: UTOColors.primary,
        marginBottom: Spacing.sm,
        letterSpacing: 0.3,
    },
    sectionBody: {
        fontSize: 14,
        color: "#D1D5DB",
        lineHeight: 22,
    },
});
