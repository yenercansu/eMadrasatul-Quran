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
      <Text
        style={{
          fontSize: 13,
          color: selected ? c.appText : c.appTextMuted,
          fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
        }}
      >
        {label}
      </Text>
  );
  const style = {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: colors.borders.full,
    borderWidth: 1,
    borderColor: selected ? c.appSelectedPill : c.appSoftBorder,
    backgroundColor: selected ? c.appSelectedPill : c.appCardWarm,
  };

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      {content}
    </TouchableOpacity>
  );
}
