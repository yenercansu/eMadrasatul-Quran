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

function normalizeChapter(chapter: Chapter): ApiSurah {
  return {
    number: Number(chapter.number),
    name: chapter.name,
    englishName: chapter.englishName,
    englishNameTranslation: chapter.englishNameTranslation,
    numberOfAyahs: Number(chapter.numberOfAyahs),
    revelationType: chapter.revelationType,
  };
}

function getVerseNumber(verse: QuranVerse, fallback: number): number {
  if (typeof verse.ayahNumber === "number") return verse.ayahNumber;
  if (typeof verse.verseNumber === "number") return verse.verseNumber;
  const raw = verse.verseKey?.split(":")[1];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getVerseText(verse: QuranVerse): string {
  return verse.textUthmani ?? verse.textArabic ?? verse.text ?? "";
}

function getTranslationText(verse: QuranVerse): string {
  if (Array.isArray(verse.translations) && verse.translations[0]?.text) {
    return verse.translations[0].text ?? "";
  }
  return typeof verse.tafsir === "string" ? verse.tafsir : "";
}

function getTafsirText(verse: QuranVerse): string {
  if (typeof verse.tafsir === "string") return verse.tafsir;
  if (Array.isArray(verse.tafsir) && verse.tafsir[0]?.text) return verse.tafsir[0].text ?? "";
  return getTranslationText(verse);
}

function verseToAyah(verse: QuranVerse, idx: number, kind: "arabic" | "translation" | "transliteration" | "tafsir"): ApiAyah {
  const numberInSurah = getVerseNumber(verse, idx + 1);
  const text =
    kind === "translation"
      ? getTranslationText(verse)
      : kind === "transliteration"
        ? (verse.transliteration ?? "")
        : kind === "tafsir"
          ? getTafsirText(verse)
          : getVerseText(verse);

  return {
    number: idx + 1,
    text,
    numberInSurah,
    juz: verse.juzNumber ?? 1,
    manzil: 1,
    page: verse.pageNumber ?? 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
    verseKey: verse.verseKey,
    words: verse.words,
    audioUrl: verse.audio?.audioUrl ?? verse.audio?.url ?? null,
  };
}

function pageToSurahDetail(page: QuranPage, chapterNumber: number, kind: "arabic" | "translation" | "transliteration" | "tafsir"): SurahDetail {
  const fallbackMeta = SURAH_DATA[chapterNumber - 1];
  const chapter = page.chapter;
  const verses = page.verses ?? page.ayahs ?? [];
  return {
    number: chapter?.number ?? chapterNumber,
    name: chapter?.name ?? fallbackMeta?.name ?? "",
    englishName: chapter?.englishName ?? fallbackMeta?.englishName ?? `Surah ${chapterNumber}`,
    englishNameTranslation: chapter?.englishNameTranslation ?? "",
    revelationType: chapter?.revelationType ?? "",
    numberOfAyahs: chapter?.numberOfAyahs ?? fallbackMeta?.ayahCount ?? verses.length,
    ayahs: verses.map((verse, idx) => verseToAyah(verse, idx, kind)),
    rawPage: page,
  };
}

export async function fetchSurahs(): Promise<ApiSurah[]> {
  const chapters = await getChapters();
  return chapters.map(normalizeChapter);
}

export async function fetchSurah(
  surahNumber: number,
  _edition = "quran-uthmani",
): Promise<SurahDetail> {
  const meta = SURAH_DATA[surahNumber - 1];
  const page = await getQuranPageWithCache({
    chapterNumber: surahNumber,
    page: 1,
    perPage: meta?.ayahCount ?? 300,
    translations: 131,
    reciterId: 7,
    words: true,
  });
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
  const meta = SURAH_DATA[surahNumber - 1];
  const page = await getQuranPageWithCache({
    chapterNumber: surahNumber,
    page: 1,
    perPage: meta?.ayahCount ?? 300,
    translations: 131,
    reciterId: 7,
    words: true,
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
  const meta = SURAH_DATA[surahNumber - 1];
  const page = await getQuranPageWithCache({
    chapterNumber: surahNumber,
    page: 1,
    perPage: meta?.ayahCount ?? 300,
    translations: 131,
    reciterId: 7,
    tafsir: true,
    words: true,
  });
  return pageToSurahDetail(page, surahNumber, "tafsir");
}

export async function fetchTranslation(
  surahNumber: number,
  _edition: string,
): Promise<SurahDetail> {
  const meta = SURAH_DATA[surahNumber - 1];
  const page = await getQuranPageWithCache({
    chapterNumber: surahNumber,
    page: 1,
    perPage: meta?.ayahCount ?? 300,
    translations: 131,
    reciterId: 7,
    words: true,
  });
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
  const verse = (page.verses ?? page.ayahs ?? []).find((v) => getVerseNumber(v, ayahNum) === ayahNum);
  return (verse?.words ?? []).map((word, idx) => ({
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
  const verse = (page.verses ?? page.ayahs ?? []).find((v) => getVerseNumber(v, ayahNum) === ayahNum);
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
