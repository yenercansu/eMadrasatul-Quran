import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SurahListRowProps {
  englishName: string;
  arabicName: string;
  ayahCount: number;
  revelationType?: string;
  isLast?: boolean;
  onPress: () => void;
  right?: React.ReactNode;
}

export function SurahListRow({
  englishName,
  arabicName,
  ayahCount,
  revelationType,
  isLast,
  onPress,
  right,
}: SurahListRowProps) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity
      style={[s.row, isLast && s.rowLast]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={s.info}>
        <Text style={s.name}>{englishName}</Text>
        <Text style={s.meta}>
          {ayahCount} Ayahs{revelationType ? ` • ${revelationType}` : ""}
        </Text>
      </View>
      <Text style={s.arabic}>{arabicName}</Text>
      {right}
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appSeparator,
      gap: 16,
    },
    rowLast: { borderBottomWidth: 0 },
    info: { flex: 1, justifyContent: "center" },
    name: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    meta: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    arabic: {
      fontSize: 18,
      color: colors.appTextPrimary,
    },
  });
