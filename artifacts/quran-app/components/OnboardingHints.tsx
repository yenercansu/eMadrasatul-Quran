import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Easing,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");

interface Step {
  key: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  arrowDir: "left" | "right" | "down";
}

const STEPS: Step[] = [
  {
    key: "right",
    icon: <Ionicons name="repeat" size={36} color="#FFFFFF" />,
    title: "Swipe right",
    body: "to repeat the ayah 2×, 5×, 10× or ∞ times",
    arrowDir: "right",
  },
  {
    key: "left",
    icon: <Ionicons name="bookmark" size={32} color="#FFFFFF" />,
    title: "Swipe left",
    body: "to save the ayah to your library",
    arrowDir: "left",
  },
  {
    key: "long",
    icon: <MaterialCommunityIcons name="gesture-tap-hold" size={36} color="#FFFFFF" />,
    title: "Long-press a word",
    body: "to see its root, meaning, and add it to your quiz",
    arrowDir: "down",
  },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Three-step onboarding swipe hints, shown once on first launch of a Surah page.
 */
export function OnboardingHints({ visible, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [visible, fade]);

  useEffect(() => {
    if (!visible) return;
    // Animate the gesture indicator
    slide.setValue(0);
    const cur = STEPS[step];
    let loop: Animated.CompositeAnimation;
    if (cur.arrowDir === "right") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(slide, { toValue: 60, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    } else if (cur.arrowDir === "left") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(slide, { toValue: -60, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    } else {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(slide, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
    }
    loop.start();
    return () => { loop.stop(); };
  }, [step, visible, slide]);

  if (!visible) return null;

  const cur = STEPS[step];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => onDismiss());
    }
  };

  const handleSkip = () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => onDismiss());
  };

  const arrowTransform = cur.arrowDir === "down"
    ? { transform: [{ scale: slide.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }
    : { transform: [{ translateX: slide }] };

  return (
    <Animated.View pointerEvents="auto" style={[s.overlay, { opacity: fade }]}>
      <TouchableOpacity activeOpacity={1} style={s.fill} onPress={handleNext}>
        <View style={s.center}>
          <View style={s.iconBubble}>{cur.icon}</View>
          <Animated.View style={[s.gestureIndicator, arrowTransform]}>
            {cur.arrowDir === "right" && <Feather name="arrow-right" size={48} color="#FFFFFF" />}
            {cur.arrowDir === "left" && <Feather name="arrow-left" size={48} color="#FFFFFF" />}
            {cur.arrowDir === "down" && <Feather name="arrow-down" size={48} color="#FFFFFF" />}
          </Animated.View>
          <Text style={s.title}>{cur.title}</Text>
          <Text style={s.body}>{cur.body}</Text>

          <View style={s.dotsRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.75} style={s.skipBtn}>
              <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={s.nextBtn}>
              <Text style={s.nextText}>{step === STEPS.length - 1 ? "Got it" : "Next"}</Text>
              <Feather name="arrow-right" size={16} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  fill: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center", padding: 32, maxWidth: SCREEN_W * 0.85 },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  gestureIndicator: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 28,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { backgroundColor: "#FFFFFF", width: 18 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 24, alignItems: "center" },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextText: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
});
