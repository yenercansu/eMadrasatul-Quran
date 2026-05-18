import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { PlaybackChip } from "@/components/PlaybackChip";

export type PlaybackModeType = "ustadh" | "wordByWord" | "range";

export interface PlaybackBarConfig {
  mode: PlaybackModeType;
  title: string;
}

interface Props {
  config: PlaybackBarConfig | null;
  bottom: number;
  onStop: () => void;
}

export function GlobalPlaybackBar({ config, bottom, onStop }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const [displayConfig, setDisplayConfig] = useState<PlaybackBarConfig | null>(config);

  useEffect(() => {
    if (config !== null) {
      setDisplayConfig(config);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 160, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setDisplayConfig(null);
      });
    }
  }, [config, opacity, translateY]);

  const mode = displayConfig?.mode ?? "ustadh";

  return (
    <Animated.View
      pointerEvents={config ? "auto" : "none"}
      style={[styles.wrapper, { bottom, opacity, transform: [{ translateY }] }]}
    >
      {displayConfig && (
        <PlaybackChip label={displayConfig.title} tone={mode} onStop={onStop} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 45,
  },
});
