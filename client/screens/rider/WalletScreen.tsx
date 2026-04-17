import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/context/AuthContext";
import { api, WalletTransaction } from "@/lib/api";
import { Spacing, BorderRadius, UTOColors } from "@/constants/theme";

export default function WalletScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user?.id]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await api.payments.getWalletTransactions(user!.id);
      // Sort newest first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(data);

      // Refresh wallet balance from server to guarantee accuracy
      try {
        const freshUser = await api.users.get(user!.id);
        if (freshUser && typeof freshUser.walletBalance === 'number') {
          if (freshUser.walletBalance !== user?.walletBalance) {
            updateProfile({ walletBalance: freshUser.walletBalance });
          }
        }
      } catch (err) {
        console.warn("Failed to refresh user balance:", err);
      }
    } catch (err) {
      console.warn("Failed to load wallet transactions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isCredit = item.type === "credit";
    return (
      <View style={styles.transactionItem}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: isCredit ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)" }
        ]}>
          <MaterialIcons 
            name={isCredit ? "add" : "remove"} 
            size={20} 
            color={isCredit ? "#10B981" : "#EF4444"} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <ThemedText style={styles.description}>
            {item.description || (isCredit ? "Credit Added" : "Amount Deducted")}
          </ThemedText>
          <ThemedText style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </ThemedText>
        </View>
        <ThemedText style={[styles.amount, { color: isCredit ? "#10B981" : "#EF4444" }]}>
          {isCredit ? "+" : "-"}£{item.amount.toFixed(2)}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>My Wallet</ThemedText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.balanceContainer}>
        <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
        <ThemedText style={styles.balanceAmount}>£{Number(user?.walletBalance || 0).toFixed(2)}</ThemedText>
      </View>

      <View style={styles.historyContainer}>
        <ThemedText style={styles.historyTitle}>Transaction History</ThemedText>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={UTOColors.primary} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="account-balance-wallet" size={48} color="#333" />
            <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  balanceContainer: {
    backgroundColor: "#1A1A1A",
    margin: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: 28,
    paddingBottom: 24,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
    lineHeight: 20,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 52,
    includeFontPadding: false,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: "#111111",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    marginTop: Spacing.md,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#6B7280",
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
});
