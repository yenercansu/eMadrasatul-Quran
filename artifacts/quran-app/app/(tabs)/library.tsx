import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type SavedWord } from "@/contexts/QuranContext";
import { SURAH_DATA } from "@/constants/surahData";

type FilterMode = "all" | "highlighted" | "by-surah";

function WordCard({ word, onRemove, onToggleHighlight }: {
  word: SavedWord;
  onRemove: (id: string) => void;
  onToggleHighlight: (id: string) => void;
}) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <View style={[s.wordCard, word.highlighted && s.highlightedCard]}>
      <View style={s.wordMain}>
        <Text style={s.arabic}>{word.arabic}</Text>
        {word.translation ? (
          <Text style={s.translation}>{word.translation}</Text>
        ) : (
          <Text style={s.translationEmpty}>No translation saved</Text>
        )}
        <Text style={s.meta}>
          Surah {word.surahNumber} • Ayah {word.ayahNumber}
        </Text>
      </View>
      <View style={s.wordActions}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleHighlight(word.id); }}
          style={s.wordActionBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={word.highlighted ? "star" : "star-outline"}
            size={18}
            color={word.highlighted ? colors.accent : colors.mutedForeground}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Remove word?", `Remove "${word.arabic}" from your library?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onRemove(word.id); } },
            ]);
          }}
          style={s.wordActionBtn}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface SurahGroup {
  surahNumber: number;
  surahName: string;
  wordCount: number;
}

function SurahGroupRow({ group, onPress, colors }: {
  group: SurahGroup;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);
  return (
    <TouchableOpacity style={s.surahRow} onPress={onPress} activeOpacity={0.8}>
      <View style={s.surahRowBadge}>
        <Text style={s.surahRowNum}>{group.surahNumber}</Text>
      </View>
      <View style={s.surahRowInfo}>
        <Text style={s.surahRowName}>{group.surahName}</Text>
        <Text style={s.surahRowMeta}>{group.wordCount} word{group.wordCount !== 1 ? "s" : ""} saved</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedWords, removeWord, toggleHighlight } = useQuran();
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const surahGroups = useMemo((): SurahGroup[] => {
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
    if (filterMode === "highlighted") return savedWords.filter(w => w.highlighted);
    if (filterMode === "by-surah" && selectedSurahNum !== null) {
      return savedWords.filter(w => w.surahNumber === selectedSurahNum);
    }
    return savedWords;
  }, [savedWords, filterMode, selectedSurahNum]);

  const handleDeleteAllFromSurah = (surahNum: number) => {
    const surahName = SURAH_DATA[surahNum - 1]?.englishName ?? `Surah ${surahNum}`;
    const count = savedWords.filter(w => w.surahNumber === surahNum).length;
    Alert.alert(
      `Delete all from ${surahName}?`,
      `This will remove all ${count} word${count !== 1 ? "s" : ""} from ${surahName} from your library.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const toRemove = savedWords.filter(w => w.surahNumber === surahNum).map(w => w.id);
            toRemove.forEach(id => removeWord(id));
            setSelectedSurahNum(null);
          },
        },
      ]
    );
  };

  const selectedSurahName = selectedSurahNum !== null
    ? SURAH_DATA[selectedSurahNum - 1]?.englishName ?? `Surah ${selectedSurahNum}`
    : "";

  const showDrillDown = filterMode === "by-surah" && selectedSurahNum !== null;
  const showSurahList = filterMode === "by-surah" && selectedSurahNum === null;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        {showDrillDown ? (
          <View style={s.drillHeader}>
            <TouchableOpacity onPress={() => setSelectedSurahNum(null)} style={s.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View>
              <Text style={s.title}>{selectedSurahName}</Text>
              <Text style={s.subtitle}>{filteredWords.length} words saved</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.title}>Vocabulary Library</Text>
            <Text style={s.subtitle}>{savedWords.length} words saved</Text>
          </>
        )}

        {!showDrillDown && (
          <View style={s.filterRow}>
            {([
              { key: "all", label: "All Words" },
              { key: "highlighted", label: "Highlighted" },
              { key: "by-surah", label: "By Surah" },
            ] as { key: FilterMode; label: string }[]).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.filterChip, filterMode === key && s.filterChipActive]}
                onPress={() => { setFilterMode(key); setSelectedSurahNum(null); }}
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

      {savedWords.length > 0 && !showSurahList && !showDrillDown && (
        <TouchableOpacity
          style={s.quizCta}
          onPress={() => router.push("/quiz")}
          activeOpacity={0.85}
        >
          <Ionicons name="game-controller" size={20} color={colors.primaryForeground} />
          <Text style={s.quizCtaText}>Start Quiz</Text>
          <Feather name="chevron-right" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      )}

      {showDrillDown && (
        <TouchableOpacity
          style={s.deleteAllBtn}
          onPress={() => handleDeleteAllFromSurah(selectedSurahNum!)}
          activeOpacity={0.85}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={s.deleteAllBtnText}>Delete all {filteredWords.length} words from {selectedSurahName}</Text>
        </TouchableOpacity>
      )}

      {showSurahList ? (
        <FlatList
          data={surahGroups}
          keyExtractor={(item) => String(item.surahNumber)}
          renderItem={({ item }) => (
            <SurahGroupRow
              group={item}
              onPress={() => setSelectedSurahNum(item.surahNumber)}
              colors={colors}
            />
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No words saved yet</Text>
              <Text style={s.emptySubtitle}>Save words while reading to organize them by surah</Text>
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
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>
                {filterMode === "highlighted" ? "No highlighted words" : "No words saved yet"}
              </Text>
              <Text style={s.emptySubtitle}>
                {filterMode === "highlighted"
                  ? "Star a word in your library to highlight it"
                  : "Long-press any word while reading to save it here"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    drillHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    backBtn: { padding: 4 },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 10 },
    filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: { borderColor: colors.primary, backgroundColor: colors.secondary },
    filterText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    filterTextActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    quizCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.primary,
      margin: 16,
      padding: 16,
      borderRadius: 14,
    },
    quizCtaText: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    deleteAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: "#FFF0F0",
    },
    deleteAllBtnText: { fontSize: 13, color: colors.destructive, fontFamily: "Inter_400Regular", flex: 1 },
    surahRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    surahRowBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    surahRowNum: { fontSize: 13, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    surahRowInfo: { flex: 1 },
    surahRowName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    surahRowMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    wordCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    highlightedCard: { borderColor: colors.accent, backgroundColor: colors.muted },
    wordMain: { flex: 1 },
    arabic: { fontSize: 24, color: colors.foreground, marginBottom: 4 },
    translation: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    translationEmpty: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" },
    meta: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    wordActions: { gap: 8 },
    wordActionBtn: { padding: 6 },
    empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    emptySubtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
