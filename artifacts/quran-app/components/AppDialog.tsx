import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

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
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else onCancel();
  };
  const showCancel = !!onConfirm;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <Text style={s.title}>{title}</Text>
              {message ? <Text style={s.message}>{message}</Text> : null}
              <TouchableOpacity
                style={[s.primaryBtn, variant === "destructive" && s.destructiveBtn]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>{confirmLabel}</Text>
              </TouchableOpacity>
              {showCancel && (
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                  <Text style={s.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FDFBF7",
    borderRadius: 18,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#78716C",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 18,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  destructiveBtn: {
    backgroundColor: "#7B2D26",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  cancelBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#F6F2EA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter_700Bold",
  },
});
