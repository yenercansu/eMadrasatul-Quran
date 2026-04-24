import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, PLAYBACK_RATES } from "@/contexts/AudioContext";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

export function AudioPlayerBar() {
  const colors = useColors();
  const s = styles(colors);
  const { audioState, pauseAudio, resumeAudio, stopAudio, playNextAyah, playPrevAyah, setPlaybackRate } = useAudio();
  const [showRates, setShowRates] = useState(false);

  if (!audioState.currentAyah && !audioState.isLoading) return null;

  const progress = audioState.duration > 0 ? audioState.position / audioState.duration : 0;
  const surahName = audioState.currentSurah ? (SURAH_DATA[audioState.currentSurah - 1]?.englishName ?? `Surah ${audioState.currentSurah}`) : "";
  const rateLabel = audioState.playbackRate === 1.0 ? "1x" : `${audioState.playbackRate}x`;
  const isRange = !!audioState.range;

  return (
    <>
      <View style={s.container}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <View style={s.content}>
          <View style={s.info}>
            <Text style={s.label} numberOfLines={1}>
              {surahName} — Ayah {audioState.currentAyah}
            </Text>
            <Text style={s.subLabel}>
              {isRange
                ? `Range: ${SURAH_DATA[(audioState.range!.startSurah - 1)]?.englishName}:${audioState.range!.startAyah} → ${SURAH_DATA[(audioState.range!.endSurah - 1)]?.englishName}:${audioState.range!.endAyah}`
                : audioState.repeatCount > 1
                  ? `Repeat ${audioState.currentRepeat + 1}/${audioState.repeatCount}`
                  : ""}
            </Text>
          </View>
          <View style={s.controls}>
            <TouchableOpacity onPress={() => setShowRates(true)} style={s.rateBtn} activeOpacity={0.7}>
              <Text style={s.rateText}>{rateLabel}</Text>
            </TouchableOpacity>
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

      <Modal visible={showRates} transparent animationType="fade" onRequestClose={() => setShowRates(false)}>
        <TouchableWithoutFeedback onPress={() => setShowRates(false)}>
          <View style={s.rateOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.rateSheet}>
                <Text style={s.rateSheetTitle}>Playback Speed</Text>
                <View style={s.rateOptions}>
                  {PLAYBACK_RATES.map(rate => (
                    <TouchableOpacity
                      key={rate}
                      style={[s.rateOption, audioState.playbackRate === rate && s.rateOptionActive]}
                      onPress={async () => { await setPlaybackRate(rate); setShowRates(false); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.rateOptionText, audioState.playbackRate === rate && s.rateOptionTextActive]}>
                        {rate === 1.0 ? "Normal" : `${rate}x`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
    progressBar: { height: 2, backgroundColor: colors.border },
    progressFill: { height: "100%", backgroundColor: colors.primary },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    info: { flex: 1, marginRight: 8 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    subLabel: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    controls: { flexDirection: "row", alignItems: "center", gap: 4 },
    rateBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.secondary,
      borderRadius: 6,
      marginRight: 4,
    },
    rateText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    controlBtn: { padding: 6 },
    playBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    rateOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    rateSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    rateSheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 16,
    },
    rateOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
    },
    rateOption: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      minWidth: 80,
      alignItems: "center",
    },
    rateOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    rateOptionText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    rateOptionTextActive: { color: colors.primaryForeground },
  });
