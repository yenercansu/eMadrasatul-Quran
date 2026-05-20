import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { setApiSessionToken, extractTokenFromCallbackUrl } from "@/services/madeenanApi";
import { storeSessionToken } from "@/services/sessionStore";

export default function GoogleOAuthCallbackScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ token?: string; session?: string; session_token?: string }>();

  useEffect(() => {
    // On web the OAuth flow runs in a popup opened by openAuthSessionAsync.
    // maybeCompleteAuthSession signals the parent window (via postMessage +
    // localStorage) so it can resolve with { type: "success", url } and extract
    // the token inline. This must run before any navigation.
    WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

    WebBrowser.dismissBrowser();
    if (__DEV__) console.info("[Google Auth] Callback raw params", { keys: Object.keys(params) });

    let token: string | null = null;

    if (params.session) {
      try {
        const session = JSON.parse(params.session);
        if (session && typeof session === "object") {
          token = session.token || session.sessionToken || null;
        }
      } catch {}
    }

    token = token || params.token || params.session_token || null;

    if (token) {
      try { token = decodeURIComponent(token); } catch {}
    }

    if (__DEV__) console.info("[Google Auth] Callback extracted token", { length: token?.length ?? 0, prefix: token?.slice(0, 12), suffix: token?.slice(-10) });

    if (token) {
      // storeSessionToken uses localStorage on web (SecureStore is unavailable).
      // Don't let storage failure block navigation — the in-memory token set
      // by persistSession in the parent window is sufficient for the session.
      storeSessionToken(token)
        .catch(() => {})
        .then(() => {
          setApiSessionToken(token!);
          router.replace("/(tabs)");
        });
    } else {
      if (__DEV__) console.warn("[Google Auth] No token in callback URL");
      router.replace("/auth");
    }
  }, []);

  return (
    <View style={s(colors).root}>
      <ActivityIndicator color={colors.textPrimary} />
    </View>
  );
}

const s = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.appLighterBg },
  });
