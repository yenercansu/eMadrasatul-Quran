import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getTafsirConfig,
  getTafsirForAyah,
  type TafsirKey,
  type TafsirResourceConfig,
} from "@/services/madeenanApi";

export type { TafsirKey, TafsirResourceConfig };

export interface TafsirEntry {
  key: TafsirKey;
  name: string;
  author: string;
  verseKey: string;
  text: string;
}

export interface TafsirPageResult {
  entriesByVerseKey: Record<string, TafsirEntry[]>;
}

const CACHE_PREFIX = "madeenan:tafsir:";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const QURAN_COM_API_BASE_URL = "https://api.quran.com/api/v4";

const FALLBACK_TAFSIRS: Record<TafsirKey, TafsirResourceConfig> = {
  jalalayn: {
    key: "jalalayn",
    name: "Tafsir al-Jalalayn",
    author: "Jalal al-Din al-Mahalli and Jalal al-Din al-Suyuti",
    language: "en",
    slug: "en-tafsir-jalalayn",
  },
  maarif: {
    key: "maarif",
    name: "Ma'arif al-Qur'an",
    author: "Mufti Muhammad Shafi",
    language: "en",
    resourceId: 168,
    slug: "en-tafsir-maarif-ul-quran",
  },
  ibn_kathir: {
    key: "ibn_kathir",
    name: "Tafsir Ibn Kathir",
    author: "Hafiz Ibn Kathir",
    language: "en",
    resourceId: 169,
    slug: "en-tafisr-ibn-kathir",
  },
  as_sadi: {
    key: "as_sadi",
    name: "Tafsir as-Sa'di",
    author: "Abd al-Rahman al-Sa'di",
    language: "en",
    slug: "en-tafsir-as-sadi",
  },
};

const configMemory = new Map<TafsirKey, TafsirResourceConfig>();
const ayahMemory = new Map<string, TafsirEntry>();
const pageInFlight = new Map<string, Promise<TafsirPageResult>>();

function cacheKey(key: TafsirKey, verseKey: string): string {
  return `${CACHE_PREFIX}${key}:${verseKey}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeConfig(data: unknown): Record<TafsirKey, TafsirResourceConfig> {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const tafsirs = record.tafsirs && typeof record.tafsirs === "object"
    ? record.tafsirs as Partial<Record<TafsirKey, TafsirResourceConfig>>
    : {};
  return {
    jalalayn: { ...FALLBACK_TAFSIRS.jalalayn, ...tafsirs.jalalayn, key: "jalalayn" },
    maarif: { ...FALLBACK_TAFSIRS.maarif, ...tafsirs.maarif, key: "maarif" },
    ibn_kathir: { ...FALLBACK_TAFSIRS.ibn_kathir, ...tafsirs.ibn_kathir, key: "ibn_kathir" },
    as_sadi: { ...FALLBACK_TAFSIRS.as_sadi, ...tafsirs.as_sadi, key: "as_sadi" },
  };
}

export async function getAvailableTafsirs(): Promise<Record<TafsirKey, TafsirResourceConfig>> {
  if (configMemory.size > 0) return Object.fromEntries(configMemory) as Record<TafsirKey, TafsirResourceConfig>;
  let config = FALLBACK_TAFSIRS;
  try {
    config = normalizeConfig(await getTafsirConfig());
  } catch {}
  for (const [key, value] of Object.entries(config) as Array<[TafsirKey, TafsirResourceConfig]>) {
    configMemory.set(key, value);
  }
  return config;
}

async function getCachedAyah(key: TafsirKey, verseKey: string): Promise<TafsirEntry | null> {
  const mem = ayahMemory.get(`${key}:${verseKey}`);
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key, verseKey));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { timestamp: number; data: TafsirEntry };
    if (Date.now() - cached.timestamp > CACHE_MAX_AGE_MS) return null;
    ayahMemory.set(`${key}:${verseKey}`, cached.data);
    return cached.data;
  } catch {
    return null;
  }
}

async function setCachedAyah(entry: TafsirEntry): Promise<void> {
  ayahMemory.set(`${entry.key}:${entry.verseKey}`, entry);
  try {
    await AsyncStorage.setItem(cacheKey(entry.key, entry.verseKey), JSON.stringify({ timestamp: Date.now(), data: entry }));
  } catch {}
}

function readText(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return readText(record.text ?? record.content ?? record.tafsir);
}

async function fetchFromQuranCom(config: TafsirResourceConfig, verseKey: string): Promise<string> {
  if (!config.resourceId) return "";
  const url = `${QURAN_COM_API_BASE_URL}/tafsirs/${config.resourceId}/by_ayah/${encodeURIComponent(verseKey)}`;
  const response = await fetch(url);
  if (!response.ok) return "";
  const data = await response.json() as Record<string, unknown>;
  const tafsir = data.tafsir && typeof data.tafsir === "object" ? data.tafsir as Record<string, unknown> : data;
  return readText(tafsir.text ?? tafsir);
}

async function fetchTafsirAyah(key: TafsirKey, verseKey: string, config: TafsirResourceConfig): Promise<TafsirEntry | null> {
  const cached = await getCachedAyah(key, verseKey);
  if (cached) return cached;

  let text = "";
  let resourceName = config.name;
  try {
    const backend = await getTafsirForAyah(key, verseKey);
    text = stripHtml(backend.text ?? "");
    resourceName = backend.resourceName ?? resourceName;
  } catch {
    text = await fetchFromQuranCom(config, verseKey);
  }

  if (!text) return null;
  const entry = { key, name: resourceName, author: config.author, verseKey, text };
  await setCachedAyah(entry);
  return entry;
}

export async function fetchTafsirPage(keys: TafsirKey[], verseKeys: string[]): Promise<TafsirPageResult> {
  const uniqueKeys = Array.from(new Set(keys));
  const uniqueVerseKeys = Array.from(new Set(verseKeys));
  const inFlightKey = `${uniqueKeys.join(",")}|${uniqueVerseKeys.join(",")}`;
  const inflight = pageInFlight.get(inFlightKey);
  if (inflight) return inflight;

  const promise = (async () => {
    const config = await getAvailableTafsirs();
    const entries = await Promise.all(
      uniqueVerseKeys.flatMap((verseKey) =>
        uniqueKeys.map((key) => fetchTafsirAyah(key, verseKey, config[key] ?? FALLBACK_TAFSIRS[key])),
      ),
    );
    const entriesByVerseKey: Record<string, TafsirEntry[]> = {};
    for (const entry of entries) {
      if (!entry) continue;
      entriesByVerseKey[entry.verseKey] = [...(entriesByVerseKey[entry.verseKey] ?? []), entry];
    }
    return { entriesByVerseKey };
  })().finally(() => pageInFlight.delete(inFlightKey));

  pageInFlight.set(inFlightKey, promise);
  return promise;
}

export function normalizeTafsirKeys(values: readonly string[] | null | undefined): TafsirKey[] {
  const mapped = (values && values.length > 0 ? values : ["maarif"]).map((value) => {
    if (value === "en.maarifulquran") return "maarif";
    if (value === "en.jalalayn") return "jalalayn";
    if (value === "en.ibnkathir" || value === "en.tafsiribnkathir") return "ibn_kathir";
    if (value === "en.sadi" || value === "en.as_sadi") return "as_sadi";
    return value;
  });
  return mapped.filter((value): value is TafsirKey =>
    value === "jalalayn" || value === "maarif" || value === "ibn_kathir" || value === "as_sadi",
  );
}
