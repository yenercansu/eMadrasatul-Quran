import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { SurahListRow } from "@/components/SurahListRow";

export default function SavedSurahsScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedSurahs } = useQuran();
  const surahsQuery = useQuery({ queryKey: ["chapters"], queryFn: fetchSurahs });
  const apiSurahs = surahsQuery.data ?? [];

  const savedSurahsMeta = useMemo(() => {
    return savedSurahs.map(n => SURAH_DATA[n - 1]).filter(Boolean);
  }, [savedSurahs]);

  const listHeader = (
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
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header — always anchored */}
      {listHeader}
      {surahsQuery.isLoading ? (
        <ActivityIndicator color={colors.appBlack} style={{ flex: 1 }} />
      ) : surahsQuery.isError ? (
        <TouchableOpacity style={s.empty} onPress={() => surahsQuery.refetch()} activeOpacity={0.8}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={s.emptyText}>Could not load saved surah details</Text>
          <Text style={s.emptyHint}>Tap to retry</Text>
        </TouchableOpacity>
      ) : (
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
            return (
              <SurahListRow
                englishName={item.englishName}
                arabicName={item.name}
                ayahCount={item.ayahCount}
                revelationType={apiSurah?.revelationType}
                isLast={index === savedSurahsMeta.length - 1}
                onPress={() => router.push(`/surah/${item.number}`)}
                right={<Ionicons name="bookmark" size={18} color={colors.appBlack} />}
              />
            );
          }}
        />
      )}
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
    listContent: { paddingBottom: 120 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 16, color: colors.appBorderMid, fontFamily: "Inter_400Regular" },
    emptyHint: { fontSize: 13, color: colors.appBorderMid, fontFamily: "Inter_400Regular" },
  });
