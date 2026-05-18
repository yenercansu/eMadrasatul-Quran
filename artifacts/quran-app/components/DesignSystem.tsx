import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export type AppCardVariant = "warm" | "plain" | "muted";

interface AppCardProps {
  children: React.ReactNode;
  variant?: AppCardVariant;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppCard({
  children,
  variant = "warm",
  padded = true,
  style,
}: AppCardProps) {
  const c = useColors();
  const s = cardStyles(c);

  return (
    <View style={[s.base, s[variant], padded && s.padded, style]}>
      {children}
    </View>
  );
}

export type AppChipVariant =
  | "default"
  | "selected"
  | "muted"
  | "dark"
  | "outline"
  | "success";
export type AppChipSize = "sm" | "md" | "lg";

interface AppChipProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  selected?: boolean;
  variant?: AppChipVariant;
  size?: AppChipSize;
  icon?: FeatherIconName;
  rightIcon?: FeatherIconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppChip({
  label,
  selected = false,
  variant = "default",
  size = "md",
  icon,
  rightIcon,
  onPress,
  style,
  textStyle,
  activeOpacity = 0.8,
  ...touchableProps
}: AppChipProps) {
  const c = useColors();
  const s = chipStyles(c);
  const resolvedVariant = selected ? "selected" : variant;
  const iconColor = resolvedVariant === "dark" ? c.appWhite : c.appText;
  const content = (
    <>
      {icon ? (
        <Feather name={icon} size={size === "sm" ? 11 : 13} color={iconColor} />
      ) : null}
      <Text
        style={[
          s.label,
          s[`${size}Label`],
          resolvedVariant === "dark" && s.darkLabel,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightIcon ? (
        <Feather
          name={rightIcon}
          size={size === "sm" ? 11 : 13}
          color={iconColor}
        />
      ) : null}
    </>
  );

  const chipStyle = [s.base, s[size], s[resolvedVariant], style];

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      {...touchableProps}
      onPress={onPress}
      activeOpacity={activeOpacity}
      style={chipStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

interface IconButtonProps extends Omit<TouchableOpacityProps, "style"> {
  icon: FeatherIconName;
  size?: "sm" | "md" | "lg";
  tone?: "plain" | "soft" | "dark";
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  size = "md",
  tone = "plain",
  iconColor,
  style,
  activeOpacity = 0.7,
  ...props
}: IconButtonProps) {
  const c = useColors();
  const s = iconButtonStyles(c);
  const resolvedIconColor =
    iconColor ?? (tone === "dark" ? c.appWhite : c.appText);

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={activeOpacity}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      style={[s.base, s[size], s[tone], style]}
    >
      <Feather
        name={icon}
        size={size === "lg" ? 22 : size === "sm" ? 16 : 20}
        color={resolvedIconColor}
      />
    </TouchableOpacity>
  );
}

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  onBack,
  right,
  style,
}: ScreenHeaderProps) {
  const c = useColors();
  const s = headerStyles(c);

  return (
    <View style={[s.header, style]}>
      <IconButton
        icon="arrow-left"
        onPress={onBack}
        accessibilityLabel="Go back"
      />
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={s.rightSlot}>{right}</View>
    </View>
  );
}

interface FullScreenShellProps {
  title: string;
  onClose: () => void;
  scrollable?: boolean;
  children: React.ReactNode;
}

export function FullScreenShell({
  title,
  onClose,
  scrollable = true,
  children,
}: FullScreenShellProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.appBackground,
        paddingTop: insets.top,
      }}
    >
      <ScreenHeader title={title} onBack={onClose} />
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  icon = "inbox",
  style,
}: {
  title: string;
  description?: string;
  icon?: FeatherIconName;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const s = emptyStyles(c);

  return (
    <View style={[s.container, style]}>
      <View style={s.iconWrap}>
        <Feather name={icon} size={22} color={c.appIconMuted} />
      </View>
      <Text style={s.title}>{title}</Text>
      {description ? <Text style={s.description}>{description}</Text> : null}
    </View>
  );
}

const cardStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      borderRadius: 16,
      borderWidth: 1,
    },
    padded: {
      padding: 18,
    },
    warm: {
      backgroundColor: c.appCardWarm,
      borderColor: c.appSoftBorder,
      ...c.shadows.softLift,
    },
    plain: {
      backgroundColor: c.appCard,
      borderColor: c.appBorderLighter,
    },
    muted: {
      backgroundColor: c.appSecondarySurface,
      borderColor: c.appSoftBorder,
    },
  });

const chipStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 999,
    },
    sm: {
      minHeight: 28,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    md: {
      minHeight: 36,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    lg: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    default: {
      backgroundColor: c.appCardWarm,
      borderColor: c.appSoftBorder,
    },
    selected: {
      backgroundColor: c.appSelectedPill,
      borderColor: c.appSelectedPill,
    },
    muted: {
      backgroundColor: c.appSecondarySurface,
      borderColor: c.appSecondarySurface,
    },
    dark: {
      backgroundColor: c.appText,
      borderColor: c.appText,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: c.appBorderMid,
    },
    success: {
      backgroundColor: c.appGoldSurface,
      borderColor: c.appGoldSurface,
    },
    label: {
      fontSize: 13,
      color: c.appText,
      fontFamily: "Inter_600SemiBold",
    },
    smLabel: {
      fontSize: 12,
    },
    mdLabel: {
      fontSize: 13,
    },
    lgLabel: {
      fontSize: 14,
    },
    darkLabel: {
      color: c.appWhite,
    },
  });

const iconButtonStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },
    sm: {
      width: 32,
      height: 32,
    },
    md: {
      width: 40,
      height: 40,
    },
    lg: {
      width: 48,
      height: 48,
    },
    plain: {
      backgroundColor: "transparent",
    },
    soft: {
      backgroundColor: c.appSecondarySurface,
    },
    dark: {
      backgroundColor: c.appText,
    },
  });

const headerStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.appBorder,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: c.appText,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    rightSlot: {
      width: 40,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const emptyStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.appSecondarySurface,
      marginBottom: 10,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: c.appText,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    description: {
      fontSize: 13,
      color: c.appTextMuted,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      textAlign: "center",
      marginTop: 4,
    },
  });
