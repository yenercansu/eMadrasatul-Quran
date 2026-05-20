import React from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Large screen-level heading. Used on tab page headers (Al-Quran, Madrasa, etc.)
 */
export function PageTitle({ children, style }: TextProps) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontSize: 28,
          fontWeight: "800",
          color: colors.appText,
          fontFamily: "Inter_700Bold",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * Third-level label for sub-sections or grouped content within a section.
 * Smaller and muted compared to SubSectionTitle.
 */
export function TertiaryTitle({ children, style }: TextProps) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontSize: 12,
          fontWeight: "700",
          color: colors.appTextMuted,
          fontFamily: "Inter_700Bold",
          textTransform: "uppercase",
          letterSpacing: 1.1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * Section heading used inside screens (Last Visited, Saved Surahs, All Surahs by Juz, etc.)
 * Does NOT include horizontal padding — let the container or a style prop handle alignment.
 */
export function SubSectionTitle({ children, style }: TextProps) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontSize: 18,
          fontWeight: "700",
          color: colors.appText,
          fontFamily: "Inter_700Bold",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
