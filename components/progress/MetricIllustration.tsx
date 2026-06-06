import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export type JournalMetric = "steps" | "calories" | "water" | "sleep";

interface MetricIllustrationProps {
  metric: JournalMetric;
  color: string;
  size?: number;
  animKey?: string;
}

function FloatingZ({ delay, x, color }: { delay: number; x: number; color: string }) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.2, { duration: 900 })),
        -1,
      ),
    );
  }, [delay, opacity, ty]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.zText, { left: x, color }, style]}>z</Animated.Text>
  );
}

function SleepScene({ color }: { color: string }) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200 }), withTiming(0, { duration: 2200 })),
      -1,
      true,
    );
  }, [breathe]);

  const blanketStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + breathe.value * 0.04 }, { scaleX: 1 + breathe.value * 0.02 }],
  }));

  return (
    <View style={styles.sceneWrap}>
      <Svg width={120} height={72} viewBox="0 0 120 72">
        <Ellipse cx={60} cy={58} rx={48} ry={8} fill={color} opacity={0.12} />
        <Rect x={18} y={38} width={84} height={18} rx={9} fill="#E2E8F0" opacity={0.9} />
        <Path d="M28 38 Q60 22 92 38" fill="#F8FAFC" />
        <Circle cx={72} cy={32} r={14} fill="#FCD9C2" />
        <Path d="M58 30 Q72 24 84 30 L84 36 Q72 40 58 36 Z" fill="#64748B" opacity={0.35} />
      </Svg>
      <Animated.View style={[styles.blanketOverlay, blanketStyle]}>
        <Svg width={120} height={72} viewBox="0 0 120 72">
          <Path d="M34 44 H86 V52 Q60 56 34 52 Z" fill={color} opacity={0.35} />
        </Svg>
      </Animated.View>
      <FloatingZ delay={0} x={88} color={color} />
      <FloatingZ delay={600} x={96} color={color} />
      <FloatingZ delay={1200} x={104} color={color} />
    </View>
  );
}

function CaloriesScene({ color }: { color: string }) {
  const tilt = useSharedValue(0);

  useEffect(() => {
    tilt.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
    );
  }, [tilt]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value}deg` }],
  }));

  return (
    <View style={styles.sceneWrap}>
      <Svg width={120} height={72} viewBox="0 0 120 72">
        <Rect x={52} y={48} width={16} height={18} rx={3} fill={color} opacity={0.5} />
        <Circle cx={60} cy={48} r={22} fill="none" stroke={color} strokeWidth={2} opacity={0.25} />
      </Svg>
      <Animated.View style={[styles.beamWrap, beamStyle]}>
        <Svg width={120} height={72} viewBox="0 0 120 72">
          <Rect x={10} y={32} width={100} height={6} rx={3} fill={color} opacity={0.85} />
          <Circle cx={28} cy={40} r={10} fill="#22C55E" opacity={0.85} />
          <Circle cx={92} cy={40} r={10} fill="#EF4444" opacity={0.85} />
          <Rect x={22} y={24} width={12} height={12} rx={2} fill="#86EFAC" />
          <Rect x={86} y={24} width={12} height={10} rx={2} fill="#FCA5A5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function StepsScene({ color }: { color: string }) {
  const step = useSharedValue(0);

  useEffect(() => {
    step.value = withRepeat(
      withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })),
      -1,
    );
  }, [step]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: step.value * -4 }],
    opacity: 0.5 + step.value * 0.5,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - step.value) * -4 }],
    opacity: 0.5 + (1 - step.value) * 0.5,
  }));

  return (
    <View style={styles.sceneWrap}>
      <Animated.View style={leftStyle}>
        <Svg width={56} height={72} viewBox="0 0 56 72">
          <Ellipse cx={28} cy={58} rx={20} ry={5} fill={color} opacity={0.15} />
          <Path
            d="M18 20 C22 12 34 12 38 20 L36 48 C34 54 22 54 20 48 Z"
            fill={color}
            opacity={0.75}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.stepRight, rightStyle]}>
        <Svg width={56} height={72} viewBox="0 0 56 72">
          <Path
            d="M18 28 C22 20 34 20 38 28 L36 56 C34 62 22 62 20 56 Z"
            fill={color}
            opacity={0.45}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function WaterScene({ color }: { color: string }) {
  const ripple = useSharedValue(0);

  useEffect(() => {
    ripple.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }), -1);
  }, [ripple]);

  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + ripple.value * 0.8 }],
    opacity: 0.5 * (1 - ripple.value),
  }));
  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + ((ripple.value + 0.5) % 1) * 0.9 }],
    opacity: 0.35 * (1 - ((ripple.value + 0.5) % 1)),
  }));

  return (
    <View style={styles.sceneWrap}>
      <Animated.View style={[styles.ripple, r2, { borderColor: color }]} />
      <Animated.View style={[styles.ripple, r1, { borderColor: color }]} />
      <Svg width={80} height={72} viewBox="0 0 80 72">
        <Path
          d="M40 8 C52 28 58 38 58 48 C58 58 50 64 40 64 C30 64 22 58 22 48 C22 38 28 28 40 8 Z"
          fill={color}
          opacity={0.85}
        />
        <Path d="M34 36 Q40 42 46 36" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.5} />
      </Svg>
    </View>
  );
}

export function MetricIllustration({ metric, color, size = 120, animKey = metric }: MetricIllustrationProps) {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.92;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 400 });
  }, [metric, animKey, opacity, scale]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size * 0.65 }, wrapStyle]}>
      {metric === "sleep" && <SleepScene color={color} />}
      {metric === "calories" && <CaloriesScene color={color} />}
      {metric === "steps" && <StepsScene color={color} />}
      {metric === "water" && <WaterScene color={color} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  sceneWrap: { alignItems: "center", justifyContent: "center", width: 120, height: 72 },
  blanketOverlay: { position: "absolute", top: 0, left: 0 },
  beamWrap: { position: "absolute", top: 0, left: 0, width: 120, height: 72 },
  zText: { position: "absolute", top: 4, fontSize: 16, fontFamily: "Inter_700Bold" },
  stepRight: { position: "absolute", right: -8, top: 0 },
  ripple: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
});
