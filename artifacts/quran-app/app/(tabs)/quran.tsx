import { useQuery } from "@tanstack/react-query";
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Tag } from "@/components/Tag";
import { SurahCard } from "@/components/SurahCard";
import { PageTitle } from "@/components/Typography";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { MadeenanApiError } from "@/services/madeenanApi";
import { useQuran } from "@/contexts/QuranContext";
import { searchByType } from "@/services/search";

type FilterType = "all" | "meccan" | "medinan" | "alphabetic";

export default function QuranScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { recentProgress, saveSurah, removeSavedSurah, isSurahSaved, isSurahChecked, toggleCheckedSurah, memorizedAyahKeys } = useQuran();
  const surahsQuery = useQuery({
    queryKey: ["chapters"],
    queryFn: fetchSurahs,
  });
  const surahs = surahsQuery.data ?? [];
  const loadError = surahsQuery.error;
  const madeenanError = loadError instanceof MadeenanApiError ? loadError : null;

  const recentNumbers = useMemo(() => new Set(recentProgress.map(p => p.surahNumber)), [recentProgress]);

  const memorizedCountBySurah = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const key of memorizedAyahKeys) {
      const surahNum = Number(key.split(":")[0]);
      if (Number.isFinite(surahNum)) counts[surahNum] = (counts[surahNum] ?? 0) + 1;
    }
    return counts;
  }, [memorizedAyahKeys]);

  const filtered = useMemo(() => {
    let list = searchByType("surah", search, surahs).filter((s) => {
      const matchType =
        filterType === "all" || filterType === "alphabetic" ||
        (filterType === "meccan" && s.revelationType === "Meccan") ||
        (filterType === "medinan" && s.revelationType === "Medinan");
      return matchType;
    });
    if (filterType === "alphabetic") {
      list = [...list].sort((a, b) => a.englishName.localeCompare(b.englishName));
    }
    return list;
  }, [surahs, search, filterType]);

  const topPad = insets.top;

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "meccan", label: "Meccan" },
    { key: "medinan", label: "Medinan" },
    { key: "alphabetic", label: "Alphabetic" },
  ];

  return (
    <LinearGradient
      colors={[colors.appBackground, colors.appLightGray]}
      locations={[0, 1]}
      style={s.container}
    >
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <PageTitle>Al-Quran</PageTitle>
        <Text style={s.subtitle}>
          114 Surahs
        </Text>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Feather name="search" size={16} color={colors.appIconMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Search surahs..."
              placeholderTextColor={colors.appIconMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.appIconMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={s.filterRow}>
          {FILTERS.map(({ key, label }) => (
            <Tag key={key} label={label} selected={filterType === key} onPress={() => setFilterType(key)} />
          ))}
        </View>
      </View>

      {surahsQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : surahsQuery.isError ? (
        <View style={s.empty}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={s.emptyText}>Could not load surahs</Text>
          <Text style={s.errorDetail}>
            {madeenanError
              ? `${madeenanError.status || "Network"} ${madeenanError.code} · auth=${madeenanError.hadAuthToken ? "yes" : "no"}${madeenanError.requestId ? ` · request ${madeenanError.requestId}` : ""}`
              : loadError instanceof Error ? loadError.message : "Unknown error"}
          </Text>
          <TouchableOpacity onPress={() => surahsQuery.refetch()} style={s.retryBtn} activeOpacity={0.85}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          renderItem={({ item }) => {
            const saved = isSurahSaved(item.number);
            const memCount = memorizedCountBySurah[item.number] ?? 0;
            const isCompleted = memCount === item.numberOfAyahs || isSurahChecked(item.number);

            const handleToggleComplete = () => {
              if (isCompleted) {
                Alert.alert(
                  "Remove memorized status?",
                  `This will unmark all ${item.numberOfAyahs} ayahs of ${item.englishName} as memorized.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleCheckedSurah(item.number, item.numberOfAyahs);
                      },
                    },
                  ]
                );
              } else if (memCount > 0) {
                Alert.alert(
                  `Mark ${item.englishName} as memorized?`,
                  `You have ${memCount} of ${item.numberOfAyahs} ayahs memorized. This will mark all ${item.numberOfAyahs} ayahs as memorized. Are you sure?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Mark as memorized",
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleCheckedSurah(item.number, item.numberOfAyahs);
                      },
                    },
                  ]
                );
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleCheckedSurah(item.number, item.numberOfAyahs);
              }
            };

            return (
              <SurahCard
                surah={item}
                isRecent={recentNumbers.has(item.number)}
                isSaved={saved}
                onSave={() => saved ? removeSavedSurah(item.number) : saveSurah(item.number)}
                onPress={() => router.push(`/surah/${item.number}`)}
                memorizedCount={memCount}
                isManuallyCompleted={isSurahChecked(item.number)}
                onToggleComplete={handleToggleComplete}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book-open" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No surahs found</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      backgroundColor: "transparent",
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    subtitle: {
      fontSize: 14,                                                  // text-sm
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    searchRow: { marginBottom: 10 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.appCardWarm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      paddingHorizontal: 14,
      height: 46,
      gap: 10,
      ...colors.shadows.softLift,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,                                                  // text-sm
      color: colors.appText,
      fontFamily: "Inter_400Regular",
    },
    filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", paddingTop: 2 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    errorDetail: { paddingHorizontal: 24, textAlign: "center", fontSize: 12, lineHeight: 18, color: colors.destructive, fontFamily: "Inter_400Regular" },
    retryBtn: { paddingHorizontal: 16, height: 40, borderRadius: 10, backgroundColor: colors.appBlack, alignItems: "center", justifyContent: "center" },
    retryText: { fontSize: 13, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  });
