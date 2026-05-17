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
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getJuzAyahs, JUZ_STARTS, SURAH_DATA, type AyahRef } from "@/constants/surahData";
import { searchByType } from "@/services/search";
import { ActionPill } from "@/components/ActionPill";
import { useQuran } from "@/contexts/QuranContext";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45, 70];
const MAX_WEEKLY = 70;

const FINISH_DURATION_OPTIONS = [
  { label: "1 wk", weeks: 1 },
  { label: "2 wks", weeks: 2 },
  { label: "1 mo", weeks: 4 },
  { label: "3 mo", weeks: 13 },
  { label: "6 mo", weeks: 26 },
  { label: "1 yr", weeks: 52 },
];

export type MemorizationStyle = "steady" | "gradual";
export type GradualIncreaseStyle = "gentle" | "medium" | "fast";

const INCREASE_STYLE_OPTIONS: Array<{
  value: GradualIncreaseStyle;
  label: string;
  helper: string;
}> = [
  { value: "gentle", label: "Gentle", helper: "Slow build" },
  { value: "medium", label: "Medium", helper: "Balanced" },
  { value: "fast", label: "Fast", helper: "Early push" },
];

function estimateCompletion(remaining: number, weeklyGoal: number): string {
  if (weeklyGoal <= 0 || remaining <= 0) return "completed";
  const days = Math.ceil(remaining / weeklyGoal) * 7;
  if (days >= 730) return `approximately ${Math.round(days / 365)} years`;
  if (days >= 365) return "approximately 1 year";
  if (days >= 60) return `approximately ${Math.round(days / 30)} months`;
  if (days >= 30) return "approximately 1 month";
  return `approximately ${days} days`;
}

function buildGradualWeeklyPlan({
  targetAyahsPerWeek,
  weeks,
  increaseStyle,
}: {
  targetAyahsPerWeek: number;
  weeks: number;
  increaseStyle: GradualIncreaseStyle;
}) {
  const safeWeeks = Math.max(1, weeks);
  const startWeekly = Math.max(1, targetAyahsPerWeek);
  const settings = {
    gentle: { endRatio: 1.35, curve: 1.2 },
    medium: { endRatio: 1.7, curve: 1.45 },
    fast: { endRatio: 2.25, curve: 1.9 },
  }[increaseStyle];

  return Array.from({ length: safeWeeks }, (_, index) => {
    if (safeWeeks === 1) return startWeekly;
    const t = index / (safeWeeks - 1);
    const eased = Math.pow(t, settings.curve);
    return Math.max(1, Math.round(startWeekly * (1 + (settings.endRatio - 1) * eased)));
  });
}

function AyahSlider({
  value, onChange, maxValue = MAX_WEEKLY, onDragStart, onDragEnd,
}: {
  value: number; onChange: (v: number) => void; maxValue?: number;
  onDragStart?: () => void; onDragEnd?: () => void;
}) {
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
  targetAyahsPerWeek?: number;
  finishWeeks?: number;
  memorizationStyle?: MemorizationStyle;
  gradualIncreaseStyle?: GradualIncreaseStyle;
  gradualWeeklyPlan?: number[];
}

interface Props {
  visible: boolean;
  path: "surah" | "juz";
  memorizedAyahKeys: string[];
  initialSelection?: AyahRangeResult;
  startAtWeeklyGoal?: boolean;
  startAtPaceDate?: boolean;
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
  confirmLabel = "Start Memorizing →",
  onConfirm,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { removeMemorizedAyahKeys } = useQuran();
  const { width: windowWidth } = useWindowDimensions();
  const infoPageWidth = windowWidth - 40;

