import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/hooks/useTheme";
import { useDriver, DriverProfile } from "@/context/DriverContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

// ── Document Configuration ────────────────────────────────────────────────
interface DocConfig {
  key: string; // The Supabase column prefix (e.g. "documentDvlaLicence")
  title: string;
  category: "driver" | "vehicle";
  hasExpiry: boolean;
}

const DOCUMENT_LIST: DocConfig[] = [
  // Driver Documents
  { key: "documentPhdl", title: "Private Hire Driver Licence", category: "driver", hasExpiry: true },
  { key: "documentDvlaLicence", title: "DVLA Driving Licence", category: "driver", hasExpiry: true },
  { key: "documentDvlaCheckCode", title: "DBS Certificate / DBS Update Service", category: "driver", hasExpiry: false },
  { key: "documentNationalInsurance", title: "National Insurance Number Proof", category: "driver", hasExpiry: false },
  { key: "documentBankStatement", title: "Bank Statement", category: "driver", hasExpiry: false },
  { key: "documentProfilePhoto", title: "Profile Photo", category: "driver", hasExpiry: false },
  // Vehicle Documents
  { key: "documentPhvl", title: "Private Hire Vehicle Licence", category: "vehicle", hasExpiry: true },
  { key: "documentInsurance", title: "Vehicle Insurance Certificate", category: "vehicle", hasExpiry: true },
  { key: "documentInspection", title: "MOT Certificate", category: "vehicle", hasExpiry: true },
  { key: "documentLogbook", title: "Vehicle Logbook / V5C", category: "vehicle", hasExpiry: false },
];

type DocStatus = "not_uploaded" | "pending" | "completed" | "rejected" | "expired";

function getDocStatus(profile: DriverProfile | null, docKey: string): DocStatus {
  if (!profile) return "not_uploaded";
  const urlVal = (profile as any)[`${docKey}Url`];
  const statusVal: string | null | undefined = (profile as any)[`${docKey}Status`];

  if (!urlVal && (!statusVal || statusVal === "pending")) return "not_uploaded";
  if (statusVal === "completed" || statusVal === "approved") return "completed";
  if (statusVal === "rejected") return "rejected";
  if (statusVal === "expired") return "expired";
  if (urlVal && statusVal === "pending") return "pending";
  return "not_uploaded";
}

function getStatusLabel(status: DocStatus): string {
  switch (status) {
    case "not_uploaded": return "Not uploaded";
    case "pending": return "Pending review";
    case "completed": return "Approved";
    case "rejected": return "Rejected";
    case "expired": return "Expired";
  }
}

function getStatusColor(status: DocStatus): string {
  switch (status) {
    case "not_uploaded": return "#9CA3AF";
    case "pending": return "#F59E0B";
    case "completed": return "#10B981";
    case "rejected": return "#EF4444";
    case "expired": return "#F97316";
  }
}

function getStatusIcon(status: DocStatus): { name: string; color: string } {
  switch (status) {
    case "not_uploaded": return { name: "upload-cloud", color: "#9CA3AF" };
    case "pending": return { name: "clock", color: "#F59E0B" };
    case "completed": return { name: "check-circle", color: "#10B981" };
    case "rejected": return { name: "x-circle", color: "#EF4444" };
    case "expired": return { name: "alert-triangle", color: "#F97316" };
  }
}

// ── Document Item Component ───────────────────────────────────────────────
interface DocumentItemProps {
  config: DocConfig;
  profile: DriverProfile | null;
  isUploading: boolean;
  onUpload: () => void;
}

