import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface ShimmerOverlayProps {
  colors: [string, string, string];
  style?: ViewStyle;
  intervalMs?: number;
}

/** Soft periodic shimmer — GPU-friendly translate only */
export function ShimmerOverlay({ colors, style, intervalMs = 10000 }: ShimmerOverlayProps) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(-120);

  useEffect(() => {
    if (reduceMotion) return;
    const run = () => {
      x.value = -120;
      x.value = withTiming(220, { duration: 1400, easing: Easing.inOut(Easing.ease) });
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, reduceMotion, x]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  if (reduceMotion) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style, animStyle]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.grad} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    opacity: 0.35,
  },
  grad: { flex: 1 },
});
