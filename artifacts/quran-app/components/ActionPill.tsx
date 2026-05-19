import React from "react";
import {
  ActivityIndicator,
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

type ActionPillVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "outline"
  | "ghost"
  | "border";
type ActionPillSize = "sm" | "md" | "lg";

interface ActionPillProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  icon?: FeatherIconName;
  iconPosition?: "left" | "right";
  variant?: ActionPillVariant;
  size?: ActionPillSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
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
  disabled = false,
  loading = false,
  ...touchableProps
}: ActionPillProps) {
  const colors = useColors();
  const s = styles(colors);
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;
  const iconColor = isDisabled
    ? colors.disabledText
    : isPrimary
    ? colors.onAccent
    : colors.appText;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  const iconNode = icon && !loading ? (
    <Feather name={icon} size={iconSize} color={iconColor} />
  ) : null;

  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      style={[s.base, s[size], s[variant], isDisabled && s.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.onAccent : colors.appText}
        />
      ) : (
        <>
          {iconPosition === "left" ? iconNode : null}
          <Text
            style={[
              s.label,
              isPrimary && s.primaryLabel,
              size === "sm" && s.smLabel,
              size === "lg" && s.lgLabel,
              isDisabled && s.disabledLabel,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {iconPosition === "right" ? iconNode : null}
        </>
      )}
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
      borderRadius: colors.borders.lg,
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
      backgroundColor: colors.appText,
      borderWidth: 0,
    },
    soft: {
      backgroundColor: colors.appSecondarySurface,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.accentSoft,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
    },
    ghost: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    border: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.appBorderMid,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    primaryLabel: {
      color: colors.onAccent,
    },
    smLabel: {
      fontSize: 13,
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    lgLabel: {
      fontSize: 16,
    },
    disabled: {
      backgroundColor: colors.disabledBackground,
      borderColor: "transparent",
    },
    disabledLabel: {
      color: colors.disabledText,
    },
  });
