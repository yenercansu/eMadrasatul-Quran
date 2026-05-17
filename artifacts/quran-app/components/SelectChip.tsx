import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface SelectChipProps {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress?: () => void;
  flex?: boolean;
  recommended?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SelectChip({
  label,
  sublabel,
  selected = false,
  onPress,
  flex = false,
  recommended = false,
  style,
}: SelectChipProps) {
  const c = useColors();
  const hasSubLabel = !!sublabel;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const containerStyle = [
    hasSubLabel ? styles.cardBase : styles.pillBase,
    {
      backgroundColor: selected ? c.appText : c.appSecondarySurface,
      borderColor: selected ? c.appText : c.appBorderLighter,
    },
    flex && { flex: 1 },
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={!onPress}
    >
      <Text
        style={[
          hasSubLabel ? styles.cardLabel : styles.pillLabel,
          { color: selected ? "#FFFFFF" : c.appText },
        ]}
      >
        {label}
      </Text>
      {sublabel && (
        <Text
          style={[
            styles.subLabel,
            { color: selected ? "rgba(255,255,255,0.68)" : c.appDarkGray },
          ]}
        >
          {sublabel}
        </Text>
      )}
      {recommended && !selected && (
        <Text style={[styles.recommendedBadge, { color: c.appGold }]}>
          Recommended
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pillBase: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pillLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  cardBase: {
    flex: 1,
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 5,
    textAlign: "center",
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  recommendedBadge: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
