import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface Props {
  label: string;
  onCancel: () => void;
}

export function CancelModeTag({ label, onCancel }: Props) {
  return (
    <TouchableOpacity
      style={styles.tag}
      onPress={onCancel}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.tagText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: "#F3EFE9",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D4CFC8",
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
    fontFamily: "Inter_600SemiBold",
  },
});
