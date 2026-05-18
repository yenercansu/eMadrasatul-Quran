import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { PlaybackChip } from "@/components/PlaybackChip";

interface Props {
  visible: boolean;
  repeatCount: number;
  currentRepeat: number;
  bottom: number;
  onStop: () => void;
}

export function SectionLoopChip({ visible, repeatCount, currentRepeat, bottom, onStop }: Props) {
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

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[s.wrapper, { bottom, opacity, transform: [{ translateY }] }]}
    >
      <PlaybackChip label={label} tone="section" onStop={onStop} />
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
