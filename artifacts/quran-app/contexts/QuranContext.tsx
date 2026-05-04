import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { SURAH_DATA } from "@/constants/surahData";

export interface SavedWord {
  id: string;
  arabic: string;
  translation: string;
  surahNumber: number;
  ayahNumber: number;
  addedAt: number;
  highlighted: boolean;
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
  readAyahKeys?: string[];
}

export interface Goal {
  ayahsPerDay: number;
  startDate: string;
  startSurahNumber?: number;
  startAyahNumber?: number;
}

export interface MemorizationGoal {
  path: "juz" | "surah";
  startSurahNumber: number;
  startSurahName: string;
  startDate: string;
  ayahsReadAtStart?: number;
}

export interface GoalAyah {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
}

export interface AccountSettings {
  name: string;
  email: string;
  fontSize: number;
  romanFontSize: number;
  theme: "auto" | "light" | "dark";
  dailyNotifications: boolean;
  notificationTime: string;
}

interface Settings {
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  selectedTafsirs: string[];
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
  lastListened: Progress | null;
  goal: Goal | null;
  setGoal: (goal: Goal | null) => void;
  memorizationGoal: MemorizationGoal | null;
  setMemorizationGoal: (goal: MemorizationGoal | null) => void;
  dailyEntries: DailyEntry[];
  recordAyahRead: (surahNumber: number, ayahNumber?: number) => void;
  todayEntry: DailyEntry | null;
  onlineUsers: number;
  quranPosition: number;
  advanceQuranPosition: (n: number) => void;
  getTodayGoalAyahs: () => GoalAyah[];
  getTodayGoalProgress: () => number;
  surahPositions: Record<number, number>;
  saveSurahPosition: (surahNum: number, ayahIndex: number) => void;
  checkedSurahs: number[];
  toggleCheckedSurah: (surahNum: number, ayahCount: number) => void;
  isSurahChecked: (surahNum: number) => boolean;
  clearCheckedSurahs: () => void;
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

const DEFAULT_SETTINGS: Settings = {
  showTranslation: true,
  showTransliteration: false,
  showTafsir: false,
  selectedTafsirs: ["en.maarifulquran"],
  colorCoding: false,
  tajweedColorCoding: false,
  mushafMode: false,
  repeatCount: 1,
  selectedReciter: "ar.alafasy",
  autoPauseMinutes: null,
};

const DEFAULT_ACCOUNT: AccountSettings = {
  name: "",
  email: "",
  fontSize: 28,
  romanFontSize: 14,
  theme: "light",
  dailyNotifications: false,
  notificationTime: "08:00",
};

function applyTheme(theme: AccountSettings["theme"]) {
  try {
    if (typeof Appearance.setColorScheme !== "function") return;
    if (theme === "dark") Appearance.setColorScheme("dark");
    else if (theme === "light") Appearance.setColorScheme("light");
    else Appearance.setColorScheme(null);
  } catch {}
}

const SEED_WORDS: SavedWord[] = [
  { id: "seed1", arabic: "الرَّحْمَٰنِ", translation: "The Most Gracious", surahNumber: 1, ayahNumber: 1, addedAt: Date.now() - 5000, highlighted: false },
  { id: "seed2", arabic: "الرَّحِيمِ", translation: "The Most Merciful", surahNumber: 1, ayahNumber: 1, addedAt: Date.now() - 4000, highlighted: true },
  { id: "seed3", arabic: "الْحَمْدُ", translation: "All praise", surahNumber: 1, ayahNumber: 2, addedAt: Date.now() - 3000, highlighted: false },
  { id: "seed4", arabic: "الصِّرَاطَ", translation: "The path / The way", surahNumber: 1, ayahNumber: 6, addedAt: Date.now() - 2000, highlighted: false },
  { id: "seed5", arabic: "الْمُسْتَقِيمَ", translation: "The straight (one)", surahNumber: 1, ayahNumber: 6, addedAt: Date.now() - 1000, highlighted: false },
];

function getTodayStr(): string { return new Date().toISOString().split("T")[0]; }
function isFriday(): boolean { return new Date().getDay() === 5; }

export const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [savedWords, setSavedWords] = useState<SavedWord[]>(SEED_WORDS);
  const [savedAyahs, setSavedAyahs] = useState<SavedAyah[]>([]);
  const [savedSurahs, setSavedSurahs] = useState<number[]>([]);
  const [highlightedWords, setHighlightedWords] = useState<HighlightedWord[]>([]);
  const [recentProgress, setRecentProgress] = useState<Progress[]>([]);
  const [lastListened, setLastListened] = useState<Progress | null>(null);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [memorizationGoal, setMemorizationGoalState] = useState<MemorizationGoal | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [onlineUsers] = useState(() => Math.floor(12000 + Math.random() * 4000));
  const [quranPosition, setQuranPosition] = useState(0);
  const [surahPositions, setSurahPositions] = useState<Record<number, number>>({});
  const [checkedSurahs, setCheckedSurahs] = useState<number[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const keys = [
        "quran_settings", "quran_saved_words", "quran_recent_progress",
        "quran_last_listened", "quran_goal", "quran_daily_entries",
        "quran_account", "quran_saved_surahs", "quran_highlighted_words",
        "quran_saved_ayahs", "quran_position", "quran_surah_positions",
        "quran_checked_surahs", "quran_memorization_goal",
      ];
      const results = await AsyncStorage.multiGet(keys);
      const map = Object.fromEntries(results.map(([k, v]) => [k, v]));
      if (map.quran_settings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(map.quran_settings) });
      if (map.quran_account) {
        const loaded = { ...DEFAULT_ACCOUNT, ...JSON.parse(map.quran_account) };
        if (loaded.theme === "auto") loaded.theme = "light";
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
      if (map.quran_goal) setGoalState(JSON.parse(map.quran_goal));
      if (map.quran_memorization_goal) setMemorizationGoalState(JSON.parse(map.quran_memorization_goal));
      if (map.quran_daily_entries) setDailyEntries(JSON.parse(map.quran_daily_entries));
      if (map.quran_position) setQuranPosition(JSON.parse(map.quran_position));
      if (map.quran_surah_positions) setSurahPositions(JSON.parse(map.quran_surah_positions));
      if (map.quran_checked_surahs) setCheckedSurahs(JSON.parse(map.quran_checked_surahs));
    } catch {}
  }

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.tajweedColorCoding === true) next.showTransliteration = false;
      if (partial.showTransliteration === true) next.tajweedColorCoding = false;
      if (partial.mushafMode === true) { next.showTranslation = false; next.showTransliteration = false; next.showTafsir = false; next.tajweedColorCoding = false; next.colorCoding = false; }
      if (partial.colorCoding === true) next.tajweedColorCoding = false;
      if (partial.tajweedColorCoding === true) next.colorCoding = false;
      AsyncStorage.setItem("quran_settings", JSON.stringify(next));
      return next;
    });
  }, []);

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
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)); return next;
    });
  }, []);

  const removeWord = useCallback((id: string) => {
    setSavedWords((prev) => { const next = prev.filter(w => w.id !== id); AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)); return next; });
  }, []);

  const toggleHighlight = useCallback((id: string) => {
    setSavedWords((prev) => { const next = prev.map(w => w.id === id ? { ...w, highlighted: !w.highlighted } : w); AsyncStorage.setItem("quran_saved_words", JSON.stringify(next)); return next; });
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
  const saveSurah = useCallback((num: number) => { setSavedSurahs((prev) => { if (prev.includes(num)) return prev; const next = [num, ...prev]; AsyncStorage.setItem("quran_saved_surahs", JSON.stringify(next)); return next; }); }, []);
  const removeSavedSurah = useCallback((num: number) => { setSavedSurahs((prev) => { const next = prev.filter(n => n !== num); AsyncStorage.setItem("quran_saved_surahs", JSON.stringify(next)); return next; }); }, []);
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

  const getTodayGoalAyahs = useCallback((): GoalAyah[] => {
    if (!goal) return [];
    let startPos = quranPosition;
    if (goal.startSurahNumber != null && goal.startAyahNumber != null) {
      let pos = 0;
      for (const s of SURAH_DATA) {
        if (s.number === goal.startSurahNumber) {
          startPos = pos + (goal.startAyahNumber - 1);
          break;
        }
        pos += s.ayahCount;
      }
    }
    return Array.from({ length: goal.ayahsPerDay }, (_, i) =>
      getAyahAtLinearIndex((startPos + i) % TOTAL_AYAHS)
    );
  }, [goal, quranPosition]);

  const getTodayGoalProgress = useCallback((): number => {
    if (!goal) return 0;
    const todayStr = getTodayStr();
    const entry = dailyEntries.find(e => e.date === todayStr);
    if (!entry) return 0;
    if (goal.startSurahNumber == null || goal.startAyahNumber == null) {
      return entry.ayahsRead;
    }
    const goalAyahsList = (() => {
      let startPos = quranPosition;
      let pos = 0;
      for (const s of SURAH_DATA) {
        if (s.number === goal.startSurahNumber) { startPos = pos + (goal.startAyahNumber! - 1); break; }
        pos += s.ayahCount;
      }
      return Array.from({ length: goal.ayahsPerDay }, (_, i) => getAyahAtLinearIndex((startPos + i) % TOTAL_AYAHS));
    })();
    const goalKeys = new Set(goalAyahsList.map(a => `${a.surahNumber}:${a.ayahNumber}`));
    const readKeys = entry.readAyahKeys ?? [];
    return readKeys.filter(k => goalKeys.has(k)).length;
  }, [goal, dailyEntries, quranPosition]);

  const saveSurahPosition = useCallback((surahNum: number, ayahIndex: number) => {
    setSurahPositions((prev) => {
      const next = { ...prev, [surahNum]: ayahIndex };
      AsyncStorage.setItem("quran_surah_positions", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleCheckedSurah = useCallback((surahNum: number, ayahCount: number) => {
    const wasChecked = checkedSurahs.includes(surahNum);
    setCheckedSurahs((prev) => {
      const next = prev.includes(surahNum) ? prev.filter(n => n !== surahNum) : [...prev, surahNum];
      AsyncStorage.setItem("quran_checked_surahs", JSON.stringify(next));
      return next;
    });
    if (!wasChecked) {
      const today = getTodayStr();
      const isKahf = surahNum === 18 && isFriday();
      const increment = Math.min(ayahCount, 10);
      setDailyEntries((de) => {
        const idx = de.findIndex(e => e.date === today);
        let next: DailyEntry[];
        if (idx >= 0) { next = de.map((e, i) => i === idx ? { ...e, ayahsRead: e.ayahsRead + increment, kahfCompleted: e.kahfCompleted || isKahf } : e); }
        else { next = [{ date: today, ayahsRead: increment, kahfCompleted: isKahf }, ...de].slice(0, 365); }
        AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
        return next;
      });
    }
  }, [checkedSurahs]);

  const isSurahChecked = useCallback((surahNum: number) => checkedSurahs.includes(surahNum), [checkedSurahs]);

  const clearCheckedSurahs = useCallback(() => {
    setCheckedSurahs([]);
    AsyncStorage.setItem("quran_checked_surahs", JSON.stringify([]));
  }, []);

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
        next = [{ date: today, ayahsRead: 1, kahfCompleted: isKahf, readAyahKeys: key ? [key] : [] }, ...prev].slice(0, 365);
      }
      AsyncStorage.setItem("quran_daily_entries", JSON.stringify(next));
      return next;
    });
  }, []);

  const todayEntry = dailyEntries.find(e => e.date === getTodayStr()) ?? null;

  return (
    <QuranContext.Provider value={{
      settings, updateSettings,
      accountSettings, updateAccountSettings,
      savedWords, saveWord, removeWord, toggleHighlight,
      savedAyahs, saveAyah, removeAyah, isAyahSaved,
      savedSurahs, saveSurah, removeSavedSurah, isSurahSaved,
      highlightedWords, highlightWord, unhighlightWord, isWordHighlighted,
      recentProgress, saveProgress, lastListened,
      goal, setGoal,
      memorizationGoal, setMemorizationGoal,
      dailyEntries, recordAyahRead, todayEntry,
      onlineUsers,
      quranPosition, advanceQuranPosition, getTodayGoalAyahs, getTodayGoalProgress,
      surahPositions, saveSurahPosition,
      checkedSurahs, toggleCheckedSurah, isSurahChecked, clearCheckedSurahs,
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
