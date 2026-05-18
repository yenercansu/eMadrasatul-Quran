import { useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { QuranContext } from "@/contexts/QuranContext";

function buildCardStyle(palette: typeof colors.light) {
  return {
    backgroundColor: palette.appCardWarm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.appSoftBorder,
    ...colors.shadows.premiumCard,
  } as const;
}

export function useColors() {
  const ctx = useContext(QuranContext);
  const scheme = useColorScheme();

  const theme = ctx?.accountSettings?.theme ?? "auto";

  if (theme === "dark") {
    const cardStyle = buildCardStyle(colors.dark);
    return { ...colors.dark, isDark: true, radius: colors.radius, borders: colors.borders, shadows: colors.shadows, cardStyle };
  }
  if (theme === "light") {
    const cardStyle = buildCardStyle(colors.light);
    return { ...colors.light, isDark: false, radius: colors.radius, borders: colors.borders, shadows: colors.shadows, cardStyle };
  }

  const palette = scheme === "dark" && "dark" in colors ? colors.dark : colors.light;
  const cardStyle = buildCardStyle(palette);
  return { ...palette, isDark: palette === colors.dark, radius: colors.radius, borders: colors.borders, shadows: colors.shadows, cardStyle };
}
