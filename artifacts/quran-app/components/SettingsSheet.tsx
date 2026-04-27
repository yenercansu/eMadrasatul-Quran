import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { RECITERS } from "@/contexts/AudioContext";

export const TAFSIR_EDITIONS = [
  { id: "en.maarifulquran", name: "Maariful Quran", author: "Mufti Shafi Usmani" },
  { id: "en.jalalayn", name: "Tafsir Jalalayn", author: "Jalal al-Din al-Suyuti" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

function FontSizeBar({
  label, value, onChange, min, max, sample, sampleStyle,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; sample: string; sampleStyle: any;
}) {
  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.fontSizeRow}>
        <TouchableOpacity
          style={styles.fontSizeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.max(min, value - 1)); }}
          activeOpacity={0.75}
        >
          <Feather name="minus" size={18} color="#3A3A3A" />
        </TouchableOpacity>
        <View style={styles.fontSizePreview}>
          <Text style={[sampleStyle, { fontSize: value }]} numberOfLines={1}>{sample}</Text>
          <Text style={styles.fontSizeValue}>{value}px</Text>
        </View>
        <TouchableOpacity
          style={styles.fontSizeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.min(max, value + 1)); }}
          activeOpacity={0.75}
        >
          <Feather name="plus" size={18} color="#3A3A3A" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function ReciterSheet({
  visible, onClose, selected, onSelect,
}: {
  visible: boolean; onClose: () => void;
  selected: string; onSelect: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={rs.overlay}>
          <TouchableWithoutFeedback>
            <View style={rs.sheet}>
              <View style={rs.handle} />
              <View style={rs.header}>
                <Text style={rs.title}>Select Reciter</Text>
                <TouchableOpacity onPress={onClose} style={rs.closeBtn}>
                  <Feather name="x" size={20} color="#9A9A9A" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={RECITERS}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const active = item.id === selected;
                  return (
                    <TouchableOpacity
                      style={[rs.row, active && rs.rowActive]}
                      activeOpacity={0.75}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelect(item.id);
                        onClose();
                      }}
                    >
                      <View style={[rs.avatar, active && rs.avatarActive]}>
                        <Ionicons name="mic" size={18} color={active ? "#FFFFFF" : "#6B6B6B"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[rs.name, active && rs.nameActive]}>{item.name}</Text>
                        <Text style={rs.style}>{item.style}</Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={22} color="#1A1A1A" />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const rs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    height: "75%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: "#F0F0F0" },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EAEAEA", alignItems: "center", justifyContent: "center",
  },
  avatarActive: { backgroundColor: "#1A1A1A" },
  name: { fontSize: 14, fontWeight: "600", color: "#3A3A3A", fontFamily: "Inter_600SemiBold" },
  nameActive: { color: "#1A1A1A" },
  style: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
});

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = styles;
  const { settings, updateSettings, accountSettings, updateAccountSettings } = useQuran();
  const [reciterSheetVisible, setReciterSheetVisible] = useState(false);

  const toggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const THEMES: { key: "auto" | "light" | "dark" | "sepia"; label: string }[] = [
    { key: "light", label: "Light" },
    { key: "sepia", label: "Sepia" },
    { key: "dark", label: "Dark" },
    { key: "auto", label: "Auto" },
  ];

  const arabicSize = accountSettings.fontSize ?? 28;
  const romanSize = accountSettings.romanFontSize ?? 14;
  const currentReciter = RECITERS.find(r => r.id === settings.selectedReciter) ?? RECITERS[0];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.sheet}>
                <View style={s.handle} />
                <View style={s.sheetHeader}>
                  <Text style={s.title}>Reader Settings</Text>
                  <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                    <Feather name="x" size={20} color="#9A9A9A" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                  <Text style={s.sectionLabel}>Theme</Text>
                  <View style={s.themeRow}>
                    {THEMES.map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          s.themeCircle,
                          t.key === "light" && { backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" },
                          t.key === "sepia" && { backgroundColor: "#F5EDD6", borderColor: "#DDD0B0" },
                          t.key === "dark" && { backgroundColor: "#1A1A1A", borderColor: "#333" },
                          t.key === "auto" && s.themeCircleAuto,
                          accountSettings.theme === t.key && s.themeCircleSelected,
                        ]}
                        onPress={() => { toggle(() => updateAccountSettings({ theme: t.key })); }}
                        activeOpacity={0.8}
                      >
                        {accountSettings.theme === t.key && (
                          <View style={s.themeCheckmark}>
                            <Ionicons name="checkmark" size={14} color={t.key === "dark" ? "#FFF" : "#1A1A1A"} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.themeLabelRow}>
                    {THEMES.map(t => (
                      <Text
                        key={t.key}
                        style={[s.themeLabel, accountSettings.theme === t.key && s.themeLabelActive]}
                      >
                        {t.label}
                      </Text>
                    ))}
                  </View>

                  <FontSizeBar
                    label="Arabic Font Size"
                    value={arabicSize}
                    onChange={(v) => updateAccountSettings({ fontSize: v })}
                    min={20}
                    max={48}
                    sample="بِسْمِ"
                    sampleStyle={s.fontSizeArabic}
                  />

                  <FontSizeBar
                    label="Romanization Font Size"
                    value={romanSize}
                    onChange={(v) => updateAccountSettings({ romanFontSize: v })}
                    min={10}
                    max={24}
                    sample="Bismillah"
                    sampleStyle={s.fontSizeRoman}
                  />

                  <Text style={s.sectionLabel}>Reciter</Text>
                  <TouchableOpacity
                    style={s.reciterRow}
                    onPress={() => setReciterSheetVisible(true)}
                    activeOpacity={0.75}
                  >
                    <View style={s.reciterAvatar}>
                      <Ionicons name="mic" size={20} color="#1A1A1A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reciterName}>{currentReciter?.name}</Text>
                      <Text style={s.reciterStyle}>{currentReciter?.style}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#9A9A9A" />
                  </TouchableOpacity>

                  <Text style={s.sectionLabel}>Auto-pause Timer</Text>
                  <View style={s.autoPauseRow}>
                    {[
                      { mins: null, label: "Off" },
                      { mins: 5, label: "5m" },
                      { mins: 15, label: "15m" },
                      { mins: 30, label: "30m" },
                      { mins: 60, label: "1h" },
                    ].map((opt) => {
                      const active = settings.autoPauseMinutes === opt.mins;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[s.autoPauseChip, active && s.autoPauseChipActive]}
                          activeOpacity={0.8}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            updateSettings({ autoPauseMinutes: opt.mins });
                          }}
                        >
                          <Text style={[s.autoPauseChipText, active && s.autoPauseChipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={s.autoPauseHint}>Audio will automatically pause after the selected duration.</Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ReciterSheet
        visible={reciterSheetVisible}
        onClose={() => setReciterSheetVisible(false)}
        selected={settings.selectedReciter}
        onSelect={(id) => updateSettings({ selectedReciter: id })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  scrollContent: { gap: 4, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A9A9A",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
    marginTop: 22,
    marginBottom: 10,
  },
  themeRow: { flexDirection: "row", gap: 16, marginBottom: 6 },
  themeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  themeCircleAuto: { backgroundColor: "#D0D0D0", borderColor: "#C0C0C0" },
  themeCircleSelected: { borderColor: "#1A1A1A", borderWidth: 2.5 },
  themeCheckmark: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  themeLabelRow: { flexDirection: "row", gap: 16 },
  themeLabel: { width: 44, fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center" },
  themeLabelActive: { color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    padding: 12,
    gap: 16,
  },
  fontSizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  fontSizePreview: { flex: 1, alignItems: "center", gap: 4 },
  fontSizeArabic: { color: "#1A1A1A", lineHeight: 56 },
  fontSizeRoman: { color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  fontSizeValue: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  reciterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F0F0F0",
    padding: 14,
    borderRadius: 16,
  },
  reciterAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
  },
  reciterName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  reciterStyle: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
  autoPauseRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  autoPauseChip: {
    minWidth: 56,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  autoPauseChipActive: { backgroundColor: "#1A1A1A" },
  autoPauseChipText: { fontSize: 13, fontWeight: "600", color: "#3A3A3A", fontFamily: "Inter_600SemiBold" },
  autoPauseChipTextActive: { color: "#FFFFFF" },
  autoPauseHint: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 8, paddingHorizontal: 4 },
});
