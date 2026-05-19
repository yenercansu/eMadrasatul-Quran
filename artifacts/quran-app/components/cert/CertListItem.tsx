import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SURAH_DATA } from "@/constants/surahData";
import type { Certificate } from "@/contexts/QuranContext";

interface CertListItemProps {
  cert: Certificate;
  onPress: () => void;
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

export function CertListItem({ cert, onPress }: CertListItemProps) {
  const c = useColors();
  const info = getCertInfo(cert);

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
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
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
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  date: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
