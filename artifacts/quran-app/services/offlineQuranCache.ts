import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { resolveMadeenanAssetUrl } from "@/services/madeenanApi";
import { getAudioUrl, type ApiAyah } from "@/services/quranApi";

const AUDIO_MANIFEST_KEY = "madeenan:offline-audio-manifest:v1";
const CONTENT_MANIFEST_KEY = "madeenan:offline-content-manifest:v1";
const ACTIVE_SURAH_KEY = "madeenan:offline-active-surah:v1";
const SURAH_CACHE_MIGRATION_KEY = "madeenan:offline-surah-cache-migration:v1";
const AUDIO_ROOT = `${FileSystem.documentDirectory ?? ""}quran-audio`;
const CONTENT_ROOT = `${FileSystem.documentDirectory ?? ""}quran-content`;

export type OfflineDownloadStatus = "idle" | "downloading" | "ready" | "failed";

export interface OfflineAudioRecord {
  verseKey: string;
  reciterId: number;
  remoteUrl: string;
  localUri: string;
  fileSize?: number;
  downloadedAt: number;
}

export interface OfflineContentRecord {
  key: string;
  localUri: string;
  downloadedAt: number;
}

export interface GoalAyahLike {
  surahNumber: number;
  ayahNumber: number;
}

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  currentVerseKey?: string;
}

export interface ActiveOfflineSurah {
  surahNumber: number;
  reciterId: number;
  updatedAt: number;
}

