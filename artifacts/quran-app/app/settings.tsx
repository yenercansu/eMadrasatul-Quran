import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <TouchableOpacity
      style={s.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[s.settingIcon, danger && s.settingIconDanger]}>
        <Feather name={icon as any} size={16} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[s.settingLabel, danger && s.settingLabelDanger]}>{label}</Text>
      <View style={s.settingRight}>
        {rightElement ?? (
          value ? (
            <>
              <Text style={s.settingValue} numberOfLines={1}>{value}</Text>
              {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
            </>
          ) : onPress ? (
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          ) : null
        )}
      </View>
    </TouchableOpacity>
  );
}

function EditModal({
  visible,
  title,
  placeholder,
  value,
  onSave,
  onClose,
  keyboardType = "default",
  colors,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onSave: (val: string) => void;
  onClose: () => void;
  keyboardType?: "default" | "email-address";
  colors: ReturnType<typeof useColors>;
}) {
  const [text, setText] = useState(value);
  const s = styles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.editOverlay}>
          <TouchableWithoutFeedback>
            <View style={s.editCard}>
              <Text style={s.editTitle}>{title}</Text>
              <TextInput
                style={s.editInput}
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                keyboardType={keyboardType}
              />
              <View style={s.editActions}>
                <TouchableOpacity style={s.editCancel} onPress={onClose} activeOpacity={0.8}>
                  <Text style={s.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editSave} onPress={() => { onSave(text); onClose(); }} activeOpacity={0.85}>
                  <Text style={s.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { accountSettings, updateAccountSettings } = useQuran();
  const [editField, setEditField] = useState<"name" | "email" | null>(null);
  const topPad = insets.top;

  const fontSizes = [20, 24, 28, 32, 36];

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data including saved words, progress, and goals. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () => {
            Alert.alert("Account Deleted", "All your data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Section title="ACCOUNT">
          <SettingRow
            icon="user"
            label="Name"
            value={accountSettings.name || "Not set"}
            onPress={() => setEditField("name")}
          />
          <SettingRow
            icon="mail"
            label="Email"
            value={accountSettings.email || "Not set"}
            onPress={() => setEditField("email")}
          />
        </Section>

        <Section title="READING">
          <View style={s.settingRow}>
            <View style={s.settingIcon}>
              <Feather name="type" size={16} color={colors.primary} />
            </View>
            <Text style={s.settingLabel}>Font Size</Text>
            <View style={s.fontSizeRow}>
              {fontSizes.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[s.fontSizeChip, accountSettings.fontSize === size && s.fontSizeChipActive]}
                  onPress={() => updateAccountSettings({ fontSize: size })}
                  activeOpacity={0.8}
                >
                  <Text style={[s.fontSizeChipText, accountSettings.fontSize === size && s.fontSizeChipTextActive]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.settingRow}>
            <View style={s.settingIcon}>
              <Feather name="moon" size={16} color={colors.primary} />
            </View>
            <Text style={s.settingLabel}>Reading Theme</Text>
            <View style={s.themeRow}>
              {(["auto", "light"] as const).map(theme => (
                <TouchableOpacity
                  key={theme}
                  style={[s.themeChip, accountSettings.theme === theme && s.themeChipActive]}
                  onPress={() => updateAccountSettings({ theme })}
                  activeOpacity={0.8}
                >
                  <Text style={[s.themeChipText, accountSettings.theme === theme && s.themeChipTextActive]}>
                    {theme === "auto" ? "Auto" : "Light"}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={[s.themeChip, s.themeChipDisabled]}>
                <Text style={s.themeChipTextDisabled}>Dark</Text>
              </View>
            </View>
          </View>
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingRow
            icon="bell"
            label="Daily Reading Reminder"
            rightElement={
              <Switch
                value={accountSettings.dailyNotifications}
                onValueChange={v => updateAccountSettings({ dailyNotifications: v })}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.primaryForeground}
              />
            }
          />
          {accountSettings.dailyNotifications && (
            <SettingRow
              icon="clock"
              label="Reminder Time"
              value={accountSettings.notificationTime}
              onPress={() => Alert.alert("Time Picker", "Notification time settings coming soon.")}
            />
          )}
        </Section>

        <Section title="LEGAL">
          <SettingRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => Alert.alert("Privacy Policy", "Your data is stored locally on your device. We do not collect or transmit personal information to external servers.")}
          />
          <SettingRow
            icon="file-text"
            label="Terms & Conditions"
            onPress={() => Alert.alert("Terms & Conditions", "This app is provided for educational and religious purposes. The Quran text and audio are provided through open APIs.")}
          />
        </Section>

        <Section title="ACCOUNT ACTIONS">
          <SettingRow
            icon="trash-2"
            label="Delete Account & Data"
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <View style={s.appInfo}>
          <Text style={s.appInfoText}>Al-Quran — Version 1.0.0</Text>
          <Text style={s.appInfoSub}>Content powered by alquran.cloud</Text>
        </View>
      </ScrollView>

      <EditModal
        visible={editField === "name"}
        title="Change Name"
        placeholder="Your name"
        value={accountSettings.name}
        onSave={val => updateAccountSettings({ name: val })}
        onClose={() => setEditField(null)}
        colors={colors}
      />
      <EditModal
        visible={editField === "email"}
        title="Change Email"
        placeholder="your@email.com"
        value={accountSettings.email}
        onSave={val => updateAccountSettings({ email: val })}
        onClose={() => setEditField(null)}
        keyboardType="email-address"
        colors={colors}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" },
    scroll: { flex: 1 },
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 8 },
    sectionCard: { backgroundColor: colors.card, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
      minHeight: 52,
    },
    settingIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    settingIconDanger: { backgroundColor: colors.secondary },
    settingLabel: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    settingLabelDanger: { color: colors.destructive },
    settingRight: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 140 },
    settingValue: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    fontSizeRow: { flexDirection: "row", gap: 6 },
    fontSizeChip: { width: 36, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
    fontSizeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    fontSizeChipText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    fontSizeChipTextActive: { color: colors.primaryForeground },
    themeRow: { flexDirection: "row", gap: 6 },
    themeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    themeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    themeChipDisabled: { opacity: 0.35 },
    themeChipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    themeChipTextActive: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    themeChipTextDisabled: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    editOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
    editCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: "100%", shadowColor: colors.appBlack, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
    editTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 12 },
    editInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.foreground, fontFamily: "Inter_400Regular", marginBottom: 16 },
    editActions: { flexDirection: "row", gap: 10 },
    editCancel: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    editCancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    editSave: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary },
    editSaveText: { fontSize: 15, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    appInfo: { alignItems: "center", paddingVertical: 24, gap: 4 },
    appInfoText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    appInfoSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
