import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

const TOTAL_AYAHS = 6236;

function CircularProgress({ percent }: { percent: number }) {
  const size = 168;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  const center = size / 2;

  return (
    <View style={s.circleWrap}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radius} stroke="#E9E2D4" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#1A1A1A"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      <Text style={s.circlePercent}>{percent}%</Text>
      <Text style={s.circleLabel}>memorized</Text>
    </View>
  );
}

function getLevel(percent: number) {
  if (percent >= 100) return { name: "Hafiz", next: "Complete", desc: "Full Quran memorization completed." };
  if (percent >= 75) return { name: "Near Hafiz", next: "Hafiz", desc: "You are in the final stretch of the journey." };
  if (percent >= 50) return { name: "Advanced", next: "Near Hafiz", desc: "More than half of the Quran is memorized." };
  if (percent >= 25) return { name: "Dedicated", next: "Advanced", desc: "Your memorization habit is becoming strong." };
  if (percent >= 10) return { name: "Student", next: "Dedicated", desc: "You have built a real foundation." };
  return { name: "Beginner", next: "Student", desc: "Start steady and keep each ayah intentional." };
}

export default function CertificationsScreen() {
  const insets = useSafeAreaInsets();
  const { memorizedAyahKeys } = useQuran();

  const stats = useMemo(() => {
    const memorized = new Set(memorizedAyahKeys);
    const surahs = SURAH_DATA.map((surah) => {
      let count = 0;
      for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
        if (memorized.has(`${surah.number}:${ayah}`)) count++;
      }
      const percent = Math.round((count / surah.ayahCount) * 100);
      return { ...surah, memorized: count, percent };
    });
    const totalMemorized = surahs.reduce((sum, surah) => sum + surah.memorized, 0);
    const percent = Math.round((totalMemorized / TOTAL_AYAHS) * 100);
    return {
      surahs,
      totalMemorized,
      remaining: TOTAL_AYAHS - totalMemorized,
      percent,
      completed: surahs.filter(surah => surah.memorized === surah.ayahCount),
      partial: surahs.filter(surah => surah.memorized > 0 && surah.memorized < surah.ayahCount),
    };
  }, [memorizedAyahKeys]);

  const level = getLevel(stats.percent);
  const levelProgress = stats.percent >= 100 ? 100 : stats.percent;

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Certifications</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.heroCard}>
          <CircularProgress percent={stats.percent} />
          <View style={s.heroStats}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{TOTAL_AYAHS}</Text>
              <Text style={s.statLabel}>Total Ayahs</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>{stats.totalMemorized}</Text>
              <Text style={s.statLabel}>Memorized</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>{stats.remaining}</Text>
              <Text style={s.statLabel}>Remaining</Text>
            </View>
          </View>
          <Text style={s.remainingText}>{100 - stats.percent}% remaining</Text>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Surah Breakdown</Text>
          <Text style={s.sectionSub}>{stats.completed.length} completed</Text>
        </View>
        <View style={s.surahList}>
          {stats.surahs.map((surah) => (
            <View key={surah.number} style={s.surahRow}>
              <View style={s.surahTop}>
                <View>
                  <Text style={s.surahName}>{surah.englishName}</Text>
                  <Text style={s.surahCount}>{surah.memorized} / {surah.ayahCount}</Text>
                </View>
                <Text style={s.surahPercent}>{surah.percent}%</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${surah.percent}%` as any }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={s.levelCard}>
          <View style={s.levelTop}>
            <View style={s.levelBadge}>
              <Ionicons name="ribbon" size={16} color="#1A1A1A" />
              <Text style={s.levelBadgeText}>{level.name}</Text>
            </View>
            <Text style={s.levelNext}>Next: {level.next}</Text>
          </View>
          <Text style={s.levelDesc}>{level.desc}</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFillGold, { width: `${levelProgress}%` as any }]} />
          </View>
          <Text style={s.levelScale}>Beginner · Student · Dedicated · Advanced · Near Hafiz · Hafiz</Text>
        </View>

        <View style={s.listCard}>
          <Text style={s.listTitle}>Completed Surahs</Text>
          <Text style={s.listText}>{stats.completed.length ? stats.completed.map(surah => surah.englishName).join(", ") : "No completed surahs yet"}</Text>
        </View>

        <View style={s.listCard}>
          <Text style={s.listTitle}>Partial Surahs</Text>
          <Text style={s.listText}>{stats.partial.length ? stats.partial.map(surah => `${surah.englishName} ${surah.percent}%`).join(", ") : "No partial surahs yet"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  circleWrap: { width: 168, height: 168, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  circlePercent: { fontSize: 34, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  circleLabel: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 2 },
  heroStats: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  statBox: { flex: 1, backgroundColor: "#F8F8FA", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 2 },
  remainingText: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_700Bold", marginTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular" },
  surahList: { gap: 8 },
  surahRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  surahTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  surahName: { fontSize: 14, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahCount: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 1 },
  surahPercent: { fontSize: 13, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  progressTrack: { height: 7, backgroundColor: "#E9E2D4", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 7, backgroundColor: "#1A1A1A", borderRadius: 4 },
  progressFillGold: { height: 7, backgroundColor: "#C9A84C", borderRadius: 4 },
  levelCard: {
    backgroundColor: "#FFF8E6",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEDFAF",
    gap: 10,
  },
  levelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#F1D887", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  levelBadgeText: { fontSize: 13, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  levelNext: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_700Bold" },
  levelDesc: { fontSize: 13, color: "#5A5A5A", fontFamily: "Inter_400Regular", lineHeight: 18 },
  levelScale: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular", lineHeight: 16 },
  listCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#ECECEC" },
  listTitle: { fontSize: 14, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 6 },
  listText: { fontSize: 12, color: "#6B6B6B", fontFamily: "Inter_400Regular", lineHeight: 18 },
});
