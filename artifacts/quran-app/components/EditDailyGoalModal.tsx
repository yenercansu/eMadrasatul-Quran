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
  currentStartAyah: number;
  currentAyahsPerWeek: number;
  memorizedAyahKeys?: string[];
  onSave: (next: { startAyahNumber: number; ayahsPerWeek: number }) => void;
  onClose: () => void;
}

export function EditDailyGoalModal({
  visible,
  surahName,
  surahNumber,
  ayahCount,
  currentStartAyah,
  currentAyahsPerWeek,
  memorizedAyahKeys = [],
  onSave,
  onClose,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [startAyahNumber, setStartAyahNumber] = useState(currentStartAyah);
  const [ayahsPerWeek, setAyahsPerWeek] = useState(currentAyahsPerWeek);

  const maxFromStart = useMemo(
    () => Math.max(1, Math.min(MAX_WEEKLY, ayahCount - startAyahNumber + 1)),
    [ayahCount, startAyahNumber]
  );
  const endingAyah = Math.min(ayahCount, startAyahNumber + ayahsPerWeek - 1);

  useEffect(() => {
    if (!visible) return;
    const safeStart = Math.max(1, Math.min(ayahCount || 1, currentStartAyah || 1));
    const safeMax = Math.max(1, Math.min(MAX_WEEKLY, (ayahCount || 1) - safeStart + 1));
    setStep(1);
    setStartAyahNumber(safeStart);
    setAyahsPerWeek(Math.max(1, Math.min(safeMax, currentAyahsPerWeek || 1)));
  }, [visible, ayahCount, currentStartAyah, currentAyahsPerWeek]);

  useEffect(() => {
    setAyahsPerWeek((prev) => Math.max(1, Math.min(prev, maxFromStart)));
  }, [maxFromStart]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.handle} />

              {step === 1 ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.stepHeader}>
                    <Text style={s.title}>Starting Ayah</Text>
                    <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                      <Feather name="x" size={20} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>
                  <ProgressBar step={1} />
                  <Text style={s.sub}>{surahName}</Text>
                  <Text style={s.ayahGridLabel}>SELECT STARTING AYAH</Text>

                  <View style={s.ayahGrid}>
                    {Array.from({ length: ayahCount }, (_, i) => i + 1).map((ayahNum) => {
                      const key = `${surahNumber}:${ayahNum}`;
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
                    })}
                  </View>

                  <View style={s.rangeChip}>
                    <Feather name="map-pin" size={13} color="#1A1A1A" />
                    <Text style={s.rangeChipText}>
                      Starting Ayah: <Text style={s.rangeChipBold}>{startAyahNumber}</Text>
                    </Text>
                  </View>

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
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
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
                    <Feather name="info" size={12} color="#8E8E93" />
                    <Text style={s.limitText}>
                      Max <Text style={s.limitBold}>{maxFromStart}</Text> ayahs from Ayah {startAyahNumber}
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
                      <Text style={s.summaryLabel}>Surah</Text>
                      <Text style={s.summaryValue}>{surahName}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Starting Ayah</Text>
                      <Text style={s.summaryValue}>{startAyahNumber}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Ending Ayah</Text>
                      <Text style={s.summaryValue}>{endingAyah}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Weekly Goal</Text>
                      <Text style={[s.summaryValue, s.summaryValueBold]}>{ayahsPerWeek} Ayahs</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSave({ startAyahNumber, ayahsPerWeek });
                      onClose();
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.primaryBtnText}>Update Goal</Text>
                    <Feather name="check" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={s.stepLabel}>STEP 2 OF 2</Text>
                </ScrollView>
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 12,
  },
  stepPad: { paddingHorizontal: 24, paddingBottom: 44 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", flex: 1,
  },
  sub: {
    fontSize: 14, color: "#8E8E93", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, marginBottom: 18,
  },
  progressBar: { flexDirection: "row", gap: 4, marginBottom: 18 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#E0E0E0" },
  progressSegmentFilled: { backgroundColor: "#1A1A1A" },

  ayahGridLabel: {
    fontSize: 11, fontWeight: "700", color: "#8E8E93",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", marginBottom: 12,
  },
  ayahGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  ayahBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center",
  },
  ayahBubbleMemorized: { backgroundColor: "#16A34A" },
  ayahBubbleSelected: { backgroundColor: "#1A1A1A" },
  ayahBubbleText: {
    fontSize: 13, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold",
  },
  ayahBubbleTextActive: { color: "#FFFFFF" },
  rangeChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F2F2F7", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  rangeChipText: { fontSize: 13, color: "#5A5A5A", fontFamily: "Inter_400Regular" },
  rangeChipBold: { color: "#1A1A1A", fontFamily: "Inter_700Bold" },

  pinWrapper: { alignItems: "center", marginBottom: 8 },
  valueBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  valueNum: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  valuePin: {
    width: 4, height: 14,
    backgroundColor: "#1A1A1A", borderRadius: 2,
  },
  valueLabel: {
    fontSize: 11, fontWeight: "700", color: "#8E8E93",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 12,
  },
  limitChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#F2F2F7", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
  limitText: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular" },
  limitBold: { color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sliderRangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sliderRangeText: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_700Bold" },
  sliderContainer: { height: 44, justifyContent: "center", marginBottom: 4 },
  sliderTrack: { height: 3, backgroundColor: "#E0E0E0", borderRadius: 2 },
  sliderFill: { position: "absolute", height: 3, backgroundColor: "#1A1A1A", borderRadius: 2 },
  sliderThumb: {
    position: "absolute",
    top: -11.5,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#1A1A1A",
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 8, marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#E0E0E0" },
  dotFilled: { backgroundColor: "#1A1A1A" },
  summaryCard: {
    backgroundColor: "#F8F8FA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8ED",
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  summaryLabel: { fontSize: 13, color: "#8E8E93", fontFamily: "Inter_400Regular" },
  summaryValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
  summaryValueBold: { color: "#16A34A" },
  summaryDivider: { height: 1, backgroundColor: "#E8E8ED", marginVertical: 10 },
  primaryBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  stepLabel: {
    textAlign: "center", fontSize: 11, color: "#C0C0C0",
    fontFamily: "Inter_400Regular", letterSpacing: 0.5, marginTop: 12,
  },
});
