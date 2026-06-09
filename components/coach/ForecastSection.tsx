import { useColors } from "@/hooks/useColors";
import type { CoachForecasts } from "@/lib/coach-api";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function ForecastSection({ forecasts }: { forecasts: CoachForecasts }) {
  const colors = useColors();

  const hasWeight = forecasts.weightDetails.some((w) => w.weightKg != null);
  const hasStrength = forecasts.strength.length > 0;

  if (!hasWeight && !hasStrength) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        Log meals, steps, and workouts to generate weight and strength forecasts.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {forecasts.disclaimer ? (
        <View style={[styles.disclaimer, { backgroundColor: colors.primary + "10" }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{forecasts.disclaimer}</Text>
        </View>
      ) : null}

      <Text style={[styles.confidence, { color: colors.mutedForeground }]}>
        Forecast confidence: {forecasts.confidence} · avg deficit {forecasts.avgDailyDeficit} kcal/day
      </Text>

      {hasWeight ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.foreground }]}>Weight projection</Text>
          {forecasts.weightDetails.map((w) => (
            <View key={w.days} style={[styles.weightRow, { borderColor: colors.border }]}>
              <Text style={[styles.weightDays, { color: colors.foreground }]}>{w.days} days</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weightValue, { color: colors.primary }]}>
                  {w.weightKg != null ? `${w.weightKg} kg` : "—"}
                  {w.changeKg != null && w.changeKg !== 0 ? (
                    <Text style={{ color: colors.mutedForeground }}> ({w.changeKg > 0 ? "+" : ""}{w.changeKg} kg)</Text>
                  ) : null}
                </Text>
                {w.lowKg != null && w.highKg != null ? (
                  <Text style={[styles.weightRange, { color: colors.mutedForeground }]}>
                    Range: {w.lowKg} – {w.highKg} kg
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {hasStrength ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: colors.foreground }]}>Strength forecast (2 weeks)</Text>
          {forecasts.strength.map((s) => (
            <View key={s.exercise} style={[styles.strengthRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exerciseName, { color: colors.foreground }]}>{s.exercise}</Text>
                <Text style={[styles.strengthValues, { color: colors.mutedForeground }]}>
                  {s.current} → {s.predicted}
                </Text>
              </View>
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      s.trend === "up" ? colors.green + "20" : s.trend === "down" ? "#EF444420" : colors.border + "60",
                  },
                ]}
              >
                <Ionicons
                  name={s.trend === "up" ? "trending-up" : s.trend === "down" ? "trending-down" : "remove"}
                  size={14}
                  color={s.trend === "up" ? colors.green : s.trend === "down" ? "#EF4444" : colors.mutedForeground}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  disclaimer: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, alignItems: "flex-start" },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  confidence: { fontSize: 11, fontFamily: "Inter_500Medium" },
  block: { gap: 8 },
  blockTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  weightRow: { flexDirection: "row", gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  weightDays: { width: 56, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  weightValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  weightRange: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  exerciseName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  strengthValues: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  trendBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
