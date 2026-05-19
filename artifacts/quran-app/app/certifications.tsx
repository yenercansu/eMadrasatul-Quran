import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/BackButton";
import { InlineNotice } from "@/components/InlineNotice";
import { CertListItem } from "@/components/cert/CertListItem";
import { HifzSegmentedControl } from "@/components/hifz/HifzUI";
import colors from "@/constants/colors";
import type { DailyEntry } from "@/contexts/QuranContext";

const TOTAL_AYAHS = 6236;
const sp = colors.spacing;
const ty = colors.typography;
const br = colors.borders;

const CERT_TOGGLE_OPTIONS = [
  { value: "surah" as const, label: "By Surah" },
  { value: "juz" as const, label: "By Juz" },
] as const;

function getLevel(percent: number) {
  if (percent >= 100) return { name: "Hafiz", next: "Complete", desc: "Full Quran memorization completed." };
  if (percent >= 75) return { name: "Near Hafiz", next: "Hafiz", desc: "You are in the final stretch of the journey." };
  if (percent >= 50) return { name: "Advanced", next: "Near Hafiz", desc: "More than half of the Quran is memorized." };
  if (percent >= 25) return { name: "Dedicated", next: "Advanced", desc: "Your memorization habit is becoming strong." };
  if (percent >= 10) return { name: "Student", next: "Dedicated", desc: "You have built a real foundation." };
  return { name: "Beginner", next: "Student", desc: "Start steady and keep each ayah intentional." };
}

