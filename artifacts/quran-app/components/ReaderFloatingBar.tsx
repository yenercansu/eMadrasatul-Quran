import React from "react";
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

interface Props {
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  mushafMode: boolean;
  onToggleTranslation: () => void;
  onToggleTransliteration: () => void;
  onToggleTafsir: () => void;
  onPlayRange: () => void;
}

export function ReaderFloatingBar({
  showTranslation,
  showTransliteration,
  showTafsir,
  mushafMode,
  onToggleTranslation,
  onToggleTransliteration,
  onToggleTafsir,
  onPlayRange,
}: Props) {
  const colors = useColors();
  const s = styles(colors);

  const handleToggle = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
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
        onPress={() => handleToggle(onToggleTafsir)}
      />
      <View style={s.divider} />
      <BarButton
        icon={<Ionicons name="repeat" size={18} color="#9A9A9A" />}
        label="Range"
        active={false}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPlayRange(); }}
      />
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
    bar: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 105 : 90,
      left: 16,
      right: 16,
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
