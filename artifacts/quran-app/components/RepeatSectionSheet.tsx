import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullScreenPage } from "@/components/FullScreenPage";

interface Props {
  visible: boolean;
  onClose: () => void;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  onConfirm: (
    startWordIdx: number,
    endWordIdx: number,
    totalWords: number,
    repeatCount: number,
  ) => void;
}

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

  useEffect(() => {
    if (visible) {
      setStartIdx(0);
      setEndIdx(Math.max(0, words.length - 1));
    }
  }, [visible, words.length, ayahNumber, surahNumber]);

  const handleWordTap = (i: number) => {
    try { Haptics.selectionAsync(); } catch {}
    if (startIdx === null || endIdx === null || startIdx !== endIdx) {
      setStartIdx(i);
      setEndIdx(i);
      return;
    }
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
      999,
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FullScreenPage title="Repeat Section" onClose={onClose} scrollable={false}>
        <Text style={s.hint}>tap the words to mark the section you want to repeat</Text>
        <Text style={s.summary}>
          {surahName} · Ayah {ayahNumber} · {summary}
        </Text>

        {/* Ayah words — flexible, fills available space */}
        <ScrollView
          style={s.wordsScroll}
          contentContainerStyle={s.wordsWrap}
          showsVerticalScrollIndicator={false}
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
                <Text style={[s.wordText, inRange && s.wordTextActive]}>
                  {w}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7} style={s.selectAllBtn}>
            <Feather name="maximize-2" size={14} color="#1A1A1A" />
            <Text style={s.selectAllText}>Select whole ayah</Text>
          </TouchableOpacity>
        </ScrollView>

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
        <View style={{ height: insets.bottom + 16 }} />
        {void surahNumber}
      </FullScreenPage>
    </Modal>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  summary: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 14, paddingHorizontal: 20 },

  wordsScroll: { flex: 1, paddingHorizontal: 16 },
  wordsWrap: {
    flexDirection: "row-reverse",
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
    marginTop: 16,
    marginBottom: 8,
  },
  selectAllText: { fontSize: 12, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
    marginHorizontal: 20,
  },
  saveBtnDisabled: { backgroundColor: "#9A9A9A" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
