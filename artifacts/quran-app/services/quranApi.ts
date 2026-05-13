import {
  getAudioSegments,
  getChapters,
  getFirstAudioUrl,
  getQuranPageWithCache,
  resolveMadeenanAssetUrl,
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
  tajweedText?: string;
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
  audioUrl?: string;
  audioSegmentStartMs?: number;
  audioSegmentEndMs?: number;
}

const MEDINAN_SURAHS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110,
]);

const SURAH_TRANSLATION_FALLBACKS = [
  "The Opening", "The Cow", "The Family of Imran", "The Women", "The Table Spread", "The Cattle", "The Heights", "The Spoils of War", "The Repentance", "Jonah",
  "Hud", "Joseph", "The Thunder", "Abraham", "The Rocky Tract", "The Bee", "The Night Journey", "The Cave", "Mary", "Ta-Ha",
  "The Prophets", "The Pilgrimage", "The Believers", "The Light", "The Criterion", "The Poets", "The Ant", "The Stories", "The Spider", "The Romans",
  "Luqman", "The Prostration", "The Confederates", "Sheba", "The Originator", "Ya-Sin", "Those Who Set the Ranks", "The Letter Sad", "The Troops", "The Forgiver",
  "Explained in Detail", "The Consultation", "The Ornaments of Gold", "The Smoke", "The Crouching", "The Wind-Curved Sandhills", "Muhammad", "The Victory", "The Rooms", "The Letter Qaf",
  "The Winnowing Winds", "The Mount", "The Star", "The Moon", "The Most Merciful", "The Inevitable", "The Iron", "The Pleading Woman", "The Exile", "The Woman to be Examined",
  "The Ranks", "Friday", "The Hypocrites", "Mutual Disillusion", "Divorce", "The Prohibition", "The Sovereignty", "The Pen", "The Reality", "The Ascending Stairways",
  "Noah", "The Jinn", "The Enshrouded One", "The Cloaked One", "The Resurrection", "Man", "The Emissaries", "The Tidings", "Those Who Drag Forth", "He Frowned",
  "The Overthrowing", "The Cleaving", "The Defrauding", "The Sundering", "The Mansions of the Stars", "The Nightcomer", "The Most High", "The Overwhelming", "The Dawn", "The City",
  "The Sun", "The Night", "The Morning Hours", "The Relief", "The Fig", "The Clot", "The Power", "The Clear Proof", "The Earthquake", "The Chargers",
  "The Calamity", "Rivalry in World Increase", "The Declining Day", "The Traducer", "The Elephant", "Quraysh", "Small Kindnesses", "Abundance", "The Disbelievers", "The Divine Support",
  "The Palm Fiber", "Sincerity", "The Daybreak", "Mankind",
];

const QURAN_COM_API_BASE_URL = "https://api.quran.com/api/v4";
type QuranComVerseText = {
  textUthmani: string;
  textUthmaniTajweed: string;
};

const tajweedMemoryCache = new Map<number, Map<number, QuranComVerseText>>();

function fallbackRevelationType(chapterNumber: number): string {
  return MEDINAN_SURAHS.has(chapterNumber) ? "Medinan" : "Meccan";
}

