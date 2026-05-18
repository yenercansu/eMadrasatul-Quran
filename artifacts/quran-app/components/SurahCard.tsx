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
  memorizedCount?: number;
  isManuallyCompleted?: boolean;
  onToggleComplete?: () => void;
}

export function MemorizedBadge() {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={s.memorizedBadge}>
      <Ionicons name="checkmark" size={10} color={colors.appText} />
      <Text style={s.memorizedBadgeText}>Completed</Text>
    </View>
  );
}

export function SurahCard({ surah, onPress, isRecent, isSaved, onSave, memorizedCount = 0, isManuallyCompleted, onToggleComplete }: Props) {
  const colors = useColors();
  const s = styles(colors);

  const isCompleted = memorizedCount === surah.numberOfAyahs || isManuallyCompleted;
  const hasPartialProgress = !isCompleted && memorizedCount > 0;
  const progressRatio = surah.numberOfAyahs > 0 ? memorizedCount / surah.numberOfAyahs : 0;

  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.82}>
      <View style={s.topRow}>
        <View style={s.meta}>
          <Text style={s.type}>{surah.revelationType}</Text>
        </View>
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
        </View>
        <View style={s.arabicWrap}>
          <Text style={s.arabicName}>{surah.name}</Text>
        </View>
      </View>

      {hasPartialProgress && (
        <View style={s.progressSection}>
          <View style={s.progressTag}>
            <Ionicons name="bookmarks-outline" size={11} color={colors.appIconMuted} />
            <Text style={s.progressTagText}>{memorizedCount}/{surah.numberOfAyahs} memorized</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.round(progressRatio * 100)}%` as any }]} />
          </View>
        </View>
      )}

      {isCompleted ? (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onToggleComplete?.(); }}
          activeOpacity={0.72}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{ alignSelf: "flex-start" }}
        >
          <MemorizedBadge />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onToggleComplete?.(); }}
          style={s.markCompleteRow}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark-circle-outline" size={14} color={colors.appIconMuted} />
          <Text style={s.markCompleteText}>Mark as completed</Text>
        </TouchableOpacity>
      )}
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
    markCompleteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 8,
      alignSelf: "flex-start",
    },
    markCompleteText: {
      fontSize: 12,
      color: colors.appIconMuted,
      fontFamily: "Inter_400Regular",
    },
    progressSection: {
      marginTop: 10,
      gap: 6,
    },
    progressTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      backgroundColor: colors.appSoftPill,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
    },
    progressTagText: {
      fontSize: 11,
      color: colors.appIconMuted,
      fontFamily: "Inter_600SemiBold",
    },
    progressTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.appSoftBorder,
      overflow: "hidden",
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
  });
