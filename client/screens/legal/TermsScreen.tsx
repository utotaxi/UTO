import React, { useState, useRef } from "react";
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

const TERMS_SECTIONS = [
    {
        heading: "TERMS & CONDITIONS",
        body: `This Mobile Application Terms and Conditions of Use and End User License Agreement is a binding agreement between you (End User or you) and Taxi Operator. This Agreement governs your use of the Taxi Service mobile software application (including all related documentation, the Application or the App).

BY USING THE SERVICE, YOU ACKNOWLEDGE AND AGREE TO THESE TERMS OF SERVICE, AND UTO PRIVACY POLICY.

By selecting the checkbox button (either on UTO app downloaded or web booker) you will agree with the following:
(a) acknowledge that you have read and understand this agreement;
(b) represent that you are of legal age to enter into a binding agreement; and
(c) accept this agreement and agree that you are legally bound by its terms. If you do not agree to these terms, do not download/install/use the application and delete it from your mobile device.`,
    },
    {
        heading: "TERMS",
        body: `(1) In order to access and use the features of the Service, you acknowledge and agree that you will have to provide Taxi Operator with your mobile phone number, email, address, Gender, Date of Birth information. You expressly acknowledge and agree that in order to provide the Service. Besides, we access the user device's contact list from where they can select numbers for emergency calls. Taxi operator access find and track of your location to use the Taxi Service when user want Service at him/her location. When providing your mobile phone number, you must provide accurate and complete information. You hereby give your express consent to private driver to access your Location in order to provide and use the Service.

(2) Although private driver or his operator will not be liable for your losses caused by any unauthorised use of your account, you may be liable for the losses of data or others due to such unauthorised use.`,
    },
    {
        heading: "CONDITIONS",
        body: `(1) YOU AGREE THAT YOUR USE OF THE SERVICE SHALL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICE AND YOUR USE THEREOF. OPERATOR MAKES NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THIS SERVICE'S CONTENT AND ASSUMES NO LIABILITY OR RESPONSIBILITY FOR ANY:

(1.1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT,
(1.2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF OUR SERVICE,
(1.3) ANY UNAUTHORISED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN,
(1.4) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM OUR SERVICE,
(1.5) ANY BUGS, VIRUSES, TROJAN HORSES, OR
(1.6) ANY ERRORS OR OMISSIONS IN ANY CONTENT OR FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE UTO SERVICE.
(1.7) UTO OPERATOR DOES NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR ANY PRODUCT OR SERVICE ADVERTISED OR OFFERED BY A THIRD PARTY THROUGH THE UTO SERVICE OR ANY HYPERLINKED WEBSITE OR FEATURED IN ANY USER STATUS SUBMISSION OR OTHER ADVERTISING, AND UTO WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES.`,
    },
    {
        heading: "Charges Policy",
        body: `Privacy Policy – We do not store or process credit or debit card details ourselves. All payments are processed securely by Stripe, our third-party payment service provider. Stripe may store and process payment information in accordance with its own Privacy Policy, security standards, and applicable data protection laws. We do not have access to full card details at any time.

ALL PAYMENTS NEEDS TO BE MADE ONLINE.`,
    },
    {
        heading: "Pricing Policy",
        body: `All journeys are priced individually based on their length, number of passengers and particular requirements. Every journey will be priced at the time of the booking and confirmed by text message. Any alteration to the original booking, i.e. additional stops or diversions will result in a change to the agreed price.`,
    },
    {
        heading: "Refund / Cancellation Policy",
        body: `All Changes & cancellations must be made by telephone to our main office tel: 07596266901 or by email: fixat4u@gmail.com

Airport pick-ups and drop-offs – Our fares include either the drop-off charge or the minimum car park fee when picking up. We will do our best to track your flight and ensure your driver enters a car park no earlier than 30 minutes after your flight lands. Any additional parking charges and waiting time will be added to the fare by the private hire driver on our waiting time rate £0.5/minute.

In the event of a "No-show" by the customer, or if a confirmed booking is cancelled by the Customer within 3 hours of the start of the period of hire, all amount paid will be non-refundable. In addition the full charge may be debited, especially where the journey pick up point is from an airport or seaport.

Our drivers are requested to wait at an airport until the flight details are removed from the airport's arrivals screen or until we receive additional information from the customer that the taxi is no longer required.

Changes to pre-booked journeys must be notified to Fixat 4 u Ltd trade as UTO within 24 hours of the booked pickup time. Changes without 24 hour prior notification may result in the customer being charged the full original estimated/quoted fare.

Please note: All bookings are subject to driver availability and therefore arrival times cannot be guaranteed. Fixat 4 u Ltd trade as UTO shall have no liability if a pick-up or journey time exceeds any estimate given or if we cancel a booking, provided we have used reasonable endeavours to fulfil the booking.

Please note that if no contact is made with our driver or our office within 5 minutes of the taxi arriving at the pick up location, private driver is allowed to cancel your booking as no show event.

Any passenger travelling in a wheelchair, electric or manual, or a motorized scooter must be accompanied by either a family member or carer. The drivers of our accessible vehicles are only responsible for applying the harnesses to the cross beams or harness points of the wheelchair. Entry and exit of the vehicle is at your own risk.

Soiling – There will have to be an additional charge of £100.00 for soiling if it requires the taxi to be taken out of service for cleaning.

Fixat 4 u Ltd trade as UTO acts as an agent on behalf of the driver, therefore we shall have no liability for any damage, loss, costs, claims or expenses suffered by you.

Please ensure that any item, including valuables and personal effects brought into the taxi with you are removed from the taxi at the end of the journey.

Any claim or complaint pertaining to a journey undertaken by Fixat 4 u Ltd trade as UTO, should be made in writing within one week of the complaint arising to the company secretary.

Complaints: 07596 266901 or fixat4u@gmail.com`,
    },
];

