import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Tag } from "@/components/Tag";
import { SurahCard } from "@/components/SurahCard";
import { PageTitle } from "@/components/Typography";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { useQuran } from "@/contexts/QuranContext";

type FilterType = "all" | "meccan" | "medinan" | "alphabetic";

function SwipeableSurahCard({
  surah,
  isRecent,
  isSaved,
  onSave,
  onPress,
  isChecked,
  onCheck,
  colors,
}: {
  surah: ApiSurah;
  isRecent: boolean;
  isSaved: boolean;
  onSave: () => void;
  onPress: () => void;
  isChecked: boolean;
  onCheck: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1], outputRange: [90, 0],
    });
    return (
      <Animated.View
        style={[
          s.swipeAction,
          { transform: [{ translateX: trans }], backgroundColor: isSaved ? "#D9534F" : colors.primary },
        ]}
      >
        <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color="#FFFFFF" />
        <Text style={s.swipeActionText}>{isSaved ? "Unsave" : "Save"}</Text>
      </Animated.View>
    );
  };

  const handleSwipeAction = () => {
    Haptics.notificationAsync(
      isSaved ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
    );
    onSave();
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={60}
      overshootRight={false}
      friction={2}
      onSwipeableOpen={handleSwipeAction}
    >
      <SurahCard
        surah={surah}
        onPress={onPress}
        isRecent={isRecent}
        isSaved={isSaved}
        onSave={onSave}
        isChecked={isChecked}
        onCheck={onCheck}
      />
    </Swipeable>
  );
}

export default function QuranScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const { recentProgress, saveSurah, removeSavedSurah, isSurahSaved, isSurahChecked, toggleCheckedSurah } = useQuran();

  useEffect(() => {
    fetchSurahs().then(setSurahs).finally(() => setLoading(false));
  }, []);

  const recentNumbers = useMemo(() => new Set(recentProgress.map(p => p.surahNumber)), [recentProgress]);

  const filtered = useMemo(() => {
    let list = surahs.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q);
      const matchType =
        filterType === "all" || filterType === "alphabetic" ||
        (filterType === "meccan" && s.revelationType === "Meccan") ||
        (filterType === "medinan" && s.revelationType === "Medinan");
      return matchSearch && matchType;
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
      colors={[colors.appLighterBg, colors.appLightGray]}
      locations={[0, 1]}
      style={s.container}
    >
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <PageTitle>Al-Quran</PageTitle>
        <Text style={s.subtitle}>
          114 Surahs — swipe ← to save/unsave
        </Text>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Feather name="search" size={16} color={colors.appBorderMid} />
            <TextInput
              style={s.searchInput}
              placeholder="Search surahs..."
              placeholderTextColor={colors.appBorderMid}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.appBorderMid} />
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

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          renderItem={({ item }) => {
            const saved = isSurahSaved(item.number);
            const checked = isSurahChecked(item.number);
            return (
              <SwipeableSurahCard
                surah={item}
                isRecent={recentNumbers.has(item.number)}
                isSaved={saved}
                onSave={() => saved ? removeSavedSurah(item.number) : saveSurah(item.number)}
                onPress={() => router.push(`/surah/${item.number}`)}
                isChecked={checked}
                onCheck={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleCheckedSurah(item.number, item.numberOfAyahs); }}
                colors={colors}
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
      color: colors.appBorderMid,                                    // stone-400
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    searchRow: { marginBottom: 10 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.appStone,                             // stone-200 (#E7E5E4)
      borderRadius: colors.borders.lg,                              // rounded-xl → 12px token
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,                                                  // text-sm
      color: colors.appLightText,                                    // zinc-500
      fontFamily: "Inter_400Regular",
    },
    filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    swipeAction: {
      width: 90,
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
    swipeActionText: { fontSize: 12, fontWeight: "700", color: colors.appWhite, fontFamily: "Inter_700Bold" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
