import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { SwipeableRow } from "@/components/SwipeableRow";

type QuizMode = "word-meaning" | "fill-blank";
type QuizState = "loading" | "answering" | "answered" | "finished" | "no-words";

interface QuizOption {
  text: string;
  wordTranslation?: string; // per-option word-level translation (fill-blank mode)
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

function buildQuestions(words: SavedWord[]): QuizQuestion[] {
  if (words.length < 2) return [];

  const wordsWithTranslation = words.filter(w => w.translation && w.translation.trim().length > 0);
  const selectedWords = shuffle(words).slice(0, 10);

  // Build a lookup so fill-blank option buttons can show per-word translations
  const arabicToTranslation = new Map<string, string>(
    words.map(w => [w.arabic, w.translation])
  );

  let wordMeaningToggle = true;

  return selectedWords.map((word) => {
    const hasTranslation = word.translation && word.translation.trim().length > 0;
    const canDoWordMeaning = hasTranslation && wordsWithTranslation.length >= 2;

    let mode: QuizMode;
    if (!canDoWordMeaning) {
      mode = "fill-blank";
    } else {
      mode = wordMeaningToggle ? "word-meaning" : "fill-blank";
      wordMeaningToggle = !wordMeaningToggle;
    }

    if (mode === "word-meaning") {
      // Options are English translations — no wordTranslation needed on option
      const otherTranslations = shuffle(
        wordsWithTranslation
          .filter(w => w.translation !== word.translation)
          .map(w => w.translation)
      ).slice(0, 3);
      while (otherTranslations.length < 3) {
        otherTranslations.push("Unknown meaning");
      }
      const rawOptions = shuffle([word.translation, ...otherTranslations]);
      const options: QuizOption[] = rawOptions.map(t => ({ text: t }));
      const correctIndex = options.findIndex(o => o.text === word.translation);
      return { word, options, correctIndex, mode };
    } else {
      // Options are Arabic words — attach their word-level translations
      const otherArabics = shuffle(
        words.filter(w => w.arabic !== word.arabic).map(w => w.arabic)
      ).slice(0, 3);
      while (otherArabics.length < 3) {
        otherArabics.push("ـ");
      }
      const rawOptions = shuffle([word.arabic, ...otherArabics]);
      const options: QuizOption[] = rawOptions.map(a => ({
        text: a,
        wordTranslation: arabicToTranslation.get(a) ?? "",
      }));
      const correctIndex = options.findIndex(o => o.text === word.arabic);
      return { word, options, correctIndex, mode };
    }
  });
}

function NoWordsScreen({ colors, topPad }: { colors: ReturnType<typeof useColors>; topPad: number }) {
  const s = styles(colors);
  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
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
              <View style={s.howToNum}>
                <Text style={s.howToNumText}>{step.num}</Text>
              </View>
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
  const { savedWords, removeWord } = useQuran();
  const topPad = insets.top;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [wordsManagerVisible, setWordsManagerVisible] = useState(false);

  const initQuiz = useCallback((words: SavedWord[]) => {
    if (words.length < 2) { setQuizState("no-words"); return; }
    const q = buildQuestions(words);
    if (q.length === 0) { setQuizState("no-words"); return; }
    setQuestions(q);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setQuizState("answering");
  }, []);

  useEffect(() => {
    initQuiz(savedWords);
  }, []);

  const handleAnswer = useCallback((idx: number) => {
    if (quizState !== "answering") return;
    setSelectedAnswer(idx);
    setQuizState("answered");
    const isCorrect = idx === questions[currentIndex].correctIndex;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(prev => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [quizState, questions, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setQuizState("finished");
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuizState("answering");
    }
  }, [currentIndex, questions.length]);

  const handleRemoveAndSkip = useCallback(() => {
    const word = questions[currentIndex]?.word;
    if (!word) return;
    removeWord(word.id);
    const remaining = savedWords.filter(w => w.id !== word.id);
    initQuiz(remaining);
  }, [questions, currentIndex, savedWords, removeWord]);

  const handleShare = useCallback(async () => {
    const wordList = savedWords
      .slice(0, 10)
      .map((w, i) => `${i + 1}. ${w.arabic} — ${w.translation}`)
      .join("\n");
    const surahName = SURAH_DATA[savedWords[0]?.surahNumber - 1]?.englishName ?? "Al-Faatiha";
    await Share.share({
      message: `📖 Quran Vocabulary Quiz — ${savedWords.length} words\n\nTest yourself on these words:\n${wordList}\n\nStart with Surah ${surahName} and explore more words in Al-Quran app!`,
      title: "Quran Vocabulary Quiz",
    });
  }, [savedWords]);

  if (quizState === "loading") {
    return (
      <View style={[s.container, { paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ marginTop: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          Preparing your quiz...
        </Text>
      </View>
    );
  }

  if (quizState === "no-words" || savedWords.length < 2) {
    return <NoWordsScreen colors={colors} topPad={topPad} />;
  }

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  if (quizState === "finished" || !currentQ) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
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
            <TouchableOpacity style={s.retryBtn} onPress={() => initQuiz(savedWords)} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const isWordMeaning = currentQ.mode === "word-meaning";
  const isFillBlank = currentQ.mode === "fill-blank";

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{currentIndex + 1} / {questions.length}</Text>
        <TouchableOpacity onPress={() => setWordsManagerVisible(true)} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="list" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={s.quizProgressBar}>
        <View style={[s.quizProgressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <ScrollView contentContainerStyle={s.quizContent} showsVerticalScrollIndicator={false}>
        <View style={s.questionCard}>
          <View style={s.modeBadge}>
            <Ionicons
              name={isWordMeaning ? "help-circle" : "book-outline"}
              size={14}
              color={colors.primary}
            />
            <Text style={s.modeBadgeText}>
              {isWordMeaning ? "What does this word mean?" : "Fill in the blank"}
            </Text>
          </View>

          {/* Word card: Arabic large, English meaning below — same layout for both modes */}
          <Text style={s.arabicQuestion}>{currentQ.word.arabic}</Text>
          {isWordMeaning ? (
            <Text style={s.questionSub}>
              {SURAH_DATA[currentQ.word.surahNumber - 1]?.englishName ?? `Surah ${currentQ.word.surahNumber}`} • Ayah {currentQ.word.ayahNumber}
            </Text>
          ) : (
            <>
              {currentQ.word.translation ? (
                <Text style={s.wordMeaning}>{currentQ.word.translation}</Text>
              ) : null}
              <Text style={s.questionSub}>
                {SURAH_DATA[currentQ.word.surahNumber - 1]?.englishName ?? `Surah ${currentQ.word.surahNumber}`} • Ayah {currentQ.word.ayahNumber}
              </Text>
              <Text style={s.fillBlankInstruct}>Select the matching Arabic word</Text>
            </>
          )}
        </View>

        <View style={s.optionsGrid}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentQ.correctIndex;
            const showResult = quizState === "answered";

            let bgColor = colors.card;
            let borderColor = colors.border;
            let textColor = colors.foreground;
            let subColor = colors.mutedForeground;

            if (showResult) {
              if (isCorrect) { bgColor = colors.primary; borderColor = colors.primary; textColor = colors.primaryForeground; subColor = "rgba(255,255,255,0.75)"; }
              else if (isSelected) { bgColor = "#FFF0F0"; borderColor = colors.destructive; textColor = colors.destructive; }
            } else if (isSelected) {
              bgColor = colors.secondary; borderColor = colors.primary;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[s.optionBtn, { backgroundColor: bgColor, borderColor }, isFillBlank && s.optionBtnFillBlank]}
                onPress={() => handleAnswer(idx)}
                activeOpacity={0.8}
                disabled={quizState === "answered"}
              >
                <View style={s.optionInner}>
                  <Text style={[
                    isFillBlank ? s.optionTextArabic : s.optionText,
                    { color: textColor },
                  ]}>
                    {option.text}
                  </Text>
                  {/* Word-level translation shown on Arabic options in fill-blank mode */}
                  {isFillBlank && option.wordTranslation ? (
                    <Text style={[s.optionWordTrans, { color: subColor }]} numberOfLines={1}>
                      {option.wordTranslation}
                    </Text>
                  ) : null}
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

        {quizState === "answered" && (
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>
              {currentIndex + 1 >= questions.length ? "See Results" : "Next"}
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <WordsManagerModal
        visible={wordsManagerVisible}
        words={savedWords}
        onRemove={removeWord}
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
    headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    quizProgressBar: { height: 3, backgroundColor: colors.border },
    quizProgressFill: { height: "100%", backgroundColor: colors.primary },
      quizContent: { padding: 8, gap: 8, paddingBottom: 16, flexGrow: 1 },
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
    nextBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 14,
    },
    nextBtnText: { fontSize: 16, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
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
    noWordsContent: { padding: 24, gap: 20, alignItems: "center", paddingBottom: 40 },
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
    longPressHintText: { fontSize: 9, color: colors.card, fontFamily: "Inter_600SemiBold" },
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
    wordManagerMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    wordManagerEmpty: { padding: 40, alignItems: "center" },
    wmSwipeHintRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8 },
    wmSwipeHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
