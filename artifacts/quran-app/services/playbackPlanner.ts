import {
  createPlaybackRange,
  createUstadhModePlan,
  getAudioSegments,
  resolveMadeenanAssetUrl,
  type AudioSegment,
  type AudioSegmentsResponse,
  type PlaybackPlanResponse,
  type PlaybackTimingStep,
} from "@/services/madeenanApi";
import { getCachedAyahAudioUri, getVerseKey } from "@/services/offlineQuranCache";
import { fetchWordTranslations, getAudioUrl } from "@/services/quranApi";

export interface PlaybackStep {
  id: string;
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  sourceUri: string;
  remoteUrl: string;
  startMs?: number;
  endMs?: number;
  repeatCount: number;
  pauseAfterMs?: number;
  playbackRate: number;
  label?: string;
}

export interface PlaybackPlan {
  id: string;
  mode: "ayah" | "word" | "section" | "range" | "ustadh";
  steps: PlaybackStep[];
}

export interface SectionSelection {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  startWord: number;
  endWord: number;
  repeatCount: number;
  playbackRate: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getRepeat(value: unknown, fallback: number): number {
  const next = getNumber(value, fallback);
  return Math.max(1, Math.min(999, next));
}

function getStepStartMs(value: unknown): number | undefined {
  const record = asRecord(value);
  const start = getNumber(
    record.startMs ?? record.start_ms ?? record.timestampFrom ?? record.timestamp_from,
    NaN,
  );
  return Number.isFinite(start) ? start : undefined;
}

function getStepEndMs(value: unknown): number | undefined {
  const record = asRecord(value);
  const end = getNumber(
    record.endMs ?? record.end_ms ?? record.timestampTo ?? record.timestamp_to,
    NaN,
  );
  return Number.isFinite(end) ? end : undefined;
}

function getWordPosition(segment: AudioSegment | Record<string, unknown>): number {
  const record = asRecord(segment);
  return getNumber(record.wordPosition ?? record.word_position ?? record.position, NaN);
}

function getSegmentVerseKey(segment: AudioSegment | Record<string, unknown>, fallback: string): string {
  const record = asRecord(segment);
  return getString(record.verseKey ?? record.verse_key ?? record.key, fallback);
}

function getSegmentAyah(segment: AudioSegment | Record<string, unknown>, fallback: number): number {
  const record = asRecord(segment);
  const ayah = getNumber(record.ayahNumber ?? record.ayah_number ?? record.verseNumber ?? record.verse_number, NaN);
  if (Number.isFinite(ayah)) return ayah;
  const key = getSegmentVerseKey(record, "");
  const parsed = Number(key.split(":")[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractResponseSteps(response: PlaybackPlanResponse | unknown): PlaybackTimingStep[] {
  if (Array.isArray(response)) return response as PlaybackTimingStep[];
  const record = asRecord(response);
  for (const key of ["steps", "segments", "plan", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value as PlaybackTimingStep[];
  }
  const nested = record.data;
  if (nested && nested !== response) return extractResponseSteps(nested);
  return [];
}

async function resolveAudioSource(options: {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  candidateUrl?: string | null;
}): Promise<{ sourceUri: string; remoteUrl: string }> {
  const verseKey = getVerseKey(options.surahNumber, options.ayahNumber);
  const local = await getCachedAyahAudioUri(verseKey, options.reciterId);
  const remoteUrl = resolveMadeenanAssetUrl(options.candidateUrl)
    ?? await getAudioUrl(options.surahNumber, options.ayahNumber, options.reciterId);
  return { sourceUri: local ?? remoteUrl, remoteUrl };
}

async function normalizeTimingStep(options: {
  raw: PlaybackTimingStep | Record<string, unknown>;
  index: number;
  fallbackSurah: number;
  fallbackAyah: number;
  reciterId: number;
  fallbackRepeat: number;
  fallbackRate: number;
}): Promise<PlaybackStep> {
  const raw = asRecord(options.raw);
  const verseKey = getString(raw.verseKey ?? raw.verse_key ?? raw.key, "");
  const ayahNumber = getNumber(
    raw.ayahNumber ?? raw.ayah_number ?? raw.verseNumber ?? raw.verse_number,
    verseKey ? Number(verseKey.split(":")[1]) : options.fallbackAyah,
  );
  const surahNumber = getNumber(
    raw.chapterNumber ?? raw.chapter_number ?? raw.surahNumber ?? raw.surah_number,
    verseKey ? Number(verseKey.split(":")[0]) : options.fallbackSurah,
  );
  const candidateUrl = getString(raw.audioUrl ?? raw.audio_url ?? raw.url, "");
  const audio = await resolveAudioSource({
    surahNumber,
    ayahNumber,
    reciterId: options.reciterId,
    candidateUrl,
  });

  return {
    id: `${surahNumber}:${ayahNumber}:${options.index}:${getStepStartMs(raw) ?? 0}`,
    verseKey: getVerseKey(surahNumber, ayahNumber),
    surahNumber,
    ayahNumber,
    sourceUri: audio.sourceUri,
    remoteUrl: audio.remoteUrl,
    startMs: getStepStartMs(raw),
    endMs: getStepEndMs(raw),
    repeatCount: getRepeat(raw.repeatCount ?? raw.repeat_count, options.fallbackRepeat),
    pauseAfterMs: getNumber(raw.pauseAfterMs ?? raw.pause_after_ms, 0) || undefined,
    playbackRate: getNumber(raw.playbackRate ?? raw.playback_rate, options.fallbackRate),
    label: typeof raw.label === "string" ? raw.label : undefined,
  };
}

function extractWordSegments(
  response: AudioSegmentsResponse | AudioSegment[],
  fallbackSurah: number,
): {
  audioUrl?: string;
  segments: Array<AudioSegment & { startMs?: number; endMs?: number; wordPosition?: number; verseKey?: string }>;
} {
  if (Array.isArray(response)) {
    return {
      segments: response.map((segment) => ({
        ...segment,
        wordPosition: getWordPosition(segment),
        startMs: getStepStartMs(segment),
        endMs: getStepEndMs(segment),
        verseKey: getSegmentVerseKey(segment, ""),
      })),
    };
  }

  const audioUrl = resolveMadeenanAssetUrl(
    response.audioUrl ?? response.url ?? response.raw?.audio_file?.audio_url,
  ) ?? undefined;
  const rawTimestamps = response.raw?.audio_file?.timestamps ?? [];
  if (rawTimestamps.length > 0) {
    return {
      audioUrl,
      segments: rawTimestamps.flatMap((timestamp) => {
        const verseKey = timestamp.verse_key ?? "";
        const ayahNumber = Number(verseKey.split(":")[1]);
        return (timestamp.segments ?? [])
          .filter((row) => Array.isArray(row) && row.length >= 3)
          .map((row) => ({
            verseKey,
            ayahNumber: Number.isFinite(ayahNumber) ? ayahNumber : undefined,
            wordPosition: row[0],
            startMs: row[1],
            endMs: row[2],
          }));
      }),
    };
  }

  return {
    audioUrl,
    segments: (response.segments ?? []).map((segment) => ({
      ...segment,
      verseKey: getSegmentVerseKey(segment, ""),
      ayahNumber: getSegmentAyah(segment, fallbackSurah),
      wordPosition: getWordPosition(segment),
      startMs: getStepStartMs(segment),
      endMs: getStepEndMs(segment),
    })),
  };
}

async function getWordSegments(
  surahNumber: number,
  ayahNumber: number,
  reciterId: number,
): Promise<{
  audioUrl?: string;
  segments: Array<AudioSegment & { startMs?: number; endMs?: number; wordPosition?: number; verseKey?: string }>;
}> {
  const verseKey = getVerseKey(surahNumber, ayahNumber);
  const response = await getAudioSegments({ chapterNumber: surahNumber, reciterId });
  const extracted = extractWordSegments(response, surahNumber);
  return {
    audioUrl: extracted.audioUrl,
    segments: extracted.segments
    .filter((segment) => getSegmentVerseKey(segment, verseKey) === verseKey || getSegmentAyah(segment, ayahNumber) === ayahNumber)
    .map((segment) => ({
      ...segment,
      wordPosition: getWordPosition(segment),
      startMs: getStepStartMs(segment),
      endMs: getStepEndMs(segment),
    }))
    .filter((segment) => Number.isFinite(segment.wordPosition ?? NaN))
    .sort((a, b) => (a.wordPosition ?? 0) - (b.wordPosition ?? 0)),
  };
}

async function createWordAudioSteps(options: {
  surahNumber: number;
  ayahNumber: number;
  startWord: number;
  endWord: number;
  repeatCount: number;
  playbackRate: number;
}): Promise<PlaybackStep[]> {
  const verseKey = getVerseKey(options.surahNumber, options.ayahNumber);
  const lo = Math.min(options.startWord, options.endWord);
  const hi = Math.max(options.startWord, options.endWord);
  const words = await fetchWordTranslations(options.surahNumber, options.ayahNumber).catch(() => []);
  const selected = words
    .filter((word) => word.position >= lo && word.position <= hi && word.audioUrl)
    .sort((a, b) => a.position - b.position);
  const group = selected.map((word, index): PlaybackStep => {
    const sourceUri = resolveMadeenanAssetUrl(word.audioUrl) ?? word.audioUrl!;
    return {
      id: `word-audio:${verseKey}:${word.position}:${index}`,
      verseKey,
      surahNumber: options.surahNumber,
      ayahNumber: options.ayahNumber,
      sourceUri,
      remoteUrl: sourceUri,
      repeatCount: lo === hi ? options.repeatCount : 1,
      playbackRate: options.playbackRate,
      label: `Word ${word.position}`,
    };
  });
  if (lo === hi) return group;
  return Array.from({ length: Math.max(1, options.repeatCount) }, (_, repeatIndex) =>
    group.map((step) => ({ ...step, id: `${step.id}:r${repeatIndex}` })),
  ).flat();
}

export async function createAyahPlaybackPlan(options: {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  repeatCount: number;
  playbackRate: number;
}): Promise<PlaybackPlan> {
  const audio = await resolveAudioSource(options);
  return {
    id: `ayah:${options.reciterId}:${getVerseKey(options.surahNumber, options.ayahNumber)}`,
    mode: "ayah",
    steps: [{
      id: `ayah:${getVerseKey(options.surahNumber, options.ayahNumber)}`,
      verseKey: getVerseKey(options.surahNumber, options.ayahNumber),
      surahNumber: options.surahNumber,
      ayahNumber: options.ayahNumber,
      sourceUri: audio.sourceUri,
      remoteUrl: audio.remoteUrl,
      repeatCount: options.repeatCount,
      playbackRate: options.playbackRate,
    }],
  };
}

export async function createSectionPlaybackPlan(options: SectionSelection): Promise<PlaybackPlan> {
  const verseKey = getVerseKey(options.surahNumber, options.ayahNumber);
  const [segmentResult, fallbackAudio] = await Promise.all([
    getWordSegments(options.surahNumber, options.ayahNumber, options.reciterId),
    resolveAudioSource(options),
  ]);
  const audio = segmentResult.audioUrl
    ? { sourceUri: segmentResult.audioUrl, remoteUrl: segmentResult.audioUrl }
    : fallbackAudio;
  const lo = Math.min(options.startWord, options.endWord);
  const hi = Math.max(options.startWord, options.endWord);
  const selected = segmentResult.segments.filter((segment) => {
    const pos = segment.wordPosition ?? 0;
    return pos >= lo && pos <= hi;
  });
  if (selected.length === 0) {
    const wordSteps = await createWordAudioSteps(options);
    if (wordSteps.length > 0) {
      return {
        id: `section-word-audio:${options.reciterId}:${verseKey}:${lo}-${hi}`,
        mode: lo === hi ? "word" : "section",
        steps: wordSteps,
      };
    }
  }
  const startMs = selected.length > 0
    ? Math.min(...selected.map((segment) => segment.startMs ?? 0))
    : undefined;
  const endMs = selected.length > 0
    ? Math.max(...selected.map((segment) => segment.endMs ?? segment.startMs ?? 0))
    : undefined;

  return {
    id: `section:${options.reciterId}:${verseKey}:${lo}-${hi}`,
    mode: lo === hi ? "word" : "section",
    steps: [{
      id: `section:${verseKey}:${lo}-${hi}`,
      verseKey,
      surahNumber: options.surahNumber,
      ayahNumber: options.ayahNumber,
      sourceUri: audio.sourceUri,
      remoteUrl: audio.remoteUrl,
      startMs,
      endMs,
      repeatCount: options.repeatCount,
      playbackRate: options.playbackRate,
      label: lo === hi ? `Word ${lo}` : `Words ${lo}-${hi}`,
    }],
  };
}

export async function createRangePlaybackPlan(options: {
  surahNumber: number;
  reciterId: number;
  startAyah: number;
  endAyah: number;
  startWord?: number;
  endWord?: number;
  repeatCount: number;
  playbackRate: number;
}): Promise<PlaybackPlan> {
  if (options.startWord !== undefined && options.endWord !== undefined && options.startAyah === options.endAyah) {
    return createSectionPlaybackPlan({
      surahNumber: options.surahNumber,
      ayahNumber: options.startAyah,
      reciterId: options.reciterId,
      startWord: options.startWord,
      endWord: options.endWord,
      repeatCount: options.repeatCount,
      playbackRate: options.playbackRate,
    });
  }

  const localSteps = await Promise.all(
    Array.from({ length: options.endAyah - options.startAyah + 1 }, (_, index) =>
      createAyahPlaybackPlan({
        surahNumber: options.surahNumber,
        ayahNumber: options.startAyah + index,
        reciterId: options.reciterId,
        repeatCount: options.repeatCount,
        playbackRate: options.playbackRate,
      }).then((plan) => plan.steps[0]),
    ),
  );

  createPlaybackRange({
    chapterNumber: options.surahNumber,
    reciterId: options.reciterId,
    startAyah: options.startAyah,
    endAyah: options.endAyah,
    startWord: options.startWord,
    endWord: options.endWord,
    repeatCount: String(options.repeatCount),
    playbackRate: options.playbackRate,
  }).catch(() => null);

  return {
    id: `range:${options.reciterId}:${options.surahNumber}:${options.startAyah}-${options.endAyah}`,
    mode: "range",
    steps: localSteps,
  };
}

export async function createWordByWordRangePlaybackPlan(options: {
  surahNumber: number;
  reciterId: number;
  startAyah: number;
  endAyah: number;
  wordRepeat: number;
  playbackRate: number;
}): Promise<PlaybackPlan> {
  const steps: PlaybackStep[] = [];

  for (let ayahNumber = options.startAyah; ayahNumber <= options.endAyah; ayahNumber++) {
    const words = await fetchWordTranslations(options.surahNumber, ayahNumber).catch(() => []);
    const playableWords = words.filter((w) => w.audioUrl).sort((a, b) => a.position - b.position);

    for (const word of playableWords) {
      const wordSteps = await createWordAudioSteps({
        surahNumber: options.surahNumber,
        ayahNumber,
        startWord: word.position,
        endWord: word.position,
        repeatCount: options.wordRepeat,
        playbackRate: options.playbackRate,
      });
      steps.push(...wordSteps.map((step, i) => ({
        ...step,
        id: `wbw:${options.surahNumber}:${ayahNumber}:${word.position}:${i}`,
      })));
    }
  }

  return {
    id: `wbw:${options.reciterId}:${options.surahNumber}:${options.startAyah}-${options.endAyah}`,
    mode: "word",
    steps,
  };
}

export async function createUstadhPlaybackPlan(options: {
  surahNumber: number;
  reciterId: number;
  ayahs: number[];
  mode: "new" | "review" | string;
  playbackRate: number;
}): Promise<PlaybackPlan> {
  const response = await createUstadhModePlan({
    chapterNumber: options.surahNumber,
    reciterId: options.reciterId,
    ayahs: options.ayahs,
    mode: options.mode,
    playbackRate: options.playbackRate,
  }).catch(() => null);
  const rawSteps = extractResponseSteps(response);
  const backendRepeats = new Map<number, number>();
  for (const raw of rawSteps) {
    const record = asRecord(raw);
    const verseKey = getString(record.verseKey ?? record.verse_key ?? record.key, "");
    const ayahNumber = getNumber(record.ayahNumber ?? record.ayah_number, verseKey ? Number(verseKey.split(":")[1]) : NaN);
    if (Number.isFinite(ayahNumber)) backendRepeats.set(ayahNumber, getRepeat(record.repeatCount ?? record.repeat_count, 10));
  }

  const steps: PlaybackStep[] = [];
  for (const ayahNumber of options.ayahs) {
    const full = await createAyahPlaybackPlan({
      surahNumber: options.surahNumber,
      ayahNumber,
      reciterId: options.reciterId,
      repeatCount: 1,
      playbackRate: options.playbackRate,
    });
    steps.push({ ...full.steps[0], id: `ustadh-full-before:${full.steps[0].verseKey}` });

    const words = await fetchWordTranslations(options.surahNumber, ayahNumber).catch(() => []);
    const playableWords = words.filter((word) => word.audioUrl).sort((a, b) => a.position - b.position);
    for (let i = 0; i < playableWords.length; i += 3) {
      const first = playableWords[i];
      const last = playableWords[Math.min(i + 2, playableWords.length - 1)];
      if (!first || !last) continue;
      const wordSteps = await createWordAudioSteps({
        surahNumber: options.surahNumber,
        ayahNumber,
        startWord: first.position,
        endWord: last.position,
        repeatCount: 3,
        playbackRate: options.playbackRate,
      });
      steps.push(...wordSteps.map((step, index) => ({
        ...step,
        id: `ustadh-word-section:${step.verseKey}:${i}:${index}`,
        pauseAfterMs: index === wordSteps.length - 1 ? 900 : undefined,
      })));
    }

    const final = await createAyahPlaybackPlan({
      surahNumber: options.surahNumber,
      ayahNumber,
      reciterId: options.reciterId,
      repeatCount: backendRepeats.get(ayahNumber) ?? 3,
      playbackRate: options.playbackRate,
    });
    steps.push({ ...final.steps[0], id: `ustadh-full-after:${final.steps[0].verseKey}` });
  }

  return { id: `ustadh:${options.reciterId}:${options.surahNumber}:${options.ayahs.join(",")}`, mode: "ustadh", steps };
}
