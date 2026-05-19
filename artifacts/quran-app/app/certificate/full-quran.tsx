import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { FullQuranCertificate } from "@/components/cert/FullQuranCertificate";
import colors from "@/constants/colors";

const ty = colors.typography;
const sp = colors.spacing;
const br = colors.borders;

export default function FullQuranCertificatePreviewScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View style={[styles.screen, { backgroundColor: c.hifzBackground, paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
        style={[styles.backBtn, { top: insets.top + 14, backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}
      >
        <Feather name="chevron-left" size={18} color={c.hifzAccentMuted} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Prominent PREVIEW banner — spans full width, below safe area */}
      <View style={[styles.previewBanner, { backgroundColor: c.hifzWarmBand, borderBottomColor: c.borderSubtle }]}>
        <Feather name="eye" size={12} color={c.hifzFaint} strokeWidth={1.8} />
        <Text style={[styles.previewBannerText, { color: c.hifzFaint }]}>
          PREVIEW — Complete your Hifz to earn this certificate, inshaAllah
        </Text>
      </View>

      <FullQuranCertificate
        isPreview
        completionDate={new Date()}
        fullHifzDays={0}
        fullHifzAyahsPerDay="–"
        streakDays={0}
        onBeginRevision={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: br.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp.xs,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.lg,
    borderBottomWidth: 1,
  },
  previewBannerText: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
