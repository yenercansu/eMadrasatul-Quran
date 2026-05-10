import {
  getAudioSegments,
  getChapters,
  getFirstAudioUrl,
  getQuranPageWithCache,
  type Chapter,
  type QuranPage,
  type QuranVerse,
  type QuranWord,
} from "@/services/madeenanApi";
import { SURAH_DATA } from "@/constants/surahData";

export interface ApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface ApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
  verseKey?: string;
  words?: QuranWord[];
  audioUrl?: string | null;
}

export interface ApiEditionAyah extends ApiAyah {
  audio?: string;
  audioSecondary?: string[];
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: ApiAyah[];
  rawPage?: QuranPage;
}

export interface AyahWithTranslation {
  arabic: ApiAyah;
  translation?: ApiAyah;
  transliteration?: ApiAyah;
}

export interface WordTranslation {
  arabic: string;
  translation: string;
  position: number;
  transliteration?: string;
  audioSegmentStartMs?: number;
  audioSegmentEndMs?: number;
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getTextValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getTextValue(record.text ?? record.name ?? record.value, fallback);
  }
  return fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function normalizeChapter(chapter: Chapter | Record<string, unknown>): ApiSurah {
  const number = getNumber(
    (chapter as Record<string, unknown>).number ??
      (chapter as Record<string, unknown>).id ??
      (chapter as Record<string, unknown>).chapterNumber ??
      (chapter as Record<string, unknown>).chapter_number,
  );
  return {
    number,
    name: getString(
      (chapter as Record<string, unknown>).name ??
        (chapter as Record<string, unknown>).nameArabic ??
        (chapter as Record<string, unknown>).name_arabic,
    ),
    englishName: getString(
      (chapter as Record<string, unknown>).englishName ??
        (chapter as Record<string, unknown>).nameSimple ??
        (chapter as Record<string, unknown>).name_simple,
      `Surah ${number}`,
    ),
    englishNameTranslation: getString(
      (chapter as Record<string, unknown>).englishNameTranslation ??
        (chapter as Record<string, unknown>).translatedName ??
        (chapter as Record<string, unknown>).translated_name,
    ),
    numberOfAyahs: getNumber(
      (chapter as Record<string, unknown>).numberOfAyahs ??
        (chapter as Record<string, unknown>).versesCount ??
        (chapter as Record<string, unknown>).verses_count,
    ),
    revelationType: getString(
      (chapter as Record<string, unknown>).revelationType ??
        (chapter as Record<string, unknown>).revelationPlace ??
        (chapter as Record<string, unknown>).revelation_place,
    ),
  };
}

function bundledSurah(chapterNumber: number): ApiSurah {
  const meta = SURAH_DATA[chapterNumber - 1];
  return {
    number: meta?.number ?? chapterNumber,
    name: meta?.name ?? "",
    englishName: meta?.englishName ?? `Surah ${chapterNumber}`,
    englishNameTranslation: "",
    numberOfAyahs: meta?.ayahCount ?? 0,
    revelationType: "",
  };
}

function extractChapterArray(data: unknown): Array<Chapter | Record<string, unknown>> {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["chapters", "results", "items"]) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
    const nested = record.data;
    if (nested && nested !== data) return extractChapterArray(nested);
  }
  throw new Error("Madeenan /quran/chapters returned an unexpected data shape.");
}

