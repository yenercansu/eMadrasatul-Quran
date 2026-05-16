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
  Pressable,
  Switch,
  LayoutAnimation,
  UIManager,
  Alert,
  Animated,
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
import { useNetworkStatus } from "@/contexts/NetworkContext";
import { SettingsSheet, TAFSIR_EDITIONS } from "@/components/SettingsSheet";
import { FullScreenPage } from "@/components/FullScreenPage";
import { PlayRangeSheet } from "@/components/PlayRangeSheet";
import { RepeatSectionSheet } from "@/components/RepeatSectionSheet";
import { CancelRepeatTag } from "@/components/CancelRepeatTag";
import { CancelModeTag } from "@/components/CancelModeTag";
import { SettingsCard, SettingsRow } from "@/components/SettingsRow";
import { WordModal } from "@/components/WordModal";
import { OnboardingHints } from "@/components/OnboardingHints";
import { SaveButton } from "@/components/SaveButton";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { MushafPageView } from "@/components/mushaf/MushafPageView";
import { TajweedWordsText } from "@/components/TajweedText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheSurahContentForOffline, fetchSurahWithTranslations, fetchTranslation, fetchWordTranslations, type SurahDetail, type ApiAyah, type WordTranslation } from "@/services/quranApi";
import { fetchTafsirPage, normalizeTafsirKeys, type TafsirEntry } from "@/services/tafsirApi";
import { getWeeklyGoalAyahsFrom, SURAH_DATA } from "@/constants/surahData";
import { getArabicFontFamily } from "@/constants/arabicFonts";
import { RECENT_RECITERS_KEY } from "@/contexts/AudioContext";
import {
  deleteOfflineAudioExceptSurah,
  ensureSurahOffline,
  getCachedAyahAudioUri,
  getOfflineStatusForAyahs,
  getVerseKey,
  migrateToSingleSurahOfflineCache,
  type DownloadProgress,
  type GoalAyahLike,
  type OfflineDownloadStatus,
} from "@/services/offlineQuranCache";

const HINTS_STORAGE_KEY = "@squran/surah-hints-seen-v1";

// Strip Arabic diacritics for fuzzy word matching against backend word metadata.
function normalizeArabic(s: string): string {
  return s.replace(/[ً-ٟؐ-ؚٰۖ-ۭـ]/g, "").trim();
}

const AYAHS_PER_PAGE = 10;
const PAGE_SWIPE_ACTIVATION_PX = 46;
const PAGE_SWIPE_MIN_DISTANCE_PX = 110;
const PAGE_SWIPE_DISTANCE_RATIO = 0.36;
const PAGE_SWIPE_MIN_FLING_PX = 70;
const PAGE_SWIPE_VELOCITY = 0.85;
const PAGE_SWIPE_VERTICAL_REJECTION_PX = 18;
const MUSHAF_BG = "#FFFFFF";
const WORD_COLORS = ["#E8507A", "#F2994A", "#27AE60", "#2F80ED", "#9B51E0", "#EB5757"];
const READER_MODE_OPTIONS = [
  { value: "verses", label: "Verses" },
  { value: "mushaf", label: "Mushaf" },
] as const;

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

function QuranWords({ text, tajweedText, colorCoding, tajweedMode, style, rtl, onWordLongPress }: {
  text: string; tajweedText?: string; colorCoding: boolean; tajweedMode: boolean; style?: any; rtl?: boolean;
  onWordLongPress?: (word: string) => void;
}) {
  if (tajweedMode && tajweedText) {
    return (
      <TajweedWordsText
        text={text}
        markup={tajweedText}
        style={style}
        rtl={rtl}
        fallbackColor="#1A1A1A"
        onWordLongPress={onWordLongPress}
      />
    );
  }

  return (
    <ColorWords
      text={text}
      colorCoding={colorCoding}
      style={style}
      rtl={rtl}
      onWordLongPress={onWordLongPress}
    />
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
  tajweedMode: boolean;
  showBasmala: boolean;
  arabicFontSize: number;
  romanFontSize: number;
  arabicFontFamily: string | undefined;
  isOnRepeat: boolean;
  repeatCount: number;
  isUstadhMode: boolean;
  isSaved: boolean;
  onSave: (ayah: ApiAyah) => void;
  onCancelRepeat: (ayah: ApiAyah) => void;
  onCancelUstadh: () => void;
  onToggleMemorized: (ayah: ApiAyah) => void;
  onPress: () => void;
  onWordLongPress?: (word: string, ayah: ApiAyah) => void;
}

function SwipeableAyahCard({
  ayah, surahNum, isPlaying, isRangeSelected,
  showMemorizedToggle, isMemorized,
  isOnRepeat, repeatCount, isUstadhMode,
  isSaved,
  translations, transliterationText,
  showTransliteration,
  colorCoding, tajweedMode, showBasmala, arabicFontSize, romanFontSize, arabicFontFamily,
  onSave, onCancelRepeat, onCancelUstadh, onToggleMemorized, onPress, onWordLongPress,
}: AyahCardProps) {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const cardBg = isPlaying ? "#F5F0E8" : isRangeSelected ? "#F0F5EE" : "#FFFFFF";

  return (
    <View style={cs.wrap}>
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
            <SaveButton
              saved={isSaved}
              size="md"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(ayah);
              }}
              accessibilityLabel={`Save ayah ${ayah.numberInSurah}`}
            />
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
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isMemorized }}
                accessibilityLabel={isMemorized
                  ? `Unmark ayah ${ayah.numberInSurah} as memorized`
                  : `Mark ayah ${ayah.numberInSurah} as memorized`}
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
            <Text style={[cs.basmala, { fontFamily: arabicFontFamily }]}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}

          <QuranWords
            text={ayah.text}
            tajweedText={ayah.tajweedText}
            colorCoding={colorCoding}
            tajweedMode={tajweedMode}
            style={[cs.arabic, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2, fontFamily: arabicFontFamily }]}
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
    </View>
  );
}

