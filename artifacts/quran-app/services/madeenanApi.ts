import AsyncStorage from "@react-native-async-storage/async-storage";

import { getStoredSessionToken } from "@/services/sessionStore";

export const MADEENAN_API_BASE_URL = "https://hackathon.madeenan.com";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type QueryValue = string | number | boolean | null | undefined;

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface BackendError {
  code: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: BackendError;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class MadeenanApiError extends Error {
  readonly name = "MadeenanApiError";
  readonly status: number;
  readonly code: string;
  readonly data: unknown;

  constructor(message: string, options: { status: number; code: string; data?: unknown }) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
  }
}

let inMemorySessionToken: string | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export function setApiSessionToken(token: string | null): void {
  inMemorySessionToken = token;
}

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, MADEENAN_API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return !!value && typeof value === "object" && "success" in value;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string): { code: string; message: string } {
  if (isEnvelope(data) && !data.success) {
    return {
      code: data.error?.code || "BACKEND_ERROR",
      message: data.error?.message || fallback,
    };
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : fallback;
    const code = typeof record.code === "string" ? record.code : "HTTP_ERROR";
    return { code, message };
  }
  if (typeof data === "string" && data.trim()) return { code: "HTTP_ERROR", message: data };
  return { code: "HTTP_ERROR", message: fallback };
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    query?: Record<string, QueryValue>;
    auth?: boolean;
    headers?: HeadersInit;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");

  const init: RequestInit = { method, headers };
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  let token: string | null = null;
  if (options.auth !== false) {
    token = inMemorySessionToken ?? (await getStoredSessionToken());
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), init);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    const details = getErrorMessage(parsed, `Request failed with HTTP ${response.status}`);
    const error = new MadeenanApiError(details.message, {
      status: response.status,
      code: response.status === 401 ? "UNAUTHORIZED" : details.code,
      data: parsed,
    });
    if (response.status === 401 && token) {
      await unauthorizedHandler?.();
    }
    throw error;
  }

  if (isEnvelope<T>(parsed)) {
    if (parsed.success) return parsed.data;
    throw new MadeenanApiError(parsed.error.message, {
      status: response.status,
      code: parsed.error.code,
      data: parsed,
    });
  }

  return parsed as T;
}

function searchForToken(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = [
    "token",
    "sessionToken",
    "session_token",
    "accessToken",
    "access_token",
    "bearerToken",
    "jwt",
  ];
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 12) return candidate;
  }
  for (const nestedKey of ["session", "data", "user"]) {
    const nested = searchForToken(record[nestedKey]);
    if (nested) return nested;
  }
  return null;
}

export function extractSessionToken(authResponse: unknown): string | null {
  return searchForToken(authResponse);
}

export interface HealthData {
  status: "ok" | string;
  service: string;
}

export interface MetaData {
  name: string;
  service: string;
  version: string;
  modules: string[];
}

export interface MadeenanSession {
  token: string;
  user?: { id?: string; name?: string; email?: string } | null;
  raw?: unknown;
}

