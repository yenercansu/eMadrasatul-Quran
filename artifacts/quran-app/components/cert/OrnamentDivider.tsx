import React from "react";
import { View } from "react-native";
import Svg, { Line, Polygon, Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface OrnamentDividerProps {
  width?: number;
  faint?: boolean;
}

export function OrnamentDivider({ width = 180, faint = false }: OrnamentDividerProps) {
  const c = useColors();
  const stroke = faint ? c.borderSubtle : c.accentSoft;
  const h = 12;
  const cx = width / 2;
  const cy = h / 2;
  const diamondSize = 5;

  return (
    <View style={{ alignItems: "center", marginVertical: 4 }}>
      <Svg width={width} height={h}>
        <Line x1={0} y1={cy} x2={cx - diamondSize - 2} y2={cy} stroke={stroke} strokeWidth={0.7} />
        <Line x1={cx + diamondSize + 2} y1={cy} x2={width} y2={cy} stroke={stroke} strokeWidth={0.7} />
        {/* Outer diamond */}
        <Polygon
          points={`${cx},${cy - diamondSize} ${cx + diamondSize},${cy} ${cx},${cy + diamondSize} ${cx - diamondSize},${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth={0.7}
        />
        {/* Inner fill dot */}
        <Circle cx={cx} cy={cy} r={2} fill={stroke} fillOpacity={0.5} />
      </Svg>
    </View>
  );
}
