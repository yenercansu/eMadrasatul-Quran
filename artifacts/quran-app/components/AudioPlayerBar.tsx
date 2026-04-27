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
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAudio, PLAYBACK_RATES, RECITERS } from "@/contexts/AudioContext";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

export function AudioPlayerBar() {
  const colors = useColors();
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
            <Ionicons name="close" size={18} color="#9A9A9A" />
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
            <Ionicons name="play-back" size={20} color="#1A1A1A" />
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
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity onPress={playNextAyah} style={s.skipBtn} activeOpacity={0.7}>
            <Ionicons name="play-forward" size={20} color="#1A1A1A" />
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

const s = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 84 : 80,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 2,
    borderTopColor: "#EFEDE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  progressBar: {
    height: 2,
    backgroundColor: "#F0EDE8",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1A1A1A",
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
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  trackLine: {
    fontSize: 12,
    color: "#9A9A9A",
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
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  speedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
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
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 44,
  },
  rateSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
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
    borderColor: "#EBEBEB",
    backgroundColor: "#F7F7F7",
    minWidth: 80,
    alignItems: "center",
  },
  rateOptionActive: {
    borderColor: "#1A1A1A",
    backgroundColor: "#1A1A1A",
  },
  rateOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
  rateOptionTextActive: { color: "#FFFFFF" },
});
