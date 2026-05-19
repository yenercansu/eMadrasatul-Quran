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
import { LinearGradient } from "expo-linear-gradient";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { TouchableOpacity as GHTouchable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord, type SavedAyah } from "@/contexts/QuranContext";
import { PageTitle } from "@/components/Typography";
import { InfoBox } from "@/components/InfoBox";
import { Tag } from "@/components/Tag";
import { Pagination } from "@/components/Pagination";
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
          <Feather name="trash-2" size={20} color={colors.destructiveForeground} />
          <Text style={[s.swipeActionText, { color: colors.destructiveForeground }]}>Remove</Text>
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
          <Text style={[s.swipeActionText, { color: colors.primaryForeground }]}>Go to</Text>
        </GHTouchable>
      </Animated.View>
    );
  };

  const card = (
    <View style={s.card}>
      <View style={s.cardMeta}>
        <View style={s.surahBadge}>
          <Text style={s.surahBadgeNum}>{ayah.surahNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.surahName}>{ayah.surahName}</Text>
          <Text style={s.ayahLabel}>Ayah {ayah.ayahNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/surah/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`)}
          activeOpacity={0.7}
          style={s.linkBtn}
        >
          <Feather name="external-link" size={13} color={colors.appIconMuted} />
        </TouchableOpacity>
      </View>
      <Text style={s.arabicText}>{ayah.arabicText}</Text>
      {ayah.translationText ? (
        <>
          <View style={s.divider} />
          <Text style={s.translationText}>{ayah.translationText}</Text>
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
      borderRadius: 22,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      backgroundColor: colors.appCardWarm,
      borderColor: colors.appSoftBorder,
      ...colors.shadows.premiumCard,
    },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    surahBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      backgroundColor: colors.appSoftPill,
      alignItems: "center",
      justifyContent: "center",
    },
    surahBadgeNum: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.appTextMuted },
    surahName: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.appText },
    ayahLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.appTextMuted, marginTop: 1 },
    arabicText: {
      fontSize: 26,
      lineHeight: 46,
      textAlign: "right",
      writingDirection: "rtl",
      color: colors.appText,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    divider: { height: 1, backgroundColor: colors.appSoftDivider },
    translationText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    linkBtn: {
      width: 36,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      backgroundColor: colors.appSoftPill,
      alignItems: "center",
      justifyContent: "center",
    },
    swipeAction: {
      width: 80,
      backgroundColor: colors.destructive,
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
    swipeActionText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  });

const AYAH_PAGE_SIZE = 10;

function AyahListView({ ayahs, onRemove, listHeader }: { ayahs: SavedAyah[]; onRemove: (id: string) => void; listHeader?: React.ReactElement }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [ayahs.length]);

  const totalPages = Math.max(1, Math.ceil(ayahs.length / AYAH_PAGE_SIZE));
  const pagedAyahs = useMemo(
    () => ayahs.slice(page * AYAH_PAGE_SIZE, (page + 1) * AYAH_PAGE_SIZE),
    [ayahs, page]
  );

  const infoBoxFooter = (
    <InfoBox
      title="Save words as you read"
      description="Tap any word in the Quran reader to save it here for review."
    />
  );

  if (ayahs.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={listViewStyles.emptyContent} showsVerticalScrollIndicator={false}>
          {listHeader}
          <View style={listViewStyles.empty}>
            <Text style={[listViewStyles.emptyTitle, { color: colors.foreground }]}>No saved ayahs</Text>
            <Text style={[listViewStyles.emptySubtitle, { color: colors.mutedForeground }]}>
              Save ayahs while reading to build your library
            </Text>
          </View>
          {infoBoxFooter}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pagedAyahs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AyahCard ayah={item} onRemove={onRemove} isTop={true} />}
        contentContainerStyle={listViewStyles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={infoBoxFooter}
      />
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: insets.bottom + 8,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={ayahs.length}
          itemLabel="ayah"
          onPrev={() => setPage(p => Math.max(0, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
        />
      </View>
    </View>
  );
}

const listViewStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80, gap: 12 },
  emptyContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
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
        style={[wordCardStyles.card, { backgroundColor: colors.appCardWarm, borderColor: colors.appSoftBorder, shadowColor: colors.shadowWarm }]}
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
                borderColor: localMemorized ? colors.appSelectedPill : colors.appSoftBorder,
                backgroundColor: localMemorized ? colors.appSelectedPill : colors.appSoftPill,
              },
            ]}
            onPress={handleToggleMemorized}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="check"
              size={14}
              color={localMemorized ? colors.appText : colors.appIconMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={[wordCardStyles.divider, { backgroundColor: colors.appSoftDivider }]} />
        <View style={wordCardStyles.cardBottom}>
          {revealed ? (
            <Text style={[wordCardStyles.translationText, { color: colors.appText }]}>
              {word.translation || word.arabic}
            </Text>
          ) : (
            <Text style={[wordCardStyles.tapToReveal, { color: colors.appIconMuted }]}>
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
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 112,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 3,
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
  const { savedWords, savedAyahs, removeAyah, toggleWordMemorized, quizSelectedSurahs } = useQuran();
  const [filterMode, setFilterMode] = useState<FilterMode>("ayah");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [wordTab, setWordTab] = useState<"active" | "memorized">("active");
  const [surahListPage, setSurahListPage] = useState(0);
  const SURAH_PAGE_SIZE = 10;
  const topPad = insets.top;
  const selectedQuizSurahSet = useMemo(() => new Set(quizSelectedSurahs), [quizSelectedSurahs]);
  const quizFilteredWords = useMemo(
    () => savedWords.filter(w => selectedQuizSurahSet.has(w.surahNumber)),
    [savedWords, selectedQuizSurahSet]
  );

  const surahGroups = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of quizFilteredWords) {
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
  }, [quizFilteredWords]);

  const totalSurahListPages = Math.max(1, Math.ceil(surahGroups.length / SURAH_PAGE_SIZE));
  const pagedSurahGroups = useMemo(
    () => surahGroups.slice(surahListPage * SURAH_PAGE_SIZE, (surahListPage + 1) * SURAH_PAGE_SIZE),
    [surahGroups, surahListPage]
  );

  const filteredWords = useMemo(() => {
    if (filterMode === "by-surah" && selectedSurahNum !== null) {
      return quizFilteredWords.filter(w => w.surahNumber === selectedSurahNum);
    }
    return quizFilteredWords;
  }, [quizFilteredWords, filterMode, selectedSurahNum]);

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
    <InfoBox
      title="Save words as you read"
      description="Tap any word in the Quran reader to save it here for review."
    />
  );

  const emptyWords = (
    <View style={wvs.empty}>
      <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No words saved yet</Text>
      <Text style={[wvs.emptySubtitle, { color: colors.mutedForeground }]}>
        Long-press any word while reading to save it here
      </Text>
    </View>
  );

  const wordsViewHeader = (
    <View style={[wvs.header, { paddingTop: 12 }]}>
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
                : `${quizFilteredWords.length} words saved`}
            </Text>
          </View>
        </View>
      )}

      {!showDrillDown && (
        <View style={wvs.filterRow}>
          {FILTERS.map(({ key, label }) => (
            <Tag
              key={key}
              label={label}
              selected={filterMode === key}
              onPress={() => { setFilterMode(key as FilterMode); setSelectedSurahNum(null); setSurahListPage(0); }}
            />
          ))}
        </View>
      )}

      {filterMode === "words" && !showDrillDown && (
        <View style={[wvs.segmentedControl, { backgroundColor: colors.appSoftPill }]}>
          <TouchableOpacity
            style={[
              wvs.segmentPill,
              wordTab === "active" && { backgroundColor: colors.appSelectedPill, borderWidth: 1, borderColor: colors.appSelectedPill },
            ]}
            onPress={() => setWordTab("active")}
            activeOpacity={0.8}
          >
            <Text style={[wvs.segmentText, { color: wordTab === "active" ? colors.appText : colors.appIconMuted }]}>
              <Text style={{ fontFamily: wordTab === "active" ? "Inter_600SemiBold" : "Inter_400Regular" }}>Active</Text>
              <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${activeWordCount})`}</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              wvs.segmentPill,
              wordTab === "memorized" && { backgroundColor: colors.appSelectedPill, borderWidth: 1, borderColor: colors.appSelectedPill },
            ]}
            onPress={() => setWordTab("memorized")}
            activeOpacity={0.8}
          >
            <Text style={[wvs.segmentText, { color: wordTab === "memorized" ? colors.appText : colors.appIconMuted }]}>
              <Text style={{ fontFamily: wordTab === "memorized" ? "Inter_600SemiBold" : "Inter_400Regular" }}>Memorized</Text>
              <Text style={{ fontFamily: "Inter_400Regular" }}>{` (${memorizedWordCount})`}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[wvs.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Certifications shortcut ─────────────────────────────── */}
      {!showDrillDown && (
        <TouchableOpacity
          onPress={() => router.push("/certifications")}
          activeOpacity={0.8}
          style={[
            wvs.certRow,
            { backgroundColor: colors.appCardWarm, borderColor: colors.appSoftBorder },
          ]}
        >
          <Feather name="award" size={16} color={colors.appIconMuted} />
          <Text style={[wvs.certRowText, { color: colors.appText }]}>Certifications</Text>
          <Feather name="chevron-right" size={15} color={colors.appIconMuted} />
        </TouchableOpacity>
      )}

      {/* Content */}
      {filterMode === "ayah" ? (
        <AyahListView ayahs={savedAyahs} onRemove={removeAyah} listHeader={wordsViewHeader} />

      ) : showSurahList ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={wvs.surahListContent}
            showsVerticalScrollIndicator={false}
          >
            {wordsViewHeader}
            {quizSelectedSurahs.length === 0 ? (
              <View style={wvs.empty}>
                <Feather name="info" size={24} color={colors.mutedForeground} />
                <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No Surah selected, please select a Surah or Ayah to continue</Text>
              </View>
            ) : surahGroups.length === 0 ? (
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
                  for (const g of pagedSurahGroups) {
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
                            style={[wvs.surahCard, { backgroundColor: colors.appCardWarm, borderColor: colors.appSoftBorder, shadowColor: colors.shadowWarm }]}
                            onPress={() => setSelectedSurahNum(item.surahNumber)}
                            activeOpacity={0.8}
                          >
                            <View style={[wvs.surahBadge, { borderColor: colors.appSoftBorder, backgroundColor: colors.appSoftPill }]}>
                              <Text style={[wvs.surahBadgeNum, { color: colors.appTextMuted }]}>
                                {item.surahNumber}
                              </Text>
                            </View>
                            <View style={wvs.surahCardInfo}>
                              <Text style={[wvs.surahCardName, { color: colors.foreground }]}>{item.surahName}</Text>
                              <Text style={[wvs.surahCardMeta, { color: colors.mutedForeground }]}>
                                {item.wordCount} word{item.wordCount !== 1 ? "s" : ""} saved · {origin}
                              </Text>
                              <View style={[wvs.progressTrack, { backgroundColor: colors.appSoftDivider }]}>
                                <View style={[wvs.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.appTextMuted }]} />
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
          {surahGroups.length > 0 && (
            <View style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 8,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
              <Pagination
                page={surahListPage}
                totalPages={totalSurahListPages}
                totalItems={surahGroups.length}
                itemLabel="surah"
                onPrev={() => setSurahListPage(p => Math.max(0, p - 1))}
                onNext={() => setSurahListPage(p => Math.min(totalSurahListPages - 1, p + 1))}
              />
            </View>
          )}
        </View>

      ) : showDrillDown ? (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onToggleMemorized={() => toggleWordMemorized(item.id)} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={wordsViewHeader}
          ListEmptyComponent={emptyWords}
          ListFooterComponent={ctaCard}
        />
      ) : (
        quizSelectedSurahs.length === 0 ? (
          <View style={{ flex: 1 }}>
            {wordsViewHeader}
            <View style={wvs.empty}>
              <Feather name="info" size={24} color={colors.mutedForeground} />
              <Text style={[wvs.emptyTitle, { color: colors.foreground }]}>No Surah selected, please select a Surah or Ayah to continue</Text>
            </View>
          </View>
        ) : (
        <FlatList
          data={displayedWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onToggleMemorized={() => toggleWordMemorized(item.id)} />
          )}
          contentContainerStyle={wvs.wordsListContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={wordsViewHeader}
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
        )
      )}

    </View>
  );
}

