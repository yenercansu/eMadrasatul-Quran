import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";

interface Props {
  visible: boolean;
  word: string;
  translation: string;
  surahNumber: number;
  ayahNumber: number;
  onClose: () => void;
  onRepeat?: () => void;
  onCut?: () => void;
}

// Tiny heuristic root-extractor — last resort when no API root is provided.
// Strips Arabic diacritics, splits character clusters, returns up to 3 root letters.
function deriveRoot(word: string): string {
  const stripped = word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]/g, "").trim();
  // Common particles to strip from front
  const cleaned = stripped.replace(/^(ال|و|ف|ل|ب|ك)/u, "");
  const letters = [...cleaned].filter((c) => /[\u0621-\u064A]/u.test(c));
  const root = letters.slice(0, 3);
  return root.join(" ");
}

export function WordModal({
  visible,
  word,
  translation,
  surahNumber,
  ayahNumber,
  onClose,
  onRepeat,
  onCut,
}: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { saveWord, savedWords, highlightWord, unhighlightWord, isWordHighlighted } = useQuran();

  const alreadySaved = savedWords.some(
    (w) => w.arabic === word && w.surahNumber === surahNumber,
  );
  const highlighted = isWordHighlighted(word, surahNumber, ayahNumber);
  const root = deriveRoot(word);

  const handleSave = () => {
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
    onClose();
  };

  const handleHighlight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (highlighted) unhighlightWord(word, surahNumber, ayahNumber);
    else highlightWord(word, surahNumber, ayahNumber);
  };

  const handleRepeat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onRepeat?.();
  };

  const handleCut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onCut?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <TouchableOpacity style={s.closeTopBtn} onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={20} color="#9A9A9A" />
              </TouchableOpacity>

              {/* Word + location */}
              <Text style={s.arabicWord}>{word}</Text>
              <Text style={s.location}>Surah {surahNumber} · Ayah {ayahNumber}</Text>

              {/* Quick action icon row (matches screenshot) */}
              <View style={s.iconRow}>
                <TouchableOpacity style={s.iconBtn} onPress={handleRepeat} activeOpacity={0.7}>
                  <Ionicons name="repeat" size={20} color="#1A1A1A" />
                  <Text style={s.iconLabel}>Repeat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={handleCut} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="content-cut" size={20} color="#1A1A1A" />
                  <Text style={s.iconLabel}>Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={handleSave} activeOpacity={0.7}>
                  <Feather
                    name={alreadySaved ? "check-circle" : "download"}
                    size={20}
                    color={alreadySaved ? "#16A34A" : "#1A1A1A"}
                  />
                  <Text style={[s.iconLabel, alreadySaved && { color: "#16A34A" }]}>
                    {alreadySaved ? "Saved" : "Save"}
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

              {/* Footer hint */}
              <Text style={s.hint}>Long-press any word to study its root and meaning</Text>
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
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      padding: 22,
      paddingTop: 26,
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 16,
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
      color: "#1A1A1A",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      textAlign: "center",
      marginTop: 4,
    },
    location: {
      fontSize: 12,
      color: "#9A9A9A",
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 4,
      marginBottom: 18,
    },
    iconRow: {
      flexDirection: "row",
      justifyContent: "space-around",
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
      fontSize: 11,
      color: "#1A1A1A",
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: "#F0F0F0",
      marginVertical: 14,
    },
    section: {
      marginBottom: 14,
    },
    sectionLabel: {
      fontSize: 11,
      color: "#9A9A9A",
      fontFamily: "Inter_700Bold",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    rootText: {
      fontSize: 26,
      color: "#1A1A1A",
      fontFamily: Platform.OS === "ios" ? "System" : undefined,
      letterSpacing: 4,
      textAlign: "right",
    },
    meaningText: {
      fontSize: 14,
      color: "#4A4A4A",
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    hint: {
      fontSize: 11,
      color: "#B0B0B0",
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 4,
    },
  });
