import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface TagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Tag({ label, selected = false, onPress }: TagProps) {
  const c = useColors();
  const content = (
      <Text style={{ fontSize: 14, color: selected ? c.appWhite : c.appText, fontFamily: "Inter_400Regular" }}>
        {label}
      </Text>
  );
  const style = {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: colors.borders.full,
    borderWidth: 1,
    borderColor: selected ? c.appText : c.appBorderMid,
    backgroundColor: selected ? c.appText : c.appLighterBg,
  };

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      {content}
    </TouchableOpacity>
  );
}
