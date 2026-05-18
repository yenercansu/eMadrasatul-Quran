import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  FlatList,
  Share,
  TextInput,
  Alert,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedAyah, type SavedWord } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { SwipeableRow } from "@/components/SwipeableRow";
import { Pagination } from "@/components/Pagination";
import { Tag } from "@/components/Tag";
import { QuestionNav } from "@/components/QuestionNav";

type QuizMode = "word-meaning";
type QuizState = "selection" | "cards" | "answering" | "answered" | "finished" | "no-words";
type SelectionMode = "by-ayah" | "by-words";
type SelectionTagFilter = "all" | "selected";

const ITEMS_PER_PAGE = 20;
const FALLBACK_TRANSLATION_OPTIONS = [
  "Mercy",
  "Guidance",
  "Prayer",
  "Lord",
  "Faith",
  "Book",
  "Truth",
  "Light",
  "Peace",
  "Forgiveness",
  "Patience",
  "Knowledge",
];
const MAX_WORD_TRANSLATION_WORDS = 4;
const MAX_WORD_TRANSLATION_CHARS = 36;

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  word: SavedWord;
  options: QuizOption[];
  correctIndex: number;
  mode: QuizMode;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function ayahKey(ayah: Pick<SavedAyah, "surahNumber" | "ayahNumber">): string {
  return `${ayah.surahNumber}:${ayah.ayahNumber}`;
}

function sanitizeWordMeaning(translation?: string): string | null {
  const cleaned = translation?.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const wordCount = cleaned.split(" ").filter(Boolean).length;
  if (wordCount > MAX_WORD_TRANSLATION_WORDS || cleaned.length > MAX_WORD_TRANSLATION_CHARS) {
    return null;
  }
  return cleaned;
}

function buildQuestions(words: SavedWord[]): QuizQuestion[] {
  if (words.length < 1) return [];

  const selectedWords = shuffle(words).slice(0, 10);

  return selectedWords.map((word) => {
    const correctText = sanitizeWordMeaning(word.translation) ?? "Meaning not saved";
    const otherTranslations = shuffle(
      words
        .map(w => sanitizeWordMeaning(w.translation))
        .filter((translation): translation is string => !!translation && translation !== correctText)
    ).slice(0, 3);
    const fallbackTranslations = FALLBACK_TRANSLATION_OPTIONS.filter(t => t !== correctText && !otherTranslations.includes(t));
    while (otherTranslations.length < 3) {
      otherTranslations.push(fallbackTranslations.shift() ?? "Unknown meaning");
    }
    const rawOptions = shuffle([correctText, ...otherTranslations]);
    const options: QuizOption[] = rawOptions.map(t => ({ text: t }));
    const correctIndex = options.findIndex(o => o.text === correctText);
    return { word, options, correctIndex, mode: "word-meaning" as const };
  });
}

