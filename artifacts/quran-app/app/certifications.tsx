import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

const TOTAL_AYAHS = 6236;
const sp = colors.spacing;
const ty = colors.typography;
const br = colors.borders;

function CircularProgress({ percent, c }: { percent: number; c: ReturnType<typeof useColors> }) {
  const size = 168;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", marginBottom: sp.lg }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radius} stroke={c.appBorderLighter} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={c.appText}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      <Text style={{ fontSize: ty.fontSize["4xl"], fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{percent}%</Text>
      <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>memorized</Text>
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
  const c = useColors();

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
    <View style={{ flex: 1, backgroundColor: c.appBackground, paddingTop: insets.top + sp.sm }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp.lg, paddingBottom: sp.sm + 2 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={c.appText} />
        </TouchableOpacity>
        <Text style={{ fontSize: ty.fontSize.xl, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>Certifications</Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: sp.lg, paddingBottom: 40, gap: 14 }}>

        {/* ── Hero Card ──────────────────────────────────────────── */}
        <View style={{ ...c.cardStyle, padding: 18, alignItems: "center" }}>
          <CircularProgress percent={stats.percent} c={c} />
          <View style={{ flexDirection: "row", gap: sp.sm, alignSelf: "stretch" }}>
            <View style={{ flex: 1, backgroundColor: c.appLightGray, borderRadius: br.lg, paddingVertical: sp.sm + 2, alignItems: "center" }}>
              <Text style={{ fontSize: ty.fontSize.xl, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{TOTAL_AYAHS}</Text>
              <Text style={{ fontSize: ty.fontSize.xs, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>Total Ayahs</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.appLightGray, borderRadius: br.lg, paddingVertical: sp.sm + 2, alignItems: "center" }}>
              <Text style={{ fontSize: ty.fontSize.xl, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{stats.totalMemorized}</Text>
              <Text style={{ fontSize: ty.fontSize.xs, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>Memorized</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.appLightGray, borderRadius: br.lg, paddingVertical: sp.sm + 2, alignItems: "center" }}>
              <Text style={{ fontSize: ty.fontSize.xl, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{stats.remaining}</Text>
              <Text style={{ fontSize: ty.fontSize.xs, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 2 }}>Remaining</Text>
            </View>
          </View>
          <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_700Bold", marginTop: sp.md }}>{100 - stats.percent}% remaining</Text>
        </View>

        {/* ── Rank / Progression Card ────────────────────────────── */}
        <View style={{ ...c.cardStyle, padding: sp.lg, gap: sp.sm + 2 }}>
          <Text style={{ fontSize: ty.fontSize.xs, fontWeight: "800", color: c.appDarkGray, letterSpacing: 0.9, fontFamily: "Inter_700Bold", textTransform: "uppercase" }}>
            Your Rank
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp.sm - 1, backgroundColor: c.appGoldSurface, paddingHorizontal: sp.sm + 2, paddingVertical: sp.sm - 1, borderRadius: br.full }}>
              <Ionicons name="ribbon" size={15} color={c.appText} />
              <Text style={{ fontSize: ty.fontSize.base, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{level.name}</Text>
            </View>
            {level.next !== "Complete" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={{ fontSize: ty.fontSize.sm, fontWeight: "700", color: c.appDarkGray, fontFamily: "Inter_700Bold" }}>Next: {level.next}</Text>
                <Feather name="chevron-right" size={13} color={c.appDarkGray} />
              </View>
            ) : (
              <Ionicons name="trophy" size={18} color={c.appGold} />
            )}
          </View>

          <Text style={{ fontSize: ty.fontSize.base, color: c.appDarkerGray, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
            {level.desc}
          </Text>

          <View style={{ height: 7, backgroundColor: c.appBorderLighter, borderRadius: br.full, overflow: "hidden", marginTop: 2 }}>
            <View style={{ height: 7, width: `${levelProgress}%` as any, backgroundColor: c.appGold, borderRadius: br.full }} />
          </View>

          <Text style={{ fontSize: ty.fontSize.xs, color: c.appDarkGray, fontFamily: "Inter_400Regular", lineHeight: 16 }}>
            Beginner · Student · Dedicated · Advanced · Near Hafiz · Hafiz
          </Text>
        </View>

        {/* ── Completed Surahs Card ──────────────────────────────── */}
        <View style={{ ...c.cardStyle, padding: sp.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: stats.completed.length > 0 ? sp.md : 0 }}>
            <Text style={{ fontSize: ty.fontSize.lg, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>Completed Surahs</Text>
            <View style={{
              backgroundColor: stats.completed.length > 0 ? c.appText : c.appLightGray,
              borderRadius: br.full,
              paddingHorizontal: sp.sm + 2,
              paddingVertical: 3,
              minWidth: 26,
              alignItems: "center",
            }}>
              <Text style={{ fontSize: ty.fontSize.sm, fontWeight: "800", color: stats.completed.length > 0 ? c.appCard : c.appTextMuted, fontFamily: "Inter_700Bold" }}>
                {stats.completed.length}
              </Text>
            </View>
          </View>

          {stats.completed.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp.sm }}>
              {stats.completed.map(surah => (
                <View
                  key={surah.number}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.appLightGray, borderRadius: br.full, paddingHorizontal: sp.md, paddingVertical: 6 }}
                >
                  <Ionicons name="checkmark-circle" size={13} color={c.appSuccess} />
                  <Text style={{ fontSize: ty.fontSize.sm, fontWeight: "700", color: c.appText, fontFamily: "Inter_700Bold" }}>
                    {surah.englishName}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: sp["2xl"] + sp.sm }}>
              <Ionicons name="book-outline" size={28} color={c.appTextMuted} />
              <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: sp.sm, textAlign: "center" }}>
                No completed surahs yet
              </Text>
            </View>
          )}
        </View>

        {/* ── Partial Surahs Card ────────────────────────────────── */}
        <View style={{ ...c.cardStyle, padding: sp.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: stats.partial.length > 0 ? sp.md : 0 }}>
            <Text style={{ fontSize: ty.fontSize.lg, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>Partial Surahs</Text>
            <View style={{
              backgroundColor: stats.partial.length > 0 ? c.appGoldSurface : c.appLightGray,
              borderRadius: br.full,
              paddingHorizontal: sp.sm + 2,
              paddingVertical: 3,
              minWidth: 26,
              alignItems: "center",
            }}>
              <Text style={{ fontSize: ty.fontSize.sm, fontWeight: "800", color: stats.partial.length > 0 ? c.appText : c.appTextMuted, fontFamily: "Inter_700Bold" }}>
                {stats.partial.length}
              </Text>
            </View>
          </View>

          {stats.partial.length > 0 ? (
            <View style={{ gap: sp.md }}>
              {stats.partial.map((surah, i) => (
                <View key={surah.number}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <Text style={{ fontSize: ty.fontSize.base, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>
                      {surah.englishName}
                    </Text>
                    <Text style={{ fontSize: ty.fontSize.sm, fontWeight: "700", color: c.appText, fontFamily: "Inter_700Bold" }}>
                      {surah.percent}%
                    </Text>
                  </View>
                  <View style={{ height: 5, backgroundColor: c.appBorderLighter, borderRadius: br.full, overflow: "hidden" }}>
                    <View style={{ height: 5, width: `${surah.percent}%` as any, backgroundColor: c.appGold, borderRadius: br.full }} />
                  </View>
                  <Text style={{ fontSize: ty.fontSize.xs, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 3 }}>
                    {surah.memorized} of {surah.ayahCount} ayahs
                  </Text>
                  {i < stats.partial.length - 1 && (
                    <View style={{ height: 1, backgroundColor: c.appBorder, marginTop: sp.md }} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: sp["2xl"] + sp.sm }}>
              <Ionicons name="hourglass-outline" size={28} color={c.appTextMuted} />
              <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: sp.sm, textAlign: "center" }}>
                No surahs in progress yet
              </Text>
            </View>
          )}
        </View>

        {/* ── Surah Breakdown ────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: sp.xs }}>
          <Text style={{ fontSize: ty.fontSize.xl, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>Surah Breakdown</Text>
          <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_400Regular" }}>{stats.completed.length} completed</Text>
        </View>

        <View style={{ gap: sp.sm }}>
          {stats.surahs.map((surah) => (
            <View key={surah.number} style={{ ...c.cardStyle, padding: sp.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: sp.md, marginBottom: sp.sm }}>
                <View>
                  <Text style={{ fontSize: ty.fontSize.base, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{surah.englishName}</Text>
                  <Text style={{ fontSize: ty.fontSize.sm, color: c.appTextMuted, fontFamily: "Inter_400Regular", marginTop: 1 }}>{surah.memorized} / {surah.ayahCount}</Text>
                </View>
                <Text style={{ fontSize: ty.fontSize.base - 1, fontWeight: "800", color: c.appText, fontFamily: "Inter_700Bold" }}>{surah.percent}%</Text>
              </View>
              <View style={{ height: 7, backgroundColor: c.appBorderLighter, borderRadius: br.full, overflow: "hidden" }}>
                <View style={{ height: 7, width: `${surah.percent}%` as any, backgroundColor: c.appText, borderRadius: br.full }} />
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
