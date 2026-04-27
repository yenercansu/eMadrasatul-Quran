import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string; // Arabic ayah text (whitespace-separated words)
  onConfirm: (
    startWordIdx: number,
    endWordIdx: number,
    totalWords: number,
    repeatCount: number,
  ) => void;
}

const REPEAT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 3, label: "3×" },
  { value: 5, label: "5×" },
  { value: 10, label: "10×" },
  { value: 999, label: "∞" },
];

/**
 * Repeat Section Sheet — splits a SINGLE ayah into a smaller word-range
 * for piece-by-piece memorisation. Tap a word to set the start, tap
 * another to extend to end. Tap a word twice to clear and re-select.
 *
 * NOTE: words within an ayah audio are not individually timestamped
 * by the public API; the parent uses proportional timing
 * (startWordIdx / totalWords) when seeking the mp3.
 */
export function RepeatSectionSheet({
  visible, onClose, surahNumber, surahName, ayahNumber, ayahText, onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const words = useMemo(
    () => (ayahText || "").trim().split(/\s+/).filter(Boolean),
    [ayahText],
  );
  const [startIdx, setStartIdx] = useState<number | null>(null);
  const [endIdx, setEndIdx] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<number>(999);

  useEffect(() => {
    if (visible) {
      // default: whole ayah selected
      setStartIdx(0);
      setEndIdx(Math.max(0, words.length - 1));
      setRepeat(999);
    }
  }, [visible, words.length, ayahNumber, surahNumber]);

  const handleWordTap = (i: number) => {
    try { Haptics.selectionAsync(); } catch {}
    if (
      startIdx === null ||
      endIdx === null ||
      (startIdx !== endIdx) // a range is already drawn → start over
    ) {
      setStartIdx(i);
      setEndIdx(i);
      return;
    }
    // single word selected → extend in either direction
    if (i < startIdx) {
      setEndIdx(startIdx);
      setStartIdx(i);
    } else {
      setEndIdx(i);
    }
  };

  const handleSelectAll = () => {
    try { Haptics.selectionAsync(); } catch {}
    setStartIdx(0);
    setEndIdx(Math.max(0, words.length - 1));
  };

  const handleConfirm = () => {
    if (startIdx === null || endIdx === null || words.length === 0) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    onConfirm(
      Math.min(startIdx, endIdx),
      Math.max(startIdx, endIdx),
      words.length,
      repeat,
    );
    onClose();
  };

  const lo = startIdx !== null && endIdx !== null ? Math.min(startIdx, endIdx) : null;
  const hi = startIdx !== null && endIdx !== null ? Math.max(startIdx, endIdx) : null;
  const segLen = lo !== null && hi !== null ? hi - lo + 1 : 0;
  const summary =
    segLen === 0
      ? "tap a word to begin"
      : segLen === words.length
        ? "Whole ayah"
        : `${segLen} of ${words.length} words`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.handle} />

        <View style={s.headerRow}>
          <View style={{ width: 28 }} />
          <Text style={s.title}>Repeat Section</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={8}>
            <Feather name="x" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>tap the words to mark the section you want to repeat</Text>
        <Text style={s.summary}>
          {surahName} · Ayah {ayahNumber} · {summary}
        </Text>

        {/* Ayah words — wrapped, tappable */}
        <ScrollView
          style={s.wordsScroll}
          contentContainerStyle={s.wordsWrap}
          showsVerticalScrollIndicator={true}
        >
          {words.map((w, i) => {
            const inRange = lo !== null && hi !== null && i >= lo && i <= hi;
            const isStart = i === lo && segLen > 1;
            const isEnd = i === hi && segLen > 1;
            return (
              <TouchableOpacity
                key={`${i}-${w}`}
                onPress={() => handleWordTap(i)}
                activeOpacity={0.75}
                style={[
                  s.wordChip,
                  inRange && s.wordChipActive,
                  isStart && s.wordChipStart,
                  isEnd && s.wordChipEnd,
                ]}
              >
                <Text
                  style={[
                    s.wordText,
                    inRange && s.wordTextActive,
                  ]}
                >
                  {w}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7} style={s.selectAllBtn}>
          <Feather name="maximize-2" size={14} color="#1A1A1A" />
          <Text style={s.selectAllText}>Select whole ayah</Text>
        </TouchableOpacity>

        {/* Repeat count selector */}
        <Text style={s.repeatLabel}>REPEAT</Text>
        <View style={s.repeatRow}>
          {REPEAT_OPTIONS.map((opt) => {
            const active = repeat === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { try { Haptics.selectionAsync(); } catch {} setRepeat(opt.value); }}
                style={[s.repeatChip, active && s.repeatChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.repeatChipText, active && s.repeatChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={[s.saveBtn, (segLen === 0 || words.length === 0) && s.saveBtnDisabled]}
          onPress={handleConfirm}
          disabled={segLen === 0 || words.length === 0}
          activeOpacity={0.85}
        >
          <Ionicons name="repeat" size={18} color="#FFFFFF" />
          <Text style={s.saveBtnText}>Repeat Section</Text>
        </TouchableOpacity>
        {void surahNumber}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handle: { width: 40, height: 4, backgroundColor: "#DEDEDE", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
  summary: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 14 },

  wordsScroll: { flexGrow: 0, maxHeight: 280 },
  wordsWrap: {
    flexDirection: "row-reverse", // RTL: first Arabic word on the right
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  wordChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  wordChipActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
    borderStyle: "dashed",
  },
  wordChipStart: { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  wordChipEnd: { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  wordText: {
    fontSize: 22,
    color: "#1A1A1A",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  wordTextActive: { color: "#0E5132" },

  selectAllBtn: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 4,
  },
  selectAllText: { fontSize: 12, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },

  repeatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A9A9A",
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    marginTop: 14,
    marginBottom: 8,
  },
  repeatRow: { flexDirection: "row", gap: 8, justifyContent: "space-between", marginBottom: 16 },
  repeatChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  repeatChipActive: { backgroundColor: "#1A1A1A" },
  repeatChipText: { fontSize: 14, fontWeight: "700", color: "#6B6B6B", fontFamily: "Inter_700Bold" },
  repeatChipTextActive: { color: "#FFFFFF" },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: "#9A9A9A" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
