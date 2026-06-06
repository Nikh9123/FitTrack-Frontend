import { JournalChartSkeleton } from "@/components/skeletons/JournalChartSkeleton";
import { AnimatedHistoryBar } from "@/components/progress/AnimatedHistoryBar";
import { MetricIllustration } from "@/components/progress/MetricIllustration";
import { InsightCard } from "@/components/ui/InsightCard";
import { useColors } from "@/hooks/useColors";
import type { HistoryDayBucket, HistoryInsightDto, HistoryPeriod } from "@/lib/progress-history-api";
import { Ionicons } from "@expo/vector-icons";
import { hapticSelection } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { entranceFade } from "@/constants/animations";
import Animated from "react-native-reanimated";

type JournalMetric = "steps" | "calories" | "water" | "sleep" | "weight";

export type { JournalMetric };

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
  colorKey: "primary" | "green" | "cyan" | "purple" | "yellow";
  emptyHint: string;
}[] = [
  { key: "steps", label: "Steps", icon: "footsteps", colorKey: "primary", emptyHint: "Sync steps or walk more to fill this chart." },
  { key: "calories", label: "Calories", icon: "flame", colorKey: "green", emptyHint: "Log meals to balance your daily intake." },
  { key: "water", label: "Water", icon: "water", colorKey: "cyan", emptyHint: "Track water glasses to stay hydrated." },
  { key: "sleep", label: "Sleep", icon: "moon", colorKey: "purple", emptyHint: "Log check-ins with sleep hours to see trends." },
  { key: "weight", label: "Weight", icon: "scale", colorKey: "yellow", emptyHint: "Log weight on Home or Progress to see your trend." },
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
    case "weight":
      return bucket.weightKg ?? 0;
  }
}

function insightMatchesMetric(ins: HistoryInsightDto, metric: JournalMetric): boolean {
  if (ins.metric === "general" || ins.id === "start") return false;
  switch (metric) {
    case "steps":
      return ins.metric === "steps" || ins.id === "steps";
    case "calories":
      return ins.metric === "calories" || ins.metric === "nutrition" || ins.id === "calories";
    case "water":
      return ins.metric === "water" || ins.metric === "hydration" || ins.id === "water";
    case "sleep":
      return ins.metric === "sleep" || ins.id === "sleep";
    case "weight":
      return ins.metric === "weight" || ins.id === "weight";
  }
}

const METRIC_FALLBACK_TIPS: Record<JournalMetric, string> = {
  steps: "Keep syncing steps to compare this period with the last one.",
  calories: "Log meals daily to see how your intake shifts over time.",
  water: "Track water glasses to spot hydration trends week over week.",
  sleep: "Log check-ins with sleep hours to unlock recovery insights.",
  weight: "Log weight regularly to see how your trend compares across periods.",
};

interface FitnessJournalProps {
  period: HistoryPeriod;
  onPeriodChange: (p: HistoryPeriod) => void;
  metric: JournalMetric;
  onMetricChange: (m: JournalMetric) => void;
  buckets: HistoryDayBucket[];
  insights: HistoryInsightDto[];
  loading?: boolean;
  lastSyncedAt?: string | null;
}

export function FitnessJournal({
  period,
  onPeriodChange,
  metric,
  onMetricChange,
  buckets,
  insights,
  loading,
  lastSyncedAt,
}: FitnessJournalProps) {
  const colors = useColors();
  const activeMeta = METRICS.find((m) => m.key === metric)!;
  const color = colors[activeMeta.colorKey];

  const values = buckets.map((b) => metricValue(b, metric));
  const displayBuckets = buckets.length > 14 ? buckets.slice(-14) : buckets;
  const displayValues = displayBuckets.map((b) => metricValue(b, metric));
  const displayMax = Math.max(...displayValues, 1);
  const isEmpty =
    !loading &&
    (metric === "weight"
      ? displayBuckets.every((b) => b.weightKg == null)
      : displayValues.every((v) => v === 0));
  const chartAnimKey = loading
    ? `${metric}-${period}-loading`
    : `${metric}-${period}-${displayValues.join(",")}`;

  const metricInsights = insights.filter((ins) => insightMatchesMetric(ins, metric));

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
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Fitness Journal</Text>
              {metric === "steps" && lastSyncedAt && (
                <Text style={[styles.syncHint, { color: colors.mutedForeground }]}>
                  Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => {
                  void hapticSelection();
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
                void hapticSelection();
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
          <JournalChartSkeleton />
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
                  const hasWeight = metric === "weight" && bucket.weightKg != null;
                  const barValue = metric === "weight" ? (bucket.weightKg ?? 0) : v;

                  return (
                    <View key={`${bucket.date}-${chartAnimKey}`} style={styles.barColWrap}>
                      <View style={styles.barStack}>
                        {metric === "weight" && hasWeight ? (
                          <Text style={[styles.barValue, { color }]} numberOfLines={1}>
                            {bucket.weightKg!.toFixed(1)}
                          </Text>
                        ) : (
                          <View style={styles.barValueSpacer} />
                        )}
                        {metric === "weight" && !hasWeight ? (
                          <View style={[styles.barEmptyTrack, { backgroundColor: colors.border }]} />
                        ) : (
                          <AnimatedHistoryBar
                            value={barValue}
                            max={displayMax}
                            color={color}
                            index={i}
                            trackColor={colors.border}
                            animKey={chartAnimKey}
                          />
                        )}
                      </View>
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

        {metricInsights.length > 0 ? (
          <View style={styles.insightsBlock}>
            {metricInsights.slice(0, 2).map((ins) => (
              <InsightCard
                key={`${ins.id}-${metric}-${chartAnimKey}`}
                message={ins.message}
                trend={ins.trend}
              />
            ))}
          </View>
        ) : (
          <InsightCard
            message={METRIC_FALLBACK_TIPS[metric]}
            variant="tip"
          />
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
  syncHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
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
  barsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 3, paddingTop: 4 },
  barColWrap: { flex: 1, alignItems: "center", gap: 6, minWidth: 0, maxWidth: 36 },
  barStack: { alignItems: "center", width: "100%" },
  barValue: { fontSize: 8, fontFamily: "Inter_600SemiBold", height: 10, marginBottom: 2 },
  barValueSpacer: { height: 10, marginBottom: 2 },
  barEmptyTrack: { height: 88, width: "80%", borderRadius: 6, opacity: 0.35 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  insightsBlock: { gap: 8 },
});
