import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  PanResponder,
  LayoutRectangle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";

const DEFAULT_SURAHS: { number: number; name: string; englishName: string; ayahs: string[] }[] = [
  {
    number: 1, name: "الفاتحة", englishName: "Al-Faatiha",
    ayahs: [
      "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      "الرَّحْمَٰنِ الرَّحِيمِ",
      "مَالِكِ يَوْمِ الدِّينِ",
      "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    ],
  },
  {
    number: 112, name: "الإخلاص", englishName: "Al-Ikhlaas",
    ayahs: [
      "قُلْ هُوَ اللَّهُ أَحَدٌ",
      "اللَّهُ الصَّمَدُ",
      "لَمْ يَلِدْ وَلَمْ يُولَدْ",
      "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
    ],
  },
  {
    number: 113, name: "الفلق", englishName: "Al-Falaq",
    ayahs: [
      "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
      "مِن شَرِّ مَا خَلَقَ",
      "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
      "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
      "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    ],
  },
  {
    number: 114, name: "الناس", englishName: "An-Naas",
    ayahs: [
      "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
      "مَلِكِ النَّاسِ",
      "إِلَٰهِ النَّاسِ",
      "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
      "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ",
      "مِنَ الْجِنَّةِ وَالنَّاسِ",
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], count: number, exclude: T[] = []): T[] {
  const pool = arr.filter(x => !exclude.includes(x));
  return shuffle(pool).slice(0, count);
}

interface FollowUpQuestion {
  type: "follow-up";
  questionAyah: string;
  surahName: string;
  asks: "after" | "before";
  correctAnswer: string;
  options: string[];
}

interface FillBlankQuestion {
  type: "fill-blank";
  surahName: string;
  ayahText: string;
  blankWord: string;
  blankIndex: number;
  words: string[];
  options: string[];
}

type Question = FollowUpQuestion | FillBlankQuestion;

function buildFollowUpQuestions(count: number, surahs: typeof DEFAULT_SURAHS): FollowUpQuestion[] {
  const allAyahs: { surahName: string; ayah: string; surahIndex: number; ayahIndex: number }[] = [];
  for (const s of surahs) {
    s.ayahs.forEach((a, i) => allAyahs.push({ surahName: s.englishName, ayah: a, surahIndex: s.number, ayahIndex: i }));
  }
  const questions: FollowUpQuestion[] = [];
  const shuffled = shuffle(allAyahs);
  for (const item of shuffled) {
    if (questions.length >= count) break;
    const surah = surahs.find(s => s.number === item.surahIndex);
    if (!surah) continue;
    const asks = Math.random() > 0.5 ? "after" : "before";
    const correctIdx = asks === "after" ? item.ayahIndex + 1 : item.ayahIndex - 1;
    if (correctIdx < 0 || correctIdx >= surah.ayahs.length) continue;
    const correctAnswer = surah.ayahs[correctIdx];
    const wrongPool = allAyahs.filter(a => a.ayah !== correctAnswer && a.ayah !== item.ayah).map(a => a.ayah);
    const wrongs = pickRandom(wrongPool, 2);
    if (wrongs.length < 2) continue;
    const options = shuffle([correctAnswer, ...wrongs]);
    questions.push({ type: "follow-up", questionAyah: item.ayah, surahName: item.surahName, asks, correctAnswer, options });
  }
  return questions;
}

function buildFillBlankQuestions(count: number, surahs: typeof DEFAULT_SURAHS): FillBlankQuestion[] {
  const allAyahs: { surahName: string; ayah: string }[] = [];
  for (const s of surahs) {
    s.ayahs.forEach(a => allAyahs.push({ surahName: s.englishName, ayah: a }));
  }
  const allWords = allAyahs.flatMap(a => a.ayah.split(" ").filter(Boolean));
  const questions: FillBlankQuestion[] = [];
  const shuffled = shuffle(allAyahs);
  for (const item of shuffled) {
    if (questions.length >= count) break;
    const words = item.ayah.split(" ").filter(Boolean);
    if (words.length < 2) continue;
    const blankIndex = Math.floor(Math.random() * words.length);
    const blankWord = words[blankIndex];
    const wrongPool = allWords.filter(w => w !== blankWord);
    const wrongs = pickRandom(wrongPool, 3);
    if (wrongs.length < 3) continue;
    const options = shuffle([blankWord, ...wrongs]);
    questions.push({ type: "fill-blank", surahName: item.surahName, ayahText: item.ayah, blankWord, blankIndex, words, options });
  }
  return questions;
}

function DraggableChip({
  word,
  onDragEnd,
  blankLayout,
  onTap,
  isSelected,
}: {
  word: string;
  onDragEnd: (word: string, dropped: boolean) => void;
  blankLayout: LayoutRectangle | null;
  onTap: (word: string) => void;
  isSelected: boolean;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const chipRef = useRef<View>(null);
  const [chipLayout, setChipLayout] = useState<LayoutRectangle | null>(null);
  const isDragging = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 4 || Math.abs(dy) > 4,
      onPanResponderGrant: () => {
        isDragging.current = false;
        Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 40 }).start();
      },
      onPanResponderMove: (_, { dx, dy }) => {
        isDragging.current = true;
        pan.setValue({ x: dx, y: dy });
      },
      onPanResponderRelease: (_, { dx, dy, moveX, moveY }) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
        if (!isDragging.current) {
          pan.setValue({ x: 0, y: 0 });
          onTap(word);
          return;
        }
        let dropped = false;
        if (blankLayout && chipLayout) {
          const finalX = chipLayout.x + chipLayout.width / 2 + dx;
          const finalY = chipLayout.y + chipLayout.height / 2 + dy;
          const inX = finalX >= blankLayout.x && finalX <= blankLayout.x + blankLayout.width;
          const inY = finalY >= blankLayout.y && finalY <= blankLayout.y + blankLayout.height;
          dropped = inX && inY;
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 30 }).start();
        onDragEnd(word, dropped);
      },
    })
  ).current;

  return (
    <Animated.View
      ref={chipRef}
      onLayout={e => setChipLayout(e.nativeEvent.layout)}
      style={[
        chipStyle.chip,
        isSelected && chipStyle.chipSelected,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={[chipStyle.chipText, isSelected && chipStyle.chipTextSelected]}>{word}</Text>
    </Animated.View>
  );
}

const chipStyle = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    margin: 4,
    zIndex: 10,
  },
  chipSelected: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  chipText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  chipTextSelected: { color: "#FFFFFF" },
});

