import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord, type SavedAyah } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
type FilterMode = "ayah" | "words" | "by-surah";

const MEDINAN_SURAHS_LIB = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110,
]);

function AyahCard({
  ayah,
  onRemove,
  isTop,
}: {
  ayah: SavedAyah;
  onRemove: (id: string) => void;
  isTop: boolean;
}) {
  const colors = useColors();
  const s = cardStyles(colors);
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[s.swipeAction, { transform: [{ translateX: trans }] }]}>
        <Feather name="trash-2" size={20} color="#FFFFFF" />
        <Text style={s.swipeActionText}>Remove</Text>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
    return (
      <Animated.View style={[s.swipeActionLeft, { backgroundColor: colors.foreground, transform: [{ translateX: trans }] }]}>
        <Feather name="book-open" size={20} color={colors.primaryForeground} />
        <Text style={s.swipeActionText}>Go to</Text>
      </Animated.View>
    );
  };

  const card = (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.cardMeta}>
        <View style={[s.surahBadge, { borderColor: colors.border }]}>
          <Text style={[s.surahBadgeNum, { color: colors.mutedForeground }]}>{ayah.surahNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.surahName, { color: colors.foreground }]}>{ayah.surahName}</Text>
          <Text style={[s.ayahLabel, { color: colors.mutedForeground }]}>Ayah {ayah.ayahNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`)}
          activeOpacity={0.7}
          style={[s.linkBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="external-link" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      <Text style={[s.arabicText, { color: colors.foreground }]}>{ayah.arabicText}</Text>
      {ayah.translationText ? (
        <>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <Text style={[s.translationText, { color: colors.mutedForeground }]}>{ayah.translationText}</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={isTop ? renderRightActions : undefined}
      renderLeftActions={renderLeftActions}
      rightThreshold={60}
      leftThreshold={60}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onRemove(ayah.id);
        } else {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
          swipeRef.current?.close();
          router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`);
        }
      }}
    >
      {card}
    </Swipeable>
  );
}

const cardStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    surahBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    surahBadgeNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
    surahName: { fontSize: 15, fontFamily: "Inter_700Bold" },
    ayahLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
    arabicText: {
      fontSize: 26,
      lineHeight: 46,
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    divider: { height: 1 },
    translationText: {
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "Inter_400Regular",
    },
    linkBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    swipeAction: {
      width: 80,
      backgroundColor: "#D9534F",
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
      gap: 4,
    },
    swipeActionLeft: {
      width: 80,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
      gap: 4,
    },
    swipeActionText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  });

function AyahListView({ ayahs, onRemove }: { ayahs: SavedAyah[]; onRemove: (id: string) => void }) {
  const colors = useColors();

  const ctaFooter = (
    <View style={[listViewStyles.ctaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[listViewStyles.ctaTitle, { color: colors.foreground }]}>Save words as you read</Text>
      <Text style={[listViewStyles.ctaSubtitle, { color: colors.mutedForeground }]}>
        Tap any word in the Quran reader to save it here for review.
      </Text>
    </View>
  );

  const hint = (
    <Text style={[listViewStyles.hint, { color: colors.mutedForeground }]}>
      ← swipe left to remove · swipe right to open →
    </Text>
  );

  if (ayahs.length === 0) {
    return (
      <ScrollView contentContainerStyle={listViewStyles.emptyContent} showsVerticalScrollIndicator={false}>
        {hint}
        <View style={listViewStyles.empty}>
          <Text style={[listViewStyles.emptyTitle, { color: colors.foreground }]}>No saved ayahs</Text>
          <Text style={[listViewStyles.emptySubtitle, { color: colors.mutedForeground }]}>
            Swipe right on any ayah while reading to save it here
          </Text>
        </View>
        {ctaFooter}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={ayahs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AyahCard ayah={item} onRemove={onRemove} isTop={true} />}
      contentContainerStyle={listViewStyles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={hint}
      ListFooterComponent={ctaFooter}
    />
  );
}

const listViewStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80, gap: 12 },
  emptyContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  hint: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 14, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  ctaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
    alignItems: "center",
    gap: 8,
  },
  ctaTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  ctaSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});

