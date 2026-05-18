import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface TagProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Renders a ✕ inside the pill that calls this when tapped */
  onDismiss?: () => void;
  /** Custom border + text color — overrides selected state colors */
  accentColor?: string;
  /** Custom background color — used together with accentColor */
  accentBgColor?: string;
}

export function Tag({ label, selected = false, onPress, onDismiss, accentColor, accentBgColor }: TagProps) {
  const c = useColors();

  const borderColor = accentColor ?? (selected ? c.appSelectedPill : c.appSoftBorder);
  const backgroundColor = accentBgColor ?? (selected ? c.appSelectedPill : c.appCardWarm);
  const textColor = accentColor ?? (selected ? c.appText : c.appTextMuted);

  const containerStyle = {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: colors.borders.full,
    borderWidth: 1,
    borderColor,
    backgroundColor,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  };

  const textElement = (
    <Text
      style={{
        fontSize: 13,
        color: textColor,
        fontFamily: (selected || accentColor) ? "Inter_600SemiBold" : "Inter_400Regular",
      }}
    >
      {label}
    </Text>
  );

  const dismissBtn = onDismiss ? (
    <Feather
      name="x"
      size={12}
      color={accentColor ?? c.appTextMuted}
      style={s.dismissIcon}
    />
  ) : null;

  const inner = <>{textElement}{dismissBtn}</>;

  if (!onPress && !onDismiss) return <View style={containerStyle}>{inner}</View>;

  if (onPress && !onDismiss) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={containerStyle}>
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {textElement}
        </TouchableOpacity>
      ) : textElement}
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        {dismissBtn}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  dismissIcon: {
    marginLeft: 2,
  },
});
