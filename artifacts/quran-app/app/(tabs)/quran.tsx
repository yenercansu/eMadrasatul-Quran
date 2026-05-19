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
import { AppDialog } from "@/components/AppDialog";
import { InlineNotice } from "@/components/InlineNotice";

type FilterType = "all" | "meccan" | "medinan" | "alphabetic";

export default function QuranScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
  } | null>(null);
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

  const listHeader = (
    <View style={s.header}>
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
  );

  return (
    <LinearGradient
      colors={[colors.screenBackground, colors.screenBackgroundAlt]}
      locations={[0, 1]}
      style={[s.container, { paddingTop: insets.top }]}
    >
      {/* Header — always anchored */}
      {listHeader}
      {surahsQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : surahsQuery.isError ? (
        <InlineNotice
          variant="error"
          title="Could not load surahs"
          description={madeenanError
            ? `${madeenanError.status || "Network"} ${madeenanError.code} · auth=${madeenanError.hadAuthToken ? "yes" : "no"}${madeenanError.requestId ? ` · request ${madeenanError.requestId}` : ""}`
            : loadError instanceof Error ? loadError.message : "Unknown error"}
          actionLabel="Retry"
          onActionPress={() => surahsQuery.refetch()}
          style={s.emptyNotice}
        />
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
                setConfirmDialog({
                  title: "Remove memorized status?",
                  message: `This will unmark all ${item.numberOfAyahs} ayahs of ${item.englishName} as memorized.`,
                  confirmLabel: "Remove",
                  variant: "destructive",
                  onConfirm: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleCheckedSurah(item.number);
                    setConfirmDialog(null);
                  },
                });
              } else if (memCount > 0) {
                setConfirmDialog({
                  title: `Mark ${item.englishName} as memorized?`,
                  message: `You have ${memCount} of ${item.numberOfAyahs} ayahs memorized. This will mark all ${item.numberOfAyahs} ayahs as memorized.`,
                  confirmLabel: "Mark as memorized",
                  onConfirm: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleCheckedSurah(item.number);
                    setConfirmDialog(null);
                  },
                });
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleCheckedSurah(item.number);
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
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <InlineNotice
              variant="neutral"
              icon="book-open"
              description="No surahs found"
              style={s.emptyNotice}
            />
          }
        />
      )}
      <AppDialog
        visible={!!confirmDialog}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </LinearGradient>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      backgroundColor: "transparent",
      paddingHorizontal: 16,
      paddingTop: 12,
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
    emptyNotice: { marginHorizontal: 16, marginTop: 48 },
  });
