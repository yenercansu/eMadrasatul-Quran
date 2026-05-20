import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Share,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type Goal, type MemorizationGoal } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { getJuzAyahs, SURAH_DATA, type AyahRef } from "@/constants/surahData";
import {
  buildWeeklyGoal,
  findNextIncompleteJuz,
  findNextIncompleteSurah,
  getAyahKey,
  getFirstUnmemorizedAyah,
  getGoalRangeAyahs,
  getNextAyahAfter,
  isSurahFullyMemorized,
  MAX_WEEKLY_AYAHS,
} from "@/services/hifzLogic";
import { AyahRangeModal, type AyahRangeResult } from "@/components/AyahRangeModal";
import { SubSectionTitle } from "@/components/Typography";
import { MemorizedBadge } from "@/components/SurahCard";
import { HifzGoalSetupModal, type PaceRhythm } from "@/components/hifz/HifzGoalSetupModal";
import { HifzHeroCard } from "@/components/hifz/HifzUI";
import { VerseCard } from "@/components/VerseCard";
import { ActionPill } from "@/components/ActionPill";
import { InlineNotice } from "@/components/InlineNotice";
import { FullQuranCertificate } from "@/components/cert/FullQuranCertificate";
import { AppDialog } from "@/components/AppDialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAdaptiveForecast } from "@/hooks/useAdaptiveForecast";
import { SwipeToast } from "@/components/SwipeToast";

const TOTAL_AYAHS = 6236;
const WEEKLY_TOAST_CELEBRATIONS_KEY = "@squran/weekly-complete-toast-celebrations-v1";


function expandLastAyahForWeeklyCount(options: {
  path: "surah" | "juz";
  targetJuz?: number;
  first: AyahRef;
  last: AyahRef;
  requestedAyahsPerWeek: number;
  memorizedAyahKeys: string[];
}) {
  const source = options.path === "juz" && options.targetJuz
    ? getJuzAyahs(options.targetJuz)
    : (() => {
        const surah = SURAH_DATA.find(s => s.number === options.first.surahNumber);
        if (!surah) return [];
        return Array.from({ length: surah.ayahCount }, (_, index) => ({
          surahNumber: surah.number,
          surahName: surah.englishName,
          ayahNumber: index + 1,
        }));
      })();
  const firstIdx = source.findIndex(
    a => a.surahNumber === options.first.surahNumber && a.ayahNumber === options.first.ayahNumber
  );
  const lastIdx = source.findIndex(
    a => a.surahNumber === options.last.surahNumber && a.ayahNumber === options.last.ayahNumber
  );
  if (firstIdx < 0) return options.last;

  const memorized = new Set(options.memorizedAyahKeys);
  let available = 0;
  let expandedLast = lastIdx >= firstIdx ? source[lastIdx] : options.last;
  for (let i = firstIdx; i < source.length; i++) {
    const ayah = source[i];
    if (!memorized.has(getAyahKey(ayah))) available++;
    expandedLast = ayah;
    if (available >= options.requestedAyahsPerWeek) break;
  }
  return expandedLast;
}

