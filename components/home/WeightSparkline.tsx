import { energyFromColor, withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { TrendPoint } from "@/hooks/useProgressAPI";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface WeightSparklineProps {
  points: TrendPoint[];
  source: "manual" | "inbody" | "none";
  latestKg: number | null;
  onPress?: () => void;
}

function SparkBar({
  height,
  color,
  isLast,
  index,
}: {
  height: number;
  color: string;
  isLast: boolean;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const energy = energyFromColor(color);
  const h = useSharedValue(reduceMotion ? height : 8);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      h.value = height;
      return;
    }
    h.value = withDelay(index * 40, withSpring(height, { damping: 14, stiffness: 120 }));
    if (isLast) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1,
      );
    }
  }, [height, index, isLast, h, pulse, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({
    height: h.value,
    transform: [{ scale: isLast ? pulse.value : 1 }],
  }));

  return (
    <Animated.View style={[styles.barOuter, barStyle]}>
      <LinearGradient
        colors={isLast ? [energy.primary, energy.secondary] : [withAlpha(energy.primary, 0.55), withAlpha(energy.secondary, 0.35)]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bar}
      />
      {isLast ? <View style={[styles.barGlow, { backgroundColor: withAlpha(energy.primary, 0.15) }]} /> : null}
    </Animated.View>
  );
}

export function WeightSparkline({ points, source, latestKg, onPress }: WeightSparklineProps) {
  const colors = useColors();
  const values = points.map((p) => p.value).filter((v) => v > 0);

  const displayValues = useMemo(() => {
    const slice = values.length > 8 ? values.slice(-8) : values;
    return slice;
  }, [values]);

  const { min, max } = useMemo(() => {
    if (displayValues.length === 0) return { min: 0, max: 1 };
    const lo = Math.min(...displayValues);
    const hi = Math.max(...displayValues);
    const pad = hi === lo ? 1 : (hi - lo) * 0.15;
    return { min: lo - pad, max: hi + pad };
  }, [displayValues]);

  const diff =
    displayValues.length >= 2 ? displayValues[displayValues.length - 1] - displayValues[0] : null;

  const content = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="analytics-outline" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Weight Trend</Text>
        </View>
        {latestKg != null ? (
          <Text style={[styles.latest, { color: colors.foreground }]}>
            {latestKg.toFixed(1)} kg
          </Text>
        ) : null}
      </View>

      {displayValues.length >= 2 ? (
        <>
          <View style={styles.chartRow}>
            {displayValues.map((v, i) => {
              const h = max > min ? ((v - min) / (max - min)) * 36 + 8 : 22;
              const isLast = i === displayValues.length - 1;
              return (
                <View key={`${i}-${v}`} style={styles.barWrap}>
                  <SparkBar height={h} color={colors.primary} isLast={isLast} index={i} />
                </View>
              );
            })}
          </View>
          <View style={styles.footer}>
            <Text style={[styles.caption, { color: colors.mutedForeground }]}>
              {source === "inbody" ? "InBody scans" : "Scale logs"} · last {displayValues.length} entries
            </Text>
            {diff != null ? (
              <Text
                style={[
                  styles.diff,
                  { color: diff <= 0 ? colors.green : colors.yellow },
                ]}
              >
                {diff >= 0 ? "+" : ""}
                {diff.toFixed(1)} kg
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Log weight or upload InBody to see your trend.
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  latest: { fontSize: 18, fontFamily: "Inter_700Bold" },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 48,
    gap: 6,
    paddingHorizontal: 2,
  },
  barWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", maxWidth: 28 },
  barOuter: { width: "100%", borderRadius: 999, overflow: "hidden", minHeight: 8 },
  bar: { flex: 1, width: "100%", borderRadius: 999, minHeight: 8 },
  barGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  caption: { fontSize: 11, fontFamily: "Inter_400Regular" },
  diff: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
