import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type VeeraLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Show rounded square background (app icon style) */
  withBackground?: boolean;
};

/**
 * Veera mark — V + inner curve, themed for dark/light app palettes.
 */
export function VeeraLogo({ size = 64, style, withBackground = false }: VeeraLogoProps) {
  const colors = useColors();
  const uid = React.useId().replace(/:/g, "");

  const bg = colors.background;
  const primary = colors.primary;
  const cyan = colors.cyan;
  const purple = colors.purple;
  const accent = colors.green;
  const innerStart = colors.foreground;
  const innerEnd = colors.mutedForeground;

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none" style={style}>
      <Defs>
        <LinearGradient id={`${uid}-primary`} x1="140" y1="150" x2="372" y2="370" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={primary} />
          <Stop offset="0.5" stopColor={cyan} />
          <Stop offset="1" stopColor={purple} />
        </LinearGradient>
        <LinearGradient id={`${uid}-secondary`} x1="196" y1="200" x2="316" y2="300" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={innerStart} />
          <Stop offset="1" stopColor={innerEnd} />
        </LinearGradient>
        <RadialGradient
          id={`${uid}-glow`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(256 180) rotate(90) scale(140)"
        >
          <Stop offset="0" stopColor={primary} />
          <Stop offset="1" stopColor={primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {withBackground ? <Rect width="512" height="512" rx="120" fill={bg} /> : null}

      <Circle cx="256" cy="180" r="140" fill={`url(#${uid}-glow)`} opacity={0.2} />

      <Path
        d="M140 150L256 370L372 150"
        stroke={`url(#${uid}-primary)`}
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path
        d="M196 200C220 245 245 278 256 300C268 278 292 245 316 200"
        stroke={`url(#${uid}-secondary)`}
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />

      <Circle cx="256" cy="122" r="14" fill={accent} />
    </Svg>
  );
}
