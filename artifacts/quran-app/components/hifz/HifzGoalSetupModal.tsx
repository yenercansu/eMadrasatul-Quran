import React, { useEffect, useState } from "react";
import { BackHandler, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HifzSegmentedControl } from "@/components/hifz/HifzUI";
import { ActionPill } from "@/components/ActionPill";
import { JUZ_STARTS, SURAH_DATA } from "@/constants/surahData";
import { VerseCard } from "@/components/VerseCard";
import { BackButton } from "@/components/BackButton";
import { IconButton } from "@/components/DesignSystem";
import { useColors } from "@/hooks/useColors";

export type HifzSetupMode = "surah" | "juz" | "pace";
export type PaceRhythm = "gentle" | "steady" | "deep";

const rhythmOptions: Array<{
  value: PaceRhythm;
  title: string;
  subtitle: string;
  days: number;
  targetDays: number;
}> = [
  { value: "gentle", title: "Gentle rhythm", subtitle: "A quiet weekly habit. Light but steady.", days: 1, targetDays: 4 },
  { value: "steady", title: "Steady consistency", subtitle: "No surah load or weekly frequency increases.", days: 3, targetDays: 3 },
  { value: "deep", title: "Deep commitment", subtitle: "Focused daily effort for a stronger pace.", days: 5, targetDays: 6 },
];

