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
import { InlineNotice } from "@/components/InlineNotice";

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
        <InlineNotice
          variant="error"
          title="Could not load saved surah details"
          description="Tap to retry"
          onPress={() => surahsQuery.refetch()}
          style={s.emptyNotice}
        />
      ) : (
        <FlatList
          data={savedSurahsMeta}
          keyExtractor={(item) => String(item.number)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <InlineNotice
              variant="neutral"
              icon="bookmark"
              title="No saved surahs yet"
              description="Swipe left on any surah to save it"
              style={s.emptyNotice}
            />
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
    emptyNotice: { marginHorizontal: 16, marginTop: 48 },
  });