function DocumentItem({ config, profile, isUploading, onUpload }: DocumentItemProps) {
  const { theme } = useTheme();
  const status = getDocStatus(profile, config.key);
  const statusLabel = getStatusLabel(status);
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);

  const rejectionReason = status === "rejected"
    ? (profile as any)?.[`${config.key}RejectionReason`] || "Document not accepted – please re-upload"
    : null;

  const expiryDate = config.hasExpiry
    ? (profile as any)?.[`${config.key}Expiry`] || null
    : null;

  const actionLabel = status === "not_uploaded"
    ? "Upload"
    : status === "rejected" || status === "expired"
      ? "Upload Again"
      : status === "pending" || status === "completed"
        ? "View / Replace"
        : "Upload";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.docItem,
        { backgroundColor: pressed ? theme.backgroundDefault + "80" : "transparent" },
      ]}
      onPress={onUpload}
      disabled={isUploading}
    >
      <View style={styles.docRow}>
        {/* Status Icon */}
        <View style={[styles.statusIconCircle, { backgroundColor: statusColor + "15" }]}>
          <Feather name={statusIcon.name as any} size={18} color={statusIcon.color} />
        </View>

        {/* Document Info */}
        <View style={styles.docInfo}>
          <Text style={[styles.docTitle, { color: theme.text }]}>{config.title}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {expiryDate && (
              <Text style={[styles.expiryText, { color: theme.textSecondary }]}>
                Exp: {expiryDate}
              </Text>
            )}
          </View>

          {/* Rejection Reason */}
          {rejectionReason && (
            <View style={styles.rejectionRow}>
              <Feather name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.rejectionText}>{rejectionReason}</Text>
            </View>
          )}
        </View>

        {/* Action */}
        <View style={styles.docAction}>
          {isUploading ? (
            <ActivityIndicator size="small" color={UTOColors.primary} />
          ) : (
            <View style={[styles.actionBtn, {
              backgroundColor: status === "not_uploaded" || status === "rejected" || status === "expired"
                ? UTOColors.primary
                : theme.backgroundSecondary || "#F3F4F6"
            }]}>
              <Feather
                name={status === "not_uploaded" || status === "rejected" || status === "expired" ? "upload" : "eye"}
                size={14}
                color={status === "not_uploaded" || status === "rejected" || status === "expired" ? "#000" : theme.textSecondary}
              />
              <Text style={[styles.actionBtnText, {
                color: status === "not_uploaded" || status === "rejected" || status === "expired" ? "#000" : theme.textSecondary
              }]}>{actionLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export default function DriverDocumentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { driverProfile, setDriverProfile } = useDriver();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const vehicleName = driverProfile
    ? `${driverProfile.vehicleMake} ${driverProfile.vehicleModel} (${driverProfile.licensePlate})`
    : "Your Vehicle";

  const driverDocs = DOCUMENT_LIST.filter(d => d.category === "driver");
  const vehicleDocs = DOCUMENT_LIST.filter(d => d.category === "vehicle");

  // Count completed docs
  const totalDocs = DOCUMENT_LIST.length;
  const completedDocs = DOCUMENT_LIST.filter(d => getDocStatus(driverProfile, d.key) === "completed").length;
  const allApproved = completedDocs === totalDocs;

  const handleDocumentPick = async (docKey: string) => {
    const urlKey = `${docKey}Url` as keyof DriverProfile;
    const statusKey = `${docKey}Status` as keyof DriverProfile;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      if (!driverProfile) {
        Alert.alert("Error", "Driver profile not loaded.");
        return;
      }

      if (!driverProfile.id) {
        Alert.alert(
          "Profile Sync Required",
          "Your profile ID is missing. Please pull to refresh your dashboard or restart the app to sync your latest data."
        );
        return;
      }

      if (!result.assets[0].base64) {
        Alert.alert("Error", "Could not read the image file properly. Please select a different image.");
        return;
      }

      setUploadingDoc(urlKey as string);

      const uploadedUrl = await api.drivers.uploadDocument(
        driverProfile.id,
        result.assets[0].base64,
        urlKey as string,
        result.assets[0].mimeType || "image/jpeg"
      );

      const updatedProfile = { ...driverProfile };
      (updatedProfile as any)[urlKey] = uploadedUrl;
      (updatedProfile as any)[statusKey] = "pending"; // Reset to pending after re-upload
      await setDriverProfile(updatedProfile);

      Alert.alert("Success ✅", "Document uploaded successfully! It will be reviewed by our team.");
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Could not upload document. Please try again.");
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      {/* Compliance Banner */}
      <View style={[styles.banner, { backgroundColor: allApproved ? "#10B98115" : "#F59E0B15" }]}>
        <View style={[styles.bannerIcon, { backgroundColor: allApproved ? "#10B98120" : "#F59E0B20" }]}>
          <Feather name={allApproved ? "check-circle" : "shield"} size={24} color={allApproved ? "#10B981" : "#F59E0B"} />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>
            {allApproved ? "All documents approved" : "Keep your documents up to date"}
          </Text>
          <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
            {allApproved
              ? "You're fully compliant and ready to receive trips."
              : `${completedDocs}/${totalDocs} documents approved. Upload all required documents to go online.`}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.progressFill, { width: `${(completedDocs / totalDocs) * 100}%`, backgroundColor: allApproved ? "#10B981" : UTOColors.primary }]} />
        </View>
      </View>

      {/* Driver Documents Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Feather name="user" size={18} color={UTOColors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Driver Documents</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border || "#E5E7EB" }]}>
          {driverDocs.map((doc, index) => (
            <React.Fragment key={doc.key}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border || "#F3F4F6" }]} />}
              <DocumentItem
                config={doc}
                profile={driverProfile}
                isUploading={uploadingDoc === `${doc.key}Url`}
                onUpload={() => handleDocumentPick(doc.key)}
              />
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Vehicle Documents Section */}
      <View style={[styles.section, { marginTop: Spacing.xl }]}>
        <View style={styles.sectionHeader}>
          <Feather name="truck" size={18} color={UTOColors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{vehicleName}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border || "#E5E7EB" }]}>
          {vehicleDocs.map((doc, index) => (
            <React.Fragment key={doc.key}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border || "#F3F4F6" }]} />}
              <DocumentItem
                config={doc}
                profile={driverProfile}
                isUploading={uploadingDoc === `${doc.key}Url`}
                onUpload={() => handleDocumentPick(doc.key)}
              />
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Compliance Note */}
      <View style={styles.complianceNote}>
        <Feather name="info" size={16} color="#9CA3AF" />
        <Text style={[styles.complianceText, { color: "#9CA3AF" }]}>
          Drivers must have all mandatory documents uploaded and approved before going online. Documents are reviewed within 24–48 hours.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: "row",
    padding: Spacing.lg,
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  docItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  docInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  expiryText: {
    fontSize: 11,
  },
  rejectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  rejectionText: {
    fontSize: 11,
    color: "#EF4444",
    flex: 1,
  },
  docAction: {
    marginLeft: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  complianceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  complianceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
