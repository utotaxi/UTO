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

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, UTOColors } from "@/constants/theme";

const TAX_SETTINGS_KEY = "@uto_driver_tax_settings";

interface TaxSettings {
  companyName: string;
  streetAddress: string;
  townCity: string;
  postcode: string;
  crn: string;
}

export default function TaxSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<TaxSettings>({
    companyName: "",
    streetAddress: "",
    townCity: "",
    postcode: "",
    crn: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(TAX_SETTINGS_KEY);
      if (data) {
        setSettings(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load tax settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.companyName || !settings.streetAddress || !settings.townCity || !settings.postcode || !settings.crn) {
      Alert.alert("Required Fields", "Please complete all required fields marked with an asterisk (*).");
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(settings));
      Alert.alert("Saved", "Your tax information has been updated successfully.");
    } catch (error) {
      console.error("Failed to save tax settings:", error);
      Alert.alert("Error", "Could not save your settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={UTOColors.primary} />
      </View>
    );
  }

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
            paddingBottom: insets.bottom + Spacing.xl + 80
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Company name <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={settings.companyName}
            onChangeText={(text) => setSettings({ ...settings, companyName: text })}
            placeholder="e.g. Fixat 4 u ltd"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Street address <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={settings.streetAddress}
            onChangeText={(text) => setSettings({ ...settings, streetAddress: text })}
            placeholder="e.g. 36 Brunswick Road"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Town/City <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={settings.townCity}
            onChangeText={(text) => setSettings({ ...settings, townCity: text })}
            placeholder="e.g. Gloucester"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Country</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.textSecondary, borderColor: theme.border }]}
            value="United Kingdom"
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Postcode <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={settings.postcode}
            onChangeText={(text) => setSettings({ ...settings, postcode: text })}
            placeholder="e.g. GL1 1JJ"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
          />
          <ThemedText style={[styles.helperText, { color: theme.textSecondary }]}>e.g. AA1 2BB</ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Company Registration Number (CRN) <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
            value={settings.crn}
            onChangeText={(text) => setSettings({ ...settings, crn: text })}
            placeholder="e.g. 14458837"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />
          <ThemedText style={[styles.helperText, { color: theme.textSecondary }]}>e.g. XXXXXXXX</ThemedText>
        </View>

        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <ThemedText style={styles.sectionHeading}>VAT Status & Settings</ThemedText>
          <ThemedText style={[styles.paragraph, { color: theme.textSecondary }]}>
            I am not VAT registered because my business turnover doesn't exceed the VAT registration threshold.
          </ThemedText>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { opacity: pressed || isSaving ? 0.7 : 1 }
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
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
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  required: {
    color: "#EF4444", // UTOColors.error
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: "#F7C948", // UTOColors.primary
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
