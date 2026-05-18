import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { AppCard } from "@/components/DesignSystem";

interface VerseCardProps {
  verse: string;
  reference: string;
  style?: StyleProp<ViewStyle>;
}

export function VerseCard({ verse, reference, style }: VerseCardProps) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <AppCard variant="muted" style={[s.card, style]}>
      <Text style={s.verse}>{verse}</Text>
      <Text style={s.reference}>— {reference}</Text>
    </AppCard>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      alignItems: "center",
    },
    verse: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.appDarkerGray,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      textAlign: "center",
    },
    reference: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 18,
      color: colors.appDarkerGray,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
  });