function computeCurrentStreak(entries: DailyEntry[]): number {
  const activeDays = new Set(
    entries.filter(e => e.ayahsRead > 0 || !!e.milestoneCompleted).map(e => e.date),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const startOffset = activeDays.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activeDays.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function LearningArc({ percent, c }: { percent: number; c: ReturnType<typeof useColors> }) {
  const size = 44;
  const cx = size / 2;
  const cy = size / 2;
  const r = 17;
  const sw = 3.5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={c.hifzWarmBand} strokeWidth={sw} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke={c.accentSoft}
        strokeWidth={sw}
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90, ${cx}, ${cy})`}
      />
    </Svg>
  );
}

export default function CertificationsScreen() {
  const insets = useSafeAreaInsets();
  const { memorizedAyahKeys, dailyEntries, certificates, memorizationGoal } = useQuran();
  const c = useColors();

  const [certView, setCertView] = useState<"surah" | "juz">("surah");

  const stats = useMemo(() => {
    const memorized = new Set(memorizedAyahKeys);
    const surahs = SURAH_DATA.map(surah => {
      let count = 0;
      for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
        if (memorized.has(`${surah.number}:${ayah}`)) count++;
      }
      return { ...surah, memorized: count };
    });
    const totalMemorized = surahs.reduce((sum, s) => sum + s.memorized, 0);
    const percent = Math.round((totalMemorized / TOTAL_AYAHS) * 100);
    return {
      totalMemorized,
      percent,
      completed: surahs.filter(s => s.memorized === s.ayahCount && s.ayahCount > 0),
    };
  }, [memorizedAyahKeys]);

  const currentStreak = useMemo(() => computeCurrentStreak(dailyEntries), [dailyEntries]);

  const totalSessions = useMemo(
    () => dailyEntries.filter(e => e.ayahsRead > 0 || !!e.milestoneCompleted).length,
    [dailyEntries],
  );

  const level = getLevel(stats.percent);

  const rhythmSegmentsFilled = useMemo(() => {
    if (stats.percent >= 75) return 4;
    if (stats.percent >= 50) return 3;
    if (stats.percent >= 25) return 2;
    return 1;
  }, [stats.percent]);

  const learningInfo = useMemo(() => {
    if (!memorizationGoal) return null;
    const surahNum = memorizationGoal.startSurahNumber;
    const surahData = SURAH_DATA[surahNum - 1];
    if (!surahData) return null;
    const memorized = new Set(memorizedAyahKeys);
    let count = 0;
    for (let i = 1; i <= surahData.ayahCount; i++) {
      if (memorized.has(`${surahNum}:${i}`)) count++;
    }
    return {
      name: surahData.englishName,
      ayahsComplete: count,
      total: surahData.ayahCount,
      percent: surahData.ayahCount > 0 ? Math.round((count / surahData.ayahCount) * 100) : 0,
      isComplete: count >= surahData.ayahCount,
    };
  }, [memorizationGoal, memorizedAyahKeys]);

  const filteredCerts = useMemo(() => {
    const list = [...certificates].reverse().filter(cert => cert.type !== "full-quran");
    return certView === "surah"
      ? list.filter(cert => cert.type === "surah")
      : list.filter(cert => cert.type === "juz");
  }, [certificates, certView]);

  const earnedCount = useMemo(
    () => certificates.filter(cert => cert.type !== "full-quran").length,
    [certificates],
  );

  const completedSurahNames = useMemo(() => {
    const names = stats.completed.map(s => s.englishName);
    if (names.length === 0) return null;
    if (names.length <= 3) return names.join(" · ");
    return `${names.slice(0, 3).join(" · ")} +${names.length - 3} more`;
  }, [stats.completed]);

  return (
    <View style={[styles.screen, { backgroundColor: c.appBackground }]}>
      {/* ── Anchored header ── */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: c.borderSubtle }]}>
        <BackButton onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Certifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ════════════════════════════════════════
            SECTION A — EARNED CERTIFICATES
        ════════════════════════════════════════ */}
        <View style={{ gap: sp.sm }}>

          <View style={styles.sectionHeadingRow}>
            <View style={{ gap: sp.sm }}>
              <Text style={[styles.sectionSuper, { color: c.hifzFaint }]}>YOUR ARCHIVE</Text>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Earned Certificates</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: c.accentPrimary }]}>
              <Text style={[styles.countBadgeText, { color: c.onAccent }]}>{earnedCount}</Text>
            </View>
          </View>

          <HifzSegmentedControl
            value={certView}
            options={CERT_TOGGLE_OPTIONS}
            onChange={setCertView}
            variant="light"
            style={[styles.certToggle, { marginTop: sp.sm }]}
          />

          <View style={{ gap: sp.xs, marginTop: sp.sm }}>
            {filteredCerts.length > 0 ? (
              filteredCerts.map(cert => (
                <CertListItem
                  key={cert.id}
                  cert={cert}
                  variant="archive"
                  onPress={() => {
                    if (cert.type === "surah") router.push(`/certificate/surah/${cert.surahNumber}` as any);
                    else if (cert.type === "juz") router.push(`/certificate/juz/${cert.juzNumber}` as any);
                  }}
                />
              ))
            ) : (
              <InlineNotice
                variant="neutral"
                icon="award"
                title={certView === "surah" ? "No surah certificates yet" : "No juz certificates yet"}
                description={
                  certView === "surah"
                    ? "Complete a surah to earn your first certificate."
                    : "Complete a juz to earn a juz certificate."
                }
              />
            )}
          </View>

          {/* Aspirational Full Quran preview card */}
          <View style={[styles.previewCard, { backgroundColor: c.hifzCardBg, borderColor: c.borderSubtle, ...c.shadows.softLift }]}>
            <View style={styles.previewCardHeader}>
              <View style={{ gap: sp.sm }}>
                <Text style={[styles.previewSuper, { color: c.hifzFaint }]}>WHEN COMPLETE</Text>
                <Text style={[styles.previewTitle, { color: c.hifzAccentMuted }]}>Full Quran Certificate</Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}>
                <Text style={[styles.previewBadgeText, { color: c.hifzFaint }]}>PREVIEW</Text>
              </View>
            </View>
            <Text style={[styles.previewAr, { color: c.hifzFaint }]}>بِإذْنِ اللَّه</Text>
            <Text style={[styles.previewDesc, { color: c.hifzMuted }]}>
              See what your ceremonial Hifz certificate will look like when your journey is complete. Every certificate is personally signed by a verified Quran teacher.
            </Text>
            <TouchableOpacity
              style={styles.previewCta}
              onPress={() => router.push("/certificate/full-quran" as any)}
              activeOpacity={0.7}
            >
              <Feather name="eye" size={14} color={c.hifzAccentMuted} strokeWidth={1.8} />
              <Text style={[styles.previewCtaText, { color: c.hifzAccentMuted }]}>Preview your certificate</Text>
              <Feather name="chevron-right" size={13} color={c.hifzFaint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════
            SECTION B — KEPT IN THE HEART
        ════════════════════════════════════════ */}
        <View style={[c.cardStyle, styles.heartCard]}>
          <Text style={[styles.sectionSuper, { color: c.hifzFaint, fontSize: ty.fontSize.sm }]}>KEPT IN THE HEART, ALHAMDULILLAH</Text>

          <View style={styles.heartCountRow}>
            <Text style={[styles.heartCount, { color: c.textPrimary }]}>
              {stats.totalMemorized.toLocaleString()}
            </Text>
            <Text style={[styles.heartTotal, { color: c.hifzFaint }]}>
              {" / "}{TOTAL_AYAHS.toLocaleString()} ayahs
            </Text>
          </View>

          <View style={[styles.progressRail, { backgroundColor: c.hifzWarmBand }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0.5, stats.percent)}%` as any, backgroundColor: c.hifzAccent },
              ]}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />

          {learningInfo ? (
            <View style={styles.learningRow}>
              <View style={{ gap: sp.sm, flex: 1, marginRight: sp.md }}>
                <Text style={[styles.sectionSuper, { color: c.hifzFaint, fontSize: ty.fontSize.sm }]}>CURRENTLY LEARNING</Text>
                <Text style={[styles.learningName, { color: c.textPrimary }]}>{learningInfo.name}</Text>
                <Text style={[styles.learningMeta, { color: c.hifzFaint }]}>
                  {learningInfo.isComplete ? "Complete" : "Ongoing"}{" · "}{learningInfo.ayahsComplete} ayahs complete
                </Text>
              </View>
              <LearningArc percent={learningInfo.percent} c={c} />
            </View>
          ) : (
            <View style={{ gap: sp.sm }}>
              <Text style={[styles.sectionSuper, { color: c.hifzFaint }]}>CURRENTLY LEARNING</Text>
              <Text style={[styles.learningMeta, { color: c.hifzFaint }]}>No active goal set</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: c.borderSubtle }]} />

          <View style={{ gap: sp.sm }}>
            <Text style={[styles.hadithQuote, { color: c.hifzMuted }]}>
              {'"Consistency in small amounts is more beloved than abundance done rarely."'}
            </Text>
            <Text style={[styles.hadithSource, { color: c.hifzFaint }]}>SAHIH AL-BUKHARI</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════
            SECTION C — HIFZ PROGRESS
        ════════════════════════════════════════ */}
        <View style={{ marginTop: -sp.md }}>

          <View style={[styles.progressPanel, { backgroundColor: c.appCardWarm, borderColor: c.appSoftBorder }]}>

            <View style={[styles.rhythmBlock, { borderBottomColor: c.borderSubtle }]}>
              <Text style={[styles.sectionSuper, { color: c.hifzFaint, fontSize: ty.fontSize.sm, marginBottom: sp.sm }]}>RHYTHM LEVEL</Text>
              <View style={styles.rhythmRow}>
                <View style={[styles.rhythmBadge, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}>
                  <Feather name="user" size={13} color={c.hifzAccentMuted} strokeWidth={1.6} />
                  <Text style={[styles.rhythmBadgeText, { color: c.textPrimary }]}>{level.name}</Text>
                </View>
                {level.next !== "Complete" && (
                  <Text style={[styles.rhythmNext, { color: c.hifzFaint }]}>Next: {level.next}</Text>
                )}
              </View>
              <Text style={[styles.rhythmNote, { color: c.hifzMuted }]}>{level.desc}</Text>
              <View style={styles.rhythmTrack}>
                {Array.from({ length: 4 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.rhythmSegment,
                      { backgroundColor: i < rhythmSegmentsFilled ? c.textPrimary : c.hifzWarmBand },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.statRow, { borderBottomColor: c.borderSubtle }]}>
              <View>
                <Text style={[styles.statLabel, { color: c.hifzFaint }]}>CURRENT STREAK</Text>
                <Text style={[styles.statSub, { color: c.hifzFaint }]}>days active in a row</Text>
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{currentStreak} days</Text>
            </View>

            <View style={[styles.statRow, { borderBottomColor: c.borderSubtle }]}>
              <View>
                <Text style={[styles.statLabel, { color: c.hifzFaint }]}>TOTAL SESSIONS</Text>
                <Text style={[styles.statSub, { color: c.hifzFaint }]}>since beginning</Text>
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{totalSessions}</Text>
            </View>

            <View style={styles.statRowLast}>
              <View>
                <Text style={[styles.statLabel, { color: c.hifzFaint }]}>COMPLETED SURAHS</Text>
                {stats.completed.length > 0 && (
                  <Text style={[styles.statSub, { color: c.hifzFaint }]}>{stats.completed[0]?.englishName ?? ""}</Text>
                )}
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{stats.completed.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Closing dua ── */}
        <View style={styles.closingWrap}>
          <View style={[styles.closingRule, { backgroundColor: c.borderSubtle }]} />
          <Text style={[styles.closingAr, { color: c.hifzFaint }]}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp.lg,
    paddingVertical: sp.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Başlık (+4): xl=18 → 22
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  scroll: {
    paddingHorizontal: sp.lg,
    paddingTop: sp["2xl"],
    gap: sp["2xl"],
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Normal label text (+2): sm=12 → base=14, archival feel via uppercase + tracking
  sectionSuper: {
    fontSize: ty.fontSize.base,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  // Başlık (+4): lg+1=17 → 21
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: br.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // Normal label (+2): sm=12 → base=14
  countBadgeText: {
    fontSize: ty.fontSize.base,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  certToggle: {
    minHeight: 42,
  },
  previewCard: {
    borderRadius: br["2xl"],
    borderWidth: 1,
    padding: sp.lg,
    gap: sp.md,
    marginTop: sp.xs,
  },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  previewSuper: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  previewTitle: {
    fontSize: ty.fontSize["2xl"],
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  previewBadge: {
    borderRadius: br.full,
    borderWidth: 1,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
  },
  previewBadgeText: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  // Normal text (+2): sm=12 → base=14
  previewAr: {
    fontSize: ty.fontSize.base,
    textAlign: "right",
    writingDirection: "rtl",
  },
  previewDesc: {
    fontSize: ty.fontSize.sm,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  previewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.xs,
  },
  // Normal text (+2): sm=12 → base=14
  previewCtaText: {
    fontSize: ty.fontSize.base,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  heartCard: {
    padding: sp.lg,
    gap: sp.lg,
  },
  heartCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: sp.xs,
  },
  // Başlık (+4): 4xl=28 → 5xl=32
  heartCount: {
    fontSize: ty.fontSize["5xl"],
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    lineHeight: 38,
  },
  // Alt başlık (+2): base=14 → lg=16
  heartTotal: {
    fontSize: ty.fontSize.lg,
    fontFamily: "Inter_400Regular",
  },
  // Normal text (+2): sm=12 → base=14
  heartSurahs: {
    fontSize: ty.fontSize.base,
    fontFamily: "Inter_400Regular",
    marginTop: -sp.xs,
  },
  progressRail: {
    height: 5,
    borderRadius: br.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%" as any,
    borderRadius: br.full,
    minWidth: 6,
  },
  // Normal label (+2): sm=12 → base=14
  progressLabel: {
    fontSize: ty.fontSize.base,
    letterSpacing: 0.8,
    fontFamily: "Inter_400Regular",
    marginTop: sp.xs,
  },
  divider: {
    height: 1,
  },
  learningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Alt başlık (+2): base=14 → lg=16
  learningName: {
    fontSize: ty.fontSize.lg,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  // Normal text (+2): sm=12 → base=14
  learningMeta: {
    fontSize: ty.fontSize.base,
    fontFamily: "Inter_400Regular",
  },
  // Normal text (+2): sm=12 → base=14
  hadithQuote: {
    fontSize: ty.fontSize.base,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 22,
  },
  // Normal label (+2): sm=12 → base=14
  hadithSource: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  progressPanel: {
    borderRadius: br.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  rhythmBlock: {
    padding: sp.xl,
    borderBottomWidth: 1,
  },
  rhythmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: sp.md,
  },
  rhythmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.xs,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.full,
    borderWidth: 1,
  },
  // Normal text (+2): sm=12 → base=14
  rhythmBadgeText: {
    fontSize: ty.fontSize.base,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  // Normal text (+2): sm=12 → base=14
  rhythmNext: {
    fontSize: ty.fontSize.base,
    fontFamily: "Inter_400Regular",
  },
  // Normal text (+2): sm=12 → base=14
  rhythmNote: {
    fontSize: ty.fontSize.base,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    marginBottom: sp.md,
  },
  rhythmTrack: {
    flexDirection: "row",
    gap: sp.sm,
    marginTop: sp.sm,
  },
  rhythmSegment: {
    flex: 1,
    height: 3,
    borderRadius: br.full,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp.lg,
    paddingVertical: sp.lg,
    borderBottomWidth: 1,
  },
  statRowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp.lg,
    paddingVertical: sp.lg,
  },
  // Normal label (+2): sm=12 → base=14
  statLabel: {
    fontSize: ty.fontSize.base,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  // Normal text (+2): sm=12 → base=14
  statSub: {
    fontSize: ty.fontSize.base,
    fontFamily: "Inter_400Regular",
  },
  // Başlık (+4): lg=16 → 2xl=20
  statValue: {
    fontSize: ty.fontSize["2xl"],
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  closingWrap: {
    alignItems: "center",
    gap: sp.sm,
    paddingTop: sp.xs,
  },
  closingRule: {
    width: 48,
    height: 1,
  },
  // Alt başlık (+2): base=14 → lg=16
  closingAr: {
    fontSize: ty.fontSize.lg,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
