import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
export type PlaybackChipTone = "ustadh" | "wordByWord" | "range" | "section";

const MODE_ICONS: Record<PlaybackChipTone, IoniconName> = {
  ustadh: "headset",
  wordByWord: "text-outline",
  range: "layers-outline",
  section: "layers-outline",
};

export function getPlaybackToneColors(
  colors: ReturnType<typeof useColors>,
  tone: PlaybackChipTone
) {
  const accent =
    tone === "ustadh"
      ? colors.appGold
      : tone === "wordByWord"
        ? colors.appFlame
        : tone === "section"
          ? colors.appSuccess
          : colors.appWarmBorder;

  const background =
    tone === "ustadh"
      ? colors.warningSoft
      : tone === "wordByWord"
        ? colors.appOrangeSurface
        : tone === "section"
          ? colors.successSoft
          : colors.surfaceSecondary;

  return { accent, background };
}

export function PlaybackChip({
  label,
  tone,
  onStop,
}: {
  label: string;
  tone: PlaybackChipTone;
  onStop: () => void;
}) {
  const colors = useColors();
  const { accent, background } = getPlaybackToneColors(colors, tone);

  return (
    <View style={[styles.pill, { backgroundColor: background, shadowColor: colors.shadowNeutral }]}>
      <Ionicons name={MODE_ICONS[tone]} size={13} color={accent} />
      <Text style={[styles.label, { color: accent }]} numberOfLines={1}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onStop}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={13} color={accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 7,
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
