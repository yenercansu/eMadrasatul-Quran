import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA, getJuzAyahs } from "@/constants/surahData";
import { exportAndShareCertificate } from "@/utils/exportCertificatePdf";
import { OrnamentDivider } from "@/components/cert/OrnamentDivider";
import { CertMetaGrid } from "@/components/cert/CertMetaGrid";
import { CertRecordRow } from "@/components/cert/CertRecordRow";
import { CertSeal } from "@/components/cert/CertSeal";

function formatDateDisplay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
  } catch { return ""; }
}

function formatHijri(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(new Date(iso)).replace(/\s*AH$/i, "").toUpperCase();
  } catch { return ""; }
}

export default function JuzCertificateScreen() {
  const { juz: juzParam } = useLocalSearchParams<{ juz: string }>();
  const juzNumber = Number(juzParam);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { certificates, accountSettings } = useQuran();

  const cert = certificates.find(c => c.type === "juz" && c.juzNumber === juzNumber);
  const personName = accountSettings.certificateName || accountSettings.name || "The Student";
  const [exporting, setExporting] = useState(false);

  const juzAyahs = useMemo(() => getJuzAyahs(juzNumber), [juzNumber]);
  const totalAyahsInJuz = juzAyahs.length;

  const surahsInJuz = useMemo(() => {
    const seen = new Set<number>();
    const result: { number: number; name: string; arabicName: string }[] = [];
    for (const ayah of juzAyahs) {
      if (!seen.has(ayah.surahNumber)) {
        seen.add(ayah.surahNumber);
        const s = SURAH_DATA[ayah.surahNumber - 1];
        if (s) result.push({ number: s.number, name: s.englishName, arabicName: s.name });
      }
    }
    return result;
  }, [juzAyahs]);

  const completionDate = cert?.unlockedAt ?? new Date().toISOString();
  const gregorianDate = formatDateDisplay(completionDate);
  const hijriDate = formatHijri(completionDate);
  const durationLabel = cert?.durationDays ? `${cert.durationDays} days` : null;
  const ayahsPerDayLabel = cert?.ayahsPerDay ? `${cert.ayahsPerDay.toFixed(1)} ayahs/day` : null;
  const dateSubline = [durationLabel, ayahsPerDayLabel].filter(Boolean).join(" · ");

  if (!juzNumber || juzNumber < 1 || juzNumber > 30) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.hifzBackground }}>
        <Text style={{ color: c.hifzFaint }}>Juz not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.hifzBackground, paddingTop: insets.top }]}>
      <View style={[styles.accentStrip, { backgroundColor: c.accentSoft }]} />

      {/* Floating back */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
        style={[styles.floatBtn, styles.floatBtnLeft, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle, top: insets.top + 14 }]}
      >
        <Feather name="chevron-left" size={18} color={c.hifzAccentMuted} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Floating save */}
      <TouchableOpacity
        onPress={async () => {
          if (exporting) return;
          setExporting(true);
          try {
            await exportAndShareCertificate({
              type: "juz",
              personName,
              juzNumber,
              totalAyahs: totalAyahsInJuz,
              surahsInJuz,
              gregorianDate,
              hijriDate: hijriDate || undefined,
              durationLabel: durationLabel || undefined,
              ayahsPerDayLabel: ayahsPerDayLabel || undefined,
            });
          } catch (e) {
            Alert.alert("Export failed", e instanceof Error ? e.message : "Could not generate the certificate PDF. Please try again.");
          } finally {
            setExporting(false);
          }
        }}
        activeOpacity={0.8}
        style={[styles.floatBtn, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle, top: insets.top + 14 }]}
      >
        {exporting
          ? <ActivityIndicator size="small" color={c.hifzAccentMuted} />
          : <Feather name="download" size={16} color={c.hifzAccentMuted} strokeWidth={2} />}
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topSpacer} />
        <Text style={[styles.bismillah, { color: c.hifzAccentMuted }]}>
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </Text>

        <OrnamentDivider />

        {/* ── Cert header ── */}
        <View style={styles.certHeader}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>MEMORIZATION COMPLETE</Text>
          <Text style={[styles.juzTitle, { color: c.hifzText }]}>Juz {juzNumber}</Text>
        </View>

        <OrnamentDivider faint />

        {/* ── Memorized by ── */}
        <View style={styles.section}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>MEMORIZED BY</Text>
          <Text style={[styles.personName, { color: c.hifzAccent }]}>{personName}</Text>
        </View>

        <OrnamentDivider />

        {/* ── Stats grid ── */}
        <View style={styles.sectionFlat}>
          <CertMetaGrid cells={[
            { value: String(totalAyahsInJuz), label: "AYAHS" },
            { value: String(surahsInJuz.length), label: "SURAHS" },
            { value: String(juzNumber), label: "JUZ" },
          ]} />
        </View>

        {/* ── Date ── */}
        <View style={styles.dateLine}>
          <Text style={[styles.datePrimary, { color: c.hifzFaint }]}>{gregorianDate}</Text>
          {hijriDate ? <Text style={[styles.dateSecondary, { color: c.hifzFaint }]}>{hijriDate}</Text> : null}
          {dateSubline ? <Text style={[styles.dateSecondary, { color: c.hifzFaint }]}>{dateSubline}</Text> : null}
        </View>

        <OrnamentDivider />

        {/* ── Seal row ── */}
        <View style={styles.sealRow}>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { borderColor: c.accentSoft }]} />
            <Text style={[styles.sigRole, { color: c.hifzFaint }]}>TEACHER</Text>
          </View>
          <CertSeal size={56} />
          <View style={styles.sigBlock}>
            <Text style={[styles.sigInstitutionName, { color: c.hifzAccentMuted }]}>Al-Zahira</Text>
            <Text style={[styles.sigInstitutionAr, { color: c.hifzFaint }]}>مدرسة الزاهرة</Text>
            <View style={[styles.sigLine, { borderColor: c.accentSoft }]} />
            <Text style={[styles.sigRole, { color: c.hifzFaint }]}>INSTITUTION</Text>
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Surahs in this juz ── */}
        <View style={styles.sectionPadded}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>SURAHS IN THIS JUZ</Text>
          <View style={[styles.surahTagsWrap]}>
            {surahsInJuz.map(s => (
              <View key={s.number} style={[styles.surahTag, { backgroundColor: c.surfaceSecondary, borderColor: c.borderSubtle }]}>
                <Text style={[styles.surahTagText, { color: c.hifzAccentMuted }]}>{s.name}</Text>
                <Text style={[styles.surahTagSub, { color: c.hifzFaint }]}>{s.name !== s.arabicName ? s.name : ""}</Text>
              </View>
            ))}
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Records ── */}
        {(durationLabel || ayahsPerDayLabel) ? (
          <>
            <View style={styles.sectionPadded}>
              <Text style={[styles.labelXs, { color: c.hifzFaint }]}>MEMORIZATION RECORDS</Text>
              <View>
                {durationLabel ? <CertRecordRow label="DURATION" value={durationLabel} /> : null}
                {ayahsPerDayLabel ? <CertRecordRow label="DAILY AVG." sublabel="memorized per session" value={ayahsPerDayLabel} last /> : null}
              </View>
            </View>
            <OrnamentDivider faint />
          </>
        ) : null}

        {/* ── Hadith ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.hadith, { color: c.hifzAccentMuted }]}>
            "The best among you are those who learn the Quran and teach it."
          </Text>
          <Text style={[styles.hadithSource, { color: c.hifzFaint }]}>SAHIH AL-BUKHARI</Text>
        </View>

        <OrnamentDivider faint />

        {/* ── Dua ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.duaAr, { color: c.hifzFaint }]}>بَارَكَ اللَّهُ فِيكَ</Text>
          <Text style={[styles.duaEn, { color: c.hifzFaint }]}>
            May this juz be a light in your heart{"\n"}and intercession on your Day.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  accentStrip: { height: 3, width: "100%", opacity: 0.6 },
  topSpacer: { height: 48 },
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
  floatBtnLeft: { right: undefined, left: 16 },
  scrollContent: {
    paddingBottom: 52,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  bismillah: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 32,
    writingDirection: "rtl",
    marginBottom: 4,
  },
  certHeader: { alignItems: "center", gap: 6, paddingVertical: 16, width: "100%" },
  labelXs: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  juzTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: "center",
  },
  section: { width: "100%", alignItems: "center", gap: 8, paddingVertical: 16 },
  sectionFlat: { width: "100%", paddingVertical: 16 },
  sectionPadded: { width: "100%", paddingVertical: 16, gap: 12 },
  personName: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  dateLine: { alignItems: "center", gap: 3, paddingVertical: 12, width: "100%" },
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
  sigBlock: { alignItems: "center", gap: 4, width: 80 },
  sigLine: { width: 80, borderBottomWidth: 1, marginBottom: 4 },
  sigRole: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sigInstitutionName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontStyle: "italic",
    textAlign: "center",
  },
  sigInstitutionAr: {
    fontSize: 9,
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 2,
  },
  surahTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  surahTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  surahTagText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    writingDirection: "rtl",
    textAlign: "center",
  },
  surahTagSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
  duaAr: { fontSize: 15, textAlign: "center", writingDirection: "rtl", lineHeight: 26 },
  duaEn: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
});
