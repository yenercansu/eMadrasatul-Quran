import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { ApiSurah } from "@/services/quranApi";

interface Props {
  surah: ApiSurah;
  onPress: () => void;
  isRecent?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
}

export function SurahCard({ surah, onPress, isRecent, isSaved, onSave }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.7}>
      <View style={s.numberBadge}>
        <Text style={s.numberText}>{surah.number}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.englishName}>{surah.englishName}</Text>
        <Text style={s.translation}>
          {surah.englishNameTranslation} • {surah.numberOfAyahs} ayahs •{" "}
          {surah.revelationType}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.arabicName}>{surah.name}</Text>
        <View style={s.badges}>
          {isRecent && (
            <View style={s.recentBadge}>
              <Feather name="clock" size={10} color={colors.accent} />
            </View>
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
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    numberBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    numberText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    info: { flex: 1 },
    englishName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    translation: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      fontFamily: "Inter_400Regular",
    },
    right: { alignItems: "flex-end", gap: 4 },
    arabicName: {
      fontSize: 20,
      color: colors.primary,
      fontFamily: "System",
    },
    badges: { flexDirection: "row", alignItems: "center", gap: 6 },
    recentBadge: {},
    saveBtn: { padding: 2 },
  });
