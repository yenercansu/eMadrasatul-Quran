import React from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
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

function SettingRow({
  label,
  sublabel,
  value,
  onToggle,
  colors,
  disabled,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  disabled?: boolean;
}) {
  const s = styles(colors);
  return (
    <View style={[s.row, disabled && s.rowDisabled]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, disabled && s.rowLabelDisabled]}>{label}</Text>
        {sublabel && <Text style={s.rowSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.primaryForeground}
        disabled={disabled}
      />
    </View>
  );
}

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { settings, updateSettings } = useQuran();

  const repeatOptions = [1, 2, 3, 5, 7, 10];

  const toggleTafsirEdition = (id: string) => {
    const current = settings.selectedTafsirs ?? ["en.maarifulquran"];
    if (current.includes(id)) {
      const next = current.filter(t => t !== id);
      updateSettings({ selectedTafsirs: next.length > 0 ? next : current });
    } else {
      updateSettings({ selectedTafsirs: [...current, id] });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.handle} />
              <View style={s.sheetHeader}>
                <Text style={s.title}>Reading Settings</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.sectionLabel}>READING MODE</Text>

                <SettingRow
                  label="Mushaf Style"
                  sublabel="Page layout · disables all overlays"
                  value={settings.mushafMode}
                  onToggle={() => updateSettings({ mushafMode: !settings.mushafMode })}
                  colors={colors}
                />

                <Text style={s.sectionLabel}>DISPLAY</Text>

                <SettingRow
                  label="Translation"
                  value={settings.showTranslation}
                  onToggle={() => updateSettings({ showTranslation: !settings.showTranslation })}
                  colors={colors}
                  disabled={settings.mushafMode}
                />
                <SettingRow
                  label="Transliteration"
                  sublabel={settings.tajweedColorCoding ? "Disabled while Tajweed is on" : undefined}
                  value={settings.showTransliteration}
                  onToggle={() => updateSettings({ showTransliteration: !settings.showTransliteration })}
                  colors={colors}
                  disabled={settings.mushafMode || settings.tajweedColorCoding}
                />

                <Text style={s.sectionLabel}>TAFSIR</Text>

                <SettingRow
                  label="Show Tafsir"
                  sublabel="Commentary beneath each verse"
                  value={settings.showTafsir}
                  onToggle={() => updateSettings({ showTafsir: !settings.showTafsir })}
                  colors={colors}
                  disabled={settings.mushafMode}
                />

                {settings.showTafsir && !settings.mushafMode && (
                  <View style={s.tafsirSelector}>
                    <Text style={s.tafsirSelectorLabel}>Select tafsirs to show:</Text>
                    {TAFSIR_EDITIONS.map((edition) => {
                      const selected = (settings.selectedTafsirs ?? ["en.maarifulquran"]).includes(edition.id);
                      return (
                        <TouchableOpacity
                          key={edition.id}
                          style={[s.tafsirEditionRow, selected && s.tafsirEditionRowSelected]}
                          onPress={() => toggleTafsirEdition(edition.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[s.tafsirCheckbox, selected && s.tafsirCheckboxSelected]}>
                            {selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <View style={s.tafsirEditionInfo}>
                            <Text style={[s.tafsirEditionName, selected && s.tafsirEditionNameSelected]}>
                              {edition.name}
                            </Text>
                            <Text style={s.tafsirEditionAuthor}>{edition.author}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={s.tafsirHint}>If multiple are selected, all will appear under each verse</Text>
                  </View>
                )}

                <Text style={s.sectionLabel}>COLOR CODING</Text>

                <SettingRow
                  label="Translation Color Coding"
                  value={settings.colorCoding}
                  onToggle={() => updateSettings({ colorCoding: !settings.colorCoding })}
                  colors={colors}
                  disabled={settings.mushafMode}
                />
                <SettingRow
                  label="Tajweed Color Coding"
                  sublabel={settings.showTransliteration ? "Turns off transliteration" : undefined}
                  value={settings.tajweedColorCoding}
                  onToggle={() => updateSettings({ tajweedColorCoding: !settings.tajweedColorCoding })}
                  colors={colors}
                  disabled={settings.mushafMode}
                />

                <Text style={s.sectionLabel}>AUDIO</Text>

                <Text style={s.subLabel}>Reciter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.recitersRow}>
                  {RECITERS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.reciterChip, settings.selectedReciter === r.id && s.reciterChipActive]}
                      onPress={() => updateSettings({ selectedReciter: r.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.reciterChipText, settings.selectedReciter === r.id && s.reciterChipTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.subLabel}>Repeat Count</Text>
                <View style={s.repeatRow}>
                  {repeatOptions.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[s.repeatChip, settings.repeatCount === n && s.repeatChipActive]}
                      onPress={() => updateSettings({ repeatCount: n })}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.repeatChipText, settings.repeatCount === n && s.repeatChipTextActive]}>
                        {n}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "92%" },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    title: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    closeBtn: { padding: 4 },
    sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.accent, letterSpacing: 1, marginTop: 16, marginBottom: 4, fontFamily: "Inter_700Bold" },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowDisabled: { opacity: 0.4 },
    rowLabel: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    rowLabelDisabled: { color: colors.mutedForeground },
    rowSublabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    tafsirSelector: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: 12,
      marginVertical: 8,
      gap: 8,
    },
    tafsirSelectorLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    tafsirEditionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tafsirEditionRowSelected: { borderColor: colors.primary, backgroundColor: colors.secondary },
    tafsirCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    tafsirCheckboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    tafsirEditionInfo: { flex: 1 },
    tafsirEditionName: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    tafsirEditionNameSelected: { color: colors.primary },
    tafsirEditionAuthor: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    tafsirHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", marginTop: 4 },
    subLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12, marginBottom: 8 },
    recitersRow: { marginBottom: 8 },
    reciterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
    reciterChipActive: { borderColor: colors.primary, backgroundColor: colors.secondary },
    reciterChipText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    reciterChipTextActive: { color: colors.primary, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    repeatRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    repeatChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    repeatChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    repeatChipText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    repeatChipTextActive: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
  });
