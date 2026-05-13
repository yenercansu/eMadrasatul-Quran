import { Platform } from "react-native";

export type ArabicFontKey = "system" | "amiri" | "scheherazade" | "noto";

export interface ArabicFontOption {
  key: ArabicFontKey;
  label: string;
  fontFamily: string | undefined;
}

export const ARABIC_FONT_OPTIONS: ArabicFontOption[] = [
  {
    key: "noto",
    label: "Noto Naskh",
    fontFamily: "NotoNaskhArabic_400Regular",
  },
  {
    key: "amiri",
    label: "Amiri",
    fontFamily: "Amiri_400Regular",
  },
  {
    key: "scheherazade",
    label: "Scheherazade",
    fontFamily: "ScheherazadeNew_400Regular",
  },
  {
    key: "system",
    label: "System",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
];

export function getArabicFontFamily(key: ArabicFontKey | undefined): string | undefined {
  return ARABIC_FONT_OPTIONS.find((f) => f.key === key)?.fontFamily
    ?? (Platform.OS === "ios" ? "System" : undefined);
}
