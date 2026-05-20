import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Appearance, type AppStateStatus } from "react-native";
import type { ArabicFontKey } from "@/constants/arabicFonts";
import { getWeeklyGoalAyahsFrom, SURAH_DATA } from "@/constants/surahData";
import { getAyahKey, getGoalRangeAyahs, isSurahFullyMemorized, isJuzFullyMemorized } from "@/services/hifzLogic";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/contexts/NetworkContext";
import * as madeenanApi from "@/services/madeenanApi";
import { normalizeTafsirKeys, type TafsirKey } from "@/services/tafsirApi";

export interface SavedWord {
  id: string;
  arabic: string;
  translation: string;
  surahNumber: number;
  ayahNumber: number;
  addedAt: number;
  highlighted: boolean;
  memorized?: boolean;
}

export interface SavedAyah {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabicText: string;
  translationText: string;
  addedAt: number;
}

export interface HighlightedWord {
  arabic: string;
  surahNumber: number;
  ayahNumber: number;
  addedAt: number;
}

export interface Progress {
  surahNumber: number;
  ayahNumber: number;
  ayahNumberInSurah: number;
  surahName: string;
  timestamp: number;
}

export interface DailyEntry {
  date: string;
  ayahsRead: number;
  kahfCompleted: boolean;
  quizCompleted: boolean;
  milestoneCompleted?: boolean;
  readAyahKeys?: string[];
}

export interface Goal {
  ayahsPerWeek: number;
  targetAyahsPerWeek?: number;
  measurementStyle?: "visual" | "ayah";
  memorizationStyle?: "steady" | "gradual";
  gradualIncreaseStyle?: "gentle" | "medium" | "fast";
  gradualWeeklyPlan?: number[];
  hifzDaysPerWeek?: number;
  targetHifzDaysPerWeek?: number;
  gradualDaysPerWeekPlan?: number[];
  paceRhythm?: "gentle" | "steady" | "deep";
  finishWeeks?: number;
  startDate: string;
  startSurahNumber?: number;
  startAyahNumber?: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
  weeklyTargetAyahKeys?: string[];
  isRevision?: boolean;
}

export interface MemorizationGoal {
  path: "juz" | "surah" | "pace";
  startSurahNumber: number;
  startSurahName: string;
  startDate: string;
  ayahsReadAtStart?: number;
  targetJuz?: number;
  endSurahNumber?: number;
  endAyahNumber?: number;
}

export interface GoalAyah {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
}

export interface Certificate {
  id: string;
  type: "surah" | "juz" | "full-quran";
  unlockedAt: string;
  surahNumber?: number;
  juzNumber?: number;
  startDate?: string;
  durationDays?: number;
  ayahsPerDay?: number;
}

export interface AccountSettings {
  name: string;
  certificateName: string;
  email: string;
  fontSize: number;
  romanFontSize: number;
  arabicFont: ArabicFontKey;
  theme: "auto" | "light" | "dark";
  dailyNotifications: boolean;
  notificationTime: string;
}

interface Settings {
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  selectedTafsirs: TafsirKey[];
  colorCoding: boolean;
  tajweedColorCoding: boolean;
  mushafMode: boolean;
  repeatCount: number;
  selectedReciter: string;
  /** Auto-pause audio after N minutes (null = off). */
  autoPauseMinutes: number | null;
}

interface QuranContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  accountSettings: AccountSettings;
  updateAccountSettings: (partial: Partial<AccountSettings>) => void;
  savedWords: SavedWord[];
  saveWord: (word: Omit<SavedWord, "id" | "addedAt">) => void;
  removeWord: (id: string) => void;
  toggleHighlight: (id: string) => void;
  toggleWordMemorized: (id: string) => void;
  savedAyahs: SavedAyah[];
  saveAyah: (ayah: Omit<SavedAyah, "id" | "addedAt">) => void;
  removeAyah: (id: string) => void;
  isAyahSaved: (surahNumber: number, ayahNumber: number) => boolean;
  savedSurahs: number[];
  saveSurah: (num: number) => void;
  removeSavedSurah: (num: number) => void;
  isSurahSaved: (num: number) => boolean;
  highlightedWords: HighlightedWord[];
  highlightWord: (arabic: string, surahNumber: number, ayahNumber: number) => void;
  unhighlightWord: (arabic: string, surahNumber: number, ayahNumber: number) => void;
  isWordHighlighted: (arabic: string, surahNumber: number, ayahNumber: number) => boolean;
  recentProgress: Progress[];
  saveProgress: (progress: Omit<Progress, "timestamp">) => void;
  recordVisit: (progress: Omit<Progress, "timestamp">) => void;
  lastListened: Progress | null;
  goal: Goal | null;
  setGoal: (goal: Goal | null) => void;
  memorizationGoal: MemorizationGoal | null;
  setMemorizationGoal: (goal: MemorizationGoal | null) => void;
  dailyEntries: DailyEntry[];
  recordAyahRead: (surahNumber: number, ayahNumber?: number) => void;
  recordQuizCompletion: () => void;
  recordMilestoneCompletion: () => void;
  todayEntry: DailyEntry | null;
  onlineUsers: number;
  quranPosition: number;
  advanceQuranPosition: (n: number) => void;
  getWeekGoalAyahs: () => GoalAyah[];
  getWeekGoalProgress: () => number;
  surahPositions: Record<number, number>;
  saveSurahPosition: (surahNum: number, ayahIndex: number) => void;
  resetLocalData: () => void;
  /** Clears all memorization progress but preserves account settings and preferences. */
  resetHifzProgress: () => void;
  toggleCheckedSurah: (surahNum: number) => void;
  isSurahChecked: (surahNum: number) => boolean;
  clearCheckedSurahs: () => void;
  quizSelectedSurahs: number[];
  setQuizSelectedSurahs: (surahNums: number[]) => void;
  toggleQuizSurahSelection: (surahNum: number) => void;
  isQuizSurahSelected: (surahNum: number) => boolean;
  memorizedAyahKeys: string[];
  markAyahsMemorized: (keys: string[]) => void;
  removeMemorizedAyahKeys: (keys: string[]) => void;
  toggleAyahMemorized: (surahNumber: number, ayahNumber: number) => void;
  isAyahMemorized: (surahNumber: number, ayahNumber: number) => boolean;
  certificates: Certificate[];
  pendingCertToast: Certificate | null;
  dismissCertToast: () => void;
  pendingAlreadyCertToast: Certificate | null;
  dismissAlreadyCertToast: () => void;
}

