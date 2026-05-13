export type MushafThemeId = "quranCom" | "indopak";

export interface MushafTheme {
  id: MushafThemeId;
  name: string;
  pageBackground: string;
  headerBorderColor: string;
  textColor: string;
  ayahMarkerColor: string;
  activeAyahBackground: string;
  pageNumberColor: string;
  arabicFontFamily: string | undefined;
  arabicFontSize: number;
  arabicLineHeight: number;
  pageHorizontalPadding: number;
  pageVerticalPadding: number;
}

export const MUSHAF_THEMES: Record<MushafThemeId, MushafTheme> = {
  quranCom: {
    id: "quranCom",
    name: "Quran.com",
    pageBackground: "#FFFFFF",
    headerBorderColor: "#E8E0D0",
    textColor: "#1C1810",
    ayahMarkerColor: "#4E9E72",
    activeAyahBackground: "#DCF0E5",
    pageNumberColor: "#8A8A8A",
    arabicFontFamily: "AmiriQuran_400Regular",
    arabicFontSize: 26,
    arabicLineHeight: 60,
    pageHorizontalPadding: 20,
    pageVerticalPadding: 28,
  },

  indopak: {
    id: "indopak",
    name: "Indo-Pak",
    pageBackground: "#F5EDD6",
    headerBorderColor: "#D4B896",
    textColor: "#2C1810",
    ayahMarkerColor: "#8B6914",
    activeAyahBackground: "#FFF0D0",
    pageNumberColor: "#8B6914",
    arabicFontFamily: "AmiriQuran_400Regular",
    arabicFontSize: 26,
    arabicLineHeight: 58,
    pageHorizontalPadding: 20,
    pageVerticalPadding: 28,
  },
};

export const DEFAULT_MUSHAF_THEME_ID: MushafThemeId = "quranCom";
export const DEFAULT_MUSHAF_THEME = MUSHAF_THEMES[DEFAULT_MUSHAF_THEME_ID];
