import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio } from "@/contexts/AudioContext";
import type { ApiAyah } from "@/services/quranApi";
import { SelectRangeModal } from "@/components/SelectRangeModal";

export interface TafsirEntry {
  edition: string;
  name: string;
  ayah: ApiAyah;
}

interface Props {
  arabic: ApiAyah;
  translation?: ApiAyah;
  transliteration?: ApiAyah;
  tafsirs?: TafsirEntry[];
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  isActive: boolean;
  onPress: () => void;
  onWordLongPress?: (word: string, ayahNum: number) => void;
  onSaveAyah?: (ayah: ApiAyah) => void;
  onRepeatSelect?: (ayahNum: number, count: number) => void;
  ayahRepeat?: number | null;
}

const REPEAT_OPTIONS = [1, 3, 5, 10];

export function AyahItem({
  arabic,
  translation,
  transliteration,
  tafsirs,
  surahNumber,
  surahName,
  totalAyahs,
  isActive,
  onPress,
  onWordLongPress,
  onSaveAyah,
  onRepeatSelect,
  ayahRepeat,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { settings, isWordHighlighted } = useQuran();
  const { audioState, playAyah, pauseAudio, resumeAudio } = useAudio();
  const swipeRef = useRef<Swipeable>(null);
  const [savePulse, setSavePulse] = useState(false);
  const [selectRangeVisible, setSelectRangeVisible] = useState(false);
  const [showWordMeaning, setShowWordMeaning] = useState(false);

  const isCurrentlyPlaying =
    audioState.currentSurah === surahNumber &&
    audioState.currentAyah === arabic.numberInSurah;

  const handleAudioPress = useCallback(async () => {
    if (isCurrentlyPlaying) {
      if (audioState.isPlaying) {
        await pauseAudio();
      } else {
        await resumeAudio();
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const repeat = ayahRepeat ?? settings.repeatCount;
      await playAyah(surahNumber, arabic.numberInSurah, totalAyahs, repeat);
    }
  }, [isCurrentlyPlaying, audioState.isPlaying, surahNumber, arabic.numberInSurah, totalAyahs, settings.repeatCount, ayahRepeat]);

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavePulse(true);
    onSaveAyah?.(arabic);
    swipeRef.current?.close();
    setTimeout(() => setSavePulse(false), 1200);
  }, [arabic, onSaveAyah]);

  const handleRepeat = useCallback((count: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRepeatSelect?.(arabic.numberInSurah, count);
    swipeRef.current?.close();
  }, [arabic.numberInSurah, onRepeatSelect]);

  const arabicWords = arabic.text.split(" ").filter(Boolean);
  const translitWords = transliteration?.text?.split(" ").filter(Boolean) ?? [];

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1], outputRange: [80, 0],
    });
    return (
      <Animated.View style={[s.rightAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity style={s.saveActionInner} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="bookmark" size={22} color="#FFFFFF" />
          <Text style={s.saveActionText}>Save{"\n"}Ayah</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    return (
      <View style={s.leftActions}>
        <Text style={s.repeatLabel}>Repeat this ayah:</Text>
        <View style={s.repeatRow}>
          {REPEAT_OPTIONS.map((count) => {
            const active = ayahRepeat === count;
            return (
              <TouchableOpacity
                key={count}
                style={[s.repeatChip, active && s.repeatChipActive]}
                onPress={() => handleRepeat(count)}
                activeOpacity={0.8}
              >
                <Text style={[s.repeatChipText, active && s.repeatChipTextActive]}>
                  {count}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={60}
      leftThreshold={80}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      <View style={[s.container, isActive && s.activeContainer, savePulse && s.savedPulse]}>
        <View style={s.header}>
          <View style={s.ayahBadge}>
            <Text style={s.ayahNumber}>{arabic.numberInSurah}</Text>
          </View>

          <TouchableOpacity
            style={s.headerPill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectRangeVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="repeat" size={13} color={colors.primary} />
            <Text style={s.headerPillText}>Range</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.headerPill, showWordMeaning && s.headerPillActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowWordMeaning(v => !v);
            }}
            activeOpacity={0.8}
          >
            <Feather name="type" size={12} color={showWordMeaning ? "#FFFFFF" : colors.primary} />
            <Text style={[s.headerPillText, showWordMeaning && s.headerPillTextActive]}>Meanings</Text>
          </TouchableOpacity>

          {ayahRepeat && ayahRepeat > 1 ? (
            <View style={s.repeatBadge}>
              <Text style={s.repeatBadgeText}>{ayahRepeat}x</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <TouchableOpacity onPress={handleAudioPress} style={s.actionBtn} activeOpacity={0.7}>
              {audioState.isLoading && isCurrentlyPlaying ? (
                <Feather name="loader" size={16} color={colors.primary} />
              ) : isCurrentlyPlaying && audioState.isPlaying ? (
                <Ionicons name="pause" size={16} color={colors.primary} />
              ) : (
                <Ionicons name="play" size={16} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.7} onPress={handleSave}>
              <Feather name="bookmark" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
              <Feather name="share-2" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <View style={s.arabicContainer}>
            {showWordMeaning ? (
              <View style={s.wordMeaningWrap}>
                {arabicWords.map((word, idx) => {
                  const highlighted = isWordHighlighted(word, surahNumber, arabic.numberInSurah);
                  const translit = translitWords[idx] ?? "";
                  return (
                    <TouchableOpacity
                      key={`${idx}-${word}`}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onWordLongPress?.(word, arabic.numberInSurah);
                      }}
                      delayLongPress={400}
                      activeOpacity={0.7}
                    >
                      <View style={s.wordMeaningCard}>
                        <Text style={[s.arabicWord, highlighted && s.highlightedWord]}>
                          {word}
                        </Text>
                        {translit ? (
                          <Text style={s.wordMeaningText}>{translit}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={s.arabicWordsWrap}>
                {arabicWords.map((word, idx) => {
                  const highlighted = isWordHighlighted(word, surahNumber, arabic.numberInSurah);
                  return (
                    <TouchableOpacity
                      key={`${idx}-${word}`}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onWordLongPress?.(word, arabic.numberInSurah);
                      }}
                      delayLongPress={400}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.arabicWord, highlighted && s.highlightedWord]}>
                        {word}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {settings.showTransliteration && transliteration && (
            <Text style={s.transliterationText}>{transliteration.text}</Text>
          )}

          {settings.showTranslation && translation && (
            <Text style={s.translationText}>{translation.text}</Text>
          )}

          {settings.showTafsir && tafsirs && tafsirs.length > 0 && tafsirs.map((entry) => (
            <View key={entry.edition} style={s.tafsirContainer}>
              <Text style={s.tafsirLabel}>{entry.name}</Text>
              <Text style={s.tafsirText}>{entry.ayah?.text ?? ""}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {isCurrentlyPlaying && audioState.isPlaying && (
          <View style={s.playingIndicator}>
            <View style={[s.dot, s.dot1]} />
            <View style={[s.dot, s.dot2]} />
            <View style={[s.dot, s.dot3]} />
          </View>
        )}
      </View>

      <SelectRangeModal
        visible={selectRangeVisible}
        onClose={() => setSelectRangeVisible(false)}
        ayahNum={arabic.numberInSurah}
        words={arabicWords}
        surahNumber={surahNumber}
        totalAyahs={totalAyahs}
      />
    </Swipeable>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      padding: 16,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    activeContainer: {
      backgroundColor: colors.secondary,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    savedPulse: {
      backgroundColor: colors.secondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 6,
      flexWrap: "wrap",
    },
    ayahBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    ayahNumber: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
    },
    headerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.secondary,
      borderWidth: 1.5,
      borderColor: colors.primary + "55",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    headerPillActive: {
      backgroundColor: "#1A1A1A",
      borderColor: "#1A1A1A",
    },
    headerPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    headerPillTextActive: {
      color: "#FFFFFF",
    },
    repeatBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.accent + "22",
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    repeatBadgeText: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
    },
    actions: { flexDirection: "row", gap: 4, marginLeft: "auto" },
    actionBtn: { padding: 8 },
    arabicContainer: { paddingVertical: 12 },
    arabicWordsWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
      rowGap: 16,
      justifyContent: "flex-start",
    },
    wordMeaningWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
      rowGap: 16,
      justifyContent: "flex-start",
    },
    wordMeaningCard: {
      alignItems: "center",
      gap: 4,
    },
    wordMeaningText: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      maxWidth: 80,
      textAlign: "center",
    },
    arabicWord: {
      fontSize: 28,
      lineHeight: 44,
      color: colors.foreground,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
    },
    highlightedWord: {
      backgroundColor: colors.accent + "55",
      color: colors.accent,
      borderRadius: 4,
      paddingHorizontal: 2,
    },
    transliterationText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.mutedForeground,
      marginTop: 8,
      fontStyle: "italic",
      fontFamily: "Inter_400Regular",
    },
    translationText: {
      fontSize: 15,
      lineHeight: 26,
      color: colors.foreground,
      marginTop: 10,
      fontFamily: "Inter_400Regular",
    },
    tafsirContainer: {
      marginTop: 14,
      padding: 14,
      backgroundColor: colors.muted,
      borderRadius: 10,
    },
    tafsirLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#1A1A1A",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
      marginBottom: 6,
    },
    tafsirText: {
      fontSize: 13,
      lineHeight: 22,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    playingIndicator: {
      flexDirection: "row",
      gap: 3,
      justifyContent: "center",
      paddingTop: 10,
    },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
    dot1: {},
    dot2: { opacity: 0.6 },
    dot3: { opacity: 0.3 },
    rightAction: {
      width: 80,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    saveActionInner: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
    saveActionText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    leftActions: {
      backgroundColor: colors.secondary,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: "center",
      gap: 8,
      minWidth: 180,
    },
    repeatLabel: {
      fontSize: 11,
      color: "#6B6B6B",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    repeatRow: { flexDirection: "row", gap: 6 },
    repeatChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    repeatChipActive: {
      backgroundColor: "#1A1A1A",
      borderColor: "#1A1A1A",
    },
    repeatChipText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#6B6B6B",
      fontFamily: "Inter_700Bold",
    },
    repeatChipTextActive: { color: "#FFFFFF" },
  });
