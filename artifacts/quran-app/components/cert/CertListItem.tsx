import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SURAH_DATA } from "@/constants/surahData";
import { CertSeal } from "@/components/cert/CertSeal";
import colors from "@/constants/colors";
import type { Certificate } from "@/contexts/QuranContext";

const sp = colors.spacing;
const ty = colors.typography;
const br = colors.borders;

interface CertListItemProps {
  cert: Certificate;
  onPress: () => void;
  variant?: "default" | "archive";
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function getCertInfo(cert: Certificate): { title: string; subtitle: string; badge: string } {
  if (cert.type === "full-quran") {
    return { title: "Hifz Al-Quran Al-Karim", subtitle: "6,236 ayahs · 114 surahs · 30 juz", badge: "Full Quran" };
  }
  if (cert.type === "surah" && cert.surahNumber != null) {
    const surah = SURAH_DATA[cert.surahNumber - 1];
    return {
      title: surah?.englishName ?? `Surah ${cert.surahNumber}`,
      subtitle: `${surah?.ayahCount ?? ""} ayahs · Juz ${surah?.juz ?? ""}`,
      badge: "Surah",
    };
  }
  if (cert.type === "juz" && cert.juzNumber != null) {
    return {
      title: `Juz ${cert.juzNumber}`,
      subtitle: `Juz memorization complete`,
      badge: "Juz",
    };
  }
  return { title: "Certificate", subtitle: "", badge: "" };
}

export function CertListItem({ cert, onPress, variant = "default" }: CertListItemProps) {
  const c = useColors();
  const info = getCertInfo(cert);

  if (variant === "archive") {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.archiveItem, { backgroundColor: c.hifzCardBg, borderColor: c.borderSubtle, ...c.shadows.softLift }]}
      >
        {/* Accent strip — accentSoft token safe in both modes */}
        <View style={[styles.archiveAccent, { backgroundColor: c.accentSoft }]} />
        <View style={styles.archiveBody}>
          <CertSeal size={40} />
          <View style={styles.content}>
            <Text style={[styles.title, { color: c.hifzText, fontSize: ty.fontSize.base + 1 }]} numberOfLines={1}>
              {info.title}
            </Text>
            {info.subtitle ? (
              <Text style={[styles.subtitle, { color: c.hifzMuted }]} numberOfLines={1}>
                {info.subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.viewCta}>
            <Text style={[styles.viewText, { color: c.hifzMuted }]}>View</Text>
            <Feather name="chevron-right" size={12} color={c.hifzFaint} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.item, { backgroundColor: c.hifzCardBg, borderColor: c.borderSubtle, ...c.shadows.softLift }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}>
        <Feather name="award" size={18} color={c.hifzAccentMuted} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.hifzText }]} numberOfLines={1}>
            {info.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: c.surfaceSecondary }]}>
            <Text style={[styles.badgeText, { color: c.hifzMuted }]}>{info.badge}</Text>
          </View>
        </View>
        {info.subtitle ? (
          <Text style={[styles.subtitle, { color: c.hifzMuted }]} numberOfLines={1}>
            {info.subtitle}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: c.hifzFaint }]}>{formatDateShort(cert.unlockedAt)}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={c.hifzFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: sp.md + 2,
    borderRadius: br.lg,
    borderWidth: 1,
    gap: sp.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  // Archive variant — self-contained card with accent strip
  archiveItem: {
    borderRadius: br.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  archiveAccent: {
    height: 2,
    width: "100%",
  },
  archiveBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: sp.md,
    gap: sp.md,
  },
  viewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.xs,
    flexShrink: 0,
  },
  viewText: {
    fontSize: ty.fontSize.sm,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  // Shared between variants
  content: {
    flex: 1,
    gap: sp.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.sm,
  },
  title: {
    fontSize: ty.fontSize.base - 1,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  badge: {
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: br.full,
    flexShrink: 0,
  },
  // Badge text — uppercase + tracking achieves compact feel at min 12px
  badgeText: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: ty.fontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  date: {
    fontSize: ty.fontSize.sm,
    fontFamily: "Inter_400Regular",
  },
});
