import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getJuzAyahs, JUZ_STARTS, SURAH_DATA, type AyahRef } from "@/constants/surahData";
import { searchByType } from "@/services/search";
import { useColors } from "@/hooks/useColors";
import { ActionPill } from "@/components/ActionPill";
import { SelectChip } from "@/components/SelectChip";
import { ValuePill } from "@/components/ValuePill";
import { useQuran } from "@/contexts/QuranContext";
import { HifzStepper } from "@/components/hifz/HifzUI";
import { BackButton } from "@/components/BackButton";
import { AppDialog } from "@/components/AppDialog";
import { MemorizedBadge } from "@/components/SurahCard";
import { InlineNotice } from "@/components/InlineNotice";
import { calculatePaceMilestones, calculateQuranCompletionWeeks } from "@/utils/paceUtils";
import { buildAdaptiveWeeklyPlan, estimatePeakWeeks } from "@/utils/forecastEngine";

const TOTAL_QURAN_AYAHS = 6236;

const AYAHS_PER_PAGE = 12.5;
const weeklyFromDailyRange = (min: number, max: number) => Math.round(((min + max) / 2) * 7);
const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45, 70];
const MAX_WEEKLY = 70;
const VISUAL_CAPACITY_OPTIONS = [
  { label: "1 ayah every few days", sublabel: "around 1 ayah", ayahsPerWeek: 2 },
  { label: "1 small portion daily", sublabel: "around 2-4 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(2, 4) },
  { label: "¼ page daily", sublabel: "around 3-5 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(3, 5) },
  { label: "½ page daily", sublabel: "around 5-8 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(5, 8) },
  { label: "1 page daily", sublabel: "around 10-15 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(10, 15) },
  { label: "2 pages daily", sublabel: "around 20-30 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(20, 30) },
] as const;

const DESIRED_CAPACITY_OPTIONS = [
  { label: "¼ page daily", sublabel: "around 3-5 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(3, 5) },
  { label: "½ page daily", sublabel: "around 5-8 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(5, 8) },
  { label: "1 page daily", sublabel: "around 10-15 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(10, 15) },
  { label: "2 pages daily", sublabel: "around 20-30 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(20, 30) },
  { label: "3 pages daily", sublabel: "around 30-45 ayahs/day", ayahsPerWeek: weeklyFromDailyRange(30, 45) },
] as const;

function scaleCapacityByDays<T extends { label: string; sublabel: string; ayahsPerWeek: number }>(
  options: readonly T[],
  daysPerWeek: number
) {
  const safeDays = Math.max(1, Math.min(7, daysPerWeek));
  return options.map((option) => ({
    ...option,
    ayahsPerWeek: Math.max(1, Math.round((option.ayahsPerWeek / 7) * safeDays)),
  }));
}

export type MemorizationStyle = "steady" | "gradual";
export type MeasurementStyle = "visual" | "ayah";
export type GradualIncreaseStyle = "gentle" | "medium" | "fast";
export type PaceRhythm = "gentle" | "steady" | "deep";

const INCREASE_STYLE_OPTIONS: Array<{
  value: GradualIncreaseStyle;
  label: string;
  helper: string;
}> = [
  { value: "gentle", label: "Slow & Gentle", helper: "Lower pressure, steadier pace" },
  { value: "medium", label: "Balanced", helper: "Sustainable progression" },
  { value: "fast", label: "Intensive", helper: "Faster capacity expansion" },
];

function estimateCompletion(remaining: number, weeklyGoal: number): string {
  if (weeklyGoal <= 0 || remaining <= 0) return "completed";
  const rawWeeks = remaining / weeklyGoal;
  const minDays = Math.max(1, Math.floor(rawWeeks) * 7);
  const maxDays = Math.max(7, Math.ceil(rawWeeks) * 7);
  if (minDays === maxDays) return `${maxDays} days`;
  return `${minDays}-${maxDays} days`;
}

function getPeakRampWeeks(
  targetAyahsPerWeek: number,
  peakAyahsPerWeek: number,
  increaseStyle: GradualIncreaseStyle
): number {
  const startWeekly = Math.max(1, targetAyahsPerWeek);
  const peakWeekly = Math.max(startWeekly, peakAyahsPerWeek);
  if (peakWeekly <= startWeekly) return 1;
  const baseWeeks = { gentle: 28, medium: 16, fast: 8 }[increaseStyle];
  const distanceRatio = (peakWeekly - startWeekly) / peakWeekly;
  return Math.max(2, Math.ceil(baseWeeks * distanceRatio));
}

function formatWeeks(weeks: number): string {
  if (weeks <= 0) return "—";
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"}`;
  if (weeks < 52) return `${Math.round(weeks / 4)} month${Math.round(weeks / 4) === 1 ? "" : "s"}`;
  const y = weeks / 52;
  const rounded = Math.round(y * 2) / 2;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} year${rounded === 1 ? "" : "s"}`;
}

function getIslamicMonthName(date: Date) {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic", { month: "long" }).format(date);
  } catch {
    return "";
  }
}

function AyahSlider({
  value, onChange, maxValue = MAX_WEEKLY, onDragStart, onDragEnd,
}: {
  value: number; onChange: (v: number) => void; maxValue?: number;
  onDragStart?: () => void; onDragEnd?: () => void;
}) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const sliderRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const onChangeRef = useRef(onChange);
  const maxValueRef = useRef(maxValue);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { maxValueRef.current = maxValue; });
  useEffect(() => { onDragStartRef.current = onDragStart; });
  useEffect(() => { onDragEndRef.current = onDragEnd; });
  const THUMB = 26;
  const safeMax = Math.max(1, maxValue);
  const clampedValue = Math.max(1, Math.min(value, safeMax));
  const resolve = (pageX: number) => {
    sliderRef.current?.measure((_x, _y, width, _height, containerPageX) => {
      const max = Math.max(1, maxValueRef.current);
      const w = width || trackWidthRef.current || 1;
      const x = Math.max(0, Math.min(w, pageX - containerPageX));
      onChangeRef.current(Math.max(1, Math.min(max, Math.round((x / w) * (max - 1)) + 1)));
    });
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => { onDragStartRef.current?.(); resolve(evt.nativeEvent.pageX); },
      onPanResponderMove: (evt) => { resolve(evt.nativeEvent.pageX); },
      onPanResponderRelease: () => { onDragEndRef.current?.(); },
      onPanResponderTerminate: () => { onDragEndRef.current?.(); },
    })
  ).current;
  const thumbLeft = trackWidth > 0 && safeMax > 1 ? ((clampedValue - 1) / (safeMax - 1)) * (trackWidth - THUMB) : 0;
  return (
    <View
      ref={sliderRef}
      style={s.sliderContainer}
      onLayout={(e) => { const w = e.nativeEvent.layout.width; setTrackWidth(w); trackWidthRef.current = w; }}
      {...pan.panHandlers}
    >
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { width: thumbLeft + THUMB / 2 }]} />
      </View>
      {trackWidth > 0 && <View style={[s.sliderThumb, { left: thumbLeft }]} />}
    </View>
  );
}

const JUZ_NAMES: string[] = [
  "Alif Lam Mim", "Sayaqool", "Tilka ar-Rusul", "Lan Tanaloo", "Wal Mohsanat",
  "La Youhibullah", "Wa Idha Samioo", "Wa Lau Annana", "Qalal Malao", "Wa Alamu",
  "Yatazeroon", "Wa Ma Min", "Wa Ma Ubarri'u", "Rubama", "Subhanalladhi",
  "Qala Alam", "Iqtaraba", "Qad Aflaha", "Wa Qalalladhina", "Aman Khalaq",
  "Utlu Ma Oohiya", "Wa Man Yaqnut", "Wa Mali", "Faman Azlam", "Ilayhi Yuraddu",
  "Ha Meem", "Qala Fama Khatbukum", "Qad Sami Allah", "Tabarakalladhi", "Amma",
];

export interface AyahRangeResult {
  first: AyahRef;
  last: AyahRef;
  juz?: number;
  ayahsPerWeek: number;
  isRevision?: boolean;
  targetAyahsPerWeek?: number;
  measurementStyle?: MeasurementStyle;
  finishWeeks?: number;
  memorizationStyle?: MemorizationStyle;
  gradualIncreaseStyle?: GradualIncreaseStyle;
  gradualWeeklyPlan?: number[];
  peakCapacityPerWeek?: number;
  hifzDaysPerWeek?: number;
  targetHifzDaysPerWeek?: number;
  gradualDaysPerWeekPlan?: number[];
  paceRhythm?: PaceRhythm;
}

interface Props {
  visible: boolean;
  path: "surah" | "juz";
  memorizedAyahKeys: string[];
  initialSelection?: AyahRangeResult;
  startAtWeeklyGoal?: boolean;
  startAtPaceDate?: boolean;
  startAtAyahSelection?: boolean;
  initialSurahNumber?: number;
  initialJuz?: number;
  initialPaceStep?: 0 | 1 | 2 | 3;
  modalAnimationType?: "none" | "slide" | "fade";
  paceDaysPerWeek?: number;
  paceTargetDaysPerWeek?: number;
  paceRhythm?: PaceRhythm;
  confirmLabel?: string;
  onConfirm: (result: AyahRangeResult) => void;
  onClose: () => void;
}

export function AyahRangeModal({
  visible,
  path,
  memorizedAyahKeys,
  initialSelection,
  startAtWeeklyGoal = false,
  startAtPaceDate = false,
  startAtAyahSelection = false,
  initialSurahNumber,
  initialJuz,
  initialPaceStep,
  modalAnimationType = "slide",
  paceDaysPerWeek = 7,
  paceTargetDaysPerWeek = paceDaysPerWeek,
  paceRhythm = "gentle",
  confirmLabel = "Start Memorizing →",
  onConfirm,
  onClose,
}: Props) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { removeMemorizedAyahKeys } = useQuran();
  const { width: windowWidth } = useWindowDimensions();
  const infoPageWidth = windowWidth - 40;
  const paceScrollRef = useRef<ScrollView>(null);
  const ayahScrollRef = useRef<ScrollView>(null);
  const forecastScrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<0 | 1 | 2 | 3>(1);
  const [maxStepReached, setMaxStepReached] = useState<0 | 1 | 2 | 3>(1);
  const [paceStep, setPaceStep] = useState<0 | 1 | 2 | 3>(0);
  const [paceRangeTab, setPaceRangeTab] = useState<"surah" | "juz">("surah");
  const [search, setSearch] = useState("");
  const [ayahsPerWeek, setAyahsPerWeek] = useState(1);
  const [currentBaseAyahsPerWeek, setCurrentBaseAyahsPerWeek] = useState(1);
  const [memorizationStyle, setMemorizationStyle] = useState<MemorizationStyle>("steady");
  const [gradualIncreaseStyle, setGradualIncreaseStyle] = useState<GradualIncreaseStyle>("medium");
  const [peakCapacityPerWeek, setPeakCapacityPerWeek] = useState(105);
  const [paceCurrentSelected, setPaceCurrentSelected] = useState(false);
  const [paceDesiredSelected, setPaceDesiredSelected] = useState(false);
  const [paceGrowthSelected, setPaceGrowthSelected] = useState(false);
  const [infoPage, setInfoPage] = useState(0);
  const [weeklyScrollEnabled, setWeeklyScrollEnabled] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<typeof SURAH_DATA[0] | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [firstAyah, setFirstAyah] = useState<AyahRef | null>(null);
  const [lastAyah, setLastAyah] = useState<AyahRef | null>(null);
  const [activePhase, setActivePhase] = useState<"first" | "last">("first");
  const [resetVisible, setResetVisible] = useState(false);
  const normalizedPaceDays = Math.max(1, Math.min(7, paceDaysPerWeek));
  const normalizedTargetPaceDays = Math.max(normalizedPaceDays, Math.min(7, paceTargetDaysPerWeek));
  const capacityOptions = useMemo(
    () => scaleCapacityByDays(VISUAL_CAPACITY_OPTIONS, normalizedPaceDays),
    [normalizedPaceDays],
  );
  const desiredCapacityOptions = useMemo(
    () => scaleCapacityByDays(DESIRED_CAPACITY_OPTIONS, paceRhythm === "steady" ? normalizedPaceDays : normalizedTargetPaceDays),
    [normalizedPaceDays, normalizedTargetPaceDays, paceRhythm],
  );

  useEffect(() => {
    if (visible) {
      const initialStep = (startAtPaceDate ? 0 : startAtWeeklyGoal && initialSelection ? 3 : startAtAyahSelection ? 2 : 1) as 0 | 1 | 2 | 3;
      setStep(initialStep);
      setMaxStepReached(initialStep);
      setPaceStep(initialPaceStep ?? 0);
      setPaceRangeTab(path);
      setSearch("");
      setSelectedSurah(
        initialSurahNumber
          ? SURAH_DATA[initialSurahNumber - 1] ?? null
          : initialSelection
          ? SURAH_DATA[initialSelection.first.surahNumber - 1] ?? null
          : null
      );
      setSelectedJuz(initialJuz ?? initialSelection?.juz ?? null);
      setFirstAyah(startAtAyahSelection ? null : initialSelection?.first ?? null);
      setLastAyah(startAtAyahSelection ? null : initialSelection?.last ?? null);
      setActivePhase("first");
      const initialAyahsPerWeek = initialSelection?.ayahsPerWeek ?? 1;
      const initialBaseAyahsPerWeek = VISUAL_CAPACITY_OPTIONS.find((opt) =>
        Math.round((opt.ayahsPerWeek / 7) * normalizedPaceDays) === initialAyahsPerWeek
      )?.ayahsPerWeek ?? initialAyahsPerWeek;
      const initialPeak = initialSelection?.peakCapacityPerWeek ?? initialSelection?.targetAyahsPerWeek;
      const fallbackPeak = desiredCapacityOptions.find((option) => {
        const baseDesired = DESIRED_CAPACITY_OPTIONS.find((opt) => opt.label === option.label)?.ayahsPerWeek ?? option.ayahsPerWeek;
        return baseDesired > initialBaseAyahsPerWeek;
      })?.ayahsPerWeek ?? desiredCapacityOptions[desiredCapacityOptions.length - 1].ayahsPerWeek;
      const validPeak = initialPeak && initialPeak > initialAyahsPerWeek ? initialPeak : fallbackPeak;
      setAyahsPerWeek(initialAyahsPerWeek);
      setCurrentBaseAyahsPerWeek(initialBaseAyahsPerWeek);
      setMemorizationStyle(startAtPaceDate ? (paceRhythm === "steady" ? "steady" : "gradual") : initialSelection?.memorizationStyle ?? "steady");
      setGradualIncreaseStyle(initialSelection?.gradualIncreaseStyle ?? "medium");
      setPeakCapacityPerWeek(validPeak);
      setPaceCurrentSelected(!!initialSelection);
      setPaceDesiredSelected(!!initialSelection && validPeak > initialAyahsPerWeek);
      setPaceGrowthSelected(paceRhythm === "steady" || !!initialSelection?.gradualIncreaseStyle);
      setResetVisible(false);
    }
  }, [visible, startAtPaceDate, startAtWeeklyGoal, startAtAyahSelection, initialSelection, initialSurahNumber, initialJuz, desiredCapacityOptions, paceRhythm]);

  const advanceStep = (target: 0 | 1 | 2 | 3) => {
    setStep(target);
    setMaxStepReached((prev) => (Math.max(prev, target) as 0 | 1 | 2 | 3));
  };

  const activePath = startAtPaceDate ? paceRangeTab : path;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      paceScrollRef.current?.scrollTo({ y: 0, animated: false });
      ayahScrollRef.current?.scrollTo({ y: 0, animated: false });
      forecastScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [activePath, paceStep, selectedJuz, selectedSurah?.number, step]);

  const juzAyahs = useMemo(() => {
    if (activePath === "juz" && selectedJuz != null) return getJuzAyahs(selectedJuz);
    return [];
  }, [activePath, selectedJuz]);

  const juzGroups = useMemo(() => {
    const groups: { surah: typeof SURAH_DATA[0]; ayahs: number[] }[] = [];
    for (const ayah of juzAyahs) {
      const surah = SURAH_DATA[ayah.surahNumber - 1];
      if (!surah) continue;
      const last = groups[groups.length - 1];
      if (last?.surah.number === surah.number) last.ayahs.push(ayah.ayahNumber);
      else groups.push({ surah, ayahs: [ayah.ayahNumber] });
    }
    return groups;
  }, [juzAyahs]);

  const resetTargetAyahs = useMemo(() => {
    if (activePath === "juz" && selectedJuz != null) return juzAyahs;
    if (activePath === "surah" && selectedSurah) {
      return Array.from({ length: selectedSurah.ayahCount }, (_, i) => ({
        surahNumber: selectedSurah.number,
        surahName: selectedSurah.englishName,
        ayahNumber: i + 1,
      }));
    }
    return [];
  }, [activePath, selectedJuz, juzAyahs, selectedSurah]);

  const filteredSurahs = useMemo(() => searchByType("surah", search, SURAH_DATA), [search]);

  const juzList = useMemo(() => JUZ_STARTS.map((juz) => ({
    juz: juz.juz,
    ayahCount: getJuzAyahs(juz.juz).length,
    startsAt: juz,
    name: JUZ_NAMES[juz.juz - 1] ?? "",
  })), []);

  const filteredJuzList = useMemo(() => {
    if (!search.trim()) return juzList;
    const matchingSurahNumbers = new Set(
      searchByType("surah", search, SURAH_DATA).map((s) => s.number)
    );
    return juzList.filter((group) => {
      const ayahs = getJuzAyahs(group.juz);
      return (
        String(group.juz).includes(search.trim()) ||
        ayahs.some((a) => matchingSurahNumbers.has(a.surahNumber))
      );
    });
  }, [search, juzList]);

  const totalRangeAyahs = useMemo(() => {
    if (!firstAyah || !lastAyah) return 0;
    if (activePath === "surah") {
      return Math.max(1, lastAyah.ayahNumber - firstAyah.ayahNumber + 1);
    }
    const firstIdx = juzAyahs.findIndex(
      (a) => a.surahNumber === firstAyah.surahNumber && a.ayahNumber === firstAyah.ayahNumber
    );
    const lastIdx = juzAyahs.findIndex(
      (a) => a.surahNumber === lastAyah.surahNumber && a.ayahNumber === lastAyah.ayahNumber
    );
    if (firstIdx >= 0 && lastIdx >= firstIdx) return lastIdx - firstIdx + 1;
    return 0;
  }, [firstAyah, lastAyah, activePath, juzAyahs]);

  const unmemorizedRangeAyahs = useMemo(() => {
    if (!firstAyah || !lastAyah) return [];
    const memorized = new Set(memorizedAyahKeys);
    const source = activePath === "juz"
      ? juzAyahs
      : (() => {
          const surah = SURAH_DATA.find((s) => s.number === firstAyah.surahNumber);
          if (!surah) return [];
          return Array.from({ length: surah.ayahCount }, (_, i) => ({
            surahNumber: surah.number,
            surahName: surah.englishName,
            ayahNumber: i + 1,
          }));
        })();
    const firstIdx = source.findIndex(
      (a) => a.surahNumber === firstAyah.surahNumber && a.ayahNumber === firstAyah.ayahNumber
    );
    const lastIdx = source.findIndex(
      (a) => a.surahNumber === lastAyah.surahNumber && a.ayahNumber === lastAyah.ayahNumber
    );
    if (firstIdx < 0 || lastIdx < firstIdx) return [];
    return source.slice(firstIdx, lastIdx + 1).filter((ayah) => !memorized.has(`${ayah.surahNumber}:${ayah.ayahNumber}`));
  }, [firstAyah, lastAyah, activePath, juzAyahs, memorizedAyahKeys]);

  const remainingRangeAyahs = unmemorizedRangeAyahs.length;

  const isSurahFullyMemorized = useMemo(() => {
    if (activePath !== "surah" || !selectedSurah) return false;
    const memorized = new Set(memorizedAyahKeys);
    for (let i = 1; i <= selectedSurah.ayahCount; i++) {
      if (!memorized.has(`${selectedSurah.number}:${i}`)) return false;
    }
    return true;
  }, [activePath, selectedSurah, memorizedAyahKeys]);

  const isJuzFullyMemorized = useMemo(() => {
    if (activePath !== "juz" || juzAyahs.length === 0) return false;
    const memorized = new Set(memorizedAyahKeys);
    return juzAyahs.every((a) => memorized.has(`${a.surahNumber}:${a.ayahNumber}`));
  }, [activePath, juzAyahs, memorizedAyahKeys]);

  const isRangeFullyMemorized = activePath === "surah" ? isSurahFullyMemorized : isJuzFullyMemorized;

  // Revision state is only available after the full surah/juz has been memorized.
  const isRevisionMode = firstAyah !== null && lastAyah !== null && totalRangeAyahs > 0 && remainingRangeAyahs === 0 && isRangeFullyMemorized;

  const memorizedSet = useMemo(() => new Set(memorizedAyahKeys), [memorizedAyahKeys]);
  const memorizedCountBySurah = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const key of memorizedAyahKeys) {
      const surahNum = Number(key.split(":")[0]);
      if (Number.isFinite(surahNum)) counts[surahNum] = (counts[surahNum] ?? 0) + 1;
    }
    return counts;
  }, [memorizedAyahKeys]);
  const expandableWeeklyAyahs = useMemo(() => {
    if (!startAtWeeklyGoal || !firstAyah) return 0;
    const memorized = new Set(memorizedAyahKeys);
    const source = path === "juz"
      ? juzAyahs
      : (() => {
          const surah = SURAH_DATA.find((s) => s.number === firstAyah.surahNumber);
          if (!surah) return [];
          return Array.from({ length: surah.ayahCount }, (_, i) => ({
            surahNumber: surah.number,
            surahName: surah.englishName,
            ayahNumber: i + 1,
          }));
        })();
    const firstIdx = source.findIndex(
      (a) => a.surahNumber === firstAyah.surahNumber && a.ayahNumber === firstAyah.ayahNumber
    );
    if (firstIdx < 0) return 0;
    return source.slice(firstIdx).filter((ayah) => !memorized.has(`${ayah.surahNumber}:${ayah.ayahNumber}`)).length;
  }, [firstAyah, juzAyahs, memorizedAyahKeys, path, startAtWeeklyGoal]);
  const currentWeeklyTargetCount = startAtWeeklyGoal && initialSelection ? initialSelection.ayahsPerWeek : 0;
  const availableForTarget = Math.max(remainingRangeAyahs, currentWeeklyTargetCount, expandableWeeklyAyahs);
  const dynamicMax = availableForTarget > 0 ? Math.min(MAX_WEEKLY, availableForTarget) : MAX_WEEKLY;
  const clampedAyahsPerWeek = Math.max(1, Math.min(ayahsPerWeek, dynamicMax));

  const weeklyPreviewAyahs = useMemo(() => {
    if (!firstAyah) return [];
    const memorized = new Set(memorizedAyahKeys);
    const source = path === "juz"
      ? juzAyahs
      : (() => {
          const surah = SURAH_DATA.find((s) => s.number === firstAyah.surahNumber);
          if (!surah) return [];
          return Array.from({ length: surah.ayahCount }, (_, i) => ({
            surahNumber: surah.number,
            surahName: surah.englishName,
            ayahNumber: i + 1,
          }));
        })();
    const firstIdx = source.findIndex(
      (a) => a.surahNumber === firstAyah.surahNumber && a.ayahNumber === firstAyah.ayahNumber
    );
    if (firstIdx < 0) return [];
    const selectedLastIdx = lastAyah
      ? source.findIndex((a) => a.surahNumber === lastAyah.surahNumber && a.ayahNumber === lastAyah.ayahNumber)
      : source.length - 1;
    const lastIdx = startAtWeeklyGoal ? source.length - 1 : selectedLastIdx;
    if (lastIdx < firstIdx) return [];
    return source
      .slice(firstIdx, lastIdx + 1)
      .filter((ayah) => !memorized.has(`${ayah.surahNumber}:${ayah.ayahNumber}`))
      .slice(0, clampedAyahsPerWeek);
  }, [clampedAyahsPerWeek, firstAyah, lastAyah, juzAyahs, memorizedAyahKeys, path, startAtWeeklyGoal]);

  const weeklyPreviewRangeLabel = useMemo(() => {
    if (isRevisionMode && firstAyah && lastAyah) {
      if (firstAyah.surahNumber === lastAyah.surahNumber) {
        const prefix = path === "juz" ? `${firstAyah.surahName}, ` : "";
        return firstAyah.ayahNumber === lastAyah.ayahNumber
          ? `${prefix}Ayah ${firstAyah.ayahNumber}`
          : `${prefix}Ayah ${firstAyah.ayahNumber} – ${lastAyah.ayahNumber}`;
      }
      return `${firstAyah.surahName} ${firstAyah.ayahNumber} – ${lastAyah.surahName} ${lastAyah.ayahNumber}`;
    }
    const first = weeklyPreviewAyahs[0];
    const last = weeklyPreviewAyahs[weeklyPreviewAyahs.length - 1];
    if (!first || !last) return "No ayahs available";
    if (first.surahNumber === last.surahNumber) {
      const prefix = path === "juz" ? `${first.surahName}, ` : "";
      return first.ayahNumber === last.ayahNumber
        ? `${prefix}Ayah ${first.ayahNumber}`
        : `${prefix}Ayah ${first.ayahNumber} – ${last.ayahNumber}`;
    }
    return `${first.surahName} ${first.ayahNumber} – ${last.surahName} ${last.ayahNumber}`;
  }, [path, weeklyPreviewAyahs, isRevisionMode, firstAyah, lastAyah]);

  useEffect(() => {
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, dynamicMax)));
  }, [dynamicMax]);

  // ── PaceDate flow helpers ──────────────────────────────────────────────────

  // Convert weekly capacity (scaled by active days) → daily capacity assuming daily memorization.
  const startAyahsPerDay = useMemo(
    () => Math.max(0.1, ayahsPerWeek / Math.max(1, normalizedPaceDays)),
    [ayahsPerWeek, normalizedPaceDays]
  );

  const desiredAyahsPerDay = useMemo(
    () => Math.max(startAyahsPerDay, peakCapacityPerWeek / Math.max(1, normalizedTargetPaceDays)),
    [peakCapacityPerWeek, normalizedTargetPaceDays, startAyahsPerDay]
  );

  const growthMilestones = useMemo(
    () => calculatePaceMilestones(startAyahsPerDay, desiredAyahsPerDay, gradualIncreaseStyle),
    [startAyahsPerDay, desiredAyahsPerDay, gradualIncreaseStyle]
  );

  const autoWeeksNeeded = useMemo(() => {
    const forecastAyahs = Math.max(1, TOTAL_QURAN_AYAHS - memorizedAyahKeys.length);
    if (!startAtPaceDate) return null;
    if (memorizationStyle === "steady") return Math.ceil(forecastAyahs / Math.max(1, ayahsPerWeek));
    return calculateQuranCompletionWeeks(startAyahsPerDay, desiredAyahsPerDay, gradualIncreaseStyle, forecastAyahs);
  }, [startAtPaceDate, memorizedAyahKeys.length, startAyahsPerDay, desiredAyahsPerDay, memorizationStyle, gradualIncreaseStyle, ayahsPerWeek]);

  const gradualWeeklyPlan = useMemo(() => {
    if (!startAtPaceDate || !autoWeeksNeeded || memorizationStyle !== "gradual") return [];
    return buildAdaptiveWeeklyPlan(ayahsPerWeek, peakCapacityPerWeek, gradualIncreaseStyle, autoWeeksNeeded);
  }, [ayahsPerWeek, gradualIncreaseStyle, memorizationStyle, peakCapacityPerWeek, autoWeeksNeeded, startAtPaceDate]);

  const gradualDaysPerWeekPlan = useMemo(() => {
    if (!startAtPaceDate || !autoWeeksNeeded) return [];
    if (memorizationStyle === "steady" || paceRhythm === "steady") {
      return Array.from({ length: autoWeeksNeeded }, () => normalizedPaceDays);
    }
    const rampWeeks = getPeakRampWeeks(normalizedPaceDays, normalizedTargetPaceDays, gradualIncreaseStyle);
    return Array.from({ length: autoWeeksNeeded }, (_, index) => {
      if (index >= rampWeeks - 1) return normalizedTargetPaceDays;
      const t = rampWeeks <= 1 ? 1 : index / (rampWeeks - 1);
      return Math.max(normalizedPaceDays, Math.round(normalizedPaceDays + (normalizedTargetPaceDays - normalizedPaceDays) * t));
    });
  }, [
    autoWeeksNeeded,
    gradualIncreaseStyle,
    memorizationStyle,
    normalizedPaceDays,
    normalizedTargetPaceDays,
    paceRhythm,
    startAtPaceDate,
  ]);

  const autoCapacity = startAtPaceDate && autoWeeksNeeded
    ? memorizationStyle === "gradual"
      ? gradualWeeklyPlan.reduce((sum, week) => sum + week, 0)
      : ayahsPerWeek * autoWeeksNeeded
    : 0;

  const currentPaceAyahsPerWeek = memorizationStyle === "gradual"
    ? gradualWeeklyPlan[0] ?? buildAdaptiveWeeklyPlan(ayahsPerWeek, peakCapacityPerWeek, gradualIncreaseStyle, 5)[0]
    : ayahsPerWeek;

  const peakOptions = desiredCapacityOptions.filter((option) => {
    const baseDesiredAyahsPerWeek = DESIRED_CAPACITY_OPTIONS.find((opt) => opt.label === option.label)?.ayahsPerWeek ?? option.ayahsPerWeek;
    return baseDesiredAyahsPerWeek > currentBaseAyahsPerWeek;
  });
  const hasDesiredOptions = peakOptions.length > 0;

  const isAyahAfterFirst = (surahNum: number, ayahNum: number, first: AyahRef): boolean => {
    if (surahNum !== first.surahNumber) return surahNum > first.surahNumber;
    return ayahNum > first.ayahNumber;
  };

  const isInRange = (surahNum: number, ayahNum: number): boolean => {
    if (!firstAyah || !lastAyah) return false;
    const pos = surahNum * 10000 + ayahNum;
    const firstPos = firstAyah.surahNumber * 10000 + firstAyah.ayahNumber;
    const lastPos = lastAyah.surahNumber * 10000 + lastAyah.ayahNumber;
    return pos > firstPos && pos < lastPos;
  };

  const isDisabledBubble = (surahNum: number, ayahNum: number): boolean => {
    // In memorization state, already memorized ayahs are not selectable.
    if (!isRangeFullyMemorized && memorizedSet.has(`${surahNum}:${ayahNum}`)) return true;
    if (activePhase !== "last" || !firstAyah) return false;
    const pos = surahNum * 10000 + ayahNum;
    const firstPos = firstAyah.surahNumber * 10000 + firstAyah.ayahNumber;
    return pos < firstPos;
  };

  const handleAyahTap = (surahNumber: number, surahName: string, ayahNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Auto-last mode: tapping sets first, last auto-extends to end of selected range
    if (startAtPaceDate) {
      const isCurrentFirst = firstAyah?.surahNumber === surahNumber && firstAyah?.ayahNumber === ayahNumber;
      if (isCurrentFirst) {
        setFirstAyah(null);
        setLastAyah(null);
        return;
      }
      setFirstAyah({ surahNumber, surahName, ayahNumber });
      if (activePath === "juz" && juzAyahs.length > 0) {
        setLastAyah(juzAyahs[juzAyahs.length - 1] ?? { surahNumber, surahName, ayahNumber });
      } else {
        const surahData = SURAH_DATA.find(s => s.number === surahNumber);
        const maxAyah = surahData?.ayahCount ?? ayahNumber;
        setLastAyah({ surahNumber, surahName, ayahNumber: maxAyah });
      }
      return;
    }

    const isCurrentFirst = firstAyah?.surahNumber === surahNumber && firstAyah?.ayahNumber === ayahNumber;
    const isCurrentLast = lastAyah?.surahNumber === surahNumber && lastAyah?.ayahNumber === ayahNumber;

    if (isCurrentFirst) {
      setFirstAyah(null);
      setLastAyah(null);
      setActivePhase("first");
      return;
    }
    if (isCurrentLast) {
      setLastAyah(null);
      return;
    }

    if (activePhase === "first") {
      setFirstAyah({ surahNumber, surahName, ayahNumber });
      setLastAyah(null);
      setActivePhase("last");
    } else {
      if (!firstAyah) return;
      if (!isAyahAfterFirst(surahNumber, ayahNumber, firstAyah)) return;
      setLastAyah({ surahNumber, surahName, ayahNumber });
    }
  };

  const getAyahsBetween = (): number => {
    if (!firstAyah || !lastAyah) return 0;
    if (activePath === "surah" && firstAyah.surahNumber === lastAyah.surahNumber) {
      return Math.max(0, lastAyah.ayahNumber - firstAyah.ayahNumber - 1);
    }
    const firstIdx = juzAyahs.findIndex(
      (a) => a.surahNumber === firstAyah.surahNumber && a.ayahNumber === firstAyah.ayahNumber
    );
    const lastIdx = juzAyahs.findIndex(
      (a) => a.surahNumber === lastAyah.surahNumber && a.ayahNumber === lastAyah.ayahNumber
    );
    return Math.max(0, lastIdx - firstIdx - 1);
  };

  const getLeadingMemorizedRange = (): string | null => {
    if (activePath !== "surah" || !selectedSurah) return null;
    const memorized = new Set(memorizedAyahKeys);
    let count = 0;
    for (let i = 1; i <= selectedSurah.ayahCount; i++) {
      if (memorized.has(`${selectedSurah.number}:${i}`)) count++;
      else break;
    }
    if (count <= 0) return null;
    return `Ayahs 1–${count}`;
  };

  const hintText = (): string => {
    if (activePhase === "first") return "Tap an ayah to set the starting point";
    if (!lastAyah) {
      return `Must be after Ayah ${firstAyah?.ayahNumber} · disabled ayahs are before your start`;
    }
    return `= range (${getAyahsBetween()} ayahs between)`;
  };

  const canConfirm = firstAyah !== null && lastAyah !== null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, dynamicMax)));
    advanceStep(3);
  };

  const handleFinalConfirm = () => {
    if (!startAtPaceDate && !canConfirm) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const first = firstAyah ?? { surahNumber: 1, surahName: SURAH_DATA[0]?.englishName ?? "Al-Faatiha", ayahNumber: 1 };
    const finalSurah = SURAH_DATA[SURAH_DATA.length - 1];
    const last = lastAyah ?? {
      surahNumber: finalSurah?.number ?? 114,
      surahName: finalSurah?.englishName ?? "An-Naas",
      ayahNumber: finalSurah?.ayahCount ?? 6,
    };
    onConfirm({
      first,
      last,
      juz: activePath === "juz" ? selectedJuz ?? undefined : undefined,
      ayahsPerWeek: startAtPaceDate ? currentPaceAyahsPerWeek : clampedAyahsPerWeek,
      isRevision: isRevisionMode,
      targetAyahsPerWeek: startAtPaceDate ? peakCapacityPerWeek : clampedAyahsPerWeek,
      finishWeeks: undefined,
      measurementStyle: "visual",
      memorizationStyle,
      gradualIncreaseStyle: memorizationStyle === "gradual" ? gradualIncreaseStyle : undefined,
      gradualWeeklyPlan: memorizationStyle === "gradual" ? gradualWeeklyPlan : undefined,
      peakCapacityPerWeek: memorizationStyle === "gradual" ? peakCapacityPerWeek : undefined,
      hifzDaysPerWeek: startAtPaceDate ? normalizedPaceDays : undefined,
      targetHifzDaysPerWeek: startAtPaceDate ? (paceRhythm === "steady" ? normalizedPaceDays : normalizedTargetPaceDays) : undefined,
      gradualDaysPerWeekPlan: startAtPaceDate ? gradualDaysPerWeekPlan : undefined,
      paceRhythm: startAtPaceDate ? paceRhythm : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeMemorizedAyahKeys(resetTargetAyahs.map((ayah) => `${ayah.surahNumber}:${ayah.ayahNumber}`));
    setFirstAyah(null);
    setLastAyah(null);
    setActivePhase("first");
    setResetVisible(false);
  };

  const getJuzSubtitle = (): string => {
    if (selectedJuz == null) return "";
    const juzStart = JUZ_STARTS[selectedJuz - 1];
    if (!juzStart) return "";
    const startSurah = SURAH_DATA[juzStart.surah - 1];
    const juzAyahList = getJuzAyahs(selectedJuz);
    const lastRef = juzAyahList[juzAyahList.length - 1];
    const endSurah = lastRef ? SURAH_DATA[lastRef.surahNumber - 1] : null;
    return `${startSurah?.englishName ?? ""} ${juzStart.ayah} – ${endSurah?.englishName ?? ""} ${lastRef?.ayahNumber ?? ""}`;
  };

  const renderAyahBubble = (surahNumber: number, surahName: string, ayahNumber: number) => {
    const key = `${surahNumber}:${ayahNumber}`;
    const isMemorized = memorizedAyahKeys.includes(key);
    const isFirst = firstAyah?.surahNumber === surahNumber && firstAyah?.ayahNumber === ayahNumber;
    const isLast = lastAyah?.surahNumber === surahNumber && lastAyah?.ayahNumber === ayahNumber;
    const inRange = isInRange(surahNumber, ayahNumber);
    const disabled = isDisabledBubble(surahNumber, ayahNumber);
    const showMemorized = isMemorized && !isFirst && !isLast;
    const showDisabledMemorized = showMemorized && disabled;

    const isAutoLast = startAtPaceDate && isLast;

    return (
      <TouchableOpacity
        key={key}
        style={[
          s.ayahBubble,
          (isFirst || isLast) && s.ayahBubbleSelected,
          inRange && s.ayahBubbleInRange,
          disabled && s.ayahBubbleDisabled,
          showMemorized && s.ayahBubbleMemorized,
          showDisabledMemorized && s.ayahBubbleMemorizedDisabled,
        ]}
        onPress={() => !disabled && handleAyahTap(surahNumber, surahName, ayahNumber)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {showMemorized ? (
          <Feather name="check" size={11} color={c.appSuccess} />
        ) : (
          <Text
            style={[
              s.ayahBubbleText,
              (isFirst || isLast) && s.ayahBubbleTextSelected,
              inRange && s.ayahBubbleTextInRange,
              disabled && s.ayahBubbleTextDisabled,
            ]}
          >
            {ayahNumber}
          </Text>
        )}
        {isAutoLast && (
          <View style={s.autoLastBubbleBadge}>
            <Text style={s.autoLastBubbleBadgeText}>A</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Progress bar ───────────────────────────────────────────────────────────
  const renderProgressBar = () => {
    if (startAtPaceDate) {
      const effectiveStep =
        step === 0 ? paceStep
        : step === 1 ? 3
        : step === 2 ? 4
        : 5;
      const labels = ["Pace", "Peak", "Style", "Range", "Ayah", "Forecast"];
      const paceOnlyLabels = ["Current", "Desired", "Growth", "Forecast"];
      const paceOnlyStep = step === 0 ? paceStep : paceOnlyLabels.length - 1;
      const activeLabels = startAtPaceDate ? paceOnlyLabels : labels;
      const activeStep = startAtPaceDate ? paceOnlyStep : effectiveStep;
      return (
        <HifzStepper
          labels={activeLabels}
          activeIndex={activeStep}
          onStepPress={(index) => {
            if (index >= activeStep) return;
            if (step === 0) {
              setPaceStep(index as 0 | 1 | 2 | 3);
              return;
            }
            setStep(0);
            setPaceStep(index as 0 | 1 | 2 | 3);
          }}
        />
      );
    }

    const labels = [path === "juz" ? "Juz" : "Surah", "Range", "Weekly Goal"];
    return (
      <HifzStepper
        labels={labels}
        activeIndex={Math.max(0, step - 1)}
        onStepPress={(index) => {
          const targetStep = (index + 1) as 0 | 1 | 2 | 3;
          if (targetStep < step && targetStep <= maxStepReached) {
            setStep(targetStep);
          }
        }}
      />
    );
  };

  const formatPaceOptionLabel = (label: string) => {
    if (label === "1 ayah every few days") return "I am just starting";
    if (label === "1 small portion daily") return "~1 ayah/day";
    if (label === "¼ page daily") return "~3 ayahs/day";
    if (label === "½ page daily") return "~½ page/day";
    if (label === "1 page daily") return "~1 page/day";
    if (label === "2 pages daily") return "~2 pages/day";
    if (label === "3 pages daily") return "3 pages/day";
    return label.replace(" daily", "/day");
  };

  const renderHeaderBack = (onPress: () => void) => (
    <View style={s.navBtn}>
      <BackButton onPress={onPress} />
    </View>
  );

  const renderPaceChoice = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[s.paceChoiceCard, selected && s.paceChoiceCardSelected]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={[s.paceChoiceText, selected && s.paceChoiceTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Step 0: Pace goal sub-steps ───────────────────────────────────────────
  const renderPaceDate = () => {
    // ── paceStep 0: Current sustainable capacity ─────────────────────────────
    if (paceStep === 0) {
      return (
        <>
          <View style={[s.header, { paddingTop: 8 }]}>
            {renderHeaderBack(onClose)}
            <Text style={s.screenTitle}>Set Your Goal</Text>
            <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {renderProgressBar()}
          <ScrollView
            ref={paceScrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.paceDateContent}
          >
            <Text style={s.paceStepHeadline}>On a typical day, how many ayahs can you memorize?</Text>
            <Text style={s.paceStepSub}>
              Don't choose your ideal pace.{"\n"}
              <Text style={s.paceStepSubStrong}>Choose your real current pace.</Text>
            </Text>
            <View style={s.paceChoiceStack}>
              {capacityOptions.map((option) => {
                return renderPaceChoice({
                  label: formatPaceOptionLabel(option.label),
                  selected: paceCurrentSelected && ayahsPerWeek === option.ayahsPerWeek,
                  onPress: () => {
                        const selectedCapacity = option.ayahsPerWeek;
                        if (selectedCapacity == null) return;
                        const baseCurrentOption = VISUAL_CAPACITY_OPTIONS.find((opt) => opt.label === option.label);
                        const baseCapacity = baseCurrentOption?.ayahsPerWeek ?? selectedCapacity;
                        setAyahsPerWeek(selectedCapacity);
                        setCurrentBaseAyahsPerWeek(baseCapacity);
                        const nextDesired = desiredCapacityOptions.find((desired) => {
                          const baseDesired = DESIRED_CAPACITY_OPTIONS.find((opt) => opt.label === desired.label)?.ayahsPerWeek ?? desired.ayahsPerWeek;
                          return baseDesired > baseCapacity;
                        });
                        setPeakCapacityPerWeek(
                          paceRhythm === "steady"
                            ? selectedCapacity
                            : nextDesired?.ayahsPerWeek ?? desiredCapacityOptions[desiredCapacityOptions.length - 1].ayahsPerWeek
                        );
                        setPaceCurrentSelected(true);
                        setPaceDesiredSelected(paceRhythm === "steady");
                        setPaceGrowthSelected(paceRhythm === "steady");
                  },
                });
              })}
            </View>
          </ScrollView>

          <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
            <ActionPill
              label="Continue →"
              variant="primary"
              size="lg"
              disabled={!paceCurrentSelected}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (paceRhythm === "steady") {
                  advanceStep(3);
                } else {
                  setPaceStep(1);
                }
              }}
            />
          </View>
        </>
      );
    }

    // ── paceStep 1: Desired capacity ─────────────────────────────────────────
    const peakRampWeeks = estimatePeakWeeks(ayahsPerWeek / 7, peakCapacityPerWeek / 7, gradualIncreaseStyle);
    const peakPreviewPlan = buildAdaptiveWeeklyPlan(ayahsPerWeek, peakCapacityPerWeek, gradualIncreaseStyle, peakRampWeeks);
    const peakPreviewBars = peakPreviewPlan.reduce<{ week: number; count: number }[]>((acc, count, index) => {
      if (index === 0 || count !== peakPreviewPlan[index - 1] || index === peakPreviewPlan.length - 1) {
        acc.push({ week: index + 1, count });
      }
      return acc;
    }, []);
    const peakPreviewMax = Math.max(1, peakCapacityPerWeek, ...peakPreviewBars.map((item) => item.count));
    const selectedPeakLabel = desiredCapacityOptions.find((option) => option.ayahsPerWeek === peakCapacityPerWeek)?.label
      ?? `${Math.round(peakCapacityPerWeek / 7)}/day peak`;
    if (paceStep === 1) return (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => setPaceStep(0))}
          <Text style={s.screenTitle}>Set Your Goal</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <ScrollView
          ref={paceScrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.paceDateContent}
        >
          <Text style={s.paceStepHeadline}>Which Hifz speed would you like to reach?</Text>
          <Text style={s.paceStepSub}>Your pace can always grow. Start with an honest aspiration.</Text>
          {hasDesiredOptions ? (
            <View style={s.paceChoiceStack}>
              {peakOptions.map((option) => {
                const baseDesiredAyahsPerWeek = DESIRED_CAPACITY_OPTIONS.find((opt) => opt.label === option.label)?.ayahsPerWeek ?? option.ayahsPerWeek;
                const selected = paceDesiredSelected && peakCapacityPerWeek === option.ayahsPerWeek && baseDesiredAyahsPerWeek > currentBaseAyahsPerWeek;
                return renderPaceChoice({
                  label: formatPaceOptionLabel(option.label).replace(/^~/, ""),
                  selected,
                  onPress: () => {
                      setPeakCapacityPerWeek(option.ayahsPerWeek);
                      setPaceDesiredSelected(true);
                      setPaceGrowthSelected(false);
                  },
                });
              })}
            </View>
          ) : (
            <View style={s.rangeCapCard}>
              <Text style={s.rangeCapTitle}>HIGH CAPACITY</Text>
              <Text style={s.rangeCapText}>You are already at the highest preset.</Text>
            </View>
          )}
          <View style={s.ultimateIntention}>
            <View style={s.ultimateCheck}>
              <Feather name="check" size={14} color={c.onAccent} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ultimateLabel}>Ultimate Intention</Text>
              <Text style={s.ultimateTitle}>Complete full Quran over time</Text>
              <Text style={s.ultimateSub}>Your pace can evolve as you grow.</Text>
            </View>
          </View>
        </ScrollView>
        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ActionPill
            label="Choose Growth Style →"
            variant="primary"
            size="lg"
            disabled={!paceDesiredSelected || peakCapacityPerWeek <= ayahsPerWeek}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPaceStep(2);
            }}
          />
        </View>
      </>
    );

    // ── paceStep 2: Growth style ─────────────────────────────────────────────
    return (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => setPaceStep(1))}
          <Text style={s.screenTitle}>Set Your Goal</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <ScrollView
          ref={paceScrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.paceDateContent}
        >
          <Text style={s.paceStepHeadline}>How should we build you up?</Text>
          <Text style={s.paceStepSub}>The bridge between where you are and where you want to be.</Text>
          <View style={s.increaseChips}>
            {INCREASE_STYLE_OPTIONS.map((option) => {
              const selected = paceGrowthSelected && gradualIncreaseStyle === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[s.growthChoiceCard, selected && s.growthChoiceCardSelected]}
                  onPress={() => {
                  setGradualIncreaseStyle(option.value);
                  setPaceGrowthSelected(true);
                }}
                  activeOpacity={0.82}
                >
                  <Text style={[s.growthChoiceTitle, selected && s.growthChoiceTitleSelected]}>
                    {option.value === "gentle" ? "Slow &\nGentle" : option.label}
                  </Text>
                  <Text style={[s.growthChoiceSub, selected && s.growthChoiceSubSelected]}>{option.helper}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.growthNotice}>
            <Text style={s.growthNoticeText}>If you are not sure yet, just pick one for now — we'll adapt to your pace over time :)</Text>
          </View>
          {paceGrowthSelected && (
            <>
              <View style={s.weekPreview}>
                <View style={s.timelineRow}>
                  <View style={[s.timelineDot, s.timelineDotActive]} />
                  <Text style={s.timelineLabel}>Today</Text>
                  <Text style={s.timelineValue}>{formatPaceOptionLabel(capacityOptions.find(o => o.ayahsPerWeek === ayahsPerWeek)?.label ?? "")}</Text>
                </View>
                {growthMilestones.map((milestone) => (
                  <React.Fragment key={milestone.label}>
                    <View style={s.timelineArrow}><Feather name="arrow-down" size={20} color={c.accentSoft} /></View>
                    <View style={s.timelineRow}>
                      <View style={s.timelineDot} />
                      <Text style={s.timelineLabel}>In ~{formatWeeks(milestone.weeksToReach)}</Text>
                      <Text style={s.timelineValue}>{milestone.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
                <View style={s.timelineArrow}><Feather name="arrow-down" size={20} color={c.accentSoft} /></View>
                <View style={s.timelineRow}>
                  <View style={[s.timelineDot, s.timelineDotMuted]} />
                  <Text style={s.timelineLabel}>Estimated completion</Text>
                  <Text style={[s.timelineValue, s.timelineValueMuted]}>{autoWeeksNeeded ? formatWeeks(autoWeeksNeeded) : "—"}</Text>
                </View>
              </View>
              <View style={s.whyBox}>
                <Text style={s.whyTitle}>WHY THIS WORKS</Text>
                <Text style={s.whyText}>
                  {(() => {
                    const styleName = INCREASE_STYLE_OPTIONS.find((o) => o.value === gradualIncreaseStyle)?.label ?? "";
                    const lastMilestone = growthMilestones[growthMilestones.length - 1];
                    if (lastMilestone) {
                      return `${styleName} growth may help you reach ${lastMilestone.label} in ~${formatWeeks(lastMilestone.weeksToReach)}.`;
                    }
                    return `${styleName} growth reduces burnout while steadily increasing memorization capacity.`;
                  })()}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ActionPill
            label="See Completion Forecast →"
            variant="primary"
            size="lg"
            disabled={!paceGrowthSelected}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              advanceStep(3);
            }}
          />
        </View>
      </>
    );
  };

  // ── Step 1: Surah list ──────────────────────────────────────────────────────
  const renderSurahList = () => (
    <>
      <View style={[s.header, { paddingTop: 8 }]}>
        {renderHeaderBack(startAtPaceDate ? () => setStep(0) : onClose)}
        <Text style={s.screenTitle}>Select Surah</Text>
        <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      {renderProgressBar()}
      <View style={s.searchWrap}>
        <Feather name="search" size={15} color={c.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search surahs..."
          placeholderTextColor={c.textTertiary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>
      <FlatList
      data={filteredSurahs}
      keyExtractor={(item) => String(item.number)}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = selectedSurah?.number === item.number;
          const isCompleted = (memorizedCountBySurah[item.number] ?? 0) >= item.ayahCount;
          return (
            <TouchableOpacity
              style={s.listRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedSurah(item);
                setFirstAyah(null);
                setLastAyah(null);
                setActivePhase("first");
                advanceStep(2);
              }}
              activeOpacity={0.7}
            >
              <View style={s.listRowInfo}>
                <Text style={s.listRowTitle}>{item.englishName}</Text>
                <Text style={s.listRowSub}>{item.ayahCount} ayahs</Text>
                {isCompleted && <MemorizedBadge />}
              </View>
              <Text style={s.listRowArabic}>{item.name}</Text>
              {isSelected ? (
                <View style={s.checkCircle}>
                  <Feather name="check" size={14} color={c.onAccent} />
                </View>
              ) : (
                <Feather name="chevron-right" size={16} color={c.disabledText} />
              )}
            </TouchableOpacity>
          );
        }}
    />
    </>
  );

  // ── Step 1: Juz list ───────────────────────────────────────────────────────
  const renderJuzList = () => (
    <>
      <View style={[s.header, { paddingTop: 8 }]}>
        {renderHeaderBack(startAtPaceDate ? () => setStep(0) : onClose)}
        <Text style={s.screenTitle}>Select Juz</Text>
        <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      {renderProgressBar()}
      <FlatList
        data={filteredJuzList}
        keyExtractor={(item) => String(item.juz)}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: group }) => {
          const isSelected = selectedJuz === group.juz;
          const juzAyahList = getJuzAyahs(group.juz);
          const juzStart = JUZ_STARTS[group.juz - 1];
          const startSurah = juzStart ? SURAH_DATA[juzStart.surah - 1] : null;
          const lastRef = juzAyahList[juzAyahList.length - 1];
          const endSurah = lastRef ? SURAH_DATA[lastRef.surahNumber - 1] : null;
          const subText = `${startSurah?.englishName ?? ""} ${juzStart?.ayah ?? ""} – ${endSurah?.englishName ?? ""} ${lastRef?.ayahNumber ?? ""}`;
          const juzMemorizedCount = juzAyahList.filter(a => memorizedSet.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
          const isJuzCompleted = juzAyahList.length > 0 && juzMemorizedCount === juzAyahList.length;

          return (
            <TouchableOpacity
              style={s.listRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedJuz(group.juz);
                setFirstAyah(null);
                setLastAyah(null);
                setActivePhase("first");
                advanceStep(2);
              }}
              activeOpacity={0.7}
            >
              <View style={s.listRowInfo}>
                <View style={s.juzTitleRow}>
                  <Text style={s.listRowTitle}>Juz {group.juz}</Text>
                  {group.name ? <Text style={s.juzNameText}>{group.name}</Text> : null}
                </View>
                <Text style={s.listRowSub}>{subText}</Text>
                {isJuzCompleted && <MemorizedBadge />}
              </View>
              {isSelected ? (
                <View style={s.checkCircle}>
                  <Feather name="check" size={14} color={c.onAccent} />
                </View>
              ) : (
                <Feather name="chevron-right" size={16} color={c.disabledText} />
              )}
            </TouchableOpacity>
          );
        }}
    />
    </>
  );

  // ── Step 1 (paceDate): Combined Surah / Juz range selection ─────────────────
  const renderPaceDateRangeSelection = () => {
    const rangeHeader = (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => { setStep(0); setPaceStep(2); })}
          <Text style={s.screenTitle}>Select Range</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <View style={s.rangeTabBar}>
          <TouchableOpacity
            style={[s.rangeTab, paceRangeTab === "surah" && s.rangeTabActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPaceRangeTab("surah"); setSelectedSurah(null); setFirstAyah(null); setLastAyah(null); }}
          >
            <Text style={[s.rangeTabText, paceRangeTab === "surah" && s.rangeTabTextActive]}>Surah</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.rangeTab, paceRangeTab === "juz" && s.rangeTabActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPaceRangeTab("juz"); setSelectedJuz(null); setFirstAyah(null); setLastAyah(null); }}
          >
            <Text style={[s.rangeTabText, paceRangeTab === "juz" && s.rangeTabTextActive]}>Juz</Text>
          </TouchableOpacity>
        </View>
        <View style={s.searchWrap}>
          <Feather name="search" size={15} color={c.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder={paceRangeTab === "surah" ? "Search surahs..." : "Search juz..."}
            placeholderTextColor={c.textTertiary}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
      </>
    );
    return (
      <>
        {rangeHeader}
        {paceRangeTab === "surah" ? (
          <FlatList
            data={filteredSurahs}
            keyExtractor={(item) => String(item.number)}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = selectedSurah?.number === item.number;
              return (
                <TouchableOpacity
                  style={s.listRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedSurah(item);
                    setFirstAyah(null);
                    setLastAyah(null);
                    setActivePhase("first");
                    advanceStep(2);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={s.listRowInfo}>
                    <Text style={s.listRowTitle}>{item.englishName}</Text>
                    <Text style={s.listRowSub}>{item.ayahCount} ayahs</Text>
                  </View>
                  <Text style={s.listRowArabic}>{item.name}</Text>
                  {isSelected ? (
                    <View style={s.checkCircle}><Feather name="check" size={14} color={c.onAccent} /></View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={c.disabledText} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <FlatList
            data={filteredJuzList}
            keyExtractor={(item) => String(item.juz)}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
        renderItem={({ item: group }) => {
          const isSelected = selectedJuz === group.juz;
          const juzAyahList = getJuzAyahs(group.juz);
          const juzStart = JUZ_STARTS[group.juz - 1];
          const startSurah = juzStart ? SURAH_DATA[juzStart.surah - 1] : null;
          const lastRef = juzAyahList[juzAyahList.length - 1];
          const endSurah = lastRef ? SURAH_DATA[lastRef.surahNumber - 1] : null;
          const subText = `${startSurah?.englishName ?? ""} ${juzStart?.ayah ?? ""} – ${endSurah?.englishName ?? ""} ${lastRef?.ayahNumber ?? ""}`;
          return (
            <TouchableOpacity
              style={s.listRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedJuz(group.juz);
                setFirstAyah(null);
                setLastAyah(null);
                setActivePhase("first");
                advanceStep(2);
              }}
              activeOpacity={0.7}
            >
              <View style={s.listRowInfo}>
                <View style={s.juzTitleRow}>
                  <Text style={s.listRowTitle}>Juz {group.juz}</Text>
                  {group.name ? <Text style={s.juzNameText}>{group.name}</Text> : null}
                </View>
                <Text style={s.listRowSub}>{subText}</Text>
              </View>
              {isSelected ? (
                <View style={s.checkCircle}><Feather name="check" size={14} color={c.onAccent} /></View>
              ) : (
                <Feather name="chevron-right" size={16} color={c.disabledText} />
              )}
            </TouchableOpacity>
          );
        }}
          />
        )}
      </>
    );
  };

  // ── Step 2: Ayah range selection ───────────────────────────────────────────
  const renderAyahSelection = () => {
    const backLabel =
      activePath === "juz" ? `Juz ${selectedJuz}` : (selectedSurah?.englishName ?? "");
    const cardTitle =
      activePath === "surah"
        ? selectedSurah?.englishName ?? ""
        : `Juz ${selectedJuz} — ${JUZ_NAMES[(selectedJuz ?? 1) - 1] ?? ""}`;
    const cardSub =
      activePath === "surah" ? `${selectedSurah?.ayahCount} ayahs` : getJuzSubtitle();

    const memorizedRange = getLeadingMemorizedRange();
    const firstIsSet = firstAyah !== null;
    const lastIsSet = lastAyah !== null;
    const between = getAyahsBetween();

    const firstLabel =
      firstAyah
        ? activePath === "juz"
          ? `${firstAyah.surahName}, Ayah ${firstAyah.ayahNumber}`
          : `Ayah ${firstAyah.ayahNumber}`
        : "Tap to select";

    const lastLabel =
      lastAyah
        ? activePath === "juz"
          ? `${lastAyah.surahName}, Ayah ${lastAyah.ayahNumber}`
          : `Ayah ${lastAyah.ayahNumber}`
        : "Tap to select";

    return (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => {
              if (startAtAyahSelection) {
                onClose();
                return;
              }
              if (startAtPaceDate) {
                setFirstAyah(null);
                setLastAyah(null);
                setActivePhase("first");
              }
              setStep(1);
            })}
          <Text style={s.screenTitle}>{backLabel}</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <ScrollView
          ref={ayahScrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.ayahScrollContent}
        >

          <View style={s.resetCtaWrap}>
            <ActionPill
              label="Reset"
              variant="soft"
              size="sm"
              style={s.resetCta}
              onPress={() => setResetVisible(true)}
            />
          </View>
          {/* Surah / Juz info card */}
          <View style={s.infoCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.infoCardTitle}>{cardTitle}</Text>
              <Text style={s.infoCardSub}>{cardSub}</Text>
            </View>
            {activePath === "surah" && (
              <Text style={s.infoCardArabic}>{selectedSurah?.name}</Text>
            )}
            {activePath === "juz" && (
              <View style={s.juzBadge}>
                <Text style={s.juzBadgeText}>{selectedJuz}</Text>
              </View>
            )}
          </View>

          {/* First / Last mini-cards */}
          <View style={s.phaseCardsRow}>
            <TouchableOpacity
              style={[s.phaseCard, (startAtPaceDate ? !firstIsSet : activePhase === "first") && s.phaseCardActive]}
              onPress={() => !startAtPaceDate && setActivePhase("first")}
              activeOpacity={startAtPaceDate ? 1 : 0.8}
            >
              {firstIsSet ? (
                <Feather name="check-circle" size={10} color={c.appSuccess} style={s.phaseCardIcon} />
              ) : (
                <View style={s.phaseDot} />
              )}
              <Text style={s.phaseLabel}>FIRST AYAH</Text>
              <Text style={firstIsSet ? s.phaseValue : s.phasePlaceholder}>{firstLabel}</Text>
            </TouchableOpacity>

            <Feather name="arrow-right" size={14} color={c.disabledText} style={s.phaseArrow} />

            {startAtPaceDate ? (
              <View style={[s.phaseCard, lastIsSet && s.phaseCardActive]}>
                {lastIsSet ? (
                  <>
                    <View style={s.autoLastTopRow}>
                      <View style={s.autoBadgePill}><Text style={s.autoBadgePillText}>AUTO</Text></View>
                      <Text style={s.phaseLabel}>LAST AYAH</Text>
                    </View>
                    <Text style={s.phaseValue}>{lastLabel}</Text>
                  </>
                ) : (
                  <>
                    <View style={[s.phaseDot, { backgroundColor: c.borderSubtle }]} />
                    <Text style={[s.phaseLabel, { color: c.disabledText }]}>LAST AYAH</Text>
                    <Text style={[s.phasePlaceholder, { color: c.borderSubtle }]}>Auto-calculated</Text>
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  s.phaseCard,
                  activePhase === "last" && firstIsSet && s.phaseCardActive,
                  !firstIsSet && s.phaseCardMuted,
                ]}
                onPress={() => firstIsSet && setActivePhase("last")}
                activeOpacity={firstIsSet ? 0.8 : 1}
              >
                <View
                  style={[
                    s.phaseDot,
                    lastIsSet
                      ? { backgroundColor: c.accentPrimary }
                      : firstIsSet
                      ? { backgroundColor: c.textTertiary }
                      : { backgroundColor: c.borderSubtle },
                  ]}
                />
                <Text style={[s.phaseLabel, !firstIsSet && { color: c.disabledText }]}>LAST AYAH</Text>
                <Text
                  style={[
                    lastIsSet ? s.phaseValue : s.phasePlaceholder,
                    !firstIsSet && { color: c.borderSubtle },
                  ]}
                >
                  {lastLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hint row */}
          {startAtPaceDate ? (
            firstIsSet && lastIsSet ? (
              <InlineNotice
                variant="success"
                density="compact"
                description={`Range set · ${totalRangeAyahs} ayahs (Ayah ${firstAyah!.ayahNumber} → ${lastAyah!.ayahNumber})`}
                style={{ marginBottom: 10 }}
              />
            ) : (
              <InlineNotice
                variant="info"
                density="compact"
                description="Tap your starting ayah — last ayah will auto-calculate based on your goal"
                style={{ marginBottom: 10 }}
              />
            )
          ) : firstIsSet && lastIsSet ? (
            <InlineNotice
              variant="neutral"
              density="compact"
              icon={false}
              description={`= range (${between} ayahs between)`}
              style={{ marginBottom: 10 }}
            />
          ) : (
            <InlineNotice
              variant="info"
              density="compact"
              icon="clock"
              description={hintText()}
              style={{ marginBottom: 10 }}
            />
          )}

          {/* Memorized banner — surah path, first phase only */}
          {activePath === "surah" && (startAtPaceDate ? !firstIsSet : activePhase === "first") && memorizedRange && (
            <InlineNotice
              variant="success"
              density="compact"
              description={`${memorizedRange} already memorized`}
              style={{ marginBottom: 10 }}
            />
          )}

          {/* Revision intent banner — entire selected range is memorized */}
          {isRevisionMode && (
            <InlineNotice
              variant="warning"
              density="compact"
              icon="refresh-cw"
              description="This memorized range will become a revision track."
              style={{ marginBottom: 10 }}
            />
          )}

          {/* Ayah grid */}
          {activePath === "surah" ? (
            <>
              <View style={s.ayahGrid}>
                {Array.from({ length: selectedSurah?.ayahCount ?? 0 }, (_, i) => i + 1).map(
                  (n) => renderAyahBubble(selectedSurah!.number, selectedSurah!.englishName, n)
                )}
              </View>
              {(selectedSurah?.ayahCount ?? 0) > 56 && (
                <Text style={s.gridCaption}>
                  Showing 1–56 · scroll to see all {selectedSurah?.ayahCount} ayahs
                </Text>
              )}
            </>
          ) : (
            juzGroups.map((group) => (
              <View key={group.surah.number} style={s.juzGroupSection}>
                <View style={s.juzGroupHeader}>
                  <Text style={s.juzGroupTitle}>{group.surah.englishName}</Text>
                  <Text style={s.juzGroupArabic}>{group.surah.name}</Text>
                </View>
                <View style={s.ayahGrid}>
                  {group.ayahs.map((n) =>
                    renderAyahBubble(group.surah.number, group.surah.englishName, n)
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Confirm button */}
        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ActionPill
            label={
              startAtPaceDate
                ? canConfirm
                  ? "See Completion Forecast →"
                  : "Tap your starting ayah"
                : canConfirm
                ? "Next: Weekly Goal →"
                : "Select First & Last Ayah"
            }
            variant="primary"
            size="lg"
            disabled={!canConfirm}
            onPress={handleConfirm}
          />
        </View>
      </>
    );
  };

  // ── Step 3: Weekly Goal ─────────────────────────────────────────────────────
  const renderWeeklyGoal = () => {
    const isRevision = isRevisionMode;
    const revisionMax = isRevision ? Math.min(MAX_WEEKLY, totalRangeAyahs) : dynamicMax;
    const isJuz = path === "juz";
    const surahOrJuzLabel = isJuz ? `Juz ${selectedJuz}` : (selectedSurah?.englishName ?? "");
    const startingAyahLabel = firstAyah
      ? isJuz
        ? `${firstAyah.surahName} ${firstAyah.ayahNumber}`
        : `${selectedSurah?.englishName ?? ""} ${firstAyah.ayahNumber}`
      : "—";
    const endingAyahLabel = lastAyah
      ? isJuz
        ? `${lastAyah.surahName} ${lastAyah.ayahNumber}`
        : `${selectedSurah?.englishName ?? ""} ${lastAyah.ayahNumber}`
      : "—";

    return (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => startAtWeeklyGoal ? onClose() : setStep(2))}
          <Text style={s.screenTitle}>{isRevision ? "Set Weekly Revision" : "Set Your Weekly Goal"}</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.weeklyContent}
        scrollEnabled={weeklyScrollEnabled}
      >
          {/* Surah / Juz title */}
          <Text style={s.weeklyGoalTitle}>
            {isJuz
              ? `Juz ${selectedJuz} — ${JUZ_NAMES[(selectedJuz ?? 1) - 1] ?? ""}`
              : (selectedSurah?.englishName ?? "")}
          </Text>

          <Text style={s.targetLabel}>{isRevision ? "REVISION VOLUME" : "TARGET VOLUME"}</Text>
          <Text style={s.targetNum}>{clampedAyahsPerWeek}</Text>
          <Text style={s.targetUnit}>{isRevision ? "Ayahs to revisit" : "Ayahs per week"}</Text>

          <InlineNotice
            variant={isRevision ? "warning" : "info"}
            density="compact"
            icon={isRevision ? "refresh-cw" : "info"}
            description={
              isRevision
                ? <>All <Text style={s.dynamicLimitBold}>{totalRangeAyahs}</Text> selected ayahs are already memorized</>
                : <>Max <Text style={s.dynamicLimitBold}>{dynamicMax}</Text> ayahs available in your selected range</>
            }
            style={{ marginBottom: 18 }}
          />

          <View style={s.sliderRangeRow}>
            <Text style={s.sliderRangeText}>1</Text>
            <Text style={s.sliderRangeText}>{revisionMax}</Text>
          </View>
          <AyahSlider
            value={clampedAyahsPerWeek}
            onChange={(v) => setAyahsPerWeek(Math.min(v, revisionMax))}
            maxValue={revisionMax}
            onDragStart={() => setWeeklyScrollEnabled(false)}
            onDragEnd={() => setWeeklyScrollEnabled(true)}
          />

          <View style={[s.weeklyPreviewCard, isRevision && s.weeklyPreviewCardRevision]}>
            <View style={s.weeklyPreviewIcon}>
              <Feather name={isRevision ? "refresh-cw" : "target"} size={15} color={isRevision ? c.appWarning : c.textPrimary} />
            </View>
            <View style={s.weeklyPreviewTextWrap}>
              <Text style={[s.weeklyPreviewLabel, isRevision && s.weeklyPreviewLabelRevision]}>
                {isRevision ? "REVISION FOCUS" : "THIS WEEK"}
              </Text>
              <Text style={s.weeklyPreviewRange}>{weeklyPreviewRangeLabel}</Text>
              <Text style={s.weeklyPreviewSub}>
                {isRevision
                  ? `${totalRangeAyahs} ayahs to revisit`
                  : `${weeklyPreviewAyahs.length} of ${clampedAyahsPerWeek} ayahs selected`}
              </Text>
            </View>
          </View>

          {/* Finish date card — updates live as slider moves */}
          {remainingRangeAyahs > 0 && (
            <View style={s.finishDateCard}>
              <Feather name="calendar" size={18} color={c.textTertiary} style={{ marginBottom: 6 }} />
              <Text style={s.finishDateCardLabel}>FINISH DATE</Text>
              <Text style={s.finishDateCardDate}>
                {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + Math.ceil(remainingRangeAyahs / clampedAyahsPerWeek) * 7);
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                })()}
              </Text>
              <Text style={s.finishDateCardSub}>
                {Math.ceil(remainingRangeAyahs / clampedAyahsPerWeek)} weeks · {clampedAyahsPerWeek} ayahs/week
              </Text>
            </View>
          )}

          <Text style={[s.commitmentLabel, isRevision && s.commitmentLabelRevision]}>
            {isRevision ? "REVISION RHYTHM" : "WEEKLY COMMITMENT STEPS"}
          </Text>
          <View style={s.dots}>
            {COMMITMENT_STEPS.filter((cs) => cs <= revisionMax).map((cs) => (
              <View key={cs} style={[s.dot, clampedAyahsPerWeek >= cs && s.dotFilled]} />
            ))}
          </View>

          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{isJuz ? "Juz" : "Surah"}</Text>
              <Text style={s.summaryValue}>{surahOrJuzLabel}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Starting Ayah</Text>
              <Text style={s.summaryValue}>{startingAyahLabel}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Ending Ayah</Text>
              <Text style={s.summaryValue}>{endingAyahLabel}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Weekly Goal</Text>
              <Text style={[s.summaryValue, s.summaryValueBold]}>{clampedAyahsPerWeek} Ayahs</Text>
            </View>
          </View>

          <View style={s.infoPager}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setInfoPage(Math.round(e.nativeEvent.contentOffset.x / infoPageWidth))
              }
            >
              <View style={[s.wkInfoCard, { width: infoPageWidth }]}>
                <Text style={s.wkInfoCardTitle}>SUSTAINABLE PACE</Text>
                <Text style={s.wkInfoCardText}>
                  3 to 10 Ayahs daily is considered a sustainable memorization pace and may lead to completing the Quran in approximately 2 to 6 years.
                </Text>
              </View>
              <View style={[s.wkInfoCard, { width: infoPageWidth }]}>
                <Text style={s.wkInfoCardTitle}>WEEKLY MAXIMUM</Text>
                <Text style={s.wkInfoCardText}>
                  We recommend a maximum of <Text style={s.wkInfoCardBold}>70 Ayahs per week</Text>. If you want to learn more, you can always come back and set a new goal upon completion.
                </Text>
              </View>
            </ScrollView>
            <View style={s.infoPagerDots}>
              {[0, 1].map((i) => (
                <View key={i} style={[s.infoPagerDot, i === infoPage && s.infoPagerDotActive]} />
              ))}
            </View>
          </View>

          {isRevision ? (
            <View style={s.revisionEstimateCard}>
              <Text style={s.revisionEstimateTitle}>YOU'RE STRENGTHENING YOUR HIFZ</Text>
              <Text style={s.revisionEstimateText}>
                Reviewing what you carry is as valuable as memorizing what's ahead.{"\n"}
                Murajaah is a pillar of Hifz.
              </Text>
            </View>
          ) : (
            <View style={s.estimateCard}>
              <Text style={s.estimateLabel}>YOUR COMPLETION ESTIMATE</Text>
              <Text style={s.estimateText}>
                At <Text style={s.estimateBold}>{clampedAyahsPerWeek} Ayahs per week</Text>, you will finish memorizing your selected range in{" "}
                <Text style={s.estimateBold}>{estimateCompletion(remainingRangeAyahs, clampedAyahsPerWeek)}</Text>.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ActionPill
            label={isRevision ? "Begin Revision →" : startAtPaceDate ? "Begin My Hifz Journey →" : confirmLabel}
            variant="primary"
            size="lg"
            onPress={handleFinalConfirm}
          />
        </View>
      </>
    );
  };

  // ── Step 3 (paceDate): Completion Forecast ────────────────────────────────
  const renderForecast = () => {
    const weeksNeeded = autoWeeksNeeded ?? 0;
    const timeLabel = formatWeeks(weeksNeeded);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + weeksNeeded * 7);
    const completionMonth = getIslamicMonthName(completionDate);
    const completionLabel = completionMonth.toLowerCase().includes("ramadan")
      ? `Ramadan ${completionDate.getFullYear()}`
      : `~${timeLabel}`;
    const peakRampWeeks = growthMilestones[growthMilestones.length - 1]?.weeksToReach ?? 0;
    const selectedPeakLabel = desiredCapacityOptions.find((option) => option.ayahsPerWeek === peakCapacityPerWeek)?.label
      ?? `${Math.round(peakCapacityPerWeek / 7)} ayahs/day`;

    return (
      <>
        <View style={[s.header, { paddingTop: 8 }]}>
          {renderHeaderBack(() => {
              setStep(0);
              setPaceStep(2);
            })}
          <Text style={s.screenTitle}>Forecast</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <ScrollView ref={forecastScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.paceDateContent}>
          <Text style={s.paceStepHeadline}>Your Hifz Path</Text>
          <Text style={s.paceStepSub}>Here's what your journey looks like.</Text>

          <View style={s.forecastInfoCard}>
            <Text style={s.forecastInfoLabel}>DAILY STARTING PACE</Text>
            <Text style={s.forecastInfoValue}>{formatPaceOptionLabel(capacityOptions.find(o => o.ayahsPerWeek === ayahsPerWeek)?.label ?? "")}</Text>
            <Text style={s.forecastInfoSub}>Starting where you are. Growing from here.</Text>
          </View>

          <View style={s.forecastInfoCard}>
            <Text style={s.forecastInfoLabel}>EXPECTED GROWTH</Text>
            <Text style={s.forecastInfoValue}>{selectedPeakLabel.replace(" daily", "/day")}</Text>
            <Text style={s.forecastInfoSub}>reached in approximately {formatWeeks(peakRampWeeks)}</Text>
          </View>

          <View style={s.forecastCard}>
            <Text style={s.forecastLabel}>ESTIMATED COMPLETION</Text>
            <Text style={s.forecastTime}>{completionLabel}</Text>
            <Text style={s.forecastDate}>Inshallah</Text>
            <Text style={s.forecastSub}>{timeLabel} at your selected pace</Text>
          </View>

          <View style={[s.insightBox, s.insightBoxFullHifz]}>
            <View style={s.insightHeader}>
              <Feather
                name="trending-up"
                size={14}
                color={c.textTertiary}
              />
              <Text style={[s.insightTitle, s.insightTitleFullHifz]}>Adaptive Memorization Guidance</Text>
            </View>
            <Text style={[s.insightText, s.insightTextFullHifz]}>
              This forecast adapts over time based on your memorization pace, consistency, and progress.
            </Text>
            <Text style={[s.insightText, s.insightTextFullHifz, s.insightTextSecondLine]}>
              Your completion estimate may change as your learning rhythm evolves.
            </Text>
          </View>
        </ScrollView>

        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ActionPill
            label="Begin My Hifz Journey →"
            variant="primary"
            size="lg"
            onPress={handleFinalConfirm}
          />
        </View>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType={modalAnimationType} onRequestClose={onClose}>
      <View style={[s.sheet, { paddingTop: insets.top }]}>
        {step === 0
          ? renderPaceDate()
          : step === 1
          ? startAtPaceDate
            ? renderForecast()
            : path === "surah"
            ? renderSurahList()
            : renderJuzList()
          : step === 2
          ? renderAyahSelection()
          : startAtPaceDate
          ? renderForecast()
          : renderWeeklyGoal()}

        <AppDialog
          visible={resetVisible}
          title="Reset Progress?"
          message={`This will remove memorized marks from this ${path === "juz" ? "Juz" : "Surah"}. You can mark them again anytime.`}
          confirmLabel="Reset My Progress"
          variant="destructive"
          onConfirm={handleReset}
          onCancel={() => setResetVisible(false)}
        />
      </View>
    </Modal>
  );
}

function createStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
  sheet: { flex: 1, backgroundColor: c.hifzBackground },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: c.hifzBackground,
  },
  navBtn: {
    width: 64,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cancelText: {
    fontSize: 16,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle,
    gap: 12,
  },
  listRowInfo: { flex: 1 },
  listRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  listRowSub: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  listRowArabic: { fontSize: 16, color: c.textTertiary },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  juzTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  juzNameText: { fontSize: 13, color: c.textTertiary, fontFamily: "Inter_400Regular" },

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  ayahScrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  infoCardSub: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  infoCardArabic: { fontSize: 20, color: c.textTertiary, marginLeft: 12 },
  juzBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  juzBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },

  phaseCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    marginBottom: 10,
  },
  phaseCard: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 68,
  },
  phaseCardActive: { borderColor: c.textPrimary, backgroundColor: c.surfaceElevated },
  phaseCardMuted: { opacity: 0.5 },
  phaseCardIcon: { marginBottom: 4 },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.textTertiary,
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  phaseValue: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  phasePlaceholder: {
    fontSize: 13,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  phaseArrow: { alignSelf: "center", flexShrink: 0 },

  ayahGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  ayahBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.appStone,
    alignItems: "center",
    justifyContent: "center",
  },
  ayahBubbleSelected: { backgroundColor: c.accentPrimary },
  ayahBubbleInRange: { backgroundColor: c.accentSoft },
  ayahBubbleDisabled: { backgroundColor: c.disabledBackground, opacity: 0.45 },
  ayahBubbleMemorized: {
    backgroundColor: c.successSoft,
    borderWidth: 1.5,
    borderColor: c.appSuccess,
  },
  ayahBubbleMemorizedDisabled: {
    backgroundColor: c.successSoft,
    borderWidth: 1,
    borderColor: c.appSuccess,
    opacity: 0.55,
  },
  ayahBubbleText: {
    fontSize: 13,
    fontWeight: "600",
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  ayahBubbleTextSelected: { color: c.onAccent },
  ayahBubbleTextInRange: { color: c.textSecondary },
  ayahBubbleTextDisabled: { color: c.disabledText },

  gridCaption: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 10,
  },

  juzGroupSection: { marginBottom: 16 },
  juzGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle,
  },
  juzGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  juzGroupArabic: { fontSize: 16, color: c.textTertiary },

  confirmWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.overlayChrome,
  },

  // ── Progress bar ────────────────────────────────────────────────────────────
  stepProgress: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle,
  },
  stepProgressTrack: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  stepSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.borderSubtle,
  },
  stepSegFilled: {
    backgroundColor: c.accentPrimary,
  },
  stepLabels: {
    flexDirection: "row",
  },
  paceStepTab: {
    alignItems: "center",
    flex: 1,
    minWidth: 64,
    paddingBottom: 10,
  },
  paceStepUnderline: {
    position: "absolute",
    bottom: 0,
    width: "100%" as any,
    height: 2,
    borderRadius: 2,
    backgroundColor: c.accentPrimary,
  },
  stepLabelCell: {
    flex: 1,
    alignItems: "flex-start",
  },
  stepLabelText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: c.accentSoft,
  },
  stepLabelActive: {
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stepLabelTappable: {
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  resetCtaWrap: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  resetCta: {
    minHeight: 34,
    paddingHorizontal: 14,
  },
  // ── Step 3: Weekly Goal ─────────────────────────────────────────────────────
  weeklyContent: { paddingHorizontal: 20, paddingBottom: 16 },

  weeklyGoalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  targetLabel: {
    fontSize: 12, fontWeight: "700", color: c.textTertiary,
    letterSpacing: 1.5, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 6,
  },
  targetNum: {
    fontSize: 80, fontWeight: "700", color: c.textPrimary,
    fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 90,
  },
  targetUnit: {
    fontSize: 15, color: c.textTertiary, fontFamily: "Inter_400Regular",
    textAlign: "center", marginBottom: 10,
  },
  dynamicLimitBold: { fontFamily: "Inter_700Bold", color: c.textPrimary },
  sliderRangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sliderRangeText: { fontSize: 12, color: c.textTertiary, fontFamily: "Inter_400Regular" },
  sliderContainer: { height: 44, justifyContent: "center", marginBottom: 4 },
  sliderTrack: { height: 3, backgroundColor: c.borderSubtle, borderRadius: 2 },
  sliderFill: { position: "absolute", height: 3, backgroundColor: c.accentPrimary, borderRadius: 2 },
  sliderThumb: {
    position: "absolute", top: -11.5,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: c.accentPrimary,
    shadowColor: c.shadowNeutral, shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },
  weeklyPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.appStone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  weeklyPreviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyPreviewTextWrap: { flex: 1 },
  weeklyPreviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  weeklyPreviewRange: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  weeklyPreviewSub: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  finishDateCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  finishDateCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  finishDateCardDate: {
    fontSize: 22,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  finishDateCardSub: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
  },

  commitmentLabel: {
    fontSize: 12, fontWeight: "700", color: c.textTertiary, letterSpacing: 1.2,
    fontFamily: "Inter_700Bold", textTransform: "uppercase",
    textAlign: "center", marginTop: 12, marginBottom: 10,
  },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.borderSubtle },
  dotFilled: { backgroundColor: c.accentPrimary },
  summaryCard: {
    backgroundColor: c.backgroundPrimary, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderSubtle,
    paddingHorizontal: 16, marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 12,
  },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.borderSubtle },
  summaryLabel: { fontSize: 13, color: c.textTertiary, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
  summaryValueBold: { fontFamily: "Inter_700Bold" },
  infoPager: { marginBottom: 12, overflow: "hidden" },
  infoPagerDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8 },
  infoPagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderSubtle },
  infoPagerDotActive: { backgroundColor: c.accentPrimary },
  wkInfoCard: { backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 16 },
  wkInfoCardTitle: {
    fontSize: 12, fontWeight: "700", color: c.textPrimary, fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  wkInfoCardText: { fontSize: 12, color: c.textTertiary, fontFamily: "Inter_400Regular", lineHeight: 20 },
  wkInfoCardBold: { fontFamily: "Inter_700Bold", color: c.textPrimary },
  estimateCard: {
    backgroundColor: c.accentPrimary, borderRadius: 12, padding: 16, marginBottom: 16, gap: 4,
  },
  estimateLabel: {
    fontSize: 12, fontWeight: "700", color: c.onAccent, fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase",
  },
  estimateText: { fontSize: 14, color: c.onAccent, fontFamily: "Inter_400Regular", lineHeight: 22 },
  estimateBold: { fontFamily: "Inter_700Bold", color: c.onAccent },

  // ── Revision mode styles ─────────────────────────────────────────────────────
  weeklyPreviewCardRevision: {
    backgroundColor: c.warningSoft,
    borderColor: c.appWarning,
    borderWidth: 1,
  },
  weeklyPreviewLabelRevision: {
    color: c.appWarning,
  },
  commitmentLabelRevision: {
    color: c.appWarning,
  },
  revisionEstimateCard: {
    backgroundColor: c.warningSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.appWarningLight,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  revisionEstimateTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.appWarning,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  revisionEstimateText: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  // ── Step 0: Pace + Date ─────────────────────────────────────────────────────
  paceDateContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 12 },

  paceSectionCard: {
    backgroundColor: c.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    padding: 16,
  },
  paceSectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  paceSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  styleSectionCard: {
    backgroundColor: c.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    padding: 16,
  },
  stepOverviewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  styleOptions: {
    gap: 10,
    marginTop: 12,
  },
  styleOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    backgroundColor: c.backgroundPrimary,
    padding: 12,
  },
  styleOptionSelected: {
    borderColor: c.textPrimary,
    backgroundColor: c.surfaceElevated,
  },
  styleOptionDisabled: {
    backgroundColor: c.disabledBackground,
    borderColor: c.borderSubtle,
    opacity: 0.72,
  },
  styleOptionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: c.textPrimary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accentPrimary,
  },
  styleTextWrap: {
    flex: 1,
  },
  styleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  styleSub: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  miniBars: {
    width: 38,
    height: 26,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 3,
  },
  miniBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: c.accentPrimary,
  },
  peakCapacityGrid: {
    gap: 8,
  },
  paceChoiceStack: {
    gap: 12,
  },
  paceChoiceCard: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  paceChoiceCardSelected: {
    backgroundColor: c.accentPrimary,
  },
  paceChoiceText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  paceChoiceTextSelected: {
    color: c.onAccent,
  },
  peakCapacityRow: {
    flexDirection: "row",
    gap: 8,
  },
  gradualPanel: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    padding: 12,
    gap: 12,
  },
  gradualLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  increaseChips: {
    flexDirection: "row",
    gap: 8,
  },
  growthChoiceCard: {
    flex: 1,
    minHeight: 98,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  growthChoiceCardSelected: {
    backgroundColor: c.accentPrimary,
  },
  growthChoiceTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  growthChoiceTitleSelected: {
    color: c.onAccent,
  },
  growthChoiceSub: {
    fontSize: 12,
    lineHeight: 14,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  growthChoiceSubSelected: {
    color: c.onAccent,
  },
  weekPreview: {
    borderRadius: 20,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 30,
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.textTertiary,
  },
  timelineDotActive: {
    backgroundColor: c.accentPrimary,
  },
  timelineDotMuted: {
    backgroundColor: c.accentSoft,
  },
  timelineLabel: {
    flex: 1,
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  timelineValueMuted: {
    color: c.textTertiary,
  },
  timelineArrow: {
    paddingLeft: 1,
    marginLeft: 6,
    height: 20,
    justifyContent: "center",
  },
  weekPreviewBars: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    rowGap: 10,
  },
  weekPreviewItem: {
    alignItems: "center",
    width: 32,
    gap: 3,
  },
  weekPreviewBarWrap: {
    height: 36,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  weekPreviewBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: c.accentPrimary,
  },
  weekPreviewLabel: {
    fontSize: 8,
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
  },
  weekPreviewCount: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
  },
  weekPreviewText: {
    fontSize: 12,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  // ── paceStep headlines ──────────────────────────────────────────────────────
  paceStepHeadline: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 0,
    marginBottom: 8,
  },
  paceStepSub: {
    fontSize: 13,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  paceStepSubStrong: {
    color: c.textSecondary,
    fontFamily: "Inter_700Bold",
  },
  whyBox: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxHeight: 110,
    overflow: "hidden",
  },
  whyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  whyText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  growthNotice: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  growthNoticeText: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  ultimateIntention: {
    borderTopWidth: 1,
    borderTopColor: c.borderSubtle,
    paddingTop: 12,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  ultimateCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: c.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  ultimateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  ultimateTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  ultimateSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // ── Surah / Juz tab bar ─────────────────────────────────────────────────────
  rangeTabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  rangeTabActive: {
    backgroundColor: c.surfaceElevated,
    shadowColor: c.shadowNeutral,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  rangeTabText: {
    fontSize: 14,
    color: c.textTertiary,
    fontFamily: "Inter_600SemiBold",
  },
  rangeTabTextActive: {
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },

  // ── Forecast card ───────────────────────────────────────────────────────────
  forecastCard: {
    backgroundColor: c.accentPrimary,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 4,
  },
  forecastLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.onAccent,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  forecastTime: {
    fontSize: 32,
    fontWeight: "700",
    color: c.onAccent,
    fontFamily: "Inter_700Bold",
    lineHeight: 38,
  },
  forecastDate: {
    fontSize: 13,
    fontStyle: "italic",
    color: c.onAccent,
    fontFamily: "Inter_400Regular",
  },
  forecastSub: {
    fontSize: 12,
    color: c.onAccent,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  forecastInfoCard: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  forecastInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textTertiary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  forecastInfoValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  forecastInfoSub: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  rangeCapCard: {
    backgroundColor: c.accentPrimary,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  rangeCapTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.onAccent,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  rangeCapText: {
    fontSize: 14,
    color: c.onAccent,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  rangeCapBold: {
    fontFamily: "Inter_700Bold",
    color: c.onAccent,
  },

  // ── Personalized Hifz Insight ───────────────────────────────────────────────
  insightBox: {
    backgroundColor: c.warningSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.appWarningLight,
    padding: 14,
    gap: 6,
  },
  insightBoxFullHifz: {
    backgroundColor: c.surfaceSecondary,
    borderColor: c.borderSubtle,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: c.appGold,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  insightTitleFullHifz: {
    color: c.textSecondary,
    fontSize: 12,
  },
  insightText: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  insightTextFullHifz: {
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 20,
  },
  insightTextSecondLine: {
    marginTop: 6,
    color: c.textTertiary,
  },
  insightBold: {
    fontFamily: "Inter_700Bold",
    color: c.textPrimary,
  },

  // ── Auto-last ayah (paceDate flow) ──────────────────────────────────────────
  autoLastTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  autoBadgePill: {
    backgroundColor: c.accentPrimary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  autoBadgePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.onAccent,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  autoLastBubbleBadge: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: c.backgroundPrimary,
  },
  autoLastBubbleBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: c.onAccent,
    fontFamily: "Inter_700Bold",
  },
  });
}
