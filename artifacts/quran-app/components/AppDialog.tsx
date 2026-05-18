import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { ActionPill } from "@/components/ActionPill";
import { AppCard } from "@/components/DesignSystem";

type AppDialogVariant = "default" | "destructive";

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AppDialogVariant;
  onConfirm?: () => void;
  onCancel: () => void;
}

export function AppDialog({
  visible,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const colors = useColors();
  const s = styles(colors);
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else onCancel();
  };
  const showCancel = !!onConfirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <AppCard variant="plain" style={s.card}>
              <Text style={s.title}>{title}</Text>
              {message ? <Text style={s.message}>{message}</Text> : null}
              <ActionPill
                label={confirmLabel}
                variant="primary"
                size="lg"
                style={variant === "destructive" && s.destructiveBtn}
                onPress={handleConfirm}
              />
              {showCancel && (
                <ActionPill
                  label={cancelLabel}
                  variant="soft"
                  size="md"
                  onPress={onCancel}
                />
              )}
            </AppCard>
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
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      padding: 20,
      gap: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    message: {
      fontSize: 14,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 8,
    },
    destructiveBtn: {
      backgroundColor: colors.destructive,
    },
  });
