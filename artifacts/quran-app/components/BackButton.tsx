import React from "react";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}
    >
      <Feather name="arrow-left" size={22} color={c.appText} />
    </TouchableOpacity>
  );
}