const DRIVER_TERMS_SECTIONS = [
    {
        heading: "Driver Terms & Conditions",
        body: `Effective Date: 1 February 2026

These Driver Terms & Conditions ("Terms") govern the relationship between Fixat 4 U Ltd trading as UTO ("we", "us", "our") and any self-employed driver ("you", "Driver") who accepts bookings or work through our platform, dispatch system, or direct allocation.

By registering with, logging into, or accepting work from UTO Taxi, you agree to be bound by these Terms.`,
    },
    {
        heading: "1. Driver Status",
        body: `1.1 Drivers operate as self-employed independent contractors and not as employees, workers, or agents of Fixat 4 U Ltd trading as UTO.
1.2 Nothing in these Terms creates an employment relationship, partnership, or joint venture.
1.3 Drivers are responsible for their own tax, National Insurance contributions, VAT (if applicable), and business expenses.`,
    },
    {
        heading: "2. Eligibility Requirements",
        body: `Drivers must at all times:
• Hold a valid DVLA driving licence
• Hold a valid local authority taxi/private hire licence
• Hold a valid DBS certificate (where required)
• Hold valid motor insurance covering hire and reward
• Hold any additional permits required by the local licensing authority

Drivers must immediately notify Fixat 4 U Ltd trading as UTO of any suspension, revocation, or restriction affecting the above.`,
    },
    {
        heading: "3. Vehicle Standards",
        body: `Drivers must ensure that:
• Vehicles meet all local authority licensing standards
• Vehicles are roadworthy, clean, and safe at all times
• Valid MOT, insurance, and vehicle licence are maintained

Fixat 4 U Ltd trading as UTO reserves the right to suspend drivers using unsafe or non-compliant vehicles.`,
    },
    {
        heading: "4. Booking Allocation & Acceptance",
        body: `4.1 Bookings may be offered via app, dispatch system, or direct communication.
4.2 Drivers are free to accept or decline bookings at their discretion.
4.3 Once a booking is accepted, the Driver agrees to complete it professionally and without unreasonable delay or cancellation.
4.4 Repeated cancellations, no-shows, or poor reliability may result in suspension or termination of access to the platform.`,
    },
    {
        heading: "5. Fees & Payments",
        body: `5.1 Fixat 4 U Ltd trading as UTO charges a 10% commission on the total fare of each completed booking accepted through the platform or dispatch system.
5.2 Payments for completed journeys may be:
• Paid directly to the Driver, or
• Collected by UTO and remitted to the Driver minus the 10% commission
5.3 Payment schedules and methods will be communicated separately.
5.4 Fixat 4 U Ltd trading as UTO is not responsible for delays caused by payment processors.`,
    },
    {
        heading: "6. Conduct & Professional Standards",
        body: `Drivers must:
• Treat passengers with courtesy and respect
• Comply with all applicable laws and licensing rules
• Not discriminate on any protected characteristic
• Maintain appropriate personal hygiene and behaviour
• Refrain from abusive, aggressive, or unsafe conduct

UTO Taxi operates a zero-tolerance policy for harassment, abuse, or unsafe driving.`,
    },
    {
        heading: "7–14. Additional Terms",
        body: `7. Use of the Platform – Drivers must use the platform only for legitimate bookings and keep login credentials secure.

8. Data Protection – Drivers must process passenger personal data lawfully and confidentially. Passenger data must be used only for the purpose of completing bookings.

9. Insurance & Liability – Drivers are solely responsible for maintaining valid insurance. Fixat 4 U Ltd trading as UTO is not liable for accidents, vehicle damage, or loss of earnings.

10. Complaints & Investigations – Passenger complaints may be investigated. Drivers must cooperate fully.

11. Suspension & Termination – UTO may suspend or terminate access immediately if licensing/insurance becomes invalid, serious complaints are received, or these Terms are breached.

12. Confidentiality – Drivers must not disclose confidential business information or pricing structures.

13. Governing Law – These Terms are governed by the laws of England and Wales.

14. Contact – Email: fixat4u@gmail.com`,
    },
];

