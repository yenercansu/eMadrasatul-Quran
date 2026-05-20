import { useMemo } from "react";
import { useQuran } from "@/contexts/QuranContext";
import { getGoalRangeAyahs, getAyahKey } from "@/services/hifzLogic";
import { computeForecast, type ForecastResult } from "@/utils/forecastEngine";

const TOTAL_AYAHS = 6236;

/**
 * Returns a live ForecastResult derived from the user's actual memorization
 * history. Recalculates whenever dailyEntries or memorizedAyahKeys change.
 *
 * Returns null when:
 * - No goal exists
 * - The goal uses steady memorization style with no gradualIncreaseStyle
 *   (those goals use simple linear division; this hook handles adaptive/gradual)
 */
export function useAdaptiveForecast(): ForecastResult | null {
  const { goal, memorizationGoal, dailyEntries, memorizedAyahKeys } = useQuran();

  return useMemo(() => {
    if (!goal || !goal.gradualIncreaseStyle) return null;

    const daysPerWeek = Math.max(1, goal.hifzDaysPerWeek ?? 7);
    const targetDaysPerWeek = Math.max(1, goal.targetHifzDaysPerWeek ?? daysPerWeek);

    // Prefer canonical paces stored at setup time; fall back to weekly-derived values
    // for goals created before canonical tracking was added.
    const derivedStartPace = Math.max(0.1, goal.ayahsPerWeek / daysPerWeek);
    const peakWeekly = goal.targetAyahsPerWeek ?? goal.ayahsPerWeek;
    const derivedPeakPace = Math.max(derivedStartPace, peakWeekly / targetDaysPerWeek);

    const configuredStartPacePerDay = goal.startCanonicalAyahsPerDay ?? derivedStartPace;
    const configuredPeakPacePerDay = goal.targetCanonicalAyahsPerDay ?? derivedPeakPace;

    const remainingAyahs = computeRemainingAyahs(goal, memorizationGoal, memorizedAyahKeys);

    return computeForecast({
      growthStyle: goal.gradualIncreaseStyle,
      configuredStartPacePerDay,
      configuredPeakPacePerDay,
      remainingAyahs,
      goalStartDate: goal.startDate,
      dailyEntries,
    });
  }, [goal, memorizationGoal, dailyEntries, memorizedAyahKeys]);
}

function computeRemainingAyahs(
  goal: NonNullable<ReturnType<typeof useQuran>["goal"]>,
  memorizationGoal: ReturnType<typeof useQuran>["memorizationGoal"],
  memorizedAyahKeys: string[]
): number {
  const memorizedSet = new Set(memorizedAyahKeys);

  // Pace goal: remaining = full Quran minus all memorized
  if (!memorizationGoal || memorizationGoal.path === "pace") {
    return Math.max(0, TOTAL_AYAHS - memorizedAyahKeys.length);
  }

  // Surah / juz goal: compute the goal range then subtract memorized in that range
  if (
    goal.startSurahNumber == null ||
    goal.startAyahNumber == null ||
    goal.endSurahNumber == null ||
    goal.endAyahNumber == null
  ) {
    return Math.max(0, TOTAL_AYAHS - memorizedAyahKeys.length);
  }

  const rangeAyahs = getGoalRangeAyahs({
    path: memorizationGoal.path,
    targetJuz: memorizationGoal.targetJuz,
    startSurahNumber: goal.startSurahNumber,
    startAyahNumber: goal.startAyahNumber,
    endSurahNumber: goal.endSurahNumber,
    endAyahNumber: goal.endAyahNumber,
  });

  const totalRange = rangeAyahs.length;
  const memorizedInRange = rangeAyahs.filter((a) => memorizedSet.has(getAyahKey(a))).length;
  return Math.max(0, totalRange - memorizedInRange);
}
