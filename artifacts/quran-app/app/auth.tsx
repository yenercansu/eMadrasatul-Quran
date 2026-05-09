import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { signIn, signUp, isAuthenticated, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const submit = async () => {
    clearAuthError();
    setLocalError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLocalError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "sign-up" && trimmedName.length < 2) {
      setLocalError("Enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "sign-in") {
        await signIn({ email: trimmedEmail, password });
      } else {
        await signUp({ name: trimmedName, email: trimmedEmail, password });
      }
    } catch {
      // AuthContext stores the user-facing error.
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
        <Text style={s.subtitle}>Sign in with Madeenan to sync Quran reading, progress, saved words, and playback preferences.</Text>
      </View>

      <View style={s.form}>
        <View style={s.segment}>
          <TouchableOpacity
            style={[s.segmentBtn, mode === "sign-in" && s.segmentBtnActive]}
            onPress={() => { setMode("sign-in"); clearAuthError(); setLocalError(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, mode === "sign-in" && s.segmentTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segmentBtn, mode === "sign-up" && s.segmentBtnActive]}
            onPress={() => { setMode("sign-up"); clearAuthError(); setLocalError(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, mode === "sign-up" && s.segmentTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {mode === "sign-up" && (
          <TextInput
            style={s.input}
            placeholder="Name"
            placeholderTextColor={colors.appBorderMid}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
        )}
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.appBorderMid}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.appBorderMid}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={mode === "sign-up" ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {!!(localError || authError) && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={s.errorText}>{localError || authError}</Text>
          </View>
        )}

        <TouchableOpacity style={s.primaryBtn} onPress={submit} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={s.primaryText}>{mode === "sign-in" ? "Sign In" : "Create Account"}</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
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
    header: { alignItems: "center", marginBottom: 28 },
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
    segment: {
      flexDirection: "row",
      backgroundColor: colors.appStone,
      borderRadius: 12,
      padding: 4,
      marginBottom: 4,
    },
    segmentBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    segmentBtnActive: { backgroundColor: "#FFFFFF" },
    segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.appBorderMid },
    segmentTextActive: { color: colors.appBlack },
    input: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.appBorderLighter,
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 14,
      color: colors.appBlack,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
    },
    errorBox: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
      borderRadius: 12,
      padding: 12,
    },
    errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.destructive, fontFamily: "Inter_400Regular" },
    primaryBtn: {
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.appBlack,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    primaryText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  });