const PRIVACY_SECTIONS = [
    {
        heading: "Privacy Policy",
        body: `Effective Date: 1 February 2026
Last Updated: April 2026

This Privacy Policy explains how FIXAT 4 U LTD, trading as UTO ("we", "us", "our"), collects, uses, stores, shares, and protects your personal data when you use the UTO mobile application ("App"), our website (www.uto.taxi), or any of our related services.

This policy is issued in compliance with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and Apple's App Store Review Guidelines.`,
    },
    {
        heading: "1. Data Controller",
        body: `FIXAT 4 U LTD (trading as UTO) is the data controller responsible for your personal data.

Contact Details:
Email: fixat4u@gmail.com
Phone: 07596 266901
Website: www.uto.taxi`,
    },
    {
        heading: "2. Personal Data We Collect",
        body: `We collect and process the following types of personal data:

Data You Provide Directly:
• Full name — to identify you for bookings
• Email address — for account management and communications
• Phone number — for booking confirmations and driver contact
• Password (securely hashed) — for secure account access
• Profile photograph (optional) — for profile identification

Data Collected Automatically:
• Precise location (GPS) — to show nearby drivers, calculate routes, and provide real-time ride tracking
• Background location (drivers only, during active rides) — to enable live tracking for rider safety
• Device type and operating system — to ensure compatibility
• Push notification token — to deliver booking updates and ride notifications
• App usage data — to improve functionality and user experience

Data from Third Parties:
• Payment confirmation and transaction reference from Stripe
• Address and mapping data from Google Maps Platform

Driver-Specific Data (if registering as a driver):
• Vehicle details (make, model, registration/licence plate)
• Driving licence and private hire licence information
• Document uploads (licence photos, insurance certificates)
• Earnings, commission records, and tax information

We do not collect or store full credit or debit card details.`,
    },
    {
        heading: "3. How We Use Your Data",
        body: `We use your data for:
• Providing taxi booking and ride services — Contractual necessity
• Processing payments via Stripe — Contractual necessity
• Sending booking confirmations and ride updates — Contractual necessity
• Providing real-time GPS tracking during rides — Legitimate interests (safety)
• Calculating fares based on distance and time — Contractual necessity
• Maintaining booking history and ride records — Legitimate interests
• Complying with licensing and regulatory requirements — Legal obligation
• Investigating complaints and resolving disputes — Legitimate interests
• Preventing fraud and ensuring platform security — Legitimate interests
• Improving app functionality — Legitimate interests
• Optional promotional communications — Consent (you may withdraw at any time)`,
    },
    {
        heading: "4. Location Data",
        body: `Riders: We collect your precise location only while the App is in use to show nearby drivers, calculate pickup points, and provide route navigation.

Drivers: We collect location data while the App is in use and during active rides to enable real-time tracking, dispatch bookings, and calculate journey fares.

Your Control:
• You can disable location services at any time through your device settings
• Disabling location access will prevent core app functionality
• We do NOT sell location data to third parties
• We do NOT use location data for advertising purposes`,
    },
    {
        heading: "5. Payment Processing",
        body: `We do not store or process credit card, debit card, or bank account details directly.

All payments are processed securely by Stripe, our PCI DSS-compliant third-party payment processor. Stripe processes and stores payment data in accordance with its own Privacy Policy and security standards.

We receive only:
• Transaction confirmation (success/failure)
• Last four digits of the card (for your reference)
• Transaction reference numbers
• A Stripe Customer ID linked to your account`,
    },
    {
        heading: "6. Data Sharing and Disclosure",
        body: `We do NOT sell, rent, or trade your personal data.

We may share your data only with:
• Stripe — to process ride payments securely
• Google Maps Platform — for route calculation, mapping, and address search
• Supabase — secure cloud database storage and hosting
• Your assigned driver/rider — first name and pickup/drop-off location to facilitate the journey
• Law enforcement — as lawfully requested
• Local licensing authority — where required by regulation

All third-party service providers are required to process data in compliance with UK GDPR.`,
    },
    {
        heading: "7. Data Retention",
        body: `We retain personal data only for as long as necessary:
• Account data: Duration of account + 2 years
• Booking and journey records: Up to 6 years (licensing, legal, and tax requirements)
• Payment transaction records: Up to 7 years (HMRC financial regulations)
• Communications (emails, messages): Up to 24 months
• Location data (ride history): Up to 6 years
• Driver documents: Duration of engagement + 2 years

Data is securely deleted or anonymised once the retention period expires.`,
    },
    {
        heading: "8. Data Security",
        body: `We implement appropriate technical and organisational measures to protect your data, including:
• Encrypted data transmission (HTTPS/TLS)
• Secure password hashing (not stored in plain text)
• Access controls and authentication for all systems
• Restricted staff access on a need-to-know basis
• Secure cloud infrastructure (Supabase, Stripe)
• Regular security reviews

While we take every reasonable precaution, no method of electronic transmission or storage is 100% secure.`,
    },
    {
        heading: "9. Your Data Protection Rights",
        body: `Under UK GDPR, you have the right to:
• Access — request a copy of your personal data
• Rectification — request correction of inaccurate or incomplete data
• Erasure — request deletion of your data ("right to be forgotten")
• Restriction — request that we limit how your data is processed
• Data Portability — receive your data in a machine-readable format
• Object — object to processing based on legitimate interests
• Withdraw Consent — withdraw at any time where processing is based on consent

To exercise your rights:
Email: fixat4u@gmail.com | Phone: 07596 266901

We will respond within 30 days as required by UK GDPR.`,
    },
    {
        heading: "10. Account Deletion",
        body: `You may request complete deletion of your UTO account and associated personal data by contacting us at fixat4u@gmail.com.

Upon verification, we will delete your account data within 30 days, except where retention is required by law (e.g., financial records for HMRC).`,
    },
    {
        heading: "11. Camera & Photo Library",
        body: `The UTO App may request access to your device's:
• Camera — to allow you to take a profile photograph directly
• Photo Library — to allow you to select an existing image as your profile photograph

These permissions are optional and only activated when you choose to add or update your profile picture. We do not access your camera or photo library for any other purpose.`,
    },
    {
        heading: "12. Push Notifications",
        body: `With your permission, we send push notifications for:
• Ride booking confirmations and updates
• Driver arrival notifications
• Payment confirmations
• Important service announcements

You can disable push notifications at any time through your device's Settings.`,
    },
    {
        heading: "13. Children's Privacy",
        body: `The UTO App is not intended for use by anyone under the age of 18. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child under 18, we will delete it promptly.`,
    },
    {
        heading: "14. International Data Transfers",
        body: `Your personal data is primarily stored and processed within the United Kingdom and European Economic Area. Where data is transferred outside the UK/EEA (e.g., to Stripe servers in the United States), we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) and adequacy decisions.`,
    },
    {
        heading: "15. Changes & Complaints",
        body: `Changes to This Policy:
We may update this Privacy Policy from time to time. The updated version will be posted on our website and in the App with a revised "Last Updated" date.

Complaints:
If you believe your data protection rights have been infringed, you may lodge a complaint with the Information Commissioner's Office (ICO):
Website: https://www.ico.org.uk
Phone: 0303 123 1113

Contact Us:
Email: fixat4u@gmail.com
Phone: 07596 266901
Website: www.uto.taxi`,
    },
];

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

