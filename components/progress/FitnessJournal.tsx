import { AnimatedHistoryBar } from "@/components/progress/AnimatedHistoryBar";
import { MetricIllustration } from "@/components/progress/MetricIllustration";
import { useColors } from "@/hooks/useColors";
import type { HistoryDayBucket, HistoryInsightDto, HistoryPeriod } from "@/lib/progress-history-api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { entranceFade } from "@/constants/animations";
import Animated from "react-native-reanimated";

type JournalMetric = "steps" | "calories" | "water" | "sleep";

const PERIODS: { key: HistoryPeriod; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
];

const METRICS: {
  key: JournalMetric;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: "primary" | "green" | "cyan" | "purple";
  emptyHint: string;
}[] = [
  { key: "steps", label: "Steps", icon: "footsteps", colorKey: "primary", emptyHint: "Sync steps or walk more to fill this chart." },
  { key: "calories", label: "Calories", icon: "flame", colorKey: "green", emptyHint: "Log meals to balance your daily intake." },
  { key: "water", label: "Water", icon: "water", colorKey: "cyan", emptyHint: "Track water glasses to stay hydrated." },
  { key: "sleep", label: "Sleep", icon: "moon", colorKey: "purple", emptyHint: "Log check-ins with sleep hours to see trends." },
];

function metricValue(bucket: HistoryDayBucket, metric: JournalMetric): number {
  switch (metric) {
    case "steps":
      return bucket.steps;
    case "calories":
      return bucket.caloriesConsumed;
    case "water":
      return bucket.waterGlasses;
    case "sleep":
      return bucket.sleepHours;
  }
}

interface FitnessJournalProps {
  period: HistoryPeriod;
  onPeriodChange: (p: HistoryPeriod) => void;
  metric: JournalMetric;
  onMetricChange: (m: JournalMetric) => void;
  buckets: HistoryDayBucket[];
  insights: HistoryInsightDto[];
  loading?: boolean;
}

export function FitnessJournal({
  period,
  onPeriodChange,
  metric,
  onMetricChange,
  buckets,
  insights,
  loading,
}: FitnessJournalProps) {
  const colors = useColors();
  const activeMeta = METRICS.find((m) => m.key === metric)!;
  const color = colors[activeMeta.colorKey];

  const values = buckets.map((b) => metricValue(b, metric));
  const displayBuckets = buckets.length > 14 ? buckets.slice(-14) : buckets;
  const displayValues = displayBuckets.map((b) => metricValue(b, metric));
  const displayMax = Math.max(...displayValues, 1);
  const isEmpty = !loading && displayValues.every((v) => v === 0);
  const chartAnimKey = loading
    ? `${metric}-${period}-loading`
    : `${metric}-${period}-${displayValues.join(",")}`;

  return (
    <Animated.View entering={entranceFade(2)} style={styles.outer}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          colors={[color + "12", colors.purple + "06", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="journal-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Fitness Journal</Text>
          </View>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  onPeriodChange(p.key);
                }}
                style={[
                  styles.periodBtn,
                  { backgroundColor: period === p.key ? colors.primary : colors.muted },
                ]}
              >
                <Text style={[styles.periodText, { color: period === p.key ? "#fff" : colors.mutedForeground }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.metricRow}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                Haptics.selectionAsync();
                onMetricChange(m.key);
              }}
              style={[
                styles.metricChip,
                {
                  borderColor: metric === m.key ? colors[m.colorKey] : colors.border,
                  backgroundColor: metric === m.key ? colors[m.colorKey] + "18" : colors.muted,
                },
              ]}
            >
              <Ionicons
                name={m.icon}
                size={14}
                color={metric === m.key ? colors[m.colorKey] : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.metricLabel,
                  { color: metric === m.key ? colors[m.colorKey] : colors.mutedForeground },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={color} style={{ paddingVertical: 36 }} />
        ) : (
          <View key={chartAnimKey} style={styles.chartArea}>
            {isEmpty ? (
              <View style={styles.emptyScene}>
                <MetricIllustration metric={metric} color={color} animKey={chartAnimKey} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No {activeMeta.label.toLowerCase()} data for this period yet
                </Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{activeMeta.emptyHint}</Text>
              </View>
            ) : (
              <View style={styles.barsRow}>
                {displayValues.map((v, i) => {
                  const bucket = displayBuckets[i];
                  const dayLabel = bucket.date.slice(5);
                  return (
                    <View key={`${bucket.date}-${chartAnimKey}`} style={styles.barColWrap}>
                      <AnimatedHistoryBar
                        value={v}
                        max={displayMax}
                        color={color}
                        index={i}
                        trackColor={colors.border}
                        animKey={chartAnimKey}
                      />
                      <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {insights.length > 0 ? (
          <View style={styles.insightsBlock}>
            {insights.slice(0, 2).map((ins) => (
              <View
                key={`${ins.id}-${chartAnimKey}`}
                style={[styles.insightRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Ionicons
                  name={
                    ins.trend === "up"
                      ? "trending-up"
                      : ins.trend === "down"
                        ? "trending-down"
                        : "information-circle-outline"
                  }
                  size={16}
                  color={
                    ins.trend === "up" ? colors.green : ins.trend === "down" ? colors.primary : colors.mutedForeground
                  }
                />
                <Text style={[styles.insightText, { color: colors.foreground }]}>{ins.message}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.tipBox, { backgroundColor: colors.cyan + "12", borderColor: colors.cyan + "30" }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.cyan} />
            <Text style={[styles.tipText, { color: colors.foreground }]}>
              Keep logging meals, water, steps, and check-ins to unlock week-over-week insights.
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { overflow: "hidden" },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14, overflow: "hidden" },
  headerRow: { gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  periodRow: { flexDirection: "row", gap: 6 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  periodText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chartArea: { gap: 10 },
  emptyScene: { alignItems: "center", gap: 6, paddingVertical: 4 },
  emptyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17, paddingHorizontal: 12 },
  barsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 110, gap: 2, minHeight: 110 },
  barColWrap: { flex: 1, alignItems: "center", gap: 4, minWidth: 0 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  insightsBlock: { gap: 8 },
  insightRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  insightText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
