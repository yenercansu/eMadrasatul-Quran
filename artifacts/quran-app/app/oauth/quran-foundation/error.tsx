import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function QuranFoundationOAuthErrorScreen() {
  const colors = useColors();
  const s = styles(colors);

  useEffect(() => {
    WebBrowser.dismissBrowser();
  }, []);

  return (
    <View style={s.root}>
      <View style={s.icon}>
        <Feather name="alert-circle" size={30} color={colors.destructive} />
      </View>
      <Text style={s.title}>Connection failed</Text>
      <Text style={s.text}>We could not link Quran Foundation just now. Please return to settings and try again.</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace("/settings")} activeOpacity={0.85}>
        <Text style={s.btnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.appLighterBg },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.destructiveSoft,
      marginBottom: 18,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 8 },
    text: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", color: colors.appLightText, textAlign: "center", marginBottom: 24 },
    btn: { height: 48, borderRadius: 12, backgroundColor: colors.accentPrimary, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
    btnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.onAccent },
  });
