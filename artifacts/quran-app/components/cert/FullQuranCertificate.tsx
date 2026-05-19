import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Polygon } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { ActionPill } from "@/components/ActionPill";
import { OrnamentDivider } from "@/components/cert/OrnamentDivider";
import { CertMetaGrid } from "@/components/cert/CertMetaGrid";
import { CertRecordRow } from "@/components/cert/CertRecordRow";
import { CertSeal } from "@/components/cert/CertSeal";
import { SURAH_DATA, getJuzAyahs } from "@/constants/surahData";
import { exportAndShareCertificate } from "@/utils/exportCertificatePdf";

interface FullQuranCertificateProps {
  completionDate: Date;
  fullHifzDays: number;
  fullHifzAyahsPerDay: string;
  streakDays: number;
  onBeginRevision: () => void;
}

function formatGregorianLong(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}

function formatHijriLong(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date).replace(/\s*AH$/i, "").toUpperCase();
  } catch {
    return "";
  }
}

function TopMotif({ c }: { c: ReturnType<typeof useColors> }) {
  const size = 36;
  const cx = size / 2;
  const cy = size / 2;
  const r = 13;
  const diamonds = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8 - Math.PI / 2;
    const dx = r * Math.cos(angle);
    const dy = r * Math.sin(angle);
    const ds = 2.5;
    return (
      <Polygon
        key={i}
        points={`${cx + dx},${cy + dy - ds} ${cx + dx + ds},${cy + dy} ${cx + dx},${cy + dy + ds} ${cx + dx - ds},${cy + dy}`}
        fill={c.accentSoft}
        fillOpacity={0.7}
      />
    );
  });
  return (
    <Svg width={size} height={size}>
      {diamonds}
      <Circle cx={cx} cy={cy} r={5} stroke={c.accentSoft} strokeWidth={0.8} fill="none" />
      <Circle cx={cx} cy={cy} r={2} fill={c.accentSoft} fillOpacity={0.6} />
    </Svg>
  );
}

