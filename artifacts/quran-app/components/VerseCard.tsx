import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface VerseCardProps {
  verse: string;
  reference: string;
  style?: StyleProp<ViewStyle>;
}

export function VerseCard({ verse, reference, style }: VerseCardProps) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <View style={[s.card, style]}>
      <Text style={s.label}>{"السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، يَا طَالِبَ الْقُرْآنِ"}</Text>
      <View style={s.divider} />
      <Text style={s.verse}>{verse}</Text>
      <Text style={s.reference}>— {reference}</Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 18,
      alignItems: "center",
    },
    label: {
      fontSize: 17,
      lineHeight: 30,
      color: colors.textTertiary,
      fontFamily: "Amiri_700Bold",
      textAlign: "center",
      writingDirection: "rtl",
      marginBottom: 10,
    },
    divider: {
      width: 28,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
      marginBottom: 14,
    },
    verse: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      textAlign: "center",
    },
    reference: {
      marginTop: 12,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
      letterSpacing: 0.2,
    },
  });
