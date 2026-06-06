import { entranceFade } from "@/constants/animations";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface AnimatedStatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colors: any;
  index: number;
  pulse?: boolean;
}

export function AnimatedStatCard({ label, value, icon, color, colors, index, pulse }: AnimatedStatCardProps) {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!pulse) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [pulse, bob]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  return (
    <Animated.View
      entering={entranceFade(index + 5)}
      style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Animated.View style={[styles.statIcon, { backgroundColor: color + "15" }, pulse ? iconStyle : undefined]}>
        <Ionicons name={icon} size={18} color={color} />
      </Animated.View>
      <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: "46%",
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
