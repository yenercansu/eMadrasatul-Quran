import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface RowProps {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}

interface CardProps {
  children: React.ReactNode;
  style?: any;
}

export function SettingsCard({ children, style }: CardProps) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SettingsRow({ label, value, right, onPress, last }: RowProps) {
  const inner = (
    <>
      <Text style={s.label}>{label}</Text>
      {right ?? (
        <View style={s.valueWrap}>
          {value !== undefined && <Text style={s.value}>{value}</Text>}
          {onPress && <Feather name="chevron-right" size={16} color="#B0B0B0" />}
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

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B6B6B",
    fontFamily: "Inter_600SemiBold",
  },
});
