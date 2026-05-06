import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, PLAYBACK_RATES, RECITERS } from "@/contexts/AudioContext";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

export function AudioPlayerBar() {
  const colors = useColors();
  const s = useMemo(() => styles(colors), [colors]);
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
  const reciterName = reciter?.name ?? (audioState.isLoading ? "Loading…" : "");

  const trackLine = audioState.currentAyah
    ? `${surahName} · ${audioState.currentAyah}`
    : "";

  return (
    <>
      <View style={s.container}>
        {/* Progress bar */}
        {audioState.duration > 0 && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
          </View>
        )}

        {/* Info row */}
        <View style={s.infoRow}>
          <Text style={s.reciterName} numberOfLines={1}>{reciterName}</Text>
          {!!trackLine && <Text style={s.trackLine} numberOfLines={1}>{trackLine}</Text>}
          {/* Close */}
          <TouchableOpacity onPress={stopAudio} style={s.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={colors.appLightText} />
          </TouchableOpacity>
        </View>

        {/* Controls row */}
        <View style={s.controlsRow}>
          {/* Speed */}
          <TouchableOpacity onPress={() => setShowRates(true)} style={s.speedBtn} activeOpacity={0.7}>
            <Text style={s.speedText}>{rateLabel}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Prev */}
          <TouchableOpacity onPress={playPrevAyah} style={s.skipBtn} activeOpacity={0.7}>
            <Ionicons name="play-back" size={20} color={colors.appBlack} />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={audioState.isPlaying ? pauseAudio : resumeAudio}
            style={s.playBtn}
            activeOpacity={0.85}
          >
            <Ionicons
              name={audioState.isLoading ? "hourglass-outline" : audioState.isPlaying ? "pause" : "play"}
              size={22}
              color={colors.appWhite}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity onPress={playNextAyah} style={s.skipBtn} activeOpacity={0.7}>
            <Ionicons name="play-forward" size={20} color={colors.appBlack} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />
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
      backgroundColor: colors.appWhite,
      borderTopWidth: 2,
      borderTopColor: colors.appBorderLighter,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
    progressBar: {
      height: 2,
      backgroundColor: colors.appLighterBg,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.appBlack,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 2,
      gap: 6,
    },
    reciterName: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      flex: 1,
    },
    trackLine: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },
    closeBtn: {
      padding: 4,
      marginLeft: 4,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 10,
      paddingTop: 4,
    },
    speedBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.appLightBg,
      borderRadius: 8,
    },
    speedText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    skipBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    playBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.appBlack,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 4,
    },
    rateOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    rateSheet: {
      backgroundColor: colors.appWhite,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 44,
    },
    rateSheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appBlack,
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
      borderColor: colors.appBorderLighter,
      backgroundColor: colors.appLightBg,
      minWidth: 80,
      alignItems: "center",
    },
    rateOptionActive: {
      borderColor: colors.appBlack,
      backgroundColor: colors.appBlack,
    },
    rateOptionText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    rateOptionTextActive: { color: colors.appWhite },
  });
