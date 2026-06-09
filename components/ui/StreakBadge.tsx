import { PulseGlow } from "@/components/progress/PulseGlow";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface StreakBadgeProps {
  count: number;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
  onPress?: () => void;
}

function flameTier(count: number) {
  if (count >= 100) return { icon: 22, intensity: 1, legendary: true };
  if (count >= 30) return { icon: 20, intensity: 0.9, legendary: false };
  if (count >= 7) return { icon: 16, intensity: 0.75, legendary: false };
  return { icon: 14, intensity: 0.55, legendary: false };
}

function AnimatedFlame({ count, color }: { count: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const tier = flameTier(count);
  const flicker = useSharedValue(1);
  const sway = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    flicker.value = withRepeat(
      withSequence(
        withTiming(1 + tier.intensity * 0.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1 - tier.intensity * 0.06, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    sway.value = withRepeat(
      withSequence(withTiming(-2, { duration: 900 }), withTiming(2, { duration: 900 })),
      -1,
      true,
    );
  }, [count, reduceMotion, flicker, sway, tier.intensity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: flicker.value }, { rotate: `${sway.value * 0.4}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name="flame" size={tier.icon} color={tier.legendary ? "#F59E0B" : color} />
    </Animated.View>
  );
}

export function StreakBadge({ count, label, size = "md", pulse = true, onPress }: StreakBadgeProps) {
  const colors = useColors();
  if (count <= 0) return null;

  const isSm = size === "sm";
  const displayLabel = label ?? `${count} day streak`;
  const tier = flameTier(count);

  const inner = (
    <View
      style={[
        styles.chip,
        isSm ? styles.chipSm : styles.chipMd,
        {
          backgroundColor: colors.primary + (tier.legendary ? "28" : "18"),
          borderColor: tier.legendary ? "#F59E0B55" : colors.primary + "40",
        },
      ]}
    >
      <AnimatedFlame count={count} color={colors.primary} />
      <Text style={[isSm ? styles.textSm : styles.textMd, { color: colors.foreground }]}>{displayLabel}</Text>
    </View>
  );

  if (pulse) {
    return (
      <PulseGlow active color={tier.legendary ? "#F59E0B" : colors.primary} style={styles.pulseWrap}>
        {onPress ? (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            {inner}
          </TouchableOpacity>
        ) : (
          inner
        )}
      </PulseGlow>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.pulseWrap}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  pulseWrap: {
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  textSm: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  textMd: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
