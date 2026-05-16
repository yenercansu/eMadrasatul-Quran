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
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      padding: 3,
    },
    button: {
      flex: 1,
      minHeight: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    buttonActive: {
      backgroundColor: colors.appBlack,
    },
    text: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
    },
    textActive: {
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
    },
  });
