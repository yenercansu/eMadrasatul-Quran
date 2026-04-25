import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { ApiSurah } from "@/services/quranApi";

interface Props {
  surah: ApiSurah;
  onPress: () => void;
  isRecent?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
  isChecked?: boolean;
  onCheck?: () => void;
}

export function SurahCard({ surah, onPress, isRecent, isSaved, onSave, isChecked, onCheck }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.75}>
      <View style={s.topRow}>
        <View style={s.numberBadge}>
          <Text style={s.numberText}>{surah.number}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.type}>{surah.revelationType}</Text>
        </View>
        {onCheck && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onCheck(); }}
            style={[s.checkBtn, isChecked && s.checkBtnActive]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isChecked ? "checkmark-circle" : "checkmark-circle-outline"}
              size={20}
              color={isChecked ? "#FFFFFF" : "#C0C0C0"}
            />
          </TouchableOpacity>
        )}
        {onSave && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onSave(); }}
            style={s.saveBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={isSaved ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        )}
        {isRecent && (
          <View style={s.recentDot} />
        )}
      </View>

      <View style={s.body}>
        <View style={s.names}>
          <Text style={s.englishName}>{surah.englishName}</Text>
          <Text style={s.translation}>{surah.englishNameTranslation}</Text>
          <Text style={s.ayahCount}>{surah.numberOfAyahs} ayahs</Text>
        </View>
        <Text style={s.arabicName}>{surah.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    numberBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    numberText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    meta: { flex: 1 },
    type: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    saveBtn: { padding: 2 },
    checkBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "#F0F0F0",
      alignItems: "center",
      justifyContent: "center",
    },
    checkBtnActive: {
      backgroundColor: "#1A1A1A",
    },
    recentDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: "#4F46E5",
    },
    body: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    names: { flex: 1, gap: 2 },
    englishName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    translation: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    ayahCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    arabicName: {
      fontSize: 28,
      color: colors.primary,
      fontFamily: "System",
      marginLeft: 12,
    },
  });
