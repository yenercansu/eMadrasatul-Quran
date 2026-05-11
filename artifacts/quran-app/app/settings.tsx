import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { getQuranFoundationOAuthStatus, startQuranFoundationOAuth } from "@/services/madeenanApi";

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

export default function SettingsScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { accountSettings, updateAccountSettings } = useQuran();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [linkingQf, setLinkingQf] = useState(false);
  const topPad = insets.top;
  const qfStatus = useQuery({
    queryKey: ["quran-foundation-oauth-status"],
    queryFn: getQuranFoundationOAuthStatus,
    retry: 1,
  });

  const fontSizes = [20, 24, 28, 32, 36];

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "You will need to sign in again to sync your Quran data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => { signOut().catch(() => {}); },
        },
      ]
    );
  };

  const handleQuranFoundationLink = async () => {
    setLinkingQf(true);
    try {
      const authorizationUrl = await startQuranFoundationOAuth();
      const returnUrl = Linking.createURL("oauth/quran-foundation/success", { scheme: "madeenan" });
      await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUrl);
      await queryClient.invalidateQueries({ queryKey: ["quran-foundation-oauth-status"] });
    } catch (error) {
      Alert.alert("Could not start linking", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLinkingQf(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <BackButton onPress={() => router.back()} />
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Section title="QURAN FOUNDATION">
          <SettingRow
            icon="link"
            label="Account Link"
            value={
              qfStatus.isLoading
                ? "Checking..."
                : qfStatus.data?.linked || qfStatus.data?.connected
                  ? "Connected"
                  : "Not connected"
            }
            onPress={handleQuranFoundationLink}
            rightElement={linkingQf ? <Text style={s.settingValue}>Opening...</Text> : undefined}
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
              {(["light", "dark", "auto"] as const).map(theme => (
                <TouchableOpacity
                  key={theme}
                  style={[s.themeChip, accountSettings.theme === theme && s.themeChipActive]}
                  onPress={() => updateAccountSettings({ theme })}
                  activeOpacity={0.8}
                >
                  <Text style={[s.themeChipText, accountSettings.theme === theme && s.themeChipTextActive]}>
                    {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto"}
                  </Text>
                </TouchableOpacity>
              ))}
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
            onPress={() => Alert.alert("Privacy Policy", "Your Quran Madrasa data syncs through Madeenan. Quran Foundation tokens are linked and stored by the backend, not in this mobile app.")}
          />
          <SettingRow
            icon="file-text"
            label="Terms & Conditions"
            onPress={() => Alert.alert("Terms & Conditions", "This app is provided for educational and religious purposes. Quran content is served through the Madeenan backend.")}
          />
        </Section>

        <Section title="ACCOUNT">
          <SettingRow
            icon="log-out"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
        </Section>

        <View style={s.appInfo}>
          <Text style={s.appInfoText}>Quran Madrasa — Version 1.0.0</Text>
          <Text style={s.appInfoSub}>Content powered by Madeenan</Text>
        </View>
      </ScrollView>
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
    themeChipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    themeChipTextActive: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    appInfo: { alignItems: "center", paddingVertical: 24, gap: 4 },
    appInfoText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    appInfoSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
