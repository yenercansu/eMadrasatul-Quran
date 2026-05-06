import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  PanResponder,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const COMMITMENT_STEPS = [1, 2, 3, 5, 7, 10, 15, 25, 45];
const MAX_DAILY = 45;

function AyahSlider({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const THUMB = 26;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(Math.max(1, Math.min(max, Math.round((x / (trackWidthRef.current || 1)) * (max - 1)) + 1)));
      },
      onPanResponderMove: (evt) => {
        const x = Math.max(0, Math.min(trackWidthRef.current, evt.nativeEvent.locationX));
        onChange(Math.max(1, Math.min(max, Math.round((x / (trackWidthRef.current || 1)) * (max - 1)) + 1)));
      },
    })
  ).current;

  const thumbLeft = trackWidth > 0 ? ((value - 1) / (max - 1)) * (trackWidth - THUMB) : 0;

  return (
    <View
      style={s.sliderContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setTrackWidth(w);
        trackWidthRef.current = w;
      }}
      {...pan.panHandlers}
    >
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { width: thumbLeft + THUMB / 2 }]} />
      </View>
      {trackWidth > 0 && (
        <View style={[s.sliderThumb, { left: thumbLeft }]} />
      )}
    </View>
  );
}

interface Props {
  visible: boolean;
  currentAyahsPerDay: number;
  remainingInTarget?: number;
  onSave: (ayahsPerDay: number) => void;
  onClose: () => void;
}

export function EditDailyGoalModal({ visible, currentAyahsPerDay, remainingInTarget, onSave, onClose }: Props) {
  const effectiveMax = Math.min(MAX_DAILY, remainingInTarget ?? MAX_DAILY);
  const [ayahsPerDay, setAyahsPerDay] = useState(currentAyahsPerDay);

  useEffect(() => {
    if (visible) setAyahsPerDay(Math.min(effectiveMax, currentAyahsPerDay));
  }, [visible, currentAyahsPerDay, effectiveMax]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.handle} />
              <Text style={s.title}>Edit Daily Goal</Text>
              <Text style={s.sub}>
                Adjust how many Ayahs you want to memorize every day.
              </Text>

              <View style={s.pinWrapper}>
                <View style={s.valueBadge}>
                  <Text style={s.valueNum}>{ayahsPerDay}</Text>
                </View>
                <View style={s.valuePin} />
              </View>
              <Text style={s.valueLabel}>AYAHS PER DAY</Text>

              <AyahSlider value={ayahsPerDay} onChange={setAyahsPerDay} max={effectiveMax} />

              <View style={s.dots}>
                {COMMITMENT_STEPS.filter(step => step <= effectiveMax).map((step) => (
                  <View key={step} style={[s.dot, ayahsPerDay >= step && s.dotFilled]} />
                ))}
              </View>

              <View style={s.infoCard}>
                <View style={s.infoDot} />
                <Text style={s.infoText}>
                  Users who set goals between 5-10 Ayahs are{" "}
                  <Text style={s.infoBold}>40% more likely</Text>
                  {" "}to maintain their streaks.
                </Text>
              </View>

              <TouchableOpacity
                style={s.updateBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onSave(ayahsPerDay);
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <Text style={s.updateBtnText}>Update Goal</Text>
                <Feather name="arrow-right" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 22,
  },
  title: {
    fontSize: 22, fontWeight: "700", color: "#1A1A1A",
    fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8,
  },
  sub: {
    fontSize: 14, color: "#8E8E93", fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20, marginBottom: 28,
  },

  pinWrapper: { alignItems: "center", marginBottom: 8 },
  valueBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  valueNum: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  valuePin: {
    width: 4, height: 14,
    backgroundColor: "#1A1A1A", borderRadius: 2,
  },
  valueLabel: {
    fontSize: 11, fontWeight: "700", color: "#8E8E93",
    letterSpacing: 1.2, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", textAlign: "center", marginBottom: 12,
  },

  sliderContainer: { height: 44, justifyContent: "center", marginBottom: 4 },
  sliderTrack: { height: 3, backgroundColor: "#E0E0E0", borderRadius: 2 },
  sliderFill: { position: "absolute", height: 3, backgroundColor: "#1A1A1A", borderRadius: 2 },
  sliderThumb: {
    position: "absolute",
    top: -11.5,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#1A1A1A",
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },

  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 8, marginBottom: 22 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#E0E0E0" },
  dotFilled: { backgroundColor: "#1A1A1A" },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#F2F2F7", borderRadius: 12, padding: 14, marginBottom: 24,
  },
  infoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1A1A1A", marginTop: 4, flexShrink: 0 },
  infoText: { flex: 1, fontSize: 13, color: "#5A5A5A", fontFamily: "Inter_400Regular", lineHeight: 19 },
  infoBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },

  updateBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  updateBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});
