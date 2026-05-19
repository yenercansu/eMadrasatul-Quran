import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { BackButton } from "@/components/BackButton";
import colors from "@/constants/colors";

const sp = colors.spacing;
const ty = colors.typography;
const br = colors.borders;

export default function EditCertificateNameScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { accountSettings, updateAccountSettings } = useQuran();

  const [value, setValue] = useState(accountSettings.certificateName || accountSettings.name || "");

  function handleSave() {
    updateAccountSettings({ certificateName: value.trim() });
    router.back();
  }

  const hasChanges = value.trim() !== (accountSettings.certificateName ?? "");

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardAvoid, { backgroundColor: c.appBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.screen, { backgroundColor: c.appBackground, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: c.borderSubtle }]}>
          <BackButton onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Certificate Name</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges}
            activeOpacity={0.7}
            style={styles.saveBtn}
          >
            <Text style={[styles.saveBtnText, { color: hasChanges ? c.accentPrimary : c.hifzFaint }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: c.appBackground }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: c.hifzCardBg, borderColor: c.borderSubtle }]}>
            <Text style={[styles.fieldLabel, { color: c.hifzFaint }]}>NAME ON CERTIFICATE</Text>
            <TextInput
              style={[styles.input, { color: c.textPrimary, borderBottomColor: c.borderSubtle }]}
              value={value}
              onChangeText={setValue}
              placeholder={accountSettings.name || "Your name"}
              placeholderTextColor={c.hifzFaint}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <Text style={[styles.hint, { color: c.hifzFaint }]}>
            This name will appear on all certificates — Surah, Juz, and Full Quran. It will also be used in exported PDFs and shared certificates.
          </Text>

          {!accountSettings.certificateName && accountSettings.name ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setValue(accountSettings.name)}
              style={[styles.prefillBtn, { borderColor: c.borderSubtle }]}
            >
              <Text style={[styles.prefillText, { color: c.hifzAccentMuted }]}>
                Use account name: {accountSettings.name}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sp.lg,
    paddingVertical: sp.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: ty.fontSize.lg,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
  },
  saveBtnText: {
    fontSize: ty.fontSize.base,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    paddingHorizontal: sp.lg,
    paddingTop: sp["2xl"],
    gap: sp.lg,
  },
  card: {
    borderRadius: br.lg,
    borderWidth: 1,
    padding: sp.lg,
    gap: sp.sm,
  },
  fieldLabel: {
    fontSize: ty.fontSize.sm,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  input: {
    fontSize: ty.fontSize.lg,
    fontFamily: "Inter_400Regular",
    paddingVertical: sp.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    fontSize: ty.fontSize.sm,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  prefillBtn: {
    borderRadius: br.md,
    borderWidth: 1,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    alignSelf: "flex-start",
  },
  prefillText: {
    fontSize: ty.fontSize.sm,
    fontFamily: "Inter_400Regular",
  },
});
