import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
  Switch,
  LayoutAnimation,
  UIManager,
} from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio, RECITERS, PLAYBACK_RATES } from "@/contexts/AudioContext";
import { SettingsSheet, TAFSIR_EDITIONS } from "@/components/SettingsSheet";
import { FullScreenPage } from "@/components/FullScreenPage";
import { PlayRangeSheet } from "@/components/PlayRangeSheet";
import { RepeatSectionSheet } from "@/components/RepeatSectionSheet";
import { CancelRepeatTag } from "@/components/CancelRepeatTag";
import { CancelModeTag } from "@/components/CancelModeTag";
import { WordModal } from "@/components/WordModal";
import { OnboardingHints } from "@/components/OnboardingHints";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSurahWithTranslations, fetchTafsir, fetchTranslation, fetchWordTranslations, type SurahDetail, type ApiAyah, type WordTranslation } from "@/services/quranApi";
import { getJuzAyahs, getWeeklyGoalAyahsFrom, SURAH_DATA } from "@/constants/surahData";
import { RECENT_RECITERS_KEY } from "@/contexts/AudioContext";
import {
  ensureGoalOffline,
  getOfflineStatusForAyahs,
  type DownloadProgress,
  type GoalAyahLike,
  type OfflineDownloadStatus,
} from "@/services/offlineQuranCache";

const HINTS_STORAGE_KEY = "@squran/surah-hints-seen-v1";

