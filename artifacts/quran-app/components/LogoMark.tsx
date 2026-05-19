import React from "react";
import { Image } from "expo-image";
import { View } from "react-native";

type Props = {
  size?: number;
  bgColor?: string;
};

export default function LogoMark({ size = 80, bgColor }: Props) {
  return (
    <View style={{ width: size, height: size, backgroundColor: bgColor, borderRadius: size * 0.22, overflow: 'hidden' }}>
      <Image
        source={require("../assets/images/logo.svg")}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
      />
    </View>
  );
}

