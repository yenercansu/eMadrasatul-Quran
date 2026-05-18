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
        backgroundColor: colors.appCardWarm,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.appSoftBorder,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 20,
        ...colors.shadows.softLift,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.appText, fontFamily: "Inter_700Bold" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.appTextMuted, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
          {description}
        </Text>
      </View>
      {rightContent}
    </View>
  );
}
