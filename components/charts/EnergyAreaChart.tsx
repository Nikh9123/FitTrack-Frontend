import { energyFromColor, withAlpha } from "@/constants/energy-glow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import React, { useEffect, useMemo } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface EnergyAreaChartProps {
  data: number[];
  color: string;
  width: number;
  height: number;
  /** Unique id prefix for SVG defs */
  chartId?: string;
}

function buildPoints(data: number[], width: number, height: number, pad: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2 - 10);
    return { x, y };
  });
}

function linePath(points: { x: number; y: number }[]) {
  return points
    .map((p, i) =>
      i === 0
        ? `M${p.x},${p.y}`
        : `C${points[i - 1].x + (p.x - points[i - 1].x) / 2},${points[i - 1].y} ${points[i - 1].x + (p.x - points[i - 1].x) / 2},${p.y} ${p.x},${p.y}`,
    )
    .join(" ");
}

export function EnergyAreaChart({ data, color, width, height, chartId = "energy" }: EnergyAreaChartProps) {
  const reduceMotion = useReducedMotion();
  const energy = energyFromColor(color);
  const pad = 10;
  const gradId = `${chartId}-area`;
  const strokeId = `${chartId}-stroke`;
  const shadowId = `${chartId}-shadow`;

  const points = useMemo(() => buildPoints(data, width, height, pad), [data, width, height]);
  const path = useMemo(() => linePath(points), [points]);
  const areaPath = `${path} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;
  const shadowPath = `${path} L${points[points.length - 1].x},${height - pad + 4} L${points[0].x},${height - pad + 4} Z`;

  const last = points[points.length - 1];
  const pulse = useSharedValue(1);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      reveal.value = 1;
      pulse.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1,
    );
  }, [data.join(","), reduceMotion, reveal, pulse]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + reveal.value * 0.6,
  }));

  const glowDotProps = useAnimatedProps(() => ({
    r: 7 * pulse.value,
    opacity: 0.12 + (pulse.value - 1) * 0.15,
  }));

  if (!data || data.length < 2) return null;

  return (
    <Animated.View style={wrapStyle}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={energy.primary} stopOpacity="0.32" />
            <Stop offset="100%" stopColor={energy.primary} stopOpacity="0.02" />
          </SvgGradient>
          <SvgGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={energy.primary} />
            <Stop offset="100%" stopColor={energy.secondary} />
          </SvgGradient>
          <SvgGradient id={shadowId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={energy.primary} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={energy.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>

        <Path d={shadowPath} fill={`url(#${shadowId})`} />
        <Path d={areaPath} fill={`url(#${gradId})`} />
        <Path
          d={path}
          stroke={`url(#${strokeId})`}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.slice(0, -1).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={withAlpha(energy.primary, 0.55)} />
        ))}

        <AnimatedCircle cx={last.x} cy={last.y} fill={energy.primary} animatedProps={glowDotProps} />
        <Circle cx={last.x} cy={last.y} r={4.5} fill={energy.primary} />
      </Svg>
    </Animated.View>
  );
}
