import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
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
              name="checkmark"
              size={16}
              color={isChecked ? colors.appWhite : colors.appBorderMid}
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
              size={16}
              color={isSaved ? colors.appText : colors.appBorderMid}
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
          {isChecked && (
            <View style={s.memorizedBadge}>
              <Text style={s.memorizedBadgeText}>MEMORIZED</Text>
            </View>
          )}
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
      borderRadius: colors.borders.xl,       // rounded-2xl → 16px token
      padding: 18,
      borderWidth: 1,
      borderColor: colors.appDarkerGray,     // stone-600 (#57534E)
      // no shadow — Figma: shadow-[0px_0px_0px_0px_...]
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
      borderRadius: 18,                      // rounded-full (half of 36)
      backgroundColor: colors.appText,       // stone-900
      alignItems: "center",
      justifyContent: "center",
    },
    numberText: {
      fontSize: 12,                          // text-xs
      fontWeight: "700",
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
    },
    meta: { flex: 1 },
    type: {
      fontSize: 10,                          // text-[10px]
      fontWeight: "600",
      color: colors.appBorderMid,            // stone-400 (#A8A29E)
      fontFamily: "Inter_600SemiBold",
    },
    saveBtn: {
      width: 28,
      height: 28,
      borderRadius: colors.borders.md,       // rounded-md → 8px token
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkBtn: {
      width: 28,                             // w-7
      height: 28,
      borderRadius: 14,                      // rounded-full (half of 28)
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.appBorderMid,      // stone-400
      alignItems: "center",
      justifyContent: "center",
    },
    checkBtnActive: {
      backgroundColor: colors.appText,       // stone-900
      borderColor: colors.appText,
    },
    recentDot: {
      width: 6,                              // w-1.5
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.appBlack,
    },
    memorizedBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.appText,       // stone-900 — Figma: bg-stone-900
      paddingHorizontal: 10,                 // px-2.5
      paddingVertical: 2,                    // py-0.5
      borderRadius: 4,                       // rounded
      marginTop: 6,
    },
    memorizedBadgeText: {
      fontSize: 10,                          // text-[10px]
      fontWeight: "600",                     // font-semibold
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },
    body: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    names: { flex: 1, gap: 2 },
    englishName: {
      fontSize: 16,                          // text-base
      fontWeight: "800",                     // font-extrabold
      color: colors.appText,                 // stone-900
      fontFamily: "Inter_700Bold",
    },
    translation: {
      fontSize: 12,                          // text-xs
      color: colors.appLightText,            // zinc-500 (#71717A)
      fontFamily: "Inter_400Regular",
    },
    ayahCount: {
      fontSize: 12,                          // text-xs
      color: colors.appLightText,            // zinc-500
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    arabicName: {
      fontSize: 20,                          // text-xl
      color: colors.appText,                 // stone-900
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      marginLeft: 12,
    },
  });
