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
      <Animated.View style={[s.swipeActionLeft, { transform: [{ translateX: trans }] }]}>
        <Feather name="book-open" size={20} color="#FFFFFF" />
        <Text style={s.swipeActionText}>Go to</Text>
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
        >
          <Feather name="external-link" size={16} color="#9A9A9A" />
        </TouchableOpacity>
      </View>
      <Text style={s.arabicText}>{ayah.arabicText}</Text>
      {ayah.translationText ? (
        <Text style={s.translationText}>{ayah.translationText}</Text>
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
          // User swiped LEFT → reveals right "Remove" action
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onRemove(ayah.id);
        } else {
          // User swiped RIGHT → reveals left "Go to" action
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
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: 1,
      borderColor: "#F0F0F0",
    },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
    surahBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#1A1A1A",
      alignItems: "center",
      justifyContent: "center",
    },
    surahBadgeNum: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    surahName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
    ayahLabel: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
    arabicText: {
      fontSize: 26,
      lineHeight: 46,
      color: "#1A1A1A",
      textAlign: "right",
      writingDirection: "rtl",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
    },
    translationText: {
      fontSize: 14,
      lineHeight: 22,
      color: "#6B6B6B",
      fontFamily: "Inter_400Regular",
      borderTopWidth: 1,
      borderTopColor: "#F0F0F0",
      paddingTop: 12,
    },
    swipeAction: {
      width: 80,
      backgroundColor: "#D9534F",
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
      gap: 4,
    },
    swipeActionLeft: {
      width: 80,
      backgroundColor: "#1A1A1A",
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
      gap: 4,
    },
    swipeActionText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  });

function AyahListView({ ayahs, onRemove }: { ayahs: SavedAyah[]; onRemove: (id: string) => void }) {
  if (ayahs.length === 0) {
    return (
      <View style={listViewStyles.empty}>
        <View style={listViewStyles.emptyIcon}>
          <Feather name="bookmark" size={32} color="#D0D0D0" />
        </View>
        <Text style={listViewStyles.emptyTitle}>No saved ayahs</Text>
        <Text style={listViewStyles.emptySubtitle}>Swipe right on any ayah while reading to save it here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ayahs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <AyahCard ayah={item} onRemove={onRemove} isTop={true} />
      )}
      contentContainerStyle={listViewStyles.listContent}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        <Text style={listViewStyles.hint}>← swipe left to remove · swipe right to open →</Text>
      }
    />
  );
}

const listViewStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 160, gap: 12 },
  hint: { textAlign: "center", fontSize: 12, color: "#B0B0B0", fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});

