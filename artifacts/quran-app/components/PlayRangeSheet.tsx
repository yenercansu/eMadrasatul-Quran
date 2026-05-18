import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullScreenPage } from "@/components/FullScreenPage";
import type { ApiAyah } from "@/services/quranApi";

interface Props {
  visible: boolean;
  onClose: () => void;
  surahNumber: number;
  surahName: string;
  ayahs: ApiAyah[];
  currentAyah: number;
  onConfirm: (startAyah: number, endAyah: number, repeatCount: number) => void;
}

const REPEAT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1×" },
  { value: 3, label: "3×" },
  { value: 5, label: "5×" },
  { value: 10, label: "10×" },
  { value: 999, label: "∞" },
];

export function PlayRangeSheet({
  visible, onClose, surahNumber, surahName, ayahs, currentAyah, onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<number>(999);

  useEffect(() => {
    if (visible) {
      setStart(currentAyah);
      setEnd(currentAyah);
      setRepeat(999);
    }
  }, [visible, currentAyah]);

  const handleTap = (n: number) => {
    Haptics.selectionAsync();
    if (start === null || (start !== null && end !== null && start !== end)) {
      setStart(n); setEnd(n);
    } else {
      if (n < start) { setStart(n); setEnd(start); }
      else { setEnd(n); }
    }
  };

  const handleSave = () => {
    if (start === null || end === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(Math.min(start, end), Math.max(start, end), repeat);
    onClose();
  };

  const scrollRef = useRef<ScrollView>(null);
  const ayahYRef = useRef<Record<number, number>>({});
  useEffect(() => {
    if (visible && ayahs.length > 0) {
      const t = setTimeout(() => {
        const y = ayahYRef.current[currentAyah];
        if (typeof y === "number" && scrollRef.current) {
          scrollRef.current.scrollTo({ y: Math.max(0, y - 60), animated: false });
        }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [visible, currentAyah, ayahs.length]);

  const summary = start !== null && end !== null
    ? (start === end ? `Ayah ${start}` : `Ayahs ${Math.min(start, end)}–${Math.max(start, end)}`)
    : "Select an ayah";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FullScreenPage title="Play Within Range" onClose={onClose} scrollable={false}>
        <Text style={s.hint}>tap the ayahs to mark the start and end of your range</Text>
        <Text style={s.summary}>{surahName} · {summary}</Text>

        {ayahs.length === 0 ? (
          <ActivityIndicator color="#1A1A1A" style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.ayahScroll}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {ayahs.map((a) => {
              const n = a.numberInSurah;
              const lo = Math.min(start ?? n, end ?? n);
              const hi = Math.max(start ?? n, end ?? n);
              const inRange = start !== null && end !== null && n >= lo && n <= hi;
              const isStart = n === start;
              const isEnd = n === end && start !== end;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleTap(n)}
                  onLayout={(e) => { ayahYRef.current[n] = e.nativeEvent.layout.y; }}
                  activeOpacity={0.85}
                  style={[s.ayahCard, inRange && s.ayahCardActive]}
                >
                  <View style={s.ayahHead}>
                    <View style={[s.ayahBadge, inRange && s.ayahBadgeActive]}>
                      <Text style={[s.ayahBadgeText, inRange && s.ayahBadgeTextActive]}>{n}</Text>
                    </View>
                    {(isStart || isEnd) && (
                      <View style={s.ayahMarker}>
                        <Text style={s.ayahMarkerText}>{isStart ? "Start" : "End"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.ayahArabic, inRange && s.ayahArabicActive]} numberOfLines={2} ellipsizeMode="tail">
                    {a.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={s.repeatLabel}>REPEAT</Text>
        <View style={s.repeatRow}>
          {REPEAT_OPTIONS.map((opt) => {
            const active = repeat === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { Haptics.selectionAsync(); setRepeat(opt.value); }}
                style={[s.repeatChip, active && s.repeatChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.repeatChipText, active && s.repeatChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.saveBtn, (start === null || end === null) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={start === null || end === null}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={18} color="#FFFFFF" />
          <Text style={s.saveBtnText}>Play Range</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 16 }} />
      </FullScreenPage>
    </Modal>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  summary: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 12, paddingHorizontal: 20 },
  ayahScroll: { flex: 1, paddingHorizontal: 20 },
  ayahCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  ayahCardActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A", borderStyle: "dashed" },
  ayahHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  ayahBadge: { minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center" },
  ayahBadgeActive: { backgroundColor: "#16A34A" },
  ayahBadgeText: { fontSize: 12, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  ayahBadgeTextActive: { color: "#FFFFFF" },
  ayahMarker: { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "#16A34A", borderRadius: 10 },
  ayahMarkerText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ayahArabic: {
    fontSize: 18, lineHeight: 32, color: "#1A1A1A", textAlign: "right",
    writingDirection: "rtl", fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  ayahArabicActive: { color: "#0E5132" },
  repeatLabel: { fontSize: 12, fontWeight: "700", color: "#9A9A9A", letterSpacing: 1.2, fontFamily: "Inter_700Bold", marginTop: 14, marginBottom: 8, paddingHorizontal: 20 },
  repeatRow: { flexDirection: "row", gap: 8, justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 20 },
  repeatChip: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F0F0F0", alignItems: "center" },
  repeatChipActive: { backgroundColor: "#1A1A1A" },
  repeatChipText: { fontSize: 14, fontWeight: "700", color: "#6B6B6B", fontFamily: "Inter_700Bold" },
  repeatChipTextActive: { color: "#FFFFFF" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A1A1A", paddingVertical: 16, borderRadius: 16, marginTop: 4, marginHorizontal: 20 },
  saveBtnDisabled: { backgroundColor: "#9A9A9A" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
