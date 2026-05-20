import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedAyah } from "@/contexts/QuranContext";
import { ActionPill } from "@/components/ActionPill";
import { SURAH_DATA } from "@/constants/surahData";
import { SwipeableRow } from "@/components/SwipeableRow";
import { Pagination } from "@/components/Pagination";
import { Tag } from "@/components/Tag";
import { QuestionNav } from "@/components/QuestionNav";
import { searchByType } from "@/services/search";
import { HifzSegmentedControl } from "@/components/hifz/HifzUI";
import { AppDialog } from "@/components/AppDialog";
import { InlineNotice } from "@/components/InlineNotice";

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
// These surahs are available in By Surah mode even before the user saves ayahs.
const SPECIAL_SURAH_NUMS = new Set([1, 112, 113, 114]);
const SURAHS_PER_PAGE = 20;
const AYAHS_PER_PAGE = 20;
const MIN_FOLLOW_UP_SELECTED_AYAHS = 4;

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

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
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
  isCorrect,
  isWrong,
}: {
  word: string;
  onTap: (word: string) => void;
  isSelected: boolean;
  isDisabled: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
}) {
  const colors = useColors();
  const chipStyle = chipStyles(colors);
  const chipDynamicStyle = [
    chipStyle.chip,
    { backgroundColor: colors.surfaceMuted, borderColor: colors.divider },
    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
    isCorrect && { backgroundColor: colors.primary, borderColor: colors.primary },
    isWrong && { backgroundColor: colors.destructive, borderColor: colors.destructive },
    isDisabled && !isSelected && !isCorrect && chipStyle.chipDisabled,
  ];
  const chipTextDynamicStyle = [
    chipStyle.chipText,
    { color: colors.foreground },
    (isSelected || isCorrect) && { color: colors.primaryForeground },
    isWrong && { color: colors.destructiveForeground },
  ];
  return (
    <TouchableOpacity
      onPress={() => { if (!isDisabled) onTap(word); }}
      activeOpacity={0.75}
      style={chipDynamicStyle}
    >
      <Text style={chipTextDynamicStyle}>{word}</Text>
    </TouchableOpacity>
  );
}

const chipStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    margin: 4,
    zIndex: 10,
  },
  chipSelected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipCorrect: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipWrong: {
    backgroundColor: colors.destructiveSoft,
    borderColor: colors.destructive,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  chipTextSelected: { color: colors.whiteText },
  chipTextWrong: { color: colors.destructiveForeground },
});

