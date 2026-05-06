import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { getJuzAyahs, SURAH_DATA } from "@/constants/surahData";
import { GoalSetupModal } from "@/components/GoalSetupModal";
import { EditDailyGoalModal } from "@/components/EditDailyGoalModal";

const TOTAL_AYAHS = 6236;

function CircularRing({
  percent, size = 60, strokeWidth = 5,
  color, trackColor, label,
}: {
  percent: number; size?: number; strokeWidth?: number;
  color?: string; trackColor?: string; label?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const dashOffset = circumference - (p / 100) * circumference;
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center} cy={center} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: size * 0.2, fontWeight: "700", color, fontFamily: "Inter_700Bold" }}>
          {Math.round(p)}%
        </Text>
        {label ? (
          <Text style={{ fontSize: size * 0.15, fontWeight: "700", color, fontFamily: "Inter_700Bold", textAlign: "center" }}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const {
    lastListened, goal, setGoal, memorizationGoal, setMemorizationGoal,
    todayEntry, dailyEntries, onlineUsers, recentProgress, savedSurahs,
    getWeekGoalAyahs, recordAyahRead, isSurahChecked, markAyahsMemorized,
    memorizedAyahKeys,
  } = useQuran();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalSetupVisible, setGoalSetupVisible] = useState(false);
  const [editDailyGoalVisible, setEditDailyGoalVisible] = useState(false);
  const [showMemorizationToast, setShowMemorizationToast] = useState(false);
  const [showWeeklyToast, setShowWeeklyToast] = useState(false);
  const prevMemPercentRef = useRef<number | null>(null);
  const prevWeekPercentRef = useRef<number | null>(null);

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

  const weekGoalAyahs = useMemo(() => goal ? getWeekGoalAyahs() : [], [goal, getWeekGoalAyahs]);
  const effectiveGoalCount = weekGoalAyahs.length;
  const weekGoalProgress = useMemo(() => {
    if (!goal) return 0;
    const memorized = new Set(memorizedAyahKeys);
    return weekGoalAyahs.filter(a => memorized.has(`${a.surahNumber}:${a.ayahNumber}`)).length;
  }, [goal, weekGoalAyahs, memorizedAyahKeys]);

  const juzGroups = useMemo(() => {
    if (surahs.length === 0) return [];
    const groups: { juz: number; surahs: ApiSurah[] }[] = [];
    let currentJuz = 0;
    for (const surah of surahs) {
      const meta = SURAH_DATA[surah.number - 1];
      if (!meta) continue;
      if (meta.juz !== currentJuz) {
        currentJuz = meta.juz;
        groups.push({ juz: currentJuz, surahs: [] });
      }
      groups[groups.length - 1].surahs.push(surah);
    }
    return groups;
  }, [surahs]);

  const totalMemorized = useMemo(() => {
    if (!memorizationGoal) return 0;
    const targetJuzAyahKeys = memorizationGoal.path === "juz" && memorizationGoal.targetJuz
      ? new Set(getJuzAyahs(memorizationGoal.targetJuz).map(a => `${a.surahNumber}:${a.ayahNumber}`))
      : null;
    return memorizedAyahKeys.filter((key) => {
      const [surahRaw, ayahRaw] = key.split(":");
      const surahNumber = Number(surahRaw);
      const ayahNumber = Number(ayahRaw);
      if (!Number.isFinite(surahNumber) || !Number.isFinite(ayahNumber)) return false;
      if (memorizationGoal.path === "surah") {
        return surahNumber === memorizationGoal.startSurahNumber;
      }
      return !!targetJuzAyahKeys?.has(key);
    }).length;
  }, [memorizedAyahKeys, memorizationGoal]);

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dailyEntries.find(e => e.date === dateStr);
      if (entry && entry.ayahsRead > 0) streak++;
      else break;
    }
    return streak;
  }, [dailyEntries]);

  const remainingAyahGroups = useMemo(() => {
    if (!goal) return [];
    const memorized = new Set(memorizedAyahKeys);
    const remaining = weekGoalAyahs.filter(a => !memorized.has(`${a.surahNumber}:${a.ayahNumber}`));
    const groups: { surahNumber: number; surahName: string; count: number; ayahs: typeof weekGoalAyahs }[] = [];
    for (const a of remaining) {
      const last = groups[groups.length - 1];
      if (last?.surahNumber === a.surahNumber) { last.count++; last.ayahs.push(a); }
      else groups.push({ surahNumber: a.surahNumber, surahName: a.surahName, count: 1, ayahs: [a] });
    }
    return groups;
  }, [goal, weekGoalAyahs, memorizedAyahKeys]);

  const targetJuz = memorizationGoal?.path === "juz"
    ? (memorizationGoal.targetJuz ?? 1)
    : 1;
  const targetSurah = memorizationGoal?.path === "surah"
    ? (memorizationGoal?.startSurahNumber ? SURAH_DATA.find(s => s.number === memorizationGoal?.startSurahNumber) : undefined)
    : undefined;

  const savedSurahsMeta = useMemo(() => {
    return savedSurahs.map(n => SURAH_DATA[n - 1]).filter(Boolean);
  }, [savedSurahs]);

  const targetTotal = memorizationGoal?.path === "juz" ? getJuzAyahs(targetJuz).length : (targetSurah ? targetSurah.ayahCount : TOTAL_AYAHS);
  const memorizationPercent = Math.min(100, Math.round((totalMemorized / targetTotal) * 100));
  // Use effectiveGoalCount (actual available ayahs) to avoid 41/44 type lock
  const weekPercent = goal
    ? (effectiveGoalCount > 0 ? Math.min(100, Math.round((weekGoalProgress / effectiveGoalCount) * 100)) : 100)
    : 0;

  const editableGoalSurahNumber = (goal?.startSurahNumber ?? memorizationGoal?.startSurahNumber) ?? 1;
  const editableGoalSurah = SURAH_DATA.find(s => s.number === editableGoalSurahNumber) ?? SURAH_DATA[0];

  useEffect(() => {
    const prev = prevMemPercentRef.current;
    prevMemPercentRef.current = memorizationPercent;
    if (prev !== null && prev < 100 && memorizationPercent >= 100) {
      setShowMemorizationToast(true);
      const t = setTimeout(() => setShowMemorizationToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [memorizationPercent]);

  useEffect(() => {
    const prev = prevWeekPercentRef.current;
    prevWeekPercentRef.current = weekPercent;
    if (prev !== null && prev < 100 && weekPercent >= 100 && goal) {
      setShowWeeklyToast(true);
      const t = setTimeout(() => setShowWeeklyToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [weekPercent]);

  const topPad = insets.top;
  const hasMemorizationGoal = memorizationGoal !== null;
  const isFirstListen = lastListened === null;

  const audioProgressPct = useMemo(() => {
    if (!lastListened) return 0;
    const meta = SURAH_DATA[lastListened.surahNumber - 1];
    if (!meta) return 0;
    return Math.round((lastListened.ayahNumberInSurah / meta.ayahCount) * 100);
  }, [lastListened]);

  return (
    <>
      <StatusBar barStyle="dark-content" />
       <LinearGradient
         colors={[colors.appLightBg, colors.appWhite]}
         locations={[0, 1]}
         style={s.container}
       >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingTop: topPad + 12 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
               tintColor={colors.appBorderLight}
            />
          }
        >
          {/* ── Header Row ──────────────────────────────────────────────── */}
          <View style={s.headerRow}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>{onlineUsers.toLocaleString()} memorizing</Text>
            </View>
            {/* FIX #2: gear icon wrapped in white rounded container */}
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={s.settingsBtn}
            >
               <Feather name="settings" size={18} color={colors.appLightText} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* ── Continue / Start Listening Card ─────────────────────────── */}
          <TouchableOpacity
            style={s.audioCard}
            onPress={() => router.push(isFirstListen ? "/surah/1" : `/surah/${lastListened!.surahNumber}?ayah=${lastListened!.ayahNumberInSurah}`)}
            activeOpacity={0.88}
          >
            <View style={s.audioCardLeft}>
              <Text style={s.audioLabel}>{isFirstListen ? "START LISTENING" : "CONTINUE LISTENING"}</Text>
              <Text style={s.audioTitle}>{isFirstListen ? "Al-Faatiha" : lastListened!.surahName}</Text>
              <Text style={s.audioSub}>
                {isFirstListen ? "Ayah 1" : `Ayah ${lastListened!.ayahNumberInSurah}`}
                {" "}• Reciter: Al-Afasy
              </Text>
              <View style={s.audioProgressRail}>
                <View style={[s.audioProgressFill, { width: `${audioProgressPct}%` as any }]} />
              </View>
            </View>
            <View style={s.playBtn}>
              <Ionicons name="play" size={22} color={colors.appBlack} />
            </View>
          </TouchableOpacity>

          {/* ── Goal Widgets ─────────────────────────────────────────────── */}
          {hasMemorizationGoal ? (
            <>
              {memorizationPercent >= 100 ? (
                <View style={s.ctaCardShadow}>
                  <View style={s.ctaCardClip}>
                    {showMemorizationToast ? (
                      <View style={s.memCompleteGreen}>
                        <View style={s.memCompleteCheckCircle}>
                           <Feather name="check" size={18} color={colors.appSuccess} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.memCompleteGreenText}>
                            {"You've memorized the "}
                            <Text style={s.memCompleteGreenBold}>
                              {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah ? targetSurah.englishName : "—")}!
                            </Text>
                          </Text>
                          <Text style={s.memCompleteGreenSub}>BarakAllahu Feek.</Text>
                        </View>
                      </View>
                    ) : (
                      /* FIX #3: steps now rendered in horizontal row */
                      <View style={s.memCompleteSteps}>
                        <View style={s.memCompleteStep}>
                          <View style={s.stepNumCircle}><Text style={s.stepNumText}>1</Text></View>
                          <Text style={s.stepStepText}>Select a Memorization</Text>
                        </View>
                        <View style={s.stepDivider} />
                        <View style={s.memCompleteStep}>
                          <View style={s.stepNumCircle}><Text style={s.stepNumText}>2</Text></View>
                          <Text style={s.stepStepText}>Select a Weekly Goal</Text>
                        </View>
                      </View>
                    )}
                    {/* FIX #1: warm cream button, dark text */}
                    <TouchableOpacity style={s.attachedCta} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.85}>
                       <Text style={s.attachedCtaText}>Set New Goal</Text>
                       <Feather name="plus" size={20} color={colors.appBlack} />
                     </TouchableOpacity>
                  </View>
                </View>
              ) : (goal === null || weekPercent >= 100) ? (
                <View style={s.ctaCardShadow}>
                  <View style={s.ctaCardClip}>
                    {weekPercent >= 100 && showWeeklyToast ? (
                      <View style={s.topBanner}>
                         <Feather name="check-circle" size={16} color={colors.appWhite} />
                        <Text style={s.bannerText}>MashaAllah! You've reached your weekly goal.</Text>
                      </View>
                    ) : null}
                    <View style={s.widgetCardContent}>
                      {!(weekPercent >= 100 && showWeeklyToast) && (
                        <View style={s.widgetCardHeader}>
                          <View style={s.headerPill}>
                            <Text style={s.headerPillText}>MEMORIZATION TARGET</Text>
                          </View>
                          <View style={s.modeBadge}>
                            <Text style={s.modeBadgeText}>
                              {memorizationGoal!.path === "juz" ? "JUZ MODE" : "SURAH MODE"}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={s.widgetCardBody}>
                         <CircularRing percent={memorizationPercent} size={64} strokeWidth={5} color={colors.appGold} trackColor={colors.appLighterBg} />
                        <View style={s.widgetCardInfo}>
                          <Text style={s.widgetCardTitle}>
                            {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah ? targetSurah.englishName : "—")}
                          </Text>
                          <Text style={s.widgetCardSub}>{totalMemorized} Ayahs Memorized</Text>
                        </View>
                        <TouchableOpacity style={s.editBoxBtn} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.7}>
                          <Text style={s.editBoxText}>Edit</Text>
                          <Feather name="edit-2" size={11} color={colors.appBlack} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* FIX #1: warm cream button */}
                    <TouchableOpacity style={s.attachedCta} onPress={() => setEditDailyGoalVisible(true)} activeOpacity={0.85}>
                      <Text style={s.attachedCtaText}>Set Weekly Goal</Text>
                       <Feather name="plus" size={20} color={colors.appBlack} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {/* Memorization Target Card */}
                  <View style={s.widgetCard}>
                    <View style={s.widgetCardHeader}>
                      <View style={s.headerPill}>
                        <Text style={s.headerPillText}>MEMORIZATION TARGET</Text>
                      </View>
                      <View style={s.modeBadge}>
                        <Text style={s.modeBadgeText}>
                          {memorizationGoal!.path === "juz" ? "JUZ MODE" : "SURAH MODE"}
                        </Text>
                      </View>
                    </View>
                    <View style={s.widgetCardBody}>
                       <CircularRing percent={memorizationPercent} size={64} strokeWidth={5} color={colors.appGold} trackColor={colors.appLighterBg} />
                      <View style={s.widgetCardInfo}>
                        <Text style={s.widgetCardTitle}>
                          {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah ? targetSurah.englishName : "—")}
                        </Text>
                        <Text style={s.widgetCardSub}>{totalMemorized} Ayahs Memorized</Text>
                      </View>
                       <TouchableOpacity style={s.editBoxBtn} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.7}>
                         <Text style={s.editBoxText}>Edit</Text>
                         <Feather name="edit-2" size={11} color={colors.appBlack} />
                       </TouchableOpacity>
                    </View>
                  </View>

                  {/* Weekly Target Card */}
                  <View style={s.widgetCard}>
                    <View style={s.dailyCardHeader}>
                      <View style={s.headerPill}>
                        <Text style={s.headerPillText}>WEEKLY TARGET</Text>
                      </View>
                      <View style={[
                        s.dailyCompleteCircle,
                        weekPercent >= 100 && s.dailyCompleteCircleFilled,
                      ]} />
                    </View>
                    <View style={s.widgetCardBody}>
                       <CircularRing percent={weekPercent} size={64} strokeWidth={5} color={colors.appGold} trackColor={colors.appLighterBg} />
                      <View style={s.widgetCardInfo}>
                        <Text style={s.dailyProgressText}>
                          {weekGoalProgress}/{effectiveGoalCount} Ayahs Memorized
                        </Text>
                      </View>
                      <TouchableOpacity style={s.editBoxBtn} onPress={() => setEditDailyGoalVisible(true)} activeOpacity={0.7}>
                        <Text style={s.editBoxText}>Edit</Text>
                         <Feather name="edit-2" size={11} color={colors.appBlack} />
                      </TouchableOpacity>
                    </View>

                    {Array.from({ length: Math.ceil(effectiveGoalCount / 15) }).map((_, rowIdx) => (
                      <View key={rowIdx} style={s.dotRow}>
                        {Array.from({ length: 15 }).map((_, colIdx) => {
                          const i = rowIdx * 15 + colIdx;
                          if (i >= effectiveGoalCount) return null;
                          return <View key={i} style={[s.dotGridItem, i < weekGoalProgress && s.dotGridItemFilled]} />;
                        })}
                      </View>
                    ))}

                    {remainingAyahGroups.slice(0, 2).map((g) => (
                      <View key={g.surahNumber} style={s.remainingRow}>
                        <TouchableOpacity
                          onPress={() => markAyahsMemorized(g.ayahs.map(a => `${a.surahNumber}:${a.ayahNumber}`))}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <View style={s.remainingCircle} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.remainingTextArea}
                          onPress={() => router.push(`/surah/${g.surahNumber}`)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.remainingName}>{g.surahName}</Text>
                          <Text style={s.remainingCount}>{g.count} Ayah remaining</Text>
                           <Feather name="chevron-right" size={14} color={colors.appLightText} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={s.dailyCardFooter}>
                      <View style={s.remainingLabelRow}>
                        <Text style={s.remainingLabel}>THIS WEEK'S REMAINING</Text>
                        <Text style={s.remainingShowing}>
                          showing {Math.min(2, remainingAyahGroups.length)}/{remainingAyahGroups.length}
                        </Text>
                      </View>
                      <View style={s.streakRow}>
                         <Feather name="zap" size={13} color={colors.appGold} />
                        <Text style={s.streakText}>{streakDays} Day Streak</Text>
                        <View style={s.detailsBtn}>
                          <Text style={s.detailsLink}>DETAILS</Text>
                           <Feather name="chevron-right" size={11} color={colors.appLightText} />
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={s.ctaCardShadow}>
              <View style={s.ctaCardClip}>
                <View style={s.memCompleteSteps}>
                  <View style={s.memCompleteStep}>
                    <View style={s.stepNumCircle}><Text style={s.stepNumText}>1</Text></View>
                    <Text style={s.stepStepText}>Select a Memorization</Text>
                  </View>
                  <View style={s.stepDivider} />
                  <View style={s.memCompleteStep}>
                    <View style={s.stepNumCircle}><Text style={s.stepNumText}>2</Text></View>
                    <Text style={s.stepStepText}>Select a Weekly Goal</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.attachedCta} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.85}>
                  <Text style={s.attachedCtaText}>Set New Goal</Text>
                   <Feather name="plus" size={20} color={colors.appBlack} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Test Yourself CTA ─────────────────────────────────────────── */}
          {/* FIX #5: warm cream, not yellow */}
          <TouchableOpacity
            style={s.quizCta}
            onPress={() => router.push("/(tabs)/library")}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.quizCtaTitle}>Test Yourself!</Text>
              <Text style={s.quizCtaSub}>With the Saved Surahs, Ayahs & Words</Text>
            </View>
             <Feather name="chevron-right" size={20} color={colors.appBlack} />
          </TouchableOpacity>

          {/* ── Last Visited ──────────────────────────────────────────────── */}
          {recentProgress.length > 0 && (
            <View style={s.listSection}>
              <View style={s.listSectionHeader}>
                <Text style={s.listSectionTitle}>Last Visited</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={s.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.lvScroll}
              >
                {recentProgress.slice(0, 5).map((p) => {
                  const meta = SURAH_DATA[p.surahNumber - 1];
                  if (!meta) return null;
                  const pct = Math.round((p.ayahNumberInSurah / meta.ayahCount) * 100);
                  return (
                    <TouchableOpacity
                      key={p.surahNumber}
                      style={s.lvCard}
                      onPress={() => router.push(`/surah/${p.surahNumber}?ayah=${p.ayahNumberInSurah}`)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.lvArabic}>{meta.name}</Text>
                      <Text style={s.lvName}>{p.surahName}</Text>
                      <Text style={s.lvAyah}>Ayah {p.ayahNumberInSurah}</Text>
                      <View style={s.lvProgressRail}>
                        <View style={[s.lvProgressFill, { width: `${pct}%` as any }]} />
                      </View>
                      <View style={s.lvFooter}>
                        <Text style={s.lvPct}>{pct}%</Text>
                        <View style={s.lvPlayBtn}>
                           <Ionicons name="play" size={9} color={colors.appWhite} style={{ marginLeft: 1 }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Saved Surahs ──────────────────────────────────────────────── */}
          {savedSurahsMeta.length > 0 && (
            <View style={s.listSection}>
              <View style={s.listSectionHeader}>
                <Text style={s.listSectionTitle}>Saved Surahs</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={s.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={s.savedCard}>
                {savedSurahsMeta.slice(0, 3).map((meta, i) => {
                  const apiSurah = surahs.find(s => s.number === meta.number);
                  return (
                    <TouchableOpacity
                      key={meta.number}
                      style={[s.savedRow, i === savedSurahsMeta.slice(0, 3).length - 1 && s.savedRowLast]}
                      onPress={() => router.push(`/surah/${meta.number}`)}
                      activeOpacity={0.7}
                    >
                      <View style={s.savedNumBubble}>
                        <Text style={s.savedNumText}>{meta.number}</Text>
                      </View>
                      <View style={s.savedInfo}>
                        <Text style={s.savedName}>{meta.englishName}</Text>
                        <Text style={s.savedMeta}>
                          {meta.ayahCount} Ayahs{apiSurah?.revelationType ? ` • ${apiSurah.revelationType}` : ""}
                        </Text>
                      </View>
                      <Text style={s.savedArabic}>{meta.name}</Text>
                       <Ionicons name="bookmark" size={18} color={colors.appBlack} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── All Surahs by Juz ─────────────────────────────────────────── */}
          <View style={s.surahSection}>
            <Text style={s.sectionTitle}>All Surahs by Juz</Text>
            {loading ? (
              <ActivityIndicator color={colors.appLightText} style={{ paddingVertical: 28 }} />
            ) : (
              juzGroups.map(group => (
                <View key={group.juz}>
                  <View style={s.juzHeader}>
                    <Text style={s.juzLabel}>JUZ {group.juz}</Text>
                  </View>
                  {group.surahs.map((surah, i) => {
                    const memorized = isSurahChecked(surah.number);
                    const compactArabicName = SURAH_DATA[surah.number - 1]?.name ?? surah.name;
                    return (
                      <TouchableOpacity
                        key={surah.number}
                        style={[s.surahRow, i === group.surahs.length - 1 && s.surahRowLast]}
                        onPress={() => router.push(`/surah/${surah.number}`)}
                        activeOpacity={0.65}
                      >
                        <View style={s.surahNumBubble}>
                          <Text style={s.surahNum}>{surah.number}</Text>
                        </View>
                        <View style={s.surahInfo}>
                          <Text style={s.surahName}>{surah.englishName}</Text>
                          <Text style={s.surahMeta}>{surah.numberOfAyahs} Ayahs • {surah.revelationType}</Text>
                        </View>
                        {memorized && (
                          <View style={s.memorizedTag}>
                            <Text style={s.memorizedTagText}>MEMORIZED</Text>
                          </View>
                        )}
                        <Text style={s.surahArabic}>{compactArabicName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      <GoalSetupModal
        visible={goalSetupVisible}
        onClose={() => setGoalSetupVisible(false)}
        onComplete={(memGoal, weeklyGoal) => {
          // startAyahNumber comes from step 4 selection — respect it directly
          setMemorizationGoal({ ...memGoal, ayahsReadAtStart: todayEntry?.ayahsRead ?? 0 });
          setGoal({ ...weeklyGoal });
        }}
      />
      <EditDailyGoalModal
        visible={editDailyGoalVisible}
        surahName={editableGoalSurah.englishName}
        surahNumber={editableGoalSurah.number}
        ayahCount={editableGoalSurah.ayahCount}
        targetPath={memorizationGoal?.path ?? "surah"}
        targetJuz={memorizationGoal?.targetJuz}
        currentStartAyah={goal?.startAyahNumber ?? 1}
        currentAyahsPerWeek={goal?.ayahsPerWeek ?? 10}
        memorizedAyahKeys={memorizedAyahKeys}
        onSave={({ startSurahNumber, startAyahNumber, ayahsPerWeek }) => {
          const today = new Date().toISOString().split("T")[0];
          setGoal({
            ayahsPerWeek,
            startDate: goal?.startDate ?? today,
            startSurahNumber,
            startAyahNumber,
          });
        }}
        onClose={() => setEditDailyGoalVisible(false)}
      />
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 120 },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.appLightBg,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.appWarning,
    },
    badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.appWarning },
    badgeText: { fontSize: 10, fontWeight: "700", color: colors.appWarning, fontFamily: "Inter_700Bold" },

    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.appWhite,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
    },

    // ── Audio Card ─────────────────────────────────────────────────────────────
    audioCard: {
      marginHorizontal: 16,
      backgroundColor: colors.appLighterBg,
      borderRadius: 10,
      paddingTop: 28,
      paddingBottom: 20,
      paddingHorizontal: 24,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    audioCardLeft: { flex: 1, marginRight: 14 },
    audioLabel: {
      fontSize: 10,
      letterSpacing: 1.2,
      color: colors.appDarkGray,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    audioTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      marginBottom: 2,
    },
    audioSub: {
      fontSize: 12,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      marginBottom: 14,
    },
    audioProgressRail: {
      height: 8,
      backgroundColor: colors.appLightGray,
      borderRadius: 4,
      overflow: "hidden",
    },
    audioProgressFill: {
      height: "100%" as any,
      backgroundColor: colors.appBlack,
      borderRadius: 4,
    },
    playBtn: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Goal Widget Cards ───────────────────────────────────────────────────────
    widgetCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.appWhite,
      borderRadius: 10,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    ctaCardShadow: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 10,
      backgroundColor: colors.appLighterBg,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 20,
      elevation: 1,
    },
    ctaCardClip: {
      borderRadius: 10,
      overflow: "hidden",
      elevation: 1,
    },
    widgetCardContent: { padding: 16 },

    attachedCta: {
      backgroundColor: colors.appLightBg,
      paddingVertical: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    attachedCtaText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.appDarkerGray,
      fontFamily: "Inter_600SemiBold",
    },
    topBanner: {
      backgroundColor: colors.appSuccess,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    bannerText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.appWhite,
      fontFamily: "Inter_600SemiBold",
    },
    memCompleteGreen: {
      backgroundColor: colors.appSuccess,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 14,
    },
    memCompleteCheckCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.appWhite,
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    memCompleteGreenText: { fontSize: 15, color: colors.appWhite, fontFamily: "Inter_400Regular", lineHeight: 22 },
    memCompleteGreenBold: { fontFamily: "Inter_700Bold", color: colors.appWhite },
    memCompleteGreenSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
    memCompleteSteps: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 0,
    },
    memCompleteStep: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepDivider: {
      width: 0.5,
      height: 32,
      backgroundColor: colors.appLightBg,
      marginHorizontal: 14,
    },
    stepNumCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.appLightBg,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    stepNumText: { fontSize: 16, fontWeight: "400", color: colors.appBlack, fontFamily: "Inter_400Regular" },
    stepStepText: {
      flex: 1,
      color: colors.appDarkerGray,
      fontFamily: "Inter_600SemiBold",
      lineHeight: 17,
    },
    widgetCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerPill: {
      backgroundColor: colors.appLightGray,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    headerPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      letterSpacing: 0.8,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
    },
    modeBadge: {
      backgroundColor: colors.appBlack,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    modeBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appGold,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },

    widgetCardBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    widgetCardInfo: { flex: 1 },
    widgetCardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      marginBottom: 3,
      letterSpacing: -0.2,
    },
    widgetCardSub: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    editBoxBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.appBorderLighter,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    editBoxText: { fontSize: 13, fontWeight: "600", color: colors.appBlack, fontFamily: "Inter_600SemiBold" },

    dailyCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    dailyCompleteCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.appBorderLighter,
    },
    dailyCompleteCircleFilled: {
      borderColor: colors.appSuccess,
      backgroundColor: colors.appSuccess,
    },
    dailyProgressText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    dotRow: {
      flexDirection: "row",
      gap: 5,
      marginTop: 6,
    },
    dotGridItem: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.appBorderLighter,
    },
    dotGridItemFilled: { backgroundColor: colors.appBlack },
    remainingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.appBorderLighter,
      marginTop: 10,
      gap: 10,
    },
    remainingCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.appBorderLighter,
    },
    remainingTextArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    remainingName: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.appBlack, fontFamily: "Inter_600SemiBold" },
    remainingCount: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular" },

    dailyCardFooter: { marginTop: 10, gap: 8 },
    remainingLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    remainingLabel: {
      fontSize: 10, fontWeight: "700", color: colors.appBorderLight,
      letterSpacing: 1, fontFamily: "Inter_700Bold", textTransform: "uppercase",
    },
    remainingShowing: { fontSize: 10, fontWeight: "700", color: colors.appLightText, fontFamily: "Inter_700Bold" },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    streakText: { fontSize: 13, fontWeight: "600", color: colors.appGold, fontFamily: "Inter_600SemiBold" },
    detailsBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" as any },
    detailsLink: { fontSize: 11, fontWeight: "700", color: colors.appLightText, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
    // ── Idle / No Goal ─────────────────────────────────────────────────────────
    greetingSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    greeting: {
      fontSize: 22,
      color: colors.appBlack,
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontStyle: "italic",
      marginBottom: 24,
    },
    goalTitle: { fontSize: 20, fontWeight: "700", color: colors.appBlack, fontFamily: "Inter_700Bold", marginBottom: 6 },
    goalSub: { fontSize: 14, color: colors.appLightText, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 20 },
    goalBtn: {
      backgroundColor: colors.appBlack,
      borderRadius: 14,
      paddingVertical: 17,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    goalBtnText: { fontSize: 16, fontWeight: "700", color: colors.appWhite, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
    // ── Quiz CTA Banner ────────────────────────────────────────────────────────
    quizCta: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.appLightBg,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    quizCtaTitle: { fontSize: 16, fontWeight: "700", color: colors.appBlack, fontFamily: "Inter_700Bold" },
    quizCtaSub: { fontSize: 10, color: colors.appBlack, fontFamily: "Inter_400Regular", marginTop: 2 },
    // ── List Sections (Last Visited / Saved Surahs) ────────────────────────────
    listSection: { marginTop: 28, paddingHorizontal: 16 },
    listSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    listSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.3,
    },
    viewAllText: { fontSize: 13, color: colors.appLightText, fontFamily: "Inter_400Regular" },
    lvScroll: { gap: 10, paddingRight: 16, paddingLeft: 2 },
    lvCard: {
      width: 136,
      backgroundColor: colors.appWhite,
      borderRadius: 16,
      padding: 14,
      borderWidth: 0.5,
      borderColor: colors.appBorderLighter,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 1,
    },
    lvArabic: {
      fontSize: 26,
      color: colors.appBlack,
      textAlign: "center",
      marginBottom: 6,
      lineHeight: 38,
    },
    lvName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    lvAyah: {
      fontSize: 11,
      color: colors.appLightText,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 2,
      marginBottom: 10,
    },
    lvProgressRail: {
      height: 2,
      backgroundColor: colors.appBorderLighter,
      borderRadius: 1,
      overflow: "hidden",
      marginBottom: 8,
    },
    lvProgressFill: { height: "100%" as any, backgroundColor: colors.appBlack, borderRadius: 1 },
    lvFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    lvPct: { fontSize: 11, fontWeight: "600", color: colors.appBlack, fontFamily: "Inter_600SemiBold" },
    lvPlayBtn: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: colors.appBlack, alignItems: "center", justifyContent: "center",
    },

    // ── Saved Surahs ───────────────────────────────────────────────────────────
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
    },
    savedRowLast: { borderBottomWidth: 0 },
    savedNumBubble: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.appLightGray,
      alignItems: "center", justifyContent: "center",
    },
    savedNumText: { fontSize: 13, fontWeight: "700", color: colors.appBlack, fontFamily: "Inter_700Bold" },
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

    // ── All Surahs by Juz ──────────────────────────────────────────────────────
    surahSection: { marginTop: 28 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.appBlack,
      fontFamily: "Inter_700Bold",
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    juzHeader: {
      backgroundColor: colors.appLightBg,
      paddingHorizontal: 20,
      paddingVertical: 6,
    },
    juzLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appLightText,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      fontFamily: "Inter_700Bold",
    },
    surahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.appBorderLighter,
      gap: 16,
    },
    surahRowLast: { borderBottomWidth: 0 },
    surahNumBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    surahNum: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.appBlack,
      fontFamily: "Inter_600SemiBold",
    },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 14, fontWeight: "700", color: colors.appBlack, fontFamily: "Inter_700Bold" },
    surahMeta: { fontSize: 12, color: colors.appLightText, fontFamily: "Inter_400Regular", marginTop: 2 },
    surahArabic: {
      fontSize: 18,
      color: colors.appBlack,
    },

    memorizedTag: {
      backgroundColor: colors.appSuccess,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginRight: 6,
    },
    memorizedTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.3,
    },
  });
