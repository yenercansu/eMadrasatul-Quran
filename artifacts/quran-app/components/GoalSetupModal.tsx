import React, { useState, useRef, useEffect } from "react";
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
import { SURAH_DATA } from "@/constants/surahData";
import type { Goal, MemorizationGoal } from "@/contexts/QuranContext";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 50];

function AyahSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 26;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(Math.max(1, Math.min(100, Math.round((x / (trackWidthRef.current || 1)) * 99) + 1)));
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(Math.max(1, Math.min(100, Math.round((x / (trackWidthRef.current || 1)) * 99) + 1)));
      },
    })
  ).current;

  const thumbLeft = trackWidth > 0 ? ((value - 1) / 99) * (trackWidth - THUMB) : 0;

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
      {trackWidth > 0 && (
        <View style={[s.sliderThumb, { left: thumbLeft }]} />
      )}
    </View>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={s.progressBar}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[s.progressSegment, i <= step && s.progressSegmentFilled]} />
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete: (memorizationGoal: MemorizationGoal, dailyGoal: Goal) => void;
}

export function GoalSetupModal({ visible, onClose, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [path, setPath] = useState<"juz" | "surah">("juz");
  const [selectedSurah, setSelectedSurah] = useState<typeof SURAH_DATA[0] | null>(null);
  const [ayahsPerDay, setAyahsPerDay] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setStep(1);
      setPath("juz");
      setSelectedSurah(null);
      setAyahsPerDay(10);
      setSearch("");
    }
  }, [visible]);

  const filteredSurahs = SURAH_DATA.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.englishName.toLowerCase().includes(q) ||
      item.name.includes(search) ||
      String(item.number).includes(q) ||
      String(item.juz).includes(q)
    );
  });

  const handleComplete = () => {
    const startSurah = selectedSurah ?? SURAH_DATA[0];
    onComplete(
      {
        path,
        startSurahNumber: startSurah.number,
        startSurahName: startSurah.englishName,
        startDate: new Date().toISOString().split("T")[0],
      },
      {
        ayahsPerDay,
        startDate: new Date().toISOString().split("T")[0],
        startSurahNumber: startSurah.number,
        startAyahNumber: 1,
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
              {step === 1 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
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
                  <Text style={s.stepLabel}>STEP 1 OF 3</Text>
                </ScrollView>
              )}

              {step === 2 && (
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
                        placeholder="Search Surah or Juz"
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
                      style={s.primaryBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setStep(3);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.primaryBtnText}>Next</Text>
                      <Feather name="arrow-right" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={s.stepLabel}>STEP 2 OF 3</Text>
                  </View>
                </>
              )}

              {step === 3 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.stepPad}>
                  <View style={s.stepHeader}>
                    <TouchableOpacity onPress={() => setStep(2)} style={s.backBtn} activeOpacity={0.7}>
                      <Feather name="chevron-left" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={s.stepTitle}>Set Your Daily Goal</Text>
                    <View style={{ width: 32 }} />
                  </View>
                  <ProgressBar step={3} />

                  <Text style={s.targetLabel}>TARGET VOLUME</Text>
                  <Text style={s.targetNum}>{ayahsPerDay}</Text>
                  <Text style={s.targetUnit}>Ayahs per day</Text>

                  <View style={s.sliderRangeRow}>
                    <Text style={s.sliderRangeText}>1</Text>
                    <Text style={s.sliderRangeText}>100</Text>
                  </View>
                  <AyahSlider value={ayahsPerDay} onChange={setAyahsPerDay} />

                  <Text style={s.commitmentLabel}>DAILY COMMITMENT STEPS</Text>
                  <View style={s.dots}>
                    {COMMITMENT_STEPS.map((step) => (
                      <View key={step} style={[s.dot, ayahsPerDay >= step && s.dotFilled]} />
                    ))}
                  </View>

                  <View style={s.consistencyCard}>
                    <Text style={s.consistencyTitle}>CONSISTENCY IS KEY</Text>
                    <Text style={s.consistencyText}>
                      Setting a sustainable goal is better than starting too fast. You can always adjust your pace as you grow.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={handleComplete}
                    activeOpacity={0.85}
                  >
                    <Text style={s.primaryBtnText}>Start Learning</Text>
                    <Feather name="check" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={s.stepLabel}>STEP 3 OF 3</Text>
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
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  stepPad: { paddingHorizontal: 20, paddingBottom: 8 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E0E0E0", alignSelf: "center",
    marginTop: 12, marginBottom: 24,
  },

  bigTitle: {
    fontSize: 26, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8,
  },
  bigSub: {
    fontSize: 14, color: "#8E8E93", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 21, marginBottom: 28,
  },

  pathCards: { gap: 12, marginBottom: 28 },
  pathCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8E8ED",
    padding: 20,
    minHeight: 84,
  },
  pathCardSelected: { borderColor: "#1A1A1A" },
  pathCardBody: { flex: 1 },
  pathCardTitle: {
    fontSize: 17, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", marginBottom: 5,
  },
  pathCardSub: { fontSize: 13, color: "#8E8E93", fontFamily: "Inter_400Regular" },
  pathCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
    marginLeft: 12,
  },

  primaryBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold",
  },
  stepLabel: {
    textAlign: "center", fontSize: 11, color: "#C0C0C0",
    fontFamily: "Inter_400Regular", letterSpacing: 0.5, marginBottom: 4,
  },

  stepHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingTop: 16, marginBottom: 16,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  stepTitle: {
    fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold",
  },

  progressBar: { flexDirection: "row", gap: 4, marginBottom: 20 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#E0E0E0" },
  progressSegmentFilled: { backgroundColor: "#1A1A1A" },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F2F2F7", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1A1A1A", fontFamily: "Inter_400Regular" },

  surahRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8E8ED",
  },
  surahNumBubble: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center",
  },
  surahNumBubbleActive: { backgroundColor: "#1A1A1A" },
  surahNumText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahNumTextActive: { color: "#FFFFFF" },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  surahMeta: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 2 },

  targetLabel: {
    fontSize: 11, fontWeight: "700", color: "#8E8E93",
    letterSpacing: 1.5, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 6,
  },
  targetNum: {
    fontSize: 80, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 90,
  },
  targetUnit: {
    fontSize: 15, color: "#8E8E93", fontFamily: "Inter_400Regular",
    textAlign: "center", marginBottom: 20,
  },

  sliderRangeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sliderRangeText: { fontSize: 12, color: "#C0C0C0", fontFamily: "Inter_400Regular" },

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

  commitmentLabel: {
    fontSize: 11, fontWeight: "700", color: "#8E8E93", letterSpacing: 1.2,
    fontFamily: "Inter_700Bold", textTransform: "uppercase",
    textAlign: "center", marginTop: 12, marginBottom: 10,
  },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#E0E0E0" },
  dotFilled: { backgroundColor: "#1A1A1A" },

  consistencyCard: {
    backgroundColor: "#F2F2F7", borderRadius: 14,
    padding: 16, marginBottom: 24,
  },
  consistencyTitle: {
    fontSize: 12, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 6,
  },
  consistencyText: {
    fontSize: 13, color: "#5A5A5A", fontFamily: "Inter_400Regular", lineHeight: 19,
  },
});