function DownloadButton({ onPress, loading, c }: { onPress: () => void; loading: boolean; c: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.floatBtn, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}
    >
      {loading
        ? <ActivityIndicator size="small" color={c.hifzAccentMuted} />
        : <Feather name="download" size={16} color={c.hifzAccentMuted} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

export function FullQuranCertificate({
  completionDate,
  fullHifzDays,
  fullHifzAyahsPerDay,
  streakDays,
  onBeginRevision,
}: FullQuranCertificateProps) {
  const c = useColors();
  const { accountSettings, dailyEntries } = useQuran();
  const [page, setPage] = useState<"cert" | "journey">("cert");
  const [exporting, setExporting] = useState(false);

  const personName = accountSettings.name || "The Student";

  const gregorianDate = formatGregorianLong(completionDate);
  const hijriDate = formatHijriLong(completionDate);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportAndShareCertificate({
        type: "full-quran",
        personName,
        gregorianDate,
        hijriDate: hijriDate || undefined,
        fullHifzDays,
        ayahsPerDay: fullHifzAyahsPerDay,
      });
    } catch {
      Alert.alert("Export failed", "Could not generate the certificate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const activeDays = useMemo(
    () => dailyEntries.filter(e => e.ayahsRead > 0 || e.milestoneCompleted).length,
    [dailyEntries],
  );

  // Compute best streak from dailyEntries
  const bestStreak = useMemo(() => {
    const dates = dailyEntries
      .filter(e => e.ayahsRead > 0 || e.milestoneCompleted)
      .map(e => e.date)
      .sort();
    let best = 0;
    let current = 0;
    let prevDate: Date | null = null;
    for (const d of dates) {
      const date = new Date(d);
      if (prevDate) {
        const diff = (date.getTime() - prevDate.getTime()) / 86400000;
        if (diff <= 1.5) current++;
        else current = 1;
      } else {
        current = 1;
      }
      if (current > best) best = current;
      prevDate = date;
    }
    return best || streakDays;
  }, [dailyEntries, streakDays]);

  const juzData = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      label: `Juz ${i * 3 + 1}–${i * 3 + 3}`,
      complete: true,
    })), []);

  if (page === "journey") {
    return <JourneyPage
      c={c}
      personName={personName}
      fullHifzDays={fullHifzDays}
      fullHifzAyahsPerDay={fullHifzAyahsPerDay}
      bestStreak={bestStreak}
      activeDays={activeDays}
      onBack={() => setPage("cert")}
    />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.hifzBackground }]}>
      {/* top gradient accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: c.accentSoft }]} />

      {/* Floating download */}
      <DownloadButton c={c} onPress={handleExport} loading={exporting} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Bismillah + motif ── */}
        <TopMotif c={c} />
        <Text style={[styles.bismillah, { color: c.hifzAccentMuted }]}>
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </Text>

        <OrnamentDivider />

        {/* ── Cert header ── */}
        <View style={styles.certHeader}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>CERTIFICATE OF COMPLETION</Text>
          <Text style={[styles.certTitle, { color: c.hifzText }]}>Hifz Al-Quran Al-Karim</Text>
          <Text style={[styles.certTitleAr, { color: c.hifzFaint }]}>حفظ القرآن الكريم</Text>
        </View>

        <OrnamentDivider faint />

        {/* ── Presented to ── */}
        <View style={styles.section}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>THIS CERTIFICATE IS PRESENTED TO</Text>
          <Text style={[styles.personName, { color: c.hifzAccent }]}>{personName}</Text>
          <Text style={[styles.completionStmt, { color: c.hifzAccentMuted }]}>
            who has successfully completed the memorization{"\n"}of the entire Holy Quran
          </Text>
        </View>

        <OrnamentDivider />

        {/* ── Stats grid ── */}
        <View style={styles.sectionFlat}>
          <CertMetaGrid cells={[
            { value: "6,236", label: "AYAHS" },
            { value: "114", label: "SURAHS" },
            { value: "30", label: "JUZ" },
          ]} />
        </View>

        {/* ── Date ── */}
        <View style={styles.dateLine}>
          <Text style={[styles.datePrimary, { color: c.hifzFaint }]}>{gregorianDate}</Text>
          {hijriDate ? <Text style={[styles.dateSecondary, { color: c.hifzFaint }]}>{hijriDate}</Text> : null}
          <Text style={[styles.dateSecondary, { color: c.hifzFaint }]}>
            {fullHifzDays} days · {fullHifzAyahsPerDay} ayahs/day
          </Text>
        </View>

        <OrnamentDivider />

        {/* ── Seal ── */}
        <View style={styles.sealRow}>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { borderColor: c.accentSoft }]} />
            <Text style={[styles.sigRole, { color: c.hifzFaint }]}>TEACHER</Text>
          </View>
          <CertSeal size={56} />
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { borderColor: c.accentSoft }]} />
            <Text style={[styles.sigRole, { color: c.hifzFaint }]}>INSTITUTION</Text>
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Hadith ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.hadith, { color: c.hifzAccentMuted }]}>
            "It will be said to the companion of the Quran: Recite and rise in status, as you used to recite in the world."
          </Text>
          <Text style={[styles.hadithSource, { color: c.hifzFaint }]}>JAMI AT-TIRMIDHI</Text>
        </View>

        <OrnamentDivider faint />

        {/* ── Dua ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.duaAr, { color: c.hifzFaint }]}>بَارَكَ اللَّهُ فِيكَ</Text>
          <Text style={[styles.duaEn, { color: c.hifzFaint }]}>
            May Allah preserve your memorization{"\n"}and elevate you through it.
          </Text>
        </View>

        {/* ── CTAs ── */}
        <View style={styles.ctas}>
          <ActionPill
            label="Begin Revision Journey"
            variant="primary"
            size="lg"
            icon="arrow-right"
            iconPosition="right"
            style={styles.ctaFull}
            onPress={onBeginRevision}
          />
          <View style={styles.ctaRow}>
            <ActionPill
              label="View Full Journey"
              variant="outline"
              size="md"
              style={styles.ctaHalf}
              onPress={() => setPage("journey")}
            />
            <ActionPill
              label={exporting ? "Generating…" : "Save Certificate"}
              variant="outline"
              size="md"
              icon="download"
              iconPosition="left"
              style={styles.ctaHalf}
              onPress={handleExport}
            />
          </View>
          <Text style={[styles.shareHint, { color: c.hifzFaint }]}>Share your achievement with your family</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Journey Page ──────────────────────────────────────────────────────────────

interface JourneyPageProps {
  c: ReturnType<typeof useColors>;
  personName: string;
  fullHifzDays: number;
  fullHifzAyahsPerDay: string;
  bestStreak: number;
  activeDays: number;
  onBack: () => void;
}

