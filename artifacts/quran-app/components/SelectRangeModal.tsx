import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAudio } from "@/contexts/AudioContext";

const REPEAT_OPTIONS = [1, 3, 5, 10];

interface Props {
  visible: boolean;
  onClose: () => void;
  ayahNum: number;
  words: string[];
  surahNumber: number;
  totalAyahs: number;
}

export function SelectRangeModal({
  visible,
  onClose,
  ayahNum,
  words,
  surahNumber,
  totalAyahs,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { playAyah, audioState } = useAudio();

  const [startWord, setStartWord] = useState(1);
  const [endWord, setEndWord] = useState(words.length);
  const [repeatCount, setRepeatCount] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleWordTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wordNum = idx + 1;
    if (wordNum === startWord && wordNum === endWord) return;
    if (wordNum <= startWord) {
      setStartWord(wordNum);
    } else if (wordNum >= endWord) {
      setEndWord(wordNum);
    } else {
      const distToStart = wordNum - startWord;
      const distToEnd = endWord - wordNum;
      if (distToStart <= distToEnd) {
        setStartWord(wordNum);
      } else {
        setEndWord(wordNum);
      }
    }
  }, [startWord, endWord]);

  const handlePlay = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPlaying(true);
    await playAyah(surahNumber, ayahNum, totalAyahs, repeatCount);
    setIsPlaying(false);
  }, [surahNumber, ayahNum, totalAyahs, repeatCount, playAyah]);

  const handleClose = () => {
    setStartWord(1);
    setEndWord(words.length);
    setRepeatCount(5);
    setIsPlaying(false);
    onClose();
  };

  const displayWords = [...words].reverse();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={s.titleRow}>
          <View>
            <Text style={s.titleMain}>Word Range</Text>
            <Text style={s.titleSub}>Ayah {ayahNum} · Tap words to set range</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.wordsScroll}
        >
          {displayWords.map((word, displayIdx) => {
            const originalIdx = words.length - 1 - displayIdx;
            const wordNum = originalIdx + 1;
            const inRange = wordNum >= startWord && wordNum <= endWord;
            const isStart = wordNum === startWord;
            const isEnd = wordNum === endWord;
            return (
              <TouchableOpacity
                key={originalIdx}
                style={[
                  s.wordChip,
                  inRange && s.wordChipInRange,
                  (isStart || isEnd) && s.wordChipEndpoint,
                ]}
                onPress={() => handleWordTap(originalIdx)}
                activeOpacity={0.75}
              >
                <Text style={[s.wordChipText, inRange && s.wordChipTextInRange]}>
                  {word}
                </Text>
                {(isStart || isEnd) && (
                  <Text style={s.wordChipBadge}>{isStart ? "start" : "end"}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.rangeInfo}>
          <Text style={s.rangeInfoText}>
            Words {startWord}–{endWord} · {endWord - startWord + 1} of {words.length} selected
          </Text>
        </View>

        <Text style={s.sectionLabel}>Repeat Count</Text>
        <View style={s.repeatRow}>
          {REPEAT_OPTIONS.map((count) => {
            const active = repeatCount === count;
            return (
              <TouchableOpacity
                key={count}
                style={[s.repeatChip, active && s.repeatChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRepeatCount(count);
                }}
                activeOpacity={0.8}
              >
                {active && <Ionicons name="checkmark" size={13} color="#FFFFFF" style={s.checkIcon} />}
                <Text style={[s.repeatChipText, active && s.repeatChipTextActive]}>x{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.playerSection}>
          <Text style={s.playerHint}>
            {startWord === 1 && endWord === words.length ? "Full ayah" : `Words ${startWord}–${endWord}`} · x{repeatCount}
          </Text>
          <TouchableOpacity
            style={[s.playBtn, isPlaying && s.playBtnActive]}
            onPress={handlePlay}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isPlaying && audioState.isPlaying ? "pause" : "play"}
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={s.playerHintSpacer} />
        </View>
      </View>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
      backgroundColor: "#FAFAFA",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 44 : 28,
      gap: 16,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 4 },
    titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    titleMain: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    titleSub: { fontSize: 13, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 3 },
    closeBtn: { padding: 4 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: "#9A9A9A",
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    wordsScroll: { flexDirection: "row", gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
    wordChip: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#E0E0E0",
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      minWidth: 54,
    },
    wordChipInRange: { borderColor: "#1A1A1A", backgroundColor: "#F0F0F0" },
    wordChipEndpoint: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
    wordChipText: {
      fontSize: 20,
      color: "#9A9A9A",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
    },
    wordChipTextInRange: { color: "#1A1A1A" },
    wordChipBadge: { fontSize: 9, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_600SemiBold", marginTop: 2 },
    rangeInfo: {
      alignItems: "center",
      backgroundColor: "#F0F0F0",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    rangeInfoText: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
    repeatRow: { flexDirection: "row", gap: 10 },
    repeatChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: "#F0F0F0",
      borderWidth: 1.5,
      borderColor: "transparent",
      gap: 4,
    },
    repeatChipActive: { backgroundColor: "#1A1A1A" },
    checkIcon: { marginRight: -2 },
    repeatChipText: { fontSize: 15, fontWeight: "700", color: "#9A9A9A", fontFamily: "Inter_700Bold" },
    repeatChipTextActive: { color: "#FFFFFF" },
    playerSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    playerHint: { flex: 1, fontSize: 13, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "left" },
    playerHintSpacer: { flex: 1 },
    playBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#1A1A1A",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    playBtnActive: { opacity: 0.85 },
  });
