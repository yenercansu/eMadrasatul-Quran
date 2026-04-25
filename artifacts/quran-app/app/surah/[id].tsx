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
      paddingHorizontal: 16,
      paddingVertical: 7,
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
