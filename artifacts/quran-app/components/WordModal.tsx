import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
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
  const { saveWord, savedWords } = useQuran();

  const alreadySaved = savedWords.some(
    (w) => w.arabic === word && w.surahNumber === surahNumber
  );

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <Text style={s.arabicWord}>{word}</Text>
              <Text style={s.translationText}>{translation || "Loading..."}</Text>
              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.btn, alreadySaved && s.btnDisabled]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Feather name={alreadySaved ? "check" : "plus"} size={16} color={alreadySaved ? colors.mutedForeground : colors.primaryForeground} />
                  <Text style={[s.btnText, alreadySaved && s.btnTextDisabled]}>
                    {alreadySaved ? "Saved" : "Add to Library"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                  <Feather name="x" size={18} color={colors.mutedForeground} />
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
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
    arabicWord: {
      fontSize: 36,
      color: colors.foreground,
      fontFamily: "System",
      marginBottom: 12,
      textAlign: "center",
    },
    translationText: {
      fontSize: 18,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 24,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    btnDisabled: {
      backgroundColor: colors.muted,
    },
    btnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    btnTextDisabled: {
      color: colors.mutedForeground,
    },
    closeBtn: {
      padding: 10,
    },
  });
