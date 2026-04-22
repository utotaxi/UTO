import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { UTOColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";

interface RatingModalProps {
  visible: boolean;
  /** Who is being rated */
  ratedRole: "driver" | "rider";
  /** Name of the person being rated */
  ratedName: string;
  /** Ride ID this rating belongs to */
  rideId: string;
  /** Called when rating is submitted */
  onSubmit: (rideId: string, rating: number, comment?: string) => void;
  /** Called when modal is dismissed */
  onDismiss: () => void;
}

export function RatingModal({
  visible,
  ratedRole,
  ratedName,
  rideId,
  onSubmit,
  onDismiss,
}: RatingModalProps) {
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(rideId, rating, comment.trim() || undefined);
    // Reset for next use
    setRating(0);
    setComment("");
  };

  const handleSkip = () => {
    onDismiss();
    setRating(0);
    setComment("");
  };

  const roleLabel = ratedRole === "driver" ? "your driver" : "the rider";
  const roleIcon = ratedRole === "driver" ? "directions-car" : "person";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: UTOColors.primary + "15" }]}>
              <MaterialIcons name={roleIcon} size={32} color={UTOColors.primary} />
            </View>
            <ThemedText style={styles.title}>Rate Your Trip</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              How was your experience with {roleLabel}?
            </ThemedText>
            <ThemedText style={[styles.name, { color: theme.text }]}>
              {ratedName}
            </ThemedText>
          </View>

          {/* Star Rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                style={styles.starBtn}
              >
                <MaterialIcons
                  name={star <= rating ? "star" : "star-border"}
                  size={44}
                  color={star <= rating ? "#F7C948" : theme.textSecondary + "60"}
                />
              </Pressable>
            ))}
          </View>

          {/* Rating Label */}
          {rating > 0 && (
            <ThemedText style={[styles.ratingLabel, { color: UTOColors.primary }]}>
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Great"}
              {rating === 5 && "Excellent!"}
            </ThemedText>
          )}

          {/* Optional Comment */}
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Leave a comment (optional)"
            placeholderTextColor={theme.textSecondary + "80"}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          {/* Buttons */}
          <Pressable
            onPress={handleSubmit}
            disabled={rating === 0}
            style={[
              styles.submitBtn,
              {
                backgroundColor:
                  rating > 0 ? UTOColors.primary : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.submitText,
                { color: rating > 0 ? "#000" : theme.textSecondary },
              ]}
            >
              Submit Rating
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  commentInput: {
    width: "100%",
    minHeight: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: Spacing.lg,
  },
  submitBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
