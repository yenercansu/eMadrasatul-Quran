import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Tag } from "@/components/Tag";

export const SECTION_LOOP_COLOR = "#16A34A";

interface Props {
  visible: boolean;
  repeatCount: number;
  currentRepeat: number;
  wordCount: number | null;
  ayahNumber: number | null;
  bottom: number;
  onStop: () => void;
}

export function SectionLoopChip({
  visible, repeatCount, currentRepeat, wordCount, ayahNumber, bottom, onStop,
}: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: visible ? 0 : 6, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  const wordPart = wordCount != null
    ? `${wordCount} word${wordCount === 1 ? "" : "s"}`
    : "section";
  const ayahPart = ayahNumber != null ? ` · Ayah ${ayahNumber}` : "";
  const countPart = repeatCount === 999 ? " · ∞" : ` · ${currentRepeat + 1}/${repeatCount}`;
  const label = `Repeating ${wordPart}${ayahPart}${countPart}`;

  const isDark = colors.background === "#0E0E0E";
  const accentBgColor = isDark ? "#1A2B1E" : "#F0FDF4";

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[s.wrapper, { bottom, opacity, transform: [{ translateY }] }]}
    >
      <Tag
        label={label}
        accentColor={SECTION_LOOP_COLOR}
        accentBgColor={accentBgColor}
        onDismiss={onStop}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 45,
  },
});
