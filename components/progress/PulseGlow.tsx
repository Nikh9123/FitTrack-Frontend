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

interface PulseGlowProps {
  children: React.ReactNode;
  active?: boolean;
  color: string;
  style?: ViewStyle;
}

export function PulseGlow({ children, active = true, color, style }: PulseGlowProps) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      glow.value = 0;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [active, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 + glow.value * 0.45,
    borderColor: color,
  }));

  return (
    <Animated.View style={[styles.wrap, { shadowColor: color }, glowStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 4,
  },
});
