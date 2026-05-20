import { getJuzAyahs, SURAH_DATA, type AyahRef } from "@/constants/surahData";

export const MAX_WEEKLY_AYAHS = 70;

export function getAyahKey(ayah: Pick<AyahRef, "surahNumber" | "ayahNumber">): string {
  return `${ayah.surahNumber}:${ayah.ayahNumber}`;
}

/**
 * Returns the ordered list of ayahs within a memorization goal range.
 * For "juz" path, enumerates ayahs within that juz.
 * For "surah" path, enumerates all ayahs in the surah containing the start.
 * The range is [startAyah, endAyah] inclusive; endAyah defaults to the last
 * ayah in the source if omitted.
 */
export function getGoalRangeAyahs(options: {
  path: "surah" | "juz";
  targetJuz?: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
}): AyahRef[] {
  const source: AyahRef[] =
    options.path === "juz" && options.targetJuz
      ? getJuzAyahs(options.targetJuz)
      : (() => {
          const surah = SURAH_DATA.find(s => s.number === options.startSurahNumber);
          if (!surah) return [];
          return Array.from({ length: surah.ayahCount }, (_, i) => ({
            surahNumber: surah.number,
            surahName: surah.englishName,
            ayahNumber: i + 1,
          }));
        })();

  const startIdx = source.findIndex(
    a => a.surahNumber === options.startSurahNumber && a.ayahNumber === options.startAyahNumber,
  );
  if (startIdx < 0) return [];

  const endIdx =
    options.endSurahNumber != null && options.endAyahNumber != null
      ? source.findIndex(
          a => a.surahNumber === options.endSurahNumber && a.ayahNumber === options.endAyahNumber,
        )
      : source.length - 1;

  return source.slice(startIdx, endIdx >= startIdx ? endIdx + 1 : undefined);
}

export function isSurahFullyMemorized(surahNumber: number, memorized: Set<string>): boolean {
  const surah = SURAH_DATA[surahNumber - 1];
  if (!surah) return false;
  for (let ayah = 1; ayah <= surah.ayahCount; ayah++) {
    if (!memorized.has(`${surahNumber}:${ayah}`)) return false;
  }
  return true;
}

export function isJuzFullyMemorized(juz: number, memorized: Set<string>): boolean {
  const ayahs = getJuzAyahs(juz);
  return ayahs.length > 0 && ayahs.every(a => memorized.has(getAyahKey(a)));
}

export function findNextIncompleteSurah(
  currentSurahNumber: number,
  memorizedAyahKeys: string[],
): typeof SURAH_DATA[number] | null {
  const memorized = new Set(memorizedAyahKeys);
  const isFullyDone = (n: number) => isSurahFullyMemorized(n, memorized);
  const after = SURAH_DATA.find(s => s.number > currentSurahNumber && !isFullyDone(s.number));
  if (after) return after;
  return SURAH_DATA.find(s => !isFullyDone(s.number)) ?? null;
}

export function findNextIncompleteJuz(
  currentJuz: number,
  memorizedAyahKeys: string[],
): number | null {
  const memorized = new Set(memorizedAyahKeys);
  for (let juz = currentJuz + 1; juz <= 30; juz++) {
    if (!isJuzFullyMemorized(juz, memorized)) return juz;
  }
  for (let juz = 1; juz <= 30; juz++) {
    if (!isJuzFullyMemorized(juz, memorized)) return juz;
  }
  return null;
}

export function getFirstUnmemorizedAyah(
  ayahs: AyahRef[],
  memorizedAyahKeys: string[],
): AyahRef | null {
  const memorized = new Set(memorizedAyahKeys);
  return ayahs.find(a => !memorized.has(getAyahKey(a))) ?? null;
}

export function getNextAyahAfter(
  ayah: Pick<AyahRef, "surahNumber" | "ayahNumber">,
): AyahRef | null {
  const surah = SURAH_DATA.find(s => s.number === ayah.surahNumber);
  if (!surah) return null;
  if (ayah.ayahNumber < surah.ayahCount) {
    return { surahNumber: surah.number, surahName: surah.englishName, ayahNumber: ayah.ayahNumber + 1 };
  }
  const nextSurah = SURAH_DATA.find(s => s.number === ayah.surahNumber + 1);
  return nextSurah ? { surahNumber: nextSurah.number, surahName: nextSurah.englishName, ayahNumber: 1 } : null;
}

export function buildWeeklyGoal(options: {
  path: "surah" | "juz";
  targetJuz?: number;
  startSurahNumber: number;
  startAyahNumber: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
  requestedAyahsPerWeek: number;
  memorizedAyahKeys: string[];
}): {
  ayahsPerWeek: number;
  startSurahNumber: number;
  startAyahNumber: number;
  weeklyTargetAyahKeys: string[];
} {
  const memorized = new Set(options.memorizedAyahKeys);
  const remaining = getGoalRangeAyahs(options).filter(a => !memorized.has(getAyahKey(a)));
  const target = remaining.slice(0, Math.min(MAX_WEEKLY_AYAHS, options.requestedAyahsPerWeek));
  const first = target[0];
  return {
    ayahsPerWeek: Math.max(1, target.length || Math.min(MAX_WEEKLY_AYAHS, options.requestedAyahsPerWeek)),
    startSurahNumber: first?.surahNumber ?? options.startSurahNumber,
    startAyahNumber: first?.ayahNumber ?? options.startAyahNumber,
    weeklyTargetAyahKeys: target.map(getAyahKey),
  };
}
