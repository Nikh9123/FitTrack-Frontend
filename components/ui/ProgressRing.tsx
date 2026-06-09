import { MOTION } from "@/constants/animations";
import { energyFromColor, withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  centerContent?: React.ReactNode;
  /** Change to replay ring fill from zero */
  animKey?: string | number;
  /** Enable soft outer glow + endpoint bloom */
  glow?: boolean;
}

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  label,
  sublabel,
  centerContent,
  animKey = progress,
  glow = true,
}: ProgressRingProps) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const energy = energyFromColor(color);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const gradId = useMemo(() => `ringGrad-${size}-${color.replace("#", "")}`, [size, color]);

  const animatedProgress = useSharedValue(reduceMotion ? clampedProgress : 0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(animatedProgress);
    if (reduceMotion) {
      animatedProgress.value = clampedProgress;
      return;
    }
    animatedProgress.value = 0;
    animatedProgress.value = withTiming(clampedProgress, MOTION.timingRing);
    pulseScale.value = withSequence(
      withSpring(1.04, { damping: 12, stiffness: 180 }),
      withSpring(1, { damping: 14, stiffness: 160 }),
    );
  }, [clampedProgress, animKey, animatedProgress, pulseScale, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const endpointProps = useAnimatedProps(() => {
    const angle = animatedProgress.value * 2 * Math.PI - Math.PI / 2;
    return {
      cx: size / 2 + radius * Math.cos(angle),
      cy: size / 2 + radius * Math.sin(angle),
      opacity: animatedProgress.value > 0.02 ? 0.85 : 0,
    };
  });

  const glowOrbProps = useAnimatedProps(() => {
    const angle = animatedProgress.value * 2 * Math.PI - Math.PI / 2;
    return {
      cx: size / 2 + radius * Math.cos(angle),
      cy: size / 2 + radius * Math.sin(angle),
      opacity: animatedProgress.value > 0.02 ? 0.18 : 0,
    };
  });

  const ringScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, ringScaleStyle]}>
      {glow ? (
        <View
          style={[
            styles.ambientGlow,
            {
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: size,
              backgroundColor: withAlpha(energy.primary, energy.glowOpacity),
              pointerEvents: "none",
            },
          ]}
        />
      ) : null}

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={energy.primary} />
            <Stop offset="100%" stopColor={energy.secondary} />
          </SvgGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {glow ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={energy.primary}
            strokeWidth={strokeWidth + 6}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            opacity={0.12}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />

        {glow ? (
          <>
            <AnimatedCircle
              r={strokeWidth * 1.1}
              fill={energy.secondary}
              animatedProps={glowOrbProps}
            />
            <AnimatedCircle r={strokeWidth * 0.55} fill="#fff" animatedProps={endpointProps} />
          </>
        ) : null}
      </Svg>

      <View style={styles.center}>
        {centerContent ?? (
          <>
            {label ? (
              <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                {label}
              </Text>
            ) : null}
            {sublabel ? (
              <Text
                style={[
                  colors.typography.tiny,
                  { color: colors.mutedForeground, textAlign: "center", marginTop: 2 },
                ]}
              >
                {sublabel}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ambientGlow: {
    position: "absolute",
    alignSelf: "center",
  },
  svg: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
