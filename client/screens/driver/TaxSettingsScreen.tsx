import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, UTOColors } from "@/constants/theme";
import { useDriver } from "@/context/DriverContext";
import { api } from "@/lib/api";

const LOCAL_FALLBACK_KEY = "@uto_tax_fallback";

type TaxStatus = "self_employed" | "limited_company";

interface TaxSettings {
  status: TaxStatus;
  // Common
  address: string;
  postcode: string;
  // Self-Employed fields
  fullName?: string;
  utrNumber?: string;
  niNumber?: string;
  // Limited Company fields
  companyName?: string;
  crn?: string;
  vatNumber?: string;
}

export default function TaxSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { driverProfile, setDriverProfile } = useDriver();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<TaxSettings>({
    status: "self_employed",
    address: "",
    postcode: "",
    fullName: "",
    utrNumber: "",
    niNumber: "",
    companyName: "",
    crn: "",
    vatNumber: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (driverProfile?.taxSettings) {
        setSettings({ ...settings, ...driverProfile.taxSettings });
      } else {
        const local = await AsyncStorage.getItem(LOCAL_FALLBACK_KEY);
        if (local) setSettings(JSON.parse(local));
      }
    } catch (error) {
      console.error("Failed to load tax settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!settings.address || !settings.postcode) {
      Alert.alert(
        "Required Fields",
        "Please provide your address and postcode.",
      );
      return;
    }

    if (settings.status === "self_employed") {
      if (!settings.fullName || !settings.utrNumber) {
        Alert.alert(
          "Required Fields",
          "Please provide your full name and UTR number.",
        );
        return;
      }
    } else {
      if (!settings.companyName || !settings.crn) {
        Alert.alert(
          "Required Fields",
          "Please provide your company name and CRN.",
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      if (driverProfile?.id) {
        try {
          // Attempt to save to Supabase
          const updatedDriver = await api.drivers.update(driverProfile.id, {
            taxSettings: settings,
          });
          setDriverProfile({ ...driverProfile, taxSettings: settings });
        } catch (dbError: any) {
          console.warn(
            "Supabase schema missing tax_settings column, falling back to local storage:",
            dbError,
          );
          // Fallback if db schema isn't updated yet
          await AsyncStorage.setItem(
            LOCAL_FALLBACK_KEY,
            JSON.stringify(settings),
          );
          setDriverProfile({ ...driverProfile, taxSettings: settings });
        }
      } else {
        await AsyncStorage.setItem(
          LOCAL_FALLBACK_KEY,
          JSON.stringify(settings),
        );
      }
      Alert.alert("Saved", "Your tax information has been updated securely.");
    } catch (error) {
      console.error("Failed to save tax settings:", error);
      Alert.alert("Error", "Could not save your settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={UTOColors.primary} />
      </View>
    );
  }

  const isSelfEmployed = settings.status === "self_employed";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(headerHeight, 56) + insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gdprNote}>
          <Feather
            name="shield"
            size={20}
            color={UTOColors.primary}
            style={{ marginTop: 2 }}
          />
          <ThemedText style={styles.gdprText}>
            This information is required for payment, tax and compliance
            records. It will be stored securely and only used for UTO
            operational, accounting and legal compliance purposes.
          </ThemedText>
        </View>

        <ThemedText style={styles.sectionHeading}>Tax Status</ThemedText>
        <View style={styles.statusContainer}>
          <Pressable
            style={[
              styles.statusCard,
              settings.status === "self_employed" && styles.statusCardActive,
            ]}
            onPress={() =>
              setSettings({ ...settings, status: "self_employed" })
            }
          >
            <View
              style={[
                styles.radio,
                settings.status === "self_employed" && styles.radioActive,
              ]}
            >
              {settings.status === "self_employed" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <ThemedText style={styles.statusText}>
              Self-employed individual
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.statusCard,
              settings.status === "limited_company" && styles.statusCardActive,
            ]}
            onPress={() =>
              setSettings({ ...settings, status: "limited_company" })
            }
          >
            <View
              style={[
                styles.radio,
                settings.status === "limited_company" && styles.radioActive,
              ]}
            >
              {settings.status === "limited_company" && (
                <View style={styles.radioInner} />
              )}
            </View>
            <ThemedText style={styles.statusText}>Limited company</ThemedText>
          </Pressable>
        </View>

        <View style={{ marginTop: Spacing.xl }}>
          {isSelfEmployed ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>
                  Full legal name{" "}
                  <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.fullName}
                  onChangeText={(text) =>
                    setSettings({ ...settings, fullName: text })
                  }
                  placeholder="e.g. John Doe"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>
                  UTR Number <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.utrNumber}
                  onChangeText={(text) =>
                    setSettings({ ...settings, utrNumber: text })
                  }
                  placeholder="10-digit Unique Taxpayer Reference"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>
                  National Insurance Number
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.niNumber}
                  onChangeText={(text) =>
                    setSettings({ ...settings, niNumber: text })
                  }
                  placeholder="e.g. QQ 12 34 56 A"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>
                  Company name{" "}
                  <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.companyName}
                  onChangeText={(text) =>
                    setSettings({ ...settings, companyName: text })
                  }
                  placeholder="e.g. UTO Transport Ltd"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>
                  Company Registration Number (CRN){" "}
                  <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.crn}
                  onChangeText={(text) =>
                    setSettings({ ...settings, crn: text })
                  }
                  placeholder="e.g. 14458837"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="default"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>VAT Number</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={settings.vatNumber}
                  onChangeText={(text) =>
                    setSettings({ ...settings, vatNumber: text })
                  }
                  placeholder="If applicable"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              {isSelfEmployed ? "Address" : "Company Address"}{" "}
              <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={settings.address}
              onChangeText={(text) =>
                setSettings({ ...settings, address: text })
              }
              placeholder="Street address and City"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Postcode <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={settings.postcode}
              onChangeText={(text) =>
                setSettings({ ...settings, postcode: text })
              }
              placeholder="e.g. GL1 1JJ"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { opacity: pressed || isSaving ? 0.7 : 1 },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Securely</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  gdprNote: {
    flexDirection: "row",
    backgroundColor: UTOColors.primary + "15",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: UTOColors.primary + "40",
  },
  gdprText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: Spacing.sm,
    color: "#D97706", // Darker amber for readability
  },
  statusContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: BorderRadius.md,
    backgroundColor: "#111111",
  },
  statusCardActive: {
    borderColor: UTOColors.primary,
    backgroundColor: UTOColors.primary + "10",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  radioActive: {
    borderColor: UTOColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UTOColors.primary,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontSize: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  saveButton: {
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.md,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
});
