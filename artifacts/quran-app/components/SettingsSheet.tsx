import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { RECITERS } from "@/contexts/AudioContext";
import { FullScreenPage } from "@/components/FullScreenPage";

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
  const colors = useColors();
  const s = makeStyles(colors);
  return (
    <>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.fontSizeRow}>
        <TouchableOpacity
          style={s.fontSizeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.max(min, value - 1)); }}
          activeOpacity={0.75}
        >
          <Feather name="minus" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.fontSizePreview}>
          <Text style={[sampleStyle, { fontSize: value }]} numberOfLines={1}>{sample}</Text>
          <Text style={s.fontSizeValue}>{value}px</Text>
        </View>
        <TouchableOpacity
          style={s.fontSizeBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(Math.min(max, value + 1)); }}
          activeOpacity={0.75}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
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
  const colors = useColors();
  const rs = makeRsStyles(colors);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <FullScreenPage title="Select Reciter" onClose={onClose} scrollable={false}>
        <FlatList
          data={RECITERS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
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
                  <Ionicons name="mic" size={18} color={active ? colors.primaryForeground : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[rs.name, active && rs.nameActive]}>{item.name}</Text>
                  <Text style={rs.style}>{item.style}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.foreground} />}
              </TouchableOpacity>
            );
          }}
        />
      </FullScreenPage>
    </Modal>
  );
}

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = makeStyles(colors);
  const { settings, updateSettings, accountSettings, updateAccountSettings } = useQuran();
  const [reciterSheetVisible, setReciterSheetVisible] = useState(false);

  const toggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const THEMES: { key: "auto" | "light" | "dark"; label: string }[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "auto", label: "Auto" },
  ];

  const arabicSize = accountSettings.fontSize ?? 28;
  const romanSize = accountSettings.romanFontSize ?? 14;
  const currentReciter = RECITERS.find(r => r.id === settings.selectedReciter) ?? RECITERS[0];

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <FullScreenPage title="Reader Settings" onClose={onClose}>
          <View style={s.scrollContent}>
            <Text style={s.sectionLabel}>Theme</Text>
            <View style={s.themeRow}>
              {THEMES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.themeChip, accountSettings.theme === t.key && s.themeChipActive]}
                  onPress={() => { toggle(() => updateAccountSettings({ theme: t.key })); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.themeChipText, accountSettings.theme === t.key && s.themeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
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
                <Ionicons name="mic" size={20} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reciterName}>{currentReciter?.name}</Text>
                <Text style={s.reciterStyle}>{currentReciter?.style}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
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
          </View>
        </FullScreenPage>
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

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scrollContent: { paddingHorizontal: 20, gap: 4 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
      marginTop: 22,
      marginBottom: 10,
    },
    themeRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
    themeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    themeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    themeChipText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    themeChipTextActive: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    fontSizeRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 16,
      padding: 12,
      gap: 16,
    },
    fontSizeBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.appBlack,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    fontSizePreview: { flex: 1, alignItems: "center", gap: 4 },
    fontSizeArabic: { color: colors.foreground, lineHeight: 56 },
    fontSizeRoman: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    fontSizeValue: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    reciterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.secondary,
      padding: 14,
      borderRadius: 16,
    },
    reciterAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    },
    reciterName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    reciterStyle: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    autoPauseRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    autoPauseChip: {
      minWidth: 56,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    autoPauseChipActive: { backgroundColor: colors.primary },
    autoPauseChipText: { fontSize: 13, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    autoPauseChipTextActive: { color: colors.primaryForeground },
    autoPauseHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8, paddingHorizontal: 4 },
  });

const makeRsStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 4,
    },
    rowActive: { backgroundColor: colors.secondary },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center",
    },
    avatarActive: { backgroundColor: colors.primary },
    name: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    nameActive: { color: colors.foreground },
    style: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  });
