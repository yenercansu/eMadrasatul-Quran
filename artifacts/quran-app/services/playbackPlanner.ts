import {
  createPlaybackRange,
  getAudioSegments,
  resolveMadeenanAssetUrl,
  type AudioSegment,
  type AudioSegmentsResponse,
} from "@/services/madeenanApi";
import { getCachedAyahAudioUri, getVerseKey } from "@/services/offlineQuranCache";
import { fetchWordTranslations, getAudioUrl, type WordTranslation } from "@/services/quranApi";

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

interface WordPlaybackRef {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  position: number;
  audioUrl: string;
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

async function resolveAudioSource(options: {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  candidateUrl?: string | null;
}): Promise<{ sourceUri: string; remoteUrl: string }> {
  const verseKey = getVerseKey(options.surahNumber, options.ayahNumber);
  const local = await getCachedAyahAudioUri(verseKey, options.reciterId);
  const candidateUrl = resolveMadeenanAssetUrl(options.candidateUrl) ?? null;
  if (local) {
    return { sourceUri: local, remoteUrl: candidateUrl ?? local };
  }
  const remoteUrl = candidateUrl ?? await getAudioUrl(options.surahNumber, options.ayahNumber, options.reciterId);
  return { sourceUri: remoteUrl, remoteUrl };
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
    .filter((word) => word.position >= lo && word.position <= hi && word.audioUrl && !isVerseMarkerWord(word))
    .sort((a, b) => a.position - b.position);
  const group = selected.map((word): WordPlaybackRef => ({
    surahNumber: options.surahNumber,
    ayahNumber: options.ayahNumber,
    verseKey,
    position: word.position,
    audioUrl: word.audioUrl!,
  }));
  return repeatWordSequence(group, options.repeatCount, options.playbackRate, "word-audio");
}

function isVerseMarkerWord(word: WordTranslation): boolean {
  return /^\(\d+\)$/.test((word.translation ?? "").trim()) || /^[\u0660-\u0669\d]+$/.test((word.arabic ?? "").trim());
}

function repeatWordSequence(
  words: WordPlaybackRef[],
  repeatCount: number,
  playbackRate: number,
  idPrefix: string,
  pauseAfterLastMs?: number,
): PlaybackStep[] {
  const normalizedRepeat = Math.max(1, repeatCount);
  return Array.from({ length: normalizedRepeat }, (_, repeatIndex) =>
    words.map((word, index): PlaybackStep => {
      const sourceUri = resolveMadeenanAssetUrl(word.audioUrl) ?? word.audioUrl;
      return {
        id: `${idPrefix}:${word.verseKey}:${word.position}:r${repeatIndex}:i${index}`,
        verseKey: word.verseKey,
        surahNumber: word.surahNumber,
        ayahNumber: word.ayahNumber,
        sourceUri,
        remoteUrl: sourceUri,
        repeatCount: 1,
        playbackRate,
        pauseAfterMs: repeatIndex === normalizedRepeat - 1 && index === words.length - 1 ? pauseAfterLastMs : undefined,
        label: `Word ${word.position}`,
      };
    }),
  ).flat();
}

async function getPlayableWordRefs(surahNumber: number, ayahNumber: number): Promise<WordPlaybackRef[]> {
  const verseKey = getVerseKey(surahNumber, ayahNumber);
  const words = await fetchWordTranslations(surahNumber, ayahNumber).catch(() => []);
  return words
    .filter((word) => word.audioUrl && !isVerseMarkerWord(word))
    .sort((a, b) => a.position - b.position)
    .map((word) => ({
      surahNumber,
      ayahNumber,
      verseKey,
      position: word.position,
      audioUrl: word.audioUrl!,
    }));
}

async function getPlayableWordsForRange(
  surahNumber: number,
  ayahs: number[],
): Promise<WordPlaybackRef[]> {
  const groups = await Promise.all(ayahs.map((ayahNumber) => getPlayableWordRefs(surahNumber, ayahNumber)));
  return groups.flat();
}

function createUstadhAyahSteps(words: WordPlaybackRef[], playbackRate: number): PlaybackStep[] {
  const steps: PlaybackStep[] = [];
  const chunkSize = 3;
  const segmentSize = 6;
  let segmentCount = 0;

  for (let segmentStart = 0; segmentStart < words.length; segmentStart += segmentSize) {
    const segment = words.slice(segmentStart, Math.min(segmentStart + segmentSize, words.length));
    if (segment.length === 0) continue;
    segmentCount += 1;

    for (let chunkStart = 0; chunkStart < segment.length; chunkStart += chunkSize) {
      const chunk = segment.slice(chunkStart, Math.min(chunkStart + chunkSize, segment.length));
      if (chunk.length === 0) continue;
      const globalChunkStart = segmentStart + chunkStart;
      steps.push(...repeatWordSequence(chunk, 3, playbackRate, `ustadh-chunk-${globalChunkStart}`, 500));
    }

    steps.push(...repeatWordSequence(segment, 3, playbackRate, `ustadh-segment-${segmentStart}`, 900));
  }

  if (segmentCount > 1) {
    steps.push(...repeatWordSequence(words, 3, playbackRate, `ustadh-ayah-final-${words[0]?.verseKey ?? "unknown"}`, 900));
  }
  return steps;
}

async function getPlayableWordGroupsForRange(
  surahNumber: number,
  ayahs: number[],
): Promise<WordPlaybackRef[][]> {
  return Promise.all(ayahs.map((ayahNumber) => getPlayableWordRefs(surahNumber, ayahNumber)));
}

function createUstadhProgressionSteps(wordGroups: WordPlaybackRef[][], playbackRate: number): PlaybackStep[] {
  const ayahSteps = wordGroups.flatMap((words) => createUstadhAyahSteps(words, playbackRate));
  const allWords = wordGroups.flat();
  if (wordGroups.filter((group) => group.length > 0).length > 1 && allWords.length > 0) {
    return [
      ...ayahSteps,
      ...repeatWordSequence(allWords, 3, playbackRate, "ustadh-final-range", 0),
    ];
  }
  return ayahSteps;
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

  if (options.repeatCount > 1) {
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
  }

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
    const playableWords = words
      .filter((w) => w.audioUrl && !isVerseMarkerWord(w))
      .sort((a, b) => a.position - b.position);

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
  const wordGroups = await getPlayableWordGroupsForRange(options.surahNumber, options.ayahs);
  return {
    id: `ustadh:${options.reciterId}:${options.surahNumber}:${options.ayahs.join(",")}`,
    mode: "ustadh",
    steps: createUstadhProgressionSteps(wordGroups, options.playbackRate),
  };
}