type Tab = "passenger" | "driver" | "privacy";

interface TabDef {
    key: Tab;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
}

const TABS: TabDef[] = [
    { key: "passenger", label: "Passenger T&C", icon: "person" },
    { key: "driver", label: "Driver T&C", icon: "directions-car" },
    { key: "privacy", label: "Privacy Policy", icon: "lock" },
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

export default function TermsScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const initialTab: Tab = route?.params?.tab ?? "passenger";
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const scrollRef = useRef<ScrollView>(null);

    const sections =
        activeTab === "privacy"
            ? PRIVACY_SECTIONS
            : activeTab === "driver"
                ? DRIVER_TERMS_SECTIONS
                : TERMS_SECTIONS;

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                </Pressable>
                <ThemedText style={s.headerTitle}>Legal</ThemedText>
                <View style={s.backBtn} />
            </View>

            {/* Tab bar */}
            <View style={s.tabBar}>
                {TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <Pressable
                            key={tab.key}
                            onPress={() => handleTabChange(tab.key)}
                            style={[s.tab, active && s.tabActive]}
                        >
                            <MaterialIcons
                                name={tab.icon}
                                size={16}
                                color={active ? "#000000" : "#9CA3AF"}
                            />
                            <ThemedText
                                style={[s.tabLabel, active && s.tabLabelActive]}
                                numberOfLines={1}
                            >
                                {tab.label}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>

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
                    {/* Effective date badge */}
                    <View style={s.dateBadge}>
                        <MaterialIcons name="verified-user" size={14} color={UTOColors.primary} />
                        <ThemedText style={s.dateText}>
                            {"  "}Effective Date: 1 February 2026
                        </ThemedText>
                    </View>

                    {sections.map((sec, i) => (
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
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: "#1F1F1F",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: "#1A1A1A",
    },
    tabActive: {
        backgroundColor: UTOColors.primary,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    tabLabelActive: {
        color: "#000000",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        gap: Spacing.sm,
    },
    dateBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(247,201,72,0.1)",
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.lg,
        alignSelf: "flex-start",
    },
    dateText: {
        fontSize: 12,
        color: UTOColors.primary,
        fontWeight: "600",
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