function NoWordsScreen({ colors, topPad }: { colors: ReturnType<typeof useColors>; topPad: number }) {
  const s = styles(colors);
  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Test Yourself!</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.noWordsContent} showsVerticalScrollIndicator={false}>
        <View style={s.noWordsGraphic}>
          <View style={s.graphicSurahMock}>
            <View style={s.graphicAyahRow}>
              <View style={[s.graphicWordChip, { backgroundColor: colors.secondary }]}>
                <Text style={s.graphicArabicWord}>بِسْمِ</Text>
              </View>
              <View style={[s.graphicWordChip, s.graphicWordHighlight]}>
                <Text style={[s.graphicArabicWord, { color: colors.primaryForeground }]}>اللَّهِ</Text>
                <View style={s.longPressHint}>
                  <Text style={s.longPressHintText}>Hold</Text>
                </View>
              </View>
              <View style={[s.graphicWordChip, { backgroundColor: colors.secondary }]}>
                <Text style={s.graphicArabicWord}>الرَّحْمَٰنِ</Text>
              </View>
            </View>
          </View>
          <Feather name="arrow-down" size={20} color={colors.primary} />
          <View style={s.graphicPopup}>
            <Text style={s.graphicPopupArabic}>اللَّهِ</Text>
            <Text style={s.graphicPopupTrans}>Allah / God</Text>
            <View style={s.graphicSaveBtn}>
              <Ionicons name="bookmark-outline" size={14} color={colors.primaryForeground} />
              <Text style={s.graphicSaveBtnText}>Add to Library</Text>
            </View>
          </View>
        </View>

        <Text style={s.noWordsTitle}>Build Your Vocabulary</Text>
        <Text style={s.noWordsSub}>Save words while reading to quiz yourself on their meanings</Text>

        <View style={s.howToCard}>
          {[
            { num: "1", icon: "book-open" as const, text: "Open any Surah from the Quran tab" },
            { num: "2", icon: "mouse-pointer" as const, text: "Long-press on any Arabic word" },
            { num: "3", icon: "bookmark" as const, text: "Tap \"Add to Library\" in the popup" },
            { num: "4", icon: "zap" as const, text: "Come back here to test yourself!" },
          ].map(step => (
            <View key={step.num} style={s.howToStep}>
              <Feather name={step.icon} size={18} color={colors.primary} style={s.howToIcon} />
              <Text style={s.howToText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.goReadBtn} onPress={() => router.replace("/(tabs)/quran")} activeOpacity={0.85}>
          <Ionicons name="book-outline" size={18} color={colors.primaryForeground} />
          <Text style={s.goReadBtnText}>Start Reading</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function WordReviewCard({
  word,
  onToggleMemorized,
}: {
  word: SavedWord;
  onToggleMemorized: () => void;
}) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const [localMemorized, setLocalMemorized] = useState(!!word.memorized);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLocalMemorized(!!word.memorized);
  }, [word.memorized]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, []);

  const handleToggleMemorized = () => {
    if (pendingRef.current) return;

    const next = !localMemorized;
    setLocalMemorized(next);
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        onToggleMemorized();
        fadeAnim.setValue(1);
      });
    }, 420);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={() => setRevealed(prev => !prev)}
        style={[reviewCardStyles.card, { backgroundColor: colors.appCardWarm, borderColor: colors.appSoftBorder }]}
        activeOpacity={0.85}
      >
        <View style={reviewCardStyles.cardTop}>
          <Text style={[reviewCardStyles.arabic, { color: colors.appText }]}>
            {word.arabic}
          </Text>
          <TouchableOpacity
            style={[
              reviewCardStyles.checkCircle,
              {
                borderColor: localMemorized ? colors.appSelectedPill : colors.appSoftBorder,
                backgroundColor: localMemorized ? colors.appSelectedPill : colors.appSoftPill,
              },
            ]}
            onPress={handleToggleMemorized}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="check"
              size={14}
              color={localMemorized ? colors.appText : colors.appIconMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={[reviewCardStyles.divider, { backgroundColor: colors.appSoftDivider }]} />
        <View style={reviewCardStyles.cardBottom}>
          {revealed ? (
            <Text style={[reviewCardStyles.translationText, { color: colors.appText }]}>
              {word.translation || word.arabic}
            </Text>
          ) : (
            <Text style={[reviewCardStyles.tapToReveal, { color: colors.appIconMuted }]}>
              tap to reveal
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const reviewCardStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 112,
    shadowColor: "#5D4A37",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 3,
  },
  cardTop: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 68,
  },
  arabic: {
    flex: 1,
    fontSize: 30,
    fontWeight: "400",
    lineHeight: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  checkCircle: {
    position: "absolute",
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  cardBottom: {
    paddingHorizontal: 20,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tapToReveal: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  translationText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
});

function WordsManagerModal({
  visible,
  words,
  onRemove,
  onClose,
  colors,
}: {
  visible: boolean;
  words: SavedWord[];
  onRemove: (id: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setSelectedIds(new Set());
    }
  }, [visible]);

  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const q = searchQuery.toLowerCase();
    return words.filter(w =>
      w.arabic.includes(searchQuery) ||
      (w.translation && w.translation.toLowerCase().includes(q)) ||
      (SURAH_DATA[w.surahNumber - 1]?.englishName || "").toLowerCase().includes(q)
    );
  }, [words, searchQuery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredWords.map(w => w.id)));
  }, [filteredWords]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete Selected Words",
      `Remove ${selectedIds.size} word${selectedIds.size !== 1 ? "s" : ""} from your library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            selectedIds.forEach(id => onRemove(id));
            setSelectedIds(new Set());
          },
        },
      ]
    );
  }, [selectedIds, onRemove]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: insets.top + 8 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Manage Words</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Search bar */}
        <View style={s.wmSearchWrapper}>
          <View style={[s.wmSearchContainer, { backgroundColor: colors.muted }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[s.wmSearchInput, { color: colors.foreground }]}
              placeholder="Search words..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Actions row */}
        <View style={s.wmActionsRow}>
          <Text style={s.wordsManagerSub}>
            {filteredWords.length} word{filteredWords.length !== 1 ? "s" : ""}{searchQuery ? " found" : ""}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </Text>
          <View style={s.wmActions}>
            <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
              <Text style={[s.wmActionText, { color: colors.foreground }]}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearSelection} activeOpacity={0.7}>
              <Text style={[s.wmActionText, { color: colors.foreground }]}>Clear</Text>
            </TouchableOpacity>
            {selectedIds.size > 0 && (
              <TouchableOpacity onPress={handleBulkDelete} activeOpacity={0.7} style={[s.wmDeleteBtn, { backgroundColor: colors.destructive + "18" }]}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredWords}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            filteredWords.length > 0 ? (
              <View style={s.wmSwipeHintRow}>
                <Feather name="arrow-left" size={11} color={colors.mutedForeground} />
                <Text style={[s.wmSwipeHint, { color: colors.mutedForeground }]}>Swipe left to erase</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <SwipeableRow onDelete={() => onRemove(item.id)}>
                <View style={s.wordManagerRow}>
                  <TouchableOpacity
                    onPress={() => toggleSelect(item.id)}
                    style={[s.wmCheckbox, isSelected && s.wmCheckboxActive]}
                    activeOpacity={0.7}
                  >
                    {isSelected && <Feather name="check" size={12} color={colors.primaryForeground} />}
                  </TouchableOpacity>
                  <View style={s.wordManagerInfo}>
                    <Text style={s.wordManagerArabic}>{item.arabic}</Text>
                    <Text style={s.wordManagerTrans}>{item.translation}</Text>
                    <Text style={s.wordManagerMeta}>Surah {item.surahNumber} : Ayah {item.ayahNumber}</Text>
                  </View>
                </View>
              </SwipeableRow>
            );
          }}
          ListEmptyComponent={
            <View style={s.wordManagerEmpty}>
              <Text style={s.wordManagerEmptyText}>
                {searchQuery ? "No words match your search." : "No words yet — go read and save some!"}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

export default function QuizScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedWords, savedAyahs, removeWord, toggleWordMemorized, recordQuizCompletion } = useQuran();
  const topPad = insets.top;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("selection");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordsManagerVisible, setWordsManagerVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("by-ayah");
  const [tagFilter, setTagFilter] = useState<SelectionTagFilter>("all");
  const [ayahSearchQuery, setAyahSearchQuery] = useState("");
  const [wordSearchQuery, setWordSearchQuery] = useState("");
  const [ayahPage, setAyahPage] = useState(0);
  const [wordPage, setWordPage] = useState(0);
  const [selectedAyahIds, setSelectedAyahIds] = useState<Set<string>>(() => new Set(savedAyahs.map(a => a.id)));
  const [excludedAyahIds, setExcludedAyahIds] = useState<Set<string>>(new Set());
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(() => new Set(savedWords.map(w => w.id)));
  const [excludedWordIds, setExcludedWordIds] = useState<Set<string>>(new Set());
  const [quizWords, setQuizWords] = useState<SavedWord[]>([]);
  const [cardTab, setCardTab] = useState<"active" | "memorized">("active");

  const savedAyahKeys = useMemo(() => new Set(savedAyahs.map(ayahKey)), [savedAyahs]);
  const standaloneWords = useMemo(
    () => savedWords.filter(word => !savedAyahKeys.has(`${word.surahNumber}:${word.ayahNumber}`)),
    [savedAyahKeys, savedWords]
  );

  useEffect(() => {
    setSelectedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      if (prev.size === 0 && excludedAyahIds.size === 0) {
        savedAyahs.forEach(ayah => next.add(ayah.id));
      }
      return setsEqual(prev, next) ? prev : next;
    });
    setExcludedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      return setsEqual(prev, next) ? prev : next;
    });
  }, [excludedAyahIds.size, savedAyahs]);

  useEffect(() => {
    setSelectedWordIds(prev => {
      const existingIds = new Set(standaloneWords.map(w => w.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      if (prev.size === 0 && excludedWordIds.size === 0) {
        standaloneWords.forEach(word => next.add(word.id));
      }
      return setsEqual(prev, next) ? prev : next;
    });
    setExcludedWordIds(prev => {
      const existingIds = new Set(standaloneWords.map(w => w.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      return setsEqual(prev, next) ? prev : next;
    });
  }, [excludedWordIds.size, standaloneWords]);

  const filteredAyahs = useMemo(() => {
    let ayahs = savedAyahs;
    if (tagFilter === "selected") ayahs = ayahs.filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id));
    if (ayahSearchQuery.trim()) {
      const q = ayahSearchQuery.toLowerCase();
      ayahs = ayahs.filter(ayah =>
        ayah.arabicText.includes(ayahSearchQuery) ||
        (ayah.translationText && ayah.translationText.toLowerCase().includes(q)) ||
        (ayah.surahName && ayah.surahName.toLowerCase().includes(q))
      );
    }
    return ayahs;
  }, [ayahSearchQuery, excludedAyahIds, savedAyahs, selectedAyahIds, tagFilter]);

  const filteredWords = useMemo(() => {
    let words = standaloneWords;
    if (tagFilter === "selected") words = words.filter(word => selectedWordIds.has(word.id) && !excludedWordIds.has(word.id));
    if (wordSearchQuery.trim()) {
      const q = wordSearchQuery.toLowerCase();
      words = words.filter(word =>
        word.arabic.includes(wordSearchQuery) ||
        (word.translation && word.translation.toLowerCase().includes(q)) ||
        (SURAH_DATA[word.surahNumber - 1]?.englishName || "").toLowerCase().includes(q)
      );
    }
    return words;
  }, [excludedWordIds, selectedWordIds, standaloneWords, tagFilter, wordSearchQuery]);

  const totalAyahPages = Math.max(1, Math.ceil(filteredAyahs.length / ITEMS_PER_PAGE));
  const totalWordPages = Math.max(1, Math.ceil(filteredWords.length / ITEMS_PER_PAGE));
  const pagedAyahs = useMemo(() => {
    const start = ayahPage * ITEMS_PER_PAGE;
    return filteredAyahs.slice(start, start + ITEMS_PER_PAGE);
  }, [ayahPage, filteredAyahs]);
  const pagedWords = useMemo(() => {
    const start = wordPage * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, wordPage]);

  const selectedAyahCount = useMemo(
    () => savedAyahs.filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id)).length,
    [excludedAyahIds, savedAyahs, selectedAyahIds]
  );
  const selectedStandaloneWordCount = useMemo(
    () => standaloneWords.filter(word => selectedWordIds.has(word.id) && !excludedWordIds.has(word.id)).length,
    [excludedWordIds, selectedWordIds, standaloneWords]
  );
  const selectedQuizWordPool = useMemo(() => {
    if (selectionMode === "by-words") {
      return standaloneWords.filter(word => selectedWordIds.has(word.id) && !excludedWordIds.has(word.id));
    }
    const selectedKeys = new Set(
      savedAyahs
        .filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id))
        .map(ayahKey)
    );
    return savedWords.filter(word => selectedKeys.has(`${word.surahNumber}:${word.ayahNumber}`));
  }, [excludedAyahIds, excludedWordIds, savedAyahs, savedWords, selectedAyahIds, selectedWordIds, selectionMode, standaloneWords]);
  const selectedItemCount = selectionMode === "by-ayah" ? selectedAyahCount : selectedStandaloneWordCount;

  const initQuiz = useCallback((words: SavedWord[]) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (words.length < 1) { setQuizState("no-words"); return; }
    const q = buildQuestions(words);
    if (q.length === 0) { setQuizState("no-words"); return; }
    setQuizWords(words);
    setQuestions(q);
    setCurrentIndex(0);
    setScore(0);
    setAnswers(q.map(() => null));
    setSelectedAnswer(null);
    setQuizState("answering");
  }, []);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const startQuiz = useCallback(() => {
    if (selectedQuizWordPool.length < 1) {
      Alert.alert(
        "Not enough selected words",
        selectionMode === "by-ayah"
          ? "Select an ayah with at least one saved word to start the test."
          : "Select at least one saved word to start the test."
      );
      return;
    }
    initQuiz(selectedQuizWordPool);
  }, [initQuiz, selectedQuizWordPool, selectionMode]);

  const viewAsCards = useCallback(() => {
    if (selectedQuizWordPool.length < 1) {
      Alert.alert(
        "No selected words",
        selectionMode === "by-ayah"
          ? "Select an ayah with at least one saved word to view cards."
          : "Select at least one saved word to view cards."
      );
      return;
    }
    setQuizWords(selectedQuizWordPool);
    setCardTab("active");
    setQuizState("cards");
  }, [selectedQuizWordPool, selectionMode]);

  const handleBack = useCallback(() => {
    if (quizState === "selection") {
      router.back();
      return;
    }
    setQuizState("selection");
    setQuestions([]);
    setSelectedAnswer(null);
  }, [quizState]);

  const toggleAyah = useCallback((id: string) => {
    const isSelected = selectedAyahIds.has(id);
    setSelectedAyahIds(prev => {
      const next = new Set(prev);
      if (isSelected) next.delete(id);
      else next.add(id);
      return next;
    });
    setExcludedAyahIds(prev => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [selectedAyahIds]);

  const toggleWord = useCallback((id: string) => {
    const isSelected = selectedWordIds.has(id);
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (isSelected) next.delete(id);
      else next.add(id);
      return next;
    });
    setExcludedWordIds(prev => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [selectedWordIds]);

  const handleSelectAll = useCallback(() => {
    if (selectionMode === "by-ayah") {
      const ids = filteredAyahs.map(a => a.id);
      setSelectedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    } else {
      const ids = filteredWords.map(w => w.id);
      setSelectedWordIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setExcludedWordIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    }
  }, [filteredAyahs, filteredWords, selectionMode]);

  const handleClearAll = useCallback(() => {
    if (selectionMode === "by-ayah") {
      const ids = filteredAyahs.map(a => a.id);
      setSelectedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    } else {
      const ids = filteredWords.map(w => w.id);
      setSelectedWordIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      setExcludedWordIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    }
  }, [filteredAyahs, filteredWords, selectionMode]);

  const handleAnswer = useCallback((idx: number) => {
    if (quizState !== "answering" || selectedAnswer !== null) return;
    const isCorrect = idx === questions[currentIndex].correctIndex;
    const nextScore = score + (isCorrect ? 1 : 0);
    setSelectedAnswer(idx);
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = idx;
      return next;
    });
    setQuizState("answered");
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(nextScore);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (currentIndex + 1 >= questions.length) {
        setQuizState("finished");
        recordQuizCompletion();
      } else {
        const nextIndex = currentIndex + 1;
        const nextAnswer = answers[nextIndex] ?? null;
        setCurrentIndex(nextIndex);
        setSelectedAnswer(nextAnswer);
        setQuizState(nextAnswer === null ? "answering" : "answered");
      }
    }, 900);
  }, [answers, currentIndex, questions, quizState, recordQuizCompletion, score, selectedAnswer]);

  const handleNext = useCallback(() => {
    if (selectedAnswer === null) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (currentIndex + 1 >= questions.length) {
      setQuizState("finished");
      recordQuizCompletion();
    } else {
      const nextIndex = currentIndex + 1;
      const nextAnswer = answers[nextIndex] ?? null;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(nextAnswer);
      setQuizState(nextAnswer === null ? "answering" : "answered");
    }
  }, [answers, currentIndex, questions.length, recordQuizCompletion, selectedAnswer]);

  const handlePrev = useCallback(() => {
    if (currentIndex === 0) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    const prevIndex = currentIndex - 1;
    const prevAnswer = answers[prevIndex] ?? null;
    setCurrentIndex(prevIndex);
    setSelectedAnswer(prevAnswer);
    setQuizState(prevAnswer === null ? "answering" : "answered");
  }, [answers, currentIndex]);

  const handleShare = useCallback(async () => {
    const wordList = quizWords
      .slice(0, 10)
      .map((w, i) => `${i + 1}. ${w.arabic} — ${w.translation}`)
      .join("\n");
    await Share.share({
      message: `📖 Quran Vocabulary Quiz — ${quizWords.length} words\n\nTest yourself on these words:\n${wordList}\n\nOpen Words Quiz and keep building your vocabulary in Al-Quran app!`,
      title: "Quran Vocabulary Quiz",
    });
  }, [quizWords]);

  const handleRemoveWordFromQuiz = useCallback((id: string) => {
    removeWord(id);
    setQuizWords(prev => prev.filter(word => word.id !== id));
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setExcludedWordIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [removeWord]);

  const handleToggleCardMemorized = useCallback((id: string) => {
    toggleWordMemorized(id);
    setQuizWords(prev => prev.map(word => (
      word.id === id ? { ...word, memorized: !word.memorized } : word
    )));
  }, [toggleWordMemorized]);

  const activeCardCount = useMemo(() => quizWords.filter(word => !word.memorized).length, [quizWords]);
  const memorizedCardCount = useMemo(() => quizWords.filter(word => !!word.memorized).length, [quizWords]);
  const visibleCardWords = useMemo(
    () => quizWords.filter(word => cardTab === "memorized" ? !!word.memorized : !word.memorized),
    [cardTab, quizWords]
  );

  if (savedWords.length < 1) {
    return <NoWordsScreen colors={colors} topPad={topPad} />;
  }

  if (quizState === "selection" || quizState === "no-words") {
    const showingAyahs = selectionMode === "by-ayah";
    const currentSearch = showingAyahs ? ayahSearchQuery : wordSearchQuery;
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.selectionPageHeader, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
          <View style={s.selectionHeaderTopRow}>
            <TouchableOpacity onPress={handleBack} style={s.circleBackBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color={colors.appText} />
            </TouchableOpacity>
            <Text style={[s.selectionModeLabelText, { color: colors.mutedForeground }]}>WORDS QUIZ</Text>
          </View>
          <Text style={[s.selectionPageTitle, { color: colors.foreground }]}>Select Words</Text>
        </View>

        <View style={s.selectionWrap}>
          <View style={s.segmentWrapper}>
            <View style={[s.segmentContainer, { borderColor: colors.border }]}>
              {([{ key: "by-ayah", label: "By Ayah" }, { key: "by-words", label: "By Words" }] as const).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.segmentBtn, selectionMode === item.key && s.segmentBtnActive]}
                  onPress={() => {
                    setSelectionMode(item.key);
                    setAyahPage(0);
                    setWordPage(0);
                    setAyahSearchQuery("");
                    setWordSearchQuery("");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.segmentText, selectionMode === item.key && s.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.searchWrapper}>
            <View style={[s.searchContainer, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[s.searchInput, { color: colors.foreground }]}
                placeholder={showingAyahs ? "Search ayahs..." : "Search words..."}
                placeholderTextColor={colors.mutedForeground}
                value={currentSearch}
                onChangeText={text => {
                  if (showingAyahs) {
                    setAyahSearchQuery(text);
                    setAyahPage(0);
                  } else {
                    setWordSearchQuery(text);
                    setWordPage(0);
                  }
                }}
              />
              {currentSearch ? (
                <TouchableOpacity
                  onPress={() => showingAyahs ? (setAyahSearchQuery(""), setAyahPage(0)) : (setWordSearchQuery(""), setWordPage(0))}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={s.tagRow2}>
            <View style={s.tagChipsRow}>
              {([{ key: "all", label: "All" }, { key: "selected", label: "Selected" }] as const).map(item => (
                <Tag
                  key={item.key}
                  label={item.label}
                  selected={tagFilter === item.key}
                  onPress={() => { setTagFilter(item.key); setAyahPage(0); setWordPage(0); }}
                />
              ))}
            </View>
            <View style={s.tagActions}>
              <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
                <Text style={[s.tagActionText, { color: colors.foreground }]}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                <Text style={[s.tagActionText, { color: colors.foreground }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.selectionContent2} showsVerticalScrollIndicator={false}>
            {showingAyahs ? (
              pagedAyahs.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#A8A29E" />
                  <Text style={s.infoText}>{ayahSearchQuery.trim() ? "No ayahs match your search." : tagFilter === "all" ? "No saved ayahs. Swipe left on any ayah while reading to save it here." : "No ayahs match this filter."}</Text>
                </View>
              ) : (
                pagedAyahs.map(ayah => {
                  const checked = selectedAyahIds.has(ayah.id);
                  const juz = SURAH_DATA[ayah.surahNumber - 1]?.juz ?? 1;
                  return (
                    <TouchableOpacity
                      key={ayah.id}
                      style={[s.ayahCard2, colors.cardStyle, checked && { borderColor: colors.appSelectedPill, backgroundColor: colors.appCardPressed }]}
                      onPress={() => toggleAyah(ayah.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.ayahBadge2, checked ? { backgroundColor: colors.appSelectedPill, borderColor: colors.appSelectedPill } : { backgroundColor: colors.appSoftPill, borderColor: colors.appSoftBorder }]}>
                        {checked && <Feather name="check" size={12} color={colors.appText} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.ayahCard2Header}>
                          <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>{ayah.surahName.toUpperCase()} · {ayah.ayahNumber}</Text>
                          <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>JUZ {juz}</Text>
                        </View>
                        <Text style={[s.ayahCard2Arabic, { color: colors.foreground }]}>{ayah.arabicText}</Text>
                        <Text style={[s.ayahCard2Translation, { color: colors.mutedForeground }]} numberOfLines={2}>{ayah.translationText || "No translation saved"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              pagedWords.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#A8A29E" />
                  <Text style={s.infoText}>{wordSearchQuery.trim() ? "No words match your search." : tagFilter === "all" ? "No standalone words saved yet. Long-press individual words while reading to save them here." : "No words match this filter."}</Text>
                </View>
              ) : (
                pagedWords.map(word => {
                  const checked = selectedWordIds.has(word.id);
                  const surahName = SURAH_DATA[word.surahNumber - 1]?.englishName ?? `Surah ${word.surahNumber}`;
                  return (
                    <TouchableOpacity
                      key={word.id}
                      style={[s.wordSelectCard, colors.cardStyle, checked && { borderColor: colors.appSelectedPill, backgroundColor: colors.appCardPressed }]}
                      onPress={() => toggleWord(word.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.ayahBadge2, checked ? { backgroundColor: colors.appSelectedPill, borderColor: colors.appSelectedPill } : { backgroundColor: colors.appSoftPill, borderColor: colors.appSoftBorder }]}>
                        {checked && <Feather name="check" size={12} color={colors.appText} />}
                      </View>
                      <View style={s.wordSelectInfo}>
                        <Text style={[s.wordSelectMeta, { color: colors.mutedForeground }]}>{surahName.toUpperCase()} · AYAH {word.ayahNumber}</Text>
                        <Text style={[s.wordSelectArabic, { color: colors.foreground }]}>{word.arabic}</Text>
                        <Text style={[s.wordSelectTranslation, { color: colors.mutedForeground }]} numberOfLines={1}>{word.translation || "No translation saved"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )
            )}
          </ScrollView>

          <View style={[s.startPanel2, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={s.startStats}>
              <Text style={[s.startStatText, { color: colors.mutedForeground }]}>
                {selectedItemCount} {showingAyahs ? `ayah${selectedItemCount !== 1 ? "s" : ""}` : `word${selectedItemCount !== 1 ? "s" : ""}`} selected
              </Text>
              <Text style={[s.startStatText, { color: colors.mutedForeground }]}>
                {selectedQuizWordPool.length} test word{selectedQuizWordPool.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {showingAyahs ? (
              <Pagination
                page={ayahPage}
                totalPages={totalAyahPages}
                totalItems={filteredAyahs.length}
                itemLabel="ayah"
                onPrev={() => setAyahPage(p => Math.max(0, p - 1))}
                onNext={() => setAyahPage(p => Math.min(totalAyahPages - 1, p + 1))}
              />
            ) : (
              <Pagination
                page={wordPage}
                totalPages={totalWordPages}
                totalItems={filteredWords.length}
                itemLabel="word"
                onPrev={() => setWordPage(p => Math.max(0, p - 1))}
                onNext={() => setWordPage(p => Math.min(totalWordPages - 1, p + 1))}
              />
            )}
            <TouchableOpacity
              style={[s.startBtn2, selectedQuizWordPool.length < 1 && s.startBtn2Disabled]}
              onPress={startQuiz}
              activeOpacity={0.85}
              disabled={selectedQuizWordPool.length < 1}
            >
              <Text style={s.startBtnText2}>Start the Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.viewCardsBtn, selectedQuizWordPool.length < 1 && s.startBtn2Disabled]}
              onPress={viewAsCards}
              activeOpacity={0.85}
              disabled={selectedQuizWordPool.length < 1}
            >
              <Text style={[s.viewCardsBtnText, { color: colors.foreground }]}>Practice with Cards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (quizState === "cards") {
    return (
      <View style={[s.container, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.appText} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.cardsHeaderTitle}>Word Cards</Text>
            <Text style={s.headerSub}>{quizWords.length} selected</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={[s.cardTabsWrap, { backgroundColor: colors.background }]}>
          <View style={[s.cardTabs, { backgroundColor: colors.appSoftPill }]}>
            <TouchableOpacity
              style={[
                s.cardTabPill,
                cardTab === "active" && { backgroundColor: colors.appSelectedPill, borderWidth: 1, borderColor: colors.appSelectedPill },
              ]}
              onPress={() => setCardTab("active")}
              activeOpacity={0.8}
            >
              <Text style={[s.cardTabText, { color: cardTab === "active" ? colors.appText : colors.appIconMuted }]}>
                <Text style={{ fontFamily: cardTab === "active" ? "Inter_600SemiBold" : "Inter_400Regular" }}>Active</Text>
                <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${activeCardCount})`}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.cardTabPill,
                cardTab === "memorized" && { backgroundColor: colors.appSelectedPill, borderWidth: 1, borderColor: colors.appSelectedPill },
              ]}
              onPress={() => setCardTab("memorized")}
              activeOpacity={0.8}
            >
              <Text style={[s.cardTabText, { color: cardTab === "memorized" ? colors.appText : colors.appIconMuted }]}>
                <Text style={{ fontFamily: cardTab === "memorized" ? "Inter_600SemiBold" : "Inter_400Regular" }}>Memorized</Text>
                <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${memorizedCardCount})`}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={visibleCardWords}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WordReviewCard
              word={item}
              onToggleMemorized={() => handleToggleCardMemorized(item.id)}
            />
          )}
          contentContainerStyle={s.reviewCardsContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.cardEmpty}>
              <Text style={[s.cardEmptyTitle, { color: colors.foreground }]}>
                {cardTab === "memorized" ? "No memorized words yet" : "No active words"}
              </Text>
              <Text style={[s.cardEmptySubtitle, { color: colors.mutedForeground }]}>
                {cardTab === "memorized"
                  ? "Tap the check mark on any word to mark it as memorized"
                  : "Memorized words appear in the other tab"}
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  if (quizState === "finished" || !currentQ) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.appText} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Results</Text>
          <TouchableOpacity onPress={handleShare} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="share-2" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={s.resultsContent}>
          <View style={[s.scoreCircle, { borderColor: percentage >= 70 ? colors.primary : colors.accent }]}>
            <Text style={s.scoreNumber}>{percentage}%</Text>
            <Text style={s.scoreLabel}>Score</Text>
          </View>
          <Text style={s.resultsTitle}>
            {percentage >= 90 ? "Excellent!" : percentage >= 70 ? "Well Done!" : "Keep Practicing!"}
          </Text>
          <Text style={s.resultsSub}>{score} out of {questions.length} correct</Text>
          <View style={s.resultActions}>
            <TouchableOpacity style={s.retryBtn} onPress={() => initQuiz(quizWords)} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn} onPress={handleBack} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Change Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{currentIndex + 1} / {questions.length}</Text>
        <TouchableOpacity onPress={() => setWordsManagerVisible(true)} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="list" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={s.quizProgressBar}>
        <View style={[s.quizProgressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <View style={s.questionNavRowTop}>
        <QuestionNav
          canGoPrev={currentIndex > 0}
          canGoNext={selectedAnswer !== null}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </View>

      <ScrollView contentContainerStyle={s.quizContent} showsVerticalScrollIndicator={false}>
        <View style={s.questionCard}>
          <Text style={s.questionPrompt}>What does this word mean?</Text>
          <Text style={s.arabicQuestion}>{currentQ.word.arabic}</Text>
          <Text style={s.questionSub}>
            {SURAH_DATA[currentQ.word.surahNumber - 1]?.englishName ?? `Surah ${currentQ.word.surahNumber}`} • Ayah {currentQ.word.ayahNumber}
          </Text>
        </View>

        <View style={s.optionsGrid}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentQ.correctIndex;
            const showResult = quizState === "answered";

            let bgColor = colors.card;
            let borderColor = colors.border;
            let textColor = colors.foreground;

            if (showResult) {
              if (isCorrect) { bgColor = colors.primary; borderColor = colors.primary; textColor = colors.primaryForeground; }
              else if (isSelected) { bgColor = "#FFF0F0"; borderColor = colors.destructive; textColor = colors.destructive; }
            } else if (isSelected) {
              bgColor = colors.secondary; borderColor = colors.primary;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[s.optionBtn, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleAnswer(idx)}
                activeOpacity={0.8}
                disabled={quizState === "answered"}
              >
                <View style={s.optionInner}>
                  <Text style={[
                    s.optionText,
                    { color: textColor },
                  ]}>
                    {option.text}
                  </Text>
                </View>
                {showResult && isCorrect && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primaryForeground} />
                )}
                {showResult && isSelected && !isCorrect && (
                  <Ionicons name="close-circle" size={18} color={colors.destructive} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <WordsManagerModal
        visible={wordsManagerVisible}
        words={quizWords}
        onRemove={handleRemoveWordFromQuiz}
        onClose={() => setWordsManagerVisible(false)}
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
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 8, width: 38 },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    cardsHeaderTitle: { textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    quizProgressBar: { height: 3, backgroundColor: colors.border },
    quizProgressFill: { height: "100%", backgroundColor: colors.primary },
      quizContent: { padding: 8, gap: 8, paddingBottom: 16, flexGrow: 1 },
    questionPrompt: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
    questionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
 modeBadge: {
   flexDirection: "row",
   alignItems: "center",
   gap: 4,
   backgroundColor: colors.secondary,
   paddingHorizontal: 10,
   paddingVertical: 3,
   borderRadius: 16,
   marginBottom: 12,
 },
    modeBadgeText: { fontSize: 12, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    arabicQuestion: {
      fontSize: 42,
      color: colors.foreground,
      fontFamily: "System",
      textAlign: "center",
      lineHeight: 60,
      marginBottom: 12,
    },
    questionSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fillBlankContainer: { alignItems: "center", gap: 12, width: "100%" },
    fillBlankContext: { alignItems: "center" },
    fillBlankContextLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fillBlankVerse: {
      fontSize: 22,
      lineHeight: 44,
      textAlign: "right",
      writingDirection: "rtl",
      color: colors.foreground,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      width: "100%",
    },
    fillBlankNoVerse: { alignItems: "center", gap: 8 },
    fillBlankPromptLabel: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fillBlankArabicHint: { fontSize: 28, color: colors.primary, fontFamily: "System" },
    fillBlankArrow: { fontSize: 18, color: colors.primary },
    fillBlankBlankLine: { fontSize: 18, color: colors.mutedForeground, letterSpacing: 4, fontFamily: "Inter_400Regular" },
    fillBlankInstruct: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" },
 optionsGrid: { gap: 6 },
 optionBtn: {
   flexDirection: "row",
   alignItems: "center",
   justifyContent: "space-between",
   padding: 12,
   borderRadius: 12,
   borderWidth: 1,
 },
 optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
 optionTextArabic: { fontSize: 18, fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "center" },
 wordMeaning: {
   fontSize: 16,
   color: colors.mutedForeground,
   fontFamily: "Inter_400Regular",
   textAlign: "center",
   marginBottom: 6,
   fontStyle: "italic",
 },
 optionInner: {
   flex: 1,
   gap: 3,
   alignItems: "center",
 },
 optionBtnFillBlank: {
   paddingVertical: 14,
   alignItems: "center",
 },
 optionWordTrans: {
   fontSize: 12,
   fontFamily: "Inter_400Regular",
   textAlign: "center",
   opacity: 0.75,
 },
    feedbackRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    removeWordBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.destructive,
    },
    removeWordBtnText: { fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular" },
    questionNavRowTop: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
    resultsContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
    scoreCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 6, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    scoreNumber: { fontSize: 40, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    scoreLabel: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    resultsTitle: { fontSize: 26, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    resultsSub: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    resultActions: { width: "100%", gap: 12, marginTop: 8 },
    retryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, padding: 16, borderRadius: 14 },
    retryBtnText: { fontSize: 16, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    doneBtn: { alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    doneBtnText: { fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular" },
    selectionPageHeader: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    selectionHeaderTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
    },
    circleBackBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    selectionModeLabelText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
    },
    selectionPageTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      lineHeight: 34,
    },
    selectionWrap: { flex: 1, flexDirection: "column" },
    segmentWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    segmentContainer: {
      flexDirection: "row",
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
    },
    segmentBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      backgroundColor: "transparent",
    },
    segmentBtnActive: { backgroundColor: "#1A1A1A" },
    segmentText: { fontSize: 14, color: "#78716C", fontFamily: "Inter_700Bold" },
    segmentTextActive: { color: "#FFFFFF" },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      padding: 0,
    },
    tagRow2: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    tagChipsRow: { flexDirection: "row", gap: 8 },
    tagActions: { flexDirection: "row", gap: 10, alignItems: "center" },
    tagActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
    infoBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.secondary,
      borderRadius: 14,
      padding: 14,
      alignItems: "flex-start",
    },
    infoText: { flex: 1, fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    selectionContent2: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    ayahCard2: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      marginBottom: 8,
      alignItems: "flex-start",
    },
    ayahBadge2: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      flexShrink: 0,
    },
    ayahCard2Header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    ayahCard2Meta: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    ayahCard2Arabic: {
      fontSize: 18,
      lineHeight: 30,
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      marginBottom: 6,
    },
    ayahCard2Translation: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
    wordSelectCard: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      marginBottom: 8,
      alignItems: "center",
    },
    wordSelectInfo: { flex: 1, gap: 3 },
    wordSelectMeta: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    wordSelectArabic: {
      fontSize: 24,
      lineHeight: 34,
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    wordSelectTranslation: { fontSize: 13, fontFamily: "Inter_400Regular" },
    startPanel2: {
      borderTopWidth: 1,
      padding: 16,
      paddingTop: 12,
      gap: 8,
    },
    startStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    startStatText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    startBtn2: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1A1A1A",
      borderRadius: 14,
      paddingVertical: 16,
    },
    startBtn2Disabled: { opacity: 0.45 },
    startBtnText2: { fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    viewCardsBtn: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    viewCardsBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
    reviewCardsContent: { padding: 16, paddingBottom: 80, gap: 10 },
    cardTabsWrap: { paddingHorizontal: 16, paddingBottom: 10 },
    cardTabs: {
      flexDirection: "row",
      borderRadius: 999,
      height: 44,
      padding: 2,
    },
    cardTabPill: {
      flex: 1,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTabText: {
      fontSize: 14,
      textAlign: "center",
    },
    cardEmpty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
    cardEmptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
    cardEmptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
    noWordsContent: { padding: 24, gap: 20, alignItems: "center", paddingBottom: 40 },
    emptySelectionContent: { flex: 1, padding: 24, gap: 16, alignItems: "center", justifyContent: "center" },
    emptySelectionText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
      lineHeight: 24,
    },
    noWordsGraphic: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      width: "100%",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 12,
    },
    graphicSurahMock: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      width: "100%",
      borderWidth: 1,
      borderColor: colors.border,
    },
    graphicAyahRow: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
    graphicWordChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, position: "relative" },
    graphicWordHighlight: { backgroundColor: colors.primary },
    graphicArabicWord: { fontSize: 18, color: colors.foreground, fontFamily: "System" },
    longPressHint: {
      position: "absolute",
      bottom: -18,
      alignSelf: "center",
      backgroundColor: colors.foreground,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    longPressHintText: { fontSize: 12, color: colors.card, fontFamily: "Inter_600SemiBold" },
    graphicPopup: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      alignItems: "center",
      width: "80%",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    graphicPopupArabic: { fontSize: 22, color: colors.primary, fontFamily: "System" },
    graphicPopupTrans: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    graphicSaveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      marginTop: 4,
    },
    graphicSaveBtnText: { fontSize: 13, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    noWordsTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" },
    noWordsSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    howToCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    howToStep: { flexDirection: "row", alignItems: "center", gap: 12 },
    howToNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    howToNumText: { fontSize: 13, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    howToIcon: { marginRight: 2 },
    howToText: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    goReadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, width: "100%" },
    goReadBtnText: { fontSize: 16, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    wordsManagerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    wordManagerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    wordManagerInfo: { flex: 1 },
    wordManagerArabic: { fontSize: 20, color: colors.primary, fontFamily: "System" },
    wordManagerTrans: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", marginTop: 2 },
    wordManagerMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    wordManagerEmpty: { padding: 40, alignItems: "center" },
    wmSwipeHintRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8 },
    wmSwipeHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
    wordManagerEmptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    // WordsManagerModal new styles
    wmSearchWrapper: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
    wmSearchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    wmSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
    wmActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    wmActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    wmActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
    wmDeleteBtn: { padding: 5, borderRadius: 7 },
    wmCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      flexShrink: 0,
    },
    wmCheckboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  });
