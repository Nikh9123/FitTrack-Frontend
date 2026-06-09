import { energyFromColor, withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";

interface BarDatum {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  color?: string;
  height?: number;
  unit?: string;
  emptyMessage?: string;
}

function ChartBar({
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
  const h = useSharedValue(reduceMotion ? height : 6);

  useEffect(() => {
    if (reduceMotion) {
      h.value = height;
      return;
    }
    h.value = withDelay(index * 45, withSpring(height, { damping: 14, stiffness: 110 }));
  }, [height, index, h, reduceMotion]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <Animated.View style={[styles.barOuter, style, isLast && { shadowColor: color, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }]}>
      <LinearGradient
        colors={isLast ? [energy.primary, energy.secondary] : [withAlpha(energy.primary, 0.55), withAlpha(energy.secondary, 0.35)]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bar}
      />
    </Animated.View>
  );
}

export function SimpleBarChart({
  data,
  color,
  height = 120,
  unit = "",
  emptyMessage = "No data for this period yet.",
}: SimpleBarChartProps) {
  const colors = useColors();
  const barColor = color ?? colors.primary;

  const { max, display } = useMemo(() => {
    const filtered = data.filter((d) => d.value >= 0);
    if (filtered.length === 0) return { max: 1, display: [] as BarDatum[] };
    const maxVal = Math.max(...filtered.map((d) => d.value), 1);
    return { max: maxVal, display: filtered };
  }, [data]);

  if (display.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.chartRow, { height }]}>
        {display.map((d, i) => {
          const h = max > 0 ? (d.value / max) * (height - 24) + 8 : 8;
          const isLast = i === display.length - 1;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <Text style={[styles.val, { color: colors.mutedForeground }]} numberOfLines={1}>
                {d.value > 0 ? `${Math.round(d.value)}${unit}` : ""}
              </Text>
              <ChartBar height={h} color={barColor} isLast={isLast} index={i} />
              <Text style={[styles.lbl, { color: colors.mutedForeground }]} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, padding: 12 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  barOuter: { width: "100%", maxWidth: 28, borderRadius: 999, overflow: "hidden", minHeight: 4 },
  bar: { flex: 1, width: "100%", borderRadius: 999, minHeight: 4 },
  lbl: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 6, textAlign: "center" },
  val: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
