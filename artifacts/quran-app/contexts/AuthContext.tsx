import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  MadeenanApiError,
  setApiSessionToken,
  setUnauthorizedHandler,
  signInEmail,
  signUpEmail,
  updateProgress,
  saveSurah as saveRemoteSurah,
  saveWord as saveRemoteWord,
  type MadeenanSession,
} from "@/services/madeenanApi";
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  storeSessionToken,
} from "@/services/sessionStore";
import { SURAH_DATA } from "@/constants/surahData";

const MIGRATION_FLAG = "madeenan:local-data-migrated-v1";

interface AuthContextType {
  session: MadeenanSession | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name?: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDateOnly(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

async function migrateLocalDataToBackend(): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (alreadyMigrated === "1") return;

  const results = await AsyncStorage.multiGet([
    "quran_saved_surahs",
    "quran_saved_words",
    "quran_memorized_ayahs",
    "quran_goal",
    "quran_memorization_goal",
  ]);
  const map = Object.fromEntries(results.map(([key, value]) => [key, value]));

  try {
    const savedSurahs: number[] = map.quran_saved_surahs ? JSON.parse(map.quran_saved_surahs) : [];
    for (const surahNumber of savedSurahs) {
      const meta = SURAH_DATA[surahNumber - 1];
      if (!meta) continue;
      await saveRemoteSurah({ surahNumber, name: meta.englishName }).catch(() => {});
    }

    const savedWords: Array<{
      id?: string;
      arabic?: string;
      translation?: string;
      surahNumber?: number;
      ayahNumber?: number;
    }> = map.quran_saved_words ? JSON.parse(map.quran_saved_words) : [];
    for (const [index, word] of savedWords.entries()) {
      if (!word.arabic || !word.translation || !word.surahNumber || !word.ayahNumber) continue;
      if (typeof word.id === "string" && word.id.startsWith("seed")) continue;
      await saveRemoteWord({
        surahNumber: word.surahNumber,
        ayahNumber: word.ayahNumber,
        wordPosition: index + 1,
        verseKey: `${word.surahNumber}:${word.ayahNumber}`,
        textArabic: word.arabic,
        translation: word.translation,
        masteryLevel: 0,
      }).catch(() => {});
    }

    const memorizedAyahKeys: string[] = map.quran_memorized_ayahs ? JSON.parse(map.quran_memorized_ayahs) : [];
    if (memorizedAyahKeys.length > 0) {
      await updateProgress({
        goalDate: getDateOnly(),
        ayahs: memorizedAyahKeys
          .map((key) => {
            const [surahRaw, ayahRaw] = key.split(":");
            const surahNumber = Number(surahRaw);
            const ayahNumber = Number(ayahRaw);
            if (!Number.isFinite(surahNumber) || !Number.isFinite(ayahNumber)) return null;
            return {
              surahNumber,
              ayahNumber,
              juzNumber: SURAH_DATA[surahNumber - 1]?.juz ?? 1,
              status: "memorized",
            };
          })
          .filter((item): item is { surahNumber: number; ayahNumber: number; juzNumber: number; status: "memorized" } => !!item),
      }).catch(() => {});
    }
  } finally {
    await AsyncStorage.setItem(MIGRATION_FLAG, "1");
  }
}

function messageFromError(error: unknown): string {
  if (error instanceof MadeenanApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<MadeenanSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    const hadToken = !!session?.token || !!(await getStoredSessionToken());
    setSession(null);
    setApiSessionToken(null);
    await clearStoredSessionToken();
    queryClient.clear();
    router.replace("/auth" as any);
  }, [queryClient, session?.token]);

  useEffect(() => {
    setUnauthorizedHandler(session?.token ? signOut : null);
    return () => setUnauthorizedHandler(null);
  }, [session?.token, signOut]);

  useEffect(() => {
    let mounted = true;
    const devToken = process.env.EXPO_PUBLIC_MADEENAN_SESSION_TOKEN;
    getStoredSessionToken()
      .then((token) => {
        if (!mounted) return;
        const restoredToken = token || devToken;
        if (restoredToken) {
          setApiSessionToken(restoredToken);
          setSession({ token: restoredToken });
        }
      })
      .finally(() => {
        if (mounted) setIsBootstrapping(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistSession = useCallback(async (nextSession: MadeenanSession) => {
    await storeSessionToken(nextSession.token);
    setApiSessionToken(nextSession.token);
    setSession(nextSession);
    await migrateLocalDataToBackend();
    queryClient.invalidateQueries();
    router.replace("/(tabs)");
  }, [queryClient]);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    setAuthError(null);
    try {
      await persistSession(await signInEmail(input));
    } catch (error) {
      setAuthError(messageFromError(error));
      throw error;
    }
  }, [persistSession]);

  const signUp = useCallback(async (input: { name?: string; email: string; password: string }) => {
    setAuthError(null);
    try {
      await persistSession(await signUpEmail(input));
    } catch (error) {
      setAuthError(messageFromError(error));
      throw error;
    }
  }, [persistSession]);

  const value = useMemo<AuthContextType>(() => ({
    session,
    isAuthenticated: !!session?.token,
    isBootstrapping,
    authError,
    signIn,
    signUp,
    signOut,
    clearAuthError: () => setAuthError(null),
  }), [authError, isBootstrapping, session, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
