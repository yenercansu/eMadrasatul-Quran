import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  PanResponder,
  TouchableWithoutFeedback,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getJuzAyahs, getWeeklyGoalAyahsFrom, JUZ_STARTS, SURAH_DATA } from "@/constants/surahData";
import type { Goal, MemorizationGoal } from "@/contexts/QuranContext";
import { useQuran } from "@/contexts/QuranContext";
import colors from "@/constants/colors";
import { searchByType } from "@/services/search";
import { ResetProgressButton } from "@/components/ResetProgressButton";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45, 70];
const MAX_WEEKLY = 70;
const TOTAL_AYAHS = 6236;
const sp = colors.spacing;
const ty = colors.typography;
const br = colors.borders;

function estimateCompletion(remaining: number, weeklyGoal: number): string {
  if (weeklyGoal <= 0 || remaining <= 0) return "completed";
  const days = Math.ceil(remaining / weeklyGoal) * 7;
  if (days >= 730) return `approximately ${Math.round(days / 365)} years`;
  if (days >= 365) return "approximately 1 year";
  if (days >= 60) return `approximately ${Math.round(days / 30)} months`;
  if (days >= 30) return "approximately 1 month";
  return `approximately ${days} days`;
}

function AyahSlider({
  value,
  onChange,
  maxValue = MAX_WEEKLY,
}: {
  value: number;
  onChange: (v: number) => void;
  maxValue?: number;
}) {
  const sliderRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const onChangeRef = useRef(onChange);
  const maxValueRef = useRef(maxValue);
  const THUMB = 26;

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { maxValueRef.current = maxValue; });

  const resolve = (pageX: number) => {
    sliderRef.current?.measure((_x, _y, width, _height, containerPageX) => {
      const max = maxValueRef.current;
      const w = width || trackWidthRef.current || 1;
      const x = Math.max(0, Math.min(w, pageX - containerPageX));
      onChangeRef.current(Math.max(1, Math.min(max, Math.round((x / w) * (max - 1)) + 1)));
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => resolve(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) => resolve(evt.nativeEvent.pageX),
    })
  ).current;

  const thumbLeft = trackWidth > 0 && maxValue > 1 ? ((value - 1) / (maxValue - 1)) * (trackWidth - THUMB) : 0;

  return (
    <View
      ref={sliderRef}
      style={s.sliderContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setTrackWidth(w);
        trackWidthRef.current = w;
      }}
      {...pan.panHandlers}
    >
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { width: thumbLeft + THUMB / 2 }]} />
      </View>
      {trackWidth > 0 && <View style={[s.sliderThumb, { left: thumbLeft }]} />}
    </View>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <View style={s.progressBar}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[s.progressSegment, i <= step && s.progressSegmentFilled]} />
      ))}
    </View>
  );
}

interface PresetConfig {
  path: "surah" | "juz";
  firstSurahNumber: number;
  firstAyahNumber: number;
  lastSurahNumber: number;
  lastAyahNumber: number;
  juz?: number;
  totalRangeAyahs: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete: (memorizationGoal: MemorizationGoal, weeklyGoal: Goal) => void;
  presetConfig?: PresetConfig;
}

