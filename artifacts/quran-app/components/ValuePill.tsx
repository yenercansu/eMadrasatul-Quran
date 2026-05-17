import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type ValuePillVariant = "dark" | "soft" | "muted";

interface ValuePillProps {
  label: string;
  variant?: ValuePillVariant;
  icon?: FeatherIconName;
  style?: StyleProp<ViewStyle>;
}

/**
 * Display-only pill badge for showing a selected value or status.
 *
 * - `dark`: filled black — for active values (e.g. "10 ayahs / wk")
 * - `soft`: warm surface with border — for summary tags (e.g. "1 yr")
 * - `muted`: light surface, dimmed text — for locked/inactive state (e.g. "Choose date first")
 */
export function ValuePill({ label, variant = "dark", icon, style }: ValuePillProps) {
  const c = useColors();

  const containerStyle = [
    styles.base,
    variant === "dark" && { backgroundColor: c.appText, borderWidth: 0 },
    variant === "soft" && {
      backgroundColor: c.appSecondarySurface,
      borderWidth: 1,
      borderColor: c.appProgressRail,
    },
    variant === "muted" && {
      backgroundColor: c.appSecondarySurface,
      borderWidth: 0,
    },
    style,
  ];

  const textColor =
    variant === "dark"
      ? "#FFFFFF"
      : variant === "muted"
      ? c.appBorderMid
      : c.appText;

  const iconColor = variant === "muted" ? c.appBorderMid : c.appText;

  return (
    <View style={containerStyle}>
      {icon && <Feather name={icon} size={11} color={iconColor} />}
      <Text
        style={[
          styles.label,
          variant === "soft" && styles.softLabel,
          { color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  softLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
