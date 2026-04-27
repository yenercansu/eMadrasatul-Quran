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
}

export interface AyahWithTranslation {
  arabic: ApiAyah;
  translation?: ApiAyah;
  transliteration?: ApiAyah;
}

const BASE_URL = "https://api.alquran.cloud/v1";

export async function fetchSurahs(): Promise<ApiSurah[]> {
  const res = await fetch(`${BASE_URL}/surah`);
  const data = await res.json();
  return data.data;
}

export async function fetchSurah(
  surahNumber: number,
  edition = "quran-uthmani"
): Promise<SurahDetail> {
  const res = await fetch(`${BASE_URL}/surah/${surahNumber}/${edition}`);
  const data = await res.json();
  return data.data;
}

export async function fetchSurahWithTranslations(
  surahNumber: number,
  translationEdition = "en.asad",
  transliterationEdition = "en.transliteration"
): Promise<{
  arabic: SurahDetail;
  translation: SurahDetail;
  transliteration: SurahDetail;
}> {
  const [arabicRes, translationRes, transliterationRes] = await Promise.all([
    fetch(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`),
    fetch(`${BASE_URL}/surah/${surahNumber}/${translationEdition}`),
    fetch(`${BASE_URL}/surah/${surahNumber}/${transliterationEdition}`),
  ]);

  const [arabicData, translationData, transliterationData] = await Promise.all([
    arabicRes.json(),
    translationRes.json(),
    transliterationRes.json(),
  ]);

  return {
    arabic: arabicData.data,
    translation: translationData.data,
    transliteration: transliterationData.data,
  };
}

export async function fetchTafsir(
  surahNumber: number,
  edition = "en.maarifulquran"
): Promise<SurahDetail> {
  const res = await fetch(`${BASE_URL}/surah/${surahNumber}/${edition}`);
  const data = await res.json();
  return data.data;
}

export async function fetchTranslation(
  surahNumber: number,
  edition: string,
): Promise<SurahDetail> {
  const res = await fetch(`${BASE_URL}/surah/${surahNumber}/${edition}`);
  const data = await res.json();
  return data.data;
}

export async function fetchAyahText(surahNum: number, ayahNum: number): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/ayah/${surahNum}:${ayahNum}/quran-uthmani`);
    const data = await res.json();
    return data.data?.text ?? "";
  } catch {
    return "";
  }
}

export function getAudioUrl(surahNum: number, ayahNum: number, reciterId: string): string {
  const surahPad = String(surahNum).padStart(3, "0");
  const ayahPad = String(ayahNum).padStart(3, "0");
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${surahPad}${ayahPad}.mp3`;
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
