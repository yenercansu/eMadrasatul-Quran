import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface VerseCardProps {
  verse: string;
  reference: string;
  style?: StyleProp<ViewStyle>;
}

export function VerseCard({ verse, reference, style }: VerseCardProps) {
  return (
    <View style={[s.card, style]}>
      <Text style={s.verse}>{verse}</Text>
      <Text style={s.reference}>— {reference}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#EDE8DE",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
  },
  verse: {
    fontSize: 15,
    lineHeight: 24,
    color: "#6B6150",
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    textAlign: "center",
  },
  reference: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B6150",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
});
