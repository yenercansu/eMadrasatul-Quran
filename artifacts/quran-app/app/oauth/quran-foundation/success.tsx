import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function QuranFoundationOAuthSuccessScreen() {
  const colors = useColors();
  const s = styles(colors);
  const queryClient = useQueryClient();

  useEffect(() => {
    WebBrowser.dismissBrowser();
    queryClient.invalidateQueries({ queryKey: ["quran-foundation-oauth-status"] });
  }, [queryClient]);

  return (
    <View style={s.root}>
      <View style={s.icon}>
        <Feather name="check" size={30} color="#16A34A" />
      </View>
      <Text style={s.title}>Quran Foundation connected</Text>
      <Text style={s.text}>Your Madeenan account is now linked. You can return to settings and continue memorizing.</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace("/settings")} activeOpacity={0.85}>
        <Text style={s.btnText}>Back to Settings</Text>
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
      backgroundColor: "#DCFCE7",
      marginBottom: 18,
    },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.appBlack, marginBottom: 8 },
    text: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", color: colors.appLightText, textAlign: "center", marginBottom: 24 },
    btn: { height: 48, borderRadius: 12, backgroundColor: colors.appBlack, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
    btnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  });
