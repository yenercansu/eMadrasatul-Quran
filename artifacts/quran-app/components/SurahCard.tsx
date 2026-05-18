import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SaveButton } from "@/components/SaveButton";
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

export function MemorizedBadge() {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={s.memorizedBadge}>
      <Ionicons name="checkmark" size={10} color={colors.appText} />
      <Text style={s.memorizedBadgeText}>Memorized</Text>
    </View>
  );
}

export function SurahCard({ surah, onPress, isRecent, isSaved, onSave, isChecked, onCheck }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.82}>
      <View style={s.topRow}>
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
              size={15}
              color={isChecked ? colors.appWhite : colors.appIconMuted}
            />
          </TouchableOpacity>
        )}
        {onSave && (
          <SaveButton
            saved={isSaved}
            onPress={(e) => { e.stopPropagation(); onSave(); }}
            accessibilityLabel={`${isSaved ? "Unsave" : "Save"} ${surah.englishName}`}
          />
        )}
      </View>

      <View style={s.body}>
        <View style={s.names}>
          <Text style={s.englishName}>{surah.englishName}</Text>
          <Text style={s.translation}>{surah.englishNameTranslation}</Text>
          <View style={s.footerMeta}>
            <Text style={s.ayahCount}>{surah.numberOfAyahs} ayahs</Text>
            {isRecent && <View style={s.metaDot} />}
            {isRecent && <Text style={s.ayahCount}>Recent</Text>}
          </View>
          {isChecked && <MemorizedBadge />}
        </View>
        <View style={s.arabicWrap}>
          <Text style={s.arabicName}>{surah.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.appCardWarm,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      ...colors.shadows.premiumCard,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 0,
      gap: 8,
    },
    meta: { flex: 1 },
    type: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.appTextMuted,
      fontFamily: "Inter_600SemiBold",
    },
    checkBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.appIconMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    checkBtnActive: {
      backgroundColor: colors.appDarkerGray,
      borderColor: colors.appDarkerGray,
    },
    memorizedBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.appSoftPill,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    memorizedBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.appText,
      fontFamily: "Inter_600SemiBold",
    },
    body: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
      gap: 14,
    },
    names: { flex: 1, gap: 3 },
    englishName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    translation: {
      fontSize: 13,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    footerMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.appIconMuted,
    },
    ayahCount: {
      fontSize: 12,
      color: colors.appIconMuted,
      fontFamily: "Inter_400Regular",
    },
    arabicWrap: {
      minWidth: 84,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: colors.appSoftPill,
    },
    arabicName: {
      fontSize: 21,
      color: colors.appText,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      textAlign: "right",
    },
  });
