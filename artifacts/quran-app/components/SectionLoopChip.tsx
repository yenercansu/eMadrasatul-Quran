import React, { useEffect, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export const SECTION_LOOP_COLOR = "#16A34A";

const CHIP_COLOR = "#7B5C3E";
const CHIP_BG_LIGHT = "#F5F0EB";
const CHIP_BG_DARK = "#1E1710";

interface Props {
  visible: boolean;
  repeatCount: number;
  currentRepeat: number;
  bottom: number;
  onStop: () => void;
}

export function SectionLoopChip({ visible, repeatCount, currentRepeat, bottom, onStop }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: visible ? 0 : 8, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, translateY]);

  const countPart = repeatCount === 999 ? "∞" : `${currentRepeat + 1}/${repeatCount}`;
  const label = `Section Repeat • ${countPart}`;

  const isDark = colors.background === "#0E0E0E";
  const accentBgColor = isDark ? CHIP_BG_DARK : CHIP_BG_LIGHT;

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[s.wrapper, { bottom, opacity, transform: [{ translateY }] }]}
    >
      <View style={[s.pill, { backgroundColor: accentBgColor }]}>
        <Ionicons name="layers-outline" size={13} color={CHIP_COLOR} />
        <Text style={[s.label, { color: CHIP_COLOR }]} numberOfLines={1}>
          {label}
        </Text>
        <TouchableOpacity
          onPress={onStop}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={13} color={CHIP_COLOR} />
        </TouchableOpacity>
      </View>
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.1,
  },
});