function JourneyPage({ c, personName, fullHifzDays, fullHifzAyahsPerDay, bestStreak, activeDays, onBack }: JourneyPageProps) {
  const juzGroups = [
    { label: "Juz 1–10", count: 10 },
    { label: "Juz 11–20", count: 10 },
    { label: "Juz 21–30", count: 10 },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: c.hifzBackground }]}>
      <View style={[styles.accentStrip, { backgroundColor: c.accentSoft }]} />

      {/* Floating back button */}
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.8}
        style={[styles.floatBtn, styles.floatBtnLeft, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}
      >
        <Feather name="chevron-left" size={18} color={c.hifzAccentMuted} strokeWidth={2.2} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.pageTitle, { color: c.hifzFaint }]}>YOUR JOURNEY</Text>

        <OrnamentDivider faint />

        {/* ── Journey header ── */}
        <View style={styles.certHeader}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>A COMPLETE RECORD FOR</Text>
          <Text style={[styles.personName, { color: c.hifzAccent }]}>{personName}</Text>
        </View>

        <OrnamentDivider />

        <View style={styles.sectionFlat}>
          <CertMetaGrid cells={[
            { value: "6,236", label: "AYAHS" },
            { value: "114", label: "SURAHS" },
            { value: "30", label: "JUZ" },
          ]} />
        </View>

        <OrnamentDivider faint />

        {/* ── Journey records ── */}
        <View style={styles.sectionPadded}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>JOURNEY RECORDS</Text>
          <View style={styles.recordsList}>
            <CertRecordRow
              label="DURATION"
              sublabel="total days"
              value={`${fullHifzDays} days`}
            />
            <CertRecordRow
              label="DAILY AVG."
              sublabel="memorized per session"
              value={`${fullHifzAyahsPerDay} ayahs`}
            />
            <CertRecordRow
              label="BEST STREAK"
              sublabel="unbroken consistency"
              value={`${bestStreak} days`}
            />
            <CertRecordRow
              label="ACTIVE DAYS"
              sublabel={`out of ${fullHifzDays} total`}
              value={String(activeDays)}
              last
            />
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Juz completion ── */}
        <View style={styles.sectionPadded}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>JUZ COMPLETION</Text>
          <View style={styles.juzList}>
            {juzGroups.map(jg => (
              <View key={jg.label} style={styles.juzRow}>
                <Text style={[styles.juzLabel, { color: c.hifzAccentMuted }]}>{jg.label}</Text>
                <View style={[styles.juzTrack, { backgroundColor: c.hifzWarmBand }]}>
                  <View style={[styles.juzFill, { backgroundColor: c.hifzAccent }]} />
                </View>
                <View style={[styles.juzCheck, { backgroundColor: c.hifzAccent }]}>
                  <Feather name="check" size={10} color={c.whiteText} strokeWidth={3} />
                </View>
              </View>
            ))}
            <Text style={[styles.juzNote, { color: c.hifzFaint }]}>All 30 Juz completed</Text>
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Closing dua ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.duaAr, { color: c.hifzFaint }]}>بَارَكَ اللَّهُ فِيكَ</Text>
          <Text style={[styles.duaEn, { color: c.hifzFaint }]}>
            May Allah preserve your memorization and elevate you.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  accentStrip: {
    height: 3,
    width: "100%",
    opacity: 0.6,
  },
  floatBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  floatBtnLeft: {
    right: undefined,
    left: 16,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 0,
  },
  pageTitle: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  bismillah: {
    fontSize: 17,
    fontFamily: "System",
    textAlign: "center",
    lineHeight: 32,
    marginTop: 12,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  certHeader: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    width: "100%",
  },
  labelXs: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  certTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 28,
    textAlign: "center",
  },
  certTitleAr: {
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.5,
    writingDirection: "rtl",
    marginTop: 2,
  },
  section: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  sectionFlat: {
    width: "100%",
    paddingVertical: 16,
  },
  sectionPadded: {
    width: "100%",
    paddingVertical: 16,
    gap: 12,
  },
  personName: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  completionStmt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 290,
  },
  dateLine: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 12,
    width: "100%",
  },
  datePrimary: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  dateSecondary: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  sealRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  sigBlock: {
    alignItems: "center",
    gap: 4,
    width: 80,
  },
  sigLine: {
    width: 80,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sigRole: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hadith: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  hadithSource: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 4,
  },
  duaAr: {
    fontSize: 15,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 26,
  },
  duaEn: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  ctas: {
    width: "100%",
    gap: 10,
    marginTop: 12,
    alignItems: "center",
  },
  ctaFull: {
    width: "100%",
    borderRadius: 9999,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  ctaHalf: {
    flex: 1,
    borderRadius: 9999,
  },
  shareHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    textAlign: "center",
  },
  // Journey page
  recordsList: {
    width: "100%",
  },
  juzList: {
    width: "100%",
    gap: 12,
  },
  juzRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  juzLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    width: 80,
    flexShrink: 0,
  },
  juzTrack: {
    flex: 1,
    height: 4,
    borderRadius: 9999,
    overflow: "hidden",
  },
  juzFill: {
    height: "100%",
    width: "100%",
    borderRadius: 9999,
  },
  juzCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  juzNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
});
