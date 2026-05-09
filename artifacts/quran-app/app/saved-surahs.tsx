import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";

export default function SavedSurahsScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedSurahs } = useQuran();
  const [apiSurahs, setApiSurahs] = useState<ApiSurah[]>([]);

  useEffect(() => {
    fetchSurahs().then(setApiSurahs).catch(() => {});
  }, []);

  const savedSurahsMeta = useMemo(() => {
    return savedSurahs.map(n => SURAH_DATA[n - 1]).filter(Boolean);
  }, [savedSurahs]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.appText} />
        </TouchableOpacity>
        <Text style={s.title}>Saved Surahs</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={savedSurahsMeta}
        keyExtractor={(item) => String(item.number)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="bookmark" size={40} color={colors.appBorderMid} />
            <Text style={s.emptyText}>No saved surahs yet</Text>
            <Text style={s.emptyHint}>Swipe left on any surah to save it</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const apiSurah = apiSurahs.find(a => a.number === item.number);
          const isLast = index === savedSurahsMeta.length - 1;
          return (
            <TouchableOpacity
              style={[s.savedRow, isLast && s.savedRowLast]}
              onPress={() => router.push(`/surah/${item.number}`)}
              activeOpacity={0.7}
            >
              <View style={s.savedInfo}>
                <Text style={s.savedName}>{item.englishName}</Text>
                <Text style={s.savedMeta}>
                  {item.ayahCount} Ayahs{apiSurah?.revelationType ? ` • ${apiSurah.revelationType}` : ""}
                </Text>
              </View>
              <Text style={s.savedArabic}>{item.name}</Text>
              <Ionicons name="bookmark" size={18} color={colors.appBlack} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.appLighterBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appBorderLighter,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 120,
    },
    savedCard: {
      backgroundColor: colors.appWhite,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 0.5,
      borderColor: colors.appBorderLighter,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 1,
    },
    savedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appBorderLighter,
      gap: 12,
      backgroundColor: colors.appWhite,
      borderRadius: 12,
      marginBottom: 8,
    },
    savedRowLast: { marginBottom: 0 },
    savedInfo: { flex: 1 },
    savedName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 2,
    },
    savedArabic: { fontSize: 17, color: colors.appBlack },
    savedMeta: { fontSize: 11, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 16, color: colors.appBorderMid, fontFamily: "Inter_400Regular" },
    emptyHint: { fontSize: 13, color: colors.appBorderMid, fontFamily: "Inter_400Regular" },
  });
