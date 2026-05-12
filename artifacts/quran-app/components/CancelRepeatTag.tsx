import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  repeatCount: number;
  onCancel: () => void;
}

export function CancelRepeatTag({ repeatCount, onCancel }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Ionicons name="repeat" size={16} color="#FFFFFF" />
        <Text style={styles.badgeText}>
          {repeatCount >= 999 ? "∞" : `${repeatCount}x`}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.tag}
        onPress={onCancel}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.tagText}>cancel repeat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  tag: {
    backgroundColor: "#F3EFE9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#D4CFC8",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555555",
    fontFamily: "Inter_600SemiBold",
  },
});