export interface Chapter {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface QuranWord {
  id?: number | string;
  position?: number;
  wordPosition?: number;
  text?: string;
  textArabic?: string;
  textUthmani?: string;
  transliteration?: string;
  translation?: string;
  audioSegmentStartMs?: number;
  audioSegmentEndMs?: number;
  segmentId?: string | number;
}

export interface QuranVerse {
  id?: number | string;
  verseKey: string;
  chapterNumber?: number;
  verseNumber?: number;
  ayahNumber?: number;
  textUthmani?: string;
  textArabic?: string;
  text?: string;
  transliteration?: string;
  translations?: Array<{ resourceId?: number; text?: string; name?: string }>;
  tafsir?: string | Array<{ text?: string; name?: string }>;
  words?: QuranWord[];
  audio?: QuranAudioMetadata;
  pageNumber?: number;
  juzNumber?: number;
}

export interface QuranAudioMetadata {
  url?: string;
  audioUrl?: string;
  verseKey?: string;
  chapterNumber?: number;
  ayahNumber?: number;
  durationMs?: number;
  segments?: AudioSegment[];
}

export interface QuranPage {
  chapter?: Chapter;
  verses?: QuranVerse[];
  ayahs?: QuranVerse[];
  audio?: QuranAudioMetadata | QuranAudioMetadata[];
  pagination?: { page?: number; perPage?: number; totalPages?: number; totalRecords?: number };
  [key: string]: unknown;
}

export interface AudioSegment {
  verseKey?: string;
  ayahNumber?: number;
  wordPosition?: number;
  startMs?: number;
  endMs?: number;
  timestampFrom?: number;
  timestampTo?: number;
  [key: string]: unknown;
}

export interface PlaybackRangeBody {
  chapterNumber: number;
  reciterId: number;
  startAyah: number;
  endAyah: number;
  startWord?: number;
  endWord?: number;
  repeatCount: string;
  playbackRate: number;
}

export interface UstadhModeBody {
  chapterNumber: number;
  reciterId: number;
  ayahs: number[];
  mode: "new" | "review" | string;
  playbackRate: number;
}

export interface UserProgressBody {
  goalDate?: string;
  targetAyahs?: number;
  targetJuzNumber?: number;
  ayahs: Array<{
    surahNumber: number;
    ayahNumber: number;
    juzNumber?: number;
    status: "target" | "memorized" | "reviewing" | string;
  }>;
}

export interface LastVisitedBody {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  playbackRate: number;
  lastPositionMs: number;
}

export interface SavedSurahBody {
  surahNumber: number;
  name: string;
}

export interface SavedWordBody {
  surahNumber: number;
  ayahNumber: number;
  wordPosition: number;
  verseKey: string;
  textArabic: string;
  transliteration?: string;
  translation: string;
  audioSegmentStartMs?: number;
  audioSegmentEndMs?: number;
  masteryLevel?: number;
}

export interface ReciterPreferencesBody {
  defaultReciterId: number;
  recentReciterIds: number[];
  playbackRate: number;
  repeatCount: string;
}

export interface OfflinePackageBody {
  surahNumber: number;
  reciterId: number;
  translations: string;
}

export interface QuranPageParams {
  chapterNumber: number;
  page?: number;
  perPage?: number;
  translations?: string | number;
  reciterId?: number;
  tafsir?: string | number | boolean;
  words?: boolean;
}

export const healthCheck = () => apiRequest<HealthData>("/health", { auth: false });
export const getMeta = () => apiRequest<MetaData>("/meta", { auth: false });

export async function signInEmail(body: { email: string; password: string }): Promise<MadeenanSession> {
  const raw = await apiRequest<unknown>("/auth/sign-in/email", { method: "POST", body, auth: false });
  const token = extractSessionToken(raw);
  if (!token) {
    throw new MadeenanApiError(
      "The backend did not return a bearer session token. Mobile protected routes require Authorization: Bearer <session-token>.",
      { status: 200, code: "SESSION_TOKEN_MISSING", data: raw },
    );
  }
  const user = raw && typeof raw === "object" ? ((raw as Record<string, unknown>).user as MadeenanSession["user"]) : null;
  return { token, user, raw };
}

export async function signUpEmail(body: { name?: string; email: string; password: string }): Promise<MadeenanSession> {
  const raw = await apiRequest<unknown>("/auth/sign-up/email", { method: "POST", body, auth: false });
  const token = extractSessionToken(raw);
  if (!token) {
    throw new MadeenanApiError(
      "The backend did not return a bearer session token. Mobile protected routes require Authorization: Bearer <session-token>.",
      { status: 200, code: "SESSION_TOKEN_MISSING", data: raw },
    );
  }
  const user = raw && typeof raw === "object" ? ((raw as Record<string, unknown>).user as MadeenanSession["user"]) : null;
  return { token, user, raw };
}

export const signOut = () => apiRequest<unknown>("/auth/sign-out", { method: "POST" });

export const getChapters = () => apiRequest<Chapter[]>("/quran/chapters");
export const getChapter = (chapterNumber: number) => apiRequest<Chapter>(`/quran/chapters/${chapterNumber}`);
export const getChapterInfo = (chapterNumber: number, language = "en") =>
  apiRequest<unknown>(`/quran/chapters/${chapterNumber}/info`, { query: { language } });
export const getChapterVerses = (
  chapterNumber: number,
  params: { page?: number; perPage?: number; words?: boolean; translations?: string | number } = {},
) => apiRequest<unknown>(`/quran/chapters/${chapterNumber}/verses`, { query: params });
export const getVerse = (verseKey: string) => apiRequest<QuranVerse>(`/quran/verses/${verseKey}`);
export const getQuranPage = (params: QuranPageParams) =>
  apiRequest<QuranPage>("/quran/page", { query: params as unknown as Record<string, QueryValue> });
export const getAudioSegments = (params: { chapterNumber: number; reciterId: number }) =>
  apiRequest<AudioSegment[]>("/quran/audio/segments", { query: params });
export const createPlaybackRange = (body: PlaybackRangeBody) =>
  apiRequest<unknown>("/quran/playback/range", { method: "POST", body });
export const createUstadhModePlan = (body: UstadhModeBody) =>
  apiRequest<unknown>("/quran/playback/ustadh-mode", { method: "POST", body });

export const getProgress = () => apiRequest<unknown>("/user/progress");
export const updateProgress = (body: UserProgressBody) =>
  apiRequest<unknown>("/user/progress", { method: "POST", body });
export const getDailyGoals = () => apiRequest<unknown>("/user/goals/daily");
export const getLastVisited = () => apiRequest<LastVisitedBody | null>("/user/last-visited");
export const updateLastVisited = (body: LastVisitedBody) =>
  apiRequest<unknown>("/user/last-visited", { method: "PUT", body });
export const getSavedSurahs = () => apiRequest<Array<SavedSurahBody & { id: string | number }>>("/user/saved-surahs");
export const saveSurah = (body: SavedSurahBody) =>
  apiRequest<SavedSurahBody & { id: string | number }>("/user/saved-surahs", { method: "POST", body });
export const deleteSavedSurah = (id: string | number) =>
  apiRequest<unknown>(`/user/saved-surahs/${id}`, { method: "DELETE" });
export const getSavedWords = () => apiRequest<Array<SavedWordBody & { id: string | number }>>("/user/saved-words");
export const saveWord = (body: SavedWordBody) =>
  apiRequest<SavedWordBody & { id: string | number }>("/user/saved-words", { method: "POST", body });
export const deleteSavedWord = (id: string | number) =>
  apiRequest<unknown>(`/user/saved-words/${id}`, { method: "DELETE" });
export const getReciterPreferences = () => apiRequest<ReciterPreferencesBody | null>("/user/reciter-preferences");
export const updateReciterPreferences = (body: ReciterPreferencesBody) =>
  apiRequest<ReciterPreferencesBody>("/user/reciter-preferences", { method: "PUT", body });
export const createOfflinePackage = (body: OfflinePackageBody) =>
  apiRequest<unknown>("/quran/offline-packages", { method: "POST", body });
export const getOfflinePackage = (id: string | number) => apiRequest<unknown>(`/quran/offline-packages/${id}`);
export const deleteOfflinePackage = (id: string | number) =>
  apiRequest<unknown>(`/quran/offline-packages/${id}`, { method: "DELETE" });

export async function startQuranFoundationOAuth(): Promise<string> {
  const data = await apiRequest<unknown>("/quran-foundation/oauth/start", { method: "POST" });
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const candidate =
      record.authorizationUrl ?? record.authorization_url ?? record.url ?? record.redirectUrl ?? record.redirect_url;
    if (typeof candidate === "string") return candidate;
  }
  throw new MadeenanApiError("Backend did not return a Quran Foundation authorization URL.", {
    status: 200,
    code: "AUTHORIZATION_URL_MISSING",
    data,
  });
}

