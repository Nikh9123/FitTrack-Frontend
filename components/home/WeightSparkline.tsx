import { useColors } from "@/hooks/useColors";
import type { TrendPoint } from "@/hooks/useProgressAPI";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface WeightSparklineProps {
  points: TrendPoint[];
  source: "manual" | "inbody" | "none";
  latestKg: number | null;
  onPress?: () => void;
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
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: isLast ? colors.primary : colors.primary + "55",
                      },
                    ]}
                  />
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
  bar: { width: "100%", borderRadius: 4, minHeight: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  caption: { fontSize: 11, fontFamily: "Inter_400Regular" },
  diff: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
