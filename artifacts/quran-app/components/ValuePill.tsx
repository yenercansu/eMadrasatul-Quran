import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppChip, type AppChipVariant } from "@/components/DesignSystem";

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
 * - `dark`: filled warm charcoal — for active values (e.g. "10 ayahs / wk")
 * - `soft`: warm surface with border — for summary tags (e.g. "1 yr")
 * - `muted`: light surface, dimmed text — for locked/inactive state (e.g. "Choose date first")
 */
export function ValuePill({
  label,
  variant = "dark",
  icon,
  style,
}: ValuePillProps) {
  const chipVariant: AppChipVariant =
    variant === "soft" ? "outline" : variant === "muted" ? "muted" : "selected";
  return (
    <AppChip
      label={label}
      icon={icon}
      variant={chipVariant}
      size="sm"
      style={style}
      textStyle={{
        fontFamily: variant === "soft" ? "Inter_700Bold" : "Inter_600SemiBold",
      }}
    />
  );
}
