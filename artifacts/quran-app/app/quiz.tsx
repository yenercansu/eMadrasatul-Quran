import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord } from "@/contexts/QuranContext";

type QuizMode = "word-meaning" | "fill-blank";
type QuizState = "idle" | "answering" | "answered" | "finished";

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
  const translations = words.map((w) => w.translation);
  return shuffle(words.slice(0, 10)).map((word) => {
    const others = shuffle(translations.filter((t) => t !== word.translation)).slice(0, 3);
    const options = shuffle([word.translation, ...others]);
    const correctIndex = options.indexOf(word.translation);
    const mode: QuizMode = Math.random() > 0.5 ? "word-meaning" : "fill-blank";
    return { word, options, correctIndex, mode };
  });
}

export default function QuizScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedWords } = useQuran();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("idle");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const startQuiz = useCallback(() => {
    const q = generateQuestions(savedWords);
    if (q.length === 0) {
      Alert.alert("Not enough words", "Save at least 2 words to your library to start a quiz.");
      return;
    }
    setQuestions(q);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setQuizState("answering");
  }, [savedWords]);

  const handleAnswer = useCallback((idx: number) => {
    if (quizState !== "answering") return;
    setSelectedAnswer(idx);
    setQuizState("answered");
    const isCorrect = idx === questions[currentIndex].correctIndex;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((prev) => prev + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [quizState, questions, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setQuizState("finished");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setQuizState("answering");
    }
  }, [currentIndex, questions.length]);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  if (quizState === "idle") {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Vocabulary Quiz</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={s.idleContent}>
          <View style={s.idleIcon}>
            <Ionicons name="game-controller" size={48} color={colors.primaryForeground} />
          </View>
          <Text style={s.idleTitle}>Test Your Knowledge</Text>
          <Text style={s.idleSub}>
            {savedWords.length} words in your library ready for review
          </Text>
          <View style={s.modesInfo}>
            <View style={s.modeRow}>
              <Ionicons name="help-circle" size={20} color={colors.primary} />
              <Text style={s.modeText}>Word meaning questions</Text>
            </View>
            <View style={s.modeRow}>
              <Ionicons name="text" size={20} color={colors.primary} />
              <Text style={s.modeText}>Fill in the blank from the ayah</Text>
            </View>
          </View>
          <TouchableOpacity style={s.startBtn} onPress={startQuiz} activeOpacity={0.85}>
            <Text style={s.startBtnText}>Start Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (quizState === "finished") {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
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
          <Text style={s.resultsSub}>
            {score} out of {questions.length} correct
          </Text>
          <View style={s.resultActions}>
            <TouchableOpacity style={s.retryBtn} onPress={startQuiz} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
              <Text style={s.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Back to Library</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!currentQ) return null;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <View style={s.scoreTag}>
          <Text style={s.scoreTagText}>{score}</Text>
        </View>
      </View>

      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.quizContent}>
        <Text style={s.modeLabel}>
          {currentQ.mode === "word-meaning" ? "What does this word mean?" : "Select the correct word"}
        </Text>

        <View style={s.questionCard}>
          <Text style={s.questionArabic}>{currentQ.word.arabic}</Text>
          {currentQ.mode === "fill-blank" && (
            <Text style={s.questionContext}>
              Surah {currentQ.word.surahNumber} • Ayah {currentQ.word.ayahNumber}
            </Text>
          )}
        </View>

        <View style={s.options}>
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentQ.correctIndex;
            const showResult = quizState === "answered";

            let bgColor = colors.card;
            let borderColor = colors.border;
            let textColor = colors.foreground;

            if (showResult) {
              if (isCorrect) {
                bgColor = colors.secondary;
                borderColor = colors.primary;
                textColor = colors.primary;
              } else if (isSelected && !isCorrect) {
                bgColor = "#FFF0F0";
                borderColor = colors.destructive;
                textColor = colors.destructive;
              }
            } else if (isSelected) {
              bgColor = colors.secondary;
              borderColor = colors.primary;
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[s.option, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleAnswer(idx)}
                activeOpacity={0.85}
                disabled={quizState === "answered"}
              >
                <Text style={[s.optionText, { color: textColor }]}>{option}</Text>
                {showResult && isCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
                {showResult && isSelected && !isCorrect && (
                  <Ionicons name="close-circle" size={20} color={colors.destructive} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {quizState === "answered" && (
          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>
              {currentIndex + 1 >= questions.length ? "See Results" : "Next Question"}
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4, width: 38 },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    scoreTag: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      minWidth: 38,
      alignItems: "center",
    },
    scoreTagText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    progressBar: {
      height: 3,
      backgroundColor: colors.border,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
    },
    quizContent: { padding: 20, gap: 20 },
    modeLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    questionCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionArabic: {
      fontSize: 42,
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 64,
    },
    questionContext: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 8,
    },
    options: { gap: 10 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
    },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 14,
    },
    nextBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    idleContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 16,
    },
    idleIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    idleTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    idleSub: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    modesInfo: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      width: "100%",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    modeText: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    startBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 40,
      paddingVertical: 16,
      borderRadius: 14,
      width: "100%",
      alignItems: "center",
    },
    startBtnText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    resultsContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 16,
    },
    scoreCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 6,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    scoreNumber: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    scoreLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    resultsTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    resultsSub: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    resultActions: {
      width: "100%",
      gap: 12,
      marginTop: 8,
    },
    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 14,
    },
    retryBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    doneBtn: {
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    doneBtnText: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
  });
