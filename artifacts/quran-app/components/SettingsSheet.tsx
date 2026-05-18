import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReciters } from "@/hooks/useReciters";
import { useQuran } from "@/contexts/QuranContext";
import { FullScreenPage } from "@/components/FullScreenPage";
import { ReadingThemeSelector } from "@/components/ReadingThemeSelector";
import { SelectChip } from "@/components/SelectChip";
import { FontChip } from "@/components/FontChip";
import { ARABIC_FONT_OPTIONS } from "@/constants/arabicFonts";
import type { QuranReciter } from "@/services/quranApi";
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
  onClose, selected, onSelect, reciters, isLoading, error, onRetry,
}: {
  onClose: () => void;
  selected: string; onSelect: (id: string) => void;
  reciters: QuranReciter[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const colors = useColors();
  const rs = makeRsStyles(colors);
  return (
    <FullScreenPage title="Select Reciter" onClose={onClose} scrollable={false}>
      <FlatList
        data={reciters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={rs.emptyState}>
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.foreground} />
                <Text style={rs.emptyText}>Loading reciters...</Text>
              </>
            ) : (
              <>
                <Text style={rs.emptyText}>{error ?? "No reciters found."}</Text>
                <TouchableOpacity style={rs.retryButton} onPress={onRetry} activeOpacity={0.75}>
                  <Text style={rs.retryText}>Retry</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
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
  );
}

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = makeStyles(colors);
  const { settings, updateSettings, accountSettings, updateAccountSettings } = useQuran();
  const [page, setPage] = useState<"settings" | "reciters">("settings");
  const { reciters, isLoading: recitersLoading, error: recitersError, reload: reloadReciters } = useReciters();

  useEffect(() => {
    if (!visible) setPage("settings");
  }, [visible]);

  const toggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const arabicSize = accountSettings.fontSize ?? 28;
  const romanSize = accountSettings.romanFontSize ?? 14;
  const currentReciter = reciters.find(r => r.id === settings.selectedReciter);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={page === "reciters" ? () => setPage("settings") : onClose}>
      {page === "reciters" ? (
        <ReciterSheet
          onClose={() => setPage("settings")}
          selected={settings.selectedReciter}
          onSelect={(id) => updateSettings({ selectedReciter: id })}
          reciters={reciters}
          isLoading={recitersLoading}
          error={recitersError}
          onRetry={reloadReciters}
        />
      ) : (
        <FullScreenPage title="Reader Settings" onClose={onClose}>
          <View style={s.scrollContent}>
            <Text style={s.sectionLabel}>Theme</Text>
            <ReadingThemeSelector
              value={accountSettings.theme}
              onChange={(theme) => toggle(() => updateAccountSettings({ theme }))}
              style={s.themeRow}
            />

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
              {ARABIC_FONT_OPTIONS.map((opt) => (
                <FontChip
                  key={opt.key}
                  label={opt.label}
                  fontFamily={opt.fontFamily}
                  selected={(accountSettings.arabicFont ?? "system") === opt.key}
                  onPress={() => updateAccountSettings({ arabicFont: opt.key })}
                />
              ))}
            </ScrollView>

            <Text style={s.sectionLabel}>Reciter</Text>
            <TouchableOpacity
              style={s.reciterRow}
              onPress={() => setPage("reciters")}
              activeOpacity={0.75}
            >
              <View style={s.reciterAvatar}>
                <Ionicons name="mic" size={20} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reciterName}>{currentReciter?.name ?? "Loading reciters..."}</Text>
                <Text style={s.reciterStyle}>{currentReciter?.style ?? "Quran.com recitations"}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={s.sectionLabel}>Tafsir Sources</Text>
            <View style={s.tafsirGrid}>
              {TAFSIR_EDITIONS.map((ed) => {
                const key = ed.id as TafsirKey;
                const active = settings.selectedTafsirs.includes(key);
                return (
                  <SelectChip
                    key={ed.id}
                    label={ed.name}
                    sublabel={ed.author}
                    selected={active}
                    style={s.tafsirChipOverride}
                    onPress={() => {
                      const next = active
                        ? settings.selectedTafsirs.filter((id) => id !== key)
                        : [...settings.selectedTafsirs, key];
                      updateSettings({ selectedTafsirs: next.length > 0 ? next : [key] });
                    }}
                  />
                );
              })}
            </View>

            <Text style={s.sectionLabel}>Auto-pause Timer</Text>
            <View style={s.autoPauseRow}>
              {([
                { mins: null, label: "Off" },
                { mins: 5, label: "5m" },
                { mins: 15, label: "15m" },
                { mins: 30, label: "30m" },
                { mins: 60, label: "1h" },
              ] as const).map((opt) => (
                <SelectChip
                  key={opt.label}
                  label={opt.label}
                  selected={settings.autoPauseMinutes === opt.mins}
                  onPress={() => updateSettings({ autoPauseMinutes: opt.mins })}
                />
              ))}
            </View>
            <Text style={s.autoPauseHint}>Audio will automatically pause after the selected duration.</Text>
          </View>
        </FullScreenPage>
      )}
    </Modal>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scrollContent: { paddingHorizontal: 20, gap: 4 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
      marginTop: 22,
      marginBottom: 10,
    },
    themeRow: { marginBottom: 6 },
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
    tafsirChipOverride: { flex: 0, width: "100%" as any, minHeight: 58 },
    reciterAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    },
    reciterName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    reciterStyle: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    autoPauseRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    autoPauseHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 8, paddingHorizontal: 4 },
    fontPickerRow: { gap: 8, paddingBottom: 4 },
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
    style: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    retryButton: { borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10 },
    retryText: { fontSize: 13, color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
  });
