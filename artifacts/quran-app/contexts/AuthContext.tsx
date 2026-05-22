import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  MadeenanApiError,
  setApiSessionToken,
  setUnauthorizedHandler,
  buildGoogleOAuthUrl,
  extractTokenFromCallbackUrl,
  type MadeenanSession,
} from "@/services/madeenanApi";
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  storeSessionToken,
} from "@/services/sessionStore";

const LOCAL_MODE_KEY = "local-mode-active";
const LOCAL_SESSION: MadeenanSession = {
  token: "local-demo-token",
  authProvider: "local",
  isLocalMode: true,
};

interface AuthContextType {
  session: MadeenanSession | null;
  isAuthenticated: boolean;
  isLocalMode: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  continueLocally: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const isLocalMode = !!session?.isLocalMode;

  const signOut = useCallback(async () => {
    setSession(null);
    setApiSessionToken(null);
    await clearStoredSessionToken();
    await AsyncStorage.removeItem(LOCAL_MODE_KEY);
    queryClient.clear();
    router.replace("/auth" as any);
  }, [queryClient]);

  // Only install the unauthorized handler for real (non-local) sessions.
  useEffect(() => {
    const hasRealToken = !!session?.token && !session.isLocalMode;
    setUnauthorizedHandler(hasRealToken ? signOut : null);
    return () => setUnauthorizedHandler(null);
  }, [session?.token, session?.isLocalMode, signOut]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const localMode = await AsyncStorage.getItem(LOCAL_MODE_KEY);
        if (localMode === "true") {
          if (mounted) setSession(LOCAL_SESSION);
          return;
        }
        const token = await getStoredSessionToken();
        if (mounted && token) {
          setApiSessionToken(token);
          setSession({ token });
        }
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistSession = useCallback(async (nextSession: MadeenanSession) => {
    setUnauthorizedHandler(null);
    await storeSessionToken(nextSession.token);
    setApiSessionToken(nextSession.token);
    setSession(nextSession);
    queryClient.invalidateQueries();
    router.replace("/(tabs)");
  }, [queryClient]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const returnUrl = Linking.createURL("oauth/google/callback", { scheme: "madeenan" });
      const authUrl = buildGoogleOAuthUrl(returnUrl);

      if (__DEV__) console.info("[Google Auth] Opening", { authUrl, returnUrl });

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (__DEV__) console.info("[Google Auth] Browser result", { type: result.type, url: result.type === "success" ? result.url.slice(0, 200) : "none" });

      if (result.type === "success" && result.url) {
        const token = extractTokenFromCallbackUrl(result.url);
        if (__DEV__) console.info("[Google Auth] Inline extracted token", { length: token?.length ?? 0, prefix: token?.slice(0, 12), suffix: token?.slice(-10) });
        if (token) {
          await persistSession({ token });
          return;
        }
      }

      if (result.type === "cancel") {
        throw new MadeenanApiError("Sign-in was cancelled.", {
          status: 0, code: "USER_CANCELLED", method: "GET", url: authUrl,
        });
      }

      // dismiss = callback route handles it; wait a moment then check if we got redirected
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const storedToken = await getStoredSessionToken();
      if (!storedToken) {
        throw new MadeenanApiError(
          "Could not complete Google sign-in.",
          { status: 0, code: "OAUTH_FAILED", method: "GET", url: authUrl },
        );
      }
    } catch (error) {
      if (error instanceof MadeenanApiError) {
        setAuthError(error.message);
        throw error;
      }
      const msg = messageFromError(error);
      setAuthError(msg);
      throw error;
    }
  }, [persistSession]);

  const continueLocally = useCallback(async () => {
    await AsyncStorage.setItem(LOCAL_MODE_KEY, "true");
    setSession(LOCAL_SESSION);
    router.replace("/(tabs)");
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    session,
    isAuthenticated: !!session?.token,
    isLocalMode,
    isBootstrapping,
    authError,
    signInWithGoogle,
    continueLocally,
    signOut,
    clearAuthError: () => setAuthError(null),
  }), [authError, continueLocally, isBootstrapping, isLocalMode, session, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
