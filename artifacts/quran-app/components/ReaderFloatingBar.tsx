import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface TafsirEdition {
  id: string;
  name: string;
}

interface Props {
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  mushafMode: boolean;
  selectedTafsirs: string[];
  tafsirEditions: TafsirEdition[];
  onToggleTranslation: () => void;
  onToggleTransliteration: () => void;
  onToggleTafsir: () => void;
  onToggleTafsirEdition: (id: string) => void;
  onPlayRange: () => void;
}

export function ReaderFloatingBar({
  showTranslation,
  showTransliteration,
  showTafsir,
  mushafMode,
  selectedTafsirs,
  tafsirEditions,
  onToggleTranslation,
  onToggleTransliteration,
  onToggleTafsir,
  onToggleTafsirEdition,
  onPlayRange,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const [tafsirPickerVisible, setTafsirPickerVisible] = useState(false);

  const handleToggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const handleTafsirPress = () => {
    if (mushafMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!showTafsir) {
      onToggleTafsir();
      setTafsirPickerVisible(true);
    } else {
      setTafsirPickerVisible(v => !v);
    }
  };

  return (
    <View style={s.wrapper}>
      {tafsirPickerVisible && !mushafMode && (
        <View style={s.tafsirPopup}>
          <View style={s.tafsirPopupHeader}>
            <Text style={s.tafsirPopupTitle}>Tafsir Sources</Text>
            <TouchableOpacity
              style={s.tafsirPopupClose}
              onPress={() => setTafsirPickerVisible(false)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={14} color="#9A9A9A" />
            </TouchableOpacity>
          </View>
          <View style={s.tafsirPopupOptions}>
            {tafsirEditions.map(ed => {
              const selected = selectedTafsirs.includes(ed.id);
              return (
                <TouchableOpacity
                  key={ed.id}
                  style={[s.tafsirPopupChip, selected && s.tafsirPopupChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleTafsirEdition(ed.id);
                  }}
                  activeOpacity={0.8}
                >
                  {selected && (
                    <Feather name="check" size={11} color="#FFFFFF" />
                  )}
                  <Text style={[s.tafsirPopupChipText, selected && s.tafsirPopupChipTextActive]}>
                    {ed.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={s.bar}>
        <BarButton
          icon={<Feather name="book-open" size={17} color={showTranslation && !mushafMode ? "#FFFFFF" : "#9A9A9A"} />}
          label="Meaning"
          active={showTranslation && !mushafMode}
          disabled={mushafMode}
          onPress={() => handleToggle(onToggleTranslation)}
        />
        <BarButton
          icon={<Feather name="type" size={17} color={showTransliteration && !mushafMode ? "#FFFFFF" : "#9A9A9A"} />}
          label="Roman"
          active={showTransliteration && !mushafMode}
          disabled={mushafMode}
          onPress={() => handleToggle(onToggleTransliteration)}
        />
        <BarButton
          icon={<Feather name="align-left" size={17} color={showTafsir && !mushafMode ? "#FFFFFF" : "#9A9A9A"} />}
          label="Tafsir"
          active={showTafsir && !mushafMode}
          disabled={mushafMode}
          onPress={handleTafsirPress}
        />
        <View style={s.divider} />
        <BarButton
          icon={<Ionicons name="repeat" size={18} color="#9A9A9A" />}
          label="Range"
          active={false}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPlayRange(); }}
        />
      </View>
    </View>
  );
}

function BarButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[barBtnStyle.btn, active && barBtnStyle.btnActive, disabled && barBtnStyle.btnDisabled]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
    >
      {icon}
      <Text style={[barBtnStyle.label, active && barBtnStyle.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const barBtnStyle = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnActive: {
    backgroundColor: "#1A1A1A",
  },
  btnDisabled: {
    opacity: 0.35,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9A9A9A",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#FFFFFF",
  },
});

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 105 : 90,
      left: 16,
      right: 16,
      gap: 8,
    },
    tafsirPopup: {
      backgroundColor: "#FAFAFA",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: "#E8E8E8",
    },
    tafsirPopupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    tafsirPopupTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: "#9A9A9A",
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    tafsirPopupClose: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#F0F0F0",
      alignItems: "center",
      justifyContent: "center",
    },
    tafsirPopupOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tafsirPopupChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "#F0F0F0",
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    tafsirPopupChipActive: {
      backgroundColor: "#1A1A1A",
      borderColor: "#1A1A1A",
    },
    tafsirPopupChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#6B6B6B",
      fontFamily: "Inter_600SemiBold",
    },
    tafsirPopupChipTextActive: {
      color: "#FFFFFF",
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: "#F5F5F5",
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: "#E8E8E8",
    },
    divider: {
      width: 1,
      height: 28,
      backgroundColor: "#E0E0E0",
    },
  });
