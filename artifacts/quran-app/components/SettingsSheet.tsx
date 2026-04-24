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
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { RECITERS } from "@/contexts/AudioContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

function SettingRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.primaryForeground}
      />
    </View>
  );
}

export function SettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { settings, updateSettings } = useQuran();

  const repeatOptions = [1, 2, 3, 5, 7, 10];

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
                <Text style={s.sectionLabel}>DISPLAY</Text>

                <SettingRow
                  label="Translation"
                  value={settings.showTranslation}
                  onToggle={() => updateSettings({ showTranslation: !settings.showTranslation })}
                  colors={colors}
                />
                <SettingRow
                  label="Transliteration"
                  value={settings.showTransliteration}
                  onToggle={() => updateSettings({ showTransliteration: !settings.showTransliteration })}
                  colors={colors}
                />
                <SettingRow
                  label="Tafsir"
                  value={settings.showTafsir}
                  onToggle={() => updateSettings({ showTafsir: !settings.showTafsir })}
                  colors={colors}
                />
                <SettingRow
                  label="Mushaf Style"
                  value={settings.mushafMode}
                  onToggle={() => updateSettings({ mushafMode: !settings.mushafMode })}
                  colors={colors}
                />

                <Text style={s.sectionLabel}>COLOR CODING</Text>

                <SettingRow
                  label="Translation Color Coding"
                  value={settings.colorCoding}
                  onToggle={() => updateSettings({ colorCoding: !settings.colorCoding })}
                  colors={colors}
                />
                <SettingRow
                  label="Tajweed Color Coding"
                  value={settings.tajweedColorCoding}
                  onToggle={() => updateSettings({ tajweedColorCoding: !settings.tajweedColorCoding })}
                  colors={colors}
                />

                <Text style={s.sectionLabel}>AUDIO</Text>

                <Text style={s.subLabel}>Reciter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.recitersRow}>
                  {RECITERS.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        s.reciterChip,
                        settings.selectedReciter === r.id && s.reciterChipActive,
                      ]}
                      onPress={() => updateSettings({ selectedReciter: r.id })}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          s.reciterChipText,
                          settings.selectedReciter === r.id && s.reciterChipTextActive,
                        ]}
                      >
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
                      style={[
                        s.repeatChip,
                        settings.repeatCount === n && s.repeatChipActive,
                      ]}
                      onPress={() => updateSettings({ repeatCount: n })}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          s.repeatChipText,
                          settings.repeatCount === n && s.repeatChipTextActive,
                        ]}
                      >
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
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "85%",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    closeBtn: {
      padding: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accent,
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 4,
      fontFamily: "Inter_700Bold",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    subLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      marginTop: 12,
      marginBottom: 8,
    },
    recitersRow: {
      marginBottom: 8,
    },
    reciterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.card,
    },
    reciterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    reciterChipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    reciterChipTextActive: {
      color: colors.primary,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    repeatRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    repeatChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    repeatChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    repeatChipText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    repeatChipTextActive: {
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
  });
