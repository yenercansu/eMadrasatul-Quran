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
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { getJuzAyahs, SURAH_DATA, type AyahRef } from "@/constants/surahData";
import { AyahRangeModal, type AyahRangeResult } from "@/components/AyahRangeModal";
import { SubSectionTitle } from "@/components/Typography";
import { MemorizedBadge } from "@/components/SurahCard";
import { ActionPill } from "@/components/ActionPill";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { Tag } from "@/components/Tag";

const TOTAL_AYAHS = 6236;
const MAX_WEEKLY_AYAHS = 70;
const GOAL_PATH_OPTIONS = [
  { value: "juz", label: "By Juz" },
  { value: "surah", label: "By Surah" },
] as const;

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
    getWeekGoalAyahs, recordAyahRead, isSurahChecked, markAyahsMemorized,
    memorizedAyahKeys,
  } = useQuran();
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyGoalVisible, setWeeklyGoalVisible] = useState(false);
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [showHifzCompleteToast, setShowHifzCompleteToast] = useState(false);
  const [hifzCompleteToastText, setHifzCompleteToastText] = useState({
    title: "Hifz goal complete!",
    sub: "Start a new memorization goal",
  });
  const [showWeeklyToast, setShowWeeklyToast] = useState(false);
  const [showHifzGoalOptions, setShowHifzGoalOptions] = useState(false);
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
  const effectiveGoalCount = weekGoalAyahs.length;
  const weekGoalProgress = useMemo(() => {
    if (!goal) return 0;
    const memorized = new Set(memorizedAyahKeys);
    return weekGoalAyahs.filter(a => memorized.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
  }, [goal, weekGoalAyahs, memorizedAyahKeys]);

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
    const targetJuzAyahKeys = memorizationGoal.path === "juz" && memorizationGoal.targetJuz
      ? new Set(getJuzAyahs(memorizationGoal.targetJuz).map(a => `${a.surahNumber}:${a.ayahNumber}`))
      : null;
    return memorizedAyahKeys.filter((key) => {
      const [surahRaw, ayahRaw] = key.split(":");
      const surahNumber = Number(surahRaw);
      const ayahNumber = Number(ayahRaw);
      if (!Number.isFinite(surahNumber) || !Number.isFinite(ayahNumber)) return false;
      if (memorizationGoal.path === "surah") {
        return surahNumber === memorizationGoal.startSurahNumber;
      }
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

  const targetTotal = memorizationGoal?.path === "juz" ? getJuzAyahs(targetJuz).length : (targetSurah ? targetSurah.ayahCount : TOTAL_AYAHS);
  const memorizationPercent = Math.min(100, Math.round((totalMemorized / targetTotal) * 100));
  // Use effectiveGoalCount (actual available ayahs) to avoid 41/44 type lock
  const weekPercent = goal
    ? (effectiveGoalCount > 0 ? Math.min(100, Math.round((weekGoalProgress / effectiveGoalCount) * 100)) : 100)
    : 0;

  // Sync widget with current goal whenever goal changes
  useEffect(() => {
    if (memorizationGoal && goal) {
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
    if (!memorizationGoal || !goal) return null;
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

  const widgetWeeklySelection = useMemo<AyahRangeResult | undefined>(() => {
    if (!widgetFirstAyah || !widgetLastAyah) return undefined;
    return {
      first: widgetFirstAyah,
      last: widgetLastAyah,
      juz: widgetJuz ?? undefined,
      ayahsPerWeek: goal?.ayahsPerWeek ?? 10,
    };
  }, [widgetFirstAyah, widgetLastAyah, widgetJuz, goal?.ayahsPerWeek]);

  const currentWeeklySelection = useMemo<AyahRangeResult | undefined>(() => {
    if (!memorizationGoal || !goal) return undefined;
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
      ayahsPerWeek: goal.ayahsPerWeek,
    };
  }, [memorizationGoal, goal]);
  const weeklyGoalPath = currentWeeklySelection ? memorizationGoal?.path ?? widgetPath : widgetPath;
  const weeklyInitialSelection = currentWeeklySelection ?? widgetWeeklySelection;

  const resetHifzFlow = useCallback(() => {
    setGoal(null);
    setMemorizationGoal(null);
    setShowHifzGoalOptions(false);
    setShowWeeklyToast(false);
    setShowMilestoneToast(false);
    setHifzDirection("forward");
    setWidgetPath("surah");
    setWidgetFirstAyah(null);
    setWidgetLastAyah(null);
    setWidgetJuz(null);
  }, [setGoal, setMemorizationGoal]);

  const openNewHifzSelection = useCallback((path: "surah" | "juz") => {
    setWidgetPath(path);
    setWidgetFirstAyah(null);
    setWidgetLastAyah(null);
    setWidgetJuz(null);
    setShowHifzGoalOptions(false);
    setAyahRangeVisible(true);
  }, []);

  useEffect(() => {
    const prev = prevMemPercentRef.current;
    prevMemPercentRef.current = memorizationPercent;
    if (memorizationGoal && (prev === null || prev < 100) && memorizationPercent >= 100) {
      const completedName = memorizationGoal?.path === "juz"
        ? `Juz ${targetJuz}`
        : targetSurah?.englishName ?? "Hifz goal";
      setHifzCompleteToastText({
        title: "Hifz goal complete!",
        sub: `${completedName} memorized`,
      });
      setShowHifzCompleteToast(true);
      setShowMilestoneToast(false);
      setShowWeeklyToast(false);
      resetHifzFlow();
      const t = setTimeout(() => setShowHifzCompleteToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [memorizationGoal, memorizationPercent, resetHifzFlow, targetJuz, targetSurah?.englishName]);

  useEffect(() => {
    const prev = prevMilestoneCompleteRef.current;
    prevMilestoneCompleteRef.current = milestoneComplete;
    if (prev !== null && !prev && milestoneComplete) {
      setShowMilestoneToast(true);
      setShowWeeklyToast(false);
      const t = setTimeout(() => setShowMilestoneToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [milestoneComplete]);

  useEffect(() => {
    const prev = prevWeekPercentRef.current;
    prevWeekPercentRef.current = weekPercent;
    if (prev !== null && prev < 100 && weekPercent >= 100 && goal && !milestoneComplete) {
      setShowWeeklyToast(true);
      const t = setTimeout(() => setShowWeeklyToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [goal, milestoneComplete, weekPercent]);

  const topPad = insets.top;
  const hasMemorizationGoal = memorizationGoal !== null;
  const showSelectionWidget = !hasMemorizationGoal;
  const isFirstListen = lastListened === null;

  const audioProgressPct = useMemo(() => {
    if (!lastListened) return 0;
    const meta = SURAH_DATA[lastListened.surahNumber - 1];
    if (!meta) return 0;
    return Math.round((lastListened.ayahNumberInSurah / meta.ayahCount) * 100);
  }, [lastListened]);

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
          {/* ── Header Row ──────────────────────────────────────────────── */}
          <View style={s.headerRow}>
            <Tag
              label={onlineUsers > 0 ? `${onlineUsers.toLocaleString()} memorizing` : "No active listeners"}
              selected={onlineUsers > 0}
            />
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
          <View style={s.goalWidgetSection}>
            <Text style={s.goalWidgetTitle}>YOUR HIFZ GOAL</Text>
            {showSelectionWidget ? (
              <View style={s.goalWidgetCard}>
                {/* Juz / Surah toggle */}
                <SegmentedToggle
                  options={GOAL_PATH_OPTIONS}
                  value={widgetPath}
                  onChange={(path) => {
                    if (widgetPath !== path) {
                      setWidgetPath(path);
                      setWidgetFirstAyah(null);
                      setWidgetLastAyah(null);
                      setWidgetJuz(null);
                    }
                  }}
                  style={s.goalToggleWrap}
                />

                {/* First Ayah Row */}
                <TouchableOpacity
                  style={[s.widgetAyahRow, widgetFirstAyah && s.widgetAyahRowFilled]}
                  onPress={() => setAyahRangeVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={[s.widgetAyahCircle, widgetFirstAyah && s.widgetAyahCircleFilled]}>
                    <Feather name="chevron-up" size={12} color={widgetFirstAyah ? "#FFFFFF" : "#71717A"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.widgetAyahLabel}>FIRST AYAH</Text>
                    <Text style={widgetFirstAyah ? s.widgetAyahValue : s.widgetAyahPlaceholder}>
                      {widgetFirstAyah ? widgetFirstAyah.surahName : "Select surah & ayah"}
                    </Text>
                  </View>
                  {!widgetFirstAyah && (
                    <View style={s.widgetStep1Badge}>
                      <Text style={s.widgetStep1Text}>Step 1</Text>
                      <Feather name="chevron-right" size={11} color={colors.appLightText} />
                    </View>
                  )}
                  {widgetFirstAyah && <Feather name="chevron-right" size={16} color={colors.appLightText} />}
                </TouchableOpacity>

                <View style={s.widgetRowDivider} />

                {/* Last Ayah Row */}
                <TouchableOpacity
                  style={s.widgetAyahRow}
                  onPress={() => setAyahRangeVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={[s.widgetAyahCircle, widgetLastAyah && s.widgetAyahCircleFilled]}>
                    <Feather name="chevron-down" size={12} color={widgetLastAyah ? "#FFFFFF" : "#71717A"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.widgetAyahLabel}>LAST AYAH</Text>
                    <Text style={widgetLastAyah ? s.widgetAyahValue : s.widgetAyahPlaceholder}>
                      {widgetLastAyah ? widgetLastAyah.surahName : "Select surah & ayah"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.appLightText} />
                </TouchableOpacity>

                <View style={s.widgetRowDivider} />

                {/* Weekly Pace + Target Date — tap to open goal-first flow */}
                <TouchableOpacity
                  style={s.widgetPaceRow}
                  onPress={() => setPaceDateVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.widgetPaceLabel}>WEEKLY PACE</Text>
                    <Text style={goal?.ayahsPerWeek ? s.widgetPaceValue : s.widgetPacePlaceholder}>
                      {goal?.ayahsPerWeek ? `${goal.ayahsPerWeek}/week` : "Set pace & date →"}
                    </Text>
                  </View>
                  <View style={s.widgetPaceDivider} />
                  <View style={{ flex: 1, paddingLeft: 16 }}>
                    <Text style={s.widgetPaceLabel}>TARGET DATE</Text>
                    <Text style={widgetTargetDate ? s.widgetPaceValue : s.widgetPacePlaceholder}>
                      {widgetTargetDate ? formatTargetDate(widgetTargetDate) : "Then pick range"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Start Memorizing */}
                <TouchableOpacity
                  style={[s.widgetStartBtn, !canStartMemorizing && s.widgetStartBtnDisabled]}
                  onPress={() => canStartMemorizing && setWeeklyGoalVisible(true)}
                  disabled={!canStartMemorizing}
                  activeOpacity={0.85}
                >
                  <Text style={[s.widgetStartBtnText, !canStartMemorizing && s.widgetStartBtnTextDisabled]}>
                    Start Memorizing →
                  </Text>
                </TouchableOpacity>

                <View style={s.widgetFooterRow}>
                  <View style={s.widgetStreakGroup}>
                    <View style={s.streakOrangeDot} />
                    <Text style={s.streakText}>0 Day Streak</Text>
                  </View>
                  <ActionPill
                    label="Hifz Calendar"
                    icon="calendar"
                    iconPosition="right"
                    variant="soft"
                    size="sm"
                    onPress={() => router.push("/streak-calendar" as any)}
                  />
                </View>
              </View>
            ) : (
              /* Progress card — shown while surah/juz goal is active */
              <View style={s.goalWidgetCard}>
                <View style={s.hifzProgressCardPad}>
                  <View style={s.hifzProgressHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.hifzProgressTitle}>
                        {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah?.englishName ?? "—")}
                      </Text>
                      <Text style={s.hifzProgressSub}>
                        {memorizationGoal!.path === "juz" ? `الجزء ${targetJuz}` : (targetSurah?.name ?? "")}
                        {" · In Progress"}
                      </Text>
                    </View>
                    <View style={s.hifzProgressPctBlock}>
                      <Text style={s.hifzProgressPctNum}>{memorizationPercent}%</Text>
                      <Text style={s.hifzProgressPctLabel}>
                        {"of full "}{memorizationGoal!.path === "juz" ? "juz" : "surah"}
                      </Text>
                    </View>
                  </View>

                  <View style={s.hifzProgressBar}>
                    <View style={[s.hifzProgressBarFill, { width: `${Math.max(2, memorizationPercent)}%` as any }]} />
                  </View>

                  <Text style={s.hifzProgressMeta}>
                    {totalMemorized} of {targetTotal} ayahs memorized
                  </Text>
                </View>

                <View style={s.widgetRowDivider} />

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
                      style={s.hifzInlineCloseBtn}
                      onPress={() => setShowHifzGoalOptions(false)}
                      activeOpacity={0.75}
                    >
                      <Feather name="x" size={18} color={colors.appLightText} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.hifzActionRow}>
                    <ActionPill
                      label="Set New"
                      icon="plus"
                      variant="secondary"
                      size="md"
                      style={s.hifzActionPill}
                      onPress={() => setShowHifzGoalOptions(true)}
                    />
                    <ActionPill
                      label="Cancel Hifz Goal"
                      variant="ghost"
                      size="md"
                      style={s.hifzActionPill}
                      textStyle={s.hifzCancelText}
                      onPress={resetHifzFlow}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── THIS WEEK ─────────────────────────────────────────────────── */}
          {hasMemorizationGoal && memorizationPercent < 100 && !milestoneComplete && (
            <View style={s.thisWeekSection}>
              <Text style={s.goalWidgetTitle}>THIS WEEK</Text>
              <View style={s.thisWeekCard}>

                {/* Header row */}
                <View style={s.thisWeekHeader}>
                  {weekPercent >= 100 ? (
                    <Text style={s.weeklyTargetTitle}>Weekly Target</Text>
                  ) : (
                    <Text style={s.thisWeekHeaderText}>
                      <Text style={s.thisWeekAyahCount}>{effectiveGoalCount || (goal?.ayahsPerWeek ?? 0)} ayahs</Text>
                      <Text style={s.thisWeekDoneCount}>{` · ${weekGoalProgress} done`}</Text>
                    </Text>
                  )}
                  {weekPercent >= 100 ? (
                    <ActionPill
                      label="Set Target"
                      variant="primary"
                      size="sm"
                      style={s.thisWeekActionPill}
                      onPress={() => setWeeklyGoalVisible(true)}
                    />
                  ) : (
                    <ActionPill
                      label="Edit"
                      icon="edit-2"
                      iconPosition="right"
                      variant="secondary"
                      size="sm"
                      style={s.thisWeekActionPill}
                      onPress={() => setWeeklyGoalVisible(true)}
                    />
                  )}
                </View>

                {/* Donut + scrollable dots row */}
                {weekPercent < 100 && (
                  <View style={s.thisWeekDonutRow}>
                    {/* Donut progress ring */}
                    <View style={s.thisWeekDonutWrap}>
                      <Svg width={68} height={68} style={{ position: "absolute" }}>
                        <Circle cx={34} cy={34} r={28} stroke={colors.appBorderLighter} strokeWidth={4} fill="none" />
                        {weekGoalProgress > 0 && effectiveGoalCount > 0 && (
                          <Circle
                            cx={34} cy={34} r={28}
                            stroke={colors.appBlack}
                            strokeWidth={4}
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - weekGoalProgress / Math.max(effectiveGoalCount, 1))}
                            strokeLinecap="round"
                            transform="rotate(-90, 34, 34)"
                          />
                        )}
                      </Svg>
                      <Text style={s.thisWeekDonutNum}>
                        {weekGoalProgress === 0 ? "—" : `${weekGoalProgress}`}
                      </Text>
                    </View>

                    {/* Scrollable dots — one per weekly goal ayah */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s.dotsScrollView}
                      contentContainerStyle={s.dotsScrollContent}
                    >
                      {Array.from({ length: Math.max(effectiveGoalCount, goal?.ayahsPerWeek ?? 0) }).map((_, i) => {
                        const done = i < weekGoalProgress;
                        return (
                          <View key={i} style={[s.dotCircle, done ? s.dotCircleDone : s.dotCircleEmpty]}>
                            <Text style={done ? s.dotNumDone : s.dotNum}>{i + 1}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {weekPercent >= 100 && showWeeklyToast && (
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
                        onPress={() => setShowWeeklyToast(false)}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={14} color={colors.appLightText} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.weekAddOptionsRow}>
                      {[5, 7, 10, 15].map((count) => (
                        <TouchableOpacity
                          key={count}
                          style={s.weekAddOption}
                          onPress={() => {
                            if (!goal || !memorizationGoal) return;
                            const weeklyGoal = buildWeeklyGoal({
                              path: memorizationGoal.path,
                              targetJuz: memorizationGoal.targetJuz,
                              startSurahNumber: goal.startSurahNumber ?? memorizationGoal.startSurahNumber,
                              startAyahNumber: goal.startAyahNumber ?? 1,
                              endSurahNumber: memorizationGoal.endSurahNumber,
                              endAyahNumber: memorizationGoal.endAyahNumber,
                              requestedAyahsPerWeek: count,
                              memorizedAyahKeys,
                            });
                            setGoal({ ...goal, ...weeklyGoal });
                            setShowWeeklyToast(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={s.weekAddOptionText}>{count}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Current Goal sub-card */}
                {goal !== null && (
                  <View style={s.currentGoalCard}>
                    <View style={s.currentGoalLeft}>
                      <Text style={s.currentGoalLabel}>CURRENT GOAL</Text>
                      <Text style={s.currentGoalRange}>
                        {"Ayah "}{weekGoalAyahs[0]?.ayahNumber ?? goal.startAyahNumber ?? 1}
                        {" – "}
                        {weekGoalAyahs[weekGoalAyahs.length - 1]?.ayahNumber ?? goal.startAyahNumber ?? 1}
                      </Text>
                      <Text style={s.currentGoalProgress}>
                        {weekGoalProgress} of {effectiveGoalCount} this week
                      </Text>
                    </View>
                    <View style={s.currentGoalRight}>
                      <Text style={s.currentGoalDateLabel}>Finish date</Text>
                      <Text style={s.currentGoalDate}>
                        {activeGoalTargetDate ? formatTargetDate(activeGoalTargetDate) : "—"}
                      </Text>
                      <Text style={s.currentGoalMilestoneLabel}>Milestone goal</Text>
                      <Text style={s.currentGoalMilestoneRange}>
                        {"Ayah "}{goal.startAyahNumber ?? 1}{" – "}{memorizationGoal!.endAyahNumber ?? targetTotal}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Next ayah row */}
                {weekPercent < 100 && nextAyahInRange && (
                  <View style={s.nextAyahRow}>
                    <TouchableOpacity
                      onPress={() => markAyahsMemorized([`${nextAyahInRange.surahNumber}:${nextAyahInRange.ayahNumber}`])}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={s.nextAyahCircle} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={s.nextAyahTitle}>
                        {nextAyahInRange.surahName}, Ayah {nextAyahInRange.ayahNumber}
                      </Text>
                      {upNextAyahNums.length > 0 && (
                        <Text style={s.nextAyahSub}>
                          {hifzDirection === "reverse" ? "Before this: Ayah " : "Up next: Ayah "}{upNextAyahNums.join(" · ")}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        s.nextAyahChevrons,
                        hifzDirection === "forward" && {
                          backgroundColor: colors.appSecondarySurface,
                          borderColor: colors.appSecondarySurface,
                        },
                      ]}
                      onPress={() => setHifzDirection((current) => current === "forward" ? "reverse" : "forward")}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name="chevron-up"
                        size={13}
                        color={hifzDirection === "reverse" ? colors.appWhite : colors.appBlack}
                      />
                      <Feather
                        name="chevron-down"
                        size={13}
                        color={hifzDirection === "reverse" ? colors.appWhite : colors.appBlack}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Continue Hifz button */}
                <TouchableOpacity
                  style={s.continueHifzBtn}
                  onPress={() => {
                    const lastWeekAyah = weekGoalAyahs[weekGoalAyahs.length - 1];
                    const target = nextAyahInRange ?? {
                      surahNumber: hifzDirection === "reverse"
                        ? (lastWeekAyah?.surahNumber ?? memorizationGoal!.startSurahNumber)
                        : memorizationGoal!.startSurahNumber,
                      ayahNumber: hifzDirection === "reverse"
                        ? (lastWeekAyah?.ayahNumber ?? goal?.endAyahNumber ?? targetTotal)
                        : goal?.startAyahNumber ?? 1,
                    };
                    router.push(`/surah/${target.surahNumber}?ayah=${target.ayahNumber}`);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={14} color={colors.appWhite} />
                  <Text style={s.continueHifzBtnText}>Continue Hifz</Text>
                </TouchableOpacity>

                {/* Streak row */}
                <View style={s.thisWeekStreakRow}>
                  <View style={s.streakOrangeDot} />
                  <Text style={s.streakText}>{streakDays} Day Streak</Text>
                  <ActionPill
                    label="Hifz Calendar"
                    icon="calendar"
                    iconPosition="right"
                    variant="soft"
                    size="sm"
                    style={s.detailsPill}
                    onPress={() => router.push("/streak-calendar" as any)}
                  />
                </View>

              </View>
            </View>
          )}

          {milestoneComplete && (
            <View style={s.journeySection}>
              <Text style={s.goalWidgetTitle}>YOUR JOURNEY</Text>
              <View style={s.journeyCard}>
                <View style={s.journeyHeaderRow}>
                  <Text style={s.journeyTitle}>{selectedRangeLabel}</Text>
                  <View style={s.journeyCompletePill}>
                    <Feather name="check" size={12} color={colors.appWhite} />
                    <Text style={s.journeyCompleteText}>Complete</Text>
                  </View>
                </View>
                <View style={s.journeyProgressRail}>
                  <View style={s.journeyProgressFill} />
                </View>
                <Text style={s.journeyProgressText}>
                  {totalRangeMemorized} of {totalRangeAyahs} ayahs memorized
                </Text>
                <View style={s.journeyStatsGrid}>
                  <View style={s.journeyStatBox}>
                    <Text style={s.journeyStatLabel}>STARTED</Text>
                    <Text style={s.journeyStatValue}>{formatShortDate(goal?.startDate)}</Text>
                  </View>
                  <View style={s.journeyStatBox}>
                    <Text style={s.journeyStatLabel}>COMPLETED</Text>
                    <Text style={s.journeyStatValue}>{todayShort}</Text>
                  </View>
                  <View style={s.journeyStatBox}>
                    <Text style={s.journeyStatLabel}>TOTAL TIME</Text>
                    <Text style={s.journeyStatValue}>{totalTimeLabel}</Text>
                  </View>
                  <View style={s.journeyStatBox}>
                    <Text style={s.journeyStatLabel}>BEST STREAK</Text>
                    <Text style={s.journeyStatValue}>{streakDays} days</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.journeyPrimaryBtn}
                  onPress={() => setAyahRangeVisible(true)}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={16} color={colors.appWhite} />
                  <Text style={s.journeyPrimaryText}>Set Next Goal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.journeySecondaryBtn}
                  onPress={() => router.push(`/surah/${goal?.startSurahNumber ?? memorizationGoal?.startSurahNumber ?? 1}?ayah=${goal?.startAyahNumber ?? 1}`)}
                  activeOpacity={0.85}
                >
                  <Text style={s.journeySecondaryText}>Review {selectedRangeLabel}</Text>
                  <Feather name="chevron-right" size={15} color={colors.appBlack} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Continue / Start Listening Card ─────────────────────────── */}
          <View style={[s.audioCardGlowWrap, s.audioCardOffset]}>
            <TouchableOpacity
              style={s.audioCard}
              onPress={() => router.push(isFirstListen ? "/surah/1?play=1" : `/surah/${lastListened!.surahNumber}?ayah=${lastListened!.ayahNumberInSurah}&play=1`)}
              activeOpacity={0.88}
            >
              <View pointerEvents="none" style={s.audioCardStrokeGlow} />
              <View pointerEvents="none" style={s.audioCardOverlayWrap}>
                <View style={[s.audioCardOverlayRing, { width: 160, height: 160, borderRadius: 80, opacity: 0.10 }]} />
                <View style={[s.audioCardOverlayRing, { width: 124, height: 124, borderRadius: 62, opacity: 0.15 }]} />
                <View style={[s.audioCardOverlayRing, { width: 92, height: 92, borderRadius: 46, opacity: 0.20 }]} />
                <View style={[s.audioCardOverlayRing, { width: 64, height: 64, borderRadius: 32, opacity: 0.28 }]} />
                <View style={[s.audioCardOverlayRing, { width: 40, height: 40, borderRadius: 20, opacity: 0.38 }]} />
              </View>
              <View style={s.audioCardLeft}>
                <Text style={s.audioLabel}>{isFirstListen ? "START LISTENING" : "CONTINUE LISTENING"}</Text>
                <Text style={s.audioTitle}>{isFirstListen ? "Al-Faatiha" : lastListened!.surahName}</Text>
                <Text style={s.audioSub}>
                  {isFirstListen ? "Ayah 1" : `Ayah ${lastListened!.ayahNumberInSurah}`}
                  {" "}• Reciter: Al-Afasy
                </Text>
                <View style={s.audioProgressRail}>
                  <View style={[s.audioProgressFill, { width: `${audioProgressPct}%` as any }]} />
                </View>
              </View>
              <View style={s.playBtn}>
                <Ionicons name="play" size={32} color={colors.appBlack} />
              </View>
            </TouchableOpacity>
          </View>

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
                  const pct = Math.round((p.ayahNumberInSurah / meta.ayahCount) * 100);
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
                      <View style={s.lvProgressRail}>
                        <View style={[s.lvProgressFill, { width: `${pct}%` as any }]} />
                      </View>
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
                return (
                  <TouchableOpacity
                    key={meta.number}
                    style={[s.surahRow, i === savedSurahsMeta.slice(0, 3).length - 1 && savedSurahsMeta.length <= 3 && s.surahRowLast]}
                    onPress={() => router.push(`/surah/${meta.number}`)}
                    activeOpacity={0.65}
                  >
                    <View style={s.surahInfo}>
                      <Text style={s.surahName}>{meta.englishName}</Text>
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
                    const memorized = isSurahChecked(surah.number);
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
        </ScrollView>
      </LinearGradient>

      {/* ── Week Done Toast (floating overlay) ──────────────────────── */}
      {showWeeklyToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Text style={s.toastEmoji}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Weekly target complete!</Text>
            <Text style={s.weekDoneSub}>{weekGoalProgress} ayahs memorized this week</Text>
          </View>
          <TouchableOpacity onPress={() => setShowWeeklyToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      )}

      {showMilestoneToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Text style={s.toastEmoji}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>Ayah milestone complete!</Text>
            <Text style={s.weekDoneSub}>
              {(targetSurah?.englishName ?? memorizationGoal?.startSurahName ?? "Goal")} · {selectedRangeLabel} memorized
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowMilestoneToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      )}

      {showHifzCompleteToast && (
        <View style={[s.weekDoneToast, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Text style={s.toastEmoji}>🎉</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.weekDoneTitle}>{hifzCompleteToastText.title}</Text>
            <Text style={s.weekDoneSub}>{hifzCompleteToastText.sub}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowHifzCompleteToast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      )}

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
          setWidgetFirstAyah(first);
          setWidgetLastAyah(last);
          setWidgetJuz(targetJuz ?? null);
          setShowHifzGoalOptions(false);
          setMemorizationGoal({
            path: weeklyGoalPath,
            startSurahNumber: first.surahNumber,
            startSurahName: weeklyGoalPath === "juz" && targetJuz != null ? `Juz ${targetJuz}` : first.surahName,
            startDate: memorizationGoal?.startDate ?? today,
            ayahsReadAtStart: memorizationGoal?.ayahsReadAtStart ?? todayEntry?.ayahsRead ?? 0,
            targetJuz,
            endSurahNumber: last.surahNumber,
            endAyahNumber: last.ayahNumber,
          });
          const weeklyGoal = buildWeeklyGoal({
            path: weeklyGoalPath,
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
            startDate: goal?.startDate ?? today,
            endSurahNumber: last.surahNumber,
            endAyahNumber: last.ayahNumber,
          });
          setWeeklyGoalVisible(false);
        }}
        onClose={() => setWeeklyGoalVisible(false)}
      />
      {/* Pace-first flow: Weekly Goal → Finish Date → Surah → First Ayah → Last Ayah auto */}
      <AyahRangeModal
        visible={paceDateVisible}
        path={widgetPath}
        memorizedAyahKeys={memorizedAyahKeys}
        startAtPaceDate
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
          setPaceDateVisible(false);
        }}
        onClose={() => setPaceDateVisible(false)}
      />
      <AyahRangeModal
        visible={ayahRangeVisible}
        path={widgetPath}
        memorizedAyahKeys={memorizedAyahKeys}
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
        }}
        onClose={() => setAyahRangeVisible(false)}
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
      paddingBottom: 16,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Audio Card ─────────────────────────────────────────────────────────────
    audioCardGlowWrap: {
      marginHorizontal: 16,
      borderRadius: 10,
      backgroundColor: "#FDFBF7",
      shadowColor: "#A97B4E",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: 8,
      elevation: 8,
    },
    audioCardOffset: {
      marginTop: 16,
    },
    audioCard: {
      backgroundColor: "#FDFBF7",
      borderRadius: 10,
      paddingTop: 28,
      paddingBottom: 24,
      paddingHorizontal: 24,
      minHeight: 112,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#A97B4E",
      overflow: "hidden",
      shadowColor: "#A97B4E",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 5,
      elevation: 4,
    },
    audioCardStrokeGlow: {
      position: "absolute",
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: "#A97B4E",
      shadowColor: "#A97B4E",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 8,
    },
    audioCardOverlayWrap: {
      position: "absolute",
      top: -18,
      left: -30,
      width: 160,
      height: 160,
      alignItems: "center",
      justifyContent: "center",
    },
    audioCardOverlayRing: {
      position: "absolute",
      backgroundColor: colors.appStone,
    },
    audioCardLeft: { flex: 1, marginRight: 14 },
    audioLabel: {
      fontSize: 10,
      lineHeight: 16,
      letterSpacing: 1,
      color: "#71717A",
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      marginBottom: 0,
    },
    audioTitle: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: "700",
      color: "#18181B",
      fontFamily: "Inter_700Bold",
      marginBottom: 0,
    },
    audioSub: {
      fontSize: 12,
      lineHeight: 16,
      color: "#71717A",
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    audioProgressRail: {
      height: 8,
      backgroundColor: "#E7E5DB",
      borderRadius: 4,
      overflow: "hidden",
    },
    audioProgressFill: {
      height: "100%" as any,
      backgroundColor: "#18181B",
      borderRadius: 4,
      shadowColor: "#D47637",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 4,
    },
    playBtn: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 3,
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
      fontSize: 10,
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
      fontSize: 10,
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
      fontSize: 10, fontWeight: "700", color: colors.appBorderLight,
      letterSpacing: 1, fontFamily: "Inter_700Bold", textTransform: "uppercase",
    },
    remainingShowing: { fontSize: 10, fontWeight: "700", color: colors.appLightText, fontFamily: "Inter_700Bold" },
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
    listSection: { marginTop: 28 },
    listSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      paddingHorizontal: 20,
    },
    viewAllText: { fontSize: 13, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    lvScroll: { gap: 10, paddingRight: 20, paddingLeft: 20 },
    lvCard: {
      width: 136,
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      ...colors.shadows.warmWidgetLift,
    },
    lvArabic: {
      fontSize: 26,
      color: colors.appBlack,
      textAlign: "center",
      marginBottom: 6,
      lineHeight: 38,
    },
    lvName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    lvAyah: {
      fontSize: 11,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 2,
      marginBottom: 10,
    },
    lvProgressRail: {
      height: 2,
      backgroundColor: colors.appBorderLighter,
      borderRadius: 1,
      overflow: "hidden",
    },
    lvProgressFill: { height: "100%" as any, backgroundColor: colors.appBlack, borderRadius: 1 },

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
      fontSize: 10,
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
      marginHorizontal: 16,
      marginTop: 16,
    },
    goalWidgetTitle: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    goalWidgetCard: {
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      overflow: "hidden",
      ...colors.shadows.warmWidgetLift,
    },
    goalToggleWrap: {
      margin: 12,
    },
    widgetAyahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 10,
    },
    widgetAyahRowFilled: {},
    widgetAyahCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.appSecondarySurface,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    widgetAyahCircleFilled: {
      backgroundColor: colors.appBlack,
    },
    widgetAyahLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    widgetAyahValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    widgetAyahPlaceholder: {
      fontSize: 14,
      color: colors.appBorderLighter,
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
      fontSize: 11,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
    },
    widgetRowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.appBorderLighter,
      marginHorizontal: 14,
    },
    widgetPaceRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    widgetPaceDivider: {
      width: StyleSheet.hairlineWidth,
      height: 44,
      backgroundColor: colors.appBorderLighter,
      marginHorizontal: 12,
    },
    widgetPaceLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    widgetPaceValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    widgetPacePlaceholder: {
      fontSize: 14,
      color: colors.appBorderLighter,
      fontFamily: "Inter_700Bold",
      fontWeight: "700",
    },
    widgetStartBtn: {
      margin: 12,
      marginTop: 4,
      backgroundColor: colors.appBlack,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    widgetStartBtnDisabled: {
      backgroundColor: colors.appSecondarySurface,
    },
    widgetStartBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },
    widgetStartBtnTextDisabled: {
      color: colors.appLightText,
    },
    widgetFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 2,
      paddingBottom: 14,
      gap: 10,
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
    hifzProgressPctNum: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
      lineHeight: 30,
    },
    hifzProgressPctLabel: {
      fontSize: 11,
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
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    hifzInlineOptionBtn: {
      flex: 1,
      minHeight: 58,
      borderRadius: 18,
      backgroundColor: colors.appSecondarySurface,
      alignItems: "center",
      justifyContent: "center",
    },
    hifzInlineOptionText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    hifzInlineCloseBtn: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.appSecondarySurface,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    // ── THIS WEEK Section ─────────────────────────────────────────────────
    thisWeekSection: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    thisWeekCard: {
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      overflow: "hidden",
      ...colors.shadows.warmWidgetLift,
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
    thisWeekDonutRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 16,
      paddingRight: 4,
      paddingBottom: 14,
      gap: 12,
    },
    thisWeekDonutWrap: {
      width: 68,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    thisWeekDonutNum: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    dotsScrollView: { flex: 1 },
    dotsScrollContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingRight: 12,
    },
    dotCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
    },
    dotCircleDone: {
      backgroundColor: colors.appBlack,
      borderColor: colors.appBlack,
    },
    dotCircleEmpty: {
      backgroundColor: "transparent",
      borderColor: colors.appBorderLighter,
    },
    dotNum: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appLightText,
      fontFamily: "Inter_600SemiBold",
    },
    dotNumDone: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appWhite,
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
      fontSize: 10,
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
      fontSize: 11,
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
      color: colors.appLightText,
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
      backgroundColor: colors.appBlack,
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
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },

    // Streak row inside THIS WEEK card
    thisWeekStreakRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 18,
      gap: 6,
    },
    streakOrangeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#E87040",
    },

    // Journey milestone card
    journeySection: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    journeyCard: {
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,
      padding: 16,
      ...colors.shadows.warmWidgetLift,
    },
    journeyHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 12,
    },
    journeyTitle: {
      flex: 1,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyCompletePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.appBlack,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 0,
    },
    journeyCompleteText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
    },
    journeyProgressRail: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.appBorderLighter,
      overflow: "hidden",
      marginBottom: 8,
    },
    journeyProgressFill: {
      height: "100%" as any,
      width: "100%" as any,
      backgroundColor: colors.appBlack,
      borderRadius: 4,
    },
    journeyProgressText: {
      fontSize: 13,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginBottom: 18,
    },
    journeyStatsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 18,
    },
    journeyStatBox: {
      width: "48%" as any,
      backgroundColor: colors.appSecondarySurface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    journeyStatLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    journeyStatValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appTextPrimary,
      fontFamily: "Inter_700Bold",
    },
    journeyPrimaryBtn: {
      backgroundColor: colors.appBlack,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 10,
    },
    journeyPrimaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },
    journeySecondaryBtn: {
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    journeySecondaryText: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },

    // Week done floating toast
    weekDoneToast: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 50,
      backgroundColor: "#1C1C1E",
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 12,
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
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
    },
    weekDoneSub: {
      fontSize: 12,
      color: "rgba(255,255,255,0.65)",
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    toastEmoji: {
      fontSize: 22,
      lineHeight: 28,
      width: 32,
      textAlign: "center",
    },
  });
