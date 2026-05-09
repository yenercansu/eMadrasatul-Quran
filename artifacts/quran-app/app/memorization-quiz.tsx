import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedAyah } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { SwipeableRow } from "@/components/SwipeableRow";

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

const MEDINAN_SURAHS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110,
]);
const SURAHS_PER_PAGE = 20;

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
    backgroundColor: "#F6F2EA",
    borderWidth: 1.5,
    borderColor: "#E7E5DB",
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
          let bg = "#FDFBF7";
          let border = "#D6D3D1";
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
  progressTrack: { flex: 1, height: 3, backgroundColor: "#E7E5DB", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#FDFBF7", borderRadius: 16, padding: 20, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: "#E7E5DB",
  },
  surahLabel: { fontSize: 10, color: "#A8A29E", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  ayahText: {
    fontSize: 22, lineHeight: 36, color: "#1A1A1A",
    textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  divider: { height: 1, backgroundColor: "#E7E5DB" },
  questionText: { fontSize: 14, color: "#44403C", fontFamily: "Inter_400Regular", lineHeight: 20 },
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
  progressTrack: { flex: 1, height: 3, backgroundColor: "#E7E5DB", borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#1A1A1A", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  surahLabel: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  instruction: { fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular" },
  blankSlot: {
    borderRadius: 14, borderWidth: 1.5, borderColor: "#D6D3D1", borderStyle: "dashed",
    padding: 12, alignItems: "center", justifyContent: "center", minHeight: 48, backgroundColor: "#F6F2EA",
  },
  blankSlotCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  blankSlotWrong: { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
  blankFilled: { fontSize: 20, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined },
  blankFilledCorrect: { color: "#166534" },
  blankFilledWrong: { color: "#991B1B" },
  blankPlaceholder: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  ayahCard: {
    backgroundColor: "#FDFBF7", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: "#E7E5DB",
  },
  ayahText: {
    fontSize: 20, lineHeight: 34, color: "#1A1A1A", textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  blankInText: { color: "#4F46E5", fontFamily: "Inter_700Bold", fontSize: 18 },
  dragHint: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_400Regular", textAlign: "center" },
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
          let bg = "#FDFBF7";
          let border = "#D6D3D1";
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
  pct: { fontSize: 22, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  label: { fontSize: 18, color: "#1A1A1A", fontFamily: "Inter_600SemiBold", marginBottom: 20 },
  btnRow: { gap: 12, width: "100%" },
  retryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A1A1A", borderRadius: 14, paddingVertical: 14 },
  retryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backText: { fontSize: 15, color: "#A8A29E", fontFamily: "Inter_400Regular" },
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
  const [surahSearchQuery, setSurahSearchQuery] = useState("");
  const [ayahSearchQuery, setAyahSearchQuery] = useState("");
  const [surahPage, setSurahPage] = useState(0);

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
      if (ayahSearchQuery.trim()) {
        const q = ayahSearchQuery.toLowerCase();
        ayahs = ayahs.filter(a =>
          a.arabicText.includes(ayahSearchQuery) ||
          (a.translationText && a.translationText.toLowerCase().includes(q)) ||
          (a.surahName && a.surahName.toLowerCase().includes(q))
        );
      }
    }
    return ayahs;
  }, [savedAyahs, filterMode, selectedSurahNum, tagFilter, selectedAyahIds, excludedAyahIds, ayahSearchQuery]);

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

  const allFilteredSurahs = useMemo(() => {
    const savedSurahNums = new Set(surahGroups.map(g => g.surahNumber));
    let surahs = SURAH_DATA.filter(s => savedSurahNums.has(s.number));
    if (surahSearchQuery.trim()) {
      const q = surahSearchQuery.toLowerCase();
      surahs = surahs.filter(s => s.englishName.toLowerCase().includes(q) || s.name.includes(q));
    }
    if (tagFilter === "selected") {
      const savedMap = new Map(surahGroups.map(g => [g.surahNumber, g.ayahs]));
      surahs = surahs.filter(s => savedMap.get(s.number)?.some(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id)));
    }
    if (tagFilter === "excluded") {
      const savedMap = new Map(surahGroups.map(g => [g.surahNumber, g.ayahs]));
      surahs = surahs.filter(s => savedMap.get(s.number)?.some(a => excludedAyahIds.has(a.id)));
    }
    return surahs;
  }, [surahSearchQuery, tagFilter, surahGroups, selectedAyahIds, excludedAyahIds]);

  const totalSurahPages = Math.max(1, Math.ceil(allFilteredSurahs.length / SURAHS_PER_PAGE));

  const pagedSurahs = useMemo(() => {
    const start = surahPage * SURAHS_PER_PAGE;
    return allFilteredSurahs.slice(start, start + SURAHS_PER_PAGE);
  }, [allFilteredSurahs, surahPage]);

  const selectedSurahCount = useMemo(() => {
    const nums = new Set<number>();
    for (const a of savedAyahs) {
      if (selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id)) nums.add(a.surahNumber);
    }
    return nums.size;
  }, [savedAyahs, selectedAyahIds, excludedAyahIds]);

  const ayahsByJuz = useMemo(() => {
    const result: { juz: number; ayahs: SavedAyah[] }[] = [];
    for (const ayah of visibleAyahs) {
      const juz = SURAH_DATA[ayah.surahNumber - 1]?.juz ?? 1;
      const last = result[result.length - 1];
      if (!last || last.juz !== juz) result.push({ juz, ayahs: [ayah] });
      else last.ayahs.push(ayah);
    }
    return result;
  }, [visibleAyahs]);

  const startQuiz = useCallback(() => {
    if (!mode) return;
    const useDefault = quizDataset.length < 4;
    const surahs = useDefault ? DEFAULT_SURAHS : savedAyahsToSurahFormat(quizDataset);
    let qs: Question[] = [];
    if (mode === "follow-up") {
      qs = buildFollowUpQuestions(5, surahs);
      if (qs.length === 0) qs = buildFollowUpQuestions(5, DEFAULT_SURAHS);
    } else if (mode === "fill-blank") {
      qs = buildFillBlankQuestions(5, surahs);
      if (qs.length === 0) qs = buildFillBlankQuestions(5, DEFAULT_SURAHS);
    } else {
      qs = buildTafsirMatchQuestions(5, surahs);
      if (qs.length === 0) qs = buildTafsirMatchQuestions(5, DEFAULT_SURAHS);
    }
    if (qs.length === 0) return;
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

  const isSurahSelected = useCallback((surahNum: number): boolean => {
    const group = surahGroups.find(g => g.surahNumber === surahNum);
    if (!group || group.ayahs.length === 0) return false;
    return group.ayahs.every(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id));
  }, [surahGroups, selectedAyahIds, excludedAyahIds]);

  const toggleSurah = useCallback((surahNum: number) => {
    const group = surahGroups.find(g => g.surahNumber === surahNum);
    if (!group || group.ayahs.length === 0) return;
    const allSel = group.ayahs.every(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id));
    setSelectedAyahIds(prev => {
      const n = new Set(prev);
      group.ayahs.forEach(a => allSel ? n.delete(a.id) : n.add(a.id));
      return n;
    });
    setExcludedAyahIds(prev => {
      const n = new Set(prev);
      group.ayahs.forEach(a => allSel ? n.add(a.id) : n.delete(a.id));
      return n;
    });
  }, [surahGroups, selectedAyahIds, excludedAyahIds]);

  const handleSelectAll = useCallback(() => {
    if (filterMode === "by-ayah") {
      const ids = visibleAyahs.map(a => a.id);
      setSelectedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    } else {
      const idsToAdd: string[] = [];
      for (const surahMeta of allFilteredSurahs) {
        const group = surahGroups.find(g => g.surahNumber === surahMeta.number);
        if (group) group.ayahs.forEach(a => idsToAdd.push(a.id));
      }
      setSelectedAyahIds(prev => { const n = new Set(prev); idsToAdd.forEach(id => n.add(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); idsToAdd.forEach(id => n.delete(id)); return n; });
    }
  }, [filterMode, visibleAyahs, allFilteredSurahs, surahGroups]);

  const handleClearAll = useCallback(() => {
    if (filterMode === "by-ayah") {
      const ids = visibleAyahs.map(a => a.id);
      setSelectedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    } else {
      const idsToClear: string[] = [];
      for (const surahMeta of allFilteredSurahs) {
        const group = surahGroups.find(g => g.surahNumber === surahMeta.number);
        if (group) group.ayahs.forEach(a => idsToClear.push(a.id));
      }
      setSelectedAyahIds(prev => { const n = new Set(prev); idsToClear.forEach(id => n.delete(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); idsToClear.forEach(id => n.add(id)); return n; });
    }
  }, [filterMode, visibleAyahs, allFilteredSurahs, surahGroups]);

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
      {(phase === "type" || phase === "selection") ? (
        <View style={[s.selectionPageHeader, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
          <View style={s.selectionHeaderTopRow}>
            <TouchableOpacity
              onPress={() => { if (phase === "selection") handleBack(); else router.back(); }}
              style={[s.circleBackBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.selectionModeLabelText, { color: colors.mutedForeground }]}>
              {phase === "type"
                ? "MEMORIZATION QUIZ"
                : mode === "follow-up" ? "FOLLOW-UP AYAH"
                : mode === "fill-blank" ? "FILL IN THE BLANK"
                : "MATCH THE MEANING"}
            </Text>
          </View>
          <Text style={[s.selectionPageTitle, { color: colors.foreground }]}>
            {phase === "type" ? "Choose a Quiz Type" : "Select Ayahs"}
          </Text>
        </View>
      ) : (
        <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
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
      )}

      {phase === "type" && (
        <ScrollView contentContainerStyle={s.typeContent} showsVerticalScrollIndicator={false}>
          <Text style={[s.typeSub, { color: colors.mutedForeground }]}>Select the test format first, then build your ayah set.</Text>

          {[
            {
              num: "1", mode: "follow-up" as const,
              title: "Follow-Up Ayah",
              desc: "An ayah is shown — can you identify the one that comes before or after it?",
              tag: "Sequence",
            },
            {
              num: "2", mode: "fill-blank" as const,
              title: "Fill in the Blank",
              desc: "An ayah with a missing word — tap the correct word to complete it.",
              tag: "Recall",
            },
            {
              num: "3", mode: "tafsir-match" as const,
              title: "Match the Meaning",
              desc: "An Arabic ayah is shown — pick the correct English translation from four choices.",
              tag: "Translation",
            },
          ].map(item => (
            <TouchableOpacity
              key={item.mode}
              style={[s.modeCard2, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => chooseMode(item.mode)}
              activeOpacity={0.85}
            >
              <View style={[s.modeBadge, { backgroundColor: colors.foreground }]}>
                <Text style={[s.modeBadgeText, { color: colors.primaryForeground }]}>{item.num}</Text>
              </View>
              <View style={s.modeInfo2}>
                <Text style={[s.modeName2, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[s.modeDesc2, { color: colors.mutedForeground }]}>{item.desc}</Text>
                <View style={[s.modeTag, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[s.modeTagText, { color: colors.mutedForeground }]}>{item.tag}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}

          <Text style={[s.typeFooter, { color: colors.mutedForeground }]}>Tap a quiz type to continue →</Text>
        </ScrollView>
      )}

      {phase === "selection" && (
        <View style={s.selectionWrap}>
          {/* Segmented toggle */}
          <View style={s.segmentWrapper}>
            <View style={[s.segmentContainer, { borderColor: colors.border }]}>
              {([{ key: "by-surah", label: "By Surah" }, { key: "by-ayah", label: "By Ayah" }] as const).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.segmentBtn, filterMode === item.key && s.segmentBtnActive]}
                  onPress={() => { setFilterMode(item.key); setSelectedSurahNum(null); setSurahPage(0); setSurahSearchQuery(""); setAyahSearchQuery(""); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.segmentText, filterMode === item.key && s.segmentTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search bar */}
          <View style={s.searchWrapper}>
            <View style={[s.searchContainer, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              {filterMode === "by-surah" ? (
                <TextInput
                  style={[s.searchInput, { color: colors.foreground }]}
                  placeholder="Search surah..."
                  placeholderTextColor={colors.mutedForeground}
                  value={surahSearchQuery}
                  onChangeText={text => { setSurahSearchQuery(text); setSurahPage(0); }}
                />
              ) : (
                <TextInput
                  style={[s.searchInput, { color: colors.foreground }]}
                  placeholder="Search ayahs..."
                  placeholderTextColor={colors.mutedForeground}
                  value={ayahSearchQuery}
                  onChangeText={setAyahSearchQuery}
                />
              )}
              {(filterMode === "by-surah" ? surahSearchQuery : ayahSearchQuery) ? (
                <TouchableOpacity
                  onPress={() => filterMode === "by-surah" ? (setSurahSearchQuery(""), setSurahPage(0)) : setAyahSearchQuery("")}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Tag filter row */}
          <View style={s.tagRow2}>
            <View style={s.tagChipsRow}>
              {([{ key: "all", label: "All" }, { key: "selected", label: "Selected" }, { key: "excluded", label: "Excluded" }] as const).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.tagChip2, tagFilter === item.key && s.tagChip2Active]}
                  onPress={() => { setTagFilter(item.key); setSelectedSurahNum(null); setSurahPage(0); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tagText2, tagFilter === item.key && s.tagText2Active]}>{item.label}</Text>
                </TouchableOpacity>
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

          {/* List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.selectionContent2} showsVerticalScrollIndicator={false}>
            {filterMode === "by-surah" ? (
              pagedSurahs.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#A8A29E" />
                  <Text style={s.infoText}>{surahGroups.length === 0 ? "No saved ayahs yet. Save ayahs from the reader to build your quiz pool." : surahSearchQuery.trim() ? "No surahs match your search." : "No surahs match this filter."}</Text>
                </View>
              ) : (() => {
                const byJuz: { juz: number; surahs: typeof SURAH_DATA }[] = [];
                for (const surah of pagedSurahs) {
                  const last = byJuz[byJuz.length - 1];
                  if (!last || last.juz !== surah.juz) byJuz.push({ juz: surah.juz, surahs: [surah] });
                  else last.surahs.push(surah);
                }
                return byJuz.map(group => (
                  <View key={group.juz}>
                    <Text style={[s.juzHeader, { color: colors.mutedForeground }]}>JUZ {group.juz}</Text>
                    {group.surahs.map(surah => {
                      const savedGroup = surahGroups.find(g => g.surahNumber === surah.number);
                      const savedCount = savedGroup?.ayahs.length ?? 0;
                      const selected = savedCount > 0 && isSurahSelected(surah.number);
                      const origin = MEDINAN_SURAHS.has(surah.number) ? "Medinan" : "Meccan";
                      return (
                        <TouchableOpacity
                          key={surah.number}
                          style={[s.surahCard2, { backgroundColor: colors.card, borderColor: selected ? colors.foreground : colors.border }]}
                          onPress={() => { if (savedCount > 0) toggleSurah(surah.number); }}
                          activeOpacity={0.8}
                        >
                          <View style={[s.surahBadge2, selected ? { backgroundColor: colors.foreground, borderColor: colors.foreground } : { borderColor: colors.border }]}>
                            {selected && <Feather name="check" size={14} color={colors.primaryForeground} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.surahCard2Name, { color: colors.foreground }]}>{surah.englishName}</Text>
                            <Text style={[s.surahCard2Meta, { color: colors.mutedForeground }]}>{savedCount} saved · {surah.ayahCount} ayahs · {origin}</Text>
                          </View>
                          <Text style={[s.surahCard2Arabic, { color: colors.mutedForeground }]}>{surah.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()
            ) : (
              ayahsByJuz.length === 0 ? (
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#A8A29E" />
                  <Text style={s.infoText}>{ayahSearchQuery.trim() ? "No ayahs match your search." : tagFilter === "all" ? "No saved ayahs yet. Save ayahs from the reader to build your quiz pool." : "No ayahs match this filter."}</Text>
                </View>
              ) : (
                <>
                  <Text style={[s.swipeHint, { color: colors.mutedForeground }]}>← swipe left to remove · swipe right to open →</Text>
                  {ayahsByJuz.map(group => (
                <View key={group.juz}>
                  <Text style={[s.juzHeader, { color: colors.mutedForeground }]}>JUZ {group.juz}</Text>
                  {group.ayahs.map(ayah => {
                    const checked = selectedAyahIds.has(ayah.id);
                    const juz = SURAH_DATA[ayah.surahNumber - 1]?.juz ?? 1;
                    return (
                      <SwipeableRow
                        key={ayah.id}
                        onDelete={() => removeSavedAyah(ayah.id)}
                        onOpen={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                          router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`);
                        }}
                      >
                        <View
                          style={[s.ayahCard2, { backgroundColor: colors.card, borderColor: checked ? colors.foreground : colors.border }]}
                        >
                          <TouchableOpacity
                            style={[s.ayahBadge2, checked ? { backgroundColor: colors.foreground, borderColor: colors.foreground } : { borderColor: colors.border }]}
                            onPress={() => toggleSelected(ayah.id)}
                            activeOpacity={0.75}
                          >
                            {checked && <Feather name="check" size={12} color={colors.primaryForeground} />}
                          </TouchableOpacity>
                          <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleSelected(ayah.id)} activeOpacity={0.75}>
                            <View style={s.ayahCard2Header}>
                              <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>{ayah.surahName.toUpperCase()} · {ayah.ayahNumber}</Text>
                              <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>JUZ {juz}</Text>
                            </View>
                            <Text style={[s.ayahCard2Arabic, { color: colors.foreground }]}>{ayah.arabicText}</Text>
                            <Text style={[s.ayahCard2Translation, { color: colors.mutedForeground }]} numberOfLines={2}>{ayah.translationText || "No translation saved"}</Text>
                          </TouchableOpacity>
                        </View>
                      </SwipeableRow>
                    );
                  })}
                </View>
              ))}
                </>
              )
            )}
          </ScrollView>

          {/* Bottom panel */}
          <View style={[s.startPanel2, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={s.startStats}>
              <Text style={[s.startStatText, { color: colors.mutedForeground }]}>{quizDataset.length} ayah{quizDataset.length !== 1 ? "s" : ""} selected</Text>
              {filterMode === "by-surah"
                ? <Text style={[s.startStatText, { color: colors.mutedForeground }]}>{selectedSurahCount} surah{selectedSurahCount !== 1 ? "s" : ""} chosen</Text>
                : <Text style={[s.startStatText, { color: colors.mutedForeground }]}>from {selectedSurahCount} surah{selectedSurahCount !== 1 ? "s" : ""}</Text>
              }
            </View>
            {filterMode === "by-surah" && (
              <View style={s.paginationRow}>
                <TouchableOpacity
                  onPress={() => setSurahPage(p => Math.max(0, p - 1))}
                  disabled={surahPage === 0}
                  style={s.paginationBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[s.paginationBtnText, { color: colors.foreground, opacity: surahPage === 0 ? 0.3 : 1 }]}>‹ Prev</Text>
                </TouchableOpacity>
                <Text style={[s.paginationLabel, { color: colors.mutedForeground }]}>Page {surahPage + 1} of {totalSurahPages} · {allFilteredSurahs.length} surahs</Text>
                <TouchableOpacity
                  onPress={() => setSurahPage(p => Math.min(totalSurahPages - 1, p + 1))}
                  disabled={surahPage >= totalSurahPages - 1}
                  style={s.paginationBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[s.paginationBtnText, { color: colors.foreground, opacity: surahPage >= totalSurahPages - 1 ? 0.3 : 1 }]}>Next ›</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={s.startBtn2}
              onPress={startQuiz}
              activeOpacity={0.85}
            >
              <Text style={s.startBtnText2}>Start the Test</Text>
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
    backgroundColor: "#FDFBF7", borderBottomWidth: 1, borderBottomColor: "#E7E5DB",
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
    backgroundColor: "#F6F2EA", borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: "#D6D3D1",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  modeIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  modeInfo: { flex: 1 },
  modeName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  modeDesc: { fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoBox: {
    flexDirection: "row", gap: 10, backgroundColor: "#F6F2EA", borderRadius: 14, padding: 14, alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular", lineHeight: 20 },
  selectionWrap: { flex: 1, flexDirection: "column" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F6F2EA",
    borderWidth: 1,
    borderColor: "#D6D3D1",
  },
  filterChipActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  filterChipText: { fontSize: 12, color: "#78716C", fontFamily: "Inter_700Bold" },
  filterChipTextActive: { color: "#FFFFFF" },
  tagRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FDFBF7",
    borderWidth: 1,
    borderColor: "#D6D3D1",
  },
  tagChipActive: { backgroundColor: "#EEE8DF", borderColor: "#D6D3D1" },
  tagText: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_700Bold" },
  tagTextActive: { color: "#1A1A1A" },
  selectionContent: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 24 },
  selectionAyahCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FDFBF7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 12,
    alignItems: "flex-start",
  },
  selectionAyahCardExcluded: { opacity: 0.62, backgroundColor: "#F6F2EA" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#D6D3D1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  selectionAyahInfo: { flex: 1 },
  selectionMeta: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_700Bold", marginBottom: 4 },
  selectionArabic: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1A1A1A",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 3,
  },
  selectionTranslation: { fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular", marginBottom: 8 },
  excludeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  excludeToggle: {
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D6D3D1",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  excludeToggleActive: { backgroundColor: "#1A1A1A", alignItems: "flex-end" },
  excludeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
  excludeText: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  surahSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FDFBF7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E5DB",
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
  surahSelectMeta: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_400Regular", marginTop: 2 },
  drillBack: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  drillBackText: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  startPanel: {
    backgroundColor: "#FDFBF7",
    borderTopWidth: 1,
    borderTopColor: "#E7E5DB",
    padding: 16,
    paddingTop: 12,
    gap: 8,
  },
  startSummary: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_700Bold", textAlign: "center" },
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
  savedSectionTitle: { fontSize: 12, fontWeight: "700", color: "#A8A29E", fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  savedAyahRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F6F2EA", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#E7E5DB",
  },
  savedAyahInfo: { flex: 1 },
  savedAyahArabic: { fontSize: 15, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "right", lineHeight: 22 },
  savedAyahMeta: { fontSize: 11, color: "#A8A29E", fontFamily: "Inter_400Regular", marginTop: 4 },
  savedRemoveBtn: { padding: 6 },

  // ── Type phase content ──
  typeContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 12 },
  typeSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  modeCard2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  modeBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modeBadgeText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modeInfo2: { flex: 1, gap: 6 },
  modeName2: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modeDesc2: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  modeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  modeTagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeFooter: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  // ── Selection phase header ──
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
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionModeLabelText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  selectionPageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },

  // ── Segmented toggle ──
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

  // ── Search ──
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

  // ── Tag filter row ──
  tagRow2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  tagChipsRow: { flexDirection: "row", gap: 8 },
  tagChip2: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tagChip2Active: { backgroundColor: "#1A1A1A" },
  tagText2: { fontSize: 13, color: "#A8A29E", fontFamily: "Inter_700Bold" },
  tagText2Active: { color: "#FFFFFF" },
  tagActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  tagActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  swipeHint: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6, marginTop: 4 },

  // ── JUZ section header ──
  juzHeader: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingTop: 12,
    paddingBottom: 8,
  },

  // ── Surah cards (new design) ──
  surahCard2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  surahBadge2: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  surahBadge2Text: { fontSize: 13, fontFamily: "Inter_700Bold" },
  surahCard2Name: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  surahCard2Meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  surahCard2Arabic: { fontSize: 14, fontFamily: Platform.OS === "ios" ? "System" : undefined },

  // ── Ayah cards (new design) ──
  ayahCard2: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
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
  ayahBadge2Text: { fontSize: 12, fontFamily: "Inter_700Bold" },
  ayahCard2Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ayahCard2Meta: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ayahCard2Arabic: {
    fontSize: 18,
    lineHeight: 30,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 6,
  },
  ayahCard2Translation: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  // ── Selection list content ──
  selectionContent2: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

  // ── Bottom panel (new design) ──
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
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  paginationBtn: { paddingVertical: 4 },
  paginationBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  paginationLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  startBtn2: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 16,
  },
  startBtnText2: { fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});

