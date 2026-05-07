import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedAyah } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

const DEFAULT_SURAHS: { number: number; name: string; englishName: string; ayahs: string[]; translations: string[] }[] = [
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
    translations: [
      "In the name of Allah, the Most Gracious, the Most Merciful.",
      "All praise is due to Allah, Lord of the worlds.",
      "The Most Gracious, the Most Merciful.",
      "Master of the Day of Judgment.",
      "It is You we worship, and You we ask for help.",
      "Guide us to the straight path.",
      "The path of those upon whom You have bestowed favor, not of those who have evoked anger or of those who are astray.",
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
    translations: [
      "Say: He is Allah, the One.",
      "Allah, the Eternal, the Absolute.",
      "He neither begets nor is born.",
      "Nor is there to Him any equivalent.",
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
    translations: [
      "Say: I seek refuge in the Lord of daybreak.",
      "From the evil of that which He created.",
      "And from the evil of darkness when it settles.",
      "And from the evil of the blowers in knots.",
      "And from the evil of an envier when he envies.",
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
    translations: [
      "Say: I seek refuge in the Lord of mankind.",
      "The Sovereign of mankind.",
      "The God of mankind.",
      "From the evil of the retreating whisperer.",
      "Who whispers in the breasts of mankind.",
      "From among the jinn and mankind.",
    ],
  },
];

type QuizSurahFormat = typeof DEFAULT_SURAHS[0];

function savedAyahsToSurahFormat(ayahs: SavedAyah[]): QuizSurahFormat[] {
  const map = new Map<number, QuizSurahFormat>();
  const sorted = [...ayahs].sort((a, b) => a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber);
  for (const a of sorted) {
    if (!map.has(a.surahNumber)) {
      map.set(a.surahNumber, {
        number: a.surahNumber,
        name: a.surahName,
        englishName: a.surahName,
        ayahs: [],
        translations: [],
      });
    }
    const entry = map.get(a.surahNumber)!;
    entry.ayahs.push(a.arabicText);
    entry.translations.push(a.translationText);
  }
  return Array.from(map.values());
}

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

interface TafsirMatchQuestion {
  type: "tafsir-match";
  surahName: string;
  ayahText: string;
  ayahNumber: number;
  correctTranslation: string;
  options: string[];
}

type Question = FollowUpQuestion | FillBlankQuestion | TafsirMatchQuestion;

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

function buildTafsirMatchQuestions(count: number, surahs: typeof DEFAULT_SURAHS): TafsirMatchQuestion[] {
  const allPairs: { surahName: string; ayah: string; translation: string; ayahNumber: number }[] = [];
  for (const s of surahs) {
    s.ayahs.forEach((a, i) => {
      const t = s.translations?.[i];
      if (t) allPairs.push({ surahName: s.englishName, ayah: a, translation: t, ayahNumber: i + 1 });
    });
  }
  const allTranslations = allPairs.map(p => p.translation);
  const questions: TafsirMatchQuestion[] = [];
  const shuffled = shuffle(allPairs);
  for (const item of shuffled) {
    if (questions.length >= count) break;
    const wrongPool = allTranslations.filter(t => t !== item.translation);
    const wrongs = pickRandom(wrongPool, 3);
    if (wrongs.length < 3) continue;
    const options = shuffle([item.translation, ...wrongs]);
    questions.push({
      type: "tafsir-match",
      surahName: item.surahName,
      ayahText: item.ayah,
      ayahNumber: item.ayahNumber,
      correctTranslation: item.translation,
      options,
    });
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

function TapChip({
  word,
  onTap,
  isSelected,
  isDisabled,
}: {
  word: string;
  onTap: (word: string) => void;
  isSelected: boolean;
  isDisabled: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => { if (!isDisabled) onTap(word); }}
      activeOpacity={0.75}
      style={[chipStyle.chip, isSelected && chipStyle.chipSelected, isDisabled && chipStyle.chipDisabled]}
    >
      <Text style={[chipStyle.chipText, isSelected && chipStyle.chipTextSelected]}>{word}</Text>
    </TouchableOpacity>
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
  chipDisabled: {
    opacity: 0.4,
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
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: "#F0F0F0",
  },
  surahLabel: { fontSize: 10, color: "#9A9A9A", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  ayahText: {
    fontSize: 22, lineHeight: 36, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  questionText: { fontSize: 14, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 20 },
  questionBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  optionsContainer: { gap: 8 },
  optionBtn: {
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  optionText: {
    fontSize: 16, lineHeight: 28, textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
});

function FillBlankQuizScreen({ questions, onFinish }: { questions: FillBlankQuestion[]; onFinish: (score: number) => void }) {
  const colors = useColors();
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [filledWord, setFilledWord] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const q = questions[qIdx];
  const total = questions.length;

  const handleTap = useCallback((word: string) => {
    if (filledWord) return;
    const isCorrect = word === q.blankWord;
    setFilledWord(word);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setScore(s => s + 1);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    setTimeout(() => {
      if (qIdx + 1 >= total) {
        onFinish(score + (isCorrect ? 1 : 0));
      } else {
        setQIdx(i => i + 1);
        setFilledWord(null);
        setFeedback(null);
      }
    }, 900);
  }, [filledWord, qIdx, total, score, onFinish, q]);

  useEffect(() => { setFilledWord(null); setFeedback(null); }, [qIdx]);

  const s = { ...fillStyle, blankInText: { ...fillStyle.blankInText, color: colors.primary }, ayahCard: { ...fillStyle.ayahCard, backgroundColor: colors.card, borderColor: colors.border } };
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${((qIdx) / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>

      <Text style={s.surahLabel}>{q.surahName}</Text>
      <Text style={s.instruction}>Tap the correct missing word</Text>

      <View style={[s.blankSlot, feedback === "correct" && s.blankSlotCorrect, feedback === "wrong" && s.blankSlotWrong]}>
        {filledWord ? (
          <Text style={[s.blankFilled, feedback === "correct" && s.blankFilledCorrect, feedback === "wrong" && s.blankFilledWrong]}>
            {filledWord}
          </Text>
        ) : (
          <Text style={s.blankPlaceholder}>___</Text>
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

      <View style={s.chipsGrid}>
        {q.options.map((word, i) => (
          <TapChip
            key={`${qIdx}-${i}-${word}`}
            word={word}
            onTap={handleTap}
            isSelected={filledWord === word}
            isDisabled={!!filledWord}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const fillStyle = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 60 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: "#F0F0F0", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  surahLabel: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  instruction: { fontSize: 12, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
  blankSlot: {
    borderRadius: 14, borderWidth: 1.5, borderColor: "#D0D0D0", borderStyle: "dashed",
    padding: 12, alignItems: "center", justifyContent: "center", minHeight: 48, backgroundColor: "#FAFAFA",
  },
  blankSlotCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  blankSlotWrong: { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
  blankFilled: { fontSize: 20, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined },
  blankFilledCorrect: { color: "#166534" },
  blankFilledWrong: { color: "#991B1B" },
  blankPlaceholder: { fontSize: 12, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
  ayahCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: "#F0F0F0",
  },
  ayahText: {
    fontSize: 20, lineHeight: 34, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  blankInText: { color: "#4F46E5", fontFamily: "Inter_700Bold", fontSize: 18 },
  dragHint: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center" },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});

function TafsirMatchQuizScreen({ questions, onFinish }: { questions: TafsirMatchQuestion[]; onFinish: (score: number) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const q = questions[qIdx];
  const total = questions.length;

  const handleAnswer = (option: string) => {
    if (chosen) return;
    setChosen(option);
    const isCorrect = option === q.correctTranslation;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => {
      if (qIdx + 1 >= total) onFinish(score + (isCorrect ? 1 : 0));
      else { setQIdx(i => i + 1); setChosen(null); }
    }, 1100);
  };

  const s = followUpStyle;
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${(qIdx / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.surahLabel}>{q.surahName} · Ayah {q.ayahNumber}</Text>
        <Text style={s.ayahText}>{q.ayahText}</Text>
        <View style={s.divider} />
        <Text style={s.questionText}>
          What does this ayah <Text style={s.questionBold}>mean</Text>?
        </Text>
      </View>

      <View style={s.optionsContainer}>
        {q.options.map((opt, i) => {
          let bg = "#FFFFFF";
          let border = "#E8E8E8";
          let textColor = "#1A1A1A";
          if (chosen) {
            if (opt === q.correctTranslation) { bg = "#DCFCE7"; border = "#16A34A"; textColor = "#166534"; }
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
              <Text style={[s.optionText, { color: textColor, textAlign: "left", writingDirection: "ltr" }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ScoreScreen({ score, total, mode, onRetry, onBack }: {
  score: number; total: number; mode: "follow-up" | "fill-blank" | "tafsir-match"; onRetry: () => void; onBack: () => void;
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

type QuizMode = null | "follow-up" | "fill-blank" | "tafsir-match";
type AyahFilterMode = "by-ayah" | "by-surah";
type AyahTagFilter = "all" | "selected" | "excluded";

export default function MemorizationQuizScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { savedAyahs, removeAyah } = useQuran();
  const topPad = insets.top;

  const [mode, setMode] = useState<QuizMode>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<"type" | "selection" | "quiz" | "score">("type");
  const [finalScore, setFinalScore] = useState(0);
  const [filterMode, setFilterMode] = useState<AyahFilterMode>("by-ayah");
  const [tagFilter, setTagFilter] = useState<AyahTagFilter>("all");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [selectedAyahIds, setSelectedAyahIds] = useState<Set<string>>(() => new Set(savedAyahs.map(a => a.id)));
  const [excludedAyahIds, setExcludedAyahIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      for (const ayah of savedAyahs) {
        if (!prev.size) next.add(ayah.id);
      }
      return next;
    });
    setExcludedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      return new Set([...prev].filter(id => existingIds.has(id)));
    });
  }, [savedAyahs]);

  const surahGroups = useMemo(() => {
    const map = new Map<number, { surahNumber: number; surahName: string; ayahs: SavedAyah[] }>();
    for (const ayah of savedAyahs) {
      if (!map.has(ayah.surahNumber)) {
        map.set(ayah.surahNumber, {
          surahNumber: ayah.surahNumber,
          surahName: ayah.surahName || SURAH_DATA[ayah.surahNumber - 1]?.englishName || `Surah ${ayah.surahNumber}`,
          ayahs: [],
        });
      }
      map.get(ayah.surahNumber)!.ayahs.push(ayah);
    }
    return Array.from(map.values()).sort((a, b) => a.surahNumber - b.surahNumber);
  }, [savedAyahs]);

  const visibleAyahs = useMemo(() => {
    let ayahs = savedAyahs;
    if (filterMode === "by-surah" && selectedSurahNum !== null) {
      ayahs = ayahs.filter(ayah => ayah.surahNumber === selectedSurahNum);
    }
    if (filterMode === "by-ayah") {
      if (tagFilter === "selected") ayahs = ayahs.filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id));
      if (tagFilter === "excluded") ayahs = ayahs.filter(ayah => excludedAyahIds.has(ayah.id));
    }
    return ayahs;
  }, [savedAyahs, filterMode, selectedSurahNum, tagFilter, selectedAyahIds, excludedAyahIds]);

  const filteredSurahGroups = useMemo(() => {
    if (tagFilter === "selected") {
      return surahGroups.filter(g => g.ayahs.some(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id)));
    }
    if (tagFilter === "excluded") {
      return surahGroups.filter(g => g.ayahs.some(a => excludedAyahIds.has(a.id)));
    }
    return surahGroups;
  }, [surahGroups, tagFilter, selectedAyahIds, excludedAyahIds]);

  const quizDataset = useMemo(() => {
    return savedAyahs.filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id));
  }, [savedAyahs, selectedAyahIds, excludedAyahIds]);

  const startQuiz = useCallback(() => {
    if (!mode) return;
    if (quizDataset.length < 1) {
      Alert.alert("Select at least one ayah", "Choose at least one saved ayah before starting the test.");
      return;
    }
    const surahs = savedAyahsToSurahFormat(quizDataset);
    let qs: Question[] = [];
    if (mode === "follow-up") qs = buildFollowUpQuestions(5, surahs);
    else if (mode === "fill-blank") qs = buildFillBlankQuestions(5, surahs);
    else qs = buildTafsirMatchQuestions(5, surahs);
    if (qs.length === 0) {
      Alert.alert("Not enough quiz data", "Select more saved ayahs for this quiz type.");
      return;
    }
    setQuestions(qs);
    setPhase("quiz");
    setFinalScore(0);
  }, [mode, quizDataset]);

  const chooseMode = useCallback((selectedMode: NonNullable<QuizMode>) => {
    setMode(selectedMode);
    setPhase("selection");
  }, []);

  const toggleSelected = useCallback((id: string) => {
    const isSelected = selectedAyahIds.has(id);
    if (isSelected) {
      setSelectedAyahIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); n.add(id); return n; });
    } else {
      setSelectedAyahIds(prev => { const n = new Set(prev); n.add(id); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [selectedAyahIds]);

  const removeSavedAyah = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setSelectedAyahIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setExcludedAyahIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    removeAyah(id);
  }, [removeAyah]);

  const handleFinish = useCallback((score: number) => {
    setFinalScore(score);
    setPhase("score");
  }, []);

  const handleRetry = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const handleBack = useCallback(() => {
    if (phase === "selection") {
      setPhase("type");
      setMode(null);
      return;
    }
    setPhase("type");
    setQuestions([]);
  }, [phase]);

  const renderAyahRow = (ayah: SavedAyah) => {
    const checked = selectedAyahIds.has(ayah.id);
    const excluded = excludedAyahIds.has(ayah.id);
    return (
      <View key={ayah.id} style={[s.selectionAyahCard, excluded && s.selectionAyahCardExcluded]}>
        <TouchableOpacity
          style={[s.checkbox, checked && s.checkboxActive]}
          onPress={() => toggleSelected(ayah.id)}
          activeOpacity={0.75}
        >
          {checked && <Feather name="check" size={13} color="#FFFFFF" />}
        </TouchableOpacity>
        <View style={s.selectionAyahInfo}>
          <Text style={s.selectionMeta}>{ayah.surahName} · Ayah {ayah.ayahNumber}</Text>
          <Text style={s.selectionArabic} numberOfLines={1}>{ayah.arabicText}</Text>
          <Text style={s.selectionTranslation} numberOfLines={1}>{ayah.translationText || "No translation saved"}</Text>
        </View>
        <TouchableOpacity onPress={() => removeSavedAyah(ayah.id)} style={s.savedRemoveBtn} activeOpacity={0.7}>
          <Feather name="trash-2" size={16} color="#CC3333" />
        </TouchableOpacity>
      </View>
    );
  };

  const s = pageStyles;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { if (phase !== "type") handleBack(); else router.back(); }} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Memorization Quiz</Text>
          {mode && <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            {mode === "follow-up" ? "Follow-Up Ayah"
              : mode === "fill-blank" ? "Fill in the Blank"
              : "Match the Meaning"}
          </Text>}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {phase === "type" && (
        <ScrollView contentContainerStyle={s.menuContent} showsVerticalScrollIndicator={false}>
          <Text style={[s.menuTitle, { color: colors.foreground }]}>Choose a Quiz Type</Text>
          <Text style={[s.menuSub, { color: colors.mutedForeground }]}>Select the test format first, then build your ayah set.</Text>

          <TouchableOpacity style={s.modeCard} onPress={() => chooseMode("follow-up")} activeOpacity={0.85}>
            <View style={s.modeIcon}>
              <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" />
            </View>
            <View style={s.modeInfo}>
              <Text style={s.modeName}>Follow-Up Ayah</Text>
              <Text style={s.modeDesc}>An ayah is shown — can you identify the one that comes before or after it?</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9A9A9A" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.modeCard, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => chooseMode("fill-blank")} activeOpacity={0.85}>
            <View style={[s.modeIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="text" size={24} color="#FFFFFF" />
            </View>
            <View style={s.modeInfo}>
              <Text style={s.modeName}>Fill in the Blank</Text>
              <Text style={s.modeDesc}>An ayah with a missing word — tap the correct word to complete it.</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9A9A9A" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.modeCard, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => chooseMode("tafsir-match")} activeOpacity={0.85}>
            <View style={[s.modeIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="language" size={24} color="#FFFFFF" />
            </View>
            <View style={s.modeInfo}>
              <Text style={s.modeName}>Match the Meaning</Text>
              <Text style={s.modeDesc}>An Arabic ayah is shown — pick the correct English translation from four choices.</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9A9A9A" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {phase === "selection" && (
        <View style={s.selectionWrap}>
          <View style={s.filterRow}>
            {[
              { key: "by-surah", label: "By Surah" },
              { key: "by-ayah", label: "By Ayah" },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.filterChip, filterMode === item.key && s.filterChipActive]}
                onPress={() => { setFilterMode(item.key as AyahFilterMode); setSelectedSurahNum(null); }}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipText, filterMode === item.key && s.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.tagRow}>
            {[
              { key: "all", label: "All" },
              { key: "selected", label: "Selected" },
              { key: "excluded", label: "Excluded" },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.tagChip, tagFilter === item.key && s.tagChipActive]}
                onPress={() => { setTagFilter(item.key as AyahTagFilter); setSelectedSurahNum(null); }}
                activeOpacity={0.8}
              >
                <Text style={[s.tagText, tagFilter === item.key && s.tagTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filterMode === "by-surah" && selectedSurahNum === null ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.selectionContent} showsVerticalScrollIndicator={false}>
              {filteredSurahGroups.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#9A9A9A" />
                  <Text style={s.infoText}>{tagFilter === "all" ? "No saved ayahs yet. Save ayahs from the reader to build your quiz pool." : "No ayahs match this filter."}</Text>
                </View>
              ) : filteredSurahGroups.map(group => (
                <TouchableOpacity
                  key={group.surahNumber}
                  style={s.surahSelectRow}
                  onPress={() => setSelectedSurahNum(group.surahNumber)}
                  activeOpacity={0.8}
                >
                  <View style={s.surahBadge}><Text style={s.surahBadgeText}>{group.surahNumber}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.surahSelectName}>{group.surahName}</Text>
                    <Text style={s.surahSelectMeta}>{group.ayahs.length} saved ayah{group.ayahs.length !== 1 ? "s" : ""}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#B0B0B0" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.selectionContent} showsVerticalScrollIndicator={false}>
              {filterMode === "by-surah" && selectedSurahNum !== null && (
                <TouchableOpacity style={s.drillBack} onPress={() => setSelectedSurahNum(null)} activeOpacity={0.7}>
                  <Feather name="arrow-left" size={16} color="#1A1A1A" />
                  <Text style={s.drillBackText}>All Surahs</Text>
                </TouchableOpacity>
              )}
              {visibleAyahs.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#9A9A9A" />
                  <Text style={s.infoText}>No ayahs match this filter.</Text>
                </View>
              ) : visibleAyahs.map(renderAyahRow)}
            </ScrollView>
          )}

          <View style={[s.startPanel, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <Text style={s.startSummary}>{quizDataset.length} ayah{quizDataset.length !== 1 ? "s" : ""} selected</Text>
            <TouchableOpacity
              style={[s.startBtn, quizDataset.length < 1 && s.startBtnDisabled]}
              onPress={startQuiz}
              disabled={quizDataset.length < 1}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText}>Start the Test</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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

      {phase === "quiz" && mode === "tafsir-match" && questions.length > 0 && (
        <TafsirMatchQuizScreen
          questions={questions as TafsirMatchQuestion[]}
          onFinish={handleFinish}
        />
      )}

      {phase === "score" && mode && (
        <ScoreScreen
          score={finalScore}
          total={questions.length}
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
  menuContent: { padding: 16, gap: 10, paddingBottom: 40 },
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
  selectionWrap: { flex: 1, flexDirection: "column" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#E8E8ED",
  },
  filterChipActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  filterChipText: { fontSize: 12, color: "#6B6B6B", fontFamily: "Inter_700Bold" },
  filterChipTextActive: { color: "#FFFFFF" },
  tagRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8ED",
  },
  tagChipActive: { backgroundColor: "#EDEAE5", borderColor: "#D5CEC3" },
  tagText: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_700Bold" },
  tagTextActive: { color: "#1A1A1A" },
  selectionContent: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 24 },
  selectionAyahCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
    padding: 12,
    alignItems: "flex-start",
  },
  selectionAyahCardExcluded: { opacity: 0.62, backgroundColor: "#FAFAFA" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#C8C8C8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  selectionAyahInfo: { flex: 1 },
  selectionMeta: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_700Bold", marginBottom: 4 },
  selectionArabic: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1A1A1A",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 3,
  },
  selectionTranslation: { fontSize: 12, color: "#6B6B6B", fontFamily: "Inter_400Regular", marginBottom: 8 },
  excludeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  excludeToggle: {
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#DADADA",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  excludeToggleActive: { backgroundColor: "#1A1A1A", alignItems: "flex-end" },
  excludeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
  excludeText: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular" },
  surahSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
    padding: 14,
  },
  surahBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  surahBadgeText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  surahSelectName: { fontSize: 14, color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahSelectMeta: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 2 },
  drillBack: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  drillBackText: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  startPanel: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
    padding: 16,
    paddingTop: 12,
    gap: 8,
  },
  startSummary: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_700Bold", textAlign: "center" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 14,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText: { fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  savedSection: { marginTop: 4, gap: 8 },
  savedSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  savedSectionTitle: { fontSize: 12, fontWeight: "700", color: "#9A9A9A", fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  savedAyahRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FAFAFA", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#EEEEEE",
  },
  savedAyahInfo: { flex: 1 },
  savedAyahArabic: { fontSize: 15, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "right", lineHeight: 22 },
  savedAyahMeta: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 4 },
  savedRemoveBtn: { padding: 6 },
});