export function GoalSetupModal({ visible, onClose, onComplete, presetConfig }: Props) {
  const insets = useSafeAreaInsets();
  const { memorizedAyahKeys, removeMemorizedAyahKeys } = useQuran();
  const { width: windowWidth } = useWindowDimensions();
  const infoPageWidth = windowWidth - 40;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [infoPage, setInfoPage] = useState(0);
  const [path, setPath] = useState<"juz" | "surah" | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<(typeof SURAH_DATA)[0] | null>(null);
  const [startAyahNumber, setStartAyahNumber] = useState(1);
  const [ayahsPerWeek, setAyahsPerWeek] = useState(3);
  const [search, setSearch] = useState("");
  const [resetVisible, setResetVisible] = useState(false);

  // Reset (or initialize from preset) when modal opens
  useEffect(() => {
    if (visible) {
      if (presetConfig) {
        setStep(4);
        setPath(presetConfig.path);
        setSelectedJuz(presetConfig.juz ?? null);
        setSelectedSurah(SURAH_DATA.find((s) => s.number === presetConfig.firstSurahNumber) ?? null);
        setStartAyahNumber(presetConfig.firstAyahNumber);
        setAyahsPerWeek(3);
        setSearch("");
        setResetVisible(false);
      } else {
        setStep(1);
        setPath(null);
        setSelectedJuz(null);
        setSelectedSurah(null);
        setStartAyahNumber(1);
        setAyahsPerWeek(3);
        setSearch("");
        setResetVisible(false);
      }
    }
  }, [visible]);

  useEffect(() => {
    if (path !== "juz" || selectedJuz == null) return;
    const firstAyah = getJuzAyahs(selectedJuz)[0];
    if (!firstAyah) return;
    setSelectedSurah(SURAH_DATA[firstAyah.surahNumber - 1] ?? null);
    setStartAyahNumber(firstAyah.ayahNumber);
  }, [path, selectedJuz]);

  const selectedJuzAyahs = useMemo(
    () => path === "juz" && selectedJuz != null ? getJuzAyahs(selectedJuz) : [],
    [path, selectedJuz]
  );

  const selectedJuzGroups = useMemo(() => {
    const groups: { surah: (typeof SURAH_DATA)[0]; ayahs: number[] }[] = [];
    for (const ayah of selectedJuzAyahs) {
      const surah = SURAH_DATA[ayah.surahNumber - 1];
      if (!surah) continue;
      const last = groups[groups.length - 1];
      if (last?.surah.number === surah.number) last.ayahs.push(ayah.ayahNumber);
      else groups.push({ surah, ayahs: [ayah.ayahNumber] });
    }
    return groups;
  }, [selectedJuzAyahs]);

  // ── Dynamic max for Step 4 ────────────────────────────────────────────────
  // Remaining ayahs from the selected starting point to the end of the surah/juz
  const remainingAyahsFromStart = useMemo(() => {
    if (!selectedSurah) return MAX_WEEKLY;
    if (path === "surah") {
      return Math.max(1, selectedSurah.ayahCount - startAyahNumber + 1);
    }
    const idx = selectedJuzAyahs.findIndex(
      (a) => a.surahNumber === selectedSurah.number && a.ayahNumber === startAyahNumber
    );
    return idx >= 0 ? Math.max(1, selectedJuzAyahs.length - idx) : 1;
  }, [selectedSurah, startAyahNumber, path, selectedJuzAyahs]);

  const dynamicMax = Math.min(MAX_WEEKLY, remainingAyahsFromStart);

  // Clamp ayahsPerWeek whenever the dynamic max changes
  useEffect(() => {
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, dynamicMax)));
  }, [dynamicMax]);

  // ── Surah / Juz lists ─────────────────────────────────────────────────────
  const juzGroups = useMemo(() => JUZ_STARTS.map((juz) => ({
    juz: juz.juz,
    ayahCount: getJuzAyahs(juz.juz).length,
    startsAt: juz,
  })), []);

  const filteredSurahs = useMemo(() => {
    return searchByType("surah", search, SURAH_DATA);
  }, [search]);

  const filteredJuzGroups = useMemo(() => {
    if (!search) return juzGroups;
    const matchingSurahNumbers = new Set(searchByType("surah", search, SURAH_DATA).map((surah) => surah.number));
    return juzGroups.filter((group) => {
      const ayahs = getJuzAyahs(group.juz);
      return String(group.juz).includes(search.trim()) || ayahs.some((a) => matchingSurahNumbers.has(a.surahNumber));
    });
  }, [search, juzGroups]);

  const weeklySelection = useMemo(() => {
    if (!selectedSurah) return [];
    return getWeeklyGoalAyahsFrom(
      selectedSurah.number,
      startAyahNumber,
      Math.min(ayahsPerWeek, dynamicMax),
      path === "juz" && selectedJuz != null ? { path: "juz", juz: selectedJuz } : { path: "surah" }
    );
  }, [selectedSurah, startAyahNumber, ayahsPerWeek, dynamicMax, path, selectedJuz]);
  const endingAyah = weeklySelection[weeklySelection.length - 1];

  const targetAyahs = useMemo(() => {
    if (path === "juz" && selectedJuz != null) return selectedJuzAyahs;
    if (path === "surah" && selectedSurah) {
      return Array.from({ length: selectedSurah.ayahCount }, (_, i) => ({
        surahNumber: selectedSurah.number,
        ayahNumber: i + 1,
      }));
    }
    return [];
  }, [path, selectedJuz, selectedJuzAyahs, selectedSurah]);

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeMemorizedAyahKeys(targetAyahs.map(a => `${a.surahNumber}:${a.ayahNumber}`));
    setResetVisible(false);
  };

  // ── Completion ────────────────────────────────────────────────────────────
  const handleComplete = () => {
    if (!path || !selectedSurah) return;
    const cappedAyahsPerWeek = Math.min(ayahsPerWeek, dynamicMax);
    const targetJuz = path === "juz" ? selectedJuz ?? undefined : undefined;
    onComplete(
      {
        path,
        startSurahNumber: selectedSurah.number,
        startSurahName: path === "juz" && targetJuz ? `Juz ${targetJuz}` : selectedSurah.englishName,
        startDate: new Date().toISOString().split("T")[0],
        targetJuz,
        endSurahNumber: presetConfig?.lastSurahNumber,
        endAyahNumber: presetConfig?.lastAyahNumber,
      },
      {
        ayahsPerWeek: cappedAyahsPerWeek,
        startDate: new Date().toISOString().split("T")[0],
        startSurahNumber: selectedSurah.number,
        startAyahNumber,
        endSurahNumber: presetConfig?.lastSurahNumber,
        endAyahNumber: presetConfig?.lastAyahNumber,
      }
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.sheet, { paddingTop: insets.top }]}>

              {/* ── STEP 1: Memorization Mode ───────────────────────────────── */}
              {step === 1 && (
                <>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.startHeader}>
                    <View style={{ width: 36 }} />
                    <Text style={s.bigTitle}>Choose Path</Text>
                    <TouchableOpacity onPress={onClose} style={s.inlineCloseBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.bigSub}>
                    Select how you want to begin your memorization journey
                  </Text>

                  <View style={s.pathCards}>
                    {(["juz", "surah"] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[s.pathCard, path === p && s.pathCardSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPath(p);
                          setSelectedJuz(null);
                          setSelectedSurah(null);
                          setStartAyahNumber(1);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={s.pathCardBody}>
                          <Text style={s.pathCardTitle}>
                            {p === "juz" ? "Memorize by Juz" : "Memorize by Surah"}
                          </Text>
                          <Text style={s.pathCardSub}>
                            {p === "juz"
                              ? "Complete the Quran by sections"
                              : "Target specific chapters in order"}
                          </Text>
                        </View>
                        {path === p && (
                          <View style={s.pathCheck}>
                            <Feather name="check" size={13} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                </ScrollView>
                <View style={s.pinnedCta}>
                  <TouchableOpacity
                    style={[s.primaryBtn, !path && { opacity: 0.4 }]}
                    disabled={!path}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStep(2);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.primaryBtnText}>Next</Text>
                    <Feather name="arrow-right" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={s.stepLabel}>STEP 1 OF 4</Text>
                </View>
                </>
              )}

              {/* ── STEP 2: Select Surah ────────────────────────────────────── */}
              {step === 2 && path === "surah" && (
                <>
                  <View style={s.stepPad}>
                    <View style={s.stepHeader}>
                      <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn} activeOpacity={0.7}>
                        <Feather name="chevron-left" size={22} color="#1A1A1A" />
                      </TouchableOpacity>
                      <Text style={s.stepTitle}>Select Surah</Text>
                      <TouchableOpacity onPress={onClose} style={s.inlineCloseBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="x" size={20} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>
                    <ProgressBar step={2} />
                    <View style={s.searchBar}>
                      <Feather name="search" size={15} color="#9A9A9A" />
                      <TextInput
                        style={s.searchInput}
                        placeholder="Search Surah"
                        placeholderTextColor="#9A9A9A"
                        value={search}
                        onChangeText={setSearch}
                        clearButtonMode="while-editing"
                      />
                    </View>
                  </View>

                  <FlatList
                    data={filteredSurahs}
                    keyExtractor={(item) => String(item.number)}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const isSelected = selectedSurah?.number === item.number;
                      return (
                        <TouchableOpacity
                          style={s.surahRow}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedSurah(item);
                            setStartAyahNumber(1);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[s.surahNumBubble, isSelected && s.surahNumBubbleActive]}>
                            <Text style={[s.surahNumText, isSelected && s.surahNumTextActive]}>
                              {item.number}
                            </Text>
                          </View>
                          <View style={s.surahInfo}>
                            <Text style={s.surahName}>{item.englishName}</Text>
                            <Text style={s.surahMeta}>{item.name} • {item.ayahCount} Verses</Text>
                          </View>
                          <Feather name="chevron-right" size={16} color="#C0C0C0" />
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <View style={[s.stepPad, { paddingTop: 12 }]}>
                    <TouchableOpacity
                      style={[s.primaryBtn, !selectedSurah && { opacity: 0.4 }]}
                      disabled={!selectedSurah}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setStep(3);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.primaryBtnText}>Next</Text>
                      <Feather name="arrow-right" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={s.stepLabel}>STEP 2 OF 4</Text>
                  </View>
                </>
              )}

              {/* ── STEP 2: Select Juz ──────────────────────────────────────── */}
              {step === 2 && path === "juz" && (
                <>
                  <View style={s.stepPad}>
                    <View style={s.stepHeader}>
                      <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn} activeOpacity={0.7}>
                        <Feather name="chevron-left" size={22} color="#1A1A1A" />
                      </TouchableOpacity>
                      <Text style={s.stepTitle}>Select Juz</Text>
                      <TouchableOpacity onPress={onClose} style={s.inlineCloseBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="x" size={20} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>
                    <ProgressBar step={2} />
                    <View style={s.searchBar}>
                      <Feather name="search" size={15} color="#9A9A9A" />
                      <TextInput
                        style={s.searchInput}
                        placeholder="Search Juz or Surah"
                        placeholderTextColor="#9A9A9A"
                        value={search}
                        onChangeText={setSearch}
                        clearButtonMode="while-editing"
                      />
                    </View>
                  </View>

                  <FlatList
                    data={filteredJuzGroups}
                    keyExtractor={(item) => String(item.juz)}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: group }) => {
                      const isSelected = selectedJuz === group.juz;
                      const firstSurah = SURAH_DATA[group.startsAt.surah - 1];
                      const juzAyahs = getJuzAyahs(group.juz);
                      const surahNames = Array.from(new Set(juzAyahs.map(a => a.surahName))).slice(0, 4).join(" • ");
                      return (
                        <TouchableOpacity
                          style={s.surahRow}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedJuz(group.juz);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[s.surahNumBubble, isSelected && s.surahNumBubbleActive]}>
                            <Text style={[s.surahNumText, isSelected && s.surahNumTextActive]}>
                              {group.juz}
                            </Text>
                          </View>
                          <View style={s.surahInfo}>
                            <Text style={s.surahName}>Juz {group.juz}</Text>
                            <Text style={s.surahMeta}>
                              Starts {firstSurah?.englishName ?? ""} {group.startsAt.ayah} • {group.ayahCount} Ayahs
                            </Text>
                            <Text style={s.juzHeaderSub}>{surahNames}</Text>
                          </View>
                          {isSelected ? (
                            <Feather name="check" size={16} color="#1A1A1A" />
                          ) : (
                            <Feather name="chevron-right" size={16} color="#C0C0C0" />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <View style={[s.stepPad, { paddingTop: 12 }]}>
                    <TouchableOpacity
                      style={[s.primaryBtn, selectedJuz == null && { opacity: 0.4 }]}
                      disabled={selectedJuz == null}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (selectedJuz != null && !selectedSurah) {
                          const firstAyah = getJuzAyahs(selectedJuz)[0];
                          if (firstAyah) {
                            setSelectedSurah(SURAH_DATA[firstAyah.surahNumber - 1] ?? null);
                            setStartAyahNumber(firstAyah.ayahNumber);
                          }
                        }
                        setStep(3);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.primaryBtnText}>Next</Text>
                      <Feather name="arrow-right" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={s.stepLabel}>STEP 2 OF 4</Text>
                  </View>
                </>
              )}

              {/* ── STEP 3: Starting Ayah (with visual memory) ──────────────── */}
              {step === 3 && (
                <>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.stepHeader}>
                    <TouchableOpacity onPress={() => setStep(2)} style={s.backBtn} activeOpacity={0.7}>
                      <Feather name="chevron-left" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={s.stepTitle}>Starting From Which Ayah</Text>
                    <TouchableOpacity onPress={onClose} style={s.inlineCloseBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>
                  <ProgressBar step={3} />
                  <View style={s.ayahIntroRow}>
                    <View style={s.ayahIntroText}>
                      <Text style={s.ayahGridLabel}>
                        SELECT STARTING AYAH • {path === "juz" ? `Juz ${selectedJuz}` : selectedSurah?.englishName ?? ""}
                      </Text>
                      <Text style={s.ayahGridSub}>
                        Green = already memorized. Tap an ayah to set your starting point.
                      </Text>
                    </View>
                    <ResetProgressButton onPress={() => setResetVisible(true)} />
                  </View>

                  {path === "juz" ? (
                    selectedJuzGroups.map((group) => (
                      <View key={group.surah.number} style={s.juzAyahGroup}>
                        <View style={s.juzHeader}>
                          <Text style={s.juzHeaderText}>{group.surah.englishName}</Text>
                          <Text style={s.juzHeaderSub}>{group.surah.name}</Text>
                        </View>
                        <View style={s.ayahGrid}>
                          {group.ayahs.map((ayahNum) => {
                            const key = `${group.surah.number}:${ayahNum}`;
                            const isMemorized = memorizedAyahKeys.includes(key);
                            const isSelected = selectedSurah?.number === group.surah.number && startAyahNumber === ayahNum;
                            return (
                              <TouchableOpacity
                                key={ayahNum}
                                style={[
                                  s.ayahBubble,
                                  isMemorized && !isSelected && s.ayahBubbleMemorized,
                                  isSelected && s.ayahBubbleSelected,
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedSurah(group.surah);
                                  setStartAyahNumber(ayahNum);
                                }}
                                activeOpacity={0.7}
                              >
                                {isMemorized && !isSelected ? (
                                  <Feather name="check" size={12} color="#FFFFFF" />
                                ) : (
                                  <Text style={[s.ayahBubbleText, isSelected && s.ayahBubbleTextActive]}>
                                    {ayahNum}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={s.ayahGrid}>
                      {Array.from({ length: selectedSurah?.ayahCount ?? 0 }, (_, i) => i + 1).map(
                        (ayahNum) => {
                          const key = `${selectedSurah!.number}:${ayahNum}`;
                          const isMemorized = memorizedAyahKeys.includes(key);
                          const isSelected = startAyahNumber === ayahNum;
                          return (
                            <TouchableOpacity
                              key={ayahNum}
                              style={[
                                s.ayahBubble,
                                isMemorized && !isSelected && s.ayahBubbleMemorized,
                                isSelected && s.ayahBubbleSelected,
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStartAyahNumber(ayahNum);
                              }}
                              activeOpacity={0.7}
                            >
                              {isMemorized && !isSelected ? (
                                <Feather name="check" size={12} color="#FFFFFF" />
                              ) : (
                                <Text style={[s.ayahBubbleText, isSelected && s.ayahBubbleTextActive]}>
                                  {ayahNum}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </View>
                  )}

                  <View style={s.availabilityChip}>
                    <Feather name="map-pin" size={13} color="#1A1A1A" />
                    <Text style={s.availabilityText}>
                      Starting at {selectedSurah?.englishName} {startAyahNumber} •{" "}
                      <Text style={s.availabilityBold}>{remainingAyahsFromStart}</Text> ayah
                      {remainingAyahsFromStart !== 1 ? "s" : ""} available
                    </Text>
                  </View>

                </ScrollView>
                <View style={s.pinnedCta}>
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStep(4);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.primaryBtnText}>Next</Text>
                    <Feather name="arrow-right" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={s.stepLabel}>STEP 3 OF 4</Text>
                </View>
                </>
              )}

              {/* ── STEP 4: Weekly Quantity (dynamic limit) ─────────────────── */}
              {step === 4 && (
                <>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.stepHeader}>
                    <TouchableOpacity
                      onPress={() => (presetConfig ? onClose() : setStep(3))}
                      style={s.backBtn}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-left" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={s.stepTitle}>Set Your Weekly Goal</Text>
                    <TouchableOpacity onPress={onClose} style={s.inlineCloseBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>
                  {!presetConfig && <ProgressBar step={4} />}

                  <Text style={s.targetLabel}>TARGET VOLUME</Text>
                  <Text style={s.targetNum}>{ayahsPerWeek}</Text>
                  <Text style={s.targetUnit}>Ayahs per week</Text>

                  {/* Dynamic limit hint */}
                  <View style={s.dynamicLimitChip}>
                    <Feather name="info" size={12} color="#8E8E93" />
                    <Text style={s.dynamicLimitText}>
                      Max <Text style={s.dynamicLimitBold}>{dynamicMax}</Text> ayahs available
                      from {selectedSurah?.englishName} {startAyahNumber}
                      {path === "juz" ? ` in Juz ${selectedJuz}` : ""}
                    </Text>
                  </View>

                  <View style={s.sliderRangeRow}>
                    <Text style={s.sliderRangeText}>1</Text>
                    <Text style={s.sliderRangeText}>{dynamicMax}</Text>
                  </View>
                  <AyahSlider
                    value={ayahsPerWeek}
                    onChange={(v) => setAyahsPerWeek(Math.min(v, dynamicMax))}
                    maxValue={dynamicMax}
                  />

                  <Text style={s.commitmentLabel}>WEEKLY COMMITMENT STEPS</Text>
                  <View style={s.dots}>
                    {COMMITMENT_STEPS.filter((cs) => cs <= dynamicMax).map((cs) => (
                      <View key={cs} style={[s.dot, ayahsPerWeek >= cs && s.dotFilled]} />
                    ))}
                  </View>

                  {/* Summary of the full selection */}
                  <View style={s.summaryCard}>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>{path === "juz" ? "Juz" : "Surah"}</Text>
                      <Text style={s.summaryValue}>{path === "juz" ? `Juz ${selectedJuz}` : selectedSurah?.englishName}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Starting Ayah</Text>
                      <Text style={s.summaryValue}>{selectedSurah?.englishName} {startAyahNumber}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Ending Ayah</Text>
                      <Text style={s.summaryValue}>
                        {presetConfig
                          ? `${SURAH_DATA.find(s => s.number === presetConfig.lastSurahNumber)?.englishName ?? ""} ${presetConfig.lastAyahNumber}`
                          : endingAyah ? `${endingAyah.surahName} ${endingAyah.ayahNumber}` : startAyahNumber}
                      </Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Weekly Goal</Text>
                      <Text style={[s.summaryValue, s.summaryValueBold]}>{ayahsPerWeek} Ayahs</Text>
                    </View>
                  </View>

                  {/* Info pager: SUSTAINABLE PACE / WEEKLY MAXIMUM */}
                  <View style={s.infoPager}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(e) =>
                        setInfoPage(Math.round(e.nativeEvent.contentOffset.x / infoPageWidth))
                      }
                    >
                      <View style={[s.infoCard, { width: infoPageWidth }]}>
                        <Text style={s.infoCardTitle}>SUSTAINABLE PACE</Text>
                        <Text style={s.infoCardText}>
                          3 to 10 Ayahs daily is considered a sustainable memorization pace and may lead to completing the Quran in approximately 2 to 6 years.
                        </Text>
                      </View>
                      <View style={[s.infoCard, { width: infoPageWidth }]}>
                        <Text style={s.infoCardTitle}>WEEKLY MAXIMUM</Text>
                        <Text style={s.infoCardText}>
                          We recommend a maximum of <Text style={s.infoCardBold}>70 Ayahs per week</Text>. If you want to learn more, you can always come back and set a new goal upon completion.
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
                    {presetConfig ? (
                      <Text style={s.estimateText}>
                        At <Text style={s.estimateBold}>{ayahsPerWeek} Ayahs per week</Text>, you will finish memorizing your selected range in{" "}
                        <Text style={s.estimateBold}>{estimateCompletion(presetConfig.totalRangeAyahs, ayahsPerWeek)}</Text>.
                      </Text>
                    ) : (
                      <>
                        <Text style={s.estimateText}>
                          At <Text style={s.estimateBold}>{ayahsPerWeek} Ayahs per week</Text>, you will finish memorizing the Quran in{" "}
                          <Text style={s.estimateBold}>{estimateCompletion(TOTAL_AYAHS - memorizedAyahKeys.length, ayahsPerWeek)}</Text>.
                        </Text>
                        {memorizedAyahKeys.length > 0 && (
                          <Text style={s.estimateSub}>{memorizedAyahKeys.length} of {TOTAL_AYAHS} Ayahs already memorized.</Text>
                        )}
                      </>
                    )}
                  </View>

                </ScrollView>
                <View style={s.pinnedCta}>
                  <TouchableOpacity style={s.primaryBtn} onPress={handleComplete} activeOpacity={0.85}>
                    <Text style={s.primaryBtnText}>Start Learning</Text>
                    <Feather name="check" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  {!presetConfig && <Text style={s.stepLabel}>STEP 4 OF 4</Text>}
                </View>
                </>
              )}

              <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setResetVisible(false)}>
                  <View style={s.resetOverlay}>
                    <TouchableWithoutFeedback>
                      <View style={s.resetCard}>
                        <Text style={s.resetTitle}>Reset Progress?</Text>
                        <Text style={s.resetMessage}>
                          This will remove memorized marks from this goal target. You can mark them again anytime.
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
  sheet: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  stepPad: { paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  bigTitle: {
    flex: 1,
    fontSize: 26, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center",
  },
  startHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bigSub: {
    fontSize: 14, color: "#78716C", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 21, marginBottom: 28,
  },

  pathCards: { gap: 12, marginBottom: 28 },
  pathCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1.5, borderColor: "#D6D3D1",
    padding: 20, minHeight: 84,
  },
  pathCardSelected: { borderColor: "#1A1A1A" },
  pathCardBody: { flex: 1 },
  pathCardTitle: {
    fontSize: 17, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", marginBottom: 5,
  },
  pathCardSub: { fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular" },
  pathCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", marginLeft: 12,
  },

  pinnedCta: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: "#FDFBF7",
  },
  primaryBtn: {
    backgroundColor: "#1A1A1A", borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginBottom: 12, marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  stepLabel: {
    textAlign: "center", fontSize: 11, color: "#A8A29E",
    fontFamily: "Inter_400Regular", letterSpacing: 0.5, marginBottom: 4,
  },

  stepHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingTop: 16, marginBottom: 16,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },

  progressBar: { flexDirection: "row", gap: 4, marginBottom: 20 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#E7E5DB" },
  progressSegmentFilled: { backgroundColor: "#1A1A1A" },

  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F6F2EA",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1A1A1A", fontFamily: "Inter_400Regular" },

  surahRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D6D3D1",
  },
  surahNumBubble: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#EEE8DF", alignItems: "center", justifyContent: "center",
  },
  surahNumBubbleActive: { backgroundColor: "#1A1A1A" },
  surahNumText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahNumTextActive: { color: "#FFFFFF" },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  surahMeta: { fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular", marginTop: 2 },

  juzHeader: {
    paddingVertical: 12, marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D6D3D1",
  },
  juzHeaderText: {
    fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 4,
  },
  juzHeaderSub: { fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular" },

  // ── Step 3: Ayah grid ────────────────────────────────────────────────────
  juzAyahGroup: { marginBottom: 12 },
  ayahIntroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  ayahIntroText: { flex: 1 },
  ayahGridLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", marginBottom: 4,
  },
  ayahGridSub: {
    fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  ayahGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  ayahBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EEE8DF", alignItems: "center", justifyContent: "center",
  },
  ayahBubbleMemorized: { backgroundColor: "#16A34A" },
  ayahBubbleSelected: { backgroundColor: "#1A1A1A" },
  ayahBubbleText: {
    fontSize: 13, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold",
  },
  ayahBubbleTextActive: { color: "#FFFFFF" },

  availabilityChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F6F2EA", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  availabilityText: { flex: 1, fontSize: 13, color: "#71717A", fontFamily: "Inter_400Regular" },
  availabilityBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },

  // ── Step 4: Quantity slider ───────────────────────────────────────────────
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

  commitmentLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C", letterSpacing: 1.2,
    fontFamily: "Inter_700Bold", textTransform: "uppercase",
    textAlign: "center", marginTop: 12, marginBottom: 10,
  },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#D6D3D1" },
  dotFilled: { backgroundColor: "#1A1A1A" },

  infoPager: {
    marginBottom: sp.md,
    overflow: "hidden",
  },
  infoPagerDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: sp.sm,
  },
  infoPagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D6D3D1",
  },
  infoPagerDotActive: {
    backgroundColor: "#1A1A1A",
  },
  infoCard: {
    backgroundColor: "#F6F2EA",
    borderRadius: br.lg,
    padding: sp.lg,
  },
  infoCardTitle: {
    fontSize: ty.fontSize.xs,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: sp.xs,
  },
  infoCardText: {
    fontSize: ty.fontSize.sm,
    color: "#71717A",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  infoCardBold: {
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
  },
  estimateCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: br.lg,
    padding: sp.lg,
    marginBottom: sp.lg,
    gap: sp.xs,
  },
  estimateLabel: {
    fontSize: ty.fontSize.xs,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  estimateText: {
    fontSize: ty.fontSize.base,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  estimateBold: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  estimateSub: {
    fontSize: ty.fontSize.xs,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Summary card at bottom of step 4
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
  resetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  resetCard: {
    backgroundColor: "#FDFBF7",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#D6D3D1",
    shadowColor: "#5D4A37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  resetTitle: {
    fontSize: 20, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 10,
  },
  resetMessage: {
    fontSize: 14, color: "#71717A", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 21, marginBottom: 24,
  },
  resetPrimaryBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  resetPrimaryBtnText: {
    fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold",
  },
  resetCancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  resetCancelText: {
    fontSize: 15, color: "#A8A29E", fontFamily: "Inter_400Regular",
  },
});
