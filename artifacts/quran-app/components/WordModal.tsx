import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
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
}

export function WordModal({ visible, word, translation, surahNumber, ayahNumber, onClose }: Props) {
  const colors = useColors();
  const s = styles(colors);
  const { saveWord, savedWords, highlightWord, unhighlightWord, isWordHighlighted } = useQuran();

  const alreadySaved = savedWords.some(
    (w) => w.arabic === word && w.surahNumber === surahNumber
  );

  const highlighted = isWordHighlighted(word, surahNumber, ayahNumber);

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
    if (highlighted) {
      unhighlightWord(word, surahNumber, ayahNumber);
    } else {
      highlightWord(word, surahNumber, ayahNumber);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <TouchableOpacity style={s.closeTopBtn} onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              <Text style={s.arabicWord}>{word}</Text>
              <Text style={s.location}>Surah {surahNumber} • Ayah {ayahNumber}</Text>
              {translation ? (
                <Text style={s.translationText}>{translation}</Text>
              ) : (
                <Text style={s.translationHint}>Long-press any word to save & study it</Text>
              )}

              <View style={s.divider} />

              <Text style={s.actionsLabel}>What would you like to do?</Text>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.actionBtn, highlighted ? s.actionBtnHighlightActive : s.actionBtnHighlight]}
                  onPress={handleHighlight}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={highlighted ? "star" : "star-outline"}
                    size={18}
                    color={highlighted ? "#FFFFFF" : colors.accent}
                  />
                  <Text style={[s.actionBtnText, highlighted ? s.actionBtnTextLight : s.actionBtnTextAccent]}>
                    {highlighted ? "Remove Highlight" : "Highlight"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, alreadySaved ? s.actionBtnSaved : s.actionBtnPrimary]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={alreadySaved ? "checkmark-circle" : "bookmark-outline"}
                    size={18}
                    color={alreadySaved ? colors.mutedForeground : colors.primaryForeground}
                  />
                  <Text style={[s.actionBtnText, alreadySaved ? s.actionBtnTextMuted : s.actionBtnTextLight]}>
                    {alreadySaved ? "Already Saved" : "Add to Library"}
                  </Text>
                </TouchableOpacity>
              </View>
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
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      width: "100%",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 16,
    },
    closeTopBtn: {
      position: "absolute",
      top: 14,
      right: 14,
      padding: 6,
    },
    arabicWord: {
      fontSize: 40,
      color: colors.foreground,
      fontFamily: "System",
      marginBottom: 6,
      textAlign: "center",
      marginTop: 8,
    },
    location: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 8,
    },
    translationText: {
      fontSize: 18,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 4,
    },
    translationHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      fontStyle: "italic",
      marginBottom: 4,
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    actionsLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    actions: { flexDirection: "row", gap: 10, width: "100%" },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 13,
      borderRadius: 12,
    },
    actionBtnHighlight: {
      backgroundColor: colors.accent + "22",
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    actionBtnHighlightActive: {
      backgroundColor: colors.accent,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
    },
    actionBtnSaved: {
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    actionBtnTextLight: { color: "#FFFFFF" },
    actionBtnTextAccent: { color: colors.accent },
    actionBtnTextMuted: { color: colors.mutedForeground },
  });
