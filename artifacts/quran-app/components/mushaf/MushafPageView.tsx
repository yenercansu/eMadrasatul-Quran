import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ApiAyah } from "@/services/quranApi";
import { getTajweedColor, splitOriginalWordsWithTajweed } from "@/components/TajweedText";
import { DEFAULT_MUSHAF_THEME, type MushafTheme } from "./MushafTheme";

function toArabicNumerals(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

interface Props {
  ayahs: ApiAyah[];
  surahArabicName: string;
  surahEnglishName: string;
  isFirstPage: boolean;
  showBasmala: boolean;
  activeAyah: number | null;
  tajweedMode?: boolean;
  theme?: MushafTheme;
}

export function MushafPageView({
  ayahs,
  surahArabicName,
  surahEnglishName,
  isFirstPage,
  showBasmala,
  activeAyah,
  tajweedMode = false,
  theme = DEFAULT_MUSHAF_THEME,
}: Props) {
  const firstAyah = ayahs[0];
  const juzNum = firstAyah?.juz ?? 1;
  const pageNum = firstAyah?.page ?? 1;

  const s = useMemo(() => buildStyles(theme), [theme]);

  return (
    <View style={s.page}>
      {/* ─── Page header: Juz (left) | Surah (right) ─────────── */}
      <View style={s.header}>
        <Text style={s.headerLeft}>{`Juz' ${juzNum}`}</Text>
        <Text style={s.headerRight} numberOfLines={1}>
          {surahEnglishName}{"  "}{surahArabicName}
        </Text>
      </View>

      {/* ─── Surah title + basmala on first page ──────────────── */}
      {isFirstPage && (
        <View style={s.titleBlock}>
          <View style={s.ornamentalLine} />
          <Text style={s.surahTitle}>{surahArabicName}</Text>
          {showBasmala && (
            <Text style={s.basmala}>
              {"بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"}
            </Text>
          )}
          <View style={s.ornamentalLine} />
        </View>
      )}

      {/* ─── Continuous RTL text block ────────────────────────── */}
      <View style={s.textContainer}>
        <Text style={s.quranText} textBreakStrategy="highQuality">
          {ayahs.map((ayah) => {
            const isActive = activeAyah === ayah.numberInSurah;
            const tajweedWords = tajweedMode && ayah.tajweedText ? splitOriginalWordsWithTajweed(ayah.text, ayah.tajweedText) : null;
            const words = tajweedWords ?? ayah.text.split(" ").filter(Boolean);
            return (
              <Text key={ayah.numberInSurah}>
                {words.map((word, idx) => {
                  if (typeof word === "string") {
                    return (
                      <Text
                        key={`${ayah.numberInSurah}-${idx}`}
                        style={isActive ? s.activeWord : undefined}
                      >
                        {word}{" "}
                      </Text>
                    );
                  }
                  return (
                    <Text
                      key={`${ayah.numberInSurah}-${idx}`}
                      style={isActive ? s.activeWord : undefined}
                    >
                      {word.tokens.map((token, tokenIdx) => (
                        <Text
                          key={`${ayah.numberInSurah}-${idx}-${tokenIdx}`}
                          style={{ color: getTajweedColor(token.className) ?? theme.textColor }}
                        >
                          {token.text}
                        </Text>
                      ))}
                      {" "}
                    </Text>
                  );
                })}
                <Text style={[s.ayahMarker, isActive && s.ayahMarkerActive]}>
                  {"۝"}{toArabicNumerals(ayah.numberInSurah)}{" "}
                </Text>
              </Text>
            );
          })}
        </Text>
      </View>

      {/* ─── Page number footer ───────────────────────────────── */}
      <View style={s.footer}>
        <Text style={s.pageNumber}>{pageNum}</Text>
      </View>
    </View>
  );
}

function buildStyles(t: MushafTheme) {
  return StyleSheet.create({
    page: {
      backgroundColor: t.pageBackground,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: t.pageHorizontalPadding,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.headerBorderColor,
    },
    headerLeft: {
      fontSize: 12,
      color: t.textColor,
      fontFamily: "Inter_400Regular",
      opacity: 0.55,
    },
    headerRight: {
      fontSize: 12,
      color: t.textColor,
      fontFamily: "Inter_400Regular",
      opacity: 0.55,
      flexShrink: 1,
      marginLeft: 8,
    },
    titleBlock: {
      alignItems: "center",
      paddingTop: 20,
      paddingBottom: 18,
      paddingHorizontal: t.pageHorizontalPadding,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.headerBorderColor,
      gap: 10,
    },
    ornamentalLine: {
      height: StyleSheet.hairlineWidth,
      width: "60%",
      backgroundColor: t.headerBorderColor,
    },
    surahTitle: {
      fontSize: 34,
      color: t.textColor,
      fontFamily: t.arabicFontFamily,
      lineHeight: 50,
    },
    basmala: {
      fontSize: 21,
      color: t.textColor,
      fontFamily: t.arabicFontFamily,
      textAlign: "center",
      lineHeight: 40,
      opacity: 0.9,
    },
    textContainer: {
      paddingHorizontal: t.pageHorizontalPadding,
      paddingTop: t.pageVerticalPadding,
      paddingBottom: 20,
    },
    quranText: {
      fontSize: t.arabicFontSize,
      lineHeight: t.arabicLineHeight,
      textAlign: "justify",
      writingDirection: "rtl",
      color: t.textColor,
      fontFamily: t.arabicFontFamily,
    },
    activeWord: {
      backgroundColor: t.activeAyahBackground,
    },
    ayahMarker: {
      color: t.ayahMarkerColor,
      fontSize: t.arabicFontSize,
      fontFamily: t.arabicFontFamily,
    },
    ayahMarkerActive: {
      backgroundColor: t.activeAyahBackground,
    },
    footer: {
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.headerBorderColor,
      alignItems: "center",
    },
    pageNumber: {
      fontSize: 13,
      color: t.pageNumberColor,
      fontFamily: "Inter_400Regular",
    },
  });
}
