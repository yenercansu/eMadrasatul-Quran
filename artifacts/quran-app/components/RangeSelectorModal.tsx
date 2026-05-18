import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
  TextInput,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { SURAH_DATA, type SurahMeta } from "@/constants/surahData";
import type { AyahRange } from "@/contexts/AudioContext";
import { searchByType } from "@/services/search";

interface Props {
  visible: boolean;
  currentSurah: number;
  currentAyah: number;
  onConfirm: (range: AyahRange, repeatCount: number) => void;
  onClose: () => void;
}

type Step = "start" | "end" | "repeat";

const REPEAT_OPTIONS = [1, 3, 5, 10];

function SurahPicker({
  label,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  selected: SurahMeta | null;
  onSelect: (s: SurahMeta) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [search, setSearch] = useState("");
  const s = styles(colors);

  const filtered = useMemo(() => searchByType("surah", search, SURAH_DATA), [search]);

  return (
    <View style={s.pickerContainer}>
      <Text style={s.pickerLabel}>{label}</Text>
      <View style={s.searchBar}>
        <Feather name="search" size={14} color={colors.mutedForeground} />
        <TextInput
          style={s.searchInput}
          placeholder="Search surah..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.number)}
        style={s.surahList}
        initialScrollIndex={0}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.surahItem, selected?.number === item.number && s.surahItemActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
          >
            <View style={s.surahItemNumber}>
              <Text style={[s.surahItemNumberText, selected?.number === item.number && { color: colors.primaryForeground }]}>
                {item.number}
              </Text>
            </View>
            <View style={s.surahItemInfo}>
              <Text style={[s.surahItemName, selected?.number === item.number && { color: colors.primaryForeground }]}>
                {item.englishName}
              </Text>
              <Text style={[s.surahItemCount, selected?.number === item.number && { color: "rgba(255,255,255,0.7)" }]}>
                {item.ayahCount} ayahs
              </Text>
            </View>
            <Text style={[s.surahItemArabic, selected?.number === item.number && { color: colors.primaryForeground }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: 56, offset: 56 * index, index })}
      />
    </View>
  );
}