export const getQuranFoundationOAuthStatus = () =>
  apiRequest<{ linked?: boolean; connected?: boolean; email?: string; account?: unknown }>(
    "/quran-foundation/oauth/status",
  );

const QURAN_PAGE_CACHE_PREFIX = "madeenan:quran-page:";
const QURAN_PAGE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

function getQuranPageCacheKey(params: QuranPageParams): string {
  return `${QURAN_PAGE_CACHE_PREFIX}${JSON.stringify({
    chapterNumber: params.chapterNumber,
    page: params.page ?? 1,
    perPage: params.perPage ?? 10,
    translations: params.translations ?? 131,
    reciterId: params.reciterId ?? 7,
    tafsir: params.tafsir ?? false,
    words: params.words ?? true,
  })}`;
}

export async function getCachedQuranPage(params: QuranPageParams): Promise<QuranPage | null> {
  try {
    const raw = await AsyncStorage.getItem(getQuranPageCacheKey(params));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { timestamp: number; data: QuranPage };
    if (Date.now() - cached.timestamp > QURAN_PAGE_CACHE_MAX_AGE_MS) return null;
    return cached.data;
  } catch {
    return null;
  }
}

export async function setCachedQuranPage(params: QuranPageParams, data: QuranPage): Promise<void> {
  try {
    await AsyncStorage.setItem(
      getQuranPageCacheKey(params),
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {}
}

export async function getQuranPageWithCache(params: QuranPageParams): Promise<QuranPage> {
  try {
    const data = await getQuranPage(params);
    await setCachedQuranPage(params, data);
    return data;
  } catch (error) {
    const cached = await getCachedQuranPage(params);
    if (cached) return cached;
    throw error;
  }
}

export function getFirstAudioUrl(page: QuranPage, verseKey?: string): string | null {
  const verse = (page.verses ?? page.ayahs ?? []).find((v) => !verseKey || v.verseKey === verseKey);
  const verseAudio = verse?.audio?.audioUrl ?? verse?.audio?.url;
  if (verseAudio) return verseAudio;
  const audio = Array.isArray(page.audio)
    ? page.audio.find((a) => !verseKey || a.verseKey === verseKey)
    : page.audio;
  return audio?.audioUrl ?? audio?.url ?? null;
}
