import React, { useState } from "react";
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

function TileButton({
  icon,
  label,
  sublabel,
  active,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[tileStyle.tile, active && tileStyle.tileActive, disabled && tileStyle.tileDisabled]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
    >
      <View style={[tileStyle.iconWrap, active && tileStyle.iconWrapActive]}>
        {icon}
      </View>
      <Text style={[tileStyle.label, active && tileStyle.labelActive]} numberOfLines={1}>{label}</Text>
      {sublabel ? <Text style={tileStyle.sublabel} numberOfLines={1}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}

const tileStyle = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 80,
  },
  tileActive: {
    backgroundColor: "#1A1A1A",
  },
  tileDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3A3A3A",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  labelActive: {
    color: "#FFFFFF",
  },
  sublabel: {
    fontSize: 10,
    color: "#9A9A9A",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { settings, updateSettings, accountSettings, updateAccountSettings } = useQuran();

  const toggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const toggleTafsirEdition = (id: string) => {
    const current = settings.selectedTafsirs ?? ["en.maarifulquran"];
    if (current.includes(id)) {
      const next = current.filter(t => t !== id);
      updateSettings({ selectedTafsirs: next.length > 0 ? next : current });
    } else {
      updateSettings({ selectedTafsirs: [...current, id] });
    }
  };

  const THEMES: { key: "auto" | "light" | "dark" | "sepia"; color: string; label: string }[] = [
    { key: "light", color: "#FFFFFF", label: "Light" },
    { key: "sepia", color: "#F5EDD6", label: "Sepia" },
    { key: "dark", color: "#1A1A1A", label: "Dark" },
    { key: "auto", color: "linear", label: "Auto" },
  ];

  const fontSize = accountSettings.fontSize ?? 28;

  return (
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
                  <View style={s.themeLabels}>
                    {THEMES.map(t => (
                      <Text key={t.key} style={[s.themeLabel, accountSettings.theme === t.key && s.themeLabelActive]}>
                        {t.label}
                      </Text>
                    ))}
                  </View>
                </View>

                <Text style={s.sectionLabel}>Arabic Font Size</Text>
                <View style={s.fontSizeRow}>
                  <TouchableOpacity
                    style={s.fontSizeBtn}
                    onPress={() => { toggle(() => updateAccountSettings({ fontSize: Math.max(20, fontSize - 2) })); }}
                  >
                    <Feather name="minus" size={18} color="#3A3A3A" />
                  </TouchableOpacity>
                  <View style={s.fontSizePreview}>
                    <Text style={[s.fontSizeArabic, { fontSize }]}>بِسْمِ</Text>
                    <Text style={s.fontSizeValue}>{fontSize}px</Text>
                  </View>
                  <TouchableOpacity
                    style={s.fontSizeBtn}
                    onPress={() => { toggle(() => updateAccountSettings({ fontSize: Math.min(48, fontSize + 2) })); }}
                  >
                    <Feather name="plus" size={18} color="#3A3A3A" />
                  </TouchableOpacity>
                </View>

                <Text style={s.sectionLabel}>Display</Text>
                <View style={s.tileGrid}>
                  <TileButton
                    icon={<Feather name="book-open" size={18} color={settings.showTranslation && !settings.mushafMode ? "#1A1A1A" : "#9A9A9A"} />}
                    label="Translation"
                    active={settings.showTranslation && !settings.mushafMode}
                    onPress={() => toggle(() => updateSettings({ showTranslation: !settings.showTranslation }))}
                    disabled={settings.mushafMode}
                  />
                  <TileButton
                    icon={<Feather name="type" size={18} color={settings.showTransliteration && !settings.mushafMode ? "#1A1A1A" : "#9A9A9A"} />}
                    label="Romanization"
                    active={settings.showTransliteration && !settings.mushafMode}
                    onPress={() => toggle(() => updateSettings({ showTransliteration: !settings.showTransliteration }))}
                    disabled={settings.mushafMode}
                  />
                  <TileButton
                    icon={<Feather name="align-left" size={18} color={settings.showTafsir && !settings.mushafMode ? "#1A1A1A" : "#9A9A9A"} />}
                    label="Tafsir"
                    active={settings.showTafsir && !settings.mushafMode}
                    onPress={() => toggle(() => updateSettings({ showTafsir: !settings.showTafsir }))}
                    disabled={settings.mushafMode}
                  />
                  <TileButton
                    icon={<Feather name="layers" size={18} color={settings.tajweedColorCoding && !settings.mushafMode ? "#1A1A1A" : "#9A9A9A"} />}
                    label="Tajweed"
                    active={settings.tajweedColorCoding && !settings.mushafMode}
                    onPress={() => toggle(() => updateSettings({ tajweedColorCoding: !settings.tajweedColorCoding }))}
                    disabled={settings.mushafMode}
                  />
                </View>

                {settings.showTafsir && !settings.mushafMode && (
                  <>
                    <Text style={s.sectionLabel}>Tafsir Sources</Text>
                    {TAFSIR_EDITIONS.map((edition) => {
                      const selected = (settings.selectedTafsirs ?? ["en.maarifulquran"]).includes(edition.id);
                      return (
                        <TouchableOpacity
                          key={edition.id}
                          style={[s.tafsirRow, selected && s.tafsirRowSelected]}
                          onPress={() => toggleTafsirEdition(edition.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[s.tafsirCheck, selected && s.tafsirCheckSelected]}>
                            {selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.tafsirName, selected && s.tafsirNameSelected]}>{edition.name}</Text>
                            <Text style={s.tafsirAuthor}>{edition.author}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                <Text style={s.sectionLabel}>Reciter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.recitersRow}>
                  {RECITERS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[s.reciterChip, settings.selectedReciter === r.id && s.reciterChipActive]}
                      onPress={() => { toggle(() => updateSettings({ selectedReciter: r.id })); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.reciterText, settings.selectedReciter === r.id && s.reciterTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

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
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: "#FAFAFA",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
      maxHeight: "90%",
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
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
      marginTop: 20,
      marginBottom: 10,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 16,
      marginBottom: 8,
    },
    themeCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: "#E0E0E0",
      alignItems: "center",
      justifyContent: "center",
    },
    themeCircleAuto: {
      backgroundColor: "#D0D0D0",
      borderColor: "#C0C0C0",
    },
    themeCircleSelected: {
      borderColor: "#1A1A1A",
      borderWidth: 2.5,
    },
    themeCheckmark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    themeLabels: {
      flex: 1,
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
    },
    themeLabel: {
      fontSize: 10,
      color: "#B0B0B0",
      fontFamily: "Inter_400Regular",
      width: 44,
      textAlign: "center",
    },
    themeLabelActive: {
      color: "#1A1A1A",
      fontFamily: "Inter_600SemiBold",
    },
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
    fontSizePreview: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    fontSizeArabic: {
      color: "#1A1A1A",
      lineHeight: 56,
    },
    fontSizeValue: {
      fontSize: 12,
      color: "#9A9A9A",
      fontFamily: "Inter_400Regular",
    },
    tileGrid: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    tafsirRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#F0F0F0",
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    tafsirRowSelected: {
      borderColor: "#1A1A1A",
      backgroundColor: "#F5F5F5",
    },
    tafsirCheck: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: "#D0D0D0",
      alignItems: "center",
      justifyContent: "center",
    },
    tafsirCheckSelected: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
    tafsirName: { fontSize: 14, fontWeight: "600", color: "#3A3A3A", fontFamily: "Inter_600SemiBold" },
    tafsirNameSelected: { color: "#1A1A1A" },
    tafsirAuthor: { fontSize: 11, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
    recitersRow: { marginBottom: 4 },
    reciterChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: "#F0F0F0",
      marginRight: 8,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    reciterChipActive: { borderColor: "#1A1A1A", backgroundColor: "#1A1A1A" },
    reciterText: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
    reciterTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  });