function WordCard({ word, onRemove, onToggleHighlight }: {
  word: SavedWord;
  onRemove: (id: string) => void;
  onToggleHighlight: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={[
      wordCardStyles.card,
      { backgroundColor: colors.card, borderColor: word.highlighted ? colors.appGold : colors.border },
      word.highlighted && { backgroundColor: colors.appLightBg },
    ]}>
      <View style={wordCardStyles.main}>
        <Text style={[wordCardStyles.arabic, { color: colors.foreground }]}>{word.arabic}</Text>
        {word.translation ? (
          <Text style={[wordCardStyles.translation, { color: colors.foreground }]}>{word.translation}</Text>
        ) : (
          <Text style={[wordCardStyles.translationEmpty, { color: colors.mutedForeground }]}>No translation saved</Text>
        )}
        <Text style={[wordCardStyles.meta, { color: colors.mutedForeground }]}>
          Surah {word.surahNumber} · Ayah {word.ayahNumber}
        </Text>
      </View>
      <View style={wordCardStyles.actions}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleHighlight(word.id); }}
          style={wordCardStyles.actionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={word.highlighted ? "star" : "star-outline"} size={18} color={word.highlighted ? colors.appGold : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Remove word?", `Remove "${word.arabic}" from your library?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onRemove(word.id); } },
            ]);
          }}
          style={wordCardStyles.actionBtn}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const wordCardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  main: { flex: 1, gap: 4 },
  arabic: { fontSize: 22, fontFamily: Platform.OS === "ios" ? "System" : undefined, marginBottom: 2 },
  translation: { fontSize: 14, fontFamily: "Inter_400Regular" },
  translationEmpty: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  actions: { gap: 10, alignItems: "center" },
  actionBtn: { padding: 4 },
});

