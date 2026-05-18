import React, { useEffect, useRef, useState } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

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

const MODE_ACCENT_COLORS: Record<PlaybackModeType, string> = {
  ustadh: "#C9A02A",
  wordByWord: "#E86A33",
  range: "#7B5C3E",
};

const MODE_ACCENT_BG_LIGHT: Record<PlaybackModeType, string> = {
  ustadh: "#FEF9EE",
  wordByWord: "#FFF4EE",
  range: "#F5F0EB",
};

const MODE_ACCENT_BG_DARK: Record<PlaybackModeType, string> = {
  ustadh: "#2B2210",
  wordByWord: "#2B1A0E",
  range: "#1E1710",
};

const MODE_ICONS: Record<PlaybackModeType, React.ComponentProps<typeof Ionicons>["name"]> = {
  ustadh: "headset",
  wordByWord: "text-outline",
  range: "layers-outline",
};

export function GlobalPlaybackBar({ config, bottom, onStop }: Props) {
  const colors = useColors();
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

  const isDark = colors.background === "#0E0E0E";
  const mode = displayConfig?.mode ?? "ustadh";
  const accentColor = MODE_ACCENT_COLORS[mode];
  const accentBgColor = isDark ? MODE_ACCENT_BG_DARK[mode] : MODE_ACCENT_BG_LIGHT[mode];
  const modeIcon = MODE_ICONS[mode];

  return (
    <Animated.View
      pointerEvents={config ? "auto" : "none"}
      style={[styles.wrapper, { bottom, opacity, transform: [{ translateY }] }]}
    >
      {displayConfig && (
        <View style={[styles.pill, { backgroundColor: accentBgColor }]}>
          <Ionicons name={modeIcon} size={13} color={accentColor} />
          <Text style={[styles.label, { color: accentColor }]} numberOfLines={1}>
            {displayConfig.title}
          </Text>
          <TouchableOpacity
            onPress={onStop}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Ionicons name="close" size={13} color={accentColor} />
          </TouchableOpacity>
        </View>
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