function WordCard({ word, onRemove, onToggleHighlight }: {
  word: SavedWord;
  onRemove: (id: string) => void;
  onToggleHighlight: (id: string) => void;
}) {
  const colors = useColors();
  const s = wordCardStyles(colors);
  return (
    <View style={[s.card, word.highlighted && s.highlightedCard]}>
      <View style={s.main}>
        <Text style={s.arabic}>{word.arabic}</Text>
        {word.translation ? (
          <Text style={s.translation}>{word.translation}</Text>
        ) : (
          <Text style={s.translationEmpty}>No translation saved</Text>
        )}
        <View style={s.metaRow}>
          <Text style={s.meta}>Surah {word.surahNumber} · Ayah {word.ayahNumber}</Text>
        </View>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleHighlight(word.id); }}
          style={s.actionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={word.highlighted ? "star" : "star-outline"} size={18} color={word.highlighted ? "#C9A84C" : "#B0B0B0"} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Remove word?", `Remove "${word.arabic}" from your library?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onRemove(word.id); } },
            ]);
          }}
          style={s.actionBtn}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={16} color="#B0B0B0" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const wordCardStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#F0F0F0",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    highlightedCard: { borderColor: "#C9A84C", backgroundColor: "#FFFDF5" },
    main: { flex: 1 },
    arabic: { fontSize: 24, color: "#1A1A1A", marginBottom: 4 },
    translation: { fontSize: 15, color: "#3A3A3A", fontFamily: "Inter_400Regular" },
    translationEmpty: { fontSize: 13, color: "#B0B0B0", fontFamily: "Inter_400Regular", fontStyle: "italic" },
    metaRow: { flexDirection: "row", gap: 8, marginTop: 6 },
    meta: { fontSize: 11, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
    actions: { gap: 8 },
    actionBtn: { padding: 6 },
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
      .map(([num, count]) => ({
        surahNumber: num,
        surahName: SURAH_DATA[num - 1]?.englishName ?? `Surah ${num}`,
        wordCount: count,
      }));
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
    { key: "ayah", label: "Saved Ayah" },
    { key: "words", label: "Words" },
    { key: "by-surah", label: "By Surah" },
  ];

  const s = wordsViewStyles;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        {showDrillDown ? (
          <View style={s.drillHeader}>
            <TouchableOpacity onPress={() => setSelectedSurahNum(null)} style={s.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{selectedSurahName}</Text>
              <Text style={s.subtitle}>{filteredWords.length} words saved</Text>
            </View>
          </View>
        ) : (
          <View style={s.topRow}>
            <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>
                {filterMode === "ayah" ? "Saved Ayahs" : "Vocabulary"}
              </Text>
              <Text style={s.subtitle}>
                {filterMode === "ayah"
                  ? `${savedAyahs.length} ayah${savedAyahs.length !== 1 ? "s" : ""} saved`
                  : `${savedWords.length} words saved`}
              </Text>
            </View>
          </View>
        )}

        {!showDrillDown && (
          <View style={s.filterRow}>
            {FILTERS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.filterChip, filterMode === key && s.filterChipActive]}
                onPress={() => { setFilterMode(key as FilterMode); setSelectedSurahNum(null); }}
                activeOpacity={0.8}
              >
                <Text style={[s.filterText, filterMode === key && s.filterTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {filterMode === "ayah" ? (
        <AyahListView ayahs={savedAyahs} onRemove={removeAyah} />
      ) : showSurahList ? (
        <FlatList
          data={surahGroups}
          keyExtractor={(item) => String(item.surahNumber)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.surahRow}
              onPress={() => setSelectedSurahNum(item.surahNumber)}
              activeOpacity={0.8}
            >
              <View style={s.surahBadge}>
                <Text style={s.surahBadgeNum}>{item.surahNumber}</Text>
              </View>
              <View style={s.surahInfo}>
                <Text style={s.surahName}>{item.surahName}</Text>
                <Text style={s.surahMeta}>{item.wordCount} word{item.wordCount !== 1 ? "s" : ""} saved</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#B0B0B0" />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book" size={40} color="#D0D0D0" />
              <Text style={s.emptyTitle}>No words saved yet</Text>
              <Text style={s.emptySubtitle}>Save words while reading to organize them by surah</Text>
            </View>
          }
        />
      ) : showDrillDown ? (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onRemove={removeWord} onToggleHighlight={toggleHighlight} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 160, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book-open" size={40} color="#D0D0D0" />
              <Text style={s.emptyTitle}>No words saved yet</Text>
              <Text style={s.emptySubtitle}>Long-press any word while reading to save it here</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onRemove={removeWord} onToggleHighlight={toggleHighlight} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 160, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book-open" size={40} color="#D0D0D0" />
              <Text style={s.emptyTitle}>No words saved yet</Text>
              <Text style={s.emptySubtitle}>Long-press any word while reading to save it here</Text>
            </View>
          }
        />
      )}

      {showDrillDown && (
        <TouchableOpacity
          style={s.deleteAllBtn}
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
          <Text style={s.deleteAllText}>Delete all {filteredWords.length} words from {selectedSurahName}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const wordsViewStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  drillHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  backBtn: { padding: 4, marginTop: 4 },
  title: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  filterChipActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
  filterTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  surahRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
  },
  surahBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  surahBadgeNum: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  surahMeta: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
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

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { memorizedAyahKeys } = useQuran();
  const [view, setView] = useState<"select" | "words">("select");
  const topPad = insets.top;

  if (view === "words") {
    return <WordsQuizView onBack={() => setView("select")} />;
  }

  const totalAyahs = 6236;
  const memorizedCount = memorizedAyahKeys.length;
  const certificationPercent = Math.min(100, Math.round((memorizedCount / totalAyahs) * 100));

  return (
    <ScrollView style={selStyles.container} contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 40, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={selStyles.pageTitle}>Madrasa</Text>

      <View style={selStyles.cardsRow}>
        <TouchableOpacity
          style={[selStyles.card, selStyles.cardDark]}
          onPress={() => router.push("/memorization-quiz")}
          activeOpacity={0.88}
        >
          <View style={selStyles.cardTopRow}>
            <View style={selStyles.iconWrapDark}>
              <Ionicons name="bulb" size={22} color="#FFFFFF" />
            </View>
            <View style={selStyles.cardTextBlock}>
              <Text style={selStyles.cardTitleDark}>Memorization Quiz</Text>
              <Text style={selStyles.cardDescDark}>Test ayah order, blanks, and meanings.</Text>
            </View>
          </View>
          <View style={selStyles.selectBtnDark}>
            <Text style={selStyles.selectBtnTextDark}>Start Quiz</Text>
            <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[selStyles.card, selStyles.cardLight]}
          onPress={() => setView("words")}
          activeOpacity={0.88}
        >
          <View style={selStyles.cardTopRow}>
            <View style={selStyles.iconWrapLight}>
              <Ionicons name="book" size={22} color="#1A1A1A" />
            </View>
            <View style={selStyles.cardTextBlock}>
              <Text style={selStyles.cardTitleLight}>Words Quiz</Text>
              <Text style={selStyles.cardDescLight}>Review saved vocabulary and meanings.</Text>
            </View>
          </View>
          <View style={selStyles.selectBtnLight}>
            <Text style={selStyles.selectBtnTextLight}>Open Words</Text>
            <Feather name="arrow-right" size={14} color="#6B6B6B" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[selStyles.card, selStyles.cardGold]}
          onPress={() => router.push("/certifications")}
          activeOpacity={0.88}
        >
          <View style={selStyles.cardTopRow}>
            <View style={selStyles.iconWrapGold}>
              <Ionicons name="ribbon" size={22} color="#1A1A1A" />
            </View>
            <View style={selStyles.cardTextBlock}>
              <Text style={selStyles.cardTitleLight}>Certifications</Text>
              <Text style={selStyles.cardDescLight}>{memorizedCount}/{totalAyahs} ayahs memorized · {certificationPercent}%</Text>
            </View>
          </View>
          <View style={selStyles.selectBtnGold}>
            <Text style={selStyles.selectBtnTextLight}>View Progress</Text>
            <Feather name="arrow-right" size={14} color="#6B6B6B" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const selStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F6",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  cardsRow: {
    gap: 10,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 152,
  },
  cardDark: {
    backgroundColor: "#1A1A1A",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  cardGold: {
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#EEDFAF",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  cardTextBlock: { flex: 1 },
  iconWrapDark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapLight: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapGold: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F1D887",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleDark: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
    marginBottom: 3,
  },
  cardTitleLight: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
    marginBottom: 3,
  },
  cardDescDark: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  cardDescLight: {
    fontSize: 12,
    color: "#9A9A9A",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  selectBtnDark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "stretch",
  },
  selectBtnLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "stretch",
  },
  selectBtnGold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "stretch",
  },
  selectBtnTextDark: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_700Bold",
  },
  selectBtnTextLight: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#3A3A3A",
    fontFamily: "Inter_700Bold",
  },
});
