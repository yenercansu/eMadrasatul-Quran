import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  PanResponder,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio, RECITERS, PLAYBACK_RATES } from "@/contexts/AudioContext";
import { SettingsSheet, TAFSIR_EDITIONS } from "@/components/SettingsSheet";
import { RangeSelectorModal } from "@/components/RangeSelectorModal";
import { fetchSurahWithTranslations, fetchTafsir, type SurahDetail, type ApiAyah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AYAHS_PER_PAGE = 10;
const MUSHAF_BG = "#F5EDD6";
const WORD_COLORS = ["#E8507A", "#F2994A", "#27AE60", "#2F80ED", "#9B51E0", "#EB5757"];
const REPEAT_SWIPE_OPEN = 110;

// ─── Arabic text with optional color coding ──────────────────────────────────
function ArabicText({ text, colorCoding, style }: { text: string; colorCoding: boolean; style?: object }) {
  if (!colorCoding) {
    return <Text style={style}>{text}</Text>;
  }
  const words = text.split(" ");
  return (
    <Text style={style}>
      {words.map((w, i) => (
        <Text key={i} style={{ color: WORD_COLORS[i % WORD_COLORS.length] }}>
          {w}{i < words.length - 1 ? " " : ""}
        </Text>
      ))}
    </Text>
  );
}

// ─── Swipeable ayah card ───────────────────────────────────────────────────
interface AyahCardProps {
  ayah: ApiAyah;
  surahNum: number;
  isPlaying: boolean;
  isRepeating: boolean;
  repeatCount: number;
  translation: SurahDetail | null;
  transliteration: SurahDetail | null;
  tafsirDataMap: Record<string, SurahDetail>;
  showTranslation: boolean;
  showTransliteration: boolean;
  showTafsir: boolean;
  selectedTafsirs: string[];
  colorCoding: boolean;
  showBasmala: boolean;
  onSave: (ayah: ApiAyah) => void;
  onRepeat: (ayah: ApiAyah, count: number) => void;
  onPress: () => void;
  onWordLongPress?: (word: string, ayahNum: number) => void;
}

function SwipeableAyahCard({
  ayah, surahNum, isPlaying, isRepeating, repeatCount,
  translation, transliteration, tafsirDataMap,
  showTranslation, showTransliteration, showTafsir, selectedTafsirs,
  colorCoding, showBasmala, onSave, onRepeat, onPress, onWordLongPress,
}: AyahCardProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const [swipeOpen, setSwipeOpen] = useState(false);
  const swipeOpenRef = useRef(false);

  const closeSwipe = useCallback(() => {
    Animated.spring(pan, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    swipeOpenRef.current = false;
    setSwipeOpen(false);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, { dx }) => {
        if (swipeOpenRef.current) {
          pan.setValue(Math.min(REPEAT_SWIPE_OPEN + Math.max(0, dx - REPEAT_SWIPE_OPEN), REPEAT_SWIPE_OPEN));
        } else {
          if (dx > 0) pan.setValue(Math.min(dx, REPEAT_SWIPE_OPEN + 20));
          else pan.setValue(Math.max(dx, -90));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (swipeOpenRef.current) {
          if (dx < -20) {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            swipeOpenRef.current = false;
            setSwipeOpen(false);
          } else {
            Animated.spring(pan, { toValue: REPEAT_SWIPE_OPEN, useNativeDriver: true }).start();
          }
          return;
        }
        if (dx > 50 || vx > 0.5) {
          Animated.spring(pan, { toValue: REPEAT_SWIPE_OPEN, useNativeDriver: true, tension: 80 }).start();
          swipeOpenRef.current = true;
          setSwipeOpen(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (dx < -50 || vx < -0.5) {
          Animated.timing(pan, { toValue: -SCREEN_WIDTH * 1.2, duration: 260, useNativeDriver: true }).start(() => {
            pan.setValue(0);
            onSave(ayah);
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const translationAyah = translation?.ayahs[ayah.numberInSurah - 1];
  const transliterationAyah = transliteration?.ayahs[ayah.numberInSurah - 1];
  const tafsirs: { edition: string; name: string; text: string }[] = [];
  if (showTafsir) {
    for (const ed of selectedTafsirs) {
      const td = tafsirDataMap[ed];
      if (td) {
        const ta = td.ayahs[ayah.numberInSurah - 1];
        const edObj = TAFSIR_EDITIONS.find(e => e.id === ed);
        if (ta && edObj) tafsirs.push({ edition: ed, name: edObj.name, text: ta.text });
      }
    }
  }

  const cardBg = isPlaying ? "#DCFCE7" : "#FFFFFF";
  const borderColor = isPlaying ? "#86EFAC" : "#F0F0F0";

  return (
    <View style={cs.cardWrapper}>
      {/* Swipe right reveals repeat options */}
      <View style={cs.swipeReveal}>
        {[2, 5, 10, 0].map((count) => (
          <TouchableOpacity
            key={count}
            style={cs.repeatBtn}
            onPress={() => {
              closeSwipe();
              onRepeat(ayah, count === 0 ? 999 : count);
            }}
            activeOpacity={0.8}
          >
            <Text style={cs.repeatBtnText}>{count === 0 ? "∞" : `${count}×`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View
        style={[cs.card, { backgroundColor: cardBg, borderColor, transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={1} style={{ flex: 1 }}>
          {/* Ayah header */}
          <View style={cs.ayahHeader}>
            {isRepeating && (
              <View style={cs.repeatBadge}>
                <Text style={cs.repeatBadgeText}>{repeatCount === 999 ? "∞" : `${repeatCount}×`}</Text>
                <Ionicons name="repeat" size={11} color="#166534" />
              </View>
            )}
            <View style={[cs.ayahNumBadge, isPlaying && cs.ayahNumBadgePlaying]}>
              <Text style={[cs.ayahNumText, isPlaying && cs.ayahNumTextPlaying]}>
                {surahNum}:{ayah.numberInSurah}
              </Text>
            </View>
          </View>

          {showBasmala && (
            <Text style={[cs.basmala, isPlaying && { color: "#166534" }]}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
          )}

          <ArabicText
            text={ayah.text}
            colorCoding={colorCoding && !isPlaying}
            style={[cs.arabicText, isPlaying && !colorCoding && { color: "#166534" }]}
          />

          {showTransliteration && transliterationAyah && (
            <Text style={[cs.transliteration, isPlaying && { color: "#14532D" }]}>
              {transliterationAyah.text}
            </Text>
          )}

          {showTranslation && translationAyah && (
            <View style={[cs.translationBox, isPlaying && { backgroundColor: "rgba(255,255,255,0.5)", borderColor: "#86EFAC" }]}>
              <Text style={[cs.translation, isPlaying && { color: "#14532D" }]}>
                "{translationAyah.text}"
              </Text>
              <Text style={cs.translationSource}>Sahih International</Text>
            </View>
          )}

          {tafsirs.map(t => (
            <View key={t.edition} style={cs.tafsirBox}>
              <Text style={cs.tafsirName}>{t.name}</Text>
              <Text style={cs.tafsirText} numberOfLines={4}>{t.text}</Text>
            </View>
          ))}
        </TouchableOpacity>
      </Animated.View>

      {swipeOpen && (
        <TouchableWithoutFeedback onPress={closeSwipe}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  cardWrapper: { marginHorizontal: 16, marginBottom: 10, position: "relative" },
  swipeReveal: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: REPEAT_SWIPE_OPEN,
    flexDirection: "column",
    justifyContent: "center",
    paddingLeft: 8,
    gap: 6,
    zIndex: 0,
  },
  repeatBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  repeatBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 1,
  },
  ayahHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  repeatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  repeatBadgeText: { fontSize: 11, fontWeight: "700", color: "#166534", fontFamily: "Inter_700Bold" },
  ayahNumBadge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ayahNumBadgePlaying: { backgroundColor: "#166534" },
  ayahNumText: { fontSize: 11, fontWeight: "700", color: "#6B6B6B", fontFamily: "Inter_700Bold" },
  ayahNumTextPlaying: { color: "#FFFFFF" },
  basmala: {
    fontSize: 20,
    color: "#1A1A1A",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    lineHeight: 38,
    marginBottom: 10,
  },
  arabicText: {
    fontSize: 26,
    lineHeight: 50,
    color: "#1A1A1A",
    textAlign: "right",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
    marginBottom: 10,
  },
  transliteration: {
    fontSize: 13,
    color: "#7A7A7A",
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 20,
  },
  translationBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  translation: { fontSize: 14, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22 },
  translationSource: { fontSize: 11, color: "#AAAAAA", fontFamily: "Inter_400Regular", marginTop: 4, fontStyle: "italic" },
  tafsirBox: {
    backgroundColor: "#FFF8EE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EDD9A3",
  },
  tafsirName: { fontSize: 10, fontWeight: "700", color: "#8B6914", fontFamily: "Inter_700Bold", marginBottom: 4 },
  tafsirText: { fontSize: 12, color: "#5A4020", fontFamily: "Inter_400Regular", lineHeight: 18 },
});

// ─── Player Bar ───────────────────────────────────────────────────────────────
function PlayerBar({
  isPlaying, isLoading, currentSurah, currentAyah, range,
  playbackRate, repeatCount, currentRepeat,
  onPlay, onPause, onStop, onNext, onPrev, onSpeedPress, onEditPress,
  surahNum,
}: {
  isPlaying: boolean; isLoading: boolean;
  currentSurah: number | null; currentAyah: number | null;
  range: { startSurah: number; startAyah: number; endSurah: number; endAyah: number } | null;
  playbackRate: number; repeatCount: number; currentRepeat: number;
  onPlay: () => void; onPause: () => void; onStop: () => void;
  onNext: () => void; onPrev: () => void;
  onSpeedPress: () => void; onEditPress: () => void;
  surahNum: number;
}) {
  const hasRange = !!range;
  const isActive = currentSurah === surahNum || hasRange;

  return (
    <View style={pb.bar}>
      {hasRange && range && (
        <View style={pb.rangeRow}>
          <Ionicons name="radio-button-on" size={9} color="#22C55E" />
          <Text style={pb.rangeText}>
            range {range.startSurah}:{range.startAyah} – {range.endSurah}:{range.endAyah}
          </Text>
        </View>
      )}
      <View style={pb.controls}>
        <TouchableOpacity style={pb.iconBtn} onPress={onStop} activeOpacity={0.7}>
          <Ionicons name="stop" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={pb.speedBtn} onPress={onSpeedPress} activeOpacity={0.8}>
          <Text style={pb.speedText}>{playbackRate === 1 ? "1x" : `${playbackRate}x`}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pb.iconBtn} onPress={onNext} activeOpacity={0.7}>
          <Ionicons name="play-skip-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[pb.iconBtn, pb.playBtn]}
          onPress={isPlaying ? onPause : onPlay}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#1A1A1A" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={pb.iconBtn} onPress={onPrev} activeOpacity={0.7}>
          <Ionicons name="play-skip-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={pb.editBtn} onPress={onEditPress} activeOpacity={0.85}>
          <Text style={pb.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  bar: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  rangeText: { fontSize: 11, color: "#22C55E", fontFamily: "Inter_400Regular", fontWeight: "600" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  speedBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#333333",
    borderRadius: 10,
  },
  speedText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  playBtn: {
    backgroundColor: "#FFFFFF",
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  editBtn: {
    marginLeft: "auto" as any,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
});

// ─── Content Toggle Bar ───────────────────────────────────────────────────────
function ContentBar({
  showTranslation, showTransliteration, showTafsir, colorCoding, tajweedMode, mushafMode,
  onToggleTranslation, onToggleTransliteration, onToggleTafsir, onToggleColors, onToggleTajweed,
  onTafsirPress,
}: {
  showTranslation: boolean; showTransliteration: boolean; showTafsir: boolean;
  colorCoding: boolean; tajweedMode: boolean; mushafMode: boolean;
  onToggleTranslation: () => void; onToggleTransliteration: () => void;
  onToggleTafsir: () => void; onToggleColors: () => void; onToggleTajweed: () => void;
  onTafsirPress: () => void;
}) {
  const tabs = mushafMode
    ? [
        { label: "Meaning", icon: "book-open" as const, active: showTranslation, onPress: onToggleTranslation },
        { label: "Tafsir", icon: "align-left" as const, active: showTafsir, onPress: onTafsirPress },
        { label: "Tajweed", icon: "underline" as const, active: tajweedMode, onPress: onToggleTajweed },
      ]
    : [
        { label: "Meaning", icon: "book-open" as const, active: showTranslation, onPress: onToggleTranslation },
        { label: "Roman", icon: "type" as const, active: showTransliteration, onPress: onToggleTransliteration },
        { label: "Tafsir", icon: "align-left" as const, active: showTafsir, onPress: onTafsirPress },
        { label: "Colors", icon: "droplet" as const, active: colorCoding, onPress: onToggleColors },
        { label: "Tajweed", icon: "underline" as const, active: tajweedMode, onPress: onToggleTajweed },
      ];

  return (
    <View style={cb.bar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.label}
          style={cb.tab}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); tab.onPress(); }}
          activeOpacity={0.75}
        >
          {tab.label === "Colors" ? (
            <View style={cb.colorDots}>
              {["#E8507A", "#27AE60", "#2F80ED"].map((c, i) => (
                <View key={i} style={[cb.colorDot, { backgroundColor: c }, !tab.active && { opacity: 0.3 }]} />
              ))}
            </View>
          ) : (
            <Feather name={tab.icon} size={17} color={tab.active ? "#1A1A1A" : "#AAAAAA"} />
          )}
          <Text style={[cb.tabLabel, tab.active && cb.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const cb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: "600", color: "#AAAAAA", fontFamily: "Inter_600SemiBold" },
  tabLabelActive: { color: "#1A1A1A" },
  colorDots: { flexDirection: "row", gap: 2, alignItems: "center" },
  colorDot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Floating top nav (shown when menus hidden) ───────────────────────────────
function FloatingTopNav({
  surahName, onPrev, onNext, onLongPress, topInset,
}: {
  surahName: string; onPrev: () => void; onNext: () => void;
  onLongPress: () => void; topInset: number;
}) {
  return (
    <View style={[fn.wrapper, { top: topInset + 8 }]}>
      <View style={fn.pill}>
        <TouchableOpacity style={fn.navBtn} onPress={onPrev} activeOpacity={0.75}>
          <Feather name="chevron-left" size={16} color="#1A1A1A" />
          <Text style={fn.navLabel}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.9}>
          <Text style={fn.surahName}>{surahName}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fn.navBtn} onPress={onNext} activeOpacity={0.75}>
          <Text style={fn.navLabel}>Back</Text>
          <Feather name="chevron-right" size={16} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.85}>
        <Text style={fn.hint}>Long press to edit Ayah range</Text>
      </TouchableOpacity>
    </View>
  );
}

const fn = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, zIndex: 100, alignItems: "center", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
  },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 6 },
  navLabel: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", paddingHorizontal: 4 },
  hint: { fontSize: 11, color: "rgba(0,0,0,0.5)", fontFamily: "Inter_400Regular", backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
});

// ─── Bottom minimal nav (shown when menus hidden) ────────────────────────────
function FloatingBottomNav({ onPrev, onNext, bottomInset }: { onPrev: () => void; onNext: () => void; bottomInset: number }) {
  return (
    <View style={[fbn.wrapper, { bottom: bottomInset + 12 }]}>
      <TouchableOpacity style={fbn.btn} onPress={onPrev} activeOpacity={0.75}>
        <Feather name="chevron-left" size={22} color="#1A1A1A" />
      </TouchableOpacity>
      <TouchableOpacity style={fbn.btn} onPress={onNext} activeOpacity={0.75}>
        <Feather name="chevron-right" size={22} color="#1A1A1A" />
      </TouchableOpacity>
    </View>
  );
}

const fbn = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, zIndex: 100, flexDirection: "row", justifyContent: "center", gap: 24 },
  btn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.96)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
});

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditSheet({
  visible, onClose,
  settings, updateSettings,
  playbackRate, onSpeedChange,
  onPlayRange, onRepeatSection,
}: {
  visible: boolean; onClose: () => void;
  settings: { selectedReciter: string; repeatCount: number };
  updateSettings: (p: any) => void;
  playbackRate: number; onSpeedChange: (r: number) => void;
  onPlayRange: () => void; onRepeatSection: () => void;
}) {
  const [wordByWord, setWordByWord] = useState(false);
  const [memMode, setMemMode] = useState(false);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={es.backdrop} />
      </TouchableWithoutFeedback>
      <View style={es.sheet}>
        <View style={es.handle} />
        <Text style={es.title}>Editing</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Options */}
          {[
            {
              icon: "refresh-cw" as const,
              label: "Word-by-Word",
              desc: "repeat each word several times",
              value: wordByWord,
              onToggle: () => setWordByWord(v => !v),
            },
            {
              icon: "headphones" as const,
              label: "Memorisation Mode",
              desc: "Listen every Ayah with a pre-determined repetition frequency",
              value: memMode,
              onToggle: () => setMemMode(v => !v),
            },
          ].map((opt) => (
            <View key={opt.label} style={es.optionRow}>
              <View style={es.optionIcon}>
                <Feather name={opt.icon} size={20} color="#1A1A1A" />
              </View>
              <View style={es.optionInfo}>
                <Text style={es.optionLabel}>{opt.label}</Text>
                <Text style={es.optionDesc}>{opt.desc}</Text>
              </View>
              <Switch
                value={opt.value}
                onValueChange={opt.onToggle}
                trackColor={{ false: "#E0E0E0", true: "#1A1A1A" }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}

          {/* Buttons */}
          {[
            { icon: "scissors" as const, label: "Repeat Section", desc: "select an Ayah, edit to listen to a smaller part on repeat", onPress: () => { onClose(); onRepeatSection(); } },
            { icon: "book" as const, label: "Word dictionary", desc: "select a word, view root, meaning & add word to quiz", onPress: onClose },
            { icon: "play-circle" as const, label: "Play Within Range", desc: "select two ayahs, play only the selected range", onPress: () => { onClose(); onPlayRange(); } },
            { icon: "download" as const, label: "Download", desc: "download full Quran from the latest reciter to listen offline", onPress: onClose },
          ].map((btn) => (
            <TouchableOpacity key={btn.label} style={es.optionRow} onPress={btn.onPress} activeOpacity={0.8}>
              <View style={es.optionIcon}>
                <Feather name={btn.icon} size={20} color="#1A1A1A" />
              </View>
              <View style={es.optionInfo}>
                <Text style={es.optionLabel}>{btn.label}</Text>
                <Text style={es.optionDesc}>{btn.desc}</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CCCCCC" />
            </TouchableOpacity>
          ))}

          {/* Recent Reciters */}
          <Text style={es.sectionLabel}>Recent Reciters</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={es.reciterList}>
            {RECITERS.map((r) => {
              const active = r.id === settings.selectedReciter;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[es.reciterChip, active && es.reciterChipActive]}
                  onPress={() => { updateSettings({ selectedReciter: r.id }); onClose(); }}
                  activeOpacity={0.85}
                >
                  <Text style={[es.reciterName, active && es.reciterNameActive]}>{r.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Speed */}
          <Text style={es.sectionLabel}>Playback Speed</Text>
          <View style={es.speedRow}>
            {PLAYBACK_RATES.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[es.speedChip, playbackRate === rate && es.speedChipActive]}
                onPress={() => onSpeedChange(rate)}
                activeOpacity={0.85}
              >
                <Text style={[es.speedChipText, playbackRate === rate && es.speedChipTextActive]}>
                  {rate}×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const es = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: { width: 40, height: 4, backgroundColor: "#DEDEDE", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 20 },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  optionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#AAAAAA", fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 20, marginBottom: 10 },
  reciterList: { gap: 8, paddingRight: 16 },
  reciterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F0F0F0" },
  reciterChipActive: { backgroundColor: "#1A1A1A" },
  reciterName: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  reciterNameActive: { color: "#FFFFFF" },
  speedRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  speedChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F0F0F0" },
  speedChipActive: { backgroundColor: "#1A1A1A" },
  speedChipText: { fontSize: 13, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  speedChipTextActive: { color: "#FFFFFF" },
});

// ─── Meaning Panel ────────────────────────────────────────────────────────────
const TRANSLATIONS = [
  { id: "en.sahih", name: "Sahih International" },
  { id: "en.fadel", name: "Fadel Soliman" },
  { id: "en.clearquran", name: "The Clear Quran" },
  { id: "en.hilali", name: "Muhsin Khan Taqi-ud-Din al-Hilali" },
];

function MeaningPanel({ visible, onClose, selected, onToggle }: {
  visible: boolean; onClose: () => void;
  selected: string[]; onToggle: (id: string) => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={mp.backdrop} />
      </TouchableWithoutFeedback>
      <View style={mp.sheet}>
        <View style={mp.handle} />
        <View style={mp.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="play" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={mp.title}>Meaning</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        {TRANSLATIONS.map((t) => {
          const active = selected.includes(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              style={mp.row}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(t.id); }}
              activeOpacity={0.8}
            >
              <Text style={mp.rowLabel}>{t.name}</Text>
              <Switch
                value={active}
                onValueChange={() => onToggle(t.id)}
                trackColor={{ false: "#E0E0E0", true: "#1A1A1A" }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

const mp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#DEDEDE", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  rowLabel: { fontSize: 15, fontWeight: "500", color: "#1A1A1A", fontFamily: "Inter_400Regular" },
});

// ─── Tafsir Modal ─────────────────────────────────────────────────────────────
function TafsirModal({ visible, onClose, tafsirDataMap, currentAyah, surahNum, onPlay }: {
  visible: boolean; onClose: () => void;
  tafsirDataMap: Record<string, SurahDetail>;
  currentAyah: number; surahNum: number;
  onPlay: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [TAFSIR_EDITIONS[0]?.id ?? ""]: true });

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={tm.container}>
        <View style={tm.header}>
          <TouchableOpacity onPress={onPlay} style={tm.headerBtn} activeOpacity={0.75}>
            <Ionicons name="play" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={tm.title}>Tafsir</Text>
          <TouchableOpacity onPress={onClose} style={tm.headerBtn} activeOpacity={0.75}>
            <Feather name="x" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {TAFSIR_EDITIONS.map((ed) => {
            const td = tafsirDataMap[ed.id];
            const ta = td?.ayahs[currentAyah - 1];
            const isExpanded = expanded[ed.id];
            return (
              <View key={ed.id} style={tm.section}>
                <TouchableOpacity
                  style={tm.sectionHeader}
                  onPress={() => setExpanded(prev => ({ ...prev, [ed.id]: !isExpanded }))}
                  activeOpacity={0.8}
                >
                  <Text style={tm.sectionName}>{ed.name}</Text>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#6B6B6B" />
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={tm.sectionText}>
                    {ta?.text ?? "Tafsir not available for this ayah."}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        <View style={tm.footer}>
          <Feather name="chevron-down" size={22} color="#9A9A9A" />
        </View>
      </View>
    </Modal>
  );
}

const tm = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: Platform.OS === "ios" ? 54 : 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  section: { marginBottom: 16, borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FAFAFA" },
  sectionName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  sectionText: { fontSize: 13, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22, padding: 16, paddingTop: 0 },
  footer: { alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
});

// ─── Mushaf Page ──────────────────────────────────────────────────────────────
function MushafPage({ ayahs, surahName }: { ayahs: ApiAyah[]; surahName: string }) {
  return (
    <View style={ms.page}>
      <View style={ms.pageInner}>
        <Text style={ms.text} textBreakStrategy="highQuality">
          {ayahs.map((ayah) => (
            <Text key={ayah.numberInSurah}>
              <Text style={ms.ayahText}>{ayah.text}</Text>
              <Text style={ms.marker}> ۝{ayah.numberInSurah} </Text>
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  page: {
    margin: 16, backgroundColor: "#F5EDD6", borderRadius: 10,
    borderWidth: 1, borderColor: "#D4B896",
    shadowColor: "#8B6914", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5, minHeight: 400,
  },
  pageInner: { padding: 24, paddingVertical: 32, borderWidth: 2, borderColor: "#C9A96E60", borderRadius: 8, margin: 10 },
  text: { fontSize: 24, lineHeight: 52, textAlign: "justify", color: "#2C1810", writingDirection: "rtl", fontFamily: Platform.OS === "ios" ? "System" : undefined },
  ayahText: { fontSize: 24, lineHeight: 52, color: "#2C1810" },
  marker: { fontSize: 18, color: "#8B6914" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SurahScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNum = parseInt(id, 10);

  const [arabic, setArabic] = useState<SurahDetail | null>(null);
  const [translation, setTranslation] = useState<SurahDetail | null>(null);
  const [transliteration, setTransliteration] = useState<SurahDetail | null>(null);
  const [tafsirDataMap, setTafsirDataMap] = useState<Record<string, SurahDetail>>({});
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(true);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [meaningPanelVisible, setMeaningPanelVisible] = useState(false);
  const [tafsirModalVisible, setTafsirModalVisible] = useState(false);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [tajweedMode, setTajweedMode] = useState(false);
  const [selectedTranslations, setSelectedTranslations] = useState(["en.sahih"]);
  const [ayahRepeatCounts, setAyahRepeatCounts] = useState<Record<number, number>>({});

  const listRef = useRef<FlatList<ApiAyah>>(null);
  const mushafScrollRef = useRef<ScrollView>(null);

  const {
    settings, updateSettings,
    saveProgress, recordAyahRead,
    saveWord, saveAyah,
    surahPositions, saveSurahPosition,
  } = useQuran();

  const { audioState, playAyah, playRange, pauseAudio, resumeAudio, stopAudio, setPlaybackRate, playNextAyah, playPrevAyah, setOnNextAyah } = useAudio();

  // Tafsir on-demand loading
  useEffect(() => {
    if (!settings.showTafsir || !arabic) return;
    const selected = settings.selectedTafsirs ?? ["en.maarifulquran"];
    const toFetch = selected.filter(ed => !tafsirDataMap[ed]);
    if (toFetch.length === 0) return;
    Promise.all(toFetch.map(ed => fetchTafsir(surahNum, ed).catch(() => null))).then(results => {
      setTafsirDataMap(prev => {
        const next = { ...prev };
        toFetch.forEach((ed, i) => { if (results[i]) next[ed] = results[i]!; });
        return next;
      });
    });
  }, [settings.showTafsir, settings.selectedTafsirs, arabic, surahNum]);

  useEffect(() => {
    loadData();
    return () => setOnNextAyah(null);
  }, [surahNum]);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      mushafScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 80);
  }, [currentPage]);

  async function loadData() {
    setLoading(true);
    try {
      const selected = settings.selectedTafsirs ?? ["en.maarifulquran"];
      const [main, tafsirResults] = await Promise.all([
        fetchSurahWithTranslations(surahNum),
        settings.showTafsir
          ? Promise.all(selected.map(ed => fetchTafsir(surahNum, ed).catch(() => null)))
          : Promise.resolve([] as (SurahDetail | null)[]),
      ]);
      setArabic(main.arabic);
      setTranslation(main.translation);
      setTransliteration(main.transliteration);
      if (settings.showTafsir) {
        const map: Record<string, SurahDetail> = {};
        selected.forEach((ed, i) => { if (tafsirResults[i]) map[ed] = tafsirResults[i]!; });
        setTafsirDataMap(map);
      }

      setOnNextAyah((surahN, ayahN) => {
        const totalAyahs = SURAH_DATA[surahN - 1]?.ayahCount ?? main.arabic.ayahs.length;
        playAyah(surahN, ayahN, totalAyahs, settings.repeatCount);
        recordAyahRead(surahN);
        saveProgress({
          surahNumber: surahN, ayahNumber: ayahN,
          ayahNumberInSurah: ayahN,
          surahName: SURAH_DATA[surahN - 1]?.englishName ?? main.arabic.englishName,
        });
        if (surahN === surahNum) {
          const idx = ayahN - 1;
          setCurrentAyahIndex(idx);
          saveSurahPosition(surahN, idx);
          const page = Math.ceil(ayahN / AYAHS_PER_PAGE);
          setCurrentPage(page);
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx % AYAHS_PER_PAGE, animated: true });
          }, 100);
        }
      });

      const savedPos = surahPositions[surahNum];
      let initialIndex = 0;
      if (ayahParam) initialIndex = Math.max(0, parseInt(ayahParam, 10) - 1);
      else if (savedPos !== undefined) initialIndex = savedPos;
      if (initialIndex > 0) {
        const page = Math.ceil((initialIndex + 1) / AYAHS_PER_PAGE);
        setCurrentPage(page);
        setCurrentAyahIndex(initialIndex);
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: initialIndex % AYAHS_PER_PAGE, animated: false });
        }, 300);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSaveAyah = useCallback((ayah: ApiAyah) => {
    saveAyah({
      surahNumber: surahNum, surahName: arabic?.englishName ?? "",
      ayahNumber: ayah.numberInSurah, arabicText: ayah.text,
      translationText: translation?.ayahs[ayah.numberInSurah - 1]?.text ?? "",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [surahNum, saveAyah, arabic, translation]);

  const handleRepeat = useCallback((ayah: ApiAyah, count: number) => {
    setAyahRepeatCounts(prev => ({ ...prev, [ayah.numberInSurah]: count }));
    if (!arabic) return;
    playAyah(surahNum, ayah.numberInSurah, arabic.ayahs.length, count);
    recordAyahRead(surahNum);
    saveProgress({
      surahNumber: surahNum, ayahNumber: ayah.numberInSurah,
      ayahNumberInSurah: ayah.numberInSurah, surahName: arabic.englishName,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [arabic, surahNum, playAyah, recordAyahRead, saveProgress]);

  const handlePlayAll = useCallback(() => {
    if (!arabic) return;
    playAyah(surahNum, 1, arabic.ayahs.length, settings.repeatCount);
    recordAyahRead(surahNum);
    saveProgress({ surahNumber: surahNum, ayahNumber: 1, ayahNumberInSurah: 1, surahName: arabic.englishName });
  }, [arabic, surahNum, settings.repeatCount]);

  const handleTafsirPress = useCallback(() => {
    if (!settings.showTafsir) {
      updateSettings({ showTafsir: true });
    }
    setTafsirModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [settings.showTafsir, updateSettings]);

  const handleMeaningToggleTranslation = useCallback((id: string) => {
    setSelectedTranslations(prev => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter(x => x !== id) : prev;
      return [...prev, id];
    });
    if (!settings.showTranslation) updateSettings({ showTranslation: true });
  }, [settings.showTranslation, updateSettings]);

  const totalPages = arabic ? Math.ceil(arabic.ayahs.length / AYAHS_PER_PAGE) : 1;
  const pageAyahs = useMemo(() => {
    if (!arabic) return [];
    const start = (currentPage - 1) * AYAHS_PER_PAGE;
    return arabic.ayahs.slice(start, start + AYAHS_PER_PAGE);
  }, [arabic, currentPage]);

  const goToPrevPage = () => {
    if (currentPage < totalPages) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCurrentPage(p => p + 1); }
  };
  const goToNextPage = () => {
    if (currentPage > 1) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCurrentPage(p => p - 1); }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const basmala = surahNum !== 1 && surahNum !== 9;
  const currentAyahForRange = audioState.currentSurah === surahNum && audioState.currentAyah ? audioState.currentAyah : parseInt(ayahParam ?? "1", 10) || 1;

  const displayedAyahNum = currentAyahIndex + 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#EEEEF0" }}>
      {/* Header */}
      {menuVisible && (
        <View style={[scr.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={scr.headerBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={scr.headerCenter}>
            {arabic && (
              <>
                <Text style={scr.headerTitle}>{arabic.englishName}</Text>
                <Text style={scr.headerSub}>{arabic.numberOfAyahs} ayahs · {arabic.revelationType}</Text>
              </>
            )}
          </View>
          <View style={scr.headerRight}>
            <TouchableOpacity onPress={handlePlayAll} style={scr.headerBtn} activeOpacity={0.7}>
              <Ionicons name="play-circle" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSettingsVisible(true)} style={scr.headerBtn} activeOpacity={0.7}>
              <Feather name="settings" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mode tabs */}
      {menuVisible && (
        <View style={scr.modeTabs}>
          {settings.mushafMode ? (
            <TouchableOpacity style={[scr.pageBtn, scr.pageBtnLeft]} onPress={goToPrevPage} disabled={currentPage >= totalPages} activeOpacity={0.8}>
              <Feather name="chevron-left" size={15} color={currentPage >= totalPages ? "#CCCCCC" : "#1A1A1A"} />
              <Text style={[scr.pageBtnText, currentPage >= totalPages && { color: "#CCCCCC" }]}>Next</Text>
            </TouchableOpacity>
          ) : <View style={{ minWidth: 70 }} />}

          <View style={scr.modeSwitcher}>
            <TouchableOpacity
              style={[scr.modeBtn, !settings.mushafMode && scr.modeBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: false }); }}
              activeOpacity={0.8}
            >
              <Text style={[scr.modeBtnText, !settings.mushafMode && scr.modeBtnTextActive]}>Normal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[scr.modeBtn, settings.mushafMode && scr.modeBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ mushafMode: true }); }}
              activeOpacity={0.8}
            >
              <Text style={[scr.modeBtnText, settings.mushafMode && scr.modeBtnTextActive]}>Mushaf</Text>
            </TouchableOpacity>
          </View>

          {settings.mushafMode ? (
            <TouchableOpacity style={[scr.pageBtn, scr.pageBtnRight]} onPress={goToNextPage} disabled={currentPage <= 1} activeOpacity={0.8}>
              <Text style={[scr.pageBtnText, currentPage <= 1 && { color: "#CCCCCC" }]}>Back</Text>
              <Feather name="chevron-right" size={15} color={currentPage <= 1 ? "#CCCCCC" : "#1A1A1A"} />
            </TouchableOpacity>
          ) : <View style={{ minWidth: 70 }} />}
        </View>
      )}

      {/* Floating nav (hidden menu mode) */}
      {!menuVisible && (
        <>
          <FloatingTopNav
            surahName={arabic?.englishName ?? ""}
            topInset={insets.top}
            onPrev={goToPrevPage}
            onNext={goToNextPage}
            onLongPress={() => setRangeVisible(true)}
          />
          <FloatingBottomNav
            bottomInset={insets.bottom}
            onPrev={goToPrevPage}
            onNext={goToNextPage}
          />
        </>
      )}

      {/* Content */}
      {loading ? (
        <ActivityIndicator color="#1A1A1A" style={{ flex: 1 }} size="large" />
      ) : settings.mushafMode ? (
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setMenuVisible(v => !v)}>
          <ScrollView
            ref={mushafScrollRef}
            style={{ flex: 1, backgroundColor: MUSHAF_BG }}
            contentContainerStyle={{ paddingBottom: 180 }}
            showsVerticalScrollIndicator={false}
          >
            {arabic && isFirstMushafPage(currentPage) && basmala && (
              <View style={scr.mushafInfo}>
                <Text style={scr.mushafArabicName}>{arabic.name}</Text>
                <Text style={scr.mushafBasmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
              </View>
            )}
            <MushafPage ayahs={pageAyahs} surahName={arabic?.englishName ?? ""} />
            {settings.showTranslation && (
              <View style={scr.mushafTranslations}>
                {pageAyahs.map((ayah) => {
                  const ta = translation?.ayahs[ayah.numberInSurah - 1];
                  return ta ? (
                    <Text key={ayah.numberInSurah} style={scr.mushafTranslation}>
                      <Text style={scr.mushafTranslationNum}>{ayah.numberInSurah}:{" "}</Text>
                      {ta.text}
                    </Text>
                  ) : null;
                })}
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      ) : (
        arabic ? (
          <FlatList
            ref={listRef}
            data={pageAyahs}
            keyExtractor={(item) => String(item.numberInSurah)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
            style={{ flex: 1 }}
            onScrollBeginDrag={() => { if (menuVisible) setMenuVisible(false); }}
            renderItem={({ item }) => {
              const isPlaying = audioState.currentSurah === surahNum && audioState.currentAyah === item.numberInSurah;
              const isRepeating = isPlaying && (audioState.repeatCount ?? 1) > 1;
              const showB = item.numberInSurah === 1 && basmala;
              return (
                <SwipeableAyahCard
                  ayah={item}
                  surahNum={surahNum}
                  isPlaying={isPlaying}
                  isRepeating={isRepeating}
                  repeatCount={ayahRepeatCounts[item.numberInSurah] ?? audioState.repeatCount}
                  translation={translation}
                  transliteration={transliteration}
                  tafsirDataMap={tafsirDataMap}
                  showTranslation={settings.showTranslation}
                  showTransliteration={settings.showTransliteration}
                  showTafsir={settings.showTafsir}
                  selectedTafsirs={settings.selectedTafsirs ?? ["en.maarifulquran"]}
                  colorCoding={settings.colorCoding}
                  showBasmala={showB}
                  onSave={handleSaveAyah}
                  onRepeat={handleRepeat}
                  onPress={() => setMenuVisible(v => !v)}
                />
              );
            }}
          />
        ) : null
      )}

      {/* Player bar + Content bar */}
      {menuVisible && (
        <View style={[scr.bottomPanel, { paddingBottom: insets.bottom }]}>
          <PlayerBar
            isPlaying={audioState.isPlaying}
            isLoading={audioState.isLoading}
            currentSurah={audioState.currentSurah}
            currentAyah={audioState.currentAyah}
            range={audioState.range}
            playbackRate={audioState.playbackRate}
            repeatCount={audioState.repeatCount}
            currentRepeat={audioState.currentRepeat}
            surahNum={surahNum}
            onPlay={resumeAudio}
            onPause={pauseAudio}
            onStop={stopAudio}
            onNext={playNextAyah}
            onPrev={playPrevAyah}
            onSpeedPress={() => {
              const idx = PLAYBACK_RATES.indexOf(audioState.playbackRate);
              const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
              setPlaybackRate(next);
            }}
            onEditPress={() => setEditSheetVisible(true)}
          />
          <ContentBar
            showTranslation={settings.showTranslation}
            showTransliteration={settings.showTransliteration}
            showTafsir={settings.showTafsir}
            colorCoding={settings.colorCoding}
            tajweedMode={tajweedMode}
            mushafMode={settings.mushafMode}
            onToggleTranslation={() => {
              if (!settings.showTranslation) { setMeaningPanelVisible(true); }
              else updateSettings({ showTranslation: false });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onToggleTransliteration={() => updateSettings({ showTransliteration: !settings.showTransliteration })}
            onToggleTafsir={handleTafsirPress}
            onToggleColors={() => updateSettings({ colorCoding: !settings.colorCoding })}
            onToggleTajweed={() => setTajweedMode(v => !v)}
            onTafsirPress={handleTafsirPress}
          />
        </View>
      )}

      {/* Modals */}
      <EditSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        settings={settings}
        updateSettings={updateSettings}
        playbackRate={audioState.playbackRate}
        onSpeedChange={setPlaybackRate}
        onPlayRange={() => setRangeVisible(true)}
        onRepeatSection={() => setRangeVisible(true)}
      />

      <MeaningPanel
        visible={meaningPanelVisible}
        onClose={() => { setMeaningPanelVisible(false); updateSettings({ showTranslation: true }); }}
        selected={selectedTranslations}
        onToggle={handleMeaningToggleTranslation}
      />

      <TafsirModal
        visible={tafsirModalVisible}
        onClose={() => setTafsirModalVisible(false)}
        tafsirDataMap={tafsirDataMap}
        currentAyah={currentAyahForRange}
        surahNum={surahNum}
        onPlay={() => { setTafsirModalVisible(false); handlePlayAll(); }}
      />

      <RangeSelectorModal
        visible={rangeVisible}
        currentSurah={surahNum}
        currentAyah={currentAyahForRange}
        onConfirm={(range, repeatCount) => {
          playRange(range, repeatCount);
          recordAyahRead(range.startSurah);
          saveProgress({ surahNumber: range.startSurah, ayahNumber: range.startAyah, ayahNumberInSurah: range.startAyah, surahName: SURAH_DATA[range.startSurah - 1]?.englishName ?? "" });
        }}
        onClose={() => setRangeVisible(false)}
      />

      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

function isFirstMushafPage(page: number) { return page === 1; }

const scr = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBtn: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
  modeTabs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pageBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: "#F5F5F5", minWidth: 70 },
  pageBtnLeft: { justifyContent: "flex-start" },
  pageBtnRight: { justifyContent: "flex-end" },
  pageBtnText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  modeSwitcher: { flexDirection: "row", backgroundColor: "#F0F0F0", borderRadius: 12, padding: 3, gap: 2 },
  modeBtn: { paddingHorizontal: 26, paddingVertical: 9, borderRadius: 10 },
  modeBtnActive: { backgroundColor: "#1A1A1A" },
  modeBtnText: { fontSize: 13, fontWeight: "700", color: "#9A9A9A", fontFamily: "Inter_700Bold" },
  modeBtnTextActive: { color: "#FFFFFF" },
  bottomPanel: { backgroundColor: "#FFFFFF" },
  mushafInfo: { alignItems: "center", paddingVertical: 16, backgroundColor: "#F5EDD6" },
  mushafArabicName: { fontSize: 28, color: "#2C1810", fontFamily: Platform.OS === "ios" ? "System" : undefined, marginBottom: 8 },
  mushafBasmala: { fontSize: 18, color: "#2C1810", fontFamily: Platform.OS === "ios" ? "System" : undefined, textAlign: "center" },
  mushafTranslations: { padding: 16, gap: 8 },
  mushafTranslation: { fontSize: 14, color: "#4A4A4A", fontFamily: "Inter_400Regular", lineHeight: 22 },
  mushafTranslationNum: { fontWeight: "700", color: "#8B6914", fontFamily: "Inter_700Bold" },
});
