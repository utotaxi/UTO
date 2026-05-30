//client/screens/rider/WithdrawalScreen.tsx

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Spacing, BorderRadius, UTOColors } from "@/constants/theme";

export default function WithdrawalScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "payout" | "history">("overview");
  
  // Payout method state
  const [payoutMethod, setPayoutMethod] = useState<any>(null);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  
  // Form state
  const [accountName, setAccountName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [bankProvider, setBankProvider] = useState("");
  
  // Withdrawal request state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Withdrawal history
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load payout method on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadPayoutMethod();
        loadWithdrawalHistory();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const loadPayoutMethod = async () => {
    try {
      setIsLoadingPayout(true);
      const method = await api.withdrawals.getPayoutMethod(user!.id);
      setPayoutMethod(method);
      if (method) {
        setAccountName(method.account_name || "");
        setAccountNo(method.account_no || "");
        setSortCode(method.sort_code || "");
        setBankProvider(method.bank_provider || "");
        setShowPayoutForm(false);
      } else {
        setShowPayoutForm(true);
      }
    } catch (err) {
      console.warn("Failed to load payout method:", err);
    } finally {
      setIsLoadingPayout(false);
    }
  };

  const loadWithdrawalHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const history = await api.withdrawals.getWithdrawalHistory(user!.id);
      setWithdrawals(history);
    } catch (err) {
      console.warn("Failed to load withdrawal history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSavePayoutMethod = async () => {
    if (!accountName.trim() || !accountNo.trim() || !sortCode.trim() || !bankProvider.trim()) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      setIsSaving(true);
      if (payoutMethod) {
        await api.withdrawals.updatePayoutMethod(user!.id, payoutMethod.id, {
          account_name: accountName,
          account_no: accountNo,
          sort_code: sortCode,
          bank_provider: bankProvider,
        });
        Alert.alert("Success", "Payout method updated");
      } else {
        await api.withdrawals.createPayoutMethod(user!.id, {
          account_name: accountName,
          account_no: accountNo,
          sort_code: sortCode,
          bank_provider: bankProvider,
        });
        Alert.alert("Success", "Payout method added");
      }
      setShowPayoutForm(false);
      loadPayoutMethod();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save payout method");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!payoutMethod) {
      Alert.alert("Error", "Please add a payout method first");
      return;
    }

    if (amount > (user?.walletBalance || 0)) {
      Alert.alert("Error", "Insufficient wallet balance");
      return;
    }

    try {
      setIsRequesting(true);
      await api.withdrawals.requestWithdrawal(user!.id, amount, payoutMethod.id);
      Alert.alert("Success", `Withdrawal request of £${amount.toFixed(2)} submitted`);
      setWithdrawAmount("");
      loadWithdrawalHistory();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to request withdrawal");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string, amount: number) => {
    Alert.alert(
      "Cancel Withdrawal?",
      `This will cancel your withdrawal request of £${amount.toFixed(2)} and refund your wallet.`,
      [
        { text: "Keep it", onPress: () => {}, style: "cancel" },
        {
          text: "Cancel Request",
          onPress: async () => {
            try {
              setIsRequesting(true);
              await api.withdrawals.cancelWithdrawal(withdrawalId, "Cancelled by user");
              Alert.alert("Success", "Withdrawal cancelled and wallet refunded");
              loadWithdrawalHistory();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to cancel withdrawal");
            } finally {
              setIsRequesting(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const renderWithdrawalItem = ({ item }: { item: any }) => {
    const statusColorMap: { [key: string]: string } = {
      pending: "#F59E0B",
      completed: "#10B981",
      failed: "#EF4444",
      cancelled: "#EF4444",
    };
    const statusColor = statusColorMap[item.status] || "#9CA3AF";

    return (
      <View style={[styles.historyItem, { borderLeftColor: statusColor }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.historyAmount}>
            £{item.amount.toFixed(2)}
          </ThemedText>
          <ThemedText style={styles.historyStatus}>
            Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </ThemedText>
          <ThemedText style={styles.historyDate}>
            {new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {item.status === "pending" && (
            <Pressable
              onPress={() => handleCancelWithdrawal(item.id, item.amount)}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="close" size={20} color="#EF4444" />
            </Pressable>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Withdrawals</ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(["overview", "payout", "history"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          >
            <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <View>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <ThemedText style={styles.balanceLabel}>Available Balance</ThemedText>
              <ThemedText style={styles.balanceAmount}>
                £{Number(user?.walletBalance || 0).toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.balanceHint}>
                This is your wallet balance from cash overpayments
              </ThemedText>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={styles.actionButton}
                onPress={() => setActiveTab("payout")}
              >
                <MaterialIcons name="account-balance" size={24} color={UTOColors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText style={styles.actionTitle}>Add Bank Account</ThemedText>
                  <ThemedText style={styles.actionSubtitle}>
                    {payoutMethod ? "Update your bank details" : "Add your bank account for withdrawals"}
                  </ThemedText>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </Pressable>

              {payoutMethod && (
                <Pressable
                  style={[styles.actionButton, { marginTop: 12 }]}
                  onPress={() => setActiveTab("overview")}
                >
                  <MaterialIcons name="credit-card" size={24} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText style={styles.actionTitle}>Request Withdrawal</ThemedText>
                    <ThemedText style={styles.actionSubtitle}>
                      Transfer funds to your bank account
                    </ThemedText>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#666" />
                </Pressable>
              )}
            </View>

            {/* Withdrawal Request */}
            {payoutMethod && (
              <View style={styles.withdrawalSection}>
                <ThemedText style={styles.sectionTitle}>Request Withdrawal</ThemedText>
                <View style={styles.withdrawalInputContainer}>
                  <Text style={styles.currencySymbol}>£</Text>
                  <TextInput
                    style={styles.withdrawalInput}
                    placeholder="0.00"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                  />
                </View>

                <View style={styles.infoBox}>
                  <MaterialIcons name="info" size={16} color="#3B82F6" />
                  <ThemedText style={styles.infoText}>
                    Withdrawals are processed within 2-3 business days to {accountName || "your bank"}
                  </ThemedText>
                </View>

                <Pressable
                  style={[
                    styles.withdrawButton,
                    (!withdrawAmount || isRequesting) && { opacity: 0.5 }
                  ]}
                  onPress={handleRequestWithdrawal}
                  disabled={isRequesting || !withdrawAmount}
                >
                  {isRequesting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={18} color="#000" />
                      <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Payout Method Tab */}
        {activeTab === "payout" && (
          <View>
            {isLoadingPayout ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={UTOColors.primary} />
              </View>
            ) : showPayoutForm ? (
              <View style={styles.formContainer}>
                <ThemedText style={styles.sectionTitle}>
                  {payoutMethod ? "Update Bank Details" : "Add Bank Details"}
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Account Holder Name</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Full name on bank account"
                    placeholderTextColor="#666"
                    value={accountName}
                    onChangeText={setAccountName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Account Number</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="8 digits"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    maxLength={8}
                    value={accountNo}
                    onChangeText={setAccountNo}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Sort Code</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="XX-XX-XX"
                    placeholderTextColor="#666"
                    value={sortCode}
                    onChangeText={setSortCode}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Bank Name/Provider</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Barclays, HSBC, NatWest"
                    placeholderTextColor="#666"
                    value={bankProvider}
                    onChangeText={setBankProvider}
                  />
                </View>

                <View style={styles.infoBox}>
                  <MaterialIcons name="security" size={16} color="#10B981" />
                  <ThemedText style={styles.infoText}>
                    Your bank details are encrypted and only used for withdrawals
                  </ThemedText>
                </View>

                <Pressable
                  style={[styles.submitButton, isSaving && { opacity: 0.5 }]}
                  onPress={handleSavePayoutMethod}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {payoutMethod ? "Update Details" : "Add Details"}
                    </Text>
                  )}
                </Pressable>

                {payoutMethod && (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setShowPayoutForm(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            ) : payoutMethod ? (
              <View style={styles.payoutDisplay}>
                <View style={styles.payoutCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <ThemedText style={styles.sectionTitle}>Current Bank Account</ThemedText>
                    <Pressable onPress={() => setShowPayoutForm(true)}>
                      <MaterialIcons name="edit" size={20} color={UTOColors.primary} />
                    </Pressable>
                  </View>

                  <View style={styles.payoutInfo}>
                    <ThemedText style={styles.payoutLabel}>Holder Name</ThemedText>
                    <ThemedText style={styles.payoutValue}>{payoutMethod.account_name}</ThemedText>
                  </View>

                  <View style={styles.payoutInfo}>
                    <ThemedText style={styles.payoutLabel}>Account Number</ThemedText>
                    <ThemedText style={styles.payoutValue}>
                      ••••{payoutMethod.account_no.slice(-4)}
                    </ThemedText>
                  </View>

                  <View style={styles.payoutInfo}>
                    <ThemedText style={styles.payoutLabel}>Sort Code</ThemedText>
                    <ThemedText style={styles.payoutValue}>{payoutMethod.sort_code}</ThemedText>
                  </View>

                  <View style={styles.payoutInfo}>
                    <ThemedText style={styles.payoutLabel}>Bank</ThemedText>
                    <ThemedText style={styles.payoutValue}>{payoutMethod.bank_provider}</ThemedText>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <View>
            <ThemedText style={styles.sectionTitle}>Withdrawal History</ThemedText>
            {isLoadingHistory ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={UTOColors.primary} />
              </View>
            ) : withdrawals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="history" size={48} color="#333" />
                <ThemedText style={styles.emptyText}>No withdrawals yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Request a withdrawal to see it here
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={withdrawals}
                keyExtractor={(item) => item.id}
                renderItem={renderWithdrawalItem}
                scrollEnabled={false}
                contentContainerStyle={styles.historyList}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: UTOColors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  tabLabelActive: {
    color: UTOColors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  balanceCard: {
    backgroundColor: UTOColors.primary + "15",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: UTOColors.primary + "30",
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: UTOColors.primary,
    marginBottom: 8,
  },
  balanceHint: {
    fontSize: 12,
    color: "#666",
  },
  actionsContainer: {
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#222",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  withdrawalSection: {
    backgroundColor: "#111",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: Spacing.md,
  },
  withdrawalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: UTOColors.primary,
    marginRight: 4,
  },
  withdrawalInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#1E3A5F",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#93C5FD",
    marginLeft: 8,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  withdrawButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: "#111",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#222",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: UTOColors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "#222",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  cancelButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  payoutDisplay: {
    marginBottom: Spacing.lg,
  },
  payoutCard: {
    backgroundColor: "#111",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#222",
  },
  payoutInfo: {
    marginBottom: Spacing.lg,
  },
  payoutLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  payoutValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  historyList: {
    paddingVertical: Spacing.md,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: "#666",
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
