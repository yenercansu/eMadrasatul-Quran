import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PanResponder,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio } from "@/contexts/AudioContext";
import type { ApiAyah } from "@/services/quranApi";

interface Props {
  arabic: ApiAyah;
  translation?: ApiAyah;
  transliteration?: ApiAyah;
  tafsir?: ApiAyah;
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  isActive: boolean;
  onPress: () => void;
  onWordLongPress?: (word: string, translation: string, ayahNum: number) => void;
}

export function AyahItem({
  arabic,
  translation,
  transliteration,
  tafsir,
  surahNumber,
  surahName,
  totalAyahs,
  isActive,
  onPress,
  onWordLongPress,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { settings } = useQuran();
  const { audioState, playAyah, pauseAudio, resumeAudio } = useAudio();

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
      await playAyah(
        surahNumber,
        arabic.numberInSurah,
        totalAyahs,
        settings.repeatCount
      );
    }
  }, [isCurrentlyPlaying, audioState.isPlaying, surahNumber, arabic.numberInSurah, totalAyahs, settings.repeatCount]);

  const arabicWords = arabic.text.split(" ");

  return (
    <View style={[s.container, isActive && s.activeContainer]}>
      <View style={s.header}>
        <View style={s.ayahBadge}>
          <Text style={s.ayahNumber}>{arabic.numberInSurah}</Text>
        </View>
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
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Feather name="bookmark" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Feather name="share-2" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={s.arabicContainer}>
          <Text style={s.arabicText} textBreakStrategy="highQuality">
            {arabic.text}
          </Text>
        </View>

        {settings.showTransliteration && transliteration && (
          <Text style={s.transliterationText}>{transliteration.text}</Text>
        )}

        {settings.showTranslation && translation && (
          <Text style={s.translationText}>{translation.text}</Text>
        )}

        {settings.showTafsir && tafsir && (
          <View style={s.tafsirContainer}>
            <Text style={s.tafsirLabel}>Tafsir</Text>
            <Text style={s.tafsirText}>{tafsir.text}</Text>
          </View>
        )}
      </TouchableOpacity>

      {isCurrentlyPlaying && audioState.isPlaying && (
        <View style={s.playingIndicator}>
          <View style={[s.dot, s.dot1]} />
          <View style={[s.dot, s.dot2]} />
          <View style={[s.dot, s.dot3]} />
        </View>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    activeContainer: {
      backgroundColor: colors.secondary,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    ayahBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    ayahNumber: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    actions: {
      flexDirection: "row",
      gap: 4,
    },
    actionBtn: {
      padding: 8,
    },
    arabicContainer: {
      paddingVertical: 8,
    },
    arabicText: {
      fontSize: 28,
      lineHeight: 52,
      textAlign: "right",
      color: colors.foreground,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
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
      lineHeight: 24,
      color: colors.foreground,
      marginTop: 8,
      fontFamily: "Inter_400Regular",
    },
    tafsirContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.muted,
      borderRadius: 8,
    },
    tafsirLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accent,
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
      paddingTop: 8,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    dot1: {},
    dot2: { opacity: 0.6 },
    dot3: { opacity: 0.3 },
  });