const wordsViewStyles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingBottom: 14 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginTop: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Filter chips
  filterRow: { flexDirection: "row", gap: 8 },

  // Active / Memorized segmented control
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 999,
    height: 44,
    padding: 3,
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
    fontSize: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
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
  surahCardName: { fontSize: 16, fontFamily: "Inter_700Bold" },
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

  // Certifications shortcut
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  certRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },

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
      if (entry && (entry.ayahsRead > 0 || entry.kahfCompleted || entry.quizCompleted)) streak++;
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
      const attended = !!(entry && (entry.ayahsRead > 0 || entry.kahfCompleted || entry.quizCompleted));
      return { label, active: attended };
    });
  }, [dailyEntries]);

  if (view === "words") {
    return <WordsQuizView onBack={() => setView("select")} />;
  }

  const memorizedCount = memorizedAyahKeys.length;
  const certificationPercent = Math.min(100, Math.round((memorizedCount / TOTAL_AYAHS) * 100));
  const s = libStyles(colors);

  return (
    <LinearGradient
      colors={[colors.screenBackground, colors.screenBackgroundAlt]}
      locations={[0, 1]}
      style={[s.container, { paddingTop: insets.top }]}
    >
      {/* ── Anchored title ─────────────────────────────────────────────── */}
      <View style={[s.titleBlock, { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 4 }]}>
        <PageTitle>Madrasa</PageTitle>
        <Text style={s.pageSubtitle}>Qur'an Learning Hub</Text>
      </View>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[s.content, { paddingTop: 10 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Streak ─────────────────────────────────────────────────────── */}
      <View style={s.headerSection}>
        <View style={s.streakCard}>
          <View style={s.streakContent}>
            <View style={s.streakLeft}>
              <Text style={s.streakTitle}>Attendance</Text>
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
        onPress={() => router.push("/quiz")}
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
      <InfoBox
        title="Saved Ayahs"
        description="Used across all quizzes"
        rightContent={
          <View style={s.savedCardBadge}>
            <Text style={s.cardBadgeNum}>{savedAyahs.length}</Text>
            <Text style={s.cardBadgeLabel}>ayahs</Text>
          </View>
        }
      />
    </ScrollView>
    </LinearGradient>
  );
}

const libStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      gap: 10,
    },

    // ── Header ───────────────────────────────────────────────────────────
    headerSection: {
      gap: 12,
    },
    titleBlock: {
      gap: 2,
    },
    pageSubtitle: {
      fontSize: 14,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },

    // ── Streak Card ───────────────────────────────────────────────────────
    streakCard: {
      backgroundColor: colors.appCardWarm,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      paddingVertical: 18,
      paddingHorizontal: 18,
      ...colors.shadows.softLift,
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
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.appSoftPill,
      alignItems: "center",
      justifyContent: "center",
    },
    dotActive: {
      backgroundColor: colors.appSelectedPill,
    },
    dotLetter: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appTextMuted,
      fontFamily: "Inter_700Bold",
    },
    dotLetterActive: {
      color: colors.appText,
    },

    // ── Swipe hint spacer (text removed, spacing preserved) ──────────────
    swipeHintSpacer: {
      height: 20,
    },

    // ── Quiz / Info Cards ─────────────────────────────────────────────────
    quizCard: {
      backgroundColor: colors.appCardWarm,
      borderRadius: 22,
      paddingTop: 18,
      paddingBottom: 10,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      ...colors.shadows.premiumCard,
    },
    cardTopRow: {
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 18,
    },
    cardTextBlock: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
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
      minWidth: 76,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.appSoftPill,
      borderRadius: 18,
      alignItems: "center",
      flexShrink: 0,
    },
    cardBadgeNum: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    cardBadgeLabel: {
      fontSize: 12,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.appSoftDivider,
      marginHorizontal: 16,
    },
    startRow: {
      marginHorizontal: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.appCardPressed,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    startText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.appText,
      fontFamily: "Inter_600SemiBold",
    },

    // ── Saved Ayahs badge ─────────────────────────────────────────────────
    savedCardBadge: {
      minWidth: 76,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.appSoftPill,
      borderRadius: 18,
      alignItems: "center",
      flexShrink: 0,
    },
  });
