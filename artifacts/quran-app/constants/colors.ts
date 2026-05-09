const colors = {
  light: {
    text: "#1A1A1A",
    tint: "#1A1A1A",

    background: "#FDFBF7",
    foreground: "#1A1A1A",

    card: "#FFFFFF",
    cardForeground: "#1A1A1A",

    primary: "#1A1A1A",
    primaryForeground: "#FFFFFF",

    secondary: "#F2F2F7",
    secondaryForeground: "#1A1A1A",

    muted: "#F2F2F7",
    mutedForeground: "#8E8E93",

    accent: "#F9E79F",
    accentForeground: "#1A1A1A",

    destructive: "#D9534F",
    destructiveForeground: "#FFFFFF",

    border: "#E8E8ED",
    input: "#E8E8ED",

    surface: "#FDFBF7",
    surfaceAlt: "#F2F2F7",

    // Design Tokens - Semantic Colors
    appBackground: "#FDFBF7",
    appCard: "#FFFFFF",
    appBorder: "#E8E8ED",
    appText: "#1A1A1A",
    appTextMuted: "#8E8E93",
    appPrimary: "#1A1A1A",
    appSuccess: "#4CAF50",
    appWarning: "#EAB308",
    appInfo: "#2196F3",
    appError: "#D9534F",
    appGold: "#C9A02A",
    appGreen: "#4CAF50",
    appLightBg: "#FEFCE8",
    appLighterBg: "#FDFBF7",
    appLightGray: "#F6F2EA",
    appDarkGray: "#78716C",
    appDarkerGray: "#5D4A37",
    appLightText: "#71717A",
    appBorderLight: "#D6D3D1",
    appBorderLighter: "#DDDAD4",
    appWhite: "#FFFFFF",
    appBlack: "#000000",
    appFlame: "#E86A33",
    appGoldSurface: "#F1D887",
    appStone: "#EEE8DF",
    appBorderAccent: "#5D4A37",
    appWarningLight: "#FCD34D",
    appNeutralDark: "#434343",
    appOrangeSurface: "#FFEDD5",
    appBorderMid: "#A8A29E",
    appSeparator: "#F9FAFB",
    appTextPrimary: "#18181B",
    appNeutral950: "#0A0A0A",
    appBubbleBorder: "#E5E7EB",
    appProgressGlowColor: "rgb(212,175,55)",
    appProgressRail: "#E7E5DB",
    appWarmBorder: "#A97B4E",
    appSecondarySurface: "#EAE4DA",
  },

  dark: {
    text: "#F0EBE3",
    tint: "#FFFFFF",

    background: "#0E0E0E",
    foreground: "#F0EBE3",

    card: "#1A1A1A",
    cardForeground: "#F0EBE3",

    primary: "#FFFFFF",
    primaryForeground: "#000000",

    secondary: "#2A2A2A",
    secondaryForeground: "#FFFFFF",

    muted: "#222222",
    mutedForeground: "#7A7A7A",

    accent: "#7A7A7A",
    accentForeground: "#FFFFFF",

    destructive: "#D9534F",
    destructiveForeground: "#FFFFFF",

    border: "#333333",
    input: "#333333",

    surface: "#141414",
    surfaceAlt: "#1A1A1A",

    // Design Tokens - Semantic Colors
    appBackground: "#0E0E0E",
    appCard: "#1A1A1A",
    appBorder: "#333333",
    appText: "#F0EBE3",
    appTextMuted: "#7A7A7A",
    appPrimary: "#FFFFFF",
    appSuccess: "#4CAF50",
    appWarning: "#EAB308",
    appInfo: "#2196F3",
    appError: "#D9534F",
    appGold: "#C9A02A",
    appGreen: "#4CAF50",
    appLightBg: "#1F1F1F",
    appLighterBg: "#1A1A1A",
    appLightGray: "#2A2A2A",
    appDarkGray: "#7A7A7A",
    appDarkerGray: "#CCCCCC",
    appLightText: "#7A7A7A",
    appBorderLight: "#333333",
    appBorderLighter: "#444444",
    appWhite: "#FFFFFF",
    appBlack: "#000000",
    appFlame: "#FF7F45",
    appGoldSurface: "#3D2800",
    appStone: "#2C2C2C",
    appBorderAccent: "#5D4A37",
    appWarningLight: "#B8922A",
    appNeutralDark: "#7A7A7A",
    appOrangeSurface: "#3D1E0A",
    appBorderMid: "#6B6460",
    appSeparator: "#252525",
    appTextPrimary: "#F4F4F5",
    appNeutral950: "#FAFAFA",
    appBubbleBorder: "#3F3F46",
    appProgressGlowColor: "rgb(212,175,55)",
    appProgressRail: "#2A2A2A",
    appWarmBorder: "#8B6340",
    appSecondarySurface: "#252525",
  },

  radius: 12,

  // Design Tokens - Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
  },

  // Design Tokens - Typography
  typography: {
    fontSize: {
      xs: 11,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      "2xl": 20,
      "3xl": 24,
      "4xl": 28,
      "5xl": 32,
      "6xl": 36,
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Design Tokens - Borders
  borders: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    "2xl": 20,
    full: 9999,
  },

  // Design Tokens - Shadows
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    goldGlow: {
      shadowColor: "rgb(212,175,55)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 2,
    },
    warmCardLift: {
      shadowColor: "#A97B4E",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 4,
    },
    warmWidgetLift: {
      shadowColor: "#5D4A37",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 3,
    },
  },
};

export default colors;
