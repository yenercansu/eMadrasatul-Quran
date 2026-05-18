import React from "react";
import { IconButton } from "@/components/DesignSystem";

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <IconButton
      icon="arrow-left"
      onPress={onPress}
      accessibilityLabel="Go back"
    />
  );
}
