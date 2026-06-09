import { MOTION } from "@/constants/animations";
import { energyFromColor, withAlpha } from "@/constants/energy-glow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const TRACK_H = 88;

interface AnimatedHistoryBarProps {
  value: number;
  max: number;
  color: string;
  index: number;
  trackColor: string;
  animKey: string;
  highlighted?: boolean;
  dimmed?: boolean;
}

export function AnimatedHistoryBar({
  value,
  max,
  color,
  index,
  trackColor,
  animKey,
  highlighted = false,
  dimmed = false,
}: AnimatedHistoryBarProps) {
  const reduceMotion = useReducedMotion();
  const energy = energyFromColor(color);
  const targetHeight = useMemo(
    () => Math.max(4, (value / Math.max(max, 1)) * TRACK_H),
    [value, max],
  );

  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const height = useSharedValue(reduceMotion ? targetHeight : 4);
  const scale = useSharedValue(highlighted ? 1.06 : 1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      height.value = targetHeight;
      scale.value = highlighted ? 1.06 : 1;
      return;
    }
    opacity.value = 0;
    height.value = 4;
    opacity.value = withDelay(index * MOTION.staggerBarMs, withTiming(1, { duration: 400 }));
    height.value = withDelay(
      index * MOTION.staggerBarMs,
      withSpring(targetHeight, MOTION.springBar),
    );
  }, [targetHeight, index, animKey, opacity, height, reduceMotion]);

  useEffect(() => {
    scale.value = withSpring(highlighted ? 1.06 : 1, MOTION.springSoft);
  }, [highlighted, scale]);

  const colStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dimmed ? 0.45 : 1,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    height: height.value,
  }));

  return (
    <Animated.View style={[styles.barCol, colStyle]}>
      <View
        style={[
          styles.barTrack,
          { backgroundColor: trackColor },
          highlighted && {
            borderWidth: 1.5,
            borderColor: color,
            ...Platform.select({
              ios: {
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.22,
                shadowRadius: 6,
              },
              android: { elevation: 3 },
              default: {},
            }),
          },
        ]}
      >
        <Animated.View style={[styles.barFillOuter, fillStyle]}>
          <LinearGradient
            colors={[energy.primary, energy.secondary]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
        {highlighted ? (
          <View
            pointerEvents="none"
            style={[styles.barGlow, { backgroundColor: withAlpha(energy.primary, 0.12) }]}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barCol: { flex: 1, alignItems: "center", minWidth: 0, width: "100%" },
  barTrack: {
    width: "100%",
    maxWidth: 22,
    height: TRACK_H,
    borderRadius: 999,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFillOuter: {
    width: "100%",
    minHeight: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    flex: 1,
    width: "100%",
    borderRadius: 999,
    minHeight: 4,
  },
  barGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
});