// Strip Arabic diacritics for fuzzy word matching against backend word metadata.
function normalizeArabic(s: string): string {
  return s.replace(/[ً-ٟؐ-ؚٰۖ-ۭـ]/g, "").trim();
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AYAHS_PER_PAGE = 10;
const MUSHAF_BG = "#F5EDD6";
const WORD_COLORS = ["#E8507A", "#F2994A", "#27AE60", "#2F80ED", "#9B51E0", "#EB5757"];

const TRANSLATION_OPTIONS = [
  { id: "en.sahih", name: "Sahih International" },
  { id: "en.asad", name: "Muhammad Asad" },
  { id: "en.itani", name: "The Clear Quran" },
  { id: "en.hilali", name: "Muhsin Khan & Taqi-ud-Din al-Hilali" },
  { id: "en.pickthall", name: "Pickthall" },
];

// ─── Color-coded text (same word index → same color) ─────────────────────────
function ColorWords({ text, colorCoding, style, rtl, onWordLongPress }: {
  text: string; colorCoding: boolean; style?: any; rtl?: boolean;
  onWordLongPress?: (word: string) => void;
}) {
  const words = text.split(/\s+/);
  // Render each word as nested <Text> with onLongPress so RTL flow is preserved.
  return (
    <Text style={[style, rtl && { writingDirection: "rtl" }]}>
      {words.map((w, i) => (
        <Text
          key={i}
          onLongPress={onWordLongPress ? () => onWordLongPress(w) : undefined}
          style={colorCoding ? { color: WORD_COLORS[i % WORD_COLORS.length] } : undefined}
          suppressHighlighting={!onWordLongPress}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </Text>
      ))}
    </Text>
  );
}

// ─── Swipeable ayah card ─────────────────────────────────────────────────────
interface AyahCardProps {
  ayah: ApiAyah;
  surahNum: number;
  isPlaying: boolean;
  isRangeSelected: boolean;
  showMemorizedToggle: boolean;
  isMemorized: boolean;
  translations: { editionId: string; name: string; text: string }[];
  transliterationText: string | null;
  showTransliteration: boolean;
  colorCoding: boolean;
  showBasmala: boolean;
  arabicFontSize: number;
  romanFontSize: number;
  isOnRepeat: boolean;
  repeatCount: number;
  isUstadhMode: boolean;
  onSave: (ayah: ApiAyah) => void;
  onCancelRepeat: (ayah: ApiAyah) => void;
  onCancelUstadh: () => void;
  onToggleMemorized: (ayah: ApiAyah) => void;
  onPress: () => void;
  onWordLongPress?: (word: string, ayah: ApiAyah) => void;
}

const TAP_THRESHOLD = 8;

function SwipeableAyahCard({
  ayah, surahNum, isPlaying, isRangeSelected,
  showMemorizedToggle, isMemorized,
  isOnRepeat, repeatCount, isUstadhMode,
  translations, transliterationText,
  showTransliteration,
  colorCoding, showBasmala, arabicFontSize, romanFontSize,
  onSave, onCancelRepeat, onCancelUstadh, onToggleMemorized, onPress, onWordLongPress,
}: AyahCardProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const gestureStarted = useRef(false);
  const suppressTapUntilRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 5,
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 10,
      onPanResponderGrant: () => {
        gestureStarted.current = true;
      },
      onPanResponderMove: (_, { dx }) => {
        // Only allow leftward (save) movement
        if (dx < 0) pan.setValue(Math.max(dx, -120));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const wasSignificantGesture = Math.abs(dx) > TAP_THRESHOLD;
        if (wasSignificantGesture) suppressTapUntilRef.current = Date.now() + 350;
        setTimeout(() => { gestureStarted.current = false; }, wasSignificantGesture ? 300 : 60);
        if (dx < -20 || vx < -0.3) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.sequence([
            Animated.timing(pan, { toValue: -100, duration: 180, useNativeDriver: true }),
            Animated.delay(450),
            Animated.timing(pan, { toValue: -SCREEN_WIDTH * 1.2, duration: 260, useNativeDriver: true }),
          ]).start(() => {
            pan.setValue(0);
            onSave(ayah);
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        suppressTapUntilRef.current = Date.now() + 350;
        setTimeout(() => { gestureStarted.current = false; }, 300);
        Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (Date.now() < suppressTapUntilRef.current) return;
    if (gestureStarted.current) return;
    onPress();
  }, [onPress]);

  const cardBg = isPlaying ? "#F5F0E8" : isRangeSelected ? "#F0F5EE" : "#FFFFFF";

  return (
    <View style={cs.wrap}>
      {/* Save reveal panel — full-height, visible as card slides left */}
      <View style={cs.saveReveal}>
        <Ionicons name="bookmark-outline" size={22} color="#FFFFFF" />
        <Text style={cs.saveRevealText}>SAVE</Text>
      </View>

      <Animated.View
        style={[{ transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={handlePress}
          android_disableSound
          style={({ pressed }) => [cs.card, { backgroundColor: cardBg, opacity: pressed ? 0.95 : 1 }]}
        >
          <View style={cs.topRow}>
            {isOnRepeat ? (
              <CancelRepeatTag
                repeatCount={repeatCount}
                onCancel={() => onCancelRepeat(ayah)}
              />
            ) : isUstadhMode ? (
              <CancelModeTag
                label="cancel ustadh mode"
                onCancel={onCancelUstadh}
              />
            ) : null}
            <View style={cs.numBadge}>
              <Text style={cs.numText}>{surahNum}:{ayah.numberInSurah}</Text>
            </View>
            {showMemorizedToggle && (
              <TouchableOpacity
                style={cs.memorizedCheckBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleMemorized(ayah);
                }}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ checked: isMemorized }}
                accessibilityLabel={`Mark ayah ${ayah.numberInSurah} memorized`}
              >
                {isMemorized ? (
                  <Ionicons name="checkmark-circle" size={26} color="#1A1A1A" />
                ) : (
                  <View style={cs.memorizedCheckCircle} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {showBasmala && (
            <Text style={cs.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}

          <ColorWords
            text={ayah.text}
            colorCoding={colorCoding}
            style={[cs.arabic, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2 }]}
            rtl
            onWordLongPress={onWordLongPress ? (w) => onWordLongPress(w, ayah) : undefined}
          />

          {showTransliteration && transliterationText && (
            <ColorWords
              text={transliterationText}
              colorCoding={colorCoding}
              style={[cs.translit, { fontSize: romanFontSize, lineHeight: romanFontSize * 1.6 }]}
            />
          )}

          {translations.map((t) => (
            <View key={t.editionId} style={cs.transBlock}>
              <Text style={[cs.transText, { fontSize: romanFontSize, lineHeight: romanFontSize * 1.6 }]}>{"“"}{t.text}{"”"}</Text>
              <Text style={cs.transSource}>{t.name}</Text>
            </View>
          ))}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap: { marginHorizontal: 0, marginBottom: 0, position: "relative" },
  saveReveal: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 88,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 0,
  },
  saveRevealText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  card: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    zIndex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  numBadge: {
    backgroundColor: "#EDEBE6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontSize: 14, fontWeight: "700", color: "#6B6B6B", fontFamily: "Inter_700Bold" },
  memorizedCheckBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  memorizedCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#B8B1A8",
  },
  basmala: {
    fontSize: 22,
    color: "#1A1A1A",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    lineHeight: 42,
    marginBottom: 8,
  },
  arabic: {
    fontSize: 28,
    lineHeight: 56,
    color: "#1A1A1A",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 10,
  },
  translit: {
    fontSize: 14,
    color: "#7A7A7A",
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginBottom: 14,
    lineHeight: 22,
  },
  transBlock: { marginBottom: 12 },
  transText: { fontSize: 14, color: "#2C2C2C", fontFamily: "Inter_400Regular", lineHeight: 22 },
  transSource: { fontSize: 11, color: "#ABABAB", fontFamily: "Inter_400Regular", marginTop: 3, fontStyle: "italic", letterSpacing: 0.1 },
  tafBox: {
    backgroundColor: "#FFF8EE",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EDD9A3",
  },
  tafName: { fontSize: 11, fontWeight: "700", color: "#8B6914", fontFamily: "Inter_700Bold", marginBottom: 4 },
  tafText: { fontSize: 12, color: "#5A4020", fontFamily: "Inter_400Regular", lineHeight: 18 },
});

// ─── Player Bar ───────────────────────────────────────────────────────────────
const PLAYER_BG = "#F2EDE6";

function PlayerBar({
  audioState,
  playbackRate,
  reciterName,
  repeatingSelected,
  firstPageAyah,
  onPlayFromStart,
  onPlay, onPause, onStop, onNext, onPrev, onSpeedPress, onEditPress,
}: {
  audioState: { isPlaying: boolean; isLoading: boolean; currentAyah: number | null; range: any; repeatCount: number; currentRepeat: number };
  playbackRate: number;
  reciterName: string;
  repeatingSelected: boolean;
  firstPageAyah: number;
  onPlayFromStart: () => void;
  onPlay: () => void; onPause: () => void; onStop: () => void;
  onNext: () => void; onPrev: () => void;
  onSpeedPress: () => void; onEditPress: () => void;
}) {
  const { isPlaying, isLoading, currentAyah, range, repeatCount, currentRepeat } = audioState;
  const isIdle = !currentAyah && !isLoading;
  const showRepeat = !isIdle && (repeatCount ?? 0) > 1;

  const SpeedBtn = (
    <TouchableOpacity style={pb.speedBtn} onPress={onSpeedPress} activeOpacity={0.8}>
      <Text style={pb.speedText}>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</Text>
    </TouchableOpacity>
  );

  const EditBtn = (
    <TouchableOpacity style={pb.editBtn} onPress={onEditPress} activeOpacity={0.85}>
      <Text style={pb.editBtnText}>Edit</Text>
    </TouchableOpacity>
  );

  return (
    <View style={pb.wrapper}>
      {/* Status pills */}
      {repeatingSelected && (
        <View style={pb.repeatingPill}>
          <Ionicons name="infinite" size={13} color="#FFFFFF" />
          <Text style={pb.repeatingText}>Repeating Selected</Text>
        </View>
      )}
      {range && (
        <View style={pb.rangePill}>
          <Text style={pb.rangeText}>
            Range {range.startSurah}:{range.startAyah} – {range.endSurah}:{range.endAyah}
          </Text>
        </View>
      )}
      {showRepeat && (
        <View style={pb.repeatCountPill}>
          <Text style={pb.repeatCountText}>Repeat {(currentRepeat ?? 0) + 1}/{repeatCount}</Text>
        </View>
      )}

      <View style={pb.bar}>
        {isIdle ? (
          // ── IDLE: 1x | ▶ | ReciterName | Edit ──
          <>
            {SpeedBtn}
            <TouchableOpacity style={pb.iconBtn} onPress={onPlayFromStart} activeOpacity={0.7}>
              <Ionicons name="play" size={30} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={pb.idleReciter} numberOfLines={1}>{reciterName}</Text>
            {EditBtn}
          </>
        ) : (
          // ── PLAYING or READY-TO-PLAY: Stop | 1x | << | ▶/⏸ | >> | Edit ──
          <>
            <TouchableOpacity style={pb.stopBtn} onPress={onStop} activeOpacity={0.7}>
              <Ionicons name="stop" size={18} color="#4A4A4A" />
            </TouchableOpacity>
            {SpeedBtn}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={pb.skipBtn} onPress={onPrev} activeOpacity={0.7}>
              <Ionicons name="play-back" size={26} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity style={pb.iconBtn} onPress={isPlaying ? onPause : onPlay} activeOpacity={0.7}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#1A1A1A" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={pb.skipBtn} onPress={onNext} activeOpacity={0.7}>
              <Ionicons name="play-forward" size={26} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {EditBtn}
          </>
        )}
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  wrapper: {
    backgroundColor: PLAYER_BG,
    borderTopWidth: 1,
    borderTopColor: "#E2D9CF",
  },
  rangePill: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rangeText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  repeatingPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  repeatingText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  repeatCountPill: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 5,
    alignItems: "center",
  },
  repeatCountText: { fontSize: 11, color: "#3A5A3A", fontFamily: "Inter_500Medium", fontWeight: "500" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  idleReciter: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginHorizontal: 8,
  },
  stopBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBtn: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginRight: 6,
  },
  speedText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  playBtn: {
    backgroundColor: "#1A1A1A",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  iconBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  editBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 4,
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});

// ─── Content Toggle Bar ───────────────────────────────────────────────────────
function ContentBar({
  showTranslation, showTransliteration, showTafsir, colorCoding, tajweedMode, mushafMode,
  onPressMeaning, onToggleTransliteration, onPressTafsir, onToggleColors, onToggleTajweed,
}: {
  showTranslation: boolean; showTransliteration: boolean; showTafsir: boolean;
  colorCoding: boolean; tajweedMode: boolean; mushafMode: boolean;
  onPressMeaning: () => void; onToggleTransliteration: () => void;
  onPressTafsir: () => void; onToggleColors: () => void; onToggleTajweed: () => void;
}) {
  const tabs = mushafMode
    ? [
        { key: "meaning", label: "Meaning", active: showTranslation, onPress: onPressMeaning, icon: "book-open" as const },
        { key: "tafsir", label: "Tafsir", active: showTafsir, onPress: onPressTafsir, icon: "align-left" as const },
        { key: "tajweed", label: "Tajweed", active: tajweedMode, onPress: onToggleTajweed, icon: "tajweed" as const },
      ]
    : [
        { key: "meaning", label: "Meaning", active: showTranslation, onPress: onPressMeaning, icon: "book-open" as const },
        { key: "roman", label: "Roman", active: showTransliteration, onPress: onToggleTransliteration, icon: "type" as const },
        { key: "tafsir", label: "Tafsir", active: showTafsir, onPress: onPressTafsir, icon: "align-left" as const },
        { key: "colors", label: "Colors", active: colorCoding, onPress: onToggleColors, icon: "colors" as const },
        { key: "tajweed", label: "Tajweed", active: tajweedMode, onPress: onToggleTajweed, icon: "tajweed" as const },
      ];

  return (
    <View style={cb.bar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[cb.tab, tab.active && cb.tabActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); tab.onPress(); }}
          activeOpacity={0.75}
        >
          {tab.icon === "colors" ? (
            <View style={cb.dotsRow}>
              <View style={[cb.dot, { backgroundColor: tab.active ? "#E8507A" : "#CCCCCC" }]} />
              <View style={[cb.dot, { backgroundColor: tab.active ? "#27AE60" : "#CCCCCC" }]} />
              <View style={[cb.dot, { backgroundColor: tab.active ? "#2F80ED" : "#CCCCCC" }]} />
            </View>
          ) : tab.icon === "tajweed" ? (
            <View style={cb.tajweedIcon}>
              <Text style={[cb.tajweedU, { color: tab.active ? "#1A1A1A" : "#AAAAAA" }]}>U</Text>
              <View style={[cb.tajweedUnderline, { backgroundColor: tab.active ? "#1A1A1A" : "#AAAAAA" }]} />
            </View>
          ) : (
            <Feather name={tab.icon as any} size={18} color={tab.active ? "#1A1A1A" : "#AAAAAA"} />
          )}
          <Text style={[cb.label, tab.active && cb.labelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const cb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#F9F8F6",
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#EDEAE5",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 4,
    gap: 4,
    borderRadius: 12,
  },
  tabActive: { backgroundColor: "#EDEAE5" },
  label: { fontSize: 11, fontWeight: "600", color: "#BBBBBB", fontFamily: "Inter_600SemiBold" },
  labelActive: { color: "#1A1A1A" },
  dotsRow: { flexDirection: "row", gap: 2, marginBottom: 1, height: 18, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tajweedIcon: { alignItems: "center", height: 18, justifyContent: "center" },
  tajweedU: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", lineHeight: 16 },
  tajweedUnderline: { width: 12, height: 1.5, marginTop: 1 },
});

// ─── Floating top nav (← Next | [Title + hint] | Back →) ────────────────────
function FloatingTopNav({
  surahName, onPrev, onNext, onLongPress, topInset,
}: {
  surahName: string; onPrev: () => void; onNext: () => void;
  onLongPress: () => void; topInset: number;
}) {
  // RTL — left arrow advances forward in the book (Next), right arrow goes backward (Back)
  return (
    <View style={[fn.wrap, { top: topInset + 8 }]}>
      <TouchableOpacity style={fn.pillBtn} onPress={onNext} activeOpacity={0.75}>
        <Feather name="chevron-left" size={14} color="#1A1A1A" />
        <Text style={fn.pillBtnText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.85}
        style={fn.titlePill}
      >
        <Text style={fn.titleText} numberOfLines={1}>{surahName}</Text>
        <Text style={fn.hintText} numberOfLines={1}>Long press for more options</Text>
      </TouchableOpacity>
      <TouchableOpacity style={fn.pillBtn} onPress={onPrev} activeOpacity={0.75}>
        <Text style={fn.pillBtnText}>Back</Text>
        <Feather name="chevron-right" size={14} color="#1A1A1A" />
      </TouchableOpacity>
    </View>
  );
}

const fn = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F2EE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  pillBtnText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  titlePill: {
    flex: 1,
    backgroundColor: "#F5F2EE",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  titleText: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  hintText: { fontSize: 10, color: "#5D4A37", fontFamily: "Inter_400Regular", marginTop: 1, opacity: 0.85 },
});

// ─── Inline page-end nav (only at end of page) ────────────────────────────────
function PageEndNav({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  // RTL — left arrow advances forward (Next), right arrow goes backward (Back)
  return (
    <View style={fbn.wrap}>
      <TouchableOpacity style={fbn.btn} onPress={onNext} activeOpacity={0.75}>
        <Feather name="chevron-left" size={14} color="#1A1A1A" />
        <Text style={fbn.btnText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity style={fbn.btn} onPress={onPrev} activeOpacity={0.75}>
        <Text style={fbn.btnText}>Back</Text>
        <Feather name="chevron-right" size={14} color="#1A1A1A" />
      </TouchableOpacity>
    </View>
  );
}

const fbn = StyleSheet.create({
  wrap: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 24, paddingHorizontal: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F2EE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
  },
  btnText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
});

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditSheet({
  visible, onClose,
  settings, updateSettings,
  playbackRate, onSpeedChange,
  onPlayRange, onRepeatSection, onUstadhMode,
  onDownloadFullTarget, offlineStatusLabel,
}: {
  visible: boolean; onClose: () => void;
  settings: { selectedReciter: string };
  updateSettings: (p: any) => void;
  playbackRate: number; onSpeedChange: (r: number) => void;
  onPlayRange: () => void; onRepeatSection: () => void;
  onUstadhMode: () => void;
  onDownloadFullTarget: () => void;
  offlineStatusLabel: string;
}) {
  const [wordByWord, setWordByWord] = useState(false);
  const [recentReciterIds, setRecentReciterIds] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENT_RECITERS_KEY).then((v) => {
      setRecentReciterIds(v ? JSON.parse(v) : []);
    }).catch(() => {});
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FullScreenPage title="Editing" onClose={onClose} scrollable={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={es.optionRow}>
            <Feather name="refresh-cw" size={20} color="#1A1A1A" style={es.optionIcon} />
            <View style={es.optionInfo}>
              <Text style={es.optionLabel}>Word-by-Word</Text>
              <Text style={es.optionDesc}>repeat each word several times</Text>
            </View>
            <Switch
              value={wordByWord}
              onValueChange={setWordByWord}
              trackColor={{ false: "#E0E0E0", true: "#1A1A1A" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={es.optionRow}>
            <Feather name="headphones" size={20} color="#1A1A1A" style={es.optionIcon} />
            <View style={es.optionInfo}>
              <Text style={es.optionLabel}>Ustadh Mode</Text>
              <Text style={es.optionDesc}>Listen every Ayah with a pre-determined repetition frequence</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => { onClose(); onUstadhMode(); }}
              trackColor={{ false: "#E0E0E0", true: "#1A1A1A" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {[
            { icon: "scissors" as const, label: "Repeat Section", desc: "select an Ayah, edit to listen to a smaller part on repeat", onPress: () => { onClose(); onRepeatSection(); } },
            { icon: "play-circle" as const, label: "Play Within Range", desc: "select two ayahs, play only the selected range", onPress: () => { onClose(); onPlayRange(); } },
            { icon: "download" as const, label: "Download Full Target", desc: offlineStatusLabel, onPress: () => { onClose(); onDownloadFullTarget(); } },
          ].map((b) => (
            <TouchableOpacity key={b.label} style={es.optionRow} onPress={b.onPress} activeOpacity={0.7}>
              <Feather name={b.icon} size={20} color="#1A1A1A" style={es.optionIcon} />
              <View style={es.optionInfo}>
                <Text style={es.optionLabel}>{b.label}</Text>
                <Text style={es.optionDesc}>{b.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {recentReciterIds.length > 0 && (
            <>
              <Text style={es.sectionLabel}>Recently listened reciters</Text>
              {recentReciterIds.map((id) => {
                const reciter = RECITERS.find(r => r.id === id);
                if (!reciter) return null;
                const isActive = settings.selectedReciter === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={es.optionRow}
                    onPress={() => updateSettings({ selectedReciter: id })}
                    activeOpacity={0.7}
                  >
                    <Feather name="mic" size={20} color="#1A1A1A" style={es.optionIcon} />
                    <View style={es.optionInfo}>
                      <Text style={es.optionLabel}>{reciter.name}</Text>
                      <Text style={es.optionDesc}>{reciter.style}</Text>
                    </View>
                    {isActive && <Feather name="check" size={18} color="#1A1A1A" />}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <Text style={es.sectionLabel}>Playback Speed</Text>
          <View style={es.speedRow}>
            {PLAYBACK_RATES.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[es.speedChip, playbackRate === rate && es.speedChipActive]}
                onPress={() => onSpeedChange(rate)}
                activeOpacity={0.85}
              >
                <Text style={[es.speedChipText, playbackRate === rate && es.speedChipTextActive]}>
                  {rate}×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </FullScreenPage>
    </Modal>
  );
}

const es = StyleSheet.create({
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  optionIcon: { width: 28 },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
  sectionLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 18, marginBottom: 10, paddingHorizontal: 20 },
  reciterList: { gap: 8, paddingRight: 16 },
  reciterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F0F0F0" },
  reciterChipActive: { backgroundColor: "#1A1A1A" },
  reciterName: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  reciterNameActive: { color: "#FFFFFF" },
  speedRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", paddingHorizontal: 20 },
  speedChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F0F0F0" },
  speedChipActive: { backgroundColor: "#1A1A1A" },
  speedChipText: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  speedChipTextActive: { color: "#FFFFFF" },
});

// ─── Meaning Panel ────────────────────────────────────────────────────────────
function MeaningPanel({ visible, onClose, selected, onToggle, onPlay }: {
  visible: boolean; onClose: () => void;
  selected: string[]; onToggle: (id: string) => void;
  onPlay: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[mp.container, { paddingTop: insets.top }]}>
        <View style={mp.header}>
          <TouchableOpacity onPress={onPlay} style={mp.iconBtn} activeOpacity={0.7}>
            <Ionicons name="play" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={mp.title}>Meaning</Text>
          <TouchableOpacity onPress={onClose} style={mp.iconBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        {TRANSLATION_OPTIONS.map((t) => {
          const active = selected.includes(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              style={mp.row}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(t.id); }}
              activeOpacity={0.8}
            >
              <Text style={mp.rowLabel}>{t.name}</Text>
              <Switch
                value={active}
                onValueChange={undefined}
                trackColor={{ false: "#E0E0E0", true: "#2E8B7A" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E0E0E0"
                pointerEvents="none"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

const mp = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0", marginBottom: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#1A1A1A", fontFamily: "Inter_400Regular" },
});

// ─── Tafsir Modal ─────────────────────────────────────────────────────────────
function TafsirModal({ visible, onClose, tafsirDataMap, currentAyah, onPlay }: {
  visible: boolean; onClose: () => void;
  tafsirDataMap: Record<string, SurahDetail>;
  currentAyah: number;
  onPlay: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (visible && TAFSIR_EDITIONS[0]) {
      setExpanded({ [TAFSIR_EDITIONS[0].id]: true });
    }
  }, [visible]);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[tm.container, { paddingTop: insets.top }]}>
        <View style={tm.header}>
          <TouchableOpacity onPress={onPlay} style={tm.headerBtn} activeOpacity={0.75}>
            <Ionicons name="play" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={tm.title}>Tafsir</Text>
          <TouchableOpacity onPress={onClose} style={tm.headerBtn} activeOpacity={0.75}>
            <Feather name="x" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {TAFSIR_EDITIONS.map((ed) => {
            const td = tafsirDataMap[ed.id];
            const ta = td?.ayahs[currentAyah - 1];
            const isExp = expanded[ed.id];
            return (
              <View key={ed.id} style={tm.section}>
                <TouchableOpacity
                  style={tm.sectionHeader}
                  onPress={() => setExpanded(prev => ({ ...prev, [ed.id]: !isExp }))}
                  activeOpacity={0.75}
                >
                  <Text style={tm.sectionName}>{ed.name}</Text>
                  <Feather name={isExp ? "chevron-up" : "chevron-down"} size={18} color="#6B6B6B" />
                </TouchableOpacity>
                {isExp && (
                  <Text style={tm.sectionText}>
                    {ta?.text ?? "Tafsir not available for this ayah."}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        <View style={tm.footer}>
          <Feather name="chevron-down" size={22} color="#9A9A9A" />
        </View>
      </View>
    </Modal>
  );
}

const tm = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sectionName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sectionText: { fontSize: 13, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22, paddingVertical: 12 },
  footer: { alignItems: "center", paddingVertical: 12 },
});

// ─── Mushaf Page ──────────────────────────────────────────────────────────────
function MushafPage({ ayahs }: { ayahs: ApiAyah[] }) {
  return (
    <View style={ms.page}>
      <View style={ms.pageInner}>
        <Text style={ms.text} textBreakStrategy="highQuality">
          {ayahs.map((ayah) => (
            <Text key={ayah.numberInSurah}>
              <Text style={ms.ayahText}>{ayah.text}</Text>
              <Text style={ms.marker}> ۝{ayah.numberInSurah} </Text>
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  page: {
    margin: 16, backgroundColor: "#F5EDD6", borderRadius: 10,
    borderWidth: 1, borderColor: "#D4B896",
    shadowColor: "#8B6914", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5, minHeight: 400,
  },
  pageInner: { padding: 24, paddingVertical: 32, borderWidth: 2, borderColor: "#C9A96E60", borderRadius: 8, margin: 10 },
  text: { fontSize: 24, lineHeight: 52, textAlign: "justify", color: "#2C1810", writingDirection: "rtl", fontFamily: Platform.OS === "ios" ? "System" : undefined },
  ayahText: { fontSize: 24, lineHeight: 52, color: "#2C1810" },
  marker: { fontSize: 18, color: "#8B6914" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SurahScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 8 : insets.bottom;
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNum = parseInt(id, 10);

  const [arabic, setArabic] = useState<SurahDetail | null>(null);
  const [transliteration, setTransliteration] = useState<SurahDetail | null>(null);
  const [translationsMap, setTranslationsMap] = useState<Record<string, SurahDetail>>({});
  const [tafsirDataMap, setTafsirDataMap] = useState<Record<string, SurahDetail>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(true);
  const [bottomBarHeight, setBottomBarHeight] = useState(160);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [meaningPanelVisible, setMeaningPanelVisible] = useState(false);
  const [tafsirModalVisible, setTafsirModalVisible] = useState(false);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [repeatSectionVisible, setRepeatSectionVisible] = useState(false);
  const [repeatSectionInitialAyah, setRepeatSectionInitialAyah] = useState<number | null>(null);
  const menuToggleLockRef = useRef(0);
  const lastMenuToggleRef = useRef(0);
  const safeToggleMenu = useCallback(() => {
    const now = Date.now();
    if (now < menuToggleLockRef.current) return; // suppressed by recent scroll
    if (now - lastMenuToggleRef.current < 280) return; // debounce
    lastMenuToggleRef.current = now;
    setMenuVisible(v => !v);
  }, []);
const [settingsVisible, setSettingsVisible] = useState(false);
   const [currentPage, setCurrentPage] = useState(1);
   const [tajweedMode, setTajweedMode] = useState(false);
   const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [ayahRepeatCounts, setAyahRepeatCounts] = useState<Record<number, number>>({});
  const [wordModal, setWordModal] = useState<{
    word: string;
    surah: number;
    ayah: number;
    translation: string;
    audioUrl?: string;
    wordPosition?: number;
  } | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<{
    status: OfflineDownloadStatus;
    ready: number;
    total: number;
    progress?: DownloadProgress;
  }>({ status: "idle", ready: 0, total: 0 });
  const offlineDownloadRef = useRef(false);
  const [hintsVisible, setHintsVisible] = useState(false);

  // Show onboarding hints once per device
  useEffect(() => {
    AsyncStorage.getItem(HINTS_STORAGE_KEY).then((v) => {
      if (!v) setTimeout(() => setHintsVisible(true), 600);
    }).catch(() => {});
  }, []);

  const dismissHints = useCallback(() => {
    setHintsVisible(false);
    AsyncStorage.setItem(HINTS_STORAGE_KEY, "1").catch(() => {});
  }, []);

  const handleWordLongPress = useCallback(async (word: string, ayah: ApiAyah) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cacheKey = `${surahNum}:${ayah.numberInSurah}`;
    let wordTranslations = wordTranslationsCache.current[cacheKey];
    if (!wordTranslations) {
      wordTranslations = await fetchWordTranslations(surahNum, ayah.numberInSurah);
      wordTranslationsCache.current[cacheKey] = wordTranslations;
    }

    // Match this word against API words by normalized Arabic text
    const normWord = normalizeArabic(word);
    const match = wordTranslations.find((wt) => normalizeArabic(wt.arabic) === normWord);

    // Fallback to full ayah sahih translation if no word-level match
    const sahih = translationsMap["en.sahih"];
    const fallback = sahih?.ayahs[ayah.numberInSurah - 1]?.text ?? "";

    setWordModal({
      word,
      surah: surahNum,
      ayah: ayah.numberInSurah,
      translation: match?.translation || fallback,
      audioUrl: match?.audioUrl,
      wordPosition: match?.position,
    });
  }, [surahNum, translationsMap]);

  const listRef = useRef<FlatList<ApiAyah>>(null);
  const mushafScrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const userScrollingRef = useRef(false);
  const wordTranslationsCache = useRef<Record<string, WordTranslation[]>>({});

  // Horizontal swipe detector for Mushaf page navigation (via stable ref callbacks)
  const mushafGoNextRef = useRef<() => void>(() => {});
  const mushafGoPrevRef = useRef<() => void>(() => {});
  const mushafPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12,
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20,
      onPanResponderGrant: () => {},
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -50 || vx < -0.4) {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          mushafGoNextRef.current();
        } else if (dx > 50 || vx > 0.4) {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          mushafGoPrevRef.current();
        }
      },
    })
  ).current;

  // Scroll to top when screen gains focus
  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      mushafScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const {
    settings, updateSettings,
    accountSettings,
    saveProgress, recordVisit, recordAyahRead,
    saveAyah, saveWord,
    surahPositions, saveSurahPosition,
    goal, memorizationGoal, isAyahMemorized, toggleAyahMemorized,
  } = useQuran();

  const { audioState, playAyah, playRange, playSection, playUstadhMode, pauseAudio, resumeAudio, stopAudio, setPlaybackRate, playNextAyah, playPrevAyah, setOnNextAyah, setOnPlanFinish } = useAudio();

  // Fetch translations on selection change
  useEffect(() => {
    if (!arabic) return;
    const toFetch = selectedTranslations.filter(ed => !translationsMap[ed]);
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map(ed => fetchTranslation(surahNum, ed).catch(() => null))).then(results => {
      setTranslationsMap(prev => {
        const next = { ...prev };
        toFetch.forEach((ed, i) => { if (results[i]) next[ed] = results[i]!; });
        return next;
      });
    });
  }, [selectedTranslations, arabic, surahNum]);

  // Tafsir on-demand
  useEffect(() => {
    if (!settings.showTafsir || !arabic) return;
    const selected = settings.selectedTafsirs ?? ["en.maarifulquran"];
    const toFetch = selected.filter(ed => !tafsirDataMap[ed]);
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map(ed => fetchTafsir(surahNum, ed).catch(() => null))).then(results => {
      setTafsirDataMap(prev => {
        const next = { ...prev };
        toFetch.forEach((ed, i) => { if (results[i]) next[ed] = results[i]!; });
        return next;
      });
    });
  }, [settings.showTafsir, settings.selectedTafsirs, arabic, surahNum]);

  useEffect(() => {
    setTajweedMode(false);
    loadData();
    return () => setOnNextAyah(null);
  }, [surahNum]);

  useEffect(() => {
    AsyncStorage.getItem("quran_selected_translations").then((value) => {
      if (!value) return;
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const next = parsed.filter((id): id is string => typeof id === "string");
        setSelectedTranslations(next);
        updateSettings({ showTranslation: next.length > 0 });
      }
    }).catch(() => {});
  }, [updateSettings]);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      mushafScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
  }, [currentPage]);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const main = await fetchSurahWithTranslations(surahNum, "en.sahih");
      setArabic(main.arabic);
      setTransliteration(main.transliteration);
      setTranslationsMap({ "en.sahih": main.translation });

      setOnNextAyah((surahN, ayahN) => {
        const totalAyahs = SURAH_DATA[surahN - 1]?.ayahCount ?? main.arabic.ayahs.length;
        playAyah(surahN, ayahN, totalAyahs, settings.repeatCount);
        recordAyahRead(surahN, ayahN);
        saveProgress({
          surahNumber: surahN, ayahNumber: ayahN,
          ayahNumberInSurah: ayahN,
          surahName: SURAH_DATA[surahN - 1]?.englishName ?? main.arabic.englishName,
        });
        if (surahN === surahNum) {
          const idx = ayahN - 1;
          saveSurahPosition(surahN, idx);
          const page = Math.ceil(ayahN / AYAHS_PER_PAGE);
          setCurrentPage(page);
          setTimeout(() => {
            try { listRef.current?.scrollToIndex({ index: idx % AYAHS_PER_PAGE, animated: true }); } catch {}
          }, 100);
        }
      });

      const savedPos = surahPositions[surahNum];
      let initialIndex = 0;
      if (ayahParam) initialIndex = Math.max(0, parseInt(ayahParam, 10) - 1);
      else if (savedPos !== undefined) initialIndex = savedPos;

      // Record visit so surah appears in Last Visited (does NOT update CONTINUE LISTENING)
      const visitAyah = initialIndex + 1;
      recordVisit({
        surahNumber: surahNum,
        ayahNumber: visitAyah,
        ayahNumberInSurah: visitAyah,
        surahName: main.arabic.englishName,
      });

      if (initialIndex > 0) {
        const page = Math.ceil((initialIndex + 1) / AYAHS_PER_PAGE);
        setCurrentPage(page);
        setTimeout(() => {
          try { listRef.current?.scrollToIndex({ index: initialIndex % AYAHS_PER_PAGE, animated: false }); } catch {}
        }, 300);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load this Quran page.");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveAyah = useCallback(async (ayah: ApiAyah) => {
    const sahih = translationsMap["en.sahih"];
    const ayahTranslation = sahih?.ayahs[ayah.numberInSurah - 1]?.text ?? "";
    saveAyah({
      surahNumber: surahNum, surahName: arabic?.englishName ?? "",
      ayahNumber: ayah.numberInSurah, arabicText: ayah.text,
      translationText: ayahTranslation,
    });

    // Also save each word of the ayah into the vocabulary list
    const cacheKey = `${surahNum}:${ayah.numberInSurah}`;
    let wordTranslations = wordTranslationsCache.current[cacheKey];
    if (!wordTranslations) {
      wordTranslations = await fetchWordTranslations(surahNum, ayah.numberInSurah);
      wordTranslationsCache.current[cacheKey] = wordTranslations;
    }
    for (const wt of wordTranslations) {
      if (wt.arabic && wt.translation) {
        saveWord({
          arabic: wt.arabic,
          translation: wt.translation,
          surahNumber: surahNum,
          ayahNumber: ayah.numberInSurah,
          highlighted: false,
        });
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [surahNum, saveAyah, saveWord, arabic, translationsMap]);

  const handleSetRepeat = useCallback((ayah: ApiAyah, count: number) => {
    setAyahRepeatCounts(prev => ({ ...prev, [ayah.numberInSurah]: count }));
    if (!arabic) return;
    playAyah(surahNum, ayah.numberInSurah, arabic.ayahs.length, count);
    recordAyahRead(surahNum, ayah.numberInSurah);
    saveProgress({
      surahNumber: surahNum, ayahNumber: ayah.numberInSurah,
      ayahNumberInSurah: ayah.numberInSurah, surahName: arabic.englishName,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [arabic, surahNum, playAyah, recordAyahRead, saveProgress]);

  const handleCancelRepeat = useCallback((ayah: ApiAyah) => {
    setAyahRepeatCounts(prev => {
      const next = { ...prev };
      delete next[ayah.numberInSurah];
      return next;
    });
    stopAudio();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [stopAudio]);

  // Clear the repeat tag when a plan finishes naturally (all repeats done).
  useEffect(() => {
    setOnPlanFinish((finishedSurah, finishedAyah) => {
      if (finishedSurah !== surahNum) return;
      setAyahRepeatCounts(prev => {
        if (prev[finishedAyah] === undefined) return prev;
        const next = { ...prev };
        delete next[finishedAyah];
        return next;
      });
    });
    return () => setOnPlanFinish(null);
  }, [surahNum, setOnPlanFinish]);

  // After a plan finishes (planMode=null) the sound is at its end position.
  // Resume would replay from that position instead of the full ayah, so we
  // restart cleanly. When the plan is still active (paused mid-play) we resume.
  const handlePlayOrResume = useCallback(() => {
    if (audioState.planMode !== null) {
      resumeAudio();
    } else if (audioState.currentAyah && audioState.currentSurah === surahNum && arabic) {
      playAyah(surahNum, audioState.currentAyah, arabic.ayahs.length, 1);
    } else {
      resumeAudio();
    }
  }, [audioState.planMode, audioState.currentAyah, audioState.currentSurah, surahNum, arabic, resumeAudio, playAyah]);

  const handlePlayAll = useCallback(() => {
    if (!arabic) return;
    playAyah(surahNum, 1, arabic.ayahs.length, 1);
    recordAyahRead(surahNum, 1);
    saveProgress({ surahNumber: surahNum, ayahNumber: 1, ayahNumberInSurah: 1, surahName: arabic.englishName });
  }, [arabic, surahNum]);

  const handleTafsirPress = useCallback(() => {
    if (!settings.showTafsir) updateSettings({ showTafsir: true });
    setTafsirModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [settings.showTafsir, updateSettings]);

   const handleMeaningTranslationToggle = useCallback((id: string) => {
     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
     setSelectedTranslations(prev => {
       let next: string[];
       if (settings.mushafMode) {
         next = prev.includes(id) ? [] : [id];
       } else {
         next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
       }
       updateSettings({ showTranslation: next.length > 0 });
       AsyncStorage.setItem("quran_selected_translations", JSON.stringify(next)).catch(() => {});
       return next;
     });
   }, [settings.mushafMode, updateSettings]);

  const totalPages = arabic ? Math.ceil(arabic.ayahs.length / AYAHS_PER_PAGE) : 1;
  const pageAyahs = useMemo(() => {
    if (!arabic) return [];
    const start = (currentPage - 1) * AYAHS_PER_PAGE;
    return arabic.ayahs.slice(start, start + AYAHS_PER_PAGE);
  }, [arabic, currentPage]);

  const goToNextSurah = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    } else if (surahNum < 114) {
      router.replace(`/surah/${surahNum + 1}`);
    }
  };
  const goToPrevSurah = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    } else if (surahNum > 1) {
      router.replace(`/surah/${surahNum - 1}`);
    }
  };

  // Keep mushaf swipe refs up-to-date every render so PanResponder always has fresh callbacks
  mushafGoNextRef.current = goToNextSurah;
  mushafGoPrevRef.current = goToPrevSurah;

  const topPad = insets.top;
  const basmala = surahNum !== 1 && surahNum !== 9;
  const currentAyahForRange = audioState.currentSurah === surahNum && audioState.currentAyah ? audioState.currentAyah : parseInt(ayahParam ?? "1", 10) || 1;
  const memorizationGoalAyahKeys = useMemo(() => {
    if (!goal?.startSurahNumber || !goal.startAyahNumber) return null;
    const target = memorizationGoal?.path === "juz" && memorizationGoal.targetJuz
      ? { path: "juz" as const, juz: memorizationGoal.targetJuz }
      : { path: "surah" as const };
    return new Set(getWeeklyGoalAyahsFrom(
      goal.startSurahNumber,
      goal.startAyahNumber,
      goal.ayahsPerWeek,
      target
    ).map(a => `${a.surahNumber}:${a.ayahNumber}`));
  }, [goal, memorizationGoal]);

  const weeklyGoalAyahs = useMemo<GoalAyahLike[]>(() => {
    if (!goal?.startSurahNumber || !goal.startAyahNumber) return [];
    const target = memorizationGoal?.path === "juz" && memorizationGoal.targetJuz
      ? { path: "juz" as const, juz: memorizationGoal.targetJuz }
      : { path: "surah" as const };
    return getWeeklyGoalAyahsFrom(
      goal.startSurahNumber,
      goal.startAyahNumber,
      goal.ayahsPerWeek,
      target
    ).map((a) => ({ surahNumber: a.surahNumber, ayahNumber: a.ayahNumber }));
  }, [goal, memorizationGoal]);

  const fullTargetAyahs = useMemo<GoalAyahLike[]>(() => {
    if (memorizationGoal?.path === "juz" && memorizationGoal.targetJuz) {
      return getJuzAyahs(memorizationGoal.targetJuz).map((a) => ({
        surahNumber: a.surahNumber,
        ayahNumber: a.ayahNumber,
      }));
    }
    if (memorizationGoal?.path === "surah" && memorizationGoal.startSurahNumber) {
      const surah = SURAH_DATA[memorizationGoal.startSurahNumber - 1];
      if (!surah) return [];
      return Array.from({ length: surah.ayahCount }, (_, index) => ({
        surahNumber: surah.number,
        ayahNumber: index + 1,
      }));
    }
    return arabic?.ayahs.map((ayah) => ({ surahNumber: surahNum, ayahNumber: ayah.numberInSurah })) ?? [];
  }, [arabic?.ayahs, memorizationGoal, surahNum]);

  // extraData ensures FlatList cells re-render when audio state changes.
  // Without this, cells use a stale renderItem closure because pageAyahs is
  // a stable memoized reference that never changes during audio playback.
  const flatListExtraData = useMemo(() => ({
    currentAyah: audioState.currentAyah,
    currentSurah: audioState.currentSurah,
    repeatCount: audioState.repeatCount,
    range: audioState.range,
    ayahRepeatCounts,
  }), [audioState.currentAyah, audioState.currentSurah, audioState.repeatCount, audioState.range, ayahRepeatCounts]);

  const refreshOfflineStatus = useCallback(async () => {
    const ayahs = weeklyGoalAyahs.length > 0 ? weeklyGoalAyahs : pageAyahs.map((ayah) => ({ surahNumber: surahNum, ayahNumber: ayah.numberInSurah }));
    if (ayahs.length === 0) return;
    const status = await getOfflineStatusForAyahs(ayahs, Number(settings.selectedReciter) || 7);
    setOfflineStatus({ status: status.status, ready: status.ready, total: status.total });
  }, [pageAyahs, settings.selectedReciter, surahNum, weeklyGoalAyahs]);

  const downloadAyahs = useCallback(async (ayahs: GoalAyahLike[]) => {
    if (ayahs.length === 0 || offlineDownloadRef.current) return;
    offlineDownloadRef.current = true;
    setOfflineStatus({ status: "downloading", ready: 0, total: ayahs.length });
    try {
      const result = await ensureGoalOffline({
        ayahs,
        reciterId: Number(settings.selectedReciter) || 7,
        onProgress: (progress) => setOfflineStatus({
          status: "downloading",
          ready: progress.completed,
          total: progress.total,
          progress,
        }),
      });
      setOfflineStatus({
        status: result.failed > 0 ? "failed" : "ready",
        ready: result.completed,
        total: result.total,
        progress: result,
      });
    } finally {
      offlineDownloadRef.current = false;
    }
  }, [settings.selectedReciter]);

  useEffect(() => {
    refreshOfflineStatus().catch(() => {});
  }, [refreshOfflineStatus]);

  useEffect(() => {
    if (weeklyGoalAyahs.length === 0 || offlineDownloadRef.current) return;
    downloadAyahs(weeklyGoalAyahs).catch(() => {
      offlineDownloadRef.current = false;
      setOfflineStatus((prev) => ({ ...prev, status: "failed" }));
    });
  }, [downloadAyahs, weeklyGoalAyahs]);

  const offlineStatusLabel = offlineStatus.status === "downloading"
    ? `downloading ${offlineStatus.ready}/${offlineStatus.total || fullTargetAyahs.length} ayahs for offline playback`
    : offlineStatus.status === "ready"
      ? `ready offline (${offlineStatus.ready}/${offlineStatus.total})`
      : offlineStatus.status === "failed"
        ? `some audio is missing (${offlineStatus.ready}/${offlineStatus.total}); tap to retry full target`
        : "download this memorization target for offline playback";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2EE" }}>
      {/* ── Fixed Header ─────────────────────────────────────── */}
      {menuVisible && (
        <View style={[scr.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={scr.headerBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.appText} />
          </TouchableOpacity>
          <View style={scr.headerCenter}>
            {arabic && (
              <>
                <Text style={scr.headerTitle}>{arabic.englishName}</Text>
                <Text style={scr.headerSub}>{arabic.numberOfAyahs} ayahs · {arabic.revelationType}</Text>
              </>
            )}
          </View>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={scr.headerBtn} activeOpacity={0.7}>
            <Feather name="menu" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Mode Switcher (centered, only Normal/Mushaf) ─────── */}
      {menuVisible && (
        <View style={scr.modeBar}>
          <View style={scr.modeSwitcher}>
            <TouchableOpacity
              style={[scr.modeBtn, !settings.mushafMode && scr.modeBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: false }); }}
              activeOpacity={0.85}
            >
              <Text style={[scr.modeBtnText, !settings.mushafMode && scr.modeBtnTextActive]}>Normal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[scr.modeBtn, settings.mushafMode && scr.modeBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: true }); }}
              activeOpacity={0.85}
            >
              <Text style={[scr.modeBtnText, settings.mushafMode && scr.modeBtnTextActive]}>Mushaf</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Floating top nav (menu hidden) ───────────────────── */}
      {!menuVisible && (
        <FloatingTopNav
          surahName={arabic?.englishName ?? ""}
          topInset={insets.top}
          onPrev={goToPrevSurah}
          onNext={goToNextSurah}
          onLongPress={() => setRangeVisible(true)}
        />
      )}

      {/* ── Content ──────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color="#1A1A1A" style={{ flex: 1 }} size="large" />
      ) : loadError ? (
        <View style={scr.errorState}>
          <Feather name="alert-circle" size={34} color="#B91C1C" />
          <Text style={scr.errorTitle}>Could not load this surah</Text>
          <Text style={scr.errorText}>{loadError}</Text>
          <TouchableOpacity style={scr.errorRetry} onPress={loadData} activeOpacity={0.85}>
            <Text style={scr.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : settings.mushafMode ? (
        // Split view: TOP fixed Mushaf panel, BOTTOM scrollable translations.
        // If translations are off, the Mushaf takes the full panel and scrolls.
        <View style={{ flex: 1 }} {...mushafPanResponder.panHandlers}>
          <View style={settings.showTranslation ? { flex: 0.55, backgroundColor: MUSHAF_BG } : { flex: 1, backgroundColor: MUSHAF_BG }}>
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={safeToggleMenu}>
              <ScrollView
                ref={mushafScrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: menuVisible ? 8 : (insets.top + 64), paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {arabic && currentPage === 1 && basmala && (
                  <View style={scr.mushafInfo}>
                    <Text style={scr.mushafArabicName}>{arabic.name}</Text>
                    <Text style={scr.mushafBasmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
                  </View>
                )}
                <MushafPage ayahs={pageAyahs} />
              </ScrollView>
            </TouchableOpacity>
          </View>
          {settings.showTranslation && (
            <View style={scr.mushafSplitDivider} />
          )}
          {settings.showTranslation && (
            <ScrollView
              style={{ flex: 0.45, backgroundColor: "#FFFFFF" }}
              contentContainerStyle={{ padding: 16, paddingBottom: menuVisible ? (bottomBarHeight + 8) : 40 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={scr.mushafSplitHeader}>Translation</Text>
              {pageAyahs.map((ayah) => {
                const sahih = translationsMap["en.sahih"];
                const ta = sahih?.ayahs[ayah.numberInSurah - 1];
                return ta ? (
                  <View key={ayah.numberInSurah} style={scr.mushafSplitRow}>
                    <View style={scr.mushafSplitNumBadge}>
                      <Text style={scr.mushafSplitNumText}>{ayah.numberInSurah}</Text>
                    </View>
                    <Text style={scr.mushafSplitText}>{ta.text}</Text>
                  </View>
                ) : null;
              })}
            </ScrollView>
          )}
        </View>
      ) : (
        arabic ? (
          <FlatList
            ref={listRef}
            data={pageAyahs}
            extraData={flatListExtraData}
            keyExtractor={(item) => String(item.numberInSurah)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: menuVisible ? 4 : (insets.top + 64),
              paddingBottom: menuVisible ? (bottomBarHeight + 8) : 24,
            }}
            style={{ flex: 1, backgroundColor: "#FAF9F7" }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#EDEAE5" }} />}
            onScrollBeginDrag={(e) => {
              userScrollingRef.current = true;
              menuToggleLockRef.current = Date.now() + 600;
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => { userScrollingRef.current = false; }, 250);
            }}
            onMomentumScrollEnd={() => {
              userScrollingRef.current = false;
            }}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              if (menuVisible && userScrollingRef.current && Math.abs(y - scrollYRef.current) > 40) {
                setMenuVisible(false);
              }
            }}
            scrollEventThrottle={32}
            ListFooterComponent={
              <View>
                {!menuVisible ? (
                  <PageEndNav onPrev={goToPrevSurah} onNext={goToNextSurah} />
                ) : (
                  <View style={{ height: 12 }} />
                )}
                <View style={scr.swipeHintBar}>
                  <Text style={scr.swipeHintText}>← swipe left to save to quizzes</Text>
                  <Text style={[scr.swipeHintText, { marginTop: 6 }]}>{"Long press to customize learning by\nrepeating sections, editing ranges & saving words"}</Text>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isPlaying = audioState.currentSurah === surahNum && audioState.currentAyah === item.numberInSurah;
              const repeatVal = ayahRepeatCounts[item.numberInSurah];
              const isOnRepeat = (repeatVal != null && repeatVal > 1) || (isPlaying && audioState.repeatCount > 1 && audioState.planMode !== "ustadh");
              const isUstadhMode = audioState.planMode === "ustadh" && isPlaying;
              const repeatCount = repeatVal ?? audioState.repeatCount;
              const isRangeSelected = !!audioState.range
                && surahNum >= audioState.range.startSurah
                && surahNum <= audioState.range.endSurah
                && item.numberInSurah >= (surahNum === audioState.range.startSurah ? audioState.range.startAyah : 1)
                && item.numberInSurah <= (surahNum === audioState.range.endSurah ? audioState.range.endAyah : 999);
              const isInMemorizationGoal = !!memorizationGoalAyahKeys?.has(`${surahNum}:${item.numberInSurah}`);
              const showB = item.numberInSurah === 1 && basmala;

              const translations = selectedTranslations
                .map(ed => {
                  const td = translationsMap[ed];
                  const ta = td?.ayahs[item.numberInSurah - 1];
                  const opt = TRANSLATION_OPTIONS.find(o => o.id === ed);
                  if (!ta || !opt) return null;
                  return { editionId: ed, name: opt.name, text: ta.text };
                })
                .filter((x): x is { editionId: string; name: string; text: string } => !!x);

              return (
                <SwipeableAyahCard
                  ayah={item}
                  surahNum={surahNum}
                  isPlaying={isPlaying}
                  isOnRepeat={!!isOnRepeat}
                  repeatCount={repeatCount}
                  isUstadhMode={isUstadhMode}
                  isRangeSelected={isRangeSelected && !isPlaying}
                  showMemorizedToggle={isInMemorizationGoal}
                  isMemorized={isAyahMemorized(surahNum, item.numberInSurah)}
                  translations={selectedTranslations.length > 0 ? translations : []}
                  transliterationText={transliteration?.ayahs[item.numberInSurah - 1]?.text ?? null}
                  showTransliteration={settings.showTransliteration}
                  colorCoding={settings.colorCoding}
                  showBasmala={showB}
                  arabicFontSize={accountSettings.fontSize ?? 28}
                  romanFontSize={accountSettings.romanFontSize ?? 14}
                  onSave={handleSaveAyah}
                  onCancelRepeat={handleCancelRepeat}
                  onCancelUstadh={stopAudio}
                  onToggleMemorized={(ayah) => toggleAyahMemorized(surahNum, ayah.numberInSurah)}
                  onPress={safeToggleMenu}
                  onWordLongPress={handleWordLongPress}
                />
              );
            }}
          />
        ) : null
      )}

      {/* ── Player + Content bar ─────────────────────────────── */}
      {menuVisible && (
        <View
          style={[scr.bottom, { paddingBottom: bottomInset }]}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && Math.abs(h - bottomBarHeight) > 4) setBottomBarHeight(h);
          }}
        >
          <PlayerBar
            audioState={audioState}
            playbackRate={audioState.playbackRate}
            reciterName={RECITERS.find(r => r.id === settings.selectedReciter)?.name ?? ""}
            repeatingSelected={!!audioState.range && audioState.repeatCount > 1}
            firstPageAyah={pageAyahs[0]?.numberInSurah ?? 1}
            onPlayFromStart={() => {
              if (!arabic) return;
              const firstAyah = pageAyahs[0]?.numberInSurah ?? 1;
              playAyah(surahNum, firstAyah, arabic.ayahs.length, settings.repeatCount);
              recordAyahRead(surahNum, firstAyah);
              saveProgress({ surahNumber: surahNum, ayahNumber: firstAyah, ayahNumberInSurah: firstAyah, surahName: arabic.englishName });
            }}
            onPlay={handlePlayOrResume}
            onPause={pauseAudio}
            onStop={stopAudio}
            onNext={playNextAyah}
            onPrev={playPrevAyah}
            onSpeedPress={() => {
              const idx = PLAYBACK_RATES.indexOf(audioState.playbackRate);
              const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
              setPlaybackRate(next);
            }}
            onEditPress={() => setEditSheetVisible(true)}
          />
          <ContentBar
            showTranslation={selectedTranslations.length > 0}
            showTransliteration={settings.showTransliteration && !settings.mushafMode}
            showTafsir={tafsirModalVisible}
            colorCoding={settings.colorCoding}
            tajweedMode={tajweedMode}
            mushafMode={settings.mushafMode}
            onPressMeaning={() => setMeaningPanelVisible(true)}
            onToggleTransliteration={() => updateSettings({ showTransliteration: !settings.showTransliteration })}
            onPressTafsir={handleTafsirPress}
            onToggleColors={() => updateSettings({ colorCoding: !settings.colorCoding })}
            onToggleTajweed={() => setTajweedMode(v => !v)}
          />
          {offlineStatus.status === "ready" && (
            <View style={scr.offlineToast} pointerEvents="none">
              <Feather name="check-circle" size={10} color="#6B6B6B" />
              <Text style={scr.offlineToastText}>Offline ready</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      <EditSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        settings={settings}
        updateSettings={updateSettings}
        playbackRate={audioState.playbackRate}
        onSpeedChange={setPlaybackRate}
        onPlayRange={() => setRangeVisible(true)}
        onRepeatSection={() => setRepeatSectionVisible(true)}
        onUstadhMode={() => {
          const ayahs = weeklyGoalAyahs
            .filter((ayah) => ayah.surahNumber === surahNum)
            .map((ayah) => ayah.ayahNumber);
          const fallbackAyah = currentAyahForRange;
          playUstadhMode(surahNum, ayahs.length > 0 ? ayahs : [fallbackAyah]);
        }}
        onDownloadFullTarget={() => {
          downloadAyahs(fullTargetAyahs).catch(() => {
            offlineDownloadRef.current = false;
            setOfflineStatus((prev) => ({ ...prev, status: "failed" }));
          });
        }}
        offlineStatusLabel={offlineStatusLabel}
      />

      <RepeatSectionSheet
        visible={repeatSectionVisible}
        onClose={() => { setRepeatSectionVisible(false); setRepeatSectionInitialAyah(null); }}
        surahNumber={surahNum}
        surahName={arabic?.englishName ?? ""}
        ayahNumber={repeatSectionInitialAyah ?? currentAyahForRange}
        ayahText={
          arabic?.ayahs?.[(repeatSectionInitialAyah ?? currentAyahForRange) - 1]?.text ?? ""
        }
        onConfirm={(startWordIdx, endWordIdx, totalWords, repeatCount) => {
          const ayahN = repeatSectionInitialAyah ?? currentAyahForRange;
          void totalWords;
          playSection(surahNum, ayahN, startWordIdx + 1, endWordIdx + 1, repeatCount);
          setAyahRepeatCounts(prev => ({ ...prev, [ayahN]: repeatCount }));
          recordAyahRead(surahNum, ayahN);
          saveProgress({
            surahNumber: surahNum,
            ayahNumber: ayahN,
            ayahNumberInSurah: ayahN,
            surahName: arabic?.englishName ?? "",
          });
        }}
      />

      <MeaningPanel
        visible={meaningPanelVisible}
        onClose={() => setMeaningPanelVisible(false)}
        selected={selectedTranslations}
        onToggle={handleMeaningTranslationToggle}
        onPlay={() => { setMeaningPanelVisible(false); handlePlayAll(); }}
      />

      <TafsirModal
        visible={tafsirModalVisible}
        onClose={() => setTafsirModalVisible(false)}
        tafsirDataMap={tafsirDataMap}
        currentAyah={currentAyahForRange}
        onPlay={() => { setTafsirModalVisible(false); handlePlayAll(); }}
      />

      <PlayRangeSheet
        visible={rangeVisible}
        onClose={() => setRangeVisible(false)}
        surahNumber={surahNum}
        surahName={arabic?.englishName ?? ""}
        ayahs={arabic?.ayahs ?? []}
        currentAyah={currentAyahForRange}
        onConfirm={(startA, endA, repeatCount) => {
          playRange(
            { startSurah: surahNum, startAyah: startA, endSurah: surahNum, endAyah: endA },
            repeatCount,
          );
          recordAyahRead(surahNum, startA);
          saveProgress({
            surahNumber: surahNum,
            ayahNumber: startA,
            ayahNumberInSurah: startA,
            surahName: arabic?.englishName ?? "",
          });
        }}
      />

      {wordModal && (
        <WordModal
          visible={!!wordModal}
          word={wordModal.word}
          translation={wordModal.translation}
          surahNumber={wordModal.surah}
          ayahNumber={wordModal.ayah}
          audioUrl={wordModal.audioUrl}
          onClose={() => setWordModal(null)}
          onRepeat={() => {
            if (wordModal.wordPosition) {
              playSection(wordModal.surah, wordModal.ayah, wordModal.wordPosition, wordModal.wordPosition, 999);
              setAyahRepeatCounts(prev => ({ ...prev, [wordModal.ayah]: 999 }));
            } else {
              handleSetRepeat(
                { numberInSurah: wordModal.ayah } as ApiAyah,
                999,
              );
            }
          }}
          onCut={() => {
            setRepeatSectionInitialAyah(wordModal.ayah);
            setWordModal(null);
            setRepeatSectionVisible(true);
          }}
        />
      )}

      <OnboardingHints visible={hintsVisible} onDismiss={dismissHints} />

      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

const scr = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: "#FAF9F7",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2DDD6",
  },
  headerBtn: { padding: 8, width: 40, alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  headerSub: { fontSize: 12, color: "#A0A0A0", fontFamily: "Inter_400Regular", marginTop: 1 },
  modeBar: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FAF9F7",
    borderBottomWidth: 1,
    borderBottomColor: "#EDEAE5",
  },
  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#EDEAE5",
    borderRadius: 14,
    padding: 3,
    minWidth: 240,
  },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  modeBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: "700", color: "#AAAAAA", fontFamily: "Inter_700Bold" },
  modeBtnTextActive: { color: "#1A1A1A" },
  bottom: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#F9F8F6",
    borderTopWidth: 1,
    borderTopColor: "#E2D9CF",
    zIndex: 50,
  },
  offlineToast: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EFEBE5",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D5D0CA",
  },
  offlineToastText: {
    fontSize: 10,
    color: "#6B6B6B",
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAF9F7",
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginTop: 14 },
  errorText: { fontSize: 13, lineHeight: 20, color: "#6B625A", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
  errorRetry: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  errorRetryText: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  mushafInfo: { alignItems: "center", paddingVertical: 16, backgroundColor: MUSHAF_BG },
  mushafArabicName: { fontSize: 28, color: "#2C1810", fontFamily: Platform.OS === "ios" ? "System" : undefined, marginBottom: 8 },
  mushafBasmala: { fontSize: 18, color: "#2C1810", fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "center" },
  mushafTranslations: { padding: 16, gap: 8, backgroundColor: "#FFFFFF" },
  mushafTranslation: { fontSize: 14, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22 },
  mushafTranslationNum: { fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  mushafSplitDivider: { height: 1, backgroundColor: "#E5E5E5" },
  mushafSplitHeader: {
    fontSize: 12, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", letterSpacing: 1.4,
    marginBottom: 12, textTransform: "uppercase",
  },
  mushafSplitRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  mushafSplitNumBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  mushafSplitNumText: { fontSize: 11, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  mushafSplitText: {
    flex: 1, fontSize: 14, lineHeight: 22,
    color: "#2C2C2C", fontFamily: "Inter_400Regular",
  },
  swipeHintBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  swipeHintText: {
    fontSize: 11,
    color: "#AAAAAA",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
    letterSpacing: 0.1,
  },
});
