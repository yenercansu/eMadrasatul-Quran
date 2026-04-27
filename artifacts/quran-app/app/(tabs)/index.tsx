import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  ImageBackground,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran, type Goal, getAyahAtLinearIndex } from "@/contexts/QuranContext";
import { fetchSurahs, type ApiSurah } from "@/services/quranApi";
import { SURAH_DATA } from "@/constants/surahData";

const TOTAL_AYAHS = 6236;
const QURAN_COVER = require("@/assets/images/quran-cover.jpg");

type GoalStep = "count" | "surah" | "ayah";

function GoalModal({
  visible,
  currentGoal,
  onSave,
  onClose,
}: {
  visible: boolean;
  currentGoal: Goal | null;
  onSave: (goal: Goal | null) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<GoalStep>("count");
  const [ayahsPerDay, setAyahsPerDay] = useState(currentGoal?.ayahsPerDay ?? 10);
  const [selectedSurah, setSelectedSurah] = useState<typeof SURAH_DATA[0] | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number>(1);
  const MAX_AYAHS = Math.floor(TOTAL_AYAHS / 3);
  const options = [5, 10, 20, 50, 100, 200, 300, 500, MAX_AYAHS];

  const daysToComplete = Math.ceil(TOTAL_AYAHS / ayahsPerDay);
  const monthsToComplete = (daysToComplete / 30).toFixed(1);

  useEffect(() => {
    if (visible) {
      setStep("count");
      setAyahsPerDay(currentGoal?.ayahsPerDay ?? 10);
      setSelectedSurah(null);
      setSelectedAyah(1);
    }
  }, [visible]);

  const handleSaveGoal = () => {
    onSave({
      ayahsPerDay,
      startDate: new Date().toISOString().split("T")[0],
      startSurahNumber: selectedSurah?.number,
      startAyahNumber: selectedSurah ? selectedAyah : undefined,
    });
    onClose();
  };

  const ayahsInSelectedSurah = selectedSurah
    ? Array.from({ length: selectedSurah.ayahCount }, (_, i) => i + 1)
    : [];

  const renderStepCount = () => (
    <>
      <View style={gStyles.handle} />
      <Text style={gStyles.title}>Daily Reading Goal</Text>
      <Text style={gStyles.sub}>Choose how many ayahs you want to read each day</Text>

      <Text style={gStyles.sectionLabel}>AYAHS PER DAY</Text>
      <View style={gStyles.grid}>
        {options.map(n => {
          const active = ayahsPerDay === n;
          const days = Math.ceil(TOTAL_AYAHS / n);
          const proj = days < 30 ? `~${days}d` : `~${(days / 30).toFixed(0)}mo`;
          return (
            <TouchableOpacity
              key={n}
              style={[gStyles.tile, active && gStyles.tileActive]}
              onPress={() => setAyahsPerDay(n)}
              activeOpacity={0.8}
            >
              <Text style={[gStyles.tileNum, active && gStyles.tileNumActive]}>{n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}</Text>
              <Text style={[gStyles.tileUnit, active && gStyles.tileUnitActive]}>
                ayahs/day
              </Text>
              <Text style={[gStyles.tileProjection, active && gStyles.tileProjectionActive]}>
                {proj}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={gStyles.projectionCard}>
        <View style={gStyles.projectionIcon}>
          <Ionicons name="book-outline" size={16} color="#1A1A1A" />
        </View>
        <View style={gStyles.projectionInfo}>
          <Text style={gStyles.projectionMain}>
            At <Text style={gStyles.projectionBold}>{ayahsPerDay} ayahs/day</Text>
          </Text>
          <Text style={gStyles.projectionSub}>
            Finish the Quran in{" "}
            <Text style={gStyles.projectionBold}>
              {daysToComplete < 30 ? `${daysToComplete} days` : `${(daysToComplete / 30).toFixed(0)} months`}
            </Text>
          </Text>
        </View>
      </View>

      <View style={gStyles.actions}>
        {currentGoal && (
          <TouchableOpacity
            style={gStyles.clearBtn}
            onPress={() => { onSave(null); onClose(); }}
            activeOpacity={0.8}
          >
            <Text style={gStyles.clearBtnText}>Clear Goal</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={gStyles.saveBtn}
          onPress={() => setStep("surah")}
          activeOpacity={0.85}
        >
          <Text style={gStyles.saveBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStepSurah = () => (
    <>
      <View style={gStyles.handle} />
      <View style={gStyles.stepHeader}>
        <TouchableOpacity onPress={() => setStep("count")} style={gStyles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={gStyles.stepHeaderCenter}>
          <Text style={gStyles.title}>Select Starting Surah</Text>
          <Text style={gStyles.sub}>Where should your daily reading begin?</Text>
        </View>
      </View>
      <FlatList
        data={SURAH_DATA}
        keyExtractor={item => String(item.number)}
        style={gStyles.pickerList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[gStyles.pickerRow, selectedSurah?.number === item.number && gStyles.pickerRowActive]}
            onPress={() => { setSelectedSurah(item); setSelectedAyah(1); setStep("ayah"); }}
            activeOpacity={0.8}
          >
            <View style={[gStyles.pickerNum, selectedSurah?.number === item.number && gStyles.pickerNumActive]}>
              <Text style={[gStyles.pickerNumText, selectedSurah?.number === item.number && gStyles.pickerNumTextActive]}>
                {item.number}
              </Text>
            </View>
            <View style={gStyles.pickerInfo}>
              <Text style={gStyles.pickerArabic}>{item.name}</Text>
              <Text style={gStyles.pickerEnglish}>{item.englishName} · {item.ayahCount} ayahs</Text>
            </View>
            {selectedSurah?.number === item.number && (
              <Feather name="check" size={18} color="#1A1A1A" />
            )}
          </TouchableOpacity>
        )}
      />
    </>
  );

  const renderStepAyah = () => (
    <>
      <View style={gStyles.handle} />
      <View style={gStyles.stepHeader}>
        <TouchableOpacity onPress={() => setStep("surah")} style={gStyles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={gStyles.stepHeaderCenter}>
          <Text style={gStyles.title}>Select Starting Ayah</Text>
          <Text style={gStyles.sub}>{selectedSurah?.englishName} · Choose your first ayah</Text>
        </View>
      </View>
      <FlatList
        data={ayahsInSelectedSurah}
        keyExtractor={item => String(item)}
        style={gStyles.pickerList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[gStyles.pickerRow, selectedAyah === item && gStyles.pickerRowActive]}
            onPress={() => setSelectedAyah(item)}
            activeOpacity={0.8}
          >
            <View style={[gStyles.pickerNum, selectedAyah === item && gStyles.pickerNumActive]}>
              <Text style={[gStyles.pickerNumText, selectedAyah === item && gStyles.pickerNumTextActive]}>
                {item}
              </Text>
            </View>
            <Text style={gStyles.pickerAyahLabel}>Ayah {item}</Text>
            {selectedAyah === item && (
              <Feather name="check" size={18} color="#1A1A1A" />
            )}
          </TouchableOpacity>
        )}
      />
      <View style={[gStyles.actions, { paddingHorizontal: 0, paddingTop: 12 }]}>
        <TouchableOpacity style={gStyles.saveBtn} onPress={handleSaveGoal} activeOpacity={0.85}>
          <Text style={gStyles.saveBtnText}>Save Goal</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={gStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[gStyles.sheet, step !== "count" && gStyles.sheetTall]}>
              {step === "count" ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {renderStepCount()}
                </ScrollView>
              ) : step === "surah" ? renderStepSurah() : renderStepAyah()}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const gStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 48,
    maxHeight: "85%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 13, color: "#9A9A9A", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 24 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A9A9A",
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  tile: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tileActive: { backgroundColor: "#1A1A1A" },
  tileNum: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  tileNumActive: { color: "#FFFFFF" },
  tileUnit: { fontSize: 10, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 2 },
  tileUnitActive: { color: "rgba(255,255,255,0.65)" },
  tileProjection: { fontSize: 11, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold", marginTop: 4 },
  tileProjectionActive: { color: "rgba(255,255,255,0.8)" },
  projectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  projectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  projectionInfo: { flex: 1 },
  projectionMain: { fontSize: 13, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
  projectionSub: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_400Regular", marginTop: 2 },
  projectionBold: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  sheetTall: { height: "82%", paddingBottom: 24 },
  stepHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  backBtn: { padding: 4, marginTop: 2 },
  stepHeaderCenter: { flex: 1 },
  pickerList: { flex: 1, marginHorizontal: -20, paddingHorizontal: 20 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pickerRowActive: { backgroundColor: "#F8F8F8", borderRadius: 12, borderBottomColor: "transparent" },
  pickerNum: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerNumActive: { backgroundColor: "#1A1A1A" },
  pickerNumText: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  pickerNumTextActive: { color: "#FFFFFF" },
  pickerInfo: { flex: 1 },
  pickerArabic: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", fontFamily: "Inter_700Bold" },
  pickerEnglish: { fontSize: 12, color: "#9A9A9A", fontFamily: "Inter_400Regular", marginTop: 1 },
  pickerAyahLabel: { flex: 1, fontSize: 15, color: "#1A1A1A", fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  clearBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  clearBtnText: { fontSize: 15, color: "#6B6B6B", fontFamily: "Inter_400Regular" },
  saveBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: "#1A1A1A" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
});

function CalendarView({ dailyEntries, goal }: { dailyEntries: { date: string; ayahsRead: number }[]; goal: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("default", { month: "long" });
  const completedDates = new Set(
    dailyEntries.filter(e => e.ayahsRead >= goal).map(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={calStyles.cal}>
      <Text style={calStyles.monthName}>{monthName}</Text>
      <View style={calStyles.dayNamesRow}>
        {dayNames.map((d, i) => <Text key={i} style={calStyles.dayName}>{d}</Text>)}
      </View>
      <View style={calStyles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={calStyles.cell} />;
          const key = `${year}-${month}-${day}`;
          const done = completedDates.has(key);
          const isToday = day === today;
          return (
            <View key={i} style={[calStyles.cell, done && calStyles.cellDone, isToday && calStyles.cellToday]}>
              <Text style={[calStyles.dayNum, done && calStyles.dayNumDone, isToday && !done && calStyles.dayNumToday]}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  cal: { marginTop: 12 },
  monthName: { fontSize: 12, fontWeight: "700", color: "#AAAAAA", fontFamily: "Inter_700Bold", marginBottom: 10, letterSpacing: 0.5 },
  dayNamesRow: { flexDirection: "row", marginBottom: 6 },
  dayName: { flex: 1, textAlign: "center", fontSize: 11, color: "#AAAAAA", fontFamily: "Inter_400Regular" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellDone: { backgroundColor: "#22C55E", borderRadius: 20 },
  cellToday: { borderWidth: 1.5, borderColor: "#1A1A1A", borderRadius: 20 },
  dayNum: { fontSize: 13, color: "#1A1A1A", fontFamily: "Inter_400Regular" },
  dayNumDone: { color: "#FFFFFF", fontWeight: "700", fontFamily: "Inter_700Bold" },
  dayNumToday: { fontWeight: "700", fontFamily: "Inter_700Bold" },
});

export default function HomeScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const {
    recentProgress, lastListened, goal, setGoal, todayEntry, dailyEntries, onlineUsers, savedWords,
    savedSurahs, removeSavedSurah, quranPosition, getTodayGoalAyahs, getTodayGoalProgress,
  } = useQuran();
  const [surahs, setSurahs] = useState<ApiSurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

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
  const todayGoalProgress = goal ? getTodayGoalProgress() : 0;
  const goalMet = goal ? todayGoalProgress >= goal.ayahsPerDay : false;
  const isFriday = new Date().getDay() === 5;

  const goalAyahs = useMemo(() => {
    if (!goal) return [];
    return getTodayGoalAyahs();
  }, [goal, getTodayGoalAyahs]);

  const groupedGoalAyahs = useMemo(() => {
    const groups: { surahNumber: number; surahName: string; ayahs: number[] }[] = [];
    for (const a of goalAyahs) {
      const last = groups[groups.length - 1];
      if (last && last.surahNumber === a.surahNumber) {
        last.ayahs.push(a.ayahNumber);
      } else {
        groups.push({ surahNumber: a.surahNumber, surahName: a.surahName, ayahs: [a.ayahNumber] });
      }
    }
    return groups;
  }, [goalAyahs]);

  const juzGroups = useMemo(() => {
    if (surahs.length === 0) return [];
    const groups: { juz: number; surahs: ApiSurah[] }[] = [];
    let currentJuz = 0;
    for (const s of surahs) {
      const meta = SURAH_DATA[s.number - 1];
      if (!meta) continue;
      if (meta.juz !== currentJuz) {
        currentJuz = meta.juz;
        groups.push({ juz: currentJuz, surahs: [] });
      }
      groups[groups.length - 1].surahs.push(s);
    }
    return groups;
  }, [surahs]);

  const topPad = insets.top;

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
            tintColor="#FFFFFF"
          />
        }
      >
        <ImageBackground
          source={QURAN_COVER}
          style={[s.hero, { paddingTop: topPad + 12 }]}
          imageStyle={s.heroImage}
          resizeMode="cover"
        >
          <View style={s.heroOverlay}>
            <View style={s.heroTopRow}>
              <View>
                <Text style={s.greeting}>السلام عليكم</Text>
              </View>
              <TouchableOpacity
                style={s.settingsBtn}
                onPress={() => router.push("/settings")}
                activeOpacity={0.75}
              >
                <Feather name="settings" size={20} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>

            {lastListened && (
              <TouchableOpacity
                style={s.resumeCard}
                onPress={() => router.push(`/surah/${lastListened.surahNumber}?ayah=${lastListened.ayahNumberInSurah}`)}
                activeOpacity={0.85}
              >
                <View style={s.resumeLeft}>
                  <Text style={s.resumeLabel}>CONTINUE READING</Text>
                  <Text style={s.resumeSurah}>{lastListened.surahName}</Text>
                  <Text style={s.resumeAyah}>Ayah {lastListened.ayahNumberInSurah}</Text>
                </View>
                <View style={s.resumeIcon}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>

        <TouchableOpacity style={s.onlineCard} activeOpacity={0.85} onPress={() => Linking.openURL("https://www.youtube.com/@QuranWeekly/streams")}>
          <View style={s.onlineCardLeft}>
            <View style={s.onlineIconCircle}>
              <Ionicons name="people" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={s.onlineCardTitle}>{onlineUsers.toLocaleString()} reading right now</Text>
              <Text style={s.onlineCardSub}>Live — Join the community</Text>
            </View>
          </View>
          <View style={s.onlineLiveDot} />
        </TouchableOpacity>

        {/* Today's Progress Card */}
        <View style={s.goalCard}>
          {!goal ? (
            <TouchableOpacity style={s.goalSetRow} onPress={() => setGoalModalVisible(true)} activeOpacity={0.85}>
              <View style={s.goalIconCircle}>
                <Ionicons name="flag" size={18} color="#FFFFFF" />
              </View>
              <View style={s.goalSetInfo}>
                <Text style={s.goalSetTitle}>Set a Daily Goal</Text>
                <Text style={s.goalSetSub}>Stay consistent — track your daily reading</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <View>
              <View style={s.progressCardHeader}>
                <View style={s.progressTitleCol}>
                  <Text style={s.progressTitle}>Today's Progress</Text>
                  <Text style={s.progressCount}>{todayGoalProgress}/{goal.ayahsPerDay}</Text>
                </View>
                <View style={s.progressHeaderRight}>
                  <TouchableOpacity
                    onPress={() => setCalendarVisible(v => !v)}
                    style={[s.calIconBtn, calendarVisible && s.calIconBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Feather name="calendar" size={16} color={calendarVisible ? "#FFFFFF" : "#1A1A1A"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setGoalModalVisible(true)} activeOpacity={0.7} style={s.kebabBtn}>
                    <View style={s.kebabDot} />
                    <View style={s.kebabDot} />
                    <View style={s.kebabDot} />
                  </TouchableOpacity>
                </View>
              </View>

              {calendarVisible ? (
                <CalendarView dailyEntries={dailyEntries} goal={goal.ayahsPerDay} />
              ) : (
                <>
                  {(() => {
                    const DASH_CAP = 60;
                    const displayCount = Math.min(goal.ayahsPerDay, DASH_CAP);
                    const filledCount = Math.min(
                      Math.round(todayGoalProgress / goal.ayahsPerDay * displayCount),
                      displayCount
                    );
                    return (
                      <View style={s.dashRow}>
                        {Array.from({ length: displayCount }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              s.dash,
                              i < filledCount && (goalMet ? s.dashFilledGreen : s.dashFilled),
                            ]}
                          />
                        ))}
                      </View>
                    );
                  })()}

                  {goalMet ? (
                    <Text style={s.doneText}>Allahumma Barik! Done for today</Text>
                  ) : (
                    groupedGoalAyahs.length > 0 && (
                      <View style={s.remainingSection}>
                        <View style={s.remainingHeader}>
                          <Text style={s.remainingLabel}>Today's Remaining Ayahs</Text>
                          <Text style={s.remainingCount}>showing {Math.min(groupedGoalAyahs.length, 2)}/{groupedGoalAyahs.length}</Text>
                        </View>
                        {groupedGoalAyahs.slice(0, 2).map((group, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[s.remainingRow, i === Math.min(groupedGoalAyahs.length, 2) - 1 && { borderBottomWidth: 0 }]}
                            onPress={() => router.push(`/surah/${group.surahNumber}?ayah=${group.ayahs[0]}`)}
                            activeOpacity={0.8}
                          >
                            <Text style={s.remainingName}>{group.surahName}</Text>
                            <Feather name="chevron-right" size={16} color="#AAAAAA" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )
                  )}

                  {isFriday && (
                    <View style={s.kahfBadge}>
                      <Ionicons name={todayEntry?.kahfCompleted ? "checkmark-circle" : "book-outline"} size={14} color={todayEntry?.kahfCompleted ? "#1A1A1A" : colors.mutedForeground} />
                      <Text style={s.kahfText}>
                        {todayEntry?.kahfCompleted ? "Al-Kahf completed this Friday" : "Read Al-Kahf today (Friday Sunnah)"}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={s.quizCtaCard}
          onPress={() => router.push("/(tabs)/library")}
          activeOpacity={0.85}
        >
          <View style={s.quizCtaLeft}>
            <View style={s.quizCtaIcon}>
              <Ionicons name="game-controller" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={s.quizCtaTitle}>Test Yourself!</Text>
              <Text style={s.quizCtaSub}>
                {savedWords.length === 0 ? "Save words while reading to start" : `${savedWords.length} words ready`}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
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
                    <Ionicons name="play" size={10} color="#FFFFFF" />
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
                      <TouchableOpacity onPress={() => removeSavedSurah(num)} activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="bookmark" size={14} color={colors.primary} />
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
      />
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { minHeight: 300 },
    heroImage: { opacity: 0.85 },
    heroOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.48)",
      paddingHorizontal: 16,
      paddingBottom: 28,
      justifyContent: "space-between",
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    greeting: {
      fontSize: 22,
      color: "#FFFFFF",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      letterSpacing: 1,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    settingsBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    resumeCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    resumeLeft: { flex: 1 },
    resumeLabel: { fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    resumeSurah: { fontSize: 16, color: "#FFFFFF", fontWeight: "700", fontFamily: "Inter_700Bold" },
    resumeAyah: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
    resumeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
    onlineCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 2,
      backgroundColor: "#4F46E5",
      borderRadius: 16,
      padding: 14,
    },
    onlineCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    onlineIconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
    onlineCardTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    onlineCardSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },
    onlineLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#86EFAC" },
    goalCard: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalSetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    goalIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
    goalSetInfo: { flex: 1 },
    goalSetTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    goalSetSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    goalProgressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    goalProgressTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    goalProgressSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    progressTrack: { height: 5, backgroundColor: "#F0F0F0", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
    progressBar: { height: "100%", borderRadius: 3, backgroundColor: "#1A1A1A" },
    progressDecoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    progressDecoItem: { alignItems: "center", gap: 4 },
    progressDecoIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: "#F0F0F0",
      alignItems: "center", justifyContent: "center",
    },
    progressDecoIconDone: { backgroundColor: "#1A1A1A" },
    progressDecoLabel: { fontSize: 10, color: "#B0B0B0", fontFamily: "Inter_400Regular" },
    progressDecoLabelDone: { color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    accomplishmentSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    accomplishmentLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
    },
    accomplishmentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 7,
    },
    accomplishmentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1A1A1A" },
    accomplishmentText: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    progressCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
    progressTitleCol: { flexDirection: "column", gap: 2 },
    progressTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    progressCount: { fontSize: 13, color: "#9A9A9A", fontFamily: "Inter_400Regular" },
    progressHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    calIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    calIconBtnActive: { backgroundColor: "#1A1A1A" },
    kebabBtn: { width: 24, height: 30, alignItems: "center", justifyContent: "center", gap: 3 },
    kebabDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#9A9A9A" },
    dashRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
    dash: { height: 5, width: 12, borderRadius: 3, backgroundColor: "#E8E8E8" },
    dashFilled: { backgroundColor: "#1A1A1A" },
    dashFilledGreen: { backgroundColor: "#22C55E" },
    doneText: { fontSize: 14, fontWeight: "600", color: "#166534", fontFamily: "Inter_600SemiBold", textAlign: "center", backgroundColor: "#F0FFF4", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
    remainingSection: { marginTop: 4 },
    remainingHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 },
    remainingLabel: { fontSize: 11, fontWeight: "700", color: "#AAAAAA", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
    remainingCount: { fontSize: 11, color: "#CCCCCC", fontFamily: "Inter_400Regular" },
    remainingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
    remainingName: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", fontFamily: "Inter_600SemiBold" },
    kahfBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
    kahfText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    quizCtaCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: "#1A1A1A",
      borderRadius: 16,
      padding: 14,
    },
    quizCtaLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    quizCtaIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
    quizCtaTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    quizCtaSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", marginTop: 2 },
    section: { marginTop: 8 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    seeAll: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    horizList: { paddingHorizontal: 16, gap: 10 },
    recentCard: { width: 120, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
    recentArabic: { fontSize: 18, color: colors.foreground, marginBottom: 4 },
    recentName: { fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    recentAyah: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    recentPlayIcon: { marginTop: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
    savedCard: { width: 130, backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
    savedCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    savedCardArabic: { fontSize: 18, color: colors.foreground },
    savedCardName: { fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    savedCardCount: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    juzDivider: { backgroundColor: "#F0F0F0", paddingHorizontal: 16, paddingVertical: 6 },
    juzLabel: { fontSize: 11, fontWeight: "700", color: "#9A9A9A", letterSpacing: 1, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
    surahRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    surahNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center", marginRight: 12 },
    surahNumberText: { fontSize: 12, fontWeight: "600", color: "#6B6B6B", fontFamily: "Inter_600SemiBold" },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    surahMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    surahArabic: { fontSize: 20, color: colors.foreground },
  });