function fallbackTranslation(chapterNumber: number): string {
  return SURAH_TRANSLATION_FALLBACKS[chapterNumber - 1] ?? "";
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

function stripHtmlTags(value: string): string {
  return value
    .replace(/<span\b[^>]*class=["']?end["']?[^>]*>.*?<\/span>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
    englishNameTranslation: fallbackTranslation(chapterNumber),
    numberOfAyahs: meta?.ayahCount ?? 0,
    revelationType: fallbackRevelationType(chapterNumber),
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
    transliteration.text ??
      transliteration.textUtf8 ??
      transliteration.text_utf8 ??
      record.transliteration ??
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
    audioUrl: resolveMadeenanAssetUrl(getString(record.audioUrl ?? record.audio_url, "")) ?? undefined,
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

function extractTajweedVerses(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  const record = asRecord(data);
  const verses = record.verses;
  if (Array.isArray(verses)) return verses.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  return [];
}

async function fetchSurahTajweedText(chapterNumber: number): Promise<Map<number, QuranComVerseText>> {
  const cached = tajweedMemoryCache.get(chapterNumber);
  if (cached) return cached;

  const mapped = new Map<number, QuranComVerseText>();
  let page = 1;
  let nextPage: number | null = 1;

  while (nextPage) {
    const url = new URL("/api/v4/quran/verses/uthmani_tajweed", QURAN_COM_API_BASE_URL);
    url.searchParams.set("chapter_number", String(chapterNumber));
    url.searchParams.set("per_page", "50");
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Quran.com Tajweed request failed with HTTP ${response.status}`);
    const data = await response.json();

    for (const verse of extractTajweedVerses(data)) {
      const verseKey = getString(verse.verse_key ?? verse.verseKey);
      const ayahNumber = getNumber(verseKey.split(":")[1], getNumber(verse.verse_number ?? verse.ayah_number, NaN));
      const textUthmaniTajweed = getString(verse.text_uthmani_tajweed ?? verse.textUthmaniTajweed);
      const textUthmani = getString(verse.text_uthmani ?? verse.textUthmani, textUthmaniTajweed ? stripHtmlTags(textUthmaniTajweed) : "");
      if (Number.isFinite(ayahNumber) && textUthmani && textUthmaniTajweed) {
        mapped.set(ayahNumber, { textUthmani, textUthmaniTajweed });
      }
    }

    const pagination = asRecord(asRecord(data).pagination);
    const parsedNext = getNumber(pagination.next_page ?? pagination.nextPage, NaN);
    nextPage = Number.isFinite(parsedNext) ? parsedNext : null;
    page = nextPage ?? 0;
  }

  tajweedMemoryCache.set(chapterNumber, mapped);
  return mapped;
}

function attachTajweedText(detail: SurahDetail, tajweedByAyah: Map<number, QuranComVerseText>): SurahDetail {
  if (tajweedByAyah.size === 0) return detail;
  return {
    ...detail,
    ayahs: detail.ayahs.map((ayah) => {
      const quranComText = tajweedByAyah.get(ayah.numberInSurah);
      if (!quranComText) return ayah;
      return {
        ...ayah,
        text: quranComText.textUthmani,
        tajweedText: quranComText.textUthmaniTajweed,
      };
    }),
  };
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
    englishNameTranslation: remoteByNumber.get(meta.number)?.englishNameTranslation || fallbackTranslation(meta.number),
    numberOfAyahs: remoteByNumber.get(meta.number)?.numberOfAyahs || meta.ayahCount,
    revelationType: remoteByNumber.get(meta.number)?.revelationType || fallbackRevelationType(meta.number),
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
  const page = await fetchSurahPage(surahNumber, {
    page: 1,
    perPage: SURAH_DATA[surahNumber - 1]?.ayahCount ?? 10,
  });
  const detail = pageToSurahDetail(page, surahNumber, "arabic");
  const tajweed = await fetchSurahTajweedText(surahNumber).catch(() => new Map<number, QuranComVerseText>());
  return attachTajweedText(detail, tajweed);
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
  const [page, tajweed] = await Promise.all([
    fetchSurahPage(surahNumber, {
      page: 1,
      perPage: SURAH_DATA[surahNumber - 1]?.ayahCount ?? 10,
    }),
    fetchSurahTajweedText(surahNumber).catch(() => new Map<number, QuranComVerseText>()),
  ]);

  return {
    arabic: attachTajweedText(pageToSurahDetail(page, surahNumber, "arabic"), tajweed),
    translation: pageToSurahDetail(page, surahNumber, "translation"),
    transliteration: pageToSurahDetail(page, surahNumber, "transliteration"),
  };
}

export async function fetchTafsir(
  surahNumber: number,
  _edition = "en.maarifulquran",
): Promise<SurahDetail> {
  const page = await fetchSurahPage(surahNumber, {
    page: 1,
    perPage: SURAH_DATA[surahNumber - 1]?.ayahCount ?? 10,
    tafsir: true,
  });
  return pageToSurahDetail(page, surahNumber, "tafsir");
}

export async function fetchTranslation(
  surahNumber: number,
  _edition: string,
): Promise<SurahDetail> {
  const page = await fetchSurahPage(surahNumber, {
    page: 1,
    perPage: SURAH_DATA[surahNumber - 1]?.ayahCount ?? 10,
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
  const verse = extractVerses(page).find((v) => getVerseNumber(v, ayahNum) === ayahNum);
  const words = Array.isArray(asRecord(verse).words) ? asRecord(verse).words as unknown[] : [];
  return words.map(normalizeWord).map((word, idx) => ({
    arabic: word.textArabic ?? word.textUthmani ?? word.text ?? "",
    translation: word.translation ?? "",
    transliteration: word.transliteration,
    position: Number(word.wordPosition ?? word.position ?? idx + 1),
    audioUrl: word.audioUrl,
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
  const flatSegments = Array.isArray(segments) ? segments : segments.segments ?? [];
  const segment = flatSegments.find((s) => s.verseKey === `${surahNum}:${ayahNum}` || s.ayahNumber === ayahNum);
  const candidate = resolveMadeenanAssetUrl(segment?.audioUrl ?? segment?.url);
  if (candidate) return candidate;
  const chapterAudio = resolveMadeenanAssetUrl(segments.audioUrl ?? segments.url ?? segments.raw?.audio_file?.audio_url);
  if (chapterAudio) return chapterAudio;
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
