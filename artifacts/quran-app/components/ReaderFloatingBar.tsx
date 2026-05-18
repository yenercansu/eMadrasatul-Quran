import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  colorCoding: boolean;
  selectedTafsirs: string[];
  tafsirEditions: TafsirEdition[];
  onToggleTranslation: () => void;
  onToggleTransliteration: () => void;
  onToggleTafsir: () => void;
  onToggleTafsirEdition: (id: string) => void;
  onToggleColorCoding: () => void;
  onPlayRange: () => void;
}

type Popup = "tafsir" | "colors" | null;

const WORD_COLORS = ["#E8507A", "#F2994A", "#27AE60", "#2F80ED", "#9B51E0", "#EB5757"];

export function ReaderFloatingBar({
  showTranslation,
  showTransliteration,
  showTafsir,
  mushafMode,
  colorCoding,
  selectedTafsirs,
  tafsirEditions,
  onToggleTranslation,
  onToggleTransliteration,
  onToggleTafsir,
  onToggleTafsirEdition,
  onToggleColorCoding,
  onPlayRange,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const SIDE_GAP = 16;
  const BOTTOM_GAP = insets.bottom + 12;
  const wrapperStyle = {
    position: "absolute" as const,
    bottom: BOTTOM_GAP,
    left: SIDE_GAP,
    right: SIDE_GAP,
    gap: 8,
  };
  const [activePopup, setActivePopup] = useState<Popup>(null);

  const toggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const handleTafsirPress = () => {
    if (mushafMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!showTafsir) {
      onToggleTafsir();
      setActivePopup("tafsir");
    } else {
      setActivePopup(p => p === "tafsir" ? null : "tafsir");
    }
  };

  const handleColorPress = () => {
    if (mushafMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!colorCoding) {
      onToggleColorCoding();
    }
    setActivePopup(p => p === "colors" ? null : "colors");
  };

  return (
    <View style={wrapperStyle}>
      {activePopup === "tafsir" && !mushafMode && (
        <View style={s.popup}>
          <View style={s.popupHeader}>
            <Text style={s.popupTitle}>Tafsir Sources</Text>
            <TouchableOpacity style={s.popupClose} onPress={() => setActivePopup(null)} activeOpacity={0.7}>
              <Feather name="x" size={14} color="#9A9A9A" />
            </TouchableOpacity>
          </View>
          <View style={s.popupChips}>
            {tafsirEditions.map(ed => {
              const selected = selectedTafsirs.includes(ed.id);
              return (
                <TouchableOpacity
                  key={ed.id}
                  style={[s.chip, selected && s.chipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleTafsirEdition(ed.id);
                  }}
                  activeOpacity={0.8}
                >
                  {selected && <Feather name="check" size={11} color="#FFFFFF" />}
                  <Text style={[s.chipText, selected && s.chipTextActive]}>{ed.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {activePopup === "colors" && !mushafMode && (
        <View style={s.popup}>
          <View style={s.popupHeader}>
            <Text style={s.popupTitle}>Word Color Coding</Text>
            <TouchableOpacity style={s.popupClose} onPress={() => setActivePopup(null)} activeOpacity={0.7}>
              <Feather name="x" size={14} color="#9A9A9A" />
            </TouchableOpacity>
          </View>
          <Text style={s.popupDesc}>Each word of every ayah gets a unique color for easy identification and study.</Text>
          <View style={s.colorSwatch}>
            {WORD_COLORS.map((c, i) => (
              <View key={i} style={[s.swatchDot, { backgroundColor: c }]} />
            ))}
            <Text style={s.swatchMore}>…</Text>
          </View>
          <TouchableOpacity
            style={[s.colorToggleBtn, colorCoding && s.colorToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleColorCoding();
            }}
            activeOpacity={0.85}
          >
            <Text style={[s.colorToggleBtnText, colorCoding && s.colorToggleBtnTextActive]}>
              {colorCoding ? "Disable Color Coding" : "Enable Color Coding"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.bar}>
        <BarButton
          icon={<Feather name="book-open" size={20} color={showTranslation && !mushafMode ? "#FFFFFF" : "#AAAAAA"} />}
          label="Meaning"
          active={showTranslation && !mushafMode}
          disabled={mushafMode}
          onPress={() => toggle(onToggleTranslation)}
        />
        <BarButton
          icon={<Feather name="type" size={20} color={showTransliteration && !mushafMode ? "#FFFFFF" : "#AAAAAA"} />}
          label="Roman"
          active={showTransliteration && !mushafMode}
          disabled={mushafMode}
          onPress={() => toggle(onToggleTransliteration)}
        />
        <BarButton
          icon={<Feather name="align-left" size={20} color={showTafsir && !mushafMode ? "#FFFFFF" : "#AAAAAA"} />}
          label="Tafsir"
          active={showTafsir && !mushafMode}
          disabled={mushafMode}
          onPress={handleTafsirPress}
        />
        <BarButton
          icon={
            <View style={s.colorIconRow}>
              {["#E8507A", "#27AE60", "#2F80ED"].map((c, i) => (
                <View key={i} style={[s.colorIconDot, { backgroundColor: c }, colorCoding && !mushafMode ? undefined : { opacity: 0.4 }]} />
              ))}
            </View>
          }
          label="Colors"
          active={colorCoding && !mushafMode}
          disabled={mushafMode}
          onPress={handleColorPress}
        />
        <View style={s.divider} />
        <BarButton
          icon={<Ionicons name="repeat" size={20} color="#AAAAAA" />}
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
  btn: { alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  btnActive: { backgroundColor: "#1A1A1A" },
  btnDisabled: { opacity: 0.35 },
  label: { fontSize: 12, fontWeight: "600", color: "#AAAAAA", fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  labelActive: { color: "#FFFFFF" },
});

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      bottom: 90,
      left: 20,
      right: 20,
      gap: 8,
    },
    popup: {
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
    popupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    popupTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: "#9A9A9A",
      fontFamily: "Inter_700Bold",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    popupClose: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#F0F0F0",
      alignItems: "center",
      justifyContent: "center",
    },
    popupDesc: {
      fontSize: 13,
      color: "#6B6B6B",
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
      marginBottom: 10,
    },
    popupChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "#F0F0F0",
    },
    chipActive: { backgroundColor: "#1A1A1A" },
    chipText: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
    chipTextActive: { color: "#FFFFFF" },
    colorSwatch: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    swatchDot: { width: 16, height: 16, borderRadius: 8 },
    swatchMore: { fontSize: 16, color: "#9A9A9A", fontWeight: "700" },
    colorToggleBtn: {
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "#F0F0F0",
    },
    colorToggleBtnActive: { backgroundColor: "#1A1A1A" },
    colorToggleBtnText: { fontSize: 14, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
    colorToggleBtnTextActive: { color: "#FFFFFF" },
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
    divider: { width: 1, height: 28, backgroundColor: "#E0E0E0" },
    colorIconRow: { flexDirection: "row", gap: 2, alignItems: "center" },
    colorIconDot: { width: 7, height: 7, borderRadius: 3.5 },
  });
