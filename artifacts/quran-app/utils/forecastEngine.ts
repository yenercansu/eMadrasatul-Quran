import type { DailyEntry } from "@/contexts/QuranContext";
import {
  advanceCapacity,
  DAYS_PER_MONTH,
  estimateCompletionDays,
  GROWTH_SPEED_PER_MONTH,
  PACE_MILESTONES,
} from "@/utils/paceUtils";
import type { GrowthStyle } from "@/utils/paceUtils";

export type { GrowthStyle };

export type ConfidenceLevel = "cold" | "building" | "established";

export interface ForecastInput {
  growthStyle: GrowthStyle;
  configuredStartPacePerDay: number;
  configuredPeakPacePerDay: number;
  remainingAyahs: number;
  goalStartDate: string;
  dailyEntries: DailyEntry[];
}

export interface AdaptiveMilestone {
  label: string;
  ayahsPerDay: number;
  weeksFromNow: number;
}

export interface ForecastResult {
  observedVelocityPerDay: number;
  projectedPeakVelocityPerDay: number;
  estimatedCompletionWeeks: number;
  estimatedCompletionDate: Date;
  milestones: AdaptiveMilestone[];
  confidence: ConfidenceLevel;
  activeDayCount: number;
  isAheadOfBaseline: boolean;
}

const VELOCITY_WINDOW_DAYS = 14;
const COLD_THRESHOLD = 3;
const ESTABLISHED_THRESHOLD = 14;
const BUILDING_OBSERVED_WEIGHT = 0.7;

function getConfidenceLevel(activeDays: number): ConfidenceLevel {
  if (activeDays < COLD_THRESHOLD) return "cold";
  if (activeDays < ESTABLISHED_THRESHOLD) return "building";
  return "established";
}

function computeObservedVelocity(
  entries: DailyEntry[],
  windowDays = VELOCITY_WINDOW_DAYS
): { velocity: number; activeDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() - windowDays * 86400000);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const activeEntries = entries
    .filter((e) => e.date >= cutoffStr && e.ayahsRead > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeEntries.length === 0) return { velocity: 0, activeDays: 0 };

  // Exponential weighting: oldest active entry → weight ~exp(0), most recent → exp(1)
  const n = activeEntries.length;
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const weight = Math.exp(t);
    weightedSum += activeEntries[i].ayahsRead * weight;
    totalWeight += weight;
  }

  return { velocity: weightedSum / totalWeight, activeDays: n };
}

function getEffectiveVelocity(
  observed: number,
  configuredStart: number,
  confidence: ConfidenceLevel
): number {
  if (confidence === "cold") return configuredStart;
  if (confidence === "building") {
    return BUILDING_OBSERVED_WEIGHT * observed + (1 - BUILDING_OBSERVED_WEIGHT) * configuredStart;
  }
  return observed;
}

function simulateCompletionWeeks(
  startDaily: number,
  peakDaily: number,
  style: GrowthStyle,
  remainingAyahs: number
): number {
  return Math.ceil(
    estimateCompletionDays({
      remainingAyahs,
      currentDailyPace: startDaily,
      targetDailyPace: peakDaily,
      growthStyle: style,
    }) / 7
  );
}

function computeAdaptiveMilestones(
  currentVelocityPerDay: number,
  peakVelocityPerDay: number,
  style: GrowthStyle
): AdaptiveMilestone[] {
  if (currentVelocityPerDay >= peakVelocityPerDay) return [];
  const relevant = PACE_MILESTONES.filter(
    (m) => m.ayahsPerDay > currentVelocityPerDay && m.ayahsPerDay <= peakVelocityPerDay
  );
  if (relevant.length === 0) return [];
  const dailyGrowth = GROWTH_SPEED_PER_MONTH[style] / DAYS_PER_MONTH;
  return relevant.map((m) => {
    const daysToReach = (m.ayahsPerDay - currentVelocityPerDay) / dailyGrowth;
    const weeksFromNow = Math.max(1, Math.ceil(daysToReach / 7));
    return { label: m.label, ayahsPerDay: m.ayahsPerDay, weeksFromNow };
  });
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const {
    growthStyle,
    configuredStartPacePerDay,
    configuredPeakPacePerDay,
    remainingAyahs,
    dailyEntries,
  } = input;

  const { velocity: observedVelocity, activeDays } = computeObservedVelocity(dailyEntries);
  const confidence = getConfidenceLevel(activeDays);
  const effectiveVelocity = getEffectiveVelocity(
    observedVelocity,
    configuredStartPacePerDay,
    confidence
  );

  // Peak is capped at the user's stated ceiling; never exceed it
  const projectedPeak = Math.min(
    configuredPeakPacePerDay,
    Math.max(effectiveVelocity, configuredPeakPacePerDay)
  );

  const estimatedCompletionWeeks = simulateCompletionWeeks(
    effectiveVelocity,
    projectedPeak,
    growthStyle,
    remainingAyahs
  );

  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(
    estimatedCompletionDate.getDate() + estimatedCompletionWeeks * 7
  );

  const milestones = computeAdaptiveMilestones(effectiveVelocity, projectedPeak, growthStyle);

  const isAheadOfBaseline =
    confidence !== "cold" && observedVelocity >= configuredStartPacePerDay * 1.2;

  return {
    observedVelocityPerDay: observedVelocity,
    projectedPeakVelocityPerDay: projectedPeak,
    estimatedCompletionWeeks,
    estimatedCompletionDate,
    milestones,
    confidence,
    activeDayCount: activeDays,
    isAheadOfBaseline,
  };
}

const EASING_CURVE: Record<GrowthStyle, number> = {
  gentle: 1.45,
  medium: 1.1,
  fast: 0.8,
};

/**
 * Replaces buildGradualWeeklyPlan from AyahRangeModal.
 * Returns an array of length totalWeeks: ramp from startPerWeek to peakPerWeek,
 * then flat at peakPerWeek for the remainder. ramp duration is derived via
 * estimatePeakWeeks so the easing and the capacity simulation stay in sync.
 */
export function buildAdaptiveWeeklyPlan(
  startPerWeek: number,
  peakPerWeek: number,
  style: GrowthStyle,
  totalWeeks: number
): number[] {
  if (totalWeeks <= 0) return [];
  const rampWeeks = estimatePeakWeeks(startPerWeek / 7, peakPerWeek / 7, style);
  const curve = EASING_CURVE[style];

  return Array.from({ length: totalWeeks }, (_, index) => {
    if (rampWeeks <= 1 || index >= rampWeeks - 1) return Math.round(peakPerWeek);
    const t = index / (rampWeeks - 1);
    const eased = Math.pow(t, curve);
    return Math.max(1, Math.round(startPerWeek + (peakPerWeek - startPerWeek) * eased));
  });
}

/**
 * Replaces getPeakRampWeeks from AyahRangeModal.
 * Returns weeks until daily capacity reaches peakPerDay starting from startPerDay.
 */
export function estimatePeakWeeks(
  startPerDay: number,
  peakPerDay: number,
  style: GrowthStyle
): number {
  if (startPerDay >= peakPerDay) return 0;
  let current = Math.max(0.1, startPerDay);
  for (let week = 1; week <= 1040; week++) {
    current = advanceCapacity(current, peakPerDay, style);
    if (current >= peakPerDay) return week;
  }
  return 1040;
}
