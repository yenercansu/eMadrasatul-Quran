import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export type InlineNoticeVariant = "info" | "success" | "warning" | "error" | "neutral";
export type InlineNoticeDensity = "default" | "compact";

interface InlineNoticeProps {
  variant?: InlineNoticeVariant;
  density?: InlineNoticeDensity;
  icon?: FeatherName | React.ReactNode | false;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

const DEFAULT_ICONS: Record<InlineNoticeVariant, FeatherName> = {
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  error: "alert-circle",
  neutral: "info",
};

export function InlineNotice({
  variant = "info",
  density = "default",
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  onPress,
  children,
  style,
  contentStyle,
  titleStyle,
  descriptionStyle,
}: InlineNoticeProps) {
  const colors = useColors();
  const s = styles(colors);
  const tone = getTone(colors, variant);
  const iconNode = icon === false ? null : renderIcon(icon ?? DEFAULT_ICONS[variant], tone.icon);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={onPress ? 0.78 : undefined}
      onPress={onPress}
      style={[
        s.base,
        density === "compact" ? s.compact : s.default,
        { backgroundColor: tone.background },
        style,
      ]}
    >
      {iconNode}
      <View style={[s.content, contentStyle]}>
        {title ? <Text style={[s.title, { color: tone.title }, titleStyle]}>{title}</Text> : null}
        {description ? (
          <Text style={[s.description, { color: tone.text }, descriptionStyle]}>
            {description}
          </Text>
        ) : null}
        {actionLabel && onActionPress ? (
          <TouchableOpacity onPress={onActionPress} activeOpacity={0.75} style={s.action}>
            <Text style={[s.actionText, { color: tone.action }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </Container>
  );
}

function renderIcon(icon: FeatherName | React.ReactNode, color: string) {
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "string") {
    return (
      <View style={stylesStatic.iconWrap}>
        <Feather name={icon as FeatherName} size={16} color={color} />
      </View>
    );
  }
  return null;
}

function getTone(colors: ReturnType<typeof useColors>, variant: InlineNoticeVariant) {
  switch (variant) {
    case "success":
      return {
        background: colors.appStone,
        icon: colors.appGold,
        title: colors.textPrimary,
        text: colors.textSecondary,
        action: colors.textSecondary,
      };
    case "warning":
      return {
        background: colors.warningSoft,
        icon: colors.appWarning,
        title: colors.textPrimary,
        text: colors.textSecondary,
        action: colors.appWarning,
      };
    case "error":
      return {
        background: colors.destructiveSoft,
        icon: colors.destructive,
        title: colors.textPrimary,
        text: colors.textSecondary,
        action: colors.destructive,
      };
    case "neutral":
      return {
        background: colors.surfaceElevated,
        icon: colors.textTertiary,
        title: colors.textPrimary,
        text: colors.textTertiary,
        action: colors.textPrimary,
      };
    case "info":
    default:
      return {
        background: colors.surfaceSecondary,
        icon: colors.textTertiary,
        title: colors.textPrimary,
        text: colors.textTertiary,
        action: colors.textPrimary,
      };
  }
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: 14,
      gap: 10,
    },
    default: {
      padding: 14,
    },
    compact: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 8,
    },
    content: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Inter_700Bold",
    },
    description: {
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "Inter_400Regular",
    },
    action: {
      alignSelf: "flex-start",
      marginTop: 6,
    },
    actionText: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
    },
  });

const stylesStatic = StyleSheet.create({
  iconWrap: {
    width: 18,
    minHeight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
