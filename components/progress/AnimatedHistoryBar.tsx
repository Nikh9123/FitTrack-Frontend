import { MOTION } from "@/constants/animations";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
}

export function AnimatedHistoryBar({ value, max, color, index, trackColor, animKey }: AnimatedHistoryBarProps) {
  const targetHeight = useMemo(
    () => Math.max(4, (value / Math.max(max, 1)) * TRACK_H),
    [value, max],
  );

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(index * MOTION.staggerBarMs, withTiming(1, { duration: 400 }));
  }, [targetHeight, index, animKey, opacity]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.barCol}>
      <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: color, height: targetHeight },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barCol: { flex: 1, alignItems: "center", minWidth: 0, width: "100%" },
  barTrack: {
    width: "100%",
    maxWidth: 28,
    height: TRACK_H,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
    minHeight: 4,
  },
});
