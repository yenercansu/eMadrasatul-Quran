import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface CertRecordRowProps {
  label: string;
  sublabel?: string;
  value: string;
  last?: boolean;
}

export function CertRecordRow({ label, sublabel, value, last = false }: CertRecordRowProps) {
  const c = useColors();

  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: c.borderSubtle }]}>
      <View style={styles.left}>
        <Text style={[styles.label, { color: c.hifzFaint }]}>{label}</Text>
        {sublabel ? <Text style={[styles.sublabel, { color: c.hifzFaint }]}>{sublabel}</Text> : null}
      </View>
      <Text style={[styles.value, { color: c.hifzText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  left: {
    flexDirection: "column",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  sublabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
