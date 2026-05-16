// client/screens/driver/DriverPayoutMethodsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useDriver } from '@/context/DriverContext';
import { getApiUrl } from '@/lib/query-client';
import * as Haptics from 'expo-haptics';

const UTO_YELLOW = '#FFD000';

export default function DriverPayoutMethodsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { driverProfile } = useDriver();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [bankProvider, setBankProvider] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);

  const driverId = driverProfile?.id || user?.id;

  useEffect(() => {
    loadPayoutMethod();
  }, []);

  const loadPayoutMethod = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/driver-payout-methods/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setAccountName(data.account_name || '');
          setAccountNo(data.account_no || '');
          setSortCode(data.sort_code || '');
          setBankProvider(data.bank_provider || '');
          setExistingId(data.id);
        }
      }
    } catch (err) {
      console.warn('Failed to load payout method:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accountName.trim()) {
      Alert.alert('Missing Info', 'Please enter the account name.');
      return;
    }
    if (!accountNo.trim()) {
      Alert.alert('Missing Info', 'Please enter the account number.');
      return;
    }
    if (!sortCode.trim()) {
      Alert.alert('Missing Info', 'Please enter the sort code.');
      return;
    }
    if (!bankProvider.trim()) {
      Alert.alert('Missing Info', 'Please enter the bank provider.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const method = existingId ? 'PUT' : 'POST';
      const url = existingId
        ? `${getApiUrl()}/api/driver-payout-methods/${driverId}/${existingId}`
        : `${getApiUrl()}/api/driver-payout-methods/${driverId}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName.trim(),
          account_no: accountNo.trim(),
          sort_code: sortCode.trim(),
          bank_provider: bankProvider.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();
      if (data.id) setExistingId(data.id);

      Alert.alert('Saved ✅', 'Your payout method has been saved successfully.');
    } catch (err) {
      Alert.alert('Error', 'Could not save payout method. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 60, alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={UTO_YELLOW} />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading payout details…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4, marginLeft: -4 }}>
            <Feather name="arrow-left" size={24} color="#000000" />
          </Pressable>
          <MaterialIcons name="account-balance" size={22} color={UTO_YELLOW} style={{ marginRight: 8 }} />
          <Text style={s.headerTitle}>Payout Methods</Text>
        </View>
        <Text style={s.headerSub}>Add your bank details to receive payouts</Text>

        <ScrollView
          contentContainerStyle={s.formContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={s.infoBanner}>
            <MaterialIcons name="info-outline" size={18} color="#1D4ED8" />
            <Text style={s.infoText}>
              Your bank details are securely stored and used for processing payouts.
            </Text>
          </View>

          {/* Form Fields */}
          <Text style={s.label}>
            Account Name <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="e.g. John Smith"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          <Text style={s.label}>
            Account Number <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={accountNo}
            onChangeText={setAccountNo}
            placeholder="e.g. 12345678"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={8}
          />

          <Text style={s.label}>
            Sort Code <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={sortCode}
            onChangeText={setSortCode}
            placeholder="e.g. 12-34-56"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={8}
          />

          <Text style={s.label}>
            Bank Provider <Text style={s.required}>*</Text>
          </Text>
          <TextInput
            style={s.input}
            value={bankProvider}
            onChangeText={setBankProvider}
            placeholder="e.g. Barclays, HSBC, Monzo"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />

          {/* Save Button */}
          <Pressable
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#000" />
                <Text style={s.saveBtnText}>
                  {existingId ? 'Update Payout Method' : 'Save Payout Method'}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#000000' },
  headerSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 12 },

  formContainer: { padding: 20, paddingBottom: 60 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
  },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UTO_YELLOW,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 32,
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
