import React from "react";
import Svg, { ClipPath, Defs, Rect, Path } from "react-native-svg";

type Props = {
  size?: number;
  bgColor?: string;
};

export default function LogoMark({ size = 80, bgColor = "#FDFBF7" }: Props) {
  const s = size;
  // Proportions derived from logo image:
  // - rounded container
  // - dark top bar: ~18% height
  // - mihrab arch: centered, 60% wide, fills remaining height with ~8% bottom margin
  const barH = s * 0.18;
  const archW = s * 0.60;
  const archX = (s - archW) / 2;
  const archTop = barH;
  const archBottom = s * 0.92;
  const r = archW / 2; // semicircle radius = half arch width
  const archCenterY = archTop + r;

  // Path: start bottom-left, up to arch start, arc over top, down, close
  const d = [
    `M ${archX} ${archBottom}`,
    `L ${archX} ${archCenterY}`,
    `A ${r} ${r} 0 0 1 ${archX + archW} ${archCenterY}`,
    `L ${archX + archW} ${archBottom}`,
    `Z`,
  ].join(" ");

  const corner = s * 0.22;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <ClipPath id="logo-clip">
          <Rect x={0} y={0} width={s} height={s} rx={corner} ry={corner} />
        </ClipPath>
      </Defs>
      <Rect x={0} y={0} width={s} height={s} rx={corner} ry={corner} fill={bgColor} />
      <Rect x={0} y={0} width={s} height={barH} fill="#390A0A" clipPath="url(#logo-clip)" />
      <Path d={d} fill="#C07060" clipPath="url(#logo-clip)" />
    </Svg>
  );
}
