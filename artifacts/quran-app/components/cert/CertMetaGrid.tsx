import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface MetaCell {
  value: string;
  label: string;
}

interface CertMetaGridProps {
  cells: MetaCell[];
}

export function CertMetaGrid({ cells }: CertMetaGridProps) {
  const c = useColors();

  return (
    <View style={[styles.grid, { borderColor: c.borderSubtle, backgroundColor: c.hifzCardBg }]}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            { borderRightColor: c.borderSubtle, borderBottomColor: c.borderSubtle },
            i === cells.length - 1 && styles.cellLast,
          ]}
        >
          <Text style={[styles.value, { color: c.hifzText }]}>{cell.value}</Text>
          <Text style={[styles.label, { color: c.hifzFaint }]}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 2,
    borderRightWidth: 1,
    borderBottomWidth: 0,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
});
