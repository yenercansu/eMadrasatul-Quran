import React from "react";
import { View } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface CertSealProps {
  size?: number;
}

export function CertSeal({ size = 56 }: CertSealProps) {
  const c = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR - 5;
  const perimR = outerR - 2;
  const iconContainerSize = size * 0.64;
  const iconSize = size * 0.28;

  const diamonds = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8;
    const dx = perimR * Math.cos(angle);
    const dy = perimR * Math.sin(angle);
    const ds = 2;
    return (
      <Polygon
        key={i}
        points={`${cx + dx},${cy + dy - ds} ${cx + dx + ds},${cy + dy} ${cx + dx},${cy + dy + ds} ${cx + dx - ds},${cy + dy}`}
        fill={c.accentSoft}
        fillOpacity={0.6}
      />
    );
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={cx} cy={cy} r={outerR} stroke={c.accentSoft} strokeWidth={0.8} fill="none" />
        <Circle cx={cx} cy={cy} r={innerR} stroke={c.accentSoft} strokeWidth={0.5} strokeDasharray="1.5 3.5" fill="none" />
        {diamonds}
      </Svg>
      <View
        style={{
          width: iconContainerSize,
          height: iconContainerSize,
          borderRadius: iconContainerSize / 2,
          backgroundColor: c.hifzWarmBand,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name="award" size={iconSize} color={c.hifzAccent} strokeWidth={1.6} />
      </View>
    </View>
  );
}
