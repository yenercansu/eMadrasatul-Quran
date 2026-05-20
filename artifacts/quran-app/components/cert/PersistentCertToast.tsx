import React, { useRef } from "react";
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import type { Certificate } from "@/contexts/QuranContext";

interface PersistentCertToastProps {
  cert: Certificate;
  onDismiss: () => void;
  alreadyEarned?: boolean;
}

function getCertLabel(cert: Certificate, alreadyEarned: boolean): string {
  if (alreadyEarned) {
    if (cert.type === "full-quran") return "Full Quran certificate is already available in Madrasa.";
    if (cert.type === "surah") return "This surah certificate is already available in Madrasa.";
    return "This juz certificate is already available in Madrasa.";
  }
  if (cert.type === "full-quran") return "Full Quran Hifz certificate is ready.";
  if (cert.type === "surah") return "Your surah certificate is ready in Madrasa.";
  return "Your juz certificate is ready in Madrasa.";
}

function getCertRoute(cert: Certificate): string {
  if (cert.type === "full-quran") return "/certifications";
  if (cert.type === "surah") return `/certificate/surah/${cert.surahNumber}`;
  return `/certificate/juz/${cert.juzNumber}`;
}

export function PersistentCertToast({ cert, onDismiss, alreadyEarned = false }: PersistentCertToastProps) {
  const c = useColors();

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40) {
          Animated.timing(translateY, { toValue: -200, duration: 180, useNativeDriver: true }).start(() => onDismiss());
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: c.hifzCardBg, borderColor: c.borderSubtle, ...c.shadows.premiumCard }, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.hifzWarmBand, borderColor: c.borderSubtle }]}>
        <Feather name="award" size={16} color={c.hifzAccentMuted} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.hifzText }]}>
          {alreadyEarned ? "Certificate Already Earned" : "Certificate Unlocked"}
        </Text>
        <Text style={[styles.desc, { color: c.hifzMuted }]} numberOfLines={2}>
          {getCertLabel(cert, alreadyEarned)}
        </Text>
        <TouchableOpacity
          onPress={() => { onDismiss(); router.push(getCertRoute(cert) as any); }}
          activeOpacity={0.75}
        >
          <Text style={[styles.cta, { color: c.hifzAccentMuted }]}>View Certificate</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={16} color={c.hifzFaint} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  cta: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
});
