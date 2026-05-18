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
      storeSessionToken(token).then(() => {
        setApiSessionToken(token);
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
