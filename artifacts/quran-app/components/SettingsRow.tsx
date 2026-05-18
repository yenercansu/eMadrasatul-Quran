import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface RowProps {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  labelStyle?: StyleProp<TextStyle>;
}

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export function SettingsCard({ children, style }: CardProps) {
  const colors = useColors();
  const s = styles(colors);
  return <View style={[s.card, style]}>{children}</View>;
}

export function SettingsRow({ label, value, right, onPress, last, labelStyle }: RowProps) {
  const colors = useColors();
  const s = styles(colors);
  const inner = (
    <>
      <Text style={[s.label, labelStyle]}>{label}</Text>
      {right ?? (
        <View style={s.valueWrap}>
          {value !== undefined && <Text style={s.value}>{value}</Text>}
          {onPress && <Feather name="chevron-right" size={16} color={colors.appIconMuted} />}
        </View>
      )}
    </>
  );

  return onPress ? (
    <TouchableOpacity style={[s.row, last && s.rowLast]} onPress={onPress} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  ) : (
    <View style={[s.row, last && s.rowLast]}>{inner}</View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 20,
      backgroundColor: colors.appCardWarm,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      overflow: "hidden",
      ...colors.shadows.softLift,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appSoftDivider,
      minHeight: 58,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.appText,
      fontFamily: "Inter_600SemiBold",
      paddingRight: 12,
    },
    valueWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    value: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.appTextMuted,
      fontFamily: "Inter_600SemiBold",
    },
  });
