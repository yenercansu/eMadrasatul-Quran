import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type ActionPillVariant = "primary" | "secondary" | "soft" | "outline" | "ghost";
type ActionPillSize = "sm" | "md" | "lg";

interface ActionPillProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  icon?: FeatherIconName;
  iconPosition?: "left" | "right";
  variant?: ActionPillVariant;
  size?: ActionPillSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function ActionPill({
  label,
  icon,
  iconPosition = "left",
  variant = "soft",
  size = "md",
  style,
  textStyle,
  activeOpacity = 0.8,
  ...touchableProps
}: ActionPillProps) {
  const colors = useColors();
  const s = styles(colors);
  const isPrimary = variant === "primary";
  const iconColor = isPrimary ? colors.appWhite : colors.appBlack;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  const iconNode = icon ? <Feather name={icon} size={iconSize} color={iconColor} /> : null;

  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={activeOpacity}
      style={[s.base, s[size], s[variant], style]}
    >
      {iconPosition === "left" ? iconNode : null}
      <Text style={[s.label, isPrimary && s.primaryLabel, size === "sm" && s.smLabel, textStyle]}>
        {label}
      </Text>
      {iconPosition === "right" ? iconNode : null}
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 14,
    },
    sm: {
      minHeight: 42,
      paddingHorizontal: 16,
    },
    md: {
      minHeight: 48,
      paddingHorizontal: 16,
    },
    lg: {
      minHeight: 56,
      paddingHorizontal: 18,
    },
    primary: {
      backgroundColor: colors.appBlack,
      borderWidth: 0,
    },
    soft: {
      backgroundColor: colors.appSecondarySurface,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.appSecondarySurface,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: colors.appWhite,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
    },
    ghost: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    primaryLabel: {
      color: colors.appWhite,
    },
    smLabel: {
      fontSize: 13,
      letterSpacing: 0,
      textTransform: "uppercase",
    },
  });
