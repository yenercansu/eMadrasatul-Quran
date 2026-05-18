import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type PlaybackModeType = "ustadh" | "wordByWord" | "section" | "range";

export interface PlaybackBarConfig {
  mode: PlaybackModeType;
  title: string;
  subtitle?: string;
}

interface Props {
  config: PlaybackBarConfig | null;
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onExit: () => void;
  /** Safe-area top inset to add above the bar content (only needed when rendered without a header above it). */
  topInset?: number;
}

const BAR_CONTENT_HEIGHT = 56;

const MODE_ACCENT_COLORS: Record<PlaybackModeType, string> = {
  ustadh: "#C9A02A",
  wordByWord: "#E86A33",
  section: "#7B5C3E",
  range: "#7B5C3E",
};

const MODE_ICONS: Record<PlaybackModeType, React.ComponentProps<typeof Ionicons>["name"]> = {
  ustadh: "headset",
  wordByWord: "text-outline",
  section: "repeat",
  range: "layers-outline",
};

export function GlobalPlaybackBar({
  config,
  isPlaying,
  isLoading,
  onPlayPause,
  onExit,
  topInset = 0,
}: Props) {
  const colors = useColors();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const [displayConfig, setDisplayConfig] = useState<PlaybackBarConfig | null>(config);

  const totalHeight = BAR_CONTENT_HEIGHT + topInset;

  useEffect(() => {
    if (config !== null) {
      setDisplayConfig(config);
      Animated.spring(heightAnim, {
        toValue: totalHeight,
        useNativeDriver: false,
        tension: 160,
        friction: 20,
      }).start();
    } else {
      Animated.timing(heightAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setDisplayConfig(null);
      });
    }
  }, [config, totalHeight, heightAnim]);

  const accentColor = displayConfig
    ? MODE_ACCENT_COLORS[displayConfig.mode]
    : "#C9A02A";

  const modeIcon = displayConfig ? MODE_ICONS[displayConfig.mode] : "headset";

  const isDark = colors.background === "#0E0E0E";
  const barBg = isDark ? "#1A1A1A" : "#FAF8F4";
  const borderColor = isDark ? "#2A2A2A" : "#E2DDD6";
  const controlBg = isDark ? "#252525" : "#FFFFFF";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          height: heightAnim,
          backgroundColor: barBg,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <View style={[styles.inner, { paddingTop: topInset }]}>
        {/* Left accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

        {/* Mode icon */}
        <Ionicons name={modeIcon} size={14} color={accentColor} style={styles.modeIcon} />

        {/* Title + subtitle */}
        <View style={styles.textArea}>
          <Text
            style={[styles.title, { color: colors.appText }]}
            numberOfLines={1}
          >
            {displayConfig?.title}
          </Text>
          {displayConfig?.subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.appTextMuted }]}
              numberOfLines={1}
            >
              {displayConfig.subtitle}
            </Text>
          ) : null}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: controlBg, borderColor }]}
            onPress={onPlayPause}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.appText} />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={14}
                color={colors.appText}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: controlBg, borderColor }]}
            onPress={onExit}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={15} color={colors.appTextMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  accentStrip: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginVertical: 14,
  },
  modeIcon: {
    marginRight: 2,
  },
  textArea: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