function AyahPicker({
  label,
  surah,
  selectedAyah,
  onSelect,
  minAyah,
  colors,
}: {
  label: string;
  surah: SurahMeta;
  selectedAyah: number;
  onSelect: (n: number) => void;
  minAyah?: number;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);
  const ayahs = Array.from({ length: surah.ayahCount }, (_, i) => i + 1);
  const filtered = minAyah ? ayahs.filter(n => n >= minAyah) : ayahs;

  return (
    <View style={s.pickerContainer}>
      <Text style={s.pickerLabel}>{label} — {surah.englishName}</Text>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item)}
        style={s.ayahList}
        numColumns={5}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.ayahChip, selectedAyah === item && s.ayahChipActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
          >
            <Text style={[s.ayahChipText, selectedAyah === item && s.ayahChipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export function RangeSelectorModal({ visible, currentSurah, currentAyah, onConfirm, onClose }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("start");
  const [startSurahPick, setStartSurahPick] = useState<SurahMeta | null>(SURAH_DATA[currentSurah - 1] ?? null);
  const [startAyah, setStartAyah] = useState(currentAyah);
  const [startSurahDone, setStartSurahDone] = useState(false);
  const [endSurahPick, setEndSurahPick] = useState<SurahMeta | null>(SURAH_DATA[currentSurah - 1] ?? null);
  const [endAyah, setEndAyah] = useState(currentAyah);
  const [endSurahDone, setEndSurahDone] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);

  const handleOpen = useCallback(() => {
    setStep("start");
    setStartSurahPick(SURAH_DATA[currentSurah - 1] ?? null);
    setStartAyah(currentAyah);
    setStartSurahDone(false);
    setEndSurahPick(SURAH_DATA[currentSurah - 1] ?? null);
    setEndAyah(currentAyah);
    setEndSurahDone(false);
    setRepeatCount(1);
  }, [currentSurah, currentAyah]);

  const handleConfirm = () => {
    if (!startSurahPick || !endSurahPick) return;
    const range: AyahRange = {
      startSurah: startSurahPick.number,
      startAyah,
      endSurah: endSurahPick.number,
      endAyah,
    };
    onConfirm(range, repeatCount);
    onClose();
  };

  const stepTitle = step === "start" ? "Select Start" : step === "end" ? "Select End" : "Repeat";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={onClose}
            style={s.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>Play Range</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={s.stepRow}>
          {(["start", "end", "repeat"] as Step[]).map((st, i) => (
            <React.Fragment key={st}>
              <TouchableOpacity
                style={[s.stepDot, step === st && s.stepDotActive]}
                onPress={() => setStep(st)}
              >
                <Text style={[s.stepDotText, step === st && s.stepDotTextActive]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
              {i < 2 && <View style={s.stepLine} />}
            </React.Fragment>
          ))}
        </View>

        <View style={s.stepLabelRow}>
          <Text style={[s.stepLabel, step === "start" && s.stepLabelActive]}>Start</Text>
          <View style={{ flex: 1 }} />
          <Text style={[s.stepLabel, step === "end" && s.stepLabelActive]}>End</Text>
          <View style={{ flex: 1 }} />
          <Text style={[s.stepLabel, step === "repeat" && s.stepLabelActive]}>Repeat</Text>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryChip}>
            <Text style={s.summaryText} numberOfLines={1}>
              {startSurahPick?.englishName ?? "—"} : {startAyah}
            </Text>
          </View>
          <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
          <View style={s.summaryChip}>
            <Text style={s.summaryText} numberOfLines={1}>
              {endSurahPick?.englishName ?? "—"} : {endAyah}
            </Text>
          </View>
          <View style={s.summaryRepeat}>
            <Text style={s.summaryRepeatText}>{repeatCount}x</Text>
          </View>
        </View>

        <View style={s.content}>
          {step === "start" && (
            !startSurahDone ? (
              <SurahPicker
                label="Start Surah"
                selected={startSurahPick}
                onSelect={(s) => { setStartSurahPick(s); setStartAyah(1); setStartSurahDone(true); }}
                colors={colors}
              />
            ) : (
              <AyahPicker
                label="Start Ayah"
                surah={startSurahPick!}
                selectedAyah={startAyah}
                onSelect={(n) => { setStartAyah(n); }}
                colors={colors}
              />
            )
          )}

          {step === "end" && (
            !endSurahDone ? (
              <SurahPicker
                label="End Surah"
                selected={endSurahPick}
                onSelect={(s) => {
                  setEndSurahPick(s);
                  const minAyah = s.number === startSurahPick?.number ? startAyah : 1;
                  setEndAyah(s.number === startSurahPick?.number ? Math.max(startAyah, endAyah) : s.ayahCount);
                  setEndSurahDone(true);
                }}
                colors={colors}
              />
            ) : (
              <AyahPicker
                label="End Ayah"
                surah={endSurahPick!}
                selectedAyah={endAyah}
                onSelect={(n) => { setEndAyah(n); }}
                minAyah={endSurahPick?.number === startSurahPick?.number ? startAyah : 1}
                colors={colors}
              />
            )
          )}

          {step === "repeat" && (
            <View style={s.repeatContent}>
              <Text style={s.repeatTitle}>How many times?</Text>
              <Text style={s.repeatSub}>Repeat the entire selected range</Text>
              <View style={s.repeatGrid}>
                {REPEAT_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[s.repeatOption, repeatCount === n && s.repeatOptionActive]}
                    onPress={() => setRepeatCount(n)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.repeatOptionNum, repeatCount === n && s.repeatOptionNumActive]}>{n}</Text>
                    <Text style={[s.repeatOptionX, repeatCount === n && s.repeatOptionXActive]}>times</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          {step === "start" && (
            <>
              {startSurahDone && (
                <TouchableOpacity style={s.backBtn} onPress={() => setStartSurahDone(false)} activeOpacity={0.7}>
                  <Feather name="arrow-left" size={18} color={colors.foreground} />
                  <Text style={s.backBtnText}>Change Surah</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.nextBtn, !startSurahPick && s.nextBtnDisabled]}
                onPress={() => { setEndSurahDone(false); setStep("end"); }}
                activeOpacity={0.85}
                disabled={!startSurahPick}
              >
                <Text style={s.nextBtnText}>Set End</Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </>
          )}
          {step === "end" && (
            <>
              {endSurahDone && (
                <TouchableOpacity style={s.backBtn} onPress={() => setEndSurahDone(false)} activeOpacity={0.7}>
                  <Feather name="arrow-left" size={18} color={colors.foreground} />
                  <Text style={s.backBtnText}>Change Surah</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.nextBtn, !endSurahPick && s.nextBtnDisabled]}
                onPress={() => setStep("repeat")}
                activeOpacity={0.85}
                disabled={!endSurahPick}
              >
                <Text style={s.nextBtnText}>Set Repeat</Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </>
          )}
          {step === "repeat" && (
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="play" size={20} color={colors.primaryForeground} />
              <Text style={s.confirmBtnText}>Play Range</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 40,
      paddingVertical: 16,
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    stepDotActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    stepDotText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.mutedForeground,
      fontFamily: "Inter_700Bold",
    },
    stepDotTextActive: { color: colors.primaryForeground },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
    },
    stepLabelRow: {
      flexDirection: "row",
      paddingHorizontal: 24,
      marginTop: -8,
      marginBottom: 8,
    },
    stepLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    stepLabelActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    summaryChip: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    summaryText: {
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    summaryRepeat: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    summaryRepeatText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#000",
      fontFamily: "Inter_700Bold",
    },
    content: { flex: 1 },
    pickerContainer: { flex: 1 },
    pickerLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 38,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    surahList: { flex: 1 },
    surahItem: {
      flexDirection: "row",
      alignItems: "center",
      height: 56,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    surahItemActive: {
      backgroundColor: colors.primary,
    },
    surahItemNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.05)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    surahItemNumberText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
    },
    surahItemInfo: { flex: 1 },
    surahItemName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    surahItemCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    surahItemArabic: {
      fontSize: 18,
      color: colors.primary,
    },
    ayahList: { flex: 1, paddingHorizontal: 12 },
    ayahChip: {
      flex: 1,
      margin: 4,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
    },
    ayahChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    ayahChipText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    ayahChipTextActive: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    repeatContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    repeatTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
    },
    repeatSub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 32,
    },
    repeatGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      justifyContent: "center",
    },
    repeatOption: {
      width: 100,
      height: 100,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    repeatOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    repeatOptionNum: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    repeatOptionNumActive: { color: colors.primaryForeground },
    repeatOptionX: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    repeatOptionXActive: { color: "rgba(255,255,255,0.8)" },
    footer: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backBtnText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    nextBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
    },
    nextBtnDisabled: {
      opacity: 0.5,
    },
    nextBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    confirmBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
  });