function FollowUpQuizScreen({ questions, onFinish }: { questions: FollowUpQuestion[]; onFinish: (score: number) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const q = questions[qIdx];
  const total = questions.length;

  const handleAnswer = (option: string) => {
    if (chosen) return;
    setChosen(option);
    const isCorrect = option === q.correctAnswer;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      if (qIdx + 1 >= total) {
        onFinish(score + (isCorrect ? 1 : 0));
      } else {
        setQIdx(i => i + 1);
        setChosen(null);
        setFeedback(null);
      }
    }, 900);
  };

  const s = followUpStyle;
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${((qIdx) / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.surahLabel}>{q.surahName}</Text>
        <Text style={s.ayahText}>{q.questionAyah}</Text>
        <View style={s.divider} />
        <Text style={s.questionText}>
          Which ayah comes <Text style={s.questionBold}>{q.asks}</Text> this?
        </Text>
      </View>

      <View style={s.optionsContainer}>
        {q.options.map((opt, i) => {
          let bg = "#FFFFFF";
          let border = "#E8E8E8";
          let textColor = "#1A1A1A";
          if (chosen) {
            if (opt === q.correctAnswer) { bg = "#DCFCE7"; border = "#16A34A"; textColor = "#166534"; }
            else if (opt === chosen) { bg = "#FEE2E2"; border = "#DC2626"; textColor = "#991B1B"; }
          }
          return (
            <TouchableOpacity
              key={i}
              style={[s.optionBtn, { backgroundColor: bg, borderColor: border }]}
              onPress={() => handleAnswer(opt)}
              activeOpacity={0.8}
              disabled={!!chosen}
            >
              <Text style={[s.optionText, { color: textColor }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const followUpStyle = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14,
    elevation: 4, borderWidth: 1, borderColor: "#F0F0F0",
  },
  surahLabel: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  ayahText: {
    fontSize: 26, lineHeight: 48, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  questionText: { fontSize: 15, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22 },
  questionBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  optionsContainer: { gap: 10 },
  optionBtn: {
    borderRadius: 14, padding: 16, borderWidth: 1.5,
  },
  optionText: {
    fontSize: 18, lineHeight: 34, textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
});

function FillBlankQuizScreen({ questions, onFinish }: { questions: FillBlankQuestion[]; onFinish: (score: number) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [filledWord, setFilledWord] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const blankRef = useRef<View>(null);
  const [blankLayout, setBlankLayout] = useState<LayoutRectangle | null>(null);

  const q = questions[qIdx];
  const total = questions.length;

  const handleSelect = useCallback((word: string, isCorrect: boolean) => {
    if (filledWord) return;
    setFilledWord(word);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      if (qIdx + 1 >= total) {
        onFinish(score + (isCorrect ? 1 : 0));
      } else {
        setQIdx(i => i + 1);
        setFilledWord(null);
        setFeedback(null);
        setSelectedChip(null);
      }
    }, 900);
  }, [filledWord, qIdx, total, score, onFinish]);

  const handleDragEnd = useCallback((word: string, dropped: boolean) => {
    if (dropped) handleSelect(word, word === q.blankWord);
  }, [handleSelect, q]);

  const handleTap = useCallback((word: string) => {
    if (filledWord) return;
    if (selectedChip === word) {
      handleSelect(word, word === q.blankWord);
    } else {
      setSelectedChip(word);
    }
  }, [selectedChip, filledWord, handleSelect, q]);

  useEffect(() => { setSelectedChip(null); }, [qIdx]);

  const s = fillStyle;
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${((qIdx) / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>

      <Text style={s.surahLabel}>{q.surahName}</Text>
      <Text style={s.instruction}>Drag or tap the missing word into place</Text>

      <View
        ref={blankRef}
        onLayout={e => {
          blankRef.current?.measureInWindow((x, y, width, height) => {
            setBlankLayout({ x, y, width, height });
          });
        }}
        style={[
          s.blankSlot,
          feedback === "correct" && s.blankSlotCorrect,
          feedback === "wrong" && s.blankSlotWrong,
        ]}
      >
        {filledWord ? (
          <Text style={[s.blankFilled, feedback === "correct" && s.blankFilledCorrect, feedback === "wrong" && s.blankFilledWrong]}>
            {filledWord}
          </Text>
        ) : (
          <Text style={s.blankPlaceholder}>drop word here →</Text>
        )}
      </View>

      <View style={s.ayahCard}>
        <Text style={s.ayahText} textBreakStrategy="highQuality">
          {q.words.map((word, i) => {
            if (i === q.blankIndex) {
              return (
                <Text key={i}>
                  <Text style={s.blankInText}>{"___"}</Text>
                  {i < q.words.length - 1 ? " " : ""}
                </Text>
              );
            }
            return <Text key={i}>{word}{i < q.words.length - 1 ? " " : ""}</Text>;
          })}
        </Text>
      </View>

      <Text style={s.dragHint}>
        {selectedChip ? `"${selectedChip}" selected — tap again to fill, or tap another` : "Drag a word below or tap to select"}
      </Text>

      <View style={s.chipsGrid}>
        {q.options.map((word, i) => (
          <DraggableChip
            key={`${qIdx}-${i}-${word}`}
            word={word}
            blankLayout={blankLayout}
            onDragEnd={handleDragEnd}
            onTap={handleTap}
            isSelected={selectedChip === word}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const fillStyle = StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 80 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  surahLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  instruction: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
  blankSlot: {
    borderRadius: 16, borderWidth: 2, borderColor: "#D0D0D0", borderStyle: "dashed",
    padding: 16, alignItems: "center", justifyContent: "center", minHeight: 60, backgroundColor: "#FAFAFA",
  },
  blankSlotCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  blankSlotWrong: { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
  blankFilled: { fontSize: 22, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined },
  blankFilledCorrect: { color: "#166534" },
  blankFilledWrong: { color: "#991B1B" },
  blankPlaceholder: { fontSize: 14, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
  ayahCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12,
    elevation: 3, borderWidth: 1, borderColor: "#F0F0F0",
  },
  ayahText: {
    fontSize: 24, lineHeight: 46, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  blankInText: { color: "#4F46E5", fontFamily: "Inter_700Bold", fontSize: 20 },
  dragHint: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center" },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});

function ScoreScreen({ score, total, mode, onRetry, onBack }: {
  score: number; total: number; mode: "follow-up" | "fill-blank"; onRetry: () => void; onBack: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";
  return (
    <View style={scoreStyle.container}>
      <Text style={scoreStyle.emoji}>{emoji}</Text>
      <Text style={scoreStyle.score}>{score}/{total}</Text>
      <Text style={scoreStyle.pct}>{pct}%</Text>
      <Text style={scoreStyle.label}>
        {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good work!" : "Keep practicing!"}
      </Text>
      <View style={scoreStyle.btnRow}>
        <TouchableOpacity style={scoreStyle.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={scoreStyle.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={scoreStyle.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={scoreStyle.backText}>Change Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const scoreStyle = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emoji: { fontSize: 56 },
  score: { fontSize: 52, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  pct: { fontSize: 22, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  label: { fontSize: 18, color: "#1A1A1A", fontFamily: "Inter_600SemiBold", marginBottom: 20 },
  btnRow: { gap: 12, width: "100%" },
  retryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A1A1A", borderRadius: 14, paddingVertical: 14 },
  retryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backText: { fontSize: 15, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
});

type QuizMode = null | "follow-up" | "fill-blank";

export default function MemorizationQuizScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { recentProgress, surahPositions, checkedSurahs } = useQuran();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [mode, setMode] = useState<QuizMode>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<"menu" | "quiz" | "score">("menu");
  const [finalScore, setFinalScore] = useState(0);

  const getAvailableSurahs = useCallback(() => {
    const checked = DEFAULT_SURAHS.filter(s => checkedSurahs.includes(s.number));
    return checked.length > 0 ? checked : [...DEFAULT_SURAHS];
  }, [checkedSurahs]);

  const startQuiz = useCallback((selectedMode: "follow-up" | "fill-blank") => {
    const surahs = getAvailableSurahs();
    setMode(selectedMode);
    if (selectedMode === "follow-up") {
      const qs = buildFollowUpQuestions(5, surahs);
      if (qs.length === 0) return;
      setQuestions(qs);
    } else {
      const qs = buildFillBlankQuestions(5, surahs);
      if (qs.length === 0) return;
      setQuestions(qs);
    }
    setPhase("quiz");
    setFinalScore(0);
  }, [getAvailableSurahs]);

  const handleFinish = useCallback((score: number) => {
    setFinalScore(score);
    setPhase("score");
  }, []);

  const handleRetry = useCallback(() => {
    if (mode) startQuiz(mode);
  }, [mode, startQuiz]);

  const handleBack = useCallback(() => {
    setMode(null);
    setPhase("menu");
    setQuestions([]);
  }, []);

  const s = pageStyles;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => { if (phase !== "menu") handleBack(); else router.back(); }} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Memorization Quiz</Text>
          {mode && <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            {mode === "follow-up" ? "Follow-Up Ayah" : "Fill in the Blank"}
          </Text>}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {phase === "menu" && (
        <ScrollView contentContainerStyle={s.menuContent} showsVerticalScrollIndicator={false}>
          <Text style={[s.menuTitle, { color: colors.foreground }]}>Choose a Quiz Type</Text>
          <Text style={[s.menuSub, { color: colors.mutedForeground }]}>5 questions per session · resets after each round</Text>

          <TouchableOpacity style={s.modeCard} onPress={() => startQuiz("follow-up")} activeOpacity={0.85}>
            <View style={s.modeIcon}>
              <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" />
            </View>
            <View style={s.modeInfo}>
              <Text style={s.modeName}>Follow-Up Ayah</Text>
              <Text style={s.modeDesc}>An ayah is shown — can you identify the one that comes before or after it?</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9A9A9A" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.modeCard, { borderColor: "#E0D4FF", backgroundColor: "#FAFAFF" }]} onPress={() => startQuiz("fill-blank")} activeOpacity={0.85}>
            <View style={[s.modeIcon, { backgroundColor: "#7C3AED" }]}>
              <Ionicons name="text" size={24} color="#FFFFFF" />
            </View>
            <View style={s.modeInfo}>
              <Text style={s.modeName}>Fill in the Blank</Text>
              <Text style={s.modeDesc}>An ayah with a missing word — drag or tap the correct word to complete it.</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9A9A9A" />
          </TouchableOpacity>

          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#9A9A9A" />
            <Text style={s.infoText}>Questions come from Al-Fatiha, Al-Ikhlaas, Al-Falaq, and An-Naas — surahs every Muslim should know by heart.</Text>
          </View>
        </ScrollView>
      )}

      {phase === "quiz" && mode === "follow-up" && questions.length > 0 && (
        <FollowUpQuizScreen
          questions={questions as FollowUpQuestion[]}
          onFinish={handleFinish}
        />
      )}

      {phase === "quiz" && mode === "fill-blank" && questions.length > 0 && (
        <FillBlankQuizScreen
          questions={questions as FillBlankQuestion[]}
          onFinish={handleFinish}
        />
      )}

      {phase === "score" && mode && (
        <ScoreScreen
          score={finalScore}
          total={5}
          mode={mode}
          onRetry={handleRetry}
          onBack={handleBack}
        />
      )}
    </View>
  );
}

const pageStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  menuContent: { padding: 20, gap: 14, paddingBottom: 60 },
  menuTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  menuSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 6 },
  modeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FAFAFA", borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: "#E8E8E8",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  modeIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  modeInfo: { flex: 1 },
  modeName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  modeDesc: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoBox: {
    flexDirection: "row", gap: 10, backgroundColor: "#F5F5F5", borderRadius: 14, padding: 14, alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular", lineHeight: 20 },
});
