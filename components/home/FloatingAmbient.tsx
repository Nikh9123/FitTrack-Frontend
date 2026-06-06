import { useColors } from "@/hooks/useColors";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function FloatingOrb({
  size,
  color,
  top,
  left,
  duration,
  driftX,
  driftY,
}: {
  size: number;
  color: string;
  top: number;
  left: number;
  duration: number;
  driftX: number;
  driftY: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(-driftX * 0.6, { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: duration * 0.9, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-driftY, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftY * 0.8, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: duration * 1.4, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: duration * 1.4, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [driftX, driftY, duration, scale, tx, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          backgroundColor: color,
        },
      ]}
    />
  );
}

/** Subtle moving gradient orbs — sits behind Home content */
export function FloatingAmbient() {
  const colors = useColors();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <FloatingOrb
        size={180}
        color={colors.primary + "14"}
        top={-40}
        left={-50}
        duration={5200}
        driftX={28}
        driftY={22}
      />
      <FloatingOrb
        size={140}
        color={colors.purple + "12"}
        top={120}
        left={220}
        duration={6400}
        driftX={-24}
        driftY={18}
      />
      <FloatingOrb
        size={100}
        color={colors.cyan + "10"}
        top={280}
        left={-20}
        duration={4800}
        driftX={20}
        driftY={-16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    opacity: 1,
  },
});
