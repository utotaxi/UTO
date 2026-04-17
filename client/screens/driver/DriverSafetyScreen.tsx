// client/screens/driver/DriverSafetyScreen.tsx
import React from "react";
import { StyleSheet, View, ScrollView, Pressable, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const DRIVER_SAFETY_SECTIONS = [
    {
        heading: "DRIVER SAFETY GUIDELINES",
        body: `Before Accepting a Booking
• Ensure you are fit to drive, rested, and not under the influence of alcohol or drugs.
• Verify booking details before starting the journey.
• Maintain a roadworthy vehicle with valid insurance, licence, and compliance documents.

At Pickup
• Confirm the passenger's name and booking details before starting the journey.
• Do not allow passengers to enter the vehicle if:
  o They cannot be identified
  o They pose a safety risk
• Wait in a safe and legal location.

During the Journey
• Follow all UK traffic laws and regulations.
• Drive safely, responsibly, and professionally at all times.
• Do not use a mobile phone while driving unless via hands-free system.
• Treat passengers with respect and professionalism.
• Keep doors locked when appropriate and ensure passenger safety throughout the journey.

Personal Safety
• If you feel unsafe:
  o You may terminate the journey in a safe location
  o Contact UTO support or emergency services if required
• Avoid engaging in confrontations with passengers

Prohibited Behaviour
Drivers must NOT:
• Drive under the influence of alcohol, drugs, or fatigue
• Discriminate against passengers
• Engage in inappropriate conversations or behaviour
• Accept cash payments outside platform rules (if restricted)
• Deviate from the route without valid reason

Violation may result in:
• Immediate suspension
• Permanent removal from the platform
• Legal action where applicable`,
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

function Section({ heading, body, isDark }: { heading: string; body: string; isDark: boolean }) {
    return (
        <View style={styles.section}>
            <ThemedText style={[styles.sectionHeading, { color: UTOColors.driver.primary }]}>{heading}</ThemedText>
            <ThemedText style={[styles.sectionBody, { color: isDark ? "#D1D5DB" : "#4B5563" }]}>{body}</ThemedText>
        </View>
    );
}

export default function DriverSafetyScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.backgroundRoot }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

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
                    {DRIVER_SAFETY_SECTIONS.map((sec, i) => (
                        <Section key={i} heading={sec.heading} body={sec.body} isDark={isDark} />
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
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
        marginBottom: Spacing.sm,
        letterSpacing: 0.3,
    },
    sectionBody: {
        fontSize: 14,
        lineHeight: 22,
    },
});