const TOTAL_AYAHS = 6236;

export function getAyahAtLinearIndex(index: number): { surahNumber: number; surahName: string; ayahNumber: number } {
  let pos = ((index % TOTAL_AYAHS) + TOTAL_AYAHS) % TOTAL_AYAHS;
  for (const s of SURAH_DATA) {
    if (pos < s.ayahCount) return { surahNumber: s.number, surahName: s.englishName, ayahNumber: pos + 1 };
    pos -= s.ayahCount;
  }
  return { surahNumber: 1, surahName: "Al-Faatiha", ayahNumber: 1 };
}

function getActiveGoalRangeKeySet(goal: Goal, memorizationGoal: MemorizationGoal | null): Set<string> | null {
  if (memorizationGoal?.path === "pace") return null;
  if (goal.startSurahNumber == null || goal.startAyahNumber == null ||
      goal.endSurahNumber == null || goal.endAyahNumber == null) {
    return null;
  }
  const path = memorizationGoal?.path === "juz" ? "juz" : "surah";
  const ayahs = getGoalRangeAyahs({
    path,
    targetJuz: memorizationGoal?.targetJuz,
    startSurahNumber: goal.startSurahNumber,
    startAyahNumber: goal.startAyahNumber,
    endSurahNumber: goal.endSurahNumber,
    endAyahNumber: goal.endAyahNumber,
  });
  if (ayahs.length === 0) return null;
  return new Set(ayahs.map(getAyahKey));
}

const DEFAULT_SETTINGS: Settings = {
  showTranslation: false,
  showTransliteration: false,
  showTafsir: false,
  selectedTafsirs: ["jalalayn", "maarif", "ibn_kathir", "as_sadi"],
  colorCoding: false,
  tajweedColorCoding: false,
  mushafMode: false,
  repeatCount: 1,
  selectedReciter: "7",
  autoPauseMinutes: null,
};

const DEFAULT_ACCOUNT: AccountSettings = {
  name: "",
  certificateName: "",
  email: "",
  fontSize: 28,
  romanFontSize: 14,
  arabicFont: "noto",
  theme: "light",
  dailyNotifications: false,
  notificationTime: "08:00",
};

const DEFAULT_QUIZ_SELECTED_SURAHS = [1, 112, 113, 114];

function applyTheme(theme: AccountSettings["theme"]) {
  try {
    if (typeof Appearance.setColorScheme !== "function") return;
    if (theme === "dark") Appearance.setColorScheme("dark");
    else if (theme === "light") Appearance.setColorScheme("light");
    else Appearance.setColorScheme(null);
  } catch {}
}

const SEED_WORDS: SavedWord[] = [];

function normalizeReciterId(id: unknown): string {
  if (id === 7 || id === "7" || id === "ar.alafasy") return "7";
  return DEFAULT_SETTINGS.selectedReciter;
}

function getTodayStr(): string { return new Date().toISOString().split("T")[0]; }
function isFriday(): boolean { return new Date().getDay() === 5; }

function getWeekStartStr(): string {
  const d = new Date();
  const day = d.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d.getTime() - daysToMonday * 86400000);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

