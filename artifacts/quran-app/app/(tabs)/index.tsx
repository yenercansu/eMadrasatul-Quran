import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";

export default function HomeScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { recentProgress, lastListened, saveProgress } = useQuran();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await fetchSurahs();
      setSurahs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const featuredSurahs = surahs.slice(0, 5);
  const juzSurahs = surahs.filter(s => [2, 10, 18, 26, 36, 50, 67, 78].includes(s.number));

  const topPaddingWeb = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={colors.primary}
        />
      }
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={[s.hero, { paddingTop: topPaddingWeb + 20 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.heroContent}>
          <Text style={s.greeting}>Peace be upon you</Text>
          <Text style={s.heroTitle}>Read & Reflect</Text>
          <Text style={s.heroSub}>Al-Quran Al-Kareem</Text>

          {lastListened && (
            <TouchableOpacity
              style={s.resumeCard}
              onPress={() => router.push(`/surah/${lastListened.surahNumber}?ayah=${lastListened.ayahNumberInSurah}`)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={s.resumeLabel}>CONTINUE READING</Text>
                <Text style={s.resumeSurah}>{lastListened.surahName}</Text>
                <Text style={s.resumeAyah}>Ayah {lastListened.ayahNumberInSurah}</Text>
              </View>
              <View style={s.resumeIcon}>
                <Ionicons name="play" size={22} color={colors.primaryForeground} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNumber}>114</Text>
          <Text style={s.statLabel}>Surahs</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumber}>30</Text>
          <Text style={s.statLabel}>Juz</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumber}>6236</Text>
          <Text style={s.statLabel}>Ayahs</Text>
        </View>
      </View>

      {recentProgress.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recently Read</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recentList}>
            {recentProgress.map((p) => (
              <TouchableOpacity
                key={p.surahNumber}
                style={s.recentCard}
                onPress={() => router.push(`/surah/${p.surahNumber}?ayah=${p.ayahNumberInSurah}`)}
                activeOpacity={0.85}
              >
                <Text style={s.recentNumber}>{p.surahNumber}</Text>
                <Text style={s.recentName}>{p.surahName}</Text>
                <Text style={s.recentAyah}>Ayah {p.ayahNumberInSurah}</Text>
                <View style={s.recentPlayIcon}>
                  <Ionicons name="play" size={14} color={colors.primaryForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Popular Surahs</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/quran")} activeOpacity={0.7}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
        ) : (
          featuredSurahs.map((surah) => (
            <TouchableOpacity
              key={surah.number}
              style={s.surahRow}
              onPress={() => router.push(`/surah/${surah.number}`)}
              activeOpacity={0.7}
            >
              <View style={s.surahNumber}>
                <Text style={s.surahNumberText}>{surah.number}</Text>
              </View>
              <View style={s.surahInfo}>
                <Text style={s.surahName}>{surah.englishName}</Text>
                <Text style={s.surahMeta}>{surah.numberOfAyahs} ayahs • {surah.revelationType}</Text>
              </View>
              <Text style={s.surahArabic}>{surah.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>By Juz</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.juzList}>
          {juzSurahs.map((surah) => (
            <TouchableOpacity
              key={surah.number}
              style={s.juzCard}
              onPress={() => router.push(`/surah/${surah.number}`)}
              activeOpacity={0.85}
            >
              <Text style={s.juzArabic}>{surah.name}</Text>
              <Text style={s.juzName}>{surah.englishName}</Text>
              <Text style={s.juzAyahs}>{surah.numberOfAyahs} ayahs</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    hero: {
      paddingBottom: 28,
      paddingHorizontal: 20,
    },
    heroContent: {},
    greeting: {
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      fontFamily: "Inter_400Regular",
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    heroSub: {
      fontSize: 16,
      color: "rgba(255,255,255,0.8)",
      fontFamily: "Inter_400Regular",
      marginBottom: 20,
    },
    resumeCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },
    resumeLabel: {
      fontSize: 10,
      color: "rgba(255,255,255,0.7)",
      letterSpacing: 1,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    resumeSurah: {
      fontSize: 18,
      color: "#FFFFFF",
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
    },
    resumeAyah: {
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    resumeIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    statsRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: -16,
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    statNumber: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    seeAll: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    surahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    surahNumber: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    surahNumberText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    surahInfo: { flex: 1 },
    surahName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    surahMeta: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    surahArabic: {
      fontSize: 22,
      color: colors.primary,
    },
    recentList: {
      paddingHorizontal: 16,
      gap: 12,
    },
    recentCard: {
      width: 110,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recentNumber: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    recentName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginTop: 4,
    },
    recentAyah: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    recentPlayIcon: {
      marginTop: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    juzList: {
      paddingHorizontal: 16,
      gap: 10,
    },
    juzCard: {
      width: 120,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    juzArabic: {
      fontSize: 20,
      color: colors.primary,
      marginBottom: 6,
    },
    juzName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    juzAyahs: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
  });
