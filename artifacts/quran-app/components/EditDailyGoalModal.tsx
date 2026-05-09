import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  PanResponder,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getJuzAyahs, getWeeklyGoalAyahsFrom, SURAH_DATA } from "@/constants/surahData";
import { useQuran } from "@/contexts/QuranContext";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45];
const MAX_WEEKLY = 45;

function AyahSlider({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 26;

  const clampValue = (x: number) => {
    if (max <= 1) return 1;
    return Math.max(1, Math.min(max, Math.round((x / (trackWidthRef.current || 1)) * (max - 1)) + 1));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(clampValue(x));
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(clampValue(x));
      },
    })
  ).current;

  const thumbLeft = trackWidth > 0 && max > 1 ? ((value - 1) / (max - 1)) * (trackWidth - THUMB) : 0;

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

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <View style={s.progressBar}>
      {[1, 2].map((i) => (
        <View key={i} style={[s.progressSegment, i <= step && s.progressSegmentFilled]} />
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  surahName: string;
  surahNumber: number;
  ayahCount: number;
  targetPath?: "surah" | "juz";
  targetJuz?: number;
  currentStartAyah: number;
  currentAyahsPerWeek: number;
  memorizedAyahKeys?: string[];
  onSave: (next: { startSurahNumber: number; startAyahNumber: number; ayahsPerWeek: number }) => void;
  onClose: () => void;
}

export function EditDailyGoalModal({
  visible,
  surahName,
  surahNumber,
  ayahCount,
  targetPath = "surah",
  targetJuz,
  currentStartAyah,
  currentAyahsPerWeek,
  memorizedAyahKeys = [],
  onSave,
  onClose,
}: Props) {
  const { removeMemorizedAyahKeys } = useQuran();
  const [step, setStep] = useState<1 | 2>(1);
  const [startSurahNumber, setStartSurahNumber] = useState(surahNumber);
  const [startAyahNumber, setStartAyahNumber] = useState(currentStartAyah);
  const [ayahsPerWeek, setAyahsPerWeek] = useState(currentAyahsPerWeek);
  const [resetVisible, setResetVisible] = useState(false);

  const targetAyahs = useMemo(() => {
    if (targetPath === "juz" && targetJuz) return getJuzAyahs(targetJuz);
    const surah = SURAH_DATA[surahNumber - 1];
    if (!surah) return [];
    return Array.from({ length: ayahCount }, (_, i) => ({
      surahNumber,
      surahName,
      ayahNumber: i + 1,
    }));
  }, [targetPath, targetJuz, surahNumber, surahName, ayahCount]);

  const targetGroups = useMemo(() => {
    const groups: { surahNumber: number; surahName: string; ayahs: number[] }[] = [];
    for (const ayah of targetAyahs) {
      const last = groups[groups.length - 1];
      if (last?.surahNumber === ayah.surahNumber) last.ayahs.push(ayah.ayahNumber);
      else groups.push({ surahNumber: ayah.surahNumber, surahName: ayah.surahName, ayahs: [ayah.ayahNumber] });
    }
    return groups;
  }, [targetAyahs]);

  const maxFromStart = useMemo(
    () => {
      const idx = targetAyahs.findIndex(a => a.surahNumber === startSurahNumber && a.ayahNumber === startAyahNumber);
      return Math.max(1, Math.min(MAX_WEEKLY, idx >= 0 ? targetAyahs.length - idx : 1));
    },
    [targetAyahs, startSurahNumber, startAyahNumber]
  );
  const weeklySelection = useMemo(() => getWeeklyGoalAyahsFrom(
    startSurahNumber,
    startAyahNumber,
    ayahsPerWeek,
    targetPath === "juz" && targetJuz ? { path: "juz", juz: targetJuz } : { path: "surah" }
  ), [startSurahNumber, startAyahNumber, ayahsPerWeek, targetPath, targetJuz]);
  const endingAyah = weeklySelection[weeklySelection.length - 1];

  useEffect(() => {
    if (!visible) return;
    const fallback = targetAyahs[0] ?? { surahNumber, ayahNumber: 1 };
    const currentExists = targetAyahs.some(a => a.surahNumber === surahNumber && a.ayahNumber === currentStartAyah);
    const safeStartSurah = currentExists ? surahNumber : fallback.surahNumber;
    const safeStartAyah = currentExists ? currentStartAyah : fallback.ayahNumber;
    const startIdx = targetAyahs.findIndex(a => a.surahNumber === safeStartSurah && a.ayahNumber === safeStartAyah);
    const safeMax = Math.max(1, Math.min(MAX_WEEKLY, startIdx >= 0 ? targetAyahs.length - startIdx : 1));
    setStep(1);
    setStartSurahNumber(safeStartSurah);
    setStartAyahNumber(safeStartAyah);
    setAyahsPerWeek(Math.max(1, Math.min(safeMax, currentAyahsPerWeek || 1)));
    setResetVisible(false);
  }, [visible, targetAyahs, surahNumber, currentStartAyah, currentAyahsPerWeek]);

  useEffect(() => {
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, maxFromStart)));
  }, [maxFromStart]);

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeMemorizedAyahKeys(targetAyahs.map(a => `${a.surahNumber}:${a.ayahNumber}`));
    setResetVisible(false);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.sheet}>
                <View style={s.handle} />

                {step === 1 ? (
                  <>
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                    <View style={s.stepHeader}>
                      <Text style={s.title}>Starting Ayah</Text>
                      <View style={s.headerRight}>
                        <TouchableOpacity
                          style={s.resetBtn}
                          onPress={() => setResetVisible(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.resetBtnText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                          <Feather name="x" size={20} color="#1A1A1A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <ProgressBar step={1} />
                    <Text style={s.sub}>{targetPath === "juz" && targetJuz ? `Juz ${targetJuz}` : surahName}</Text>
                    <Text style={s.ayahGridLabel}>SELECT STARTING AYAH</Text>

                    {targetGroups.map((group) => (
                      <View key={group.surahNumber} style={s.ayahGroup}>
                        {targetPath === "juz" && (
                          <Text style={s.ayahGroupTitle}>{group.surahName}</Text>
                        )}
                        <View style={s.ayahGrid}>
                          {group.ayahs.map((ayahNum) => {
                            const key = `${group.surahNumber}:${ayahNum}`;
                            const isMemorized = memorizedAyahKeys.includes(key);
                            const isSelected = startSurahNumber === group.surahNumber && startAyahNumber === ayahNum;
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
                                  setStartSurahNumber(group.surahNumber);
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
                    ))}

                    <View style={s.rangeChip}>
                      <Feather name="map-pin" size={13} color="#1A1A1A" />
                      <Text style={s.rangeChipText}>
                        Starting Ayah: <Text style={s.rangeChipBold}>{SURAH_DATA[startSurahNumber - 1]?.englishName ?? surahName} {startAyahNumber}</Text>
                      </Text>
                    </View>

                  </ScrollView>
                  <View style={s.pinnedCta}>
                    <TouchableOpacity
                      style={s.primaryBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setStep(2);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.primaryBtnText}>Next</Text>
                      <Feather name="arrow-right" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={s.stepLabel}>STEP 1 OF 2</Text>
                  </View>
                  </>
                ) : (
                  <>
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                    <View style={s.stepHeader}>
                      <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn} activeOpacity={0.7}>
                        <Feather name="chevron-left" size={22} color="#1A1A1A" />
                      </TouchableOpacity>
                      <Text style={s.title}>Weekly Quantity</Text>
                      <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                        <Feather name="x" size={20} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>
                    <ProgressBar step={2} />

                    <View style={s.pinWrapper}>
                      <View style={s.valueBadge}>
                        <Text style={s.valueNum}>{ayahsPerWeek}</Text>
                      </View>
                      <View style={s.valuePin} />
                    </View>
                    <Text style={s.valueLabel}>AYAHS PER WEEK</Text>

                    <View style={s.limitChip}>
                      <Feather name="info" size={12} color="#78716C" />
                      <Text style={s.limitText}>
                        Max <Text style={s.limitBold}>{maxFromStart}</Text> ayahs from {SURAH_DATA[startSurahNumber - 1]?.englishName ?? surahName} {startAyahNumber}
                      </Text>
                    </View>

                    <View style={s.sliderRangeRow}>
                      <Text style={s.sliderRangeText}>1</Text>
                      <Text style={s.sliderRangeText}>{maxFromStart}</Text>
                    </View>
                    <AyahSlider value={ayahsPerWeek} onChange={setAyahsPerWeek} max={maxFromStart} />

                    <View style={s.dots}>
                      {COMMITMENT_STEPS.filter((item) => item <= maxFromStart).map((item) => (
                        <View key={item} style={[s.dot, ayahsPerWeek >= item && s.dotFilled]} />
                      ))}
                    </View>

                    <View style={s.summaryCard}>
                      <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>{targetPath === "juz" ? "Juz" : "Surah"}</Text>
                        <Text style={s.summaryValue}>{targetPath === "juz" && targetJuz ? `Juz ${targetJuz}` : surahName}</Text>
                      </View>
                      <View style={s.summaryDivider} />
                      <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>Starting Ayah</Text>
                        <Text style={s.summaryValue}>{SURAH_DATA[startSurahNumber - 1]?.englishName ?? surahName} {startAyahNumber}</Text>
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
                    <TouchableOpacity
                      style={s.primaryBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onSave({ startSurahNumber, startAyahNumber, ayahsPerWeek });
                        onClose();
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.primaryBtnText}>Update Goal</Text>
                      <Feather name="check" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={s.stepLabel}>STEP 2 OF 2</Text>
                  </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={() => setResetVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setResetVisible(false)}>
          <View style={s.resetOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.resetCard}>
                <Text style={s.resetTitle}>Reset Progress?</Text>
                <Text style={s.resetBody}>
                  This will reset all your memorization progress for this target. Are you sure you want to continue?
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
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FDFBF7",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 12,
  },
  stepPad: { paddingHorizontal: 24, paddingBottom: 44 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E7E5DB", alignSelf: "center", marginBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", flex: 1,
  },
  sub: {
    fontSize: 14, color: "#78716C", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, marginBottom: 18,
  },
  progressBar: { flexDirection: "row", gap: 4, marginBottom: 18 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#E7E5DB" },
  progressSegmentFilled: { backgroundColor: "#1A1A1A" },

  ayahGridLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", marginBottom: 12,
  },
  ayahGroup: { marginBottom: 12 },
  ayahGroupTitle: {
    fontSize: 13, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", marginBottom: 8,
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
  rangeChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F6F2EA", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  rangeChipText: { fontSize: 13, color: "#71717A", fontFamily: "Inter_400Regular" },
  rangeChipBold: { color: "#1A1A1A", fontFamily: "Inter_700Bold" },

  pinWrapper: { alignItems: "center", marginBottom: 8 },
  valueBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  valueNum: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  valuePin: { width: 4, height: 14, backgroundColor: "#1A1A1A", borderRadius: 2 },
  valueLabel: {
    fontSize: 11, fontWeight: "700", color: "#78716C",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 12,
  },
  limitChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#F6F2EA", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
  limitText: { fontSize: 12, color: "#78716C", fontFamily: "Inter_400Regular" },
  limitBold: { color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sliderRangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sliderRangeText: { fontSize: 11, color: "#78716C", fontFamily: "Inter_700Bold" },
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
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 8, marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#D6D3D1" },
  dotFilled: { backgroundColor: "#1A1A1A" },
  summaryCard: {
    backgroundColor: "#F6F2EA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D3D1",
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  summaryLabel: { fontSize: 13, color: "#78716C", fontFamily: "Inter_400Regular" },
  summaryValue: {
    flexShrink: 1, textAlign: "right",
    fontSize: 14, color: "#1A1A1A", fontFamily: "Inter_700Bold",
  },
  summaryValueBold: { color: "#16A34A" },
  summaryDivider: { height: 1, backgroundColor: "#D6D3D1", marginVertical: 10 },
  pinnedCta: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: "#FDFBF7",
  },
  primaryBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  stepLabel: {
    textAlign: "center", fontSize: 11, color: "#A8A29E",
    fontFamily: "Inter_400Regular", letterSpacing: 0.5, marginTop: 12,
  },

  // ── Reset button (small, secondary, top-right) ──────────────────────────────
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6D3D1",
  },
  resetBtnText: {
    fontSize: 12, fontWeight: "600", color: "#78716C",
    fontFamily: "Inter_600SemiBold",
  },

  // ── Reset confirmation popup ────────────────────────────────────────────────
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
  resetBody: {
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
