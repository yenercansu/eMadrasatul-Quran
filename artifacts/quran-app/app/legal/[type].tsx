import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/BackButton";
import { LEGAL_DOCUMENTS, type LegalDocType } from "@/constants/legalContent";

export default function LegalScreen() {
  const colors = useColors();
  const s = styles(colors);
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();

  const doc = LEGAL_DOCUMENTS[type as LegalDocType];

  if (!doc) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={[s.header, { paddingTop: 8 }]}>
          <BackButton onPress={() => router.back()} />
          <Text style={s.headerTitle}>Legal</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.emptyState}>
          <Text style={s.emptyText}>Document not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={[s.header, { paddingTop: 8 }]}>
        <BackButton onPress={() => router.back()} />
        <Text style={s.headerTitle}>{doc.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 48 }]}
        accessible
        accessibilityLabel={`${doc.title} document`}
      >
        <Text style={s.summary}>{doc.summary}</Text>

        {doc.sections.map((section, i) => (
          <View key={i} style={s.section}>
            <Text style={s.sectionHeading}>{section.heading}</Text>
            <Text style={s.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>Last updated: {doc.lastUpdated}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.appBackground,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingBottom: 12,
      backgroundColor: colors.appBackground,
      gap: 10,
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: 8,
      gap: 0,
    },
    summary: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
      marginBottom: 28,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.appText,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
    },
    sectionBody: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
    footer: {
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.appSoftDivider,
      marginTop: 4,
    },
    footerText: {
      fontSize: 12,
      color: colors.appIconMuted,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 15,
      color: colors.appTextMuted,
      fontFamily: "Inter_400Regular",
    },
  });
