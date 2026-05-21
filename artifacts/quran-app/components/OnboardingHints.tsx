import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function OnboardingHints({ visible, onDismiss }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [visible, fade]);

  useEffect(() => {
    if (!visible) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); };
  }, [visible, pulse]);

  if (!visible) return null;

  const dismiss = () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => onDismiss());
  };

  const iconScale = { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] };

  return (
    <Animated.View pointerEvents="auto" style={[s.overlay, { opacity: fade }]}>
      <TouchableOpacity activeOpacity={1} style={s.fill} onPress={dismiss}>
        <View style={s.center}>
          <View style={s.iconBubble}>
            <MaterialCommunityIcons name="gesture-tap-hold" size={36} color="#FFFFFF" />
          </View>
          <Animated.View style={[s.gestureIndicator, iconScale]}>
            <Feather name="arrow-down" size={48} color="#FFFFFF" />
          </Animated.View>
          <Text style={s.title}>Long-press a word</Text>
          <Text style={s.body}>to see its root, meaning, and add it to your quiz</Text>

          <View style={s.btnRow}>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.85} style={s.nextBtn}>
              <Text style={s.nextText}>Got it</Text>
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
  btnRow: { flexDirection: "row", gap: 12, marginTop: 32, alignItems: "center" },
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
