import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord } from "@/contexts/QuranContext";

type QuizMode = "word-meaning" | "fill-blank";
type QuizState = "answering" | "answered" | "finished" | "no-words";

interface QuizQuestion {
  word: SavedWord;
  options: string[];
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

function generateQuestions(words: SavedWord[]): QuizQuestion[] {
  if (words.length < 2) return [];
  const translations = words.map(w => w.translation);
  return shuffle(words.slice(0, 10)).map(word => {
    const others = shuffle(translations.filter(t => t !== word.translation)).slice(0, 3);
    const options = shuffle([word.translation, ...others]);
    const correctIndex = options.indexOf(word.translation);
    const mode: QuizMode = Math.random() > 0.5 ? "word-meaning" : "fill-blank";
    return { word, options, correctIndex, mode };
  });
}

function NoWordsScreen({ colors, insets, topPad }: { colors: ReturnType<typeof useColors>; insets: any; topPad: number }) {
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
          <View style={s.graphicStep}>
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
            <View style={s.graphicArrow}>
              <Feather name="arrow-down" size={20} color={colors.primary} />
            </View>
            <View style={s.graphicPopup}>
              <Text style={s.graphicPopupArabic}>اللَّهِ</Text>
              <Text style={s.graphicPopupTrans}>Allah / God</Text>
              <View style={s.graphicSaveBtn}>
                <Ionicons name="bookmark-outline" size={14} color={colors.primaryForeground} />
                <Text style={s.graphicSaveBtnText}>Save to Library</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={s.noWordsTitle}>Build Your Vocabulary</Text>
        <Text style={s.noWordsSub}>Save words while reading to quiz yourself on their meanings</Text>

        <View style={s.howToCard}>
          {[
            { num: "1", icon: "book-open" as const, text: "Open any Surah from the Quran tab" },
            { num: "2", icon: "hand" as const, text: "Long-press on any Arabic word" },
            { num: "3", icon: "bookmark" as const, text: "Tap \"Save to Library\" in the popup" },
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

        <TouchableOpacity
          style={s.goReadBtn}
          onPress={() => router.replace("/(tabs)/quran")}
          activeOpacity={0.85}
        >
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
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: Platform.OS === "web" ? 67 : 44 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Manage Words</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={s.wordsManagerSub}>{words.length} words in quiz pool — tap × to remove</Text>
        <FlatList
          data={words}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={s.wordManagerRow}>
              <View style={s.wordManagerInfo}>
                <Text style={s.wordManagerArabic}>{item.arabic}</Text>
                <Text style={s.wordManagerTrans}>{item.translation}</Text>
                <Text style={s.wordManagerMeta}>Surah {item.surahNumber} : {item.ayahNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onRemove(item.id)}
                style={s.wordManagerRemove}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.wordManagerEmpty}>
              <Text style={s.wordManagerEmptyText}>No words left — go read and save some!</Text>
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
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("answering");
  const [wordsManagerVisible, setWordsManagerVisible] = useState(false);

  const initQuiz = useCallback((words: SavedWord[]) => {
    const q = generateQuestions(words);
    if (q.length === 0) {
      setQuizState("no-words");
      return;
    }
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
    // Rebuild questions without this word
    const remaining = savedWords.filter(w => w.id !== word.id);
    const newQ = generateQuestions(remaining);
    if (newQ.length === 0) {
      setQuizState("no-words");
      return;
    }
    setQuestions(newQ);
    const newIdx = Math.min(currentIndex, newQ.length - 1);
    setCurrentIndex(newIdx);
    setSelectedAnswer(null);
    setQuizState("answering");
  }, [questions, currentIndex, savedWords, removeWord]);

  if (quizState === "no-words" || savedWords.length < 2) {
    return <NoWordsScreen colors={colors} insets={insets} topPad={topPad} />;
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
          <View style={{ width: 38 }} />
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

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {currentIndex + 1} / {questions.length}
        </Text>
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
              name={isWordMeaning ? "help-circle" : "text"}
              size={14}
              color={colors.primary}
            />
            <Text style={s.modeBadgeText}>
              {isWordMeaning ? "What does this mean?" : "Fill in the blank"}
            </Text>
          </View>

          {isWordMeaning ? (
            <Text style={s.arabicQuestion}>{currentQ.word.arabic}</Text>
          ) : (
            <View style={s.fillBlankContainer}>
              <Text style={s.fillBlankContext}>
                Surah {currentQ.word.surahNumber}, Ayah {currentQ.word.ayahNumber}
              </Text>
              <Text style={s.fillBlankPrompt}>
                {"___"} means: <Text style={s.fillBlankArabic}>{currentQ.word.arabic}</Text>
              </Text>
            </View>
          )}

          <Text style={s.questionSub}>Surah {currentQ.word.surahNumber} • Ayah {currentQ.word.ayahNumber}</Text>
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
                <Text style={[s.optionText, { color: textColor }]}>{option}</Text>
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
          <View style={s.feedbackRow}>
            <TouchableOpacity
              style={s.removeWordBtn}
              onPress={handleRemoveAndSkip}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={15} color={colors.destructive} />
              <Text style={s.removeWordBtnText}>Remove word</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>
                {currentIndex + 1 >= questions.length ? "See Results" : "Next"}
              </Text>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
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
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 8, width: 38 },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    quizProgressBar: { height: 3, backgroundColor: colors.border },
    quizProgressFill: { height: "100%", backgroundColor: colors.primary },
    quizContent: { padding: 16, gap: 16, paddingBottom: 40 },
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
      gap: 6,
      backgroundColor: colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      marginBottom: 20,
    },
    modeBadgeText: {
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    arabicQuestion: {
      fontSize: 42,
      color: colors.foreground,
      fontFamily: "System",
      textAlign: "center",
      lineHeight: 60,
      marginBottom: 12,
    },
    fillBlankContainer: { alignItems: "center", marginBottom: 12 },
    fillBlankContext: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 },
    fillBlankPrompt: { fontSize: 20, color: colors.foreground, fontFamily: "Inter_400Regular", textAlign: "center" },
    fillBlankArabic: { fontSize: 24, color: colors.primary, fontFamily: "System" },
    questionSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    optionsGrid: { gap: 10 },
    optionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    optionText: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
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
    },
    graphicStep: { alignItems: "center", gap: 12, width: "100%" },
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
    graphicArrow: { marginVertical: 4 },
    graphicPopup: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      alignItems: "center",
      width: "80%",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
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
    wordsManagerSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
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
    wordManagerRemove: { padding: 10, borderRadius: 10, backgroundColor: "#FFF0F0" },
    wordManagerEmpty: { padding: 40, alignItems: "center" },
    wordManagerEmptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
