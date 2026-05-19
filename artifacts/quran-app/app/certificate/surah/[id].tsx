import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";
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

export default function SurahCertificateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const surahNumber = Number(id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { certificates, accountSettings } = useQuran();
  const [exporting, setExporting] = useState(false);

  const surah = SURAH_DATA[surahNumber - 1];
  const cert = certificates.find(c => c.type === "surah" && c.surahNumber === surahNumber);
  const personName = accountSettings.name || "The Student";

  if (!surah) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.hifzBackground }}>
        <Text style={{ color: c.hifzFaint }}>Surah not found</Text>
      </View>
    );
  }

  const completionDate = cert?.unlockedAt ?? new Date().toISOString();
  const gregorianDate = formatDateDisplay(completionDate);
  const hijriDate = formatHijri(completionDate);
  const durationLabel = cert?.durationDays ? `${cert.durationDays} days` : null;
  const ayahsPerDayLabel = cert?.ayahsPerDay ? `${cert.ayahsPerDay.toFixed(1)} ayahs/day` : null;
  const dateSubline = [durationLabel, ayahsPerDayLabel].filter(Boolean).join(" · ");

  return (
    <View style={[styles.screen, { backgroundColor: c.hifzBackground, paddingTop: insets.top }]}>
      {/* top accent strip */}
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
              type: "surah",
              personName,
              surahEnglishName: surah.englishName,
              surahArabicName: surah.name,
              surahNumber,
              surahAyahCount: surah.ayahCount,
              surahJuz: surah.juz,
              gregorianDate,
              hijriDate: hijriDate || undefined,
              durationLabel: durationLabel || undefined,
              ayahsPerDayLabel: ayahsPerDayLabel || undefined,
            });
          } catch {
            Alert.alert("Export failed", "Could not generate the certificate PDF. Please try again.");
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
        {/* ── Bismillah + motif ── */}
        <View style={styles.topSpacer} />
        <Text style={[styles.bismillah, { color: c.hifzAccentMuted }]}>
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </Text>

        <OrnamentDivider />

        {/* ── Cert header ── */}
        <View style={styles.certHeader}>
          <Text style={[styles.labelXs, { color: c.hifzFaint }]}>MEMORIZATION COMPLETE</Text>
          <Text style={[styles.surahTitle, { color: c.hifzText }]}>{surah.englishName}</Text>
          <Text style={[styles.surahTitleAr, { color: c.hifzFaint }]}>{surah.name}</Text>
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
            { value: String(surah.ayahCount), label: "AYAHS" },
            { value: `Juz ${surah.juz}`, label: "JUZ" },
            { value: `#${surahNumber}`, label: "SURAH" },
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
            <View style={[styles.sigLine, { borderColor: c.accentSoft }]} />
            <Text style={[styles.sigRole, { color: c.hifzFaint }]}>INSTITUTION</Text>
          </View>
        </View>

        <OrnamentDivider faint />

        {/* ── Records section ── */}
        {(durationLabel || ayahsPerDayLabel) ? (
          <View style={styles.sectionPadded}>
            <Text style={[styles.labelXs, { color: c.hifzFaint }]}>MEMORIZATION RECORDS</Text>
            <View>
              {durationLabel ? <CertRecordRow label="DURATION" value={durationLabel} /> : null}
              {ayahsPerDayLabel ? <CertRecordRow label="DAILY AVG." sublabel="memorized per session" value={ayahsPerDayLabel} last /> : null}
            </View>
          </View>
        ) : null}

        <OrnamentDivider faint />

        {/* ── Hadith ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.hadith, { color: c.hifzAccentMuted }]}>
            "Whoever memorizes ten ayahs from the beginning of Surah Al-Kahf will be protected from the Dajjal."
          </Text>
          <Text style={[styles.hadithSource, { color: c.hifzFaint }]}>SAHIH MUSLIM</Text>
        </View>

        <OrnamentDivider faint />

        {/* ── Dua ── */}
        <View style={[styles.section, { paddingVertical: 24 }]}>
          <Text style={[styles.duaAr, { color: c.hifzFaint }]}>بَارَكَ اللَّهُ فِيكَ</Text>
          <Text style={[styles.duaEn, { color: c.hifzFaint }]}>
            May this surah be light in your heart and{"\n"}intercession on your Day.
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
  surahTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: "center",
  },
  surahTitleAr: {
    fontSize: 13,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
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
