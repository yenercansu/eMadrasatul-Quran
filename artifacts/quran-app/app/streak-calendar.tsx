import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuran } from "@/contexts/QuranContext";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/BackButton";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CalendarCell =
  | null
  | { day: number; dateStr: string; completed: boolean; milestoneCompleted: boolean; isToday: boolean; isFuture: boolean };

export default function StreakCalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dailyEntries } = useQuran();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const completedDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of dailyEntries) {
      if (e.ayahsRead > 0 || e.kahfCompleted || e.quizCompleted || e.milestoneCompleted) set.add(e.date);
    }
    return set;
  }, [dailyEntries]);

  const milestoneDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of dailyEntries) {
      if (e.milestoneCompleted) set.add(e.date);
    }
    return set;
  }, [dailyEntries]);

  const todayStr = useMemo(() => now.toISOString().split("T")[0], []);

  const { cells, weeks } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDow = firstDay.getDay(); // 0 = Sunday

    const flatCells: CalendarCell[] = [];
    for (let i = 0; i < startDow; i++) flatCells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const dateStr = d.toISOString().split("T")[0];
      flatCells.push({
        day,
        dateStr,
        completed: completedDays.has(dateStr),
        milestoneCompleted: milestoneDays.has(dateStr),
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Pad last row to 7
    while (flatCells.length % 7 !== 0) flatCells.push(null);

    const rows: CalendarCell[][] = [];
    for (let i = 0; i < flatCells.length; i += 7) {
      rows.push(flatCells.slice(i, i + 7));
    }

    return { cells: flatCells, weeks: rows };
  }, [viewYear, viewMonth, completedDays, milestoneDays, todayStr]);

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const completedCount = useMemo(() => {
    return cells.filter(c => c && c.completed && !c.isFuture).length;
  }, [cells]);

  const milestoneCount = useMemo(() => {
    return cells.filter(c => c && c.milestoneCompleted && !c.isFuture).length;
  }, [cells]);

  const totalPast = useMemo(() => {
    return cells.filter(c => c && !c.isFuture).length;
  }, [cells]);

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={colors.appText === "#1A1A1A" ? "dark-content" : "light-content"} />

      {/* Header */}
      <View style={s.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={s.headerTitle}>Streak Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month navigation */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={goToPrev} style={s.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={colors.appText} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={goToNext} style={s.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-right" size={20} color={colors.appText} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryChip}>
          <View style={[s.summaryDot, { backgroundColor: "#1A1A1A" }]} />
          <Text style={s.summaryText}>{completedCount} days memorized</Text>
        </View>
        <View style={s.summaryChip}>
          <View style={[s.summaryDot, { backgroundColor: colors.appLightGray, borderWidth: 1, borderColor: colors.appBorderLight }]} />
          <Text style={s.summaryText}>{totalPast - completedCount} days missed</Text>
        </View>
        <View style={s.summaryChip}>
          <View style={[s.summaryDot, { backgroundColor: "#B7791F" }]} />
          <Text style={s.summaryText}>{milestoneCount} milestones</Text>
        </View>
      </View>

      {/* Day-of-week headers */}
      <View style={s.dayHeaders}>
        {WEEK_DAYS.map((d, i) => (
          <View key={i} style={s.dayHeaderCell}>
            <Text style={s.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={s.calendarGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={s.weekRow}>
            {week.map((cell, ci) => (
              <View key={ci} style={s.dayCell}>
                {cell ? (
                  <View style={[
                    s.dayCircle,
                    cell.completed && s.dayCircleCompleted,
                    !cell.completed && !cell.isFuture && s.dayCircleMissed,
                    cell.milestoneCompleted && s.dayCircleMilestone,
                    cell.isFuture && s.dayCircleFuture,
                    cell.isToday && s.dayCircleToday,
                  ]}>
                    <Text style={[
                      s.dayNum,
                      cell.milestoneCompleted && s.dayNumMilestone,
                      cell.completed && s.dayNumCompleted,
                      !cell.completed && !cell.isFuture && s.dayNumMissed,
                      cell.isFuture && s.dayNumFuture,
                      cell.isToday && !cell.completed && s.dayNumToday,
                    ]}>
                      {cell.day}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#1A1A1A" }]} />
          <Text style={s.legendText}>Active day</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: colors.appLightGray, borderWidth: 1, borderColor: colors.appBorderLight }]} />
          <Text style={s.legendText}>Missed day</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#B7791F" }]} />
          <Text style={s.legendText}>Milestone complete day (Surah or Juz completion)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import("@/hooks/useColors").useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.appBackground,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.appBorderLight,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.appLightGray,
      alignItems: "center",
      justifyContent: "center",
    },
    monthLabel: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    summaryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.appLightGray,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    summaryText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.appTextMuted,
      fontFamily: "Inter_600SemiBold",
    },
    dayHeaders: {
      flexDirection: "row",
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    dayHeaderCell: {
      flex: 1,
      alignItems: "center",
    },
    dayHeaderText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.appLightText,
      fontFamily: "Inter_700Bold",
    },
    calendarGrid: {
      paddingHorizontal: 16,
      gap: 6,
    },
    weekRow: {
      flexDirection: "row",
    },
    dayCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 3,
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    dayCircleCompleted: {
      backgroundColor: "#1A1A1A",
    },
    dayCircleMilestone: {
      backgroundColor: "#B7791F",
    },
    dayCircleMissed: {
      backgroundColor: colors.appLightGray,
    },
    dayCircleFuture: {
      backgroundColor: "transparent",
    },
    dayCircleToday: {
      borderWidth: 2,
      borderColor: colors.appGold,
    },
    dayNum: {
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    dayNumCompleted: {
      color: "#FFFFFF",
    },
    dayNumMilestone: {
      color: "#FFFFFF",
    },
    dayNumMissed: {
      color: colors.appLightText,
    },
    dayNumFuture: {
      color: colors.appBorderLight,
    },
    dayNumToday: {
      color: colors.appGold,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
    },
    legend: {
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 10,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    legendText: {
      fontSize: 13,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
  });
