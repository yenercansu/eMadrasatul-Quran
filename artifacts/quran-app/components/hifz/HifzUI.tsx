import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

function useHifzStyles() {
  const colors = useColors();
  return { colors, ui: makeStyles(colors) };
}

export function HifzStatusPill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  const { ui } = useHifzStyles();
  return (
    <View style={ui.statusPill}>
      <View style={[ui.statusDot, active && ui.statusDotActive]} />
      <Text style={ui.statusText}>{label}</Text>
    </View>
  );
}

export function HifzProfileButton({ onPress }: { onPress: () => void }) {
  const { colors, ui } = useHifzStyles();
  return (
    <TouchableOpacity style={ui.profileButton} onPress={onPress} activeOpacity={0.72}>
      <Feather name="user" size={16} color={colors.hifzLightMuted} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

export function HifzModeTag({ label }: { label: string }) {
  const { ui } = useHifzStyles();
  return (
    <View style={ui.modeTag}>
      <Text style={ui.modeTagText}>{label}</Text>
    </View>
  );
}

export function HifzHeroCard({
  title,
  subtitle,
  pill,
  tags,
  onPress,
  progress = 0.5,
  style,
}: {
  title: string;
  subtitle?: string;
  pill?: string;
  tags?: string[];
  onPress: () => void;
  progress?: number;
  style?: ViewStyle;
}) {
  const { colors, ui } = useHifzStyles();
  return (
    <TouchableOpacity style={[ui.heroCard, style]} onPress={onPress} activeOpacity={0.88}>
      <View style={ui.heroRow}>
        <View style={{ flex: 1 }}>
          {(pill || tags?.length) ? (
            <View style={ui.heroTopRow}>
              {pill ? (
                <View style={ui.heroPill}>
                  <Text style={ui.heroPillText}>{pill}</Text>
                </View>
              ) : (
                <View style={ui.heroTags}>
                  {tags!.map((tag) => <HifzModeTag key={tag} label={tag} />)}
                </View>
              )}
            </View>
          ) : null}
          <Text style={ui.heroTitle}>{title}</Text>
          {subtitle ? <Text style={ui.heroSubtitle}>{subtitle}</Text> : null}
          <View style={ui.heroRail}>
            <View style={[ui.heroFill, { width: `${Math.max(0.5, Math.min(100, progress))}%` as any }]} />
          </View>
        </View>
        <View style={ui.heroChevron}>
          <Feather name="chevron-right" size={24} color={colors.hifzAccentMuted} strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HifzSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { ui } = useHifzStyles();
  return (
    <View style={[ui.segmented, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[ui.segment, selected && ui.segmentSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.82}
          >
            <Text style={[ui.segmentText, selected && ui.segmentTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


export function HifzStepper({
  labels,
  activeIndex,
  onStepPress,
}: {
  labels: string[];
  activeIndex: number;
  onStepPress?: (index: number) => void;
}) {
  const { ui } = useHifzStyles();
  return (
    <View style={ui.stepper}>
      {labels.map((label, index) => {
        const active = index === activeIndex;
        const pressable = !!onStepPress && index < activeIndex;
        return (
          <TouchableOpacity
            key={`${label}-${index}`}
            style={ui.stepperTab}
            onPress={pressable ? () => onStepPress(index) : undefined}
            disabled={!pressable}
            activeOpacity={pressable ? 0.58 : 1}
          >
            <Text style={[ui.stepperText, active && ui.stepperTextActive]}>{label}</Text>
            {active && <View style={ui.stepperUnderline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: colors.hifzWarmBand,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hifzFaint,
  },
  statusDotActive: {
    backgroundColor: colors.appSuccess,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.hifzAccentMuted,
    fontFamily: "Inter_600SemiBold",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.hifzWarmBand,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTag: {
    borderRadius: 999,
    backgroundColor: colors.overlaySoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  modeTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.hifzAccentMuted,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: colors.hifzHeroCard,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: colors.shadowNeutral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 7,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  heroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroPill: {
    backgroundColor: colors.overlaySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.hifzAccentMuted,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  heroRail: {
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.overlaySoft,
    overflow: "hidden",
  },
  heroFill: {
    height: "100%" as any,
    borderRadius: 999,
    backgroundColor: colors.hifzAccent,
  },
  heroChevron: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segmented: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.hifzWarmBand,
    flexDirection: "row",
    padding: 3,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  segmentSelected: {
    backgroundColor: colors.hifzAccent,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.hifzLightMuted,
    fontFamily: "Inter_700Bold",
  },
  segmentTextSelected: {
    color: colors.onAccent,
  },
  stepper: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hifzBorder,
    backgroundColor: colors.hifzBackground,
  },
  stepperTab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
    minHeight: 30,
  },
  stepperText: {
    fontSize: 12,
    color: colors.hifzHeroCard,
    fontFamily: "Inter_400Regular",
  },
  stepperTextActive: {
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
  },
  stepperUnderline: {
    position: "absolute",
    bottom: 0,
    width: "100%" as any,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.hifzText,
  },
});
