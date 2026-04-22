import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useTheme } from "@/hooks/useTheme";
import { useDriver, DriverProfile } from "@/context/DriverContext";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { api } from "@/lib/api";

interface DocumentItemProps {
  title: string;
  status: string | null | undefined;
  onPress: () => void;
  isLoading: boolean;
}

function DocumentItem({ title, status, onPress, isLoading }: DocumentItemProps) {
  const { theme } = useTheme();

  let statusColor = theme.textSecondary;
  let statusText = "Action required";

  if (status === "completed") {
    statusColor = UTOColors.success;
    statusText = "Completed";
  } else if (status === "pending") {
    statusColor = UTOColors.warning;
    statusText = "Pending review";
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.docItem,
        { backgroundColor: pressed ? theme.backgroundDefault : "transparent" },
      ]}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.docInfo}>
        <Text style={[styles.docTitle, { color: theme.text }]}>{title}</Text>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={UTOColors.primary} />
            <Text style={[styles.docStatus, { color: UTOColors.primary, marginLeft: 6 }]}>
              Uploading...
            </Text>
          </View>
        ) : (
          <Text style={[styles.docStatus, { color: statusColor }]}>{statusText}</Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function DriverDocumentsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { driverProfile, setDriverProfile } = useDriver();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const vehicleName = driverProfile
    ? `${driverProfile.vehicleMake} ${driverProfile.vehicleModel} ${driverProfile.licensePlate}`
    : "Your Vehicle";

  const handleDocumentPick = async (docKey: keyof DriverProfile, statusKey: keyof DriverProfile) => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission to access camera roll is required!");
        return;
      }

      // Pick the document (image)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], 
        allowsEditing: false,
        quality: 0.5, // Reduced quality to save bandwidth
        base64: true, // We need base64 for the API payload
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

      setUploadingDoc(docKey as string);

      // Upload to server then Supabase
      const uploadedUrl = await api.drivers.uploadDocument(
        driverProfile.id,
        result.assets[0].base64,
        docKey as string,
        result.assets[0].mimeType || "image/jpeg"
      );


        // Create updated profile
        const updatedProfile = { ...driverProfile };
        (updatedProfile as any)[docKey] = uploadedUrl; // Save the real public URL returned
        (updatedProfile as any)[statusKey] = "completed";

        await setDriverProfile(updatedProfile);
        
        Alert.alert("Success", "Document uploaded successfully!");
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
      <View style={[styles.banner, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.bannerIcon}>
          <Feather name="shield" size={24} color={UTOColors.primary} />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>
            Keep your documents up to date
          </Text>
          <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
            Upload required documents to stay online and continue receiving trips.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.vehicleHeader, { color: theme.text }]}>
          Driver Documents
        </Text>

        <View style={styles.card}>
          <DocumentItem
            title="DVLA plastic driving licence"
            status={driverProfile?.documentDvlaLicenceStatus}
            isLoading={uploadingDoc === "documentDvlaLicenceUrl"}
            onPress={() => handleDocumentPick("documentDvlaLicenceUrl", "documentDvlaLicenceStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="Bank statement"
            status={driverProfile?.documentBankStatementStatus}
            isLoading={uploadingDoc === "documentBankStatementUrl"}
            onPress={() => handleDocumentPick("documentBankStatementUrl", "documentBankStatementStatus")}
          />
          <View style={styles.divider} />

          <DocumentItem
            title="National Insurance"
            status={driverProfile?.documentNationalInsuranceStatus}
            isLoading={uploadingDoc === "documentNationalInsuranceUrl"}
            onPress={() => handleDocumentPick("documentNationalInsuranceUrl", "documentNationalInsuranceStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="Private Hire Driver Licence (Paper and Badge)"
            status={driverProfile?.documentPhdlStatus}
            isLoading={uploadingDoc === "documentPhdlUrl"}
            onPress={() => handleDocumentPick("documentPhdlUrl", "documentPhdlStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="Profile photo"
            status={driverProfile?.documentProfilePhotoStatus}
            isLoading={uploadingDoc === "documentProfilePhotoUrl"}
            onPress={() => handleDocumentPick("documentProfilePhotoUrl", "documentProfilePhotoStatus")}
          />
        </View>
      </View>

      <View style={[styles.section, { marginTop: Spacing.xl }]}>
        <Text style={[styles.vehicleHeader, { color: theme.text }]}>
          {vehicleName} (Vehicle)
        </Text>

        <View style={styles.card}>
          <DocumentItem
            title="Private hire vehicle licence (PHVL)"
            status={driverProfile?.documentPhvlStatus}
            isLoading={uploadingDoc === "documentPhvlUrl"}
            onPress={() => handleDocumentPick("documentPhvlUrl", "documentPhvlStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="V5C Vehicle Logbook (2nd Page) or New Keeper Slip"
            status={driverProfile?.documentLogbookStatus}
            isLoading={uploadingDoc === "documentLogbookUrl"}
            onPress={() => handleDocumentPick("documentLogbookUrl", "documentLogbookStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="Insurance Certificate"
            status={driverProfile?.documentInsuranceStatus}
            isLoading={uploadingDoc === "documentInsuranceUrl"}
            onPress={() => handleDocumentPick("documentInsuranceUrl", "documentInsuranceStatus")}
          />
          <View style={styles.divider} />
          <DocumentItem
            title="UK vehicle inspection"
            status={driverProfile?.documentInspectionStatus}
            isLoading={uploadingDoc === "documentInspectionUrl"}
            onPress={() => handleDocumentPick("documentInspectionUrl", "documentInspectionStatus")}
          />
        </View>
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
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: UTOColors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  vehicleHeader: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.lg,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    justifyContent: "space-between",
  },
  docInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 6,
    lineHeight: 20,
  },
  docStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: Spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
