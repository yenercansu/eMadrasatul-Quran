import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface QuestionNavProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function QuestionNav({ canGoPrev, canGoNext, onPrev, onNext }: QuestionNavProps) {
  const colors = useColors();

  return (
    <View style={s.row}>
      <TouchableOpacity
        style={[
          s.btn,
          s.secondaryBtn,
          { backgroundColor: colors.secondary, borderColor: colors.border },
          !canGoPrev && s.disabled,
        ]}
        onPress={onPrev}
        activeOpacity={0.85}
        disabled={!canGoPrev}
      >
        <Feather name="arrow-left" size={16} color={colors.foreground} />
        <Text style={[s.secondaryText, { color: colors.foreground }]}>Prev</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.btn, s.primaryBtn, { backgroundColor: colors.primary }, !canGoNext && s.disabled]}
        onPress={onNext}
        activeOpacity={0.85}
        disabled={!canGoNext}
      >
        <Text style={[s.primaryText, { color: colors.primaryForeground }]}>Next</Text>
        <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtn: {},
  secondaryBtn: { borderWidth: 1 },
  primaryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  secondaryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.4 },
});
