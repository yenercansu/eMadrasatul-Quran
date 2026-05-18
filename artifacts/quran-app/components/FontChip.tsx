import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface FontChipProps {
  label: string;
  sample?: string;
  fontFamily?: string;
  selected: boolean;
  onPress: () => void;
}

export function FontChip({ label, sample = "بِسْمِ", fontFamily, selected, onPress }: FontChipProps) {
  const c = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        s.chip,
        {
          borderColor: selected ? c.appText : c.appBorderLighter,
          backgroundColor: selected ? c.appText + "18" : c.appSecondarySurface,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[s.label, { color: selected ? c.appText : c.appTextMuted }]}>{label}</Text>
      <Text style={[s.sample, fontFamily ? { fontFamily } : undefined, { color: selected ? c.appText : c.appText }]}>
        {sample}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  chip: {
    width: 82,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  sample: {
    fontSize: 22,
    lineHeight: 36,
  },
});
