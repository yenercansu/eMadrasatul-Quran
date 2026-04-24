import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio } from "@/contexts/AudioContext";
import { useQuran } from "@/contexts/QuranContext";

export function AudioPlayerBar() {
  const colors = useColors();
  const s = styles(colors);
  const { audioState, pauseAudio, resumeAudio, stopAudio, playNextAyah, playPrevAyah } = useAudio();
  const { settings } = useQuran();

  if (!audioState.currentAyah && !audioState.isLoading) return null;

  const progress =
    audioState.duration > 0 ? audioState.position / audioState.duration : 0;

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <View style={s.container}>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={s.content}>
        <View style={s.info}>
          <Text style={s.label}>
            Ayah {audioState.currentAyah} • Surah {audioState.currentSurah}
          </Text>
          {settings.repeatCount > 1 && (
            <Text style={s.repeat}>
              {audioState.currentRepeat + 1}/{settings.repeatCount}x
            </Text>
          )}
        </View>
        <View style={s.controls}>
          <TouchableOpacity onPress={playPrevAyah} style={s.controlBtn} activeOpacity={0.7}>
            <Ionicons name="play-skip-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={audioState.isPlaying ? pauseAudio : resumeAudio}
            style={s.playBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={audioState.isLoading ? "hourglass" : audioState.isPlaying ? "pause" : "play"}
              size={22}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={playNextAyah} style={s.controlBtn} activeOpacity={0.7}>
            <Ionicons name="play-skip-forward" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={stopAudio} style={s.controlBtn} activeOpacity={0.7}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: Platform.OS === "web" ? 84 : 80,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 8,
    },
    progressBar: {
      height: 2,
      backgroundColor: colors.border,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    info: {
      flex: 1,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    repeat: {
      fontSize: 11,
      color: colors.accent,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    controlBtn: {
      padding: 6,
    },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
