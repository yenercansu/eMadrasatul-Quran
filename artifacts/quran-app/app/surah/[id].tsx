import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAudio } from "@/contexts/AudioContext";
import { AyahItem } from "@/components/AyahItem";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { SettingsSheet } from "@/components/SettingsSheet";
import { WordModal } from "@/components/WordModal";
import { RangeSelectorModal } from "@/components/RangeSelectorModal";
import { fetchSurahWithTranslations, fetchTafsir, type SurahDetail, type ApiAyah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";

export default function SurahScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { id, ayah: ayahParam } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surahNum = parseInt(id, 10);

  const [arabic, setArabic] = useState<SurahDetail | null>(null);
  const [translation, setTranslation] = useState<SurahDetail | null>(null);
  const [transliteration, setTransliteration] = useState<SurahDetail | null>(null);
  const [tafsir, setTafsir] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rangeVisible, setRangeVisible] = useState(false);
  const [activeAyah, setActiveAyah] = useState<number | null>(null);
  const [wordModal, setWordModal] = useState<{ visible: boolean; word: string; translation: string; ayahNum: number }>({
    visible: false, word: "", translation: "", ayahNum: 0,
  });

  const { settings, saveProgress, recordAyahRead } = useQuran();
  const { audioState, playAyah, playRange, setOnNextAyah } = useAudio();
  const listRef = useRef<FlatList<ApiAyah>>(null);
  const arabicRef = useRef<SurahDetail | null>(null);

  useEffect(() => {
    loadData();
    return () => setOnNextAyah(null);
  }, [surahNum]);

  async function loadData() {
    setLoading(true);
    try {
      const [main, tafsirData] = await Promise.all([
        fetchSurahWithTranslations(surahNum),
        settings.showTafsir ? fetchTafsir(surahNum) : Promise.resolve(null),
      ]);
      setArabic(main.arabic);
      arabicRef.current = main.arabic;
      setTranslation(main.translation);
      setTransliteration(main.transliteration);
      if (tafsirData) setTafsir(tafsirData);

      setOnNextAyah((surahN, ayahN) => {
        const totalAyahs = SURAH_DATA[surahN - 1]?.ayahCount ?? (surahN === surahNum ? main.arabic.ayahs.length : 10);
        playAyah(surahN, ayahN, totalAyahs, settings.repeatCount);
        setActiveAyah(surahN === surahNum ? ayahN : null);
        recordAyahRead(surahN);
        saveProgress({
          surahNumber: surahN,
          ayahNumber: ayahN,
          ayahNumberInSurah: ayahN,
          surahName: SURAH_DATA[surahN - 1]?.englishName ?? main.arabic.englishName,
        });
        if (surahN === surahNum) {
          const idx = ayahN - 1;
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
          }, 100);
        }
      });

      if (ayahParam) {
        const idx = parseInt(ayahParam, 10) - 1;
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: Math.max(0, idx), animated: true });
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAyahPress = useCallback((ayahNum: number) => {
    setActiveAyah(ayahNum === activeAyah ? null : ayahNum);
  }, [activeAyah]);

  const handleWordLongPress = useCallback((word: string, trans: string, ayahNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWordModal({ visible: true, word, translation: trans, ayahNum });
  }, []);

  const handlePlayAll = useCallback(() => {
    if (!arabic) return;
    const firstAyah = 1;
    playAyah(surahNum, firstAyah, arabic.ayahs.length, settings.repeatCount);
    setActiveAyah(firstAyah);
    recordAyahRead(surahNum);
    saveProgress({
      surahNumber: surahNum,
      ayahNumber: firstAyah,
      ayahNumberInSurah: firstAyah,
      surahName: arabic.englishName,
    });
  }, [arabic, surahNum, settings.repeatCount]);

  const currentAyahForRange = audioState.currentSurah === surahNum && audioState.currentAyah
    ? audioState.currentAyah
    : parseInt(ayahParam ?? "1", 10) || 1;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const basmala = surahNum !== 1 && surahNum !== 9;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          {arabic && (
            <>
              <Text style={s.headerTitle}>{arabic.englishName}</Text>
              <Text style={s.headerSub}>{arabic.numberOfAyahs} ayahs • {arabic.revelationType}</Text>
            </>
          )}
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => setRangeVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
            <Ionicons name="list" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayAll} style={s.headerBtn} activeOpacity={0.7}>
            <Ionicons name="play-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsVisible(true)} style={s.headerBtn} activeOpacity={0.7}>
            <Feather name="sliders" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {arabic && (
        <View style={s.surahInfo}>
          <Text style={s.surahArabicName}>{arabic.name}</Text>
          {basmala && (
            <Text style={s.basmala}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} size="large" />
      ) : (
        <FlatList
          ref={listRef}
          data={arabic?.ayahs ?? []}
          keyExtractor={(item) => String(item.numberInSurah)}
          renderItem={({ item }) => (
            <AyahItem
              arabic={item}
              translation={translation?.ayahs[item.numberInSurah - 1]}
              transliteration={transliteration?.ayahs[item.numberInSurah - 1]}
              tafsir={tafsir?.ayahs[item.numberInSurah - 1]}
              surahNumber={surahNum}
              surahName={arabic?.englishName ?? ""}
              totalAyahs={arabic?.ayahs.length ?? 0}
              isActive={activeAyah === item.numberInSurah || audioState.currentAyah === item.numberInSurah}
              onPress={() => handleAyahPress(item.numberInSurah)}
              onWordLongPress={(word, trans) => handleWordLongPress(word, trans, item.numberInSurah)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      <AudioPlayerBar />

      <SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <RangeSelectorModal
        visible={rangeVisible}
        currentSurah={surahNum}
        currentAyah={currentAyahForRange}
        onConfirm={(range, repeatCount) => {
          playRange(range, repeatCount);
          recordAyahRead(range.startSurah);
          saveProgress({
            surahNumber: range.startSurah,
            ayahNumber: range.startAyah,
            ayahNumberInSurah: range.startAyah,
            surahName: SURAH_DATA[range.startSurah - 1]?.englishName ?? "",
          });
        }}
        onClose={() => setRangeVisible(false)}
      />

      <WordModal
        visible={wordModal.visible}
        word={wordModal.word}
        translation={wordModal.translation}
        surahNumber={surahNum}
        ayahNumber={wordModal.ayahNum}
        onClose={() => setWordModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 8 },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    headerSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    headerActions: { flexDirection: "row" },
    headerBtn: { padding: 8 },
    surahInfo: {
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    surahArabicName: {
      fontSize: 28,
      color: colors.primary,
      fontFamily: "System",
      marginBottom: 8,
    },
    basmala: {
      fontSize: 20,
      color: colors.foreground,
      fontFamily: "System",
      textAlign: "center",
      lineHeight: 40,
    },
  });
