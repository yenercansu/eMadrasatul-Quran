import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { ActionPill } from "@/components/ActionPill";

interface Props {
  visible: boolean;
  word: string;
  translation: string;
  surahNumber: number;
  ayahNumber: number;
  audioUrl?: string;
  onClose: () => void;
  onCut?: () => void;
}

// Strips Arabic diacritics, returns first 3 root letters
function deriveRoot(word: string): string {
  const stripped = word.replace(/[ً-ٰٟۖ-ۭؐ-ؚ]/g, "").trim();
  const cleaned = stripped.replace(/^(ال|و|ف|ل|ب|ك)/u, "");
  const letters = [...cleaned].filter((c) => /[ء-ي]/u.test(c));
  return letters.slice(0, 3).join(" ");
}

export function WordModal({
  visible,
  word,
  translation,
  surahNumber,
  ayahNumber,
  audioUrl,
  onClose,
  onCut,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { saveWord, savedWords, isAyahMemorized, toggleAyahMemorized } = useQuran();

  const loopSoundRef = useRef<Audio.Sound | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const alreadySaved = savedWords.some(
    (w) => w.arabic === word && w.surahNumber === surahNumber,
  );
  const ayahMemorized = isAyahMemorized(surahNumber, ayahNumber);
  const root = deriveRoot(word);

  // Stop loop when popup closes
  useEffect(() => {
    if (!visible) {
      loopSoundRef.current?.stopAsync().then(() => loopSoundRef.current?.unloadAsync());
      loopSoundRef.current = null;
      setIsLooping(false);
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loopSoundRef.current?.stopAsync().then(() => loopSoundRef.current?.unloadAsync());
    };
  }, []);

  const handleListen = async () => {
    if (!audioUrl) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Stop any active loop first
      if (loopSoundRef.current) {
        await loopSoundRef.current.stopAsync();
        await loopSoundRef.current.unloadAsync();
        loopSoundRef.current = null;
        setIsLooping(false);
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      if (__DEV__) console.error("[WordModal] Listen failed", error);
    }
  };

  const handleLoop = async () => {
    if (!audioUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLooping) {
      await loopSoundRef.current?.stopAsync();
      await loopSoundRef.current?.unloadAsync();
      loopSoundRef.current = null;
      setIsLooping(false);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: true },
      );
      loopSoundRef.current = sound;
      setIsLooping(true);
    } catch (error) {
      if (__DEV__) console.error("[WordModal] Loop failed", error);
    }
  };

  const handleSaveWord = () => {
    if (!alreadySaved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveWord({
        arabic: word,
        translation,
        surahNumber,
        ayahNumber,
        highlighted: false,
      });
    }
  };

  const handlePracticePhrase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onCut?.();
  };

  const handleToggleAyahMemorized = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAyahMemorized(surahNumber, ayahNumber);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <TouchableOpacity style={s.closeTopBtn} onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={20} color={colors.appIconMuted} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                {/* Word + location */}
                <Text style={s.arabicWord}>{word}</Text>
                <Text style={s.location}>Surah {surahNumber} · Ayah {ayahNumber}</Text>

                {/* WORD TOOLS */}
                <Text style={s.groupLabel}>Word Tools</Text>
                <View style={s.iconRow}>
                  {audioUrl ? (
                    <TouchableOpacity style={s.iconBtn} onPress={handleListen} activeOpacity={0.7}>
                      <Feather name="volume-2" size={20} color={colors.appText} />
                      <Text style={s.iconLabel}>Listen</Text>
                    </TouchableOpacity>
                  ) : null}
                  {audioUrl ? (
                    <TouchableOpacity style={s.iconBtn} onPress={handleLoop} activeOpacity={0.7}>
                      <Ionicons name="repeat" size={20} color={isLooping ? colors.appSuccess : colors.appText} />
                      <Text style={[s.iconLabel, isLooping && s.iconLabelActive]}>
                        {isLooping ? "Stop" : "Loop"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={s.iconBtn} onPress={handleSaveWord} activeOpacity={0.7}>
                    <Feather
                      name={alreadySaved ? "check-circle" : "download"}
                      size={20}
                      color={alreadySaved ? colors.appSuccess : colors.appText}
                    />
                    <Text style={[s.iconLabel, alreadySaved && s.iconLabelSaved]}>
                      {alreadySaved ? "Saved" : "Save Word"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {/* Root */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Root</Text>
                  <Text style={s.rootText}>{root || "—"}</Text>
                </View>

                {/* Meaning */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Meaning</Text>
                  <Text style={s.meaningText}>
                    {translation || "Translation not available for this word."}
                  </Text>
                </View>

                <View style={s.divider} />

                {/* AYAH PRACTICE */}
                <Text style={s.groupLabel}>Ayah Practice</Text>
                <View style={s.section}>
                  <ActionPill
                    label="Practice Section"
                    icon="scissors"
                    variant="border"
                    size="md"
                    onPress={handlePracticePhrase}
                  />
                </View>
                <View style={s.section}>
                  <ActionPill
                    label={ayahMemorized ? "Ayah Memorized" : "Mark Ayah Memorized"}
                    icon={ayahMemorized ? "check-circle" : "circle"}
                    variant={ayahMemorized ? "primary" : "border"}
                    size="md"
                    onPress={handleToggleAyahMemorized}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ayahMemorized }}
                    accessibilityLabel={
                      ayahMemorized
                        ? `Unmark ayah ${ayahNumber} as memorized`
                        : `Mark ayah ${ayahNumber} as memorized`
                    }
                  />
                </View>

                <Text style={s.hint}>Long-press any word to study its root and meaning</Text>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    card: {
      backgroundColor: colors.appCard,
      borderRadius: 24,
      padding: 22,
      paddingTop: 26,
      width: "100%",
      maxHeight: "88%",
      shadowColor: colors.shadowNeutral,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 16,
    },
    scrollContent: {
      paddingTop: 2,
    },
    closeTopBtn: {
      position: "absolute",
      top: 12,
      right: 12,
      padding: 6,
      zIndex: 10,
    },
    arabicWord: {
      fontSize: 42,
      color: colors.appText,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      textAlign: "center",
      marginTop: 4,
    },
    location: {
      fontSize: 12,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 4,
      marginBottom: 14,
    },
    groupLabel: {
      fontSize: 11,
      color: colors.appTextMuted,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    iconRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 4,
      marginBottom: 4,
    },
    iconBtn: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 8,
      minWidth: 64,
    },
    iconLabel: {
      fontSize: 12,
      color: colors.appText,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600",
    },
    iconLabelActive: {
      color: colors.appSuccess,
    },
    iconLabelSaved: {
      color: colors.appSuccess,
    },
    divider: {
      height: 1,
      backgroundColor: colors.appSoftDivider,
      marginVertical: 14,
    },
    section: {
      marginBottom: 14,
    },
    sectionLabel: {
      fontSize: 12,
      color: colors.appTextMuted,
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    rootText: {
      fontSize: 26,
      color: colors.appText,
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      letterSpacing: 4,
      textAlign: "right",
    },
    meaningText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    hint: {
      fontSize: 12,
      color: colors.appIconMuted,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 4,
    },
  });
