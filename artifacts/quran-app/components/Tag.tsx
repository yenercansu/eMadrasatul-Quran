import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { AppChip } from "@/components/DesignSystem";

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

export function Tag({
  label,
  selected = false,
  onPress,
  onDismiss,
  accentColor,
  accentBgColor,
}: TagProps) {
  const c = useColors();

  const customStyle =
    accentColor || accentBgColor
      ? {
          borderColor: accentColor ?? c.appSoftBorder,
          backgroundColor: accentBgColor ?? c.card,
        }
      : undefined;
  const textColor = accentColor ?? (selected ? c.appText : c.appTextMuted);

  const textElement = (
    <Text
      style={[
        s.label,
        {
          color: textColor,
          fontFamily:
            selected || accentColor ? "Inter_600SemiBold" : "Inter_400Regular",
        },
      ]}
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

  if (!onDismiss) {
    return (
      <AppChip
        label={label}
        selected={selected}
        onPress={onPress}
        style={customStyle}
        textStyle={{
          color: textColor,
          fontFamily:
            selected || accentColor ? "Inter_600SemiBold" : "Inter_400Regular",
        }}
      />
    );
  }

  return (
    <View
      style={[
        s.dismissibleContainer,
        { backgroundColor: c.card, borderColor: c.appSoftBorder },
        selected &&
          !customStyle && {
            backgroundColor: c.appSelectedPill,
            borderColor: c.appSelectedPill,
          },
        customStyle,
      ]}
    >
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {textElement}
        </TouchableOpacity>
      ) : (
        textElement
      )}
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
  dismissibleContainer: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
  dismissIcon: {
    marginLeft: 2,
  },
});
