import React from "react";
import { View } from "react-native";
import { ActionPill } from "@/components/ActionPill";

interface QuestionNavProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function QuestionNav({ canGoPrev, canGoNext, onPrev, onNext }: QuestionNavProps) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <ActionPill
        label="Prev"
        icon="arrow-left"
        variant="outline"
        size="md"
        disabled={!canGoPrev}
        onPress={onPrev}
        style={{ flex: 1 }}
      />
      <ActionPill
        label="Next"
        icon="arrow-right"
        iconPosition="right"
        variant="primary"
        size="md"
        disabled={!canGoNext}
        onPress={onNext}
        style={{ flex: 1 }}
      />
    </View>
  );
}
