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

  const handleStartDec = () => {
    if (startWord > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStartWord(w => w - 1);
    }
  };
  const handleStartInc = () => {
    if (startWord < endWord) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStartWord(w => w + 1);
    }
  };
  const handleEndDec = () => {
    if (endWord > startWord) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEndWord(w => w - 1);
    }
  };
  const handleEndInc = () => {
    if (endWord < words.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEndWord(w => w + 1);
    }
  };

  const handleWordTap = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wordNum = idx + 1;
    if (wordNum < startWord) {
      setStartWord(wordNum);
    } else if (wordNum > endWord) {
      setEndWord(wordNum);
    } else if (wordNum === startWord && wordNum < endWord) {
      setStartWord(wordNum + 1);
    } else if (wordNum === endWord && wordNum > startWord) {
      setEndWord(wordNum - 1);
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
            <Text style={s.titleMain}>SELECT RANGE</Text>
            <Text style={s.titleSub}>AYAH {ayahNum}</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>WORD-BASED RANGE SELECTOR</Text>

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
                <Text
                  style={[
                    s.wordChipText,
                    inRange && s.wordChipTextInRange,
                  ]}
                >
                  {word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.stepperRow}>
          <View style={s.stepperGroup}>
            <Text style={s.stepperLabel}>FIRST WORD</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepperBtn, startWord <= 1 && s.stepperBtnDisabled]}
                onPress={handleStartDec}
                activeOpacity={0.7}
                disabled={startWord <= 1}
              >
                <Feather name="minus" size={14} color={startWord <= 1 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <Text style={s.stepperValue}>{startWord}</Text>
              <TouchableOpacity
                style={[s.stepperBtn, startWord >= endWord && s.stepperBtnDisabled]}
                onPress={handleStartInc}
                activeOpacity={0.7}
                disabled={startWord >= endWord}
              >
                <Feather name="plus" size={14} color={startWord >= endWord ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.stepperDivider} />

          <View style={s.stepperGroup}>
            <Text style={s.stepperLabel}>LAST WORD</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepperBtn, endWord <= startWord && s.stepperBtnDisabled]}
                onPress={handleEndDec}
                activeOpacity={0.7}
                disabled={endWord <= startWord}
              >
                <Feather name="minus" size={14} color={endWord <= startWord ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <Text style={s.stepperValue}>{endWord}</Text>
              <TouchableOpacity
                style={[s.stepperBtn, endWord >= words.length && s.stepperBtnDisabled]}
                onPress={handleEndInc}
                activeOpacity={0.7}
                disabled={endWord >= words.length}
              >
                <Feather name="plus" size={14} color={endWord >= words.length ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={s.rangeInfo}>
          <Text style={s.rangeInfoText}>
            Words {startWord}–{endWord} selected · {endWord - startWord + 1} of {words.length} words
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
                <Text style={[s.repeatChipText, active && s.repeatChipTextActive]}>
                  x{count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.sectionLabel}>Mini Player</Text>
        <View style={s.playerRow}>
          <TouchableOpacity
            style={[s.playBtn, isPlaying && s.playBtnActive]}
            onPress={handlePlay}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isPlaying && audioState.isPlaying ? "pause" : "play"}
              size={26}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View style={s.playerRepeatBadge}>
            <Ionicons name="repeat" size={13} color={colors.mutedForeground} />
            <Text style={s.playerRepeatText}>x{repeatCount}</Text>
          </View>
          <Text style={s.playerHint}>
            {startWord === 1 && endWord === words.length
              ? "Full ayah"
              : `Words ${startWord}–${endWord}`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      gap: 16,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    titleMain: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    titleSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      letterSpacing: 0.4,
    },
    closeBtn: {
      padding: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedForeground,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    wordsScroll: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    wordChip: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      minWidth: 44,
      alignItems: "center",
    },
    wordChipInRange: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    wordChipEndpoint: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    wordChipText: {
      fontSize: 20,
      color: colors.mutedForeground,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
    },
    wordChipTextInRange: {
      color: colors.primary,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    stepperGroup: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    stepperLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedForeground,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    stepperBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtnDisabled: {
      opacity: 0.4,
    },
    stepperValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      minWidth: 28,
      textAlign: "center",
    },
    stepperDivider: {
      width: 1,
      height: 50,
      backgroundColor: colors.border,
    },
    rangeInfo: {
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: -4,
    },
    rangeInfoText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    repeatRow: {
      flexDirection: "row",
      gap: 10,
    },
    repeatChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.muted,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 4,
    },
    repeatChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkIcon: {
      marginRight: -2,
    },
    repeatChipText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.mutedForeground,
      fontFamily: "Inter_700Bold",
    },
    repeatChipTextActive: {
      color: "#FFFFFF",
    },
    playerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    playBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    playBtnActive: {
      opacity: 0.85,
    },
    playerRepeatBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    playerRepeatText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.mutedForeground,
      fontFamily: "Inter_700Bold",
    },
    playerHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
  });
