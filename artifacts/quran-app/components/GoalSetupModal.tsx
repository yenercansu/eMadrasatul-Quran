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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getJuzAyahs, getWeeklyGoalAyahsFrom, JUZ_STARTS, SURAH_DATA } from "@/constants/surahData";
import type { Goal, MemorizationGoal } from "@/contexts/QuranContext";
import { useQuran } from "@/contexts/QuranContext";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45];
const MAX_WEEKLY = 45;

function AyahSlider({
  value,
  onChange,
  maxValue = MAX_WEEKLY,
}: {
  value: number;
  onChange: (v: number) => void;
  maxValue?: number;
}) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 26;

  const clamp = (x: number) =>
    Math.max(1, Math.min(maxValue, Math.round((x / (trackWidthRef.current || 1)) * (maxValue - 1)) + 1));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => onChange(clamp(Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX)))),
      onPanResponderMove: (evt) => onChange(clamp(Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX)))),
    })
  ).current;

  const thumbLeft = trackWidth > 0 && maxValue > 1 ? ((value - 1) / (maxValue - 1)) * (trackWidth - THUMB) : 0;

  return (
    <View
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete: (memorizationGoal: MemorizationGoal, weeklyGoal: Goal) => void;
}

export function GoalSetupModal({ visible, onClose, onComplete }: Props) {
  const { memorizedAyahKeys } = useQuran();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [path, setPath] = useState<"juz" | "surah" | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<(typeof SURAH_DATA)[0] | null>(null);
  const [startAyahNumber, setStartAyahNumber] = useState(1);
  const [ayahsPerWeek, setAyahsPerWeek] = useState(3);
  const [search, setSearch] = useState("");

  // Reset everything when modal opens
  useEffect(() => {
    if (visible) {
      setStep(1);
      setPath(null);
      setSelectedJuz(null);
      setSelectedSurah(null);
      setStartAyahNumber(1);
      setAyahsPerWeek(3);
      setSearch("");
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
    if (!search) return SURAH_DATA;
    const q = search.toLowerCase();
    return SURAH_DATA.filter(
      (item) =>
        item.englishName.toLowerCase().includes(q) ||
        item.name.includes(search) ||
        String(item.number).includes(q) ||
        String(item.juz).includes(q)
    );
  }, [search]);

  const filteredJuzGroups = useMemo(() => {
    if (!search) return juzGroups;
    const q = search.toLowerCase();
    return juzGroups.filter((group) => {
      const ayahs = getJuzAyahs(group.juz);
      return String(group.juz).includes(q) || ayahs.some((a) => {
        const surah = SURAH_DATA[a.surahNumber - 1];
        return surah?.englishName.toLowerCase().includes(q) || surah?.name.includes(search);
      });
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
      },
      {
        ayahsPerWeek: cappedAyahsPerWeek,
        startDate: new Date().toISOString().split("T")[0],
        startSurahNumber: selectedSurah.number,
        startAyahNumber,
      }
    );
    onClose();
  };

  const sheetHeight = step === 1 ? "68%" : "92%";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={step === 1 ? onClose : undefined}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={[s.sheet, { height: sheetHeight as any }]}>

              {/* ── STEP 1: Memorization Mode ───────────────────────────────── */}
              {step === 1 && (
                <>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.handle} />
                  <Text style={s.bigTitle}>Choose Path</Text>
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
                      <View style={{ width: 32 }} />
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
                      <View style={{ width: 32 }} />
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
                    <View style={{ width: 32 }} />
                  </View>
                  <ProgressBar step={3} />

                  <Text style={s.ayahGridLabel}>
                    SELECT STARTING AYAH • {path === "juz" ? `Juz ${selectedJuz}` : selectedSurah?.englishName ?? ""}
                  </Text>
                  <Text style={s.ayahGridSub}>
                    Green = already memorized. Tap an ayah to set your starting point.
                  </Text>

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
                    <TouchableOpacity onPress={() => setStep(3)} style={s.backBtn} activeOpacity={0.7}>
                      <Feather name="chevron-left" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={s.stepTitle}>Set Your Weekly Goal</Text>
                    <View style={{ width: 32 }} />
                  </View>
                  <ProgressBar step={4} />

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

                  <View style={s.consistencyCard}>
                    <Text style={s.consistencyTitle}>CONSISTENCY IS KEY</Text>
                    <Text style={s.consistencyText}>
                      Setting a sustainable weekly goal is better than starting too fast. You can always
                      adjust your pace as you grow.
                    </Text>
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
                      <Text style={s.summaryValue}>{endingAyah ? `${endingAyah.surahName} ${endingAyah.ayahNumber}` : startAyahNumber}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Weekly Goal</Text>
                      <Text style={[s.summaryValue, s.summaryValueBold]}>{ayahsPerWeek} Ayahs</Text>
                    </View>
                  </View>

                </ScrollView>
                <View style={s.pinnedCta}>
                  <TouchableOpacity style={s.primaryBtn} onPress={handleComplete} activeOpacity={0.85}>
                    <Text style={s.primaryBtnText}>Start Learning</Text>
                    <Feather name="check" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={s.stepLabel}>STEP 4 OF 4</Text>
                </View>
                </>
              )}

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FDFBF7",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  stepPad: { paddingHorizontal: 20, paddingBottom: 16 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E7E5DB", alignSelf: "center",
    marginTop: 12, marginBottom: 24,
  },

  bigTitle: {
    fontSize: 26, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8,
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
  ayahGridLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", marginBottom: 4,
  },
  ayahGridSub: {
    fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular",
    lineHeight: 18, marginBottom: 16,
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

  consistencyCard: {
    backgroundColor: "#F6F2EA", borderRadius: 14, padding: 16, marginBottom: 16,
  },
  consistencyTitle: {
    fontSize: 12, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 6,
  },
  consistencyText: {
    fontSize: 13, color: "#71717A", fontFamily: "Inter_400Regular", lineHeight: 19,
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
});