function WordsQuizView({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedWords, removeWord, toggleHighlight, savedAyahs, removeAyah } = useQuran();
  const [filterMode, setFilterMode] = useState<FilterMode>("ayah");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const topPad = insets.top;

  const surahGroups = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of savedWords) {
      map.set(w.surahNumber, (map.get(w.surahNumber) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, count]) => {
        const meta = SURAH_DATA[num - 1];
        return {
          surahNumber: num,
          surahName: meta?.englishName ?? `Surah ${num}`,
          arabicName: meta?.name ?? "",
          wordCount: count,
          ayahCount: meta?.ayahCount ?? 1,
          juz: meta?.juz ?? 1,
        };
      });
  }, [savedWords]);

  const filteredWords = useMemo(() => {
    if (filterMode === "by-surah" && selectedSurahNum !== null) {
      return savedWords.filter(w => w.surahNumber === selectedSurahNum);
    }
    return savedWords;
  }, [savedWords, filterMode, selectedSurahNum]);

  const showDrillDown = filterMode === "by-surah" && selectedSurahNum !== null;
  const showSurahList = filterMode === "by-surah" && selectedSurahNum === null;
  const selectedSurahName = selectedSurahNum !== null
    ? SURAH_DATA[selectedSurahNum - 1]?.englishName ?? `Surah ${selectedSurahNum}`
    : "";

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: "ayah", label: "By Ayah" },
    { key: "by-surah", label: "By Surah" },
    { key: "words", label: "Words" },
  ];

  const wvs = wordsViewStyles;

  const ctaCard = (
    <View style={[wvs.ctaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[wvs.ctaTitle, { color: colors.foreground }]}>Save words as you read</Text>
      <Text style={[wvs.ctaSubtitle, { color: colors.mutedForeground }]}>
        Tap any word in the Quran reader to save it here for review.
      </Text>
    </View>
  );

  const emptyWords = (
    <View style={wvs.empty}>
      <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No words saved yet</Text>
      <Text style={[wvs.emptySubtitle, { color: colors.mutedForeground }]}>
        Long-press any word while reading to save it here
      </Text>
    </View>
  );

  return (
    <View style={[wvs.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[wvs.header, { paddingTop: topPad + 12 }]}>
        {showDrillDown ? (
          <View style={wvs.topRow}>
            <TouchableOpacity onPress={() => setSelectedSurahNum(null)} style={wvs.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[wvs.title, { color: colors.foreground }]}>{selectedSurahName}</Text>
              <Text style={[wvs.subtitle, { color: colors.mutedForeground }]}>{filteredWords.length} words saved</Text>
            </View>
          </View>
        ) : (
          <View style={wvs.topRow}>
            <TouchableOpacity onPress={onBack} style={wvs.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[wvs.title, { color: colors.foreground }]}>
                {filterMode === "ayah" ? "Saved Ayahs" : "Vocabulary"}
              </Text>
              <Text style={[wvs.subtitle, { color: colors.mutedForeground }]}>
                {filterMode === "ayah"
                  ? `${savedAyahs.length} ayah${savedAyahs.length !== 1 ? "s" : ""} saved`
                  : `${savedWords.length} words saved`}
              </Text>
            </View>
          </View>
        )}

        {!showDrillDown && (
          <View style={wvs.filterRow}>
            {FILTERS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  wvs.filterChip,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                  filterMode === key && { backgroundColor: colors.foreground, borderColor: colors.foreground },
                ]}
                onPress={() => { setFilterMode(key as FilterMode); setSelectedSurahNum(null); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  wvs.filterText,
                  { color: colors.mutedForeground },
                  filterMode === key && { color: colors.primaryForeground },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      {filterMode === "ayah" ? (
        <AyahListView ayahs={savedAyahs} onRemove={removeAyah} />

      ) : showSurahList ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={wvs.surahListContent}
          showsVerticalScrollIndicator={false}
        >
          {surahGroups.length === 0 ? (
            <>
              <View style={wvs.empty}>
                <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No words saved yet</Text>
                <Text style={[wvs.emptySubtitle, { color: colors.mutedForeground }]}>
                  Save words while reading to organize them by surah
                </Text>
              </View>
              {ctaCard}
            </>
          ) : (
            <>
              {(() => {
                const byJuz: { juz: number; groups: typeof surahGroups }[] = [];
                for (const g of surahGroups) {
                  const last = byJuz[byJuz.length - 1];
                  if (!last || last.juz !== g.juz) byJuz.push({ juz: g.juz, groups: [g] });
                  else last.groups.push(g);
                }
                return byJuz.map(juzGroup => (
                  <View key={juzGroup.juz}>
                    <Text style={[wvs.juzHeader, { color: colors.mutedForeground }]}>
                      JUZ {juzGroup.juz}
                    </Text>
                    {juzGroup.groups.map(item => {
                      const origin = MEDINAN_SURAHS_LIB.has(item.surahNumber) ? "Medinan" : "Meccan";
                      const progress = Math.min(1, item.wordCount / item.ayahCount);
                      return (
                        <TouchableOpacity
                          key={item.surahNumber}
                          style={[wvs.surahCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => setSelectedSurahNum(item.surahNumber)}
                          activeOpacity={0.8}
                        >
                          <View style={[wvs.surahBadge, { borderColor: colors.border }]}>
                            <Text style={[wvs.surahBadgeNum, { color: colors.mutedForeground }]}>
                              {item.surahNumber}
                            </Text>
                          </View>
                          <View style={wvs.surahCardInfo}>
                            <Text style={[wvs.surahCardName, { color: colors.foreground }]}>{item.surahName}</Text>
                            <Text style={[wvs.surahCardMeta, { color: colors.mutedForeground }]}>
                              {item.wordCount} word{item.wordCount !== 1 ? "s" : ""} saved · {origin}
                            </Text>
                            <View style={[wvs.progressTrack, { backgroundColor: colors.border }]}>
                              <View style={[wvs.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.foreground }]} />
                            </View>
                          </View>
                          <Text style={[wvs.surahArabicName, { color: colors.mutedForeground }]}>
                            {item.arabicName}
                          </Text>
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()}
              {ctaCard}
            </>
          )}
        </ScrollView>

      ) : showDrillDown ? (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onRemove={removeWord} onToggleHighlight={toggleHighlight} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyWords}
          ListFooterComponent={ctaCard}
        />
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onRemove={removeWord} onToggleHighlight={toggleHighlight} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyWords}
          ListFooterComponent={ctaCard}
        />
      )}

      {showDrillDown && (
        <TouchableOpacity
          style={wvs.deleteAllBtn}
          onPress={() => {
            Alert.alert(`Delete from ${selectedSurahName}?`, `Remove all ${filteredWords.length} words?`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete All",
                style: "destructive",
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  filteredWords.map(w => w.id).forEach(id => removeWord(id));
                  setSelectedSurahNum(null);
                },
              },
            ]);
          }}
          activeOpacity={0.85}
        >
          <Feather name="trash-2" size={16} color="#D9534F" />
          <Text style={wvs.deleteAllText}>Delete all {filteredWords.length} words from {selectedSurahName}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const wordsViewStyles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginTop: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Filter chips
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // JUZ header
  juzHeader: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Surah list
  surahListContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },

  // Surah card (By Surah view)
  surahCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  surahBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  surahBadgeNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  surahCardInfo: { flex: 1, gap: 4 },
  surahCardName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  surahCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  progressFill: { height: 3, borderRadius: 2 },
  surahArabicName: { fontSize: 13, fontFamily: Platform.OS === "ios" ? "System" : undefined, flexShrink: 0 },

  // Words list
  wordsListContent: { padding: 16, paddingBottom: 80, gap: 10 },

  // Empty state
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },

  // CTA footer card
  ctaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
    alignItems: "center",
    gap: 8,
  },
  ctaTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  ctaSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  // Delete all
  deleteAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF5F5",
  },
  deleteAllText: { fontSize: 14, color: "#D9534F", fontFamily: "Inter_400Regular", flex: 1 },
});

const TOTAL_AYAHS = 6236;
const QUIZ_TYPES = 3;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { memorizedAyahKeys, savedWords, savedAyahs, dailyEntries } = useQuran();
  const [view, setView] = useState<"select" | "words">("select");
  const topPad = insets.top;

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dailyEntries.find((e) => e.date === dateStr);
      if (entry && entry.ayahsRead > 0) streak++;
      else break;
    }
    return streak;
  }, [dailyEntries]);

  const weekDots = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today.getTime() - daysToMonday * 86400000);
    return ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => {
      const d = new Date(monday.getTime() + i * 86400000);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dailyEntries.find((e) => e.date === dateStr);
      return { label, active: !!(entry && entry.ayahsRead > 0) };
    });
  }, [dailyEntries]);

  if (view === "words") {
    return <WordsQuizView onBack={() => setView("select")} />;
  }

  const memorizedCount = memorizedAyahKeys.length;
  const certificationPercent = Math.min(100, Math.round((memorizedCount / TOTAL_AYAHS) * 100));
  const s = libStyles(colors);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: topPad + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Text style={s.pageTitle}>Madrasa</Text>
      <Text style={s.pageSubtitle}>Your learning hub</Text>

      {/* ── Streak Widget ──────────────────────────────────────────────── */}
      <View style={s.streakCard}>
        <View style={s.streakLeft}>
          <Ionicons name="flame" size={22} color={colors.appFlame} />
          <View>
            <Text style={s.streakTitle}>{streakDays}-day streak</Text>
            <Text style={s.streakSub}>Keep it up!</Text>
          </View>
        </View>
        <View style={s.weekDotsRow}>
          {weekDots.map((dot, i) => (
            <View key={i} style={[s.dot, dot.active && s.dotActive]}>
              <Text style={[s.dotLetter, dot.active && s.dotLetterActive]}>{dot.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Memorization Quiz Card (dark) ──────────────────────────────── */}
      <TouchableOpacity
        style={s.quizCardDark}
        onPress={() => router.push("/memorization-quiz")}
        activeOpacity={0.88}
      >
        <View style={s.quizCardTopRow}>
          <View style={s.iconWrapDark}>
            <Ionicons name="bulb-outline" size={22} color={colors.appWhite} />
          </View>
          <View style={s.quizCardTextBlock}>
            <Text style={s.quizTitleDark}>Memorization Quiz</Text>
            <Text style={s.quizDescDark}>Test ayah order, blanks, and meanings.</Text>
          </View>
          <View style={s.badgeDark}>
            <Text style={s.badgeNumDark}>{QUIZ_TYPES}</Text>
            <Text style={s.badgeLabelDark}>types</Text>
          </View>
        </View>
        <View style={s.startRowDark}>
          <Text style={s.startTextDark}>Start Quiz</Text>
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
        </View>
      </TouchableOpacity>

      {/* ── Words Quiz Card (light) ────────────────────────────────────── */}
      <TouchableOpacity
        style={s.quizCardLight}
        onPress={() => setView("words")}
        activeOpacity={0.88}
      >
        <View style={s.quizCardTopRow}>
          <View style={s.iconWrapLight}>
            <Ionicons name="book-outline" size={22} color={colors.appText} />
          </View>
          <View style={s.quizCardTextBlock}>
            <Text style={s.quizTitleLight}>Words Quiz</Text>
            <Text style={s.quizDescLight}>Review vocabulary &amp; meanings</Text>
          </View>
          <View style={s.badgeLight}>
            <Text style={s.badgeNumLight}>{savedWords.length}</Text>
            <Text style={s.badgeLabelLight}>words</Text>
          </View>
        </View>
        <View style={s.startRowLight}>
          <Text style={s.startTextLight}>Start Quiz</Text>
          <Feather name="chevron-right" size={16} color={colors.appTextMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Certifications Card ────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.infoCard}
        onPress={() => router.push("/certifications")}
        activeOpacity={0.88}
      >
        <View style={s.iconWrapGold}>
          <Ionicons name="ribbon-outline" size={22} color={colors.appText} />
        </View>
        <View style={s.infoTextBlock}>
          <Text style={s.infoTitle}>Certifications</Text>
          <Text style={s.infoDesc}>{memorizedCount}/{TOTAL_AYAHS} ayahs</Text>
        </View>
        <View style={s.infoBadge}>
          <Text style={s.infoBadgeNum}>{certificationPercent}%</Text>
          <Text style={s.infoBadgeLabel}>memorized</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.appTextMuted} />
      </TouchableOpacity>

      {/* ── Saved Ayahs Card ───────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.infoCard}
        onPress={() => setView("words")}
        activeOpacity={0.88}
      >
        <View style={s.iconWrapLight}>
          <Ionicons name="bookmark-outline" size={22} color={colors.appText} />
        </View>
        <View style={s.infoTextBlock}>
          <Text style={s.infoTitle}>Saved Ayahs</Text>
          <Text style={s.infoDesc}>Used across all quizzes</Text>
        </View>
        <View style={s.infoBadge}>
          <Text style={s.infoBadgeNum}>{savedAyahs.length}</Text>
          <Text style={s.infoBadgeLabel}>ayahs</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.appTextMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const libStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.appBackground,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 48,
    },

    // ── Header ───────────────────────────────────────────────────────────
    pageTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      marginBottom: 2,
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      marginBottom: 20,
    },

    // ── Streak Widget ─────────────────────────────────────────────────────
    streakCard: {
      backgroundColor: colors.appCard,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
      marginBottom: 10,
    },
    streakLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    streakTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    streakSub: {
      fontSize: 12,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    weekDotsRow: {
      flexDirection: "row",
      gap: 5,
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.appLightGray,
      alignItems: "center",
      justifyContent: "center",
    },
    dotActive: {
      backgroundColor: colors.appText,
    },
    dotLetter: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.appTextMuted,
      fontFamily: "Inter_700Bold",
    },
    dotLetterActive: {
      color: colors.appWhite,
    },

    // ── Shared quiz card top row ──────────────────────────────────────────
    quizCardTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
    },
    quizCardTextBlock: {
      flex: 1,
    },

    // ── Memorization Quiz Card ────────────────────────────────────────────
    quizCardDark: {
      backgroundColor: colors.appText,
      borderRadius: 18,
      padding: 16,
      marginBottom: 10,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    iconWrapDark: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    quizTitleDark: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
      marginBottom: 4,
    },
    quizDescDark: {
      fontSize: 13,
      color: "rgba(255,255,255,0.6)",
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    badgeDark: {
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: "center",
      minWidth: 52,
      flexShrink: 0,
    },
    badgeNumDark: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.appWhite,
      fontFamily: "Inter_700Bold",
    },
    badgeLabelDark: {
      fontSize: 10,
      color: "rgba(255,255,255,0.6)",
      fontFamily: "Inter_400Regular",
    },
    startRowDark: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    startTextDark: {
      fontSize: 14,
      fontWeight: "700",
      color: "rgba(255,255,255,0.85)",
      fontFamily: "Inter_700Bold",
    },

    // ── Words Quiz Card ───────────────────────────────────────────────────
    quizCardLight: {
      backgroundColor: colors.appCard,
      borderRadius: 18,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    iconWrapLight: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.appLightGray,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    quizTitleLight: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      marginBottom: 4,
    },
    quizDescLight: {
      fontSize: 13,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    badgeLight: {
      backgroundColor: colors.appLightGray,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: "center",
      minWidth: 52,
      flexShrink: 0,
    },
    badgeNumLight: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    badgeLabelLight: {
      fontSize: 10,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    startRowLight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.appLightGray,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    startTextLight: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },

    // ── Info Cards (Certifications, Saved Ayahs) ──────────────────────────
    infoCard: {
      backgroundColor: colors.appCard,
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.appBorderLight,
      shadowColor: colors.appBlack,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    iconWrapGold: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.appGoldSurface,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoTextBlock: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    infoDesc: {
      fontSize: 12,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    infoBadge: {
      backgroundColor: colors.appLightGray,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignItems: "center",
      minWidth: 60,
      flexShrink: 0,
    },
    infoBadgeNum: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    infoBadgeLabel: {
      fontSize: 10,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
  });
