import { useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { QuranContext } from "@/contexts/QuranContext";

export function useColors() {
  const ctx = useContext(QuranContext);
  const scheme = useColorScheme();

  const theme = ctx?.accountSettings?.theme ?? "auto";

  if (theme === "dark") return { ...colors.dark, radius: colors.radius, borders: colors.borders };
  if (theme === "light") return { ...colors.light, radius: colors.radius, borders: colors.borders };

  const palette = scheme === "dark" && "dark" in colors ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, borders: colors.borders };
}
