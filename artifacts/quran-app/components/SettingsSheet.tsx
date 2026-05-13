import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { RECITERS } from "@/contexts/AudioContext";
import { FullScreenPage } from "@/components/FullScreenPage";
import { ARABIC_FONT_OPTIONS } from "@/constants/arabicFonts";
import type { TafsirKey } from "@/services/tafsirApi";

export const TAFSIR_EDITIONS = [
  { id: "jalalayn", name: "Tafsir al-Jalalayn", author: "Jalal al-Din al-Mahalli and Jalal al-Din al-Suyuti" },
  { id: "maarif", name: "Ma'arif al-Qur'an", author: "Mufti Muhammad Shafi" },
  { id: "ibn_kathir", name: "Tafsir Ibn Kathir", author: "Hafiz Ibn Kathir" },
  { id: "as_sadi", name: "Tafsir as-Sa'di", author: "Abd al-Rahman al-Sa'di" },
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

            <Text style={s.sectionLabel}>Normal View Font</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.fontPickerRow}
            >
              {ARABIC_FONT_OPTIONS.map((opt) => {
                const active = (accountSettings.arabicFont ?? "system") === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.fontChip, active && s.fontChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateAccountSettings({ arabicFont: opt.key });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.fontChipLabel, active && s.fontChipLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text
                      style={[s.fontChipSample, { fontFamily: opt.fontFamily }, active && s.fontChipSampleActive]}
                      numberOfLines={1}
                    >
                      {"بِسْمِ"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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

            <Text style={s.sectionLabel}>Tafsir Sources</Text>
            <View style={s.tafsirGrid}>
              {TAFSIR_EDITIONS.map((ed) => {
                const key = ed.id as TafsirKey;
                const active = settings.selectedTafsirs.includes(key);
                return (
                  <TouchableOpacity
                    key={ed.id}
                    style={[s.tafsirChip, active && s.tafsirChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const next = active
                        ? settings.selectedTafsirs.filter((id) => id !== key)
                        : [...settings.selectedTafsirs, key];
                      updateSettings({ selectedTafsirs: next.length > 0 ? next : [key] });
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.tafsirChipName, active && s.tafsirChipNameActive]}>{ed.name}</Text>
                      <Text style={[s.tafsirChipAuthor, active && s.tafsirChipAuthorActive]} numberOfLines={1}>{ed.author}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />}
                  </TouchableOpacity>
                );
              })}
            </View>

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
    tafsirGrid: { gap: 8 },
    tafsirChip: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    tafsirChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    tafsirChipName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    tafsirChipNameActive: { color: colors.primaryForeground },
    tafsirChipAuthor: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    tafsirChipAuthorActive: { color: colors.primaryForeground },
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
    fontPickerRow: { gap: 8, paddingBottom: 4 },
    fontChip: {
      width: 82,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: "center",
      gap: 6,
    },
    fontChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
    fontChipLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
    },
    fontChipLabelActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    fontChipSample: {
      fontSize: 22,
      color: colors.foreground,
      lineHeight: 36,
    },
    fontChipSampleActive: { color: colors.primary },
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