  const [step, setStep] = useState<0 | 1 | 2 | 3>(1);
  const [maxStepReached, setMaxStepReached] = useState<0 | 1 | 2 | 3>(1);
  const [selectedFinishWeeks, setSelectedFinishWeeks] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [ayahsPerWeek, setAyahsPerWeek] = useState(10);
  const [memorizationStyle, setMemorizationStyle] = useState<MemorizationStyle>("steady");
  const [gradualIncreaseStyle, setGradualIncreaseStyle] = useState<GradualIncreaseStyle>("medium");
  const [infoPage, setInfoPage] = useState(0);
  const [weeklyScrollEnabled, setWeeklyScrollEnabled] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<typeof SURAH_DATA[0] | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [firstAyah, setFirstAyah] = useState<AyahRef | null>(null);
  const [lastAyah, setLastAyah] = useState<AyahRef | null>(null);
  const [activePhase, setActivePhase] = useState<"first" | "last">("first");
  const [resetVisible, setResetVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      const initialStep = (startAtPaceDate ? 0 : startAtWeeklyGoal && initialSelection ? 3 : 1) as 0 | 1 | 2 | 3;
      setStep(initialStep);
      setMaxStepReached(initialStep);
      setSelectedFinishWeeks(null);
      setSearch("");
      setSelectedSurah(initialSelection ? SURAH_DATA[initialSelection.first.surahNumber - 1] ?? null : null);
      setSelectedJuz(initialSelection?.juz ?? null);
      setFirstAyah(initialSelection?.first ?? null);
      setLastAyah(initialSelection?.last ?? null);
      setActivePhase("first");
      setAyahsPerWeek(initialSelection?.ayahsPerWeek ?? 10);
      setMemorizationStyle(initialSelection?.memorizationStyle ?? "steady");
      setGradualIncreaseStyle(initialSelection?.gradualIncreaseStyle ?? "medium");
      setResetVisible(false);
    }
  }, [visible, startAtPaceDate, startAtWeeklyGoal, initialSelection]);

  const advanceStep = (target: 0 | 1 | 2 | 3) => {
    setStep(target);
    setMaxStepReached((prev) => (Math.max(prev, target) as 0 | 1 | 2 | 3));
  };

  const juzAyahs = useMemo(() => {
    if (path === "juz" && selectedJuz != null) return getJuzAyahs(selectedJuz);
    return [];
  }, [path, selectedJuz]);

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
    if (path === "juz" && selectedJuz != null) return juzAyahs;
    if (path === "surah" && selectedSurah) {
      return Array.from({ length: selectedSurah.ayahCount }, (_, i) => ({
        surahNumber: selectedSurah.number,
        surahName: selectedSurah.englishName,
        ayahNumber: i + 1,
      }));
    }
    return [];
  }, [path, selectedJuz, juzAyahs, selectedSurah]);

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
    if (path === "surah") {
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
  }, [firstAyah, lastAyah, path, juzAyahs]);

  const unmemorizedRangeAyahs = useMemo(() => {
    if (!firstAyah || !lastAyah) return [];
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
    const lastIdx = source.findIndex(
      (a) => a.surahNumber === lastAyah.surahNumber && a.ayahNumber === lastAyah.ayahNumber
    );
    if (firstIdx < 0 || lastIdx < firstIdx) return [];
    return source.slice(firstIdx, lastIdx + 1).filter((ayah) => !memorized.has(`${ayah.surahNumber}:${ayah.ayahNumber}`));
  }, [firstAyah, lastAyah, path, juzAyahs, memorizedAyahKeys]);

  const remainingRangeAyahs = unmemorizedRangeAyahs.length;
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
  }, [path, weeklyPreviewAyahs]);

  useEffect(() => {
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, dynamicMax)));
  }, [dynamicMax]);

  // ── PaceDate flow helpers ──────────────────────────────────────────────────
  const gradualWeeklyPlan = useMemo(() => {
    if (!startAtPaceDate || !selectedFinishWeeks || memorizationStyle !== "gradual") return [];
    return buildGradualWeeklyPlan({
      targetAyahsPerWeek: ayahsPerWeek,
      weeks: selectedFinishWeeks,
      increaseStyle: gradualIncreaseStyle,
    });
  }, [ayahsPerWeek, gradualIncreaseStyle, memorizationStyle, selectedFinishWeeks, startAtPaceDate]);
  const autoCapacity = startAtPaceDate && selectedFinishWeeks
    ? memorizationStyle === "gradual"
      ? gradualWeeklyPlan.reduce((sum, week) => sum + week, 0)
      : ayahsPerWeek * selectedFinishWeeks
    : 0;
  const currentPaceAyahsPerWeek = memorizationStyle === "gradual"
    ? gradualWeeklyPlan[0] ?? buildGradualWeeklyPlan({ targetAyahsPerWeek: ayahsPerWeek, weeks: 5, increaseStyle: gradualIncreaseStyle })[0]
    : clampedAyahsPerWeek;
  const selectedDurationLabel = FINISH_DURATION_OPTIONS.find(o => o.weeks === selectedFinishWeeks)?.label ?? "";
  const finishDateDisplay = selectedFinishWeeks
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + selectedFinishWeeks * 7);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      })()
    : null;

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
    if (activePhase !== "last" || !firstAyah) return false;
    const pos = surahNum * 10000 + ayahNum;
    const firstPos = firstAyah.surahNumber * 10000 + firstAyah.ayahNumber;
    return pos < firstPos;
  };

  const handleAyahTap = (surahNumber: number, surahName: string, ayahNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Auto-last mode: tapping sets first and auto-calculates last
    if (startAtPaceDate && autoCapacity > 0) {
      const isCurrentFirst = firstAyah?.surahNumber === surahNumber && firstAyah?.ayahNumber === ayahNumber;
      if (isCurrentFirst) {
        setFirstAyah(null);
        setLastAyah(null);
        return;
      }
      if (path === "juz" && juzAyahs.length > 0) {
        const firstIdx = juzAyahs.findIndex(a => a.surahNumber === surahNumber && a.ayahNumber === ayahNumber);
        if (firstIdx >= 0) {
          const lastIdx = Math.min(firstIdx + autoCapacity - 1, juzAyahs.length - 1);
          setFirstAyah({ surahNumber, surahName, ayahNumber });
          setLastAyah(juzAyahs[lastIdx] ?? { surahNumber, surahName, ayahNumber });
        }
      } else {
        const surahData = SURAH_DATA.find(s => s.number === surahNumber);
        const maxAyah = surahData?.ayahCount ?? ayahNumber;
        setFirstAyah({ surahNumber, surahName, ayahNumber });
        setLastAyah({ surahNumber, surahName, ayahNumber: Math.min(ayahNumber + autoCapacity - 1, maxAyah) });
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
    if (path === "surah" && firstAyah.surahNumber === lastAyah.surahNumber) {
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
    if (path !== "surah" || !selectedSurah) return null;
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
    if (startAtPaceDate) {
      handleFinalConfirm();
      return;
    }
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, dynamicMax)));
    advanceStep(3);
  };

  const handleFinalConfirm = () => {
    if (!canConfirm) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      first: firstAyah!,
      last: lastAyah!,
      juz: selectedJuz ?? undefined,
      ayahsPerWeek: startAtPaceDate ? currentPaceAyahsPerWeek : clampedAyahsPerWeek,
      targetAyahsPerWeek: clampedAyahsPerWeek,
      finishWeeks: selectedFinishWeeks ?? undefined,
      memorizationStyle,
      gradualIncreaseStyle: memorizationStyle === "gradual" ? gradualIncreaseStyle : undefined,
      gradualWeeklyPlan: memorizationStyle === "gradual" ? gradualWeeklyPlan : undefined,
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
          <Feather name="check" size={12} color={showDisabledMemorized ? "#16A34A" : "#FFFFFF"} />
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

  // ── Progress bar (3-step) ──────────────────────────────────────────────────
  const renderProgressBar = () => {
    const fillCount = startAtPaceDate ? step + 1 : step;
    const labels = startAtPaceDate
      ? ["Pace + Date", path === "juz" ? "Juz" : "Surah", "Range"]
      : [path === "juz" ? "Juz" : "Surah", "Range", "Weekly Goal"];
    const activeIdx = startAtPaceDate ? (step as number) : step - 1;
    const stepForIdx = (i: number): 0 | 1 | 2 | 3 =>
      (startAtPaceDate ? i : i + 1) as 0 | 1 | 2 | 3;
    const labelAlignments: Array<"flex-start" | "center" | "flex-end"> = ["flex-start", "center", "flex-end"];

    return (
      <View style={s.stepProgress}>
        <View style={s.stepProgressTrack}>
          <View style={[s.stepSeg, s.stepSegFilled]} />
          <View style={[s.stepSeg, fillCount >= 2 && s.stepSegFilled]} />
          <View style={[s.stepSeg, fillCount >= 3 && s.stepSegFilled]} />
        </View>
        <View style={s.stepLabels}>
          {([0, 1, 2] as const).map((i) => {
            const targetStep = stepForIdx(i);
            const isActive = activeIdx === i;
            const canNav = targetStep !== step && targetStep <= maxStepReached;
            return (
              <TouchableOpacity
                key={i}
                style={[s.stepLabelCell, { alignItems: labelAlignments[i] }]}
                onPress={canNav ? () => setStep(targetStep) : undefined}
                activeOpacity={canNav ? 0.55 : 1}
                disabled={!canNav}
              >
                <Text style={[
                  s.stepLabelText,
                  isActive && s.stepLabelActive,
                  canNav && s.stepLabelTappable,
                ]}>
                  {labels[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Step 0: Pace + Date (alternative flow) ────────────────────────────────
  const renderPaceDate = () => {
    const canProceed = selectedFinishWeeks !== null;
    const hasFinishDate = selectedFinishWeeks !== null;
    const previewPlan = selectedFinishWeeks
      ? gradualWeeklyPlan
      : buildGradualWeeklyPlan({
          targetAyahsPerWeek: ayahsPerWeek,
          weeks: 5,
          increaseStyle: gradualIncreaseStyle,
        });
    const previewBars = Array.from({ length: Math.min(5, previewPlan.length) }, (_, index) => {
      const planIndex = previewPlan.length <= 5
        ? index
        : Math.round(index * (previewPlan.length - 1) / 4);
      return { week: planIndex + 1, count: previewPlan[planIndex] };
    });
    const previewMax = Math.max(1, ...previewBars.map((item) => item.count));
    return (
      <>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.screenTitle}>Set Your Goal</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {renderProgressBar()}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.paceDateContent}
          scrollEnabled={weeklyScrollEnabled}
        >
          {/* Weekly Pace Card */}
          <View style={s.paceSectionCard}>
            <View style={s.paceSectionTopRow}>
              <View>
                <Text style={s.stepEyebrow}>STEP 1</Text>
                <Text style={s.paceSectionLabel}>WEEKLY PACE</Text>
              </View>
              <View style={s.pacePill}>
                <Text style={s.pacePillText}>{ayahsPerWeek} ayahs / wk</Text>
              </View>
            </View>
            <View style={s.sliderRangeRow}>
              <Text style={s.sliderRangeText}>1</Text>
              <Text style={s.sliderRangeText}>{MAX_WEEKLY}</Text>
            </View>
            <AyahSlider
              value={ayahsPerWeek}
              onChange={setAyahsPerWeek}
              maxValue={MAX_WEEKLY}
              onDragStart={() => setWeeklyScrollEnabled(false)}
              onDragEnd={() => setWeeklyScrollEnabled(true)}
            />
          </View>

          {/* Finish Date Card */}
          <View style={[s.finishDateSection, !selectedFinishWeeks && s.finishDateSectionDashed]}>
            <View style={s.finishDateTopRow}>
              <View>
                <Text style={s.stepEyebrow}>STEP 2</Text>
                <Text style={s.paceSectionLabel}>FINISH DATE</Text>
              </View>
              {selectedFinishWeeks ? (
                <View style={s.finishDatePill}>
                  <Text style={s.finishDatePillText}>{finishDateDisplay}</Text>
                </View>
              ) : (
                <Text style={s.finishDateNotSet}>not set</Text>
              )}
            </View>
            <View style={s.durationChipsRow}>
              {FINISH_DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[s.durationChip, selectedFinishWeeks === opt.weeks && s.durationChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedFinishWeeks(opt.weeks);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.durationChipText, selectedFinishWeeks === opt.weeks && s.durationChipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!selectedFinishWeeks && (
              <Text style={s.finishDateHint}>Tap a duration above to unlock memorization style</Text>
            )}
          </View>

          {/* Memorization Style Card */}
          <View style={[s.styleSectionCard, !hasFinishDate && s.styleSectionCardLocked]}>
            <View style={s.styleHeaderRow}>
              <View>
                <Text style={[s.stepEyebrow, !hasFinishDate && s.lockedLabel]}>STEP 3</Text>
                <Text style={[s.paceSectionLabel, !hasFinishDate && s.lockedLabel]}>MEMORIZATION STYLE</Text>
              </View>
              {!hasFinishDate && (
                <View style={s.lockPill}>
                  <Feather name="lock" size={11} color="#A8A29E" />
                  <Text style={s.lockPillText}>Choose date first</Text>
                </View>
              )}
            </View>
            {hasFinishDate && (
              <View style={s.stepOverviewTags}>
                <View style={s.stepOverviewTag}>
                  <Text style={s.stepOverviewValue}>{ayahsPerWeek}/week</Text>
                </View>
                <View style={s.stepOverviewTag}>
                  <Text style={s.stepOverviewValue}>{finishDateDisplay ?? selectedDurationLabel}</Text>
                </View>
              </View>
            )}
            <View style={s.styleOptions}>
              <TouchableOpacity
                style={[
                  s.styleOption,
                  memorizationStyle === "steady" && hasFinishDate && s.styleOptionSelected,
                  !hasFinishDate && s.styleOptionDisabled,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMemorizationStyle("steady");
                }}
                disabled={!hasFinishDate}
                activeOpacity={0.75}
              >
                <View style={s.styleOptionTop}>
                  <View style={[s.radioOuter, memorizationStyle === "steady" && hasFinishDate && s.radioOuterSelected]}>
                    {memorizationStyle === "steady" && hasFinishDate && <View style={s.radioInner} />}
                  </View>
                  <View style={s.styleTextWrap}>
                    <Text style={[s.styleTitle, !hasFinishDate && s.styleTitleDisabled]}>Steady</Text>
                    <Text style={[s.styleSub, !hasFinishDate && s.styleSubDisabled]}>Same pace throughout</Text>
                  </View>
                  <View style={s.miniBars}>
                    {[4, 4, 4, 4, 4].map((height, index) => (
                      <View key={`steady-${index}`} style={[s.miniBar, !hasFinishDate && s.miniBarDisabled, { height: height * 3 }]} />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.styleOption,
                  memorizationStyle === "gradual" && hasFinishDate && s.styleOptionSelected,
                  !hasFinishDate && s.styleOptionDisabled,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMemorizationStyle("gradual");
                }}
                disabled={!hasFinishDate}
                activeOpacity={0.75}
              >
                <View style={s.styleOptionTop}>
                  <View style={[s.radioOuter, memorizationStyle === "gradual" && hasFinishDate && s.radioOuterSelected]}>
                    {memorizationStyle === "gradual" && hasFinishDate && <View style={s.radioInner} />}
                  </View>
                  <View style={s.styleTextWrap}>
                    <Text style={[s.styleTitle, !hasFinishDate && s.styleTitleDisabled]}>Gradual Increase</Text>
                    <Text style={[s.styleSub, !hasFinishDate && s.styleSubDisabled]}>Start lighter and build momentum over time</Text>
                  </View>
                  <View style={s.miniBars}>
                    {[1, 2, 3, 5, 7].map((height, index) => (
                      <View key={`gradual-${index}`} style={[s.miniBar, !hasFinishDate && s.miniBarDisabled, { height: height * 3 }]} />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {memorizationStyle === "gradual" && (
              <View style={s.gradualPanel}>
                <Text style={s.gradualLabel}>INCREASE STYLE</Text>
                <View style={s.increaseChips}>
                  {INCREASE_STYLE_OPTIONS.map((option) => {
                    const selected = gradualIncreaseStyle === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[s.increaseChip, selected && s.increaseChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setGradualIncreaseStyle(option.value);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.increaseChipText, selected && s.increaseChipTextSelected]}>{option.label}</Text>
                        <Text style={[s.increaseChipSub, selected && s.increaseChipSubSelected]}>{option.helper}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {previewBars.length > 0 && (
                  <View style={s.weekPreview}>
                    <View style={s.weekPreviewBars}>
                      {previewBars.map((item) => (
                        <View key={`${item.week}-${item.count}`} style={s.weekPreviewItem}>
                          <View style={[s.weekPreviewBar, { height: Math.max(8, Math.round((item.count / previewMax) * 34)) }]} />
                          <Text style={s.weekPreviewLabel}>W{item.week}</Text>
                          <Text style={s.weekPreviewCount}>{item.count}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={s.weekPreviewText}>
                      Starts at your selected {ayahsPerWeek}/week pace, then grows with a {gradualIncreaseStyle} curve.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Range Capacity Card — shown after date is selected */}
          {selectedFinishWeeks && (
            <View style={s.rangeCapCard}>
              <Text style={s.rangeCapTitle}>RANGE CAPACITY</Text>
              <Text style={s.rangeCapText}>
                {memorizationStyle === "gradual" ? (
                  <>
                    Starting at <Text style={s.rangeCapBold}>{ayahsPerWeek} ayahs/wk</Text> and growing with a{" "}
                    <Text style={s.rangeCapBold}>{gradualIncreaseStyle}</Text> build for{" "}
                    <Text style={s.rangeCapBold}>{selectedDurationLabel}</Text>, you can cover up to{" "}
                    <Text style={s.rangeCapBold}>{autoCapacity} ayahs</Text>. After picking your first ayah, the last is set automatically.
                  </>
                ) : (
                  <>
                    At <Text style={s.rangeCapBold}>{ayahsPerWeek} ayahs/wk</Text> for{" "}
                    <Text style={s.rangeCapBold}>{selectedDurationLabel}</Text>, you can cover up to{" "}
                    <Text style={s.rangeCapBold}>{autoCapacity} ayahs</Text>. After picking your first ayah, the last is set automatically.
                  </>
                )}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[s.confirmBtn, !canProceed && s.confirmBtnDisabled]}
            onPress={() => canProceed && advanceStep(1)}
            disabled={!canProceed}
            activeOpacity={0.85}
          >
            <Text style={[s.confirmBtnText, !canProceed && s.confirmBtnTextDisabled]}>
              {canProceed
                ? `Continue to Select ${path === "juz" ? "Juz" : "Surah"} →`
                : "Set a finish date to continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ── Step 1: Surah list ──────────────────────────────────────────────────────
  const renderSurahList = () => (
    <>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={startAtPaceDate ? () => setStep(0) : onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.screenTitle}>Select Surah</Text>
        <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      {renderProgressBar()}
      <View style={s.searchWrap}>
        <Feather name="search" size={15} color="#9A9A9A" />
        <TextInput
          style={s.searchInput}
          placeholder="Search surahs..."
          placeholderTextColor="#9A9A9A"
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
                <View style={s.checkCircle}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              ) : (
                <Feather name="chevron-right" size={16} color="#C0C0C0" />
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
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={startAtPaceDate ? () => setStep(0) : onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={22} color="#1A1A1A" />
        </TouchableOpacity>
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
                <View style={s.checkCircle}>
                  <Feather name="check" size={14} color="#FFFFFF" />
                </View>
              ) : (
                <Feather name="chevron-right" size={16} color="#C0C0C0" />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </>
  );

  // ── Step 2: Ayah range selection ───────────────────────────────────────────
  const renderAyahSelection = () => {
    const backLabel =
      path === "juz" ? `Juz ${selectedJuz}` : (selectedSurah?.englishName ?? "");
    const cardTitle =
      path === "surah"
        ? selectedSurah?.englishName ?? ""
        : `Juz ${selectedJuz} — ${JUZ_NAMES[(selectedJuz ?? 1) - 1] ?? ""}`;
    const cardSub =
      path === "surah" ? `${selectedSurah?.ayahCount} ayahs` : getJuzSubtitle();

    const memorizedRange = getLeadingMemorizedRange();
    const firstIsSet = firstAyah !== null;
    const lastIsSet = lastAyah !== null;
    const between = getAyahsBetween();

    const firstLabel =
      firstAyah
        ? path === "juz"
          ? `${firstAyah.surahName}, Ayah ${firstAyah.ayahNumber}`
          : `Ayah ${firstAyah.ayahNumber}`
        : "Tap to select";

    const lastLabel =
      lastAyah
        ? path === "juz"
          ? `${lastAyah.surahName}, Ayah ${lastAyah.ayahNumber}`
          : `Ayah ${lastAyah.ayahNumber}`
        : "Tap to select";

    return (
      <>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (startAtPaceDate) {
                setFirstAyah(null);
                setLastAyah(null);
                setActivePhase("first");
              }
              setStep(1);
            }}
            style={s.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.screenTitle}>{backLabel}</Text>
          <TouchableOpacity onPress={onClose} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {renderProgressBar()}

        <View style={s.resetCtaWrap}>
          <ActionPill
            label="Reset"
            variant="soft"
            size="sm"
            style={s.resetCta}
            onPress={() => setResetVisible(true)}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.ayahScrollContent}
        >
          {/* Surah / Juz info card */}
          <View style={s.infoCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.infoCardTitle}>{cardTitle}</Text>
              <Text style={s.infoCardSub}>{cardSub}</Text>
            </View>
            {path === "surah" && (
              <Text style={s.infoCardArabic}>{selectedSurah?.name}</Text>
            )}
            {path === "juz" && (
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
                <Feather name="check-circle" size={10} color="#16A34A" style={s.phaseCardIcon} />
              ) : (
                <View style={s.phaseDot} />
              )}
              <Text style={s.phaseLabel}>FIRST AYAH</Text>
              <Text style={firstIsSet ? s.phaseValue : s.phasePlaceholder}>{firstLabel}</Text>
            </TouchableOpacity>

            <Feather name="arrow-right" size={14} color="#C0C0C0" style={s.phaseArrow} />

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
                    <View style={[s.phaseDot, { backgroundColor: "#D6D3D1" }]} />
                    <Text style={[s.phaseLabel, { color: "#C0C0C0" }]}>LAST AYAH</Text>
                    <Text style={[s.phasePlaceholder, { color: "#D6D3D1" }]}>Auto-calculated</Text>
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
                      ? { backgroundColor: "#1A1A1A" }
                      : firstIsSet
                      ? { backgroundColor: "#A8A29E" }
                      : { backgroundColor: "#D6D3D1" },
                  ]}
                />
                <Text style={[s.phaseLabel, !firstIsSet && { color: "#C0C0C0" }]}>LAST AYAH</Text>
                <Text
                  style={[
                    lastIsSet ? s.phaseValue : s.phasePlaceholder,
                    !firstIsSet && { color: "#D6D3D1" },
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
              <View style={s.autoRangeBanner}>
                <Feather name="check-circle" size={12} color="#16A34A" />
                <Text style={s.autoRangeBannerText}>
                  {`Range auto-set: Ayah ${firstAyah!.ayahNumber} → ${lastAyah!.ayahNumber} · ${totalRangeAyahs} ayahs match your ${ayahsPerWeek}/wk × ${selectedFinishWeeks}-week goal`}
                </Text>
              </View>
            ) : (
              <View style={s.hintRow}>
                <Feather name="info" size={12} color="#9A9A9A" />
                <Text style={s.hintText}>Tap your starting ayah — last ayah will auto-calculate based on your goal</Text>
              </View>
            )
          ) : firstIsSet && lastIsSet ? (
            <View style={s.hintRow}>
              <View style={s.hintDot} />
              <Text style={s.hintText}>{`= range (${between} ayahs between)`}</Text>
            </View>
          ) : (
            <View style={s.hintRow}>
              <Feather name="clock" size={12} color="#9A9A9A" />
              <Text style={s.hintText}>{hintText()}</Text>
            </View>
          )}

          {/* Memorized banner — surah path, first phase only */}
          {path === "surah" && (startAtPaceDate ? !firstIsSet : activePhase === "first") && memorizedRange && (
            <View style={s.memorizedBanner}>
              <Feather name="check-circle" size={14} color="#16A34A" />
              <Text style={s.memorizedBannerText}>{memorizedRange} already memorized</Text>
            </View>
          )}

          {/* Ayah grid */}
          {path === "surah" ? (
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
          <TouchableOpacity
            style={[s.confirmBtn, !canConfirm && s.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
          >
            <Text style={[s.confirmBtnText, !canConfirm && s.confirmBtnTextDisabled]}>
              {startAtPaceDate
                ? canConfirm
                  ? `Confirm Range — ${totalRangeAyahs} Ayahs ✓`
                  : "Select First Ayah to Continue"
                : canConfirm
                ? "Next: Weekly Goal →"
                : "Select First & Last Ayah"}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // ── Step 3: Weekly Goal ─────────────────────────────────────────────────────
  const renderWeeklyGoal = () => {
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
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => startAtWeeklyGoal ? onClose() : setStep(2)}
            style={s.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.screenTitle}>Set Your Weekly Goal</Text>
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

          <Text style={s.targetLabel}>TARGET VOLUME</Text>
          <Text style={s.targetNum}>{clampedAyahsPerWeek}</Text>
          <Text style={s.targetUnit}>Ayahs per week</Text>

          <View style={s.dynamicLimitChip}>
            <Feather name="info" size={12} color="#8E8E93" />
            <Text style={s.dynamicLimitText}>
              Max <Text style={s.dynamicLimitBold}>{dynamicMax}</Text> ayahs available in your selected range
            </Text>
          </View>

          <View style={s.sliderRangeRow}>
            <Text style={s.sliderRangeText}>1</Text>
            <Text style={s.sliderRangeText}>{dynamicMax}</Text>
          </View>
          <AyahSlider
            value={clampedAyahsPerWeek}
            onChange={(v) => setAyahsPerWeek(Math.min(v, dynamicMax))}
            maxValue={dynamicMax}
            onDragStart={() => setWeeklyScrollEnabled(false)}
            onDragEnd={() => setWeeklyScrollEnabled(true)}
          />

          <View style={s.weeklyPreviewCard}>
            <View style={s.weeklyPreviewIcon}>
              <Feather name="target" size={15} color="#1A1A1A" />
            </View>
            <View style={s.weeklyPreviewTextWrap}>
              <Text style={s.weeklyPreviewLabel}>THIS WEEK</Text>
              <Text style={s.weeklyPreviewRange}>{weeklyPreviewRangeLabel}</Text>
              <Text style={s.weeklyPreviewSub}>
                {weeklyPreviewAyahs.length} of {clampedAyahsPerWeek} ayahs selected
              </Text>
            </View>
          </View>

          {/* Finish date card — updates live as slider moves */}
          {remainingRangeAyahs > 0 && (
            <View style={s.finishDateCard}>
              <Feather name="calendar" size={18} color="#78716C" style={{ marginBottom: 6 }} />
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

          <Text style={s.commitmentLabel}>WEEKLY COMMITMENT STEPS</Text>
          <View style={s.dots}>
            {COMMITMENT_STEPS.filter((cs) => cs <= dynamicMax).map((cs) => (
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

          <View style={s.estimateCard}>
            <Text style={s.estimateLabel}>YOUR COMPLETION ESTIMATE</Text>
            <Text style={s.estimateText}>
              At <Text style={s.estimateBold}>{clampedAyahsPerWeek} Ayahs per week</Text>, you will finish memorizing your selected range in{" "}
              <Text style={s.estimateBold}>{estimateCompletion(remainingRangeAyahs, clampedAyahsPerWeek)}</Text>.
            </Text>
          </View>
        </ScrollView>

        <View style={[s.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={s.confirmBtn} onPress={handleFinalConfirm} activeOpacity={0.85}>
            <Text style={s.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.sheet}>
        {step === 0
          ? renderPaceDate()
          : step === 1
          ? path === "surah"
            ? renderSurahList()
            : renderJuzList()
          : step === 2
          ? renderAyahSelection()
          : renderWeeklyGoal()}

        <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setResetVisible(false)}>
            <View style={s.resetOverlay}>
              <TouchableWithoutFeedback>
                <View style={s.resetCard}>
                  <Text style={s.resetTitle}>Reset Progress?</Text>
                  <Text style={s.resetMessage}>
                    This will remove memorized marks from this {path === "juz" ? "Juz" : "Surah"}. You can mark them again anytime.
                  </Text>
                  <TouchableOpacity style={s.resetPrimaryBtn} onPress={handleReset} activeOpacity={0.85}>
                    <Text style={s.resetPrimaryBtnText}>Reset My Progress</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.resetCancelBtn} onPress={() => setResetVisible(false)} activeOpacity={0.7}>
                    <Text style={s.resetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: "#FDFBF7" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E5DB",
  },
  navBtn: {
    width: 64,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  cancelText: {
    fontSize: 15,
    color: "#71717A",
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#F0ECE4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    fontFamily: "Inter_400Regular",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7E5DB",
    gap: 12,
  },
  listRowInfo: { flex: 1 },
  listRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
  listRowSub: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  listRowArabic: { fontSize: 16, color: "#78716C" },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  juzTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  juzNameText: { fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular" },

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  ayahScrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E7E5DB",
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
  infoCardSub: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  infoCardArabic: { fontSize: 20, color: "#78716C", marginLeft: 12 },
  juzBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F0ECE4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  juzBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
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
    backgroundColor: "#F6F2EA",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 68,
  },
  phaseCardActive: { borderColor: "#1A1A1A", backgroundColor: "#FFFFFF" },
  phaseCardMuted: { opacity: 0.5 },
  phaseCardIcon: { marginBottom: 4 },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#A8A29E",
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#78716C",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  phaseValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  phasePlaceholder: {
    fontSize: 13,
    color: "#A8A29E",
    fontFamily: "Inter_400Regular",
  },
  phaseArrow: { alignSelf: "center", flexShrink: 0 },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  hintDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C9A02A",
  },
  hintText: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  memorizedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  memorizedBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
    fontFamily: "Inter_600SemiBold",
  },

  ayahGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  ayahBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE8DF",
    alignItems: "center",
    justifyContent: "center",
  },
  ayahBubbleSelected: { backgroundColor: "#1A1A1A" },
  ayahBubbleInRange: { backgroundColor: "#C9B9A4" },
  ayahBubbleDisabled: { backgroundColor: "#F0EDE8", opacity: 0.45 },
  ayahBubbleMemorized: { backgroundColor: "#16A34A" },
  ayahBubbleMemorizedDisabled: {
    backgroundColor: "#E4F3E8",
    borderWidth: 1,
    borderColor: "#A7D8B5",
    opacity: 0.7,
  },
  ayahBubbleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
  ayahBubbleTextSelected: { color: "#FFFFFF" },
  ayahBubbleTextInRange: { color: "#5C3D1A" },
  ayahBubbleTextDisabled: { color: "#C0C0C0" },

  gridCaption: {
    fontSize: 11,
    color: "#A8A29E",
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
    borderBottomColor: "#E7E5DB",
  },
  juzGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
  juzGroupArabic: { fontSize: 16, color: "#78716C" },

  confirmWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7E5DB",
    backgroundColor: "#FDFBF7",
  },
  confirmBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#E7E5DB" },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtnTextDisabled: { color: "#A8A29E" },

  // ── Progress bar ────────────────────────────────────────────────────────────
  stepProgress: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
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
    backgroundColor: "#E7E5DB",
  },
  stepSegFilled: {
    backgroundColor: "#1A1A1A",
  },
  stepLabels: {
    flexDirection: "row",
  },
  stepLabelCell: {
    flex: 1,
    alignItems: "flex-start",
  },
  stepLabelText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#A8A29E",
  },
  stepLabelActive: {
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  stepLabelTappable: {
    color: "#1A1A1A",
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
  resetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  resetCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FDFBF7",
    borderRadius: 18,
    padding: 20,
  },
  resetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  resetMessage: {
    fontSize: 14,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 18,
  },
  resetPrimaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  resetPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  resetCancelBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#F6F2EA",
    alignItems: "center",
    justifyContent: "center",
  },
  resetCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },

  // ── Step 3: Weekly Goal ─────────────────────────────────────────────────────
  weeklyContent: { paddingHorizontal: 20, paddingBottom: 16 },

  weeklyGoalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },

  targetLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C",
    letterSpacing: 1.5, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 6,
  },
  targetNum: {
    fontSize: 80, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 90,
  },
  targetUnit: {
    fontSize: 15, color: "#78716C", fontFamily: "Inter_400Regular",
    textAlign: "center", marginBottom: 10,
  },
  dynamicLimitChip: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    backgroundColor: "#F6F2EA", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14,
  },
  dynamicLimitText: { flex: 1, fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular", lineHeight: 17 },
  dynamicLimitBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  sliderRangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sliderRangeText: { fontSize: 12, color: "#A8A29E", fontFamily: "Inter_400Regular" },
  sliderContainer: { height: 44, justifyContent: "center", marginBottom: 4 },
  sliderTrack: { height: 3, backgroundColor: "#E7E5DB", borderRadius: 2 },
  sliderFill: { position: "absolute", height: 3, backgroundColor: "#1A1A1A", borderRadius: 2 },
  sliderThumb: {
    position: "absolute", top: -11.5,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#1A1A1A",
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },
  weeklyPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEE8DF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DED6C9",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  weeklyPreviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FDFBF7",
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyPreviewTextWrap: { flex: 1 },
  weeklyPreviewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#78716C",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  weeklyPreviewRange: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
  weeklyPreviewSub: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  finishDateCard: {
    backgroundColor: "#F6F2EA",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  finishDateCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#78716C",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  finishDateCardDate: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  finishDateCardSub: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
  },

  commitmentLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C", letterSpacing: 1.2,
    fontFamily: "Inter_700Bold", textTransform: "uppercase",
    textAlign: "center", marginTop: 12, marginBottom: 10,
  },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#D6D3D1" },
  dotFilled: { backgroundColor: "#1A1A1A" },
  summaryCard: {
    backgroundColor: "#FDFBF7", borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#D6D3D1",
    paddingHorizontal: 16, marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 12,
  },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#D6D3D1" },
  summaryLabel: { fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  summaryValueBold: { fontFamily: "Inter_700Bold" },
  infoPager: { marginBottom: 12, overflow: "hidden" },
  infoPagerDots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 8 },
  infoPagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D6D3D1" },
  infoPagerDotActive: { backgroundColor: "#1A1A1A" },
  wkInfoCard: { backgroundColor: "#F6F2EA", borderRadius: 12, padding: 16 },
  wkInfoCardTitle: {
    fontSize: 11, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4,
  },
  wkInfoCardText: { fontSize: 12, color: "#71717A", fontFamily: "Inter_400Regular", lineHeight: 20 },
  wkInfoCardBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  estimateCard: {
    backgroundColor: "#1A1A1A", borderRadius: 12, padding: 16, marginBottom: 16, gap: 4,
  },
  estimateLabel: {
    fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.55)", fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase",
  },
  estimateText: { fontSize: 14, color: "#FFFFFF", fontFamily: "Inter_400Regular", lineHeight: 22 },
  estimateBold: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  // ── Step 0: Pace + Date ─────────────────────────────────────────────────────
  paceDateContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  paceSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 16,
  },
  paceSectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  paceSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78716C",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  stepEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C9A02A",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  pacePill: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pacePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  styleSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 16,
  },
  styleSectionCardLocked: {
    backgroundColor: "#F8F5EE",
    borderStyle: "dashed",
  },
  styleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  lockedLabel: {
    color: "#A8A29E",
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    backgroundColor: "#F0ECE4",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lockPillText: {
    fontSize: 11,
    color: "#A8A29E",
    fontFamily: "Inter_600SemiBold",
  },
  stepOverviewTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  stepOverviewTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#F0ECE4",
    borderWidth: 1,
    borderColor: "#E7E5DB",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stepOverviewValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
  styleOptions: {
    gap: 10,
    marginTop: 12,
  },
  styleOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5DB",
    backgroundColor: "#FDFBF7",
    padding: 12,
  },
  styleOptionSelected: {
    borderColor: "#1A1A1A",
    backgroundColor: "#FFFFFF",
  },
  styleOptionDisabled: {
    backgroundColor: "#F4EFE7",
    borderColor: "#E7E5DB",
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
    borderColor: "#C9B9A4",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#1A1A1A",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1A1A1A",
  },
  styleTextWrap: {
    flex: 1,
  },
  styleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  styleTitleDisabled: {
    color: "#A8A29E",
  },
  styleSub: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  styleSubDisabled: {
    color: "#B9B2A8",
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
    backgroundColor: "#1A1A1A",
  },
  miniBarDisabled: {
    backgroundColor: "#CFC8BE",
  },
  gradualPanel: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#F6F2EA",
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 12,
    gap: 12,
  },
  gradualLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#78716C",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  increaseChips: {
    flexDirection: "row",
    gap: 8,
  },
  increaseChip: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DED6C9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  increaseChipSelected: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  increaseChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  increaseChipTextSelected: {
    color: "#FFFFFF",
  },
  increaseChipSub: {
    fontSize: 10,
    color: "#A8A29E",
    fontFamily: "Inter_400Regular",
  },
  increaseChipSubSelected: {
    color: "rgba(255,255,255,0.68)",
  },
  weekPreview: {
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 10,
    gap: 8,
  },
  weekPreviewBars: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  weekPreviewItem: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  weekPreviewBar: {
    width: 12,
    borderRadius: 6,
    backgroundColor: "#1A1A1A",
  },
  weekPreviewLabel: {
    fontSize: 9,
    color: "#A8A29E",
    fontFamily: "Inter_700Bold",
  },
  weekPreviewCount: {
    fontSize: 10,
    color: "#78716C",
    fontFamily: "Inter_700Bold",
  },
  weekPreviewText: {
    fontSize: 12,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  finishDateSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E5DB",
    padding: 16,
  },
  finishDateSectionDashed: {
    borderStyle: "dashed",
    borderColor: "#C9B9A4",
  },
  finishDateTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  finishDatePill: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  finishDatePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  finishDateNotSet: {
    fontSize: 13,
    color: "#A8A29E",
    fontFamily: "Inter_400Regular",
  },
  durationChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  durationChip: {
    backgroundColor: "#F0ECE4",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  durationChipSelected: {
    backgroundColor: "#1A1A1A",
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    fontFamily: "Inter_600SemiBold",
  },
  durationChipTextSelected: {
    color: "#FFFFFF",
  },
  finishDateHint: {
    fontSize: 12,
    color: "#A8A29E",
    fontFamily: "Inter_400Regular",
    marginTop: 10,
  },

  rangeCapCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  rangeCapTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  rangeCapText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  rangeCapBold: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // ── Auto-last ayah (paceDate flow) ──────────────────────────────────────────
  autoLastTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  autoBadgePill: {
    backgroundColor: "#1A1A1A",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  autoBadgePillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  autoRangeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  autoRangeBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    lineHeight: 18,
  },
  autoLastBubbleBadge: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FDFBF7",
  },
  autoLastBubbleBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
});
