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
  { label: "¼ page/day",   ayahsPerDay: 4  },
  { label: "½ page/day",   ayahsPerDay: 7  },
  { label: "1 page/day",   ayahsPerDay: 12 },
  { label: "2 pages/day",  ayahsPerDay: 24 },
  { label: "3 pages/day",  ayahsPerDay: 36 },
] as const;

export interface PaceMilestone {
  label: string;
  ayahsPerDay: number;
  weeksToReach: number;
}

function advanceCapacity(current: number, desired: number, style: GrowthStyle): number {
  const { weeklyRate, minDailyIncrease } = GROWTH_STYLE_CONFIG[style];
  return Math.min(desired, Math.max(current * (1 + weeklyRate), current + minDailyIncrease));
}

/**
 * Returns the week each intermediate capacity milestone is first reached,
 * for milestones strictly above startAyahsPerDay and at or below desiredAyahsPerDay.
 */
export function calculatePaceMilestones(
  startAyahsPerDay: number,
  desiredAyahsPerDay: number,
  style: GrowthStyle
): PaceMilestone[] {
  const relevant = PACE_MILESTONES.filter(
    (m) => m.ayahsPerDay > startAyahsPerDay && m.ayahsPerDay <= desiredAyahsPerDay
  );
  if (relevant.length === 0) return [];

  const reached: PaceMilestone[] = [];
  let current = startAyahsPerDay;

  for (let week = 1; week <= 1040 && reached.length < relevant.length; week++) {
    current = advanceCapacity(current, desiredAyahsPerDay, style);
    for (const m of relevant) {
      if (!reached.find((r) => r.label === m.label) && current >= m.ayahsPerDay) {
        reached.push({ label: m.label, ayahsPerDay: m.ayahsPerDay, weeksToReach: week });
      }
    }
  }
  return reached;
}

/**
 * Simulates week-by-week memorization with capacity growth.
 * Returns the number of weeks needed to cover remainingAyahs.
 */
export function calculateQuranCompletionWeeks(
  startAyahsPerDay: number,
  desiredAyahsPerDay: number,
  style: GrowthStyle,
  remainingAyahs: number
): number {
  if (remainingAyahs <= 0) return 0;
  let daily = Math.max(0.1, startAyahsPerDay);
  let remaining = remainingAyahs;
  let weeks = 0;

  while (remaining > 0 && weeks < 1040) {
    remaining -= daily * 7;
    daily = advanceCapacity(daily, desiredAyahsPerDay, style);
    weeks++;
  }
  return weeks;
}
