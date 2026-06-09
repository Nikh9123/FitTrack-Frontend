import { withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { hapticLight } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
}

function QuickActionPill({ icon, label, onPress, accent }: QuickAction) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const ripple = useSharedValue(0);
  const [rippleKey, setRippleKey] = useState(0);
  const color = accent ?? colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -lift.value * 2 }],
    shadowOpacity: 0.06 + lift.value * 0.12,
    shadowOffset: { width: 0, height: 2 + lift.value * 2 },
    shadowRadius: 6 + lift.value * 4,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: lift.value * 0.35,
    transform: [{ scale: 1 + lift.value * 0.04 }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.25,
    transform: [{ scale: 0.4 + ripple.value * 1.2 }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 14, stiffness: 260 });
        if (!reduceMotion) lift.value = withTiming(1, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        lift.value = withTiming(0, { duration: 180 });
      }}
      onPress={() => {
        void hapticLight();
        if (!reduceMotion) {
          setRippleKey((k) => k + 1);
          ripple.value = 0;
          ripple.value = withTiming(1, { duration: 420 });
        }
        onPress();
      }}
      style={[
        animStyle,
        styles.pill,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: color,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusRing,
          { borderColor: withAlpha(color, 0.45) },
          ringStyle,
        ]}
      />
      <Animated.View
        key={rippleKey}
        pointerEvents="none"
        style={[styles.ripple, { backgroundColor: color }, rippleStyle]}
      />
      <View style={[styles.iconCircle, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    </AnimatedPressable>
  );
}

interface QuickActionsRowProps {
  actions: QuickAction[];
}

export function QuickActionsRow({ actions }: QuickActionsRowProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Text style={[colors.typography.h3, { color: colors.foreground, marginBottom: 8 }]}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {actions.map((action) => (
          <QuickActionPill key={action.label} {...action} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  row: { gap: 10, paddingRight: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ripple: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: "center",
    left: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    paddingRight: 2,
  },
});