export function HifzGoalSetupModal({
  visible,
  onClose,
  onSelectSurah,
  onSelectJuz,
  onSelectPace,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectSurah: (surahNumber: number) => void;
  onSelectJuz: (juz: number) => void;
  onSelectPace: (options: { rhythm: PaceRhythm; daysPerWeek: number; targetDaysPerWeek: number }) => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const m = styles(colors);
  const [mode, setMode] = useState<HifzSetupMode>("surah");
  const [rhythm, setRhythm] = useState<PaceRhythm>("gentle");
  const [picker, setPicker] = useState<null | "surah" | "juz">(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(1);
  const [selectedJuz, setSelectedJuz] = useState(1);
  const selectedRhythm = rhythmOptions.find((option) => option.value === rhythm) ?? rhythmOptions[0];
  const selectedSurah = SURAH_DATA[selectedSurahNumber - 1] ?? SURAH_DATA[0];
  const selectedJuzStart = JUZ_STARTS[selectedJuz - 1] ?? JUZ_STARTS[0];

  // Android back button handling (Modal handled this automatically before)
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (picker) { setPicker(null); return true; }
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, picker, onClose]);

  const handleContinue = () => {
    if (mode === "surah") onSelectSurah(selectedSurah.number);
    else if (mode === "juz") onSelectJuz(selectedJuz);
    else {
      onSelectPace({
        rhythm,
        daysPerWeek: selectedRhythm.days,
        targetDaysPerWeek: selectedRhythm.targetDays,
      });
    }
  };

  // Render nothing when not visible — no native Modal queuing, so the pace
  // AyahRangeModal (a real Modal) can appear instantly on top without a gap.
  if (!visible) return null;

  const pickerContent = () => {
    if (!picker) return null;
    const query = pickerSearch.trim().toLowerCase();
    const data = picker === "surah"
      ? SURAH_DATA.filter((surah) => {
          if (!query) return true;
          return (
            surah.englishName.toLowerCase().includes(query) ||
            surah.name.includes(query) ||
            String(surah.number).includes(query)
          );
        })
      : JUZ_STARTS.map((juz) => ({ juz: juz.juz, startsAt: juz })).filter((group) => {
          if (!query) return true;
          const startSurah = SURAH_DATA[(group.startsAt?.surah ?? 1) - 1];
          return (
            String(group.juz).includes(query) ||
            startSurah?.englishName.toLowerCase().includes(query)
          );
        });

    return (
      <View style={[StyleSheet.absoluteFill, m.screen, { paddingTop: insets.top }]}>
        <View style={[m.pickerHeader, { paddingTop: 14 }]}>
          <BackButton onPress={() => setPicker(null)} />
          <Text style={m.pickerTitle}>{picker === "surah" ? "Choose Surah" : "Choose Juz"}</Text>
          <IconButton icon="x" tone="plain" onPress={onClose} accessibilityLabel="Close" />
        </View>
        <View style={m.searchWrap}>
          <Feather name="search" size={15} color={colors.hifzLightMuted} />
          <TextInput
            style={m.searchInput}
            placeholder={picker === "surah" ? "Search surahs..." : "Search juz..."}
            placeholderTextColor={colors.hifzFaint}
            value={pickerSearch}
            onChangeText={setPickerSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <FlatList
          data={data as any[]}
          keyExtractor={(item) => picker === "surah" ? String(item.number) : String(item.juz)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={m.pickerList}
          renderItem={({ item }) => {
            if (picker === "surah") {
              const selected = item.number === selectedSurahNumber;
              return (
                <TouchableOpacity
                  style={m.pickerRow}
                  onPress={() => {
                    setSelectedSurahNumber(item.number);
                    setPickerSearch("");
                    setPicker(null);
                  }}
                  activeOpacity={0.65}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={m.pickerRowTitle}>{item.englishName}</Text>
                    <Text style={m.pickerRowSub}>{item.ayahCount} ayahs · Juz {item.juz}</Text>
                  </View>
                  <Text style={m.pickerArabic}>{item.name}</Text>
                  {selected ? <Feather name="check" size={18} color={colors.hifzAccent} /> : <Feather name="chevron-right" size={16} color={colors.hifzFaint} />}
                </TouchableOpacity>
              );
            }
            const startSurah = SURAH_DATA[(item.startsAt?.surah ?? 1) - 1];
            const selected = item.juz === selectedJuz;
            return (
              <TouchableOpacity
                style={m.pickerRow}
                onPress={() => {
                  setSelectedJuz(item.juz);
                  setPickerSearch("");
                  setPicker(null);
                }}
                activeOpacity={0.65}
              >
                <View style={{ flex: 1 }}>
                  <Text style={m.pickerRowTitle}>Juz {item.juz}</Text>
                  <Text style={m.pickerRowSub}>Opens at {startSurah?.englishName ?? "Al-Fatiha"}</Text>
                </View>
                {selected ? <Feather name="check" size={18} color={colors.hifzAccent} /> : <Feather name="chevron-right" size={16} color={colors.hifzFaint} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, m.screen, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 136 }}
      >
        {/* Close button */}
        <View style={m.topRow}>
          <View />
          <IconButton icon="x" tone="soft" onPress={onClose} accessibilityLabel="Close" />
        </View>

        {/* Title + mode switcher */}
        <View style={m.anchoredHeader}>
          <Text style={m.bismillah}>Bismillahirrahmanirrahim</Text>
          <Text style={m.title}>How would you like{"\n"}to begin?</Text>
          <Text style={m.subtitle}>
            {mode === "surah"
              ? "Choose your starting surah. Your surah sequence is fully customizable."
              : mode === "juz"
              ? "Choose your starting juz. Your juz sequence is fully customizable."
              : "This is your starting pace, not your final one. It will grow naturally."}
          </Text>
          <HifzSegmentedControl
            value={mode}
            options={[
              { value: "surah", label: "By Surah" },
              { value: "juz", label: "By Juz" },
              { value: "pace", label: "By Pace" },
            ]}
            onChange={setMode}
          />
          <Text style={m.switchNote}>You can always switch modes later.</Text>
        </View>

        <View style={m.content}>
          {mode === "pace" ? (
            <View style={m.rhythmStack}>
              {rhythmOptions.map((option) => {
                const selected = option.value === rhythm;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[m.rhythmCard, selected && m.rhythmCardSelected]}
                    onPress={() => setRhythm(option.value)}
                    activeOpacity={0.82}
                  >
                    <View style={[m.radio, selected && m.radioSelected]}>
                      {selected && <View style={m.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={m.rhythmTitle}>{option.title}</Text>
                      <Text style={[m.rhythmSub, selected && m.rhythmSubSelected]}>{option.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={m.daysRow}>
                <Text style={m.daysLabel}>~{selectedRhythm.days} day{selectedRhythm.days === 1 ? "" : "s"} each week</Text>
                <View style={m.weekDots}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => {
                    const active = index < selectedRhythm.days;
                    return (
                      <View key={`${day}-${index}`} style={[m.weekDot, active && m.weekDotActive]}>
                        <Text style={[m.weekDotText, active && m.weekDotTextActive]}>{day}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={m.paceNote}>
                  {rhythm === "steady"
                    ? "Your weekly frequency and memorization load will stay fixed."
                    : "Your starting pace — it will grow naturally over time."}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity style={m.startingCard} onPress={() => setPicker(mode)} activeOpacity={0.82}>
                <View style={{ flex: 1 }}>
                  <Text style={m.startingLabel}>{mode === "surah" ? "Your Starting Surah" : "Your Starting Juz"}</Text>
                  <Text style={m.startingTitle}>{mode === "surah" ? selectedSurah.englishName : `Juz ${selectedJuz}`}</Text>
                  <Text style={m.startingSub}>
                    {mode === "surah"
                      ? `${selectedSurah.ayahCount} ayahs · Juz ${selectedSurah.juz}`
                      : `${selectedJuz === 1 ? "Alif Lam Mim" : `Juz ${selectedJuz}`} · Opens at ${SURAH_DATA[(selectedJuzStart?.surah ?? 1) - 1]?.englishName ?? "Al-Fatiha"}`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={22} color={colors.hifzLightMuted} />
              </TouchableOpacity>

              {mode === "surah" ? (
                <View style={m.sequenceBlock}>
                  <Text style={m.sequenceText}>Al-Fatiha › Al-Baqara › Al-Imran › ... › An-Nas</Text>
                  <VerseCard
                    verse='"And We have certainly made the Quran easy for remembrance."'
                    reference="Al-Qamar 54:17"
                  />
                </View>
              ) : (
                <View style={m.juzBlock}>
                  <View style={m.juzDots}>
                    {Array.from({ length: 30 }).map((_, index) => (
                      <View key={index} style={[m.juzDot, index === selectedJuz - 1 && m.juzDotActive]} />
                    ))}
                  </View>
                  <Text style={m.juzText}>Juz {selectedJuz} of 30 · Starting point selected</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[m.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <ActionPill
          label={mode === "pace" ? "Continue with this pace →" : "Continue To Ayah Selection →"}
          onPress={handleContinue}
          variant="primary"
          size="lg"
        />
        <Text style={m.footerText}>To complete the Quran · Inshallah</Text>
      </View>

      {/* Picker overlay — rendered on top within the same View hierarchy */}
      {pickerContent()}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.hifzBackground },
  content: { paddingHorizontal: 28 },
  anchoredHeader: { paddingHorizontal: 28, paddingBottom: 4 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 16,
  },
  bismillah: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.hifzLightMuted,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 22,
  },
  switchNote: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  startingCard: {
    minHeight: 124,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.hifzBorder,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 22,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  startingLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.hifzLightMuted,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  startingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
  },
  startingSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.hifzLightMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  sequenceBlock: { marginTop: 38, gap: 18 },
  sequenceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: colors.hifzLightMuted,
    fontFamily: "Inter_400Regular",
  },
  juzBlock: { marginTop: 38 },
  juzDots: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 14 },
  juzDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.hifzBorder },
  juzDotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.hifzAccent, marginTop: -2 },
  juzText: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
  },
  rhythmStack: { gap: 12 },
  rhythmCard: {
    minHeight: 90,
    borderRadius: 18,
    backgroundColor: colors.hifzWarmBand,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rhythmCardSelected: { backgroundColor: colors.hifzHeroCard },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.hifzFaint,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.hifzAccent },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.hifzAccent },
  rhythmTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
  },
  rhythmSub: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.hifzLightMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  rhythmSubSelected: {
    color: colors.hifzMuted,
  },
  daysRow: { alignItems: "center", marginTop: 24 },
  daysLabel: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  weekDots: { flexDirection: "row", gap: 10, marginBottom: 12 },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.hifzWarmBand,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotActive: { backgroundColor: colors.hifzAccent },
  weekDotText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.hifzFaint,
    fontFamily: "Inter_700Bold",
  },
  weekDotTextActive: { color: colors.onAccent },
  paceNote: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  footerText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.hifzMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 14,
  },
  bottomCta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: colors.overlayChrome,
    borderTopWidth: 1,
    borderTopColor: colors.hifzBorder,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hifzBorder,
  },
  searchWrap: {
    minHeight: 42,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: colors.hifzWarmBand,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.hifzText,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  pickerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  pickerList: {
    paddingTop: 4,
    paddingBottom: 36,
  },
  pickerRow: {
    minHeight: 62,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hifzBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  pickerRowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.hifzText,
    fontFamily: "Inter_700Bold",
  },
  pickerRowSub: {
    fontSize: 12,
    color: colors.hifzLightMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  pickerArabic: {
    fontSize: 18,
    color: colors.hifzAccentMuted,
  },
});
