import React, { useState } from "react";
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
        <Text style={s.translation}>{word.translation}</Text>
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
            Alert.alert("Remove word?", undefined, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => onRemove(word.id) },
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

export default function LibraryScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { savedWords, removeWord, toggleHighlight } = useQuran();
  const [filter, setFilter] = useState<"all" | "highlighted">("all");

  const filtered = filter === "all" ? savedWords : savedWords.filter(w => w.highlighted);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Text style={s.title}>Vocabulary Library</Text>
        <Text style={s.subtitle}>{savedWords.length} words saved</Text>
        <View style={s.filterRow}>
          {(["all", "highlighted"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === "all" ? "All Words" : "Highlighted"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {savedWords.length > 0 && (
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WordCard word={item} onRemove={removeWord} onToggleHighlight={toggleHighlight} />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 120 : 120, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="book" size={44} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No words saved yet</Text>
            <Text style={s.emptySubtitle}>
              Long-press any word while reading to save it here
            </Text>
          </View>
        }
      />
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
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 10,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    filterText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    filterTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    quizCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.primary,
      margin: 16,
      padding: 16,
      borderRadius: 14,
    },
    quizCtaText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    wordCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    highlightedCard: {
      borderColor: colors.accent,
      backgroundColor: colors.muted,
    },
    wordMain: { flex: 1 },
    arabic: {
      fontSize: 24,
      color: colors.foreground,
      marginBottom: 4,
    },
    translation: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    meta: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    wordActions: {
      gap: 8,
    },
    wordActionBtn: {
      padding: 6,
    },
    empty: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 24,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
  });
