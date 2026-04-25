import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio } from "@/contexts/AudioContext";
import { AyahItem } from "@/components/AyahItem";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { SettingsSheet, TAFSIR_EDITIONS } from "@/components/SettingsSheet";
import { ReaderFloatingBar } from "@/components/ReaderFloatingBar";
import { WordModal } from "@/components/WordModal";
import { RangeSelectorModal } from "@/components/RangeSelectorModal";
import { fetchSurahWithTranslations, fetchTafsir, type SurahDetail, type ApiAyah } from "@/services/quranApi";
import { type TafsirEntry } from "@/components/AyahItem";
import { SURAH_DATA } from "@/constants/surahData";

const SCREEN_WIDTH = Dimensions.get("window").width;
const AYAHS_PER_PAGE = 10;
const MUSHAF_BG = "#F5EDD6";

function MushafPage({
  ayahs,
  surahName,
  colors,
}: {
  ayahs: ApiAyah[];
  surahName: string;
  colors: ReturnType<typeof useColors>;
}) {
  const s = mushafStyles(colors);
  return (
    <View style={s.page}>
      <View style={s.pageInner}>
        <Text style={s.mushafText} textBreakStrategy="highQuality">
          {ayahs.map((ayah) => (
            <Text key={ayah.numberInSurah}>
              <Text style={s.mushafAyahText}>{ayah.text}</Text>
              <Text style={s.ayahMarker}> ۝{ayah.numberInSurah} </Text>
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

const mushafStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    page: {
      margin: 16,
      backgroundColor: MUSHAF_BG,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#D4B896",
      shadowColor: "#8B6914",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
      minHeight: 420,
    },
    pageInner: {
      padding: 24,
      paddingVertical: 32,
      borderWidth: 2,
      borderColor: "#C9A96E" + "60",
      borderRadius: 8,
      margin: 10,
    },
    mushafText: {
      fontSize: 24,
      lineHeight: 52,
      textAlign: "justify",
      color: "#2C1810",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
    },
    mushafAyahText: {
      fontSize: 24,
      lineHeight: 52,
      color: "#2C1810",
    },
    ayahMarker: {
      fontSize: 18,
      color: "#8B6914",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
  });

function PracticeModal({
  visible,
  surahNumber,
  onClose,
  colors,
}: {
  visible: boolean;
  surahNumber: number;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { highlightedWords, savedWords } = useQuran();
  const s = practiceStyles(colors);

  const surahHighlightedWords = useMemo(() => {
    return highlightedWords.filter(w => w.surahNumber === surahNumber);
  }, [highlightedWords, surahNumber]);

  const practiceList = useMemo(() => {
    return surahHighlightedWords.map(hw => {
      const saved = savedWords.find(sw => sw.arabic === hw.arabic && sw.surahNumber === hw.surahNumber);
      return { arabic: hw.arabic, translation: saved?.translation ?? "", ayahNumber: hw.ayahNumber };
    });
  }, [surahHighlightedWords, savedWords]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const current = practiceList[currentIdx];

  const handleNext = () => {
    if (currentIdx + 1 >= practiceList.length) setDone(true);
    else { setCurrentIdx(c => c + 1); setRevealed(false); }
  };

  const handleRestart = () => { setCurrentIdx(0); setRevealed(false); setDone(false); };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: Platform.OS === "web" ? 67 : 44 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={s.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Practice Mode</Text>
          <View style={{ width: 38 }} />
        </View>

        {practiceList.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="star-outline" size={48} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No highlighted words</Text>
            <Text style={s.emptySub}>Long-press any Arabic word and tap "Highlight" to add it to your practice session</Text>
            <TouchableOpacity style={s.closeEmptyBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.closeEmptyBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        ) : done ? (
          <View style={s.doneState}>
            <View style={s.doneIcon}>
              <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
            </View>
            <Text style={s.doneTitle}>Session Complete!</Text>
            <Text style={s.doneSub}>You reviewed {practiceList.length} highlighted words</Text>
            <TouchableOpacity style={s.restartBtn} onPress={handleRestart} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
              <Text style={s.restartBtnText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneDismissBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.doneDismissBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.practiceContent} showsVerticalScrollIndicator={false}>
            <Text style={s.counter}>{currentIdx + 1} of {practiceList.length}</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressBar, { width: `${((currentIdx + 1) / practiceList.length) * 100}%` as any }]} />
            </View>
            <View style={s.flashcard}>
              <Text style={s.flashcardLocation}>Surah {surahNumber} • Ayah {current.ayahNumber}</Text>
              <Text style={s.flashcardArabic}>{current.arabic}</Text>
              {!revealed ? (
                <TouchableOpacity style={s.revealBtn} onPress={() => setRevealed(true)} activeOpacity={0.85}>
                  <Feather name="eye" size={16} color={colors.primaryForeground} />
                  <Text style={s.revealBtnText}>Reveal Meaning</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.meaningContainer}>
                  {current.translation
                    ? <Text style={s.flashcardMeaning}>{current.translation}</Text>
                    : <Text style={s.flashcardMeaningHint}>No translation saved for this word</Text>}
                  <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={s.nextBtnText}>{currentIdx + 1 >= practiceList.length ? "Finish" : "Next Word"}</Text>
                    <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const practiceStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12,
      backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    closeBtn: { padding: 8, width: 38 },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    emptySub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    closeEmptyBtn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    closeEmptyBtnText: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    doneState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
    doneIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    doneTitle: { fontSize: 24, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    doneSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    restartBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    restartBtnText: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    doneDismissBtn: { paddingVertical: 12 },
    doneDismissBtnText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    practiceContent: { padding: 20, gap: 20, paddingBottom: 60 },
    counter: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    progressTrack: { height: 4, backgroundColor: colors.muted, borderRadius: 2, overflow: "hidden" },
    progressBar: { height: "100%", backgroundColor: colors.primary, borderRadius: 2 },
    flashcard: {
      backgroundColor: colors.card, borderRadius: 20, padding: 32, alignItems: "center",
      borderWidth: 1, borderColor: colors.border, gap: 16, minHeight: 280, justifyContent: "center",
    },
    flashcardLocation: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    flashcardArabic: { fontSize: 44, color: colors.foreground, fontFamily: "System", textAlign: "center", lineHeight: 64 },
    revealBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    revealBtnText: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    meaningContainer: { alignItems: "center", gap: 16, width: "100%" },
    flashcardMeaning: { fontSize: 22, color: colors.primary, fontFamily: "Inter_600SemiBold", textAlign: "center", fontWeight: "600" },
    flashcardMeaningHint: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", fontStyle: "italic" },
    nextBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, width: "100%", justifyContent: "center" },
    nextBtnText: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
  });

const SWIPE_THRESHOLD = 65;
const REPEAT_OPTIONS = [1, 3, 5, 10];
const WORD_COLORS = ["#E8507A", "#F2994A", "#27AE60", "#2F80ED", "#9B51E0", "#EB5757"];

interface CardSwipeStackProps {
  ayahs: ApiAyah[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onSave: (ayah: ApiAyah) => void;
  onRepeatSelect: (ayahNum: number, count: number) => void;
  translation: SurahDetail | null;
  transliteration: SurahDetail | null;
  tafsirDataMap: Record<string, SurahDetail>;
  settings: ReturnType<typeof useQuran>["settings"];
  surahNum: number;
  arabicName: string;
  playAyah: (surahNum: number, ayahNum: number, totalAyahs: number, repeat: number) => void;
  repeatCount: number;
}

function CardSwipeStack({
  ayahs, currentIndex, onIndexChange, onSave, onRepeatSelect,
  translation, transliteration, tafsirDataMap, settings, surahNum, arabicName,
  playAyah, repeatCount,
}: CardSwipeStackProps) {
  const colors = useColors();
  const pan = useRef(new Animated.ValueXY()).current;
  const [showRepeat, setShowRepeat] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const cardRotate = pan.x.interpolate({ inputRange: [-160, 0, 160], outputRange: ["-5deg", "0deg", "5deg"], extrapolate: "clamp" });
  const rightOpacity = pan.x.interpolate({ inputRange: [10, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const leftOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -10], outputRange: [1, 0], extrapolate: "clamp" });

  const animateSave = () => {
    setSavedFlash(true);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setSavedFlash(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !showRepeat && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, { dx }) => {
        const adx = Math.abs(dx);
        if (adx > SWIPE_THRESHOLD) {
          if (dx < 0) {
            Animated.timing(pan, { toValue: { x: -SCREEN_WIDTH * 1.6, y: 0 }, duration: 280, useNativeDriver: true }).start(() => {
              pan.setValue({ x: 0, y: 0 });
              const ayah = (ayahs as ApiAyah[])[currentIndex];
              if (ayah) { onSave(ayah); animateSave(); }
            });
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            setShowRepeat(true);
          }
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const currentAyah = ayahs[currentIndex] as ApiAyah | undefined;
  const nextAyah = currentIndex + 1 < ayahs.length ? ayahs[currentIndex + 1] : null;
  const nextNextAyah = currentIndex + 2 < ayahs.length ? ayahs[currentIndex + 2] : null;

  if (!currentAyah) return null;

  const showBasmala = currentAyah.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9;
  const translationAyah = translation?.ayahs[currentAyah.numberInSurah - 1];
  const transliterationAyah = transliteration?.ayahs[currentAyah.numberInSurah - 1];
  const tafsirs: TafsirEntry[] = [];
  if (settings.showTafsir) {
    for (const ed of (settings.selectedTafsirs ?? ["en.maarifulquran"])) {
      const td = tafsirDataMap[ed];
      if (td) {
        const ta = td.ayahs[currentAyah.numberInSurah - 1];
        const edObj = TAFSIR_EDITIONS.find(e => e.id === ed);
        if (ta && edObj) tafsirs.push({ edition: ed, name: edObj.name, ayah: ta });
      }
    }
  }

  const flashBg = flashAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(34,197,94,0)", "rgba(34,197,94,0.22)"] });

  const cs = cardSwipeStyles;

  return (
    <View style={cs.container}>
      {nextNextAyah && (
        <View style={[cs.peekCard, cs.peekCard2]}>
          <View style={cs.peekInner} />
        </View>
      )}
      {nextAyah && (
        <Animated.View style={[cs.peekCard, cs.peekCard1, { opacity: 0.62 }]}>
          <View style={cs.peekInner} />
        </Animated.View>
      )}

      <Animated.View
        style={[cs.mainCard, {
          transform: [{ translateX: pan.x }, { rotate: cardRotate }],
        }]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 24, backgroundColor: flashBg }]} pointerEvents="none" />

        <Animated.View style={[cs.hintOverlay, cs.hintRight, { opacity: rightOpacity }]} pointerEvents="none">
          <Ionicons name="bookmark" size={28} color="#FFFFFF" />
          <Text style={cs.hintText}>SAVE</Text>
        </Animated.View>
        <Animated.View style={[cs.hintOverlay, cs.hintLeft, { opacity: leftOpacity }]} pointerEvents="none">
          <Ionicons name="repeat" size={28} color="#FFFFFF" />
          <Text style={cs.hintText}>REPEAT</Text>
        </Animated.View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={cs.cardContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={cs.cardHeader}>
            <View style={cs.cardBadge}>
              <Text style={cs.cardBadgeNum}>{surahNum}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cs.cardSurahName}>{arabicName}</Text>
              <Text style={cs.cardAyahLabel}>Ayah {currentAyah.numberInSurah}</Text>
            </View>
            <Text style={cs.cardCounter}>{currentAyah.numberInSurah}/{ayahs.length}</Text>
          </View>

          {showBasmala && (
            <Text style={cs.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}

          {settings.colorCoding ? (
            <Text style={cs.arabicText}>
              {currentAyah.text.split(" ").map((word, i, arr) => (
                <Text key={i} style={{ color: WORD_COLORS[i % WORD_COLORS.length] }}>
                  {word}{i < arr.length - 1 ? " " : ""}
                </Text>
              ))}
            </Text>
          ) : (
            <Text style={cs.arabicText}>{currentAyah.text}</Text>
          )}

          {settings.showTransliteration && transliterationAyah && (
            <Text style={cs.transliteration}>{transliterationAyah.text}</Text>
          )}
          {settings.showTranslation && translationAyah && (
            <View style={cs.translationBox}>
              <Text style={cs.translation}>{translationAyah.text}</Text>
            </View>
          )}
          {tafsirs.map(t => (
            <View key={t.edition} style={cs.tafsirBox}>
              <Text style={cs.tafsirName}>{t.name}</Text>
              <Text style={cs.tafsirText}>{t.ayah.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={cs.cardFooter}>
          <View style={cs.swipeHints}>
            <View style={cs.swipeHintItem}>
              <View style={[cs.swipeDirIcon, { backgroundColor: "#DCFCE7" }]}>
                <Text style={cs.swipeDirArrow}>←</Text>
              </View>
              <Text style={cs.swipeDirLabel}>Save</Text>
            </View>
            <View style={cs.swipeHintItem}>
              <View style={[cs.swipeDirIcon, { backgroundColor: "#FEF3C7" }]}>
                <Text style={cs.swipeDirArrow}>→</Text>
              </View>
              <Text style={cs.swipeDirLabel}>Repeat</Text>
            </View>
          </View>

          <View style={cs.navRow}>
            <TouchableOpacity
              style={[cs.navBtn, currentIndex === 0 && cs.navBtnDisabled]}
              disabled={currentIndex === 0}
              onPress={() => onIndexChange(currentIndex - 1)}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={20} color={currentIndex === 0 ? "#C0C0C0" : "#1A1A1A"} />
            </TouchableOpacity>
            <View style={cs.navDots}>
              {Array.from({ length: Math.min(ayahs.length, 5) }).map((_, i) => {
                const spread = Math.floor((currentIndex / Math.max(ayahs.length - 1, 1)) * 4);
                return <View key={i} style={[cs.navDot, i === spread && cs.navDotActive]} />;
              })}
            </View>
            <TouchableOpacity
              style={[cs.navBtn, currentIndex === ayahs.length - 1 && cs.navBtnDisabled]}
              disabled={currentIndex === ayahs.length - 1}
              onPress={() => onIndexChange(currentIndex + 1)}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={20} color={currentIndex === ayahs.length - 1 ? "#C0C0C0" : "#1A1A1A"} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Modal visible={showRepeat} transparent animationType="slide" onRequestClose={() => setShowRepeat(false)}>
        <TouchableWithoutFeedback onPress={() => setShowRepeat(false)}>
          <View style={cs.repeatBackdrop} />
        </TouchableWithoutFeedback>
        <View style={cs.repeatSheet}>
          <Text style={cs.repeatTitle}>Repeat Ayah</Text>
          <Text style={cs.repeatSub}>How many times?</Text>
          <View style={cs.repeatGrid}>
            {REPEAT_OPTIONS.map(count => (
              <TouchableOpacity
                key={count}
                style={cs.repeatOption}
                onPress={() => {
                  setShowRepeat(false);
                  onRepeatSelect(currentAyah.numberInSurah, count);
                  playAyah(surahNum, currentAyah.numberInSurah, ayahs.length, count);
                }}
                activeOpacity={0.8}
              >
                <Text style={cs.repeatOptionNum}>{count}×</Text>
                <Text style={cs.repeatOptionLabel}>{count === 1 ? "once" : count === 3 ? "3 times" : count === 5 ? "5 times" : "10 times"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={cs.repeatCancel} onPress={() => setShowRepeat(false)} activeOpacity={0.8}>
            <Text style={cs.repeatCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const cardSwipeStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 190,
    backgroundColor: "#EEEEF0",
    overflow: "visible",
  },
  peekCard: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    bottom: 190,
    borderRadius: 24,
    backgroundColor: "#FAFAFA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  peekCard1: {
    zIndex: 2,
    transform: [{ scaleX: 0.96 }, { translateY: 16 }],
    opacity: 0.75,
  },
  peekCard2: {
    zIndex: 1,
    transform: [{ scaleX: 0.90 }, { translateY: 30 }],
    opacity: 0.45,
  },
  peekInner: { flex: 1 },
  mainCard: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    bottom: 190,
    zIndex: 10,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },
  hintOverlay: {
    position: "absolute",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  hintRight: { right: 16, top: "40%" as any, backgroundColor: "rgba(34,197,94,0.85)" },
  hintLeft: { left: 16, top: "40%" as any, backgroundColor: "rgba(245,158,11,0.85)" },
  hintUp: { top: 20, left: "38%" as any, backgroundColor: "rgba(99,102,241,0.85)" },
  hintDown: { bottom: 100, left: "38%" as any, backgroundColor: "rgba(99,102,241,0.85)" },
  hintText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  cardContent: { padding: 22, paddingBottom: 12, flexGrow: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  cardBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  cardBadgeNum: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  cardSurahName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  cardAyahLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
  cardCounter: { fontSize: 12, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
  basmala: {
    fontSize: 22, lineHeight: 44, color: "#1A1A1A", textAlign: "center", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined, marginBottom: 12,
  },
  arabicText: {
    fontSize: 28, lineHeight: 54, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 16,
  },
  transliteration: { fontSize: 14, color: "#7A7A7A", fontFamily: "Inter_400Regular", fontStyle: "italic", marginBottom: 10, lineHeight: 22 },
  translationBox: { backgroundColor: "#F7F7F7", borderRadius: 14, padding: 14, marginBottom: 10 },
  translation: { fontSize: 15, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 24 },
  tafsirBox: { backgroundColor: "#FFF8EE", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#EDD9A3" },
  tafsirName: { fontSize: 11, fontWeight: "700", color: "#8B6914", fontFamily: "Inter_700Bold", marginBottom: 4 },
  tafsirText: { fontSize: 13, color: "#5A4020", fontFamily: "Inter_400Regular", lineHeight: 22 },
  cardFooter: {
    borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
  },
  swipeHints: {
    flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 10,
  },
  swipeHintItem: { alignItems: "center", gap: 3 },
  swipeDirIcon: {
    width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  swipeDirArrow: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  swipeDirLabel: { fontSize: 10, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.35 },
  navDots: { flexDirection: "row", gap: 6 },
  navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D0D0D0" },
  navDotActive: { backgroundColor: "#1A1A1A", width: 18 },
  repeatBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  repeatSheet: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  repeatTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  repeatSub: { fontSize: 14, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginBottom: 20 },
  repeatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  repeatOption: {
    flex: 1, minWidth: "40%", backgroundColor: "#F5F5F5", borderRadius: 16, padding: 16, alignItems: "center",
    borderWidth: 1.5, borderColor: "#E8E8E8",
  },
  repeatOptionNum: { fontSize: 26, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  repeatOptionLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
  repeatCancel: { alignItems: "center", paddingVertical: 12 },
  repeatCancelText: { fontSize: 15, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
});

export default function SurahScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNum = parseInt(id, 10);

  const [arabic, setArabic] = useState<SurahDetail | null>(null);
  const [translation, setTranslation] = useState<SurahDetail | null>(null);
  const [transliteration, setTransliteration] = useState<SurahDetail | null>(null);
  const [tafsirDataMap, setTafsirDataMap] = useState<Record<string, SurahDetail>>({});
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [practiceVisible, setPracticeVisible] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [wordModal, setWordModal] = useState<{ visible: boolean; word: string; ayahNum: number }>({
    visible: false, word: "", ayahNum: 0,
  });
  const [ayahRepeatOverrides, setAyahRepeatOverrides] = useState<Record<number, number>>({});

  const {
    settings, updateSettings,
    saveProgress, recordAyahRead, highlightedWords,
    saveWord, saveAyah,
    surahPositions, saveSurahPosition,
  } = useQuran();

  const cardListRef = useRef<FlatList<ApiAyah>>(null);
  const { audioState, playAyah, playRange, setOnNextAyah } = useAudio();

  useEffect(() => {
    setAyahRepeatOverrides({});
  }, [settings.repeatCount]);

  const listRef = useRef<FlatList<ApiAyah>>(null);
  const mushafScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      mushafScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 80);
  }, [currentPage]);

  useEffect(() => {
    loadData();
    return () => setOnNextAyah(null);
  }, [surahNum]);

  useEffect(() => {
    if (!settings.showTafsir || !arabic) return;
    const selectedTafsirs = settings.selectedTafsirs ?? ["en.maarifulquran"];
    const toFetch = selectedTafsirs.filter(ed => !tafsirDataMap[ed]);
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map(ed => fetchTafsir(surahNum, ed).catch(() => null))).then(results => {
      setTafsirDataMap(prev => {
        const next = { ...prev };
        toFetch.forEach((ed, i) => { if (results[i]) next[ed] = results[i]!; });
        return next;
      });
    });
  }, [settings.showTafsir, settings.selectedTafsirs, arabic]);

  async function loadData() {
    setLoading(true);
    try {
      const selectedTafsirs = settings.selectedTafsirs ?? ["en.maarifulquran"];
      const [main, tafsirResults] = await Promise.all([
        fetchSurahWithTranslations(surahNum),
        settings.showTafsir
          ? Promise.all(selectedTafsirs.map(ed => fetchTafsir(surahNum, ed).catch(() => null)))
          : Promise.resolve([] as (SurahDetail | null)[]),
      ]);
      setArabic(main.arabic);
      setTranslation(main.translation);
      setTransliteration(main.transliteration);
      if (settings.showTafsir) {
        const map: Record<string, SurahDetail> = {};
        selectedTafsirs.forEach((ed, i) => {
          const data = tafsirResults[i];
          if (data) map[ed] = data;
        });
        setTafsirDataMap(map);
      }

      setOnNextAyah((surahN, ayahN) => {
        const totalAyahs = SURAH_DATA[surahN - 1]?.ayahCount ?? (surahN === surahNum ? main.arabic.ayahs.length : 10);
        playAyah(surahN, ayahN, totalAyahs, settings.repeatCount);
        setActiveAyah(surahN === surahNum ? ayahN : null);
        recordAyahRead(surahN);
        saveProgress({
          surahNumber: surahN,
          ayahNumber: ayahN,
          ayahNumberInSurah: ayahN,
          surahName: SURAH_DATA[surahN - 1]?.englishName ?? main.arabic.englishName,
        });
        if (surahN === surahNum) {
          const pageForAyah = Math.ceil(ayahN / AYAHS_PER_PAGE);
          setCurrentPage(pageForAyah);
          const cardIdx = ayahN - 1;
          setCurrentAyahIndex(cardIdx);
          saveSurahPosition(surahN, cardIdx);
          setTimeout(() => {
            cardListRef.current?.scrollToIndex({ index: cardIdx, animated: true });
          }, 100);
        }
      });

      // Auto-resume: use saved position, then ayahParam, then start from beginning
      const savedPos = surahPositions[surahNum];
      let initialIndex = 0;
      if (ayahParam) {
        initialIndex = Math.max(0, parseInt(ayahParam, 10) - 1);
      } else if (savedPos !== undefined) {
        initialIndex = savedPos;
      }
      if (initialIndex > 0) {
        const pageForAyah = Math.ceil((initialIndex + 1) / AYAHS_PER_PAGE);
        setCurrentPage(pageForAyah);
        setCurrentAyahIndex(initialIndex);
        setTimeout(() => {
          cardListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        }, 300);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAyahPress = useCallback((ayahNum: number) => {
    setActiveAyah(ayahNum === activeAyah ? null : ayahNum);
  }, [activeAyah]);

  const handleWordLongPress = useCallback((word: string, ayahNum: number) => {
    setWordModal({ visible: true, word, ayahNum });
  }, []);

  const handleSaveAyah = useCallback((ayah: ApiAyah) => {
    const words = ayah.text.split(" ").filter(Boolean);
    words.forEach(word => {
      saveWord({
        arabic: word,
        translation: "",
        surahNumber: surahNum,
        ayahNumber: ayah.numberInSurah,
        highlighted: false,
      });
    });
    saveAyah({
      surahNumber: surahNum,
      surahName: arabic?.englishName ?? "",
      ayahNumber: ayah.numberInSurah,
      arabicText: ayah.text,
      translationText: translation?.ayahs[ayah.numberInSurah - 1]?.text ?? "",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [surahNum, saveWord, saveAyah, arabic, translation]);

  const handleRepeatSelect = useCallback((ayahNum: number, count: number) => {
    setAyahRepeatOverrides(prev => ({ ...prev, [ayahNum]: count }));
    if (!arabic) return;
    playAyah(surahNum, ayahNum, arabic.ayahs.length, count);
    recordAyahRead(surahNum);
    saveProgress({
      surahNumber: surahNum,
      ayahNumber: ayahNum,
      ayahNumberInSurah: ayahNum,
      surahName: arabic.englishName,
    });
  }, [arabic, surahNum, playAyah, recordAyahRead, saveProgress]);

  const handlePlayAll = useCallback(() => {
    if (!arabic) return;
    playAyah(surahNum, 1, arabic.ayahs.length, settings.repeatCount);
    setActiveAyah(1);
    recordAyahRead(surahNum);
    saveProgress({
      surahNumber: surahNum,
      ayahNumber: 1,
      ayahNumberInSurah: 1,
      surahName: arabic.englishName,
    });
  }, [arabic, surahNum, settings.repeatCount]);

  const currentAyahForRange = audioState.currentSurah === surahNum && audioState.currentAyah
    ? audioState.currentAyah
    : parseInt(ayahParam ?? "1", 10) || 1;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const basmala = surahNum !== 1 && surahNum !== 9;

  const surahHighlightedCount = useMemo(
    () => highlightedWords.filter(w => w.surahNumber === surahNum).length,
    [highlightedWords, surahNum]
  );

  const totalPages = arabic ? Math.ceil(arabic.ayahs.length / AYAHS_PER_PAGE) : 1;
  const pageAyahs = useMemo(() => {
    if (!arabic) return [];
    const start = (currentPage - 1) * AYAHS_PER_PAGE;
    return arabic.ayahs.slice(start, start + AYAHS_PER_PAGE);
  }, [arabic, currentPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPage(p => p - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPage(p => p + 1);
    }
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          {arabic && (
            <>
              <Text style={s.headerTitle}>{arabic.englishName}</Text>
              <Text style={s.headerSub}>{arabic.numberOfAyahs} ayahs · {arabic.revelationType}</Text>
            </>
          )}
        </View>
        <View style={s.headerActions}>
          {surahHighlightedCount > 0 && (
            <TouchableOpacity onPress={() => setPracticeVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
              <View style={s.practiceIconBadge}>
                <Ionicons name="star" size={20} color={colors.accent} />
                <View style={s.practiceCount}>
                  <Text style={s.practiceCountText}>{surahHighlightedCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handlePlayAll} style={s.headerBtn} activeOpacity={0.7}>
            <Ionicons name="play-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
            <Feather name="sliders" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.modeNavBar}>
        {settings.mushafMode ? (
          <TouchableOpacity
            style={[s.pageCornerBtn, s.pageCornerBtnLeft, isLastPage && s.pageCornerBtnDisabled]}
            onPress={goToNextPage}
            disabled={isLastPage}
            activeOpacity={0.75}
          >
            <Feather name="chevron-left" size={16} color={isLastPage ? "#C0C0C0" : "#1A1A1A"} />
            <Text style={[s.pageCornerText, isLastPage && s.pageCornerTextDisabled]}>Next</Text>
          </TouchableOpacity>
        ) : <View style={{ minWidth: 70 }} />}

        <View style={s.modeSwitcher}>
          <TouchableOpacity
            style={[s.modeBtn, !settings.mushafMode && s.modeBtnActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: false }); }}
            activeOpacity={0.8}
          >
            <Text style={[s.modeBtnText, !settings.mushafMode && s.modeBtnTextActive]}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, settings.mushafMode && s.modeBtnActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: true }); }}
            activeOpacity={0.8}
          >
            <Text style={[s.modeBtnText, settings.mushafMode && s.modeBtnTextActive]}>Mushaf</Text>
          </TouchableOpacity>
        </View>

        {settings.mushafMode ? (
          <TouchableOpacity
            style={[s.pageCornerBtn, s.pageCornerBtnRight, isFirstPage && s.pageCornerBtnDisabled]}
            onPress={goToPrevPage}
            disabled={isFirstPage}
            activeOpacity={0.75}
          >
            <Text style={[s.pageCornerText, isFirstPage && s.pageCornerTextDisabled]}>Prev</Text>
            <Feather name="chevron-right" size={16} color={isFirstPage ? "#C0C0C0" : "#1A1A1A"} />
          </TouchableOpacity>
        ) : <View style={{ minWidth: 70 }} />}
      </View>

      {!loading && arabic && isFirstPage && settings.mushafMode && (
        <View style={s.surahInfo}>
          <Text style={s.surahArabicName}>{arabic.name}</Text>
          {basmala && (
            <Text style={s.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}
        </View>
      )}

      {!loading && settings.mushafMode && totalPages > 1 && (
        <View style={s.pageIndicatorBar}>
          <Text style={s.pageIndicatorText}>
            Page {currentPage} of {totalPages}
          </Text>
          <Text style={s.pageIndicatorRange}>
            Ayahs {(currentPage - 1) * AYAHS_PER_PAGE + 1}–{Math.min(currentPage * AYAHS_PER_PAGE, arabic?.ayahs.length ?? 0)}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} size="large" />
      ) : settings.mushafMode ? (
        <ScrollView
          ref={mushafScrollRef}
          style={{ flex: 1, backgroundColor: MUSHAF_BG }}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <MushafPage ayahs={pageAyahs} surahName={arabic?.englishName ?? ""} colors={colors} />
        </ScrollView>
      ) : (
        arabic ? (
          <CardSwipeStack
            ayahs={arabic.ayahs}
            currentIndex={currentAyahIndex}
            onIndexChange={(newIdx) => {
              setCurrentAyahIndex(newIdx);
              saveSurahPosition(surahNum, newIdx);
            }}
            onSave={handleSaveAyah}
            onRepeatSelect={handleRepeatSelect}
            translation={translation}
            transliteration={transliteration}
            tafsirDataMap={tafsirDataMap}
            settings={settings}
            surahNum={surahNum}
            arabicName={arabic.englishName}
            playAyah={playAyah}
            repeatCount={settings.repeatCount}
          />
        ) : null
      )}

      {false && arabic && (
        <FlatList
          ref={cardListRef}
          data={arabic?.ayahs ?? []}
          keyExtractor={(item) => String(item.numberInSurah)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (newIndex !== currentAyahIndex) {
              setCurrentAyahIndex(newIndex);
              saveSurahPosition(surahNum, newIndex);
            }
          }}
          renderItem={({ item }) => {
            const translationAyah = translation?.ayahs[item.numberInSurah - 1];
            const transliterationAyah = transliteration?.ayahs[item.numberInSurah - 1];
            const tafsirs: TafsirEntry[] = [];
            if (settings.showTafsir) {
              for (const ed of (settings.selectedTafsirs ?? ["en.maarifulquran"])) {
                const tafsirData = tafsirDataMap[ed];
                if (tafsirData) {
                  const tafsirAyah = tafsirData.ayahs[item.numberInSurah - 1];
                  const edition = TAFSIR_EDITIONS.find(e => e.id === ed);
                  if (tafsirAyah && edition) {
                    tafsirs.push({ edition: ed, name: edition.name, ayah: tafsirAyah });
                  }
                }
              }
            }
            const showBasmala = item.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9;
            return (
              <View style={s.cardPage}>
                <ScrollView
                  style={s.cardScroll}
                  contentContainerStyle={s.cardScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={s.ayahCard}>
                    <View style={s.cardHeader}>
                      <View style={s.cardSurahBadge}>
                        <Text style={s.cardSurahNum}>{surahNum}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardSurahName}>{arabic?.englishName ?? ""}</Text>
                        <Text style={s.cardAyahNum}>Ayah {item.numberInSurah}</Text>
                      </View>
                      <Text style={s.cardCounter}>{item.numberInSurah} / {arabic?.ayahs.length}</Text>
                    </View>

                    {showBasmala && (
                      <Text style={s.cardBasmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
                    )}

                    <Text style={s.cardArabicText}>{item.text}</Text>

                    {settings.showTransliteration && transliterationAyah && (
                      <Text style={s.cardTransliteration}>{transliterationAyah.text}</Text>
                    )}
                    {settings.showTranslation && translationAyah && (
                      <View style={s.cardTranslationBox}>
                        <Text style={s.cardTranslation}>{translationAyah.text}</Text>
                      </View>
                    )}
                    {tafsirs.length > 0 && tafsirs.map(t => (
                      <View key={t.edition} style={s.cardTafsirBox}>
                        <Text style={s.cardTafsirName}>{t.name}</Text>
                        <Text style={s.cardTafsirText}>{t.ayah.text}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.cardNavRow}>
                    <TouchableOpacity
                      style={[s.cardNavBtn, currentAyahIndex === 0 && s.cardNavBtnDisabled]}
                      onPress={() => {
                        if (currentAyahIndex > 0) {
                          const newIdx = currentAyahIndex - 1;
                          setCurrentAyahIndex(newIdx);
                          saveSurahPosition(surahNum, newIdx);
                          cardListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                        }
                      }}
                      disabled={currentAyahIndex === 0}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-left" size={18} color={currentAyahIndex === 0 ? "#C0C0C0" : "#1A1A1A"} />
                    </TouchableOpacity>

                    <View style={s.cardNavDots}>
                      {[...Array(Math.min(arabic?.ayahs.length ?? 1, 5))].map((_, i) => {
                        const total = arabic?.ayahs.length ?? 1;
                        const spread = Math.max(0, Math.floor((currentAyahIndex / total) * 5));
                        const active = i === Math.min(spread, 4);
                        return <View key={i} style={[s.cardNavDot, active && s.cardNavDotActive]} />;
                      })}
                    </View>

                    <TouchableOpacity
                      style={[s.cardNavBtn, currentAyahIndex === (arabic?.ayahs.length ?? 1) - 1 && s.cardNavBtnDisabled]}
                      onPress={() => {
                        const total = arabic?.ayahs.length ?? 1;
                        if (currentAyahIndex < total - 1) {
                          const newIdx = currentAyahIndex + 1;
                          setCurrentAyahIndex(newIdx);
                          saveSurahPosition(surahNum, newIdx);
                          cardListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                        }
                      }}
                      disabled={currentAyahIndex === (arabic?.ayahs.length ?? 1) - 1}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-right" size={18} color={currentAyahIndex === (arabic?.ayahs.length ?? 1) - 1 ? "#C0C0C0" : "#1A1A1A"} />
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            );
          }}
          windowSize={5}
          maxToRenderPerBatch={3}
          removeClippedSubviews={true}
          style={{ flex: 1 }}
        />
      )}

      <ReaderFloatingBar
        showTranslation={settings.showTranslation}
        showTransliteration={settings.showTransliteration}
        showTafsir={settings.showTafsir}
        mushafMode={settings.mushafMode}
        selectedTafsirs={settings.selectedTafsirs ?? ["en.maarifulquran"]}
        tafsirEditions={TAFSIR_EDITIONS}
        colorCoding={settings.colorCoding}
        onToggleTranslation={() => updateSettings({ showTranslation: !settings.showTranslation })}
        onToggleTransliteration={() => updateSettings({ showTransliteration: !settings.showTransliteration })}
        onToggleTafsir={() => updateSettings({ showTafsir: !settings.showTafsir })}
        onToggleColorCoding={() => updateSettings({ colorCoding: !settings.colorCoding })}
        onToggleTafsirEdition={(id) => {
          const current = settings.selectedTafsirs ?? ["en.maarifulquran"];
          if (current.includes(id)) {
            const next = current.filter(t => t !== id);
            updateSettings({ selectedTafsirs: next.length > 0 ? next : current });
          } else {
            updateSettings({ selectedTafsirs: [...current, id] });
          }
        }}
        onPlayRange={() => setRangeVisible(true)}
      />

      <AudioPlayerBar />

      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <RangeSelectorModal
        visible={rangeVisible}
        currentSurah={surahNum}
        currentAyah={currentAyahForRange}
        onConfirm={(range, repeatCount) => {
          playRange(range, repeatCount);
          recordAyahRead(range.startSurah);
          saveProgress({
            surahNumber: range.startSurah,
            ayahNumber: range.startAyah,
            ayahNumberInSurah: range.startAyah,
            surahName: SURAH_DATA[range.startSurah - 1]?.englishName ?? "",
          });
        }}
        onClose={() => setRangeVisible(false)}
      />

      <WordModal
        visible={wordModal.visible}
        word={wordModal.word}
        translation=""
        surahNumber={surahNum}
        ayahNumber={wordModal.ayahNum}
        onClose={() => setWordModal((prev) => ({ ...prev, visible: false }))}
      />

      <PracticeModal
        visible={practiceVisible}
        surahNumber={surahNum}
        onClose={() => setPracticeVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 8 },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    headerActions: { flexDirection: "row", alignItems: "center" },
    headerBtn: { padding: 8 },
    practiceIconBadge: { position: "relative" },
    practiceCount: {
      position: "absolute", top: -4, right: -4, backgroundColor: colors.primary,
      borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center",
    },
    practiceCountText: { fontSize: 9, fontWeight: "700", color: colors.primaryForeground },
    modeNavBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pageCornerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: "#F5F5F5",
      minWidth: 70,
    },
    pageCornerBtnLeft: { justifyContent: "flex-start" },
    pageCornerBtnRight: { justifyContent: "flex-end" },
    pageCornerBtnDisabled: { backgroundColor: "#F9F9F9" },
    pageCornerText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    pageCornerTextDisabled: { color: "#C0C0C0" },
    modeSwitcher: {
      flexDirection: "row",
      backgroundColor: "#F0F0F0",
      borderRadius: 12,
      padding: 3,
      gap: 2,
    },
    modeBtn: {
      paddingHorizontal: 26,
      paddingVertical: 9,
      borderRadius: 10,
    },
    modeBtnActive: {
      backgroundColor: "#1A1A1A",
    },
    modeBtnText: { fontSize: 13, fontWeight: "700", color: "#9A9A9A", fontFamily: "Inter_700Bold" },
    modeBtnTextActive: { color: "#FFFFFF" },
    surahInfo: {
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    surahArabicName: { fontSize: 28, color: colors.primary, fontFamily: "System", marginBottom: 8 },
    basmala: { fontSize: 20, color: colors.foreground, fontFamily: "System", textAlign: "center", lineHeight: 40 },
    pageIndicatorBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 6,
      backgroundColor: colors.muted,
    },
    pageIndicatorText: { fontSize: 12, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    pageIndicatorRange: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    cardPage: {
      width: SCREEN_WIDTH,
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    cardScroll: { flex: 1 },
    cardScrollContent: { paddingBottom: 180 },
    ayahCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.09,
      shadowRadius: 18,
      elevation: 6,
      borderWidth: 1,
      borderColor: "#F0F0F0",
      gap: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    cardSurahBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#1A1A1A",
      alignItems: "center",
      justifyContent: "center",
    },
    cardSurahNum: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    cardSurahName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    cardAyahNum: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
    cardCounter: { fontSize: 12, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
    cardBasmala: {
      fontSize: 20,
      color: "#1A1A1A",
      textAlign: "center",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      lineHeight: 38,
      paddingTop: 4,
    },
    cardArabicText: {
      fontSize: 30,
      lineHeight: 56,
      color: "#1A1A1A",
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    cardTransliteration: {
      fontSize: 14,
      lineHeight: 22,
      color: "#6B6B6B",
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
    },
    cardTranslationBox: {
      borderTopWidth: 1,
      borderTopColor: "#F0F0F0",
      paddingTop: 14,
    },
    cardTranslation: {
      fontSize: 15,
      lineHeight: 24,
      color: "#4A4A4A",
      fontFamily: "Inter_400Regular",
    },
    cardTafsirBox: {
      borderTopWidth: 1,
      borderTopColor: "#F0F0F0",
      paddingTop: 12,
      gap: 4,
    },
    cardTafsirName: { fontSize: 10, fontWeight: "700", color: "#9A9A9A", letterSpacing: 1, fontFamily: "Inter_700Bold" },
    cardTafsirText: { fontSize: 13, lineHeight: 21, color: "#5A5A5A", fontFamily: "Inter_400Regular" },
    cardNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 20,
      paddingHorizontal: 4,
    },
    cardNavBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#F5F5F5",
      alignItems: "center",
      justifyContent: "center",
    },
    cardNavBtnDisabled: { opacity: 0.35 },
    cardNavDots: { flexDirection: "row", gap: 6, alignItems: "center" },
    cardNavDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#D0D0D0",
    },
    cardNavDotActive: {
      backgroundColor: "#1A1A1A",
      width: 16,
      borderRadius: 3,
    },
  });
