import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PaginationProps {
  page: number;        // 0-indexed
  totalPages: number;
  totalItems: number;
  itemLabel: string;   // singular, e.g. "surah" or "ayah"
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, totalItems, itemLabel, onPrev, onNext }: PaginationProps) {
  const c = useColors();
  const label = totalItems === 1 ? itemLabel : `${itemLabel}s`;
  const prevDisabled = page === 0;
  const nextDisabled = page >= totalPages - 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <TouchableOpacity
        onPress={onPrev}
        disabled={prevDisabled}
        activeOpacity={0.75}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: prevDisabled ? c.appStone : c.appText,
          minWidth: 90,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: prevDisabled ? c.appTextMuted : c.appWhite }}>
          ‹ Prev
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: c.appTextMuted, textAlign: "center", flex: 1 }}>
        Page {page + 1} of {totalPages} · {totalItems} {label}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        disabled={nextDisabled}
        activeOpacity={0.75}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: nextDisabled ? c.appStone : c.appText,
          minWidth: 90,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: nextDisabled ? c.appTextMuted : c.appWhite }}>
          Next ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}
