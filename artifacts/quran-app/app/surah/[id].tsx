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
import { SettingsSheet } from "@/components/SettingsSheet";
import { WordModal } from "@/components/WordModal";
import { RangeSelectorModal } from "@/components/RangeSelectorModal";
import { fetchSurahWithTranslations, fetchTafsir, type SurahDetail, type ApiAyah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";

const AYAHS_PER_PAGE = 10;

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
          {ayahs.map((ayah, i) => (
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
      backgroundColor: "#FDFAF5",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      minHeight: 400,
    },
    pageInner: {
      padding: 24,
      paddingVertical: 32,
      borderWidth: 3,
      borderColor: colors.accent + "40",
      borderRadius: 6,
      margin: 8,
    },
    mushafText: {
      fontSize: 22,
      lineHeight: 48,
      textAlign: "justify",
      color: "#2C1810",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      writingDirection: "rtl",
    },
    mushafAyahText: {
      fontSize: 22,
      lineHeight: 48,
      color: "#2C1810",
    },
    ayahMarker: {
      fontSize: 18,
      color: colors.accent,
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

  const surahSavedWordsForPractice = useMemo(() => {
    return savedWords.filter(w =>
      surahHighlightedWords.some(h => h.arabic === w.arabic && h.surahNumber === w.surahNumber)
    );
  }, [savedWords, surahHighlightedWords]);

  const practiceList = useMemo(() => {
    const result: { arabic: string; translation: string; ayahNumber: number }[] = [];
    for (const hw of surahHighlightedWords) {
      const saved = savedWords.find(sw => sw.arabic === hw.arabic && sw.surahNumber === hw.surahNumber);
      result.push({ arabic: hw.arabic, translation: saved?.translation ?? "", ayahNumber: hw.ayahNumber });
    }
    return result;
  }, [surahHighlightedWords, savedWords]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const current = practiceList[currentIdx];

  const handleNext = () => {
    if (currentIdx + 1 >= practiceList.length) {
      setDone(true);
    } else {
      setCurrentIdx(c => c + 1);
      setRevealed(false);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setRevealed(false);
    setDone(false);
  };

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
            <Text style={s.emptySub}>
              Long-press any Arabic word and tap "Highlight" to add it to your practice session
            </Text>
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
                  {current.translation ? (
                    <Text style={s.flashcardMeaning}>{current.translation}</Text>
                  ) : (
                    <Text style={s.flashcardMeaningHint}>No translation saved for this word</Text>
                  )}
                  <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={s.nextBtnText}>
                      {currentIdx + 1 >= practiceList.length ? "Finish" : "Next Word"}
                    </Text>
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
      minHeight: 280,
      justifyContent: "center",
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
  const [tafsir, setTafsir] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [practiceVisible, setPracticeVisible] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [wordModal, setWordModal] = useState<{ visible: boolean; word: string; ayahNum: number }>({
    visible: false, word: "", ayahNum: 0,
  });

  const { settings, saveProgress, recordAyahRead, highlightedWords } = useQuran();
  const { audioState, playAyah, playRange, setOnNextAyah } = useAudio();
  const listRef = useRef<FlatList<ApiAyah>>(null);

  useEffect(() => {
    loadData();
    return () => setOnNextAyah(null);
  }, [surahNum]);

  async function loadData() {
    setLoading(true);
    try {
      const [main, tafsirData] = await Promise.all([
        fetchSurahWithTranslations(surahNum),
        settings.showTafsir ? fetchTafsir(surahNum) : Promise.resolve(null),
      ]);
      setArabic(main.arabic);
      setTranslation(main.translation);
      setTransliteration(main.transliteration);
      if (tafsirData) setTafsir(tafsirData);

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
          const idx = ayahN - 1;
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
          }, 100);
        }
      });

      if (ayahParam) {
        const idx = parseInt(ayahParam, 10) - 1;
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: Math.max(0, idx), animated: true });
        }, 500);
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
              <Text style={s.headerSub}>{arabic.numberOfAyahs} ayahs • {arabic.revelationType}</Text>
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
          <TouchableOpacity onPress={() => setRangeVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
            <Ionicons name="list" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayAll} style={s.headerBtn} activeOpacity={0.7}>
            <Ionicons name="play-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
            <Feather name="sliders" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {arabic && (
        <View style={s.surahInfo}>
          <Text style={s.surahArabicName}>{arabic.name}</Text>
          {basmala && (
            <Text style={s.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} size="large" />
      ) : settings.mushafMode ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          <MushafPage ayahs={pageAyahs} surahName={arabic?.englishName ?? ""} colors={colors} />

          <View style={s.pageNav}>
            <TouchableOpacity
              style={[s.pageNavBtn, currentPage === 1 && s.pageNavBtnDisabled]}
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={18} color={currentPage === 1 ? colors.mutedForeground : colors.primary} />
              <Text style={[s.pageNavText, currentPage === 1 && s.pageNavTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <View style={s.pageIndicator}>
              <Text style={s.pageIndicatorText}>Page {currentPage} / {totalPages}</Text>
              <Text style={s.pageAyahRange}>
                Ayahs {(currentPage - 1) * AYAHS_PER_PAGE + 1}–{Math.min(currentPage * AYAHS_PER_PAGE, arabic?.ayahs.length ?? 0)}
              </Text>
            </View>

            <TouchableOpacity
              style={[s.pageNavBtn, currentPage === totalPages && s.pageNavBtnDisabled]}
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              activeOpacity={0.8}
            >
              <Text style={[s.pageNavText, currentPage === totalPages && s.pageNavTextDisabled]}>Next</Text>
              <Feather name="chevron-right" size={18} color={currentPage === totalPages ? colors.mutedForeground : colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={arabic?.ayahs ?? []}
          keyExtractor={(item) => String(item.numberInSurah)}
          renderItem={({ item }) => (
            <AyahItem
              arabic={item}
              translation={translation?.ayahs[item.numberInSurah - 1]}
              transliteration={transliteration?.ayahs[item.numberInSurah - 1]}
              tafsir={tafsir?.ayahs[item.numberInSurah - 1]}
              surahNumber={surahNum}
              surahName={arabic?.englishName ?? ""}
              totalAyahs={arabic?.ayahs.length ?? 0}
              isActive={activeAyah === item.numberInSurah || audioState.currentAyah === item.numberInSurah}
              onPress={() => handleAyahPress(item.numberInSurah)}
              onWordLongPress={(word, ayahNum) => handleWordLongPress(word, ayahNum)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

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
      paddingBottom: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 8 },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    headerActions: { flexDirection: "row", alignItems: "center" },
    headerBtn: { padding: 8 },
    practiceIconBadge: { position: "relative" },
    practiceCount: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.primary,
      borderRadius: 8,
      width: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    practiceCountText: { fontSize: 9, fontWeight: "700", color: colors.primaryForeground },
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
    pageNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    pageNavBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.secondary,
    },
    pageNavBtnDisabled: { backgroundColor: colors.muted },
    pageNavText: { fontSize: 14, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    pageNavTextDisabled: { color: colors.mutedForeground },
    pageIndicator: { alignItems: "center" },
    pageIndicatorText: { fontSize: 14, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    pageAyahRange: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  });
