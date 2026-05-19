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
} from "react-native";
import { AppSwitch } from "@/components/DesignSystem";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuran } from "@/contexts/QuranContext";
import { useAuth } from "@/contexts/AuthContext";
import { BackButton } from "@/components/BackButton";
import { ReadingThemeSelector } from "@/components/ReadingThemeSelector";
import { SettingsCard, SettingsRow } from "@/components/SettingsRow";
import { AppDialog } from "@/components/AppDialog";
import { deleteAccount, getQuranFoundationOAuthStatus, startQuranFoundationOAuth } from "@/services/madeenanApi";
import { clearOfflineCaches } from "@/services/offlineQuranCache";
import { clearAppOwnedAsyncStorage } from "@/services/localData";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  const s = styles(colors);
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
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
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "default" | "destructive";
    onConfirm?: () => void;
  } | null>(null);
  const topPad = insets.top;
  const qfStatus = useQuery({
    queryKey: ["quran-foundation-oauth-status"],
    queryFn: getQuranFoundationOAuthStatus,
    retry: 1,
  });

  const handleSignOut = () => {
    setDialog({
      title: "Sign Out",
      message: "You will need to sign in again to sync your Quran data.",
      confirmLabel: "Sign Out",
      variant: "destructive",
      onConfirm: () => {
        setDialog(null);
        signOut().catch(() => {});
      },
    });
  };

  const handleQuranFoundationLink = async () => {
    setLinkingQf(true);
    try {
      const authorizationUrl = await startQuranFoundationOAuth();
      const returnUrl = Linking.createURL("oauth/quran-foundation/success", { scheme: "madeenan" });
      await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUrl);
      await queryClient.invalidateQueries({ queryKey: ["quran-foundation-oauth-status"] });
    } catch (error) {
      setDialog({
        title: "Could not start linking",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLinkingQf(false);
    }
  };

  const handleDeleteAccount = () => {
    setDialog({
      title: "Delete Account",
      message: "This permanently deletes your account and synced Quran data. This cannot be undone.",
      confirmLabel: "Delete Account",
      variant: "destructive",
      onConfirm: async () => {
        setDialog(null);
        setDeletingAccount(true);
        try {
          await deleteAccount();
          await clearOfflineCaches();
          await clearAppOwnedAsyncStorage();
          resetLocalData();
          await signOut();
        } catch (error) {
          setDialog({
            title: "Could not delete account",
            message: error instanceof Error ? error.message : "Please try again.",
          });
        } finally {
          setDeletingAccount(false);
        }
      },
    });
  };

  return (
    <>
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={[s.header, { paddingTop: 8 }]}>
        <BackButton onPress={() => router.back()} />
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>Personalize your madrasa</Text>
          <Text style={s.heroSub}>Keep your reading, reminders, and account links calm and intentional.</Text>
        </View>

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
              <ReadingThemeSelector
                value={accountSettings.theme}
                onChange={(theme) => updateAccountSettings({ theme })}
                size="compact"
                style={s.themeRow}
              />
            }
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <SettingsRow
            label="Daily Reading Reminder"
            last={!accountSettings.dailyNotifications}
            right={
              <AppSwitch
                value={accountSettings.dailyNotifications}
                onValueChange={v => updateAccountSettings({ dailyNotifications: v })}
              />
            }
          />
          {accountSettings.dailyNotifications && (
            <SettingsRow
              label="Reminder Time"
              value={accountSettings.notificationTime}
              onPress={() => setDialog({ title: "Time Picker", message: "Notification time settings coming soon." })}
              last
            />
          )}
        </Section>

        <Section title="LEGAL">
          <SettingsRow
            label="Privacy Policy"
            onPress={() => router.push("/legal/privacy-policy" as any)}
          />
          <SettingsRow
            label="Terms & Conditions"
            onPress={() => router.push("/legal/terms" as any)}
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
    <AppDialog
      visible={!!dialog}
      title={dialog?.title ?? ""}
      message={dialog?.message}
      confirmLabel={dialog?.confirmLabel ?? "OK"}
      cancelLabel={dialog?.onConfirm ? "Cancel" : "Close"}
      variant={dialog?.variant}
      onConfirm={dialog?.onConfirm}
      onCancel={() => setDialog(null)}
    />
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.appBackground },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingBottom: 12,
      backgroundColor: colors.appBackground,
      gap: 10,
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.appText, fontFamily: "Inter_700Bold", textAlign: "center" },
    scroll: { flex: 1 },
    heroCard: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.appSoftBorder,
      backgroundColor: colors.appCardWarm,
      ...colors.shadows.softLift,
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      marginBottom: 3,
    },
    heroSub: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    section: { marginTop: 22 },
    sectionHeader: {
      paddingHorizontal: 22,
      marginBottom: 9,
    },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: colors.appIconMuted, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "Inter_700Bold" },
    themeRow: { justifyContent: "flex-end" },
    dangerLabel: { color: colors.destructive },
    appInfo: { alignItems: "center", paddingVertical: 28, gap: 4 },
    appInfoText: { fontSize: 13, color: colors.appTextMuted, fontFamily: "Inter_400Regular" },
    appInfoSub: { fontSize: 12, color: colors.appIconMuted, fontFamily: "Inter_400Regular" },
  });
