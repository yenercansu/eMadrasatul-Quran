import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

export const hifzTokens = {
  background: "#F5F0E8",
  outerBg: "#DED6CC",
  warmBand: "#EDE8DE",
  cardBg: "#FAF7F2",
  heroCard: "#C8C0B0",
  border: "#DDD6C8",
  darkText: "#1A1A1A",
  darkBrown: "#2D2926",
  midBrown: "#5A5248",
  muted: "#6A6058",
  lightMuted: "#8A8070",
  faint: "#B0A898",
};

export function HifzStatusPill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <View style={ui.statusPill}>
      <View style={[ui.statusDot, active && ui.statusDotActive]} />
      <Text style={ui.statusText}>{label}</Text>
    </View>
  );
}

export function HifzProfileButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={ui.profileButton} onPress={onPress} activeOpacity={0.72}>
      <Feather name="user" size={16} color={hifzTokens.lightMuted} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

export function HifzModeTag({ label }: { label: string }) {
  return (
    <View style={ui.modeTag}>
      <Text style={ui.modeTagText}>{label}</Text>
    </View>
  );
}

export function HifzHeroCard({
  title,
  subtitle,
  tags,
  onPress,
  progress = 0.5,
  style,
}: {
  title: string;
  subtitle: string;
  tags?: string[];
  onPress: () => void;
  progress?: number;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity style={[ui.heroCard, style]} onPress={onPress} activeOpacity={0.88}>
      <View style={ui.heroRow}>
        <View style={{ flex: 1 }}>
          {tags?.length ? (
            <View style={ui.heroTags}>
              {tags.map((tag) => <HifzModeTag key={tag} label={tag} />)}
            </View>
          ) : null}
          <Text style={ui.heroTitle}>{title}</Text>
          <Text style={ui.heroSubtitle}>{subtitle}</Text>
          <View style={ui.heroRail}>
            <View style={[ui.heroFill, { width: `${Math.max(0.5, Math.min(100, progress))}%` as any }]} />
          </View>
        </View>
        <View style={ui.heroChevron}>
          <Feather name="chevron-right" size={24} color={hifzTokens.midBrown} strokeWidth={2.5} />
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

export function HifzPrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[ui.primaryButton, disabled && ui.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
    >
      <Text style={[ui.primaryButtonText, disabled && ui.primaryButtonTextDisabled]}>{label}</Text>
    </TouchableOpacity>
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

const ui = StyleSheet.create({
  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: "#DDD6C8",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: hifzTokens.faint,
  },
  statusDotActive: {
    backgroundColor: "#4ADE80",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: hifzTokens.midBrown,
    fontFamily: "Inter_600SemiBold",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: hifzTokens.warmBand,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTag: {
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.10)",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  modeTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: hifzTokens.midBrown,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: hifzTokens.heroCard,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000000",
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
  heroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: hifzTokens.darkText,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: hifzTokens.muted,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  heroRail: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  heroFill: {
    height: "100%" as any,
    borderRadius: 999,
    backgroundColor: hifzTokens.darkBrown,
  },
  heroChevron: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segmented: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: hifzTokens.warmBand,
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
    backgroundColor: hifzTokens.darkBrown,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: hifzTokens.lightMuted,
    fontFamily: "Inter_700Bold",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: hifzTokens.darkBrown,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#E8E2D8",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  primaryButtonTextDisabled: {
    color: hifzTokens.faint,
  },
  stepper: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: hifzTokens.border,
    backgroundColor: hifzTokens.background,
  },
  stepperTab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
    minHeight: 30,
  },
  stepperText: {
    fontSize: 12,
    color: hifzTokens.heroCard,
    fontFamily: "Inter_400Regular",
  },
  stepperTextActive: {
    color: hifzTokens.darkText,
    fontFamily: "Inter_700Bold",
  },
  stepperUnderline: {
    position: "absolute",
    bottom: 0,
    width: "100%" as any,
    height: 2,
    borderRadius: 2,
    backgroundColor: hifzTokens.darkText,
  },
});
