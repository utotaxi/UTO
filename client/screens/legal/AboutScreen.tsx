import React, { useRef } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    Pressable,
    StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";

// ─────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────

const UTO_ABOUT_SECTIONS = [
    {
        heading: "UTO – ROLE AS PRIVATE HIRE OPERATOR",
        body: `Operator Status
UTO operates as a Private Hire Operator, acting as an intermediary platform that facilitates bookings between passengers and licensed drivers.
UTO is not a transport provider and does not directly provide driving services. All journeys are carried out by independent, licensed drivers who are responsible for delivering the transport service.

Platform Function
UTO provides a booking and dispatch system designed to:
• Connect passengers with available licensed drivers 
• Manage bookings (immediate and pre-booked) 
• Provide fare estimates and journey details 
• Enable communication between passenger and driver 
• Support payment processing (where applicable) 
UTO's role is to ensure the system operates efficiently and reliably, enabling both parties to complete journeys under agreed terms.

Driver Responsibility
All drivers operating through UTO:
• Must hold valid Private Hire Driver licences issued by: 
  o Gloucester City Council Licensing Team 
  o Tewkesbury Borough Council Licensing Team 
• Must operate fully licensed and insured vehicles 
• Are solely responsible for: 
  o The safe execution of the journey 
  o Compliance with all legal and licensing requirements 
  o Passenger safety and conduct during the trip 

UTO Operational Responsibility
UTO undertakes to:
• Maintain a functioning and accessible booking platform 
• Perform reasonable checks to ensure drivers are licensed and compliant 
• Monitor service quality and user feedback 
• Provide support in case of issues or disputes 
• Facilitate fair and transparent interaction between drivers and passengers 
However, UTO does not:
• Guarantee driver availability at all times 
• Control how drivers perform the journey in real-time 
• Accept liability for actions or omissions of independent drivers 

Passenger Responsibility
Passengers agree that:
• They are entering into a transport arrangement with the assigned driver 
• They must verify booking details before travel 
• They must comply with safety and conduct guidelines 

Relationship Between Parties
• Drivers operate as independent contractors, not employees of UTO 
• Passengers use UTO as a booking and facilitation service 
• UTO acts solely as a technology-enabled operator and intermediary 

Compliance with Licensing Authorities
UTO operates in accordance with regulations set by:
• Gloucester City Council 
• Tewkesbury Borough Council 
UTO may share relevant information with these authorities where required by law or for enforcement purposes.

Limitation of Role
To the fullest extent permitted by law:
• UTO shall not be liable for: 
  o Delays, cancellations, or no-shows by drivers 
  o Conduct of drivers or passengers 
  o Loss or damage occurring during a journey 
• Liability for the journey rests with the licensed driver providing the service`,
    },
];

interface SectionProps {
    heading: string;
    body: string;
}

function Section({ heading, body }: SectionProps) {
    return (
        <View style={s.section}>
            <ThemedText style={s.sectionHeading}>{heading}</ThemedText>
            <ThemedText style={s.sectionBody}>{body}</ThemedText>
        </View>
    );
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export default function AboutScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* Content */}
            <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollRef}
                    style={s.scroll}
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >

                    {UTO_ABOUT_SECTIONS.map((sec, i) => (
                        <Section key={i} heading={sec.heading} body={sec.body} />
                    ))}

                    {/* Contact footer */}
                    <View style={s.contactBox}>
                        <MaterialIcons name="mail-outline" size={18} color={UTOColors.primary} />
                        <ThemedText style={s.contactText}>fixat4u@gmail.com</ThemedText>
                    </View>
                    <View style={s.contactBox}>
                        <MaterialIcons name="phone" size={18} color={UTOColors.primary} />
                        <ThemedText style={s.contactText}>07596 266901</ThemedText>
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
    contactBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        backgroundColor: "#1A1A1A",
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: "#2A2A2A",
    },
    contactText: {
        fontSize: 14,
        color: "#E5E7EB",
        fontWeight: "500",
    },
});