function getVerseNumber(verse: QuranVerse, fallback: number): number {
  const record = asRecord(verse);
  const direct = getNumber(
    record.ayahNumber ??
      record.ayah_number ??
      record.verseNumber ??
      record.verse_number ??
      record.numberInSurah ??
      record.number_in_surah,
    NaN,
  );
  if (Number.isFinite(direct)) return direct;
  const key = getString(record.verseKey ?? record.verse_key ?? record.key);
  const raw = key.split(":")[1];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getVerseText(verse: QuranVerse): string {
  const record = asRecord(verse);
  return getTextValue(
    record.textUthmani ??
      record.text_uthmani ??
      record.textArabic ??
      record.text_arabic ??
      record.arabic ??
      record.arabicText ??
      record.arabic_text ??
      record.textImlaei ??
      record.text_imlaei ??
      record.textUthmaniSimple ??
      record.text_uthmani_simple ??
      record.text,
  );
}

function getTranslationText(verse: QuranVerse): string {
  const record = asRecord(verse);
  if (Array.isArray(record.translations) && record.translations.length > 0) {
    return getTextValue(asRecord(record.translations[0]).text ?? record.translations[0]);
  }
  return getTextValue(
    record.translation ??
      record.translationText ??
      record.translation_text ??
      record.translatedText ??
      record.translated_text ??
      record.tafsir,
  );
}

function getTafsirText(verse: QuranVerse): string {
  const record = asRecord(verse);
  if (Array.isArray(record.tafsir) && record.tafsir.length > 0) return getTextValue(asRecord(record.tafsir[0]).text ?? record.tafsir[0]);
  if (Array.isArray(record.tafsirs) && record.tafsirs.length > 0) return getTextValue(asRecord(record.tafsirs[0]).text ?? record.tafsirs[0]);
  const tafsir = getTextValue(record.tafsir ?? record.tafsirText ?? record.tafsir_text);
  if (tafsir) return tafsir;
  return getTranslationText(verse);
}

function getTransliterationText(verse: QuranVerse): string {
  const record = asRecord(verse);
  const transliteration = asRecord(record.transliteration);
  return getTextValue(
    record.transliteration ??
      transliteration.text ??
      transliteration.textUtf8 ??
      transliteration.text_utf8 ??
      record.transliterationText ??
      record.transliteration_text,
  );
}

function normalizeWord(word: unknown, idx: number): QuranWord {
  const record = asRecord(word);
  const translation = record.translation ?? record.translationText ?? record.translation_text;
  const transliteration = record.transliteration ?? record.transliterationText ?? record.transliteration_text;
  const startMs = getNumber(record.audioSegmentStartMs ?? record.audio_segment_start_ms ?? record.startMs ?? record.start_ms, NaN);
  const endMs = getNumber(record.audioSegmentEndMs ?? record.audio_segment_end_ms ?? record.endMs ?? record.end_ms, NaN);
  return {
    id: record.id as number | string | undefined,
    position: getNumber(record.position ?? record.wordPosition ?? record.word_position, idx + 1),
    wordPosition: getNumber(record.wordPosition ?? record.word_position ?? record.position, idx + 1),
    text: getTextValue(record.text ?? record.textUthmani ?? record.text_uthmani ?? record.textArabic ?? record.text_arabic),
    textArabic: getTextValue(record.textArabic ?? record.text_arabic ?? record.textUthmani ?? record.text_uthmani ?? record.arabic ?? record.text),
    textUthmani: getTextValue(record.textUthmani ?? record.text_uthmani ?? record.text),
    translation: getTextValue(translation),
    transliteration: getTextValue(transliteration),
    audioSegmentStartMs: Number.isFinite(startMs) ? startMs : undefined,
    audioSegmentEndMs: Number.isFinite(endMs) ? endMs : undefined,
    segmentId: record.segmentId as string | number | undefined,
  };
}

function getVerseKey(verse: QuranVerse, chapterNumber: number, numberInSurah: number): string {
  const record = asRecord(verse);
  return getString(record.verseKey ?? record.verse_key ?? record.key, `${chapterNumber}:${numberInSurah}`);
}

function getVerseAudioUrl(verse: QuranVerse): string | null {
  const record = asRecord(verse);
  const audio = asRecord(record.audio);
  return getString(
    record.audioUrl ??
      record.audio_url ??
      audio.audioUrl ??
      audio.audio_url ??
      audio.url ??
      audio.src,
    "",
  ) || null;
}

async function fetchSurahPage(chapterNumber: number, params: { page: number; perPage: number; tafsir?: boolean } = { page: 1, perPage: 10 }): Promise<QuranPage> {
  return getQuranPageWithCache({
    chapterNumber,
    page: params.page,
    perPage: params.perPage,
    translations: 131,
    reciterId: 7,
    tafsir: params.tafsir,
    words: true,
  });
}

function verseToAyah(verse: QuranVerse, idx: number, kind: "arabic" | "translation" | "transliteration" | "tafsir"): ApiAyah {
  const numberInSurah = getVerseNumber(verse, idx + 1);
  const record = asRecord(verse);
  const text =
    kind === "translation"
      ? getTranslationText(verse)
      : kind === "transliteration"
        ? getTransliterationText(verse)
        : kind === "tafsir"
          ? getTafsirText(verse)
          : getVerseText(verse);

  return {
    number: idx + 1,
    text,
    numberInSurah,
    juz: getNumber(record.juzNumber ?? record.juz_number ?? record.juz, 1),
    manzil: 1,
    page: getNumber(record.pageNumber ?? record.page_number ?? record.page, 1),
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
    verseKey: getVerseKey(verse, getNumber(record.chapterNumber ?? record.chapter_number, 0), numberInSurah),
    words: Array.isArray(record.words) ? record.words.map(normalizeWord) : [],
    audioUrl: getVerseAudioUrl(verse),
  };
}

function extractQuranPageRecord(page: QuranPage | unknown): Record<string, unknown> {
  const record = asRecord(page);
  for (const key of ["page", "quranPage", "quran_page", "result"]) {
    const value = record[key];
    if (value && typeof value === "object") return asRecord(value);
  }
  const nested = record.data;
  if (nested && typeof nested === "object" && nested !== page) return extractQuranPageRecord(nested);
  return record;
}

function extractVerses(page: QuranPage | unknown): QuranVerse[] {
  const record = extractQuranPageRecord(page);
  for (const key of ["verses", "ayahs", "ayat", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value as QuranVerse[];
    if (value && typeof value === "object") {
      const nested = extractVerses(value);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function pageToSurahDetail(page: QuranPage, chapterNumber: number, kind: "arabic" | "translation" | "transliteration" | "tafsir"): SurahDetail {
  const fallbackMeta = SURAH_DATA[chapterNumber - 1];
  const pageRecord = extractQuranPageRecord(page);
  const chapter = asRecord(pageRecord.chapter ?? pageRecord.surah);
  const verses = extractVerses(page);
  if (__DEV__) {
    console.info("[Madeenan Quran Mapper] page shape", {
      chapterNumber,
      kind,
      pageKeys: Object.keys(pageRecord),
      verseCount: verses.length,
      firstVerseKeys: verses[0] ? Object.keys(asRecord(verses[0])) : [],
      firstVerseText: verses[0] ? getVerseText(verses[0]).slice(0, 24) : "",
    });
  }
  return {
    number: getNumber(chapter.number ?? chapter.id ?? chapter.chapterNumber ?? chapter.chapter_number, chapterNumber),
    name: getString(chapter.name ?? chapter.nameArabic ?? chapter.name_arabic, fallbackMeta?.name ?? ""),
    englishName: getString(chapter.englishName ?? chapter.nameSimple ?? chapter.name_simple, fallbackMeta?.englishName ?? `Surah ${chapterNumber}`),
    englishNameTranslation: getTextValue(chapter.englishNameTranslation ?? chapter.translatedName ?? chapter.translated_name),
    revelationType: getString(chapter.revelationType ?? chapter.revelationPlace ?? chapter.revelation_place),
    numberOfAyahs: getNumber(chapter.numberOfAyahs ?? chapter.versesCount ?? chapter.verses_count, fallbackMeta?.ayahCount ?? verses.length),
    ayahs: verses.map((verse, idx) => verseToAyah(verse, idx, kind)),
    rawPage: page,
  };
}

export async function fetchSurahs(): Promise<ApiSurah[]> {
  const chapters = extractChapterArray(await getChapters());
  const remoteByNumber = new Map(
    chapters
      .map(normalizeChapter)
      .filter((chapter) => chapter.number >= 1 && chapter.number <= 114)
      .map((chapter) => [chapter.number, chapter]),
  );
  const normalized = SURAH_DATA.map((meta) => ({
    ...bundledSurah(meta.number),
    ...remoteByNumber.get(meta.number),
    number: meta.number,
    name: remoteByNumber.get(meta.number)?.name || meta.name,
    englishName: remoteByNumber.get(meta.number)?.englishName || meta.englishName,
    numberOfAyahs: remoteByNumber.get(meta.number)?.numberOfAyahs || meta.ayahCount,
  }));
  if (__DEV__) {
    console.info("[Madeenan Quran Mapper] chapters", {
      count: normalized.length,
      first: normalized[0],
      last: normalized[normalized.length - 1],
    });
  }
  return normalized;
}

export async function fetchSurah(
  surahNumber: number,
  _edition = "quran-uthmani",
): Promise<SurahDetail> {
  const page = await fetchSurahPage(surahNumber);
  return pageToSurahDetail(page, surahNumber, "arabic");
}

export async function fetchSurahWithTranslations(
  surahNumber: number,
  _translationEdition = "en.sahih",
  _transliterationEdition = "en.transliteration",
): Promise<{
  arabic: SurahDetail;
  translation: SurahDetail;
  transliteration: SurahDetail;
}> {
  const page = await fetchSurahPage(surahNumber, {
    page: 1,
    perPage: SURAH_DATA[surahNumber - 1]?.ayahCount && SURAH_DATA[surahNumber - 1]!.ayahCount <= 20
      ? SURAH_DATA[surahNumber - 1]!.ayahCount
      : 10,
  });

  return {
    arabic: pageToSurahDetail(page, surahNumber, "arabic"),
    translation: pageToSurahDetail(page, surahNumber, "translation"),
    transliteration: pageToSurahDetail(page, surahNumber, "transliteration"),
  };
}

export async function fetchTafsir(
  surahNumber: number,
  _edition = "en.maarifulquran",
): Promise<SurahDetail> {
  const page = await fetchSurahPage(surahNumber, { page: 1, perPage: 10, tafsir: true });
  return pageToSurahDetail(page, surahNumber, "tafsir");
}

export async function fetchTranslation(
  surahNumber: number,
  _edition: string,
): Promise<SurahDetail> {
  const page = await fetchSurahPage(surahNumber);
  return pageToSurahDetail(page, surahNumber, "translation");
}

export async function fetchWordTranslations(
  surahNum: number,
  ayahNum: number,
): Promise<WordTranslation[]> {
  const page = await getQuranPageWithCache({
    chapterNumber: surahNum,
    page: Math.max(1, Math.ceil(ayahNum / 10)),
    perPage: 10,
    translations: 131,
    reciterId: 7,
    words: true,
  });
  const verse = extractVerses(page).find((v) => getVerseNumber(v, ayahNum) === ayahNum);
  const words = Array.isArray(asRecord(verse).words) ? asRecord(verse).words as unknown[] : [];
  return words.map(normalizeWord).map((word, idx) => ({
    arabic: word.textArabic ?? word.textUthmani ?? word.text ?? "",
    translation: word.translation ?? "",
    transliteration: word.transliteration,
    position: Number(word.wordPosition ?? word.position ?? idx + 1),
    audioSegmentStartMs: word.audioSegmentStartMs,
    audioSegmentEndMs: word.audioSegmentEndMs,
  }));
}

export async function fetchAyahText(surahNum: number, ayahNum: number): Promise<string> {
  const page = await getQuranPageWithCache({
    chapterNumber: surahNum,
    page: Math.max(1, Math.ceil(ayahNum / 10)),
    perPage: 10,
    translations: 131,
    reciterId: 7,
    words: true,
  });
  const verse = extractVerses(page).find((v) => getVerseNumber(v, ayahNum) === ayahNum);
  return verse ? getVerseText(verse) : "";
}

export async function getAudioUrl(surahNum: number, ayahNum: number, reciterId: string | number): Promise<string> {
  const page = await getQuranPageWithCache({
    chapterNumber: surahNum,
    page: Math.max(1, Math.ceil(ayahNum / 10)),
    perPage: 10,
    translations: 131,
    reciterId: Number(reciterId) || 7,
    words: true,
  });
  const url = getFirstAudioUrl(page, `${surahNum}:${ayahNum}`);
  if (url) return url;

  const segments = await getAudioSegments({ chapterNumber: surahNum, reciterId: Number(reciterId) || 7 });
  const segment = segments.find((s) => s.verseKey === `${surahNum}:${ayahNum}` || s.ayahNumber === ayahNum);
  const candidate = segment?.audioUrl ?? segment?.url;
  if (typeof candidate === "string") return candidate;
  throw new Error("Audio URL is not available from the Madeenan backend.");
}

export const TAJWEED_COLORS: Record<string, string> = {
  ikhfa: "#C8B400",
  ghunna: "#00B4B4",
  idgham: "#2DBB2D",
  qalqala: "#A44A9A",
  madd: "#0080C0",
  ikhfa_shafawi: "#C8B400",
  idgham_shafawi: "#2DBB2D",
  iqlab: "#FF4500",
};
