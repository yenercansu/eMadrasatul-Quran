import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  surahNumber: number;
  surahName: string;
  surahNameAr: string;
  translation: string;
  transliteration: string;
  juz: number;
  page: number;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

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
  savedWords: SavedWord[];
  saveWord: (word: Omit<SavedWord, "id" | "addedAt">) => void;
  removeWord: (id: string) => void;
  toggleHighlight: (id: string) => void;
  recentProgress: Progress[];
  saveProgress: (progress: Omit<Progress, "timestamp">) => void;
  lastListened: Progress | null;
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

const QuranContext = createContext<QuranContextType | undefined>(undefined);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [recentProgress, setRecentProgress] = useState<Progress[]>([]);
  const [lastListened, setLastListened] = useState<Progress | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsStr, wordsStr, progressStr, lastStr] = await Promise.all([
        AsyncStorage.getItem("quran_settings"),
        AsyncStorage.getItem("quran_saved_words"),
        AsyncStorage.getItem("quran_recent_progress"),
        AsyncStorage.getItem("quran_last_listened"),
      ]);
      if (settingsStr) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsStr) });
      if (wordsStr) setSavedWords(JSON.parse(wordsStr));
      if (progressStr) setRecentProgress(JSON.parse(progressStr));
      if (lastStr) setLastListened(JSON.parse(lastStr));
    } catch {}
  }

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.colorCoding && partial.colorCoding === true) {
        next.tajweedColorCoding = false;
      }
      if (partial.tajweedColorCoding && partial.tajweedColorCoding === true) {
        next.colorCoding = false;
      }
      AsyncStorage.setItem("quran_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const saveWord = useCallback((word: Omit<SavedWord, "id" | "addedAt">) => {
    setSavedWords((prev) => {
      const exists = prev.find(
        (w) => w.arabic === word.arabic && w.surahNumber === word.surahNumber
      );
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
      const next = prev.filter((w) => w.id !== id);
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleHighlight = useCallback((id: string) => {
    setSavedWords((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, highlighted: !w.highlighted } : w));
      AsyncStorage.setItem("quran_saved_words", JSON.stringify(next));
      return next;
    });
  }, []);

  const saveProgress = useCallback((progress: Omit<Progress, "timestamp">) => {
    const full: Progress = { ...progress, timestamp: Date.now() };
    setLastListened(full);
    setRecentProgress((prev) => {
      const filtered = prev.filter(
        (p) => !(p.surahNumber === progress.surahNumber)
      );
      const next = [full, ...filtered].slice(0, 5);
      AsyncStorage.setItem("quran_recent_progress", JSON.stringify(next));
      return next;
    });
    AsyncStorage.setItem("quran_last_listened", JSON.stringify(full));
  }, []);

  return (
    <QuranContext.Provider
      value={{
        settings,
        updateSettings,
        savedWords,
        saveWord,
        removeWord,
        toggleHighlight,
        recentProgress,
        saveProgress,
        lastListened,
      }}
    >
      {children}
    </QuranContext.Provider>
  );
}

export function useQuran() {
  const ctx = useContext(QuranContext);
  if (!ctx) throw new Error("useQuran must be used within QuranProvider");
  return ctx;
}
