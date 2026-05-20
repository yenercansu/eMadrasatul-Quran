import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { InlineNotice } from "@/components/InlineNotice";

interface InfoBoxProps {
  title: string;
  description: string;
  rightContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function InfoBox({ title, description, rightContent, style }: InfoBoxProps) {
  return (
    <InlineNotice
      variant="neutral"
      icon={false}
      title={title}
      description={description}
      style={[{ gap: 20 }, style]}
      contentStyle={{ gap: 4 }}
      titleStyle={{ fontSize: 16, lineHeight: 21 }}
      descriptionStyle={{ lineHeight: 19 }}
    >
      <View>
        {rightContent}
      </View>
    </InlineNotice>
  );
}
