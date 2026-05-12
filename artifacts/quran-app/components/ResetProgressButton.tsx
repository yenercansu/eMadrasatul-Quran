import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface ResetProgressButtonProps {
  onPress: () => void;
  label?: string;
}

export function ResetProgressButton({ onPress, label = "Reset" }: ResetProgressButtonProps) {
  return (
    <TouchableOpacity
      style={s.resetBtn}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={s.resetBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6D3D1",
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78716C",
    fontFamily: "Inter_600SemiBold",
  },
});
