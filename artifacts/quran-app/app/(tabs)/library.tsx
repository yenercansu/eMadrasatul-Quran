import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { TouchableOpacity as GHTouchable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
  const openSideRef = useRef<"right" | "left" | null>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[s.swipeAction, { transform: [{ translateX: trans }] }]}>
        <GHTouchable
          style={s.swipeActionBtn}
          onPress={() => {
            if (openSideRef.current !== "right") return;
            openSideRef.current = null;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            swipeRef.current?.close();
            onRemove(ayah.id);
          }}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
          <Text style={s.swipeActionText}>Remove</Text>
        </GHTouchable>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
    return (
      <Animated.View style={[s.swipeActionLeft, { backgroundColor: colors.foreground, transform: [{ translateX: trans }] }]}>
        <GHTouchable
          style={s.swipeActionBtn}
          onPress={() => {
            if (openSideRef.current !== "left") return;
            openSideRef.current = null;
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
            swipeRef.current?.close();
            router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`);
          }}
          activeOpacity={0.8}
        >
          <Feather name="book-open" size={20} color={colors.primaryForeground} />
          <Text style={s.swipeActionText}>Go to</Text>
        </GHTouchable>
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
        openSideRef.current = direction === "right" ? "right" : "left";
      }}
      onSwipeableClose={() => {
        openSideRef.current = null;
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
      width: 36,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    swipeAction: {
      width: 80,
      backgroundColor: "#D9534F",
      borderRadius: 16,
      marginLeft: 8,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    swipeActionLeft: {
      width: 80,
      borderRadius: 16,
      marginRight: 8,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    swipeActionBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
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

function WordCard({ word, onToggleMemorized }: {
  word: SavedWord;
  onToggleMemorized: () => void;
}) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  // Local visual state decoupled from persisted state so the checkmark
  // fills immediately on tap before the card moves sections.
  const [localMemorized, setLocalMemorized] = useState(!!word.memorized);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, []);

  const handleToggleMemorized = () => {
    // Prevent double-tap while transition is already in flight.
    if (pendingRef.current) return;

    const next = !localMemorized;
    setLocalMemorized(next); // immediate visual feedback

    // After a short pause, fade the card out then commit the state change.
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        onToggleMemorized();
        // Reset opacity for when the card appears in the other section.
        fadeAnim.setValue(1);
      });
    }, 420);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={() => setRevealed(prev => !prev)}
        style={[wordCardStyles.card, { backgroundColor: colors.card, borderColor: colors.appDarkerGray }]}
        activeOpacity={0.85}
      >
        <View style={wordCardStyles.cardTop}>
          <Text style={[wordCardStyles.arabic, { color: colors.appText }]}>
            {word.arabic}
          </Text>
          <TouchableOpacity
            style={[
              wordCardStyles.checkCircle,
              {
                borderColor: localMemorized ? colors.appText : colors.appBorderMid,
                backgroundColor: localMemorized ? colors.appText : "transparent",
              },
            ]}
            onPress={handleToggleMemorized}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="check"
              size={14}
              color={localMemorized ? colors.card : colors.appBorderMid}
            />
          </TouchableOpacity>
        </View>
        <View style={[wordCardStyles.divider, { backgroundColor: colors.appStone }]} />
        <View style={wordCardStyles.cardBottom}>
          {revealed ? (
            <Text style={[wordCardStyles.translationText, { color: colors.appText }]}>
              {word.translation || word.arabic}
            </Text>
          ) : (
            <Text style={[wordCardStyles.tapToReveal, { color: colors.appBorderMid }]}>
              tap to reveal
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const wordCardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 112,
  },
  cardTop: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 68,
  },
  arabic: {
    flex: 1,
    fontSize: 30,
    fontWeight: "400",
    lineHeight: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  checkCircle: {
    position: "absolute",
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  cardBottom: {
    paddingHorizontal: 20,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tapToReveal: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  translationText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
});

function WordsQuizView({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedWords, savedAyahs, removeAyah, toggleWordMemorized } = useQuran();
  const [filterMode, setFilterMode] = useState<FilterMode>("ayah");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [wordTab, setWordTab] = useState<"active" | "memorized">("active");
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

  const activeWordCount = useMemo(() => filteredWords.filter(w => !w.memorized).length, [filteredWords]);
  const memorizedWordCount = useMemo(() => filteredWords.filter(w => !!w.memorized).length, [filteredWords]);
  const displayedWords = useMemo(
    () => filteredWords.filter(w => wordTab === "memorized" ? !!w.memorized : !w.memorized),
    [filteredWords, wordTab]
  );

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
              <Feather name="arrow-left" size={22} color={colors.appText} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[wvs.title, { color: colors.foreground }]}>{selectedSurahName}</Text>
              <Text style={[wvs.subtitle, { color: colors.mutedForeground }]}>{filteredWords.length} words saved</Text>
            </View>
          </View>
        ) : (
          <View style={wvs.topRow}>
            <TouchableOpacity onPress={onBack} style={wvs.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color={colors.appText} />
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

        {filterMode === "words" && !showDrillDown && (
          <View style={[wvs.segmentedControl, { backgroundColor: colors.appBorderLight }]}>
            <TouchableOpacity
              style={[
                wvs.segmentPill,
                wordTab === "active" && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.appText },
              ]}
              onPress={() => setWordTab("active")}
              activeOpacity={0.8}
            >
              <Text style={[wvs.segmentText, { color: wordTab === "active" ? colors.appNeutralDark : colors.appBorderMid }]}>
                <Text style={{ fontFamily: wordTab === "active" ? "Inter_700Bold" : "Inter_600SemiBold" }}>Active</Text>
                <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${activeWordCount})`}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                wvs.segmentPill,
                wordTab === "memorized" && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.appText },
              ]}
              onPress={() => setWordTab("memorized")}
              activeOpacity={0.8}
            >
              <Text style={[wvs.segmentText, { color: wordTab === "memorized" ? colors.appNeutralDark : colors.appBorderMid }]}>
                <Text style={{ fontFamily: wordTab === "memorized" ? "Inter_700Bold" : "Inter_600SemiBold" }}>Memorized</Text>
                <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${memorizedWordCount})`}</Text>
              </Text>
            </TouchableOpacity>
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
            <WordCard word={item} onToggleMemorized={() => toggleWordMemorized(item.id)} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyWords}
          ListFooterComponent={ctaCard}
        />
      ) : (
        <FlatList
          data={displayedWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onToggleMemorized={() => toggleWordMemorized(item.id)} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            wordTab === "memorized" ? (
              <View style={wvs.empty}>
                <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No memorized words yet</Text>
                <Text style={[wvs.emptySubtitle, { color: colors.mutedForeground }]}>
                  Tap the check mark on any word to mark it as memorized
                </Text>
              </View>
            ) : emptyWords
          }
          ListFooterComponent={ctaCard}
        />
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

  // Active / Memorized segmented control
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 999,
    height: 44,
    padding: 2,
    marginTop: 10,
  },
  segmentPill: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 14,
    textAlign: "center",
  },

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
      contentContainerStyle={[s.content, { paddingTop: topPad + 15 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header + Streak ────────────────────────────────────────────── */}
      <View style={s.headerSection}>
        <View style={s.titleBlock}>
          <Text style={s.pageTitle}>Madrasa</Text>
          <Text style={s.pageSubtitle}>Qur'an Learning Hub</Text>
        </View>
        <View style={s.streakCard}>
          <View style={s.streakContent}>
            <View style={s.streakLeft}>
              <Text style={s.streakTitle}>{streakDays}-day attendance</Text>
              <Text style={s.streakSub}>Keep it up!</Text>
            </View>
            <View style={s.weekDotsRow}>
              {weekDots.map((dot, i) => (
                <View key={i} style={[s.dot, dot.active && s.dotActive]}>
                  <Text style={[s.dotLetter, dot.active && s.dotLetterActive]}>{dot.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={s.swipeHintSpacer} />

      {/* ── Memorization Quiz Card ─────────────────────────────────────── */}
      <TouchableOpacity
        style={s.quizCard}
        onPress={() => router.push("/memorization-quiz")}
        activeOpacity={0.88}
      >
        <View style={s.cardTopRow}>
          <View style={s.cardTextBlock}>
            <Text style={s.cardTitle}>Memorization Quiz</Text>
            <Text style={s.cardDesc}>Test ayah order, blanks, and meanings.</Text>
          </View>
          <View style={s.cardBadge}>
            <Text style={s.cardBadgeNum}>{QUIZ_TYPES}</Text>
            <Text style={s.cardBadgeLabel}>types</Text>
          </View>
        </View>
        <View style={s.cardDivider} />
        <View style={s.startRow}>
          <Text style={s.startText}>Start Quiz</Text>
          <Feather name="chevron-right" size={16} color={colors.appTextMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Words Quiz Card ────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.quizCard}
        onPress={() => setView("words")}
        activeOpacity={0.88}
      >
        <View style={s.cardTopRow}>
          <View style={s.cardTextBlock}>
            <Text style={s.cardTitle}>Words Quiz</Text>
            <Text style={s.cardDesc}>Review vocabulary & meanings</Text>
          </View>
          <View style={s.cardBadge}>
            <Text style={s.cardBadgeNum}>{savedWords.length}</Text>
            <Text style={s.cardBadgeLabel}>words</Text>
          </View>
        </View>
        <View style={s.cardDivider} />
        <View style={s.startRow}>
          <Text style={s.startText}>Start Quiz</Text>
          <Feather name="chevron-right" size={16} color={colors.appTextMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Certifications Card ────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.quizCard}
        onPress={() => router.push("/certifications")}
        activeOpacity={0.88}
      >
        <View style={s.cardTopRow}>
          <View style={s.cardTextBlock}>
            <Text style={s.cardTitle}>Certifications</Text>
            <Text style={s.cardDesc}>{memorizedCount}/{TOTAL_AYAHS} ayahs memorized</Text>
          </View>
          <View style={s.cardBadge}>
            <Text style={s.cardBadgeNum}>{certificationPercent}%</Text>
            <Text style={s.cardBadgeLabel}>memorized</Text>
          </View>
        </View>
        <View style={s.cardDivider} />
        <View style={s.startRow}>
          <Text style={s.startText}>See Certifications</Text>
          <Feather name="chevron-right" size={16} color={colors.appTextMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Saved Ayahs Card ───────────────────────────────────────────── */}
      <View style={s.savedCard}>
        <View style={s.cardTopRow}>
          <View style={s.cardTextBlock}>
            <Text style={s.cardTitle}>Saved Ayahs</Text>
            <Text style={s.cardDesc}>Used across all quizzes</Text>
          </View>
          <View style={s.savedCardBadge}>
            <Text style={s.cardBadgeNum}>{savedAyahs.length}</Text>
            <Text style={s.cardBadgeLabel}>ayahs</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const libStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.appLighterBg,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      gap: 16,
    },

    // ── Header ───────────────────────────────────────────────────────────
    headerSection: {
      gap: 12,
    },
    titleBlock: {
      gap: 2,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },

    // ── Streak Card ───────────────────────────────────────────────────────
    streakCard: {
      backgroundColor: colors.appStone,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    streakContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    streakLeft: {
      gap: 2,
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
    },
    weekDotsRow: {
      flexDirection: "row",
      gap: 4,
    },
    dot: {
      width: 20,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 999,
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

    // ── Swipe hint spacer (text removed, spacing preserved) ──────────────
    swipeHintSpacer: {
      height: 20,
    },

    // ── Quiz / Info Cards (white bg) ──────────────────────────────────────
    quizCard: {
      backgroundColor: colors.appCard,
      borderRadius: 12,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.appBorderAccent,
    },
    cardTopRow: {
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 44,
    },
    cardTextBlock: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    cardDesc: {
      fontSize: 13,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    cardBadge: {
      paddingHorizontal: 28,
      paddingVertical: 8,
      backgroundColor: colors.appStone,
      borderRadius: 8,
      alignItems: "center",
      flexShrink: 0,
    },
    cardBadgeNum: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    cardBadgeLabel: {
      fontSize: 10,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.appBlack,
    },
    startRow: {
      paddingHorizontal: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    startText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },

    // ── Saved Ayahs Card (stone bg, no divider/action) ────────────────────
    savedCard: {
      backgroundColor: colors.appStone,
      borderRadius: 12,
      paddingTop: 16,
      paddingBottom: 16,
    },
    savedCardBadge: {
      paddingHorizontal: 28,
      paddingVertical: 8,
      backgroundColor: colors.appStone,
      borderRadius: 8,
      alignItems: "center",
      flexShrink: 0,
    },
  });
