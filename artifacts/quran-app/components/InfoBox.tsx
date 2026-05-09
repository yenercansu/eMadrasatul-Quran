import React from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface InfoBoxProps {
  title: string;
  description: string;
  rightContent?: React.ReactNode;
}

export function InfoBox({ title, description, rightContent }: InfoBoxProps) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.appStone,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 44,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.appText, fontFamily: "Inter_700Bold" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.appTextMuted, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
          {description}
        </Text>
      </View>
      {rightContent}
    </View>
  );
}
