import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { AccountSettings } from "@/contexts/QuranContext";

type ReadingTheme = AccountSettings["theme"];

const THEMES: { key: ReadingTheme; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "auto", label: "Auto" },
];

interface ReadingThemeSelectorProps {
  value: ReadingTheme;
  onChange: (theme: ReadingTheme) => void;
  size?: "compact" | "regular";
  style?: StyleProp<ViewStyle>;
}

export function ReadingThemeSelector({ value, onChange, size = "regular", style }: ReadingThemeSelectorProps) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={[s.row, style]}>
      {THEMES.map((theme) => {
        const active = value === theme.key;
        return (
          <TouchableOpacity
            key={theme.key}
            style={[s.chip, size === "compact" && s.chipCompact, active && s.chipActive]}
            onPress={() => onChange(theme.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.text, size === "compact" && s.textCompact, active && s.textActive]}>{theme.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    chip: {
      minWidth: 72,
      minHeight: 40,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipCompact: {
      minWidth: 52,
      minHeight: 36,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
    },
    text: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
    },
    textCompact: {
      fontSize: 12,
    },
    textActive: {
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
  });
