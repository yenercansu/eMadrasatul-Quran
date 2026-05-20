export type GrowthStyle = "gentle" | "medium" | "fast";

interface GrowthConfig {
  weeklyRate: number;
  minDailyIncrease: number;
}

export const GROWTH_STYLE_CONFIG: Record<GrowthStyle, GrowthConfig> = {
  gentle: { weeklyRate: 0.10, minDailyIncrease: 0.25 },
  medium: { weeklyRate: 0.18, minDailyIncrease: 0.50 },
  fast:   { weeklyRate: 0.25, minDailyIncrease: 0.75 },
};

export const PACE_MILESTONES = [
  { label: "3 ayahs/day",  ayahsPerDay: 3  },
  { label: "¼ page/day",   ayahsPerDay: 5  },
  { label: "½ page/day",   ayahsPerDay: 10 },
  { label: "1 page/day",   ayahsPerDay: 20 },
  { label: "2 pages/day",  ayahsPerDay: 40 },
] as const;

export interface PaceMilestone {
  label: string;
  ayahsPerDay: number;
  weeksToReach: number;
}

export const DAYS_PER_MONTH = 30.44;

// How many ayahs/day of capacity the user gains per month for each style.
// The ramp duration is NOT fixed — it depends on the distance (paceGap) between
// the user's current pace and target pace: monthsToTarget = ceil(paceGap / growthSpeed).
export const GROWTH_SPEED_PER_MONTH: Record<GrowthStyle, number> = {
  gentle: 3,   // +3 ayahs/day capacity per month
  medium: 6,   // +6 ayahs/day capacity per month
  fast:   10,  // +10 ayahs/day capacity per month
};

export interface EstimateCompletionInput {
  remainingAyahs: number;
  currentDailyPace: number;
  targetDailyPace: number;
  growthStyle: GrowthStyle;
}

/**
 * Canonical forecast function. Simulates day-by-day memorization.
 * Pace increases linearly by (growthSpeed / DAYS_PER_MONTH) ayahs/day each day
 * until targetDailyPace is reached, then stays flat.
 * Returns total days until remainingAyahs reaches 0 (capped at 3650 = 10 years).
 * Use this everywhere so numbers never diverge.
 */
export function estimateCompletionDays({
  remainingAyahs,
  currentDailyPace,
  targetDailyPace,
  growthStyle,
}: EstimateCompletionInput): number {
  if (remainingAyahs <= 0) return 0;
  const dailyGrowth = GROWTH_SPEED_PER_MONTH[growthStyle] / DAYS_PER_MONTH;

  // Phase 1: ramp from current pace to target pace
  const rampDays = dailyGrowth > 0
    ? Math.max(0, (targetDailyPace - currentDailyPace) / dailyGrowth)
    : 0;

  // Ayahs memorized during the ramp (trapezoidal area under the linear ramp)
  const rampMemorized = ((currentDailyPace + targetDailyPace) / 2) * rampDays;

  // Phase 2: remaining ayahs after ramp, completed at flat target pace
  const remainingAfterRamp = Math.max(0, remainingAyahs - rampMemorized);
  const finalDays = remainingAfterRamp / Math.max(targetDailyPace, 0.1);

  return Math.ceil(rampDays + finalDays);
}

// Thin wrapper for callers that work in weeks.
export function calculateQuranCompletionWeeks(
  startAyahsPerDay: number,
  desiredAyahsPerDay: number,
  style: GrowthStyle,
  remainingAyahs: number
): number {
  return Math.ceil(
    estimateCompletionDays({
      remainingAyahs,
      currentDailyPace: startAyahsPerDay,
      targetDailyPace: desiredAyahsPerDay,
      growthStyle: style,
    }) / 7
  );
}

/**
 * Returns when each intermediate pace milestone is reached.
 * Time is proportional to pace distance: daysToMilestone = gapToMilestone / dailyGrowth.
 */
export function calculatePaceMilestones(
  startAyahsPerDay: number,
  desiredAyahsPerDay: number,
  style: GrowthStyle
): PaceMilestone[] {
  if (startAyahsPerDay >= desiredAyahsPerDay) return [];
  const relevant = PACE_MILESTONES.filter(
    (m) => m.ayahsPerDay > startAyahsPerDay && m.ayahsPerDay <= desiredAyahsPerDay
  );
  if (relevant.length === 0) return [];
  const dailyGrowth = GROWTH_SPEED_PER_MONTH[style] / DAYS_PER_MONTH;
  return relevant.map((m) => {
    const daysToReach = (m.ayahsPerDay - startAyahsPerDay) / dailyGrowth;
    const weeksToReach = Math.max(1, Math.ceil(daysToReach / 7));
    return { label: m.label, ayahsPerDay: m.ayahsPerDay, weeksToReach };
  });
}

// advanceCapacity is still used by buildAdaptiveWeeklyPlan / estimatePeakWeeks in forecastEngine.
export function advanceCapacity(current: number, desired: number, style: GrowthStyle): number {
  const { weeklyRate, minDailyIncrease } = GROWTH_STYLE_CONFIG[style];
  return Math.min(desired, Math.max(current * (1 + weeklyRate), current + minDailyIncrease));
}
