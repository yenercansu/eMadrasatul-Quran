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
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type Goal, type MemorizationGoal } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { getJuzAyahs, SURAH_DATA, type AyahRef } from "@/constants/surahData";
import { AyahRangeModal, type AyahRangeResult } from "@/components/AyahRangeModal";
import { SubSectionTitle } from "@/components/Typography";
import { MemorizedBadge } from "@/components/SurahCard";
import { HifzGoalSetupModal, type PaceRhythm } from "@/components/hifz/HifzGoalSetupModal";
import { HifzHeroCard } from "@/components/hifz/HifzUI";
import { VerseCard } from "@/components/VerseCard";
import { ActionPill } from "@/components/ActionPill";

const TOTAL_AYAHS = 6236;
const MAX_WEEKLY_AYAHS = 70;

function getAyahKey(ayah: Pick<AyahRef, "surahNumber" | "ayahNumber">) {
  return `${ayah.surahNumber}:${ayah.ayahNumber}`;
}

function getGoalRangeAyahs(options: {
  path: "surah" | "juz";
  targetJuz?: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
}): AyahRef[] {
  const source = options.path === "juz" && options.targetJuz
    ? getJuzAyahs(options.targetJuz)
    : (() => {
        const surah = SURAH_DATA.find(s => s.number === options.startSurahNumber);
        if (!surah) return [];
        return Array.from({ length: surah.ayahCount }, (_, index) => ({
          surahNumber: surah.number,
          surahName: surah.englishName,
          ayahNumber: index + 1,
        }));
      })();
  const startIdx = source.findIndex(
    a => a.surahNumber === options.startSurahNumber && a.ayahNumber === options.startAyahNumber
  );
  const fallbackEndIdx = source.length - 1;
  const endIdx = options.endSurahNumber != null && options.endAyahNumber != null
    ? source.findIndex(a => a.surahNumber === options.endSurahNumber && a.ayahNumber === options.endAyahNumber)
    : fallbackEndIdx;
  if (startIdx < 0) return [];
  return source.slice(startIdx, endIdx >= startIdx ? endIdx + 1 : undefined);
}

function buildWeeklyGoal(options: {
  path: "surah" | "juz";
  targetJuz?: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
  requestedAyahsPerWeek: number;
  memorizedAyahKeys: string[];
}) {
  const memorized = new Set(options.memorizedAyahKeys);
  const remaining = getGoalRangeAyahs(options).filter(ayah => !memorized.has(getAyahKey(ayah)));
  const target = remaining.slice(0, Math.min(MAX_WEEKLY_AYAHS, options.requestedAyahsPerWeek));
  const first = target[0];

  return {
    ayahsPerWeek: Math.max(1, target.length || Math.min(MAX_WEEKLY_AYAHS, options.requestedAyahsPerWeek)),
    startSurahNumber: first?.surahNumber ?? options.startSurahNumber,
    startAyahNumber: first?.ayahNumber ?? options.startAyahNumber,
    weeklyTargetAyahKeys: target.map(getAyahKey),
  };
}

function isSurahFullyMemorized(surahNumber: number, memorized: Set<string>) {
  const surah = SURAH_DATA[surahNumber - 1];
  if (!surah) return false;
  for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
    if (!memorized.has(`${surahNumber}:${ayah}`)) return false;
  }
  return true;
}

function isJuzFullyMemorized(juz: number, memorized: Set<string>) {
  const ayahs = getJuzAyahs(juz);
  return ayahs.length > 0 && ayahs.every((ayah) => memorized.has(getAyahKey(ayah)));
}

function findNextIncompleteSurah(currentSurahNumber: number, memorizedAyahKeys: string[]) {
  const memorized = new Set(memorizedAyahKeys);
  const after = SURAH_DATA.find(
    (surah) => surah.number > currentSurahNumber && !isSurahFullyMemorized(surah.number, memorized)
  );
  if (after) return after;
  return SURAH_DATA.find((surah) => !isSurahFullyMemorized(surah.number, memorized)) ?? null;
}

function findNextIncompleteJuz(currentJuz: number, memorizedAyahKeys: string[]) {
  const memorized = new Set(memorizedAyahKeys);
  for (let juz = currentJuz + 1; juz <= 30; juz++) {
    if (!isJuzFullyMemorized(juz, memorized)) return juz;
  }
  for (let juz = 1; juz <= 30; juz++) {
    if (!isJuzFullyMemorized(juz, memorized)) return juz;
  }
  return null;
}

function getFirstUnmemorizedAyah(ayahs: AyahRef[], memorizedAyahKeys: string[]) {
  const memorized = new Set(memorizedAyahKeys);
  return ayahs.find((ayah) => !memorized.has(getAyahKey(ayah))) ?? null;
}

function getNextAyahAfter(ayah: Pick<AyahRef, "surahNumber" | "ayahNumber">): AyahRef | null {
  const surah = SURAH_DATA.find(s => s.number === ayah.surahNumber);
  if (!surah) return null;
  if (ayah.ayahNumber < surah.ayahCount) {
    return { surahNumber: surah.number, surahName: surah.englishName, ayahNumber: ayah.ayahNumber + 1 };
  }
  const nextSurah = SURAH_DATA.find(s => s.number === ayah.surahNumber + 1);
  return nextSurah ? { surahNumber: nextSurah.number, surahName: nextSurah.englishName, ayahNumber: 1 } : null;
}

function formatCompletionMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatIslamicMonthYear(date: Date) {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic", {
      month: "long",
      year: "numeric",
    }).format(date).replace(/\s*AH$/i, "");
  } catch {
    return "";
  }
}

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
  const {
    lastListened, goal, setGoal, memorizationGoal, setMemorizationGoal,
    todayEntry, dailyEntries, onlineUsers, recentProgress, savedSurahs,
    getWeekGoalAyahs, isSurahChecked, markAyahsMemorized, recordMilestoneCompletion,
    memorizedAyahKeys,
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

  // ── Hifz Goal Widget state ────────────────────────────────────────────────
  const [widgetPath, setWidgetPath] = useState<"surah" | "juz">("surah");
  const [widgetFirstAyah, setWidgetFirstAyah] = useState<AyahRef | null>(null);
  const [widgetLastAyah, setWidgetLastAyah] = useState<AyahRef | null>(null);
  const [widgetJuz, setWidgetJuz] = useState<number | null>(null);
  const [ayahRangeVisible, setAyahRangeVisible] = useState(false);
  const [paceDateVisible, setPaceDateVisible] = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);

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
  const effectiveGoalCount = isPaceGoal ? (goal?.ayahsPerWeek ?? 0) : weekGoalAyahs.length;
  const weekGoalProgress = useMemo(() => {
    if (!goal) return 0;
    if (isPaceGoal) return Math.min(goal.ayahsPerWeek, paceWeekMemorizedProgress);
    const memorized = new Set(memorizedAyahKeys);
    return weekGoalAyahs.filter(a => memorized.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
  }, [goal, isPaceGoal, paceWeekMemorizedProgress, weekGoalAyahs, memorizedAyahKeys]);

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
      // Manually marked complete → count the full surah
      if (isSurahChecked(targetSurahNum)) {
        return SURAH_DATA.find(s => s.number === targetSurahNum)?.ayahCount ?? 0;
      }
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
  }, [memorizedAyahKeys, memorizationGoal, isSurahChecked]);

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
        .filter((surah) => isSurahChecked(surah.number) || isSurahFullyMemorized(surah.number, memorized))
        .map((surah) => surah.number)
    );
  }, [isSurahChecked, memorizedAyahKeys]);

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
  const weekPercent = goal
    ? (effectiveGoalCount > 0 ? Math.min(100, Math.round((weekGoalProgress / effectiveGoalCount) * 100)) : 100)
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

  const extensionOptionCounts = useMemo(() => {
    if (extensionRemainingCount <= 0) return [];
    if (extensionRemainingCount <= 4) {
      return Array.from({ length: extensionRemainingCount }, (_, index) => index + 1);
    }
    const presets = [5, 7, 10, 15].filter((count) => count <= extensionRemainingCount);
    return Array.from(new Set([...presets, extensionRemainingCount])).slice(0, 4);
  }, [extensionRemainingCount]);

  const activeRangeTotal = activeGoalAyahs.length || totalRangeAyahs || targetTotal;
  const remainingRangeAyahs = Math.max(0, activeRangeTotal - totalRangeMemorized);

  const activeGoalTargetDate = useMemo(() => {
    if (!goal?.ayahsPerWeek || !memorizationGoal) return null;
    const weeksNeeded = Math.max(1, Math.ceil(remainingRangeAyahs / goal.ayahsPerWeek));
    const d = new Date();
    d.setDate(d.getDate() + weeksNeeded * 7);
    return d;
  }, [goal?.ayahsPerWeek, memorizationGoal, remainingRangeAyahs]);

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
  const totalTimeLabel = useMemo(() => {
    if (!goal?.startDate) return "—";
    const start = new Date(goal.startDate);
    if (Number.isNaN(start.getTime())) return "—";
    const days = Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86400000));
    const weeks = Math.max(1, Math.ceil(days / 7));
    return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }, [goal?.startDate]);

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
    ? "Pace by Pace"
    : memorizationGoal?.path === "juz"
    ? "Juz by Juz"
    : "Surah by Surah";
  const heroTitle = heroSurahMeta
    ? `${heroSurahMeta.englishName} ${heroTarget.surahNumber}:${heroTarget.ayahNumber}`
    : `${heroTarget.surahNumber}:${heroTarget.ayahNumber}`;
  const heroSub = heroSurahMeta
    ? `${heroSurahMeta.name} · Juz ${heroSurahMeta.juz} · Ayah ${heroTarget.ayahNumber} of ${heroSurahMeta.ayahCount}`
    : `Ayah ${heroTarget.ayahNumber}`;
  const nextPaceCount = goal?.gradualWeeklyPlan?.[1] ?? goal?.targetAyahsPerWeek;
  const paceWeeksLabel = goal?.finishWeeks ? ` · in ${goal.finishWeeks} wks` : "";
  const weeklySequence = weekGoalAyahs;
  const weeklySequenceFallback = Array.from({ length: Math.max(1, effectiveGoalCount || (goal?.ayahsPerWeek ?? 7)) });
  const memorizedAyahKeySet = useMemo(() => new Set(memorizedAyahKeys), [memorizedAyahKeys]);
  const weeklyHeadline = weekGoalProgress > 0
    ? `${weekGoalProgress} ayahs memorized`
    : "Ready for this week";
  const fullQuranComplete = memorizedAyahKeys.length >= TOTAL_AYAHS;
  const showFullQuranComplete = fullQuranComplete && !revisionJourneyStarted;
  const completionDate = new Date();
  const completionDateLabel = useMemo(() => {
    const islamic = formatIslamicMonthYear(completionDate);
    const gregorian = formatCompletionMonth(completionDate);
    return `Completed · ${islamic ? `${islamic} · ` : ""}${gregorian}`;
  }, []);
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
    setGoal(null);
    setMemorizationGoal(null);
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
  }, [setGoal, setMemorizationGoal]);

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
    setContinuationNotice(null);
    setHifzTransition(null);
    setHifzTransitionProgress(0);
    setWidgetPath("surah");
    setWidgetFirstAyah(null);
    setWidgetLastAyah(null);
    setWidgetJuz(null);
    setSetupStartAtAyahSelection(false);
    setSetupInitialSurahNumber(undefined);
    setSetupInitialJuz(undefined);
    setShowHifzGoalOptions(false);
    setHifzSetupVisible(false);
    if (options?.rhythm) setPaceRhythm(options.rhythm);
    if (options?.daysPerWeek) setPaceDaysPerWeek(options.daysPerWeek);
    if (options?.targetDaysPerWeek) setPaceTargetDaysPerWeek(options.targetDaysPerWeek);
    setPaceDateVisible(true);
  }, []);

  useEffect(() => {
    const prev = prevMemPercentRef.current;
    prevMemPercentRef.current = memorizationPercent;
    if (memorizationGoal && (prev === null || prev < 100) && memorizationPercent >= 100) {
      if (hifzTransition) return;
      if (memorizationGoal.path === "pace") return;
      if (fullQuranComplete) return;
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

  useEffect(() => {
    if (hifzTransition) return;
    const prev = prevMilestoneCompleteRef.current;
    prevMilestoneCompleteRef.current = milestoneComplete;
    if (prev !== null && !prev && milestoneComplete) {
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
    const prev = prevWeekPercentRef.current;
    prevWeekPercentRef.current = weekPercent;
    if (weekPercent < 100) {
      setShowWeekCompleteCard(false);
    }
    if (weekPercent >= 100 && goal && (!milestoneComplete || canExtendCurrentGoal)) {
      setShowWeekCompleteCard(true);
    }
    if (prev !== null && prev < 100 && weekPercent >= 100 && goal && (!milestoneComplete || canExtendCurrentGoal)) {
      setShowWeeklyToast(true);
      const t = setTimeout(() => {
        setShowWeeklyToast(false);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [canExtendCurrentGoal, goal, hifzTransition, milestoneComplete, weekPercent]);

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
      <StatusBar barStyle="dark-content" />
       <LinearGradient
         colors={[colors.appLighterBg, colors.appLightGray]}
         locations={[0, 1]}
         style={s.container}
       >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingTop: topPad + 12 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={load}
               tintColor={colors.appBorderLight}
            />
          }
        >
          {showFullQuranComplete ? (
            <View style={s.fullHifzScreen}>
              <Text style={s.fullHifzCompletedLabel}>{completionDateLabel}</Text>

              <View style={s.fullHifzSealWrap}>
                <View style={s.fullHifzSeal}>
                  <Feather name="book-open" size={58} color="#2D2926" strokeWidth={1.8} />
                </View>
                <View style={s.fullHifzCheck}>
                  <Feather name="check" size={22} color="#FFFFFF" strokeWidth={2.6} />
                </View>
              </View>

              <Text style={s.fullHifzPraise}>Alhamdulillah</Text>
              <Text style={s.fullHifzTitle}>You have memorized{"\n"}the Holy Quran</Text>
              <Text style={s.fullHifzSub}>All 6,236 ayahs · 114 surahs · 30 juz</Text>

              <View style={s.fullHifzStatsRow}>
                <View style={s.fullHifzStatBox}>
                  <Text style={s.fullHifzStatValue}>{fullHifzDays}</Text>
                  <Text style={s.fullHifzStatLabel}>Days</Text>
                </View>
                <View style={s.fullHifzStatBox}>
                  <Text style={s.fullHifzStatValue}>{streakDays}</Text>
                  <Text style={s.fullHifzStatLabel}>Streak</Text>
                </View>
                <View style={s.fullHifzStatBox}>
                  <Text style={s.fullHifzStatValue}>{fullHifzAyahsPerDay}</Text>
                  <Text style={s.fullHifzStatLabel}>Ayahs/day</Text>
                </View>
              </View>

              <View style={s.fullHifzQuoteBox}>
                <Text style={s.fullHifzQuote}>
                  "The best among you are those who learn the Quran and teach it."
                </Text>
                <Text style={s.fullHifzQuoteSource}>— Sahih al-Bukhari</Text>
              </View>

              <TouchableOpacity
                style={s.fullHifzPrimaryBtn}
                onPress={() => {
                  resetHifzFlow();
                  setRevisionJourneyStarted(true);
                }}
                activeOpacity={0.86}
              >
                <Text style={s.fullHifzPrimaryText}>Begin Revision Journey</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.fullHifzShareBtn}
                onPress={() => {
                  Share.share({
                    message: "Alhamdulillah, I have memorized the Holy Quran.",
                  });
                }}
                activeOpacity={0.75}
              >
                <Text style={s.fullHifzShareText}>Share your achievement</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                  <Text style={s.manageLink}>Manage goal</Text>
                </TouchableOpacity>
              )}
            </View>
            {showSelectionWidget ? (
              <HifzHeroCard
                title="Begin Your Hifz"
                subtitle="Tap to set your Niyyah and start your Hifz journey, bi'iznillah"
                tags={["By Juz", "By Surah", "By Pace"]}
                progress={0.5}
                onPress={() => setHifzSetupVisible(true)}
              />
            ) : (
              /* Progress card — shown while a goal is active */
              <>
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
                    <Feather name="arrow-right-circle" size={15} color="#8A8070" />
                    <Text style={s.continuationCopy}>{continuationNotice.copy}</Text>
                    <TouchableOpacity
                      onPress={() => setContinuationNotice(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.75}
                    >
                      <Feather name="x" size={15} color="#8A8070" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {showHifzGoalOptions && (
              <View style={s.hifzManageCard}>
                {showHifzGoalOptions ? (
                  <View style={s.hifzInlineOptionsRow}>
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
                    <TouchableOpacity
                      style={s.hifzInlineOptionBtn}
                      onPress={() => openPaceHifzSelection()}
                      activeOpacity={0.85}
                    >
                      <Text style={s.hifzInlineOptionText}>By Pace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.hifzInlineOptionBtn}
                      onPress={resetHifzFlow}
                      activeOpacity={0.85}
                    >
                      <Text style={s.hifzInlineOptionText}>Cancel Hifz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.hifzInlineCloseBtn}
                      onPress={() => setShowHifzGoalOptions(false)}
                      activeOpacity={0.75}
                    >
                      <Feather name="x" size={18} color={colors.appLightText} />
                    </TouchableOpacity>
                  </View>
                ) : null}
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
          {hasMemorizationGoal && !hifzTransition && memorizationPercent < 100 && (!milestoneComplete || canExtendCurrentGoal) && (
            <View style={s.thisWeekSection}>
              <View style={s.sectionHeadingRow}>
                <Text style={s.goalWidgetTitle}>THIS WEEK</Text>
                <TouchableOpacity
                  onPress={() => isPaceGoal ? setPaceDateVisible(true) : setWeeklyGoalVisible(true)}
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
                  <Text style={s.thisWeekIntention}>Weekly intention · {effectiveGoalCount || (goal?.ayahsPerWeek ?? 0)} ayahs</Text>
                  {isPaceGoal ? (
                    <View style={s.weeklyMetaPills}>
                      <View style={s.weeklyMetaPill}>
                        <Feather name="zap" size={13} color={colors.appLightText} />
                        <Text style={s.weeklyMetaPillText}>Current: {goal?.ayahsPerWeek ?? 0} page/day</Text>
                      </View>
                      {nextPaceCount ? (
                        <View style={s.weeklyMetaPill}>
                          <Feather name="arrow-right" size={13} color={colors.appLightText} />
                          <Text style={s.weeklyMetaPillText}>Next: ~{nextPaceCount} pages/day{paceWeeksLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={s.weeklyMetaPill}>
                      <Feather name="flag" size={13} color={colors.appLightText} />
                      <Text style={s.weeklyMetaPillText}>
                        Finish Line: {activeGoalTargetDate ? formatTargetDate(activeGoalTargetDate) : "—"}
                        {memorizationGoal?.endAyahNumber ? `, Ayah ${memorizationGoal.endAyahNumber}` : ""}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Donut + scrollable dots row */}
                {weekPercent < 100 && (
                  <View style={s.thisWeekRhythmBlock}>
                    <Text style={s.rhythmTitle}>{isPaceGoal ? "TODAY'S RHYTHM" : "YOUR SEQUENCE"}</Text>
                    <View style={s.thisWeekDonutRow}>
                    {/* Donut progress ring */}
                    <View style={s.thisWeekDonutWrap}>
                      <Svg width={48} height={48} style={{ position: "absolute" }}>
                        <Circle cx={24} cy={24} r={20} stroke="#E8E2D8" strokeWidth={2.5} fill="none" />
                        {weekGoalProgress > 0 && effectiveGoalCount > 0 && (
                          <Circle
                            cx={24} cy={24} r={20}
                            stroke="#5A5248"
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
                          const ayahRef = ayah && typeof ayah === "object" && "ayahNumber" in ayah
                            ? (ayah as AyahRef)
                            : null;
                          const done = isPaceGoal
                            ? i < weekGoalProgress
                            : !!ayahRef && memorizedAyahKeySet.has(getAyahKey(ayahRef));
                          const ayahNumber = ayahRef?.ayahNumber ?? i + 1;
                          return (
                            <View key={i} style={[s.dotCircle, done ? s.dotCircleDone : s.dotCircleEmpty]}>
                              {isPaceGoal ? null : (
                                <Text style={done ? s.dotNumDone : s.dotNum}>{ayahNumber}</Text>
                              )}
                            </View>
                          );
                        })}
                      </ScrollView>
                      <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(237,232,222,0)", "#EDE8DE"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={s.dotsRightFade}
                      />
                    </View>
                    </View>
                  </View>
                )}

                {!isPaceGoal && weekPercent >= 100 && showWeekCompleteCard && (
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
                      {extensionOptionCounts.map((count) => (
                        <TouchableOpacity
                          key={count}
                          style={s.weekAddOption}
                          onPress={() => extendCurrentGoal(count)}
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
                          <Ionicons name="checkmark-circle" size={28} color="#7B5C3E" />
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
                    <Feather name="calendar" size={15} color="#8B8274" />
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          )}

          {(hifzTransition || (milestoneComplete && !canExtendCurrentGoal)) && (
            <View style={s.journeySection}>
              <View style={s.sectionHeadingRow}>
                <Text style={s.goalWidgetTitle}>YOUR JOURNEY</Text>
              </View>
              <View style={s.journeyCard}>
                <View style={s.journeyTopSurface}>
                  <View style={s.journeyHeaderRow}>
                    <View style={s.journeyCompletePill}>
                      <Feather name="check" size={12} color="#5A5248" />
                      <Text style={s.journeyCompleteText}>Complete</Text>
                    </View>
                    <Text style={s.journeyCompletionDay}>{todayShort}</Text>
                  </View>
                  {hifzTransition && (
                    <Text style={s.journeyPreparingTitle}>Preparing next goal</Text>
                  )}
                  <Text style={s.journeyTitle}>A milestone completed</Text>
                  <Text style={s.journeySubText}>
                    {hifzTransition
                      ? `${hifzTransition.completed} is now part of your Hifz journey.`
                      : `${selectedRangeLabel} is now part of your Hifz journey.`}
                  </Text>
                  {hifzTransition && (
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
                  )}
                  <View style={s.journeyProgressRail}>
                    <View style={s.journeyProgressFill} />
                  </View>
                  <Text style={s.journeyProgressText}>
                    {hifzTransition ? hifzTransition.totalAyahs : totalRangeMemorized} of {hifzTransition?.totalAyahs ?? totalRangeAyahs} ayahs memorized
                  </Text>
                </View>

                {!hifzTransition && (
                <View style={s.journeyReflectionList}>
                  <View style={s.journeyReflectionRow}>
                    <Text style={s.journeyStatLabel}>Started</Text>
                    <Text style={s.journeyStatValue}>{formatShortDate(goal?.startDate)}</Text>
                  </View>
                  <View style={s.journeyReflectionRow}>
                    <Text style={s.journeyStatLabel}>Completed</Text>
                    <Text style={s.journeyStatValue}>{todayShort}</Text>
                  </View>
                  <View style={s.journeyReflectionRow}>
                    <Text style={s.journeyStatLabel}>Time carried</Text>
                    <Text style={s.journeyStatValue}>{totalTimeLabel}</Text>
                  </View>
                  <View style={[s.journeyReflectionRow, s.journeyReflectionRowLast]}>
                    <Text style={s.journeyStatLabel}>Steady rhythm</Text>
                    <Text style={s.journeyStatValue}>{streakDays} days</Text>
                  </View>
                </View>
                )}

                {!hifzTransition && (
                <>
                <TouchableOpacity
                  style={s.journeyPrimaryBtn}
                  onPress={() => router.push(`/surah/${goal?.startSurahNumber ?? memorizationGoal?.startSurahNumber ?? 1}?ayah=${goal?.startAyahNumber ?? 1}`)}
                  activeOpacity={0.85}
                >
                  <Text style={s.journeyPrimaryText}>Review {selectedRangeLabel}</Text>
                  <Feather name="chevron-right" size={15} color="#5A5248" />
                </TouchableOpacity>
                <ActionPill
                  label="Set next goal"
                  icon="plus"
                  variant="border"
                  size="md"
                  style={s.journeySecondaryAction}
                  onPress={() => setAyahRangeVisible(true)}
                />
                </>
                )}
              </View>
            </View>
          )}

          {/* ── Last Visited ──────────────────────────────────────────────── */}
          {recentProgress.length > 0 && (
            <View style={s.listSection}>
              <SubSectionTitle style={{ paddingHorizontal: 20, marginBottom: 14 }}>Last Visited</SubSectionTitle>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.lvScroll}
              >
                {recentProgress.slice(0, 5).map((p) => {
                  const meta = SURAH_DATA[p.surahNumber - 1];
                  if (!meta) return null;
                  return (
                    <TouchableOpacity
                      key={p.surahNumber}
                      style={s.lvCard}
                      onPress={() => router.push(`/surah/${p.surahNumber}?ayah=${p.ayahNumberInSurah}`)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.lvArabic}>{meta.name}</Text>
                      <Text style={s.lvName}>{p.surahName}</Text>
                      <Text style={s.lvAyah}>Ayah {p.ayahNumberInSurah}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
                    <Ionicons name="bookmark" size={18} color={colors.appBlack} />
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
              <TouchableOpacity style={s.emptySurahState} onPress={load} activeOpacity={0.8}>
                <Feather name="alert-circle" size={24} color={colors.destructive} />
                <Text style={s.emptySurahText}>Could not load surahs. Tap to retry.</Text>
              </TouchableOpacity>
            ) : (
              juzGroups.map(group => (
                <View key={group.juz}>
                  <View style={s.juzHeader}>
                    <Text style={s.juzLabel}>JUZ {group.juz}</Text>
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
          )}
        </ScrollView>
      </LinearGradient>

      {/* ── Week Done Toast (floating overlay) ──────────────────────── */}
      {showWeeklyToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <View style={s.toastIcon}>
            <Feather name="check" size={16} color="#5A5248" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Weekly target complete</Text>
            <Text style={s.weekDoneSub}>{weekGoalProgress} ayahs memorized this week</Text>
          </View>
          <TouchableOpacity onPress={() => setShowWeeklyToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="#8A8070" />
          </TouchableOpacity>
        </View>
      )}

      {showMilestoneToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <View style={s.toastIcon}>
            <Feather name="flag" size={15} color="#5A5248" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Ayah milestone complete</Text>
            <Text style={s.weekDoneSub}>
              {(targetSurah?.englishName ?? memorizationGoal?.startSurahName ?? "Goal")} · {selectedRangeLabel} memorized
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowMilestoneToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="#8A8070" />
          </TouchableOpacity>
        </View>
      )}

      {showHifzCompleteToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <View style={s.toastIcon}>
            <Feather name="book-open" size={15} color="#5A5248" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>{hifzCompleteToastText.title}</Text>
            <Text style={s.weekDoneSub}>{hifzCompleteToastText.sub}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHifzCompleteToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="#8A8070" />
          </TouchableOpacity>
        </View>
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
	        onConfirm={({ first, last, juz, ayahsPerWeek }) => {
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
          // Preserve this week's already-memorized ayahs so progress isn't reset
          const existingTargetKeys = goal?.weeklyTargetAyahKeys ?? [];
          const selectedRangeAyahs = getGoalRangeAyahs({
	            path: weeklyGoalPath,
	            targetJuz,
	            startSurahNumber: first.surahNumber,
	            startAyahNumber: first.ayahNumber,
	            endSurahNumber: effectiveLast.surahNumber,
	            endAyahNumber: effectiveLast.ayahNumber,
	          });
          const existingTargetSet = new Set(existingTargetKeys);
          const memorizedSet = new Set(memorizedAyahKeys);
          const doneThisWeek = selectedRangeAyahs
            .map(getAyahKey)
            .filter(k => existingTargetSet.has(k) && memorizedSet.has(k));

          let weeklyTargetAyahKeys: string[];
          let finalAyahsPerWeek: number;

          if (doneThisWeek.length >= ayahsPerWeek) {
            // New target already met — cap to the done ones
            weeklyTargetAyahKeys = doneThisWeek.slice(0, ayahsPerWeek);
            finalAyahsPerWeek = ayahsPerWeek;
          } else {
            // Fill remaining slots with unmemoized ayahs from range
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
	          });
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
            startDate: today,
          });
          setPaceDateVisible(false);
        }}
        onClose={() => setPaceDateVisible(false)}
      />
      <AyahRangeModal
        visible={ayahRangeVisible}
        path={widgetPath}
        memorizedAyahKeys={memorizedAyahKeys}
        startAtAyahSelection={setupStartAtAyahSelection}
        initialSurahNumber={setupInitialSurahNumber}
        initialJuz={setupInitialJuz}
        modalAnimationType={setupStartAtAyahSelection ? "none" : "slide"}
        onConfirm={({ first, last, juz, ayahsPerWeek }) => {
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
          });
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
      backgroundColor: "#EDE8DE",
      alignItems: "center",
      justifyContent: "center",
    },
    studyingNowPill: {
      minHeight: 28,
      borderRadius: 999,
      backgroundColor: "#DDD6C8",
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    studyingNowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#B0A898",
    },
    studyingNowText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#5A5248",
      fontFamily: "Inter_600SemiBold",
    },

    // ── Full Quran Completion ────────────────────────────────────────────────
    fullHifzScreen: {
      minHeight: 720,
      paddingHorizontal: 28,
      paddingTop: 20,
      paddingBottom: 44,
      alignItems: "center",
    },
    fullHifzCompletedLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 3,
      textAlign: "center",
      marginBottom: 86,
    },
    fullHifzSealWrap: {
      width: 132,
      height: 132,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 34,
    },
    fullHifzSeal: {
      width: 124,
      height: 124,
      borderRadius: 62,
      backgroundColor: "#C8C0B0",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#756957",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.10,
      shadowRadius: 28,
      elevation: 5,
    },
    fullHifzCheck: {
      position: "absolute",
      right: 7,
      bottom: 10,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: "#2D2926",
      borderWidth: 3,
      borderColor: "#F5F0E8",
      alignItems: "center",
      justifyContent: "center",
    },
    fullHifzPraise: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 4,
      marginBottom: 18,
      textAlign: "center",
    },
    fullHifzTitle: {
      fontSize: 36,
      lineHeight: 43,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 22,
    },
    fullHifzSub: {
      fontSize: 17,
      lineHeight: 24,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 34,
    },
    fullHifzStatsRow: {
      width: "100%" as any,
      flexDirection: "row",
      gap: 12,
      marginBottom: 38,
    },
    fullHifzStatBox: {
      flex: 1,
      minHeight: 96,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      backgroundColor: "#EDE8DE",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    fullHifzStatValue: {
      fontSize: 27,
      lineHeight: 34,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    fullHifzStatLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 4,
      textAlign: "center",
    },
    fullHifzQuoteBox: {
      width: "100%" as any,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      backgroundColor: "#EDE8DE",
      paddingHorizontal: 24,
      paddingVertical: 26,
      marginBottom: 86,
    },
    fullHifzQuote: {
      fontSize: 17,
      lineHeight: 27,
      color: "#6F665B",
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      textAlign: "center",
    },
    fullHifzQuoteSource: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: "#B2A897",
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginTop: 14,
    },
    fullHifzPrimaryBtn: {
      width: "100%" as any,
      minHeight: 64,
      borderRadius: 32,
      backgroundColor: "#2D2926",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 18,
    },
    fullHifzPrimaryText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    fullHifzShareBtn: {
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    fullHifzShareText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#B5AC9C",
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
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
    memCompleteGreenSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
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
      backgroundColor: "#FAF7F2",
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 2,
    },
    lvArabic: {
      fontSize: 25,
      color: "#2D2926",
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 38,
    },
    lvName: {
      fontSize: 13,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    lvAyah: {
      fontSize: 12,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 2,
      marginBottom: 12,
    },

    // ── All Surahs by Juz ──────────────────────────────────────────────────────
    surahSection: { marginTop: 28 },
    emptySurahState: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 28 },
    emptySurahText: { fontSize: 13, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    juzHeader: {
      backgroundColor: colors.appStone,
      paddingHorizontal: 20,
      paddingVertical: 6,
    },
    juzLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appLightText,
      letterSpacing: 1.4,
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
      color: "#8E8679",
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.9,
      textTransform: "uppercase",
    },
    goalWidgetTitleSelection: {
      fontSize: 13,
      color: "#5A5248",
      letterSpacing: 1.9,
    },
    niyyahAcceptedText: {
      fontSize: 10,
      fontWeight: "400",
      color: "#A49A8D",
      fontFamily: "Inter_400Regular",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      textAlign: "right",
      flexShrink: 1,
    },
    manageLink: {
      fontSize: 12,
      color: "#5A5248",
      fontFamily: "Inter_600SemiBold",
    },
    manageCta: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#D7CEC0",
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: "rgba(250,247,242,0.42)",
      alignItems: "center",
      justifyContent: "center",
    },
    hifzManageCard: {
      marginTop: 14,
      backgroundColor: "transparent",
    },
    goalWidgetCard: {
      backgroundColor: "#FAF7F2",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    emptyGoalIntro: {
      backgroundColor: "#EDE8DE",
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 12,
    },
    emptyGoalTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
    },
    emptyModeRow: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: "#EDE8DE",
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    emptyModePill: {
      flex: 1,
      minHeight: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,252,248,0.46)",
    },
    emptyModePillSelected: {
      backgroundColor: "#C8C0B0",
    },
    emptyModeText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
    },
    emptyModeTextSelected: {
      color: "#2D2926",
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
      backgroundColor: "#FFFCF8",
      borderWidth: 1,
      borderColor: "#DDD6C8",
    },
    widgetAyahRowFilled: {},
    widgetRowMuted: {
      opacity: 0.42,
      borderColor: "rgba(221,214,200,0.4)",
      backgroundColor: "rgba(255,252,248,0.48)",
    },
    widgetAyahCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#EDE8DE",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    widgetAyahCircleFilled: {
      backgroundColor: "#C8C0B0",
    },
    widgetAyahLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    widgetAyahValue: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
    },
    widgetAyahPlaceholder: {
      fontSize: 14,
      color: "#B5AC9C",
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
      backgroundColor: "#FFFCF8",
      borderWidth: 1,
      borderColor: "#DDD6C8",
    },
    widgetPaceDivider: {
      width: StyleSheet.hairlineWidth,
      height: 44,
      backgroundColor: "#DDD6C8",
      marginHorizontal: 12,
    },
    widgetPaceLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    widgetPaceValue: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
    },
    widgetPacePlaceholder: {
      fontSize: 14,
      color: "#B5AC9C",
      fontFamily: "Inter_700Bold",
      fontWeight: "700",
    },
    widgetStartBtn: {
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 0,
      backgroundColor: "#C8C0B0",
      borderRadius: 22,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    widgetStartBtnDisabled: {
      backgroundColor: "#EDE8DE",
    },
    widgetStartBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#2D2926",
      fontFamily: "Inter_700Bold",
    },
    widgetStartBtnTextDisabled: {
      color: "#AFA695",
    },
    widgetFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 12,
      backgroundColor: "#FFFCF8",
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
      borderColor: "#DDD6C8",
      backgroundColor: "#FFFCF8",
      overflow: "hidden",
    },
    continuationRow: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: "#F5F0E8",
    },
    continuationColumn: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    continuationDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: "#DDD6C8",
    },
    continuationLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#8A8070",
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
      color: "#8A8070",
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
      backgroundColor: "#C8C0B0",
      alignItems: "center",
      justifyContent: "center",
    },
    hifzInlineOptionText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#3C3832",
      fontFamily: "Inter_700Bold",
    },
    hifzInlineCloseBtn: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: "#C8C0B0",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    // ── THIS WEEK Section ─────────────────────────────────────────────────
    thisWeekSection: {
      marginHorizontal: 20,
      marginTop: 22,
    },
    thisWeekCard: {
      backgroundColor: "#FAF7F2",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    thisWeekHeaderNew: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: "#EDE8DE",
    },
    thisWeekBigTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    thisWeekIntention: {
      fontSize: 13,
      lineHeight: 18,
      color: "#918879",
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
      borderColor: "#B9AF9F",
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    weeklyMetaPillText: {
      fontSize: 13,
      lineHeight: 15,
      color: "#887F71",
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
      backgroundColor: "#EDE8DE",
    },
    rhythmTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6D655B",
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
      color: "#201F1D",
      fontFamily: "Inter_700Bold",
      lineHeight: 17,
    },
    thisWeekDonutLabel: {
      fontSize: 8,
      lineHeight: 10,
      color: "#8F8678",
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
      backgroundColor: "#C8C0B0",
      borderColor: "#C8C0B0",
    },
    dotCircleEmpty: {
      backgroundColor: "transparent",
      borderColor: "#C8C0B0",
    },
    dotNum: {
      fontSize: 12,
      fontWeight: "600",
      color: "#8D8477",
      fontFamily: "Inter_600SemiBold",
    },
    dotNumDone: {
      fontSize: 12,
      fontWeight: "600",
      color: "#5A5248",
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
      backgroundColor: "#F7F3EC",
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
      backgroundColor: "#F8F4ED",
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
      backgroundColor: "#EFE9DF",
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
      color: "#918879",
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
    thisWeekStreakRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#DDD6C8",
      backgroundColor: "#FFFCF8",
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
      backgroundColor: "#E87040",
    },
    calendarButton: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#C8C0B0",
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: "#FFFCF8",
    },
    calendarButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8B8274",
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
      backgroundColor: "#FAF7F2",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 18,
      elevation: 3,
    },
    journeyTopSurface: {
      backgroundColor: "#EDE8DE",
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
    journeyCompletionDay: {
      fontSize: 12,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
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
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    journeySubText: {
      fontSize: 13,
      lineHeight: 19,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
      marginTop: 6,
      marginBottom: 14,
    },
    journeyCompletePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 0,
    },
    journeyCompleteText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#5A5248",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.7,
    },
    journeyProgressRail: {
      height: 3,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.10)",
      overflow: "hidden",
      marginBottom: 8,
    },
    journeyProgressFill: {
      height: "100%" as any,
      width: "100%" as any,
      backgroundColor: "#5A5248",
      borderRadius: 999,
    },
    journeyProgressText: {
      fontSize: 12,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
    },
    journeyLoadingSurface: {
      borderRadius: 16,
      backgroundColor: "#FFFCF8",
      borderWidth: 1,
      borderColor: "#DDD6C8",
      overflow: "hidden",
      marginBottom: 14,
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
      backgroundColor: "#DDD6C8",
    },
    journeyLoadingLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: "#8A8070",
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
      backgroundColor: "#E8E2D8",
      overflow: "hidden",
    },
    journeyLoadingFill: {
      height: "100%" as any,
      backgroundColor: "#5A5248",
    },
    journeyLoadingText: {
      fontSize: 11,
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    journeyReflectionList: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: "#FFFCF8",
    },
    journeyReflectionRow: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#DDD6C8",
    },
    journeyReflectionRowLast: { borderBottomWidth: 0 },
    journeyStatLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
    },
    journeyStatValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyPrimaryBtn: {
      marginHorizontal: 16,
      marginTop: 10,
      backgroundColor: "#C8C0B0",
      borderRadius: 18,
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    journeyPrimaryText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
    },
    journeySecondaryBtn: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 16,
      minHeight: 44,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#FFFCF8",
      borderWidth: 1,
      borderColor: "#C8C0B0",
    },
    journeySecondaryText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8A8070",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    journeySecondaryAction: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 16,
      backgroundColor: "transparent",
      borderColor: "#C8C0B0",
    },

    // Week done floating toast
    weekDoneToast: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 50,
      backgroundColor: "#FFFCF8",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#DDD6C8",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 8,
    },
    weekDoneCheckCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#34C759",
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
      color: "#8A8070",
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    toastIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#EDE8DE",
      alignItems: "center",
      justifyContent: "center",
    },
    verseCard: {
      marginHorizontal: 20,
      marginTop: 16,
    },
  });