function CircularRing({
  percent, size = 60, strokeWidth = 5,
  color, trackColor, label,
}: {
  percent: number; size?: number; strokeWidth?: number;
  color?: string; trackColor?: string; label?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const dashOffset = circumference - (p / 100) * circumference;
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center} cy={center} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: size * 0.2, fontWeight: "700", color, fontFamily: "Inter_700Bold" }}>
          {Math.round(p)}%
        </Text>
        {label ? (
          <Text style={{ fontSize: size * 0.15, fontWeight: "700", color, fontFamily: "Inter_700Bold", textAlign: "center" }}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    lastListened, goal, setGoal, memorizationGoal, setMemorizationGoal,
    todayEntry, dailyEntries, onlineUsers, recentProgress, savedSurahs,
    getWeekGoalAyahs, isSurahChecked, markAyahsMemorized, recordMilestoneCompletion,
    memorizedAyahKeys, resetHifzProgress, toggleAyahMemorized, removeMemorizedAyahKeys,
  } = useQuran();
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyGoalVisible, setWeeklyGoalVisible] = useState(false);
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [showHifzCompleteToast, setShowHifzCompleteToast] = useState(false);
  const [hifzCompleteToastText, setHifzCompleteToastText] = useState({
    title: "Hifz step complete",
    sub: "Your journey is continuing.",
  });
  const [continuationNotice, setContinuationNotice] = useState<{
    completed: string;
    upNext: string;
    copy: string;
  } | null>(null);
  const [hifzTransition, setHifzTransition] = useState<{
    completed: string;
    upNext: string;
    nextGoal: Goal;
    nextMemorizationGoal: MemorizationGoal;
    nextWidgetPath: "surah" | "juz";
    nextFirstAyah: AyahRef;
    nextLastAyah: AyahRef;
    nextJuz: number | null;
    totalAyahs: number;
  } | null>(null);
  const [hifzTransitionProgress, setHifzTransitionProgress] = useState(0);
  const [showWeeklyToast, setShowWeeklyToast] = useState(false);
  const [showWeekCompleteCard, setShowWeekCompleteCard] = useState(false);
  const [showHifzGoalOptions, setShowHifzGoalOptions] = useState(false);
  const [showRestartHifzConfirm, setShowRestartHifzConfirm] = useState(false);
  const [revisionJourneyStarted, setRevisionJourneyStarted] = useState(false);
  const [hifzSetupVisible, setHifzSetupVisible] = useState(false);
  const [setupInitialSurahNumber, setSetupInitialSurahNumber] = useState<number | undefined>(undefined);
  const [setupInitialJuz, setSetupInitialJuz] = useState<number | undefined>(undefined);
  const [setupStartAtAyahSelection, setSetupStartAtAyahSelection] = useState(false);
  const [paceRhythm, setPaceRhythm] = useState<PaceRhythm>("gentle");
  const [paceDaysPerWeek, setPaceDaysPerWeek] = useState(1);
  const [paceTargetDaysPerWeek, setPaceTargetDaysPerWeek] = useState(4);
  const [hifzDirection, setHifzDirection] = useState<"forward" | "reverse">("forward");
  const prevMemPercentRef = useRef<number | null>(null);
  const prevWeekPercentRef = useRef<number | null>(null);
  const prevMilestoneCompleteRef = useRef<boolean | null>(null);
  const weeklyToastCelebratedRef = useRef<Set<string>>(new Set());
  const [weeklyToastCelebrationsLoaded, setWeeklyToastCelebrationsLoaded] = useState(false);

  // ── Hifz Goal Widget state ────────────────────────────────────────────────
  const [widgetPath, setWidgetPath] = useState<"surah" | "juz">("surah");
  const [widgetFirstAyah, setWidgetFirstAyah] = useState<AyahRef | null>(null);
  const [widgetLastAyah, setWidgetLastAyah] = useState<AyahRef | null>(null);
  const [widgetJuz, setWidgetJuz] = useState<number | null>(null);
  const [ayahRangeVisible, setAyahRangeVisible] = useState(false);
  const [paceDateVisible, setPaceDateVisible] = useState(false);
  const [paceDateInitialStep, setPaceDateInitialStep] = useState(0);
  const [pendingCheck, setPendingCheck] = useState(false);
  const [dotPendingIndex, setDotPendingIndex] = useState<number | null>(null);

  const surahsQuery = useQuery({ queryKey: ["chapters"], queryFn: fetchSurahs });
  const surahs = surahsQuery.data ?? [];

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await surahsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [surahsQuery]);

  const weekGoalAyahs = useMemo(() => goal ? getWeekGoalAyahs() : [], [goal, getWeekGoalAyahs]);
  const isPaceGoal = memorizationGoal?.path === "pace";
  const weekStartStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  }, []);
  const paceWeekMemorizedProgress = useMemo(() => {
    const memorized = new Set(memorizedAyahKeys);
    const weekKeys = new Set<string>();
    for (const entry of dailyEntries) {
      if (entry.date < weekStartStr) continue;
      for (const key of entry.readAyahKeys ?? []) {
        if (memorized.has(key)) weekKeys.add(key);
      }
    }
    return weekKeys.size;
  }, [dailyEntries, memorizedAyahKeys, weekStartStr]);
  const isRevisionGoal = goal?.isRevision === true;
  const effectiveGoalCount = isPaceGoal ? (goal?.ayahsPerWeek ?? 0) : weekGoalAyahs.length;
  const weekGoalProgress = useMemo(() => {
    if (!goal) return 0;
    if (isPaceGoal) return Math.min(goal.ayahsPerWeek, paceWeekMemorizedProgress);
    const memorized = new Set(memorizedAyahKeys);
    return weekGoalAyahs.filter(a => memorized.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
  }, [goal, isPaceGoal, paceWeekMemorizedProgress, weekGoalAyahs, memorizedAyahKeys]);

  const weeklyCompletionSignature = useMemo(() => {
    if (!goal || weekGoalAyahs.length === 0) return null;
    const targetKeys = weekGoalAyahs.map(getAyahKey).join(",");
    return [
      weekStartStr,
      goal.startDate,
      memorizationGoal?.path ?? "none",
      memorizationGoal?.targetJuz ?? "none",
      targetKeys,
    ].join("|");
  }, [goal, memorizationGoal?.path, memorizationGoal?.targetJuz, weekGoalAyahs, weekStartStr]);

  useEffect(() => {
    AsyncStorage.getItem(WEEKLY_TOAST_CELEBRATIONS_KEY)
      .then((value) => {
        const parsed = value ? JSON.parse(value) : [];
        weeklyToastCelebratedRef.current = new Set(Array.isArray(parsed) ? parsed : []);
      })
      .catch(() => {})
      .finally(() => setWeeklyToastCelebrationsLoaded(true));
  }, []);

  const juzGroups = useMemo(() => {
    if (surahs.length === 0) return [];
    const groups: { juz: number; surahs: ApiSurah[] }[] = [];
    let currentJuz = 0;
    for (const surah of surahs) {
      const meta = SURAH_DATA[surah.number - 1];
      if (!meta) continue;
      if (meta.juz !== currentJuz) {
        currentJuz = meta.juz;
        groups.push({ juz: currentJuz, surahs: [] });
      }
      groups[groups.length - 1].surahs.push(surah);
    }
    return groups;
  }, [surahs]);

  const totalMemorized = useMemo(() => {
    if (!memorizationGoal) return 0;
    if (memorizationGoal.path === "pace") return memorizedAyahKeys.length;
    if (memorizationGoal.path === "surah") {
      const targetSurahNum = memorizationGoal.startSurahNumber;
      return memorizedAyahKeys.filter((key) => {
        const [surahRaw, ayahRaw] = key.split(":");
        return Number(surahRaw) === targetSurahNum && Number.isFinite(Number(ayahRaw));
      }).length;
    }
    const targetJuzAyahKeys = memorizationGoal.path === "juz" && memorizationGoal.targetJuz
      ? new Set(getJuzAyahs(memorizationGoal.targetJuz).map(a => `${a.surahNumber}:${a.ayahNumber}`))
      : null;
    return memorizedAyahKeys.filter((key) => {
      const [surahRaw, ayahRaw] = key.split(":");
      if (!Number.isFinite(Number(surahRaw)) || !Number.isFinite(Number(ayahRaw))) return false;
      return !!targetJuzAyahKeys?.has(key);
    }).length;
  }, [memorizedAyahKeys, memorizationGoal]);

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dailyEntries.find(e => e.date === dateStr);
      if (entry && (entry.ayahsRead > 0 || entry.kahfCompleted || entry.quizCompleted)) streak++;
      else break;
    }
    return streak;
  }, [dailyEntries]);

  const remainingAyahGroups = useMemo(() => {
    if (!goal) return [];
    const memorized = new Set(memorizedAyahKeys);
    const remaining = weekGoalAyahs.filter(a => !memorized.has(`${a.surahNumber}:${a.ayahNumber}`));
    const groups: { surahNumber: number; surahName: string; count: number; ayahs: typeof weekGoalAyahs }[] = [];
    for (const a of remaining) {
      const last = groups[groups.length - 1];
      if (last?.surahNumber === a.surahNumber) { last.count++; last.ayahs.push(a); }
      else groups.push({ surahNumber: a.surahNumber, surahName: a.surahName, count: 1, ayahs: [a] });
    }
    return groups;
  }, [goal, weekGoalAyahs, memorizedAyahKeys]);

  const targetJuz = memorizationGoal?.path === "juz"
    ? (memorizationGoal.targetJuz ?? 1)
    : 1;
  const targetSurah = memorizationGoal?.path === "surah"
    ? (memorizationGoal?.startSurahNumber ? SURAH_DATA.find(s => s.number === memorizationGoal?.startSurahNumber) : undefined)
    : undefined;

  const savedSurahsMeta = useMemo(() => {
    return savedSurahs.map(n => SURAH_DATA[n - 1]).filter(Boolean);
  }, [savedSurahs]);

  const fullyMemorizedSurahs = useMemo(() => {
    const memorized = new Set(memorizedAyahKeys);
    return new Set(
      SURAH_DATA
        .filter((surah) => isSurahFullyMemorized(surah.number, memorized))
        .map((surah) => surah.number)
    );
  }, [memorizedAyahKeys]);

  const targetTotal = memorizationGoal?.path === "pace"
    ? TOTAL_AYAHS
    : memorizationGoal?.path === "juz"
    ? getJuzAyahs(targetJuz).length
    : (targetSurah ? targetSurah.ayahCount : TOTAL_AYAHS);
  const memorizationPercent = Math.min(100, Math.round((totalMemorized / targetTotal) * 100));

  const lastMemorizedAyah = useMemo(() => {
    if (memorizedAyahKeys.length === 0) return null;
    const key = memorizedAyahKeys[memorizedAyahKeys.length - 1];
    const [surahRaw, ayahRaw] = key.split(":");
    const surahNumber = Number(surahRaw);
    const ayahNumber = Number(ayahRaw);
    const surah = SURAH_DATA[surahNumber - 1];
    if (!surah || !Number.isFinite(surahNumber) || !Number.isFinite(ayahNumber)) return null;
    return { surahNumber, ayahNumber, surahName: surah.englishName };
  }, [memorizedAyahKeys]);
  // Use effectiveGoalCount (actual available ayahs) to avoid 41/44 type lock
  // Revision goals always start at 0% — progress tracking for murajaah is not yet implemented
  const weekPercent = goal
    ? isRevisionGoal
      ? 0
      : (effectiveGoalCount > 0 ? Math.min(100, Math.round((weekGoalProgress / effectiveGoalCount) * 100)) : 100)
    : 0;

  // Sync widget with current goal whenever goal changes
  useEffect(() => {
    if (memorizationGoal && goal) {
      if (memorizationGoal.path === "pace") return;
      setWidgetPath(memorizationGoal.path);
      if (goal.startSurahNumber && goal.startAyahNumber) {
        const surahMeta = SURAH_DATA.find(s => s.number === goal.startSurahNumber);
        setWidgetFirstAyah({ surahNumber: goal.startSurahNumber, surahName: surahMeta?.englishName ?? "", ayahNumber: goal.startAyahNumber });
      }
      if (goal.endSurahNumber && goal.endAyahNumber) {
        const surahMeta = SURAH_DATA.find(s => s.number === goal.endSurahNumber);
        setWidgetLastAyah({ surahNumber: goal.endSurahNumber, surahName: surahMeta?.englishName ?? "", ayahNumber: goal.endAyahNumber });
      } else if (memorizationGoal.endSurahNumber && memorizationGoal.endAyahNumber) {
        const surahMeta = SURAH_DATA.find(s => s.number === memorizationGoal.endSurahNumber);
        setWidgetLastAyah({
          surahNumber: memorizationGoal.endSurahNumber,
          surahName: surahMeta?.englishName ?? "",
          ayahNumber: memorizationGoal.endAyahNumber,
        });
      } else if (memorizationGoal.path === "juz" && memorizationGoal.targetJuz) {
        const juzAyahs = getJuzAyahs(memorizationGoal.targetJuz);
        setWidgetLastAyah(juzAyahs[juzAyahs.length - 1] ?? null);
      } else {
        const surahMeta = SURAH_DATA.find(s => s.number === memorizationGoal.startSurahNumber);
        setWidgetLastAyah(surahMeta
          ? { surahNumber: surahMeta.number, surahName: surahMeta.englishName, ayahNumber: surahMeta.ayahCount }
          : null
        );
      }
      if (memorizationGoal.targetJuz) setWidgetJuz(memorizationGoal.targetJuz);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    memorizationGoal?.path,
    memorizationGoal?.targetJuz,
    memorizationGoal?.startSurahNumber,
    memorizationGoal?.endSurahNumber,
    memorizationGoal?.endAyahNumber,
    goal?.startSurahNumber,
    goal?.startAyahNumber,
    goal?.endSurahNumber,
    goal?.endAyahNumber,
  ]);

  const totalRangeAyahs = useMemo(() => {
    if (!widgetFirstAyah || !widgetLastAyah) return 0;
    if (widgetPath === "surah" && widgetFirstAyah.surahNumber === widgetLastAyah.surahNumber) {
      return Math.max(1, widgetLastAyah.ayahNumber - widgetFirstAyah.ayahNumber + 1);
    }
    if (widgetPath === "juz" && widgetJuz != null) {
      const ayahs = getJuzAyahs(widgetJuz);
      const firstIdx = ayahs.findIndex(a => a.surahNumber === widgetFirstAyah.surahNumber && a.ayahNumber === widgetFirstAyah.ayahNumber);
      const lastIdx = ayahs.findIndex(a => a.surahNumber === widgetLastAyah.surahNumber && a.ayahNumber === widgetLastAyah.ayahNumber);
      if (firstIdx >= 0 && lastIdx >= firstIdx) return lastIdx - firstIdx + 1;
    }
    return 0;
  }, [widgetFirstAyah, widgetLastAyah, widgetPath, widgetJuz]);

  const widgetTargetDate = useMemo(() => {
    if (!totalRangeAyahs || !goal?.ayahsPerWeek) return null;
    const weeksNeeded = Math.ceil(totalRangeAyahs / goal.ayahsPerWeek);
    const d = new Date();
    d.setDate(d.getDate() + weeksNeeded * 7);
    return d;
  }, [totalRangeAyahs, goal?.ayahsPerWeek]);

  const formatTargetDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const canStartMemorizing = widgetFirstAyah !== null && widgetLastAyah !== null;

  const activeGoalAyahs = useMemo(() => {
    if (!memorizationGoal || !goal) return [];
    if (memorizationGoal.path === "pace") return [];
    return getGoalRangeAyahs({
      path: memorizationGoal.path,
      targetJuz: memorizationGoal.targetJuz,
      startSurahNumber: goal.startSurahNumber ?? memorizationGoal.startSurahNumber,
      startAyahNumber: goal.startAyahNumber ?? 1,
      endSurahNumber: memorizationGoal.endSurahNumber,
      endAyahNumber: memorizationGoal.endAyahNumber,
    });
  }, [memorizationGoal, goal]);

  const totalRangeMemorized = useMemo(() => {
    const memorized = new Set(memorizedAyahKeys);
    return activeGoalAyahs.filter(a => memorized.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
  }, [activeGoalAyahs, memorizedAyahKeys]);

  const currentGoalSurfaceAyahs = useMemo(() => {
    if (!memorizationGoal || memorizationGoal.path === "pace") return [];
    if (memorizationGoal.path === "juz" && memorizationGoal.targetJuz) {
      return getJuzAyahs(memorizationGoal.targetJuz);
    }
    const surah = SURAH_DATA.find(s => s.number === memorizationGoal.startSurahNumber);
    if (!surah) return [];
    return Array.from({ length: surah.ayahCount }, (_, index) => ({
      surahNumber: surah.number,
      surahName: surah.englishName,
      ayahNumber: index + 1,
    }));
  }, [memorizationGoal]);

  const canExtendCurrentGoal = useMemo(() => {
    if (!goal || !memorizationGoal || memorizationGoal.path === "pace") return false;
    const memorized = new Set(memorizedAyahKeys);
    const existingTargets = new Set(goal.weeklyTargetAyahKeys ?? []);
    return currentGoalSurfaceAyahs.some((ayah) => {
      const key = getAyahKey(ayah);
      return !memorized.has(key) && !existingTargets.has(key);
    });
  }, [currentGoalSurfaceAyahs, goal, memorizationGoal, memorizedAyahKeys]);

  const extensionRemainingCount = useMemo(() => {
    if (!goal || !memorizationGoal || memorizationGoal.path === "pace") return 0;
    const memorized = new Set(memorizedAyahKeys);
    const existingTargets = new Set(goal.weeklyTargetAyahKeys ?? []);
    return currentGoalSurfaceAyahs.filter((ayah) => {
      const key = getAyahKey(ayah);
      return !memorized.has(key) && !existingTargets.has(key);
    }).length;
  }, [currentGoalSurfaceAyahs, goal, memorizationGoal, memorizedAyahKeys]);

  const forecast = useAdaptiveForecast();

  // Derive pace from actual memorization history (median of non-zero days).
  // Falls back to configured goal only when no history exists.
  const userTypicalPace = useMemo(() => {
    const nonZero = dailyEntries.map(e => e.ayahsRead).filter(n => n > 0);
    if (nonZero.length === 0) return Math.max(1, goal?.ayahsPerWeek ?? 5);
    const sorted = [...nonZero].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
    return Math.max(1, median);
  }, [dailyEntries, goal?.ayahsPerWeek]);

  const extensionOptionCounts = useMemo(() => {
    if (extensionRemainingCount <= 0) return [];
    // Tiny range: show every option individually.
    if (extensionRemainingCount <= 4) {
      return Array.from({ length: extensionRemainingCount }, (_, i) => i + 1);
    }

    const pace = userTypicalPace;

    if (extensionRemainingCount <= pace) {
      // Remaining is smaller than their typical pace: spread tightly between 1 and remaining.
      // e.g. remaining=8, pace=10 → 1, 2, 4, 8
      const opts = [
        1,
        Math.max(2, Math.round(extensionRemainingCount * 0.3)),
        Math.round(extensionRemainingCount * 0.5),
        extensionRemainingCount,
      ];
      return [...new Set(opts)]
        .filter(n => n >= 1 && n <= extensionRemainingCount)
        .sort((a, b) => a - b);
    }

    // Remaining exceeds pace: anchor to pace fractions, stretch max at 1.5× pace.
    // Never scales with raw remaining count, so 200-ayah ranges stay human-sized.
    // e.g. pace=10, remaining=220 → 3, 5, 10, 15
    const low  = Math.max(1, Math.round(pace * 0.3));
    const mid  = Math.max(1, Math.round(pace * 0.5));
    const high = pace;
    const cap  = Math.min(extensionRemainingCount, Math.ceil(pace * 1.5));
    return [...new Set([low, mid, high, cap])]
      .filter(n => n >= 1 && n <= extensionRemainingCount)
      .sort((a, b) => a - b);
  }, [extensionRemainingCount, userTypicalPace]);

  const activeRangeTotal = activeGoalAyahs.length || totalRangeAyahs || targetTotal;
  const remainingRangeAyahs = Math.max(0, activeRangeTotal - totalRangeMemorized);

  const activeGoalTargetDate = useMemo(() => {
    if (!memorizationGoal) return null;
    // Prefer the adaptive forecast (gradual goals); fall back to linear division for steady goals.
    if (forecast?.estimatedCompletionDate) return forecast.estimatedCompletionDate;
    if (!goal?.ayahsPerWeek) return null;
    const weeksNeeded = Math.max(1, Math.ceil(remainingRangeAyahs / goal.ayahsPerWeek));
    const d = new Date();
    d.setDate(d.getDate() + weeksNeeded * 7);
    return d;
  }, [forecast, goal?.ayahsPerWeek, memorizationGoal, remainingRangeAyahs]);

  const milestoneComplete =
    memorizationGoal !== null &&
    goal !== null &&
    memorizationPercent < 100 &&
    activeRangeTotal > 0 &&
    totalRangeMemorized >= activeRangeTotal;

  const selectedRangeLabel = goal
    ? `Ayah ${goal.startAyahNumber ?? 1}–${goal.endAyahNumber ?? memorizationGoal?.endAyahNumber ?? targetTotal}`
    : "Ayah range";

  const formatShortDate = (dateLike?: string) => {
    if (!dateLike) return "—";
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const todayShort = formatShortDate(new Date().toISOString());
  const nextAyahInRange = useMemo(() => {
    if (!memorizationGoal || !goal || memorizationGoal.path === "pace") return null;
    const memorized = new Set(memorizedAyahKeys);
    if (hifzDirection === "reverse") {
      // Reverse: last unmemorized ayah within THIS WEEK's target only
      const weekCandidates = weekGoalAyahs.filter(a => !memorized.has(`${a.surahNumber}:${a.ayahNumber}`));
      return weekCandidates[weekCandidates.length - 1] ?? null;
    }
    const candidates = activeGoalAyahs.filter(a => !memorized.has(`${a.surahNumber}:${a.ayahNumber}`));
    return candidates[0] ?? null;
  }, [memorizationGoal, goal, activeGoalAyahs, weekGoalAyahs, memorizedAyahKeys, hifzDirection]);

  const upNextAyahNums = useMemo(() => {
    if (!nextAyahInRange || !memorizationGoal || !goal) return [];
    const sourceAyahs = hifzDirection === "reverse" ? weekGoalAyahs : activeGoalAyahs;
    const idx = sourceAyahs.findIndex(
      a => a.surahNumber === nextAyahInRange.surahNumber && a.ayahNumber === nextAyahInRange.ayahNumber
    );
    if (idx < 0) return [];
    const adjacent = hifzDirection === "reverse"
      ? sourceAyahs.slice(Math.max(0, idx - 2), idx).reverse()
      : sourceAyahs.slice(idx + 1, idx + 3);
    return adjacent.map(a => a.ayahNumber);
  }, [nextAyahInRange, memorizationGoal, goal, activeGoalAyahs, weekGoalAyahs, hifzDirection]);

  const extendCurrentGoal = useCallback((count: number) => {
    if (!goal || !memorizationGoal || memorizationGoal.path === "pace") return;
    const existingKeys = goal.weeklyTargetAyahKeys ?? [];
    const existingKeySet = new Set(existingKeys);
    const memorized = new Set(memorizedAyahKeys);
    const firstTargetIdx = currentGoalSurfaceAyahs.findIndex((ayah) => existingKeySet.has(getAyahKey(ayah)));
    const lastTargetIdx = (() => {
      for (let i = currentGoalSurfaceAyahs.length - 1; i >= 0; i--) {
        if (existingKeySet.has(getAyahKey(currentGoalSurfaceAyahs[i]))) return i;
      }
      return -1;
    })();
    const after = lastTargetIdx >= 0 ? currentGoalSurfaceAyahs.slice(lastTargetIdx + 1) : currentGoalSurfaceAyahs;
    const before = firstTargetIdx >= 0 ? currentGoalSurfaceAyahs.slice(0, firstTargetIdx) : [];
    const orderedCandidates = hifzDirection === "reverse"
      ? [...before.reverse(), ...after]
      : [...after, ...before];
    const newExtraKeys = orderedCandidates
      .map(getAyahKey)
      .filter((key) => !existingKeySet.has(key) && !memorized.has(key))
      .slice(0, count);
    if (newExtraKeys.length === 0) return;

    const combinedKeySet = new Set([...existingKeys, ...newExtraKeys]);
    const sortedKeys = currentGoalSurfaceAyahs
      .map(getAyahKey)
      .filter((key) => combinedKeySet.has(key));
    const first = currentGoalSurfaceAyahs.find((ayah) => getAyahKey(ayah) === sortedKeys[0]);
    const last = currentGoalSurfaceAyahs.find((ayah) => getAyahKey(ayah) === sortedKeys[sortedKeys.length - 1]);
    if (!first || !last) return;

    setGoal({
      ...goal,
      ayahsPerWeek: sortedKeys.length,
      weeklyTargetAyahKeys: sortedKeys,
      startSurahNumber: first.surahNumber,
      startAyahNumber: first.ayahNumber,
      endSurahNumber: last.surahNumber,
      endAyahNumber: last.ayahNumber,
    });
    setMemorizationGoal({
      ...memorizationGoal,
      startSurahNumber: memorizationGoal.path === "surah" ? first.surahNumber : memorizationGoal.startSurahNumber,
      startSurahName: memorizationGoal.path === "surah" ? first.surahName : memorizationGoal.startSurahName,
      endSurahNumber: last.surahNumber,
      endAyahNumber: last.ayahNumber,
    });
    setWidgetFirstAyah(first);
    setWidgetLastAyah(last);
    setShowWeekCompleteCard(false);
  }, [
    currentGoalSurfaceAyahs,
    goal,
    hifzDirection,
    memorizationGoal,
    memorizedAyahKeys,
    setGoal,
    setMemorizationGoal,
  ]);

  const extendPaceGoal = useCallback((count: number) => {
    if (!goal) return;
    setGoal({ ...goal, ayahsPerWeek: goal.ayahsPerWeek + count });
    setShowWeekCompleteCard(false);
  }, [goal, setGoal]);

  const widgetWeeklySelection = useMemo<AyahRangeResult | undefined>(() => {
    if (!widgetFirstAyah || !widgetLastAyah) return undefined;
    return {
      first: widgetFirstAyah,
      last: widgetLastAyah,
      juz: widgetJuz ?? undefined,
      ayahsPerWeek: goal?.ayahsPerWeek ?? 10,
      targetAyahsPerWeek: goal?.targetAyahsPerWeek,
      finishWeeks: goal?.finishWeeks,
      memorizationStyle: goal?.memorizationStyle,
      gradualIncreaseStyle: goal?.gradualIncreaseStyle,
      gradualWeeklyPlan: goal?.gradualWeeklyPlan,
      hifzDaysPerWeek: goal?.hifzDaysPerWeek,
      targetHifzDaysPerWeek: goal?.targetHifzDaysPerWeek,
      gradualDaysPerWeekPlan: goal?.gradualDaysPerWeekPlan,
      paceRhythm: goal?.paceRhythm,
    };
  }, [widgetFirstAyah, widgetLastAyah, widgetJuz, goal]);

  const currentWeeklySelection = useMemo<AyahRangeResult | undefined>(() => {
    if (!memorizationGoal || !goal) return undefined;
    if (memorizationGoal.path === "pace") return undefined;
    const startSurahNumber = goal.startSurahNumber ?? memorizationGoal.startSurahNumber;
    const startAyahNumber = goal.startAyahNumber ?? 1;
    const range = getGoalRangeAyahs({
      path: memorizationGoal.path,
      targetJuz: memorizationGoal.targetJuz,
      startSurahNumber,
      startAyahNumber,
      endSurahNumber: memorizationGoal.endSurahNumber,
      endAyahNumber: memorizationGoal.endAyahNumber,
    });
    const last = range[range.length - 1];
    if (!last) return undefined;
    const firstSurah = SURAH_DATA[startSurahNumber - 1];
    return {
      first: {
        surahNumber: startSurahNumber,
        surahName: firstSurah?.englishName ?? "",
        ayahNumber: startAyahNumber,
      },
      last,
      juz: memorizationGoal.targetJuz,
      ayahsPerWeek: effectiveGoalCount || goal.ayahsPerWeek,
      targetAyahsPerWeek: goal.targetAyahsPerWeek,
      finishWeeks: goal.finishWeeks,
      memorizationStyle: goal.memorizationStyle,
      gradualIncreaseStyle: goal.gradualIncreaseStyle,
      gradualWeeklyPlan: goal.gradualWeeklyPlan,
      hifzDaysPerWeek: goal.hifzDaysPerWeek,
      targetHifzDaysPerWeek: goal.targetHifzDaysPerWeek,
      gradualDaysPerWeekPlan: goal.gradualDaysPerWeekPlan,
      paceRhythm: goal.paceRhythm,
    };
  }, [memorizationGoal, goal, effectiveGoalCount]);
  const weeklyGoalPath: "surah" | "juz" = currentWeeklySelection
    ? (memorizationGoal?.path === "juz" ? "juz" : "surah")
    : widgetPath;
  const weeklyInitialSelection = currentWeeklySelection ?? widgetWeeklySelection;
  const resumeSource = [recentProgress[0], lastListened]
    .filter((item): item is NonNullable<typeof item> => !!item)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const resumeHifzTarget = resumeSource
    ? { surahNumber: resumeSource.surahNumber, ayahNumber: resumeSource.ayahNumberInSurah }
    : { surahNumber: memorizationGoal?.startSurahNumber ?? 1, ayahNumber: goal?.startAyahNumber ?? 1 };
  const activeGoalHeroTarget = !isPaceGoal && memorizationGoal && goal
    ? {
        surahNumber: nextAyahInRange?.surahNumber ?? goal.startSurahNumber ?? memorizationGoal.startSurahNumber,
        ayahNumber: nextAyahInRange?.ayahNumber ?? goal.startAyahNumber ?? 1,
      }
    : null;
  const heroTarget = activeGoalHeroTarget
    ?? (lastMemorizedAyah
      ? { surahNumber: lastMemorizedAyah.surahNumber, ayahNumber: lastMemorizedAyah.ayahNumber }
      : { surahNumber: memorizationGoal?.startSurahNumber ?? 1, ayahNumber: goal?.startAyahNumber ?? 1 });
  const heroSurahMeta = SURAH_DATA[heroTarget.surahNumber - 1];
  const activeModeLabel = isPaceGoal
    ? paceRhythm === "gentle" ? "Gentle Pace"
      : paceRhythm === "steady" ? "Steady Pace"
      : "Deep Pace"
    : memorizationGoal?.path === "juz"
    ? "Juz by Juz"
    : "Surah by Surah";
  const heroTitle = heroSurahMeta
    ? `${heroSurahMeta.englishName} ${heroTarget.surahNumber}:${heroTarget.ayahNumber}`
    : `${heroTarget.surahNumber}:${heroTarget.ayahNumber}`;
  const heroSub = heroSurahMeta
    ? `${heroSurahMeta.name} · Juz ${heroSurahMeta.juz} · Ayah ${heroTarget.ayahNumber} of ${heroSurahMeta.ayahCount}`
    : `Ayah ${heroTarget.ayahNumber}`;
  const currentWeekIndex = goal?.startDate
    ? Math.max(0, Math.floor((Date.now() - new Date(goal.startDate).getTime()) / (7 * 24 * 3600 * 1000)))
    : 0;
  const plan = goal?.gradualWeeklyPlan ?? [];
  const currentPaceInPlan = plan[currentWeekIndex] ?? goal?.ayahsPerWeek ?? 0;
  const nextMilestoneIdx = plan.findIndex((v, i) => i > currentWeekIndex && v !== currentPaceInPlan);
  const nextPaceCount = nextMilestoneIdx >= 0 ? plan[nextMilestoneIdx] : goal?.targetAyahsPerWeek;
  const weeksUntilNext = nextMilestoneIdx >= 0 ? nextMilestoneIdx - currentWeekIndex : null;
  const paceWeeksLabel = weeksUntilNext != null
    ? weeksUntilNext === 1
      ? " · next week"
      : weeksUntilNext < 8
      ? ` · in ${weeksUntilNext} weeks`
      : ` · in ~${Math.round(weeksUntilNext / 4)} months`
    : "";
  const weeklySequence = weekGoalAyahs;
  const weeklySequenceFallback = Array.from({ length: Math.max(1, effectiveGoalCount || (goal?.ayahsPerWeek ?? 7)) });
  const memorizedAyahKeySet = useMemo(() => new Set(memorizedAyahKeys), [memorizedAyahKeys]);

  const nextPaceAyah = useMemo((): AyahRef | null => {
    if (!isPaceGoal) return null;
    let cur: { surahNumber: number; ayahNumber: number } = lastMemorizedAyah
      ?? { surahNumber: 1, ayahNumber: 0 };
    for (let i = 0; i < TOTAL_AYAHS; i++) {
      const next = getNextAyahAfter(cur);
      if (!next) break;
      if (!memorizedAyahKeySet.has(getAyahKey(next))) return next;
      cur = next;
    }
    return null;
  }, [isPaceGoal, lastMemorizedAyah, memorizedAyahKeySet]);

  const paceExtensionRemainingCount = useMemo(() => {
    if (!isPaceGoal || !nextPaceAyah) return 0;
    const surah = SURAH_DATA.find(s => s.number === nextPaceAyah.surahNumber);
    if (!surah) return 0;
    let count = 0;
    for (let a = nextPaceAyah.ayahNumber; a <= surah.ayahCount; a++) {
      if (!memorizedAyahKeySet.has(`${nextPaceAyah.surahNumber}:${a}`)) count++;
    }
    return count;
  }, [isPaceGoal, nextPaceAyah, memorizedAyahKeySet]);

  const paceExtensionOptionCounts = useMemo(() => {
    const remaining = paceExtensionRemainingCount;
    if (remaining <= 0) return [];
    const pace = Math.max(1, goal?.ayahsPerWeek ?? 5);
    if (remaining <= 4) return Array.from({ length: remaining }, (_, i) => i + 1);
    if (remaining <= pace) {
      const opts = [1, Math.max(2, Math.round(remaining * 0.3)), Math.round(remaining * 0.5), remaining];
      return [...new Set(opts)].filter(n => n >= 1 && n <= remaining).sort((a, b) => a - b);
    }
    const low = Math.max(1, Math.round(pace * 0.3));
    const mid = Math.max(1, Math.round(pace * 0.5));
    const cap = Math.min(remaining, Math.ceil(pace * 1.5));
    return [...new Set([low, mid, pace, cap])].filter(n => n >= 1 && n <= remaining).sort((a, b) => a - b);
  }, [paceExtensionRemainingCount, goal?.ayahsPerWeek]);

  const weeklyHeadline = isRevisionGoal
    ? (weekGoalProgress > 0 ? `${weekGoalProgress} ayahs revisited` : "Revision ready")
    : weekGoalProgress > 0
      ? `${weekGoalProgress} ayahs memorized`
      : "Ready for this week";
  const fullQuranComplete = memorizedAyahKeys.length >= TOTAL_AYAHS;
  const showFullQuranComplete = fullQuranComplete && !revisionJourneyStarted;

  useEffect(() => {
    navigation.setOptions({ tabBarHidden: showFullQuranComplete || hifzSetupVisible });
  }, [showFullQuranComplete, hifzSetupVisible, navigation]);

  const completionDate = new Date();
  const fullHifzStartDate = useMemo(() => {
    const candidates = [
      memorizationGoal?.startDate,
      goal?.startDate,
      ...dailyEntries.map(entry => entry.date),
    ].filter((value): value is string => !!value);
    const earliest = candidates
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return earliest ?? completionDate;
  }, [dailyEntries, goal?.startDate, memorizationGoal?.startDate]);
  const fullHifzDays = Math.max(1, Math.ceil((completionDate.getTime() - fullHifzStartDate.getTime()) / 86400000));
  const fullHifzAyahsPerDay = (TOTAL_AYAHS / fullHifzDays).toFixed(1);

  const resetHifzFlow = useCallback(() => {
    // Central authoritative reset — clears all memorization state and AsyncStorage
    resetHifzProgress();

    // Clear weekly toast dedup so fresh completions show properly after restart
    weeklyToastCelebratedRef.current = new Set();
    AsyncStorage.removeItem(WEEKLY_TOAST_CELEBRATIONS_KEY).catch(() => {});

    // Reset percentage trackers so completion effects re-run from a clean baseline
    prevMemPercentRef.current = null;
    prevWeekPercentRef.current = null;
    prevMilestoneCompleteRef.current = null;

    // Reset local UI state
    setRevisionJourneyStarted(false);
    setShowHifzGoalOptions(false);
    setShowWeeklyToast(false);
    setShowWeekCompleteCard(false);
    setShowMilestoneToast(false);
    setContinuationNotice(null);
    setHifzTransition(null);
    setHifzTransitionProgress(0);
    setHifzDirection("forward");
    setWidgetPath("surah");
    setWidgetFirstAyah(null);
    setWidgetLastAyah(null);
    setWidgetJuz(null);
  }, [resetHifzProgress]);

  const openNewHifzSelection = useCallback((path: "surah" | "juz", options?: { surahNumber?: number; juz?: number; startAtAyahSelection?: boolean }) => {
    setContinuationNotice(null);
    setHifzTransition(null);
    setHifzTransitionProgress(0);
    setWidgetPath(path);
    setWidgetFirstAyah(null);
    setWidgetLastAyah(null);
    setWidgetJuz(options?.juz ?? null);
    setSetupInitialSurahNumber(options?.surahNumber);
    setSetupInitialJuz(options?.juz);
    setSetupStartAtAyahSelection(!!options?.startAtAyahSelection);
    setShowHifzGoalOptions(false);
    setHifzSetupVisible(false);
    setAyahRangeVisible(true);
  }, []);

  const openPaceHifzSelection = useCallback((options?: {
    rhythm?: PaceRhythm;
    daysPerWeek?: number;
    targetDaysPerWeek?: number;
  }) => {
    // Minimal state for the modal swap — fewer state changes = faster re-render,
    // which reduces the home screen flash between HifzGoalSetupModal and pace modal.
    setWidgetPath("surah");
    if (options?.rhythm) setPaceRhythm(options.rhythm);
    if (options?.daysPerWeek) setPaceDaysPerWeek(options.daysPerWeek);
    if (options?.targetDaysPerWeek) setPaceTargetDaysPerWeek(options.targetDaysPerWeek);
    setPaceDateInitialStep(0);
    setHifzSetupVisible(false);
    setPaceDateVisible(true);
    // Defer home-screen cleanup; it's invisible while the pace modal is open.
    requestAnimationFrame(() => {
      setContinuationNotice(null);
      setHifzTransition(null);
      setHifzTransitionProgress(0);
      setWidgetFirstAyah(null);
      setWidgetLastAyah(null);
      setWidgetJuz(null);
      setSetupStartAtAyahSelection(false);
      setSetupInitialSurahNumber(undefined);
      setSetupInitialJuz(undefined);
      setShowHifzGoalOptions(false);
    });
  }, []);

  const handleRevisionComplete = useCallback(() => {
    if (!memorizationGoal || hifzTransition) return;
    if (memorizationGoal.path === "pace") return;

    recordMilestoneCompletion();
    const completedName = memorizationGoal.path === "juz"
      ? `Juz ${targetJuz}`
      : targetSurah?.englishName ?? "Hifz goal";
    const today = new Date().toISOString().split("T")[0];
    const requestedAyahsPerWeek = Math.max(1, goal?.targetAyahsPerWeek ?? goal?.ayahsPerWeek ?? 7);

    if (memorizationGoal.path === "juz") {
      const nextJuz = findNextIncompleteJuz(targetJuz, memorizedAyahKeys);
      const juzAyahsNext = nextJuz ? getJuzAyahs(nextJuz) : [];
      const first = getFirstUnmemorizedAyah(juzAyahsNext, memorizedAyahKeys);
      const last = juzAyahsNext[juzAyahsNext.length - 1];
      if (!nextJuz || !first || !last) return;
      const weeklyGoal = buildWeeklyGoal({
        path: "juz",
        targetJuz: nextJuz,
        startSurahNumber: first.surahNumber,
        startAyahNumber: first.ayahNumber,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
        requestedAyahsPerWeek,
        memorizedAyahKeys,
      });
      const nextMemorizationGoal: MemorizationGoal = {
        path: "juz",
        startSurahNumber: first.surahNumber,
        startSurahName: `Juz ${nextJuz}`,
        startDate: today,
        ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
        targetJuz: nextJuz,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
      };
      const nextGoal: Goal = {
        ...weeklyGoal,
        targetAyahsPerWeek: goal?.targetAyahsPerWeek,
        measurementStyle: goal?.measurementStyle,
        memorizationStyle: goal?.memorizationStyle,
        gradualIncreaseStyle: goal?.gradualIncreaseStyle,
        hifzDaysPerWeek: goal?.hifzDaysPerWeek,
        targetHifzDaysPerWeek: goal?.targetHifzDaysPerWeek,
        paceRhythm: goal?.paceRhythm,
        startDate: today,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
      };
      setHifzTransition({
        completed: completedName,
        upNext: `Juz ${nextJuz}`,
        nextGoal,
        nextMemorizationGoal,
        nextWidgetPath: "juz",
        nextFirstAyah: first,
        nextLastAyah: last,
        nextJuz,
        totalAyahs: targetTotal,
      });
    } else {
      const nextSurah = findNextIncompleteSurah(memorizationGoal.startSurahNumber, memorizedAyahKeys);
      if (!nextSurah) return;
      const surahAyahsNext = Array.from({ length: nextSurah.ayahCount }, (_, index) => ({
        surahNumber: nextSurah.number,
        surahName: nextSurah.englishName,
        ayahNumber: index + 1,
      }));
      const first = getFirstUnmemorizedAyah(surahAyahsNext, memorizedAyahKeys);
      const last = {
        surahNumber: nextSurah.number,
        surahName: nextSurah.englishName,
        ayahNumber: nextSurah.ayahCount,
      };
      if (!first) return;
      const weeklyGoal = buildWeeklyGoal({
        path: "surah",
        startSurahNumber: first.surahNumber,
        startAyahNumber: first.ayahNumber,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
        requestedAyahsPerWeek,
        memorizedAyahKeys,
      });
      const nextMemorizationGoal: MemorizationGoal = {
        path: "surah",
        startSurahNumber: nextSurah.number,
        startSurahName: nextSurah.englishName,
        startDate: today,
        ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
      };
      const nextGoal: Goal = {
        ...weeklyGoal,
        targetAyahsPerWeek: goal?.targetAyahsPerWeek,
        measurementStyle: goal?.measurementStyle,
        memorizationStyle: goal?.memorizationStyle,
        gradualIncreaseStyle: goal?.gradualIncreaseStyle,
        hifzDaysPerWeek: goal?.hifzDaysPerWeek,
        targetHifzDaysPerWeek: goal?.targetHifzDaysPerWeek,
        paceRhythm: goal?.paceRhythm,
        startDate: today,
        endSurahNumber: last.surahNumber,
        endAyahNumber: last.ayahNumber,
      };
      setHifzTransition({
        completed: completedName,
        upNext: nextSurah.englishName,
        nextGoal,
        nextMemorizationGoal,
        nextWidgetPath: "surah",
        nextFirstAyah: first,
        nextLastAyah: last,
        nextJuz: null,
        totalAyahs: targetTotal,
      });
    }
  }, [
    memorizationGoal, hifzTransition, targetJuz, targetSurah,
    goal, memorizedAyahKeys, todayEntry, targetTotal, recordMilestoneCompletion,
    setHifzTransition,
  ]);

  useEffect(() => {
    const prev = prevMemPercentRef.current;
    prevMemPercentRef.current = memorizationPercent;
    if (memorizationGoal && (prev === null || prev < 100) && memorizationPercent >= 100) {
      if (hifzTransition) return;
      if (memorizationGoal.path === "pace") return;
      if (fullQuranComplete) return;
      if (isRevisionGoal) return;
      setContinuationNotice(null);
      recordMilestoneCompletion();

      const completedName = memorizationGoal.path === "juz"
        ? `Juz ${targetJuz}`
        : targetSurah?.englishName ?? "Hifz goal";
      const today = new Date().toISOString().split("T")[0];
      const requestedAyahsPerWeek = Math.max(1, goal?.targetAyahsPerWeek ?? goal?.ayahsPerWeek ?? 7);

      if (memorizationGoal.path === "juz") {
        const nextJuz = findNextIncompleteJuz(targetJuz, memorizedAyahKeys);
        const juzAyahs = nextJuz ? getJuzAyahs(nextJuz) : [];
        const first = getFirstUnmemorizedAyah(juzAyahs, memorizedAyahKeys);
        const last = juzAyahs[juzAyahs.length - 1];
        if (!nextJuz || !first || !last) return;
        const weeklyGoal = buildWeeklyGoal({
          path: "juz",
          targetJuz: nextJuz,
          startSurahNumber: first.surahNumber,
          startAyahNumber: first.ayahNumber,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
          requestedAyahsPerWeek,
          memorizedAyahKeys,
        });
        const nextMemorizationGoal: MemorizationGoal = {
          path: "juz",
          startSurahNumber: first.surahNumber,
          startSurahName: `Juz ${nextJuz}`,
          startDate: today,
          ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
          targetJuz: nextJuz,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
        };
        const nextGoal: Goal = {
          ...weeklyGoal,
          targetAyahsPerWeek: goal?.targetAyahsPerWeek,
          measurementStyle: goal?.measurementStyle,
          memorizationStyle: goal?.memorizationStyle,
          gradualIncreaseStyle: goal?.gradualIncreaseStyle,
          hifzDaysPerWeek: goal?.hifzDaysPerWeek,
          targetHifzDaysPerWeek: goal?.targetHifzDaysPerWeek,
          paceRhythm: goal?.paceRhythm,
          startDate: today,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
        };
        setHifzTransition({
          completed: completedName,
          upNext: `Juz ${nextJuz}`,
          nextGoal,
          nextMemorizationGoal,
          nextWidgetPath: "juz",
          nextFirstAyah: first,
          nextLastAyah: last,
          nextJuz,
          totalAyahs: targetTotal,
        });
      } else {
        const nextSurah = findNextIncompleteSurah(memorizationGoal.startSurahNumber, memorizedAyahKeys);
        if (!nextSurah) return;
        const surahAyahs = Array.from({ length: nextSurah.ayahCount }, (_, index) => ({
          surahNumber: nextSurah.number,
          surahName: nextSurah.englishName,
          ayahNumber: index + 1,
        }));
        const first = getFirstUnmemorizedAyah(surahAyahs, memorizedAyahKeys);
        const last = {
          surahNumber: nextSurah.number,
          surahName: nextSurah.englishName,
          ayahNumber: nextSurah.ayahCount,
        };
        if (!first) return;
        const weeklyGoal = buildWeeklyGoal({
          path: "surah",
          startSurahNumber: first.surahNumber,
          startAyahNumber: first.ayahNumber,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
          requestedAyahsPerWeek,
          memorizedAyahKeys,
        });
        const nextMemorizationGoal: MemorizationGoal = {
          path: "surah",
          startSurahNumber: nextSurah.number,
          startSurahName: nextSurah.englishName,
          startDate: today,
          ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
        };
        const nextGoal: Goal = {
          ...weeklyGoal,
          targetAyahsPerWeek: goal?.targetAyahsPerWeek,
          measurementStyle: goal?.measurementStyle,
          memorizationStyle: goal?.memorizationStyle,
          gradualIncreaseStyle: goal?.gradualIncreaseStyle,
          hifzDaysPerWeek: goal?.hifzDaysPerWeek,
          targetHifzDaysPerWeek: goal?.targetHifzDaysPerWeek,
          paceRhythm: goal?.paceRhythm,
          startDate: today,
          endSurahNumber: last.surahNumber,
          endAyahNumber: last.ayahNumber,
        };
        setHifzTransition({
          completed: completedName,
          upNext: nextSurah.englishName,
          nextGoal,
          nextMemorizationGoal,
          nextWidgetPath: "surah",
          nextFirstAyah: first,
          nextLastAyah: last,
          nextJuz: null,
          totalAyahs: targetTotal,
        });
      }

      setHifzCompleteToastText({
        title: "Hifz step complete",
        sub: `${completedName} is complete. Your next goal is ready.`,
      });
      setShowHifzCompleteToast(true);
      setShowMilestoneToast(false);
      setShowWeeklyToast(false);
      setShowWeekCompleteCard(false);
      setShowHifzGoalOptions(false);
      const t = setTimeout(() => setShowHifzCompleteToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [
    fullQuranComplete,
    goal,
    hifzTransition,
    memorizationGoal,
    memorizationPercent,
    memorizedAyahKeys,
    recordMilestoneCompletion,
    setGoal,
    setMemorizationGoal,
    targetJuz,
    targetSurah?.englishName,
    todayEntry?.ayahsRead,
  ]);

  useEffect(() => {
    if (!hifzTransition) return;
    setHifzTransitionProgress(0);
    const interval = setInterval(() => {
      setHifzTransitionProgress((current) => Math.min(100, current + 1));
    }, 150);
    const t = setTimeout(() => {
      setGoal(hifzTransition.nextGoal);
      setMemorizationGoal(hifzTransition.nextMemorizationGoal);
      setWidgetPath(hifzTransition.nextWidgetPath);
      setWidgetFirstAyah(hifzTransition.nextFirstAyah);
      setWidgetLastAyah(hifzTransition.nextLastAyah);
      setWidgetJuz(hifzTransition.nextJuz);
      setContinuationNotice(null);
      setHifzTransition(null);
      setHifzTransitionProgress(0);
    }, 15_000);

    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [hifzTransition, setGoal, setMemorizationGoal]);

  const skipHifzTransition = useCallback(() => {
    if (!hifzTransition) return;
    setGoal(hifzTransition.nextGoal);
    setMemorizationGoal(hifzTransition.nextMemorizationGoal);
    setWidgetPath(hifzTransition.nextWidgetPath);
    setWidgetFirstAyah(hifzTransition.nextFirstAyah);
    setWidgetLastAyah(hifzTransition.nextLastAyah);
    setWidgetJuz(hifzTransition.nextJuz);
    setContinuationNotice(null);
    setHifzTransition(null);
    setHifzTransitionProgress(0);
  }, [hifzTransition, setGoal, setMemorizationGoal]);

  useEffect(() => {
    if (hifzTransition) return;
    const prev = prevMilestoneCompleteRef.current;
    prevMilestoneCompleteRef.current = milestoneComplete;
    if (prev !== null && !prev && milestoneComplete && !isRevisionGoal) {
      recordMilestoneCompletion();
      setShowMilestoneToast(true);
      setShowWeeklyToast(false);
      setShowWeekCompleteCard(false);
      const t = setTimeout(() => setShowMilestoneToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [hifzTransition, milestoneComplete, recordMilestoneCompletion]);

  useEffect(() => {
    if (hifzTransition) return;
    if (isRevisionGoal) return;
    const prev = prevWeekPercentRef.current;
    prevWeekPercentRef.current = weekPercent;
    if (weekPercent < 100) {
      setShowWeekCompleteCard(false);
    }
    if (weekPercent >= 100 && goal) {
      setShowWeekCompleteCard(true);
    }
    if (
      prev !== null &&
      prev < 100 &&
      weekPercent >= 100 &&
      goal &&
      (!milestoneComplete || canExtendCurrentGoal) &&
      memorizationPercent < 100 &&
      weeklyCompletionSignature &&
      weeklyToastCelebrationsLoaded &&
      !weeklyToastCelebratedRef.current.has(weeklyCompletionSignature)
    ) {
      weeklyToastCelebratedRef.current.add(weeklyCompletionSignature);
      AsyncStorage.setItem(
        WEEKLY_TOAST_CELEBRATIONS_KEY,
        JSON.stringify(Array.from(weeklyToastCelebratedRef.current).slice(-60))
      ).catch(() => {});
      setShowWeeklyToast(true);
      const t = setTimeout(() => {
        setShowWeeklyToast(false);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [
    canExtendCurrentGoal,
    goal,
    hifzTransition,
    memorizationPercent,
    milestoneComplete,
    weekPercent,
    weeklyCompletionSignature,
    weeklyToastCelebrationsLoaded,
  ]);

  useEffect(() => {
    if (continuationNotice && weekGoalProgress > 0) {
      setContinuationNotice(null);
    }
  }, [continuationNotice, weekGoalProgress]);

  const topPad = insets.top;
  const hasMemorizationGoal = memorizationGoal !== null;
  const showSelectionWidget = !hasMemorizationGoal;
  return (
    <>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />
       <LinearGradient
         colors={[colors.screenBackground, colors.screenBackgroundAlt]}
         locations={[0, 1]}
         style={[s.container, { paddingTop: insets.top }]}
       >
          {showFullQuranComplete ? (
            <FullQuranCertificate
              completionDate={completionDate}
              fullHifzDays={fullHifzDays}
              fullHifzAyahsPerDay={fullHifzAyahsPerDay}
              streakDays={streakDays}
              onBeginRevision={() => {
                // Clear the active goal only — never wipe memorizedAyahKeys or certificates
                setGoal(null);
                setMemorizationGoal(null);
                // Reset UI trackers so completion effects run cleanly from new baseline
                weeklyToastCelebratedRef.current = new Set();
                AsyncStorage.removeItem(WEEKLY_TOAST_CELEBRATIONS_KEY).catch(() => {});
                prevMemPercentRef.current = null;
                prevWeekPercentRef.current = null;
                prevMilestoneCompleteRef.current = null;
                // Reset local UI state
                setShowHifzGoalOptions(false);
                setShowWeeklyToast(false);
                setShowWeekCompleteCard(false);
                setShowMilestoneToast(false);
                setContinuationNotice(null);
                setHifzTransition(null);
                setHifzTransitionProgress(0);
                setHifzDirection("forward");
                setWidgetPath("surah");
                setWidgetFirstAyah(null);
                setWidgetLastAyah(null);
                setWidgetJuz(null);
                setRevisionJourneyStarted(true);
              }}
            />
          ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scrollContent, { paddingTop: 12 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={load}
                 tintColor={colors.appBorderLight}
              />
            }
          >
          <>
          {/* ── Header Row ──────────────────────────────────────────────── */}
          <View style={s.headerRow}>
            <View style={s.studyingNowPill}>
              <View style={s.studyingNowDot} />
              <Text style={s.studyingNowText}>
                {onlineUsers > 0 ? `${onlineUsers.toLocaleString()} studying now` : "No active listeners"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={s.settingsBtn}
            >
               <Feather name="user" size={18} color={colors.appLightText} strokeWidth={1.7} />
            </TouchableOpacity>
          </View>

          {/* ── Hifz Goal Widget / Progress Card ────────────────────────── */}
          <View style={[s.goalWidgetSection, showSelectionWidget && s.goalWidgetSelectionSection]}>
            <View style={[s.sectionHeadingRow, showSelectionWidget && s.sectionHeadingRowSelection]}>
              <Text style={[s.goalWidgetTitle, showSelectionWidget && s.goalWidgetTitleSelection]}>
                {showSelectionWidget ? "YOUR HIFZ NIYYAH" : "YOUR HIFZ"}
              </Text>
              {showSelectionWidget && (
                <Text style={s.niyyahAcceptedText}>May Allah accept from you</Text>
              )}
              {!showSelectionWidget && (
                <TouchableOpacity
                  onPress={() => setShowHifzGoalOptions(true)}
                  activeOpacity={0.78}
                  style={s.manageCta}
                >
                  <Text style={s.manageLink}>Manage Goal</Text>
                </TouchableOpacity>
              )}
            </View>
            {showSelectionWidget ? (
              <HifzHeroCard
                title={fullQuranComplete || revisionJourneyStarted ? "Begin Revision" : "Begin Your Hifz"}
                subtitle={fullQuranComplete || revisionJourneyStarted
                  ? "Your Quran is memorized. Start your Murajaah, bi'iznillah."
                  : "Tap to set your Niyyah and start your Hifz journey, bi'iznillah"}
                tags={["By Juz", "By Surah", "By Pace"]}
                progress={0.5}
                onPress={() => setHifzSetupVisible(true)}
              />
            ) : (
              /* Progress card — shown while a goal is active */
              <>
              {showHifzGoalOptions && (
              <View style={s.hifzManageCard}>
                <View>
                  <View style={s.hifzInlineOptionsRow}>
                    <TouchableOpacity
                      style={s.hifzInlineOptionBtn}
                      onPress={() => openPaceHifzSelection()}
                      activeOpacity={0.85}
                    >
                      <Text style={s.hifzInlineOptionText}>By Pace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.hifzInlineCloseBtn}
                      onPress={() => setShowHifzGoalOptions(false)}
                      activeOpacity={0.75}
                    >
                      <Feather name="x" size={18} color={colors.appLightText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.hifzInlineOptionBtn}
                      onPress={() => openNewHifzSelection("juz")}
                      activeOpacity={0.85}
                    >
                      <Text style={s.hifzInlineOptionText}>By Juz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.hifzInlineOptionBtn}
                      onPress={() => openNewHifzSelection("surah")}
                      activeOpacity={0.85}
                    >
                      <Text style={s.hifzInlineOptionText}>By Surah</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.restartHifzRow}>
                    <TouchableOpacity
                      style={s.restartHifzBtn}
                      onPress={() => setShowRestartHifzConfirm(true)}
                      activeOpacity={0.7}
                    >
                      <Feather name="refresh-cw" size={12} color={colors.textTertiary} />
                      <Text style={s.restartHifzText}>Restart Hifz Journey</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              )}
              <HifzHeroCard
                pill={activeModeLabel}
                title={heroTitle}
                subtitle={heroSub}
                progress={memorizationPercent > 0 ? Math.max(2, memorizationPercent) : 0}
                onPress={() => router.push(`/surah/${heroTarget.surahNumber}?ayah=${heroTarget.ayahNumber}`)}
              />
              {continuationNotice && (
                <View style={s.continuationCard}>
                  <View style={s.continuationRow}>
                    <View style={s.continuationColumn}>
                      <Text style={s.continuationLabel}>Completed</Text>
                      <Text style={s.continuationValue}>{continuationNotice.completed}</Text>
                    </View>
                    <View style={s.continuationDivider} />
                    <View style={s.continuationColumn}>
                      <Text style={s.continuationLabel}>Up next</Text>
                      <Text style={s.continuationValue}>{continuationNotice.upNext}</Text>
                    </View>
                  </View>
                  <View style={s.continuationCopyRow}>
                    <Feather name="arrow-right-circle" size={15} color={colors.textTertiary} />
                    <Text style={s.continuationCopy}>{continuationNotice.copy}</Text>
                    <TouchableOpacity
                      onPress={() => setContinuationNotice(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.75}
                    >
                      <Feather name="x" size={15} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              </>
            )}
          </View>

          {/* ── Quran Verse — shown only when no goal is set ─────────────── */}
          {showSelectionWidget && (
            <VerseCard
              verse='"Indeed, it is We who sent down the Quran and indeed, We will be its guardian."'
              reference="Al-Hijr 15:9"
              style={s.verseCard}
            />
          )}

          {/* ── THIS WEEK ─────────────────────────────────────────────────── */}
          {hasMemorizationGoal && !hifzTransition && (isRevisionGoal || memorizationPercent < 100) && (!milestoneComplete || canExtendCurrentGoal) && (
            <View style={s.thisWeekSection}>
              <View style={s.sectionHeadingRow}>
                <Text style={s.goalWidgetTitle}>{isRevisionGoal ? "THIS WEEK'S REVISION" : "THIS WEEK"}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (isPaceGoal) {
                      setPaceDateInitialStep(2);
                      setPaceDateVisible(true);
                    } else {
                      setWeeklyGoalVisible(true);
                    }
                  }}
                  activeOpacity={0.78}
                  style={s.manageCta}
                >
                  <Text style={s.manageLink}>Manage Weekly Goal</Text>
                </TouchableOpacity>
              </View>
              <View style={s.thisWeekCard}>

                {/* Header row */}
                <View style={s.thisWeekHeaderNew}>
                  <Text style={s.thisWeekBigTitle}>{weeklyHeadline}</Text>
                  <Text style={s.thisWeekIntention}>
                    {isRevisionGoal
                      ? `Murajaah · ${effectiveGoalCount || (goal?.ayahsPerWeek ?? 0)} ayahs to revisit`
                      : `Weekly intention · ${effectiveGoalCount || (goal?.ayahsPerWeek ?? 0)} ayahs`}
                  </Text>
                  {isPaceGoal ? (
                    <View style={s.weeklyMetaPills}>
                      <View style={s.weeklyMetaPill}>
                        <Feather name="zap" size={13} color={colors.appLightText} />
                        <Text style={s.weeklyMetaPillText}>Current: {goal?.ayahsPerWeek ?? 0} ayah/day</Text>
                      </View>
                      {nextPaceCount ? (
                        <View style={s.weeklyMetaPill}>
                          <Feather name="arrow-right" size={13} color={colors.appLightText} />
                          <Text style={s.weeklyMetaPillText}>Next: ~{nextPaceCount} pages/day{paceWeeksLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : isRevisionGoal ? (
                    <View style={s.weeklyMetaPill}>
                      <Feather name="refresh-cw" size={13} color={colors.appLightText} />
                      <Text style={s.weeklyMetaPillText}>Revision Focus · strengthening your hifz</Text>
                    </View>
                  ) : (
                    <View style={s.weeklyMetaPill}>
                      <Feather name="flag" size={13} color={colors.appLightText} />
                      <Text style={s.weeklyMetaPillText}>
                        Finish Line: {activeGoalTargetDate ? formatTargetDate(activeGoalTargetDate) : "—"}
                        {memorizationGoal?.endAyahNumber ? `, Ayah ${memorizationGoal.endAyahNumber}` : ""}
                      </Text>
                      {forecast?.isAheadOfBaseline ? (
                        <Feather name="trending-up" size={11} color={colors.appLightText} style={{ marginLeft: 4 }} />
                      ) : null}
                    </View>
                  )}
                </View>

                {/* Donut + scrollable dots row */}
                {weekPercent < 100 && (
                  <View style={s.thisWeekRhythmBlock}>
                    <Text style={s.rhythmTitle}>{isPaceGoal ? "TODAY'S RHYTHM" : isRevisionGoal ? "REVISION SEQUENCE" : "YOUR SEQUENCE"}</Text>
                    <View style={s.thisWeekDonutRow}>
                    {/* Donut progress ring */}
                    <View style={s.thisWeekDonutWrap}>
                      <Svg width={48} height={48} style={{ position: "absolute" }}>
                        <Circle cx={24} cy={24} r={20} stroke={colors.disabledBackground} strokeWidth={2.5} fill="none" />
                        {weekGoalProgress > 0 && effectiveGoalCount > 0 && (
                          <Circle
                            cx={24} cy={24} r={20}
                            stroke={colors.textSecondary}
                            strokeWidth={2.5}
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 20} ${2 * Math.PI * 20}`}
                            strokeDashoffset={2 * Math.PI * 20 * (1 - weekGoalProgress / Math.max(effectiveGoalCount, 1))}
                            strokeLinecap="round"
                            transform="rotate(-90, 24, 24)"
                          />
                        )}
                      </Svg>
                      <Text style={s.thisWeekDonutNum}>
                        {isPaceGoal ? (weekGoalProgress === 0 ? "—" : `${weekGoalProgress}`) : (nextAyahInRange?.ayahNumber ?? weekGoalAyahs[0]?.ayahNumber ?? "—")}
                      </Text>
                      <Text style={s.thisWeekDonutLabel}>{isPaceGoal ? "today" : "ayah"}</Text>
                    </View>

                    {/* Scrollable dots — one per weekly goal ayah */}
                    <View style={s.dotsFadeWrap}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={s.dotsScrollView}
                        contentContainerStyle={s.dotsScrollContent}
                      >
                        {(weeklySequence.length ? weeklySequence : weeklySequenceFallback).map((ayah, i) => {
                          const nonPaceRef = ayah && typeof ayah === "object" && "ayahNumber" in ayah
                            ? (ayah as AyahRef)
                            : null;
                          const ayahRef = isPaceGoal ? null : nonPaceRef;
                          const dotKey = ayahRef ? getAyahKey(ayahRef) : null;
                          const done = isPaceGoal
                            ? i < weekGoalProgress
                            : !!dotKey && memorizedAyahKeySet.has(dotKey);
                          const isPending = dotPendingIndex === i;
                          const ayahNumber = ayahRef?.ayahNumber ?? i + 1;
                          const handleDotPress = () => {
                            if (dotPendingIndex !== null) return;
                            if (isPaceGoal) {
                              if (done) return; // pace dots are one-directional
                              if (!nextPaceAyah) return;
                              setDotPendingIndex(i);
                              setTimeout(() => {
                                markAyahsMemorized([getAyahKey(nextPaceAyah)]);
                                setDotPendingIndex(null);
                              }, 500);
                            } else {
                              if (!ayahRef) return;
                              if (done) {
                                removeMemorizedAyahKeys([getAyahKey(ayahRef)]);
                                setShowWeekCompleteCard(false);
                                return;
                              }
                              setDotPendingIndex(i);
                              setTimeout(() => {
                                markAyahsMemorized([getAyahKey(ayahRef)]);
                                setDotPendingIndex(null);
                              }, 500);
                            }
                          };
                          return (
                            <TouchableOpacity
                              key={i}
                              style={[
                                s.dotCircle,
                                (isPending || done) ? s.dotCircleDone : s.dotCircleEmpty,
                              ]}
                              onPress={handleDotPress}
                              activeOpacity={0.65}
                              disabled={isPaceGoal ? done : !ayahRef}
                            >
                              {(isPending || done) && isPaceGoal ? (
                                <Feather name="check" size={16} color={colors.textSecondary} />
                              ) : !isPaceGoal ? (
                                <Text style={(isPending || done) ? s.dotNumDone : s.dotNum}>{ayahNumber}</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      <LinearGradient
                        pointerEvents="none"
                        colors={[colors.surfaceSecondaryTransparent, colors.surfaceSecondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={s.dotsRightFade}
                      />
                    </View>
                    </View>
                  </View>
                )}

                {weekPercent >= 100 && showWeekCompleteCard && (isPaceGoal ? paceExtensionOptionCounts.length > 0 : true) && (
                  <View style={s.weekCompleteCard}>
                    <View style={s.weekCompleteTopRow}>
                      <View style={s.weekCompleteIcon}>
                        <Feather name="check" size={16} color={colors.appWhite} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.weekCompleteTitle}>Week complete!</Text>
                        <Text style={s.weekCompleteSub}>Add more ayahs</Text>
                      </View>
                      <TouchableOpacity
                        style={s.weekCompleteClose}
                        onPress={() => setShowWeekCompleteCard(false)}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={14} color={colors.appLightText} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.weekAddOptionsRow}>
                      {(isPaceGoal ? paceExtensionOptionCounts : extensionOptionCounts).map((count) => (
                        <TouchableOpacity
                          key={count}
                          style={s.weekAddOption}
                          onPress={() => isPaceGoal ? extendPaceGoal(count) : extendCurrentGoal(count)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.weekAddOptionText}>+{count}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Next ayah row */}
                {!isPaceGoal && weekPercent < 100 && nextAyahInRange && (
                  <View style={s.nextAyahRowNew}>
                    <TouchableOpacity
                      onPress={() => {
                        if (pendingCheck) return;
                        setPendingCheck(true);
                        setTimeout(() => {
                          markAyahsMemorized([`${nextAyahInRange.surahNumber}:${nextAyahInRange.ayahNumber}`]);
                          setPendingCheck(false);
                        }, 520);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={[s.nextAyahCircleNew, pendingCheck && { borderWidth: 0 }]}>
                        {pendingCheck ? (
                          <Ionicons name="checkmark-circle" size={28} color={colors.appWarmBorder} />
                        ) : (
                          <Ionicons name="checkmark" size={15} color={colors.appIconMuted} />
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={s.nextAyahTitle}>
                        {nextAyahInRange.surahName} · Ayah {nextAyahInRange.ayahNumber}
                      </Text>
                      {upNextAyahNums.length > 0 && (
                        <Text style={s.nextAyahSub}>
                          {hifzDirection === "reverse" ? "Before this: Ayah " : "Up next: Ayah "}{upNextAyahNums.join(" · ")}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={s.nextAyahToggleNew}
                      onPress={() => setHifzDirection((current) => current === "forward" ? "reverse" : "forward")}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={hifzDirection === "reverse" ? "arrow-down" : "arrow-up"}
                        size={18}
                        color={colors.appLightText}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Done Revision CTA */}
                {isRevisionGoal && (
                  <TouchableOpacity
                    style={s.doneRevisionBtn}
                    onPress={handleRevisionComplete}
                    activeOpacity={0.75}
                  >
                    <Text style={s.doneRevisionBtnText}>Done Revision</Text>
                  </TouchableOpacity>
                )}

                {/* Streak row */}
                <View style={s.thisWeekStreakRow}>
                  <View style={s.thisWeekStreakGroup}>
                    <View style={s.streakOrangeDot} />
                    <Text style={s.streakText}>{streakDays} Day Streak</Text>
                  </View>
                  <TouchableOpacity
                    style={s.calendarButton}
                    onPress={() => router.push("/streak-calendar" as any)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.calendarButtonText}>Hifz Calendar</Text>
                    <Feather name="calendar" size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          )}

          {hifzTransition && (
            <View style={s.journeySection}>
              <View style={s.sectionHeadingRow}>
                <Text style={s.goalWidgetTitle}>YOUR JOURNEY</Text>
              </View>
              <View style={s.journeyCard}>
                <View style={s.journeyTopSurface}>
                  <View style={s.journeyHeaderRow}>
                    <View style={s.journeyCompletePill}>
                      <Feather name="check" size={12} color={colors.textSecondary} />
                      <Text style={s.journeyCompleteText}>Complete</Text>
                    </View>
                    <View style={s.journeyHeaderRight}>
                      <View style={s.journeyCompletionDateBadge}>
                        <Feather name="award" size={13} color={colors.textSecondary} />
                        <Text style={s.journeyCompletionDay}>{todayShort}</Text>
                      </View>
                      <TouchableOpacity style={s.journeyDismissBtn} onPress={skipHifzTransition} activeOpacity={0.7} hitSlop={8}>
                        <Feather name="x" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={s.journeyPreparingTitle}>Preparing next goal</Text>
                  <Text style={s.journeyTitle}>A milestone completed</Text>
                  <Text style={s.journeySubText}>
                    {`${hifzTransition.completed} is now part of your Hifz journey.`}
                  </Text>
                  <View style={s.journeyLoadingSurface}>
                    <View style={s.journeyLoadingRow}>
                      <View style={s.journeyLoadingColumn}>
                        <Text style={s.journeyLoadingLabel}>Completed</Text>
                        <Text style={s.journeyLoadingValue}>{hifzTransition.completed}</Text>
                      </View>
                      <View style={s.journeyLoadingDivider} />
                      <View style={s.journeyLoadingColumn}>
                        <Text style={s.journeyLoadingLabel}>Up next</Text>
                        <Text style={s.journeyLoadingValue}>{hifzTransition.upNext}</Text>
                      </View>
                    </View>
                    <View style={s.journeyLoadingRail}>
                      <View style={[s.journeyLoadingFill, { width: `${hifzTransitionProgress}%` as any }]} />
                    </View>
                    <Text style={s.journeyLoadingText}>Setting up your next Hifz step</Text>
                  </View>
                </View>

                <ActionPill
                  label="Add New Goal"
                  icon="plus"
                  iconPosition="right"
                  variant="primary"
                  size="md"
                  style={s.journeyPrimarySpacing}
                  onPress={() => setAyahRangeVisible(true)}
                />
                <ActionPill
                  label="Hifz Calendar"
                  icon="calendar"
                  variant="border"
                  size="md"
                  style={s.journeySecondaryAction}
                  onPress={() => router.push("/streak-calendar" as any)}
                />
              </View>
            </View>
          )}

          {/* ── Last Visited ──────────────────────────────────────────────── */}
          {recentProgress.length > 0 && (
            <View style={s.surahSection}>
              <View style={s.listSectionHeader}>
                <SubSectionTitle>Last Visited</SubSectionTitle>
              </View>
              {recentProgress.slice(0, 5).map((p, i) => {
                const meta = SURAH_DATA[p.surahNumber - 1];
                if (!meta) return null;
                const memorized = fullyMemorizedSurahs.has(p.surahNumber);
                const isLast = i === Math.min(recentProgress.length, 5) - 1;
                return (
                  <TouchableOpacity
                    key={`${p.surahNumber}-${i}`}
                    style={[s.surahRow, isLast && s.surahRowLast]}
                    onPress={() => router.push(`/surah/${p.surahNumber}?ayah=${p.ayahNumberInSurah}`)}
                    activeOpacity={0.65}
                  >
                    <View style={s.surahInfo}>
                      <Text style={s.surahName}>{p.surahName}</Text>
                      {memorized && <MemorizedBadge />}
                      <Text style={s.surahMeta}>Ayah {p.ayahNumberInSurah} · {meta.ayahCount} Ayahs</Text>
                    </View>
                    <Text style={s.surahArabic}>{meta.name}</Text>
                    <Feather name="clock" size={16} color={colors.appLightText} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Saved Surahs ──────────────────────────────────────────────── */}
          {savedSurahsMeta.length > 0 && (
            <View style={s.surahSection}>
              <View style={s.listSectionHeader}>
                <SubSectionTitle>Saved Surahs</SubSectionTitle>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/saved-surahs" as any)}>
                  <Text style={s.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {savedSurahsMeta.slice(0, 3).map((meta, i) => {
                const apiSurah = surahs.find(s => s.number === meta.number);
                const memorized = fullyMemorizedSurahs.has(meta.number);
                return (
                  <TouchableOpacity
                    key={meta.number}
                    style={[s.surahRow, i === savedSurahsMeta.slice(0, 3).length - 1 && savedSurahsMeta.length <= 3 && s.surahRowLast]}
                    onPress={() => router.push(`/surah/${meta.number}`)}
                    activeOpacity={0.65}
                  >
                    <View style={s.surahInfo}>
                      <Text style={s.surahName}>{meta.englishName}</Text>
                      {memorized && <MemorizedBadge />}
                      <Text style={s.surahMeta}>
                        {meta.ayahCount} Ayahs{apiSurah?.revelationType ? ` • ${apiSurah.revelationType}` : ""}
                      </Text>
                    </View>
                    <Text style={s.surahArabic}>{meta.name}</Text>
                    <Ionicons name="bookmark" size={18} color={colors.appText} />
                  </TouchableOpacity>
                );
              })}
              {savedSurahsMeta.length > 3 && (
                <TouchableOpacity
                  style={[s.surahRow, s.surahRowLast]}
                  onPress={() => router.push("/saved-surahs" as any)}
                  activeOpacity={0.65}
                >
                  <Text style={[s.surahMeta, { flex: 1 }]}>
                    {savedSurahsMeta.length - 3} more saved surahs
                  </Text>
                  <Feather name="chevron-right" size={16} color={colors.appLightText} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── All Surahs by Juz ─────────────────────────────────────────── */}
          <View style={s.surahSection}>
            <SubSectionTitle style={{ paddingHorizontal: 20, paddingBottom: 10 }}>All Surahs by Juz</SubSectionTitle>
            {surahsQuery.isLoading ? (
              <ActivityIndicator color={colors.appLightText} style={{ paddingVertical: 28 }} />
            ) : surahsQuery.isError ? (
              <InlineNotice
                variant="error"
                description="Could not load surahs. Tap to retry."
                onPress={load}
                style={{ marginHorizontal: 20 }}
              />
            ) : (
              juzGroups.map(group => (
                <View key={group.juz}>
                  <View style={s.juzHeader}>
                    <Text style={s.juzLabel}>JUZ {group.juz}</Text>
                    <View style={s.juzDivider} />
                  </View>
                  {group.surahs.map((surah, i) => {
                    const memorized = fullyMemorizedSurahs.has(surah.number);
                    const compactArabicName = SURAH_DATA[surah.number - 1]?.name ?? surah.name;
                    return (
                      <TouchableOpacity
                        key={surah.number}
                        style={[s.surahRow, i === group.surahs.length - 1 && s.surahRowLast]}
                        onPress={() => router.push(`/surah/${surah.number}`)}
                        activeOpacity={0.65}
                      >
                        <View style={s.surahInfo}>
                          <Text style={s.surahName}>{surah.englishName}</Text>
                          {memorized && <MemorizedBadge />}
                          <Text style={s.surahMeta}>{surah.numberOfAyahs} Ayahs • {surah.revelationType}</Text>
                        </View>
                        <Text style={s.surahArabic}>{compactArabicName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </View>
          </>
          </ScrollView>
          )}
      </LinearGradient>


      {/* ── Week Done Toast (floating overlay) ──────────────────────── */}
      {showWeeklyToast && (
        <SwipeToast onDismiss={() => setShowWeeklyToast(false)} style={[s.weekDoneToast, { top: insets.top + 12 }]}>
          <View style={s.toastIcon}>
            <Feather name="check" size={16} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Weekly target complete</Text>
            <Text style={s.weekDoneSub}>{weekGoalProgress} ayahs memorized this week</Text>
          </View>
          <TouchableOpacity onPress={() => setShowWeeklyToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </SwipeToast>
      )}

      {showMilestoneToast && (
        <SwipeToast onDismiss={() => setShowMilestoneToast(false)} style={[s.weekDoneToast, { top: insets.top + 12, alignItems: "flex-start" }]}>
          <View style={[s.toastIcon, { marginTop: 2 }]}>
            <Feather name="flag" size={15} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Ayah milestone complete</Text>
            <Text style={s.weekDoneSub}>
              {(targetSurah?.englishName ?? memorizationGoal?.startSurahName ?? "Goal")} · {selectedRangeLabel} memorized
            </Text>
            <TouchableOpacity
              onPress={() => { setShowMilestoneToast(false); router.push("/streak-calendar" as any); }}
              hitSlop={{ top: 6, bottom: 6, left: 0, right: 16 }}
              style={{ marginTop: 6 }}
            >
              <Text style={s.toastCalendarCta}>View Hifz Calendar →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowMilestoneToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </SwipeToast>
      )}

      {showHifzCompleteToast && (
        <SwipeToast onDismiss={() => setShowHifzCompleteToast(false)} style={[s.weekDoneToast, { top: insets.top + 12 }]}>
          <View style={s.toastIcon}>
            <Feather name="book-open" size={15} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>{hifzCompleteToastText.title}</Text>
            <Text style={s.weekDoneSub}>{hifzCompleteToastText.sub}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHifzCompleteToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </SwipeToast>
      )}

      <HifzGoalSetupModal
        visible={hifzSetupVisible}
        onClose={() => setHifzSetupVisible(false)}
        onSelectSurah={(surahNumber) => openNewHifzSelection("surah", { surahNumber, startAtAyahSelection: true })}
        onSelectJuz={(juz) => openNewHifzSelection("juz", { juz, startAtAyahSelection: true })}
        onSelectPace={(options) => openPaceHifzSelection(options)}
      />

      <AyahRangeModal
        visible={weeklyGoalVisible}
        path={weeklyGoalPath}
        memorizedAyahKeys={memorizedAyahKeys}
        initialSelection={weeklyInitialSelection}
	        startAtWeeklyGoal
	        confirmLabel="Set Weekly Target"
	        onConfirm={({ first, last, juz, ayahsPerWeek, isRevision }) => {
	          const today = new Date().toISOString().split("T")[0];
	          const targetJuz = weeklyGoalPath === "juz" ? (juz ?? memorizationGoal?.targetJuz ?? undefined) : undefined;
	          const effectiveLast = expandLastAyahForWeeklyCount({
	            path: weeklyGoalPath,
	            targetJuz,
	            first,
	            last,
	            requestedAyahsPerWeek: ayahsPerWeek,
	            memorizedAyahKeys,
	          });
	          setWidgetFirstAyah(first);
	          setWidgetLastAyah(effectiveLast);
	          setWidgetJuz(targetJuz ?? null);
          setShowHifzGoalOptions(false);
          setMemorizationGoal({
            path: weeklyGoalPath,
            startSurahNumber: memorizationGoal?.startSurahNumber ?? first.surahNumber,
            startSurahName: memorizationGoal?.startSurahName ?? (weeklyGoalPath === "juz" && targetJuz != null ? `Juz ${targetJuz}` : first.surahName),
            startDate: memorizationGoal?.startDate ?? today,
            ayahsReadAtStart: memorizationGoal?.ayahsReadAtStart ?? todayEntry?.ayahsRead ?? 0,
            targetJuz,
	            endSurahNumber: memorizationGoal?.endSurahNumber ?? effectiveLast.surahNumber,
	            endAyahNumber: memorizationGoal?.endAyahNumber ?? effectiveLast.ayahNumber,
	          });
          const selectedRangeAyahs = getGoalRangeAyahs({
	            path: weeklyGoalPath,
	            targetJuz,
	            startSurahNumber: first.surahNumber,
	            startAyahNumber: first.ayahNumber,
	            endSurahNumber: effectiveLast.surahNumber,
	            endAyahNumber: effectiveLast.ayahNumber,
	          });

          if (isRevision) {
            // Revision: target = all range ayahs, no unmemorized filtering
            setGoal({
              ayahsPerWeek: Math.max(1, Math.min(selectedRangeAyahs.length, ayahsPerWeek)),
              weeklyTargetAyahKeys: selectedRangeAyahs.map(getAyahKey),
	              startSurahNumber: first.surahNumber,
	              startAyahNumber: first.ayahNumber,
	              startDate: goal?.startDate ?? today,
	              endSurahNumber: effectiveLast.surahNumber,
	              endAyahNumber: effectiveLast.ayahNumber,
	              isRevision: true,
	            });
          } else {
            // Preserve this week's already-memorized ayahs so progress isn't reset
            const existingTargetKeys = goal?.weeklyTargetAyahKeys ?? [];
            const existingTargetSet = new Set(existingTargetKeys);
            const memorizedSet = new Set(memorizedAyahKeys);
            const doneThisWeek = selectedRangeAyahs
              .map(getAyahKey)
              .filter(k => existingTargetSet.has(k) && memorizedSet.has(k));

            let weeklyTargetAyahKeys: string[];
            let finalAyahsPerWeek: number;

            if (doneThisWeek.length >= ayahsPerWeek) {
              weeklyTargetAyahKeys = doneThisWeek.slice(0, ayahsPerWeek);
              finalAyahsPerWeek = ayahsPerWeek;
            } else {
              const extra = buildWeeklyGoal({
	                path: weeklyGoalPath,
	                targetJuz,
	                startSurahNumber: first.surahNumber,
	                startAyahNumber: first.ayahNumber,
	                endSurahNumber: effectiveLast.surahNumber,
	                endAyahNumber: effectiveLast.ayahNumber,
	                requestedAyahsPerWeek: ayahsPerWeek - doneThisWeek.length,
	                memorizedAyahKeys,
              });
              weeklyTargetAyahKeys = [...doneThisWeek, ...(extra.weeklyTargetAyahKeys ?? [])];
              finalAyahsPerWeek = weeklyTargetAyahKeys.length;
            }

            setGoal({
              ayahsPerWeek: finalAyahsPerWeek,
              weeklyTargetAyahKeys,
	              startSurahNumber: first.surahNumber,
	              startAyahNumber: first.ayahNumber,
	              startDate: goal?.startDate ?? today,
	              endSurahNumber: effectiveLast.surahNumber,
	              endAyahNumber: effectiveLast.ayahNumber,
	              isRevision: false,
	            });
          }
          setWeeklyGoalVisible(false);
        }}
        onClose={() => setWeeklyGoalVisible(false)}
      />
      {/* Pace-first flow: Measurement → Capacity → Peak → Growth → Forecast */}
      <AyahRangeModal
        visible={paceDateVisible}
        path={widgetPath}
        memorizedAyahKeys={memorizedAyahKeys}
        startAtPaceDate
        initialPaceStep={paceDateInitialStep}
        modalAnimationType="none"
        paceRhythm={paceRhythm}
        paceDaysPerWeek={paceDaysPerWeek}
        paceTargetDaysPerWeek={paceTargetDaysPerWeek}
        onConfirm={({
          ayahsPerWeek,
          targetAyahsPerWeek,
          measurementStyle,
          finishWeeks,
          memorizationStyle,
          gradualIncreaseStyle,
          gradualWeeklyPlan,
          hifzDaysPerWeek,
          targetHifzDaysPerWeek,
          gradualDaysPerWeekPlan,
          paceRhythm: confirmedPaceRhythm,
          startCanonicalAyahsPerDay,
          targetCanonicalAyahsPerDay,
        }) => {
          const today = new Date().toISOString().split("T")[0];
          setWidgetFirstAyah(null);
          setWidgetLastAyah(null);
          setWidgetJuz(null);
          setShowHifzGoalOptions(false);
          setMemorizationGoal({
            path: "pace",
            startSurahNumber: 1,
            startSurahName: "Full Quran",
            startDate: today,
            ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
          });
          setGoal({
            ayahsPerWeek,
            targetAyahsPerWeek,
            measurementStyle,
            finishWeeks,
            memorizationStyle,
            gradualIncreaseStyle,
            gradualWeeklyPlan,
            hifzDaysPerWeek,
            targetHifzDaysPerWeek,
            gradualDaysPerWeekPlan,
            paceRhythm: confirmedPaceRhythm,
            startCanonicalAyahsPerDay,
            targetCanonicalAyahsPerDay,
            startDate: today,
          });
          setPaceDateVisible(false);
        }}
        onClose={() => setPaceDateVisible(false)}
      />
      <AppDialog
        visible={showRestartHifzConfirm}
        title="Restart your Hifz journey?"
        message={"This will remove your memorization progress, weekly goals, streaks, and active Hifz setup.\n\nYour earned certificates will remain on your profile."}
        confirmLabel="Restart Hifz"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          setShowRestartHifzConfirm(false);
          resetHifzFlow();
        }}
        onCancel={() => setShowRestartHifzConfirm(false)}
      />
      <AyahRangeModal
        visible={ayahRangeVisible}
        path={widgetPath}
        memorizedAyahKeys={memorizedAyahKeys}
        startAtAyahSelection={setupStartAtAyahSelection}
        initialSurahNumber={setupInitialSurahNumber}
        initialJuz={setupInitialJuz}
        modalAnimationType={setupStartAtAyahSelection ? "none" : "slide"}
        onConfirm={({ first, last, juz, ayahsPerWeek, isRevision }) => {
          const today = new Date().toISOString().split("T")[0];
          setWidgetFirstAyah(first);
          setWidgetLastAyah(last);
          setWidgetJuz(juz ?? null);
          setShowHifzGoalOptions(false);
          const targetJuz = widgetPath === "juz" ? (juz ?? undefined) : undefined;
          setMemorizationGoal({
            path: widgetPath,
            startSurahNumber: first.surahNumber,
            startSurahName: widgetPath === "juz" && targetJuz != null ? `Juz ${targetJuz}` : first.surahName,
            startDate: today,
            ayahsReadAtStart: todayEntry?.ayahsRead ?? 0,
            targetJuz,
            endSurahNumber: last.surahNumber,
            endAyahNumber: last.ayahNumber,
          });
          if (isRevision) {
            const rangeAyahs = getGoalRangeAyahs({
              path: widgetPath,
              targetJuz,
              startSurahNumber: first.surahNumber,
              startAyahNumber: first.ayahNumber,
              endSurahNumber: last.surahNumber,
              endAyahNumber: last.ayahNumber,
            });
            setGoal({
              ayahsPerWeek: Math.max(1, Math.min(rangeAyahs.length, ayahsPerWeek)),
              weeklyTargetAyahKeys: rangeAyahs.map(getAyahKey),
              startSurahNumber: first.surahNumber,
              startAyahNumber: first.ayahNumber,
              startDate: today,
              endSurahNumber: last.surahNumber,
              endAyahNumber: last.ayahNumber,
              isRevision: true,
            });
          } else {
            const weeklyGoal = buildWeeklyGoal({
              path: widgetPath,
              targetJuz,
              startSurahNumber: first.surahNumber,
              startAyahNumber: first.ayahNumber,
              endSurahNumber: last.surahNumber,
              endAyahNumber: last.ayahNumber,
              requestedAyahsPerWeek: ayahsPerWeek,
              memorizedAyahKeys,
            });
            setGoal({
              ...weeklyGoal,
              startDate: today,
              endSurahNumber: last.surahNumber,
              endAyahNumber: last.ayahNumber,
              isRevision: false,
            });
          }
          setSetupStartAtAyahSelection(false);
          setSetupInitialSurahNumber(undefined);
          setSetupInitialJuz(undefined);
        }}
        onClose={() => {
          setAyahRangeVisible(false);
          setSetupStartAtAyahSelection(false);
          setSetupInitialSurahNumber(undefined);
          setSetupInitialJuz(undefined);
        }}
      />
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 120 },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    studyingNowPill: {
      minHeight: 28,
      borderRadius: 999,
      backgroundColor: colors.borderSubtle,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    studyingNowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.disabledText,
    },
    studyingNowText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      fontFamily: "Inter_600SemiBold",
    },

    // ── Goal Widget Cards ───────────────────────────────────────────────────────
    widgetCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      ...colors.shadows.warmWidgetLift,
    },
    ctaCardShadow: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 10,
      backgroundColor: colors.appLighterBg,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      ...colors.shadows.warmWidgetLift,
    },
    ctaCardClip: {
      borderRadius: 10,
      overflow: "hidden",
      elevation: 1,
    },
    widgetCardContent: { padding: 16 },

    attachedCta: {
      backgroundColor: colors.appSecondarySurface,
      borderTopWidth: 1,
      borderTopColor: colors.appDarkerGray,
      paddingVertical: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    attachedCtaText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    topBanner: {
      backgroundColor: colors.appSuccess,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    bannerText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },
    memCompleteGreen: {
      backgroundColor: colors.appSuccess,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 14,
    },
    memCompleteCheckCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.appWhite,
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    memCompleteGreenText: { fontSize: 15, color: colors.appWhite, fontFamily: "Inter_400Regular", lineHeight: 22 },
    memCompleteGreenBold: { fontFamily: "Inter_700Bold", color: colors.appWhite },
    memCompleteGreenSub: { fontSize: 13, color: colors.overlayInverseSoft, fontFamily: "Inter_400Regular", marginTop: 2 },
    memCompleteSteps: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 0,
    },
    memCompleteStep: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepDivider: {
      width: 0.5,
      height: 32,
      backgroundColor: colors.appBorderLight,
      marginHorizontal: 14,
    },
    stepNumCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.appNeutralDark,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    stepNumText: { fontSize: 16, fontWeight: "400", color: colors.appWhite, fontFamily: "Inter_400Regular" },
    stepStepText: {
      flex: 1,
      fontSize: 14,
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
      lineHeight: 16,
    },
    widgetCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerPill: {
      backgroundColor: colors.appLightGray,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    headerPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appLightText,
      letterSpacing: 0.8,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
    },
    modeBadge: {
      backgroundColor: colors.appBlack,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    modeBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appGold,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },

    widgetCardBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    widgetCardInfo: { flex: 1 },
    widgetCardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
      marginBottom: 3,
      letterSpacing: -0.2,
    },
    widgetCardSub: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    dailyCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    dailyProgressText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    dotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
      marginTop: 6,
    },
    dotGridItem: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.appBorderLighter,
    },
    dotGridItemFilled: { backgroundColor: colors.appBlack },
    remainingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.appBorderLighter,
      marginTop: 10,
      gap: 10,
    },
    remainingCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.appBorderLighter,
    },
    remainingTextArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    remainingName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.appBlack, fontFamily: "Inter_600SemiBold" },
    remainingCount: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular" },

    dailyCardFooter: { marginTop: 10, gap: 8 },
    remainingLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    remainingLabel: {
      fontSize: 12, fontWeight: "700", color: colors.appBorderLight,
      letterSpacing: 1, fontFamily: "Inter_700Bold", textTransform: "uppercase",
    },
    remainingShowing: { fontSize: 12, fontWeight: "700", color: colors.appLightText, fontFamily: "Inter_700Bold" },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    streakText: { fontSize: 13, fontWeight: "600", color: colors.appGold, fontFamily: "Inter_600SemiBold" },
    detailsPill: { marginLeft: "auto" as any },
    // ── Idle / No Goal ─────────────────────────────────────────────────────────
    greetingSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    greeting: {
      fontSize: 22,
      color: colors.appBlack,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontStyle: "italic",
      marginBottom: 24,
    },
    goalTitle: { fontSize: 20, fontWeight: "700", color: colors.appBlack, fontFamily: "Inter_700Bold", marginBottom: 6 },
    goalSub: { fontSize: 14, color: colors.appLightText, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 20 },
    goalBtn: {
      backgroundColor: colors.appBlack,
      borderRadius: 14,
      paddingVertical: 17,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    goalBtnText: { fontSize: 16, fontWeight: "700", color: colors.appWhite, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
    // ── List Sections (Last Visited / Saved Surahs) ────────────────────────────
    listSection: { marginTop: 30 },
    listSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      paddingHorizontal: 20,
    },
    viewAllText: { fontSize: 13, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    lvScroll: { gap: 12, paddingRight: 20, paddingLeft: 20 },
    lvCard: {
      width: 150,
      backgroundColor: colors.surfacePrimary,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 2,
    },
    lvArabic: {
      fontSize: 25,
      color: colors.accentPrimary,
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 38,
    },
    lvName: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textPrimary,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    lvAyah: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 2,
      marginBottom: 12,
    },

    // ── All Surahs by Juz ──────────────────────────────────────────────────────
    surahSection: { marginTop: 28 },
    juzHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    juzDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderStrong,
      marginTop: 6,
      marginRight: 40,
    },
    juzLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textTertiary,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
    },
    surahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appSeparator,
      gap: 16,
    },
    surahRowLast: { borderBottomWidth: 0 },
    surahNumBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.appBubbleBorder,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    surahNum: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.appTextPrimary,
      fontFamily: "Inter_600SemiBold",
    },
    surahInfo: { flex: 1, justifyContent: "center", alignItems: "flex-start" },
    surahName: { fontSize: 14, fontWeight: "700", color: colors.appTextPrimary, fontFamily: "Inter_700Bold" },
    surahMeta: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular", marginTop: 2 },
    surahArabic: {
      fontSize: 18,
      color: colors.appTextPrimary,
    },

    // ── Hifz Goal Widget ──────────────────────────────────────────────────────
    goalWidgetSection: {
      marginHorizontal: 20,
      marginTop: 6,
    },
    goalWidgetSelectionSection: {
      marginHorizontal: 20,
      marginTop: 6,
    },
    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8,
    },
    sectionHeadingRowSelection: {
      marginBottom: 14,
    },
    goalWidgetTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.9,
      textTransform: "uppercase",
    },
    goalWidgetTitleSelection: {
      fontSize: 13,
      color: colors.textSecondary,
      letterSpacing: 1.9,
    },
    niyyahAcceptedText: {
      fontSize: 10,
      fontWeight: "400",
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      textAlign: "right",
      flexShrink: 1,
    },
    manageLink: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: "Inter_600SemiBold",
    },
    manageCta: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: colors.surfacePrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    hifzManageCard: {
      marginBottom: 14,
      backgroundColor: "transparent",
    },
    hifzInlineOptionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    hifzInlineOptionBtn: {
      flexGrow: 1,
      flexBasis: "42%" as any,
      minHeight: 58,
      borderRadius: 20,
      backgroundColor: colors.hifzHeroCard,
      alignItems: "center",
      justifyContent: "center",
    },
    hifzInlineOptionText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
      fontFamily: "Inter_700Bold",
    },
    hifzInlineCloseBtn: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.hifzHeroCard,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    restartHifzRow: {
      alignItems: "center",
      paddingBottom: 10,
      paddingTop: 2,
    },
    goalWidgetCard: {
      backgroundColor: colors.surfacePrimary,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    emptyGoalIntro: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 12,
    },
    emptyGoalTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: colors.textPrimary,
      fontFamily: "Inter_700Bold",
    },
    emptyModeRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    emptyModePill: {
      flex: 1,
      minHeight: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.overlayElevated,
    },
    emptyModePillSelected: {
      backgroundColor: colors.accentSoft,
    },
    emptyModeText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
    },
    emptyModeTextSelected: {
      color: colors.accentPrimary,
    },
    widgetAyahRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    widgetAyahRowFilled: {},
    widgetRowMuted: {
      opacity: 0.42,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.overlayElevated,
    },
    widgetAyahCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    widgetAyahCircleFilled: {
      backgroundColor: colors.accentSoft,
    },
    widgetAyahLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    widgetAyahValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      fontFamily: "Inter_700Bold",
    },
    widgetAyahPlaceholder: {
      fontSize: 14,
      color: colors.disabledText,
      fontFamily: "Inter_700Bold",
      fontWeight: "700",
    },
    widgetStep1Badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.appStone,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    widgetStep1Text: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
    },
    widgetRowDivider: {
      height: 0,
    },
    widgetPaceRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    widgetPaceDivider: {
      width: StyleSheet.hairlineWidth,
      height: 44,
      backgroundColor: colors.borderSubtle,
      marginHorizontal: 12,
    },
    widgetPaceLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    widgetPaceValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      fontFamily: "Inter_700Bold",
    },
    widgetPacePlaceholder: {
      fontSize: 14,
      color: colors.disabledText,
      fontFamily: "Inter_700Bold",
      fontWeight: "700",
    },
    widgetStartBtn: {
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 0,
      backgroundColor: colors.accentSoft,
      borderRadius: 22,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    widgetStartBtnDisabled: {
      backgroundColor: colors.surfaceSecondary,
    },
    widgetStartBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.accentPrimary,
      fontFamily: "Inter_700Bold",
    },
    widgetStartBtnTextDisabled: {
      color: colors.disabledText,
    },
    widgetFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 12,
      backgroundColor: colors.surfaceElevated,
    },
    widgetStreakGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    // ── Hifz Progress Card (active goal state) ─────────────────────────────
    hifzProgressCardPad: { padding: 16 },
    hifzProgressHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    hifzProgressTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
      marginBottom: 3,
    },
    hifzProgressSub: {
      fontSize: 13,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },
    hifzProgressPctBlock: {
      alignItems: "flex-end",
      flexShrink: 0,
      paddingLeft: 8,
    },
    hifzProgressPctSoftBlock: {
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: "center",
    },
    hifzProgressPctNum: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
      lineHeight: 30,
    },
    hifzProgressPctLabel: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
    },
    hifzProgressBar: {
      height: 4,
      backgroundColor: colors.appBorderLighter,
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 8,
    },
    hifzProgressBarSoft: {
      marginTop: 14,
      height: 5,
      borderRadius: 999,
    },
    hifzProgressBarFill: {
      height: "100%" as any,
      backgroundColor: colors.appBlack,
      borderRadius: 2,
    },
    hifzProgressMeta: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },
    continuationCard: {
      marginHorizontal: 14,
      marginTop: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surfaceElevated,
      overflow: "hidden",
    },
    continuationRow: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: colors.hifzBackground,
    },
    continuationColumn: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    continuationDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
    },
    continuationLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.7,
      marginBottom: 4,
    },
    continuationValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    continuationCopyRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    continuationCopy: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
    },

    // ── Pace goal card (Last Memorized layout) ──────────────────────────────
    paceLastMemBtn: {
      marginHorizontal: 14,
      marginTop: 14,
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    paceLastMemLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    paceLastMemValue: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    paceTagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },

    hifzActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    hifzActionPill: { flex: 1 },
    hifzCancelText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    restartHifzBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    restartHifzText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
    },

    // ── THIS WEEK Section ─────────────────────────────────────────────────
    thisWeekSection: {
      marginHorizontal: 20,
      marginTop: 22,
    },
    thisWeekCard: {
      backgroundColor: colors.surfacePrimary,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    thisWeekHeaderNew: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: colors.surfaceSecondary,
    },
    thisWeekBigTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    thisWeekIntention: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
      marginBottom: 12,
    },
    weeklyMetaPills: {
      alignItems: "flex-start",
      gap: 8,
    },
    weeklyMetaPill: {
      alignSelf: "flex-start",
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    weeklyMetaPillText: {
      fontSize: 13,
      lineHeight: 15,
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
    },
    thisWeekHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    thisWeekActionPill: {
      minWidth: 92,
    },
    thisWeekSoftActionText: {
      textTransform: "none",
      letterSpacing: 0,
    },
    thisWeekHeaderText: { flex: 1 },
    thisWeekAyahCount: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    thisWeekDoneCount: {
      fontSize: 16,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },
    weeklyTargetTitle: {
      flex: 1,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    // Donut + dots
    thisWeekRhythmBlock: {
      paddingHorizontal: 16,
      paddingBottom: 4,
      backgroundColor: colors.surfaceSecondary,
    },
    rhythmTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    thisWeekDonutRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 0,
      gap: 10,
    },
    thisWeekDonutWrap: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    thisWeekDonutNum: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      fontFamily: "Inter_700Bold",
      lineHeight: 17,
    },
    thisWeekDonutLabel: {
      fontSize: 8,
      lineHeight: 10,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
    },
    dotsScrollView: { flex: 1 },
    dotsFadeWrap: {
      flex: 1,
      overflow: "hidden",
    },
    dotsRightFade: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 48,
    },
    dotsScrollContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingRight: 54,
    },
    dotCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
    },
    dotCircleDone: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accentSoft,
    },
    dotCircleEmpty: {
      backgroundColor: "transparent",
      borderColor: colors.accentSoft,
    },
    dotNum: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "600",
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
    },
    dotNumDone: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      fontFamily: "Inter_600SemiBold",
    },

    // Add more button
    addMoreBtn: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
    },
    addMoreBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    weekCompleteCard: {
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 14,
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 10,
      padding: 14,
    },
    weekCompleteTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    weekCompleteIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.appBlack,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    weekCompleteTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    weekCompleteSub: {
      fontSize: 13,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    weekCompleteClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.appStone,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    weekAddOptionsRow: {
      flexDirection: "row",
      gap: 8,
    },
    weekAddOption: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: colors.appWhite,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      alignItems: "center",
      justifyContent: "center",
    },
    weekAddOptionText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },

    // Current Goal sub-card
    currentGoalCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surfacePrimary,
      borderRadius: 10,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    currentGoalLeft: { flex: 1, paddingRight: 8 },
    currentGoalRight: { alignItems: "flex-end", flexShrink: 0 },
    currentGoalLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    currentGoalRange: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
      marginBottom: 3,
    },
    currentGoalProgress: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },
    currentGoalDateLabel: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginBottom: 4,
    },
    currentGoalDate: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    currentGoalMilestoneLabel: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginTop: 10,
      marginBottom: 2,
    },
    currentGoalMilestoneRange: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
    },

    // Next ayah row
    nextAyahRowNew: {
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 12,
      backgroundColor: colors.surfacePrimary,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    nextAyahCircleNew: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.appIconMuted,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    nextAyahToggleNew: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    nextAyahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.appBorderLighter,
      gap: 12,
    },
    nextAyahCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.appBorderLighter,
      flexShrink: 0,
    },
    nextAyahTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appTextPrimary,
      fontFamily: "Inter_600SemiBold",
    },
    nextAyahSub: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    nextAyahChevrons: {
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.appBlack,
      backgroundColor: colors.appBlack,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    // Continue Hifz button
    continueHifzBtn: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 0,
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    continueHifzBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    continueHifzTextWrap: {
      alignItems: "center",
      gap: 2,
    },
    continueHifzSubText: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
    },

    // Streak row inside THIS WEEK card
    doneRevisionBtn: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accentSoft,
      paddingVertical: 11,
      marginHorizontal: 16,
      marginTop: 12,
    },
    doneRevisionBtnText: {
      fontSize: 13,
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
    },
    thisWeekStreakRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderSubtle,
      backgroundColor: colors.surfacePrimary,
    },
    thisWeekStreakGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    streakOrangeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.appFlame,
    },
    calendarButton: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accentSoft,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: colors.surfaceElevated,
    },
    calendarButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },

    // Journey milestone card
    journeySection: {
      marginHorizontal: 20,
      marginTop: 22,
    },
    journeyCard: {
      backgroundColor: colors.surfacePrimary,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    journeyTopSurface: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    journeyHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    journeyHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    journeyDismissBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.overlaySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    journeyCompletionDay: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      fontFamily: "Inter_700Bold",
    },
    journeyCompletionDateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.accentSoft,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 0,
    },
    journeyTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyPreparingTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    journeySubText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      marginTop: 6,
      marginBottom: 14,
    },
    journeyCompletePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.overlaySubtle,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 0,
    },
    journeyCompleteText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.7,
    },
    journeyLoadingSurface: {
      overflow: "hidden",
      marginTop: 14,
      marginBottom: 2,
    },
    journeyLoadingRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    journeyLoadingColumn: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    journeyLoadingDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
    },
    journeyLoadingLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.7,
      marginBottom: 4,
    },
    journeyLoadingValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyLoadingRail: {
      height: 4,
      backgroundColor: colors.disabledBackground,
      overflow: "hidden",
    },
    journeyLoadingFill: {
      height: "100%" as any,
      backgroundColor: colors.textSecondary,
    },
    journeyLoadingText: {
      fontSize: 11,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    journeyReflectionList: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: colors.surfaceElevated,
    },
    journeyReflectionRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    journeyReflectionRowLast: { borderBottomWidth: 0 },
    journeyStatLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      fontFamily: "Inter_700Bold",
    },
    journeyStatValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyPrimarySpacing: {
      marginHorizontal: 16,
      marginTop: 10,
    },
    journeySecondaryAction: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 16,
    },

    // Week done floating toast
    weekDoneToast: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 50,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 8,
    },
    weekDoneCheckCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.appSuccess,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    weekDoneTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    weekDoneSub: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    toastCalendarCta: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: "Inter_600SemiBold",
      textDecorationLine: "underline",
    },
    toastIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    verseCard: {
      marginHorizontal: 20,
      marginTop: 16,
    },
  });