export const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [savedWords, setSavedWords] = useState<SavedWord[]>(SEED_WORDS);
  const [savedAyahs, setSavedAyahs] = useState<SavedAyah[]>([]);
  const [savedSurahs, setSavedSurahs] = useState<number[]>([]);
  const [savedSurahRemoteIds, setSavedSurahRemoteIds] = useState<Record<number, string | number>>({});
  const [highlightedWords, setHighlightedWords] = useState<HighlightedWord[]>([]);
  const [recentProgress, setRecentProgress] = useState<Progress[]>([]);
  const [lastListened, setLastListened] = useState<Progress | null>(null);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [memorizationGoal, setMemorizationGoalState] = useState<MemorizationGoal | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [quranPosition, setQuranPosition] = useState(0);
  const [surahPositions, setSurahPositions] = useState<Record<number, number>>({});
  const [quizSelectedSurahs, setQuizSelectedSurahsState] = useState<number[]>(DEFAULT_QUIZ_SELECTED_SURAHS);
  const [memorizedAyahKeys, setMemorizedAyahKeys] = useState<string[]>([]);
  const memorizedAyahSet = useMemo(() => new Set(memorizedAyahKeys), [memorizedAyahKeys]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [pendingCertToast, setPendingCertToast] = useState<Certificate | null>(null);
  const [pendingAlreadyCertToast, setPendingAlreadyCertToast] = useState<Certificate | null>(null);
  const certificatesRef = useRef<Certificate[]>([]);
  const prevFullyMemorizedRef = useRef<{ surahs: Set<number>; juz: Set<number>; fullQuran: boolean } | null>(null);
  const dataLoadedRef = useRef(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      hydrateRemoteData().catch(() => {});
    }
  }, [isAuthenticated]);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const syncActiveUsers = useCallback(async () => {
    if (!isAuthenticated || isOffline || appStateRef.current !== "active") return;
    try {
      await madeenanApi.sendHeartbeat();
      const response = await madeenanApi.getActiveUserCount();
      setOnlineUsers(Math.max(0, Number(response.activeUsers) || 0));
    } catch {
      // Presence is non-critical; keep the last known count if the network blips.
    }
  }, [isAuthenticated, isOffline]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnlineUsers(0);
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") syncActiveUsers().catch(() => {});
    });
    syncActiveUsers().catch(() => {});
    const intervalId = setInterval(() => {
      syncActiveUsers().catch(() => {});
    }, 30_000);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [isAuthenticated, syncActiveUsers]);

  async function loadData() {
    try {
      const keys = [
        "quran_settings", "quran_saved_words", "quran_recent_progress",
        "quran_last_listened", "quran_goal", "quran_daily_entries",
        "quran_account", "quran_saved_surahs", "quran_highlighted_words",
        "quran_saved_ayahs", "quran_position", "quran_surah_positions",
        "quran_checked_surahs", "quran_memorization_goal", "quran_memorized_ayahs",
        "quran_quiz_selected_surahs", "quran_certificates",
      ];
      const results = await AsyncStorage.multiGet(keys);
      const map = Object.fromEntries(results.map(([k, v]) => [k, v]));
      if (map.quran_settings) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(map.quran_settings) };
        loaded.selectedReciter = normalizeReciterId(loaded.selectedReciter);
        loaded.selectedTafsirs = normalizeTafsirKeys(loaded.selectedTafsirs);
        setSettings(loaded);
      }
      if (map.quran_account) {
        const loaded = { ...DEFAULT_ACCOUNT, ...JSON.parse(map.quran_account) };
        setAccountSettings(loaded);
        applyTheme(loaded.theme);
      } else {
        applyTheme(DEFAULT_ACCOUNT.theme);
      }
      if (map.quran_saved_words) { setSavedWords(JSON.parse(map.quran_saved_words)); }
      else { setSavedWords(SEED_WORDS); await AsyncStorage.setItem("quran_saved_words", JSON.stringify(SEED_WORDS)); }
      if (map.quran_saved_ayahs) setSavedAyahs(JSON.parse(map.quran_saved_ayahs));
      if (map.quran_saved_surahs) setSavedSurahs(JSON.parse(map.quran_saved_surahs));
      if (map.quran_highlighted_words) setHighlightedWords(JSON.parse(map.quran_highlighted_words));
      if (map.quran_recent_progress) setRecentProgress(JSON.parse(map.quran_recent_progress));
      if (map.quran_last_listened) setLastListened(JSON.parse(map.quran_last_listened));
      if (map.quran_goal) {
        const loaded = JSON.parse(map.quran_goal);
        // Migration: rename legacy ayahsPerDay → ayahsPerWeek
        if (loaded.ayahsPerDay != null && loaded.ayahsPerWeek == null) {
          loaded.ayahsPerWeek = loaded.ayahsPerDay;
          delete loaded.ayahsPerDay;
        }
        setGoalState(loaded);
      }
      if (map.quran_memorization_goal) setMemorizationGoalState(JSON.parse(map.quran_memorization_goal));
      if (map.quran_daily_entries) setDailyEntries(JSON.parse(map.quran_daily_entries));
      if (map.quran_position) setQuranPosition(JSON.parse(map.quran_position));
      if (map.quran_surah_positions) setSurahPositions(JSON.parse(map.quran_surah_positions));
      if (map.quran_quiz_selected_surahs) {
        setQuizSelectedSurahsState(JSON.parse(map.quran_quiz_selected_surahs));
      } else {
        await AsyncStorage.setItem("quran_quiz_selected_surahs", JSON.stringify(DEFAULT_QUIZ_SELECTED_SURAHS));
      }
      // Migration: merge legacy checkedSurahs into memorizedAyahKeys so there is one source of truth.
      let memorizedKeys: string[] = map.quran_memorized_ayahs ? JSON.parse(map.quran_memorized_ayahs) : [];
      if (map.quran_checked_surahs) {
        const checkedNums: number[] = JSON.parse(map.quran_checked_surahs);
        if (checkedNums.length > 0) {
          const existing = new Set(memorizedKeys);
          for (const surahNum of checkedNums) {
            const meta = SURAH_DATA[surahNum - 1];
            if (meta) {
              for (let a = 1; a <= meta.ayahCount; a++) {
                const key = `${surahNum}:${a}`;
                if (!existing.has(key)) { existing.add(key); memorizedKeys.push(key); }
              }
            }
          }
          AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(memorizedKeys)).catch(() => {});
          AsyncStorage.removeItem("quran_checked_surahs").catch(() => {});
        }
      }
      setMemorizedAyahKeys(memorizedKeys);
      if (map.quran_certificates) {
        const loaded: Certificate[] = JSON.parse(map.quran_certificates);
        setCertificates(loaded);
        certificatesRef.current = loaded;
      }
      dataLoadedRef.current = true;
    } catch {}
  }

  async function hydrateRemoteData() {
    const [remoteSavedSurahs, remoteSavedWords, remoteLastVisited, remotePrefs, remoteProgress] =
      await Promise.allSettled([
        madeenanApi.getSavedSurahs(),
        madeenanApi.getSavedWords(),
        madeenanApi.getLastVisited(),
        madeenanApi.getReciterPreferences(),
        madeenanApi.getProgress(),
      ]);

    if (remoteSavedSurahs.status === "fulfilled" && Array.isArray(remoteSavedSurahs.value)) {
      const next = remoteSavedSurahs.value.map((item) => Number(item.surahNumber)).filter(Number.isFinite);
      const ids: Record<number, string | number> = {};
      for (const item of remoteSavedSurahs.value) ids[Number(item.surahNumber)] = item.id;
      setSavedSurahs(next);
      setSavedSurahRemoteIds(ids);
      AsyncStorage.setItem("quran_saved_surahs", JSON.stringify(next)).catch(() => {});
    }

    if (remoteSavedWords.status === "fulfilled" && Array.isArray(remoteSavedWords.value)) {
      const next: SavedWord[] = remoteSavedWords.value.map((word) => ({
        id: String(word.id),
        arabic: word.textArabic,
        translation: word.translation,
        surahNumber: Number(word.surahNumber),
        ayahNumber: Number(word.ayahNumber),
        addedAt: Date.now(),
        highlighted: false,
        memorized: (word.masteryLevel ?? 0) > 0,
      })).filter((word) => word.arabic && word.translation && Number.isFinite(word.surahNumber) && Number.isFinite(word.ayahNumber));
      setSavedWords(next);
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)).catch(() => {});
    }

    if (remoteLastVisited.status === "fulfilled" && remoteLastVisited.value) {
      const item = remoteLastVisited.value;
      const meta = SURAH_DATA[item.surahNumber - 1];
      const next: Progress = {
        surahNumber: item.surahNumber,
        ayahNumber: item.ayahNumber,
        ayahNumberInSurah: item.ayahNumber,
        surahName: meta?.englishName ?? `Surah ${item.surahNumber}`,
        timestamp: Date.now(),
      };
      setLastListened(next);
      setRecentProgress((prev) => [next, ...prev.filter(p => p.surahNumber !== next.surahNumber)].slice(0, 10));
      AsyncStorage.setItem("quran_last_listened", JSON.stringify(next)).catch(() => {});
    }

    if (remotePrefs.status === "fulfilled" && remotePrefs.value) {
      const prefs = remotePrefs.value;
      setSettings((prev) => {
        const next = {
          ...prev,
          selectedReciter: normalizeReciterId(prefs.defaultReciterId),
          repeatCount: Number(prefs.repeatCount ?? prev.repeatCount) || prev.repeatCount,
        };
        AsyncStorage.setItem("quran_settings", JSON.stringify(next)).catch(() => {});
        return next;
      });
    }

    if (remoteProgress.status === "fulfilled" && remoteProgress.value && typeof remoteProgress.value === "object") {
      const record = remoteProgress.value as Record<string, unknown>;
      const ayahs = Array.isArray(record.ayahs) ? record.ayahs : Array.isArray(record.progress) ? record.progress : [];
      const memorized = ayahs
        .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
        .filter((item): item is Record<string, unknown> => !!item && item.status === "memorized")
        .map((item) => `${Number(item.surahNumber)}:${Number(item.ayahNumber)}`)
        .filter((key) => !key.includes("NaN"));
      if (memorized.length > 0) {
        setMemorizedAyahKeys(memorized);
        AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(memorized)).catch(() => {});
      }
    }
  }

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.selectedTafsirs) next.selectedTafsirs = normalizeTafsirKeys(partial.selectedTafsirs);
      if (partial.tajweedColorCoding === true) next.showTransliteration = false;
      if (partial.showTransliteration === true) next.tajweedColorCoding = false;
      if (partial.mushafMode === true) { next.showTranslation = false; next.showTransliteration = false; next.showTafsir = false; next.tajweedColorCoding = false; next.colorCoding = false; }
      if (partial.colorCoding === true) next.tajweedColorCoding = false;
      if (partial.tajweedColorCoding === true) next.colorCoding = false;
      AsyncStorage.setItem("quran_settings", JSON.stringify(next));
      if (
        isAuthenticated &&
        (partial.selectedReciter !== undefined || partial.repeatCount !== undefined)
      ) {
        madeenanApi.updateReciterPreferences({
          defaultReciterId: Number(next.selectedReciter) || 7,
          recentReciterIds: [Number(next.selectedReciter) || 7],
          playbackRate: 1,
          repeatCount: String(next.repeatCount),
        }).catch(() => {});
      }
      return next;
    });
  }, [isAuthenticated]);

  const updateAccountSettings = useCallback((partial: Partial<AccountSettings>) => {
    setAccountSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem("quran_account", JSON.stringify(next));
      if (partial.theme !== undefined) applyTheme(next.theme);
      return next;
    });
  }, []);

  const saveWord = useCallback((word: Omit<SavedWord, "id" | "addedAt">) => {
    setSavedWords((prev) => {
      const exists = prev.find(w => w.arabic === word.arabic && w.surahNumber === word.surahNumber);
      if (exists) return prev;
      const next = [{ ...word, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), addedAt: Date.now() }, ...prev];
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      if (isAuthenticated) {
        madeenanApi.saveWord({
          surahNumber: word.surahNumber,
          ayahNumber: word.ayahNumber,
          wordPosition: next.length,
          verseKey: `${word.surahNumber}:${word.ayahNumber}`,
          textArabic: word.arabic,
          translation: word.translation,
          masteryLevel: word.memorized ? 1 : 0,
        }).then((remote) => {
          setSavedWords((current) => current.map((item) => item.id === next[0]?.id ? { ...item, id: String(remote.id) } : item));
        }).catch(() => {});
      }
      return next;
    });
  }, [isAuthenticated]);

  const removeWord = useCallback((id: string) => {
    setSavedWords((prev) => {
      const next = prev.filter(w => w.id !== id);
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      if (isAuthenticated && !id.startsWith("seed")) madeenanApi.deleteSavedWord(id).catch(() => {});
      return next;
    });
  }, [isAuthenticated]);

  const toggleHighlight = useCallback((id: string) => {
    setSavedWords((prev) => { const next = prev.map(w => w.id === id ? { ...w, highlighted: !w.highlighted } : w); AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)); return next; });
  }, []);

  const toggleWordMemorized = useCallback((id: string) => {
    setSavedWords((prev) => { const next = prev.map(w => w.id === id ? { ...w, memorized: !w.memorized } : w); AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)); return next; });
  }, []);

  const saveAyah = useCallback((ayah: Omit<SavedAyah, "id" | "addedAt">) => {
    setSavedAyahs((prev) => {
      const exists = prev.find(a => a.surahNumber === ayah.surahNumber && a.ayahNumber === ayah.ayahNumber);
      if (exists) return prev;
      const next = [{ ...ayah, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), addedAt: Date.now() }, ...prev];
      AsyncStorage.setItem("quran_saved_ayahs", JSON.stringify(next)); return next;
    });
  }, []);

  const removeAyah = useCallback((id: string) => {
    setSavedAyahs((prev) => { const next = prev.filter(a => a.id !== id); AsyncStorage.setItem("quran_saved_ayahs", JSON.stringify(next)); return next; });
  }, []);

  const isAyahSaved = useCallback((surahNumber: number, ayahNumber: number) => savedAyahs.some(a => a.surahNumber === surahNumber && a.ayahNumber === ayahNumber), [savedAyahs]);
  const saveSurah = useCallback((num: number) => { setSavedSurahs((prev) => {
    if (prev.includes(num)) return prev;
    const next = [num, ...prev];
    AsyncStorage.setItem("quran_saved_surahs", JSON.stringify(next));
    if (isAuthenticated) {
      madeenanApi.saveSurah({
        surahNumber: num,
        name: SURAH_DATA[num - 1]?.englishName ?? `Surah ${num}`,
      }).then((remote) => {
        setSavedSurahRemoteIds((ids) => ({ ...ids, [num]: remote.id }));
      }).catch(() => {});
    }
    return next;
  }); }, [isAuthenticated]);
  const removeSavedSurah = useCallback((num: number) => { setSavedSurahs((prev) => {
    const next = prev.filter(n => n !== num);
    AsyncStorage.setItem("quran_saved_surahs", JSON.stringify(next));
    const remoteId = savedSurahRemoteIds[num] ?? num;
    if (isAuthenticated) madeenanApi.deleteSavedSurah(remoteId).catch(() => {});
    return next;
  }); }, [isAuthenticated, savedSurahRemoteIds]);
  const isSurahSaved = useCallback((num: number) => savedSurahs.includes(num), [savedSurahs]);

  const highlightWord = useCallback((arabic: string, surahNumber: number, ayahNumber: number) => {
    setHighlightedWords((prev) => {
      if (prev.find(w => w.arabic === arabic && w.surahNumber === surahNumber && w.ayahNumber === ayahNumber)) return prev;
      const next = [{ arabic, surahNumber, ayahNumber, addedAt: Date.now() }, ...prev];
      AsyncStorage.setItem("quran_highlighted_words", JSON.stringify(next)); return next;
    });
  }, []);

  const unhighlightWord = useCallback((arabic: string, surahNumber: number, ayahNumber: number) => {
    setHighlightedWords((prev) => { const next = prev.filter(w => !(w.arabic === arabic && w.surahNumber === surahNumber && w.ayahNumber === ayahNumber)); AsyncStorage.setItem("quran_highlighted_words", JSON.stringify(next)); return next; });
  }, []);

  const isWordHighlighted = useCallback((arabic: string, surahNumber: number, ayahNumber: number) => highlightedWords.some(w => w.arabic === arabic && w.surahNumber === surahNumber && w.ayahNumber === ayahNumber), [highlightedWords]);

  const saveProgress = useCallback((progress: Omit<Progress, "timestamp">) => {
    const full: Progress = { ...progress, timestamp: Date.now() };
    setLastListened(full);
    setRecentProgress((prev) => { const filtered = prev.filter(p => p.surahNumber !== progress.surahNumber); const next = [full, ...filtered].slice(0, 10); AsyncStorage.setItem("quran_recent_progress", JSON.stringify(next)); return next; });
    AsyncStorage.setItem("quran_last_listened", JSON.stringify(full));
    if (isAuthenticated) {
      madeenanApi.updateLastVisited({
        surahNumber: progress.surahNumber,
        ayahNumber: progress.ayahNumberInSurah,
        reciterId: Number(settings.selectedReciter) || 7,
        playbackRate: 1,
        lastPositionMs: 0,
      }).catch(() => {});
    }
  }, [isAuthenticated, settings.selectedReciter]);

  const recordVisit = useCallback((progress: Omit<Progress, "timestamp">) => {
    const full: Progress = { ...progress, timestamp: Date.now() };
    setRecentProgress((prev) => {
      const filtered = prev.filter(p => p.surahNumber !== progress.surahNumber);
      const next = [full, ...filtered].slice(0, 10);
      AsyncStorage.setItem("quran_recent_progress", JSON.stringify(next));
      return next;
    });
  }, []);

  const setGoal = useCallback((newGoal: Goal | null) => {
    setGoalState(newGoal);
    if (newGoal) { AsyncStorage.setItem("quran_goal", JSON.stringify(newGoal)); }
    else { AsyncStorage.removeItem("quran_goal"); }
  }, []);

  const setMemorizationGoal = useCallback((newGoal: MemorizationGoal | null) => {
    setMemorizationGoalState(newGoal);
    if (newGoal) { AsyncStorage.setItem("quran_memorization_goal", JSON.stringify(newGoal)); }
    else { AsyncStorage.removeItem("quran_memorization_goal"); }
  }, []);

  const advanceQuranPosition = useCallback((n: number) => {
    setQuranPosition((prev) => { const next = (prev + n) % TOTAL_AYAHS; AsyncStorage.setItem("quran_position", JSON.stringify(next)); return next; });
  }, []);

  const getWeekGoalAyahs = useCallback((): GoalAyah[] => {
    if (!goal) return [];
    if (memorizationGoal?.path === "pace") return [];
    if (goal.weeklyTargetAyahKeys?.length) {
      const activeRangeKeys = getActiveGoalRangeKeySet(goal, memorizationGoal);
      return goal.weeklyTargetAyahKeys.map((key) => {
        const [surahRaw, ayahRaw] = key.split(":");
        const surahNumber = Number(surahRaw);
        const ayahNumber = Number(ayahRaw);
        const surah = SURAH_DATA[surahNumber - 1];
        if (!surah || !Number.isFinite(ayahNumber)) return null;
        if (activeRangeKeys && !activeRangeKeys.has(`${surahNumber}:${ayahNumber}`)) return null;
        return { surahNumber, surahName: surah.englishName, ayahNumber };
      }).filter((ayah): ayah is GoalAyah => ayah !== null);
    }
    if (goal.startSurahNumber != null && goal.startAyahNumber != null) {
      const target = memorizationGoal?.path === "juz" && memorizationGoal.targetJuz
        ? { path: "juz" as const, juz: memorizationGoal.targetJuz }
        : { path: "surah" as const };
      return getWeeklyGoalAyahsFrom(
        goal.startSurahNumber,
        goal.startAyahNumber,
        goal.ayahsPerWeek,
        target
      );
    }
    const startPos = quranPosition;
    return Array.from({ length: goal.ayahsPerWeek }, (_, i) =>
      getAyahAtLinearIndex((startPos + i) % TOTAL_AYAHS)
    );
  }, [goal, memorizationGoal, quranPosition]);

  const getWeekGoalProgress = useCallback((): number => {
    if (!goal) return 0;
    const weekStart = getWeekStartStr();
    const weekEntries = dailyEntries.filter(e => e.date >= weekStart);
    if (memorizationGoal?.path === "pace") {
      const allReadKeys = new Set<string>();
      for (const entry of weekEntries) {
        for (const k of (entry.readAyahKeys ?? [])) allReadKeys.add(k);
      }
      return allReadKeys.size || weekEntries.reduce((sum, e) => sum + e.ayahsRead, 0);
    }

    if (goal.startSurahNumber == null || goal.startAyahNumber == null) {
      return weekEntries.reduce((sum, e) => sum + e.ayahsRead, 0);
    }
    const target = memorizationGoal?.path === "juz" && memorizationGoal.targetJuz
      ? { path: "juz" as const, juz: memorizationGoal.targetJuz }
      : { path: "surah" as const };
    const activeRangeKeys = getActiveGoalRangeKeySet(goal, memorizationGoal);
    const goalAyahsList = goal.weeklyTargetAyahKeys?.length
      ? goal.weeklyTargetAyahKeys.map((key) => {
          const [surahRaw, ayahRaw] = key.split(":");
          return { surahNumber: Number(surahRaw), ayahNumber: Number(ayahRaw) };
        }).filter((ayah) => {
          if (!Number.isFinite(ayah.surahNumber) || !Number.isFinite(ayah.ayahNumber)) return false;
          return !activeRangeKeys || activeRangeKeys.has(`${ayah.surahNumber}:${ayah.ayahNumber}`);
        })
      : getWeeklyGoalAyahsFrom(
          goal.startSurahNumber,
          goal.startAyahNumber,
          goal.ayahsPerWeek,
          target
        );
    const goalKeys = new Set(goalAyahsList.map(a => `${a.surahNumber}:${a.ayahNumber}`));
    const allReadKeys = new Set<string>();
    for (const entry of weekEntries) {
      for (const k of (entry.readAyahKeys ?? [])) {
        allReadKeys.add(k);
      }
    }
    return [...allReadKeys].filter(k => goalKeys.has(k)).length;
  }, [goal, dailyEntries, memorizationGoal]);

  const saveSurahPosition = useCallback((surahNum: number, ayahIndex: number) => {
    setSurahPositions((prev) => {
      const next = { ...prev, [surahNum]: ayahIndex };
      AsyncStorage.setItem("quran_surah_positions", JSON.stringify(next));
      return next;
    });
  }, []);

  const resetLocalData = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setAccountSettings(DEFAULT_ACCOUNT);
    setSavedWords(SEED_WORDS);
    setSavedAyahs([]);
    setSavedSurahs([]);
    setSavedSurahRemoteIds({});
    setHighlightedWords([]);
    setRecentProgress([]);
    setLastListened(null);
    setGoalState(null);
    setMemorizationGoalState(null);
    setDailyEntries([]);
    setQuranPosition(0);
    setSurahPositions({});
    setQuizSelectedSurahsState(DEFAULT_QUIZ_SELECTED_SURAHS);
    setMemorizedAyahKeys([]);
    setCertificates([]);
    certificatesRef.current = [];
    prevFullyMemorizedRef.current = null;
    setPendingCertToast(null);
    setPendingAlreadyCertToast(null);
    applyTheme(DEFAULT_ACCOUNT.theme);
  }, []);

  // Clears all memorization progress while preserving account settings and preferences.
  // This is the authoritative reset used by "Restart Hifz Journey" so that every
  // downstream system (certs, quiz, revision) recomputes from a clean slate.
  const resetHifzProgress = useCallback(() => {
    setGoalState(null);
    setMemorizationGoalState(null);
    setMemorizedAyahKeys([]);
    setCertificates([]);
    certificatesRef.current = [];
    prevFullyMemorizedRef.current = null;
    setPendingCertToast(null);
    setPendingAlreadyCertToast(null);
    setQuizSelectedSurahsState(DEFAULT_QUIZ_SELECTED_SURAHS);
    setQuranPosition(0);
    setDailyEntries([]);
    setSavedWords(SEED_WORDS);
    AsyncStorage.multiRemove([
      "quran_goal",
      "quran_memorization_goal",
      "quran_memorized_ayahs",
      "quran_certificates",
      "quran_daily_entries",
      "quran_position",
    ]).catch(() => {});
    AsyncStorage.setItem("quran_quiz_selected_surahs", JSON.stringify(DEFAULT_QUIZ_SELECTED_SURAHS)).catch(() => {});
    AsyncStorage.setItem("quran_saved_words", JSON.stringify(SEED_WORDS)).catch(() => {});
  }, []);

  const toggleCheckedSurah = useCallback((surahNum: number) => {
    const surahMeta = SURAH_DATA.find(s => s.number === surahNum);
    const ayahCount = surahMeta?.ayahCount ?? 0;
    const ayahKeys = Array.from({ length: ayahCount }, (_, i) => `${surahNum}:${i + 1}`);
    const wasChecked = ayahKeys.every(k => memorizedAyahSet.has(k));

    if (!wasChecked) {
      setMemorizedAyahKeys((prev) => {
        const existing = new Set(prev);
        const newKeys = ayahKeys.filter(k => !existing.has(k));
        if (newKeys.length === 0) return prev;
        const next = [...prev, ...newKeys];
        AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(next));
        return next;
      });
      const today = getTodayStr();
      const isKahf = surahNum === 18 && isFriday();
      const increment = Math.min(ayahCount, 10);
      setDailyEntries((de) => {
        const idx = de.findIndex(e => e.date === today);
        let next: DailyEntry[];
        if (idx >= 0) { next = de.map((e, i) => i === idx ? { ...e, ayahsRead: e.ayahsRead + increment, kahfCompleted: e.kahfCompleted || isKahf } : e); }
        else { next = [{ date: today, ayahsRead: increment, kahfCompleted: isKahf, quizCompleted: false }, ...de].slice(0, 365); }
        AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
        return next;
      });
    } else {
      setMemorizedAyahKeys((prev) => {
        const keySet = new Set(ayahKeys);
        const next = prev.filter(k => !keySet.has(k));
        AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(next));
        return next;
      });
    }
  }, [memorizedAyahSet]);

  const isSurahChecked = useCallback((surahNum: number) => {
    const surah = SURAH_DATA[surahNum - 1];
    if (!surah) return false;
    for (let a = 1; a <= surah.ayahCount; a++) {
      if (!memorizedAyahSet.has(`${surahNum}:${a}`)) return false;
    }
    return true;
  }, [memorizedAyahSet]);

  const clearCheckedSurahs = useCallback(() => {
    AsyncStorage.removeItem("quran_checked_surahs").catch(() => {});
  }, []);

  const setQuizSelectedSurahs = useCallback((surahNums: number[]) => {
    const next = Array.from(new Set(surahNums)).sort((a, b) => a - b);
    setQuizSelectedSurahsState(next);
    AsyncStorage.setItem("quran_quiz_selected_surahs", JSON.stringify(next));
  }, []);

  const toggleQuizSurahSelection = useCallback((surahNum: number) => {
    setQuizSelectedSurahsState((prev) => {
      const next = prev.includes(surahNum) ? prev.filter(n => n !== surahNum) : [...prev, surahNum].sort((a, b) => a - b);
      AsyncStorage.setItem("quran_quiz_selected_surahs", JSON.stringify(next));
      return next;
    });
  }, []);

  const isQuizSurahSelected = useCallback((surahNum: number) => quizSelectedSurahs.includes(surahNum), [quizSelectedSurahs]);

  const recordAyahRead = useCallback((surahNumber: number, ayahNumber?: number) => {
    const today = getTodayStr();
    const isKahf = surahNumber === 18 && isFriday();
    const key = ayahNumber != null ? `${surahNumber}:${ayahNumber}` : null;
    setDailyEntries((prev) => {
      const idx = prev.findIndex(e => e.date === today);
      let next: DailyEntry[];
      if (idx >= 0) {
        const entry = prev[idx];
        const existingKeys = entry.readAyahKeys ?? [];
        const alreadyRead = key != null && existingKeys.includes(key);
        if (alreadyRead) return prev;
        next = prev.map((e, i) => i === idx ? {
          ...e,
          ayahsRead: e.ayahsRead + 1,
          kahfCompleted: e.kahfCompleted || isKahf,
          readAyahKeys: key ? [...existingKeys, key] : existingKeys,
        } : e);
      } else {
        next = [{ date: today, ayahsRead: 1, kahfCompleted: isKahf, quizCompleted: false, readAyahKeys: key ? [key] : [] }, ...prev].slice(0, 365);
      }
      AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
      return next;
    });
  }, []);

  const recordQuizCompletion = useCallback(() => {
    const today = getTodayStr();
    setDailyEntries((prev) => {
      const idx = prev.findIndex(e => e.date === today);
      let next: DailyEntry[];
      if (idx >= 0) {
        if (prev[idx].quizCompleted) return prev;
        next = prev.map((e, i) => i === idx ? { ...e, quizCompleted: true } : e);
      } else {
        next = [{ date: today, ayahsRead: 0, kahfCompleted: false, quizCompleted: true }, ...prev].slice(0, 365);
      }
      AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
      return next;
    });
  }, []);

  const recordMilestoneCompletion = useCallback(() => {
    const today = getTodayStr();
    setDailyEntries((prev) => {
      const idx = prev.findIndex(e => e.date === today);
      let next: DailyEntry[];
      if (idx >= 0) {
        if (prev[idx].milestoneCompleted) return prev;
        next = prev.map((e, i) => i === idx ? { ...e, milestoneCompleted: true } : e);
      } else {
        next = [{ date: today, ayahsRead: 0, kahfCompleted: false, quizCompleted: false, milestoneCompleted: true }, ...prev].slice(0, 365);
      }
      AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
      return next;
    });
  }, []);

  const markAyahsMemorized = useCallback((keys: string[]) => {
    const newKeysForDailyEntry: string[] = [];
    setMemorizedAyahKeys((prev) => {
      const newKeys = keys.filter(k => !prev.includes(k));
      if (newKeys.length === 0) return prev;
      newKeysForDailyEntry.push(...newKeys);
      const next = [...prev, ...newKeys];
      AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(next));
      return next;
    });
    if (newKeysForDailyEntry.length > 0) {
      const today = getTodayStr();
      setDailyEntries((prev) => {
        const idx = prev.findIndex(e => e.date === today);
        if (idx >= 0) {
          const entry = prev[idx];
          const existingKeys = entry.readAyahKeys ?? [];
          const mergedKeys = Array.from(new Set([...existingKeys, ...newKeysForDailyEntry]));
          const increment = mergedKeys.length - existingKeys.length;
          if (increment <= 0) return prev;
          const next = prev.map((e, i) => i === idx ? {
            ...e,
            ayahsRead: e.ayahsRead + increment,
            readAyahKeys: mergedKeys,
          } : e);
          AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
          return next;
        }
        const next = [{
          date: today,
          ayahsRead: newKeysForDailyEntry.length,
          kahfCompleted: false,
          quizCompleted: false,
          readAyahKeys: newKeysForDailyEntry,
        }, ...prev].slice(0, 365);
        AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const removeMemorizedAyahKeys = useCallback((keys: string[]) => {
    const keySet = new Set(keys);
    setMemorizedAyahKeys((prev) => {
      const next = prev.filter(k => !keySet.has(k));
      AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleAyahMemorized = useCallback((surahNumber: number, ayahNumber: number) => {
    const key = `${surahNumber}:${ayahNumber}`;
    let added = false;
    setMemorizedAyahKeys((prev) => {
      added = !prev.includes(key);
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      AsyncStorage.setItem("quran_memorized_ayahs", JSON.stringify(next));
      if (isAuthenticated && added) {
        madeenanApi.updateProgress({
          goalDate: getTodayStr(),
          ayahs: [{
            surahNumber,
            ayahNumber,
            juzNumber: SURAH_DATA[surahNumber - 1]?.juz ?? 1,
            status: "memorized",
          }],
        }).catch(() => {});
      }
      return next;
    });
    if (added) recordAyahRead(surahNumber, ayahNumber);
  }, [isAuthenticated, recordAyahRead]);

  const isAyahMemorized = useCallback((surahNumber: number, ayahNumber: number) =>
    memorizedAyahSet.has(`${surahNumber}:${ayahNumber}`), [memorizedAyahSet]);

  // Keep certificatesRef in sync so the detection effect always reads the latest value
  useEffect(() => {
    certificatesRef.current = certificates;
  }, [certificates]);

  // Detect newly completed surahs / juz / full Quran and unlock certificates
  useEffect(() => {
    if (!dataLoadedRef.current) return;

    const memorized = new Set(memorizedAyahKeys);
    const current = certificatesRef.current;
    const certifiedSurahs = new Set(current.filter(c => c.type === "surah").map(c => c.surahNumber!));
    const certifiedJuz = new Set(current.filter(c => c.type === "juz").map(c => c.juzNumber!));
    const hasFullQuranCert = current.some(c => c.type === "full-quran");

    // Build current completion state
    const nowFullSurahs = new Set<number>();
    for (const surah of SURAH_DATA) {
      if (isSurahFullyMemorized(surah.number, memorized)) nowFullSurahs.add(surah.number);
    }
    const nowFullJuz = new Set<number>();
    for (let juz = 1; juz <= 30; juz++) {
      if (isJuzFullyMemorized(juz, memorized)) nowFullJuz.add(juz);
    }
    const nowFullQuran = memorizedAyahKeys.length >= TOTAL_AYAHS;

    const prev = prevFullyMemorizedRef.current;
    const newCerts: Certificate[] = [];
    let alreadyEarnedCert: Certificate | null = null;
    const now = new Date().toISOString();

    for (const surahNum of nowFullSurahs) {
      // On first load (prev===null): catch-up new certs only. On subsequent runs: detect newly completed transitions.
      const isNewlyCompleted = prev === null || !prev.surahs.has(surahNum);
      if (isNewlyCompleted) {
        if (!certifiedSurahs.has(surahNum)) {
          newCerts.push({ id: `s-${surahNum}-${Date.now()}`, type: "surah", unlockedAt: now, surahNumber: surahNum });
        } else if (prev !== null) {
          alreadyEarnedCert ??= current.find(c => c.type === "surah" && c.surahNumber === surahNum) ?? null;
        }
      }
    }
    for (const juz of nowFullJuz) {
      const isNewlyCompleted = prev === null || !prev.juz.has(juz);
      if (isNewlyCompleted) {
        if (!certifiedJuz.has(juz)) {
          newCerts.push({ id: `j-${juz}-${Date.now()}`, type: "juz", unlockedAt: now, juzNumber: juz });
        } else if (prev !== null) {
          alreadyEarnedCert ??= current.find(c => c.type === "juz" && c.juzNumber === juz) ?? null;
        }
      }
    }
    if (nowFullQuran) {
      const isNewlyCompleted = prev === null || !prev.fullQuran;
      if (isNewlyCompleted) {
        if (!hasFullQuranCert) {
          newCerts.push({ id: `fq-${Date.now()}`, type: "full-quran", unlockedAt: now });
        } else if (prev !== null) {
          alreadyEarnedCert ??= current.find(c => c.type === "full-quran") ?? null;
        }
      }
    }

    // Always update tracking ref so the next run can detect transitions
    prevFullyMemorizedRef.current = { surahs: nowFullSurahs, juz: nowFullJuz, fullQuran: nowFullQuran };

    if (newCerts.length > 0) {
      const next = [...current, ...newCerts];
      certificatesRef.current = next;
      setCertificates(next);
      AsyncStorage.setItem("quran_certificates", JSON.stringify(next)).catch(() => {});
      setPendingCertToast(newCerts[newCerts.length - 1]);
    } else if (alreadyEarnedCert) {
      setPendingAlreadyCertToast(alreadyEarnedCert);
    }
  }, [memorizedAyahKeys]);

  const dismissCertToast = useCallback(() => setPendingCertToast(null), []);
  const dismissAlreadyCertToast = useCallback(() => setPendingAlreadyCertToast(null), []);

  const todayEntry = dailyEntries.find(e => e.date === getTodayStr()) ?? null;

  return (
    <QuranContext.Provider value={{
      settings, updateSettings,
      accountSettings, updateAccountSettings,
      savedWords, saveWord, removeWord, toggleHighlight, toggleWordMemorized,
      savedAyahs, saveAyah, removeAyah, isAyahSaved,
      savedSurahs, saveSurah, removeSavedSurah, isSurahSaved,
      highlightedWords, highlightWord, unhighlightWord, isWordHighlighted,
      recentProgress, saveProgress, recordVisit, lastListened,
      goal, setGoal,
      memorizationGoal, setMemorizationGoal,
      dailyEntries, recordAyahRead, recordQuizCompletion, recordMilestoneCompletion, todayEntry,
      onlineUsers,
      quranPosition, advanceQuranPosition, getWeekGoalAyahs, getWeekGoalProgress,
      surahPositions, saveSurahPosition, resetLocalData, resetHifzProgress,
      toggleCheckedSurah, isSurahChecked, clearCheckedSurahs,
      quizSelectedSurahs, setQuizSelectedSurahs, toggleQuizSurahSelection, isQuizSurahSelected,
      memorizedAyahKeys, markAyahsMemorized, removeMemorizedAyahKeys, toggleAyahMemorized, isAyahMemorized,
      certificates, pendingCertToast, dismissCertToast, pendingAlreadyCertToast, dismissAlreadyCertToast,
    }}>
      {children}
    </QuranContext.Provider>
  );
}

export function useQuran() {
  const ctx = useContext(QuranContext);
  if (!ctx) throw new Error("useQuran must be used within QuranProvider");
  return ctx;
}
