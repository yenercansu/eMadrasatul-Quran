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
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { SettingsCard, SettingsRow } from "@/components/SettingsRow";
import { deleteAccount, getQuranFoundationOAuthStatus, startQuranFoundationOAuth } from "@/services/madeenanApi";
import { clearOfflineCaches } from "@/services/offlineQuranCache";
import { clearAppOwnedAsyncStorage } from "@/services/localData";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <SettingsCard>{children}</SettingsCard>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { accountSettings, updateAccountSettings, resetLocalData } = useQuran();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [linkingQf, setLinkingQf] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const topPad = insets.top;
  const qfStatus = useQuery({
    queryKey: ["quran-foundation-oauth-status"],
    queryFn: getQuranFoundationOAuthStatus,
    retry: 1,
  });

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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and synced Quran data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
              await clearOfflineCaches();
              await clearAppOwnedAsyncStorage();
              resetLocalData();
              await signOut();
            } catch (error) {
              Alert.alert("Could not delete account", error instanceof Error ? error.message : "Please try again.");
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
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
          <SettingsRow
            label="Account Link"
            value={
              linkingQf
                ? "Opening..."
                : qfStatus.isLoading
                ? "Checking..."
                : qfStatus.data?.linked || qfStatus.data?.connected
                  ? "Connected"
                  : "Not connected"
            }
            onPress={handleQuranFoundationLink}
            last
          />
        </Section>

        <Section title="READING">
          <SettingsRow
            label="Reading Theme"
            last
            right={
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
            }
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingsRow
            label="Daily Reading Reminder"
            last={!accountSettings.dailyNotifications}
            right={
              <Switch
                value={accountSettings.dailyNotifications}
                onValueChange={v => updateAccountSettings({ dailyNotifications: v })}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.primaryForeground}
              />
            }
          />
          {accountSettings.dailyNotifications && (
            <SettingsRow
              label="Reminder Time"
              value={accountSettings.notificationTime}
              onPress={() => Alert.alert("Time Picker", "Notification time settings coming soon.")}
              last
            />
          )}
        </Section>

        <Section title="LEGAL">
          <SettingsRow
            label="Privacy Policy"
            onPress={() => Alert.alert("Privacy Policy", "Your Quran Madrasa data syncs through Madeenan. Quran Foundation tokens are linked and stored by the backend, not in this mobile app.")}
          />
          <SettingsRow
            label="Terms & Conditions"
            onPress={() => Alert.alert("Terms & Conditions", "This app is provided for educational and religious purposes. Quran content is served through the Madeenan backend.")}
            last
          />
        </Section>

        <Section title="ACCOUNT">
          <SettingsRow
            label="Sign Out"
            onPress={handleSignOut}
            labelStyle={s.dangerLabel}
          />
          <SettingsRow
            label={deletingAccount ? "Deleting Account..." : "Delete Account"}
            onPress={deletingAccount ? undefined : handleDeleteAccount}
            labelStyle={s.dangerLabel}
            last
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
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold", marginBottom: 8, paddingHorizontal: 20 },
    themeRow: { flexDirection: "row", gap: 4 },
    themeChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    themeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    themeChipText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    themeChipTextActive: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    dangerLabel: { color: colors.destructive },
    appInfo: { alignItems: "center", paddingVertical: 24, gap: 4 },
    appInfoText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    appInfoSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
