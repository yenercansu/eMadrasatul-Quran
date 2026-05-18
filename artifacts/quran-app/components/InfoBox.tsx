import React from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";
import { AppCard } from "@/components/DesignSystem";

interface InfoBoxProps {
  title: string;
  description: string;
  rightContent?: React.ReactNode;
}

export function InfoBox({ title, description, rightContent }: InfoBoxProps) {
  const colors = useColors();
  return (
    <AppCard
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 20 }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.appText,
            fontFamily: "Inter_700Bold",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.appTextMuted,
            fontFamily: "Inter_400Regular",
            lineHeight: 19,
          }}
        >
          {description}
        </Text>
      </View>
      {rightContent}
    </AppCard>
  );
}
