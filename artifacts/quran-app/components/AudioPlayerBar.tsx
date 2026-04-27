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
import { Ionicons, Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, PLAYBACK_RATES, RECITERS } from "@/contexts/AudioContext";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

export function AudioPlayerBar() {
  const colors = useColors();
  const s = styles(colors);
  const { audioState, pauseAudio, resumeAudio, stopAudio, playNextAyah, playPrevAyah, setPlaybackRate } = useAudio();
  const { settings } = useQuran();
  const [showRates, setShowRates] = useState(false);

  if (!audioState.currentAyah && !audioState.isLoading) return null;

  const progress = audioState.duration > 0 ? audioState.position / audioState.duration : 0;
  const surahName = audioState.currentSurah
    ? (SURAH_DATA[audioState.currentSurah - 1]?.englishName ?? `Surah ${audioState.currentSurah}`)
    : "";
  const rateLabel = audioState.playbackRate === 1.0 ? "1×" : `${audioState.playbackRate}×`;
  const reciter = RECITERS.find(r => r.id === settings.selectedReciter);
  const reciterName = reciter?.name ?? "";

  const isRange = !!audioState.range;
  const statusLine = isRange
    ? `Range · ${SURAH_DATA[(audioState.range!.startSurah - 1)]?.englishName}:${audioState.range!.startAyah}–${SURAH_DATA[(audioState.range!.endSurah - 1)]?.englishName}:${audioState.range!.endAyah}`
    : audioState.repeatCount > 1
      ? `Repeat ${audioState.currentRepeat + 1}/${audioState.repeatCount}`
      : null;

  return (
    <>
      <View style={s.container}>
        {/* Progress bar — only visible when there's measurable progress */}
        {audioState.duration > 0 && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
          </View>
        )}

        <View style={s.row}>
          {/* Speed chip */}
          <TouchableOpacity onPress={() => setShowRates(true)} style={s.speedBtn} activeOpacity={0.7}>
            <Text style={s.speedText}>{rateLabel}</Text>
          </TouchableOpacity>

          {/* ⏭ Next ayah — LEFT of play (RTL convention: forward = left) */}
          <TouchableOpacity onPress={playNextAyah} style={s.skipBtn} activeOpacity={0.7}>
            <Ionicons name="play-skip-forward" size={19} color={colors.foreground} />
          </TouchableOpacity>

          {/* Play / Pause / Loading */}
          <TouchableOpacity
            onPress={audioState.isPlaying ? pauseAudio : resumeAudio}
            style={s.playBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name={audioState.isLoading ? "hourglass-outline" : audioState.isPlaying ? "pause" : "play"}
              size={22}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>

          {/* ⏮ Prev ayah — RIGHT of play */}
          <TouchableOpacity onPress={playPrevAyah} style={s.skipBtn} activeOpacity={0.7}>
            <Ionicons name="play-skip-back" size={19} color={colors.foreground} />
          </TouchableOpacity>

          {/* Reciter + track info */}
          <View style={s.info}>
            <Text style={s.reciterName} numberOfLines={1}>{reciterName || (audioState.isLoading ? "Loading…" : "")}</Text>
            {audioState.currentAyah ? (
              <Text style={s.trackLine} numberOfLines={1}>
                {statusLine ?? `${surahName} · ${audioState.currentAyah}`}
              </Text>
            ) : null}
          </View>

          {/* Stop / Close */}
          <TouchableOpacity onPress={stopAudio} style={s.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Playback rate sheet */}
      <Modal visible={showRates} transparent animationType="fade" onRequestClose={() => setShowRates(false)}>
        <TouchableWithoutFeedback onPress={() => setShowRates(false)}>
          <View style={s.rateOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.rateSheet}>
                <Text style={s.rateSheetTitle}>Playback Speed</Text>
                <View style={s.rateGrid}>
                  {PLAYBACK_RATES.map(rate => (
                    <TouchableOpacity
                      key={rate}
                      style={[s.rateOption, audioState.playbackRate === rate && s.rateOptionActive]}
                      onPress={async () => { await setPlaybackRate(rate); setShowRates(false); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.rateOptionText, audioState.playbackRate === rate && s.rateOptionTextActive]}>
                        {rate === 1.0 ? "Normal" : `${rate}×`}
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
      shadowOpacity: 0.06,
      shadowRadius: 10,
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    speedBtn: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.secondary,
      borderRadius: 8,
    },
    speedText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    skipBtn: {
      padding: 5,
    },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    info: {
      flex: 1,
      marginLeft: 2,
    },
    reciterName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    trackLine: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    closeBtn: {
      padding: 5,
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
      paddingBottom: 44,
    },
    rateSheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 16,
    },
    rateGrid: {
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
