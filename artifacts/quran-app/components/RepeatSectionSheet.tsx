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
import { ActionPill } from "@/components/ActionPill";
import { useColors } from "@/hooks/useColors";

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
  const colors = useColors();
  const s = styles(colors);
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
            <Feather name="maximize-2" size={14} color={colors.appText} />
          </TouchableOpacity>
        </ScrollView>

        <ActionPill
          label="Repeat Section"
          icon="repeat"
          variant="primary"
          size="lg"
          disabled={segLen === 0 || words.length === 0}
          onPress={handleConfirm}
          style={s.confirmBtnSpacing}
        />
        <View style={{ height: insets.bottom + 16 }} />
        {void surahNumber}
      </FullScreenPage>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    hint: { fontSize: 12, color: colors.appTextMuted, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
    summary: { fontSize: 13, color: colors.appText, fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 14, paddingHorizontal: 20 },

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
      backgroundColor: colors.appSecondarySurface,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    wordChipActive: {
      backgroundColor: colors.successSoft,
    },
    wordChipStart: { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
    wordChipEnd: { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
    wordText: {
      fontSize: 22,
      color: colors.appText,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    wordTextActive: { color: colors.appSuccess },

    selectAllBtn: {
      flexDirection: "row",
      alignSelf: "center",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 999,
      marginTop: 16,
      marginBottom: 8,
    },

    confirmBtnSpacing: { marginTop: 4, marginHorizontal: 20 },
  });
