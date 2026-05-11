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

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, isAuthenticated, authError, clearAuthError } = useAuth();
  const [loading, setLoading] = useState(false);

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={s.header}>
        <View style={s.logo}>
          <Feather name="book-open" size={28} color={colors.appBlack} />
        </View>
        <Text style={s.title}>Quran Madrasa</Text>
        <Text style={s.subtitle}>
          Sign in to sync your Quran reading, progress, saved words, and playback preferences across devices.
        </Text>
      </View>

      <View style={s.form}>
        {authError ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={s.errorText}>{authError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={s.googleBtn}
          onPress={handleSignIn}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.appBlack} />
          ) : (
            <>
              <Feather name="log-in" size={18} color={colors.appBlack} />
              <Text style={s.googleBtnText}>Sign in with Google</Text>
            </>
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
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
    },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.appBlack, marginBottom: 8 },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
      color: colors.appLightText,
      maxWidth: 320,
    },
    form: { gap: 12 },
    errorBox: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.destructive, fontFamily: "Inter_400Regular" },
    googleBtn: {
      height: 52,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    googleBtnText: { color: colors.appBlack, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