function FollowUpQuizScreen({ questions, onFinish, onBack }: { questions: FollowUpQuestion[]; onFinish: (score: number) => void; onBack: () => void }) {
  const colors = useColors();
  const followUpStyle = followUpStyles(colors);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<string | null>>(() => questions.map(() => null));
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[qIdx];
  const total = questions.length;
  const chosen = answers[qIdx];

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const handleAnswer = (option: string) => {
    if (chosen) return;
    const isCorrect = option === q.correctAnswer;
    const nextScore = score + (isCorrect ? 1 : 0);
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = option;
      return next;
    });
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (qIdx + 1 >= total) onFinish(nextScore);
      else setQIdx(qIdx + 1);
    }, 900);
  };

  const handlePrev = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setQIdx(i => Math.max(0, i - 1));
  };
  const handleNext = () => {
    if (!chosen) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (qIdx + 1 >= total) onFinish(score);
    else setQIdx(i => i + 1);
  };

  const s = {
    ...followUpStyle,
    progressTrack: { ...followUpStyle.progressTrack, backgroundColor: colors.divider },
    progressBar: { ...followUpStyle.progressBar, backgroundColor: colors.primary },
    progressLabel: { ...followUpStyle.progressLabel, color: colors.textMuted },
    card: { ...followUpStyle.card, backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
    surahLabel: { ...followUpStyle.surahLabel, color: colors.textMuted },
    ayahText: { ...followUpStyle.ayahText, color: colors.foreground },
    divider: { ...followUpStyle.divider, backgroundColor: colors.divider },
    questionText: { ...followUpStyle.questionText, color: colors.textSecondary },
    questionBold: { ...followUpStyle.questionBold, color: colors.foreground },
  };
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.quizScreenHeader}>
        <TouchableOpacity onPress={onBack} style={s.quizBackBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={[s.quizScreenTitle, { color: colors.foreground }]}>Memorization Quiz</Text>
        <Text style={[s.quizScreenSub, { color: colors.mutedForeground }]}>Follow-Up Ayah</Text>
      </View>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${((qIdx) / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>
      <QuestionNav
        canGoPrev={qIdx > 0}
        canGoNext={!!chosen}
        onPrev={handlePrev}
        onNext={handleNext}
      />

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
          let bg = colors.card;
          let border = colors.border;
          let textColor = colors.foreground;
          if (chosen) {
            if (opt === q.correctAnswer) { bg = colors.primary; border = colors.primary; textColor = colors.primaryForeground; }
            else if (opt === chosen) { bg = colors.destructive; border = colors.destructive; textColor = colors.destructiveForeground; }
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

const followUpStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  quizScreenHeader: { alignItems: "center", paddingTop: 8, paddingBottom: 4, gap: 2 },
  quizBackBtn: { position: "absolute", left: 0, top: 8, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  quizScreenTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  quizScreenSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: colors.borderSubtle, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: colors.textPrimary, borderRadius: 2 },
  progressLabel: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: colors.backgroundPrimary, borderRadius: 16, padding: 20, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  surahLabel: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  ayahText: {
    fontSize: 22, lineHeight: 36, color: colors.textPrimary,
    textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  divider: { height: 1, backgroundColor: colors.borderSubtle },
  questionText: { fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 20 },
  questionBold: { fontFamily: "Inter_700Bold", color: colors.textPrimary },
  optionsContainer: { gap: 8 },
  optionBtn: {
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  optionText: {
    fontSize: 16, lineHeight: 28, textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
});

function FillBlankQuizScreen({ questions, onFinish, onBack }: { questions: FillBlankQuestion[]; onFinish: (score: number) => void; onBack: () => void }) {
  const colors = useColors();
  const fillStyle = fillStyles(colors);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<string | null>>(() => questions.map(() => null));
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[qIdx];
  const total = questions.length;
  const filledWord = answers[qIdx];
  const feedback: "correct" | "wrong" | null = filledWord ? (filledWord === q.blankWord ? "correct" : "wrong") : null;

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const handleTap = useCallback((word: string) => {
    if (filledWord) return;
    const isCorrect = word === q.blankWord;
    const nextScore = score + (isCorrect ? 1 : 0);
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = word;
      return next;
    });
    if (isCorrect) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setScore(s => s + 1);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (qIdx + 1 >= total) onFinish(nextScore);
      else setQIdx(qIdx + 1);
    }, 900);
  }, [filledWord, onFinish, q, qIdx, score, total]);

  const handlePrev = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setQIdx(i => Math.max(0, i - 1));
  };
  const handleNext = () => {
    if (!filledWord) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (qIdx + 1 >= total) onFinish(score);
    else setQIdx(i => i + 1);
  };

  const s = {
    ...fillStyle,
    progressTrack: { ...fillStyle.progressTrack, backgroundColor: colors.divider },
    progressBar: { ...fillStyle.progressBar, backgroundColor: colors.primary },
    progressLabel: { ...fillStyle.progressLabel, color: colors.textMuted },
    surahLabel: { ...fillStyle.surahLabel, color: colors.textMuted },
    instruction: { ...fillStyle.instruction, color: colors.mutedForeground },
    blankSlot: { ...fillStyle.blankSlot, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
    blankSlotCorrect: { ...fillStyle.blankSlotCorrect, borderColor: colors.primary, backgroundColor: colors.primary },
    blankSlotWrong: { ...fillStyle.blankSlotWrong, borderColor: colors.destructive, backgroundColor: colors.destructive },
    blankFilled: { ...fillStyle.blankFilled, color: colors.foreground },
    blankFilledCorrect: { ...fillStyle.blankFilledCorrect, color: colors.primaryForeground },
    blankFilledWrong: { ...fillStyle.blankFilledWrong, color: colors.destructiveForeground },
    blankPlaceholder: { ...fillStyle.blankPlaceholder, color: colors.textMuted },
    ayahText: { ...fillStyle.ayahText, color: colors.foreground },
    blankInText: { ...fillStyle.blankInText, color: colors.primary },
    ayahCard: { ...fillStyle.ayahCard, backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
  };
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.quizScreenHeader}>
        <TouchableOpacity onPress={onBack} style={s.quizBackBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={[s.quizScreenTitle, { color: colors.foreground }]}>Memorization Quiz</Text>
        <Text style={[s.quizScreenSub, { color: colors.mutedForeground }]}>Fill in the Blank</Text>
      </View>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${((qIdx) / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>
      <QuestionNav
        canGoPrev={qIdx > 0}
        canGoNext={!!filledWord}
        onPrev={handlePrev}
        onNext={handleNext}
      />

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
            isCorrect={!!filledWord && word === q.blankWord}
            isWrong={filledWord === word && word !== q.blankWord}
            isDisabled={!!filledWord}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const fillStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 60 },
  quizScreenHeader: { alignItems: "center", paddingTop: 8, paddingBottom: 4, gap: 2 },
  quizBackBtn: { position: "absolute", left: 0, top: 8, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  quizScreenTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  quizScreenSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: colors.borderSubtle, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: colors.textPrimary, borderRadius: 2 },
  progressLabel: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  surahLabel: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  instruction: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  blankSlot: {
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderSubtle, borderStyle: "dashed",
    padding: 12, alignItems: "center", justifyContent: "center", minHeight: 48, backgroundColor: colors.surfaceSecondary,
  },
  blankSlotCorrect: { borderColor: colors.textPrimary, backgroundColor: colors.textPrimary },
  blankSlotWrong: { borderColor: colors.destructive, backgroundColor: colors.destructiveSoft },
  blankFilled: { fontSize: 20, color: colors.textPrimary, fontFamily: Platform.OS === "ios" ? "System" : undefined },
  blankFilledCorrect: { color: colors.whiteText },
  blankFilledWrong: { color: colors.destructiveForeground },
  blankPlaceholder: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  ayahCard: {
    backgroundColor: colors.backgroundPrimary, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10,
    elevation: 3, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  ayahText: {
    fontSize: 20, lineHeight: 34, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  blankInText: { color: colors.appGold, fontFamily: "Inter_700Bold", fontSize: 18 },
  dragHint: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center" },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});

function TafsirMatchQuizScreen({ questions, onFinish, onBack }: { questions: TafsirMatchQuestion[]; onFinish: (score: number) => void; onBack: () => void }) {
  const colors = useColors();
  const followUpStyle = followUpStyles(colors);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<string | null>>(() => questions.map(() => null));
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[qIdx];
  const total = questions.length;
  const chosen = answers[qIdx];

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const handleAnswer = (option: string) => {
    if (chosen) return;
    const isCorrect = option === q.correctTranslation;
    const nextScore = score + (isCorrect ? 1 : 0);
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx] = option;
      return next;
    });
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      if (qIdx + 1 >= total) onFinish(nextScore);
      else setQIdx(qIdx + 1);
    }, 900);
  };

  const handlePrev = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setQIdx(i => Math.max(0, i - 1));
  };
  const handleNext = () => {
    if (!chosen) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    if (qIdx + 1 >= total) onFinish(score);
    else setQIdx(i => i + 1);
  };

  const s = {
    ...followUpStyle,
    progressTrack: { ...followUpStyle.progressTrack, backgroundColor: colors.divider },
    progressBar: { ...followUpStyle.progressBar, backgroundColor: colors.primary },
    progressLabel: { ...followUpStyle.progressLabel, color: colors.textMuted },
    card: { ...followUpStyle.card, backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
    surahLabel: { ...followUpStyle.surahLabel, color: colors.textMuted },
    ayahText: { ...followUpStyle.ayahText, color: colors.foreground },
    divider: { ...followUpStyle.divider, backgroundColor: colors.divider },
    questionText: { ...followUpStyle.questionText, color: colors.textSecondary },
    questionBold: { ...followUpStyle.questionBold, color: colors.foreground },
  };
  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.quizScreenHeader}>
        <TouchableOpacity onPress={onBack} style={s.quizBackBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={[s.quizScreenTitle, { color: colors.foreground }]}>Memorization Quiz</Text>
        <Text style={[s.quizScreenSub, { color: colors.mutedForeground }]}>Match the Meaning</Text>
      </View>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${(qIdx / total) * 100}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{qIdx + 1}/{total}</Text>
      </View>
      <QuestionNav
        canGoPrev={qIdx > 0}
        canGoNext={!!chosen}
        onPrev={handlePrev}
        onNext={handleNext}
      />

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
          let bg = colors.card;
          let border = colors.border;
          let textColor = colors.foreground;
          if (chosen) {
            if (opt === q.correctTranslation) { bg = colors.primary; border = colors.primary; textColor = colors.primaryForeground; }
            else if (opt === chosen) { bg = colors.destructive; border = colors.destructive; textColor = colors.destructiveForeground; }
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

function ScoreScreen({ score, total, mode, onRetry, onTryDifferent, onBack }: {
  score: number; total: number; mode: "follow-up" | "fill-blank" | "tafsir-match";
  onRetry: () => void; onTryDifferent: () => void; onBack: () => void;
}) {
  const colors = useColors();
  const scoreStyle = scoreStyles(colors);
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";
  return (
    <View style={scoreStyle.container}>
      <Text style={scoreStyle.emoji}>{emoji}</Text>
      <Text style={[scoreStyle.score, { color: colors.foreground }]}>{score}/{total}</Text>
      <Text style={[scoreStyle.pct, { color: colors.textMuted }]}>{pct}%</Text>
      <Text style={[scoreStyle.label, { color: colors.foreground }]}>
        {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good work!" : "Keep practicing!"}
      </Text>
      <View style={scoreStyle.btnRow}>
        <ActionPill label="Try Again" icon="refresh-cw" variant="primary" size="lg" onPress={onRetry} />
        <ActionPill label="Try a Different One" icon="shuffle" variant="outline" size="lg" onPress={onTryDifferent} />
        <Text style={[scoreStyle.differentHint, { color: colors.textMuted }]}>Get a new set of questions from your current selection</Text>
        <TouchableOpacity style={scoreStyle.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={[scoreStyle.backText, { color: colors.textMuted }]}>Change Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const scoreStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emoji: { fontSize: 56 },
  score: { fontSize: 52, fontWeight: "700", color: colors.textPrimary, fontFamily: "Inter_700Bold" },
  pct: { fontSize: 22, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  label: { fontSize: 18, color: colors.textPrimary, fontFamily: "Inter_600SemiBold", marginBottom: 20 },
  btnRow: { gap: 12, width: "100%" },
  differentHint: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -4 },
  backBtn: { alignItems: "center", paddingVertical: 12 },
  backText: { fontSize: 15, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
});

type QuizMode = null | "follow-up" | "fill-blank" | "tafsir-match";
type AyahFilterMode = "by-ayah" | "by-surah";
type AyahTagFilter = "all" | "selected";

export default function MemorizationQuizScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    savedAyahs,
    removeAyah,
    recordQuizCompletion,
    quizSelectedSurahs,
    setQuizSelectedSurahs,
    isQuizSurahSelected,
  } = useQuran();
  const topPad = insets.top;

  const [mode, setMode] = useState<QuizMode>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<"type" | "selection" | "quiz" | "score">("type");
  const [appDialog, setAppDialog] = useState<{ title: string; message: string } | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [filterMode, setFilterMode] = useState<AyahFilterMode>("by-ayah");
  const [tagFilter, setTagFilter] = useState<AyahTagFilter>("all");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [selectedAyahIds, setSelectedAyahIds] = useState<Set<string>>(() => new Set(savedAyahs.map(a => a.id)));
  const [excludedAyahIds, setExcludedAyahIds] = useState<Set<string>>(new Set());
  const [surahSearchQuery, setSurahSearchQuery] = useState("");
  const [ayahSearchQuery, setAyahSearchQuery] = useState("");
  const [surahPage, setSurahPage] = useState(0);
  const [ayahPage, setAyahPage] = useState(0);
  const [manuallyDeselectedSurahs, setManuallyDeselectedSurahs] = useState<Set<number>>(new Set());
  const selectedQuizSurahSet = useMemo(() => new Set(quizSelectedSurahs), [quizSelectedSurahs]);

  useEffect(() => {
    setSelectedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      const shouldSelectByDefault = prev.size === 0 && excludedAyahIds.size === 0 && manuallyDeselectedSurahs.size === 0;
      for (const ayah of savedAyahs) {
        if (shouldSelectByDefault || (selectedQuizSurahSet.has(ayah.surahNumber) && !manuallyDeselectedSurahs.has(ayah.surahNumber) && !excludedAyahIds.has(ayah.id))) {
          next.add(ayah.id);
        }
      }
      return setsEqual(prev, next) ? prev : next;
    });
    setExcludedAyahIds(prev => {
      const existingIds = new Set(savedAyahs.map(a => a.id));
      const next = new Set([...prev].filter(id => existingIds.has(id)));
      return setsEqual(prev, next) ? prev : next;
    });
  }, [excludedAyahIds, savedAyahs, manuallyDeselectedSurahs, selectedQuizSurahSet]);

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

  const savedAyahsBySurah = useMemo(() => {
    const map = new Map<number, SavedAyah[]>();
    for (const ayah of savedAyahs) {
      const group = map.get(ayah.surahNumber) ?? [];
      group.push(ayah);
      map.set(ayah.surahNumber, group);
    }
    return map;
  }, [savedAyahs]);

  useEffect(() => {
    const savedSurahNums = Array.from(savedAyahsBySurah.keys()).filter(n => !manuallyDeselectedSurahs.has(n));
    const missing = savedSurahNums.filter(n => !selectedQuizSurahSet.has(n));
    if (missing.length > 0) {
      setQuizSelectedSurahs([...quizSelectedSurahs, ...missing]);
    }
  }, [savedAyahsBySurah, manuallyDeselectedSurahs, quizSelectedSurahs, selectedQuizSurahSet, setQuizSelectedSurahs]);

  const virtualSpecialAyahs = useMemo(() => {
    const savedNums = new Set(savedAyahs.map(a => a.surahNumber));
    return DEFAULT_SURAHS
      .filter(ds => SPECIAL_SURAH_NUMS.has(ds.number) && selectedQuizSurahSet.has(ds.number) && !savedNums.has(ds.number))
      .flatMap((ds) =>
        ds.ayahs.map((ayah, i) => ({
          id: `virtual-${ds.number}-${i}`,
          surahNumber: ds.number,
          ayahNumber: i + 1,
          arabicText: ayah,
          translationText: ds.translations[i] ?? "",
          surahName: ds.englishName,
          isVirtual: true,
        } as SavedAyah & { isVirtual: true }))
      );
  }, [savedAyahs, selectedQuizSurahSet]);

  const visibleAyahs = useMemo(() => {
    let ayahs: SavedAyah[] = filterMode === "by-ayah" ? [...savedAyahs, ...virtualSpecialAyahs] : savedAyahs;
    if (filterMode === "by-surah" && selectedSurahNum !== null) {
      ayahs = ayahs.filter(ayah => ayah.surahNumber === selectedSurahNum);
    }
    if (filterMode === "by-ayah") {
      if (tagFilter === "selected") ayahs = ayahs.filter(ayah =>
        (ayah as any).isVirtual
          ? selectedQuizSurahSet.has(ayah.surahNumber)
          : selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id)
      );
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
  }, [savedAyahs, virtualSpecialAyahs, filterMode, selectedSurahNum, tagFilter, selectedAyahIds, excludedAyahIds, ayahSearchQuery, selectedQuizSurahSet]);

  const filteredSurahGroups = useMemo(() => {
    if (tagFilter === "selected") {
      return surahGroups.filter(g => g.ayahs.some(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id)));
    }
    return surahGroups;
  }, [surahGroups, tagFilter, selectedAyahIds, excludedAyahIds]);

  const quizDataset = useMemo(() => {
    return savedAyahs.filter(ayah => selectedAyahIds.has(ayah.id) && !excludedAyahIds.has(ayah.id));
  }, [savedAyahs, selectedAyahIds, excludedAyahIds]);

  const allFilteredSurahs = useMemo(() => {
    const savedSurahNums = new Set(surahGroups.map(g => g.surahNumber));
    // Always include special surahs (112/113/114) even if user hasn't saved their ayahs
    let surahs = SURAH_DATA.filter(s => savedSurahNums.has(s.number) || SPECIAL_SURAH_NUMS.has(s.number));
    if (surahSearchQuery.trim()) {
      surahs = searchByType("surah", surahSearchQuery, surahs);
    }
    if (tagFilter === "selected") {
      const savedMap = new Map(surahGroups.map(g => [g.surahNumber, g.ayahs]));
      surahs = surahs.filter(s => {
        if (SPECIAL_SURAH_NUMS.has(s.number) && !savedMap.has(s.number)) return selectedQuizSurahSet.has(s.number);
        return selectedQuizSurahSet.has(s.number) && savedMap.get(s.number)?.some(a => selectedAyahIds.has(a.id) && !excludedAyahIds.has(a.id));
      });
    }
    return surahs;
  }, [surahSearchQuery, tagFilter, surahGroups, selectedAyahIds, excludedAyahIds, selectedQuizSurahSet]);

  const totalSurahPages = Math.max(1, Math.ceil(allFilteredSurahs.length / SURAHS_PER_PAGE));

  const pagedSurahs = useMemo(() => {
    const start = surahPage * SURAHS_PER_PAGE;
    return allFilteredSurahs.slice(start, start + SURAHS_PER_PAGE);
  }, [allFilteredSurahs, surahPage]);

  const selectedSurahCount = useMemo(() => {
    const visibleNums = new Set(allFilteredSurahs.map(s => s.number));
    return quizSelectedSurahs.filter(n => visibleNums.has(n)).length;
  }, [allFilteredSurahs, quizSelectedSurahs]);

  const selectedQuizPoolAyahCount = useMemo(() => {
    const savedNums = new Set(quizDataset.map(a => a.surahNumber));
    const savedCount = quizDataset.filter(a => selectedQuizSurahSet.has(a.surahNumber)).length;
    const defaultCount = DEFAULT_SURAHS
      .filter(s => selectedQuizSurahSet.has(s.number) && !savedNums.has(s.number))
      .reduce((sum, s) => sum + s.ayahs.length, 0);
    return savedCount + defaultCount;
  }, [quizDataset, selectedQuizSurahSet]);

  const totalAyahPages = Math.max(1, Math.ceil(visibleAyahs.length / AYAHS_PER_PAGE));

  const pagedVisibleAyahs = useMemo(() => {
    const start = ayahPage * AYAHS_PER_PAGE;
    return visibleAyahs.slice(start, start + AYAHS_PER_PAGE);
  }, [visibleAyahs, ayahPage]);

  const ayahsByJuz = useMemo(() => {
    const result: { juz: number; ayahs: SavedAyah[] }[] = [];
    for (const ayah of pagedVisibleAyahs) {
      const juz = SURAH_DATA[ayah.surahNumber - 1]?.juz ?? 1;
      const last = result[result.length - 1];
      if (!last || last.juz !== juz) result.push({ juz, ayahs: [ayah] });
      else last.ayahs.push(ayah);
    }
    return result;
  }, [pagedVisibleAyahs]);

  const startQuiz = useCallback(() => {
    if (!mode) return;
    if (selectedQuizPoolAyahCount === 0) {
      setFilterMode("by-surah");
      setPhase("selection");
      return;
    }
    const savedAyahsFromSelectedSurahs = quizDataset.filter(a => selectedQuizSurahSet.has(a.surahNumber));
    const savedNums = new Set(savedAyahsFromSelectedSurahs.map(a => a.surahNumber));
    const defaultSurahsFromSelectedSurahs = DEFAULT_SURAHS.filter(
      ds => selectedQuizSurahSet.has(ds.number) && !savedNums.has(ds.number)
    );
    const surahs = [
      ...savedAyahsToSurahFormat(savedAyahsFromSelectedSurahs),
      ...defaultSurahsFromSelectedSurahs,
    ];
    let qs: Question[] = [];
    if (mode === "follow-up") {
      qs = buildFollowUpQuestions(5, surahs);
    } else if (mode === "fill-blank") {
      qs = buildFillBlankQuestions(5, surahs);
    } else {
      qs = buildTafsirMatchQuestions(5, surahs);
    }
    if (qs.length === 0) {
      const selectedCountText = `You currently have ${selectedQuizPoolAyahCount} ayah${selectedQuizPoolAyahCount !== 1 ? "s" : ""} selected.`;
      const message = mode === "follow-up"
        ? `Follow-up needs at least ${MIN_FOLLOW_UP_SELECTED_AYAHS} selected ayahs, including 2 consecutive ayahs from the same Surah (for example, Ayah 1 and 2). ${selectedCountText}`
        : `Select more Surahs or Ayahs to build this quiz. ${selectedCountText}`;
      setAppDialog({ title: "Not enough selected ayahs", message });
      return;
    }
    setQuestions(qs);
    setPhase("quiz");
    setFinalScore(0);
  }, [mode, quizDataset, selectedQuizPoolAyahCount, selectedQuizSurahSet]);

  const chooseMode = useCallback((selectedMode: NonNullable<QuizMode>) => {
    setMode(selectedMode);
    setPhase("selection");
  }, []);

  const toggleSelected = useCallback((id: string) => {
    const ayah = savedAyahs.find(a => a.id === id);
    if (!ayah) return;

    const nextSelectedIds = new Set(selectedAyahIds);
    const nextExcludedIds = new Set(excludedAyahIds);
    const isSelected = nextSelectedIds.has(id);

    if (isSelected) {
      nextSelectedIds.delete(id);
      nextExcludedIds.add(id);
      const hasSelectedAyahInSurah = savedAyahs.some(a => a.surahNumber === ayah.surahNumber && nextSelectedIds.has(a.id));
      if (!hasSelectedAyahInSurah) {
        setQuizSelectedSurahs(quizSelectedSurahs.filter(n => n !== ayah.surahNumber));
        setManuallyDeselectedSurahs(prev => { const n = new Set(prev); n.add(ayah.surahNumber); return n; });
      }
    } else {
      nextSelectedIds.add(id);
      nextExcludedIds.delete(id);
      if (!selectedQuizSurahSet.has(ayah.surahNumber)) {
        setQuizSelectedSurahs([...quizSelectedSurahs, ayah.surahNumber]);
      }
      setManuallyDeselectedSurahs(prev => { const n = new Set(prev); n.delete(ayah.surahNumber); return n; });
    }

    setSelectedAyahIds(nextSelectedIds);
    setExcludedAyahIds(nextExcludedIds);
  }, [excludedAyahIds, quizSelectedSurahs, savedAyahs, selectedAyahIds, selectedQuizSurahSet, setQuizSelectedSurahs]);

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
    recordQuizCompletion();
  }, [recordQuizCompletion]);

  const handleRetry = useCallback(() => {
    startQuiz();
  }, [startQuiz]);

  const handleTryDifferent = useCallback(() => {
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
    return isQuizSurahSelected(surahNum);
  }, [isQuizSurahSelected]);

  const toggleSurah = useCallback((surahNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ayahsInSurah = savedAyahsBySurah.get(surahNum) ?? [];
    const nextSelectedIds = new Set(selectedAyahIds);
    const nextExcludedIds = new Set(excludedAyahIds);

    if (selectedQuizSurahSet.has(surahNum)) {
      setQuizSelectedSurahs(quizSelectedSurahs.filter(n => n !== surahNum));
      ayahsInSurah.forEach(ayah => {
        nextSelectedIds.delete(ayah.id);
        nextExcludedIds.add(ayah.id);
      });
      setManuallyDeselectedSurahs(prev => { const n = new Set(prev); n.add(surahNum); return n; });
    } else {
      setQuizSelectedSurahs([...quizSelectedSurahs, surahNum]);
      ayahsInSurah.forEach(ayah => {
        nextSelectedIds.add(ayah.id);
        nextExcludedIds.delete(ayah.id);
      });
      setManuallyDeselectedSurahs(prev => { const n = new Set(prev); n.delete(surahNum); return n; });
    }

    setSelectedAyahIds(nextSelectedIds);
    setExcludedAyahIds(nextExcludedIds);
  }, [excludedAyahIds, quizSelectedSurahs, savedAyahsBySurah, selectedAyahIds, selectedQuizSurahSet, setQuizSelectedSurahs]);

  const handleSelectAll = useCallback(() => {
    if (filterMode === "by-ayah") {
      const ids = visibleAyahs.map(a => a.id);
      const surahNums = Array.from(new Set(visibleAyahs.map(a => a.surahNumber)));
      setSelectedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
      setQuizSelectedSurahs([...quizSelectedSurahs, ...surahNums]);
      setManuallyDeselectedSurahs(prev => {
        const n = new Set(prev);
        surahNums.forEach(surahNum => n.delete(surahNum));
        return n;
      });
    } else {
      setQuizSelectedSurahs([...quizSelectedSurahs, ...allFilteredSurahs.map(s => s.number)]);
      setSelectedAyahIds(prev => {
        const n = new Set(prev);
        allFilteredSurahs.forEach(surah => savedAyahsBySurah.get(surah.number)?.forEach(ayah => n.add(ayah.id)));
        return n;
      });
      setExcludedAyahIds(prev => {
        const n = new Set(prev);
        allFilteredSurahs.forEach(surah => savedAyahsBySurah.get(surah.number)?.forEach(ayah => n.delete(ayah.id)));
        return n;
      });
      setManuallyDeselectedSurahs(prev => {
        const n = new Set(prev);
        allFilteredSurahs.forEach(surah => n.delete(surah.number));
        return n;
      });
    }
  }, [filterMode, visibleAyahs, allFilteredSurahs, quizSelectedSurahs, savedAyahsBySurah, setQuizSelectedSurahs]);

  const handleClearAll = useCallback(() => {
    if (filterMode === "by-ayah") {
      const ids = visibleAyahs.map(a => a.id);
      const nextSelectedIds = new Set(selectedAyahIds);
      const visibleSurahNums = Array.from(new Set(visibleAyahs.map(a => a.surahNumber)));
      ids.forEach(id => nextSelectedIds.delete(id));
      setSelectedAyahIds(nextSelectedIds);
      setExcludedAyahIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      const surahsToRemove = visibleSurahNums.filter(surahNum => {
        const ayahsInSurah = savedAyahsBySurah.get(surahNum) ?? [];
        return !ayahsInSurah.some(ayah => nextSelectedIds.has(ayah.id));
      });
      if (surahsToRemove.length > 0) {
        const removeSet = new Set(surahsToRemove);
        setQuizSelectedSurahs(quizSelectedSurahs.filter(n => !removeSet.has(n)));
        setManuallyDeselectedSurahs(prev => {
          const n = new Set(prev);
          surahsToRemove.forEach(surahNum => n.add(surahNum));
          return n;
        });
      }
    } else {
      const visibleNums = new Set(allFilteredSurahs.map(s => s.number));
      setQuizSelectedSurahs(quizSelectedSurahs.filter(n => !visibleNums.has(n)));
      setSelectedAyahIds(prev => {
        const n = new Set(prev);
        visibleNums.forEach(surahNum => savedAyahsBySurah.get(surahNum)?.forEach(ayah => n.delete(ayah.id)));
        return n;
      });
      setExcludedAyahIds(prev => {
        const n = new Set(prev);
        visibleNums.forEach(surahNum => savedAyahsBySurah.get(surahNum)?.forEach(ayah => n.add(ayah.id)));
        return n;
      });
      setManuallyDeselectedSurahs(prev => {
        const n = new Set(prev);
        visibleNums.forEach(surahNum => n.add(surahNum));
        return n;
      });
    }
  }, [filterMode, visibleAyahs, allFilteredSurahs, quizSelectedSurahs, savedAyahsBySurah, selectedAyahIds, setQuizSelectedSurahs]);

  const renderAyahRow = (ayah: SavedAyah) => {
    const checked = selectedAyahIds.has(ayah.id);
    const excluded = excludedAyahIds.has(ayah.id);
    return (
      <View key={ayah.id} style={[s.selectionAyahCard, colors.cardStyle, excluded && s.selectionAyahCardExcluded]}>
        <TouchableOpacity
          style={s.checkBtn}
          onPress={() => toggleSelected(ayah.id)}
          activeOpacity={0.75}
        >
          {checked
            ? <Ionicons name="checkmark-circle" size={26} color="#7B5C3E" />
            : <View style={s.checkCircle} />}
        </TouchableOpacity>
        <View style={s.selectionAyahInfo}>
          <Text style={s.selectionMeta}>{ayah.surahName} · Ayah {ayah.ayahNumber}</Text>
          <Text style={s.selectionArabic} numberOfLines={1}>{ayah.arabicText}</Text>
          <Text style={s.selectionTranslation} numberOfLines={1}>{ayah.translationText || "No translation saved"}</Text>
        </View>
        <TouchableOpacity onPress={() => removeSavedAyah(ayah.id)} style={s.savedRemoveBtn} activeOpacity={0.7}>
          <Feather name="trash-2" size={16} color={colors.appError} />
        </TouchableOpacity>
      </View>
    );
  };

  const s = pageStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {phase === "score" && (
        <View style={[s.header, { paddingTop: 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.appText} />
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
        <>
          <View style={[s.selectionPageHeader, { paddingTop: 8 }]}>
            <View style={s.selectionHeaderTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={s.circleBackBtn}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={22} color={colors.appText} />
              </TouchableOpacity>
              <Text style={[s.selectionModeLabelText, { color: colors.mutedForeground }]}>MEMORIZATION QUIZ</Text>
            </View>
            <Text style={[s.selectionPageTitle, { color: colors.foreground }]}>Choose a Quiz Type</Text>
          </View>
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
              style={[s.modeCard2, colors.cardStyle]}
              onPress={() => chooseMode(item.mode)}
              activeOpacity={0.85}
            >
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
        </>
      )}

      {phase === "selection" && (
        <View style={s.selectionWrap}>
          {/* Page header — fixed */}
          <View style={[s.selectionPageHeader, { paddingTop: 12 }]}>
            <View style={s.selectionHeaderTopRow}>
              <TouchableOpacity
                onPress={handleBack}
                style={s.circleBackBtn}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={22} color={colors.appText} />
              </TouchableOpacity>
              <Text style={[s.selectionModeLabelText, { color: colors.mutedForeground }]}>
                {mode === "follow-up" ? "FOLLOW-UP AYAH"
                  : mode === "fill-blank" ? "FILL IN THE BLANK"
                  : "MATCH THE MEANING"}
              </Text>
            </View>
            <Text style={[s.selectionPageTitle, { color: colors.foreground }]}>Select Ayahs</Text>
          </View>
          {/* Segmented toggle — fixed */}
          <View style={s.segmentWrapper}>
            <HifzSegmentedControl
              options={[
                { value: "by-surah" as AyahFilterMode, label: "By Surah" },
                { value: "by-ayah" as AyahFilterMode, label: "By Ayah" },
              ]}
              value={filterMode}
              onChange={(v) => { setFilterMode(v); setSelectedSurahNum(null); setSurahPage(0); setAyahPage(0); setSurahSearchQuery(""); setAyahSearchQuery(""); }}
            />
          </View>

          {/* Scrollable list region */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
                  onChangeText={text => { setAyahSearchQuery(text); setAyahPage(0); }}
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
              {([{ key: "all", label: "All" }, { key: "selected", label: "Selected" }] as const).map(item => (
                <Tag
                  key={item.key}
                  label={item.label}
                  selected={tagFilter === item.key}
                  onPress={() => { setTagFilter(item.key); setSelectedSurahNum(null); setSurahPage(0); setAyahPage(0); }}
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

          <View style={s.selectionContent2}>
            {filterMode === "by-surah" ? (
              <>
                {selectedQuizPoolAyahCount === 0 && (
                  <InlineNotice
                    variant="info"
                    description="No Surah selected, please select a Surah or Ayah to continue"
                    style={s.emptySelectionBox}
                  />
                )}
                {/* Info text for special surahs */}
                <InlineNotice
                  variant="info"
                  density="compact"
                  description="Bookmark ayahs from the Reading screen to add them here."
                  style={{ marginBottom: 8 }}
                />
                {pagedSurahs.length === 0 ? (
                  <InlineNotice
                    variant="info"
                    description={surahGroups.length === 0 ? "No saved ayahs yet. Bookmark ayahs from the Reading screen to add them here." : surahSearchQuery.trim() ? "No surahs match your search." : "No surahs match this filter."}
                  />
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
                        const isSpecial = SPECIAL_SURAH_NUMS.has(surah.number);
                        const isVirtualSpecial = isSpecial && savedCount === 0;
                        const selected = isSurahSelected(surah.number);
                        const origin = MEDINAN_SURAHS.has(surah.number) ? "Medinan" : "Meccan";
                        const metaText = isVirtualSpecial
                          ? `Default · ${surah.ayahCount} ayahs · ${origin}`
                          : `${savedCount} saved · ${surah.ayahCount} ayahs · ${origin}`;
                        return (
                          <TouchableOpacity
                            key={surah.number}
                            style={[s.surahCard2, colors.cardStyle, selected && { borderColor: colors.appSelectedPill, backgroundColor: colors.appCardPressed }]}
                            onPress={() => toggleSurah(surah.number)}
                            activeOpacity={0.8}
                          >
                            <View style={[s.surahBadge2, selected ? { backgroundColor: colors.appSelectedPill, borderColor: colors.appSelectedPill } : { backgroundColor: colors.appSoftPill, borderColor: colors.appSoftBorder }]}>
                              {selected && <Feather name="check" size={14} color={colors.appText} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.surahCard2Name, { color: colors.foreground }]}>{surah.englishName}</Text>
                              <Text style={[s.surahCard2Meta, { color: colors.mutedForeground }]}>{metaText}</Text>
                            </View>
                            <Text style={[s.surahCard2Arabic, { color: colors.mutedForeground }]}>{surah.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ));
                })()}
              </>
            ) : (
              ayahsByJuz.length === 0 ? (
                <InlineNotice
                  variant="info"
                  description={ayahSearchQuery.trim() ? "No ayahs match your search." : tagFilter === "all" ? "No saved ayahs yet. Bookmark ayahs from the Reading screen to add them here." : "No ayahs match this filter."}
                />
              ) : (
                <>
                  <Text style={[s.swipeHint, { color: colors.mutedForeground }]}>← swipe left to remove · swipe right to open →</Text>
                  {ayahsByJuz.map(group => (
                <View key={group.juz}>
                  <Text style={[s.juzHeader, { color: colors.mutedForeground }]}>JUZ {group.juz}</Text>
                  {group.ayahs.map(ayah => {
                    const isVirtual = !!(ayah as any).isVirtual;
                    const checked = isVirtual ? selectedQuizSurahSet.has(ayah.surahNumber) : selectedAyahIds.has(ayah.id);
                    const juz = SURAH_DATA[ayah.surahNumber - 1]?.juz ?? 1;
                    const cardContent = (
                      <View
                        style={[s.ayahCard2, colors.cardStyle, checked && { borderColor: colors.appSelectedPill, backgroundColor: colors.appCardPressed }]}
                      >
                        <TouchableOpacity
                          style={[s.ayahBadge2, checked ? { backgroundColor: colors.appSelectedPill, borderColor: colors.appSelectedPill } : { backgroundColor: colors.appSoftPill, borderColor: colors.appSoftBorder }]}
                          onPress={() => isVirtual ? toggleSurah(ayah.surahNumber) : toggleSelected(ayah.id)}
                          activeOpacity={0.75}
                        >
                          {checked && <Feather name="check" size={12} color={colors.appText} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => isVirtual ? toggleSurah(ayah.surahNumber) : toggleSelected(ayah.id)} activeOpacity={0.75}>
                          <View style={s.ayahCard2Header}>
                            <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>{ayah.surahName.toUpperCase()} · {ayah.ayahNumber}</Text>
                            <Text style={[s.ayahCard2Meta, { color: colors.mutedForeground }]}>JUZ {juz}</Text>
                          </View>
                          <Text style={[s.ayahCard2Arabic, { color: colors.foreground }]}>{ayah.arabicText}</Text>
                          <Text style={[s.ayahCard2Translation, { color: colors.mutedForeground }]} numberOfLines={2}>{ayah.translationText || "No translation saved"}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                    if (isVirtual) return <View key={ayah.id}>{cardContent}</View>;
                    return (
                      <SwipeableRow
                        key={ayah.id}
                        onDelete={() => removeSavedAyah(ayah.id)}
                        onOpen={() => {
                          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                          router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`);
                        }}
                      >
                        {cardContent}
                      </SwipeableRow>
                    );
                  })}
                </View>
              ))}
                </>
              )
            )}
          </View>
            <View style={{ paddingHorizontal: 16 }}>
              {filterMode === "by-surah" ? (
                <Pagination
                  page={surahPage}
                  totalPages={totalSurahPages}
                  totalItems={allFilteredSurahs.length}
                  itemLabel="surah"
                  onPrev={() => setSurahPage(p => Math.max(0, p - 1))}
                  onNext={() => setSurahPage(p => Math.min(totalSurahPages - 1, p + 1))}
                />
              ) : (
                <Pagination
                  page={ayahPage}
                  totalPages={totalAyahPages}
                  totalItems={visibleAyahs.length}
                  itemLabel="ayah"
                  onPrev={() => setAyahPage(p => Math.max(0, p - 1))}
                  onNext={() => setAyahPage(p => Math.min(totalAyahPages - 1, p + 1))}
                />
              )}
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Bottom panel */}
          <View style={[s.startPanel2, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[s.startBtn2, selectedQuizPoolAyahCount === 0 && s.startBtn2Disabled]}
              onPress={startQuiz}
              activeOpacity={0.85}
              disabled={selectedQuizPoolAyahCount === 0}
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
          onBack={handleBack}
        />
      )}

      {phase === "quiz" && mode === "fill-blank" && questions.length > 0 && (
        <FillBlankQuizScreen
          questions={questions as FillBlankQuestion[]}
          onFinish={handleFinish}
          onBack={handleBack}
        />
      )}

      {phase === "quiz" && mode === "tafsir-match" && questions.length > 0 && (
        <TafsirMatchQuizScreen
          questions={questions as TafsirMatchQuestion[]}
          onFinish={handleFinish}
          onBack={handleBack}
        />
      )}

      {phase === "score" && mode && (
        <ScoreScreen
          score={finalScore}
          total={questions.length}
          mode={mode}
          onRetry={handleRetry}
          onTryDifferent={handleTryDifferent}
          onBack={handleBack}
        />
      )}
      <AppDialog
        visible={!!appDialog}
        title={appDialog?.title ?? ""}
        message={appDialog?.message}
        onCancel={() => setAppDialog(null)}
      />
    </View>
  );
}

const pageStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
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
    backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.borderSubtle,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  modeIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.textPrimary, alignItems: "center", justifyContent: "center",
  },
  modeInfo: { flex: 1 },
  modeName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modeDesc: { fontSize: 13, color: colors.textTertiary, fontFamily: "Inter_400Regular", lineHeight: 19 },
  emptySelectionBox: { marginBottom: 8 },
  selectionWrap: { flex: 1, flexDirection: "column" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterChipText: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_700Bold" },
  filterChipTextActive: { color: colors.whiteText },
  tagRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagChipActive: { backgroundColor: "#EEE8DF", borderColor: colors.borderSubtle },
  tagText: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_700Bold" },
  tagTextActive: { color: colors.textPrimary },
  selectionContent: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 24 },
  selectionAyahCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  selectionAyahCardExcluded: { opacity: 0.62, backgroundColor: colors.surfaceSecondary },
  checkBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  selectionAyahInfo: { flex: 1 },
  selectionMeta: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_700Bold", marginBottom: 4 },
  selectionArabic: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 3,
  },
  selectionTranslation: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular", marginBottom: 8 },
  excludeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  excludeToggle: {
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.borderSubtle,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  excludeToggleActive: { backgroundColor: colors.textPrimary, alignItems: "flex-end" },
  excludeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.appCardWarm },
  excludeText: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular" },
  surahSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
  },
  surahBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  surahBadgeText: { fontSize: 12, color: colors.whiteText, fontFamily: "Inter_700Bold" },
  surahSelectName: { fontSize: 14, color: colors.textPrimary, fontFamily: "Inter_700Bold" },
  surahSelectMeta: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular", marginTop: 2 },
  drillBack: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  drillBackText: { fontSize: 13, color: colors.textPrimary, fontFamily: "Inter_700Bold" },
  startPanel: {
    backgroundColor: colors.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    padding: 16,
    paddingTop: 12,
    gap: 8,
  },
  startSummary: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_700Bold", textAlign: "center" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText: { fontSize: 15, color: colors.onAccent, fontFamily: "Inter_700Bold" },
  savedSection: { marginTop: 4, gap: 8 },
  savedSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  savedSectionTitle: { fontSize: 12, fontWeight: "700", color: colors.textTertiary, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  savedAyahRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  savedAyahInfo: { flex: 1 },
  savedAyahArabic: { fontSize: 15, color: colors.textPrimary, fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "right", lineHeight: 22 },
  savedAyahMeta: { fontSize: 12, color: colors.textTertiary, fontFamily: "Inter_400Regular", marginTop: 4 },
  savedRemoveBtn: { padding: 6 },

  // ── Type phase content ──
  typeContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 12 },
  typeSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  modeCard2: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
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

  // ── Segmented toggle ──
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

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
  tagActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  tagActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  swipeHint: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6, marginTop: 4 },

  // ── JUZ section header ──
  juzHeader: {
    fontSize: 12,
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
  startBtn2: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  startBtn2Disabled: { opacity: 0.45 },
  startBtnText2: { fontSize: 15, color: colors.onAccent, fontFamily: "Inter_700Bold" },
});
