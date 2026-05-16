import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface SaveButtonProps {
  saved?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SaveButton({
  saved = false,
  onPress,
  size = "sm",
  style,
  accessibilityLabel = saved ? "Remove saved item" : "Save item",
}: SaveButtonProps) {
  const colors = useColors();
  const s = styles(colors);
  const iconSize = size === "md" ? 21 : 16;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.base, s[size], style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name={saved ? "bookmark" : "bookmark-outline"}
        size={iconSize}
        color={saved ? colors.appText : colors.appBorderMid}
      />
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      justifyContent: "center",
    },
    sm: {
      width: 28,
      height: 28,
    },
    md: {
      width: 32,
      height: 32,
    },
  });
