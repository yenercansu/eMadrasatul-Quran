import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/BackButton";

interface FullScreenPageProps {
  title: string;
  onClose: () => void;
  /** Wrap children in a ScrollView (default true). Pass false when the screen manages its own scroll. */
  scrollable?: boolean;
  children: React.ReactNode;
}

export function FullScreenPage({ title, onClose, scrollable = true, children }: FullScreenPageProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}>
        <BackButton onPress={onClose} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: c.foreground, fontFamily: "Inter_700Bold", textAlign: "center" }}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {children}
        </ScrollView>
      ) : children}
    </View>
  );
}
