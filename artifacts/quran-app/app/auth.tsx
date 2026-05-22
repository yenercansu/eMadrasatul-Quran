import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LogoMark from "@/components/LogoMark";
import { InlineNotice } from "@/components/InlineNotice";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, continueLocally, isAuthenticated, authError, clearAuthError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const handleSignIn = async () => {
    clearAuthError();
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // error is stored in context
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLocally = async () => {
    setLocalLoading(true);
    try {
      await continueLocally();
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={s.header}>
        <View style={s.logo}>
          <LogoMark size={80} bgColor={colors.appLighterBg} />
        </View>
        <Text style={s.title}>Quran Madrasa</Text>
        <Text style={s.subtitle}>
          Sign in to sync your Quran reading, progress, saved words, and playback preferences across devices.
        </Text>
      </View>

      <View style={s.form}>
        {authError ? (
          <InlineNotice variant="error" description={authError} style={{ marginBottom: 8 }} />
        ) : null}

        <TouchableOpacity
          style={[s.googleBtn, loading && s.btnLoading]}
          onPress={handleSignIn}
          activeOpacity={0.85}
          disabled={loading || localLoading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <Feather name="log-in" size={18} color={colors.textPrimary} />
              <Text style={s.googleBtnText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.localBtn, localLoading && s.btnLoading]}
          onPress={handleContinueLocally}
          activeOpacity={0.7}
          disabled={loading || localLoading}
        >
          {localLoading ? (
            <ActivityIndicator color={colors.appLightText} />
          ) : (
            <Text style={s.localBtnText}>Continue without login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.appLighterBg,
      paddingHorizontal: 22,
      justifyContent: "center",
    },
    header: { alignItems: "center", marginBottom: 32 },
    logo: {
      marginBottom: 16,
    },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 8 },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
      color: colors.appLightText,
      maxWidth: 320,
    },
    form: { gap: 12 },
    googleBtn: {
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    localBtn: {
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    btnLoading: {
      opacity: 0.55,
    },
    googleBtnText: { color: colors.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    localBtnText: { color: colors.appLightText, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