const cs = StyleSheet.create({
  wrap: { marginHorizontal: 0, marginBottom: 0, position: "relative" },
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
  firstPageAyah,
  onPlayFromStart,
  onPlay, onPause, onStop, onNext, onPrev, onSpeedPress, onEditPress,
}: {
  audioState: { isPlaying: boolean; isLoading: boolean; currentAyah: number | null };
  playbackRate: number;
  reciterName: string;
  firstPageAyah: number;
  onPlayFromStart: () => void;
  onPlay: () => void; onPause: () => void; onStop: () => void;
  onNext: () => void; onPrev: () => void;
  onSpeedPress: () => void; onEditPress: () => void;
}) {
  const { isPlaying, isLoading, currentAyah } = audioState;
  const isIdle = !currentAyah && !isLoading;

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

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditSheet({
  visible, onClose,
  settings, updateSettings,
  playbackRate, onSpeedChange,
  surahName, totalAyahs,
  config, onConfigChange, onPlay,
  onDownloadCurrentSurah, offlineStatusLabel,
}: {
  visible: boolean; onClose: () => void;
  settings: { selectedReciter: string };
  updateSettings: (p: any) => void;
  playbackRate: number; onSpeedChange: (r: number) => void;
  surahName: string;
  totalAyahs: number;
  config: PlaybackConfig;
  onConfigChange: (config: PlaybackConfig) => void;
  onPlay: () => void;
  onDownloadCurrentSurah: () => void;
  offlineStatusLabel: string;
}) {
  const [recentReciterIds, setRecentReciterIds] = useState<string[]>([]);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENT_RECITERS_KEY).then((v) => {
      setRecentReciterIds(v ? JSON.parse(v) : []);
    }).catch(() => {});
  }, [visible]);

  const upd = (partial: Partial<PlaybackConfig>) => onConfigChange({ ...config, ...partial });

  const handlePlay = () => {
    onPlay();
    onClose();
  };

  const modes = [
    { id: "repetition" as const, icon: "repeat" as const, label: "Repetition" },
    { id: "ustadh" as const, icon: "headphones" as const, label: "Ustadh Mode" },
    { id: "wordByWord" as const, icon: "refresh-cw" as const, label: "Word by Word" },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FullScreenPage title="Editing" onClose={onClose} scrollable={false}>
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

            {/* ── Playback Range ── */}
            <Text style={es.secHeader}>Playback Range</Text>
            <SettingsCard>
              <SettingsRow
                label="Start Ayah"
                value={`${surahName} ${config.startAyah}`}
                onPress={() => setPickerTarget("start")}
              />
              <SettingsRow
                label="End Ayah"
                value={`${surahName} ${config.endAyah}`}
                onPress={() => setPickerTarget("end")}
                last
              />
            </SettingsCard>

            {/* ── Listening Mode ── */}
            <Text style={es.secHeader}>Listening Mode</Text>
            <View style={es.modeRow}>
              {modes.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[es.modeCard, config.mode === m.id && es.modeCardActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); upd({ mode: m.id }); }}
                  activeOpacity={0.75}
                >
                  <Feather name={m.icon} size={20} color={config.mode === m.id ? "#FFFFFF" : "#4A4A4A"} />
                  <Text style={[es.modeCardText, config.mode === m.id && es.modeCardTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Mode-specific controls ── */}
            {config.mode === "repetition" && (
              <>
                <Text style={es.secHeader}>Repetition</Text>
                <SettingsCard>
                  <SettingsRow
                    label="Ayah Repeat"
                    right={
                      <View style={es.segRow}>
                        {([1, 3, 5, 10, 999] as number[]).map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[es.seg, config.ayahRepeat === v && es.segActive]}
                            onPress={() => upd({ ayahRepeat: v })}
                            activeOpacity={0.8}
                          >
                            <Text style={[es.segText, config.ayahRepeat === v && es.segTextActive]}>
                              {v === 999 ? "∞" : `${v}x`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    }
                  />
                  <SettingsRow
                    label="Set Repeat"
                    last
                    right={
                      <View style={es.segRow}>
                        {([1, 3, 5, 10, 999] as number[]).map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[es.seg, config.rangeRepeat === v && es.segActive]}
                            onPress={() => upd({ rangeRepeat: v })}
                            activeOpacity={0.8}
                          >
                            <Text style={[es.segText, config.rangeRepeat === v && es.segTextActive]}>
                              {v === 999 ? "∞" : `${v}x`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    }
                  />
                </SettingsCard>
              </>
            )}
            {config.mode === "ustadh" && (
              <View style={es.modeHint}>
                <Text style={es.modeHintText}>Ustadh Mode uses its own repetition pattern.</Text>
              </View>
            )}
            {config.mode === "wordByWord" && (
              <>
                <Text style={es.secHeader}>Word Repeat</Text>
                <Text style={es.secSubtitle}>each word repeats before moving to next</Text>
                <SettingsCard>
                  <SettingsRow
                    label="Word Repeat"
                    last
                    right={
                      <View style={es.segRow}>
                        {([1, 3, 5, 10] as number[]).map((v) => (
                          <TouchableOpacity
                            key={v}
                            style={[es.seg, config.wordRepeat === v && es.segActive]}
                            onPress={() => upd({ wordRepeat: v })}
                            activeOpacity={0.8}
                          >
                            <Text style={[es.segText, config.wordRepeat === v && es.segTextActive]}>
                              {`${v}x`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    }
                  />
                </SettingsCard>
              </>
            )}

            {/* ── Download ── */}
            <TouchableOpacity style={[es.optionRow, { marginTop: 20 }]} onPress={() => { onClose(); onDownloadCurrentSurah(); }} activeOpacity={0.7}>
              <Feather name="download" size={20} color="#1A1A1A" style={es.optionIcon} />
              <View style={es.optionInfo}>
                <Text style={es.optionLabel}>Download Current Surah</Text>
                <Text style={es.optionDesc}>{offlineStatusLabel}</Text>
              </View>
            </TouchableOpacity>

            {/* ── Recently listened reciters ── */}
            {recentReciterIds.length > 0 && (
              <>
                <Text style={es.secHeader}>Recently Listened Reciters</Text>
                {recentReciterIds.map((id) => {
                  const reciter = RECITERS.find(r => r.id === id);
                  if (!reciter) return null;
                  const isActive = settings.selectedReciter === id;
                  return (
                    <TouchableOpacity key={id} style={es.optionRow} onPress={() => updateSettings({ selectedReciter: id })} activeOpacity={0.7}>
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

            {/* ── Playback Speed ── */}
            <Text style={es.secHeader}>Playback Speed</Text>
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

          {/* ── Sticky Play Range CTA ── */}
          <View style={[es.ctaBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={es.ctaBtn} onPress={handlePlay} activeOpacity={0.85}>
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={es.ctaBtnText}>Play Range</Text>
            </TouchableOpacity>
          </View>
        </View>
      </FullScreenPage>

      {/* ── Ayah number picker (full-screen) ── */}
      <Modal visible={pickerTarget !== null} animationType="slide" onRequestClose={() => setPickerTarget(null)}>
        <FullScreenPage
          title={pickerTarget === "start" ? "Start Ayah" : "End Ayah"}
          onClose={() => setPickerTarget(null)}
        >
          {Array.from({ length: totalAyahs }, (_, i) => i + 1).map((n) => {
            const sel = pickerTarget === "start" ? config.startAyah === n : config.endAyah === n;
            return (
              <TouchableOpacity
                key={n}
                style={[es.pickerRow, sel && es.pickerRowSel]}
                onPress={() => {
                  if (pickerTarget === "start") {
                    upd({ startAyah: n, endAyah: Math.max(config.endAyah, n) });
                  } else {
                    upd({ startAyah: Math.min(config.startAyah, n), endAyah: n });
                  }
                  setPickerTarget(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[es.pickerRowText, sel && es.pickerRowTextSel]}>Ayah {n}</Text>
                {sel && <Feather name="check" size={16} color="#1A1A1A" />}
              </TouchableOpacity>
            );
          })}
        </FullScreenPage>
      </Modal>
    </Modal>
  );
}

const es = StyleSheet.create({
  secHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A9A9A",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 10,
  },
  modeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#F5F3F0",
    gap: 6,
  },
  modeCardActive: {
    backgroundColor: "#1A1A1A",
  },
  modeCardText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A4A4A",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  modeCardTextActive: {
    color: "#FFFFFF",
  },
  segRow: {
    flexDirection: "row",
    gap: 6,
  },
  seg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  segActive: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  modeHint: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8F7F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  modeHintText: {
    fontSize: 13,
    color: "#9A9A9A",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  secSubtitle: {
    fontSize: 12,
    color: "#AAAAAA",
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 8,
  },
  segText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B6B6B",
    fontFamily: "Inter_600SemiBold",
  },
  segTextActive: {
    color: "#FFFFFF",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionIcon: { width: 28 },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
  speedRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", paddingHorizontal: 20 },
  speedChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F0F0F0" },
  speedChipActive: { backgroundColor: "#1A1A1A" },
  speedChipText: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  speedChipTextActive: { color: "#FFFFFF" },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  pickerRowSel: {
    backgroundColor: "#F8F7F5",
  },
  pickerRowText: {
    fontSize: 15,
    color: "#3A3A3A",
    fontFamily: "Inter_400Regular",
  },
  pickerRowTextSel: {
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
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
function TafsirModal({ visible, onClose, entries, selected, currentAyah, loading, onToggleSource, onPlay }: {
  visible: boolean; onClose: () => void;
  entries: TafsirEntry[];
  selected: string[];
  currentAyah: number;
  loading: boolean;
  onToggleSource: (id: string) => void;
  onPlay: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (visible && entries[0]) {
      setExpanded({ [entries[0].key]: true });
    }
  }, [visible, entries]);
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
          <Text style={tm.ayahLabel}>Ayah {currentAyah}</Text>
          <View style={tm.sourceGrid}>
            {TAFSIR_EDITIONS.map((ed) => {
              const active = selected.includes(ed.id);
              return (
                <TouchableOpacity
                  key={ed.id}
                  style={[tm.sourceChip, active && tm.sourceChipActive]}
                  onPress={() => onToggleSource(ed.id)}
                  activeOpacity={0.8}
                >
                  {active && <Feather name="check" size={12} color="#FFFFFF" />}
                  <Text style={[tm.sourceChipText, active && tm.sourceChipTextActive]}>{ed.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {loading && (
            <View style={tm.loadingRow}>
              <ActivityIndicator size="small" color="#1A1A1A" />
              <Text style={tm.loadingText}>Loading tafsir…</Text>
            </View>
          )}
          {TAFSIR_EDITIONS.map((ed) => {
            if (!selected.includes(ed.id)) return null;
            const entry = entries.find((item) => item.key === ed.id);
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
                    {entry?.text ?? "Tafsir not available for this ayah yet."}
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
  ayahLabel: { fontSize: 12, color: "#8A8178", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  sourceChip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    backgroundColor: "#F5F2EE",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sourceChipActive: { backgroundColor: "#1A1A1A" },
  sourceChipText: { fontSize: 12, color: "#4A4A4A", fontFamily: "Inter_600SemiBold" },
  sourceChipTextActive: { color: "#FFFFFF" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sectionName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sectionText: { fontSize: 13, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22, paddingVertical: 12 },
  footer: { alignItems: "center", paddingVertical: 12 },
});

// ─── Playback config (lifted out of EditSheet so it survives sheet close) ────
type PlaybackConfig = {
  mode: "repetition" | "ustadh" | "wordByWord";
  startAyah: number;
  endAyah: number;
  ayahRepeat: number;
  rangeRepeat: number;
  wordRepeat: number;
};

type PlaybackRangeConfig = Pick<PlaybackConfig, "startAyah" | "endAyah">;

const DEFAULT_PLAYBACK_CONFIG: PlaybackConfig = {
  mode: "repetition",
  startAyah: 1,
  endAyah: 1,
  ayahRepeat: 1,
  rangeRepeat: 1,
  wordRepeat: 3,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SurahScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 8 : insets.bottom;
  const { id, ayah: ayahParam, play: playParam } = useLocalSearchParams<{ id: string; ayah?: string; play?: string }>();
  const surahNum = parseInt(id, 10);

  const [arabic, setArabic] = useState<SurahDetail | null>(null);
  const [transliteration, setTransliteration] = useState<SurahDetail | null>(null);
  const [translationsMap, setTranslationsMap] = useState<Record<string, SurahDetail>>({});
  const [tafsirEntriesByVerseKey, setTafsirEntriesByVerseKey] = useState<Record<string, TafsirEntry[]>>({});
  const [tafsirAttemptedByVerseKey, setTafsirAttemptedByVerseKey] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(true);
  const [bottomBarHeight, setBottomBarHeight] = useState(160);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [playbackConfig, setPlaybackConfig] = useState<PlaybackConfig>(DEFAULT_PLAYBACK_CONFIG);
  const playbackConfigRef = useRef<PlaybackConfig>(DEFAULT_PLAYBACK_CONFIG);
  const sessionSelectedRangeRef = useRef<PlaybackRangeConfig | null>(null);
  const planModeRef = useRef<"ayah" | "section" | "word" | "range" | "ustadh" | null>(null);
  const [meaningPanelVisible, setMeaningPanelVisible] = useState(false);
  const [tafsirModalVisible, setTafsirModalVisible] = useState(false);
  const [tafsirLoading, setTafsirLoading] = useState(false);
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
      wordTranslations = await fetchWordTranslations(surahNum, ayah.numberInSurah).catch(() => []);
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
  const [pageWidth, setPageWidth] = useState(0);
  const pageWidthRef = useRef(0);
  const pageDragX = useRef(new Animated.Value(0)).current;
  const pageTransitioningRef = useRef(false);
  const pageTouchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const pageTouchLatestRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const pageSwipeActiveRef = useRef(false);
  const wordTranslationsCache = useRef<Record<string, WordTranslation[]>>({});
  const persistVisibleAyahRef = useRef<(ayahNumber: number) => void>(() => {});
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 55 });
  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: Array<{ item?: ApiAyah; isViewable?: boolean }> }) => {
    const visible = viewableItems
      .filter((item) => item.isViewable && item.item)
      .map((item) => item.item!)
      .sort((a, b) => a.numberInSurah - b.numberInSurah);
    if (visible[0]) persistVisibleAyahRef.current(visible[0].numberInSurah);
  });

  // Horizontal page navigation uses stable refs so touch tracking always sees fresh state.
  const mushafGoNextRef = useRef<() => void>(() => {});
  const mushafGoPrevRef = useRef<() => void>(() => {});
  const canGoNextRef = useRef(false);
  const canGoPrevRef = useRef(false);
  const finishPageSwipeRef = useRef<(direction: "next" | "prev") => void>(() => {});
  const cancelPageSwipeRef = useRef<() => void>(() => {});
  const shouldStartPageSwipe = useCallback((dx: number, dy: number) => {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (pageTransitioningRef.current || pageWidthRef.current <= 0) return false;
    if (absY > PAGE_SWIPE_VERTICAL_REJECTION_PX) return false;
    if (absX < PAGE_SWIPE_ACTIVATION_PX || absX < absY * 2.2) return false;
    return dx > 0 ? canGoNextRef.current : canGoPrevRef.current;
  }, []);

  const handlePageTouchStart = useCallback((event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    const point = { x: pageX, y: pageY, t: Date.now() };
    pageTouchStartRef.current = point;
    pageTouchLatestRef.current = point;
    pageSwipeActiveRef.current = false;
  }, []);

  const handlePageTouchMove = useCallback((event: any) => {
    const start = pageTouchStartRef.current;
    if (!start || pageTransitioningRef.current) return;
    const { pageX, pageY } = event.nativeEvent;
    const latest = { x: pageX, y: pageY, t: Date.now() };
    pageTouchLatestRef.current = latest;
    const dx = latest.x - start.x;
    const dy = latest.y - start.y;

    if (!pageSwipeActiveRef.current) {
      if (!shouldStartPageSwipe(dx, dy)) return;
      pageSwipeActiveRef.current = true;
      pageDragX.stopAnimation();
    }

    menuToggleLockRef.current = Date.now() + 220;
    if (dx > 0 && canGoNextRef.current) {
      pageDragX.setValue(Math.min(dx, pageWidthRef.current));
    } else if (dx < 0 && canGoPrevRef.current) {
      pageDragX.setValue(Math.max(dx, -pageWidthRef.current));
    }
  }, [pageDragX, shouldStartPageSwipe]);

  const handlePageTouchEnd = useCallback(() => {
    const start = pageTouchStartRef.current;
    const latest = pageTouchLatestRef.current;
    const wasSwipeActive = pageSwipeActiveRef.current;
    pageTouchStartRef.current = null;
    pageTouchLatestRef.current = null;
    pageSwipeActiveRef.current = false;
    if (!start || !latest || !wasSwipeActive) return;

    const dx = latest.x - start.x;
    const elapsed = Math.max(1, latest.t - start.t);
    const vx = dx / elapsed;
    const width = pageWidthRef.current;
    const distanceThreshold = Math.max(PAGE_SWIPE_MIN_DISTANCE_PX, width * PAGE_SWIPE_DISTANCE_RATIO);
    if (dx > distanceThreshold || (dx > PAGE_SWIPE_MIN_FLING_PX && vx > PAGE_SWIPE_VELOCITY)) {
      finishPageSwipeRef.current("next");
    } else if (dx < -distanceThreshold || (dx < -PAGE_SWIPE_MIN_FLING_PX && vx < -PAGE_SWIPE_VELOCITY)) {
      finishPageSwipeRef.current("prev");
    } else {
      cancelPageSwipeRef.current();
    }
  }, []);

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
    saveAyah, saveWord, isAyahSaved, savedAyahs,
    surahPositions, saveSurahPosition,
    goal, memorizationGoal, isAyahMemorized, toggleAyahMemorized,
  } = useQuran();

  const { audioState, playAyah, playRange, playSection, playUstadhMode, playWordByWord, pauseAudio, resumeAudio, stopAudio, setPlaybackRate, playNextAyah, playPrevAyah, setOnNextAyah, setOnPlanFinish } = useAudio();
  const { isOffline } = useNetworkStatus();
  persistVisibleAyahRef.current = (ayahNumber) => saveSurahPosition(surahNum, ayahNumber - 1);

  const warnOfflineUnavailable = useCallback(() => {
    Alert.alert(
      "App is offline",
      "This Surah has not been downloaded for offline playback yet. Connect to the internet and choose Download Current Surah first.",
    );
  }, []);

  const hasOfflineAudioForRange = useCallback(async (startAyah: number, endAyah: number) => {
    const reciterId = Number(settings.selectedReciter) || 7;
    const ayahs = Array.from({ length: endAyah - startAyah + 1 }, (_, index) => ({
      surahNumber: surahNum,
      ayahNumber: startAyah + index,
    }));
    const status = await getOfflineStatusForAyahs(ayahs, reciterId);
    return status.status === "ready";
  }, [settings.selectedReciter, surahNum]);

  const canPlayOfflineRange = useCallback(async (startAyah: number, endAyah: number) => {
    if (!isOffline) return true;
    const ready = await hasOfflineAudioForRange(startAyah, endAyah);
    if (!ready) warnOfflineUnavailable();
    return ready;
  }, [hasOfflineAudioForRange, isOffline, warnOfflineUnavailable]);

  const resetSpecialPlaybackMode = useCallback(() => {
    const current = playbackConfigRef.current;
    if (current.mode === "repetition") return;
    const next = { ...current, mode: "repetition" as const };
    playbackConfigRef.current = next;
    setPlaybackConfig(next);
  }, []);

  useEffect(() => {
    const specialModeSelected = playbackConfigRef.current.mode === "ustadh" || playbackConfigRef.current.mode === "wordByWord";
    const specialPlanPlaying = audioState.planMode === "ustadh" || audioState.planMode === "word";
    if (!isOffline || (!specialModeSelected && !specialPlanPlaying)) return;
    stopAudio().catch(() => {});
    resetSpecialPlaybackMode();
  }, [audioState.planMode, isOffline, resetSpecialPlaybackMode, stopAudio]);

  useFocusEffect(
    useCallback(() => () => {
      const specialModeSelected = playbackConfigRef.current.mode === "ustadh" || playbackConfigRef.current.mode === "wordByWord";
      const specialPlanPlaying = planModeRef.current === "ustadh" || planModeRef.current === "word";
      if (specialModeSelected || specialPlanPlaying) {
        stopAudio().catch(() => {});
        resetSpecialPlaybackMode();
      }
    }, [resetSpecialPlaybackMode, stopAudio]),
  );

  // Keep planModeRef current so handleConfigChange never captures stale state
  useEffect(() => { planModeRef.current = audioState.planMode; }, [audioState.planMode]);

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

  useEffect(() => {
    setTajweedMode(false);
    const reset = { ...DEFAULT_PLAYBACK_CONFIG };
    sessionSelectedRangeRef.current = null;
    setPlaybackConfig(reset);
    playbackConfigRef.current = reset;
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

  useEffect(() => {
    if (!arabic || audioState.isPlaying || audioState.isLoading) return;
    if (sessionSelectedRangeRef.current) return;
    const firstAyahOfPage = Math.min((currentPage - 1) * AYAHS_PER_PAGE + 1, arabic.ayahs.length);
    saveSurahPosition(surahNum, firstAyahOfPage - 1);
    setPlaybackConfig(prev => {
      if (prev.startAyah === firstAyahOfPage) return prev;
      const updated = { ...prev, startAyah: firstAyahOfPage };
      playbackConfigRef.current = updated;
      return updated;
    });
  }, [currentPage, arabic, audioState.isPlaying, audioState.isLoading, saveSurahPosition, surahNum]);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const main = await fetchSurahWithTranslations(surahNum, "en.sahih");
      setArabic(main.arabic);
      setTransliteration(main.transliteration);
      setTranslationsMap({ "en.sahih": main.translation });
      setPlaybackConfig(prev => {
        const selectedRange = sessionSelectedRangeRef.current;
        if (selectedRange) {
          const startAyah = Math.min(Math.max(selectedRange.startAyah, 1), main.arabic.ayahs.length);
          const endAyah = Math.min(Math.max(selectedRange.endAyah, startAyah), main.arabic.ayahs.length);
          const updated = { ...prev, startAyah, endAyah };
          playbackConfigRef.current = updated;
          return updated;
        }
        const updated = { ...prev, startAyah: 1, endAyah: main.arabic.ayahs.length };
        playbackConfigRef.current = updated;
        return updated;
      });

      setOnNextAyah((surahN, ayahN) => {
        const cfg = playbackConfigRef.current;
        // In 1x/1x regular play mode, stop advancing past the configured endAyah.
        if (
          surahN === surahNum &&
          cfg.mode === "repetition" &&
          cfg.ayahRepeat === 1 &&
          cfg.rangeRepeat === 1 &&
          ayahN > cfg.endAyah
        ) return;
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

      if (playParam === "1") {
        playAyah(surahNum, visitAyah, main.arabic.ayahs.length, settings.repeatCount);
        recordAyahRead(surahNum, visitAyah);
        saveProgress({
          surahNumber: surahNum,
          ayahNumber: visitAyah,
          ayahNumberInSurah: visitAyah,
          surahName: main.arabic.englishName,
        });
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

  const handleSetRepeat = useCallback(async (ayah: ApiAyah, count: number) => {
    if (!(await canPlayOfflineRange(ayah.numberInSurah, ayah.numberInSurah))) return;
    setAyahRepeatCounts(prev => ({ ...prev, [ayah.numberInSurah]: count }));
    if (!arabic) return;
    playAyah(surahNum, ayah.numberInSurah, arabic.ayahs.length, count);
    recordAyahRead(surahNum, ayah.numberInSurah);
    saveProgress({
      surahNumber: surahNum, ayahNumber: ayah.numberInSurah,
      ayahNumberInSurah: ayah.numberInSurah, surahName: arabic.englishName,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [arabic, canPlayOfflineRange, surahNum, playAyah, recordAyahRead, saveProgress]);

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

  const handlePlayAll = useCallback(async () => {
    if (!arabic) return;
    if (!(await canPlayOfflineRange(1, arabic.ayahs.length))) return;
    playAyah(surahNum, 1, arabic.ayahs.length, 1);
    recordAyahRead(surahNum, 1);
    saveProgress({ surahNumber: surahNum, ayahNumber: 1, ayahNumberInSurah: 1, surahName: arabic.englishName });
  }, [arabic, canPlayOfflineRange, surahNum, playAyah, recordAyahRead, saveProgress]);

  const triggerPlayback = useCallback(async (cfg: PlaybackConfig) => {
    if (!(await canPlayOfflineRange(cfg.startAyah, cfg.endAyah))) return;
    const requestedSpecialMode = cfg.mode === "ustadh" || cfg.mode === "wordByWord";
    const effectiveConfig = isOffline && requestedSpecialMode
      ? { ...cfg, mode: "repetition" as const, ayahRepeat: 1, rangeRepeat: 1 }
      : cfg;
    if (effectiveConfig !== cfg) {
      playbackConfigRef.current = effectiveConfig;
      setPlaybackConfig(effectiveConfig);
    }
    const targetPage = Math.ceil(effectiveConfig.startAyah / AYAHS_PER_PAGE);
    setCurrentPage(targetPage);
    setTimeout(() => {
      try { listRef.current?.scrollToIndex({ index: (effectiveConfig.startAyah - 1) % AYAHS_PER_PAGE, animated: true }); } catch {}
    }, 120);
    if (effectiveConfig.mode === "ustadh") {
      const rangeAyahs = Array.from({ length: effectiveConfig.endAyah - effectiveConfig.startAyah + 1 }, (_, i) => effectiveConfig.startAyah + i);
      playUstadhMode(surahNum, rangeAyahs);
    } else if (effectiveConfig.mode === "wordByWord") {
      playWordByWord(surahNum, effectiveConfig.startAyah, effectiveConfig.endAyah, effectiveConfig.wordRepeat);
    } else if (effectiveConfig.ayahRepeat === 1 && effectiveConfig.rangeRepeat === 1) {
      // 1x/1x = regular sequential play; use simple ayah-by-ayah advance.
      // onNextAyah enforces the endAyah boundary via playbackConfigRef.
      if (arabic) playAyah(surahNum, effectiveConfig.startAyah, arabic.ayahs.length, 1);
    } else {
      playRange({ startSurah: surahNum, startAyah: effectiveConfig.startAyah, endSurah: surahNum, endAyah: effectiveConfig.endAyah }, effectiveConfig.ayahRepeat, effectiveConfig.rangeRepeat);
    }
    recordAyahRead(surahNum, effectiveConfig.startAyah);
    saveProgress({ surahNumber: surahNum, ayahNumber: effectiveConfig.startAyah, ayahNumberInSurah: effectiveConfig.startAyah, surahName: arabic?.englishName ?? "" });
  }, [arabic, canPlayOfflineRange, isOffline, playAyah, playRange, playUstadhMode, playWordByWord, recordAyahRead, saveProgress, surahNum]);

  // After a plan finishes (planMode=null), restart from the configured Edit
  // Sheet range instead of replaying the last completed ayah.
  const handlePlayOrResume = useCallback(async () => {
    if (audioState.planMode !== null) {
      if (
        audioState.currentAyah &&
        !(await canPlayOfflineRange(audioState.currentAyah, audioState.currentAyah))
      ) return;
      resumeAudio();
    } else if (sessionSelectedRangeRef.current) {
      await triggerPlayback(playbackConfigRef.current);
    } else if (audioState.currentAyah && audioState.currentSurah === surahNum && arabic) {
      if (!(await canPlayOfflineRange(audioState.currentAyah, audioState.currentAyah))) return;
      playAyah(surahNum, audioState.currentAyah, arabic.ayahs.length, 1);
    } else {
      resumeAudio();
    }
  }, [audioState.planMode, audioState.currentAyah, audioState.currentSurah, surahNum, arabic, canPlayOfflineRange, resumeAudio, triggerPlayback, playAyah]);

  const handleConfigChange = useCallback((newConfig: PlaybackConfig) => {
    const previousConfig = playbackConfigRef.current;
    if (newConfig.startAyah !== previousConfig.startAyah || newConfig.endAyah !== previousConfig.endAyah) {
      sessionSelectedRangeRef.current = {
        startAyah: newConfig.startAyah,
        endAyah: newConfig.endAyah,
      };
    }
    playbackConfigRef.current = newConfig;
    setPlaybackConfig(newConfig);
  }, [surahNum]);

  const handleTafsirPress = useCallback(() => {
    if (!settings.showTafsir) updateSettings({ showTafsir: true });
    setTafsirModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [settings.showTafsir, updateSettings]);

  const handleTafsirSourceToggle = useCallback((id: string) => {
    const key = normalizeTafsirKeys([id])[0];
    if (!key) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = settings.selectedTafsirs.includes(key)
      ? settings.selectedTafsirs.filter((item) => item !== key)
      : [...settings.selectedTafsirs, key];
    updateSettings({ selectedTafsirs: next.length > 0 ? next : [key] });
  }, [settings.selectedTafsirs, updateSettings]);

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
  const getAyahsForPage = useCallback((page: number) => {
    if (!arabic) return [];
    const start = (page - 1) * AYAHS_PER_PAGE;
    return arabic.ayahs.slice(start, start + AYAHS_PER_PAGE);
  }, [arabic]);
  const pageAyahs = useMemo(() => {
    return getAyahsForPage(currentPage);
  }, [currentPage, getAyahsForPage]);
  const previousPageAyahs = useMemo(() => {
    return currentPage > 1 ? getAyahsForPage(currentPage - 1) : [];
  }, [currentPage, getAyahsForPage]);
  const nextPageAyahs = useMemo(() => {
    return currentPage < totalPages ? getAyahsForPage(currentPage + 1) : [];
  }, [currentPage, getAyahsForPage, totalPages]);
  const currentAyahForRange = audioState.currentSurah === surahNum && audioState.currentAyah ? audioState.currentAyah : parseInt(ayahParam ?? "1", 10) || 1;

  const currentTafsirVerseKey = useMemo(() => {
    const ayah = arabic?.ayahs[currentAyahForRange - 1];
    return ayah?.verseKey ?? `${surahNum}:${currentAyahForRange}`;
  }, [arabic, currentAyahForRange, surahNum]);

  // Tafsir is lazy-loaded only when the modal is open, outside the Quran/audio fetch path.
  useEffect(() => {
    if (!tafsirModalVisible || !arabic) return;
    let cancelled = false;
    const selected = normalizeTafsirKeys(settings.selectedTafsirs);
    const existing = tafsirEntriesByVerseKey[currentTafsirVerseKey] ?? [];
    const attempted = tafsirAttemptedByVerseKey[currentTafsirVerseKey] ?? [];
    const missing = selected.filter((key) => !existing.some((entry) => entry.key === key) && !attempted.includes(key));
    if (missing.length === 0) return;
    setTafsirLoading(true);
    fetchTafsirPage(missing, [currentTafsirVerseKey])
      .then((result) => {
        if (cancelled) return;
        setTafsirEntriesByVerseKey((prev) => ({ ...prev, ...result.entriesByVerseKey }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setTafsirAttemptedByVerseKey((prev) => ({
            ...prev,
            [currentTafsirVerseKey]: Array.from(new Set([...(prev[currentTafsirVerseKey] ?? []), ...missing])),
          }));
          setTafsirLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tafsirModalVisible, settings.selectedTafsirs, arabic, currentTafsirVerseKey, tafsirEntriesByVerseKey, tafsirAttemptedByVerseKey]);

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

  // Keep swipe refs up-to-date every render so touch tracking always has fresh callbacks.
  mushafGoNextRef.current = goToNextSurah;
  mushafGoPrevRef.current = goToPrevSurah;
  canGoNextRef.current = currentPage < totalPages || surahNum < 114;
  canGoPrevRef.current = currentPage > 1 || surahNum > 1;
  finishPageSwipeRef.current = (direction) => {
    if (pageTransitioningRef.current) return;
    const width = pageWidthRef.current;
    if (width <= 0) return;
    pageTransitioningRef.current = true;
    Animated.timing(pageDragX, {
      toValue: direction === "next" ? width : -width,
      duration: 190,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        if (direction === "next") mushafGoNextRef.current();
        else mushafGoPrevRef.current();
      }
      pageDragX.setValue(0);
      pageTransitioningRef.current = false;
    });
  };
  cancelPageSwipeRef.current = () => {
    Animated.spring(pageDragX, {
      toValue: 0,
      tension: 190,
      friction: 24,
      useNativeDriver: true,
    }).start();
  };

  const topPad = insets.top;
  const basmala = surahNum !== 1 && surahNum !== 9;
  const memorizationGoalAyahKeys = useMemo(() => {
    if (!goal?.startSurahNumber || !goal.startAyahNumber) return null;
    if (goal.weeklyTargetAyahKeys?.length) return new Set(goal.weeklyTargetAyahKeys);
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

  const currentDownloadSurahNumber = audioState.currentSurah ?? surahNum;
  const currentDownloadSurah = SURAH_DATA[currentDownloadSurahNumber - 1];
  const currentDownloadAyahs = useMemo<GoalAyahLike[]>(() => {
    const ayahCount = currentDownloadSurah?.ayahCount ?? arabic?.ayahs.length ?? 0;
    return Array.from({ length: ayahCount }, (_, index) => ({
      surahNumber: currentDownloadSurahNumber,
      ayahNumber: index + 1,
    }));
  }, [arabic?.ayahs.length, currentDownloadSurah?.ayahCount, currentDownloadSurahNumber]);

  // extraData ensures FlatList cells re-render when audio state changes.
  // Without this, cells use a stale renderItem closure because pageAyahs is
  // a stable memoized reference that never changes during audio playback.
  const flatListExtraData = useMemo(() => ({
    currentAyah: audioState.currentAyah,
    currentSurah: audioState.currentSurah,
    repeatCount: audioState.repeatCount,
    range: audioState.range,
    ayahRepeatCounts,
    savedAyahs,
  }), [audioState.currentAyah, audioState.currentSurah, audioState.repeatCount, audioState.range, ayahRepeatCounts, savedAyahs]);

  const refreshOfflineStatus = useCallback(async () => {
    if (currentDownloadAyahs.length === 0) return;
    const status = await getOfflineStatusForAyahs(currentDownloadAyahs, Number(settings.selectedReciter) || 7);
    setOfflineStatus({ status: status.status, ready: status.ready, total: status.total });
  }, [currentDownloadAyahs, settings.selectedReciter]);

  const downloadCurrentSurah = useCallback(async () => {
    const surah = SURAH_DATA[currentDownloadSurahNumber - 1];
    if (!surah || offlineDownloadRef.current) return;
    offlineDownloadRef.current = true;
    setOfflineStatus({ status: "downloading", ready: 0, total: surah.ayahCount });
    try {
      const [result] = await Promise.all([
        ensureSurahOffline({
          surahNumber: currentDownloadSurahNumber,
          ayahCount: surah.ayahCount,
          reciterId: Number(settings.selectedReciter) || 7,
          onProgress: (progress) => setOfflineStatus({
            status: "downloading",
            ready: progress.completed,
            total: progress.total,
            progress,
          }),
        }),
        cacheSurahContentForOffline(currentDownloadSurahNumber),
      ]);
      setOfflineStatus({
        status: result.failed > 0 ? "failed" : "ready",
        ready: result.completed,
        total: result.total,
        progress: result,
      });
    } finally {
      offlineDownloadRef.current = false;
    }
  }, [currentDownloadSurahNumber, settings.selectedReciter]);

  useEffect(() => {
    migrateToSingleSurahOfflineCache().then(() => refreshOfflineStatus()).catch(() => {});
  }, [refreshOfflineStatus]);

  useEffect(() => {
    const activeSurah = audioState.currentSurah;
    if (!activeSurah) return;
    deleteOfflineAudioExceptSurah(activeSurah, Number(settings.selectedReciter) || 7)
      .then(refreshOfflineStatus)
      .catch(() => {});
  }, [audioState.currentSurah, refreshOfflineStatus, settings.selectedReciter]);

  useEffect(() => {
    refreshOfflineStatus().catch(() => {});
  }, [refreshOfflineStatus]);

  const offlineStatusLabel = offlineStatus.status === "downloading"
    ? `downloading ${offlineStatus.ready}/${offlineStatus.total || currentDownloadAyahs.length} ayahs from ${currentDownloadSurah?.englishName ?? "current Surah"}`
    : offlineStatus.status === "ready"
      ? `${currentDownloadSurah?.englishName ?? "Current Surah"} ready offline (${offlineStatus.ready}/${offlineStatus.total})`
      : offlineStatus.status === "failed"
        ? `some audio is missing (${offlineStatus.ready}/${offlineStatus.total}); tap to retry current Surah`
        : `download ${currentDownloadSurah?.englishName ?? "the current Surah"} for offline playback`;

  const handlePageSlideLayout = (width: number) => {
    if (width <= 0) return;
    pageWidthRef.current = width;
    if (Math.abs(width - pageWidth) > 1) setPageWidth(width);
  };

  const renderPageHeader = (ayahs: ApiAyah[]) => {
    const juzNum = ayahs[0]?.juz ?? 1;
    return (
      <View style={scr.pageHeader}>
        <Text style={scr.pageHeaderLeft}>{`Juz' ${juzNum}`}</Text>
        <Text style={scr.pageHeaderRight} numberOfLines={1}>
          {arabic?.englishName ?? ""}{"  "}{arabic?.name ?? ""}
        </Text>
      </View>
    );
  };

  const renderAyahPage = (ayahs: ApiAyah[], active: boolean) => (
    <FlatList
      ref={active ? listRef : undefined}
      data={ayahs}
      extraData={flatListExtraData}
      viewabilityConfig={active ? viewabilityConfigRef.current : undefined}
      onViewableItemsChanged={active ? onViewableItemsChangedRef.current : undefined}
      keyExtractor={(item) => String(item.numberInSurah)}
      showsVerticalScrollIndicator={active}
      scrollEnabled={active}
      contentContainerStyle={{
        paddingTop: menuVisible ? 4 : (insets.top + 12),
        paddingBottom: menuVisible ? (bottomBarHeight + 8) : 24,
      }}
      style={{ flex: 1, backgroundColor: "#FAF9F7" }}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#EDEAE5" }} />}
      onScrollBeginDrag={active ? (e) => {
        userScrollingRef.current = true;
        menuToggleLockRef.current = Date.now() + 600;
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      } : undefined}
      onScrollEndDrag={active ? () => {
        setTimeout(() => { userScrollingRef.current = false; }, 250);
      } : undefined}
      onMomentumScrollEnd={active ? () => {
        userScrollingRef.current = false;
      } : undefined}
      onScroll={active ? (e) => {
        const y = e.nativeEvent.contentOffset.y;
        if (menuVisible && userScrollingRef.current && Math.abs(y - scrollYRef.current) > 40) {
          setMenuVisible(false);
        }
      } : undefined}
      scrollEventThrottle={32}
      ListHeaderComponent={renderPageHeader(ayahs)}
      ListFooterComponent={<View style={{ height: menuVisible ? 12 : 0 }} />}
      renderItem={({ item }) => {
        const isCurrentAyah = audioState.currentSurah === surahNum && audioState.currentAyah === item.numberInSurah;
        const isPlaying = isCurrentAyah && (audioState.isPlaying || audioState.isLoading);
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
            isSaved={isAyahSaved(surahNum, item.numberInSurah)}
            isRangeSelected={isRangeSelected && !isPlaying}
            showMemorizedToggle={isInMemorizationGoal}
            isMemorized={isAyahMemorized(surahNum, item.numberInSurah)}
            translations={selectedTranslations.length > 0 ? translations : []}
            transliterationText={transliteration?.ayahs[item.numberInSurah - 1]?.text ?? null}
            showTransliteration={settings.showTransliteration}
            colorCoding={settings.colorCoding}
            tajweedMode={tajweedMode}
            showBasmala={showB}
            arabicFontSize={accountSettings.fontSize ?? 28}
            romanFontSize={accountSettings.romanFontSize ?? 14}
            arabicFontFamily={getArabicFontFamily(accountSettings.arabicFont)}
            onSave={handleSaveAyah}
            onCancelRepeat={handleCancelRepeat}
            onCancelUstadh={() => {
              stopAudio().catch(() => {});
              resetSpecialPlaybackMode();
            }}
            onToggleMemorized={(ayah) => toggleAyahMemorized(surahNum, ayah.numberInSurah)}
            onPress={() => {
              if (isOffline) {
                getCachedAyahAudioUri(getVerseKey(surahNum, item.numberInSurah), Number(settings.selectedReciter) || 7)
                  .then((uri) => {
                    if (!uri) warnOfflineUnavailable();
                    else safeToggleMenu();
                  })
                  .catch(warnOfflineUnavailable);
                return;
              }
              safeToggleMenu();
            }}
            onWordLongPress={handleWordLongPress}
          />
        );
      }}
    />
  );

  const renderMushafPage = (ayahs: ApiAyah[], page: number, active: boolean) => (
    <ScrollView
      ref={active ? mushafScrollRef : undefined}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: menuVisible ? 0 : (insets.top + 12), paddingBottom: 24 }}
      showsVerticalScrollIndicator={active}
      scrollEnabled={active}
      onTouchEnd={active ? safeToggleMenu : undefined}
      onScrollBeginDrag={active ? (e) => {
        userScrollingRef.current = true;
        menuToggleLockRef.current = Date.now() + 600;
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      } : undefined}
      onScrollEndDrag={active ? () => {
        setTimeout(() => { userScrollingRef.current = false; }, 250);
      } : undefined}
      onMomentumScrollEnd={active ? () => {
        userScrollingRef.current = false;
      } : undefined}
      onScroll={active ? (e) => {
        const y = e.nativeEvent.contentOffset.y;
        if (menuVisible && userScrollingRef.current && Math.abs(y - scrollYRef.current) > 40) {
          setMenuVisible(false);
        }
      } : undefined}
      scrollEventThrottle={32}
    >
      <MushafPageView
        ayahs={ayahs}
        surahArabicName={arabic?.name ?? ""}
        surahEnglishName={arabic?.englishName ?? ""}
        isFirstPage={page === 1}
        showBasmala={basmala}
        activeAyah={active && audioState.currentSurah === surahNum ? audioState.currentAyah : null}
        tajweedMode={tajweedMode}
      />
    </ScrollView>
  );

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
          <SegmentedToggle
            options={READER_MODE_OPTIONS}
            value={settings.mushafMode ? "mushaf" : "verses"}
            onChange={(mode) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (mode === "verses") {
                updateSettings({ mushafMode: false });
              } else {
                updateSettings({ mushafMode: true, showTranslation: false });
                setSelectedTranslations([]);
                setTajweedMode(false);
              }
            }}
            style={scr.modeSwitcher}
          />
        </View>
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
        <View style={{ flex: 1 }}>
          <View
            style={[
              scr.pageSlideViewport,
              settings.showTranslation ? { flex: 0.55, backgroundColor: MUSHAF_BG } : { flex: 1, backgroundColor: MUSHAF_BG },
            ]}
            onLayout={(e) => handlePageSlideLayout(e.nativeEvent.layout.width)}
            onTouchStart={handlePageTouchStart}
            onTouchMove={handlePageTouchMove}
            onTouchEnd={handlePageTouchEnd}
            onTouchCancel={handlePageTouchEnd}
          >
            {pageWidth > 0 && nextPageAyahs.length > 0 && (
              <Animated.View pointerEvents="none" style={[scr.pageSlidePage, { left: -pageWidth, transform: [{ translateX: pageDragX }] }]}>
                {renderMushafPage(nextPageAyahs, currentPage + 1, false)}
              </Animated.View>
            )}
            {pageWidth > 0 && previousPageAyahs.length > 0 && (
              <Animated.View pointerEvents="none" style={[scr.pageSlidePage, { left: pageWidth, transform: [{ translateX: pageDragX }] }]}>
                {renderMushafPage(previousPageAyahs, currentPage - 1, false)}
              </Animated.View>
            )}
            <Animated.View style={[scr.pageSlidePage, { left: 0, transform: [{ translateX: pageDragX }] }]}>
              {renderMushafPage(pageAyahs, currentPage, true)}
            </Animated.View>
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
          <View
            style={scr.pageSlideViewport}
            onLayout={(e) => handlePageSlideLayout(e.nativeEvent.layout.width)}
            onTouchStart={handlePageTouchStart}
            onTouchMove={handlePageTouchMove}
            onTouchEnd={handlePageTouchEnd}
            onTouchCancel={handlePageTouchEnd}
          >
            {pageWidth > 0 && nextPageAyahs.length > 0 && (
              <Animated.View pointerEvents="none" style={[scr.pageSlidePage, { left: -pageWidth, transform: [{ translateX: pageDragX }] }]}>
                {renderAyahPage(nextPageAyahs, false)}
              </Animated.View>
            )}
            {pageWidth > 0 && previousPageAyahs.length > 0 && (
              <Animated.View pointerEvents="none" style={[scr.pageSlidePage, { left: pageWidth, transform: [{ translateX: pageDragX }] }]}>
                {renderAyahPage(previousPageAyahs, false)}
              </Animated.View>
            )}
            <Animated.View style={[scr.pageSlidePage, { left: 0, transform: [{ translateX: pageDragX }] }]}>
              {renderAyahPage(pageAyahs, true)}
            </Animated.View>
          </View>
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
            firstPageAyah={pageAyahs[0]?.numberInSurah ?? 1}
            onPlayFromStart={() => {
              if (!arabic) return;
              triggerPlayback(playbackConfigRef.current);
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
        surahName={arabic?.englishName ?? ""}
        totalAyahs={arabic?.ayahs.length ?? 1}
        config={playbackConfig}
        onConfigChange={handleConfigChange}
        onPlay={() => triggerPlayback(playbackConfigRef.current)}
        onDownloadCurrentSurah={() => {
          downloadCurrentSurah().catch(() => {
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
        onConfirm={async (startWordIdx, endWordIdx, totalWords, repeatCount) => {
          const ayahN = repeatSectionInitialAyah ?? currentAyahForRange;
          if (!(await canPlayOfflineRange(ayahN, ayahN))) return;
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
        entries={tafsirEntriesByVerseKey[currentTafsirVerseKey] ?? []}
        selected={settings.selectedTafsirs}
        currentAyah={currentAyahForRange}
        loading={tafsirLoading}
        onToggleSource={handleTafsirSourceToggle}
        onPlay={() => { setTafsirModalVisible(false); handlePlayAll(); }}
      />

      <PlayRangeSheet
        visible={rangeVisible}
        onClose={() => setRangeVisible(false)}
        surahNumber={surahNum}
        surahName={arabic?.englishName ?? ""}
        ayahs={arabic?.ayahs ?? []}
        currentAyah={currentAyahForRange}
        onConfirm={async (startA, endA, repeatCount) => {
          if (!(await canPlayOfflineRange(startA, endA))) return;
          handleConfigChange({
            ...playbackConfigRef.current,
            startAyah: startA,
            endAyah: endA,
          });
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FAF9F7",
    borderBottomWidth: 1,
    borderBottomColor: "#EDEAE5",
  },
  modeSwitcher: {
    alignSelf: "stretch",
  },
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
  pageSlideViewport: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FAF9F7",
  },
  pageSlidePage: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E0D0",
  },
  pageHeaderLeft: {
    fontSize: 12,
    color: "#1C1810",
    fontFamily: "Inter_400Regular",
    opacity: 0.55,
  },
  pageHeaderRight: {
    fontSize: 12,
    color: "#1C1810",
    fontFamily: "Inter_400Regular",
    opacity: 0.55,
    flexShrink: 1,
    marginLeft: 8,
  },
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
