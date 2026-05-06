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
import { useQuran, getAyahAtLinearIndex } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";
import { GoalSetupModal } from "@/components/GoalSetupModal";
import { EditDailyGoalModal } from "@/components/EditDailyGoalModal";

const TOTAL_AYAHS = 6236;
const MAX_DAILY = 45;
const AYAHS_PER_JUZ = Math.round(TOTAL_AYAHS / 30);

function CircularRing({
  percent, size = 60, strokeWidth = 5,
  color = "#C9A02A", trackColor = "#F0E6C0", label,
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
    getTodayGoalAyahs, getTodayGoalProgress, recordAyahRead, isSurahChecked,
  } = useQuran();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalSetupVisible, setGoalSetupVisible] = useState(false);
  const [editDailyGoalVisible, setEditDailyGoalVisible] = useState(false);
  const [showMemorizationToast, setShowMemorizationToast] = useState(false);
  const [showDailyToast, setShowDailyToast] = useState(false);
  const prevMemPercentRef = useRef<number | null>(null);
  const prevDailyPercentRef = useRef<number | null>(null);

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

  const todayGoalProgress = goal ? getTodayGoalProgress() : 0;

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
    const raw = dailyEntries
      .filter(e => e.date >= memorizationGoal.startDate)
      .reduce((s, e) => s + e.ayahsRead, 0);
    return Math.max(0, raw - (memorizationGoal.ayahsReadAtStart ?? 0));
  }, [dailyEntries, memorizationGoal]);

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
    const goalAyahs = getTodayGoalAyahs();
    const done = getTodayGoalProgress();
    const remaining = goalAyahs.slice(done);
    const groups: { surahNumber: number; surahName: string; count: number; ayahs: typeof goalAyahs }[] = [];
    for (const a of remaining) {
      const last = groups[groups.length - 1];
      if (last?.surahNumber === a.surahNumber) { last.count++; last.ayahs.push(a); }
      else groups.push({ surahNumber: a.surahNumber, surahName: a.surahName, count: 1, ayahs: [a] });
    }
    return groups;
  }, [goal, getTodayGoalAyahs, getTodayGoalProgress]);

  const targetJuz = memorizationGoal?.path === "juz"
    ? (memorizationGoal?.startSurahNumber ? SURAH_DATA.find(s => s.number === memorizationGoal?.startSurahNumber)?.juz ?? 1 : 1)
    : 1;
  const targetSurah = memorizationGoal?.path === "surah"
    ? (memorizationGoal?.startSurahNumber ? SURAH_DATA.find(s => s.number === memorizationGoal?.startSurahNumber) : undefined)
    : undefined;
  const savedSurahsMeta = useMemo(() => {
    return savedSurahs.map(n => SURAH_DATA[n - 1]).filter(Boolean);
  }, [savedSurahs]);

  const memorizationPercent = Math.min(100, Math.round(
    (totalMemorized / (memorizationGoal?.path === "juz" ? AYAHS_PER_JUZ : (targetSurah ? targetSurah.ayahCount : AYAHS_PER_JUZ))) * 100
  ));
  const dailyPercent = goal ? Math.min(100, Math.round((todayGoalProgress / goal.ayahsPerDay) * 100)) : 0;

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
    const prev = prevDailyPercentRef.current;
    prevDailyPercentRef.current = dailyPercent;
    if (prev !== null && prev < 100 && dailyPercent >= 100) {
      setShowDailyToast(true);
      const t = setTimeout(() => setShowDailyToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [dailyPercent]);

  const topPad = insets.top;
  const hasMemorizationGoal = memorizationGoal !== null;
  const isFirstListen = lastListened === null;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={["#FDFBF7", "#EDE0C4"]} style={s.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingTop: topPad + 8 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#8E8E93"
            />
          }
        >
          {/* Header Row */}
          <View style={s.headerRow}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>{onlineUsers.toLocaleString()} memorizing</Text>
            </View>
            <TouchableOpacity
              style={s.settingsBtn}
              onPress={() => router.push("/settings")}
              activeOpacity={0.7}
            >
              <Feather name="settings" size={18} color="#8E8E93" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Audio Player Card */}
          <TouchableOpacity
            style={s.audioCard}
            onPress={() => router.push(isFirstListen ? "/surah/1" : `/surah/${lastListened!.surahNumber}?ayah=${lastListened!.ayahNumberInSurah}`)}
            activeOpacity={0.92}
          >
            <View style={s.audioCardLeft}>
              <Text style={s.audioLabel}>{isFirstListen ? "START LISTENING" : "CONTINUE LISTENING"}</Text>
              <Text style={s.audioTitle}>{isFirstListen ? "Al-Faatiha" : lastListened!.surahName}</Text>
              <Text style={s.audioSub}>
                {isFirstListen ? "Ayah 1" : `Ayah ${lastListened!.ayahNumberInSurah}`} • Reciter: Al-Afasy
              </Text>
              <View style={s.audioProgressRail}>
                {!isFirstListen && <View style={s.audioProgressFill} />}
              </View>
            </View>
            <View style={s.playBtn}>
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {hasMemorizationGoal ? (
            <>
              {memorizationPercent >= 100 ? (
                /* ── STATE: MEMORIZATION COMPLETE ───────────────────────────── */
                <View style={s.ctaCardShadow}>
                  <View style={s.ctaCardClip}>
                    {showMemorizationToast ? (
                      /* With toast: full green card */
                      <View style={s.memCompleteGreen}>
                        <View style={s.memCompleteCheckCircle}>
                          <Feather name="check" size={18} color="#4CAF50" />
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
                      /* Without toast: step indicator card */
                      <View style={s.memCompleteSteps}>
                        <View style={s.memCompleteStep}>
                          <View style={s.stepNumCircle}><Text style={s.stepNumText}>1</Text></View>
                          <Text style={s.stepStepText}>Select a Memorization</Text>
                        </View>
                        <View style={s.memCompleteStep}>
                          <View style={s.stepNumCircle}><Text style={s.stepNumText}>2</Text></View>
                          <Text style={s.stepStepText}>Select a Daily Goal</Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.attachedCta}
                      onPress={() => setGoalSetupVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.attachedCtaText}>Set New Goal</Text>
                      <Feather name="plus" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (goal === null || dailyPercent >= 100) ? (
                /* ── STATE: NO DAILY GOAL / DAILY GOAL COMPLETE ─────────────── */
                <View style={s.ctaCardShadow}>
                  <View style={s.ctaCardClip}>
                    {dailyPercent >= 100 && showDailyToast ? (
                      <View style={s.topBanner}>
                        <Feather name="check-circle" size={16} color="#FFFFFF" />
                        <Text style={s.bannerText}>MashaAllah! You've reached your daily goal.</Text>
                      </View>
                    ) : null}
                    <View style={s.widgetCardContent}>
                      {!(dailyPercent >= 100 && showDailyToast) && (
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
                        <CircularRing percent={memorizationPercent} size={64} strokeWidth={5} />
                        <View style={s.widgetCardInfo}>
                          <Text style={s.widgetCardTitle}>
                             {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah ? targetSurah.englishName : "—")}
                          </Text>
                          <Text style={s.widgetCardSub}>{totalMemorized} Ayahs Memorized</Text>
                        </View>
                        <TouchableOpacity style={s.editBoxBtn} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.7}>
                          <Text style={s.editBoxText}>Edit</Text>
                          <Feather name="edit-2" size={11} color="#1A1A1A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={s.attachedCta}
                      onPress={() => setEditDailyGoalVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.attachedCtaText}>Set Daily Goal</Text>
                      <Feather name="plus" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* ── STATE: BOTH GOALS IN PROGRESS ──────────────────────────── */
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
                      <CircularRing percent={memorizationPercent} size={64} strokeWidth={5} />
                      <View style={s.widgetCardInfo}>
                        <Text style={s.widgetCardTitle}>
                           {memorizationGoal!.path === "juz" ? `Juz ${targetJuz}` : (targetSurah ? targetSurah.englishName : "—")}
                        </Text>
                        <Text style={s.widgetCardSub}>{totalMemorized} Ayahs Memorized</Text>
                      </View>
                      <TouchableOpacity style={s.editBoxBtn} onPress={() => setGoalSetupVisible(true)} activeOpacity={0.7}>
                        <Text style={s.editBoxText}>Edit</Text>
                        <Feather name="edit-2" size={11} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Daily Target Card */}
                  <View style={s.widgetCard}>
                    <View style={s.dailyCardHeader}>
                      <View style={s.headerPill}>
                        <Text style={s.headerPillText}>DAILY TARGET</Text>
                      </View>
                       <View style={[
                          s.dailyCompleteCircle,
                          dailyPercent >= 100 && s.dailyCompleteCircleFilled,
                        ]} />
                    </View>
                    <View style={s.widgetCardBody}>
                      <CircularRing percent={dailyPercent} size={64} strokeWidth={5} />
                      <View style={s.widgetCardInfo}>
                        <Text style={s.dailyProgressText}>
                          {todayGoalProgress}/{Math.min(MAX_DAILY, goal.ayahsPerDay)} Ayahs Memorized
                        </Text>
                      </View>
                      <TouchableOpacity style={s.editBoxBtn} onPress={() => setEditDailyGoalVisible(true)} activeOpacity={0.7}>
                        <Text style={s.editBoxText}>Edit</Text>
                        <Feather name="edit-2" size={11} color="#1A1A1A" />
                      </TouchableOpacity>
                    </View>

                    {/* Dot grid: one dot per ayah in daily goal, max 15 per row */}
                    {Array.from({ length: Math.ceil(Math.min(MAX_DAILY, goal.ayahsPerDay) / 15) }).map((_, rowIdx) => (
                      <View key={rowIdx} style={s.dotRow}>
                        {Array.from({ length: 15 }).map((_, colIdx) => {
                          const i = rowIdx * 15 + colIdx;
                          if (i >= Math.min(MAX_DAILY, goal.ayahsPerDay)) return null;
                          return <View key={i} style={[s.dotGridItem, i < todayGoalProgress && s.dotGridItemFilled]} />;
                        })}
                      </View>
                    ))}

                    {/* Remaining Ayah Rows */}
                    {remainingAyahGroups.slice(0, 2).map((g) => (
                      <View key={g.surahNumber} style={s.remainingRow}>
                        <TouchableOpacity
                          onPress={() => g.ayahs.forEach(a => recordAyahRead(a.surahNumber, a.ayahNumber))}
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
                          <Feather name="chevron-right" size={14} color="#C0C0C0" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={s.dailyCardFooter}>
                      <View style={s.remainingLabelRow}>
                        <Text style={s.remainingLabel}>TODAY'S REMAINING</Text>
                        <Text style={s.remainingShowing}>
                          showing {Math.min(2, remainingAyahGroups.length)}/{remainingAyahGroups.length}
                        </Text>
                      </View>
                      <View style={s.streakRow}>
                        <Feather name="zap" size={13} color="#C9A02A" />
                        <Text style={s.streakText}>{streakDays} Day Streak</Text>
                        <View style={s.detailsBtn}>
                          <Text style={s.detailsLink}>DETAILS</Text>
                          <Feather name="chevron-right" size={11} color="#8E8E93" />
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            /* ── STATE: NO MEMORIZATION GOAL (idle) ─────────────────────────── */
            <View style={s.greetingSection}>
              <Text style={s.greeting}>As Salamu Alaykum</Text>
              <Text style={s.goalTitle}>Set Your Memorization Goal</Text>
              <Text style={s.goalSub}>
                Start your memorization journey{"\n"}by setting a daily goal.
              </Text>
              <TouchableOpacity style={s.goalBtn} activeOpacity={0.85} onPress={() => setGoalSetupVisible(true)}>
                <Text style={s.goalBtnText}>Set Your Goal</Text>
                <Feather name="chevron-down" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Test Yourself CTA */}
          <TouchableOpacity
            style={s.quizCta}
            onPress={() => router.push("/(tabs)/library")}
            activeOpacity={0.85}
          >
            <View>
              <Text style={s.quizCtaTitle}>Test Yourself!</Text>
              <Text style={s.quizCtaSub}>With the Saved Surahs, Ayahs & Words</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Last Visited */}
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
                          <Ionicons name="play" size={10} color="#FFFFFF" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Saved Surahs */}
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
                      <Ionicons name="bookmark" size={18} color="#1A1A1A" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* All Surahs by Juz */}
          <View style={s.surahSection}>
            <Text style={s.sectionTitle}>All Surahs by Juz</Text>
            {loading ? (
              <ActivityIndicator color="#8E8E93" style={{ paddingVertical: 24 }} />
            ) : (
              juzGroups.map(group => (
                <View key={group.juz}>
                  <View style={s.juzHeader}>
                    <Text style={s.juzLabel}>JUZ {group.juz}</Text>
                  </View>
                  {group.surahs.map((surah, i) => {
                    const memorized = isSurahChecked(surah.number);
                    return (
                      <TouchableOpacity
                        key={surah.number}
                        style={[s.surahRow, i === group.surahs.length - 1 && s.surahRowLast]}
                        onPress={() => router.push(`/surah/${surah.number}`)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.surahNum}>{surah.number}</Text>
                        <View style={s.surahInfo}>
                          <Text style={s.surahName}>{surah.englishName}</Text>
                          <Text style={s.surahMeta}>{surah.numberOfAyahs} Ayahs • {surah.revelationType}</Text>
                        </View>
                        {memorized && (
                          <View style={s.memorizedTag}>
                            <Text style={s.memorizedTagText}>MEMORIZED</Text>
                          </View>
                        )}
                        <Text style={s.surahArabic}>{surah.name}</Text>
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
        onComplete={(memGoal, dailyGoal) => {
          const readKeys = new Set(todayEntry?.readAyahKeys ?? []);
          let startSurahNumber = dailyGoal.startSurahNumber ?? 1;
          let startAyahNumber = dailyGoal.startAyahNumber ?? 1;
          if (readKeys.size > 0) {
            let startPos = 0;
            for (const s of SURAH_DATA) {
              if (s.number === startSurahNumber) { startPos += startAyahNumber - 1; break; }
              startPos += s.ayahCount;
            }
            let skip = 0;
            while (skip < TOTAL_AYAHS) {
              const { surahNumber, ayahNumber } = getAyahAtLinearIndex((startPos + skip) % TOTAL_AYAHS);
              if (!readKeys.has(`${surahNumber}:${ayahNumber}`)) break;
              skip++;
            }
            if (skip > 0) {
              const next = getAyahAtLinearIndex((startPos + skip) % TOTAL_AYAHS);
              startSurahNumber = next.surahNumber;
              startAyahNumber = next.ayahNumber;
            }
          }
          setMemorizationGoal({ ...memGoal, ayahsReadAtStart: todayEntry?.ayahsRead ?? 0 });
          setGoal({ ...dailyGoal, startSurahNumber, startAyahNumber });
        }}
      />
      <EditDailyGoalModal
        visible={editDailyGoalVisible}
        currentAyahsPerDay={goal?.ayahsPerDay ?? 10}
        onSave={(ayahsPerDay) => {
          const today = new Date().toISOString().split("T")[0];
          if (goal !== null && dailyPercent < 100) {
            setGoal({ ...goal, ayahsPerDay });
          } else {
            let startSurahNumber = (goal?.startSurahNumber ?? memorizationGoal?.startSurahNumber) ?? 1;
            let startAyahNumber = goal?.startAyahNumber ?? 1;
            const readKeys = new Set(todayEntry?.readAyahKeys ?? []);
            if (readKeys.size > 0) {
              let startPos = 0;
              for (const s of SURAH_DATA) {
                if (s.number === startSurahNumber) { startPos += startAyahNumber - 1; break; }
                startPos += s.ayahCount;
              }
              let skip = 0;
              while (skip < TOTAL_AYAHS) {
                const { surahNumber, ayahNumber } = getAyahAtLinearIndex((startPos + skip) % TOTAL_AYAHS);
                if (!readKeys.has(`${surahNumber}:${ayahNumber}`)) break;
                skip++;
              }
              if (skip > 0) {
                const next = getAyahAtLinearIndex((startPos + skip) % TOTAL_AYAHS);
                startSurahNumber = next.surahNumber;
                startAyahNumber = next.ayahNumber;
              }
            }
            setGoal({ ayahsPerDay, startDate: today, startSurahNumber, startAyahNumber });
          }
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
      backgroundColor: "#F9E79F",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C9A02A" },
    badgeText: { fontSize: 12, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    settingsBtn: {
      width: 40, height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E0E0E0",
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },

    audioCard: {
      marginHorizontal: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    audioCardLeft: { flex: 1, marginRight: 12 },
    audioLabel: {
      fontSize: 9,
      letterSpacing: 1.5,
      color: "#8E8E93",
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    audioTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 2 },
    audioSub: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular", marginBottom: 12 },
    audioProgressRail: { height: 2, backgroundColor: "#F2F2F7", borderRadius: 1, overflow: "hidden" },
    audioProgressFill: { height: "100%" as any, width: "0%", backgroundColor: "#1A1A1A", borderRadius: 1 },
    playBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
    },

    // ── Goal Widgets ─────────────────────────────────────────────────────────
    widgetCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    // Cards with attached CTA need a shadow wrapper + overflow:hidden clip
    ctaCardShadow: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    ctaCardClip: {
      borderRadius: 16,
      overflow: "hidden",
      elevation: 2,
    },
    widgetCardContent: { padding: 16 },
    attachedCta: {
      backgroundColor: "#1A1A1A",
      paddingVertical: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    attachedCtaText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    topBanner: {
      backgroundColor: "#4CAF50",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    inlineBanner: {
      backgroundColor: "#4CAF50",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      marginHorizontal: -16,
      marginTop: 12,
    },
    bannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
    },
    memCompleteGreen: {
      backgroundColor: "#4CAF50",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 14,
    },
    memCompleteCheckCircle: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: "#FFFFFF",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    memCompleteGreenText: {
      fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_400Regular", lineHeight: 22,
    },
    memCompleteGreenBold: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    memCompleteGreenSub: {
      fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2,
    },
    memCompleteSteps: {
      paddingHorizontal: 20, paddingVertical: 20, gap: 14,
    },
    memCompleteStep: {
      flexDirection: "row", alignItems: "center", gap: 14,
    },
    stepNumCircle: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: "#C9A02A",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    stepNumText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    stepStepText: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    widgetCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    headerPill: {
      backgroundColor: "#F2F2F7",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    headerPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#8E8E93",
      letterSpacing: 1,
      fontFamily: "Inter_700Bold",
      textTransform: "uppercase",
    },
    modeBadge: {
      backgroundColor: "#1A1A1A",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    modeBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#C9A02A",
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.5,
    },
    widgetCardBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    widgetCardInfo: { flex: 1 },
    widgetCardTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 3 },
    widgetCardSub: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular" },
    editBoxBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderColor: "#E0E0E0",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    editBoxText: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },

    dailyCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    dailyCompleteCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#DADADA",
    },
    dailyCompleteCircleFilled: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#4CAF50",
      backgroundColor: "#4CAF50",
    },
    dailyProgressText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#1A1A1A",
      fontFamily: "Inter_600SemiBold",
    },

    dotRow: {
      flexDirection: "row",
      gap: 5,
      marginTop: 5,
    },
    dotGridItem: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: "#E8E8ED",
    },
    dotGridItemFilled: { backgroundColor: "#1A1A1A" },

    remainingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#F0F0F0",
      marginTop: 8,
      gap: 8,
    },
    remainingCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "#C0C0C0",
    },
    remainingTextArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    remainingName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    remainingCount: { fontSize: 12, color: "#8E8E93", fontFamily: "Inter_400Regular" },

    dailyCardFooter: { marginTop: 10, gap: 8 },
    remainingLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    remainingLabel: { fontSize: 10, fontWeight: "700", color: "#C0C0C0", letterSpacing: 1, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
    remainingShowing: { fontSize: 10, fontWeight: "700", color: "#8E8E93", fontFamily: "Inter_700Bold" },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    streakText: { fontSize: 13, fontWeight: "600", color: "#C9A02A", fontFamily: "Inter_600SemiBold" },
    detailsBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" as any },
    detailsLink: { fontSize: 11, fontWeight: "700", color: "#8E8E93", letterSpacing: 0.8, fontFamily: "Inter_700Bold" },

    // ── Idle State ────────────────────────────────────────────────────────────
    greetingSection: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
    greeting: {
      fontSize: 22,
      color: "#1A1A1A",
      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
      fontStyle: "italic",
      marginBottom: 24,
    },
    goalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", marginBottom: 6 },
    goalSub: { fontSize: 14, color: "#8E8E93", fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 20 },
    goalBtn: {
      backgroundColor: "#1A1A1A",
      borderRadius: 12,
      paddingVertical: 17,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    goalBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

    // ── Quiz CTA ──────────────────────────────────────────────────────────────
    quizCta: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: "#F9E79F",
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    quizCtaTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    quizCtaSub: { fontSize: 12, color: "#5A5A5A", fontFamily: "Inter_400Regular", marginTop: 2 },

    // ── List Sections (Last Visited, Saved Surahs) ────────────────────────────
    listSection: { marginTop: 24, paddingHorizontal: 16 },
    listSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    listSectionTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    viewAllText: { fontSize: 13, color: "#8E8E93", fontFamily: "Inter_400Regular" },

    lvScroll: { gap: 10, paddingRight: 16 },
    lvCard: {
      width: 130,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    lvArabic: { fontSize: 22, color: "#1A1A1A", textAlign: "center", marginBottom: 6 },
    lvName: { fontSize: 12, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold", textAlign: "center" },
    lvAyah: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2, marginBottom: 10 },
    lvProgressRail: { height: 2, backgroundColor: "#F2F2F7", borderRadius: 1, overflow: "hidden", marginBottom: 8 },
    lvProgressFill: { height: "100%" as any, backgroundColor: "#1A1A1A", borderRadius: 1 },
    lvFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    lvPct: { fontSize: 11, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    lvPlayBtn: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
    },

    savedCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    savedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#F0F0F0",
      gap: 12,
    },
    savedRowLast: { borderBottomWidth: 0 },
    savedNumBubble: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center",
    },
    savedNumText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    savedInfo: { flex: 1 },
    savedName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    savedArabic: { fontSize: 17, color: "#1A1A1A" },
    savedMeta: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular" },

    // ── All Surahs by Juz ─────────────────────────────────────────────────────
    surahSection: { marginTop: 24 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", paddingHorizontal: 20, paddingBottom: 10 },
    juzHeader: { backgroundColor: "#F2F2F7", paddingHorizontal: 20, paddingVertical: 7 },
    juzLabel: { fontSize: 11, fontWeight: "700", color: "#8E8E93", letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
    surahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#E8E8ED",
      backgroundColor: "#FFFFFF",
    },
    surahRowLast: { borderBottomWidth: 0 },
    surahNum: { width: 30, fontSize: 13, fontWeight: "600", color: "#8E8E93", fontFamily: "Inter_600SemiBold" },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    surahMeta: { fontSize: 11, color: "#8E8E93", fontFamily: "Inter_400Regular", marginTop: 2 },
    surahArabic: { fontSize: 19, color: "#1A1A1A", fontFamily: Platform.OS === "ios" ? "System" : undefined },

    memorizedTag: {
      backgroundColor: "#16A34A",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginRight: 4,
    },
    memorizedTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
      letterSpacing: 0.3,
    },
  });