function audioManifestKey(verseKey: string, reciterId: number): string {
  return `${reciterId}:${verseKey}`;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

async function ensureDir(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
}

async function readAudioManifest(): Promise<Record<string, OfflineAudioRecord>> {
  try {
    const raw = await AsyncStorage.getItem(AUDIO_MANIFEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeAudioManifest(manifest: Record<string, OfflineAudioRecord>): Promise<void> {
  await AsyncStorage.setItem(AUDIO_MANIFEST_KEY, JSON.stringify(manifest));
}

async function readContentManifest(): Promise<Record<string, OfflineContentRecord>> {
  try {
    const raw = await AsyncStorage.getItem(CONTENT_MANIFEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeContentManifest(manifest: Record<string, OfflineContentRecord>): Promise<void> {
  await AsyncStorage.setItem(CONTENT_MANIFEST_KEY, JSON.stringify(manifest));
}

export function getVerseKey(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}:${ayahNumber}`;
}

export async function getCachedAyahAudio(
  verseKey: string,
  reciterId: number,
): Promise<OfflineAudioRecord | null> {
  const manifest = await readAudioManifest();
  const record = manifest[audioManifestKey(verseKey, reciterId)];
  if (!record) return null;
  const info = await FileSystem.getInfoAsync(record.localUri);
  return info.exists ? record : null;
}

export async function getCachedAyahAudioUri(
  verseKey: string,
  reciterId: number,
): Promise<string | null> {
  return (await getCachedAyahAudio(verseKey, reciterId))?.localUri ?? null;
}

function getSurahFromVerseKey(verseKey: string): number | null {
  const surah = Number(verseKey.split(":")[0]);
  return Number.isFinite(surah) ? surah : null;
}

async function deleteAudioRecord(record: OfflineAudioRecord): Promise<void> {
  await FileSystem.deleteAsync(record.localUri, { idempotent: true }).catch(() => {});
}

export async function clearOfflineAudioCache(): Promise<void> {
  const manifest = await readAudioManifest();
  await Promise.all(Object.values(manifest).map(deleteAudioRecord));
  await writeAudioManifest({});
  await AsyncStorage.removeItem(ACTIVE_SURAH_KEY).catch(() => {});
}

export async function clearOfflineContentCache(): Promise<void> {
  const manifest = await readContentManifest();
  await Promise.all(
    Object.values(manifest).map((record) =>
      FileSystem.deleteAsync(record.localUri, { idempotent: true }).catch(() => {}),
    ),
  );
  await writeContentManifest({});
  await FileSystem.deleteAsync(CONTENT_ROOT, { idempotent: true }).catch(() => {});
}

export async function clearOfflineCaches(): Promise<void> {
  await Promise.all([clearOfflineAudioCache(), clearOfflineContentCache()]);
}

export async function migrateToSingleSurahOfflineCache(): Promise<void> {
  const done = await AsyncStorage.getItem(SURAH_CACHE_MIGRATION_KEY).catch(() => null);
  if (done === "1") return;
  await clearOfflineAudioCache();
  await AsyncStorage.setItem(SURAH_CACHE_MIGRATION_KEY, "1");
}

export async function setActiveOfflineSurah(surahNumber: number, reciterId: number): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SURAH_KEY, JSON.stringify({
    surahNumber,
    reciterId,
    updatedAt: Date.now(),
  } satisfies ActiveOfflineSurah));
}

export async function getActiveOfflineSurah(): Promise<ActiveOfflineSurah | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_SURAH_KEY);
    return raw ? JSON.parse(raw) as ActiveOfflineSurah : null;
  } catch {
    return null;
  }
}

export async function deleteOfflineAudioExceptSurah(surahNumber: number, reciterId: number): Promise<void> {
  const manifest = await readAudioManifest();
  const next: Record<string, OfflineAudioRecord> = {};
  for (const [key, record] of Object.entries(manifest)) {
    const recordSurah = getSurahFromVerseKey(record.verseKey);
    if (recordSurah !== surahNumber) {
      await deleteAudioRecord(record);
    } else {
      next[key] = record;
    }
  }
  await writeAudioManifest(next);
  await setActiveOfflineSurah(surahNumber, reciterId);
}

export async function cacheJsonContent(key: string, data: unknown): Promise<string | null> {
  if (!FileSystem.documentDirectory) return null;
  await ensureDir(CONTENT_ROOT);
  const localUri = `${CONTENT_ROOT}/${safeFileName(key)}.json`;
  await FileSystem.writeAsStringAsync(localUri, JSON.stringify({
    downloadedAt: Date.now(),
    data,
  }));
  const manifest = await readContentManifest();
  manifest[key] = { key, localUri, downloadedAt: Date.now() };
  await writeContentManifest(manifest);
  return localUri;
}

export async function getCachedJsonContent<T>(key: string): Promise<T | null> {
  try {
    const manifest = await readContentManifest();
    const record = manifest[key];
    if (!record) return null;
    const info = await FileSystem.getInfoAsync(record.localUri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(record.localUri);
    const parsed = JSON.parse(raw) as { data: T };
    return parsed.data;
  } catch {
    return null;
  }
}

export async function downloadAyahAudio(options: {
  verseKey: string;
  reciterId: number;
  remoteUrl: string;
}): Promise<OfflineAudioRecord> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Offline audio storage is not available on this platform.");
  }

  const remoteUrl = resolveMadeenanAssetUrl(options.remoteUrl);
  if (!remoteUrl) throw new Error("Audio URL is missing.");

  const existing = await getCachedAyahAudio(options.verseKey, options.reciterId);
  if (existing?.remoteUrl === remoteUrl) return existing;

  const reciterDir = `${AUDIO_ROOT}/${options.reciterId}`;
  await ensureDir(AUDIO_ROOT);
  await ensureDir(reciterDir);

  const localUri = `${reciterDir}/${safeFileName(options.verseKey)}.mp3`;
  const result = await FileSystem.downloadAsync(remoteUrl, localUri);
  const info = await FileSystem.getInfoAsync(result.uri);
  const record: OfflineAudioRecord = {
    verseKey: options.verseKey,
    reciterId: options.reciterId,
    remoteUrl,
    localUri: result.uri,
    fileSize: info.exists && "size" in info ? info.size : undefined,
    downloadedAt: Date.now(),
  };

  const manifest = await readAudioManifest();
  manifest[audioManifestKey(options.verseKey, options.reciterId)] = record;
  await writeAudioManifest(manifest);
  return record;
}

export async function ensureAyahAudio(options: {
  surahNumber: number;
  ayahNumber: number;
  reciterId: number;
  remoteUrl?: string | null;
}): Promise<OfflineAudioRecord> {
  const verseKey = getVerseKey(options.surahNumber, options.ayahNumber);
  const existing = await getCachedAyahAudio(verseKey, options.reciterId);
  if (existing) return existing;
  const remoteUrl = options.remoteUrl ?? await getAudioUrl(
    options.surahNumber,
    options.ayahNumber,
    options.reciterId,
  );
  return downloadAyahAudio({ verseKey, reciterId: options.reciterId, remoteUrl });
}

export async function ensureGoalOffline(options: {
  ayahs: GoalAyahLike[];
  reciterId: number;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<DownloadProgress> {
  let completed = 0;
  let failed = 0;
  const total = options.ayahs.length;

  for (const ayah of options.ayahs) {
    const currentVerseKey = getVerseKey(ayah.surahNumber, ayah.ayahNumber);
    options.onProgress?.({ total, completed, failed, currentVerseKey });
    try {
      await ensureAyahAudio({
        surahNumber: ayah.surahNumber,
        ayahNumber: ayah.ayahNumber,
        reciterId: options.reciterId,
      });
      completed += 1;
    } catch {
      failed += 1;
    }
    options.onProgress?.({ total, completed, failed, currentVerseKey });
  }

  return { total, completed, failed };
}

export async function ensureSurahOffline(options: {
  surahNumber: number;
  ayahCount: number;
  reciterId: number;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<DownloadProgress> {
  await deleteOfflineAudioExceptSurah(options.surahNumber, options.reciterId);
  const ayahs = Array.from({ length: options.ayahCount }, (_, index) => ({
    surahNumber: options.surahNumber,
    ayahNumber: index + 1,
  }));
  return ensureGoalOffline({
    ayahs,
    reciterId: options.reciterId,
    onProgress: options.onProgress,
  });
}

export async function getOfflineStatusForAyahs(
  ayahs: GoalAyahLike[],
  reciterId: number,
): Promise<{ ready: number; total: number; status: OfflineDownloadStatus }> {
  let ready = 0;
  for (const ayah of ayahs) {
    const cached = await getCachedAyahAudio(getVerseKey(ayah.surahNumber, ayah.ayahNumber), reciterId);
    if (cached) ready += 1;
  }
  return {
    ready,
    total: ayahs.length,
    status: ready === 0 ? "idle" : ready === ayahs.length ? "ready" : "failed",
  };
}

export async function deleteOfflineAudioForReciter(reciterId: number): Promise<void> {
  const manifest = await readAudioManifest();
  const next: Record<string, OfflineAudioRecord> = {};
  for (const [key, record] of Object.entries(manifest)) {
    if (record.reciterId === reciterId) {
      await FileSystem.deleteAsync(record.localUri, { idempotent: true }).catch(() => {});
    } else {
      next[key] = record;
    }
  }
  await writeAudioManifest(next);
}

export async function deleteOfflineAudioForSurah(surahNumber: number, reciterId: number): Promise<void> {
  const manifest = await readAudioManifest();
  const next: Record<string, OfflineAudioRecord> = {};
  for (const [key, record] of Object.entries(manifest)) {
    if (record.reciterId === reciterId && getSurahFromVerseKey(record.verseKey) === surahNumber) {
      await deleteAudioRecord(record);
    } else {
      next[key] = record;
    }
  }
  await writeAudioManifest(next);
}

export function ayahToGoalLike(ayah: ApiAyah, surahNumber: number): GoalAyahLike {
  return { surahNumber, ayahNumber: ayah.numberInSurah };
}
