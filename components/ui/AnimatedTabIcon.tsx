import { useReducedMotion } from "@/hooks/useReducedMotion";
import React, { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

export function AnimatedTabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(focused ? 1.08 : 1);
  const lift = useSharedValue(focused ? -1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      lift.value = 0;
      return;
    }
    scale.value = withSpring(focused ? 1.08 : 1, { damping: 14, stiffness: 220 });
    lift.value = withSpring(focused ? -1 : 0, { damping: 16, stiffness: 200 });
  }, [focused, scale, lift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
