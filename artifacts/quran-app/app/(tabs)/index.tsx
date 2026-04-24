import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type Goal } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";

function GoalModal({
  visible,
  currentGoal,
  onSave,
  onClose,
  colors,
}: {
  visible: boolean;
  currentGoal: Goal | null;
  onSave: (goal: Goal | null) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [ayahsPerDay, setAyahsPerDay] = useState(currentGoal?.ayahsPerDay ?? 10);
  const s = styles(colors);
  const options = [1, 5, 10, 20, 50, 100];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Set Daily Goal</Text>
              <Text style={s.modalSub}>How many ayahs do you want to read each day?</Text>
              <View style={s.goalGrid}>
                {options.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[s.goalOption, ayahsPerDay === n && s.goalOptionActive]}
                    onPress={() => setAyahsPerDay(n)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.goalOptionNum, ayahsPerDay === n && s.goalOptionNumActive]}>{n}</Text>
                    <Text style={[s.goalOptionLabel, ayahsPerDay === n && s.goalOptionLabelActive]}>
                      {n === 1 ? "ayah" : "ayahs"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.modalActions}>
                {currentGoal && (
                  <TouchableOpacity style={s.clearBtn} onPress={() => { onSave(null); onClose(); }} activeOpacity={0.8}>
                    <Text style={s.clearBtnText}>Clear Goal</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={() => { onSave({ ayahsPerDay, startDate: new Date().toISOString().split("T")[0] }); onClose(); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.saveBtnText}>Save Goal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const {
    recentProgress, lastListened, goal, setGoal, todayEntry, onlineUsers, savedWords,
    savedSurahs, removeSavedSurah,
  } = useQuran();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await fetchSurahs();
      setSurahs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const todayAyahs = todayEntry?.ayahsRead ?? 0;
  const goalProgress = goal ? Math.min(todayAyahs / goal.ayahsPerDay, 1) : 0;
  const goalMet = goal ? todayAyahs >= goal.ayahsPerDay : false;
  const isFriday = new Date().getDay() === 5;

  const surahMap = useMemo(() => {
    const m: Record<number, ApiSurah> = {};
    for (const s of surahs) m[s.number] = s;
    return m;
  }, [surahs]);

  const juzGroups = useMemo(() => {
    if (surahs.length === 0) return [];
    const groups: { juz: number; surahs: ApiSurah[] }[] = [];
    let currentJuz = 0;
    for (const surah of surahs) {
      const meta = SURAH_DATA[surah.number - 1];
      if (!meta) continue;
      if (meta.juz !== currentJuz) {
        currentJuz = meta.juz;
        groups.push({ juz: currentJuz, surahs: [] });
      }
      groups[groups.length - 1].surahs.push(surah);
    }
    return groups;
  }, [surahs]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <>
      <ScrollView
        style={s.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={[colors.primary, "#2D7D4F"]}
          style={[s.hero, { paddingTop: topPad + 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={s.greeting}>السلام عليكم</Text>
          <Text style={s.heroTitle}>Al-Quran Al-Kareem</Text>

          {lastListened && (
            <TouchableOpacity
              style={s.resumeCard}
              onPress={() => router.push(`/surah/${lastListened.surahNumber}?ayah=${lastListened.ayahNumberInSurah}`)}
              activeOpacity={0.85}
            >
              <View style={s.resumeLeft}>
                <Text style={s.resumeLabel}>CONTINUE WHERE YOU LEFT OFF</Text>
                <Text style={s.resumeSurah}>{lastListened.surahName}</Text>
                <Text style={s.resumeAyah}>Ayah {lastListened.ayahNumberInSurah}</Text>
              </View>
              <View style={s.resumeIcon}>
                <Ionicons name="play" size={24} color={colors.primaryForeground} />
              </View>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={s.onlineBar}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>{onlineUsers.toLocaleString()} people reading right now</Text>
        </View>

        <TouchableOpacity style={s.goalCard} onPress={() => setGoalModalVisible(true)} activeOpacity={0.85}>
          {!goal ? (
            <View style={s.goalSetRow}>
              <View style={s.goalIconCircle}>
                <Ionicons name="flag" size={20} color={colors.primaryForeground} />
              </View>
              <View style={s.goalSetInfo}>
                <Text style={s.goalSetTitle}>Set a Daily Goal</Text>
                <Text style={s.goalSetSub}>Stay consistent — track your daily reading</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </View>
          ) : (
            <View style={s.goalProgress}>
              <View style={s.goalProgressHeader}>
                <View>
                  <Text style={s.goalProgressTitle}>Your Accomplishment</Text>
                  <Text style={s.goalProgressSub}>
                    {todayAyahs} / {goal.ayahsPerDay} ayahs today{goalMet ? " — Goal met! 🎉" : ""}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setGoalModalVisible(true)} activeOpacity={0.7}>
                  <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressBar, { width: `${goalProgress * 100}%` as any, backgroundColor: goalMet ? "#4CAF50" : colors.primary }]} />
              </View>
              {isFriday && (
                <View style={s.kahfBadge}>
                  <Ionicons name={todayEntry?.kahfCompleted ? "checkmark-circle" : "book-outline"} size={14} color={todayEntry?.kahfCompleted ? "#4CAF50" : colors.accent} />
                  <Text style={[s.kahfText, todayEntry?.kahfCompleted && { color: "#4CAF50" }]}>
                    {todayEntry?.kahfCompleted ? "Al-Kahf completed this Friday" : "Read Al-Kahf today (Friday Sunnah)"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quizCtaCard}
          onPress={() => router.push("/quiz")}
          activeOpacity={0.85}
        >
          <View style={s.quizCtaLeft}>
            <View style={s.quizCtaIcon}>
              <Ionicons name="game-controller" size={20} color={colors.primaryForeground} />
            </View>
            <View>
              <Text style={s.quizCtaTitle}>Test Yourself!</Text>
              <Text style={s.quizCtaSub}>
                {savedWords.length === 0 ? "Save words while reading to start" : `${savedWords.length} words ready — tap to begin`}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {recentProgress.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Last Visited</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/quran")} activeOpacity={0.7}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizList}>
              {recentProgress.map((p) => (
                <TouchableOpacity
                  key={p.surahNumber}
                  style={s.recentCard}
                  onPress={() => router.push(`/surah/${p.surahNumber}?ayah=${p.ayahNumberInSurah}`)}
                  activeOpacity={0.85}
                >
                  <Text style={s.recentArabic}>{SURAH_DATA[p.surahNumber - 1]?.name ?? ""}</Text>
                  <Text style={s.recentName}>{p.surahName}</Text>
                  <Text style={s.recentAyah}>Ayah {p.ayahNumberInSurah}</Text>
                  <View style={s.recentPlayIcon}>
                    <Ionicons name="play" size={12} color={colors.primaryForeground} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {savedSurahs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Saved Surahs</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/quran")} activeOpacity={0.7}>
                <Text style={s.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizList}>
              {savedSurahs.map((num) => {
                const meta = SURAH_DATA[num - 1];
                const apiSurah = surahMap[num];
                if (!meta) return null;
                return (
                  <TouchableOpacity
                    key={num}
                    style={s.savedCard}
                    onPress={() => router.push(`/surah/${num}`)}
                    activeOpacity={0.85}
                  >
                    <View style={s.savedCardHeader}>
                      <Text style={s.savedCardArabic}>{meta.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeSavedSurah(num)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="bookmark" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={s.savedCardName}>{meta.englishName}</Text>
                    <Text style={s.savedCardCount}>{meta.ayahCount} ayahs</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>All Surahs by Juz</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : (
            juzGroups.map(group => (
              <View key={group.juz}>
                <View style={s.juzDivider}>
                  <Text style={s.juzLabel}>Juz {group.juz}</Text>
                </View>
                {group.surahs.map(surah => (
                  <TouchableOpacity
                    key={surah.number}
                    style={s.surahRow}
                    onPress={() => router.push(`/surah/${surah.number}`)}
                    activeOpacity={0.7}
                  >
                    <View style={s.surahNumber}>
                      <Text style={s.surahNumberText}>{surah.number}</Text>
                    </View>
                    <View style={s.surahInfo}>
                      <Text style={s.surahName}>{surah.englishName}</Text>
                      <Text style={s.surahMeta}>{surah.numberOfAyahs} ayahs • {surah.revelationType}</Text>
                    </View>
                    <Text style={s.surahArabic}>{surah.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <GoalModal
        visible={goalModalVisible}
        currentGoal={goal}
        onSave={setGoal}
        onClose={() => setGoalModalVisible(false)}
        colors={colors}
      />
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { paddingBottom: 20, paddingHorizontal: 16 },
    greeting: { fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginBottom: 2 },
    heroTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold", marginBottom: 16 },
    resumeCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },
    resumeLeft: { flex: 1 },
    resumeLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    resumeSurah: { fontSize: 17, color: "#FFFFFF", fontWeight: "700", fontFamily: "Inter_700Bold" },
    resumeAyah: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", marginTop: 2 },
    resumeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    onlineBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4CAF50" },
    onlineText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    goalCard: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalSetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    goalIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    goalSetInfo: { flex: 1 },
    goalSetTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    goalSetSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    goalProgress: {},
    goalProgressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    goalProgressTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    goalProgressSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    progressTrack: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    progressBar: { height: "100%", borderRadius: 3 },
    kahfBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
    kahfText: { fontSize: 12, color: colors.accent, fontFamily: "Inter_400Regular" },
    quizCtaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quizCtaLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    quizCtaIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    quizCtaTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    quizCtaSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    section: { marginTop: 8 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    seeAll: { fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    horizList: { paddingHorizontal: 16, gap: 10 },
    recentCard: { width: 120, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
    recentArabic: { fontSize: 18, color: colors.primary, marginBottom: 4 },
    recentName: { fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    recentAyah: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    recentPlayIcon: { marginTop: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    savedCard: { width: 130, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
    savedCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    savedCardArabic: { fontSize: 18, color: colors.primary },
    savedCardName: { fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    savedCardCount: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    juzDivider: { backgroundColor: colors.muted, paddingHorizontal: 16, paddingVertical: 6 },
    juzLabel: { fontSize: 11, fontWeight: "700", color: colors.accent, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
    surahRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    surahNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", marginRight: 12 },
    surahNumberText: { fontSize: 12, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    surahMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    surahArabic: { fontSize: 20, color: colors.primary },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
    modalSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24 },
    goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 24 },
    goalOption: { width: 90, height: 80, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
    goalOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    goalOptionNum: { fontSize: 24, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    goalOptionNumActive: { color: colors.primaryForeground },
    goalOptionLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    goalOptionLabelActive: { color: "rgba(255,255,255,0.8)" },
    modalActions: { flexDirection: "row", gap: 12 },
    clearBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    clearBtnText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    saveBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary },
    saveBtnText: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
  });
