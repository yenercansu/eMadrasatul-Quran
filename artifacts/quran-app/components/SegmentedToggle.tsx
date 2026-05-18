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

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedToggleProps<T>) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={[s.wrap, style]}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[s.button, active && s.buttonActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.85}
          >
            <Text style={[s.text, active && s.textActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      backgroundColor: colors.appSoftPill,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      padding: 3,
    },
    button: {
      flex: 1,
      minHeight: 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    buttonActive: {
      backgroundColor: colors.appSelectedPill,
    },
    text: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appIconMuted,
      fontFamily: "Inter_600SemiBold",
    },
    textActive: {
      color: colors.appText,
      fontFamily: "Inter_600SemiBold",
    },
  });
