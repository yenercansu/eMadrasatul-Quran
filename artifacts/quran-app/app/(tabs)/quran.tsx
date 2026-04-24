import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { SurahCard } from "@/components/SurahCard";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { useQuran } from "@/contexts/QuranContext";

export default function QuranScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "meccan" | "medinan">("all");
  const { recentProgress } = useQuran();

  useEffect(() => {
    fetchSurahs().then(setSurahs).finally(() => setLoading(false));
  }, []);

  const recentNumbers = useMemo(() => new Set(recentProgress.map(p => p.surahNumber)), [recentProgress]);

  const filtered = useMemo(() => {
    return surahs.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        String(s.number).includes(q);
      const matchType =
        filterType === "all" ||
        (filterType === "meccan" && s.revelationType === "Meccan") ||
        (filterType === "medinan" && s.revelationType === "Medinan");
      return matchSearch && matchType;
    });
  }, [surahs, search, filterType]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Text style={s.title}>Al-Quran</Text>
        <Text style={s.subtitle}>114 Surahs</Text>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={s.searchInput}
              placeholder="Search surahs..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={s.filterRow}>
          {(["all", "meccan", "medinan"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filterType === f && s.filterChipActive]}
              onPress={() => setFilterType(f)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, filterType === f && s.filterTextActive]}>
                {f === "all" ? "All" : f === "meccan" ? "Meccan" : "Medinan"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.number)}
          renderItem={({ item }) => (
            <SurahCard
              surah={item}
              onPress={() => router.push(`/surah/${item.number}`)}
              isRecent={recentNumbers.has(item.number)}
            />
          )}
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 120 }}
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
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    searchRow: {
      marginBottom: 10,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    filterText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    filterTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    empty: {
      alignItems: "center",
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
