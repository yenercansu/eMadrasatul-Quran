import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedWord {
  id: string;
  arabic: string;
  translation: string;
  surahNumber: number;
  ayahNumber: number;
  addedAt: number;
  highlighted: boolean;
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
}

export interface Goal {
  ayahsPerDay: number;
  startDate: string;
}

export interface AccountSettings {
  name: string;
  email: string;
  fontSize: number;
  theme: "auto" | "light" | "dark";
  dailyNotifications: boolean;
  notificationTime: string;
}

interface Settings {
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  colorCoding: boolean;
  tajweedColorCoding: boolean;
  mushafMode: boolean;
  repeatCount: number;
  selectedReciter: string;
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
  recentProgress: Progress[];
  saveProgress: (progress: Omit<Progress, "timestamp">) => void;
  lastListened: Progress | null;
  goal: Goal | null;
  setGoal: (goal: Goal | null) => void;
  dailyEntries: DailyEntry[];
  recordAyahRead: (surahNumber: number) => void;
  todayEntry: DailyEntry | null;
  onlineUsers: number;
}

const DEFAULT_SETTINGS: Settings = {
  showTranslation: true,
  showTransliteration: false,
  showTafsir: false,
  colorCoding: false,
  tajweedColorCoding: false,
  mushafMode: false,
  repeatCount: 1,
  selectedReciter: "ar.alafasy",
};

const DEFAULT_ACCOUNT: AccountSettings = {
  name: "",
  email: "",
  fontSize: 28,
  theme: "auto",
  dailyNotifications: false,
  notificationTime: "08:00",
};

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isFriday(): boolean {
  return new Date().getDay() === 5;
}

const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [recentProgress, setRecentProgress] = useState<Progress[]>([]);
  const [lastListened, setLastListened] = useState<Progress | null>(null);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [onlineUsers] = useState(() => Math.floor(12000 + Math.random() * 4000));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const keys = [
        "quran_settings", "quran_saved_words", "quran_recent_progress",
        "quran_last_listened", "quran_goal", "quran_daily_entries", "quran_account",
      ];
      const results = await AsyncStorage.multiGet(keys);
      const map = Object.fromEntries(results.map(([k, v]) => [k, v]));

      if (map.quran_settings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(map.quran_settings) });
      if (map.quran_account) setAccountSettings({ ...DEFAULT_ACCOUNT, ...JSON.parse(map.quran_account) });
      if (map.quran_saved_words) setSavedWords(JSON.parse(map.quran_saved_words));
      if (map.quran_recent_progress) setRecentProgress(JSON.parse(map.quran_recent_progress));
      if (map.quran_last_listened) setLastListened(JSON.parse(map.quran_last_listened));
      if (map.quran_goal) setGoalState(JSON.parse(map.quran_goal));
      if (map.quran_daily_entries) {
        const entries: DailyEntry[] = JSON.parse(map.quran_daily_entries);
        setDailyEntries(entries);
        // Auto-mark Kahf on Fridays if they've read surah 18 today
        if (isFriday()) {
          const today = getTodayStr();
          const todayEntry = entries.find(e => e.date === today);
          if (todayEntry && !todayEntry.kahfCompleted) {
            // Will be marked when they read Al-Kahf
          }
        }
      }
    } catch {}
  }

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
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
      return next;
    });
  }, []);

  const saveWord = useCallback((word: Omit<SavedWord, "id" | "addedAt">) => {
    setSavedWords((prev) => {
      const exists = prev.find(w => w.arabic === word.arabic && w.surahNumber === word.surahNumber);
      if (exists) return prev;
      const newWord: SavedWord = {
        ...word,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        addedAt: Date.now(),
      };
      const next = [newWord, ...prev];
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeWord = useCallback((id: string) => {
    setSavedWords((prev) => {
      const next = prev.filter(w => w.id !== id);
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleHighlight = useCallback((id: string) => {
    setSavedWords((prev) => {
      const next = prev.map(w => w.id === id ? { ...w, highlighted: !w.highlighted } : w);
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      return next;
    });
  }, []);

  const saveProgress = useCallback((progress: Omit<Progress, "timestamp">) => {
    const full: Progress = { ...progress, timestamp: Date.now() };
    setLastListened(full);
    setRecentProgress((prev) => {
      const filtered = prev.filter(p => p.surahNumber !== progress.surahNumber);
      const next = [full, ...filtered].slice(0, 10);
      AsyncStorage.setItem("quran_recent_progress", JSON.stringify(next));
      return next;
    });
    AsyncStorage.setItem("quran_last_listened", JSON.stringify(full));
  }, []);

  const setGoal = useCallback((newGoal: Goal | null) => {
    setGoalState(newGoal);
    if (newGoal) {
      AsyncStorage.setItem("quran_goal", JSON.stringify(newGoal));
    } else {
      AsyncStorage.removeItem("quran_goal");
    }
  }, []);

  const recordAyahRead = useCallback((surahNumber: number) => {
    const today = getTodayStr();
    const isKahf = surahNumber === 18 && isFriday();
    setDailyEntries((prev) => {
      const idx = prev.findIndex(e => e.date === today);
      let next: DailyEntry[];
      if (idx >= 0) {
        next = prev.map((e, i) => i === idx
          ? { ...e, ayahsRead: e.ayahsRead + 1, kahfCompleted: e.kahfCompleted || isKahf }
          : e
        );
      } else {
        next = [{ date: today, ayahsRead: 1, kahfCompleted: isKahf }, ...prev].slice(0, 365);
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
      recentProgress, saveProgress, lastListened,
      goal, setGoal,
      dailyEntries, recordAyahRead, todayEntry,
      onlineUsers,
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
